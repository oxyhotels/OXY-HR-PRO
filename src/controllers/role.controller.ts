import { Request, Response, NextFunction } from 'express';

export const permissionMatrix = {
  ROOT_ADMIN: [
    'MANAGE_HOTELS',
    'ASSIGN_HOTEL_ADMIN',
    'VIEW_ALL_REPORTS',
    'MANAGE_EMPLOYEES',
    'MANAGE_PAYROLL',
    'MANAGE_LEAVES',
    'MANAGE_ATTENDANCE',
    'MANAGE_TASKS',
  ],
  HOTEL_ADMIN: [
    'VIEW_HOTEL_DASHBOARD',
    'MANAGE_DEPARTMENTS',
    'MANAGE_EMPLOYEES',
    'MANAGE_ROLES',
    'VIEW_HOTEL_REPORTS',
    'MANAGE_PAYROLL',
    'MANAGE_LEAVES',
    'MANAGE_ATTENDANCE',
    'MANAGE_TASKS',
  ],
  HR_MANAGER: [
    'VIEW_HOTEL_DASHBOARD',
    'MANAGE_EMPLOYEES',
    'MANAGE_PAYROLL',
    'MANAGE_LEAVES',
    'MANAGE_ATTENDANCE',
    'VIEW_HOTEL_REPORTS',
    'MANAGE_TASKS',
  ],
  DEPT_MANAGER: [
    'VIEW_DEPT_DASHBOARD',
    'VIEW_DEPT_EMPLOYEES',
    'MANAGE_TASKS',
    'REVIEW_LEAVES',
    'VIEW_DEPT_ATTENDANCE',
  ],
  EMPLOYEE: [
    'VIEW_MY_DASHBOARD',
    'CLOCK_IN_OUT',
    'START_END_BREAKS',
    'REQUEST_LEAVES',
    'VIEW_MY_TASKS',
    'VIEW_MY_PAYSLIPS',
  ],
};

export const getPermissionMatrix = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    res.status(200).json({
      status: 'success',
      data: { permissionMatrix },
    });
  } catch (error) {
    next(error);
  }
};
