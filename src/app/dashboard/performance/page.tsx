'use client';

import React, { useState } from 'react';
import { Award, Zap, TrendingUp, AlertTriangle, ShieldCheck, Trophy, Sparkles, User } from 'lucide-react';

interface PerformanceRecord {
  name: string;
  opiScore: number;
  department: string;
  designation: string;
  badge: 'Gold' | 'Silver' | 'Bronze' | 'None';
  recommendation: 'Highly Recommended' | 'Recommended' | 'None';
  warning: string;
}

const mockPerformance: PerformanceRecord[] = [
  {
    name: 'Elena Rostova',
    opiScore: 94,
    department: 'Front Office',
    designation: 'Front Office Manager',
    badge: 'Gold',
    recommendation: 'Highly Recommended',
    warning: 'None'
  },
  {
    name: 'Sarah Jenkins',
    opiScore: 88,
    department: 'Front Office',
    designation: 'Duty Supervisor',
    badge: 'Silver',
    recommendation: 'Recommended',
    warning: 'None'
  },
  {
    name: 'Marcus Aurelius',
    opiScore: 78,
    department: 'Human Resources',
    designation: 'HR Manager',
    badge: 'Bronze',
    recommendation: 'None',
    warning: 'None'
  },
  {
    name: 'David Miller',
    opiScore: 56,
    department: 'Front Office',
    designation: 'Guest Relations Officer',
    badge: 'None',
    recommendation: 'None',
    warning: 'Performance Improvement Plan recommended'
  }
];

export default function PerformancePage() {
  const [records] = useState<PerformanceRecord[]>(mockPerformance);
  const userOpi = 88; // mockup user current index

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Trophy className="text-gold" size={24} />
          AI Performance Hub & Leaderboard
        </h1>
        <p className="text-slate-400 text-xs mt-1">Review the OXY Performance Index (OPI), rewards, badges, and automated promotion pathways.</p>
      </div>

      {/* Row 1: Radar Index Dials / AI Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Radar/OPI Dial */}
        <div className="bg-card-dark border border-slate-800/80 rounded-xl p-6 flex flex-col justify-between hover:border-gold/30 transition-all gold-border-glow">
          <div>
            <h2 className="text-xs font-bold text-gold uppercase tracking-wider mb-1">OXY Performance Index (OPI)</h2>
            <p className="text-[10px] text-slate-500">Your calculated efficiency index based on attendance, task compliance, and training certifications.</p>
          </div>
          
          <div className="flex flex-col items-center justify-center py-6">
            <div className="relative w-36 h-36 flex items-center justify-center rounded-full border border-dashed border-slate-850">
              {/* Outer dial ring */}
              <div className="absolute inset-2 rounded-full border border-gold/25 animate-spin duration-[15s]" />
              <div className="text-center z-10">
                <span className="text-3xl font-extrabold text-white">{userOpi}%</span>
                <span className="block text-[9px] uppercase font-bold text-gold tracking-widest mt-1">Star Performer</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-[10px] text-slate-400 pt-4 border-t border-slate-900">
            <div>
              <p className="font-semibold text-slate-500 uppercase text-[9px]">Attendance</p>
              <p className="text-slate-200 mt-1 font-mono">92%</p>
            </div>
            <div>
              <p className="font-semibold text-slate-500 uppercase text-[9px]">Tasks Done</p>
              <p className="text-slate-200 mt-1 font-mono">88%</p>
            </div>
            <div>
              <p className="font-semibold text-slate-500 uppercase text-[9px]">Assessments</p>
              <p className="text-slate-200 mt-1 font-mono">85%</p>
            </div>
          </div>
        </div>

        {/* AI Recommendations panel */}
        <div className="lg:col-span-2 bg-card-dark border border-slate-800/80 rounded-xl p-6 space-y-6">
          <div>
            <h2 className="text-xs font-bold text-gold uppercase tracking-wider mb-1">AI Recommendation Engine</h2>
            <p className="text-[10px] text-slate-500">System alerts evaluating promotion eligibility, compliance warnings, and performance trends.</p>
          </div>

          <div className="space-y-4">
            <div className="bg-green-950/20 border border-green-500/25 p-4 rounded-xl flex gap-3 text-xs text-green-300">
              <ShieldCheck size={20} className="text-green-400 flex-shrink-0" />
              <div>
                <span className="font-bold block">Promotion Assessment: High Priority</span>
                <p className="text-[10px] text-slate-400 mt-1">
                  Based on Sarah Jenkins’ consistently high OPI (88%) and completed F&B certifications, she is automatically recommended for promotion consideration.
                </p>
              </div>
            </div>

            <div className="bg-red-950/20 border border-red-500/25 p-4 rounded-xl flex gap-3 text-xs text-red-300">
              <AlertTriangle size={20} className="text-red-400 flex-shrink-0" />
              <div>
                <span className="font-bold block">Performance Improvement warning triggered</span>
                <p className="text-[10px] text-slate-400 mt-1">
                  David Miller’s OPI is below operational parameters (56%) due to multiple late marks and incomplete sanitation tasks. Immediate performance review is suggested.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Property Leaderboard Ranks */}
      <div className="bg-card-dark border border-slate-800/80 rounded-xl p-6 space-y-4">
        <div>
          <h2 className="text-xs font-bold text-gold uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles size={14} />
            Leaderboard rankings (Monthly Evaluation)
          </h2>
          <p className="text-[10px] text-slate-500 mt-0.5">Top-ranked employees within your hotel tenant directory based on latest OPI scores.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/40 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                <th className="p-4">Rank / Employee</th>
                <th className="p-4">Department & Role</th>
                <th className="p-4">OPI Index</th>
                <th className="p-4">Earned Rewards Badge</th>
                <th className="p-4">Promotion Pathway</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {records.map((rec, index) => (
                <tr key={index} className="hover:bg-slate-900/20 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] ${
                        index === 0 ? 'bg-gold text-slate-dark' : 'bg-slate-800 text-slate-350'
                      }`}>
                        #{index + 1}
                      </div>
                      <div className="font-semibold text-white">{rec.name}</div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div>{rec.department}</div>
                    <div className="text-slate-500 text-[10px] mt-0.5">{rec.designation}</div>
                  </td>
                  <td className="p-4 font-mono font-bold text-slate-200">
                    {rec.opiScore}%
                  </td>
                  <td className="p-4">
                    {rec.badge !== 'None' ? (
                      <span className="inline-flex items-center gap-1 bg-slate-800 text-gold border border-gold/15 px-2.5 py-0.5 rounded text-[9px] uppercase font-bold tracking-wider">
                        <Award size={10} />
                        {rec.badge} Medalist
                      </span>
                    ) : (
                      <span className="text-slate-500">-</span>
                    )}
                  </td>
                  <td className="p-4">
                    {rec.recommendation !== 'None' ? (
                      <span className="bg-green-500/10 text-green-400 border border-green-500/15 px-2.5 py-0.5 rounded text-[9px] uppercase font-bold tracking-wider">
                        {rec.recommendation}
                      </span>
                    ) : rec.warning !== 'None' ? (
                      <span className="text-red-400 text-[10px]">{rec.warning}</span>
                    ) : (
                      <span className="text-slate-500">On Track</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
