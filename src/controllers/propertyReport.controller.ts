import { Response } from 'express';
import PropertyReport from '@/models/PropertyReport';
import { User } from '@/models/User';
import mongoose from 'mongoose';

export const createPropertyReport = async (req: any, res: Response) => {
  const { category, reportType, reportDate, files, remarks, taskId, hotelId, hotelName, hotelCode, department } = req.body;
  const user = req.user;

  if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  if (!hotelId) {
    return res.status(400).json({ success: false, error: 'hotelId is required. Please select a property before uploading.' });
  }

  if (!reportDate) {
    return res.status(400).json({ success: false, error: 'Report Date is required.' });
  }

  if (!files || !Array.isArray(files) || files.length === 0) {
    return res.status(400).json({ success: false, error: 'No files provided' });
  }

  const fullUser = await User.findById(user.id).populate('hotel').populate('reportingManager').lean() as any;
  if (!fullUser) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }

  const managerId = fullUser.reportingManagerId || fullUser.parentManagerId || user.id;
  const actualCategory = reportType || category;

  const report = await PropertyReport.create({
    hotelId,
    hotelName: hotelName || fullUser.hotel?.name || 'Unknown Hotel',
    hotelCode: hotelCode || 'UNKNOWN',
    employeeId: user.id,
    employeeName: `${fullUser.firstName} ${fullUser.lastName}`,
    managerId,
    department: department || fullUser.department || 'GENERAL',
    category: actualCategory,
    reportType: actualCategory,
    reportDate: new Date(reportDate),
    taskId,
    files,
    remarks,
    uploadedBy: user.id,
    status: 'Uploaded',
    deleteStatus: 'ACTIVE',
    auditLogs: [
      {
        action: 'UPLOADED',
        by: user.id,
        byName: `${fullUser.firstName} ${fullUser.lastName}`,
        at: new Date(),
        reason: 'Initial Upload'
      }
    ]
  });

  // Emit event to notify Central Team/Root Admin of new upload (optional, but good)
  if ((global as any).io) {
    (global as any).io.emit('new_property_report_uploaded', { hotelId, reportId: report._id });
  }

  res.status(201).json({ success: true, report });
};

export const getPropertyReports = async (req: any, res: Response) => {
  const user = req.user;
  const { hotelId, category, startDate, endDate, reportDate, employeeId, uploadedBy, deleteStatus } = req.query;

  let query: any = {};

  if (user.role === 'ROOT_ADMIN' || user.department === 'Central Team') {
    if (hotelId) query.hotelId = hotelId;
  } else {
    if (hotelId && user.hotel && hotelId !== user.hotel.toString()) {
      return res.status(403).json({ success: false, error: 'Unauthorized property access.' });
    }
    query.hotelId = user.hotel;
    
    // Non-managers only see their own reports
    if (!['HOTEL_ADMIN', 'HR_MANAGER', 'DEPT_MANAGER'].includes(user.role)) {
      query.employeeId = user.id;
    }
  }

  if (category) query.category = category;
  if (employeeId) query.employeeId = employeeId;
  if (uploadedBy) query.uploadedBy = uploadedBy;

  if (reportDate) {
    const dateObj = new Date(reportDate);
    const nextDay = new Date(dateObj);
    nextDay.setDate(nextDay.getDate() + 1);
    query.reportDate = { $gte: dateObj, $lt: nextDay };
  } else if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    query.reportDate = { $gte: start, $lte: end };
  }

  // Filter out DELETED by default, unless requested explicitly by ROOT_ADMIN
  if (deleteStatus) {
    query.deleteStatus = deleteStatus;
  } else {
    query.deleteStatus = { $ne: 'DELETED' };
  }

  const reports = await PropertyReport.find(query)
    .sort({ reportDate: -1, uploadedAt: -1 })
    .allowDiskUse(true)
    .lean() as any;

  res.status(200).json({ success: true, reports });
};

