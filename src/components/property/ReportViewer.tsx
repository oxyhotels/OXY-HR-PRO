'use client';
import React, { useState } from 'react';
import GoogleIcon from '../GoogleIcon';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

interface ReportViewerProps {
  category: string;
  reports: any[];
  userRole: string;
  onRefresh: () => void;
  onClose: () => void;
}

export default function ReportViewer({ category, reports, userRole, onRefresh, onClose }: ReportViewerProps) {
  const { user } = useAuthStore();
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  // Delete Request Modal state
  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const handleRequestDelete = async () => {
    if (!requestingId || !deleteReason) return;
    setProcessingId(requestingId);
    try {
      await api.patch(`/property-reports/${requestingId}/request-delete`, { reason: deleteReason });
      setRequestingId(null);
      setDeleteReason('');
      onRefresh();
    } catch (err) {
      console.error(err);
      alert('Failed to request delete');
    } finally {
      setProcessingId(null);
    }
  };

  const handleApproveDelete = async (id: string) => {
    if (!confirm('Are you sure you want to approve this deletion? It will be removed from view.')) return;
    setProcessingId(id);
    try {
      await api.patch(`/property-reports/${id}/approve-delete`, {});
      onRefresh();
    } catch (err) {
      console.error(err);
      alert('Failed to approve delete');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectDelete = async (id: string) => {
    const reason = prompt("Enter rejection reason:");
    if (!reason) return;
    setProcessingId(id);
    try {
      await api.patch(`/property-reports/${id}/reject-delete`, { reason });
      onRefresh();
    } catch (err) {
      console.error(err);
      alert('Failed to reject delete');
    } finally {
      setProcessingId(null);
    }
  };

  const handlePermanentDelete = async (id: string) => {
    if (!confirm('PERMANENT DELETE: This will destroy the record and its logs. Proceed?')) return;
    setProcessingId(id);
    try {
      await api.delete(`/property-reports/${id}`);
      onRefresh();
    } catch (err) {
      console.error(err);
      alert('Failed to delete report');
    } finally {
      setProcessingId(null);
    }
  };

  const formatCategoryName = (cat: string) => {
    return cat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatDate = (d: string) => {
    if (!d) return 'N/A';
    return new Date(d).toLocaleString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  };

  const formatDateTime = (d: string) => {
    if (!d) return 'N/A';
    return new Date(d).toLocaleString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true
    });
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0b1424] border border-slate-700 rounded-xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
              <GoogleIcon name="folder_open" size={24} />
            </div>
            <div>
              <h3 className="font-bold text-white text-lg">{formatCategoryName(category)}</h3>
              <p className="text-xs text-slate-400">{reports.length} Uploads found</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors">
            <GoogleIcon name="close" size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#060c18]">
          {reports.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4">
              <GoogleIcon name="find_in_page" size={64} className="opacity-50" />
              <p className="font-semibold text-lg">No reports found</p>
              <p className="text-sm">There are no uploads in this folder yet.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {reports.map((report) => (
                <div key={report._id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-slate-700 transition-colors">
                  
                  {/* Report Meta Info */}
                  <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400">
                          {report.hotelName}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                          {report.department}
                        </span>
                        {report.deleteStatus === 'PENDING_DELETE' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500/20 text-orange-400 flex items-center gap-1">
                            <GoogleIcon name="warning" size={10} /> Delete Requested
                          </span>
                        )}
                        {report.deleteStatus === 'DELETED' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 flex items-center gap-1">
                            <GoogleIcon name="delete" size={10} /> Deleted
                          </span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-x-8 gap-y-1 mt-3">
                        <p className="text-xs text-slate-400">Report Date: <span className="font-bold text-white text-sm ml-1">{formatDate(report.reportDate)}</span></p>
                        <p className="text-xs text-slate-400">Uploaded By: <span className="font-bold text-white text-sm ml-1">{report.employeeName}</span></p>
                        <p className="text-xs text-slate-400">Uploaded At: <span className="font-bold text-slate-300 ml-1">{formatDateTime(report.uploadedAt || report.createdAt)}</span></p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex gap-2">
                        {(userRole === 'ROOT_ADMIN' || userRole === 'HOTEL_ADMIN' || userRole === 'HR_MANAGER' || userRole === 'DEPT_MANAGER') && (
                          <div className={`px-3 py-1 rounded-full text-xs font-bold border ${
                            report.status === 'Verified' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                          }`}>
                            {report.status}
                          </div>
                        )}
                        
                        {/* Request Delete Button */}
                        {report.deleteStatus === 'ACTIVE' && (
                          <button 
                            onClick={() => setRequestingId(report._id)}
                            className="px-3 py-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center transition-colors text-xs font-bold gap-1"
                            title="Request Deletion"
                          >
                            <GoogleIcon name="delete_sweep" size={14} /> Request Delete
                          </button>
                        )}

                        {/* Admin Approvals */}
                        {report.deleteStatus === 'PENDING_DELETE' && (userRole === 'ROOT_ADMIN' || user?.department === 'Central Team') && (
                          <>
                            <button 
                              onClick={() => handleApproveDelete(report._id)}
                              disabled={processingId === report._id}
                              className="px-3 py-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center transition-colors text-xs font-bold gap-1 disabled:opacity-50"
                            >
                              {processingId === report._id ? '...' : 'Approve'}
                            </button>
                            <button 
                              onClick={() => handleRejectDelete(report._id)}
                              disabled={processingId === report._id}
                              className="px-3 py-1 rounded bg-slate-700 text-slate-200 hover:bg-slate-600 flex items-center justify-center transition-colors text-xs font-bold gap-1 disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        
                        {/* Permanent Delete */}
                        {(userRole === 'ROOT_ADMIN') && (
                          <button 
                            onClick={() => handlePermanentDelete(report._id)}
                            disabled={processingId === report._id}
                            className="w-8 h-8 rounded bg-red-900/40 text-red-500 hover:bg-red-600 hover:text-white flex items-center justify-center transition-colors disabled:opacity-50"
                            title="Permanent Hard Delete"
                          >
                            <GoogleIcon name="delete_forever" size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {report.remarks && (
                    <div className="px-4 py-3 bg-slate-900/30 border-b border-slate-800 text-sm text-slate-300">
                      <span className="font-semibold text-slate-400 mr-2">Remarks:</span>
                      {report.remarks}
                    </div>
                  )}

                  {/* Delete Request Reason */}
                  {report.deleteRequest?.reason && report.deleteStatus === 'PENDING_DELETE' && (
                    <div className="px-4 py-3 bg-orange-500/10 border-b border-orange-500/20 text-sm text-orange-200 flex items-start gap-2">
                      <GoogleIcon name="info" size={18} className="text-orange-400 mt-0.5" />
                      <div>
                        <span className="font-bold">Delete Reason: </span>
                        {report.deleteRequest.reason}
                      </div>
                    </div>
                  )}

                  {/* Audit Logs */}
                  {report.auditLogs && report.auditLogs.length > 0 && (userRole === 'ROOT_ADMIN' || user?.department === 'Central Team') && (
                    <div className="px-4 py-2 bg-slate-950/40 border-b border-slate-800 text-[10px] text-slate-400">
                      <div className="font-bold mb-1 text-slate-500 flex items-center gap-1"><GoogleIcon name="history" size={12} /> Audit Logs</div>
                      <div className="space-y-1">
                        {report.auditLogs.map((log: any, idx: number) => (
                          <div key={idx} className="flex gap-2">
                            <span className="text-slate-500">[{formatDateTime(log.at)}]</span>
                            <span className="font-semibold text-blue-400/80">{log.action}</span>
                            <span>by {log.byName}</span>
                            {log.reason && <span>- Reason: "{log.reason}"</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Files Grid */}
                  <div className="p-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {report.files.map((file: any, idx: number) => (
                      <div key={idx} className="flex flex-col gap-2">
                        <div className="group relative aspect-square rounded-lg border border-slate-700 overflow-hidden bg-slate-950 flex flex-col items-center justify-center">
                          {file.fileUrl.startsWith('data:image/') || file.fileUrl.toLowerCase().match(/\.(jpg|jpeg|png|webp|gif|avif|heic|heif)(\?.*)?$/) ? (
                            <img src={file.fileUrl} alt={file.fileName} className="w-full h-full object-cover" />
                          ) : (
                            <div className="flex flex-col items-center p-3 text-center">
                              <GoogleIcon name="description" size={32} className="text-slate-400 mb-2" />
                              <span className="text-[10px] text-slate-500 break-all line-clamp-2">{file.fileName}</span>
                            </div>
                          )}
                          
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            {file.fileUrl.startsWith('data:image/') || file.fileUrl.toLowerCase().match(/\.(jpg|jpeg|png|webp|gif|avif|heic|heif)(\?.*)?$/) ? (
                              <button 
                                onClick={() => setLightboxImage(file.fileUrl)} 
                                className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center hover:bg-blue-400 transition-colors"
                                title="View Image"
                              >
                                <GoogleIcon name="visibility" size={16} />
                              </button>
                            ) : (
                              <a 
                                href={file.fileUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center hover:bg-blue-400 transition-colors"
                                title="View / Download"
                              >
                                <GoogleIcon name="visibility" size={16} />
                              </a>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-center text-center">
                          <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full mb-0.5 max-w-full truncate">{report.hotelName}</span>
                          <span className="text-[9px] text-slate-400">{formatDateTime(file.uploadedAt || report.createdAt)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Delete Request Modal */}
      {requestingId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-sm w-full p-5">
            <h3 className="font-bold text-white text-lg flex items-center gap-2 mb-3">
              <GoogleIcon name="warning" className="text-orange-400" size={24} />
              Request Deletion
            </h3>
            <p className="text-sm text-slate-400 mb-4">
              Please provide a reason for deleting this report. It will be sent to the Central Team for approval.
            </p>
            <textarea
              className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-sm text-white focus:outline-none focus:border-gold mb-4"
              rows={3}
              placeholder="e.g. Wrong report uploaded, Duplicate, Incorrect Date..."
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
            />
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => { setRequestingId(null); setDeleteReason(''); }}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button 
                onClick={handleRequestDelete}
                disabled={!deleteReason || processingId === requestingId}
                className="px-4 py-2 bg-gold hover:bg-gold-light text-slate-900 font-bold text-sm rounded disabled:opacity-50 flex items-center gap-2"
              >
                {processingId === requestingId ? 'Sending...' : 'Send Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 bg-black/90 backdrop-blur-md z-[60] flex items-center justify-center p-4" 
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-4xl max-h-[85vh] w-auto h-auto flex flex-col items-center">
            <button className="absolute top-[-35px] right-0 text-white font-bold text-xs bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded cursor-pointer transition-colors">✕ Close</button>
            <img src={lightboxImage} alt="Preview" className="max-w-full max-h-[80vh] rounded shadow-2xl object-contain border border-gold/20" />
          </div>
        </div>
      )}

    </div>
  );
}
