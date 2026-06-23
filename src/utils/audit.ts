import { HierarchyAuditLog } from '@/models/HierarchyAuditLog';
import { Schema } from 'mongoose';

// Helper to get client IP
export const getClientIp = (req: any): string => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = typeof forwarded === 'string' ? forwarded.split(',') : forwarded;
    if (Array.isArray(ips)) return ips[0].trim();
    return ips.trim();
  }
  return req.ip || req.connection?.remoteAddress || '127.0.0.1';
};

// Format role and editor name
export const formatEditorLabel = (user: any): string => {
  if (!user) return 'System';
  const name = `${user.firstName || ''} ${user.lastName || ''}`.trim();
  switch (user.role) {
    case 'ROOT_ADMIN':
      return 'Root Admin';
    case 'HOTEL_ADMIN':
      return `Property Manager (${name})`;
    case 'HR_MANAGER':
      return `HR Manager (${name})`;
    case 'DEPT_MANAGER':
      return `Department Manager (${name})`;
    default:
      return `${user.role || 'User'} (${name})`;
  }
};

// Check if two values are equal (deep comparison helper)
function areValuesEqual(v1: any, v2: any): boolean {
  if (v1 === v2) return true;
  if (v1 == null && v2 == null) return true;
  if (v1 == null || v2 == null) return false;

  // Handle Date comparison
  if (v1 instanceof Date || v2 instanceof Date) {
    const d1 = v1 instanceof Date ? v1.getTime() : new Date(v1).getTime();
    const d2 = v2 instanceof Date ? v2.getTime() : new Date(v2).getTime();
    return d1 === d2;
  }

  // Handle arrays
  if (Array.isArray(v1) && Array.isArray(v2)) {
    if (v1.length !== v2.length) return false;
    // For documents: check if item names/urls are same
    if (v1[0] && typeof v1[0] === 'object' && v1[0].name) {
      const names1 = v1.map(d => `${d.name}:${d.fileUrl}`).sort().join(',');
      const names2 = v2.map(d => `${d.name}:${d.fileUrl}`).sort().join(',');
      return names1 === names2;
    }
    return JSON.stringify(v1) === JSON.stringify(v2);
  }

  // Handle objects
  if (typeof v1 === 'object' && typeof v2 === 'object') {
    return JSON.stringify(v1) === JSON.stringify(v2);
  }

  return String(v1).trim() === String(v2).trim();
}

// Convert value to readable string
function formatDisplayValue(val: any): string {
  if (val == null || val === '') return 'N/A';
  if (val instanceof Date) return val.toLocaleDateString();
  
  if (Array.isArray(val)) {
    if (val.length === 0) return 'None';
    if (val[0] && typeof val[0] === 'object' && val[0].name) {
      return val.map((d: any) => d.name).join(', ');
    }
    return JSON.stringify(val);
  }
  
  if (typeof val === 'object') {
    // If it's a hotel/property reference object
    if (val.name) return val.name;
    if (val.street) return `${val.street}, ${val.city || ''}, ${val.state || ''}`;
    return JSON.stringify(val);
  }

  return String(val);
}

// Extract field by path e.g. "salaryDetails.baseSalary"
function getNestedValue(obj: any, path: string): any {
  if (!obj) return undefined;
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current == null) return undefined;
    // Handle mongoose document toObject if needed
    if (typeof current.toObject === 'function') {
      current = current.toObject();
    }
    current = current[part];
  }
  return current;
}

// Map field paths to user friendly names
const fieldLabels: Record<string, string> = {
  firstName: 'First Name',
  lastName: 'Last Name',
  phone: 'Mobile Number',
  department: 'Department',
  'salaryDetails.baseSalary': 'Salary',
  employeeCode: 'Employee Code',
  employeeId: 'Employee Code',
  managerCode: 'Manager Code',
  reportingManager: 'Reporting Manager',
  shift: 'Shift',
  designation: 'Designation',
  'personalDetails.address': 'Address',
  'homeLocation.address': 'Address',
  documents: 'Documents',
  hotel: 'Property Assignment',
  enabledFeatures: 'Permissions',
  name: 'Property Name',
  hotelCode: 'Hotel Code',
  email: 'Email Address',
  'address.street': 'Street',
  'address.city': 'City',
  'address.state': 'State',
  'address.zip': 'Zip Code',
  googleLocationLink: 'Location Link',
  status: 'Status'
};

// Compare two objects across specified fields
export const diffFields = (
  oldObj: any,
  newObj: any,
  fields: string[]
): { oldValue: string; newValue: string; hasChanged: boolean; changedFields: string[] } => {
  let hasChanged = false;
  const oldParts: string[] = [];
  const newParts: string[] = [];
  const changedFields: string[] = [];

  for (const field of fields) {
    const oldVal = getNestedValue(oldObj, field);
    const newVal = getNestedValue(newObj, field);

    if (!areValuesEqual(oldVal, newVal)) {
      hasChanged = true;
      changedFields.push(field);
      const label = fieldLabels[field] || field;
      oldParts.push(`${label}: ${formatDisplayValue(oldVal)}`);
      newParts.push(`${label}: ${formatDisplayValue(newVal)}`);
    }
  }

  return {
    oldValue: oldParts.join('\n'),
    newValue: newParts.join('\n'),
    hasChanged,
    changedFields
  };
};

// Create a hierarchy audit log entry
export const logAuditTrail = async (params: {
  userId: any;
  action: string;
  module: 'Employee' | 'Manager' | 'Department' | 'Property' | 'Hierarchy';
  oldValue: string;
  newValue: string;
  details: string;
  targetUserId?: any;
  targetId?: string;
  req?: any;
}): Promise<void> => {
  try {
    const ipAddress = params.req ? getClientIp(params.req) : '127.0.0.1';
    const editedByRole = params.req?.user ? formatEditorLabel(params.req.user) : 'System';

    await HierarchyAuditLog.create({
      userId: params.userId,
      action: params.action,
      module: params.module,
      details: params.details,
      oldValue: params.oldValue,
      newValue: params.newValue,
      editedByRole,
      ipAddress,
      targetUserId: params.targetUserId || undefined,
      targetId: params.targetId || undefined,
    });
  } catch (error) {
    console.error('Failed to write audit trail:', error);
  }
};
