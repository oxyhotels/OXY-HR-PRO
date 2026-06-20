import { adaptRoute } from '@/lib/adaptRoute';
import { Department } from '@/models/Department';
import { DEPARTMENTS } from '@/constants/departments';
import { Request, Response, NextFunction } from 'express';

const normalizeDepartmentName = (name: string): string => {
  if (!name) return "";
  const d = name.toLowerCase().trim();
  
  if (
    d.includes("property department") || 
    d.includes("property operations") || 
    d.includes("property manager") || 
    d.includes("operational manager") || 
    d.includes("f&b manager") || 
    d.includes("front office") || 
    d.includes("gre") || 
    d.includes("gra") || 
    d.includes("housekeeping") || 
    d.includes("maintenance") || 
    d.includes("laundry") || 
    d.includes("kitchen") || 
    d.includes("f&b service")
  ) {
    return "Property Department";
  }
  if (d === "it" || d.includes("it department") || d.includes("information technology") || d.includes("software") || d.includes("technical")) {
    return "IT Department";
  }
  if (d === "hr" || d.includes("human resources") || d.includes("hr department") || d.includes("recruitment")) {
    return "HR Department";
  }
  if (d === "accounts" || d === "finance" || d.includes("accounts department") || d.includes("finance department") || d.includes("billing")) {
    return "Accounts Department";
  }
  if (d.includes("marketing") || d.includes("sales")) {
    return "Marketing Department";
  }
  if (d.includes("purchase") || d.includes("procurement") || d.includes("sourcing")) {
    return "Purchase Department";
  }
  if (d.includes("security")) {
    return "Security Department";
  }
  if (d.includes("engineering") || d.includes("electrical") || d.includes("maintenance")) {
    return "Engineering Department";
  }
  if (d.includes("reservation") || d.includes("ticketing")) {
    return "Reservation Department";
  }
  if (d.includes("admin") || d.includes("compliance") || d.includes("general")) {
    return "Admin Department";
  }
  
  // Clean up any remaining operational sub-roles
  const EXCLUDED_DEPTS = new Set([
    "property manager", "operational manager", "f&b manager", "front office", "gre", "gra", 
    "housekeeping", "maintenance", "security", "reservations", "reservation", "kitchen", "procurement", 
    "administration", "it", "human resources", "accounts", "finance", "sales", "property operations", 
    "laundry", "f&b service"
  ]);
  
  if (EXCLUDED_DEPTS.has(d)) {
    return "";
  }
  
  return name.trim();
};

const getPublicDepartments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Find active departments in the DB
    const dbDepts = await Department.find({ status: { $ne: 'Inactive' } }).select('name').lean();
    
    // Normalize and filter DB department names
    const dbDeptNames = dbDepts
      .map(d => normalizeDepartmentName(d.name))
      .filter(name => name !== "");
    
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
