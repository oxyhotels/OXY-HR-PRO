import mongoose from 'mongoose';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '@/models/User';
import { Hotel } from '@/models/Hotel';
import { Department } from '@/models/Department';
import { InviteLink } from '@/models/InviteLink';
import { ApiError } from '@/utils/ApiError';
import { config } from '@/config/config';
import { AuditLog } from '@/models/AuditLog';
import { createNotification } from '@/services/notification.service';

// Helper to generate access and refresh tokens
const generateTokens = (user: any) => {
  const accessToken = jwt.sign(
    { id: user._id, role: user.role, hotelId: user.hotel },
    config.jwt.secret,
    { expiresIn: `${config.jwt.accessExpirationMinutes}m` }
  );

  const refreshToken = jwt.sign(
    { id: user._id },
    config.jwt.secret,
    { expiresIn: `${config.jwt.refreshExpirationDays}d` }
  );

  return { accessToken, refreshToken };
};

// Log action to audit logs
const logAudit = async (userId: string, hotelId: any, action: string, details: string) => {
  try {
    await AuditLog.create({
      user: userId,
      hotel: hotelId,
      action,
      module: 'AUTH',
      details,
    });
  } catch (error) {
    console.error('Audit log failed', error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    console.log('[DEBUG] Login attempt:', { email: req.body?.email, passwordLength: req.body?.password?.length });
    const { email: rawEmail, password } = req.body;

    if (!rawEmail || !password) {
      throw new ApiError(400, 'Email and password are required');
    }

    const email = rawEmail.toLowerCase().trim();

    const envRootEmail = process.env.OXY_ROOT_ADMIN_EMAIL || 'oxy8626@gmail.com';
    const envRootPass = process.env.OXY_ROOT_ADMIN_PASS || process.env.OXY_ROOT_ADMN_PASS || 'OXY@@8626';

    let user;

    if (email === envRootEmail.toLowerCase().trim()) {
      if (password !== envRootPass) {
        throw new ApiError(401, 'Incorrect email or password');
      }

      // Check if root user exists in DB
      let dbUser = await User.findOne({ email: envRootEmail.toLowerCase().trim() }).select('+password');
      if (!dbUser) {
        // Create root admin dynamically
        dbUser = await User.create({
          firstName: 'Oxy',
          lastName: 'Root Admin',
          email: envRootEmail.toLowerCase().trim(),
          password: envRootPass,
          role: 'ROOT_ADMIN',
          status: 'Active',
          joinedDate: new Date(),
        });
      } else {
        // Sync password in database if changed in env
        const isMatch = await dbUser.comparePassword(envRootPass);
        if (!isMatch) {
          dbUser.password = envRootPass;
          await dbUser.save();
        }
      }
      user = dbUser;
    } else {
      // Find normal user and include password field
      user = await User.findOne({ email }).select('+password');
      if (!user || !(await user.comparePassword(password))) {
        throw new ApiError(401, 'Incorrect email or password');
      }
    }

    if (user.status === 'Pending') {
      throw new ApiError(403, 'Your registration is pending approval by the Root Admin');
    }

    if (user.status === 'Terminated') {
      throw new ApiError(403, 'Account is deactivated');
    }

    const { accessToken, refreshToken } = generateTokens(user);

    const isProd = process.env.NODE_ENV === 'production' || !!process.env.VERCEL;

    // Set access token in HTTP-only cookie
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: config.jwt.accessExpirationMinutes * 60 * 1000,
    });

    // Set refresh token in HTTP-only cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: config.jwt.refreshExpirationDays * 24 * 60 * 60 * 1000,
    });

    await logAudit(user._id.toString(), user.hotel, 'LOGIN', `User logged in from IP ${req.ip}`);

    // Return user info and access token
    res.status(200).json({
      status: 'success',
      data: {
        accessToken,
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          hotel: user.hotel,
          department: user.department,
          designation: user.designation,
          phone: user.phone,
          employeeId: user.employeeId,
          reportingManager: user.reportingManager,
          employmentType: user.employmentType,
          aadhaarNumber: user.aadhaarNumber,
          panNumber: user.panNumber,
          personalDetails: user.personalDetails,
          salaryDetails: user.salaryDetails,
          bankDetails: user.bankDetails,
          emergencyContact: user.emergencyContact,
          documents: user.documents,
          photoUrl: user.photoUrl,
          shift: user.shift,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (req.user) {
      await logAudit(req.user.id, req.user.hotel, 'LOGOUT', `User logged out`);
    }

    const isProd = process.env.NODE_ENV === 'production' || !!process.env.VERCEL;

    res.clearCookie('accessToken', {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
    });

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
    });

    res.status(200).json({
      status: 'success',
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
      throw new ApiError(401, 'Refresh token missing');
    }

    let decoded: any;
    try {
      decoded = jwt.verify(refreshToken, config.jwt.secret);
    } catch (err) {
      throw new ApiError(401, 'Invalid or expired refresh token');
    }

    const user = await User.findById(decoded.id);
    if (!user || user.status === 'Terminated') {
      throw new ApiError(401, 'User no longer exists or is deactivated');
    }

    const tokens = generateTokens(user);

    const isProd = process.env.NODE_ENV === 'production' || !!process.env.VERCEL;

    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: config.jwt.accessExpirationMinutes * 60 * 1000,
    });

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: config.jwt.refreshExpirationDays * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      status: 'success',
      data: {
        accessToken: tokens.accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'Not authenticated');
    }

    res.status(200).json({
      status: 'success',
      data: {
        user: {
          id: req.user._id,
          firstName: req.user.firstName,
          lastName: req.user.lastName,
          email: req.user.email,
          role: req.user.role,
          hotel: req.user.hotel,
          department: req.user.department,
          designation: req.user.designation,
          phone: req.user.phone,
          employeeId: req.user.employeeId,
          reportingManager: req.user.reportingManager,
          employmentType: req.user.employmentType,
          aadhaarNumber: req.user.aadhaarNumber,
          panNumber: req.user.panNumber,
          photoUrl: req.user.photoUrl,
          personalDetails: req.user.personalDetails,
          salaryDetails: req.user.salaryDetails,
          bankDetails: req.user.bankDetails,
          emergencyContact: req.user.emergencyContact,
          documents: req.user.documents,
          shift: req.user.shift,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// Forgot Password Flow
// Since we don't have an active SMTP server configured, we will return a simulated password-reset-token in the response for demo/development purposes.
export const forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      throw new ApiError(404, 'No user found with that email address');
    }

    // Generate quick reset token (expires in 10 minutes)
    const resetToken = jwt.sign({ id: user._id }, config.jwt.secret, { expiresIn: '10m' });

    await logAudit(user._id.toString(), user.hotel, 'FORGOT_PASSWORD_REQUEST', 'Password reset requested');

    res.status(200).json({
      status: 'success',
      message: 'Reset token generated successfully (Simulated Email)',
      data: {
        resetToken, // In production, this would be emailed as a link: https://domain.com/reset-password?token=XYZ
      },
    });
  } catch (error) {
    next(error);
  }
};

// Reset Password Flow
export const resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { token, password } = req.body;

    let decoded: any;
    try {
      decoded = jwt.verify(token, config.jwt.secret);
    } catch (err) {
      throw new ApiError(400, 'Password reset token is invalid or has expired');
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    // Set new password
    user.password = password;
    await user.save();

    await logAudit(user._id.toString(), user.hotel, 'RESET_PASSWORD', 'Password successfully reset');

    res.status(200).json({
      status: 'success',
      message: 'Password has been successfully updated',
    });
  } catch (error) {
    next(error);
  }
};

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { 
      fullName, 
      phone, 
      email, 
      password, 
      property, 
      department, 
      category, 
      role,
      employeeId,
      reportingManager,
      employmentType,
      designation,
      salary,
      address,
      aadhaarNumber,
      panNumber,
      bankName,
      accountNo,
      ifsc,
      emergencyContactName,
      emergencyContactRelation,
      emergencyContactPhone,
      joiningDate,
      documents,
      homeLocation,
      inviteCode
    } = req.body;

    // Check if email taken
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new ApiError(400, 'User email already exists');
    }

    // Verify property/hotel (optional for non-Property-Operations departments)
    let hotel;
    if (property) {
      if (property === 'other') {
        hotel = await Hotel.findOne({ hotelCode: 'OTHER' });
        if (!hotel) {
          // Create the "Other" hotel dynamically
          hotel = await Hotel.create({
            name: 'Other',
            hotelCode: 'OTHER',
            email: 'other@oxyhr.com',
            phone: '000-000-0000',
            address: {
              street: 'Main Street',
              city: 'City',
              state: 'State',
              zip: '00000',
              country: 'Country'
            },
            status: 'Active',
            subscriptionPlan: 'Standard'
          });
        }
      } else {
        if (!mongoose.Types.ObjectId.isValid(property)) {
          throw new ApiError(400, 'Invalid property ID format');
        }
        hotel = await Hotel.findById(property);
        if (!hotel) {
          throw new ApiError(400, 'Selected property does not exist');
        }
      }
    }

    // Validate role
    const validRoles = ['HOTEL_ADMIN', 'HR_MANAGER', 'DEPT_MANAGER', 'EMPLOYEE'];
    if (!validRoles.includes(role)) {
      throw new ApiError(400, 'Invalid role selected');
    }

    // Split fullName into firstName and lastName
    const nameParts = fullName.trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '.';

    // Determine initial values
    let finalStatus = 'Pending';
    let finalHotelId = hotel?._id;
    let finalDepartment = department;
    let finalReportingManager = reportingManager;
    let finalRole = role;
    let invitedById = undefined;

    if (inviteCode) {
      const invite = await InviteLink.findOne({ inviteCode, isActive: true });
      if (!invite) {
        throw new ApiError(400, 'Invalid or expired invite code');
      }
      if (invite.expiresAt < new Date()) {
        throw new ApiError(400, 'Invite code has expired');
      }

      const deptDoc = await Department.findById(invite.departmentId);
      if (!deptDoc) {
        throw new ApiError(404, 'Department associated with this invite not found');
      }

      finalHotelId = invite.organizationId;
      finalDepartment = deptDoc.name;
      finalReportingManager = invite.managerId;
      invitedById = invite.managerId;
      finalStatus = 'Active';
      finalRole = invite.inviteType === 'manager' ? 'DEPT_MANAGER' : 'EMPLOYEE';
    }

    // Create User with resolved status and assignments
    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      role: finalRole,
      department: finalDepartment,
      category,
      phone,
      hotel: finalHotelId,
      status: finalStatus,
      joinedDate: joiningDate ? new Date(joiningDate) : new Date(),
      employeeId,
      reportingManager: finalReportingManager,
      invitedById,
      employmentType,
      designation,
      salaryDetails: salary ? {
        baseSalary: Number(salary),
        allowances: [],
        deductions: []
      } : undefined,
      personalDetails: address ? {
        address
      } : undefined,
      aadhaarNumber,
      panNumber,
      bankDetails: (bankName || accountNo || ifsc) ? {
        bankName,
        accountNo,
        ifsc
      } : undefined,
      emergencyContact: (emergencyContactName || emergencyContactRelation || emergencyContactPhone) ? {
        name: emergencyContactName,
        relation: emergencyContactRelation,
        phone: emergencyContactPhone
      } : undefined,
      documents: documents || [],
      homeLocation,
      state: homeLocation?.state,
      district: homeLocation?.district
    });

    await logAudit(user._id.toString(), finalHotelId, inviteCode ? 'REGISTER_ACTIVE' : 'REGISTER_PENDING', `New signup for role ${finalRole} by ${email}`);

    if (finalStatus === 'Pending') {
      // Trigger notification to ROOT_ADMIN
      await createNotification({
        title: 'New Registration Request',
        message: `New signup request from ${firstName} ${lastName} (${email}) for role ${finalRole}.`,
        type: 'info',
        link: '/dashboard/employees',
        recipientRole: 'ROOT_ADMIN'
      });

      res.status(201).json({
        status: 'success',
        message: 'Your registration request has been submitted successfully and is pending approval by the Administrator.',
      });
    } else {
      res.status(201).json({
        status: 'success',
        message: 'Registration successful. You have joined the organization.',
      });
    }
  } catch (error) {
    next(error);
  }
};

export const verifyPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { password } = req.body;
    if (!password) {
      throw new ApiError(400, 'Password is required');
    }
    if (req.user?.role !== 'ROOT_ADMIN') {
      throw new ApiError(403, 'Access denied: Root Admin privileges required');
    }
    
    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      throw new ApiError(404, 'User not found');
    }
    
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new ApiError(401, 'Incorrect password');
    }
    
    res.status(200).json({
      status: 'success',
      message: 'Password verified successfully'
    });
  } catch (error) {
    next(error);
  }
};