export const requestDeleteReport = async (req: any, res: Response) => {
  const { id } = req.params;
  const { reason } = req.body;
  const user = req.user;

  if (!reason) {
    return res.status(400).json({ success: false, error: 'Reason is required to request delete.' });
  }

  const fullUser = await User.findById(user.id).lean() as any;
  const report = await PropertyReport.findById(id);

  if (!report) return res.status(404).json({ success: false, error: 'Report not found' });

  // Only the uploader or a manager can request delete
  if (report.employeeId.toString() !== user.id && user.role !== 'HOTEL_ADMIN' && user.role !== 'ROOT_ADMIN') {
    return res.status(403).json({ success: false, error: 'Unauthorized to request delete' });
  }

  report.deleteStatus = 'PENDING_DELETE';
  report.deleteRequest = {
    reason,
    requestedBy: user.id as any,
    requestedAt: new Date(),
  };

  report.auditLogs.push({
    action: 'DELETE_REQUESTED',
    by: user.id as any,
    byName: fullUser ? `${fullUser.firstName} ${fullUser.lastName}` : 'Unknown',
    at: new Date(),
    reason,
  });

  await report.save();

  if ((global as any).io) {
    (global as any).io.emit('property_report_delete_requested', { reportId: report._id, hotelId: report.hotelId });
  }

  res.status(200).json({ success: true, message: 'Delete request submitted successfully', report });
};

export const approveDeleteReport = async (req: any, res: Response) => {
  const { id } = req.params;
  const user = req.user;

  if (user.role !== 'ROOT_ADMIN' && user.department !== 'Central Team') {
    return res.status(403).json({ success: false, error: 'Only Central Team or Root Admin can approve deletions.' });
  }

  const fullUser = await User.findById(user.id).lean() as any;
  const report = await PropertyReport.findById(id);

  if (!report) return res.status(404).json({ success: false, error: 'Report not found' });

  report.deleteStatus = 'DELETED';
  report.auditLogs.push({
    action: 'DELETE_APPROVED',
    by: user.id as any,
    byName: fullUser ? `${fullUser.firstName} ${fullUser.lastName}` : 'Unknown',
    at: new Date(),
    reason: 'Approved by Central Team / Admin',
  });

  await report.save();

  if ((global as any).io) {
    (global as any).io.emit('property_report_delete_approved', { reportId: report._id, hotelId: report.hotelId, requestedBy: report.deleteRequest?.requestedBy });
  }

  res.status(200).json({ success: true, message: 'Delete request approved successfully', report });
};

export const rejectDeleteReport = async (req: any, res: Response) => {
  const { id } = req.params;
  const { reason } = req.body;
  const user = req.user;

  if (user.role !== 'ROOT_ADMIN' && user.department !== 'Central Team') {
    return res.status(403).json({ success: false, error: 'Only Central Team or Root Admin can reject deletions.' });
  }

  if (!reason) {
    return res.status(400).json({ success: false, error: 'Reason is required to reject a delete request.' });
  }

  const fullUser = await User.findById(user.id).lean() as any;
  const report = await PropertyReport.findById(id);

  if (!report) return res.status(404).json({ success: false, error: 'Report not found' });

  report.deleteStatus = 'ACTIVE';
  
  // Store previous reason for logs before clearing
  const prevReason = report.deleteRequest?.reason;
  
  report.deleteRequest = undefined;
  
  report.auditLogs.push({
    action: 'DELETE_REJECTED',
    by: user.id as any,
    byName: fullUser ? `${fullUser.firstName} ${fullUser.lastName}` : 'Unknown',
    at: new Date(),
    reason,
  });

  await report.save();

  if ((global as any).io) {
    (global as any).io.emit('property_report_delete_rejected', { reportId: report._id, hotelId: report.hotelId, reason });
  }

  res.status(200).json({ success: true, message: 'Delete request rejected successfully', report });
};

export const deletePropertyReport = async (req: any, res: Response) => {
  const { id } = req.params;
  const user = req.user;

  // Only ROOT ADMIN can do a hard permanent delete
  if (user.role !== 'ROOT_ADMIN') {
     return res.status(403).json({ success: false, error: 'Unauthorized to permanently delete this report' });
  }

  const report = await PropertyReport.findById(id).lean() as any;
  if (!report) {
    return res.status(404).json({ success: false, error: 'Report not found' });
  }

  await PropertyReport.findByIdAndDelete(id);

  res.status(200).json({ success: true, message: 'Report permanently deleted' });
};
