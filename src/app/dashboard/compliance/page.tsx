'use client';

import React, { useState } from 'react';
import { Shield, CheckCircle, AlertTriangle, FileText, ClipboardList, Plus, X, Calendar } from 'lucide-react';

interface ComplianceLog {
  id: string;
  type: string;
  verifiedBy: string;
  checklist: { name: string; checked: boolean }[];
  notes?: string;
  date: string;
}

const mockLogs: ComplianceLog[] = [
  {
    id: 'l1',
    type: 'Water_Tank',
    verifiedBy: 'Elena Rostova',
    checklist: [
      { name: 'Chlorine levels checked', checked: true },
      { name: 'Filter status verified and backwashed', checked: true },
      { name: 'External hatch locked & sealed', checked: true }
    ],
    notes: 'Weekly water tank filtration and chemical balance parameters conform to local Miami sanitary standards.',
    date: '2026-06-08T10:00:00Z'
  },
  {
    id: 'l2',
    type: 'CCTV_Verification',
    verifiedBy: 'Sarah Jenkins',
    checklist: [
      { name: 'All 32 perimeter cams online', checked: true },
      { name: 'BOH DVR recording storage check (min 30 days)', checked: true },
      { name: 'Blindspots inspection completed', checked: false }
    ],
    notes: 'Camera #14 near back trash bay has flickering signal but continues recording. Replacement ticket raised.',
    date: '2026-06-07T14:30:00Z'
  }
];

export default function CompliancePage() {
  const [logs, setLogs] = useState<ComplianceLog[]>(mockLogs);
  const [modalOpen, setModalOpen] = useState(false);
  const [newType, setNewType] = useState('Water_Tank');
  const [newNotes, setNewNotes] = useState('');

  const handleCreateLog = (e: React.FormEvent) => {
    e.preventDefault();

    const items = 
      newType === 'Water_Tank'
        ? ['Chlorine balance checked', 'Hatch seal locked', 'Flow valve checked']
        : newType === 'Pest_Control'
        ? ['Kitchen traps inspected', 'Basement perimeter sprayed', 'Storage room checked']
        : ['Camera signals verified', 'DVR storage check', 'Monitor screens checked'];

    const newLog: ComplianceLog = {
      id: `l${logs.length + 1}`,
      type: newType,
      verifiedBy: 'Elena Rostova',
      checklist: items.map(item => ({ name: item, checked: true })),
      notes: newNotes,
      date: new Date().toISOString()
    };

    setLogs([newLog, ...logs]);
    setNewNotes('');
    setModalOpen(false);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Shield className="text-gold" size={24} />
            Compliance & Audits Center
          </h1>
          <p className="text-slate-400 text-xs mt-1">Review water tank sanitary checklists, CCTV records, pest control, and guest audits.</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="bg-gold hover:bg-gold-light text-slate-dark font-bold px-4 py-2.5 rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Plus size={16} />
          Create Audit Log
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {logs.map(log => (
          <div key={log.id} className="bg-card-dark border border-slate-800/80 rounded-xl p-6 space-y-4 hover:border-gold/20 transition-all gold-border-glow">
            <div className="flex justify-between items-start">
              <div>
                <span className="bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded text-[9px] uppercase font-bold tracking-wider">
                  {log.type.replace('_', ' ')}
                </span>
                <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-1.5">
                  <Calendar size={12} />
                  <span>{new Date(log.date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">Auditor: {log.verifiedBy}</span>
            </div>

            {/* Checklist */}
            <div className="space-y-2 border-t border-b border-slate-900 py-3">
              <span className="text-[9px] uppercase font-bold text-gold tracking-widest block mb-2">Audit Items Check</span>
              {log.checklist.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 text-[11px]">
                  {item.checked ? (
                    <CheckCircle size={14} className="text-green-400" />
                  ) : (
                    <AlertTriangle size={14} className="text-amber-500" />
                  )}
                  <span className={item.checked ? 'text-slate-300' : 'text-slate-450 line-through'}>{item.name}</span>
                </div>
              ))}
            </div>

            {log.notes && (
              <div className="text-[11px] text-slate-400 bg-slate-950/35 p-3 rounded-lg border border-slate-900 leading-relaxed">
                <span className="font-semibold text-slate-350 block mb-1">Auditor Comments</span>
                {log.notes}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Compliance Log Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card-dark border border-gold/20 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-white text-sm">Create Audit Compliance Log</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateLog} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider">Audit Log Category</label>
                <select
                  className="w-full bg-slate-950/60 border border-slate-800 rounded p-2 text-white"
                  value={newType}
                  onChange={e => setNewType(e.target.value)}
                >
                  <option value="Water_Tank">Water Tank Hygiene Logs</option>
                  <option value="Pest_Control">Pest Control Records</option>
                  <option value="CCTV_Verification">CCTV Security Audits</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider">Observations / Findings</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Record observations, safety measurements, or alerts..."
                  className="w-full bg-slate-950/60 border border-slate-800 rounded p-2 text-white"
                  value={newNotes}
                  onChange={e => setNewNotes(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="w-full bg-gold hover:bg-gold-light text-slate-dark font-bold py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer uppercase text-xs"
              >
                <CheckCircle size={14} />
                Save Audit Compliance Entry
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
