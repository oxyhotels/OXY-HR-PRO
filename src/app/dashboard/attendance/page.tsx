'use client';

import React, { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { useAuthStore } from '../../../store/authStore';
import { Calendar, User, Clock, ArrowRight, ShieldCheck, HelpCircle } from 'lucide-react';

interface AttendanceLog {
  _id: string;
  date: string;
  checkIn: string;
  checkOut?: string;
  totalWorkingHours: number;
  totalBreakMinutes: number;
  status: 'Present' | 'Absent' | 'Late' | 'Half-Day' | 'OnLeave';
  employee?: {
    firstName: string;
    lastName: string;
    email: string;
    department: string;
    designation: string;
  };
}

export default function AttendancePage() {
  const { user } = useAuthStore();
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState('2026-06');
  const [selectedDate, setSelectedDate] = useState('2026-06-08');
  const [viewMode, setViewMode] = useState<'personal' | 'hotel'>('personal');
  const [viewAllHotelLogs, setViewAllHotelLogs] = useState(false);

  const isManager = user?.role === 'ROOT_ADMIN' || user?.role === 'HOTEL_ADMIN' || user?.role === 'HR_MANAGER' || user?.role === 'DEPT_MANAGER';

  useEffect(() => {
    // Set default view mode based on role
    if (isManager) {
      setViewMode('hotel');
    }
  }, [isManager]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      if (viewMode === 'personal') {
        const res = await api.get(`/attendance/me?month=${selectedMonth}`);
        setLogs(res.data.logs);
      } else {
        const endpoint = viewAllHotelLogs 
          ? '/attendance/hotel?all=true' 
          : `/attendance/hotel?date=${selectedDate}`;
        const res = await api.get(endpoint);
        setLogs(res.data.logs);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [viewMode, selectedMonth, selectedDate, viewAllHotelLogs]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Attendance Logs</h1>
          <p className="text-slate-400 text-xs mt-1">Review clock-in histories and total computed working hours.</p>
        </div>

        {/* View mode toggle */}
        {isManager && (
          <div className="flex bg-slate-950/60 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setViewMode('hotel')}
              className={`px-3 py-1.5 rounded font-bold cursor-pointer ${
                viewMode === 'hotel' ? 'bg-gold text-slate-dark' : 'text-slate-400 hover:text-white'
              }`}
            >
              Hotel View
            </button>
            <button
              onClick={() => setViewMode('personal')}
              className={`px-3 py-1.5 rounded font-bold cursor-pointer ${
                viewMode === 'personal' ? 'bg-gold text-slate-dark' : 'text-slate-400 hover:text-white'
              }`}
            >
              My Shifts
            </button>
          </div>
        )}
      </div>

      {/* Filter panel */}
      <div className="bg-card-dark border border-slate-800/80 rounded-xl p-4 flex flex-wrap gap-4 items-center">
        {viewMode === 'personal' ? (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-semibold uppercase tracking-wider">Salary Month:</span>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-slate-950/60 border border-slate-800 rounded p-1.5 text-white"
            />
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-6 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-semibold uppercase tracking-wider">Shift Date:</span>
              <input
                type="date"
                disabled={viewAllHotelLogs}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-slate-950/60 border border-slate-800 rounded p-1.5 text-white disabled:opacity-40"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="viewAllHotelLogs"
                checked={viewAllHotelLogs}
                onChange={(e) => setViewAllHotelLogs(e.target.checked)}
                className="accent-gold cursor-pointer h-4 w-4"
              />
              <label htmlFor="viewAllHotelLogs" className="text-slate-305 font-semibold cursor-pointer uppercase tracking-wider text-slate-300">
                Show All History (All Dates)
              </label>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[20vh]">
          <div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-card-dark border border-slate-800/80 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950/40 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                  <th className="p-4">Shift Date</th>
                  {viewMode === 'hotel' && <th className="p-4">Employee</th>}
                  <th className="p-4">Check-In</th>
                  <th className="p-4">Check-Out</th>
                  <th className="p-4">Breaks Duration</th>
                  <th className="p-4">Working Hours</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {logs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-900/20 transition-colors">
                    <td className="p-4 font-semibold text-white">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={14} className="text-gold" />
                        {log.date}
                      </div>
                    </td>
                    {viewMode === 'hotel' && (
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 text-slate-200 font-bold uppercase">
                            {log.employee ? `${log.employee.firstName[0]}${log.employee.lastName[0]}` : '??'}
                          </div>
                          <div>
                            <div className="font-semibold text-white">
                              {log.employee?.firstName} {log.employee?.lastName}
                            </div>
                            <div className="text-slate-500 text-[10px]">{log.employee?.designation} ({log.employee?.department})</div>
                          </div>
                        </div>
                      </td>
                    )}
                    <td className="p-4 font-mono text-[11px] whitespace-nowrap">
                      {new Date(log.checkIn).toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="p-4 font-mono text-[11px] whitespace-nowrap">
                      {log.checkOut ? (
                        new Date(log.checkOut).toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                      ) : (
                        <span className="text-slate-500 italic">Working...</span>
                      )}
                    </td>
                    <td className="p-4 text-slate-300 font-mono">
                      {log.totalBreakMinutes} min
                    </td>
                    <td className="p-4 text-slate-200 font-bold font-mono">
                      {log.totalWorkingHours} hrs
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                        log.status === 'Present' 
                          ? 'bg-green-500/10 text-green-400' 
                          : log.status === 'Late'
                          ? 'bg-amber-500/10 text-amber-400'
                          : log.status === 'Half-Day'
                          ? 'bg-orange-500/10 text-orange-400'
                          : 'bg-red-500/10 text-red-400'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}

                {logs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center p-8 text-slate-500">
                      No shift records found for this selection.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
