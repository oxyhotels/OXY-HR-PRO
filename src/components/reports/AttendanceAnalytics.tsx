'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import GoogleIcon from '../GoogleIcon';

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  CartesianGrid
} from 'recharts';

interface AttendanceAnalyticsProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  hotels: any[]; // List of hotels from parent for filtering
}

// Color palettes for Recharts
const STATUS_COLORS = {
  Present: '#10B981', // emerald-500
  Late: '#F59E0B',    // amber-500
  'Half-Day': '#3B82F6', // blue-500
  Absent: '#EF4444',   // rose-500
  OnLeave: '#94A3B8'   // slate-400
};

const PALETTE = ['#4F46E5', '#06B6D4', '#EC4899', '#10B981', '#F59E0B', '#3B82F6', '#8B5CF6'];

export default function AttendanceAnalytics({ isOpen, onClose, user, hotels }: AttendanceAnalyticsProps) {
  const [mounted, setMounted] = useState<boolean>(false);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [departmentsList, setDepartmentsList] = useState<string[]>([]);

  useEffect(() => {
    const fetchDepts = async () => {
      try {
        const res = await fetch('/api/organization/public-departments');
        if (res.ok) {
          const result = await res.json();
          if (result?.data?.departments) {
            setDepartmentsList(result.data.departments);
          }
        }
      } catch (err) {
        console.error('Failed to load active departments', err);
      }
    };
    fetchDepts();
  }, []);

  // Filter states
  const [selectedHotelId, setSelectedHotelId] = useState<string>('');
  const [selectedDept, setSelectedDept] = useState<string>('');

  // Charts Toggle states
  const [trendScope, setTrendScope] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [hoursScope, setHoursScope] = useState<'employee' | 'department' | 'hotel'>('employee');
  const [distScope, setDistScope] = useState<'department' | 'role' | 'hotel'>('department');

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (selectedHotelId) params.append('hotelId', selectedHotelId);
      if (selectedDept) params.append('department', selectedDept);

      const res = await fetch(`/api/reports/analytics?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }
      const result = await res.json();
      if (result.status === 'success') {
        setData(result.data);
      } else {
        throw new Error(result.message || 'Failed to fetch analytics');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [selectedHotelId, selectedDept]);

  useEffect(() => {
    if (isOpen) {
      fetchAnalytics();
    }
  }, [isOpen, fetchAnalytics]);

  // 1. Client-Side Line Trend aggregation (Daily -> Weekly / Monthly)
  const lineChartData = useMemo(() => {
    if (!data?.trendData || data.trendData.length === 0) return [];
    
    if (trendScope === 'daily') {
      return data.trendData.map((d: any) => ({
        label: d.date.substring(5), // YYYY-MM-DD -> MM-DD
        'Attendance Rate': d.rate
      }));
    }

    if (trendScope === 'weekly') {
      // Chunk daily trend into 7-day windows
      const chunks: any[] = [];
      const records = [...data.trendData];
      while (records.length > 0) {
        const chunk = records.splice(0, 7);
        const avgRate = chunk.reduce((acc, curr) => acc + curr.rate, 0) / chunk.length;
        const label = `Wk ${chunks.length + 1} (${chunk[0].date.substring(5)})`;
        chunks.push({ label, 'Attendance Rate': Number(avgRate.toFixed(1)) });
      }
      return chunks;
    }

    if (trendScope === 'monthly') {
      // Group daily trend by YYYY-MM
      const monthlyGroups: { [key: string]: number[] } = {};
      data.trendData.forEach((d: any) => {
        const monthKey = d.date.substring(0, 7); // YYYY-MM
        if (!monthlyGroups[monthKey]) monthlyGroups[monthKey] = [];
        monthlyGroups[monthKey].push(d.rate);
      });

      return Object.entries(monthlyGroups).map(([month, rates]) => {
        const avg = rates.reduce((a, b) => a + b, 0) / rates.length;
        return {
          label: month,
          'Attendance Rate': Number(avg.toFixed(1))
        };
      });
    }

    return [];
  }, [data, trendScope]);

  // 2. Bar Chart source array toggle
  const barChartData = useMemo(() => {
    if (!data?.workingHours) return [];
    const raw = data.workingHours[hoursScope] || [];
    return raw.map((r: any) => ({
      name: r.name,
      Hours: r.hours
    }));
  }, [data, hoursScope]);

  // 3. Pie Chart source array toggle
  const pieChartData = useMemo(() => {
    if (!data?.distribution) return [];
    return data.distribution[distScope] || [];
  }, [data, distScope]);

  // 4. Heatmap generator (90 Days)
  const heatmapGridData = useMemo(() => {
    if (!data?.heatmapData) return [];
    
    // Generate last 90 dates (today back 90 days)
    const dates = [];
    const today = new Date();
    for (let i = 89; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }

    const dateMap = new Map(data.heatmapData.map((h: any) => [h.date, h]));
    
    return dates.map(dateStr => {
      const record = dateMap.get(dateStr) as any;
      return {
        date: dateStr,
        count: record ? record.count : 0,
        level: record ? record.level : 0
      };
    });
  }, [data]);

  // Computations for Key Summary Cards
  const summaryMetrics = useMemo(() => {
    if (!data) return { checkInsCount: 0, avgHrs: 0, onTimeRate: 0, distinctStaff: 0 };
    
    // Total logs analyzed
    const totalLogs = data.statusPercentages?.reduce((acc: number, s: any) => acc + s.count, 0) || 0;
    
    // Present & Late total
    const presentCount = data.statusPercentages?.find((s: any) => s.name === 'Present')?.count || 0;
    
    // On time rate
    const onTimeRate = totalLogs > 0 ? Math.round((presentCount / totalLogs) * 100) : 0;
    
    // Average shift duration across all groups
    let sumHrs = 0;
    let entries = 0;
    if (data.workingHours?.employee) {
      data.workingHours.employee.forEach((e: any) => {
        sumHrs += e.hours;
        entries++;
      });
    }
    const avgHrs = entries > 0 ? Number((sumHrs / entries).toFixed(1)) : 0;

    // Headcount proxy
    const distinctStaff = data.workingHours?.employee?.length || 0;

    return {
      checkInsCount: totalLogs,
      avgHrs,
      onTimeRate,
      distinctStaff
    };
  }, [data]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 overflow-y-auto text-slate-800 flex flex-col font-sans select-none animate-fade-in">
      
      {/* Analytics White Header Navigation */}
      <header className="bg-white border-b border-slate-200 py-4.5 px-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 sticky top-0 z-30 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <GoogleIcon name="query_stats" size={20} />
            </span>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">Workforce Intelligence & Analytics Center</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time visual monitoring metrics, timesheet distribution ratios, and 90-day attendance heatmaps
          </p>
        </div>

        {/* Global Filter Bar inside Analytics Panel */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Hotel Filter (Root Admin exclusive) */}
          {user?.role === 'ROOT_ADMIN' && (
            <div className="flex items-center gap-1.5 bg-slate-100/80 px-2.5 py-1.5 rounded-lg border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-500 font-mono">Hotel:</span>
              <select 
                value={selectedHotelId}
                onChange={(e) => setSelectedHotelId(e.target.value)}
                className="bg-transparent border-none text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer pr-4"
              >
                <option value="">All Hotels</option>
                {hotels.map(h => (
                  <option key={h._id} value={h._id}>{h.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Department Filter */}
          <div className="flex items-center gap-1.5 bg-slate-100/80 px-2.5 py-1.5 rounded-lg border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-500 font-mono">Dept:</span>
            <select 
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="bg-transparent border-none text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer pr-4"
            >
              <option value="">All Departments</option>
              {departmentsList.map((dept) => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          {/* Close Analytics panel button */}
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-600 transition-colors border border-slate-200 cursor-pointer ml-auto md:ml-0 flex items-center justify-center"
            title="Close Analytics"
          >
            <GoogleIcon name="close" size={18} />
          </button>
        </div>
      </header>

      {/* Main Analytics Canvas */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        
        {loading && (
          <div className="py-44 flex flex-col items-center justify-center space-y-3">
            <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
            <p className="text-xs font-semibold text-slate-500 tracking-wider uppercase animate-pulse">
              Compiling Database Aggregate Frameworks...
            </p>
          </div>
        )}

        {error && (
          <div className="p-6 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-4 text-red-700 max-w-2xl mx-auto my-12 shadow-xs">
            <span className="p-3 bg-red-100 text-red-600 rounded-xl">
              <GoogleIcon name="report" size={24} />
            </span>
            <div className="text-xs">
              <p className="font-bold text-sm">Aggregation Processing Failed</p>
              <p className="text-red-500 mt-1">{error}</p>
            </div>
            <button 
              onClick={fetchAnalytics}
              className="ml-auto px-4 py-2 bg-white hover:bg-red-100 border border-red-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Reload
            </button>
          </div>
        )}

        {!loading && !error && data && (
          <>
            {/* Top Row: Executive KPI Metric Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              
              {/* Metric 1 */}
              <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs hover:shadow-md transition-shadow duration-300">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Total Shift Logs</span>
                    <span className="text-2xl font-extrabold text-slate-900 mt-1.5 block">{summaryMetrics.checkInsCount}</span>
                  </div>
                  <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                    <GoogleIcon name="fact_check" size={20} />
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 mt-3 font-semibold flex items-center gap-1">
                  <span className="text-emerald-500 flex items-center"><GoogleIcon name="arrow_drop_up" size={12} /> Live</span> status tracker scope
                </div>
              </div>

              {/* Metric 2 */}
              <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs hover:shadow-md transition-shadow duration-300">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">On-Time Check In Rate</span>
                    <span className="text-2xl font-extrabold text-indigo-600 mt-1.5 block">{summaryMetrics.onTimeRate}%</span>
                  </div>
                  <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                    <GoogleIcon name="verified" size={20} />
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 mt-3 font-semibold flex items-center gap-1">
                  Excludes <span className="text-amber-500 font-bold">Late Entry</span> and absent indices
                </div>
              </div>

              {/* Metric 3 */}
              <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs hover:shadow-md transition-shadow duration-300">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Avg Work hours / Shift</span>
                    <span className="text-2xl font-extrabold text-slate-900 mt-1.5 block">{summaryMetrics.avgHrs} hrs</span>
                  </div>
                  <span className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                    <GoogleIcon name="alarm" size={20} />
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 mt-3 font-semibold flex items-center gap-1">
                  Weighted average of employee duty hours
                </div>
              </div>

              {/* Metric 4 */}
              <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs hover:shadow-md transition-shadow duration-300">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Monitored Headcount</span>
                    <span className="text-2xl font-extrabold text-slate-900 mt-1.5 block">{summaryMetrics.distinctStaff} Staff</span>
                  </div>
                  <span className="p-2 bg-pink-50 text-pink-600 rounded-xl">
                    <GoogleIcon name="groups" size={20} />
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 mt-3 font-semibold flex items-center gap-1">
                  Active participants represented in trends
                </div>
              </div>

              {/* Metric 5 */}
              <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs hover:shadow-md transition-shadow duration-300">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Approved Overtime</span>
                    <span className="text-2xl font-extrabold text-purple-600 mt-1.5 block">{data.globalTotalOvertime || 0} hrs</span>
                  </div>
                  <span className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                    <GoogleIcon name="more_time" size={20} />
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 mt-3 font-semibold flex items-center gap-1">
                  Cumulative approved overtime
                </div>
              </div>
            </div>

            {/* Grid layout of Recharts Panels */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Donut Chart: Status Percentage distribution */}
              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs">
                <h3 className="text-sm font-bold text-slate-800 mb-5 flex items-center gap-1.5">
                  <GoogleIcon name="pie_chart" className="text-indigo-500" size={18} />
                  Status Distribution Ratios
                </h3>
                {mounted && (
                  <div className="h-[250px] flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="w-full md:w-1/2 h-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={data.statusPercentages}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={85}
                            paddingAngle={3}
                            dataKey="count"
                            nameKey="name"
                          >
                            {data.statusPercentages.map((entry: any, index: number) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={STATUS_COLORS[entry.name as keyof typeof STATUS_COLORS] || PALETTE[index % PALETTE.length]} 
                              />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value: any, name: any) => [`${value} logs`, name]} 
                            contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontFamily: 'sans-serif' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Custom Legend */}
                    <div className="w-full md:w-1/2 space-y-3">
                      {data.statusPercentages.map((item: any, index: number) => (
                        <div key={item.name} className="flex items-center justify-between text-xs border-b border-slate-100 pb-1.5 last:border-0 last:pb-0">
                          <div className="flex items-center gap-2">
                            <span 
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: STATUS_COLORS[item.name as keyof typeof STATUS_COLORS] || PALETTE[index % PALETTE.length] }}
                            />
                            <span className="font-semibold text-slate-700">{item.name}</span>
                          </div>
                          <div className="font-mono text-slate-500">
                            <span className="font-bold text-slate-800">{item.count}</span> ({item.value}%)
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Line Chart: Attendance rate trend over time */}
              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs flex flex-col">
                <div className="flex justify-between items-center mb-5">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <GoogleIcon name="timeline" className="text-indigo-500" size={18} />
                    Attendance Rate Timeline
                  </h3>
                  
                  {/* Toggles */}
                  <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                    {['daily', 'weekly', 'monthly'].map((scope) => (
                      <button
                        key={scope}
                        onClick={() => setTrendScope(scope as any)}
                        className={`px-3 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider transition-colors cursor-pointer ${
                          trendScope === scope 
                            ? 'bg-white text-indigo-600 shadow-xs' 
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {scope}
                      </button>
                    ))}
                  </div>
                </div>
                
                {mounted && (
                  <div className="h-[250px] flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={lineChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="label" 
                          stroke="#94a3b8" 
                          fontSize={9} 
                          tickLine={false} 
                          axisLine={false}
                        />
                        <YAxis 
                          stroke="#94a3b8" 
                          fontSize={9} 
                          tickLine={false} 
                          axisLine={false}
                          domain={[0, 100]}
                          tickFormatter={(v) => `${v}%`}
                        />
                        <Tooltip 
                          formatter={(value: any) => [`${value}%`, 'Attendance Rate']}
                          contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontFamily: 'sans-serif' }}
                        />
                        <Line
                          type="monotone"
                          dataKey="Attendance Rate"
                          stroke="#4F46E5"
                          strokeWidth={3}
                          dot={{ r: 4, strokeWidth: 1, stroke: '#FFFFFF', fill: '#4F46E5' }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Bar Chart: Working hours comparison */}
              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs flex flex-col">
                <div className="flex justify-between items-center mb-5">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <GoogleIcon name="bar_chart" className="text-indigo-500" size={18} />
                    Average Shift Hours Comparison
                  </h3>
                  
                  {/* Toggles */}
                  <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                    <button
                      onClick={() => setHoursScope('employee')}
                      className={`px-3 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider transition-colors cursor-pointer ${
                        hoursScope === 'employee' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Top Staff
                    </button>
                    <button
                      onClick={() => setHoursScope('department')}
                      className={`px-3 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider transition-colors cursor-pointer ${
                        hoursScope === 'department' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Department
                    </button>
                    {user?.role === 'ROOT_ADMIN' && (
                      <button
                        onClick={() => setHoursScope('hotel')}
                        className={`px-3 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider transition-colors cursor-pointer ${
                          hoursScope === 'hotel' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Hotel
                      </button>
                    )}
                  </div>
                </div>

                {mounted && (
                  <div className="h-[250px] flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="name" 
                          stroke="#94a3b8" 
                          fontSize={9} 
                          tickLine={false} 
                          axisLine={false}
                        />
                        <YAxis 
                          stroke="#94a3b8" 
                          fontSize={9} 
                          tickLine={false} 
                          axisLine={false}
                          tickFormatter={(v) => `${v}h`}
                        />
                        <Tooltip 
                          formatter={(value: any) => [`${value} hours`, 'Avg Working Hours']}
                          contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontFamily: 'sans-serif' }}
                        />
                        <Bar 
                          dataKey="Hours" 
                          fill="#06B6D4" 
                          radius={[6, 6, 0, 0]}
                          barSize={32}
                        >
                          {barChartData.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Pie Chart: Attendance distribution breakdown */}
              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs flex flex-col">
                <div className="flex justify-between items-center mb-5">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <GoogleIcon name="donut_large" className="text-indigo-500" size={18} />
                    Check-in Volume Distribution
                  </h3>
                  
                  {/* Toggles */}
                  <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                    <button
                      onClick={() => setDistScope('department')}
                      className={`px-3 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider transition-colors cursor-pointer ${
                        distScope === 'department' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Department
                    </button>
                    <button
                      onClick={() => setDistScope('role')}
                      className={`px-3 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider transition-colors cursor-pointer ${
                        distScope === 'role' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Role
                    </button>
                    {user?.role === 'ROOT_ADMIN' && (
                      <button
                        onClick={() => setDistScope('hotel')}
                        className={`px-3 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider transition-colors cursor-pointer ${
                          distScope === 'hotel' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Hotel
                      </button>
                    )}
                  </div>
                </div>

                {mounted && (
                  <div className="h-[250px] flex-1 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="w-full md:w-1/2 h-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieChartData}
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            dataKey="value"
                            nameKey="name"
                          >
                            {pieChartData.map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value: any) => [`${value} check-ins`, 'Volume']}
                            contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontFamily: 'sans-serif' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="w-full md:w-1/2 space-y-2 max-h-[200px] overflow-y-auto pr-1 scrollbar-thin">
                      {pieChartData.length === 0 ? (
                        <p className="text-xs text-slate-400 italic text-center py-10">No distribution records found</p>
                      ) : (
                        pieChartData.map((item: any, index: number) => (
                          <div key={item.name} className="flex items-center justify-between text-xs border-b border-slate-50 pb-1 pb-1 last:border-0 last:pb-0">
                            <div className="flex items-center gap-2 truncate pr-4">
                              <span 
                                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                style={{ backgroundColor: PALETTE[index % PALETTE.length] }}
                              />
                              <span className="font-semibold text-slate-700 truncate" title={item.name}>{item.name}</span>
                            </div>
                            <div className="font-mono font-bold text-slate-800 flex-shrink-0">
                              {item.value} logs
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Grid 5: Full Width Row - GitHub style attendance frequency heatmap calendar */}
              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs col-span-1 lg:col-span-2">
                <div className="flex justify-between items-center mb-5">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                      <GoogleIcon name="calendar_month" className="text-indigo-500" size={18} />
                      Attendance Logging Activity (Last 90 Days)
                    </h3>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Check-in volume levels color-coded by calendar date
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto pb-2 scrollbar-thin">
                  <div className="min-w-[750px] flex flex-col space-y-3 p-1">
                    {/* Heatmap Grid boxes */}
                    <div className="flex flex-wrap gap-1.5">
                      {heatmapGridData.map((cell: any) => {
                        // Level colors
                        let bgClass = 'bg-slate-100 hover:bg-slate-200'; // level 0
                        if (cell.level === 1) bgClass = 'bg-emerald-100 hover:bg-emerald-200';
                        if (cell.level === 2) bgClass = 'bg-emerald-300 hover:bg-emerald-400';
                        if (cell.level === 3) bgClass = 'bg-emerald-500 hover:bg-emerald-600';
                        if (cell.level >= 4) bgClass = 'bg-emerald-700 hover:bg-emerald-800';

                        return (
                          <div 
                            key={cell.date}
                            className={`w-3.5 h-3.5 rounded-xs transition-colors relative group cursor-pointer ${bgClass}`}
                            title={`${cell.date}: ${cell.count} check-ins`}
                          >
                            {/* Hover tooltip */}
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1.5 bg-slate-900 text-white font-mono text-[9px] px-2 py-1 rounded shadow-md whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 z-10 transition-opacity">
                              {cell.date}: {cell.count} check-ins
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Heatmap Legend */}
                    <div className="flex items-center gap-2 self-end text-[10px] text-slate-500 font-semibold mt-1">
                      <span>Less</span>
                      <span className="w-3 h-3 bg-slate-100 rounded-xs border border-slate-200" title="Level 0" />
                      <span className="w-3 h-3 bg-emerald-100 rounded-xs" title="Level 1" />
                      <span className="w-3 h-3 bg-emerald-300 rounded-xs" title="Level 2" />
                      <span className="w-3 h-3 bg-emerald-500 rounded-xs" title="Level 3" />
                      <span className="w-3 h-3 bg-emerald-700 rounded-xs" title="Level 4+" />
                      <span>More</span>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          </>
        )}

      </main>
    </div>
  );
}
