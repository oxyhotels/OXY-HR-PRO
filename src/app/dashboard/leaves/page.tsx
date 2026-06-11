'use client';

import React, { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { useAuthStore } from '../../../store/authStore';
import { Plus, Check, X, Loader2, Calendar, FileText, AlertCircle, MessageSquare } from 'lucide-react';
import { useForm } from 'react-hook-form';

interface LeaveRequest {
  _id: string;
  leaveType: 'Casual' | 'Sick' | 'Annual' | 'Unpaid';
  startDate: string;
  endDate: string;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  comments?: string;
  employee: {
    _id: string;
    firstName: string;
    lastName: string;
    department: string;
    designation: string;
  };
  approvedBy?: {
    firstName: string;
    lastName: string;
  };
}

export default function LeavesPage() {
  const { user } = useAuthStore();
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const { register, handleSubmit, reset } = useForm();
  const { register: registerReview, handleSubmit: handleSubmitReview, reset: resetReview } = useForm();

  const fetchLeaves = async () => {
    try {
      const res = await api.get('/leaves');
      setLeaves(res.data.leaves);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const handleOpenRequest = () => {
    reset({
      leaveType: 'Annual',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      reason: '',
    });
    setRequestModalOpen(true);
  };

  const handleOpenReview = (leave: LeaveRequest) => {
    setSelectedLeave(leave);
    resetReview({
      status: 'Approved',
      comments: '',
    });
    setReviewModalOpen(true);
  };

  const onSubmitRequest = async (values: any) => {
    setActionLoading(true);
    try {
      await api.post('/leaves', values);
      setRequestModalOpen(false);
      fetchLeaves();
    } catch (err: any) {
      alert(err.message || 'Leave request failed');
    } finally {
      setActionLoading(false);
    }
  };

  const onSubmitReview = async (values: any) => {
    if (!selectedLeave) return;
    setActionLoading(true);
    try {
      await api.put(`/leaves/${selectedLeave._id}/approve`, {
        status: values.status,
        comments: values.comments,
      });
      setReviewModalOpen(false);
      fetchLeaves();
    } catch (err: any) {
      alert(err.message || 'Leave review failed');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    if (status === 'Approved') return 'bg-green-500/10 text-green-400 border-green-500/20';
    if (status === 'Rejected') return 'bg-red-500/10 text-red-400 border-red-500/20';
    return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
  };

  const isReviewer = user?.role !== 'EMPLOYEE';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-white">Leave Planner</h1>
          <p className="text-slate-400 text-xs mt-1">Manage employee vacations, annual leaves, and medical absences.</p>
        </div>
        <button
          onClick={handleOpenRequest}
          className="bg-gold hover:bg-gold-light text-slate-dark font-bold px-4 py-2.5 rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Plus size={16} />
          Request Leave
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[30vh]">
          <div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-card-dark border border-slate-800/80 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950/40 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                  <th className="p-4">Employee</th>
                  <th className="p-4">Leave Type</th>
                  <th className="p-4">Duration</th>
                  <th className="p-4">Reason</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Comments</th>
                  {isReviewer && <th className="p-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {leaves.map((leave) => (
                  <tr key={leave._id} className="hover:bg-slate-900/20 transition-colors">
                    <td className="p-4 font-semibold text-white">
                      {leave.employee?.firstName} {leave.employee?.lastName}
                      <div className="text-[10px] text-slate-500 font-normal mt-0.5">{leave.employee?.department || 'Operations'}</div>
                    </td>
                    <td className="p-4 font-medium text-slate-200">{leave.leaveType}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5 font-mono text-[11px]">
                        <Calendar size={12} className="text-gold" />
                        <span>{new Date(leave.startDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                        <span className="text-slate-500">to</span>
                        <span>{new Date(leave.endDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                      </div>
                    </td>
                    <td className="p-4 max-w-xs truncate" title={leave.reason}>{leave.reason}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold border uppercase ${getStatusColor(leave.status)}`}>
                        {leave.status}
                      </span>
                    </td>
                    <td className="p-4 text-slate-400 italic max-w-xs truncate">
                      {leave.comments ? (
                        <span className="flex items-center gap-1">
                          <MessageSquare size={12} className="text-slate-500" />
                          {leave.comments}
                        </span>
                      ) : (
                        <span className="text-slate-600">No response details</span>
                      )}
                    </td>
                    {isReviewer && (
                      <td className="p-4 text-right">
                        {leave.status === 'Pending' ? (
                          <button
                            onClick={() => handleOpenReview(leave)}
                            className="bg-gold text-slate-dark text-[10px] font-bold px-2.5 py-1.5 rounded hover:bg-gold-light transition-colors cursor-pointer"
                          >
                            Review
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-500 font-semibold uppercase">Reviewed</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}

                {leaves.length === 0 && (
                  <tr>
                    <td colSpan={isReviewer ? 7 : 6} className="text-center p-8 text-slate-500">
                      No leave requests logged in logs.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Request Modal */}
      {requestModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card-dark border border-gold/20 rounded-xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-white text-sm">Submit Leave Request</h3>
              <button onClick={() => setRequestModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmitRequest)} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider">Leave Category</label>
                <select
                  className="w-full bg-slate-950/60 border border-slate-800 rounded p-2 text-white"
                  {...register('leaveType')}
                >
                  <option value="Annual">Annual Leave</option>
                  <option value="Sick">Sick Leave</option>
                  <option value="Casual">Casual Leave</option>
                  <option value="Unpaid">Unpaid Leave</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider">Start Date</label>
                  <input
                    type="date"
                    required
                    className="w-full bg-slate-950/60 border border-slate-800 rounded p-2 text-white"
                    {...register('startDate')}
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider">End Date</label>
                  <input
                    type="date"
                    required
                    className="w-full bg-slate-950/60 border border-slate-800 rounded p-2 text-white"
                    {...register('endDate')}
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider">Reason for absence</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Provide shift coverage details or justification..."
                  className="w-full bg-slate-950/60 border border-slate-800 rounded p-2 text-white resize-none"
                  {...register('reason')}
                />
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full bg-gold hover:bg-gold-light text-slate-dark font-bold py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Calendar size={14} />}
                Submit Request
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {reviewModalOpen && selectedLeave && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card-dark border border-gold/20 rounded-xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-white text-sm">Review Time-off Request</h3>
              <button onClick={() => setReviewModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="text-xs border-b border-slate-800/60 pb-3">
              <p className="text-slate-400">Request from <span className="font-bold text-slate-200">{selectedLeave.employee?.firstName} {selectedLeave.employee?.lastName}</span></p>
              <p className="text-slate-500 mt-1">Reason: "{selectedLeave.reason}"</p>
            </div>

            <form onSubmit={handleSubmitReview(onSubmitReview)} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider">Approval Status</label>
                <select
                  className="w-full bg-slate-950/60 border border-slate-800 rounded p-2 text-white"
                  {...registerReview('status')}
                >
                  <option value="Approved">Approve Leave</option>
                  <option value="Rejected">Reject Leave</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider">Review Comments</label>
                <textarea
                  rows={2}
                  placeholder="Provide comments (e.g. Coverage arranged)..."
                  className="w-full bg-slate-950/60 border border-slate-800 rounded p-2 text-white resize-none"
                  {...registerReview('comments')}
                />
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full bg-gold hover:bg-gold-light text-slate-dark font-bold py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Confirm Decision
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
