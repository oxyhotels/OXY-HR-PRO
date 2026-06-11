import { z } from 'zod';

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters long'),
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().nonempty('Token is required'),
    password: z.string().min(6, 'Password must be at least 6 characters long'),
  }),
});

export const createEmployeeSchema = z.object({
  body: z.object({
    firstName: z.string().min(2, 'First name is too short'),
    lastName: z.string().min(2, 'Last name is too short'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters long').optional(),
    role: z.enum(['HOTEL_ADMIN', 'HR_MANAGER', 'DEPT_MANAGER', 'EMPLOYEE']),
    department: z.string().optional(),
    designation: z.string().optional(),
    phone: z.string().optional(),
    salaryDetails: z.object({
      baseSalary: z.number().nonnegative(),
      allowances: z.array(z.object({ name: z.string(), amount: z.number() })).optional(),
      deductions: z.array(z.object({ name: z.string(), amount: z.number() })).optional(),
    }).optional(),
    bankDetails: z.object({
      accountNo: z.string().optional(),
      bankName: z.string().optional(),
      ifsc: z.string().optional(),
    }).optional(),
  }),
});
