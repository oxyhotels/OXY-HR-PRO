import { Request, Response, NextFunction } from 'express';
import { Organization } from '@/models/Organization';
import { Department } from '@/models/Department';
import { HierarchyNode } from '@/models/HierarchyNode';
import { InviteLink } from '@/models/InviteLink';
import { JoinRequest } from '@/models/JoinRequest';
import { ReportingStructure } from '@/models/ReportingStructure';
import { HierarchyAuditLog } from '@/models/HierarchyAuditLog';
import { User } from '@/models/User';
import { Hotel } from '@/models/Hotel';
import { ApiError } from '@/utils/ApiError';
import { createNotification } from '@/services/notification.service';
import mongoose from 'mongoose';

// ==========================================
// ORGANIZATION & DEPARTMENT SETUP (ROOT ADMIN)
// ==========================================

export const createOrganization = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'ROOT_ADMIN') {
      throw new ApiError(403, 'Only Root Administrators can create organizations');
    }

    const { name, code } = req.body;
    if (!name) {
      throw new ApiError(400, 'Organization name is required');
    }

    const existing = await Organization.findOne({ name });
    if (existing) {
      throw new ApiError(400, 'An organization with this name already exists');
    }

    const org = await Organization.create({ name, code });

    await HierarchyAuditLog.create({
      userId: req.user._id,
      action: 'ORGANIZATION_CREATED',
      details: JSON.stringify({ organizationId: org._id, name: org.name, code: org.code }),
    });

    res.status(201).json({
      status: 'success',
      data: { organization: org },
    });
  } catch (error) {
    next(error);
  }
};

export const createDepartment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'ROOT_ADMIN') {
      throw new ApiError(403, 'Only Root Administrators can create departments');
    }

    const { name, organizationId, hotelId, managerId } = req.body;
    if (!name || !organizationId) {
      throw new ApiError(400, 'Department name and Organization ID are required');
    }

    const org = await Organization.findById(organizationId);
    if (!org) {
      throw new ApiError(404, 'Organization not found');
    }

    const dept = await Department.create({
      name,
      organization: organizationId,
      hotel: hotelId || undefined,
      manager: managerId || undefined,
    });

    await HierarchyAuditLog.create({
      userId: req.user._id,
      action: 'DEPARTMENT_CREATED',
      details: JSON.stringify({ departmentId: dept._id, name: dept.name, organizationId }),
    });

    res.status(201).json({
      status: 'success',
      data: { department: dept },
    });
  } catch (error) {
    next(error);
  }
};

