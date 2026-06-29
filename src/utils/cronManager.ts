import { User } from '../models/User';
import { Attendance } from '../models/Attendance';

let lastRunDate = '';

export const startCronJobs = () => {
  setInterval(async () => {
    try {
      const now = new Date();
      // Run daily at 23:55 local server time
      if (now.getHours() === 23 && now.getMinutes() >= 55) {
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`;
        
        if (lastRunDate !== todayStr) {
          lastRunDate = todayStr;
          console.log(`[Cron] Starting daily absence check for ${todayStr}...`);
          
          // 1. Get all active users except ROOT_ADMIN
          const activeUsers: any[] = await User.find({ 
            status: 'Active', 
            role: { $in: ['HOTEL_ADMIN', 'HR_MANAGER', 'DEPT_MANAGER', 'EMPLOYEE'] } 
          }).lean();
          
          // 2. Get today's attendance logs
          const todaysLogs: any[] = await Attendance.find({ date: todayStr }).lean();
          const attendedUserIds = new Set(todaysLogs.map(a => a.employee.toString()));
          
          // 3. Filter out users who already have a log (Present, Late, Half-Day, Absent, Leave)
          const absentRecords = [];
          
          for (const user of activeUsers) {
            if (!attendedUserIds.has(user._id.toString())) {
              absentRecords.push({
                employee: user._id,
                hotel: user.hotel,
                date: todayStr,
                status: 'Absent',
                checkIn: new Date(),
                totalWorkingHours: 0,
                checkInAddress: 'System Generated - No check-in'
              });
            }
          }
          
          // 4. Insert absent records
          if (absentRecords.length > 0) {
            await Attendance.insertMany(absentRecords);
            console.log(`[Cron] Successfully marked ${absentRecords.length} users as Absent for ${todayStr}.`);
          } else {
            console.log(`[Cron] No missing attendances found for ${todayStr}.`);
          }
        }
      }
    } catch (error) {
      console.error('[Cron] Error running daily absence check:', error);
    }
  }, 60000); // Check every minute
};
