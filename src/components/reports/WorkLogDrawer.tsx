'use client';

import React, { useState } from 'react';
import GoogleIcon from '../GoogleIcon';

interface WorkLogDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  log: any; // Checked-in/out attendance log item
}

export default function WorkLogDrawer({ isOpen, onClose, log }: WorkLogDrawerProps) {
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [showImageModal, setShowImageModal] = useState<string | null>(null);

  if (!isOpen || !log) return null;

  const empName = log.employee ? `${log.employee.firstName} ${log.employee.lastName}` : 'N/A';
  const empId = log.employee?.employeeId || 'N/A';
  const dept = log.employee?.department || 'Operations';
  const designation = log.employee?.designation || 'Staff';
  const hotelName = log.hotel?.name || 'OXY Property';
  const hotelCode = log.hotel?.hotelCode || 'N/A';

  // Dynamic AI-simulated Performance Summary
  const getAiSummary = (desc: string): string => {
    if (!desc) return 'No description logged to evaluate.';
    const words = desc.toLowerCase();
    const actions: string[] = [];

    if (words.includes('guest') || words.includes('customer') || words.includes('satisfy') || words.includes('handle')) {
      actions.push('guest handling');
    }
    if (words.includes('reservation') || words.includes('book') || words.includes('checkin') || words.includes('check-in')) {
      actions.push('reservation updates and check-in processing');
    }
    if (words.includes('clean') || words.includes('room') || words.includes('wash') || words.includes('housekeep')) {
      actions.push('room sanitization and housekeeping logs');
    }
    if (words.includes('fix') || words.includes('repair') || words.includes('ac') || words.includes('maintenance')) {
      actions.push('issue resolution and technical maintenance');
    }
    if (words.includes('cook') || words.includes('food') || words.includes('kitchen') || words.includes('hygiene')) {
      actions.push('kitchen hygiene and culinary operations support');
    }
    if (words.includes('manage') || words.includes('schedule') || words.includes('shift') || words.includes('report')) {
      actions.push('shift reporting and administrative task logs');
    }

    if (actions.length === 0) {
      return `Employee successfully completed the assigned operations tasks, logged detailed checkout updates, and supported hotel front-line performance guidelines.`;
    }

    const leadStr = actions.slice(0, -1).join(', ');
    const endStr = actions[actions.length - 1];
    return `Employee completed ${leadStr ? `${leadStr}, and ` : ''}${endStr} to resolve complaints and support hotel operations.`;
  };

  const aiSummary = getAiSummary(log.workDescription || '');

  // Detect document attachments (PDF, DOC, XLS mockup)
  // Let's assume files ending in .pdf, .docx, .xlsx are docs
  const getFileType = (url?: string): 'image' | 'video' | 'doc' | 'none' => {
    if (!url) return 'none';
    const lower = url.toLowerCase();
    if (lower.match(/\.(jpeg|jpg|gif|png|webp|svg)/) || lower.startsWith('data:image')) return 'image';
    if (lower.match(/\.(mp4|webm|ogg|mov)/) || lower.startsWith('data:video')) return 'video';
    if (lower.match(/\.(pdf|doc|docx|xls|xlsx|txt|ppt|pptx)/)) return 'doc';
    return 'none';
  };

  const checkInPhotoType = getFileType(log.checkInPhoto || log.selfieUrl);
  const checkOutPhotoType = getFileType(log.checkOutPhoto);
  const workPictureType = getFileType(log.workPictureUrl);
  const workVideoType = getFileType(log.workVideoUrl);

  return (
    <div className="fixed inset-0 z-50 flex justify-end overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Drawer content */}
      <div className="relative w-full max-w-lg bg-slate-900 border-l border-slate-800 text-slate-100 flex flex-col h-full shadow-2xl transition-transform duration-300 animate-slide-in">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/40">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Work Description & Evidence</h2>
            <p className="text-[10px] font-mono text-gold mt-0.5">Shift Log: {log.date}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition-colors cursor-pointer"
          >
            <GoogleIcon name="close" size={18} />
          </button>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-thin">
          
          {/* Employee profile metadata summary card */}
          <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-xl flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-gold/30 text-gold font-bold overflow-hidden flex-shrink-0">
              {log.employee?.photoUrl ? (
                <img src={log.employee.photoUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs uppercase">{log.employee?.firstName[0]}{log.employee?.lastName[0]}</span>
              )}
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-200">{empName}</h4>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5">{designation} | {dept} Dept</p>
              <p className="text-[9.5px] text-slate-400 mt-1 uppercase font-semibold">
                Hotel: <span className="text-gold">{hotelName} ({hotelCode})</span>
              </p>
            </div>
          </div>

          {/* Checkout description logs */}
          <div className="space-y-2">
            <h3 className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Checked-Out Duty Notes</h3>
            {log.workDescription ? (
              <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/30 p-3 rounded-lg border border-slate-850/60 font-sans">
                {log.workDescription}
              </p>
            ) : (
              <p className="text-xs text-slate-500 italic bg-slate-950/30 p-3 rounded-lg border border-dashed border-slate-850">
                No shift work description check-out details were submitted.
              </p>
            )}
          </div>

          {/* AI Performance summary */}
          <div className="bg-gold/5 border border-gold/10 rounded-xl p-4 space-y-2.5">
            <div className="flex items-center gap-1.5 text-[10.5px] font-bold text-gold uppercase tracking-wider">
              <GoogleIcon name="auto_awesome" size={14} className="animate-pulse" />
              AI Operations Performance Summary
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-sans italic">
              "{aiSummary}"
            </p>
          </div>

          {/* Timestamps & Log audit */}
          <div className="space-y-3">
            <h3 className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Timestamps History</h3>
            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-950/60 p-3 rounded-xl border border-slate-850 font-mono text-slate-400">
              <div>
                <span className="text-[9px] text-slate-500 block uppercase font-sans font-bold">Checked In</span>
                <span className="text-slate-200 mt-1 block">
                  {log.checkIn ? new Date(log.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-'}
                </span>
              </div>
              <div>
                <span className="text-[9px] text-slate-500 block uppercase font-sans font-bold">Checked Out</span>
                <span className="text-slate-200 mt-1 block">
                  {log.checkOut ? new Date(log.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Active'}
                </span>
              </div>
              <div className="col-span-2 pt-2 border-t border-slate-850 grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[9px] text-slate-500 block uppercase font-sans font-bold">Total Work Duty</span>
                  <span className="text-gold font-bold mt-1 block">{log.totalWorkingHours || 0} hrs</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 block uppercase font-sans font-bold">Total Break</span>
                  <span className="text-slate-200 mt-1 block">{log.totalBreakMinutes || 0} mins</span>
                </div>
              </div>
            </div>
          </div>

          {/* Verification Details */}
          <div className="space-y-3">
            <h3 className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Verification Proofs</h3>
            <div className="space-y-2.5">
              
              {/* Selfie Verifications */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-[9px] text-slate-500 uppercase tracking-wider font-bold block">Check-In Photo</span>
                  {log.checkInPhoto || log.selfieUrl ? (
                    <div className="aspect-video w-full rounded-lg bg-slate-950 border border-slate-800 overflow-hidden relative group">
                      <img 
                        src={log.checkInPhoto || log.selfieUrl} 
                        alt="CheckIn" 
                        className="w-full h-full object-cover" 
                      />
                      <button 
                        onClick={() => setShowImageModal(log.checkInPhoto || log.selfieUrl)}
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-[10px] font-bold text-gold uppercase cursor-pointer"
                      >
                        <GoogleIcon name="zoom_in" size={16} /> Expand
                      </button>
                    </div>
                  ) : (
                    <div className="aspect-video w-full rounded-lg border border-dashed border-slate-800 flex items-center justify-center text-[10.5px] text-slate-600 bg-slate-950/20 italic">
                      Exempt / Not Provided
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <span className="text-[9px] text-slate-500 uppercase tracking-wider font-bold block">Check-Out Photo</span>
                  {log.checkOutPhoto ? (
                    <div className="aspect-video w-full rounded-lg bg-slate-950 border border-slate-800 overflow-hidden relative group">
                      <img 
                        src={log.checkOutPhoto} 
                        alt="CheckOut" 
                        className="w-full h-full object-cover" 
                      />
                      <button 
                        onClick={() => setShowImageModal(log.checkOutPhoto)}
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-[10px] font-bold text-gold uppercase cursor-pointer"
                      >
                        <GoogleIcon name="zoom_in" size={16} /> Expand
                      </button>
                    </div>
                  ) : (
                    <div className="aspect-video w-full rounded-lg border border-dashed border-slate-800 flex items-center justify-center text-[10.5px] text-slate-600 bg-slate-950/20 italic">
                      Exempt / Not Provided
                    </div>
                  )}
                </div>
              </div>

              {/* Work Log Evidence Attachments */}
              {(log.workPictureUrl || log.workVideoUrl) && (
                <div className="space-y-2 pt-2 border-t border-slate-800/40">
                  <span className="text-[9px] text-slate-500 uppercase tracking-wider font-bold block">Upload Evidences</span>
                  <div className="space-y-3">
                    
                    {/* Check-Out Image Evidence */}
                    {log.workPictureUrl && (
                      <div className="space-y-1">
                        <span className="text-[9px] text-slate-500 font-mono block">Image Attachment</span>
                        <div className="w-full max-h-48 rounded-lg bg-slate-950 border border-slate-800 overflow-hidden relative group flex items-center justify-center">
                          <img 
                            src={log.workPictureUrl} 
                            alt="Work Evidence" 
                            className="max-h-48 object-contain" 
                          />
                          <button 
                            onClick={() => setShowImageModal(log.workPictureUrl)}
                            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-[10px] font-bold text-gold uppercase cursor-pointer"
                          >
                            <GoogleIcon name="zoom_in" size={16} /> Zoom Image
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Check-Out Video Evidence */}
                    {log.workVideoUrl && (
                      <div className="space-y-1">
                        <span className="text-[9px] text-slate-500 font-mono block">Video Attachment</span>
                        <div className="w-full aspect-video rounded-lg bg-slate-950 border border-slate-800 overflow-hidden relative">
                          <video 
                            src={log.workVideoUrl} 
                            controls 
                            className="w-full h-full object-contain"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Location details */}
          <div className="space-y-3 border-t border-slate-800/40 pt-4">
            <h3 className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Device & Connectivity Info</h3>
            <div className="space-y-2 text-xs bg-slate-950/40 p-3.5 rounded-xl border border-slate-850 text-slate-400">
              <div className="flex justify-between">
                <span>IP Address:</span>
                <span className="font-mono text-slate-200">{log.ipAddress || '127.0.0.1'}</span>
              </div>
              <div className="flex justify-between">
                <span>Device/Platform:</span>
                <span className="truncate max-w-[280px] text-slate-200" title={log.deviceInfo}>{log.deviceInfo || 'Standard PC (Chrome)'}</span>
              </div>
              {log.checkInLatitude !== undefined && (
                <div className="flex justify-between pt-2 border-t border-slate-850/60">
                  <span>Coordinates:</span>
                  <a 
                    href={`https://www.google.com/maps?q=${log.checkInLatitude},${log.checkInLongitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-green-400 hover:text-green-300 font-mono flex items-center gap-1 hover:underline"
                  >
                    <GoogleIcon name="map" size={12} />
                    {log.checkInLatitude.toFixed(6)}°, {log.checkInLongitude?.toFixed(6)}°
                  </a>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* High-fidelity zoom lightbox */}
      {showImageModal && (
        <div className="fixed inset-0 z-55 bg-black/95 flex flex-col justify-center items-center p-4">
          <div className="absolute top-4 right-4 flex gap-2.5 z-10">
            <button 
              onClick={() => setZoomLevel(prev => Math.min(3, prev + 0.25))}
              className="p-2 bg-slate-900 border border-slate-800 text-slate-300 hover:text-gold hover:border-gold/30 rounded-lg cursor-pointer transition-colors"
              title="Zoom In"
            >
              <GoogleIcon name="zoom_in" size={20} />
            </button>
            <button 
              onClick={() => setZoomLevel(prev => Math.max(0.5, prev - 0.25))}
              className="p-2 bg-slate-900 border border-slate-800 text-slate-300 hover:text-gold hover:border-gold/30 rounded-lg cursor-pointer transition-colors"
              title="Zoom Out"
            >
              <GoogleIcon name="zoom_out" size={20} />
            </button>
            <button 
              onClick={() => {
                setZoomLevel(1);
                setShowImageModal(null);
              }}
              className="p-2 bg-red-950 border border-red-900/60 text-red-300 hover:bg-red-900 hover:text-white rounded-lg cursor-pointer transition-colors"
              title="Close"
            >
              <GoogleIcon name="close" size={20} />
            </button>
          </div>

          <div className="w-full h-full flex items-center justify-center overflow-auto p-8 select-none">
            <img 
              src={showImageModal} 
              alt="Zoomed" 
              className="max-w-full max-h-full object-contain transition-transform duration-200"
              style={{ transform: `scale(${zoomLevel})` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
