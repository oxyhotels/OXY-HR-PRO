'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import GoogleIcon from '@/components/GoogleIcon';
import { useRouter } from 'next/navigation';
import PropertyReportsTab from '@/components/property/PropertyReportsTab';

interface TaskUpdate {
  status: string;
  remark?: string;
  progress?: number;
  evidenceUrl?: string;
  updatedBy: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
  createdAt: string;
}

interface Task {
  _id: string;
  title: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  status: string;
  progress: number;
  dueDate: string;
  dueTime?: string;
  evidenceRequirement: 'optional' | 'mandatory';
  assignedBy: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  assignedTo?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    department?: string;
    designation?: string;
  }[];
  hotel?: {
    _id: string;
    name: string;
  };
  department?: string;
  taskUpdates: TaskUpdate[];
  latestRemark?: string;
  holdReason?: string;
  completionRemark?: string;
  evidenceUrl?: string;
  responses: any[];
  taskWorkSessions?: {
    startedAt: string;
    endedAt?: string;
    duration?: number;
    updateMessage?: string;
    evidenceImage?: string;
  }[];
  totalWorkedMinutes?: number;
  latestUpdate?: string;
  createdAt: string;
  updatedAt: string;
}

type KanbanColumn = 'todo' | 'inProgress' | 'hold' | 'completed' | 'rejected';

const LiveTimer = ({ startedAt }: { startedAt: string }) => {
  const [duration, setDuration] = useState('');

  useEffect(() => {
    const update = () => {
      const start = new Date(startedAt).getTime();
      const now = new Date().getTime();
      const diffMins = Math.floor((now - start) / 60000);
      const h = Math.floor(diffMins / 60);
      const m = diffMins % 60;
      setDuration(`${h}h ${m}m`);
    };
    update();
    const interval = setInterval(update, 60000); // update every minute
    return () => clearInterval(interval);
  }, [startedAt]);

  return <span className="font-mono bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded text-[10px] animate-pulse">Live: {duration}</span>;
};

