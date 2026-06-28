export const dynamic = 'force-dynamic';

import { adaptRoute } from '@/lib/adaptRoute';
import { Department } from '@/models/Department';
import { Request, Response, NextFunction } from 'express';

const getPublicDepartments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Find active departments in the DB
    const dbDepts = await Department.find({ status: { $ne: 'Inactive' }, isActive: true }).select('name isDefault').lean();
    
    // Split into defaults and customs
    const defaults = dbDepts.filter(d => d.isDefault).map(d => d.name.trim());
    const customs = dbDepts.filter(d => !d.isDefault).map(d => d.name.trim());

    // Sort customs alphabetically
    customs.sort((a, b) => a.localeCompare(b));
    
    // Sort defaults as per specific requested order or just leave as inserted
    const predefinedOrder = ['Central Team', 'Sales Office Team', 'Property Team', 'IT Team', 'Other'];
    defaults.sort((a, b) => {
      const idxA = predefinedOrder.indexOf(a);
      const idxB = predefinedOrder.indexOf(b);
      return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
    });

    const merged = Array.from(new Set([...defaults, ...customs]));
    
    res.status(200).json({
      status: 'success',
      data: { departments: merged },
    });
  } catch (error) {
    next(error);
  }
};

export const GET = adaptRoute(getPublicDepartments);
