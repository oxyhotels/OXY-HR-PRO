import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/config/db';
import { User } from '@/models/User';
import { InviteLink } from '@/models/InviteLink';
import { Department } from '@/models/Department';
import { Hotel } from '@/models/Hotel';
import { ReportingStructure } from '@/models/ReportingStructure';
import { HierarchyNode } from '@/models/HierarchyNode';
import { addUserToGlobalGroup, syncUserDepartmentGroups } from '@/controllers/community.controller';

export async function POST(req: Request) {
  try {
    await connectDB();

    const body = await req.json();
    const { inviteCode, fullName, phone, email, dob, photoUrl, password } = body;

    if (!inviteCode || !fullName || !phone || !password) {
      return NextResponse.json(
        { status: 'error', message: 'Full Name, Mobile Number, and Password are required.' },
        { status: 400 }
      );
    }

    // 1. Validate Invite Link
    const invite = await InviteLink.findOne({ inviteCode });
    if (!invite) {
      return NextResponse.json(
        { status: 'error', message: 'Invalid or Expired Invite Code' },
        { status: 400 }
      );
    }

    const statusUpper = (invite.status || '').toUpperCase();
    if (statusUpper === 'DISABLED' || statusUpper === 'DISABLE') {
      return NextResponse.json(
        { status: 'error', message: 'Invalid or Expired Invite Code' },
        { status: 400 }
      );
    }

    if (invite.expiresAt && new Date() > new Date(invite.expiresAt)) {
      return NextResponse.json(
        { status: 'error', message: 'Invalid or Expired Invite Code' },
        { status: 400 }
      );
    }

    // 2. Prepare User Details
    const nameParts = fullName.trim().split(/\s+/);
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : ' ';
    const generatedEmail = email || `${phone}@oxyhr.app`;

    // Check if user with this email or phone already exists
    const existingUser = await User.findOne({ $or: [{ email: generatedEmail }, { phone }] });
    if (existingUser) {
      return NextResponse.json(
        { status: 'error', message: 'User with this mobile number already exists.' },
        { status: 400 }
      );
    }

    // Determine Role
    const userRole = invite.inviteType === 'manager' || invite.role === 'manager' ? 'DEPT_MANAGER' : 'EMPLOYEE';

    // Generate Code
    const randomSuffix = Math.floor(1000 + Math.random() * 9000).toString();
    const generatedCode = userRole === 'DEPT_MANAGER' ? `MGR-${randomSuffix}` : `EMP-${randomSuffix}`;

    // 3. Compute Hierarchy level and paths
    const managerUser = await User.findById(invite.managerId);
    let managerLevel = 0;
    if (managerUser && typeof managerUser.hierarchyLevel === 'number') {
      managerLevel = managerUser.hierarchyLevel;
    } else {
      const managerStruct = await ReportingStructure.findOne({ userId: invite.managerId });
      if (managerStruct && managerStruct.path) {
        managerLevel = managerStruct.path.split('/').filter(Boolean).length - 1;
      }
    }
    const newUserLevel = managerLevel + 1;

    let parentPath = '';
    const managerStruct = await ReportingStructure.findOne({ userId: invite.managerId });
    if (managerStruct) {
      parentPath = managerStruct.path;
    } else {
      parentPath = `/${invite.managerId}`;
    }

    const newUserId = new mongoose.Types.ObjectId();
    const currentPath = `${parentPath}/${newUserId}`;

    // Fetch Root Admin to link their ID
    const rootAdmin = await User.findOne({ role: 'ROOT_ADMIN' });

    // Create User & Auto-Map Hierarchy
    const newUser = new User({
      _id: newUserId,
      firstName,
      lastName,
      email: generatedEmail,
      password: password, // Store provided password
      phone,
      role: userRole,
      hotel: invite.organizationId,
      department: invite.department || 'Operations', // Fallback
      parentManagerId: invite.managerId,
      invitedById: invite.managerId,
      status: 'Basic Registered',
      joinedDate: new Date(),
      photoUrl: photoUrl || undefined,
      employeeId: generatedCode,
      employeeCode: userRole !== 'DEPT_MANAGER' ? generatedCode : undefined,
      managerCode: userRole === 'DEPT_MANAGER' ? generatedCode : undefined,
      personalDetails: dob ? {
        dob: new Date(dob)
      } : undefined,
      hierarchyLevel: newUserLevel,
      hierarchyPath: currentPath,
      parentId: invite.managerId,
      rootAdminId: rootAdmin ? rootAdmin._id : undefined,
    });

    // Resolve department name if it's an ObjectId
    if (invite.departmentId) {
      try {
        const deptObj = await Department.findById(invite.departmentId);
        if (deptObj) {
          newUser.department = deptObj.name;
        }
      } catch (e) {}
    }

    await newUser.save();

    // 4. Create reporting structure and hierarchy node
    await ReportingStructure.create({
      userId: newUserId,
      managerId: invite.managerId,
      departmentId: invite.departmentId,
      organizationId: invite.organizationId,
      path: currentPath,
    });

    await HierarchyNode.create({
      userId: newUserId,
      parentId: invite.managerId,
      departmentId: invite.departmentId,
      organizationId: invite.organizationId,
      role: userRole,
      hierarchyLevel: newUserLevel,
      hierarchyPath: currentPath,
    });

    // 5. Community Group Auto-join & Sync
    try {
      await addUserToGlobalGroup(newUserId);
      await syncUserDepartmentGroups(newUser);
    } catch (e) {
      console.error('[Invite Join] Community group sync error:', e);
    }

    return NextResponse.json({
      status: 'success',
      message: 'Registration successful! You have joined the organization.',
      user: {
        id: newUser._id,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        role: newUser.role,
        email: newUser.email,
        phone: newUser.phone
      }
    });

  } catch (error: any) {
    console.error('Invite Join Error:', error);
    return NextResponse.json(
      { status: 'error', message: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
