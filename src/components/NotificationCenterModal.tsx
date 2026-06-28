'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';
import GoogleIcon from './GoogleIcon';
import { useAuthStore } from '@/store/authStore';

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

export interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const moduleColors: Record<string, string> = {
  Community: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  Tasks: 'bg-green-500/10 text-green-400 border-green-500/30',
  'My Tasks': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  Attendance: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  Hierarchy: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  Reports: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
  Documents: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
  Payroll: 'bg-pink-500/10 text-pink-400 border-pink-500/30',
  Leaves: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
  Employees: 'bg-teal-500/10 text-teal-400 border-teal-500/30',
  System: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
  Default: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
};

const moduleIcons: Record<string, string> = {
  Community: 'forum',
  Tasks: 'task',
  'My Tasks': 'assignment',
  Attendance: 'fingerprint',
  Hierarchy: 'account_tree',
  Reports: 'bar_chart',
  Documents: 'description',
  Payroll: 'payments',
  Leaves: 'event_busy',
  Employees: 'group',
  System: 'settings',
  Default: 'notifications',
};

export default function NotificationCenterModal({ isOpen, onClose }: NotificationCenterModalProps) {
  const router = useRouter();
  const { user } = useAuthStore();
  
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  // Filters
  const [search, setSearch] = useState('');
  const [moduleTag, setModuleTag] = useState('All');
  const [priority, setPriority] = useState('All');
  const [readStatus, setReadStatus] = useState('All');
  
  const observerTarget = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async (pageNum = 1, append = false) => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: pageNum.toString(),
        limit: '20',
        search,
        moduleTag,
        priority,
        readStatus
      }).toString();
      
      const res = await api.get(`/notifications?${queryParams}`);
      
      if (res?.data) {
        if (append) {
          setNotifications(prev => [...prev, ...res.data.notifications]);
        } else {
          setNotifications(res.data.notifications);
        }
        setHasMore(res.data.pagination.hasMore);
      }
    } catch (err) {
      console.error('Failed to load notifications', err);
    } finally {
      setLoading(false);
    }
  }, [search, moduleTag, priority, readStatus]);

  // Initial fetch and filter change
  useEffect(() => {
    if (isOpen) {
      setPage(1);
      fetchNotifications(1, false);
    }
  }, [isOpen, search, moduleTag, priority, readStatus, fetchNotifications]);

  // Infinite Scroll Intersection Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          setPage(p => p + 1);
        }
      },
      { threshold: 1.0 }
    );
    
    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }
    
    return () => observer.disconnect();
  }, [hasMore, loading]);

  // Fetch next page when page state changes
  useEffect(() => {
    if (page > 1) {
      fetchNotifications(page, true);
    }
  }, [page, fetchNotifications]);

  // Real-time socket listener to prepend new notification
  useEffect(() => {
    if (!isOpen) return;
    
    const handleNewNotif = (e: Event) => {
      const customEvent = e as CustomEvent;
      const notification = customEvent.detail;
      setNotifications(prev => [notification, ...prev]);
    };
    
    window.addEventListener('new_notification', handleNewNotif);
    return () => window.removeEventListener('new_notification', handleNewNotif);
  }, [isOpen]);

  const handleNotificationClick = async (notif: any) => {
    // Optimistic read
    if (!notif.read) {
      setNotifications(prev => prev.map(n => n._id === notif._id ? { ...n, read: true } : n));
      try {
        await api.patch(`/notifications/${notif._id}`, {});
      } catch (err) {
        console.error('Failed to mark read', err);
      }
    }
    
    if (notif.moduleTag === 'Community' && notif.metadata?.groupId) {
      onClose();
      router.push(`/dashboard/community?groupId=${notif.metadata.groupId}`);
      return;
    }

    if (notif.link) {
      onClose();
      router.push(notif.link);
    }
  };

  const markAllAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    try {
      await api.patch('/notifications', {});
    } catch (err) {
      console.error(err);
    }
  };

  // Keyboard accessibility
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 md:p-8">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="bg-[#0a1631] border-none w-screen h-screen flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="p-5 border-b border-[#112d8a]/50 flex flex-col gap-4 bg-gradient-to-r from-[#0a1631] to-[#06143c]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-gold/10 p-2 rounded-xl border border-gold/30">
                  <GoogleIcon name="notifications" size={24} className="text-gold" />
                </div>
                <h2 className="text-xl font-bold text-white tracking-wide">Notification Center</h2>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={markAllAsRead}
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 transition-colors border border-white/10"
                >
                  Mark all as read
                </button>
                <button 
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors"
                >
                  <GoogleIcon name="close" size={20} />
                </button>
              </div>
            </div>
            
            {/* Filters Row */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[200px] relative">
                <GoogleIcon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search notifications..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-[#06143c] border border-[#112d8a] rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-gold/50 transition-colors"
                />
              </div>
              
              <select 
                value={moduleTag} 
                onChange={(e) => setModuleTag(e.target.value)}
                className="bg-[#06143c] border border-[#112d8a] rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none"
              >
                <option value="All">All Modules</option>
                <option value="Community">Community</option>
                <option value="Tasks">Tasks</option>
                <option value="My Tasks">My Tasks</option>
                <option value="Attendance">Attendance</option>
                <option value="Reports">Reports</option>
                <option value="System">System</option>
              </select>

              <select 
                value={priority} 
                onChange={(e) => setPriority(e.target.value)}
                className="bg-[#06143c] border border-[#112d8a] rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none"
              >
                <option value="All">All Priorities</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>

              <select 
                value={readStatus} 
                onChange={(e) => setReadStatus(e.target.value)}
                className="bg-[#06143c] border border-[#112d8a] rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none"
              >
                <option value="All">All Status</option>
                <option value="unread">Unread Only</option>
                <option value="read">Read Only</option>
              </select>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-[#112d8a]/50">
            {notifications.length === 0 && !loading ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-4">
                <GoogleIcon name="notifications_off" size={48} className="opacity-20" />
                <p>No notifications found.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {notifications.map((notif, idx) => {
                  const isUnread = !notif.read;
                  const modTag = notif.moduleTag || notif.type || 'Default';
                  // map community lowercase to capitalized
                  const formattedModTag = modTag.charAt(0).toUpperCase() + modTag.slice(1);
                  const colorClass = moduleColors[formattedModTag] || moduleColors['Default'];
                  const iconName = moduleIcons[formattedModTag] || moduleIcons['Default'];
                  
                  return (
                    <div 
                      key={notif._id || idx}
                      onClick={() => handleNotificationClick(notif)}
                      className={`group relative p-4 rounded-xl border transition-all cursor-pointer hover:-translate-y-0.5 ${
                        isUnread 
                          ? 'bg-[#06143c] border-gold/40 shadow-[0_4px_20px_rgba(255,215,0,0.05)] hover:border-gold/60' 
                          : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20'
                      }`}
                    >
                      {/* Unread dot */}
                      {isUnread && (
                        <div className="absolute top-4 left-4 w-2 h-2 rounded-full bg-gold shadow-[0_0_10px_rgba(255,215,0,0.8)] animate-pulse" />
                      )}

                      <div className={`flex items-start gap-4 ${isUnread ? 'ml-4' : ''}`}>
                        {/* Avatar or Icon */}
                        <div className="flex-shrink-0 relative">
                          {notif.sender?.photoUrl ? (
                            <img src={notif.sender.photoUrl} alt="Sender" className="w-10 h-10 rounded-full object-cover border border-white/10" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-[#112d8a] flex items-center justify-center border border-white/10 text-white font-semibold text-lg">
                              {notif.sender?.firstName ? notif.sender.firstName[0] : <GoogleIcon name={iconName} size={20} />}
                            </div>
                          )}
                          {/* Mini module icon badge */}
                          <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center border border-[#06143c] bg-slate-800 text-white`}>
                            <GoogleIcon name={iconName} size={10} />
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <h4 className={`text-sm font-semibold truncate ${isUnread ? 'text-white' : 'text-slate-200'}`}>
                              {notif.title}
                            </h4>
                            <span className="text-xs text-slate-400 whitespace-nowrap">
                              {timeAgo(notif.createdAt)}
                            </span>
                          </div>
                          
                          <p className={`text-xs line-clamp-2 mb-3 ${isUnread ? 'text-slate-300' : 'text-slate-400'}`}>
                            {notif.message}
                          </p>

                          {/* Footer Tags */}
                          <div className="flex flex-wrap items-center gap-2">
                            {notif.sender?.firstName && (
                              <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] text-slate-300">
                                <GoogleIcon name="person" size={12} />
                                {notif.sender.firstName} {notif.sender.lastName}
                              </div>
                            )}
                            
                            {notif.sender?.department && (
                              <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] text-slate-300">
                                <GoogleIcon name="domain" size={12} />
                                {notif.sender.department}
                              </div>
                            )}

                            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-medium ${colorClass}`}>
                              {formattedModTag}
                            </div>
                            
                            {notif.priority && (
                              <div className={`flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-medium ${
                                notif.priority === 'High' ? 'bg-red-500/10 text-red-400 border-red-500/30' :
                                notif.priority === 'Medium' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' :
                                'bg-green-500/10 text-green-400 border-green-500/30'
                              }`}>
                                {notif.priority} Priority
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            
            {loading && (
              <div className="flex justify-center p-4">
                <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            
            <div ref={observerTarget} className="h-4" />
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
