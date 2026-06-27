'use client';
import React, { useState } from 'react';
import GoogleIcon from '../GoogleIcon';
import { api } from '@/lib/api';

interface ReportViewerProps {
  category: string;
  reports: any[];
  userRole: string;
  onRefresh: () => void;
  onClose: () => void;
}

export default function ReportViewer({ category, reports, userRole, onRefresh, onClose }: ReportViewerProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this report?')) return;
    setDeletingId(id);
    try {
      await api.delete(`/property-reports/${id}`);
      onRefresh();
    } catch (err) {
      console.error(err);
      alert('Failed to delete report');
    } finally {
      setDeletingId(null);
    }
  };

  const formatCategoryName = (cat: string) => {
    return cat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatDate = (d: string) => {
    return new Date(d).toLocaleString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true
    });
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0b1424] border border-slate-700 rounded-xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden">
        
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
                  <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400">
                          {report.hotelName}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                          {report.department}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-white">{report.employeeName}</p>
                      <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <GoogleIcon name="schedule" size={12} />
                        Uploaded: {formatDate(report.createdAt)}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {(userRole === 'ROOT_ADMIN' || userRole === 'HOTEL_ADMIN' || userRole === 'HR_MANAGER' || userRole === 'DEPT_MANAGER') && (
                        <div className={`px-3 py-1 rounded-full text-xs font-bold border ${
                          report.status === 'Verified' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                        }`}>
                          {report.status}
                        </div>
                      )}
                      
                      {(userRole === 'ROOT_ADMIN') && (
                        <button 
                          onClick={() => handleDelete(report._id)}
                          disabled={deletingId === report._id}
                          className="w-8 h-8 rounded bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center transition-colors disabled:opacity-50"
                          title="Delete Report"
                        >
                          {deletingId === report._id ? <GoogleIcon name="sync" size={16} className="animate-spin" /> : <GoogleIcon name="delete" size={16} />}
                        </button>
                      )}
                    </div>
                  </div>

                  {report.remarks && (
                    <div className="px-4 py-3 bg-slate-900/30 border-b border-slate-800 text-sm text-slate-300">
                      <span className="font-semibold text-slate-400 mr-2">Remarks:</span>
                      {report.remarks}
                    </div>
                  )}

                  {/* Files Grid */}
                  <div className="p-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {report.files.map((file: any, idx: number) => (
                      <div key={idx} className="flex flex-col gap-2">
                        <div className="group relative aspect-square rounded-lg border border-slate-700 overflow-hidden bg-slate-950 flex flex-col items-center justify-center">
                          {file.fileUrl.startsWith('data:image/') || file.fileUrl.includes('.jpg') || file.fileUrl.includes('.png') ? (
                            <img src={file.fileUrl} alt={file.fileName} className="w-full h-full object-cover" />
                          ) : (
                            <div className="flex flex-col items-center p-3 text-center">
                              <GoogleIcon name="description" size={32} className="text-slate-400 mb-2" />
                              <span className="text-[10px] text-slate-500 break-all line-clamp-2">{file.fileName}</span>
                            </div>
                          )}
                          
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <a 
                              href={file.fileUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center hover:bg-blue-400 transition-colors"
                              title="View / Download"
                            >
                              <GoogleIcon name="visibility" size={16} />
                            </a>
                          </div>
                        </div>
                        <div className="flex flex-col items-center text-center">
                          <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full mb-0.5 max-w-full truncate">{report.hotelName}</span>
                          <span className="text-[9px] text-slate-400">{formatDate(file.uploadedAt || report.createdAt)}</span>
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
    </div>
  );
}
