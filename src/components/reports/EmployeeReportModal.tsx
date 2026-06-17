'use client';

import React, { useState, useEffect, useCallback } from 'react';
import GoogleIcon from '../GoogleIcon';
import { exportToCSV, exportToExcel, exportToPDF } from '../../utils/reportExport';

interface EmployeeReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
}

export default function EmployeeReportModal({ isOpen, onClose, employeeId }: EmployeeReportModalProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState<boolean>(false);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/reports/employee/${employeeId}`);
      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }
      const result = await res.json();
      if (result.status === 'success') {
        setData(result.data);
      } else {
        throw new Error(result.message || 'Failed to fetch metrics data');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load employee metrics report');
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    if (isOpen && employeeId) {
      fetchReport();
    } else {
      setData(null);
      setError(null);
    }
  }, [isOpen, employeeId, fetchReport]);

  if (!isOpen) return null;

  const employee = data?.employee;
  const summary = data?.summary;
  const logs = data?.logs || [];

  const empName = employee ? `${employee.firstName} ${employee.lastName}` : 'Employee Report';
  const roleFormatted = employee?.role ? employee.role.replace('_', ' ') : 'N/A';

  const handleExport = (format: 'csv' | 'excel' | 'pdf') => {
    if (!data || logs.length === 0) return;
    const title = `30-Day Attendance Report - ${employee.firstName} ${employee.lastName} (${employee.id})`;
    const fileBase = `attendance_30days_${employee.firstName.toLowerCase()}_${employee.lastName.toLowerCase()}`;

    if (format === 'csv') {
      exportToCSV(logs, `${fileBase}.csv`);
    } else if (format === 'excel') {
      exportToExcel(logs, title, `${fileBase}.xlsx`);
    } else if (format === 'pdf') {
      exportToPDF(logs, title, `${fileBase}.pdf`);
    }
    setShowExportMenu(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl flex flex-col shadow-2xl transition-transform animate-scale-in max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/40 rounded-t-2xl">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <GoogleIcon name="analytics" className="text-gold" size={20} />
              Employee Attendance Analytics (Last 30 Days)
            </h2>
            {employee && (
              <p className="text-xs text-slate-400 mt-1">
                Metrics and schedule history for <span className="text-gold font-semibold">{empName}</span> ({employee.id})
              </p>
            )}
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition-colors cursor-pointer"
          >
            <GoogleIcon name="close" size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
          
          {loading && (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <div className="w-10 h-10 border-4 border-gold/20 border-t-gold rounded-full animate-spin" />
              <p className="text-xs text-slate-400 font-mono">Aggregating attendance metrics...</p>
            </div>
          )}

          {error && (
            <div className="p-5 bg-red-950/40 border border-red-900/40 rounded-xl flex items-center gap-3 text-red-300">
              <GoogleIcon name="error" className="text-red-400" size={20} />
              <div className="text-xs">
                <p className="font-bold">Error Loading Report</p>
                <p className="text-slate-400 mt-0.5">{error}</p>
              </div>
              <button 
                onClick={fetchReport}
                className="ml-auto px-3 py-1 bg-red-900/50 hover:bg-red-800 border border-red-800 rounded-lg text-[10px] uppercase font-bold transition-colors cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !error && data && (
            <>
              {/* Employee Metadata & Profile Mini Card */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-950/30 p-4 rounded-xl border border-slate-850">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-850 border border-gold/20 flex items-center justify-center text-gold text-lg font-bold">
                    {employee.firstName[0]}{employee.lastName[0]}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">{empName}</h3>
                    <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider mt-0.5">{roleFormatted}</p>
                  </div>
                </div>

                <div className="text-xs space-y-1 md:border-l md:border-slate-800 md:pl-5">
                  <div className="flex justify-between md:justify-start md:gap-2">
                    <span className="text-slate-500">Department:</span>
                    <span className="text-slate-300 font-semibold">{employee.department || 'Operations'}</span>
                  </div>
                  <div className="flex justify-between md:justify-start md:gap-2">
                    <span className="text-slate-500">Designation:</span>
                    <span className="text-slate-300">{employee.designation || 'Staff'}</span>
                  </div>
                </div>

                <div className="text-xs space-y-1 md:border-l md:border-slate-800 md:pl-5">
                  <div className="flex justify-between md:justify-start md:gap-2">
                    <span className="text-slate-500">Hotel Property:</span>
                    <span className="text-gold font-semibold">{employee.hotel?.name || 'OXY Property'}</span>
                  </div>
                  <div className="flex justify-between md:justify-start md:gap-2">
                    <span className="text-slate-500">Phone:</span>
                    <span className="text-slate-300 font-mono">{employee.phone || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Stats Metrics Cards Grid */}
              <div>
                <h3 className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-3">Key Metrics Overview</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                  
                  {/* Present Days */}
                  <div className="bg-slate-950/20 border border-slate-850 p-3.5 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">Present Days</span>
                      <span className="text-lg font-bold text-emerald-400 mt-1 block">{summary.presentDays}</span>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                      <GoogleIcon name="check_circle" size={18} />
                    </div>
                  </div>

                  {/* Absent Days */}
                  <div className="bg-slate-950/20 border border-slate-850 p-3.5 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">Absent Days</span>
                      <span className="text-lg font-bold text-red-400 mt-1 block">{summary.absentDays}</span>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400">
                      <GoogleIcon name="cancel" size={18} />
                    </div>
                  </div>

                  {/* Half-Days */}
                  <div className="bg-slate-950/20 border border-slate-850 p-3.5 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">Half-Days</span>
                      <span className="text-lg font-bold text-blue-400 mt-1 block">{summary.halfDays}</span>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                      <GoogleIcon name="schedule" size={18} />
                    </div>
                  </div>

                  {/* Late Check-ins */}
                  <div className="bg-slate-950/20 border border-slate-850 p-3.5 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">Late Entries</span>
                      <span className="text-lg font-bold text-amber-400 mt-1 block">{summary.lateEntries}</span>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
                      <GoogleIcon name="alarm_add" size={18} />
                    </div>
                  </div>

                  {/* Early Checkouts */}
                  <div className="bg-slate-950/20 border border-slate-850 p-3.5 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">Early Exits</span>
                      <span className="text-lg font-bold text-amber-400 mt-1 block">{summary.earlyCheckouts}</span>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
                      <GoogleIcon name="logout" size={18} />
                    </div>
                  </div>

                  {/* Working Hours */}
                  <div className="bg-slate-950/20 border border-slate-850 p-3.5 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">Total Work Hours</span>
                      <span className="text-lg font-bold text-gold mt-1 block">{summary.totalWorkingHours} hrs</span>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center text-gold">
                      <GoogleIcon name="timer" size={18} />
                    </div>
                  </div>

                  {/* Avg Hours */}
                  <div className="bg-slate-950/20 border border-slate-850 p-3.5 rounded-xl flex items-center justify-between col-span-2 md:col-span-2">
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">Avg Hours per Shift</span>
                      <span className="text-lg font-bold text-gold mt-1 block">{summary.averageWorkingHours} hrs/day</span>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center text-gold">
                      <GoogleIcon name="hourglass_empty" size={18} />
                    </div>
                  </div>

                </div>
              </div>

              {/* Detailed Schedule Log List */}
              <div className="space-y-3">
                <h3 className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Detailed Attendance Logs</h3>
                
                {logs.length === 0 ? (
                  <div className="p-8 border border-dashed border-slate-800 rounded-xl text-center text-slate-500 text-xs italic">
                    No attendance logs recorded during this 30-day window.
                  </div>
                ) : (
                  <div className="border border-slate-850 rounded-xl overflow-hidden bg-slate-950/20">
                    <div className="max-h-[250px] overflow-y-auto scrollbar-thin">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-950 text-slate-400 uppercase font-mono tracking-wider sticky top-0 text-[10px]">
                          <tr>
                            <th className="px-4 py-3">Date</th>
                            <th className="px-4 py-3 text-center">Status</th>
                            <th className="px-4 py-3 text-center">In</th>
                            <th className="px-4 py-3 text-center">Out</th>
                            <th className="px-4 py-3 text-center">Work Time</th>
                            <th className="px-4 py-3 text-center">Break</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-850 font-sans">
                          {logs.map((log: any) => {
                            const checkInTime = log.checkIn ? new Date(log.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-';
                            const checkOutTime = log.checkOut ? new Date(log.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-';
                            const workingHours = log.totalWorkingHours !== undefined ? log.totalWorkingHours.toFixed(2) : '-';

                            // Format Status Color Badge
                            let statusBadge = (
                              <span className="px-2 py-0.5 rounded-full text-[9.5px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                Present
                              </span>
                            );
                            if (log.status === 'Absent') {
                              statusBadge = (
                                <span className="px-2 py-0.5 rounded-full text-[9.5px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
                                  Absent
                                </span>
                              );
                            } else if (log.status === 'Late') {
                              statusBadge = (
                                <span className="px-2 py-0.5 rounded-full text-[9.5px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                  Late Entry
                                </span>
                              );
                            } else if (log.status === 'Half-Day') {
                              statusBadge = (
                                <span className="px-2 py-0.5 rounded-full text-[9.5px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                  Half-Day
                                </span>
                              );
                            } else if (log.status === 'OnLeave') {
                              statusBadge = (
                                <span className="px-2 py-0.5 rounded-full text-[9.5px] font-semibold bg-slate-500/15 text-slate-400 border border-slate-500/25">
                                  Leave
                                </span>
                              );
                            }

                            return (
                              <tr key={log._id} className="hover:bg-slate-900/40 transition-colors">
                                <td className="px-4 py-3 font-mono text-slate-300 font-semibold">{log.date}</td>
                                <td className="px-4 py-3 text-center">{statusBadge}</td>
                                <td className="px-4 py-3 text-center font-mono text-slate-400">{checkInTime}</td>
                                <td className="px-4 py-3 text-center font-mono text-slate-400">{checkOutTime}</td>
                                <td className="px-4 py-3 text-center font-mono text-gold font-semibold">{workingHours} hrs</td>
                                <td className="px-4 py-3 text-center font-mono text-slate-400">{log.totalBreakMinutes || 0}m</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40 rounded-b-2xl flex justify-between items-center gap-3">
          <div className="relative">
            <button 
              disabled={loading || !data || logs.length === 0}
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="px-4 py-2 border border-slate-800 hover:border-gold/30 rounded-xl bg-slate-900 text-xs font-semibold text-slate-200 hover:text-gold transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <GoogleIcon name="download" size={15} />
              Download 30 Days Attendance
              <GoogleIcon name="arrow_drop_down" size={16} />
            </button>

            {showExportMenu && (
              <>
                <div 
                  className="fixed inset-0 z-10"
                  onClick={() => setShowExportMenu(false)}
                />
                <div className="absolute left-0 bottom-full mb-2 z-20 w-44 bg-slate-950 border border-slate-800 rounded-xl shadow-xl p-1 animate-slide-in">
                  <button 
                    onClick={() => handleExport('csv')}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-900 hover:text-gold rounded-lg transition-colors text-xs text-slate-300 font-semibold flex items-center gap-2 cursor-pointer"
                  >
                    <GoogleIcon name="description" className="text-slate-400" size={14} />
                    Export CSV
                  </button>
                  <button 
                    onClick={() => handleExport('excel')}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-900 hover:text-gold rounded-lg transition-colors text-xs text-slate-300 font-semibold flex items-center gap-2 cursor-pointer"
                  >
                    <GoogleIcon name="table_view" className="text-emerald-500" size={14} />
                    Export Excel
                  </button>
                  <button 
                    onClick={() => handleExport('pdf')}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-900 hover:text-gold rounded-lg transition-colors text-xs text-slate-300 font-semibold flex items-center gap-2 cursor-pointer"
                  >
                    <GoogleIcon name="picture_as_pdf" className="text-red-500" size={14} />
                    Export PDF
                  </button>
                </div>
              </>
            )}
          </div>

          <button 
            onClick={onClose}
            className="px-4.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors border border-slate-750"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
