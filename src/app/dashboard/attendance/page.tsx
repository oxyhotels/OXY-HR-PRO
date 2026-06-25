'use client';
/* eslint-disable @next/next/no-img-element */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { api } from '../../../lib/api';
import { useAuthStore } from '../../../store/authStore';
import GoogleIcon from '../../../components/GoogleIcon';
import { DEPARTMENTS } from '@/constants/departments';
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
  checkInAddress?: string;
  checkOutAddress?: string;
  country?: string;
  state?: string;
  district?: string;
  city?: string;
  locality?: string;
  village?: string;
  road?: string;
  postalCode?: string;
  gpsAccuracy?: number;
  locationSource?: string;
  deviceFingerprint?: string;
  browserAgent?: string;
  os?: string;
  gpsEnabled?: boolean;
  checkInSelfie?: string;
  checkOutCountry?: string;
  checkOutState?: string;
  checkOutDistrict?: string;
  checkOutCity?: string;
  checkOutLocality?: string;
  checkOutVillage?: string;
  checkOutSelfie?: string;
  workDescription?: string;
  workPictureUrl?: string;
  workVideoUrl?: string;
  hotel?: {
    _id: string;
    name: string;
    hotelCode: string;
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
  manager?: {
    id: string;
    name: string;
    email: string;
    phone: string;
  } | null;
}

