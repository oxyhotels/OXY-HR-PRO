'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import GoogleIcon from '@/components/GoogleIcon';

interface Task {
  _id: string;
  title: string;
  description: string;
  priority: string;
  dueDate: string;
  dueTime?: string;
  status: string;
}

export default function TaskDeadlineAlert() {
  const { user } = useAuthStore();
  const [alertTasks, setAlertTasks] = useState<Task[]>([]);
  const [showModal, setShowModal] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio('/alerm sound.mp3');
  }, []);

  const formatTimeRemaining = (dueDateStr: string, dueTimeStr?: string) => {
    const dueD = new Date(dueDateStr);
    if (isNaN(dueD.getTime())) return '';

    let hours = 23;
    let minutes = 59;
    if (dueTimeStr) {
      const parts = dueTimeStr.split(':');
      if (parts.length >= 2) {
        hours = parseInt(parts[0], 10);
        minutes = parseInt(parts[1], 10);
      }
    }

    const deadline = new Date(dueD.getFullYear(), dueD.getMonth(), dueD.getDate(), hours, minutes, 0, 0);
    const diffMs = deadline.getTime() - Date.now();
    if (diffMs <= 0) return 'Deadline passed';

    const diffMins = Math.floor(diffMs / 60000);
    const h = Math.floor(diffMins / 60);
    const m = diffMins % 60;

    return `${h}h ${m}m remaining`;
  };

  useEffect(() => {
    if (!user || user.role === 'ROOT_ADMIN') return;

    const checkDeadlines = async () => {
      try {
        const res = await api.get('/tasks/my-tasks');
        const myTasks = res.data.tasks || [];

        const now = Date.now();
        const threeHoursMs = 3 * 60 * 60 * 1000;

        const alertedKey = `alerted_deadline_tasks_${user.id}`;
        let alertedIds: string[] = [];
        try {
          const stored = localStorage.getItem(alertedKey);
          if (stored) alertedIds = JSON.parse(stored);
        } catch (e) {
          console.error(e);
        }

        const newAlertTasks: Task[] = [];
        const updatedAlertedIds = [...alertedIds];

        for (const task of myTasks) {
          if (task.status.toLowerCase() === 'completed') continue;
          if (updatedAlertedIds.includes(task._id)) continue;
          if (!task.dueDate) continue;

          const dueD = new Date(task.dueDate);
          if (isNaN(dueD.getTime())) continue;

          let hours = 23;
          let minutes = 59;
          if (task.dueTime) {
            const parts = task.dueTime.split(':');
            if (parts.length >= 2) {
              hours = parseInt(parts[0], 10);
              minutes = parseInt(parts[1], 10);
            }
          }

          const deadline = new Date(dueD.getFullYear(), dueD.getMonth(), dueD.getDate(), hours, minutes, 0, 0);
          const timeRemaining = deadline.getTime() - now;

          // If the task is uncompleted, has remaining time > 0, and is within 3 hours
          if (timeRemaining > 0 && timeRemaining <= threeHoursMs) {
            newAlertTasks.push(task);
            updatedAlertedIds.push(task._id);
          }
        }

        if (newAlertTasks.length > 0) {
          localStorage.setItem(alertedKey, JSON.stringify(updatedAlertedIds));
          setAlertTasks(prev => {
            const filtered = newAlertTasks.filter(nt => !prev.some(pt => pt._id === nt._id));
            return [...prev, ...filtered];
          });
          setShowModal(true);

          if (audioRef.current) {
            audioRef.current.play().catch(err => {
              console.warn('Audio play blocked by browser autoplay policy:', err);
            });
          }
        }
      } catch (err) {
        console.error('Error checking task deadlines:', err);
      }
    };

    // Run immediately and check every 60 seconds
    checkDeadlines();
    const interval = setInterval(checkDeadlines, 60000);
    return () => clearInterval(interval);
  }, [user]);

  if (!showModal || alertTasks.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-slate-900 border-2 border-red-500 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-white relative animate-in zoom-in-95 duration-300">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
          <div className="bg-red-500/20 p-2 rounded-full border border-red-500 animate-pulse">
            <GoogleIcon name="notifications_active" className="text-red-500" size={24} />
          </div>
          <div>
            <h3 className="font-bold text-sm text-red-500 uppercase tracking-wider">
              Task Deadline Alert
            </h3>
            <p className="text-[10px] text-slate-400">
              You have tasks with less than 3 hours remaining!
            </p>
          </div>
        </div>

        <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
          {alertTasks.map((task) => (
            <div
              key={task._id}
              className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2 hover:border-red-500/30 transition-colors"
            >
              <div className="flex justify-between items-start">
                <h4 className="font-bold text-xs text-white truncate" title={task.title}>
                  {task.title}
                </h4>
                <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-red-950 text-red-400 border border-red-900/50 flex-shrink-0">
                  {formatTimeRemaining(task.dueDate, task.dueTime)}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 line-clamp-2">
                {task.description || 'No description provided'}
              </p>
              {task.dueTime && (
                <div className="flex items-center gap-1 text-[9px] text-slate-500">
                  <GoogleIcon name="schedule" size={12} />
                  <span>Due today at {task.dueTime}</span>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-3 pt-2 border-t border-slate-800">
          <button
            onClick={() => {
              setShowModal(false);
              setAlertTasks([]);
            }}
            className="flex-1 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-red-600/25"
          >
            <GoogleIcon name="check" size={14} />
            Acknowledge Warnings
          </button>
        </div>
      </div>
    </div>
  );
}
