import { Request, Response, NextFunction } from 'express';
import { User } from '@/models/User';
import { Hotel } from '@/models/Hotel';
import { ApiError } from '@/utils/ApiError';
import { AuditLog } from '@/models/AuditLog';
import { syncUserDepartmentGroups, addUserToGlobalGroup } from './community.controller';
import { Attendance } from '@/models/Attendance';
import { diffFields, logAuditTrail } from '@/utils/audit';
const validateShiftDetails = (body: any) => {
  if (body.isCustom) {
    if (!body.startTime) {
      throw new ApiError(400, 'Start time is required for custom shifts');
    }
    if (!body.endTime) {
      throw new ApiError(400, 'End time is required for custom shifts');
    }
    // Validate time format (24h standard HH:MM or 12h HH:MM AM/PM)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    const ampmRegex = /^(0[1-9]|1[0-2]):[0-5][0-9]\s*(AM|PM)$/i;
    
    if (!timeRegex.test(body.startTime) && !ampmRegex.test(body.startTime)) {
      throw new ApiError(400, 'Invalid startTime format. Use HH:MM or HH:MM AM/PM');
    }
    if (!timeRegex.test(body.endTime) && !ampmRegex.test(body.endTime)) {
      throw new ApiError(400, 'Invalid endTime format. Use HH:MM or HH:MM AM/PM');
    }
  }
};

// Helper to log audit actions
const logAudit = async (userId: string, hotelId: any, action: string, details: string) => {
  await AuditLog.create({
    user: userId,
    hotel: hotelId,
    action,
    module: 'EMPLOYEE',
    details,
  });
};

export const createEmployee = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    validateShiftDetails(req.body);
    const { 
      firstName, 
      lastName, 
      email, 
      password, 
      role, 
      department, 
      designation, 
      phone, 
      salaryDetails, 
      bankDetails,
      aadhaarNumber,
      panNumber,
      emergencyContact,
      documents,
      shift,
      homeLocation
    } = req.body;

    // Check if email taken
    const existing = await User.findOne({ email });
    if (existing) {
      throw new ApiError(400, 'Email is already registered');
    }

    // Tenancy Check: HR/Hotel Admin can only create employees for their own hotel
    let employeeHotel = req.user?.hotel;
    if (req.user?.role === 'ROOT_ADMIN') {
      employeeHotel = req.body.hotelId; // Root Admin specifies hotelId in body
      if (!employeeHotel) {
        throw new ApiError(400, 'Hotel ID is required for ROOT_ADMIN when creating employees');
      }
    }

    if (!employeeHotel && req.user?.role !== 'ROOT_ADMIN') {
      throw new ApiError(400, 'Tenancy error: could not resolve hotel ID');
    }

    // Status: Pending if registered by Manager/HR, Active if registered by Root Admin
    const status = req.user?.role === 'ROOT_ADMIN' ? 'Active' : 'Pending';

    const employee = await User.create({
      firstName,
      lastName,
      email,
      password: password || 'OxyHr123!', // default password if not provided
      role,
      hotel: employeeHotel,
      department,
      designation,
      phone,
      salaryDetails,
      bankDetails,
      aadhaarNumber,
      panNumber,
      emergencyContact,
      status,
      documents: documents || [],
      shift,
      shiftType: req.body.shiftType,
      shiftName: req.body.shiftName,
      startTime: req.body.startTime,
      endTime: req.body.endTime,
      totalHours: req.body.totalHours,
      isCustom: req.body.isCustom,
      homeLocation,
    });

    await syncUserDepartmentGroups(employee);
    // Auto-join global community for Active employees
    if (employee.status === 'Active') {
      await addUserToGlobalGroup(employee._id);
    }

    if (req.user) {
      await logAudit(
        req.user._id.toString(),
        employeeHotel,
        'CREATE_EMPLOYEE',
        `Employee ${firstName} ${lastName} (${email}) created as ${role}`
      );
    }

    res.status(201).json({
      status: 'success',
      data: {
        employee: {
          id: employee._id,
          firstName: employee.firstName,
          lastName: employee.lastName,
          email: employee.email,
          role: employee.role,
          hotel: employee.hotel,
          department: employee.department,
          designation: employee.designation,
          phone: employee.phone,
          status: employee.status,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getEmployees = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const filter: any = {};
    const currentUser = req.user;

    if (!currentUser) throw new ApiError(401, 'Unauthorized');

    const isRoot = currentUser.role === 'ROOT_ADMIN';
    const isCentral = currentUser.department === 'Central Team';
    const isHotelAdmin = currentUser.role === 'HOTEL_ADMIN' || currentUser.role === 'HR_MANAGER';

    // 1. Root and Central Team see all properties
    if (isRoot || isCentral) {
      if (req.query.hotelId) {
        filter.hotel = req.query.hotelId;
      }
    } else {
      // 2. Everyone else is scoped to their own property
      filter.hotel = currentUser.hotel;

      // 3. If not an Admin/HR, must be a Reporting Manager
      if (!isHotelAdmin) {
        const subCount = await User.countDocuments({ reportingManagerId: currentUser._id });
        if (subCount > 0) {
          filter.reportingManagerId = currentUser._id;
        } else {
          // Employee / Manager with no subordinates -> Return empty list
          res.status(200).json({ status: 'success', results: 0, data: { employees: [] } });
          return;
        }
      }
    }

    if (req.query.department) {
      filter.department = req.query.department;
    }

    if (req.query.status) {
      filter.status = req.query.status;
    }

    let query = User.find(filter).populate('hotel', 'name hotelCode');
    if (req.user?.role === 'ROOT_ADMIN') {
      query = query.select('+password');
    }
    // Only ROOT_ADMIN and HR_MANAGER can see homeLocation
    if (req.user?.role !== 'ROOT_ADMIN' && req.user?.role !== 'HR_MANAGER') {
      query = query.select('-homeLocation');
    }
    const employees = await query;

    res.status(200).json({
      status: 'success',
      results: employees.length,
      data: { employees },
    });
  } catch (error) {
    next(error);
  }
};

export const getEmployeeById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    let query = User.findById(req.params.id).populate('hotel', 'name hotelCode');
    if (req.user?.role === 'ROOT_ADMIN') {
      query = query.select('+password');
    }
    // Only ROOT_ADMIN and HR_MANAGER can see homeLocation
    if (req.user?.role !== 'ROOT_ADMIN' && req.user?.role !== 'HR_MANAGER') {
      query = query.select('-homeLocation');
    }
    const employee = await query;
    if (!employee) {
      throw new ApiError(404, 'Employee not found');
    }

    // Tenancy Scoping validation
    if (req.user?.role !== 'ROOT_ADMIN' && employee.hotel?.toString() !== req.user?.hotel?.toString()) {
      throw new ApiError(403, 'Permission denied: cannot access profiles from other hotels');
    }

    res.status(200).json({
      status: 'success',
      data: { employee },
    });
  } catch (error) {
    next(error);
  }
};

