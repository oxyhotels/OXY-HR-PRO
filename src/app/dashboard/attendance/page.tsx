'use client';

import React, { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { useAuthStore } from '../../../store/authStore';
import GoogleIcon from '../../../components/GoogleIcon';
import WorkLogDrawer from '../../../components/reports/WorkLogDrawer';
import EmployeeReportModal from '../../../components/reports/EmployeeReportModal';
import AttendanceAnalytics from '../../../components/reports/AttendanceAnalytics';
import { exportToCSV, exportToExcel, exportToPDF } from '../../../utils/reportExport';

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

  // Analytics & 30-Day Report trigger states
  const [showAnalytics, setShowAnalytics] = useState<boolean>(false);
  const [reportEmployeeId, setReportEmployeeId] = useState<string | null>(null);

  // Expandable filter panel states
  const [isFilterExpanded, setIsFilterExpanded] = useState<boolean>(false);
  const [employeeFilterId, setEmployeeFilterId] = useState<string>('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [hotelFilterId, setHotelFilterId] = useState<string>('');
  const [startDateFilter, setStartDateFilter] = useState<string>('');
  const [endDateFilter, setEndDateFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [quickFilterType, setQuickFilterType] = useState<string>('');
  const [hotels, setHotels] = useState<any[]>([]);

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

  useEffect(() => {
    if (user?.role === 'ROOT_ADMIN') {
      const fetchHotelsList = async () => {
        try {
          const res = await api.get('/hotels/public');
          setHotels(res.data.hotels || []);
        } catch (err) {
          console.error('Failed to fetch hotels list', err);
        }
      };
      fetchHotelsList();
    }
  }, [user]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      if (viewMode === 'personal') {
        const res = await api.get(`/attendance/me?month=${selectedMonth}`);
        setLogs(res.data.logs || []);
      } else {
        const params = new URLSearchParams();
        
        if (employeeFilterId) params.append('employeeId', employeeFilterId);
        if (departmentFilter) params.append('department', departmentFilter);
        if (roleFilter) params.append('role', roleFilter);
        if (hotelFilterId && user?.role === 'ROOT_ADMIN') params.append('hotelId', hotelFilterId);
        if (startDateFilter) params.append('startDate', startDateFilter);
        if (endDateFilter) params.append('endDate', endDateFilter);
        if (searchQuery) params.append('search', searchQuery);
        
        if (!viewAllHotelLogs) {
          params.append('startDate', selectedDate);
          params.append('endDate', selectedDate);
        }
        
        params.append('page', '1');
        params.append('limit', '100'); // Fetch top 100 matching logs
        
        const res = await api.get(`/reports/attendance?${params.toString()}`);
        setLogs(res.data.logs || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [
    viewMode, 
    selectedMonth, 
    selectedDate, 
    viewAllHotelLogs, 
    employeeFilterId, 
    departmentFilter, 
    roleFilter, 
    hotelFilterId, 
    startDateFilter, 
    endDateFilter
  ]);

  const handleCSVExport = () => {
    exportToCSV(logs, 'attendance_center_report.csv');
  };

  const handleExcelExport = () => {
    exportToExcel(logs, 'OXY Hotels HRMS - Attendance Center Report', 'attendance_center_report.xlsx');
  };

  const handlePDFExport = () => {
    exportToPDF(logs, 'OXY Hotels HRMS - Attendance Center Report', 'attendance_center_report.pdf');
  };

  const handleQuickFilter = (type: string) => {
    setQuickFilterType(type);
    if (!type) return;
    
    const today = new Date();
    let start = '';
    let end = '';
    
    if (type === 'today') {
      const dateStr = today.toISOString().split('T')[0];
      start = dateStr;
      end = dateStr;
    } else if (type === 'yesterday') {
      const yest = new Date();
      yest.setDate(today.getDate() - 1);
      const dateStr = yest.toISOString().split('T')[0];
      start = dateStr;
      end = dateStr;
    } else if (type === 'last7') {
      const past = new Date();
      past.setDate(today.getDate() - 6);
      start = past.toISOString().split('T')[0];
      end = today.toISOString().split('T')[0];
    } else if (type === 'last30') {
      const past = new Date();
      past.setDate(today.getDate() - 29);
      start = past.toISOString().split('T')[0];
      end = today.toISOString().split('T')[0];
    } else if (type === 'month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const offset = firstDay.getTimezoneOffset();
      start = new Date(firstDay.getTime() - (offset * 60 * 1000)).toISOString().split('T')[0];
      end = today.toISOString().split('T')[0];
    } else if (type === 'prev_month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
      const offset = firstDay.getTimezoneOffset();
      start = new Date(firstDay.getTime() - (offset * 60 * 1000)).toISOString().split('T')[0];
      end = new Date(lastDay.getTime() - (offset * 60 * 1000)).toISOString().split('T')[0];
    }
    
    setStartDateFilter(start);
    setEndDateFilter(end);
  };

  const handleResetFilters = () => {
    setEmployeeFilterId('');
    setDepartmentFilter('');
    setRoleFilter('');
    setHotelFilterId('');
    setStartDateFilter('');
    setEndDateFilter('');
    setSearchQuery('');
    setQuickFilterType('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Attendance Logs</h1>
          <p className="text-slate-400 text-xs mt-1">Review clock-in histories and total computed working hours.</p>
        </div>

        {/* View mode toggle & Reporting toolbar */}
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {viewMode === 'hotel' && isManager && (
            <div className="flex flex-wrap items-center gap-2 border-r border-slate-800 pr-4 mr-2">
              <button
                type="button"
                onClick={() => setShowAnalytics(true)}
                className="px-3 py-1.5 bg-indigo-950/60 hover:bg-indigo-900 border border-indigo-900/50 hover:border-indigo-700 text-indigo-300 hover:text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                title="Fullscreen Analytics Dashboard"
              >
                <GoogleIcon name="analytics" size={14} />
                📊 Analytics
              </button>
              <button
                type="button"
                onClick={handleCSVExport}
                className="px-3 py-1.5 bg-slate-850 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                title="Export CSV"
              >
                <GoogleIcon name="description" size={14} />
                CSV
              </button>
              <button
                type="button"
                onClick={handleExcelExport}
                className="px-3 py-1.5 bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-900/50 hover:border-emerald-700 text-emerald-300 hover:text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                title="Export Excel"
              >
                <GoogleIcon name="table_view" size={14} />
                Excel
              </button>
              <button
                type="button"
                onClick={handlePDFExport}
                className="px-3 py-1.5 bg-red-950/60 hover:bg-red-900 border border-red-900/50 hover:border-red-700 text-red-300 hover:text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                title="Export PDF"
              >
                <GoogleIcon name="picture_as_pdf" size={14} />
                PDF
              </button>
            </div>
          )}

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
      </div>

      {/* Advanced Expandable Filter Panel */}
      <div className="bg-card-dark border border-slate-800/80 rounded-xl p-4 space-y-4">
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
          <div className="space-y-4">
            {/* Header: Title and Toggles */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                  className="px-3.5 py-2 bg-slate-850 hover:bg-slate-800 text-slate-200 border border-slate-700/80 rounded-xl font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <GoogleIcon name={isFilterExpanded ? 'expand_less' : 'filter_list'} size={15} />
                  {isFilterExpanded ? 'Collapse Advanced Filters' : 'Expand Advanced Filters'}
                </button>
                
                {isManager && (
                  <div className="flex items-center gap-2 border-l border-slate-800 pl-3">
                    <span className="text-slate-500 font-semibold uppercase tracking-wider">Assign Shift:</span>
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
                      <option value="">Select Employee...</option>
                      {assignableUsers.map(u => (
                        <option key={u._id} value={u._id}>
                          {u.firstName} {u.lastName} ({u.role.replace('_', ' ')})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Date Scope Checkbox & Quick Search */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="viewAllHotelLogs"
                    checked={viewAllHotelLogs}
                    onChange={(e) => setViewAllHotelLogs(e.target.checked)}
                    className="accent-gold cursor-pointer h-4 w-4"
                  />
                  <label htmlFor="viewAllHotelLogs" className="text-slate-300 font-semibold cursor-pointer uppercase tracking-wider">
                    Show All History (All Dates)
                  </label>
                </div>
                
                {!viewAllHotelLogs && (
                  <div className="flex items-center gap-1.5 bg-slate-950/45 border border-slate-800 rounded-lg p-1.5">
                    <span className="text-[10px] text-slate-500 font-mono uppercase font-bold px-1">Shift Date:</span>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="bg-transparent border-none text-xs text-white focus:outline-none cursor-pointer font-semibold font-mono"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Expandable Filter Grid */}
            {isFilterExpanded && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-800/80 text-xs animate-in fade-in duration-200">
                {/* Search query input */}
                <div className="space-y-1">
                  <label className="block text-slate-550 text-slate-400 font-semibold uppercase tracking-wider text-[9.5px]">Text Search</label>
                  <div className="relative">
                    <GoogleIcon name="search" className="absolute left-2.5 top-2 text-slate-500" size={14} />
                    <input
                      type="text"
                      placeholder="Search Name, Email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-950/60 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-white focus:outline-none focus:border-gold placeholder-slate-600 text-xs"
                    />
                  </div>
                </div>

                {/* Employee select */}
                <div className="space-y-1">
                  <label className="block text-slate-400 font-semibold uppercase tracking-wider text-[9.5px]">Employee</label>
                  <select
                    value={employeeFilterId}
                    onChange={(e) => setEmployeeFilterId(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-lg p-1.5 text-slate-200 focus:outline-none focus:border-gold cursor-pointer text-xs"
                  >
                    <option value="">All Employees</option>
                    {assignableUsers.map(u => (
                      <option key={u._id} value={u._id}>{u.firstName} {u.lastName}</option>
                    ))}
                  </select>
                </div>

                {/* Department select */}
                <div className="space-y-1">
                  <label className="block text-slate-400 font-semibold uppercase tracking-wider text-[9.5px]">Department</label>
                  <select
                    value={departmentFilter}
                    onChange={(e) => setDepartmentFilter(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-lg p-1.5 text-slate-200 focus:outline-none focus:border-gold cursor-pointer text-xs"
                  >
                    <option value="">All Departments</option>
                    <option value="Front Office">Front Office</option>
                    <option value="Housekeeping">Housekeeping</option>
                    <option value="Food & Beverage">Food & Beverage</option>
                    <option value="Kitchen">Kitchen</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Security">Security</option>
                    <option value="HR & Admin">HR & Admin</option>
                    <option value="Accounts">Accounts</option>
                    <option value="Sales & Marketing">Sales & Marketing</option>
                    <option value="Operations">Operations</option>
                  </select>
                </div>

                {/* Role select */}
                <div className="space-y-1">
                  <label className="block text-slate-400 font-semibold uppercase tracking-wider text-[9.5px]">Role</label>
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-lg p-1.5 text-slate-200 focus:outline-none focus:border-gold cursor-pointer text-xs"
                  >
                    <option value="">All Roles</option>
                    <option value="HOTEL_ADMIN">Hotel Admin</option>
                    <option value="HR_MANAGER">HR Manager</option>
                    <option value="DEPT_MANAGER">Dept Manager</option>
                    <option value="EMPLOYEE">Employee</option>
                  </select>
                </div>

                {/* Hotel select (ROOT_ADMIN only) */}
                {user?.role === 'ROOT_ADMIN' && (
                  <div className="space-y-1">
                    <label className="block text-slate-400 font-semibold uppercase tracking-wider text-[9.5px]">Hotel Property</label>
                    <select
                      value={hotelFilterId}
                      onChange={(e) => setHotelFilterId(e.target.value)}
                      className="w-full bg-slate-950/60 border border-slate-800 rounded-lg p-1.5 text-slate-200 focus:outline-none focus:border-gold cursor-pointer text-xs"
                    >
                      <option value="">All Hotels</option>
                      {hotels.map(h => (
                        <option key={h._id} value={h._id}>{h.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Quick Filters */}
                <div className="space-y-1">
                  <label className="block text-slate-400 font-semibold uppercase tracking-wider text-[9.5px]">Quick Range</label>
                  <select
                    value={quickFilterType}
                    onChange={(e) => handleQuickFilter(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-lg p-1.5 text-slate-200 focus:outline-none focus:border-gold cursor-pointer text-xs"
                  >
                    <option value="">Custom / Select Range...</option>
                    <option value="today">Today</option>
                    <option value="yesterday">Yesterday</option>
                    <option value="last7">Last 7 Days</option>
                    <option value="last30">Last 30 Days</option>
                    <option value="month">Current Month</option>
                    <option value="prev_month">Previous Month</option>
                  </select>
                </div>

                {/* Start Date */}
                <div className="space-y-1">
                  <label className="block text-slate-400 font-semibold uppercase tracking-wider text-[9.5px]">Start Date</label>
                  <input
                    type="date"
                    value={startDateFilter}
                    onChange={(e) => {
                      setStartDateFilter(e.target.value);
                      setQuickFilterType('');
                    }}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-lg p-1 text-slate-200 focus:outline-none focus:border-gold cursor-pointer font-mono text-xs"
                  />
                </div>

                {/* End Date */}
                <div className="space-y-1">
                  <label className="block text-slate-400 font-semibold uppercase tracking-wider text-[9.5px]">End Date</label>
                  <input
                    type="date"
                    value={endDateFilter}
                    onChange={(e) => {
                      setEndDateFilter(e.target.value);
                      setQuickFilterType('');
                    }}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-lg p-1 text-slate-200 focus:outline-none focus:border-gold cursor-pointer font-mono text-xs"
                  />
                </div>

                {/* Search & Reset Buttons */}
                <div className="sm:col-span-2 md:col-span-4 flex justify-end gap-3 pt-2 border-t border-slate-800/40">
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="px-4 py-2 border border-slate-800 hover:border-slate-700 bg-slate-900 text-slate-400 hover:text-slate-200 rounded-xl font-semibold transition-colors cursor-pointer"
                  >
                    Clear Filters
                  </button>
                  <button
                    type="button"
                    onClick={fetchLogs}
                    className="px-4.5 py-2 bg-gold hover:bg-gold-light text-slate-dark rounded-xl font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <GoogleIcon name="search" size={14} />
                    Search Logs
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[20vh]">
          <div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block bg-card-dark border border-slate-800/80 rounded-xl overflow-hidden">
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
                  <th className="p-4 text-right">Actions</th>
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
                    <td className="p-4 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (log.employee) {
                            setReportEmployeeId(log.employee._id);
                          }
                        }}
                        className="bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-gold border border-slate-700/80 px-2.5 py-1.5 rounded text-[10px] uppercase font-bold cursor-pointer transition-colors"
                      >
                        View Report
                      </button>
                    </td>
                  </tr>
                ))}

                {logs.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center p-8 text-slate-500">
                      No shift records found for this selection.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile View - Card Layout */}
        <div className="md:hidden space-y-4 animate-in fade-in duration-200">
          {logs.filter(log => log.employee).map((log) => (
            <div 
              key={log._id}
              onClick={() => {
                if (log.workDescription) setSelectedWorkLog(log);
              }}
              className="bg-card-dark border border-slate-800/80 rounded-2xl p-4 shadow-lg space-y-3 border-gold/5"
            >
              {/* Header: Date and Status */}
              <div className="flex justify-between items-center border-b border-slate-800/60 pb-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-white font-mono">
                  <GoogleIcon name="calendar_today" size={14} className="text-gold" />
                  {log.date}
                </div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
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
              </div>

              {/* Employee Detail (Hotel View only) */}
              {viewMode === 'hotel' && log.employee && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-850 flex items-center justify-center border border-slate-700 text-slate-200 font-bold uppercase overflow-hidden flex-shrink-0">
                    {log.employee.photoUrl ? (
                      <img src={log.employee.photoUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span>{log.employee.firstName[0]}{log.employee.lastName[0]}</span>
                    )}
                  </div>
                  <div>
                    <h4 className="text-[11.5px] font-bold text-slate-200">{log.employee.firstName} {log.employee.lastName}</h4>
                    <p className="text-[9.5px] text-slate-500 mt-0.5">{log.employee.designation} &bull; {log.employee.department}</p>
                  </div>
                </div>
              )}

              {/* Timing Grid */}
              <div className="grid grid-cols-2 gap-3 text-[11px] bg-slate-950 p-2.5 rounded-xl border border-slate-900/60">
                <div>
                  <span className="text-slate-500 block text-[9px] uppercase font-semibold">Clock-In</span>
                  <span className="font-semibold text-slate-300 block mt-0.5 font-mono">
                    {new Date(log.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {log.checkInLatitude !== undefined && (
                    <a 
                      href={`https://www.google.com/maps?q=${log.checkInLatitude},${log.checkInLongitude}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-[9px] text-green-400 hover:text-green-305 hover:text-green-300 flex items-center gap-0.5 mt-1"
                    >
                      <GoogleIcon name="map" size={10} /> Maps
                    </a>
                  )}
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px] uppercase font-semibold">Clock-Out</span>
                  <span className="font-semibold text-slate-300 block mt-0.5 font-mono">
                    {log.checkOut 
                      ? new Date(log.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                      : 'Active'}
                  </span>
                  {log.checkOutLatitude !== undefined && (
                    <a 
                      href={`https://www.google.com/maps?q=${log.checkOutLatitude},${log.checkOutLongitude}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-[9px] text-green-400 hover:text-green-305 hover:text-green-300 flex items-center gap-0.5 mt-1"
                    >
                      <GoogleIcon name="map" size={10} /> Maps
                    </a>
                  )}
                </div>
              </div>

              {/* Working Durations */}
              <div className="flex justify-between text-[10.5px] text-slate-400">
                <span>Duty Hours: <strong className="text-slate-200 font-mono">{log.totalWorkingHours} hrs</strong></span>
                <span>Breaks: <strong className="text-slate-200 font-mono">{log.totalBreakMinutes} mins</strong></span>
              </div>

              {/* Action Button */}
              {log.workDescription && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedWorkLog(log);
                  }}
                  className="w-full bg-slate-900 hover:bg-slate-850 text-gold border border-slate-800 font-bold py-2.5 rounded-xl text-[10px] uppercase tracking-wider transition-colors cursor-pointer"
                >
                  View Work Summary Update
                </button>
              )}
            </div>
          ))}

          {logs.length === 0 && (
            <div className="text-center py-12 text-slate-500 italic text-[11px] bg-card-dark border border-slate-800/80 rounded-2xl">
              No shift records found for this selection.
            </div>
          )}
        </div>
      </>
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

      {/* Detailed Work Log/Checkout Update Drawer */}
      <WorkLogDrawer 
        isOpen={!!selectedWorkLog} 
        onClose={() => setSelectedWorkLog(null)} 
        log={selectedWorkLog} 
      />

      {/* Advanced Fullscreen Analytics Dashboard overlay */}
      <AttendanceAnalytics 
        isOpen={showAnalytics} 
        onClose={() => setShowAnalytics(false)} 
        user={user} 
        hotels={hotels} 
      />

      {/* Interactive 30-Day Employee Report Modal */}
      <EmployeeReportModal 
        isOpen={!!reportEmployeeId} 
        onClose={() => setReportEmployeeId(null)} 
        employeeId={reportEmployeeId || ''} 
      />

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
