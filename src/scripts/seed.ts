import mongoose from 'mongoose';
import { connectDB } from '@/config/db';
import { Hotel } from '@/models/Hotel';
import { User } from '@/models/User';
import { Attendance } from '@/models/Attendance';
import { Leave } from '@/models/Leave';
import { Task } from '@/models/Task';
import { Payroll } from '@/models/Payroll';
import { AuditLog } from '@/models/AuditLog';

const seedDatabase = async () => {
  try {
    console.log('Connecting to database...');
    await connectDB();

    console.log('Clearing existing data...');
    await Promise.all([
      Hotel.deleteMany({}),
      User.deleteMany({}),
      Attendance.deleteMany({}),
      Leave.deleteMany({}),
      Task.deleteMany({}),
      Payroll.deleteMany({}),
      AuditLog.deleteMany({}),
    ]);

    console.log('Seeding Grand Plaza Resort Hotel...');
    const hotel = await Hotel.create({
      name: 'Grand Plaza Resort',
      hotelCode: 'GPR',
      email: 'info@grandplazaresort.com',
      phone: '+1 555-0199',
      address: {
        street: '100 Ocean Front Boulevard',
        city: 'Miami',
        state: 'Florida',
        zip: '33139',
        country: 'USA',
      },
      status: 'Active',
      subscriptionPlan: 'Enterprise',
    });

    console.log('Seeding Users...');
    
    // 1. Root Admin
    const rootAdmin = await User.create({
      firstName: 'Alastair',
      lastName: 'Vance',
      email: 'root@oxyhr.com',
      password: 'rootpassword', // will be hashed automatically by schema pre-save
      role: 'ROOT_ADMIN',
      status: 'Active',
      joinedDate: new Date('2025-01-01'),
    });

    // 2. Hotel Admin
    const hotelAdmin = await User.create({
      firstName: 'Elena',
      lastName: 'Rostova',
      email: 'admin.gpr@grandplaza.com',
      password: 'password123',
      role: 'HOTEL_ADMIN',
      hotel: hotel._id,
      status: 'Active',
      joinedDate: new Date('2025-02-15'),
    });

    // 3. HR Manager
    const hrManager = await User.create({
      firstName: 'Marcus',
      lastName: 'Aurelius',
      email: 'hr.gpr@grandplaza.com',
      password: 'password123',
      role: 'HR_MANAGER',
      hotel: hotel._id,
      department: 'Human Resources',
      designation: 'Senior HR Manager',
      status: 'Active',
      joinedDate: new Date('2025-03-01'),
    });

    // 4. Department Manager (Front Office)
    const deptManager = await User.create({
      firstName: 'Sarah',
      lastName: 'Jenkins',
      email: 'manager.gpr@grandplaza.com',
      password: 'password123',
      role: 'DEPT_MANAGER',
      hotel: hotel._id,
      department: 'Front Office',
      designation: 'Front Office Manager',
      status: 'Active',
      joinedDate: new Date('2025-04-10'),
    });

    // 5. Employee (Front Office Guest Agent)
    const employee = await User.create({
      firstName: 'David',
      lastName: 'Miller',
      email: 'staff.gpr@grandplaza.com',
      password: 'password123',
      role: 'EMPLOYEE',
      hotel: hotel._id,
      department: 'Front Office',
      designation: 'Guest Relations Officer',
      phone: '+1 555-0144',
      status: 'Active',
      joinedDate: new Date('2025-05-01'),
      personalDetails: {
        dob: new Date('1996-08-22'),
        gender: 'Male',
        address: '450 Collins Ave, Miami Beach, FL 33139',
      },
      salaryDetails: {
        baseSalary: 3500,
        allowances: [
          { name: 'Transport Allowance', amount: 250 },
          { name: 'Housing Allowance', amount: 400 },
        ],
        deductions: [
          { name: 'Tax Withholding', amount: 180 },
          { name: 'Health Insurance', amount: 120 },
        ],
      },
      bankDetails: {
        accountNo: '1234567890',
        bankName: 'Chase Bank',
        ifsc: 'CHASUS33XXX',
      },
    });

    console.log('Seeding Attendance Records...');
    // Seed attendance for employee for the last 5 days
    const dates = ['2026-06-03', '2026-06-04', '2026-06-05', '2026-06-06', '2026-06-07'];
    for (const date of dates) {
      const checkInHour = 8 + Math.floor(Math.random() * 2); // between 8:00 and 9:59 AM
      const checkInTime = new Date(`${date}T0${checkInHour}:00:00.000Z`);
      const checkOutTime = new Date(`${date}T17:00:00.000Z`);
      
      const breakStart = new Date(`${date}T12:00:00.000Z`);
      const breakEnd = new Date(`${date}T13:00:00.000Z`); // 1 hour break

      const totalWorkingHours = (checkOutTime.getTime() - checkInTime.getTime()) / 3600000 - 1;

      await Attendance.create({
        employee: employee._id,
        hotel: hotel._id,
        date,
        checkIn: checkInTime,
        checkOut: checkOutTime,
        breaks: [{ start: breakStart, end: breakEnd }],
        totalWorkingHours,
        totalBreakMinutes: 60,
        status: checkInHour > 9 ? 'Late' : 'Present',
      });
    }

    console.log('Seeding Leave Requests...');
    // Seed 1 pending and 1 approved leave
    await Leave.create({
      employee: employee._id,
      hotel: hotel._id,
      leaveType: 'Annual',
      startDate: new Date('2026-07-10'),
      endDate: new Date('2026-07-14'),
      reason: 'Summer vacation with family',
      status: 'Pending',
    });

    await Leave.create({
      employee: employee._id,
      hotel: hotel._id,
      leaveType: 'Sick',
      startDate: new Date('2026-05-18'),
      endDate: new Date('2026-05-19'),
      reason: 'Fever and cold',
      status: 'Approved',
      approvedBy: hrManager._id,
      comments: 'Get well soon. Approved.',
    });

    console.log('Seeding Tasks...');
    await Task.create({
      title: 'Prepare VIP Arrival List',
      description: 'Review and compile the VIP arrival logs for the incoming delegation from London.',
      hotel: hotel._id,
      assignedTo: employee._id,
      assignedBy: deptManager._id,
      priority: 'High',
      status: 'In_Progress',
      progress: 40,
      dueDate: new Date('2026-06-15'),
    });

    await Task.create({
      title: 'Complete Staff Roster Shift Plan',
      description: 'Prepare the weekly shift plan for June week 3 front desk members.',
      hotel: hotel._id,
      assignedTo: employee._id,
      assignedBy: deptManager._id,
      priority: 'Medium',
      status: 'Todo',
      progress: 0,
      dueDate: new Date('2026-06-20'),
    });

    console.log('Seeding Audit Logs...');
    await AuditLog.create({
      user: rootAdmin._id,
      action: 'SYSTEM_INITIALIZATION',
      module: 'AUTH',
      details: 'System seeded with default multi-tenant models',
    });

    console.log('====================================================');
    console.log(' Database seeded successfully!');
    console.log(' Logins:');
    console.log(' - Root Admin: root@oxyhr.com / rootpassword');
    console.log(' - Hotel Admin: admin.gpr@grandplaza.com / password123');
    console.log(' - HR Manager: hr.gpr@grandplaza.com / password123');
    console.log(' - Dept Manager: manager.gpr@grandplaza.com / password123');
    console.log(' - Employee: staff.gpr@grandplaza.com / password123');
    console.log('====================================================');

    process.exit(0);
  } catch (error) {
    console.error('Seeding database failed:', error);
    process.exit(1);
  }
};

seedDatabase();
