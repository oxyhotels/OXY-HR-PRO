'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import GoogleIcon from './GoogleIcon';
import { api } from '../lib/api';

import { AnimatePresence, motion } from 'framer-motion';

const timeAgo = (date: string | Date) => {
  const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " minutes ago";
  return "Just now";
};

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

  const handleAction = async (action: 'open' | 'approve' | 'reject', link?: string) => {
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
        } catch (err: any) {
          console.error(`Failed to ${action}:`, err);
          return; // don't dismiss if action failed
        }
      }
    }
    
    await dismissCurrent();
  };

  if (queue.length === 0) return null;

  const current = queue[0];
  const totalUnread = queue.length;
  const modTag = current.moduleTag || current.type || 'Default';
  const formattedModTag = modTag.charAt(0).toUpperCase() + modTag.slice(1);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: -20 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="bg-gradient-to-b from-[#0a1631] to-[#06143c] border border-gold shadow-[0_0_50px_rgba(255,215,0,0.3)] rounded-2xl w-full max-w-lg overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-[#112d8a] flex items-center justify-between bg-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center border border-gold/50 animate-pulse">
                <GoogleIcon name={formattedModTag === 'Community' ? 'chat' : 'notifications_active'} size={24} className="text-gold" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white tracking-wide">New Notification</h3>
                {totalUnread > 1 && (
                  <p className="text-xs font-semibold text-gold">{totalUnread - 1} more in queue</p>
                )}
              </div>
            </div>
            <button 
              onClick={dismissCurrent}
              className="w-8 h-8 rounded-full bg-white/5 text-slate-400 flex items-center justify-center hover:bg-white/10 hover:text-white transition-colors"
            >
              <GoogleIcon name="close" size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 flex flex-col gap-4">
            <div className="flex items-start gap-4">
              {current.sender?.photoUrl ? (
                <img src={current.sender.photoUrl} alt="Sender" className="w-14 h-14 rounded-full object-cover border-2 border-[#112d8a]" />
              ) : (
                <div className="w-14 h-14 rounded-full bg-[#112d8a] flex items-center justify-center border-2 border-white/10 text-white font-bold text-2xl">
                  {current.sender?.firstName ? current.sender.firstName[0] : <GoogleIcon name="person" size={28} />}
                </div>
              )}
              
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded bg-[#112d8a] text-slate-300 text-[10px] font-semibold tracking-wider uppercase">
                    {formattedModTag}
                  </span>
                  <span className="text-xs text-slate-400">{timeAgo(current.createdAt)}</span>
                </div>
                <h4 className="text-xl font-bold text-white mb-2 leading-tight">{current.title}</h4>
                <p className="text-sm text-slate-300 leading-relaxed">{current.message}</p>
                
                {current.sender?.firstName && (
                  <p className="mt-3 text-xs text-slate-400 font-medium">
                    From: <span className="text-slate-200">{current.sender.firstName} {current.sender.lastName}</span>
                    {current.sender.department && ` • ${current.sender.department}`}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 bg-[#051030] border-t border-[#112d8a] flex items-center justify-end gap-3">
            <button 
              onClick={dismissCurrent}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
            >
              Dismiss
            </button>
            {current.type === 'approval' ? (
              <>
                <button 
                  onClick={() => handleAction('reject')}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500 hover:text-white transition-all shadow-[0_0_15px_rgba(239,68,68,0.2)] hover:shadow-[0_0_20px_rgba(239,68,68,0.4)]"
                >
                  Reject
                </button>
                <button 
                  onClick={() => handleAction('approve')}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-green-500/10 text-green-400 border border-green-500/30 hover:bg-green-500 hover:text-white transition-all shadow-[0_0_15px_rgba(34,197,94,0.2)] hover:shadow-[0_0_20px_rgba(34,197,94,0.4)]"
                >
                  Approve
                </button>
              </>
            ) : current.link ? (
              <button 
                onClick={() => handleAction('open', current.link)}
                className="px-5 py-2.5 rounded-xl text-sm font-bold bg-gold text-[#0a1f5c] hover:bg-gold-light transition-all shadow-[0_0_15px_rgba(255,215,0,0.4)] hover:shadow-[0_0_20px_rgba(255,215,0,0.6)] flex items-center gap-2"
              >
                View Details <GoogleIcon name="arrow_forward" size={16} />
              </button>
            ) : null}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
