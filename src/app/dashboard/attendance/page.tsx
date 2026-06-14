'use client';

import React, { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { useAuthStore } from '../../../store/authStore';
import GoogleIcon from '../../../components/GoogleIcon';

interface AttendanceLog {
  _id: string;
  date: string;
  checkIn: string;
  checkOut?: string;
  totalWorkingHours: number;
  totalBreakMinutes: number;
  status: 'Present' | 'Absent' | 'Late' | 'Half-Day' | 'OnLeave';
  selfieUrl?: string;
  checkInPhoto?: string;
  checkInLatitude?: number;
  checkInLongitude?: number;
  checkOutPhoto?: string;
  checkOutLatitude?: number;
  checkOutLongitude?: number;
  deviceInfo?: string;
  browserInfo?: string;
  ipAddress?: string;
  workDescription?: string;
  workPictureUrl?: string;
  workVideoUrl?: string;
  hotel?: {
    _id: string;
    name: string;
    code: string;
  };
  employee?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    department: string;
    designation: string;
    shift?: string;
    photoUrl?: string;
    role?: string;
  };
}

export default function AttendancePage() {
  const { user } = useAuthStore();
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState('2026-06');
  const [selectedDate, setSelectedDate] = useState('2026-06-08');
  const [viewMode, setViewMode] = useState<'personal' | 'hotel'>('personal');
  const [viewAllHotelLogs, setViewAllHotelLogs] = useState(true);
  const [selectedPreviewImage, setSelectedPreviewImage] = useState<string | null>(null);
  const [selectedWorkLog, setSelectedWorkLog] = useState<AttendanceLog | null>(null);

  // Shift assignment states
  const [users, setUsers] = useState<any[]>([]);
  const [assignShiftUser, setAssignShiftUser] = useState<any | null>(null);
  const [assignShiftModalOpen, setAssignShiftModalOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState('General Shift (09:00 AM - 05:00 PM)');
  const [assigningShift, setAssigningShift] = useState(false);

  const shiftOptions = [
    'General Shift (09:00 AM - 05:00 PM)',
    'Morning Shift (07:00 AM - 03:00 PM)',
    'Afternoon Shift (03:00 PM - 11:00 PM)',
    'Night Shift (11:00 PM - 07:00 AM)',
  ];

  const isManager = user?.role === 'ROOT_ADMIN' || user?.role === 'HOTEL_ADMIN' || user?.role === 'HR_MANAGER' || user?.role === 'DEPT_MANAGER';

  const fetchUsers = async () => {
    try {
      const res = await api.get('/employees');
      setUsers(res.data.employees || []);
    } catch (err) {
      console.error('Failed to fetch employees for shift assignment', err);
    }
  };

  const assignableUsers = users.filter((u) => {
    if (user?.role === 'ROOT_ADMIN') {
      return u.role !== 'ROOT_ADMIN';
    }
    return u.role === 'EMPLOYEE';
  });

  const handleOpenAssignShift = (userObj: any) => {
    setAssignShiftUser(userObj);
    setSelectedShift(userObj.shift || 'General Shift (09:00 AM - 05:00 PM)');
    setAssignShiftModalOpen(true);
  };

  const handleAssignShiftSubmit = async () => {
    if (!assignShiftUser) return;
    setAssigningShift(true);
    try {
      await api.put(`/employees/${assignShiftUser._id}`, {
        shift: selectedShift,
      });
      setAssignShiftModalOpen(false);
      setAssignShiftUser(null);
      fetchUsers();
      fetchLogs();
      alert('Shift assigned successfully!');
    } catch (err: any) {
      alert(err.message || 'Failed to assign shift');
    } finally {
      setAssigningShift(false);
    }
  };

  useEffect(() => {
    // Set default view mode based on role
    if (isManager) {
      setViewMode('hotel');
      fetchUsers();
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
            {isManager && (
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-semibold uppercase tracking-wider">Assign Shift:</span>
                <select
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val) {
                      const u = assignableUsers.find(item => item._id === val);
                      if (u) handleOpenAssignShift(u);
                      e.target.value = '';
                    }
                  }}
                  className="bg-slate-950/60 border border-slate-800 rounded p-1.5 text-white cursor-pointer focus:outline-none focus:border-gold"
                >
                  <option value="">Select Employee / Manager...</option>
                  {assignableUsers.map(u => (
                    <option key={u._id} value={u._id}>
                      {u.firstName} {u.lastName} ({u.role.replace('_', ' ')})
                    </option>
                  ))}
                </select>
              </div>
            )}
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
                  <th className="p-4">Check-In / Verification</th>
                  <th className="p-4">Check-Out / Verification</th>
                  <th className="p-4">Breaks Duration</th>
                  <th className="p-4">Working Hours</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {logs.filter(log => log.employee).map((log) => (
                  <tr key={log._id} className="hover:bg-slate-900/20 transition-colors">
                    <td className="p-4 font-semibold text-white">
                      <div className="flex items-center gap-1.5">
                        <GoogleIcon name="calendar_today" size={14} className="text-gold" />
                        {log.date}
                      </div>
                    </td>
                    {viewMode === 'hotel' && (
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 text-slate-200 font-bold uppercase overflow-hidden flex-shrink-0">
                            {log.employee?.photoUrl ? (
                              <img src={log.employee.photoUrl} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                              <span>{log.employee ? `${log.employee.firstName[0]}${log.employee.lastName[0]}` : '??'}</span>
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-white">
                              {log.employee?.firstName} {log.employee?.lastName}
                            </div>
                            <div className="text-slate-500 text-[10px]">{log.employee?.designation} ({log.employee?.department})</div>
                            {log.employee?.shift && (
                              <div className="text-[9px] text-gold font-mono mt-0.5 uppercase font-semibold">⏱ {log.employee.shift.split(' (')[0]}</div>
                            )}
                          </div>
                        </div>
                      </td>
                    )}
                    <td className="p-4 text-xs">
                      <div className="flex items-center gap-2.5">
                        {/* Check-In Selfie Thumbnail */}
                        {viewMode === 'hotel' && (
                          <div className="w-10 h-10 rounded bg-slate-800 border border-slate-700 flex-shrink-0 overflow-hidden relative group">
                            {log.checkInPhoto ? (
                              <>
                                <img src={log.checkInPhoto} alt="Selfie" className="w-full h-full object-cover" />
                                <div 
                                  className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
                                  onClick={() => setSelectedPreviewImage(log.checkInPhoto || null)}
                                >
                                  <span className="text-[7px] text-gold font-bold uppercase">View</span>
                                </div>
                              </>
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-500 text-[9px] font-semibold bg-slate-900/40">
                                Exempt
                              </div>
                            )}
                          </div>
                        )}
                        <div className="space-y-0.5">
                          <div className="font-mono text-[10.5px]">
                            {new Date(log.checkIn).toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </div>
                          {log.hotel && (
                            <div className="text-[10px] text-slate-400">
                              📍 {log.hotel.name} (<span className="text-gold uppercase font-mono">{log.hotel.code}</span>)
                            </div>
                          )}
                          {log.checkInLatitude !== undefined && log.checkInLongitude !== undefined && (
                            <div className="text-[9px] text-green-400 font-mono flex items-center gap-0.5">
                              <a 
                                href={`https://www.google.com/maps?q=${log.checkInLatitude},${log.checkInLongitude}`}
                                target="_blank"
                                rel="noreferrer"
                                className="hover:underline flex items-center gap-0.5 text-green-400 hover:text-green-300"
                                title="Open in Google Maps"
                              >
                                <GoogleIcon name="map" size={10} />
                                {log.checkInLatitude.toFixed(4)}°, {log.checkInLongitude.toFixed(4)}°
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-xs">
                      {log.checkOut ? (
                        <div className="flex items-center gap-2.5">
                          {/* Check-Out Selfie Thumbnail */}
                          {viewMode === 'hotel' && (
                            <div className="w-10 h-10 rounded bg-slate-800 border border-slate-700 flex-shrink-0 overflow-hidden relative group">
                              {log.checkOutPhoto ? (
                                <>
                                  <img src={log.checkOutPhoto} alt="Checkout Selfie" className="w-full h-full object-cover" />
                                  <div 
                                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
                                    onClick={() => setSelectedPreviewImage(log.checkOutPhoto || null)}
                                  >
                                    <span className="text-[7px] text-gold font-bold uppercase">View</span>
                                  </div>
                                </>
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-500 text-[9px] font-semibold bg-slate-900/40">
                                  Exempt
                                </div>
                              )}
                            </div>
                          )}
                          <div className="space-y-0.5">
                            <div className="font-mono text-[10.5px]">
                              {new Date(log.checkOut).toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </div>
                            {log.checkOutLatitude !== undefined && log.checkOutLongitude !== undefined && (
                              <div className="text-[9px] text-green-400 font-mono">
                                <a 
                                  href={`https://www.google.com/maps?q=${log.checkOutLatitude},${log.checkOutLongitude}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="hover:underline flex items-center gap-0.5 text-green-400 hover:text-green-300"
                                  title="Open in Google Maps"
                                >
                                  <GoogleIcon name="map" size={10} />
                                  {log.checkOutLatitude.toFixed(4)}°, {log.checkOutLongitude.toFixed(4)}°
                                </a>
                              </div>
                            )}
                            {log.workDescription && (
                              <button
                                type="button"
                                onClick={() => setSelectedWorkLog(log)}
                                className="text-[9px] text-gold hover:text-gold-light hover:underline font-bold mt-0.5 cursor-pointer block text-left"
                              >
                                View Update &rarr;
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-500 italic font-medium">Currently Active</span>
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
      {/* Zoom Image Preview Modal */}
      {selectedPreviewImage && (
        <div 
          className="fixed inset-0 bg-black/95 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200" 
          onClick={() => setSelectedPreviewImage(null)}
        >
          <div className="relative max-w-3xl max-h-[85vh] w-auto h-auto flex flex-col items-center">
            <button 
              className="absolute top-[-40px] right-0 text-white font-bold text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer"
              onClick={() => setSelectedPreviewImage(null)}
            >
              <GoogleIcon name="close" size={14} />
              Close Preview
            </button>
            <img src={selectedPreviewImage} alt="Verification Preview" className="max-w-full max-h-[80vh] rounded-xl shadow-2xl object-contain border border-gold/20" />
          </div>
        </div>
      )}

      {/* Detailed Work Log/Checkout Update Modal */}
      {selectedWorkLog && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-card-dark border border-gold/30 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="flex justify-between items-start border-b border-slate-800 pb-4">
              <div>
                <h3 className="font-bold text-white text-sm">Checkout Shift Details</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Date: {selectedWorkLog.date} | Staff: {selectedWorkLog.employee?.firstName} {selectedWorkLog.employee?.lastName}</p>
              </div>
              <button 
                onClick={() => setSelectedWorkLog(null)} 
                className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <GoogleIcon name="close" size={18} />
              </button>
            </div>

            {/* Description */}
            <div className="space-y-4 text-xs">
              <div className="space-y-1">
                <span className="text-slate-500 font-semibold uppercase text-[9px] tracking-wider">Work Description Update:</span>
                <p className="bg-slate-950/40 p-3 rounded-lg border border-slate-900 text-slate-200 leading-relaxed max-h-40 overflow-y-auto whitespace-pre-wrap font-sans">
                  {selectedWorkLog.workDescription}
                </p>
              </div>

              {/* Checkout Evidence Images */}
              {selectedWorkLog.workPictureUrl && (
                <div className="space-y-1.5">
                  <span className="text-slate-500 font-semibold uppercase text-[9px] tracking-wider">Uploaded Work Image:</span>
                  <div className="w-full h-44 rounded-lg bg-slate-950/40 border border-slate-900 overflow-hidden relative group">
                    <img src={selectedWorkLog.workPictureUrl} alt="Work picture evidence" className="w-full h-full object-cover" />
                    <div 
                      className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
                      onClick={() => setSelectedPreviewImage(selectedWorkLog.workPictureUrl || null)}
                    >
                      <span className="text-xs text-gold font-bold uppercase tracking-wider">Enlarge View</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Assign Shift Modal */}
      {assignShiftModalOpen && assignShiftUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card-dark border border-gold/20 rounded-xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <GoogleIcon name="schedule" className="text-gold animate-pulse" size={18} />
                Assign Shift
              </h3>
              <button 
                onClick={() => {
                  setAssignShiftModalOpen(false);
                  setAssignShiftUser(null);
                }} 
                className="text-slate-400 hover:text-white"
              >
                <GoogleIcon name="close" size={18} />
              </button>
            </div>

            <div className="text-xs space-y-3">
              <div>
                <span className="text-slate-500 font-semibold uppercase text-[9px] tracking-wider block">Staff Name</span>
                <span className="text-slate-200 font-bold text-sm block mt-0.5">
                  {assignShiftUser.firstName} {assignShiftUser.lastName}
                </span>
                <span className="text-slate-500 font-mono text-[10px]">
                  Role: {assignShiftUser.role.replace('_', ' ')} | Dept: {assignShiftUser.department || 'N/A'}
                </span>
              </div>

              <div>
                <span className="text-slate-500 font-semibold uppercase text-[9px] tracking-wider block">Current Shift</span>
                <span className="text-gold font-semibold font-mono block mt-0.5">
                  {assignShiftUser.shift || 'General Shift (09:00 AM - 05:00 PM)'}
                </span>
              </div>

              <div className="space-y-1.5 border-t border-slate-800/60 pt-3">
                <label className="block text-slate-400 font-semibold uppercase text-[9px] tracking-wider flex items-center gap-1.5">
                  <GoogleIcon name="schedule" className="text-gold" size={12} />
                  Select New Shift
                </label>
                
                <div className="relative flex items-center">
                  <select
                    value={selectedShift}
                    onChange={(e) => setSelectedShift(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded px-3 py-2 text-white cursor-pointer focus:outline-none focus:border-gold max-h-40 overflow-y-auto"
                  >
                    {shiftOptions.map((s, idx) => (
                      <option key={idx} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-[9px] text-slate-500 italic mt-1 leading-relaxed">
                  Hover/focus over the selection field and scroll down to select from all active shifts.
                </p>
              </div>

              <button
                onClick={handleAssignShiftSubmit}
                disabled={assigningShift}
                className="w-full bg-gold hover:bg-gold-light text-slate-dark font-bold py-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer mt-4"
              >
                {assigningShift ? (
                  <GoogleIcon name="progress_activity" size={14} className="animate-spin-icon" />
                ) : (
                  <GoogleIcon name="check" size={14} />
                )}
                Confirm Assignment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