export const updateEmployee = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    validateShiftDetails(req.body);
    const employee = await User.findById(req.params.id);
    if (!employee) {
      throw new ApiError(404, 'Employee not found');
    }

    // Clone original user data before update for audit logs
    const originalUser = employee.toObject();

    // Tenancy check
    if (req.user?.role !== 'ROOT_ADMIN' && employee.hotel?.toString() !== req.user?.hotel?.toString()) {
      throw new ApiError(403, 'Permission denied: cannot modify profiles from other hotels');
    }

    // Control permissions of update:
    // HR/Admins can edit everything, Employees can update their basic details, bank details, documents, and emergency contacts.
    const updates = req.body;

    // Email change safeguard
    if (updates.email && updates.email.toLowerCase() !== employee.email.toLowerCase()) {
      const existing = await User.findOne({ email: updates.email.toLowerCase() });
      if (existing) {
        throw new ApiError(400, 'Email is already registered');
      }
    }
    if (req.user?.role === 'EMPLOYEE' && req.user._id.toString() !== employee._id.toString()) {
      throw new ApiError(403, 'You can only edit your own profile');
    }

    if (req.user?.role === 'EMPLOYEE') {
      // Whitelist update fields for normal employee self-management
      const allowed = [
        'firstName',
        'lastName',
        'phone',
        'email',
        'personalDetails',
        'aadhaarNumber',
        'panNumber',
        'bankDetails',
        'emergencyContact',
        'documents',
        'photoUrl'
      ];
      const sanitized: any = {};
      allowed.forEach(f => {
        if (updates[f] !== undefined) sanitized[f] = updates[f];
      });
      Object.assign(employee, sanitized);
    } else {
      // HR / Admins can modify designation, status, department, and salary structures.
      Object.assign(employee, updates);
    }

    if (req.user && req.user._id.toString() !== employee._id.toString()) {
      if (!employee.editAuditLog) employee.editAuditLog = [];
      employee.editAuditLog.push({
        updatedBy: `${req.user.firstName} ${req.user.lastName}`,
        role: req.user.role,
        date: new Date()
      });
    }

    await employee.save();
    await syncUserDepartmentGroups(employee);

    if (req.user && originalUser) {
      // ✅ Trigger Automatic Hierarchy Synchronization if manager changed
      const oldManagerId = originalUser.reportingManagerId;
      const newManagerId = employee.reportingManagerId;
      if (oldManagerId !== newManagerId && newManagerId) {
        try {
          const { syncHierarchyOnManagerChange } = await import('@/controllers/hierarchy.controller');
          await syncHierarchyOnManagerChange(employee._id.toString(), oldManagerId || null, newManagerId, req.user._id.toString());
          
          // Emit socket event to trigger real-time UI refresh for new and old manager
          if ((global as any).io) {
            (global as any).io.emit('reporting_manager_updated', {
              employeeId: employee._id.toString(),
              oldManagerId,
              newManagerId
            });
          }
        } catch (syncErr) {
          console.error('Failed to sync hierarchy automatically:', syncErr);
        }
      }

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
        employee,
        fieldsToTrack
      );

      if (hasChanged) {
        const module = isEmployee ? 'Employee' : 'Manager';
        const action = isEmployee ? 'Employee Updated' : 'Manager Updated';
        const details = `${module} profile for ${employee.firstName} ${employee.lastName} updated: ${changedFields.join(', ')}`;
        
        await logAuditTrail({
          userId: req.user._id,
          action,
          module,
          oldValue,
          newValue,
          details,
          targetUserId: employee._id,
          req,
        });

        // Track Hierarchy changes if department, hotel, or reportingManager changed
        const hierarchyFields = ['department', 'hotel', 'reportingManager'];
        const changedHierarchy = changedFields.filter(f => hierarchyFields.includes(f));
        if (changedHierarchy.length > 0) {
          let oldProperty = originalUser.hotel;
          let newProperty = employee.hotel;
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
          
          if (employee.department) newHierarchyParts.push(`Department: ${employee.department}`);
          if (employee.reportingManager) newHierarchyParts.push(`Manager: ${employee.reportingManager}`);
          if (employee.hotel) newHierarchyParts.push(`Property: ${newProperty}`);

          await logAuditTrail({
            userId: req.user._id,
            action: 'Hierarchy Updated',
            module: 'Hierarchy',
            oldValue: oldHierarchyParts.join(' | ') || 'None',
            newValue: newHierarchyParts.join(' | ') || 'None',
            details: `Hierarchy moved for user ${employee.firstName} ${employee.lastName}`,
            targetUserId: employee._id,
            req,
          });
        }
      }

      await logAudit(
        req.user._id.toString(),
        employee.hotel,
        'UPDATE_EMPLOYEE',
        `Employee profile ${employee.firstName} ${employee.lastName} updated`
      );
    }

    res.status(200).json({
      status: 'success',
      data: { employee },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteEmployee = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const employee = await User.findById(req.params.id);
    if (!employee) {
      throw new ApiError(404, 'Employee not found');
    }

    // Tenancy check
    if (req.user?.role !== 'ROOT_ADMIN' && employee.hotel?.toString() !== req.user?.hotel?.toString()) {
      throw new ApiError(403, 'Permission denied: cannot delete employees from other hotels');
    }

    employee.status = 'Terminated';
    await employee.save();

    if (req.user) {
      await logAudit(
        req.user._id.toString(),
        employee.hotel,
        'DELETE_EMPLOYEE',
        `Employee ${employee.firstName} ${employee.lastName} terminated`
      );
    }

    res.status(200).json({
      status: 'success',
      message: 'Employee terminated successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Document Upload (Mock implementation for instant setup - stores in files index database metadata)
export const uploadDocument = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, fileUrl } = req.body;
    const employee = await User.findById(req.params.id);
    if (!employee) {
      throw new ApiError(404, 'Employee not found');
    }

    if (req.user?.role !== 'ROOT_ADMIN' && employee.hotel?.toString() !== req.user?.hotel?.toString()) {
      throw new ApiError(403, 'Access denied');
    }

    employee.documents.push({
      name,
      fileUrl: fileUrl || '/uploads/mock-doc.pdf',
      uploadedAt: new Date(),
    });

    await employee.save();

    res.status(200).json({
      status: 'success',
      data: { documents: employee.documents },
    });
  } catch (error) {
    next(error);
  }
};

export const getPendingSignups = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (req.user?.role !== 'ROOT_ADMIN' && req.user?.role !== 'HOTEL_ADMIN') {
      throw new ApiError(403, 'Permission denied');
    }

    const filter: any = { status: 'Pending' };
    if (req.user.role === 'HOTEL_ADMIN') {
      filter.hotel = req.user.hotel;
    }

    let query = User.find(filter).populate('hotel');
    if (req.user?.role === 'ROOT_ADMIN') {
      query = query.select('+password');
    }
    const pendingUsers = await query;
    res.status(200).json({
      status: 'success',
      results: pendingUsers.length,
      data: { pendingUsers },
    });
  } catch (error) {
    next(error);
  }
};