export const getOrganizations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const orgs = await Organization.find().sort({ name: 1 });
    const departments = await Department.find().populate('manager', 'firstName lastName email').sort({ name: 1 });

    res.status(200).json({
      status: 'success',
      data: {
        organizations: orgs,
        departments,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// ORGANIZATION HIERARCHY TREE
// ==========================================

export const getOrganizationTree = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { departmentId, hotelId, managerId, search } = req.query;

    // Fetch all structure documents
    const orgs = await Organization.find();
    const depts = await Department.find().populate('hotel', 'name hotelCode');
    const reportingStructures = await ReportingStructure.find();
    
    // Fetch all users with status = 'Active' or 'Pending' or 'OnLeave'
    const users = await User.find({ status: { $ne: 'Terminated' } }).select(
      'firstName lastName email role department designation status phone employeeId joinedDate hotel'
    ).populate('hotel', 'name hotelCode');

    // Filter structures based on parameters if provided
    let filteredUsers = [...users];

    if (search) {
      const q = String(search).toLowerCase();
      filteredUsers = filteredUsers.filter(
        (u) =>
          u.firstName.toLowerCase().includes(q) ||
          u.lastName.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (u.employeeId && u.employeeId.toLowerCase().includes(q)) ||
          (u.designation && u.designation.toLowerCase().includes(q))
      );
    }

    if (departmentId) {
      const targetDeptName = depts.find(d => d._id.toString() === String(departmentId) || d.name === String(departmentId))?.name || String(departmentId);
      filteredUsers = filteredUsers.filter((u) => u.department === targetDeptName);
    }

    if (hotelId) {
      filteredUsers = filteredUsers.filter((u) => u.hotel && (u.hotel as any)._id?.toString() === String(hotelId));
    }

    const matchedUserIds = new Set(filteredUsers.map((u) => u._id.toString()));

    // Build user structure mapping helper
    const userMap = new Map<string, any>();
    users.forEach((u) => {
      userMap.set(u._id.toString(), {
        id: u._id.toString(),
        name: `${u.firstName} ${u.lastName}`,
        email: u.email,
        role: u.role,
        departmentName: u.department,
        designation: u.designation,
        status: u.status,
        phone: u.phone,
        employeeId: u.employeeId,
        joinedDate: u.joinedDate,
        hotelCode: (u.hotel as any)?.hotelCode || 'OTHER',
        children: [],
      });
    });

    // Establish child relationships using ReportingStructure
    reportingStructures.forEach((struct) => {
      const userNode = userMap.get(struct.userId.toString());
      if (userNode && struct.managerId) {
        const managerNode = userMap.get(struct.managerId.toString());
        if (managerNode) {
          managerNode.children.push(userNode);
          userNode.hasParent = true;
        }
      }
    });

    // Build Department-level managers mapping
    const orgTrees = orgs.map((org) => {
      const orgDepts = depts
        .filter((d) => d.organization.toString() === org._id.toString())
        .map((d) => {
          // Find root level employees in this department (no manager or reporting outside this department)
          const deptUsers = users.filter((u) => u.department === d.name);
          const deptRootNodes: any[] = [];

          deptUsers.forEach((u) => {
            const node = userMap.get(u._id.toString());
            if (node) {
              const struct = reportingStructures.find((s) => s.userId.toString() === u._id.toString());
              const manager = struct?.managerId ? userMap.get(struct.managerId.toString()) : null;
              
              // It's a root node for this department if it has no manager, or manager department is different
              if (!manager || manager.departmentName !== d.name) {
                deptRootNodes.push(node);
              }
            }
          });

          // Helper to check if a node or any of its descendants matches the filter
          const filterTree = (node: any): any | null => {
            const filteredChildren = node.children.map(filterTree).filter(Boolean);
            const matchesSearch = matchedUserIds.has(node.id);
            const matchesManager = !managerId || node.id === String(managerId) || node.children.some((c: any) => c.id === String(managerId));

            if (matchesSearch && matchesManager) {
              return { ...node, children: filteredChildren };
            } else if (filteredChildren.length > 0) {
              return { ...node, children: filteredChildren };
            }
            return null;
          };

          const finalNodes = deptRootNodes.map(filterTree).filter(Boolean);

          return {
            id: d._id.toString(),
            name: d.name,
            hotelCode: d.hotel ? (d.hotel as any).hotelCode : null,
            employeesCount: deptUsers.length,
            structure: finalNodes,
          };
        })
        .filter((d) => d.structure.length > 0 || !search); // Remove empty depts if searching

      return {
        id: org._id.toString(),
        name: org.name,
        code: org.code,
        departments: orgDepts,
      };
    });

    res.status(200).json({
      status: 'success',
      data: {
        tree: orgTrees,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// QR INVITE GENERATION (MANAGERS)
// ==========================================

export const generateInvite = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'Please authenticate');
    }

    // Managers or admins can generate
    const allowedRoles = ['ROOT_ADMIN', 'HOTEL_ADMIN', 'HR_MANAGER', 'DEPT_MANAGER'];
    if (!allowedRoles.includes(req.user.role)) {
      throw new ApiError(403, 'Permission denied to generate invite QR links');
    }

    const { organizationId, departmentId, expiresInDays } = req.body;
    if (!organizationId || !departmentId) {
      throw new ApiError(400, 'Organization ID and Department ID are required');
    }

    const org = await Organization.findById(organizationId);
    if (!org) {
      throw new ApiError(404, 'Organization not found');
    }

    const dept = await Department.findById(departmentId);
    if (!dept) {
      throw new ApiError(404, 'Department not found');
    }

    // Generate code INV-XXXXXX
    const inviteCode = `INV-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    
    // Build join URL dynamically
    const proto = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers.host || 'localhost:3000';
    const inviteLink = `${proto}://${host}/join/${inviteCode}`;
    const qrCode = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(inviteLink)}`;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (expiresInDays || 7));

    const invite = await InviteLink.create({
      inviteCode,
      inviteLink,
      qrCode,
      organizationId,
      departmentId,
      managerId: req.user._id,
      createdBy: req.user._id,
      expiresAt,
      status: 'Active',
    });

    await HierarchyAuditLog.create({
      userId: req.user._id,
      action: 'INVITE_GENERATED',
      details: JSON.stringify({ inviteId: invite._id, inviteCode, departmentId, managerId: req.user._id }),
    });

    res.status(201).json({
      status: 'success',
      data: { invite },
    });
  } catch (error) {
    next(error);
  }
};

export const getInviteDetails = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { code } = req.params;
    const invite = await InviteLink.findOne({ inviteCode: code })
      .populate('organizationId', 'name code')
      .populate('departmentId', 'name')
      .populate('managerId', 'firstName lastName email designation');

    if (!invite) {
      throw new ApiError(404, 'Invite link not found');
    }

    if (invite.status === 'Disabled') {
      throw new ApiError(400, 'This invite link has been disabled');
    }

    if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
      throw new ApiError(400, 'This invite link has expired');
    }

    res.status(200).json({
      status: 'success',
      data: { invite },
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// JOIN WORKFLOW (PUBLIC & MANAGER APPROVAL)
// ==========================================

export const joinHierarchy = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { inviteCode, name, email, mobile, employeeId, designation, password } = req.body;
    
    if (!inviteCode || !name || !email || !mobile || !employeeId || !designation || !password) {
      throw new ApiError(400, 'All fields (Invite Code, Name, Email, Mobile, Employee ID, Designation, Password) are required');
    }

    const invite = await InviteLink.findOne({ inviteCode, status: 'Active' });
    if (!invite) {
      throw new ApiError(400, 'Invalid or disabled invite link');
    }

    if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
      throw new ApiError(400, 'Invite link has expired');
    }

    // Check unique credentials
    const existingUser = await User.findOne({ $or: [{ email: email.toLowerCase() }, { employeeId }] });
    if (existingUser) {
      throw new ApiError(400, 'User with this email or Employee ID already exists');
    }

    const existingRequest = await JoinRequest.findOne({ 
      $or: [{ email: email.toLowerCase() }, { employeeId }],
      status: 'Pending'
    });
    if (existingRequest) {
      throw new ApiError(400, 'You already have a pending join request awaiting approval');
    }

    const joinRequest = await JoinRequest.create({
      inviteCode,
      organizationId: invite.organizationId,
      departmentId: invite.departmentId,
      managerId: invite.managerId,
      name,
      email,
      mobile,
      employeeId,
      designation,
      password,
      status: 'Pending',
    });

    // Log hierarchy audit
    await HierarchyAuditLog.create({
      userId: invite.managerId, // Logged against inviting manager
      action: 'JOIN_REQUESTED',
      details: JSON.stringify({ requestId: joinRequest._id, name, email, employeeId, departmentId: invite.departmentId }),
    });

    // Notify generating manager
    await createNotification({
      title: 'New Join Request',
      message: `${name} has requested to join your team as ${designation}.`,
      type: 'info',
      recipientId: invite.managerId.toString(),
      link: '/dashboard/hierarchy',
    });

    res.status(201).json({
      status: 'success',
      message: 'Join request submitted successfully. Awaiting manager approval.',
      data: { joinRequest },
    });
  } catch (error) {
    next(error);
  }
};

export const approveRequest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'Please authenticate');
    }

    const { requestId } = req.body;
    if (!requestId) {
      throw new ApiError(400, 'Request ID is required');
    }

    const joinReq = await JoinRequest.findById(requestId);
    if (!joinReq) {
      throw new ApiError(404, 'Join request not found');
    }

    // Check if manager is authorized (must be the manager of the invite or ROOT_ADMIN)
    if (req.user.role !== 'ROOT_ADMIN' && joinReq.managerId.toString() !== req.user._id.toString()) {
      throw new ApiError(403, 'You are not authorized to approve this request');
    }

    if (joinReq.status !== 'Pending') {
      throw new ApiError(400, `Join request is already ${joinReq.status}`);
    }

    // Get department details
    const dept = await Department.findById(joinReq.departmentId);
    if (!dept) {
      throw new ApiError(404, 'Department associated with request not found');
    }

    // Update request status
    joinReq.status = 'Approved';
    await joinReq.save();

    // Split name
    const nameParts = joinReq.name.trim().split(/\s+/);
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || 'Staff';

    // Create active user
    const newUser = await User.create({
      firstName,
      lastName,
      email: joinReq.email,
      phone: joinReq.mobile,
      employeeId: joinReq.employeeId,
      designation: joinReq.designation,
      password: joinReq.password, // Schema handles plain text as per setup
      role: 'EMPLOYEE',
      department: dept.name,
      hotel: req.user.hotel || undefined, // inherit manager's hotel
      status: 'Active',
      joinedDate: new Date(),
      reportingManager: `${req.user.firstName} ${req.user.lastName}`,
    });

    // Construct reporting path prefix
    let parentPath = '';
    const managerStruct = await ReportingStructure.findOne({ userId: req.user._id });
    if (managerStruct) {
      parentPath = managerStruct.path;
    } else {
      parentPath = `/${req.user._id}`;
    }
    const currentPath = `${parentPath}/${newUser._id}`;

    // Create reporting structure
    await ReportingStructure.create({
      userId: newUser._id,
      managerId: req.user._id,
      departmentId: joinReq.departmentId,
      organizationId: joinReq.organizationId,
      path: currentPath,
    });

    // Create hierarchy node
    await HierarchyNode.create({
      userId: newUser._id,
      parentId: req.user._id,
      departmentId: joinReq.departmentId,
      organizationId: joinReq.organizationId,
      role: 'EMPLOYEE',
    });

    // Log hierarchy audit
    await HierarchyAuditLog.create({
      userId: req.user._id,
      action: 'JOIN_APPROVED',
      details: JSON.stringify({ requestId: joinReq._id, employeeId: newUser._id, managerId: req.user._id }),
    });

    // Notify employee (can be a system-wide banner notification, or sent directly to their new account)
    await createNotification({
      title: 'Join Request Approved',
      message: `Welcome aboard! Your join request for ${dept.name} department has been approved.`,
      type: 'success',
      recipientId: newUser._id.toString(),
      link: '/dashboard/profile',
    });

    res.status(200).json({
      status: 'success',
      message: 'Join request approved. Hierarchy nodes generated.',
      data: { user: newUser },
    });
  } catch (error) {
    next(error);
  }
};

export const rejectRequest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'Please authenticate');
    }

    const { requestId } = req.body;
    if (!requestId) {
      throw new ApiError(400, 'Request ID is required');
    }

    const joinReq = await JoinRequest.findById(requestId);
    if (!joinReq) {
      throw new ApiError(404, 'Join request not found');
    }

    if (req.user.role !== 'ROOT_ADMIN' && joinReq.managerId.toString() !== req.user._id.toString()) {
      throw new ApiError(403, 'You are not authorized to reject this request');
    }

    if (joinReq.status !== 'Pending') {
      throw new ApiError(400, `Join request is already ${joinReq.status}`);
    }

    joinReq.status = 'Rejected';
    await joinReq.save();

    await HierarchyAuditLog.create({
      userId: req.user._id,
      action: 'JOIN_REJECTED',
      details: JSON.stringify({ requestId: joinReq._id, name: joinReq.name, email: joinReq.email }),
    });

    res.status(200).json({
      status: 'success',
      message: 'Join request rejected.',
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// DISABLING INVITES & AUDIT TRAILS
// ==========================================

export const disableInvite = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'Please authenticate');
    }

    const { inviteCode } = req.body;
    const invite = await InviteLink.findOne({ inviteCode });
    if (!invite) {
      throw new ApiError(404, 'Invite link not found');
    }

    if (req.user.role !== 'ROOT_ADMIN' && invite.managerId.toString() !== req.user._id.toString()) {
      throw new ApiError(403, 'Permission denied');
    }

    invite.status = 'Disabled';
    await invite.save();

    await HierarchyAuditLog.create({
      userId: req.user._id,
      action: 'INVITE_DISABLED',
      details: JSON.stringify({ inviteCode }),
    });

    res.status(200).json({
      status: 'success',
      message: 'Invite link successfully disabled',
    });
  } catch (error) {
    next(error);
  }
};

export const getPendingRequests = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'Please authenticate');
    }

    // Root Admins fetch all, Managers fetch their own
    const query = req.user.role === 'ROOT_ADMIN'
      ? { status: 'Pending' }
      : { managerId: req.user._id, status: 'Pending' };

    const requests = await JoinRequest.find(query).populate('departmentId', 'name').sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      data: { requests },
    });
  } catch (error) {
    next(error);
  }
};

export const getActiveInvites = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'Please authenticate');
    }

    const query = req.user.role === 'ROOT_ADMIN'
      ? {}
      : { managerId: req.user._id };

    const invites = await InviteLink.find(query)
      .populate('organizationId', 'name')
      .populate('departmentId', 'name')
      .populate('managerId', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      data: { invites },
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// TEAM STRUCTURE & REPORTING (MANAGERS & EMPLOYEES)
// ==========================================

export const getTeamStructure = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'Please authenticate');
    }

    // Fetch team reports (materialized path includes managerId)
    const regex = new RegExp(`/${req.user._id}`);
    const reports = await ReportingStructure.find({ path: regex })
      .populate('userId', 'firstName lastName email role department designation phone employeeId status')
      .populate('departmentId', 'name')
      .sort({ path: 1 });

    res.status(200).json({
      status: 'success',
      data: { team: reports },
    });
  } catch (error) {
    next(error);
  }
};

export const getReportingPath = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'Please authenticate');
    }

    const struct = await ReportingStructure.findOne({ userId: req.user._id });
    if (!struct) {
      res.status(200).json({ status: 'success', data: { path: [] } });
      return;
    }

    // Split path into array of userIds
    const pathIds = struct.path.split('/').filter(Boolean);
    
    // Find all users in path (except current user)
    const managers = await User.find({ _id: { $in: pathIds, $ne: req.user._id } })
      .select('firstName lastName email role department designation phone');

    // Sort managers by their order in pathIds
    const sortedManagers = pathIds
      .filter((id: string) => id !== req.user!._id.toString())
      .map((id: string) => managers.find((m) => m._id.toString() === id))
      .filter(Boolean);

    res.status(200).json({
      status: 'success',
      data: { path: sortedManagers },
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// ADMINISTRATIVE FUNCTIONS (ROOT ADMIN)
// ==========================================

export const transferEmployee = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'ROOT_ADMIN') {
      throw new ApiError(403, 'Only Root Administrators can transfer employees');
    }

    const { employeeId, newManagerId, newDepartmentId } = req.body;
    if (!employeeId || !newDepartmentId) {
      throw new ApiError(400, 'Employee ID and New Department ID are required');
    }

    const emp = await User.findById(employeeId);
    if (!emp) {
      throw new ApiError(404, 'Employee not found');
    }

    const newDept = await Department.findById(newDepartmentId);
    if (!newDept) {
      throw new ApiError(404, 'New Department not found');
    }

    let managerName = '';
    let newManagerPath = '';

    if (newManagerId) {
      const newManager = await User.findById(newManagerId);
      if (!newManager) {
        throw new ApiError(404, 'New Manager not found');
      }
      managerName = `${newManager.firstName} ${newManager.lastName}`;

      const managerStruct = await ReportingStructure.findOne({ userId: newManagerId });
      newManagerPath = managerStruct ? managerStruct.path : `/${newManagerId}`;
    }

    const oldManager = emp.reportingManager;
    const oldDeptName = emp.department;

    // Update Employee user record
    emp.department = newDept.name;
    emp.reportingManager = managerName || undefined;
    await emp.save();

    // Update ReportingStructure
    const newPath = newManagerId ? `${newManagerPath}/${employeeId}` : `/${employeeId}`;
    
    const struct = await ReportingStructure.findOne({ userId: employeeId });
    const oldPath = struct ? struct.path : '';

    if (struct) {
      struct.managerId = newManagerId ? new mongoose.Types.ObjectId(newManagerId) : undefined;
      struct.departmentId = new mongoose.Types.ObjectId(newDepartmentId);
      struct.path = newPath;
      await struct.save();
    } else {
      await ReportingStructure.create({
        userId: employeeId,
        managerId: newManagerId || undefined,
        departmentId: newDepartmentId,
        organizationId: newDept.organization,
        path: newPath,
      });
    }

    // If path changed, recursively update all descendant paths
    if (oldPath) {
      const descendants = await ReportingStructure.find({ path: new RegExp(`^${oldPath}/`) });
      for (const desc of descendants) {
        desc.path = desc.path.replace(oldPath, newPath);
        await desc.save();
      }
    }

    // Update HierarchyNode
    await HierarchyNode.findOneAndUpdate(
      { userId: employeeId },
      {
        parentId: newManagerId || undefined,
        departmentId: newDepartmentId,
      },
      { upsert: true }
    );

    // Notify employee of transfer
    await createNotification({
      title: 'Department Transfer',
      message: `You have been transferred to ${newDept.name} reporting to ${managerName || 'no manager'}.`,
      type: 'warning',
      recipientId: employeeId,
      link: '/dashboard/profile',
    });

    await HierarchyAuditLog.create({
      userId: req.user._id,
      action: 'EMPLOYEE_TRANSFERRED',
      details: JSON.stringify({
        employeeId,
        oldManager,
        newManager: managerName,
        oldDepartment: oldDeptName,
        newDepartment: newDept.name,
      }),
    });

    res.status(200).json({
      status: 'success',
      message: 'Employee transferred successfully and hierarchy re-indexed.',
    });
  } catch (error) {
    next(error);
  }
};

export const getAnalytics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'Please authenticate');
    }

    const orgsCount = await Organization.countDocuments();
    const deptsCount = await Department.countDocuments();
    const managersCount = await User.countDocuments({ role: { $in: ['HOTEL_ADMIN', 'HR_MANAGER', 'DEPT_MANAGER'] } });
    const employeesCount = await User.countDocuments({ role: 'EMPLOYEE', status: 'Active' });
    const pendingRequests = await JoinRequest.countDocuments({ status: 'Pending' });
    const activeInvites = await InviteLink.countDocuments({ status: 'Active' });

    // Aggregate department distribution
    const deptDistribution = await User.aggregate([
      { $match: { status: 'Active', department: { $ne: null } } },
      { $group: { _id: '$department', count: { $sum: 1 } } },
      { $project: { department: '$_id', count: 1, _id: 0 } },
    ]);

    // Aggregate hierarchy growth by month (joinedDate)
    const growth = await User.aggregate([
      { $match: { status: 'Active' } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$joinedDate' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { month: '$_id', count: 1, _id: 0 } },
    ]);

    // Fetch hierarchy audit logs
    const auditLogs = await HierarchyAuditLog.find()
      .populate('userId', 'firstName lastName email role')
      .sort({ createdAt: -1 })
      .limit(10);

    res.status(200).json({
      status: 'success',
      data: {
        totals: {
          organizations: orgsCount,
          departments: deptsCount,
          managers: managersCount,
          employees: employeesCount,
          pendingJoinRequests: pendingRequests,
          activeInviteLinks: activeInvites,
        },
        departmentDistribution: deptDistribution,
        hierarchyGrowth: growth,
        recentAudits: auditLogs,
      },
    });
  } catch (error) {
    next(error);
  }
};
