import { Request, Response, NextFunction } from 'express';
import { Payroll } from '@/models/Payroll';
import { User } from '@/models/User';
import { Attendance } from '@/models/Attendance';
import { Hotel } from '@/models/Hotel';
import { ApiError } from '@/utils/ApiError';
import { AuditLog } from '@/models/AuditLog';
import { generatePayslipPDF } from '@/services/pdf.service';
import path from 'path';

export const calculatePayroll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { month, employeeId } = req.body; // month format: "YYYY-MM"
    if (!month) throw new ApiError(400, 'Month in format YYYY-MM is required');

    let hotelsToCalculate: any[] = [];
    if (req.user?.role === 'ROOT_ADMIN') {
      if (req.body.hotelId) {
        hotelsToCalculate = [req.body.hotelId];
      } else {
        const allHotels = await Hotel.find({ status: 'Active' });
        hotelsToCalculate = allHotels.map(h => h._id);
      }
    } else {
      if (!req.user?.hotel) {
        throw new ApiError(400, 'Tenancy resolve error: no hotel associated with user');
      }
      hotelsToCalculate = [req.user.hotel];
    }

    if (hotelsToCalculate.length === 0) {
      throw new ApiError(400, 'No active hotel tenants resolved for payroll calculation');
    }

    const results: any[] = [];

    for (const hId of hotelsToCalculate) {
      // Get list of active employees
      const query: any = { hotel: hId, status: { $ne: 'Terminated' } };
      if (employeeId) {
        query._id = employeeId;
      }

      const employees = await User.find(query);

      for (const emp of employees) {
        // Clean duplicate draft records
        await Payroll.findOneAndDelete({ employee: emp._id, month, status: 'Draft' });

        // Check if already paid
        const existingPaid = await Payroll.findOne({ employee: emp._id, month, status: 'Paid' });
        if (existingPaid) {
          continue; // Skip already finalized payroll
        }

        // Calculate allowances and deductions totals
        const baseSalary = emp.salaryDetails?.baseSalary || 0;
        const allowancesSum = emp.salaryDetails?.allowances?.reduce((sum: number, item: any) => sum + item.amount, 0) || 0;
        const deductionsSum = emp.salaryDetails?.deductions?.reduce((sum: number, item: any) => sum + item.amount, 0) || 0;

        // 1. Fetch attendance records to compute Overtime
        const attendanceLogs = await Attendance.find({
          employee: emp._id,
          date: new RegExp(`^${month}`),
        });

        let totalWorkingHours = 0;
        attendanceLogs.forEach((log) => {
          totalWorkingHours += log.totalWorkingHours || 0;
        });

        // Simple Overtime rule: Standard monthly hours = 160
        const standardHours = 160;
        let overtimeHours = 0;
        let overtimePay = 0;

        if (totalWorkingHours > standardHours) {
          overtimeHours = parseFloat((totalWorkingHours - standardHours).toFixed(2));
          const hourlyRate = baseSalary / standardHours;
          overtimePay = parseFloat((overtimeHours * hourlyRate * 1.5).toFixed(2));
        }

        const bonus = req.body.bonus || 0; // optional performance bonus from payload
        const netSalary = parseFloat((baseSalary + allowancesSum + overtimePay + bonus - deductionsSum).toFixed(2));

        const payDoc = await Payroll.create({
          employee: emp._id,
          hotel: hId,
          month,
          baseSalary,
          allowances: allowancesSum,
          deductions: deductionsSum,
          overtimeHours,
          overtimePay,
          bonus,
          netSalary,
          status: 'Draft',
        });

        results.push(payDoc);
      }

      await AuditLog.create({
        user: req.user?._id,
        hotel: hId,
        action: 'CALCULATE_PAYROLL',
        module: 'PAYROLL',
        details: `Payroll calculated for month ${month} for hotel ${hId}`,
      });
    }

    res.status(200).json({
      status: 'success',
      results: results.length,
      data: { payrolls: results },
    });
  } catch (error) {
    next(error);
  }
};

export const paySalary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const payroll = await Payroll.findById(req.params.id)
      .populate('employee')
      .populate('hotel');

    if (!payroll) throw new ApiError(404, 'Payroll record not found');
    if (payroll.status === 'Paid') throw new ApiError(400, 'This payroll is already processed and paid');

    const emp = payroll.employee as any;
    const hotel = payroll.hotel as any;

    // Local file path where PDF payslip will be stored
    const filename = `payslip_${hotel.code}_${emp._id}_${payroll.month}.pdf`;
    // We store files inside the root public/uploads directory
    const pdfPath = path.join(process.cwd(), 'public/uploads/payslips', filename);

    // Call PDF generation
    const payslipData = {
      hotelName: hotel.name,
      hotelAddress: `${hotel.address.street}, ${hotel.address.city}, ${hotel.address.state}`,
      employeeName: `${emp.firstName} ${emp.lastName}`,
      employeeEmail: emp.email,
      employeeId: emp._id.toString(),
      designation: emp.designation || 'Staff',
      department: emp.department || 'Operations',
      month: payroll.month,
      baseSalary: payroll.baseSalary,
      allowances: emp.salaryDetails?.allowances || [],
      deductions: emp.salaryDetails?.deductions || [],
      overtimeHours: payroll.overtimeHours,
      overtimePay: payroll.overtimePay,
      bonus: payroll.bonus,
      netSalary: payroll.netSalary,
    };

    await generatePayslipPDF(payslipData, pdfPath);

    // Save status and public file path in database
    payroll.status = 'Paid';
    payroll.paymentDate = new Date();
    // Path relative to express public static folder
    payroll.payslipPath = `/uploads/payslips/${filename}`;
    await payroll.save();

    await AuditLog.create({
      user: req.user?._id,
      hotel: hotel._id,
      action: 'PAYROLL_PAID',
      module: 'PAYROLL',
      details: `Paid salary of $${payroll.netSalary} to ${emp.firstName} ${emp.lastName} for ${payroll.month}`,
    });

    res.status(200).json({
      status: 'success',
      data: { payroll },
    });
  } catch (error) {
    next(error);
  }
};

export const getPayrollHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const filter: any = {};

    // Tenancy Check
    if (req.user?.role !== 'ROOT_ADMIN') {
      filter.hotel = req.user?.hotel;
    } else if (req.query.hotelId) {
      filter.hotel = req.query.hotelId;
    }

    if (req.user?.role === 'EMPLOYEE') {
      filter.employee = req.user._id;
    } else if (req.query.employeeId) {
      filter.employee = req.query.employeeId;
    }

    if (req.query.month) {
      filter.month = req.query.month;
    }

    const payrolls = await Payroll.find(filter)
      .populate('employee', 'firstName lastName email department designation')
      .sort({ month: -1 });

    res.status(200).json({
      status: 'success',
      results: payrolls.length,
      data: { payrolls },
    });
  } catch (error) {
    next(error);
  }
};
