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
import { sendPushNotification } from '@/services/fcm.service';
import { addUserToGlobalGroup } from './community.controller';
import mongoose from 'mongoose';
import { diffFields, logAuditTrail } from '@/utils/audit';

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

    await logAuditTrail({
      userId: req.user._id,
      action: 'Department Created',
      module: 'Department',
      oldValue: 'None',
      newValue: `Name: ${dept.name} | Code: ${finalCode} | Description: ${description || 'N/A'}`,
      details: `Department ${dept.name} created`,
      targetId: dept._id.toString(),
      req,
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
    const orgs = await Organization.find().sort({ name: 1 }).lean();
    const departments = await Department.find().populate('manager', 'firstName lastName email').sort({ name: 1 }).lean();

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
      managerRootId = req.user?._id?.toString() || '';
    } else if (managerId) {
      managerRootId = String(managerId);
    }

    const allowedUserIds = new Set<string>();
    if (managerRootId) {
      const rootStruct = reportingStructures.find(s => s?.userId?.toString() === managerRootId);
      const rootPath = rootStruct ? rootStruct.path : `/${managerRootId}`;
      reportingStructures.forEach(struct => {
        if (struct?.userId && (struct.path === rootPath || struct.path?.startsWith(rootPath + '/'))) {
          allowedUserIds.add(struct.userId.toString());
        }
      });
      allowedUserIds.add(managerRootId);
    }

    // Filter structures based on parameters if provided
    let filteredUsers = [...users];
    if (managerRootId) {
      filteredUsers = filteredUsers.filter(u => u?._id && allowedUserIds.has(u._id.toString()));
    }

    if (search) {
      const q = String(search).toLowerCase();
      filteredUsers = filteredUsers.filter(
        (u) =>
          u?.firstName?.toLowerCase().includes(q) ||
          u?.lastName?.toLowerCase().includes(q) ||
          u?.email?.toLowerCase().includes(q) ||
          (u?.employeeId && u.employeeId.toLowerCase().includes(q)) ||
          (u?.designation && u.designation.toLowerCase().includes(q))
      );
    }

    if (departmentId) {
      const targetDeptName = depts.find(d => d?._id?.toString() === String(departmentId) || d?.name === String(departmentId))?.name || String(departmentId);
      filteredUsers = filteredUsers.filter((u) => u.department === targetDeptName);
    }

    if (hotelId) {
      filteredUsers = filteredUsers.filter((u) => u.hotel && (u.hotel as any)._id?.toString() === String(hotelId));
    }

    const matchedUserIds = new Set(filteredUsers.map((u) => u?._id?.toString()).filter(Boolean));

    // Build user structure mapping helper
    const userMap = new Map<string, any>();
    users.forEach((u) => {
      if (!u?._id) return;
      const idStr = u._id.toString();
      userMap.set(idStr, {
        id: idStr,
        name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Unknown',
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
        hasParent: false
      });
    });

    // Establish child relationships using ReportingStructure, preventing circular loops
    const visitedChildren = new Set<string>();
    reportingStructures.forEach((struct) => {
      if (!struct?.userId || !struct?.managerId) return;
      
      const userIdStr = struct.userId.toString();
      const managerIdStr = struct.managerId.toString();
      
      if (userIdStr === managerIdStr) return; // Self-loop

      const userNode = userMap.get(userIdStr);
      const managerNode = userMap.get(managerIdStr);
      
      if (userNode && managerNode) {
        if (!visitedChildren.has(userIdStr)) {
          managerNode.children.push(userNode);
          userNode.hasParent = true;
          visitedChildren.add(userIdStr);
        } else {
          if (process.env.NODE_ENV === 'development') {
            console.warn(`[OrganizationTree] Circular reference skipped for user: ${userIdStr}`);
          }
        }
      }
    });

    // Build Department-level managers mapping
    const orgTrees = orgs.map((org) => {
      const orgDepts = depts
        .filter((d) => d?.organization?.toString() === org?._id?.toString())
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
            id: d?._id?.toString() || 'unknown',
            name: d.name,
            hotelCode: d.hotel ? (d.hotel as any).hotelCode : null,
            employeesCount: deptUsers.filter(u => !managerRootId || (u?._id && allowedUserIds.has(u._id.toString()))).length,
            structure: finalNodes,
          };
        })
        .filter((d) => d.structure.length > 0 || !search); // Remove empty depts if searching

      return {
        id: org?._id?.toString() || 'unknown',
        name: org.name,
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
    }    // Managers, admins or approved employees can generate
    const allowedRoles = ['ROOT_ADMIN', 'HOTEL_ADMIN', 'HR_MANAGER', 'DEPT_MANAGER', 'EMPLOYEE'];
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

    let dept;
    if (mongoose.Types.ObjectId.isValid(departmentId)) {
      dept = await Department.findById(departmentId);
    }
    
    if (!dept) {
      // Find by name and hotel if not a valid ID or not found
      dept = await Department.findOne({ 
        name: new RegExp(`^${departmentId}$`, 'i'), 
        organization: organizationId 
      });
      
      if (!dept) {
        // Create the department on the fly
        dept = await Department.create({
          name: departmentId,
          hotel: req.user.hotel,
          organization: organizationId,
          status: 'Active'
        });
      }
    }

    // Use the resolved department ID for the invite link
    const resolvedDepartmentId = dept._id;

    // Generate code INV-XXXXXX
    const inviteCode = `INV-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    
    // Build join URL dynamically
    const proto = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers.host || 'localhost:3000';
    const inviteLink = `${proto}://${host}/invite/${inviteCode}`;
    const qrCode = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(inviteLink)}`;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (expiresInDays || 7));

    // Find inviter's hierarchy node
    const userNode = await HierarchyNode.findOne({ userId: req.user._id });

    // Generate unique qrId
    const qrId = `QR-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

    const targetRole = inviteType === 'manager' ? 'DEPT_MANAGER' : 'EMPLOYEE';

    const invite = await InviteLink.create({
      inviteCode,
      inviteLink,
      qrCode,
      organizationId,
      departmentId: resolvedDepartmentId,
      managerId: req.user._id,
      createdBy: req.user._id,
      expiresAt,
      status: 'ACTIVE',
      inviteType: inviteType || 'employee',
      
      // New hierarchy properties
      qrId,
      createdByRole: req.user.role,
      parentNodeId: userNode ? userNode._id : undefined,
      parentManagerId: req.user._id,
      department: dept.name,
      role: targetRole,
      token: inviteCode,
      expiryDate: expiresAt
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
      throw new ApiError(404, 'Invalid or Expired Invite Code');
    }

    const statusUpper = (invite.status || '').toUpperCase();
    if (statusUpper === 'DISABLED' || statusUpper === 'DISABLE') {
      throw new ApiError(400, 'Invalid or Expired Invite Code');
    }

    if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
      if (invite.status !== 'EXPIRED') {
        invite.status = 'EXPIRED';
        await invite.save();
      }
      throw new ApiError(400, 'Invalid or Expired Invite Code');
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

    const invite = await InviteLink.findOne({ inviteCode, status: { $in: ['Active', 'ACTIVE'] } });
    if (!invite) {
      throw new ApiError(400, 'Invalid or disabled invite link');
    }

    if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
      if (invite.status !== 'EXPIRED') {
        invite.status = 'EXPIRED';
        await invite.save();
      }
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
      homeLocation: req.body.homeLocation,
      documents: req.body.documents,
      aadhaarNumber: req.body.aadhaarNumber,
      panNumber: req.body.panNumber,
      bankName: req.body.bankName,
      accountNo: req.body.accountNo,
      ifsc: req.body.ifsc,
      emergencyContactName: req.body.emergencyContactName,
      emergencyContactRelation: req.body.emergencyContactRelation,
      emergencyContactPhone: req.body.emergencyContactPhone,
      joiningDate: req.body.joiningDate,
      employmentType: req.body.employmentType,
      salary: req.body.salary,
      reportingManager: req.body.reportingManager,
    });

    // Notify manager of pending request
    await createNotification({
      title: 'New hierarchy join request received',
      message: 'New hierarchy join request received',
      type: 'warning',
      recipientId: invite.managerId.toString(),
      link: '/dashboard/hierarchy',
    });

    // Send PWA / Mobile Community Push Notification
    await sendPushNotification(invite.managerId.toString(), {
      title: 'New hierarchy join request received',
      body: 'New hierarchy join request received',
      data: { link: '/dashboard/hierarchy' }
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

    // Fetch Root Admin to link their ID
    const rootAdmin = await User.findOne({ role: 'ROOT_ADMIN' });

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
      joinedDate: joinReq.joiningDate ? new Date(joinReq.joiningDate) : new Date(),
      reportingManager: `${req.user.firstName} ${req.user.lastName}`,
      hierarchyLevel: newUserLevel,
      hierarchyPath: currentPath,
      parentManagerId: req.user._id,
      invitedById: joinReq.invitedById || joinReq.managerId,
      approvedBy: req.user._id,
      approvedAt: new Date(),
      state: joinReq.state,
      district: joinReq.district,
      parentId: req.user._id,
      rootAdminId: rootAdmin ? rootAdmin._id : undefined,
      employeeCode: joinReq.employeeId,
      managerCode: finalRole !== 'EMPLOYEE' ? joinReq.employeeId : undefined,
      homeLocation: joinReq.homeLocation,
      documents: joinReq.documents || [],
      aadhaarNumber: joinReq.aadhaarNumber,
      panNumber: joinReq.panNumber,
      bankDetails: {
        bankName: joinReq.bankName,
        accountNo: joinReq.accountNo,
        ifsc: joinReq.ifsc
      },
      emergencyContact: {
        name: joinReq.emergencyContactName,
        relation: joinReq.emergencyContactRelation,
        phone: joinReq.emergencyContactPhone
      },
      employmentType: joinReq.employmentType,
      salaryDetails: {
        baseSalary: parseFloat(joinReq.salary || '0') || 0,
        allowances: [],
        deductions: []
      }
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

    await logAuditTrail({
      userId: req.user._id,
      action: 'Hierarchy Updated',
      module: 'Hierarchy',
      oldValue: `Department: ${oldDeptName} | Manager: ${oldManager || 'None'}`,
      newValue: `Department: ${newDept.name} | Manager: ${managerName || 'None'}`,
      details: `Employee ${emp.firstName} ${emp.lastName} transferred: moved department and manager`,
      targetUserId: employeeId,
      req,
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

    const originalUser = targetUser.toObject();

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

    if (req.user && originalUser) {
      const isEmployee = originalUser.role === 'EMPLOYEE';
      const fieldsToTrack = isEmployee
        ? [
            'firstName',
            'lastName',
            'phone',
            'department',
            'salaryDetails.baseSalary',
            'employeeCode',
            'employeeId',
            'reportingManager',
            'shift',
            'designation',
            'personalDetails.address',
            'homeLocation.address',
            'documents',
          ]
        : [
            'department',
            'salaryDetails.baseSalary',
            'managerCode',
            'hotel',
            'reportingManager',
            'shift',
            'enabledFeatures',
            'designation',
          ];

      const { oldValue, newValue, hasChanged, changedFields } = diffFields(
        originalUser,
        targetUser,
        fieldsToTrack
      );

      if (hasChanged) {
        const module = isEmployee ? 'Employee' : 'Manager';
        const action = isEmployee ? 'Employee Updated' : 'Manager Updated';
        const details = `${module} profile for ${targetUser.firstName} ${targetUser.lastName} updated via Hierarchy: ${changedFields.join(', ')}`;
        
        await logAuditTrail({
          userId: req.user._id,
          action,
          module,
          oldValue,
          newValue,
          details,
          targetUserId: targetUser._id,
          req,
        });

        // Track Hierarchy changes if department, hotel, or reportingManager changed
        const hierarchyFields = ['department', 'hotel', 'reportingManager'];
        const changedHierarchy = changedFields.filter(f => hierarchyFields.includes(f));
        if (changedHierarchy.length > 0) {
          let oldProperty = originalUser.hotel;
          let newProperty = targetUser.hotel;
          if (changedFields.includes('hotel')) {
            const oldH = oldProperty ? await Hotel.findById(oldProperty) : null;
            const newH = newProperty ? await Hotel.findById(newProperty) : null;
            oldProperty = oldH ? oldH.name : 'None';
            newProperty = newH ? newH.name : 'None';
          }
          
          const oldHierarchyParts = [];
          const newHierarchyParts = [];
          
          if (originalUser.department) oldHierarchyParts.push(`Department: ${originalUser.department}`);
          if (originalUser.reportingManager) oldHierarchyParts.push(`Manager: ${originalUser.reportingManager}`);
          if (originalUser.hotel) oldHierarchyParts.push(`Property: ${oldProperty}`);
          
          if (targetUser.department) newHierarchyParts.push(`Department: ${targetUser.department}`);
          if (targetUser.reportingManager) newHierarchyParts.push(`Manager: ${targetUser.reportingManager}`);
          if (targetUser.hotel) newHierarchyParts.push(`Property: ${newProperty}`);

          await logAuditTrail({
            userId: req.user._id,
            action: 'Hierarchy Updated',
            module: 'Hierarchy',
            oldValue: oldHierarchyParts.join(' | ') || 'None',
            newValue: newHierarchyParts.join(' | ') || 'None',
            details: `Hierarchy moved for user ${targetUser.firstName} ${targetUser.lastName} via Hierarchy Editor`,
            targetUserId: targetUser._id,
            req,
          });
        }
      }
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

export const regenerateInvite = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    registerModels();
    if (!req.user) {
      throw new ApiError(401, 'Please authenticate');
    }

    const { inviteCode } = req.body;
    if (!inviteCode) {
      throw new ApiError(400, 'Invite code is required');
    }

    const oldInvite = await InviteLink.findOne({ inviteCode });
    if (!oldInvite) {
      throw new ApiError(404, 'Invite link not found');
    }

    // Authorization check
    if (req.user.role !== 'ROOT_ADMIN' && oldInvite.managerId.toString() !== req.user._id.toString()) {
      throw new ApiError(403, 'Permission denied: You do not have permission to manage this invite');
    }

    // Disable old invite
    oldInvite.status = 'DISABLED';
    await oldInvite.save();

    // Create new invite link
    const newInviteCode = `INV-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    const proto = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers.host || 'localhost:3000';
    const newInviteLink = `${proto}://${host}/invite/${newInviteCode}`;
    const newQrCode = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(newInviteLink)}`;

    // Set new expiry date (default 7 days, or carry over duration)
    const originalDurationMs = oldInvite.expiresAt && oldInvite.createdAt 
      ? oldInvite.expiresAt.getTime() - oldInvite.createdAt.getTime() 
      : 7 * 24 * 60 * 60 * 1000;
    const newExpiresAt = new Date(Date.now() + originalDurationMs);

    const newQrId = `QR-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

    // Find inviter's hierarchy node
    const userNode = await HierarchyNode.findOne({ userId: req.user._id });

    const newInvite = await InviteLink.create({
      inviteCode: newInviteCode,
      inviteLink: newInviteLink,
      qrCode: newQrCode,
      organizationId: oldInvite.organizationId,
      departmentId: oldInvite.departmentId,
      managerId: oldInvite.managerId,
      createdBy: req.user._id,
      expiresAt: newExpiresAt,
      status: 'ACTIVE',
      inviteType: oldInvite.inviteType || 'employee',
      
      // New hierarchy properties
      qrId: newQrId,
      createdByRole: req.user.role,
      parentNodeId: userNode ? userNode._id : undefined,
      parentManagerId: req.user._id,
      department: oldInvite.department,
      role: oldInvite.role,
      token: newInviteCode,
      expiryDate: newExpiresAt
    });

    await HierarchyAuditLog.create({
      userId: req.user._id,
      action: 'INVITE_REGENERATED',
      details: JSON.stringify({ 
        oldInviteCode: inviteCode, 
        newInviteCode, 
        newQrId, 
        managerId: req.user._id 
      }),
    });

    res.status(201).json({
      status: 'success',
      message: 'Invite QR regenerated successfully. Old QR disabled.',
      data: { invite: newInvite },
    });
  } catch (error) {
    next(error);
  }
};

export const updateDepartment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    registerModels();
    if (!req.user || !['ROOT_ADMIN', 'HOTEL_ADMIN', 'HR_MANAGER', 'DEPT_MANAGER'].includes(req.user.role)) {
      throw new ApiError(403, 'Only Root Administrators and authorized Managers can update departments');
    }

    const { id } = req.params;
    const { name, description, status } = req.body;

    const dept = await Department.findById(id);
    if (!dept) {
      throw new ApiError(404, 'Department not found');
    }

    const oldName = dept.name;
    const originalDept = dept.toObject();

    if (name && name.trim().toLowerCase() !== oldName.toLowerCase()) {
      const existing = await Department.findOne({
        organization: dept.organization,
        name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
        _id: { $ne: dept._id }
      });
      if (existing) {
        throw new ApiError(400, 'A department with this name already exists in this organization');
      }
      dept.name = name.trim();
    }

    if (description !== undefined) {
      dept.description = description;
    }

    if (status !== undefined) {
      if (status !== 'Active' && status !== 'Inactive') {
        throw new ApiError(400, 'Invalid status value');
      }
      dept.status = status;
    }

    await dept.save();

    // Cascade name change to all users assigned to this department
    if (name && name.trim() !== oldName) {
      await User.updateMany({ department: oldName }, { department: name.trim() });
    }

    if (req.user && originalDept) {
      const { oldValue, newValue, hasChanged, changedFields } = diffFields(
        originalDept,
        dept,
        ['name', 'description', 'status']
      );

      if (hasChanged) {
        await logAuditTrail({
          userId: req.user._id,
          action: 'Department Updated',
          module: 'Department',
          oldValue,
          newValue,
          details: `Department ${dept.name} updated: ${changedFields.join(', ')}`,
          targetId: dept._id.toString(),
          req,
        });
      }
    }

    await HierarchyAuditLog.create({
      userId: req.user._id,
      action: 'DEPARTMENT_UPDATED',
      details: JSON.stringify({ departmentId: dept._id, oldName, newName: dept.name, description, status }),
    });

    res.status(200).json({
      status: 'success',
      message: 'Department updated successfully',
      data: { department: dept },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteDepartment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    registerModels();
    if (!req.user || req.user.role !== 'ROOT_ADMIN') {
      throw new ApiError(403, 'Only Root Administrators can delete departments');
    }

    const { id } = req.params;

    const dept = await Department.findById(id);
    if (!dept) {
      throw new ApiError(404, 'Department not found');
    }

    // Check references
    const userLinked = await User.findOne({ department: dept.name });
    if (userLinked) {
      throw new ApiError(400, 'Department is currently in use and cannot be deleted.');
    }

    const nodeLinked = await HierarchyNode.findOne({ departmentId: dept._id });
    if (nodeLinked) {
      throw new ApiError(400, 'Department is currently in use and cannot be deleted.');
    }

    const structLinked = await ReportingStructure.findOne({ departmentId: dept._id });
    if (structLinked) {
      throw new ApiError(400, 'Department is currently in use and cannot be deleted.');
    }

    const requestLinked = await JoinRequest.findOne({ departmentId: dept._id });
    if (requestLinked) {
      throw new ApiError(400, 'Department is currently in use and cannot be deleted.');
    }

    const inviteLinked = await InviteLink.findOne({ departmentId: dept._id });
    if (inviteLinked) {
      throw new ApiError(400, 'Department is currently in use and cannot be deleted.');
    }

    await Department.findByIdAndDelete(dept._id);

    await logAuditTrail({
      userId: req.user._id,
      action: 'Department Deleted',
      module: 'Department',
      oldValue: `Name: ${dept.name} | Code: ${dept.code}`,
      newValue: 'None',
      details: `Department ${dept.name} deleted`,
      targetId: dept._id.toString(),
      req,
    });

    await HierarchyAuditLog.create({
      userId: req.user._id,
      action: 'DEPARTMENT_DELETED',
      details: JSON.stringify({ departmentId: dept._id, name: dept.name }),
    });

    res.status(200).json({
      status: 'success',
      message: 'Department deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const getHierarchyAuditLogs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    registerModels();
    if (!req.user) {
      throw new ApiError(401, 'Please authenticate');
    }

    const { page = 1, limit = 20, module: filterMod, action: filterAct, startDate, endDate, search, exportCsv } = req.query;

    const filter: any = {};

    // 1. Role-based scoping: Managers can only see self and descendants
    if (req.user.role !== 'ROOT_ADMIN') {
      const subordinates = await ReportingStructure.find({
        path: new RegExp(`/${req.user._id}(/|$)`)
      });
      const subordinateUserIds = subordinates.map(s => s.userId);
      const hierarchyUserIds = [req.user._id, ...subordinateUserIds];

      filter.$or = [
        { userId: { $in: hierarchyUserIds } },
        { targetUserId: { $in: hierarchyUserIds } }
      ];
    }

    // 2. Module filter
    if (filterMod) {
      filter.module = filterMod;
    }

    // 3. Action filter
    if (filterAct) {
      filter.action = filterAct;
    }

    // 4. Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate as string);
      }
      if (endDate) {
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    // 5. Search filter (joins users or searches in fields)
    if (search) {
      const searchRegex = new RegExp(search as string, 'i');
      const matchedUsers = await User.find({
        $or: [
          { firstName: searchRegex },
          { lastName: searchRegex },
          { email: searchRegex },
        ]
      }).select('_id');
      const matchedUserIds = matchedUsers.map(u => u._id);

      const searchConditions = [
        { userId: { $in: matchedUserIds } },
        { targetUserId: { $in: matchedUserIds } },
        { details: searchRegex },
        { oldValue: searchRegex },
        { newValue: searchRegex },
        { editedByRole: searchRegex }
      ];

      if (filter.$or) {
        filter.$and = [
          { $or: filter.$or },
          { $or: searchConditions }
        ];
        delete filter.$or;
      } else {
        filter.$or = searchConditions;
      }
    }

    // If exportCsv is true, return all matching logs without pagination limit
    if (exportCsv === 'true') {
      if (req.user.role !== 'ROOT_ADMIN') {
        throw new ApiError(403, 'Permission denied: Only Root Administrators can export logs');
      }

      const logs = await HierarchyAuditLog.find(filter)
        .populate('userId', 'firstName lastName email role')
        .populate('targetUserId', 'firstName lastName email role')
        .sort({ createdAt: -1 });

      let csv = 'Date,Time,Module,Action,Old Value,New Value,Edited By,Role,IP Address\r\n';
      logs.forEach(log => {
        const date = new Date(log.createdAt).toLocaleDateString();
        const time = new Date(log.createdAt).toLocaleTimeString();
        const mod = log.module || 'N/A';
        const act = log.action || 'N/A';
        
        const escapeCsv = (str: string) => `"${(str || '').replace(/"/g, '""')}"`;
        const oldVal = escapeCsv(log.oldValue);
        const newVal = escapeCsv(log.newValue);
        
        const editorUser: any = log.userId;
        const editorName = editorUser ? `${editorUser.firstName} ${editorUser.lastName}` : 'System';
        const editorRole = log.editedByRole || 'System';
        
        csv += `${date},${time},${mod},${act},${oldVal},${newVal},${escapeCsv(editorName)},${escapeCsv(editorRole)},${log.ipAddress || '127.0.0.1'}\r\n`;
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=hierarchy_audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
      res.status(200).send(csv);
      return;
    }

    // Pagination query
    const p = Math.max(1, Number(page));
    const l = Math.max(1, Number(limit));
    const skip = (p - 1) * l;

    const total = await HierarchyAuditLog.countDocuments(filter);
    const logs = await HierarchyAuditLog.find(filter)
      .populate('userId', 'firstName lastName email role')
      .populate('targetUserId', 'firstName lastName email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(l);

    res.status(200).json({
      status: 'success',
      data: {
        logs,
        pagination: {
          total,
          pages: Math.ceil(total / l),
          page: p,
          limit: l,
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getLatestUpdates = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    registerModels();
    
    const userUpdates = await HierarchyAuditLog.aggregate([
      { $match: { targetUserId: { $ne: null } } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$targetUserId',
          editedByRole: { $first: '$editedByRole' },
          createdAt: { $first: '$createdAt' }
        }
      }
    ]);

    const entityUpdates = await HierarchyAuditLog.aggregate([
      { $match: { targetId: { $ne: null } } },
      { $sort: { targetId: 1, createdAt: -1 } },
      {
        $group: {
          _id: '$targetId',
          editedByRole: { $first: '$editedByRole' },
          createdAt: { $first: '$createdAt' }
        }
      }
    ]);

    const updatesMap: Record<string, { editedBy: string; updatedAt: Date }> = {};

    userUpdates.forEach(u => {
      if (u._id) {
        updatesMap[u._id.toString()] = {
          editedBy: u.editedByRole || 'System',
          updatedAt: u.createdAt
        };
      }
    });

    entityUpdates.forEach(e => {
      if (e._id) {
        updatesMap[e._id.toString()] = {
          editedBy: e.editedByRole || 'System',
          updatedAt: e.createdAt
        };
      }
    });

    res.status(200).json({
      status: 'success',
      data: { latestUpdates: updatesMap }
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// ENTERPRISE HIERARCHY TREE (v2)
// ==========================================

export const getEnterpriseHierarchyTree = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    registerModels();
    
    // 1. Determine Scope
    let rootUserId = null;
    if (req.user && req.user.role !== 'ROOT_ADMIN' && req.user.role !== 'CENTRAL_TEAM') {
      rootUserId = req.user._id?.toString();
    }

    // 2. Fetch all Active users & reporting structures
    const users = await User.find({ status: { $ne: 'Terminated' } })
      .populate('hotel', 'name hotelCode')
      .select('firstName lastName email role department designation status phone employeeId joinedDate hotel enabledFeatures salaryDetails photoUrl hierarchyLevel hierarchyPath parentId reportingManagerId');
      
    const reportingStructures = await ReportingStructure.find();

    // 3. Optional Subtree Scoping
    const allowedUserIds = new Set<string>();
    if (rootUserId) {
      const rootStruct = reportingStructures.find(s => s?.userId?.toString() === rootUserId);
      const rootPath = rootStruct ? rootStruct.path : `/${rootUserId}`;
      reportingStructures.forEach(struct => {
        if (struct?.userId && (struct.path === rootPath || struct.path?.startsWith(rootPath + '/'))) {
          allowedUserIds.add(struct.userId.toString());
        }
      });
      allowedUserIds.add(rootUserId);
    }

    const filteredUsers = rootUserId 
      ? users.filter(u => u?._id && allowedUserIds.has(u._id.toString()))
      : users;

    // 4. Map users
    const userMap = new Map();
    filteredUsers.forEach(u => {
      if (!u?._id) return;
      userMap.set(u._id.toString(), {
        id: u._id.toString(),
        name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Unknown',
        email: u.email || '',
        role: u.role || 'EMPLOYEE',
        departmentName: u.department || '',
        designation: u.designation || '',
        status: u.status || 'Active',
        employeeId: u.employeeId || '',
        hotelCode: (u.hotel as any)?.hotelCode || 'OTHER',
        hotelName: (u.hotel as any)?.name || 'Central',
        photoUrl: u.photoUrl || '',
        children: [],
        hasParent: false
      });
    });

    // 5. Link users using ReportingStructure
    const visitedChildren = new Set<string>();
    reportingStructures.forEach((struct) => {
      if (!struct?.userId || !struct?.managerId) return;
      const userIdStr = struct.userId.toString();
      const managerIdStr = struct.managerId.toString();
      
      if (userIdStr === managerIdStr) return; // Self-loop

      const userNode = userMap.get(userIdStr);
      const managerNode = userMap.get(managerIdStr);
      
      if (userNode && managerNode) {
        if (!visitedChildren.has(userIdStr)) {
          managerNode.children.push(userNode);
          userNode.hasParent = true;
          visitedChildren.add(userIdStr);
        }
      }
    });

    // 6. Return Root Nodes
    const tree = Array.from(userMap.values()).filter(u => !u.hasParent);

    res.status(200).json({
      status: 'success',
      data: { tree }
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// AUTOMATIC HIERARCHY SYNC (REPORTING MANAGER CHANGE)
// ==========================================

export const syncHierarchyOnManagerChange = async (employeeId: string, oldManagerId: string | null, newManagerId: string, currentUserId: string) => {
  try {
    const { Task } = await import('@/models/Task');
    const { Leave } = await import('@/models/Leave');
    const { getIO } = await import('@/lib/socket');
    
    // 1. Update Tasks assigned by the old manager to the new manager
    if (oldManagerId) {
      await Task.updateMany(
        { 
          assignedTo: employeeId, 
          assignedBy: oldManagerId 
        },
        { 
          $set: { assignedBy: newManagerId } 
        }
      );
    }
    
    // 2. We don't need to update Pending Leaves because leave queries are dynamic,
    // but if there are specific manager references, they could be updated here.
    
    // 3. Update ReportingStructure & HierarchyNode if they exist for this employee
    const newManager = await User.findById(newManagerId);
    if (newManager) {
      await HierarchyNode.updateOne(
        { userId: employeeId },
        { 
          $set: { 
            parentId: newManagerId,
            hierarchyLevel: (newManager.hierarchyLevel || 0) + 1
          } 
        }
      );
      
      const newManagerReportingNode = await ReportingStructure.findOne({ userId: newManagerId });
      if (newManagerReportingNode) {
        await ReportingStructure.updateOne(
          { userId: employeeId },
          { 
            $set: { 
              managerId: newManagerId,
              path: `${newManagerReportingNode.path}/${employeeId}`
            } 
          }
        );
      }
    }
    
    // 4. Send Notifications
    const employee = await User.findById(employeeId);
    const empName = employee ? `${employee.firstName} ${employee.lastName}` : 'An employee';
    
    // To New Manager
    await createNotification({
      title: 'Reporting Manager Update',
      message: `A new employee (${empName}) has been assigned to your hierarchy.`,
      type: 'info',
      recipientId: newManagerId,
      link: '/dashboard/team',
      sender: currentUserId
    });
    
    // To Old Manager
    if (oldManagerId) {
      await createNotification({
        title: 'Reporting Manager Update',
        message: `An employee (${empName}) has been reassigned from your hierarchy.`,
        type: 'warning',
        recipientId: oldManagerId,
        sender: currentUserId
      });
    }
    
    // 5. Trigger Real-time WebSocket Event to refresh hierarchy tree
    const io = getIO();
    if (io) {
      io.emit('hierarchy_updated', {
        employeeId,
        oldManagerId,
        newManagerId,
        message: 'Hierarchy tree updated'
      });
    }
    
  } catch (error) {
    console.error('Error during automatic hierarchy sync:', error);
  }
};
