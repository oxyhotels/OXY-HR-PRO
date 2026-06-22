'use client';

import React, { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import GoogleIcon from '../../../components/GoogleIcon';
import Link from 'next/link';

export default function MobileNotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      if (res?.status === 'success' && res?.data?.notifications) {
        setNotifications(res.data.notifications);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAllAsRead = async () => {
    setActionLoading(true);
    try {
      await api.patch('/notifications');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error('Failed to mark all read:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}`);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const [activeTab, setActiveTab] = useState<'all' | 'chat' | 'voice' | 'video' | 'mention'>('all');

  const getNotificationIcon = (type: string, message: string = '', title: string = '') => {
    switch (type) {
      case 'success':
        return { icon: 'event_available', color: 'text-green-400 bg-green-500/10 border-green-500/20' };
      case 'warning':
        return { icon: 'date_range', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
      case 'info':
        return { icon: 'person_add', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' };
      case 'chat':
        return { icon: 'forum', color: 'text-teal-400 bg-teal-500/10 border-teal-500/20' };
      case 'mention':
        return { icon: 'alternate_email', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' };
      case 'call':
        if (title.includes('Video') || message.includes('video')) {
          return { icon: 'video_call', color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' };
        }
        return { icon: 'call', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
      case 'alert':
      default:
        return { icon: 'notifications_active', color: 'text-red-400 bg-red-500/10 border-red-500/20' };
    }
  };

  const filteredNotifications = notifications.filter(notif => {
    if (activeTab === 'all') return true;
    if (activeTab === 'chat') return notif.type === 'chat';
    if (activeTab === 'mention') return notif.type === 'mention';
    if (activeTab === 'voice') {
      return notif.type === 'call' && (notif.title.includes('Voice') || notif.message.includes('voice'));
    }
    if (activeTab === 'video') {
      return notif.type === 'call' && (notif.title.includes('Video') || notif.message.includes('video'));
    }
    return true;
  });

  return (
    <div className="max-w-md mx-auto space-y-4 pb-12">
      {/* Header and Read All action */}
      <div className="flex justify-between items-center bg-card-dark border border-slate-800/80 p-4 rounded-2xl shadow-lg">
        <div>
          <h2 className="text-sm font-extrabold text-slate-100 uppercase tracking-wider">Inbox Notifications</h2>
          <p className="text-[10px] text-slate-500 mt-0.5">Read alert logs and dynamic system notifications.</p>
        </div>
        {notifications.some(n => !n.read) && (
          <button
            onClick={handleMarkAllAsRead}
            disabled={actionLoading}
            className="text-[11px] text-gold hover:text-gold-light hover:underline font-bold transition-all disabled:opacity-50 cursor-pointer"
          >
            Mark all read
          </button>
        )}
      </div>

      {/* Categories Filter Tabs */}
      <div className="flex overflow-x-auto gap-2 pb-1 scrollbar-none">
        {[
          { id: 'all', label: 'All', icon: 'notifications' },
          { id: 'chat', label: 'Chats', icon: 'forum' },
          { id: 'voice', label: 'Voice Calls', icon: 'call' },
          { id: 'video', label: 'Video Calls', icon: 'video_call' },
          { id: 'mention', label: 'Mentions', icon: 'alternate_email' }
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-gold to-gold-light text-[#0a1f5c] shadow-md'
                  : 'bg-[#0d1530] border border-slate-800 text-slate-350 hover:text-white'
              }`}
            >
              <GoogleIcon name={tab.icon} size={13} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Notifications list */}
      <div className="bg-card-dark border border-slate-800/80 rounded-2xl overflow-hidden shadow-lg divide-y divide-slate-800/40">
        {loading ? (
          <div className="p-10 text-center flex flex-col items-center justify-center gap-2">
            <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
            <span className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mt-2">Loading Inbox...</span>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
            <GoogleIcon name="notifications_off" size={40} className="text-slate-650" />
            <div>
              <p className="text-xs font-semibold text-slate-400">All clear! No notifications</p>
              <p className="text-[10px] text-slate-500 mt-0.5">We will let you know when action is required.</p>
            </div>
          </div>
        ) : (
          filteredNotifications.map((notif) => {
            const { icon, color } = getNotificationIcon(notif.type, notif.message, notif.title);
            return (
              <div
                key={notif._id}
                onClick={() => handleMarkAsRead(notif._id)}
                className={`p-4 flex items-start gap-3.5 hover:bg-slate-800/40 cursor-pointer transition-colors ${
                  !notif.read ? 'bg-slate-900/30 border-l-2 border-gold' : ''
                }`}
              >
                {/* Icon Circle */}
                <div className={`w-9 h-9 rounded-xl border flex items-center justify-center flex-shrink-0 ${color}`}>
                  <GoogleIcon name={icon} size={18} />
                </div>

                {/* Body Content */}
                <div className="flex-1 min-w-0 text-left text-xs">
                  <div className="flex justify-between items-start gap-1">
                    <h4 className={`font-bold truncate ${!notif.read ? 'text-white' : 'text-slate-350'}`}>
                      {notif.title}
                    </h4>
                    <span className="text-[9px] text-slate-500 font-mono flex-shrink-0">
                      {new Date(notif.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed mt-1">
                    {notif.message}
                  </p>
                  {notif.link && (
                    <Link
                      href={notif.link}
                      className="inline-flex items-center gap-1 text-[10px] text-gold hover:text-gold-light font-bold mt-2 uppercase tracking-wider hover:underline"
                    >
                      View Action &rarr;
                    </Link>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
