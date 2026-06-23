'use client';

import React, { useState, useEffect } from 'react';
import { LifeBuoy, AlertCircle, Clock, Check, Plus, X, MessageSquare, Tag } from 'lucide-react';

interface TicketTimeline {
  status: string;
  notes: string;
  time: string;
}

interface Ticket {
  id: string;
  category: 'HR' | 'IT' | 'Maintenance' | 'Complaint';
  title: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High';
  status: 'Open' | 'InProgress' | 'Resolved';
  assignedTo?: string;
  slaDueDate: string;
  timeline: TicketTimeline[];
}

const mockTickets: Ticket[] = [
  {
    id: 't1',
    category: 'Maintenance',
    title: 'Room 304 HVAC Unit Leakage',
    description: 'AC unit condensation tray overflow causing water damage on wall panels. Requires immediate vacuum and sealing.',
    priority: 'High',
    status: 'InProgress',
    assignedTo: 'Marcus Aurelius',
    slaDueDate: '2026-06-09T16:00:00Z',
    timeline: [
      { status: 'Open', notes: 'Ticket logged by Front Desk staff.', time: '2026-06-09T12:00:00Z' },
      { status: 'InProgress', notes: 'Assigned to Marcus Aurelius. Inspection underway.', time: '2026-06-09T12:30:00Z' }
    ]
  },
  {
    id: 't2',
    category: 'IT',
    title: 'BOH Receptionist Printer Offline',
    description: 'IP mapping configuration issue. Staff unable to print guest registers or registration forms.',
    priority: 'Medium',
    status: 'Open',
    slaDueDate: '2026-06-10T12:00:00Z',
    timeline: [
      { status: 'Open', notes: 'Ticket submitted.', time: '2026-06-09T12:00:00Z' }
    ]
  }
];

export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>(mockTickets);
  const [modalOpen, setModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState<'HR' | 'IT' | 'Maintenance' | 'Complaint'>('Maintenance');
  const [newPriority, setNewPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newDesc) return;

    const hours = newPriority === 'High' ? 4 : newPriority === 'Medium' ? 24 : 72;
    const dueDate = new Date();
    dueDate.setHours(dueDate.getHours() + hours);

    const ticket: Ticket = {
      id: `t${tickets.length + 1}`,
      category: newCategory,
      title: newTitle,
      description: newDesc,
      priority: newPriority,
      status: 'Open',
      slaDueDate: dueDate.toISOString(),
      timeline: [{ status: 'Open', notes: 'Ticket submitted.', time: new Date().toISOString() }]
    };

    setTickets([ticket, ...tickets]);
    setNewTitle('');
    setNewDesc('');
    setModalOpen(false);
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'High': return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'Medium': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default: return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Resolved': return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'InProgress': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      default: return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <LifeBuoy className="text-gold" size={24} />
            Operations Ticket Management
          </h1>
          <p className="text-slate-400 text-xs mt-1">Log property compliance reports, IT bugs, and HR complaints with SLA timers.</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="bg-gold hover:bg-gold-light text-slate-dark font-bold px-4 py-2.5 rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Plus size={16} />
          Log Operations Ticket
        </button>
      </div>

      <div className="bg-card-dark border border-slate-800/80 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/40 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                <th className="p-4">Ticket Details</th>
                <th className="p-4">Category</th>
                <th className="p-4">Priority</th>
                <th className="p-4">Assigned To</th>
                <th className="p-4">SLA Time Remaining</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {tickets.map(ticket => (
                <tr key={ticket.id} className="hover:bg-slate-900/20 transition-colors">
                  <td className="p-4 max-w-sm">
                    <div className="font-semibold text-white">{ticket.title}</div>
                    <div className="text-slate-450 text-[10px] mt-1 leading-relaxed line-clamp-2">{ticket.description}</div>
                  </td>
                  <td className="p-4">
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-400">
                      <Tag size={12} className="text-gold" />
                      {ticket.category}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`border px-2.5 py-0.5 rounded text-[9px] font-bold uppercase ${getPriorityBadge(ticket.priority)}`}>
                      {ticket.priority}
                    </span>
                  </td>
                  <td className="p-4 font-mono text-[11px] text-slate-400">
                    {ticket.assignedTo || 'Unassigned'}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                      <Clock size={12} className="text-gold" />
                      <span className="font-mono">
                        {!mounted ? 'Calculating...' : (
                          new Date(ticket.slaDueDate).getTime() > Date.now()
                            ? `${Math.max(0, Math.round((new Date(ticket.slaDueDate).getTime() - Date.now()) / 3600000))} hrs left`
                            : 'SLA Breached'
                        )}
                      </span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 border rounded-full text-[9px] font-bold uppercase ${getStatusBadge(ticket.status)}`}>
                      {ticket.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ticket Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card-dark border border-gold/20 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-white text-sm">Create Operations Ticket</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider">Ticket Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Printer Jam, Kitchen Cooler leaking"
                  className="w-full bg-slate-950/60 border border-slate-800 rounded p-2 text-white"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider">Category</label>
                <select
                  className="w-full bg-slate-950/60 border border-slate-800 rounded p-2 text-white"
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value as any)}
                >
                  <option value="HR">HR Query / Complaint</option>
                  <option value="IT">IT Support</option>
                  <option value="Maintenance">Maintenance & Repairs</option>
                  <option value="Complaint">General Complaint</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider">Priority Level</label>
                  <select
                    className="w-full bg-slate-950/60 border border-slate-800 rounded p-2 text-white"
                    value={newPriority}
                    onChange={e => setNewPriority(e.target.value as any)}
                  >
                    <option value="Low">Low (72 hr SLA)</option>
                    <option value="Medium">Medium (24 hr SLA)</option>
                    <option value="High">High (4 hr SLA)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider">Detailed Description</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Describe the issue in detail, including room numbers or serial details..."
                  className="w-full bg-slate-950/60 border border-slate-800 rounded p-2 text-white"
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="w-full bg-gold hover:bg-gold-light text-slate-dark font-bold py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer uppercase text-xs"
              >
                <Check size={14} />
                Submit and Log Ticket
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
