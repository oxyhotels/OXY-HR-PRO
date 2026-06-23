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
import { addUserToGlobalGroup } from './community.controller';
import mongoose from 'mongoose';

// Ensure all Mongoose models are loaded to avoid tree-shaking and MissingSchemaErrors on populate
const registerModels = () => {
  return [Organization, Department, User, InviteLink, JoinRequest, ReportingStructure, HierarchyAuditLog, Hotel, HierarchyNode];
};

// ==========================================
// ORGANIZATION & DEPARTMENT SETUP (ROOT ADMIN)
// ==========================================

export const createOrganization = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    registerModels();
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
    registerModels();
    if (!req.user || req.user.role !== 'ROOT_ADMIN') {
      throw new ApiError(403, 'Only Root Administrators can create departments');
    }

    const { name, organizationId, hotelId, managerId, code, description, status } = req.body;
    if (!name || !organizationId) {
      throw new ApiError(400, 'Department name and Organization ID are required');
    }

    const org = await Organization.findById(organizationId);
    if (!org) {
      throw new ApiError(404, 'Organization not found');
    }

    const finalCode = code || name.replace(/[^A-Za-z0-9]/g, '').substring(0, 4).toUpperCase();

    const dept = await Department.create({
      name,
      organization: organizationId,
      hotel: hotelId || undefined,
      manager: managerId || undefined,
      code: finalCode,
      description: description || undefined,
      status: status || 'Active',
    });

    await HierarchyAuditLog.create({
      userId: req.user._id,
      action: 'DEPARTMENT_CREATED',
      details: JSON.stringify({ departmentId: dept._id, name: dept.name, organizationId, code: finalCode }),
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
    registerModels();
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
    registerModels();
    const { departmentId, hotelId, managerId, search } = req.query;

    // Fetch all structure documents
    const orgs = await Organization.find();
    const depts = await Department.find().populate('hotel', 'name hotelCode');
    const reportingStructures = await ReportingStructure.find();
    
    // Fetch all users with status = 'Active' or 'Pending' or 'OnLeave'
    const users = await User.find({ status: { $ne: 'Terminated' } }).select(
      'firstName lastName email role department designation status phone employeeId joinedDate hotel enabledFeatures salaryDetails photoUrl hierarchyLevel hierarchyPath parentManagerId'
    ).populate('hotel', 'name hotelCode');

    // Scoping rule: If not ROOT_ADMIN, restrict to descendants of logged-in manager
    let managerRootId = '';
    if (req.user && req.user.role !== 'ROOT_ADMIN') {
      managerRootId = req.user._id.toString();
    } else if (managerId) {
      managerRootId = String(managerId);
    }

    const allowedUserIds = new Set<string>();
    if (managerRootId) {
      const rootStruct = reportingStructures.find(s => s.userId.toString() === managerRootId);
      const rootPath = rootStruct ? rootStruct.path : `/${managerRootId}`;
      reportingStructures.forEach(struct => {
        if (struct.path === rootPath || struct.path.startsWith(rootPath + '/')) {
          allowedUserIds.add(struct.userId.toString());
        }
      });
      allowedUserIds.add(managerRootId);
    }

    // Filter structures based on parameters if provided
    let filteredUsers = [...users];
    if (managerRootId) {
      filteredUsers = filteredUsers.filter(u => allowedUserIds.has(u._id.toString()));
    }

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
        enabledFeatures: u.enabledFeatures || [],
        salaryDetails: u.salaryDetails || { baseSalary: 0 },
        photoUrl: u.photoUrl || '',
        hierarchyLevel: u.hierarchyLevel,
        hierarchyPath: u.hierarchyPath,
        parentManagerId: u.parentManagerId,
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
          const deptUsers = users.filter((u) => u.department === d.name);
          const deptRootNodes: any[] = [];

          if (managerRootId) {
            const rootNode = userMap.get(managerRootId);
            if (rootNode && (rootNode.departmentName === d.name || (!rootNode.departmentName && d.name === 'Administration'))) {
              deptRootNodes.push(rootNode);
            } else if (rootNode && !rootNode.hasParent && deptUsers.some(u => u._id.toString() === managerRootId)) {
              deptRootNodes.push(rootNode);
            } else {
              deptUsers.forEach((u) => {
                const node = userMap.get(u._id.toString());
                if (node && allowedUserIds.has(node.id)) {
                  const struct = reportingStructures.find((s) => s.userId.toString() === u._id.toString());
                  if (!struct?.managerId || !allowedUserIds.has(struct.managerId.toString())) {
                    deptRootNodes.push(node);
                  }
                }
              });
            }
          } else {
            deptUsers.forEach((u) => {
              const node = userMap.get(u._id.toString());
              if (node) {
                const struct = reportingStructures.find((s) => s.userId.toString() === u._id.toString());
                const manager = struct?.managerId ? userMap.get(struct.managerId.toString()) : null;
                if (!manager || manager.departmentName !== d.name) {
                  deptRootNodes.push(node);
                }
              }
            });
          }

          // Helper to check if a node or any of its descendants matches the filter
          const filterTree = (node: any): any | null => {
            const filteredChildren = node.children
              .filter((c: any) => !managerRootId || allowedUserIds.has(c.id))
              .map(filterTree)
              .filter(Boolean);
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
            employeesCount: deptUsers.filter(u => !managerRootId || allowedUserIds.has(u._id.toString())).length,
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
    }).filter(org => org.departments.length > 0);

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
    registerModels();
    if (!req.user) {
      throw new ApiError(401, 'Please authenticate');
    }

    // Managers or admins can generate
    const allowedRoles = ['ROOT_ADMIN', 'HOTEL_ADMIN', 'HR_MANAGER', 'DEPT_MANAGER'];
    if (!allowedRoles.includes(req.user.role)) {
      throw new ApiError(403, 'Permission denied to generate invite QR links');
    }

    const { organizationId, departmentId, expiresInDays, inviteType } = req.body;
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
      inviteType: inviteType || 'employee',
    });

    await HierarchyAuditLog.create({
      userId: req.user._id,
      action: 'INVITE_GENERATED',
      details: JSON.stringify({ inviteId: invite._id, inviteCode, departmentId, managerId: req.user._id, inviteType: inviteType || 'employee' }),
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
    registerModels();
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
    registerModels();
    const { inviteCode, name, email, mobile, employeeId, designation, password, state, district } = req.body;
    
    if (!inviteCode || !name || !email || !mobile || !employeeId || !designation || !password || !state || !district) {
      throw new ApiError(400, 'All fields (Invite Code, Name, Email, Mobile, Employee ID, Designation, Password, State, District) are required');
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

    // Get department details
    const dept = await Department.findById(invite.departmentId);
    if (!dept) {
      throw new ApiError(404, 'Department associated with invite not found');
    }

    // Get manager details
    const manager = await User.findById(invite.managerId);
    if (!manager) {
      throw new ApiError(404, 'Manager not found');
    }

    let hierarchyLevel = 1;
    if (manager && typeof manager.hierarchyLevel === 'number') {
      hierarchyLevel = manager.hierarchyLevel + 1;
    }

    // Split name
    // Check if duplicate request exists
    const existingReq = await JoinRequest.findOne({ email: email.toLowerCase(), status: 'Pending' });
    if (existingReq) {
      throw new ApiError(400, 'You have already submitted a join request that is pending approval');
    }

    // Create a pending JoinRequest document
    const newRequest = await JoinRequest.create({
      inviteCode,
      organizationId: invite.organizationId,
      departmentId: invite.departmentId,
      managerId: invite.managerId,
      name: name.trim(),
      email: email.toLowerCase(),
      mobile,
      employeeId,
      designation,
      password,
      status: 'Pending',
      joinRole: req.body.joinRole || 'EMPLOYEE',
      invitedById: invite.managerId,
      hierarchyLevel,
      state,
      district,
    });

    // Notify manager of pending request
    await createNotification({
      title: 'New Join Request Pending',
      message: `${name} has requested to join your department (${dept.name}) as ${designation}. Please review and approve.`,
      type: 'warning',
      recipientId: invite.managerId.toString(),
      link: '/dashboard/hierarchy',
    });

    res.status(200).json({
      status: 'success',
      message: 'Join request successfully submitted! Your registration is pending approval by your manager.',
      data: { request: newRequest },
    });
  } catch (error) {
    next(error);
  }
};

export const approveRequest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    registerModels();
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

    // Fetch approving manager's details
    const managerUser = await User.findById(req.user._id);
    let managerLevel = 0;
    if (managerUser && typeof managerUser.hierarchyLevel === 'number') {
      managerLevel = managerUser.hierarchyLevel;
    } else {
      const managerStruct = await ReportingStructure.findOne({ userId: req.user._id });
      if (managerStruct && managerStruct.path) {
        managerLevel = managerStruct.path.split('/').filter(Boolean).length - 1;
      }
    }
    const newUserLevel = managerLevel + 1;

    // Temporary user document to get ID
    const finalRole = joinReq.joinRole || 'EMPLOYEE';

    // Construct reporting path prefix
    let parentPath = '';
    const managerStruct = await ReportingStructure.findOne({ userId: req.user._id });
    if (managerStruct) {
      parentPath = managerStruct.path;
    } else {
      parentPath = `/${req.user._id}`;
    }
    
    // In order to construct the path with the user ID, we need the user ID. Mongoose allows us to pre-generate it
    const newUserId = new mongoose.Types.ObjectId();
    const currentPath = `${parentPath}/${newUserId}`;

    // Create active user
    const newUser = await User.create({
      _id: newUserId,
      firstName,
      lastName,
      email: joinReq.email,
      phone: joinReq.mobile,
      employeeId: joinReq.employeeId,
      designation: joinReq.designation,
      password: joinReq.password,
      role: finalRole,
      department: dept.name,
      hotel: req.user.hotel || undefined, // inherit manager's hotel
      status: 'Active',
      joinedDate: new Date(),
      reportingManager: `${req.user.firstName} ${req.user.lastName}`,
      hierarchyLevel: newUserLevel,
      hierarchyPath: currentPath,
      parentManagerId: req.user._id,
      invitedById: joinReq.invitedById || joinReq.managerId,
      approvedBy: req.user._id,
      approvedAt: new Date(),
      state: joinReq.state,
      district: joinReq.district,
    });

    // Auto-join to global community chat group
    await addUserToGlobalGroup(newUser._id);

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
      role: finalRole,
      hierarchyLevel: newUserLevel,
      hierarchyPath: currentPath,
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
    registerModels();
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
    registerModels();
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
    registerModels();
    if (!req.user) {
      throw new ApiError(401, 'Please authenticate');
    }

    // Fetch team reports (materialized path includes managerId)
    const regex = new RegExp(`/${req.user._id}`);
    const reports = await ReportingStructure.find({ path: regex })
      .populate('userId', 'firstName lastName email role department designation phone employeeId status enabledFeatures salaryDetails photoUrl hierarchyLevel hierarchyPath parentManagerId')
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

export const deleteInvite = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'Please authenticate');
    }

    const { inviteCode } = req.body;
    if (!inviteCode) {
      throw new ApiError(400, 'Invite code is required');
    }

    const invite = await InviteLink.findOne({ inviteCode });
    if (!invite) {
      throw new ApiError(404, 'Invite link not found');
    }

    // Only Root Admin can delete invite links
    if (req.user.role !== 'ROOT_ADMIN') {
      throw new ApiError(403, 'Permission denied: Only Root Administrators can delete invite links');
    }

    await InviteLink.deleteOne({ inviteCode });

    await HierarchyAuditLog.create({
      userId: req.user._id,
      action: 'INVITE_DELETED',
      details: JSON.stringify({ inviteCode }),
    });

    res.status(200).json({
      status: 'success',
      message: 'Invite link deleted successfully from dashboard and database',
    });
  } catch (error) {
    next(error);
  }
};