export default function MyTasksPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeColumn, setActiveColumn] = useState<KanbanColumn>('todo');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'tasks' | 'reports'>('tasks');

  const [remark, setRemark] = useState('');
  const [progress, setProgress] = useState(0);
  const [photo, setPhoto] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<string>('');

  const fetchMyTasks = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/tasks/my-tasks');
      setTasks(res.data.tasks || []);
    } catch (err) {
      console.error('Failed to fetch my tasks:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchMyTasks();
    }
  }, [user, fetchMyTasks]);

  // Socket.IO real-time updates
  useEffect(() => {
    let activeSocket: any = null;
    const setupSocket = async () => {
      try {
        const { io: socketIoClient } = await import('socket.io-client');
        const token = useAuthStore.getState().accessToken;
        if (!token) return;

        const socketConn = socketIoClient({
          auth: { token },
        });
        activeSocket = socketConn;

        const handleTaskUpdate = (data: { taskId: string; task: Task }) => {
          setTasks(prev => prev.map(t => t._id === data.taskId ? data.task : t));
          if (selectedTask && selectedTask._id === data.taskId) {
            setSelectedTask(data.task);
          }
        };

        socketConn.on('task_status_updated', handleTaskUpdate);
        socketConn.on('TASK_UPDATED', handleTaskUpdate);
      } catch (err) {
        console.error('Socket setup error:', err);
      }
    };
    setupSocket();

    return () => {
      if (activeSocket) {
        activeSocket.disconnect();
      }
    };
  }, [selectedTask]);


  const getTasksByColumn = (column: KanbanColumn): Task[] => {
    switch (column) {
      case 'todo':
        return tasks.filter(t => t.status === 'To_Do' || t.status === 'Accepted' || t.status === 'Pending');
      case 'inProgress':
        return tasks.filter(t => t.status === 'In_Progress');
      case 'hold':
        return tasks.filter(t => t.status === 'On_Hold');
      case 'completed':
        return tasks.filter(t => t.status === 'Completed');
      case 'rejected':
        return tasks.filter(t => t.status === 'Rejected');
      default:
        return [];
    }
  };

  type ActionType = 'accept' | 'hold' | 'reject' | 'progress' | 'complete' | 'updateStatus' | 'pauseSession';
  const [actionType, setActionType] = useState<ActionType | null>(null);

  const startWorkSession = async (taskId: string) => {
    try {
      await api.post(`/tasks/${taskId}/work-session`, { action: 'start' });
      fetchMyTasks();
    } catch (error) {
      console.error('Failed to start session', error);
      alert('Failed to start session');
    }
  };

  const handleAction = async () => {
    if (!selectedTask || !actionType) return;
    setSubmitting(true);

    try {
      const payload: any = {};
      if (actionType === 'hold') {
        payload.reason = remark;
        payload.photo = photo;
      } else if (actionType === 'reject') {
        payload.reason = remark;
      } else if (actionType === 'complete') {
        payload.description = remark;
        payload.photo = photo;
      } else if (actionType === 'progress') {
        payload.progress = progress;
        payload.remark = remark;
      } else if (actionType === 'updateStatus') {
        payload.status = updateStatus;
        payload.description = remark;
        payload.photoUrl = photo;
      }

      if (actionType === 'pauseSession') {
        await api.post(`/tasks/${selectedTask._id}/work-session`, {
          action: 'pause',
          updateMessage: remark,
          evidenceImage: photo
        });
      } else if (actionType === 'updateStatus') {
        await api.post(`/tasks/${selectedTask._id}/update-status`, payload);
      } else {
        await api.post(`/tasks/${selectedTask._id}/${actionType}`, payload);
      }

      setShowActionModal(false);
      setSelectedTask(null);
      setActionType(null);
      setRemark('');
      setProgress(0);
      setPhoto(null);
      setUpdateStatus('');
      fetchMyTasks();
    } catch (err: any) {
      alert(err.message || `Failed to ${actionType} task`);
    } finally {
      setSubmitting(false);
    }
  };

  const openActionModal = (task: Task, action: 'hold' | 'reject' | 'complete' | 'progress') => {
    setSelectedTask(task);
    setActionType(action);
    setRemark('');
    setProgress(task.progress);
    setPhoto(null);
    setShowActionModal(true);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Urgent': return 'bg-red-100 text-red-700 border-red-200';
      case 'High': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'Medium': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Low': return 'bg-slate-100 text-slate-700 border-slate-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'To_Do':
      case 'Accepted':
        return <span className="px-2 py-1 rounded-lg text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200">To Do</span>;
      case 'In_Progress':
        return <span className="px-2 py-1 rounded-lg text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200">In Progress</span>;
      case 'On_Hold':
        return <span className="px-2 py-1 rounded-lg text-[10px] font-bold bg-yellow-100 text-yellow-700 border border-yellow-200">On Hold</span>;
      case 'Completed':
        return <span className="px-2 py-1 rounded-lg text-[10px] font-bold bg-green-100 text-green-700 border border-green-200">Completed</span>;
      case 'Rejected':
        return <span className="px-2 py-1 rounded-lg text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">Rejected</span>;
      default:
        return <span className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">{status}</span>;
    }
  };

  const columns: { key: KanbanColumn; label: string; icon: string; color: string }[] = [
    { key: 'todo', label: 'To Do', icon: 'assignment', color: 'bg-blue-500' },
    { key: 'inProgress', label: 'In Progress', icon: 'progress_activity', color: 'bg-purple-500' },
    { key: 'hold', label: 'Hold', icon: 'pause_circle', color: 'bg-yellow-500' },
    { key: 'completed', label: 'Completed', icon: 'check_circle', color: 'bg-green-500' },
    { key: 'rejected', label: 'Rejected', icon: 'cancel', color: 'bg-red-500' },
  ];

  const columnCounts = {
    todo: getTasksByColumn('todo').length,
    inProgress: getTasksByColumn('inProgress').length,
    hold: getTasksByColumn('hold').length,
    completed: getTasksByColumn('completed').length,
    rejected: getTasksByColumn('rejected').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Tasks</h1>
          <p className="text-slate-500 text-xs mt-1">Track and manage your assigned tasks</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-200 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('tasks')}
              className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'tasks' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
            >
              Tasks
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'reports' ? 'bg-gold text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
            >
              <GoogleIcon name="folder" size={14} />
              REPORT
            </button>
          </div>
          <button
            onClick={() => router.push('/dashboard/tasks')}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer ml-2 h-[32px]"
          >
            <GoogleIcon name="view_list" size={18} />
            All Tasks
          </button>
        </div>
      </div>

      {activeTab === 'reports' ? (
        <PropertyReportsTab />
      ) : (
        <>
          {/* Kanban Board */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {columns.map(col => (
            <button
              key={col.key}
              onClick={() => setActiveColumn(col.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeColumn === col.key
                  ? `${col.color} text-white shadow-md`
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <GoogleIcon name={col.icon} size={16} />
              {col.label}
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeColumn === col.key ? 'bg-white/20' : 'bg-slate-200'
              }`}>
                {columnCounts[col.key]}
              </span>
            </button>
          ))}
        </div>

        {/* Tasks Grid for Active Column */}
        {getTasksByColumn(activeColumn).length === 0 ? (
          <div className="text-center py-12">
            <GoogleIcon name="inbox" className="text-slate-300 mx-auto" size={48} />
            <p className="text-slate-500 text-sm mt-3">No tasks in this column</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {getTasksByColumn(activeColumn).map(task => (
              <div
                key={task._id}
                onClick={() => {
                  setSelectedTask(task);
                  setShowActionModal(true);
                }}
                className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-3">
                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${getPriorityColor(task.priority)}`}>
                    {task.priority}
                  </span>
                  {getStatusBadge(task.status)}
                </div>

                <h3 className="text-sm font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
                  {task.title}
                </h3>
                <p className="text-xs text-slate-600 mb-4 line-clamp-2">{task.description}</p>

                {/* Progress Bar */}
                {task.status !== 'Rejected' && (
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                      <span>Progress</span>
                      <span className="font-bold">{task.progress}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${task.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2 text-[10px] text-slate-500">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-1.5">
                      <GoogleIcon name="schedule" size={14} />
                      <span className="truncate" title={`Due: ${new Date(task.dueDate).toLocaleDateString()} ${task.dueTime ? `at ${task.dueTime}` : ''}`}>
                        Due: {new Date(task.dueDate).toLocaleDateString()} {task.dueTime && `at ${task.dueTime}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <GoogleIcon name="calendar_today" size={14} />
                      <span className="truncate" title={`Created: ${new Date(task.createdAt).toLocaleDateString()}`}>
                        Created: {new Date(task.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-1.5">
                      <GoogleIcon name="person_outline" size={14} />
                      <span className="truncate" title={`By: ${task.assignedBy?.firstName} ${task.assignedBy?.lastName}`}>
                        By: {task.assignedBy?.firstName} {task.assignedBy?.lastName}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <GoogleIcon name="person" size={14} />
                      <span className="truncate" title={`To: ${task.assignedTo && task.assignedTo.length > 0 ? task.assignedTo.map(u => u.firstName).join(', ') : 'Unassigned'}`}>
                        To: {task.assignedTo && task.assignedTo.length > 0 ? task.assignedTo.map(u => u.firstName).join(', ') : 'Unassigned'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {(task.department || (task.assignedTo && task.assignedTo[0]?.department)) && (
                      <div className="flex items-center gap-1.5">
                        <GoogleIcon name="corporate_fare" size={14} />
                        <span className="truncate" title={`Dept: ${task.department || task.assignedTo?.[0]?.department}`}>
                          Dept: {task.department || task.assignedTo?.[0]?.department}
                        </span>
                      </div>
                    )}
                    {task.hotel && (
                      <div className="flex items-center gap-1.5">
                        <GoogleIcon name="business" size={14} />
                        <span className="truncate" title={`Prop: ${task.hotel.name}`}>
                          Prop: {task.hotel.name}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-1.5">
                      <GoogleIcon name="update" size={14} />
                      <span className="truncate" title={`Updated: ${new Date(task.updatedAt).toLocaleTimeString()}`}>
                        Updated: {new Date(task.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <GoogleIcon name="attachment" size={14} />
                      <span className="truncate">
                        Attachments: {(task.evidenceUrl ? 1 : 0) + (task.taskUpdates?.filter(u => u.evidenceUrl).length || 0) + (task.responses?.filter(r => r.evidenceUrl).length || 0)}
                      </span>
                    </div>
                  </div>

                  {task.latestRemark && (
                    <div className="flex items-start gap-2 mt-2 p-2 bg-slate-50 rounded-lg">
                      <GoogleIcon name="comment" size={14} className="mt-0.5" />
                      <span className="line-clamp-2">{task.latestRemark}</span>
                    </div>
                  )}
                </div>

                {/* Work Session Tracker */}
                {(task.status === 'In_Progress' || task.status === 'Paused') && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex justify-between items-center">
                      Work Session Tracker
                      {task.totalWorkedMinutes !== undefined && task.totalWorkedMinutes > 0 && (
                        <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded text-[9px]">
                          Total: {Math.floor(task.totalWorkedMinutes / 60)}h {task.totalWorkedMinutes % 60}m
                        </span>
                      )}
                    </h4>
                    
                    {(() => {
                      const activeSession = task.taskWorkSessions?.find(s => !s.endedAt);
                      return activeSession ? (
                        <div className="space-y-2">
                          <div className="flex justify-between items-center bg-slate-50 px-2 py-1.5 rounded border border-slate-100">
                            <span className="text-[10px] text-slate-500 font-semibold">Current Session</span>
                            <LiveTimer startedAt={activeSession.startedAt} />
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTask(task);
                              setActionType('pauseSession');
                              setRemark('');
                              setPhoto(null);
                              setShowActionModal(true);
                            }}
                            className="w-full flex items-center justify-center gap-2 bg-amber-50 hover:bg-amber-100 text-amber-700 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer border border-amber-200 shadow-sm"
                          >
                            <GoogleIcon name="pause" size={16} /> Pause Work
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startWorkSession(task._id);
                          }}
                          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-[0_4px_12px_rgba(37,99,235,0.2)]"
                        >
                          <GoogleIcon name="play_arrow" size={16} /> 
                          {task.taskWorkSessions?.length ? 'Resume Work' : 'Start Work'}
                        </button>
                      );
                    })()}
                  </div>
                )}

                {/* Quick Actions */}
                <div className="mt-3 pt-3 border-t border-slate-100 flex gap-2">
                  {(task.status === 'To_Do' || task.status === 'Accepted' || (task.status === 'In_Progress' || task.status === 'Paused') || task.status === 'On_Hold') && (
                    <button
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        setSelectedTask(task); 
                        setActionType('updateStatus'); 
                        setUpdateStatus('');
                        setRemark('');
                        setPhoto(null);
                        setShowActionModal(true); 
                      }}
                      className="flex-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 py-1.5 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                    >
                      Update Status
                    </button>
                  )}
                  {task.status === 'Pending' && (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); openActionModal(task, 'hold'); }}
                        className="flex-1 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 py-1.5 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                      >
                        Hold
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); openActionModal(task, 'reject'); }}
                        className="flex-1 bg-red-50 hover:bg-red-100 text-red-700 py-1.5 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {(task.status === 'To_Do' || task.status === 'Accepted' || task.status === 'Pending') && (
                    <button
                      onClick={(e) => { e.stopPropagation(); openActionModal(task, 'progress'); }}
                      className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 py-1.5 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                    >
                      Start
                    </button>
                  )}
                  {((task.status === 'In_Progress' || task.status === 'Paused') || task.status === 'To_Do') && (
                    <button
                      onClick={(e) => { e.stopPropagation(); openActionModal(task, 'complete'); }}
                      className="flex-1 bg-green-50 hover:bg-green-100 text-green-700 py-1.5 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                    >
                      Complete
                    </button>
                  )}
                  {task.status === 'On_Hold' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); openActionModal(task, 'progress'); }}
                      className="flex-1 bg-purple-50 hover:bg-purple-100 text-purple-700 py-1.5 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                    >
                      Resume
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Modal */}
      {showActionModal && selectedTask && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b border-slate-200 pb-3">
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-900 pr-8">{selectedTask.title}</h3>
                <p className="text-xs text-slate-500 mt-1">{selectedTask.description}</p>
              </div>
              <button
                onClick={() => {
                  setShowActionModal(false);
                  setSelectedTask(null);
                  setActionType(null);
                }}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <GoogleIcon name="close" size={20} />
              </button>
            </div>

            {/* Task Info */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-500 font-semibold block text-[10px] uppercase">Priority</span>
                <span className={`inline-block mt-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border ${getPriorityColor(selectedTask.priority)}`}>
                  {selectedTask.priority}
                </span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold block text-[10px] uppercase">Due Date</span>
                <span className="text-slate-800 font-bold text-sm mt-1 block">
                  {new Date(selectedTask.dueDate).toLocaleDateString()} {selectedTask.dueTime && <span className="font-mono">at {selectedTask.dueTime}</span>}
                </span>
              </div>
            </div>

            {/* Update Status Form */}
            {actionType === 'updateStatus' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-2 text-xs uppercase tracking-wider">Select Status *</label>
                  <select
                    value={updateStatus}
                    onChange={(e) => setUpdateStatus(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm text-slate-800 focus:outline-none focus:border-blue-400 cursor-pointer"
                  >
                    <option value="">-- Select Status --</option>
                    <option value="In_Progress">In Progress</option>
                    <option value="On_Hold">On Hold</option>
                    <option value="Completed">Completed</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>

                {updateStatus === 'In_Progress' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-2 text-xs uppercase tracking-wider">Progress Description *</label>
                      <textarea
                        rows={4}
                        value={remark}
                        onChange={(e) => setRemark(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm text-slate-800 focus:outline-none focus:border-blue-400"
                        placeholder="Describe your work update (e.g., Floor 2 cleaning completed. Currently working on Floor 3...)"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-2 text-xs uppercase tracking-wider">Work Update Photo (Optional)</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => setPhoto(reader.result as string);
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                      {photo && (
                        <img src={photo} alt="Preview" className="mt-2 w-32 h-32 object-cover rounded-lg border border-slate-200" />
                      )}
                    </div>
                  </div>
                )}

                {updateStatus === 'On_Hold' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-2 text-xs uppercase tracking-wider">Hold Reason *</label>
                      <textarea
                        rows={4}
                        value={remark}
                        onChange={(e) => setRemark(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm text-slate-800 focus:outline-none focus:border-blue-400"
                        placeholder="Please provide reason for holding this task..."
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-2 text-xs uppercase tracking-wider">Expected Resume Time</label>
                      <input
                        type="datetime-local"
                        value={remark}
                        onChange={(e) => setRemark(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm text-slate-800 focus:outline-none focus:border-blue-400"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-2 text-xs uppercase tracking-wider">Photo (Optional)</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => setPhoto(reader.result as string);
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                      {photo && (
                        <img src={photo} alt="Preview" className="mt-2 w-32 h-32 object-cover rounded-lg border border-slate-200" />
                      )}
                    </div>
                  </div>
                )}

                {updateStatus === 'Completed' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-2 text-xs uppercase tracking-wider">Completion Summary *</label>
                      <input
                        type="text"
                        value={remark}
                        onChange={(e) => setRemark(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm text-slate-800 focus:outline-none focus:border-blue-400"
                        placeholder="Brief summary of completion"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-2 text-xs uppercase tracking-wider">Completion Description *</label>
                      <textarea
                        rows={4}
                        value={remark}
                        onChange={(e) => setRemark(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm text-slate-800 focus:outline-none focus:border-blue-400"
                        placeholder="Detailed description of completed work..."
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-2 text-xs uppercase tracking-wider">
                        Evidence Photo {selectedTask?.evidenceRequirement === 'mandatory' ? '*' : '(Optional)'}
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => setPhoto(reader.result as string);
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                      {photo && (
                        <img src={photo} alt="Preview" className="mt-2 w-32 h-32 object-cover rounded-lg border border-slate-200" />
                      )}
                    </div>
                  </div>
                )}

                {updateStatus === 'Rejected' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-2 text-xs uppercase tracking-wider">Rejection Reason *</label>
                      <textarea
                        rows={4}
                        value={remark}
                        onChange={(e) => setRemark(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm text-slate-800 focus:outline-none focus:border-blue-400"
                        placeholder="Please provide reason for rejection..."
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-2 text-xs uppercase tracking-wider">Photo (Optional)</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => setPhoto(reader.result as string);
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                      {photo && (
                        <img src={photo} alt="Preview" className="mt-2 w-32 h-32 object-cover rounded-lg border border-slate-200" />
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Action Form */}
            {(actionType === 'hold' || actionType === 'reject' || actionType === 'complete' || actionType === 'pauseSession') && (
              <div className="space-y-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-2 text-xs uppercase tracking-wider">
                    {actionType === 'hold' ? 'Hold Reason' : actionType === 'reject' ? 'Rejection Reason' : actionType === 'pauseSession' ? 'Progress Update Message' : 'Completion Note'} *
                  </label>
                  <textarea
                    rows={4}
                    value={remark}
                    onChange={(e) => setRemark(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm text-slate-800 focus:outline-none focus:border-blue-400"
                    placeholder={
                      actionType === 'hold'
                        ? 'Please provide reason for holding this task...'
                        : actionType === 'reject'
                        ? 'Please provide reason for rejection...'
                        : actionType === 'pauseSession'
                        ? 'Describe your work progress...'
                        : 'Add completion notes...'
                    }
                  />
                </div>

                {(actionType === 'hold' || actionType === 'complete' || actionType === 'pauseSession') && (
                  <div>
                    <label className="block text-slate-700 font-semibold mb-2 text-xs uppercase tracking-wider">
                      {actionType === 'hold' || actionType === 'pauseSession' ? 'Photo (Optional)' : 'Evidence Photo'}
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => setPhoto(reader.result as string);
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {photo && (
                      <img src={photo} alt="Preview" className="mt-2 w-32 h-32 object-cover rounded-lg border border-slate-200" />
                    )}
                  </div>
                )}
              </div>
            )}

            {actionType === 'progress' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-2 text-xs uppercase tracking-wider">
                    Update Progress: {progress}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={progress}
                    onChange={(e) => setProgress(Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                    <span>0%</span>
                    <span>50%</span>
                    <span>100%</span>
                  </div>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-2 text-xs uppercase tracking-wider">Remark (Optional)</label>
                  <textarea
                    rows={3}
                    value={remark}
                    onChange={(e) => setRemark(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm text-slate-800 focus:outline-none focus:border-blue-400"
                    placeholder="Add a note about your progress..."
                  />
                </div>
              </div>
            )}

            {/* Task Timeline */}
            {selectedTask.taskUpdates && selectedTask.taskUpdates.length > 0 && (
              <div className="border-t border-slate-200 pt-4">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">Task Timeline</h4>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {selectedTask.taskUpdates
                    .slice()
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((update, idx) => (
                      <div key={idx} className="flex gap-3 text-xs">
                        <div className="flex-shrink-0 w-2 h-2 mt-1.5 rounded-full bg-blue-600" />
                        <div className="flex-1 bg-slate-50 rounded-lg p-2.5">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-slate-800">{update.status.replace('_', ' ')}</span>
                            <span className="text-[10px] text-slate-500">
                              {new Date(update.createdAt).toLocaleString()}
                            </span>
                          </div>
                          {update.remark && <p className="text-slate-600 text-[10px] mb-1">{update.remark}</p>}
                          {update.progress !== undefined && (
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-slate-200 rounded-full h-1.5">
                                <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${update.progress}%` }} />
                              </div>
                              <span className="text-[10px] font-bold text-slate-700">{update.progress}%</span>
                            </div>
                          )}
                          {update.updatedBy && (
                            <p className="text-[10px] text-slate-500 mt-1">
                              By: {update.updatedBy.firstName} {update.updatedBy.lastName}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t border-slate-200">
              <button
                onClick={() => {
                  setShowActionModal(false);
                  setSelectedTask(null);
                  setActionType(null);
                }}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleAction}
                disabled={submitting}
                className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-2 ${
                  actionType === 'reject'
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : actionType === 'hold'
                    ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {submitting ? (
                  <>
                    <GoogleIcon name="progress_activity" size={14} className="animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <GoogleIcon name="check" size={14} />
                    {actionType === 'hold'
                      ? 'Submit Hold'
                      : actionType === 'reject'
                      ? 'Submit Rejection'
                      : actionType === 'complete'
                      ? 'Submit Completion'
                      : actionType === 'pauseSession'
                      ? 'Pause Session'
                      : actionType === 'progress'
                      ? 'Update Progress'
                      : actionType === 'updateStatus'
                      ? 'Confirm Update'
                      : 'Confirm'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}