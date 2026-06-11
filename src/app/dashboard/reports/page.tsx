'use client';

import React, { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { useAuthStore } from '../../../store/authStore';
import { TrendingUp, DollarSign, Award, Calendar, BarChart3, Users } from 'lucide-react';

interface PayrollStat {
  _id: string; // month
  totalPayout: number;
  totalOvertime: number;
  totalBonus: number;
}

interface AttendanceStat {
  _id: string; // status
  count: number;
}

export default function ReportsPage() {
  const { user } = useAuthStore();
  const [payrollData, setPayrollData] = useState<PayrollStat[]>([]);
  const [attendanceData, setAttendanceData] = useState<AttendanceStat[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const payRes = await api.get('/reports/payroll');
      setPayrollData(payRes.data.report || []);

      const attRes = await api.get('/reports/attendance?month=2026-06');
      setAttendanceData(attRes.data.logs || []);
    } catch (err) {
      console.error('Failed to load report analytics', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[30vh]">
        <div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Auto-calculated totals
  const totalPayrollCost = payrollData.reduce((sum, item) => sum + item.totalPayout, 0);
  const totalOvertimeCost = payrollData.reduce((sum, item) => sum + item.totalOvertime, 0);

  // SVG Chart Calculations
  const maxPayout = Math.max(...payrollData.map((item) => item.totalPayout), 1000);
  const chartHeight = 160;
  const chartWidth = 500;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-white">Reports & Intelligence</h1>
        <p className="text-slate-400 text-xs mt-1">Real-time analytical graphs mapping staffing operational efficiency.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-card-dark border border-slate-800/80 rounded-xl p-5 hover:border-gold/30 transition-all gold-border-glow">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gold/10 rounded-lg text-gold border border-gold/20">
              <DollarSign size={20} />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Accumulated Payroll Cost</p>
              <h3 className="text-xl font-bold text-white mt-1">
                ₹{totalPayrollCost.toLocaleString()}
              </h3>
            </div>
          </div>
        </div>

        <div className="bg-card-dark border border-slate-800/80 rounded-xl p-5 hover:border-gold/30 transition-all gold-border-glow">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gold/10 rounded-lg text-gold border border-gold/20">
              <TrendingUp size={20} />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Overtime Disbursed</p>
              <h3 className="text-xl font-bold text-white mt-1">
                ₹{totalOvertimeCost.toLocaleString()}
              </h3>
            </div>
          </div>
        </div>

        <div className="bg-card-dark border border-slate-800/80 rounded-xl p-5 hover:border-gold/30 transition-all gold-border-glow">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gold/10 rounded-lg text-gold border border-gold/20">
              <Award size={20} />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Operational Status</p>
              <h3 className="text-xl font-bold text-white mt-1">
                Stable
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payroll Trend (SVG Line/Bar Chart) */}
        <div className="bg-card-dark border border-slate-800/80 rounded-xl p-6">
          <h3 className="font-bold text-slate-200 text-sm mb-2 flex items-center gap-2">
            <BarChart3 size={16} className="text-gold" />
            Monthly Payroll Cost Trend
          </h3>
          <p className="text-slate-500 text-[11px] mb-6">Visual tracking of monthly net payout expenses over last 6 months.</p>

          <div className="relative w-full h-[200px] flex items-end">
            {payrollData.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center text-slate-600 text-xs">
                No historical payout data found.
              </div>
            ) : (
              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full">
                {/* Horizontal gridlines */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => (
                  <line
                    key={idx}
                    x1="0"
                    y1={chartHeight * (1 - ratio)}
                    x2={chartWidth}
                    y2={chartHeight * (1 - ratio)}
                    stroke="#1e294b"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />
                ))}

                {/* Bars */}
                {payrollData.map((item, index) => {
                  const x = (chartWidth / payrollData.length) * index + (chartWidth / payrollData.length) / 4;
                  const barWidth = (chartWidth / payrollData.length) / 2;
                  const barHeight = (item.totalPayout / maxPayout) * (chartHeight - 30);
                  const y = chartHeight - barHeight - 20;

                  return (
                    <g key={item._id} className="group cursor-pointer">
                      {/* Interactive Bar */}
                      <rect
                        x={x}
                        y={y}
                        width={barWidth}
                        height={barHeight}
                        fill="url(#goldGradient)"
                        rx="4"
                        className="transition-all duration-300 hover:fill-gold-light"
                      />
                      {/* Value label */}
                      <text
                        x={x + barWidth / 2}
                        y={y - 6}
                        textAnchor="middle"
                        fill="#f8fafc"
                        fontSize="8px"
                        fontWeight="bold"
                      >
                        ₹{Math.round(item.totalPayout)}
                      </text>
                      {/* Month label */}
                      <text
                        x={x + barWidth / 2}
                        y={chartHeight - 4}
                        textAnchor="middle"
                        fill="#94a3b8"
                        fontSize="9px"
                      >
                        {item._id}
                      </text>
                    </g>
                  );
                })}

                {/* Gradients */}
                <defs>
                  <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#d4af37" />
                    <stop offset="100%" stopColor="#1e1b12" />
                  </linearGradient>
                </defs>
              </svg>
            )}
          </div>
        </div>

        {/* Attendance breakdown Status */}
        <div className="bg-card-dark border border-slate-800/80 rounded-xl p-6">
          <h3 className="font-bold text-slate-200 text-sm mb-2 flex items-center gap-2">
            <Users size={16} className="text-gold" />
            Attendance Ratio Breakdown
          </h3>
          <p className="text-slate-500 text-[11px] mb-6">Distribution of shift compliance values recorded for June 2026.</p>

          <div className="space-y-4 py-3">
            {attendanceData.map((item) => {
              const total = attendanceData.reduce((sum, curr) => sum + curr.count, 0) || 1;
              const pct = Math.round((item.count / total) * 100);
              return (
                <div key={item._id} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-300 uppercase">{item._id}</span>
                    <span className="text-slate-400">
                      {item.count} shifts <span className="text-gold font-bold ml-1">({pct}%)</span>
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        item._id === 'Present' 
                          ? 'bg-green-500' 
                          : item._id === 'Late' 
                          ? 'bg-amber-500' 
                          : item._id === 'Half-Day' 
                          ? 'bg-orange-500' 
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}

            {attendanceData.length === 0 && (
              <div className="text-center py-12 text-slate-600 text-xs">
                No shift attendance distributions registered this month.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
