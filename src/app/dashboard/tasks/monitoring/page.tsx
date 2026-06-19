'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import GoogleIcon from '@/components/GoogleIcon';
import { useRouter } from 'next/navigation';

interface TaskUpdate {
  status: string;
  description?: string;
  reason?: string;
  photoUrl?: string;
  updatedBy: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
  updatedByName: string;
  department: string;
  designation: string;
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
  department?: string;
  assignedTo?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    department: string;
    designation: string;
    photoUrl?: string;
    employeeId?: string;
  }[];
  assignedBy: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
  taskUpdates: TaskUpdate[];
  latestRemark?: string;
  holdReason?: string;
  completionRemark?: string;
  evidenceUrl?: string;
  responses: any[];
  createdAt: string;
  updatedAt: string;
  latestUpdate?: TaskUpdate | null;
}

export default function TaskMonitoringPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    total: 0,
    todo: 0,
    inProgress: 0,
    hold: 0,
    completed: 0,
    rejected: 0,
  });
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showUpdatesDrawer, setShowUpdatesDrawer] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const fetchMonitoringData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/tasks/monitoring/dashboard');
      setTasks(res.data.tasks || []);
      setSummary(res.data.summary || summary);
    } catch (err) {
      console.error('Failed to fetch monitoring data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'ROOT_ADMIN') {
      fetchMonitoringData();
    }
  }, [user, fetchMonitoringData]);

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

        // Join Root Admin Room to receive real-time task updates
        socketConn.emit('join_room', { role: 'ROOT_ADMIN' });

        const handleTaskUpdate = (data: { taskId: string; task: Task }) => {
          setTasks(prev => prev.map(t => t._id === data.taskId ? data.task : t));
          if (selectedTask && selectedTask._id === data.taskId) {
            setSelectedTask(data.task);
          }
        };

        const handleTaskCreated = (data: { task: Task }) => {
          setTasks(prev => {
            if (prev.some(t => t._id === data.task._id)) return prev;
            return [data.task, ...prev];
          });
        };

        socketConn.on('task_status_updated', handleTaskUpdate);
        socketConn.on('task_created', handleTaskCreated);
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Urgent': return 'bg-red-100 text-red-700 border-red-200';
      case 'High': return 'bg-orange-100 text-orange-700 border-red-200';
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

  const filteredTasks = tasks.filter(task => {
    if (filterStatus !== 'all' && task.status !== filterStatus) return false;
    if (searchQuery) {
      const search = searchQuery.toLowerCase();
      return (
        task.title.toLowerCase().includes(search) ||
        task.description.toLowerCase().includes(search) ||
        task.assignedTo?.some(a => `${a.firstName} ${a.lastName}`.toLowerCase().includes(search))
      );
    }
    return true;
  });

  const localSummary = React.useMemo(() => {
    let total = tasks.length;
    let todo = 0;
    let inProgress = 0;
    let hold = 0;
    let completed = 0;
    let rejected = 0;

    tasks.forEach((t) => {
      const s = t.status.toLowerCase();
      if (s === 'pending' || s === 'to_do' || s === 'accepted') {
        todo++;
      } else if (s === 'in_progress' || s === 'inprogress') {
        inProgress++;
      } else if (s === 'on_hold' || s === 'onhold' || s === 'hold') {
        hold++;
      } else if (s === 'completed') {
        completed++;
      } else if (s === 'rejected') {
        rejected++;
      } else {
        todo++;
      }
    });

    return { total, todo, inProgress, hold, completed, rejected };
  }, [tasks]);

  const getTasksForColumn = (column: string) => {
    return filteredTasks.filter((t) => {
      const s = t.status.toLowerCase();
      if (column === 'todo') {
        return s === 'pending' || s === 'to_do' || s === 'accepted' || s === 'rejected';
      }
      if (column === 'inProgress') {
        return s === 'in_progress' || s === 'inprogress';
      }
      if (column === 'hold') {
        return s === 'on_hold' || s === 'onhold' || s === 'hold';
      }
      if (column === 'completed') {
        return s === 'completed';
      }
      return false;
    });
  };

  const renderColumn = (title: string, columnKey: string, badgeBg: string, textCol: string) => {
    const columnTasks = getTasksForColumn(columnKey);
    return (
      <div className="flex-1 bg-slate-50/40 border border-slate-200 p-4 rounded-2xl flex flex-col min-h-[500px]">
        {/* Column Header */}
        <div className="flex justify-between items-center mb-4 border-b border-slate-200 pb-2">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${badgeBg}`} />
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">{title}</h3>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${badgeBg} ${textCol}`}>
            {columnTasks.length}
          </span>
        </div>

        {/* Task Cards Container */}
        <div className="space-y-3 overflow-y-auto max-h-[70vh] flex-1 pr-1 scrollbar-thin">
          {columnTasks.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl bg-white/40">
              <p className="text-slate-400 text-[10px] font-semibold uppercase">No Tasks</p>
            </div>
          ) : (
            columnTasks.map((task) => {
              const assignee = task.assignedTo && task.assignedTo.length > 0 ? task.assignedTo[0] : null;
              const hasPhoto = task.latestUpdate?.photoUrl || task.evidenceUrl;
              return (
                <div
                  key={task._id}
                  onClick={() => {
                    setSelectedTask(task);
                    setShowDetailModal(true);
                  }}
                  className="bg-white border border-slate-200 hover:border-blue-400/60 rounded-xl p-3.5 shadow-xs hover:shadow-md transition-all cursor-pointer space-y-3 relative group"
                >
                  {/* Priority & Status Badges */}
                  <div className="flex justify-between items-start">
                    <div className="flex gap-1.5 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold border ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                      {getStatusBadge(task.status)}
                    </div>
                    <span className="text-[9px] text-slate-400 font-mono font-medium">
                      {task.latestUpdate ? `Updated: ${new Date(task.latestUpdate.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : 'Created'}
                    </span>
                  </div>

                  {/* Task Title & Details */}
                  <div>
                    <h4 className="font-bold text-slate-800 text-xs line-clamp-1 group-hover:text-blue-600 transition-colors" title={task.title}>{task.title}</h4>
                    <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">{task.description}</p>
                  </div>

                  {/* Assignee Details */}
                  {assignee ? (
                    <div className="flex items-center gap-2 border-t border-slate-100 pt-2.5">
                      {assignee.photoUrl ? (
                        <img src={assignee.photoUrl} alt="" className="w-6 h-6 rounded-full object-cover border border-slate-100" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center border border-slate-200">
                          <span className="text-[9px] font-bold text-blue-700">
                            {assignee.firstName[0]}{assignee.lastName[0]}
                          </span>
                        </div>
                      )}
                      <div className="truncate flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-[10px] font-bold text-slate-700 truncate">{assignee.firstName} {assignee.lastName}</p>
                          {assignee.employeeId && (
                            <span className="text-[8px] font-mono font-bold bg-slate-100 border border-slate-200 text-slate-500 px-1 rounded">
                              {assignee.employeeId}
                            </span>
                          )}
                        </div>
                        <p className="text-[9px] text-slate-500 truncate">{task.department || assignee.department} • {assignee.designation}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 border-t border-slate-100 pt-2.5">
                      <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                        <GoogleIcon name="person" size={12} className="text-slate-400" />
                      </div>
                      <span className="text-[10px] text-slate-400 italic">Unassigned</span>
                    </div>
                  )}

                  {/* Latest Update Message */}
                  {(task.latestUpdate || task.latestRemark) && (
                    <div className="bg-slate-50 rounded-lg p-2 text-[10px] text-slate-600 space-y-1">
                      <p className="font-semibold text-[9px] uppercase tracking-wide text-slate-500 font-bold">Latest Remarks:</p>
                      <p className="line-clamp-2 italic">{task.latestUpdate?.description || task.latestUpdate?.reason || task.latestRemark || 'Status changed'}</p>
                    </div>
                  )}

                  {/* Photo Evidence Preview */}
                  {hasPhoto && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        setLightboxUrl(hasPhoto);
                      }}
                      className="relative rounded-lg overflow-hidden border border-slate-150 group/img max-h-24"
                    >
                      <img src={hasPhoto} alt="Evidence" className="w-full h-24 object-cover hover:scale-105 transition-transform" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity">
                        <GoogleIcon name="zoom_in" className="text-white" size={16} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  const statsCards = [
    { label: 'Total Tasks', value: localSummary.total, icon: 'assignment', color: 'bg-blue-500' },
    { label: 'To Do', value: localSummary.todo, icon: 'pending', color: 'bg-slate-500' },
    { label: 'In Progress', value: localSummary.inProgress, icon: 'progress_activity', color: 'bg-purple-500' },
    { label: 'On Hold', value: localSummary.hold, icon: 'pause_circle', color: 'bg-yellow-500' },
    { label: 'Completed', value: localSummary.completed, icon: 'check_circle', color: 'bg-green-500' },
    { label: 'Rejected', value: localSummary.rejected, icon: 'cancel', color: 'bg-red-500' },
  ];

  if (user?.role !== 'ROOT_ADMIN') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <GoogleIcon name="lock" className="text-slate-300 mx-auto" size={48} />
          <p className="text-slate-500 text-sm mt-3">Access Denied</p>
          <p className="text-slate-400 text-xs mt-1">Only Root Admin can access this page</p>
        </div>
      </div>
    );
  }

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
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Task Monitoring Dashboard</h1>
        <p className="text-slate-500 text-xs mt-1">Real-time overview of all tasks across the organization</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statsCards.map((stat, idx) => (
          <div key={idx} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className={`p-2 rounded-lg ${stat.color} bg-opacity-10`}>
                <GoogleIcon name={stat.icon} size={20} className={stat.color.replace('bg-', 'text-')} />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <div className="relative">
              <GoogleIcon name="search" className="absolute left-3 top-2.5 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Search by task title, description, or employee name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-400 cursor-pointer"
          >
            <option value="all">All Status</option>
            <option value="To_Do">To Do</option>
            <option value="In_Progress">In Progress</option>
            <option value="On_Hold">On Hold</option>
            <option value="Completed">Completed</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Tasks Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {renderColumn('To Do', 'todo', 'bg-slate-400', 'text-slate-700')}
        {renderColumn('In Progress', 'inProgress', 'bg-blue-500', 'text-white')}
        {renderColumn('Hold', 'hold', 'bg-amber-500', 'text-white')}
        {renderColumn('Completed', 'completed', 'bg-emerald-500', 'text-white')}
      </div>

      {/* Task Detail Modal */}
      {showDetailModal && selectedTask && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-4xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b border-slate-200 pb-3">
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-900 pr-8">{selectedTask.title}</h3>
                <p className="text-xs text-slate-500 mt-1">{selectedTask.description}</p>
              </div>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedTask(null);
                }}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <GoogleIcon name="close" size={20} />
              </button>
            </div>

            {/* Task Info Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-slate-500 font-semibold block text-[10px] uppercase">Priority</span>
                <span className={`inline-block mt-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border ${getPriorityColor(selectedTask.priority)}`}>
                  {selectedTask.priority}
                </span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold block text-[10px] uppercase">Status</span>
                <div className="mt-1">{getStatusBadge(selectedTask.status)}</div>
              </div>
              <div>
                <span className="text-slate-500 font-semibold block text-[10px] uppercase">Progress</span>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 bg-slate-100 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${selectedTask.progress}%` }} />
                  </div>
                  <span className="text-[10px] font-bold text-slate-700">{selectedTask.progress}%</span>
                </div>
              </div>
              <div>
                <span className="text-slate-500 font-semibold block text-[10px] uppercase">Due Date</span>
                <span className="text-slate-800 font-bold text-sm mt-1 block">
                  {new Date(selectedTask.dueDate).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Assigned Employees */}
            {selectedTask.assignedTo && selectedTask.assignedTo.length > 0 && (
              <div className="border-t border-slate-200 pt-4">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">Assigned To</h4>
                <div className="space-y-2">
                  {selectedTask.assignedTo.map((assignee, idx) => (
                    <div key={idx} className="flex items-center gap-3 bg-slate-50 rounded-lg p-2.5">
                      {assignee.photoUrl ? (
                        <img src={assignee.photoUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-sm font-bold text-blue-700">
                            {assignee.firstName[0]}{assignee.lastName[0]}
                          </span>
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-bold text-slate-900">{assignee.firstName} {assignee.lastName}</p>
                        <p className="text-[10px] text-slate-500">{assignee.department} • {assignee.designation}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Task Timeline */}
            {selectedTask.taskUpdates && selectedTask.taskUpdates.length > 0 && (
              <div className="border-t border-slate-200 pt-4">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">Task Timeline</h4>
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {selectedTask.taskUpdates
                    .slice()
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((update, idx) => (
                      <div key={idx} className="flex gap-3 text-xs">
                        <div className="flex-shrink-0 w-2 h-2 mt-1.5 rounded-full bg-blue-600" />
                        <div className="flex-1 bg-slate-50 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-slate-800">{update.status.replace('_', ' ')}</span>
                            <span className="text-[10px] text-slate-500">
                              {new Date(update.createdAt).toLocaleString()}
                            </span>
                          </div>
                          {(update.description || update.reason) && <p className="text-slate-600 text-[10px] mb-1">{update.description || update.reason}</p>}
                          {update.photoUrl && (
                            <div className="mt-2">
                              <img src={update.photoUrl} alt="Evidence" className="w-24 h-24 object-cover rounded-lg border border-slate-200" />
                            </div>
                          )}
                          {update.updatedBy && (
                            <p className="text-[10px] text-slate-500 mt-1">
                              By: {update.updatedBy.firstName} {update.updatedBy.lastName} ({update.updatedBy.role})
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Task History */}
            {selectedTask.responses && selectedTask.responses.length > 0 && (
              <div className="border-t border-slate-200 pt-4">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">Response History</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {selectedTask.responses
                    .slice()
                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                    .map((resp, idx) => (
                      <div key={idx} className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-slate-800">User ID: {resp.userId}</span>
                          <span className="text-[10px] text-slate-500">{new Date(resp.timestamp).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            resp.action === 'accepted' ? 'bg-green-100 text-green-700' :
                            resp.action === 'rejected' ? 'bg-red-100 text-red-700' :
                            resp.action === 'held' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {resp.action.toUpperCase()}
                          </span>
                          {resp.reason && <span className="text-slate-600 text-[10px]">Reason: {resp.reason}</span>}
                        </div>
                        {resp.evidenceUrl && (
                          <img src={resp.evidenceUrl} alt="Evidence" className="mt-2 w-20 h-20 object-cover rounded border border-slate-200" />
                        )}
                      </div>
                    ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4 border-t border-slate-200">
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedTask(null);
                }}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxUrl && (
        <div className="fixed inset-0 bg-black/90 z-[9999] flex items-center justify-center p-4" onClick={() => setLightboxUrl(null)}>
          <div className="relative max-w-4xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setLightboxUrl(null)}
              className="absolute -top-10 right-0 text-white bg-black/50 p-2 rounded-full hover:bg-black/80 transition-colors cursor-pointer z-10 flex items-center justify-center"
            >
              <GoogleIcon name="close" size={24} />
            </button>
            <img src={lightboxUrl} alt="Full evidence preview" className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl" />
          </div>
        </div>
      )}
    </div>
  );
}