'use client';
import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';

export default function DashboardHoursChart({ chartData }: { chartData: any[] }) {
  return (
    <div className="w-full h-56 mt-2">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
          <defs>
            <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.4}/>
              <stop offset="95%" stopColor="#D4AF37" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="date" stroke="#64748b" fontSize={9} tickLine={false} />
          <YAxis stroke="#64748b" fontSize={9} tickLine={false} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', fontSize: '10px', color: '#111827' }}
            labelStyle={{ color: '#D4AF37', fontWeight: 'bold' }}
          />
          <Area type="monotone" dataKey="hours" name="Work Hours" stroke="#D4AF37" strokeWidth={2} fillOpacity={1} fill="url(#colorHours)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