export const approveSignup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { action, role, department, salary } = req.body;
    if (req.user?.role !== 'ROOT_ADMIN' && req.user?.role !== 'HOTEL_ADMIN') {
      throw new ApiError(403, 'Permission denied');
    }

    const employee = await User.findById(req.params.id);
    if (!employee) {
      throw new ApiError(404, 'Signup request not found');
    }

    // Tenancy Check: HOTEL_ADMIN can only approve/reject signups for their own hotel
    if (req.user.role === 'HOTEL_ADMIN' && employee.hotel?.toString() !== req.user.hotel?.toString()) {
      throw new ApiError(403, 'Access denied: Cannot approve signup request for a different hotel');
    }

    if (action === 'reject') {
      employee.status = 'Terminated';
      await employee.save();

      await logAudit(
        req.user._id.toString(),
        employee.hotel,
        'REJECT_SIGNUP',
        `Signup request for ${employee.email} rejected`
      );

      res.status(200).json({
        status: 'success',
        message: `User signup request rejected successfully.`,
        data: { employee },
      });
      return;
    }

    // Approve flow
    if (role) {
      const validRoles = ['HOTEL_ADMIN', 'HR_MANAGER', 'DEPT_MANAGER', 'EMPLOYEE'];
      if (!validRoles.includes(role)) {
        throw new ApiError(400, 'Invalid role assigned. Must be a valid platform role.');
      }
      employee.role = role;
    }

    if (department) {
      employee.department = department;
    }

    if (salary !== undefined && salary !== null) {
      employee.salaryDetails = {
        baseSalary: Number(salary),
        allowances: employee.salaryDetails?.allowances || [],
        deductions: employee.salaryDetails?.deductions || []
      };
    }

    employee.status = 'Active';
    await employee.save();

    await syncUserDepartmentGroups(employee);
    // Auto-join the OXY Global Community on approval
    await addUserToGlobalGroup(employee._id);

    // Activate the associated hotel
    if (employee.hotel) {
      const hotel = await Hotel.findById(employee.hotel);
      if (hotel && hotel.status === 'Suspended') {
        hotel.status = 'Active';
        await hotel.save();
      }
    }

    await logAudit(
      req.user._id.toString(),
      employee.hotel,
      'APPROVE_SIGNUP',
      `Signup request for ${employee.email} approved as ${employee.role}`
    );

    res.status(200).json({
      status: 'success',
      message: `User signup approved successfully as ${employee.role}`,
      data: { employee },
    });
  } catch (error) {
    next(error);
  }
};

