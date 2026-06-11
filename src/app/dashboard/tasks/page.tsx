'use client';

import React, { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { useAuthStore } from '../../../store/authStore';
import { Plus, Check, X, Loader2, ArrowRight, Calendar, AlertCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';

interface TaskProfile {
  _id: string;
  title: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High';
  status: 'Todo' | 'In_Progress' | 'In_Review' | 'Completed';
  progress: number;
  dueDate: string;
  assignedTo?: {
    _id: string;
    firstName: string;
    lastName: string;
    department: string;
  };
  assignedBy: {
    firstName: string;
    lastName: string;
  };
  department?: string;
}

export default function TasksPage() {
  const { user } = useAuthStore();
  const [tasks, setTasks] = useState<TaskProfile[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [hotels, setHotels] = useState<any[]>([]);
  const [selectedHotelId, setSelectedHotelId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskProfile | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const { register, handleSubmit, reset } = useForm();
  const { register: registerUpdate, handleSubmit: handleSubmitUpdate, reset: resetUpdate } = useForm();

  const fetchTasks = async () => {
    try {
      const res = await api.get('/tasks');
      setTasks(res.data.tasks);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await api.get('/employees');
      setEmployees(res.data.employees);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchTasks();
    if (user?.role !== 'EMPLOYEE') {
      fetchEmployees();
    }
    if (user?.role === 'ROOT_ADMIN') {
      const fetchHotels = async () => {
        try {
          const res = await api.get('/hotels');
          setHotels(res.data.hotels || []);
        } catch (err) {
          console.error('Failed to load hotels list', err);
        }
      };
      fetchHotels();
    }
  }, [user]);

  const handleOpenCreate = () => {
    reset({
      title: '',
      description: '',
      assignedTo: user?.role === 'EMPLOYEE' ? user.id : '',
      priority: 'Medium',
      dueDate: new Date().toISOString().split('T')[0],
      department: '',
      hotelId: '',
    });
    setSelectedHotelId('');
    setCreateModalOpen(true);
  };

  const handleOpenUpdate = (task: TaskProfile) => {
    setSelectedTask(task);
    resetUpdate({
      status: task.status,
      progress: task.progress,
    });
    setUpdateModalOpen(true);
  };

  const onSubmitCreate = async (values: any) => {
    setActionLoading(true);
    try {
      if (!values.assignedTo && !values.department && user?.role !== 'EMPLOYEE') {
        alert('Please select an employee OR specify a target department.');
        setActionLoading(false);
        return;
      }
      await api.post('/tasks', values);
      setCreateModalOpen(false);
      fetchTasks();
    } catch (err: any) {
      alert(err.message || 'Task creation failed');
    } finally {
      setActionLoading(false);
    }
  };

  const onSubmitUpdate = async (values: any) => {
    if (!selectedTask) return;
    setActionLoading(true);
    try {
      await api.put(`/tasks/${selectedTask._id}`, {
        status: values.status,
        progress: Number(values.progress),
      });
      setUpdateModalOpen(false);
      fetchTasks();
    } catch (err: any) {
      alert(err.message || 'Task update failed');
    } finally {
      setActionLoading(false);
    }
  };

  const columns: { title: string; status: TaskProfile['status'] }[] = [
    { title: 'Todo', status: 'Todo' },
    { title: 'In Progress', status: 'In_Progress' },
    { title: 'In Review', status: 'In_Review' },
    { title: 'Completed', status: 'Completed' },
  ];

  const getPriorityColor = (p: string) => {
    if (p === 'High') return 'bg-red-500/10 text-red-400 border-red-500/20';
    if (p === 'Medium') return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
  };

  const canCreate = true;

  const filteredEmployees = user?.role === 'ROOT_ADMIN' 
    ? employees.filter(emp => {
        const empHotelId = emp.hotel?._id || emp.hotel;
        return empHotelId === selectedHotelId;
      })
    : employees;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-white">Task Tracker</h1>
          <p className="text-slate-400 text-xs mt-1">Assign tasks and track shift completions.</p>
        </div>
        {canCreate && (
          <button
            onClick={handleOpenCreate}
            className="bg-gold hover:bg-gold-light text-slate-dark font-bold px-4 py-2.5 rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus size={16} />
            Assign Task
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[30vh]">
          <div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {columns.map((col) => {
            const colTasks = tasks.filter((t) => t.status === col.status);
            return (
              <div key={col.status} className="bg-slate-900/40 rounded-xl p-4 border border-slate-800/80 flex flex-col h-[70vh]">
                <div className="flex justify-between items-center mb-4">
                  <span className="font-bold text-xs text-white uppercase tracking-wider">{col.title}</span>
                  <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded text-[10px] font-bold">
                    {colTasks.length}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  {colTasks.map((task) => (
                    <div
                      key={task._id}
                      onClick={() => handleOpenUpdate(task)}
                      className="bg-card-dark border border-slate-800/60 rounded-lg p-4 hover:border-gold/30 transition-all cursor-pointer space-y-3"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </span>
                        <span className="text-slate-500 font-mono text-[9px] flex items-center gap-1">
                          <Calendar size={10} />
                          {new Date(task.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </span>
                      </div>

                      <h4 className="font-semibold text-xs text-slate-200 line-clamp-1">{task.title}</h4>
                      <p className="text-[10px] text-slate-500 line-clamp-2">{task.description}</p>

                      {/* Progress bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[9px] text-slate-400">
                          <span>Progress</span>
                          <span>{task.progress}%</span>
                        </div>
                        <div className="w-full h-1 bg-slate-950 rounded-full overflow-hidden">
                          <div className="h-full bg-gold" style={{ width: `${task.progress}%` }} />
                        </div>
                      </div>

                      {/* Assignee */}
                      <div className="pt-2 border-t border-slate-800/40 flex justify-between items-center text-[10px]">
                        <span className="text-slate-500">Assignee:</span>
                        <span className="text-slate-300 font-medium text-right truncate max-w-[120px]">
                          {task.assignedTo 
                            ? `${task.assignedTo.firstName} ${task.assignedTo.lastName}` 
                            : task.department 
                              ? `${task.department} Dept` 
                              : 'All Hotel Staff'}
                        </span>
                      </div>
                    </div>
                  ))}

                  {colTasks.length === 0 && (
                    <div className="text-center py-8 text-slate-600 text-[11px] border border-dashed border-slate-800/60 rounded-lg">
                      No tasks
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card-dark border border-gold/20 rounded-xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-white text-sm">Assign New Shift Task</h3>
              <button onClick={() => setCreateModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmitCreate)} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider">Task Title</label>
                <input
                  type="text"
                  required
                  className="w-full bg-slate-950/60 border border-slate-800 rounded p-2 text-white"
                  {...register('title')}
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider">Description</label>
                <textarea
                  required
                  rows={3}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded p-2 text-white resize-none"
                  {...register('description')}
                />
              </div>

              {user?.role === 'ROOT_ADMIN' && (
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider">Target Hotel / Property</label>
                  <select
                    required
                    className="w-full bg-slate-950/60 border border-slate-800 rounded p-2 text-white cursor-pointer"
                    {...register('hotelId')}
                    onChange={(e) => setSelectedHotelId(e.target.value)}
                  >
                    <option value="">Select Property...</option>
                    {hotels.map((h: any) => (
                      <option key={h._id} value={h._id}>
                        {h.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {user?.role === 'EMPLOYEE' ? (
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider">Assign To</label>
                  <input
                    type="text"
                    disabled
                    value={`${user?.firstName} ${user?.lastName} (Self)`}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded p-2 text-white disabled:opacity-60"
                  />
                  <input type="hidden" value={user?.id} {...register('assignedTo')} />
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider">Assign To Employee (Optional)</label>
                    <select
                      className="w-full bg-slate-950/60 border border-slate-800 rounded p-2 text-white cursor-pointer"
                      {...register('assignedTo')}
                    >
                      <option value="">Select Staff...</option>
                      {user?.id && (
                        <option value={user.id}>
                          {user.firstName} {user.lastName} (Assign to Self)
                        </option>
                      )}
                      {filteredEmployees.map((emp) => (
                        emp._id !== user?.id && (
                          <option key={emp._id} value={emp._id}>
                            {emp.firstName} {emp.lastName} ({emp.department || 'Operations'})
                          </option>
                        )
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider">Assign To Department (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Front Office, Kitchen, Housekeeping"
                      className="w-full bg-slate-950/60 border border-slate-800 rounded p-2 text-white"
                      {...register('department')}
                    />
                  </div>
                </>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider">Priority</label>
                  <select
                    className="w-full bg-slate-950/60 border border-slate-800 rounded p-2 text-white"
                    {...register('priority')}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider">Due Date</label>
                  <input
                    type="date"
                    required
                    className="w-full bg-slate-950/60 border border-slate-800 rounded p-2 text-white"
                    {...register('dueDate')}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full bg-gold hover:bg-gold-light text-slate-dark font-bold py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Confirm Task Assignment
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Update Progress/Status Modal */}
      {updateModalOpen && selectedTask && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card-dark border border-gold/20 rounded-xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-white text-sm">Update Task Progress</h3>
              <button onClick={() => setUpdateModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="text-xs border-b border-slate-800/60 pb-3">
              <h4 className="font-bold text-slate-200">{selectedTask.title}</h4>
              <p className="text-slate-500 mt-1">{selectedTask.description}</p>
            </div>

            <form onSubmit={handleSubmitUpdate(onSubmitUpdate)} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider">Status</label>
                <select
                  className="w-full bg-slate-950/60 border border-slate-800 rounded p-2 text-white"
                  {...registerUpdate('status')}
                >
                  <option value="Todo">Todo</option>
                  <option value="In_Progress">In Progress</option>
                  <option value="In_Review">In Review</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              <div>
                <div className="flex justify-between text-slate-400 font-semibold mb-1 uppercase tracking-wider">
                  <span>Completion Progress</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="10"
                  className="w-full accent-gold bg-slate-950 border border-slate-800 rounded py-1.5"
                  {...registerUpdate('progress')}
                />
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full bg-gold hover:bg-gold-light text-slate-dark font-bold py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Save Task Progress
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
