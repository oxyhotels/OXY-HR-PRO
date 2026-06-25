'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import GoogleIcon from './GoogleIcon';
import { api } from '../lib/api';

export default function GlobalNotificationManager() {
  const [queue, setQueue] = useState<any[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const router = useRouter();

  // Initialize audio and listen for events
  useEffect(() => {
    const handleNewNotification = (e: Event) => {
      const customEvent = e as CustomEvent;
      const notification = customEvent.detail;
      
      // Add to queue (Newest first: place at index 0)
      setQueue((prev) => [notification, ...prev]);
    };

    window.addEventListener('new_notification', handleNewNotification);
    
    // Initialize audio object once
    if (!audioRef.current) {
      audioRef.current = new Audio('/alerm sound.mp3');
      audioRef.current.loop = true;
    }

    return () => {
      window.removeEventListener('new_notification', handleNewNotification);
    };
  }, []);

  // Manage audio play/pause based on queue length
  useEffect(() => {
    if (queue.length > 0) {
      if (audioRef.current && audioRef.current.paused) {
        // Play and handle auto-play restrictions
        audioRef.current.play().catch((err) => {
          console.warn('Audio auto-play blocked by browser. User must interact first.', err);
        });
      }
    } else {
      if (audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    }
  }, [queue]);

  const dismissCurrent = async () => {
    const current = queue[0];
    if (!current) return;

    // Remove from queue
    setQueue((prev) => prev.slice(1));

    // Mark as read in backend
    try {
      await api.patch(`/notifications/${current._id}`, {});
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleAction = async (action: 'approve' | 'reject' | 'open', link?: string) => {
    const current = queue[0];
    if (!current) return;

    if (action === 'open' && link) {
      router.push(link);
    } else if (action === 'approve' || action === 'reject') {
      if (current.type === 'approval' && current.sender) {
        const senderId = typeof current.sender === 'string' ? current.sender : (current.sender._id || current.sender.id);
        try {
          // Add auth token if needed, but api wrapper should handle it
          await api.post(`/employees/pending/${senderId}/${action}`, {});
          // Fallback UI alert
          alert(`User successfully ${action}ed!`);
        } catch (err: any) {
          console.error(`Failed to ${action} user:`, err);
          alert(`Failed to ${action} user: ` + (err.response?.data?.message || err.message));
          return; // don't dismiss if action failed
        }
      }
    }
    
    await dismissCurrent();
  };

  if (queue.length === 0) return null;

  const current = queue[0];
  const totalUnread = queue.length;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#0a1631] border border-gold/50 shadow-[0_0_40px_rgba(255,215,0,0.2)] rounded-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
          <h2 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-wider">
            <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
            <GoogleIcon name="notifications_active" className="text-gold" size={20} />
            Critical Alert
          </h2>
          {totalUnread > 1 && (
            <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md">
              {totalUnread} Unread
            </span>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="flex flex-col items-center text-center space-y-4">
            
            {/* Sender Image (if available) */}
            {current.sender?.photoUrl ? (
              <img src={current.sender.photoUrl} alt="Sender" className="w-16 h-16 rounded-full border-2 border-gold/50 shadow-lg object-cover" />
            ) : (
              <div className="w-16 h-16 rounded-full border-2 border-gold/50 bg-slate-800 flex items-center justify-center shadow-lg">
                <GoogleIcon name="campaign" size={32} className="text-gold" />
              </div>
            )}

            <div>
              <h3 className="text-lg font-black text-white">{current.title}</h3>
              {current.sender && (
                <p className="text-[11px] text-slate-400 font-semibold mt-1 uppercase tracking-wider">
                  From: <span className="text-slate-200">{current.sender.firstName} {current.sender.lastName}</span>
                </p>
              )}
            </div>

            <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4 w-full">
              <p className="text-slate-300 text-sm font-medium">{current.message}</p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-900/80 border-t border-slate-800 flex gap-3">
          {current.actionRequired ? (
            <>
              <button 
                onClick={() => handleAction('reject')}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-red-400 border border-slate-700 font-bold py-2.5 rounded-xl transition-colors cursor-pointer text-xs uppercase"
              >
                Reject
              </button>
              <button 
                onClick={() => handleAction('approve')}
                className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-2.5 rounded-xl transition-colors cursor-pointer text-xs uppercase shadow-lg shadow-green-900/20"
              >
                Approve
              </button>
            </>
          ) : current.link ? (
            <>
              <button 
                onClick={dismissCurrent}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-2.5 rounded-xl transition-colors cursor-pointer text-xs uppercase"
              >
                Dismiss
              </button>
              <button 
                onClick={() => handleAction('open', current.link)}
                className="flex-[2] bg-[#0a1f5c] hover:bg-[#112d8a] text-gold border border-[#112d8a] font-bold py-2.5 rounded-xl transition-colors cursor-pointer text-xs uppercase shadow-lg shadow-blue-900/20"
              >
                Open Details
              </button>
            </>
          ) : (
            <button 
              onClick={dismissCurrent}
              className="w-full bg-[#0a1f5c] hover:bg-[#112d8a] text-white font-bold py-3 rounded-xl transition-colors cursor-pointer text-xs uppercase shadow-lg shadow-blue-900/20"
            >
              Acknowledge & Dismiss
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
