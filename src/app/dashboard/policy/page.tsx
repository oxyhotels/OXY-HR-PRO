'use client';

import React, { useState } from 'react';
import { FileText, CheckCircle2, ChevronRight, Bookmark, ShieldCheck, PenTool } from 'lucide-react';

interface Policy {
  id: string;
  title: string;
  category: string;
  content: string;
  lastUpdated: string;
  signed: boolean;
}

const mockPolicies: Policy[] = [
  {
    id: 'p1',
    title: 'OXY Brand Customer First Hospitality Policy',
    category: 'Brand Guidelines',
    content: 'All staff must conform to active listening guidelines. Greeting templates: Welcome to OXY Hotels - Guest Comfort is our signature mission. Any customer query must be resolved within 30 minutes or escalated via operations ticketing system.',
    lastUpdated: '2026-05-10',
    signed: true
  },
  {
    id: 'p2',
    title: 'Geofence GPS Attendance & Tracking Policy',
    category: 'Operations & IT',
    content: 'Work shifts check-in and check-out logs are only validated within the 200m hotel property geofence boundary coordinates. Clock-in selfies verify attendance identities. Falsification logs will trigger discipline alerts on the AI Engine.',
    lastUpdated: '2026-06-01',
    signed: false
  }
];

export default function PolicyPage() {
  const [policies, setPolicies] = useState<Policy[]>(mockPolicies);
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);

  const handleSignPolicy = (id: string) => {
    setPolicies(policies.map(p => p.id === id ? { ...p, signed: true } : p));
    if (selectedPolicy?.id === id) {
      setSelectedPolicy(prev => prev ? { ...prev, signed: true } : null);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <FileText className="text-gold" size={24} />
          Hotel Policy Center
        </h1>
        <p className="text-slate-400 text-xs mt-1">Review operational, security, and customer service compliance policy books.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Policy Index List */}
        <div className="space-y-4">
          <h2 className="text-xs font-bold text-gold uppercase tracking-wider mb-2">Policy Documents</h2>
          {policies.map(pol => (
            <div
              key={pol.id}
              onClick={() => setSelectedPolicy(pol)}
              className={`glass-panel border p-5 rounded-xl cursor-pointer transition-all hover:-translate-y-0.5 ${
                selectedPolicy?.id === pol.id
                  ? 'border-gold/60 gold-glow bg-gold/5'
                  : 'border-slate-800/80 hover:border-gold/30 bg-card-dark'
              }`}
            >
              <div className="flex justify-between items-start">
                <span className="bg-slate-850 text-slate-350 border border-slate-750 px-2 py-0.5 rounded text-[9px] uppercase font-semibold">
                  {pol.category}
                </span>
                <Bookmark size={14} className={pol.signed ? 'text-green-400' : 'text-slate-500'} />
              </div>
              <h3 className="font-bold text-white text-xs mt-3 leading-snug">{pol.title}</h3>
              <div className="mt-4 flex items-center justify-between text-[9px] text-slate-500 pt-2 border-t border-slate-850">
                <span>Updated: {pol.lastUpdated}</span>
                <span className="flex items-center gap-0.5 text-gold font-bold uppercase tracking-wider">
                  Open Document <ChevronRight size={10} />
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Selected Policy Viewer / Sign Panel */}
        <div className="lg:col-span-2">
          {selectedPolicy ? (
            <div className="bg-card-dark border border-slate-800/80 rounded-xl p-6 space-y-6">
              <div className="flex justify-between items-center border-b border-slate-800/60 pb-4">
                <div>
                  <h2 className="text-sm font-bold text-white">{selectedPolicy.title}</h2>
                  <p className="text-[9px] text-slate-400 mt-0.5">Category: {selectedPolicy.category} | Last Revised: {selectedPolicy.lastUpdated}</p>
                </div>
                {selectedPolicy.signed ? (
                  <span className="bg-green-500/10 text-green-400 border border-green-500/15 px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider flex items-center gap-1">
                    <ShieldCheck size={12} />
                    Signed & Verified
                  </span>
                ) : (
                  <button
                    onClick={() => handleSignPolicy(selectedPolicy.id)}
                    className="bg-gold hover:bg-gold-light text-slate-dark font-bold px-3 py-1.5 rounded-lg text-[10px] flex items-center gap-1.5 uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    <PenTool size={12} />
                    Acknowledge & Sign
                  </button>
                )}
              </div>

              {/* Policy Body Content */}
              <div className="bg-slate-950/35 border border-slate-900 rounded-xl p-6 leading-relaxed">
                <span className="text-[9px] uppercase font-bold text-gold tracking-widest block mb-4">Official Document Text</span>
                <p className="text-slate-350 text-xs leading-relaxed whitespace-pre-wrap">
                  {selectedPolicy.content}
                </p>
              </div>

              {!selectedPolicy.signed && (
                <div className="bg-amber-950/15 border border-amber-500/20 p-4 rounded-lg text-[10px] text-amber-400 flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
                  <p>
                    By clicking "Acknowledge & Sign", you digitally certify that you have read, understood, and agreed to abide by the guidelines defined in this policy document.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center min-h-[40vh] border border-slate-800/80 rounded-xl bg-card-dark/40 p-8 text-center">
              <FileText size={44} className="text-slate-500 mb-3" />
              <h3 className="font-bold text-white text-xs uppercase tracking-wider">Select Policy</h3>
              <p className="text-[10px] text-slate-500 mt-1 max-w-xs leading-relaxed">
                Choose any policy document from the list on the left to read its contents and submit your digital acknowledgment signature.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