export const toggleInviteStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'Please authenticate');
    }

    const { inviteCode, status } = req.body;
    if (!inviteCode || !status) {
      throw new ApiError(400, 'Invite code and status are required');
    }

    if (status !== 'Active' && status !== 'Disabled') {
      throw new ApiError(400, 'Invalid status value');
    }

    const invite = await InviteLink.findOne({ inviteCode });
    if (!invite) {
      throw new ApiError(404, 'Invite link not found');
    }

    if (req.user.role !== 'ROOT_ADMIN' && invite.managerId.toString() !== req.user._id.toString()) {
      throw new ApiError(403, 'Permission denied: You do not have permission to manage this invite');
    }

    invite.status = status;
    await invite.save();

    await HierarchyAuditLog.create({
      userId: req.user._id,
      action: status === 'Active' ? 'INVITE_ENABLED' : 'INVITE_DISABLED',
      details: JSON.stringify({ inviteCode }),
    });

    res.status(200).json({
      status: 'success',
      message: `Invite link status successfully updated to ${status}`,
    });
  } catch (error) {
    next(error);
  }
};

export const updateHierarchyNode = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    registerModels();
    if (!req.user) {
      throw new ApiError(401, 'Please authenticate');
    }

    const { targetUserId, firstName, lastName, email, phone, employeeId, department, designation, role, baseSalary, enabledFeatures } = req.body;
    if (!targetUserId) {
      throw new ApiError(400, 'Target User ID is required');
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      throw new ApiError(404, 'Target user not found');
    }

    // Tenancy/Hierarchy Check: Is the logged-in user the Root Admin, or a parent manager of targetUserId?
    if (req.user.role !== 'ROOT_ADMIN') {
      const targetStruct = await ReportingStructure.findOne({ userId: targetUserId });
      if (!targetStruct) {
        throw new ApiError(403, 'Target user is not in your hierarchy reporting structure');
      }
      
      const managerPathRegex = new RegExp(`/${req.user._id}(/|$)`);
      if (!managerPathRegex.test(targetStruct.path)) {
        throw new ApiError(403, 'Permission denied: Target user is not in your reporting hierarchy line');
      }
    }

    // Update basic details if provided
    if (firstName) targetUser.firstName = firstName;
    if (lastName) targetUser.lastName = lastName;
    if (email) targetUser.email = email.toLowerCase();
    if (phone) targetUser.phone = phone;
    if (employeeId) targetUser.employeeId = employeeId;
    if (department) targetUser.department = department;
    if (designation) targetUser.designation = designation;
    if (role) targetUser.role = role;
    
    // Salary details
    if (baseSalary !== undefined) {
      targetUser.salaryDetails = {
        ...targetUser.salaryDetails,
        baseSalary: Number(baseSalary),
      };
    }

    // Rights/Features
    if (enabledFeatures !== undefined) {
      targetUser.enabledFeatures = enabledFeatures;
    }

    await targetUser.save();

    // Also update HierarchyNode and ReportingStructure if department or role changed
    if (department) {
      const deptDoc = await Department.findOne({ name: department });
      if (deptDoc) {
        await HierarchyNode.findOneAndUpdate(
          { userId: targetUserId },
          { departmentId: deptDoc._id, role: role || targetUser.role }
        );
        await ReportingStructure.findOneAndUpdate(
          { userId: targetUserId },
          { departmentId: deptDoc._id }
        );
      }
    } else if (role) {
      await HierarchyNode.findOneAndUpdate(
        { userId: targetUserId },
        { role }
      );
    }

    await HierarchyAuditLog.create({
      userId: req.user._id,
      action: 'SUBORDINATE_UPDATED',
      details: JSON.stringify({ targetUserId, updatedFields: Object.keys(req.body).filter(k => k !== 'targetUserId') }),
    });

    res.status(200).json({
      status: 'success',
      message: 'Subordinate details updated successfully',
      data: { user: targetUser },
    });
  } catch (error) {
    next(error);
  }
};

