'use client';

import React, { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import GoogleIcon from '@/components/GoogleIcon';

interface Task {
  _id: string;
  title: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  dueDate: string;
  dueTime?: string;
  assignedBy: {
    firstName: string;
    lastName: string;
  };
}

export default function TaskNotificationPopup() {
  const { user } = useAuthStore();
  const [pendingTasks, setPendingTasks] = useState<Task[]>([]);
  const [showPopup, setShowPopup] = useState(false);
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchPendingTasks = async () => {
    try {
      setLoading(true);
      const res = await api.get('/tasks?status=Pending');
      const tasks = res.data.tasks || [];
      
      const myTasks = tasks.filter((task: any) => 
        task.assignedTo?.some((assigneeId: string) => assigneeId === user?.id)
      );
      
      setPendingTasks(myTasks);
      
      if (myTasks.length > 0 && !showPopup) {
        setShowPopup(true);
      }
    } catch (err) {
      console.error('Failed to fetch pending tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingTasks();
    const interval = setInterval(fetchPendingTasks, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleAction = async (action: 'accept' | 'hold' | 'reject') => {
    if (pendingTasks.length === 0) return;
    
    const currentTask = pendingTasks[currentTaskIndex];
    
    if (action === 'hold' || action === 'reject') {
      const reason = prompt(
        action === 'hold' 
          ? 'कृपया होल्ड करने का कारण लिखें (Minimum 10 characters):' 
          : 'कृपया रिजेक्ट करने का कारण लिखें (Minimum 10 characters):'
      );
      
      if (!reason || reason.trim().length < 10) {
        alert('कृपया कारण लिखें (Minimum 10 characters)');
        return;
      }
      
      try {
        await api.post(`/tasks/${currentTask._id}/${action}`, { reason: reason.trim() });
        handleNextTask();
      } catch (err: any) {
        alert(err.message || `Failed to ${action} task`);
      }
    } else {
      try {
        await api.post(`/tasks/${currentTask._id}/accept`, {});
        handleNextTask();
      } catch (err: any) {
        alert(err.message || 'Failed to accept task');
      }
    }
  };

  const handleNextTask = () => {
    if (currentTaskIndex < pendingTasks.length - 1) {
      setCurrentTaskIndex(currentTaskIndex + 1);
    } else {
      setShowPopup(false);
      setCurrentTaskIndex(0);
      fetchPendingTasks();
    }
  };

  const handleClose = () => {
    setShowPopup(false);
    setCurrentTaskIndex(0);
  };

  if (!showPopup || pendingTasks.length === 0 || loading) {
    return null;
  }

  const currentTask = pendingTasks[currentTaskIndex];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Urgent': return 'bg-red-100 text-red-700 border-red-200';
      case 'High': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'Medium': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Low': return 'bg-slate-100 text-slate-700 border-slate-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="bg-white border-2 border-blue-400 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5">
        <div className="flex justify-between items-start border-b border-slate-200 pb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
              </span>
              <h3 className="text-base font-bold text-slate-900">
                📌 नया कार्य सौंपा गया है
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              Task {currentTaskIndex + 1} of {pendingTasks.length}
            </p>
          </div>
          <button 
            onClick={handleClose} 
            className="text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <GoogleIcon name="close" size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-bold text-slate-900 mb-2">{currentTask.title}</h4>
            <p className="text-xs text-slate-600 leading-relaxed">{currentTask.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-slate-500 font-semibold block text-[10px] uppercase">Priority</span>
              <span className={`inline-block mt-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border ${getPriorityColor(currentTask.priority)}`}>
                {currentTask.priority}
              </span>
            </div>
            <div>
              <span className="text-slate-500 font-semibold block text-[10px] uppercase">Due Date</span>
              <span className="text-slate-800 font-bold text-sm mt-1 block">
                {new Date(currentTask.dueDate).toLocaleDateString()}
                {currentTask.dueTime && <span className="font-mono"> at {currentTask.dueTime}</span>}
              </span>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-[10px] text-blue-800 font-semibold">
              Assigned by: {currentTask.assignedBy.firstName} {currentTask.assignedBy.lastName}
            </p>
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm font-bold text-slate-900 mb-2">
              📌 नया कार्य सौंपा गया है
            </p>
            <p className="text-xs text-slate-700 leading-relaxed">
              कार्य शीर्षक: <span className="font-bold">{currentTask.title}</span>
            </p>
            <p className="text-xs text-slate-600 mt-2">
              कृपया कार्य स्वीकार करें।
            </p>
          </div>
        </div>

        <div className="flex gap-2 pt-4 border-t border-slate-200">
          <button
            onClick={() => handleAction('accept')}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            <GoogleIcon name="check" size={16} />
            स्वीकार करें
          </button>
          <button
            onClick={() => handleAction('hold')}
            className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white py-3 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            <GoogleIcon name="pause" size={16} />
            होल्ड करें
          </button>
          <button
            onClick={() => handleAction('reject')}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            <GoogleIcon name="close" size={16} />
            रिजेक्ट करें
          </button>
        </div>

        {pendingTasks.length > 1 && (
          <div className="flex justify-center gap-2 pt-2">
            {pendingTasks.map((_, idx) => (
              <div
                key={idx}
                className={`h-2 rounded-full transition-all ${
                  idx === currentTaskIndex ? 'w-8 bg-blue-600' : 'w-2 bg-slate-300'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}