import { Request, Response, NextFunction } from 'express';
import { User } from '@/models/User';
import { Hotel } from '@/models/Hotel';
import { ApiError } from '@/utils/ApiError';
import { AuditLog } from '@/models/AuditLog';

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
      shift
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
    });

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

    // Tenancy scoping: Root Admin sees all or filters by hotel query. Everyone else only sees their hotel's employees.
    if (req.user?.role !== 'ROOT_ADMIN') {
      filter.hotel = req.user?.hotel;
    } else if (req.query.hotelId) {
      filter.hotel = req.query.hotelId;
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
    const employee = await User.findById(req.params.id);
    if (!employee) {
      throw new ApiError(404, 'Employee not found');
    }

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

    await employee.save();

    if (req.user) {
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