export default function AttendancePage() {
  const { user } = useAuthStore();
  const userRole = user?.role;
  const [logs, setLogs] = useState<AttendanceLog[]>([]);

  const [departmentsList, setDepartmentsList] = useState<string[]>(Array.from(DEPARTMENTS));

  useEffect(() => {
    const fetchDepts = async () => {
      try {
        const res = await api.get('/organization/public-departments');
        if (res?.data?.departments) {
          setDepartmentsList(res.data.departments);
        }
      } catch (err) {
        console.error('Failed to load active departments', err);
      }
    };
    fetchDepts();
  }, []);

  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState('2026-06');
  const [selectedDate, setSelectedDate] = useState('2026-06-08');
  const [viewMode, setViewMode] = useState<'personal' | 'hotel' | 'gps'>('personal');
  const [viewAllHotelLogs, setViewAllHotelLogs] = useState(true);
  const [selectedPreviewImage, setSelectedPreviewImage] = useState<string | null>(null);
  const [selectedWorkLog, setSelectedWorkLog] = useState<AttendanceLog | null>(null);
  const [selfieCompareLog, setSelfieCompareLog] = useState<AttendanceLog | null>(null);
  const [mapViewLog, setMapViewLog] = useState<AttendanceLog | null>(null);

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
    '12-Hour Shift (09:00 AM - 09:00 PM)',
    '9-Hour Shift (09:00 AM - 06:00 PM)',
  ];

  const isManager = userRole === 'ROOT_ADMIN' || userRole === 'HOTEL_ADMIN' || userRole === 'HR_MANAGER' || userRole === 'DEPT_MANAGER';

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
    // Root admin should start in hotel view; other managers and employees see personal attendance by default.
    if (userRole === 'ROOT_ADMIN') {
      setViewMode('hotel');
    }
    if (isManager) {
      fetchUsers();
    }
  }, [isManager, userRole]);

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

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      if (viewMode === 'personal') {
        const res = await api.get(`/attendance/me?month=${selectedMonth}`);
        setLogs(res.data.logs || []);
      } else if (viewMode === 'gps') {
        const params = new URLSearchParams();
        if (employeeFilterId) params.append('employeeId', employeeFilterId);
        if (hotelFilterId && userRole === 'ROOT_ADMIN') params.append('hotelId', hotelFilterId);
        if (!viewAllHotelLogs && selectedDate) {
          params.append('date', selectedDate);
        }
        const res = await api.get(`/attendance/live?${params.toString()}`);
        setLogs(res.data.logs || []);
      } else {
        const params = new URLSearchParams();
        
        if (employeeFilterId) params.append('employeeId', employeeFilterId);
        if (departmentFilter) params.append('department', departmentFilter);
        if (roleFilter) params.append('role', roleFilter);
        if (hotelFilterId && userRole === 'ROOT_ADMIN') params.append('hotelId', hotelFilterId);
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
    endDateFilter,
    searchQuery,
    userRole
  ]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black bg-gradient-to-r from-gold to-amber-200 bg-clip-text text-transparent drop-shadow-sm">Attendance Logs</h1>
          <p className="text-slate-300 text-xs mt-1.5 font-medium">Review clock-in histories, GPS coordinates, and total computed working hours.</p>
        </div>

        {/* View mode toggle & Reporting toolbar */}
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {viewMode === 'hotel' && isManager && (
            <div className="flex flex-wrap items-center gap-2 border-r border-slate-700 pr-4 mr-2">
              <button
                type="button"
                onClick={() => setShowAnalytics(true)}
                className="px-3 py-1.5 bg-brand-primary/10 hover:bg-brand-primary border border-brand-primary/20 text-brand-primary hover:text-white rounded-lg text-xs font-bold transition-all duration-300 flex items-center gap-1.5 cursor-pointer hover:scale-105 shadow-sm hover:shadow-brand-primary/20"
                title="Fullscreen Analytics Dashboard"
              >
                <GoogleIcon name="analytics" size={14} />
                Analytics
              </button>
              <button
                type="button"
                onClick={handleCSVExport}
                className="px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-bold transition-all duration-300 flex items-center gap-1.5 cursor-pointer hover:scale-105 shadow-sm"
                title="Export CSV"
              >
                <GoogleIcon name="description" size={14} />
                CSV
              </button>
              <button
                type="button"
                onClick={handleExcelExport}
                className="px-3 py-1.5 bg-emerald-900/40 hover:bg-emerald-600 border border-emerald-800 text-emerald-400 hover:text-white rounded-lg text-xs font-bold transition-all duration-300 flex items-center gap-1.5 cursor-pointer hover:scale-105 shadow-sm"
                title="Export Excel"
              >
                <GoogleIcon name="table_view" size={14} />
                Excel
              </button>
              <button
                type="button"
                onClick={handlePDFExport}
                className="px-3 py-1.5 bg-red-900/40 hover:bg-red-600 border border-red-800 text-red-400 hover:text-white rounded-lg text-xs font-bold transition-all duration-300 flex items-center gap-1.5 cursor-pointer hover:scale-105 shadow-sm"
                title="Export PDF"
              >
                <GoogleIcon name="picture_as_pdf" size={14} />
                PDF
              </button>
            </div>
          )}

          {isManager && (
            <div className="flex bg-slate-900/60 backdrop-blur-md p-1.5 rounded-2xl border border-slate-700/80 text-xs shadow-inner overflow-x-auto scrollbar-none">
              {user?.role === 'ROOT_ADMIN' && (
                <button
                  onClick={() => setViewMode('gps')}
                  className={`px-4 py-2 rounded-xl font-bold transition-all duration-300 cursor-pointer whitespace-nowrap ${
                    viewMode === 'gps' ? 'bg-gradient-to-r from-brand-primary to-indigo-500 text-white shadow-md shadow-brand-primary/20 scale-[1.02]' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  📍 GPS Verification Center
                </button>
              )}
              <button
                onClick={() => setViewMode('hotel')}
                className={`px-4 py-2 rounded-xl font-bold transition-all duration-300 cursor-pointer whitespace-nowrap ${
                  viewMode === 'hotel' ? 'bg-gradient-to-r from-brand-primary to-indigo-500 text-white shadow-md shadow-brand-primary/20 scale-[1.02]' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                Hotel View
              </button>
              <button
                onClick={() => setViewMode('personal')}
                className={`px-4 py-2 rounded-xl font-bold transition-all duration-300 cursor-pointer whitespace-nowrap ${
                  viewMode === 'personal' ? 'bg-gradient-to-r from-brand-primary to-indigo-500 text-white shadow-md shadow-brand-primary/20 scale-[1.02]' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                My Shifts
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Advanced Expandable Filter Panel */}
      <div className="bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-2xl p-6 shadow-xl shadow-slate-200/20 hover:shadow-2xl transition-all duration-500 space-y-4">
        {viewMode === 'personal' ? (
          <div className="flex items-center gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-100">
            <span className="text-slate-600 font-bold uppercase tracking-wider">Salary Month:</span>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl p-2 text-slate-850 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all shadow-sm"
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
                  className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <GoogleIcon name={isFilterExpanded ? 'expand_less' : 'filter_list'} size={15} />
                  {isFilterExpanded ? 'Collapse Advanced Filters' : 'Expand Advanced Filters'}
                </button>
                
                {isManager && (
                  <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
                    <span className="text-slate-500 font-bold uppercase tracking-wider">Assign Shift:</span>
                    <select
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val) {
                          const u = assignableUsers.find(item => item._id === val);
                          if (u) handleOpenAssignShift(u);
                          e.target.value = '';
                        }
                      }}
                      className="bg-white border border-slate-200 rounded-xl p-2 text-slate-850 cursor-pointer focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold text-xs"
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
                    className="accent-brand-primary cursor-pointer h-4 w-4"
                  />
                  <label htmlFor="viewAllHotelLogs" className="text-slate-700 font-bold cursor-pointer uppercase tracking-wider text-[10.5px]">
                    Show All History (All Dates)
                  </label>
                </div>
                
                {!viewAllHotelLogs && (
                  <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl p-1.5">
                    <span className="text-[10px] text-slate-500 font-mono uppercase font-bold px-1">Shift Date:</span>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="bg-transparent border-none text-xs text-slate-800 focus:outline-none cursor-pointer font-semibold font-mono"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Expandable Filter Grid */}
            {isFilterExpanded && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-100 text-xs animate-in fade-in duration-200">
                {/* Search query input */}
                <div className="space-y-1">
                  <label className="block text-slate-550 text-slate-500 font-bold uppercase tracking-wider text-[9.5px]">Text Search</label>
                  <div className="relative">
                    <GoogleIcon name="search" className="absolute left-2.5 top-2 text-slate-400" size={14} />
                    <input
                      type="text"
                      placeholder="Search Name, Email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-slate-800 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold placeholder-slate-400 text-xs"
                    />
                  </div>
                </div>

                {/* Employee select */}
                <div className="space-y-1">
                  <label className="block text-slate-500 font-bold uppercase tracking-wider text-[9.5px]">Employee</label>
                  <select
                    value={employeeFilterId}
                    onChange={(e) => setEmployeeFilterId(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2 text-slate-800 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold cursor-pointer text-xs"
                  >
                    <option value="">All Employees</option>
                    {assignableUsers.map(u => (
                      <option key={u._id} value={u._id}>{u.firstName} {u.lastName}</option>
                    ))}
                  </select>
                </div>

                {/* Department select */}
                <div className="space-y-1">
                  <label className="block text-slate-500 font-bold uppercase tracking-wider text-[9.5px]">Department</label>
                  <select
                    value={departmentFilter}
                    onChange={(e) => setDepartmentFilter(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2 text-slate-800 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold cursor-pointer text-xs"
                  >
                    <option value="">All Departments</option>
                    {departmentsList.map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>

                {/* Role select */}
                <div className="space-y-1">
                  <label className="block text-slate-500 font-bold uppercase tracking-wider text-[9.5px]">Role</label>
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2 text-slate-800 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold cursor-pointer text-xs"
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
                    <label className="block text-slate-500 font-bold uppercase tracking-wider text-[9.5px]">Hotel Property</label>
                    <select
                      value={hotelFilterId}
                      onChange={(e) => setHotelFilterId(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2 text-slate-800 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold cursor-pointer text-xs"
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
                  <label className="block text-slate-500 font-bold uppercase tracking-wider text-[9.5px]">Quick Range</label>
                  <select
                    value={quickFilterType}
                    onChange={(e) => handleQuickFilter(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2 text-slate-800 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold cursor-pointer text-xs"
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
                  <label className="block text-slate-500 font-bold uppercase tracking-wider text-[9.5px]">Start Date</label>
                  <input
                    type="date"
                    value={startDateFilter}
                    onChange={(e) => {
                      setStartDateFilter(e.target.value);
                      setQuickFilterType('');
                    }}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2 text-slate-800 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold cursor-pointer font-mono text-xs"
                  />
                </div>

                {/* End Date */}
                <div className="space-y-1">
                  <label className="block text-slate-500 font-bold uppercase tracking-wider text-[9.5px]">End Date</label>
                  <input
                    type="date"
                    value={endDateFilter}
                    onChange={(e) => {
                      setEndDateFilter(e.target.value);
                      setQuickFilterType('');
                    }}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2 text-slate-800 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold cursor-pointer font-mono text-xs"
                  />
                </div>

                {/* Search & Reset Buttons */}
                <div className="sm:col-span-2 md:col-span-4 flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="px-4 py-2 border border-slate-200 hover:border-slate-300 bg-white text-slate-650 hover:text-slate-800 rounded-xl font-semibold transition-colors cursor-pointer"
                  >
                    Clear Filters
                  </button>
                  <button
                    type="button"
                    onClick={fetchLogs}
                    className="px-5 py-2 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
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
          {viewMode === 'gps' ? (
            <div className="hidden md:block bg-white/90 backdrop-blur-xl border border-slate-200/80 rounded-2xl overflow-hidden shadow-xl shadow-slate-200/20 hover:shadow-2xl transition-all duration-500">
              <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-50">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-semibold">
                      <th className="p-4">Employee Name</th>
                      <th className="p-4">Hotel</th>
                      <th className="p-4">Department</th>
                      <th className="p-4">Role</th>
                      <th className="p-4">Work In Time</th>
                      <th className="p-4">Work Out Time</th>
                      <th className="p-4">Latitude</th>
                      <th className="p-4">Longitude</th>
                      <th className="p-4">City</th>
                      <th className="p-4">District</th>
                      <th className="p-4">Village</th>
                      <th className="p-4">Current Address</th>
                      <th className="p-4">Attendance Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-600">
                    {logs.filter(log => log.employee).map((log) => (
                      <tr key={log._id} className="hover:bg-brand-primary/5 transition-all duration-200 group">
                        <td className="p-4 font-semibold text-slate-800 group-hover:text-brand-primary transition-colors">
                          {log.employee?.firstName} {log.employee?.lastName}
                        </td>
                        <td className="p-4">{log.hotel?.name || 'N/A'}</td>
                        <td className="p-4">{log.employee?.department || 'N/A'}</td>
                        <td className="p-4">
                          <span className="capitalize text-[10px] bg-slate-50 px-2 py-0.5 rounded text-slate-650 border border-slate-200">
                            {log.employee?.role?.replace('_', ' ')?.toLowerCase() || 'employee'}
                          </span>
                        </td>
                        <td className="p-4 font-mono text-slate-700">
                          {new Date(log.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="p-4 font-mono text-slate-700">
                          {log.checkOut ? (
                            new Date(log.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          ) : (
                            <span className="text-slate-400 italic">Active</span>
                          )}
                        </td>
                        <td className="p-4 font-mono text-green-600">
                          {log.checkInLatitude !== undefined ? log.checkInLatitude.toFixed(5) : 'N/A'}
                        </td>
                        <td className="p-4 font-mono text-green-600">
                          {log.checkInLongitude !== undefined ? log.checkInLongitude.toFixed(5) : 'N/A'}
                        </td>
                        <td className="p-4">{log.city || log.checkOutCity || 'N/A'}</td>
                        <td className="p-4">{log.district || log.checkOutDistrict || 'N/A'}</td>
                        <td className="p-4">{log.village || log.checkOutVillage || 'N/A'}</td>
                        <td className="p-4 max-w-xs truncate text-slate-500" title={log.checkInAddress || 'N/A'}>
                          {log.checkInAddress || 'N/A'}
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                            log.status === 'Present' 
                              ? 'bg-green-50 text-green-600 border border-green-100' 
                              : log.status === 'Late'
                              ? 'bg-amber-50 text-amber-600 border border-amber-100'
                              : log.status === 'Half-Day'
                              ? 'bg-orange-50 text-orange-600 border border-orange-100'
                              : 'bg-red-50 text-red-600 border border-red-100'
                          }`}>
                            {log.status}
                          </span>
                        </td>
                        <td className="p-4 text-right space-x-2 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setSelfieCompareLog(log)}
                            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3 py-1.5 rounded-lg text-[10px] uppercase font-bold cursor-pointer transition-all hover:scale-105 shadow-sm hover:shadow-md"
                          >
                            View Selfie
                          </button>
                          <button
                            type="button"
                            onClick={() => setMapViewLog(log)}
                            className="bg-brand-primary/10 hover:bg-brand-primary text-brand-primary hover:text-white border border-brand-primary/20 px-3 py-1.5 rounded-lg text-[10px] uppercase font-bold cursor-pointer transition-all hover:scale-105 shadow-sm hover:shadow-brand-primary/30"
                          >
                            View Map
                          </button>
                        </td>
                      </tr>
                    ))}
                    {logs.length === 0 && (
                      <tr>
                        <td colSpan={14} className="text-center p-8 text-slate-400">
                          No geo-verification records found for today.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="hidden md:block bg-white/90 backdrop-blur-xl border border-slate-200/80 rounded-2xl overflow-hidden shadow-xl shadow-slate-200/20 hover:shadow-2xl transition-all duration-500">
              <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-50">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-semibold">
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
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  {logs.filter(log => log.employee).map((log) => (
                    <tr key={log._id} className="hover:bg-brand-primary/5 transition-all duration-200 group">
                      <td className="p-4 font-semibold text-slate-800">
                        <div className="flex items-center gap-1.5">
                          <GoogleIcon name="calendar_today" size={14} className="text-gold" />
                          {log.date}
                        </div>
                      </td>
                      {viewMode === 'hotel' && (
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-slate-50 flex items-center justify-center border-2 border-white shadow-sm text-slate-700 font-bold uppercase overflow-hidden shrink-0 group-hover:scale-110 transition-transform duration-300">
                              {log.employee?.photoUrl ? (
                                <img src={log.employee.photoUrl} alt="Avatar" className="w-full h-full object-cover" />
                              ) : (
                                <span>{log.employee ? `${log.employee.firstName[0]}${log.employee.lastName[0]}` : '??'}</span>
                              )}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-800">
                                {log.employee?.firstName} {log.employee?.lastName}
                              </div>
                              <div className="text-slate-500 text-[10px]">{log.employee?.designation} ({log.employee?.department})</div>
                              {log.employee?.shift && (
                                <div className="text-[9px] text-brand-primary font-mono mt-0.5 uppercase font-semibold">⏱ {log.employee.shift.split(' (')[0]}</div>
                              )}
                            </div>
                          </div>
                        </td>
                      )}
                      <td className="p-4 text-xs">
                        <div className="flex items-center gap-3">
                          {/* Check-In Selfie Thumbnail */}
                          {viewMode === 'hotel' && (
                            <div className="w-11 h-11 rounded-lg bg-slate-50 border border-slate-200 shrink-0 overflow-hidden relative shadow-sm group-hover:shadow-md transition-all">
                              {log.checkInPhoto ? (
                                <>
                                  <img src={log.checkInPhoto} alt="Selfie" className="w-full h-full object-cover" />
                                  <div 
                                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
                                    onClick={() => setSelectedPreviewImage(log.checkInPhoto || null)}
                                  >
                                    <span className="text-[7px] text-white font-bold uppercase">View</span>
                                  </div>
                                </>
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-400 text-[9px] font-semibold bg-slate-50">
                                  Exempt
                                </div>
                              )}
                            </div>
                          )}
                          <div className="space-y-0.5">
                            <div className="font-mono text-[10.5px] text-slate-700">
                              {new Date(log.checkIn).toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </div>
                            {log.hotel && (
                              <div className="text-[10px] text-slate-500">
                                📍 {log.hotel.name} (<span className="text-gold uppercase font-mono font-bold">{log.hotel.hotelCode}</span>)
                              </div>
                            )}
                            {log.checkInLatitude !== undefined && log.checkInLongitude !== undefined && (
                              <div className="text-[9px] text-green-600 font-mono flex items-center gap-0.5">
                                <a 
                                  href={`https://www.google.com/maps?q=${log.checkInLatitude},${log.checkInLongitude}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="hover:underline flex items-center gap-0.5 text-green-600 hover:text-green-700"
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
                          <div className="flex items-center gap-3">
                            {/* Check-Out Selfie Thumbnail */}
                            {viewMode === 'hotel' && (
                              <div className="w-11 h-11 rounded-lg bg-slate-50 border border-slate-200 shrink-0 overflow-hidden relative shadow-sm group-hover:shadow-md transition-all">
                                {log.checkOutPhoto ? (
                                  <>
                                    <img src={log.checkOutPhoto} alt="Checkout Selfie" className="w-full h-full object-cover" />
                                    <div 
                                      className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
                                      onClick={() => setSelectedPreviewImage(log.checkOutPhoto || null)}
                                    >
                                      <span className="text-[7px] text-white font-bold uppercase">View</span>
                                    </div>
                                  </>
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-slate-400 text-[9px] font-semibold bg-slate-50">
                                    Exempt
                                  </div>
                                )}
                              </div>
                            )}
                            <div className="space-y-0.5">
                              <div className="font-mono text-[10.5px] text-slate-700">
                                {new Date(log.checkOut).toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </div>
                              {log.checkOutLatitude !== undefined && log.checkOutLongitude !== undefined && (
                                <div className="text-[9px] text-green-600 font-mono">
                                  <a 
                                    href={`https://www.google.com/maps?q=${log.checkOutLatitude},${log.checkOutLongitude}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="hover:underline flex items-center gap-0.5 text-green-600 hover:text-green-700"
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
                                  className="text-[9px] text-brand-primary hover:text-brand-secondary hover:underline font-bold mt-0.5 cursor-pointer block text-left"
                                >
                                  View Update &rarr;
                                </button>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic font-medium">Currently Active</span>
                        )}
                      </td>
                      <td className="p-4 text-slate-600 font-mono">
                        {log.totalBreakMinutes} min
                      </td>
                      <td className="p-4 text-slate-800 font-bold font-mono">
                        {log.totalWorkingHours} hrs
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                          log.status === 'Present' 
                            ? 'bg-green-50 text-green-600 border border-green-100' 
                            : log.status === 'Late'
                            ? 'bg-amber-50 text-amber-600 border border-amber-100'
                            : log.status === 'Half-Day'
                            ? 'bg-orange-50 text-orange-600 border border-orange-100'
                            : 'bg-red-50 text-red-600 border border-red-100'
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
                          className="bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1.5 rounded-lg text-[10px] uppercase font-bold cursor-pointer transition-colors shadow-sm"
                        >
                          View Report
                        </button>
                      </td>
                    </tr>
                  ))}

                  {logs.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center p-8 text-slate-400">
                        No shift records found for this selection.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
          </div>
          </div>
        )}
        {/* Mobile View - Cards */}
        <div className="md:hidden space-y-4 animate-in fade-in duration-200">
          {viewMode === 'gps' ? (
            logs.filter(log => log.employee).map((log) => (
              <div 
                key={log._id}
                className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all space-y-3"
              >
                <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
                  <div>
                    <h4 className="font-bold text-slate-800 text-xs">{log.employee?.firstName} {log.employee?.lastName}</h4>
                    <p className="text-[10px] text-slate-500">{log.employee?.department} &bull; {log.hotel?.name}</p>
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[8px] font-bold uppercase ${
                    log.status === 'Present' 
                      ? 'bg-green-50 text-green-600 border border-green-100' 
                      : log.status === 'Late'
                      ? 'bg-amber-50 text-amber-600 border border-amber-100'
                      : 'bg-red-50 text-red-600 border border-red-100'
                  }`}>
                    {log.status}
                  </span>
                </div>
                <div className="text-[10px] space-y-1 text-slate-600">
                  <p><span className="text-slate-500 font-semibold">Check-In:</span> {new Date(log.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({log.checkInLatitude?.toFixed(4)}, {log.checkInLongitude?.toFixed(4)})</p>
                  <p><span className="text-slate-500 font-semibold">Check-Out:</span> {log.checkOut ? new Date(log.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Active'}</p>
                  {log.checkInAddress && <p className="line-clamp-2 text-slate-500"><span className="text-slate-500 font-semibold">Address:</span> {log.checkInAddress}</p>}
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => setSelfieCompareLog(log)}
                    className="w-full bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold py-2 rounded-lg text-center cursor-pointer transition-colors shadow-sm"
                  >
                    Selfie Compare
                  </button>
                  <button
                    onClick={() => setMapViewLog(log)}
                    className="w-full bg-brand-primary/5 hover:bg-brand-primary text-brand-primary hover:text-white text-[10px] font-bold py-2 rounded-lg text-center cursor-pointer transition-colors shadow-sm"
                  >
                    View Map
                  </button>
                </div>
              </div>
            ))
          ) : (
            logs.filter(log => log.employee).map((log) => (
              <div 
                key={log._id}
                onClick={() => {
                  if (log.workDescription) setSelectedWorkLog(log);
                }}
                className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all space-y-3 border border-gold/5"
              >
                {/* Header: Date and Status */}
                <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 font-mono">
                    <GoogleIcon name="calendar_today" size={14} className="text-brand-primary" />
                    {log.date}
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                    log.status === 'Present' 
                      ? 'bg-green-50 text-green-600 border border-green-100' 
                      : log.status === 'Late'
                      ? 'bg-amber-50 text-amber-600 border border-amber-100'
                      : log.status === 'Half-Day'
                      ? 'bg-orange-50 text-orange-600 border border-orange-100'
                      : 'bg-red-50 text-red-600 border border-red-100'
                  }`}>
                    {log.status}
                  </span>
                </div>

                {/* Employee Detail (Hotel View only) */}
                {viewMode === 'hotel' && log.employee && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 text-slate-700 font-bold uppercase overflow-hidden shrink-0">
                      {log.employee.photoUrl ? (
                        <img src={log.employee.photoUrl} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <span>{log.employee.firstName[0]}{log.employee.lastName[0]}</span>
                      )}
                    </div>
                    <div>
                      <h4 className="text-[11.5px] font-bold text-slate-800">{log.employee.firstName} {log.employee.lastName}</h4>
                      <p className="text-[9.5px] text-slate-500 mt-0.5">{log.employee.designation} &bull; {log.employee.department}</p>
                    </div>
                  </div>
                )}

                {/* Timing Grid */}
                <div className="grid grid-cols-2 gap-3 text-[11px] bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-slate-500 block text-[9px] uppercase font-bold">Clock-In</span>
                    <span className="font-bold text-slate-700 block mt-0.5 font-mono">
                      {new Date(log.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {log.checkInLatitude !== undefined && (
                      <a 
                        href={`https://www.google.com/maps?q=${log.checkInLatitude},${log.checkInLongitude}`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-[9px] text-green-600 hover:text-green-700 flex items-center gap-0.5 mt-1"
                      >
                        <GoogleIcon name="map" size={10} /> Maps
                      </a>
                    )}
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px] uppercase font-bold">Clock-Out</span>
                    <span className="font-bold text-slate-700 block mt-0.5 font-mono">
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
                        className="text-[9px] text-green-600 hover:text-green-700 flex items-center gap-0.5 mt-1"
                      >
                        <GoogleIcon name="map" size={10} /> Maps
                      </a>
                    )}
                  </div>
                </div>

                {/* Working Durations */}
                <div className="flex justify-between text-[10.5px] text-slate-500">
                  <span>Duty Hours: <strong className="text-slate-800 font-bold font-mono">{log.totalWorkingHours} hrs</strong></span>
                  <span>Breaks: <strong className="text-slate-800 font-bold font-mono">{log.totalBreakMinutes} mins</strong></span>
                </div>

                {/* Action Button */}
                {log.workDescription && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedWorkLog(log);
                    }}
                    className="w-full bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold py-2.5 rounded-xl text-[10px] uppercase tracking-wider transition-colors cursor-pointer shadow-sm"
                  >
                    View Work Summary Update
                  </button>
                )}
              </div>
            ))
          )}

          {logs.length === 0 && (
            <div className="text-center py-12 text-slate-400 italic text-[11px] bg-white border border-slate-100 rounded-2xl shadow-sm">
              No verification records found.
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
              className="absolute -top-10 right-0 text-white font-bold text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer"
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
          <div className="bg-white border border-slate-100 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-brand-primary text-sm flex items-center gap-2">
                <GoogleIcon name="schedule" className="text-gold animate-pulse" size={18} />
                Assign Shift
              </h3>
              <button 
                onClick={() => {
                  setAssignShiftModalOpen(false);
                  setAssignShiftUser(null);
                }} 
                className="text-slate-400 hover:text-slate-600"
              >
                <GoogleIcon name="close" size={18} />
              </button>
            </div>

            <div className="text-xs space-y-3">
              <div>
                <span className="text-slate-500 font-bold uppercase text-[9px] tracking-wider block">Staff Name</span>
                <span className="text-slate-800 font-bold text-sm block mt-0.5">
                  {assignShiftUser.firstName} {assignShiftUser.lastName}
                </span>
                <span className="text-slate-500 font-mono text-[10px]">
                  Role: {assignShiftUser.role.replace('_', ' ')} | Dept: {assignShiftUser.department || 'N/A'}
                </span>
              </div>

              <div>
                <span className="text-slate-500 font-bold uppercase text-[9px] tracking-wider block">Current Shift</span>
                <span className="text-brand-primary font-bold font-mono block mt-0.5">
                  {assignShiftUser.shift || 'General Shift (09:00 AM - 05:00 PM)'}
                </span>
              </div>

              <div className="space-y-1.5 border-t border-slate-100 pt-3">
                <label className="flex items-center gap-1.5 text-slate-500 font-bold uppercase text-[9px] tracking-wider">
                  <GoogleIcon name="schedule" className="text-gold" size={12} />
                  Select New Shift
                </label>
                
                <div className="relative flex items-center">
                  <select
                    value={selectedShift}
                    onChange={(e) => setSelectedShift(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 cursor-pointer focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold max-h-40 overflow-y-auto"
                  >
                    {shiftOptions.map((s, idx) => (
                      <option key={idx} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-[9px] text-slate-400 italic mt-1 leading-relaxed">
                  Hover/focus over the selection field and scroll down to select from all active shifts.
                </p>
              </div>

              <button
                onClick={handleAssignShiftSubmit}
                disabled={assigningShift}
                className="w-full bg-brand-primary hover:bg-brand-primary/95 text-white font-bold py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer mt-4 shadow-sm"
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

      {/* Selfie Verification Modal */}
      {selfieCompareLog && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-100 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden my-8">
            <div className="flex justify-between items-center p-5 border-b border-slate-100">
              <div>
                <h3 className="font-extrabold text-brand-primary text-sm flex items-center gap-2">
                  🛡️ GPS Address & Selfie Verification Center
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Side-by-side verification: check-in vs check-out audit
                </p>
              </div>
              <button
                onClick={() => setSelfieCompareLog(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
              >
                <GoogleIcon name="close" size={16} />
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 text-xs border-b border-slate-100">
              {/* Check-In Column */}
              <div className="space-y-4">
                <div className="bg-green-50/50 border border-green-100 p-3 rounded-xl">
                  <h4 className="font-extrabold text-green-700 uppercase text-[9px] tracking-wider">🟢 Check-In Info</h4>
                  <p className="text-slate-600 mt-1">Time: <span className="font-mono text-slate-800 font-bold">{new Date(selfieCompareLog.checkIn).toLocaleString()}</span></p>
                </div>
                
                {/* Selfie preview */}
                <div className="aspect-video bg-slate-50 rounded-xl overflow-hidden border border-slate-200 flex items-center justify-center">
                  {selfieCompareLog.checkInPhoto || selfieCompareLog.selfieUrl ? (
                    <img src={selfieCompareLog.checkInPhoto || selfieCompareLog.selfieUrl} alt="Check-In Selfie" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-slate-400 italic">No Selfie Captured / Exempt</span>
                  )}
                </div>

                <div className="bg-slate-50 border border-slate-150 p-3 rounded-xl space-y-1 text-[11px]">
                  <p className="text-slate-500 uppercase text-[8px] font-bold tracking-wider">Resolved Location</p>
                  <p className="font-mono text-slate-800 font-semibold">
                    Lat/Lng: {selfieCompareLog.checkInLatitude?.toFixed(5)}°, {selfieCompareLog.checkInLongitude?.toFixed(5)}°
                  </p>
                  <p className="text-slate-600 mt-1 leading-normal font-sans">
                    Address: {selfieCompareLog.checkInAddress || 'Address Resolution Missing'}
                  </p>
                </div>
              </div>

              {/* Check-Out Column */}
              <div className="space-y-4">
                <div className="bg-red-50/50 border border-red-100 p-3 rounded-xl">
                  <h4 className="font-extrabold text-red-700 uppercase text-[9px] tracking-wider">🔴 Check-Out Info</h4>
                  <p className="text-slate-600 mt-1">Time: <span className="font-mono text-slate-800 font-bold">{selfieCompareLog.checkOut ? new Date(selfieCompareLog.checkOut).toLocaleString() : 'Currently Active'}</span></p>
                </div>

                {/* Selfie preview */}
                <div className="aspect-video bg-slate-50 rounded-xl overflow-hidden border border-slate-200 flex items-center justify-center">
                  {selfieCompareLog.checkOut ? (
                    selfieCompareLog.checkOutSelfie || selfieCompareLog.checkOutPhoto ? (
                      <img src={selfieCompareLog.checkOutSelfie || selfieCompareLog.checkOutPhoto} alt="Check-Out Selfie" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-slate-400 italic">No Checkout Selfie / Exempt</span>
                    )
                  ) : (
                    <span className="text-slate-400 italic">Staff Currently Active</span>
                  )}
                </div>

                <div className="bg-slate-50 border border-slate-150 p-3 rounded-xl space-y-1 text-[11px]">
                  <p className="text-slate-500 uppercase text-[8px] font-bold tracking-wider">Resolved Location</p>
                  <p className="font-mono text-slate-800 font-semibold">
                    Lat/Lng: {selfieCompareLog.checkOutLatitude !== undefined ? `${selfieCompareLog.checkOutLatitude.toFixed(5)}°` : 'N/A'}, {selfieCompareLog.checkOutLongitude !== undefined ? `${selfieCompareLog.checkOutLongitude.toFixed(5)}°` : 'N/A'}
                  </p>
                  <p className="text-slate-600 mt-1 leading-normal font-sans">
                    Address: {selfieCompareLog.checkOutAddress || 'Address Resolution Missing'}
                  </p>
                </div>
              </div>
            </div>

            {/* Audit & Device Security Section */}
            <div className="p-5 bg-slate-50 text-[10.5px] text-slate-600 grid grid-cols-1 sm:grid-cols-3 gap-4 border-b border-slate-100 font-sans">
              <div>
                <span className="font-bold text-slate-500 uppercase text-[8px] tracking-wider block">Device Fingerprint</span>
                <span className="font-mono break-all text-slate-700">{selfieCompareLog.deviceFingerprint || 'N/A'}</span>
              </div>
              <div>
                <span className="font-bold text-slate-500 uppercase text-[8px] tracking-wider block">OS & Browser Info</span>
                <span className="text-slate-700">{selfieCompareLog.os || 'Unknown OS'} • {selfieCompareLog.browserAgent ? selfieCompareLog.browserAgent.split(') ')[0].replace('Mozilla/5.0 (', '') : 'N/A'}</span>
              </div>
              <div>
                <span className="font-bold text-slate-500 uppercase text-[8px] tracking-wider block">Network Audit</span>
                <span className="text-slate-700">IP Address: {selfieCompareLog.ipAddress || 'N/A'}<br />Source: {selfieCompareLog.locationSource || 'N/A'}</span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelfieCompareLog(null)}
                className="px-5 py-2.5 bg-brand-primary hover:bg-brand-primary/95 text-white rounded-xl font-bold transition-all cursor-pointer text-xs"
              >
                Close Audit Comparison
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Map Modal */}
      {mapViewLog && (
        <MapModal log={mapViewLog} onClose={() => setMapViewLog(null)} />
      )}
    </div>
  );
}

// Sub-component to load Leaflet dynamically on the client side only
const MapModal = ({ log, onClose }: { log: AttendanceLog; onClose: () => void }) => {
  const mapRef = useRef<any>(null);

  useEffect(() => {
    let isMounted = true;
    let mapInstance: any = null;

    // Load leaflet CSS if not already loaded
    if (typeof window !== 'undefined' && !document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    import('leaflet').then((L) => {
      if (!isMounted) return;

      // Leaflet default icon asset fix in Next.js/Webpack environment
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const hasCheckIn = log.checkInLatitude !== undefined && log.checkInLongitude !== undefined;
      const hasCheckOut = log.checkOutLatitude !== undefined && log.checkOutLongitude !== undefined;

      if (!hasCheckIn && !hasCheckOut) return;

      const centerLat = log.checkInLatitude ?? log.checkOutLatitude ?? 0;
      const centerLng = log.checkInLongitude ?? log.checkOutLongitude ?? 0;

      // Initialize Map
      mapInstance = L.map('attendance-map').setView([centerLat, centerLng], 14);
      mapRef.current = mapInstance;

      // Add OpenStreetMap tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(mapInstance);

      const employeeName = log.employee ? `${log.employee.firstName} ${log.employee.lastName}` : 'Employee';

      if (hasCheckIn) {
        const checkInMarker = L.marker([log.checkInLatitude!, log.checkInLongitude!])
          .addTo(mapInstance)
          .bindPopup(`
            <div style="font-family: sans-serif; color: #1e293b; min-width: 200px;">
              <strong style="color: #16a34a; font-size: 13px;">🟢 Check-In Location</strong><br/>
              <strong>Employee:</strong> ${employeeName}<br/>
              <strong>Time:</strong> ${new Date(log.checkIn).toLocaleTimeString()}<br/>
              <strong>Coordinates:</strong> ${log.checkInLatitude?.toFixed(5)}, ${log.checkInLongitude?.toFixed(5)}<br/>
              <strong>Address:</strong> ${log.checkInAddress || 'N/A'}
            </div>
          `);
        if (!hasCheckOut) {
          checkInMarker.openPopup();
        }
      }

      if (hasCheckOut) {
        const checkOutMarker = L.marker([log.checkOutLatitude!, log.checkOutLongitude!])
          .addTo(mapInstance)
          .bindPopup(`
            <div style="font-family: sans-serif; color: #1e293b; min-width: 200px;">
              <strong style="color: #dc2626; font-size: 13px;">🔴 Check-Out Location</strong><br/>
              <strong>Employee:</strong> ${employeeName}<br/>
              <strong>Time:</strong> ${new Date(log.checkOut!).toLocaleTimeString()}<br/>
              <strong>Coordinates:</strong> ${log.checkOutLatitude?.toFixed(5)}, ${log.checkOutLongitude?.toFixed(5)}<br/>
              <strong>Address:</strong> ${log.checkOutAddress || 'N/A'}
            </div>
          `);
        checkOutMarker.openPopup();
      }

      if (hasCheckIn && hasCheckOut) {
        const bounds = L.latLngBounds([
          [log.checkInLatitude!, log.checkInLongitude!],
          [log.checkOutLatitude!, log.checkOutLongitude!]
        ]);
        mapInstance.fitBounds(bounds, { padding: [50, 50] });
      }
    });

    return () => {
      isMounted = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [log]);

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-100 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col h-[80vh]">
        <div className="flex justify-between items-center p-5 border-b border-slate-100">
          <div>
            <h3 className="font-extrabold text-brand-primary text-sm">
              📍 GPS Location Map — {log.employee ? `${log.employee.firstName} ${log.employee.lastName}` : 'Staff'}
            </h3>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Visualizing clock-in and clock-out markers on OpenStreetMap
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
          >
            <GoogleIcon name="close" size={16} />
          </button>
        </div>
        <div className="flex-1 relative bg-slate-50">
          <div id="attendance-map" className="w-full h-full min-h-100 z-10" />
        </div>
        <div className="p-4 bg-slate-50 border-t border-slate-100 text-xs text-slate-600 grid grid-cols-1 md:grid-cols-2 gap-4">
          {log.checkInLatitude !== undefined && (
            <div>
              <span className="font-bold text-green-700">🟢 Check-In Coordinates:</span> {log.checkInLatitude.toFixed(5)}, {log.checkInLongitude?.toFixed(5)}
              <p className="text-[10px] text-slate-500 mt-0.5">{log.checkInAddress || 'No Address resolved'}</p>
            </div>
          )}
          {log.checkOutLatitude !== undefined && (
            <div>
              <span className="font-bold text-red-700">🔴 Check-Out Coordinates:</span> {log.checkOutLatitude.toFixed(5)}, {log.checkOutLongitude?.toFixed(5)}
              <p className="text-[10px] text-slate-500 mt-0.5">{log.checkOutAddress || 'No Address resolved'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
