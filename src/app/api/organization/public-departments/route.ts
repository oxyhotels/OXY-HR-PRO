import { adaptRoute } from '@/lib/adaptRoute';
import { Department } from '@/models/Department';
import { DEPARTMENTS } from '@/constants/departments';
import { Request, Response, NextFunction } from 'express';

const getPublicDepartments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Find departments that are active
    const dbDepts = await Department.find({ status: { $ne: 'Inactive' } }).select('name').lean();
    const dbDeptNames = dbDepts.map(d => d.name);
    
    // Merge predefined static list with DB department names, remove duplicates, and sort
    const merged = Array.from(new Set([...DEPARTMENTS, ...dbDeptNames])).sort();
    
    res.status(200).json({
      status: 'success',
      data: { departments: merged },
    });
  } catch (error) {
    next(error);
  }
};

export const GET = adaptRoute(getPublicDepartments);
