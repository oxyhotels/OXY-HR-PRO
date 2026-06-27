import { Response } from 'express';
import PropertyReport from '@/models/PropertyReport';
import { User } from '@/models/User';

export const createPropertyReport = async (req: any, res: Response) => {
  const { category, files, remarks, taskId } = req.body;
  const user = req.user;

  if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  // Allow all users to upload reports (previously restricted to PROPERTY/ROOT_ADMIN)

  if (!files || !Array.isArray(files) || files.length === 0) {
    return res.status(400).json({ success: false, error: 'No files provided' });
  }

  // Fetch full user details to populate report
  const fullUser = await User.findById(user.id).populate('hotel').populate('reportingManager');
  if (!fullUser) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }

  if (!fullUser.hotel && user.role !== 'ROOT_ADMIN') {
     return res.status(400).json({ success: false, error: 'User does not belong to a property/hotel.' });
  }

  const hotelId = fullUser.hotel?._id || req.body.hotelId; // Root admins might pass hotelId
  const hotelName = fullUser.hotel?.name || req.body.hotelName || 'Unknown Hotel';
  
  // Use reportingManagerId from User model (from recent updates) or fallback to parentManagerId
  const managerId = fullUser.reportingManagerId || fullUser.parentManagerId || user.id;

  const report = await PropertyReport.create({
    hotelId,
    hotelName,
    employeeId: user.id,
    employeeName: `${fullUser.firstName} ${fullUser.lastName}`,
    managerId,
    department: fullUser.department || 'GENERAL',
    category,
    taskId,
    files,
    remarks,
    uploadedBy: user.id,
    status: 'Uploaded',
  });

  res.status(201).json({ success: true, report });
};

export const getPropertyReports = async (req: any, res: Response) => {
  const user = req.user;
  const { hotelId, category, startDate, endDate, employeeId } = req.query;

  let query: any = {};

  if (user.role === 'ROOT_ADMIN') {
    // Root Admin sees all, can filter by hotelId
    if (hotelId) query.hotelId = hotelId;
  } else if (['HOTEL_ADMIN', 'HR_MANAGER', 'DEPT_MANAGER'].includes(user.role)) {
    // Manager sees only their hotel
    query.hotelId = user.hotel;
    if (user.department === 'PROPERTY' && user.role === 'DEPT_MANAGER') {
      // Property Manager sees their hotel
    } else {
      // If they are not property dept and not Root Admin, we might restrict them, but let's just restrict by hotel
    }
  } else {
    // Employee sees only their own
    query.employeeId = user.id;
  }

  if (category) query.category = category;
  if (employeeId) query.employeeId = employeeId;
  if (startDate && endDate) {
    query.createdAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    };
  }

  const reports = await PropertyReport.find(query).sort({ createdAt: -1 }).lean();

  res.status(200).json({ success: true, reports });
};

export const deletePropertyReport = async (req: any, res: Response) => {
  const { id } = req.params;
  const user = req.user;

  const report = await PropertyReport.findById(id);
  if (!report) {
    return res.status(404).json({ success: false, error: 'Report not found' });
  }

  // Permission check
  if (user.role !== 'ROOT_ADMIN' && report.employeeId.toString() !== user.id) {
     return res.status(403).json({ success: false, error: 'Unauthorized to delete this report' });
  }

  await PropertyReport.findByIdAndDelete(id);

  res.status(200).json({ success: true, message: 'Report deleted successfully' });
};