export const getStaffOverview = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (req.user?.role !== 'ROOT_ADMIN') {
      throw new ApiError(403, 'Permission denied. Only Root Admin can view overall staff status.');
    }

    const todayDateStr = new Date().toISOString().split('T')[0];

    // Fetch all employees/managers (excluding ROOT_ADMIN and Pending users if needed, but let's include active only for active tracking)
    // Actually, Total Staff includes all registered, maybe active and terminated. Let's fetch all users.
    const allUsers = await User.find({
      role: { $in: ['EMPLOYEE', 'HR_MANAGER', 'DEPT_MANAGER', 'HOTEL_ADMIN'] },
      status: 'Active'
    }).select('_id role status');

    const totalEmployeesCount = allUsers.filter(u => u.role === 'EMPLOYEE').length;
    const totalManagersCount = allUsers.filter(u => u.role !== 'EMPLOYEE').length;
    const totalStaffCount = totalEmployeesCount + totalManagersCount;

    // Fetch today's attendances
    const todayAttendances = await Attendance.find({
      date: todayDateStr,
      employee: { $in: allUsers.map(u => u._id) }
    }).select('employee checkOut status');

    let activeEmployees = 0;
    let activeManagers = 0;
    let dutyOffEmployees = 0;
    let dutyOffManagers = 0;

    allUsers.forEach(user => {
      const attendance = todayAttendances.find(a => a.employee.toString() === user._id.toString());
      
      let isActive = false;
      if (attendance && !attendance.checkOut && attendance.status === 'Present') {
        isActive = true;
      }

      if (user.role === 'EMPLOYEE') {
        if (isActive) activeEmployees++;
        else dutyOffEmployees++;
      } else {
        if (isActive) activeManagers++;
        else dutyOffManagers++;
      }
    });

    res.status(200).json({
      status: 'success',
      data: {
        totalStaff: {
          total: totalStaffCount,
          employees: totalEmployeesCount,
          managers: totalManagersCount
        },
        activeStaff: {
          total: activeEmployees + activeManagers,
          employees: activeEmployees,
          managers: activeManagers
        },
        dutyOffStaff: {
          total: dutyOffEmployees + dutyOffManagers,
          employees: dutyOffEmployees,
          managers: dutyOffManagers
        }
      }
    });
  } catch (error) {
    next(error);
  }
};
