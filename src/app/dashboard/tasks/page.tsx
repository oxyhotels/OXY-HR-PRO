'use client';

import React, { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { useAuthStore } from '../../../store/authStore';
import {
  Plus, Check, X, Loader2, ArrowRight, Calendar, AlertCircle, ShieldAlert,
  Users, Award, TrendingUp, Bot, Send, Smartphone, Search, Flame, Zap,
  RotateCcw, MapPin, AlertTriangle, Activity, FileSpreadsheet, Download,
  CloudOff, RefreshCw, CheckSquare, Clock, ShieldCheck, HelpCircle, Trophy
} from 'lucide-react';
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
    xp?: number;
    level?: number;
    accountabilityIndex?: number;
  };
  assignedBy: {
    firstName: string;
    lastName: string;
  };
  department?: string;
  // Advanced fields
  slaDuration?: number;
  slaStart?: string;
  slaBreached?: boolean;
  healthScore?: number;
  reworkCount?: number;
  escalationLevel?: number;
  rca?: {
    reason: string;
    category: string;
    loggedAt: string;
  };
  businessImpact?: {
    guestSatisfaction: number;
    revenueImpact: number;
    complianceImpact: number;
  };
  geoVerified?: {
    verified: boolean;
    lat: number;
    lng: number;
    selfieUrl: string;
    isSuspicious: boolean;
    fraudFlags: string[];
  };
}

interface IncidentProfile {
  _id: string;
  title: string;
  description: string;
  category: 'Fire' | 'Guest_Injury' | 'Security_Threat' | 'Water_Leakage' | 'Electrical_Failure';
  status: 'Active' | 'Under_Control' | 'Resolved';
  timeline: { message: string; timestamp: string }[];
  recoverySteps: string[];
  loggedBy: { firstName: string; lastName: string };
  createdAt: string;
}

interface HandoverProfile {
  _id: string;
  outgoingStaff: { firstName: string; lastName: string; department: string };
  incomingStaff: { firstName: string; lastName: string; department: string };
  tasks: { title: string; status: string; priority: string }[];
  status: 'Pending' | 'Accepted';
  notes?: string;
  createdAt: string;
}

export default function IntelligentTasksPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'board' | 'war-room' | 'handover' | 'gamification' | 'ai-copilot'>('board');
  const [tasks, setTasks] = useState<TaskProfile[]>([]);
  const [mobileSubTab, setMobileSubTab] = useState<'pending' | 'completed' | 'overdue'>('pending');
  const [employees, setEmployees] = useState<any[]>([]);
  const [hotels, setHotels] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<IncidentProfile[]>([]);
  const [handovers, setHandovers] = useState<HandoverProfile[]>([]);
  const [metrics, setMetrics] = useState<any>({ employees: [], managers: [], hotels: [] });

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [timelineModalOpen, setTimelineModalOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [incidentModalOpen, setIncidentModalOpen] = useState(false);
  const [handoverModalOpen, setHandoverModalOpen] = useState(false);
  const [rcaModalOpen, setRcaModalOpen] = useState(false);
  
  const [selectedTask, setSelectedTask] = useState<TaskProfile | null>(null);
  const [selectedHotelId, setSelectedHotelId] = useState<string>('');

  // Offline capability states
  const [isOffline, setIsOffline] = useState(false);
  const [offlineQueue, setOfflineQueue] = useState<any[]>([]);
  const [syncing, setSyncing] = useState(false);

  // QR Simulator states
  const [qrRoomCode, setQrRoomCode] = useState('');
  const [roomHistory, setRoomHistory] = useState<string[]>([]);
  const [qrMessage, setQrMessage] = useState('');

  // AI Copilot state
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'bot'; text: string; context?: any }>>([
    { sender: 'bot', text: 'Hello! I am your Intelligent Operations Copilot. How can I help you today?' }
  ]);
  const [chatInput, setChatInput] = useState('');

  // Form Hooks
  const { register, handleSubmit, reset } = useForm();
  const { register: registerUpdate, handleSubmit: handleSubmitUpdate, reset: resetUpdate } = useForm();
  const { register: registerIncident, handleSubmit: handleSubmitIncident, reset: resetIncident } = useForm();
  const { register: registerHandover, handleSubmit: handleSubmitHandover, reset: resetHandover } = useForm();
  const { register: registerRca, handleSubmit: handleSubmitRca, reset: resetRca } = useForm();

  // Load and refresh core data
  const fetchData = async () => {
    try {
      const resTasks = await api.get('/tasks');
      setTasks(resTasks.data.tasks);

      if (user?.role !== 'EMPLOYEE') {
        const resEmployees = await api.get('/employees');
        setEmployees(resEmployees.data.employees);
      }

      if (user?.role === 'ROOT_ADMIN') {
        const resHotels = await api.get('/hotels');
        setHotels(resHotels.data.hotels || []);
      }

      const resIncidents = await api.get('/intelligent-ops/incidents');
      setIncidents(resIncidents.data.incidents || []);

      const resHandovers = await api.get('/intelligent-ops/handover');
      setHandovers(resHandovers.data.handovers || []);

      const resMetrics = await api.get('/intelligent-ops/metrics');
      setMetrics(resMetrics.data || { employees: [], managers: [], hotels: [] });

    } catch (err) {
      console.error('Data loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  // Offline sync executor
  const triggerSync = async () => {
    if (offlineQueue.length === 0) return;
    setSyncing(true);
    try {
      await api.post('/intelligent-ops/sync', { updates: offlineQueue });
      setOfflineQueue([]);
      alert('Offline updates synchronized successfully!');
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Sync failed. Please try again.');
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    if (!isOffline && offlineQueue.length > 0) {
      triggerSync();
    }
  }, [isOffline]);

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

  // Create Task
  const onSubmitCreate = async (values: any) => {
    setActionLoading(true);
    try {
      if (!values.assignedTo && !values.department && user?.role !== 'EMPLOYEE') {
        alert('Please assign to a staff member or department.');
        setActionLoading(false);
        return;
      }
      const res = await api.post('/tasks', values);
      if (res.data.workloadWarning) {
        alert(`Warning: ${res.data.workloadWarning.message}\nRecommended alternatives:\n${res.data.workloadWarning.alternatives.map((a: any) => `- ${a.name} (Active tasks: ${a.workload})`).join('\n')}`);
      }
      setCreateModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Task creation failed');
    } finally {
      setActionLoading(false);
    }
  };

  // Open task update
  const handleOpenUpdate = (task: TaskProfile) => {
    setSelectedTask(task);
    resetUpdate({
      status: task.status,
      progress: task.progress,
      lat: '',
      lng: '',
      selfieUrl: '',
    });
    setUpdateModalOpen(true);
  };

  // Submit task updates (handles local offline queueing or direct online updates)
  const onSubmitUpdate = async (values: any) => {
    if (!selectedTask) return;

    // SLA Overdue check for RCA trigger
    const isOverdue = selectedTask.dueDate && new Date(selectedTask.dueDate).getTime() < new Date().getTime();
    const isSlaBreached = selectedTask.slaStart && selectedTask.slaDuration && 
      (new Date().getTime() - new Date(selectedTask.slaStart).getTime()) / 60000 > selectedTask.slaDuration;

    if (values.status === 'Completed' && (isOverdue || isSlaBreached) && !selectedTask.rca) {
      // Prompt for RCA
      resetRca({
        rcaReason: '',
        rcaCategory: 'Staff Issue'
      });
      setUpdateModalOpen(false);
      setRcaModalOpen(true);
      return;
    }

    if (isOffline) {
      // Cache update in local queue
      const newUpdate = {
        taskId: selectedTask._id,
        status: values.status,
        progress: Number(values.progress),
        lat: Number(values.lat) || 25.79065, // simulated Florida geofence lat
        lng: Number(values.lng) || -80.130045, // simulated Florida geofence lng
        selfieUrl: values.selfieUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80', // placeholder selfie
      };
      setOfflineQueue([...offlineQueue, newUpdate]);
      
      // Update UI state locally immediately
      setTasks(tasks.map(t => t._id === selectedTask._id ? { ...t, status: values.status, progress: Number(values.progress) } : t));
      setUpdateModalOpen(false);
      alert('Offline mode: Changes queued locally and will sync when reconnected.');
      return;
    }

    setActionLoading(true);
    try {
      await api.put(`/tasks/${selectedTask._id}`, {
        status: values.status,
        progress: Number(values.progress),
        lat: Number(values.lat) || 25.79065,
        lng: Number(values.lng) || -80.130045,
        selfieUrl: values.selfieUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80',
      });
      setUpdateModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Task update failed');
    } finally {
      setActionLoading(false);
    }
  };

  // Submit RCA form
  const onSubmitRca = async (values: any) => {
    if (!selectedTask) return;
    setActionLoading(true);
    try {
      await api.put(`/tasks/${selectedTask._id}`, {
        status: 'Completed',
        progress: 100,
        rcaReason: values.rcaReason,
        rcaCategory: values.rcaCategory,
        lat: 25.79065,
        lng: -80.130045,
        selfieUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80',
      });
      setRcaModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Task update with RCA failed');
    } finally {
      setActionLoading(false);
    }
  };

  // Submit Emergency Incident
  const onSubmitIncident = async (values: any) => {
    setActionLoading(true);
    try {
      await api.post('/intelligent-ops/incidents', {
        title: values.title,
        description: values.description,
        category: values.category,
        recoverySteps: values.recoverySteps.split(',').map((s: string) => s.trim()),
      });
      setIncidentModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to file emergency report');
    } finally {
      setActionLoading(false);
    }
  };

  // Submit Shift Handover
  const onSubmitHandover = async (values: any) => {
    setActionLoading(true);
    try {
      const selectedTasks = tasks
        .filter(t => t.assignedTo?._id === user?.id && t.status !== 'Completed')
        .map(t => t._id);

      await api.post('/intelligent-ops/handover', {
        incomingStaffId: values.incomingStaffId,
        taskIds: selectedTasks,
        notes: values.notes,
      });
      setHandoverModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Shift Handover failed');
    } finally {
      setActionLoading(false);
    }
  };

  // Accept Shift Handover
  const handleAcceptHandover = async (id: string) => {
    setActionLoading(true);
    try {
      await api.post(`/intelligent-ops/handover/${id}/accept`, {});
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to accept handover');
    } finally {
      setActionLoading(false);
    }
  };

  // QR Room Scanner Simulator
  const handleQRScan = () => {
    if (!qrRoomCode) return;
    const room = qrRoomCode.toUpperCase().trim();
    setRoomHistory([
      `08:30 AM - Room sanitization complete. Checked by Housekeeping.`,
      `11:15 AM - Minibar restocking reported. Complete.`,
      `02:45 PM - Guest complained about AC fan noise. Maintenance ticket logged.`
    ]);
    setQrMessage(`QR Code verified for Room ${room}. Previous history loaded below.`);
  };

  const handleQRCreateMaintenance = async () => {
    setActionLoading(true);
    try {
      await api.post('/tasks', {
        title: `Maintenance Request: Room ${qrRoomCode.toUpperCase()}`,
        description: 'Auto-triggered via QR Room Operations scanner. Please check AC/Plumbing.',
        priority: 'High',
        dueDate: new Date().toISOString().split('T')[0],
      });
      setQrModalOpen(false);
      alert(`Maintenance task for Room ${qrRoomCode.toUpperCase()} created and assigned!`);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'QR Task creation failed');
    } finally {
      setActionLoading(false);
    }
  };

  // AI Copilot Chat Submit
  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput;
    setChatMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    setChatInput('');

    try {
      const res = await api.post('/intelligent-ops/ai-copilot', { query: userMsg });
      setChatMessages(prev => [...prev, {
        sender: 'bot',
        text: res.data.reply,
        context: res.data.dataContext
      }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { sender: 'bot', text: 'Sorry, I failed to evaluate this query at the moment.' }]);
    }
  };

  // Quick Questions
  const handleQuickQuestion = async (q: string) => {
    setChatMessages(prev => [...prev, { sender: 'user', text: q }]);
    try {
      const res = await api.post('/intelligent-ops/ai-copilot', { query: q });
      setChatMessages(prev => [...prev, {
        sender: 'bot',
        text: res.data.reply,
        context: res.data.dataContext
      }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { sender: 'bot', text: 'Sorry, I failed to evaluate this query.' }]);
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

  return (
    <div className="space-y-6">
      
      {/* Platform Title Bar */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-card-dark border border-slate-800/80 p-6 rounded-2xl shadow-xl glass-panel relative overflow-hidden">
        {/* Background light glow */}
        <div className="absolute top-[-50px] right-[-50px] w-24 h-24 bg-gold/5 rounded-full blur-2xl pointer-events-none" />
        
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Enterprise War Room Active</span>
          </div>
          <h1 className="text-xl lg:text-2xl font-bold tracking-tight text-white">
            Intelligent Operations Center
          </h1>
          <p className="text-slate-400 text-xs font-medium">
            Predictive tracking, automated SLAs, capacity models, and gamified workflows.
          </p>
        </div>

        {/* Offline Toggle and Ops Indicators */}
        <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
          <div className="flex items-center gap-2 bg-slate-950/60 border border-slate-800 rounded-lg p-2">
            <Smartphone size={14} className="text-gold" />
            <button
              onClick={() => setQrModalOpen(true)}
              className="text-[10px] uppercase tracking-wider text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              Room QR Scanner
            </button>
          </div>

          <div className="flex items-center gap-3 bg-slate-950/60 border border-slate-800 rounded-lg p-2">
            <div className="flex items-center gap-1.5">
              {isOffline ? (
                <CloudOff size={14} className="text-red-400" />
              ) : (
                <Activity size={14} className="text-green-400" />
              )}
              <span className="text-[10px] uppercase tracking-wider text-slate-400">
                {isOffline ? 'Offline Mode' : 'Online Sync'}
              </span>
            </div>
            <button
              onClick={() => setIsOffline(!isOffline)}
              className={`px-2.5 py-1 rounded text-[10px] font-bold cursor-pointer transition-all ${
                isOffline ? 'bg-red-950/40 text-red-300 border border-red-500/20' : 'bg-green-950/40 text-green-300 border border-green-500/20'
              }`}
            >
              {isOffline ? 'Go Online' : 'Go Offline'}
            </button>
            {offlineQueue.length > 0 && (
              <span className="bg-amber-500 text-slate-dark text-[9px] px-1.5 py-0.5 rounded-full font-bold animate-pulse">
                {offlineQueue.length}
              </span>
            )}
          </div>
          
          <button
            onClick={() => handleOpenCreate()}
            className="bg-gold hover:bg-gold-light text-slate-dark font-extrabold px-4 py-2.5 rounded-lg text-xs flex items-center gap-1.5 transition-all shadow-md gold-glow cursor-pointer uppercase tracking-wider"
          >
            <Plus size={15} />
            Assign Tasks
          </button>
        </div>
      </div>

      {/* Primary Tab Navigation */}
      <div className="flex border-b border-slate-800 text-xs font-bold gap-1.5 scrollbar-none overflow-x-auto">
        {[
          { id: 'board', label: 'Operations Board', icon: CheckSquare },
          { id: 'war-room', label: 'War Room HUD', icon: ShieldAlert },
          { id: 'handover', label: 'Incident & Handovers', icon: Users },
          { id: 'gamification', label: 'Gamification & XP', icon: Award },
          { id: 'ai-copilot', label: 'AI Operations Copilot', icon: Bot },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 pb-3 px-4 border-b-2 transition-all cursor-pointer whitespace-nowrap uppercase tracking-wider text-[10px] ${
                isActive
                  ? 'border-gold text-white font-black'
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      
      {/* 1. OPERATIONS BOARD */}
      {activeTab === 'board' && (() => {
        const pendingTasks = tasks.filter((t) => t.status !== 'Completed');
        const completedTasks = tasks.filter((t) => t.status === 'Completed');
        const overdueTasks = tasks.filter((t) => {
          const isTaskOverdue = t.dueDate && new Date(t.dueDate).getTime() < new Date().getTime();
          return isTaskOverdue && t.status !== 'Completed';
        });
        const currentMobileTasks = mobileSubTab === 'pending' ? pendingTasks : mobileSubTab === 'completed' ? completedTasks : overdueTasks;

        return (
          <>
            {/* Desktop View */}
            <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {columns.map((col) => {
                const colTasks = tasks.filter((t) => t.status === col.status);
                return (
                  <div key={col.status} className="bg-slate-900/40 rounded-xl p-4 border border-slate-800/80 flex flex-col h-[70vh]">
                    <div className="flex justify-between items-center mb-4 border-b border-slate-800/60 pb-2">
                      <span className="font-extrabold text-xs text-white uppercase tracking-wider">{col.title}</span>
                      <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded text-[10px] font-bold">
                        {colTasks.length}
                      </span>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
                      {colTasks.map((task) => {
                        const isTaskOverdue = task.dueDate && new Date(task.dueDate).getTime() < new Date().getTime();
                        return (
                          <div
                            key={task._id}
                            onClick={() => handleOpenUpdate(task)}
                            className="bg-card-dark border border-slate-800/60 rounded-lg p-4 hover:border-gold/30 transition-all cursor-pointer space-y-3 relative overflow-hidden"
                          >
                            {/* SLA Breach Indicator */}
                            {task.slaBreached && (
                              <div className="absolute top-0 right-0 bg-red-600 text-white text-[8px] font-extrabold uppercase px-2 py-0.5 rounded-bl shadow">
                                SLA Breached
                              </div>
                            )}

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

                            {/* SLA Countdown Timer */}
                            {task.status === 'In_Progress' && task.slaStart && task.slaDuration && (
                              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                                <Clock size={11} className="text-gold" />
                                <span>SLA Target: {task.slaDuration}m</span>
                              </div>
                            )}

                            {/* Task Health Score */}
                            {task.healthScore !== undefined && (
                              <div className="flex justify-between items-center text-[10px]">
                                <span className="text-slate-500">Ops Health:</span>
                                <span className={`font-bold ${
                                  task.healthScore >= 80 ? 'text-green-400' : task.healthScore >= 60 ? 'text-amber-400' : 'text-red-400'
                                }`}>
                                  {task.healthScore}/100
                                </span>
                              </div>
                            )}

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

                            {/* Digital command timeline button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTask(task);
                                setTimelineModalOpen(true);
                              }}
                              className="w-full py-1 bg-slate-950/40 border border-slate-800 hover:border-gold/30 rounded text-[9px] font-bold text-slate-400 hover:text-white uppercase transition-all"
                            >
                              View Audit Timeline
                            </button>
                          </div>
                        );
                      })}

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

            {/* Mobile View */}
            <div className="md:hidden space-y-4">
              {/* Mobile Sub-tabs */}
              <div className="flex bg-slate-950/60 p-1 rounded-xl border border-slate-850 gap-1 shadow-inner">
                {[
                  { id: 'pending', label: 'Pending', count: pendingTasks.length },
                  { id: 'completed', label: 'Completed', count: completedTasks.length },
                  { id: 'overdue', label: 'Overdue', count: overdueTasks.length },
                ].map((subTab) => (
                  <button
                    key={subTab.id}
                    type="button"
                    onClick={() => setMobileSubTab(subTab.id as any)}
                    className={`flex-1 py-2.5 rounded-lg text-center font-bold text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer ${
                      mobileSubTab === subTab.id
                        ? 'bg-gold text-slate-dark shadow-md font-black'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {subTab.label}
                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-mono font-black ${
                      mobileSubTab === subTab.id ? 'bg-slate-dark text-gold' : 'bg-slate-850 text-slate-400'
                    }`}>
                      {subTab.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Task Cards */}
              <div className="space-y-3">
                {currentMobileTasks.map((task) => {
                  return (
                    <div
                      key={task._id}
                      onClick={() => handleOpenUpdate(task)}
                      className="bg-card-dark border border-slate-800/80 rounded-xl p-4 flex items-start gap-3 hover:border-gold/30 transition-all cursor-pointer relative overflow-hidden shadow-lg"
                    >
                      {/* SLA Breach Indicator */}
                      {task.slaBreached && (
                        <div className="absolute top-0 right-0 bg-red-650 text-white text-[8px] font-extrabold uppercase px-2 py-0.5 rounded-bl shadow">
                          SLA Breached
                        </div>
                      )}

                      {/* Quick Completion Checkbox / Modal Trigger */}
                      <div className="mt-0.5 flex-shrink-0">
                        <input
                          type="checkbox"
                          checked={task.status === 'Completed'}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleOpenUpdate(task);
                          }}
                          className="w-4.5 h-4.5 rounded border-slate-800 bg-slate-950 text-gold accent-gold cursor-pointer"
                        />
                      </div>

                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex justify-between items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-bold border uppercase ${getPriorityColor(task.priority)}`}>
                            {task.priority}
                          </span>
                          <span className="text-slate-500 font-mono text-[9px] flex items-center gap-1">
                            <Calendar size={10} />
                            {new Date(task.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </span>
                        </div>

                        <h4 className="font-bold text-xs text-slate-200 truncate">{task.title}</h4>
                        <p className="text-[10px] text-slate-450 line-clamp-2 leading-relaxed">{task.description}</p>

                        {/* SLA Info */}
                        {task.status === 'In_Progress' && task.slaStart && task.slaDuration && (
                          <div className="flex items-center gap-1 text-[9px] text-slate-400 font-mono">
                            <Clock size={10} className="text-gold" />
                            <span>SLA: {task.slaDuration}m</span>
                          </div>
                        )}

                        {/* Health Score */}
                        {task.healthScore !== undefined && (
                          <div className="flex justify-between items-center text-[9px] text-slate-500">
                            <span>Health Index:</span>
                            <span className={`font-bold ${
                              task.healthScore >= 80 ? 'text-green-400' : task.healthScore >= 60 ? 'text-amber-400' : 'text-red-400'
                            }`}>
                              {task.healthScore}/100
                            </span>
                          </div>
                        )}

                        {/* Progress */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[8px] text-slate-500">
                            <span>Progress</span>
                            <span>{task.progress}%</span>
                          </div>
                          <div className="w-full h-1 bg-slate-950 rounded-full overflow-hidden">
                            <div className="h-full bg-gold" style={{ width: `${task.progress}%` }} />
                          </div>
                        </div>

                        {/* Assignee & Audit Button */}
                        <div className="pt-2 border-t border-slate-800/40 flex justify-between items-center text-[9px] text-slate-500 gap-4">
                          <span className="truncate">
                            Assignee: <strong className="text-slate-350">{task.assignedTo ? `${task.assignedTo.firstName} ${task.assignedTo.lastName}` : task.department ? `${task.department} Dept` : 'All'}</strong>
                          </span>
                          
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTask(task);
                              setTimelineModalOpen(true);
                            }}
                            className="bg-slate-950/60 hover:bg-slate-900 border border-slate-800 hover:border-gold/30 px-2 py-0.5 rounded text-[8px] font-bold text-slate-400 hover:text-white uppercase transition-all whitespace-nowrap cursor-pointer"
                          >
                            Audit Log
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {currentMobileTasks.length === 0 && (
                  <div className="text-center py-12 text-slate-650 text-xs border border-dashed border-slate-800/60 rounded-xl">
                    No tasks in this list.
                  </div>
                )}
              </div>
            </div>
          </>
        );
      })()}

      {/* 2. WAR ROOM HUD */}
      {activeTab === 'war-room' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left panel: Active Emergencies & Alerts */}
          <div className="bg-card-dark border border-slate-800/80 p-5 rounded-2xl space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <ShieldAlert size={16} className="text-red-400" />
              <h3 className="font-bold text-sm text-white uppercase tracking-wider">War Room Live Alerts</h3>
            </div>

            <div className="space-y-3">
              {incidents.filter(i => i.status === 'Active').map(inc => (
                <div key={inc._id} className="p-3 bg-red-950/20 border border-red-500/20 rounded-xl space-y-2 relative overflow-hidden">
                  <div className="absolute top-0 right-0 bg-red-600 text-white text-[8px] font-extrabold uppercase px-2 py-0.5 rounded-bl">
                    Emergency
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold text-red-400">
                    <Flame size={14} className="animate-pulse" />
                    <span>{inc.category} reported</span>
                  </div>
                  <h4 className="font-semibold text-xs text-slate-200">{inc.title}</h4>
                  <p className="text-[10px] text-slate-400">{inc.description}</p>
                </div>
              ))}

              {tasks.filter(t => t.slaBreached).map(t => (
                <div key={t._id} className="p-3 bg-amber-950/20 border border-amber-500/20 rounded-xl space-y-2 relative overflow-hidden">
                  <div className="absolute top-0 right-0 bg-amber-600 text-slate-dark text-[8px] font-extrabold uppercase px-2 py-0.5 rounded-bl">
                    Breached
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                    <AlertTriangle size={14} />
                    <span>SLA Breach</span>
                  </div>
                  <h4 className="font-semibold text-xs text-slate-200">{t.title}</h4>
                  <p className="text-[10px] text-slate-400">Assignee: {t.assignedTo ? `${t.assignedTo.firstName} ${t.assignedTo.lastName}` : 'Unassigned'}</p>
                </div>
              ))}

              {incidents.filter(i => i.status === 'Active').length === 0 && tasks.filter(t => t.slaBreached).length === 0 && (
                <div className="text-center py-12 text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                  No active emergencies or SLA breaches reported today.
                </div>
              )}
            </div>
          </div>

          {/* Middle panel: Workload Capacity Engine */}
          <div className="bg-card-dark border border-slate-800/80 p-5 rounded-2xl space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Activity size={16} className="text-gold" />
              <h3 className="font-bold text-sm text-white uppercase tracking-wider">Workload Capacity Balancer</h3>
            </div>

            <div className="space-y-4">
              {metrics.employees && metrics.employees.map((emp: any) => {
                const activeCount = tasks.filter(t => t.assignedTo?._id === emp._id && t.status !== 'Completed').length;
                const capacity = emp.capacityLimit || 5;
                const isOverloaded = activeCount >= capacity;
                return (
                  <div key={emp._id} className="p-3 bg-slate-950/40 border border-slate-800/60 rounded-xl space-y-2">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-bold text-xs text-slate-200">{emp.firstName} {emp.lastName}</h4>
                        <p className="text-[9px] text-slate-500 uppercase">{emp.department} Dept • {emp.designation}</p>
                      </div>
                      {isOverloaded && (
                        <span className="bg-red-950/40 text-red-400 text-[8px] font-extrabold border border-red-500/20 px-2 py-0.5 rounded uppercase animate-pulse">
                          Overloaded
                        </span>
                      )}
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex justify-between text-[9px] text-slate-400">
                        <span>Active tasks limit: {activeCount}/{capacity}</span>
                        <span>{Math.round((activeCount/capacity)*100)}% Load</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                        <div className={`h-full ${isOverloaded ? 'bg-red-500' : 'bg-gold'}`} style={{ width: `${Math.min(100, (activeCount/capacity)*100)}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right panel: Geofenced Floor Map (Live locations) */}
          <div className="bg-card-dark border border-slate-800/80 p-5 rounded-2xl space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <MapPin size={16} className="text-blue-400" />
              <h3 className="font-bold text-sm text-white uppercase tracking-wider">Live Geofenced Coordinates</h3>
            </div>

            {/* floor plan mockup */}
            <div className="w-full h-64 bg-slate-950 rounded-xl border border-slate-800 flex flex-col items-center justify-center relative p-4 overflow-hidden">
              {/* floor grid outline */}
              <div className="absolute inset-4 border border-dashed border-slate-800/40 grid grid-cols-3 grid-rows-3 gap-2">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="border border-dashed border-slate-800/10 flex items-center justify-center text-[8px] text-slate-700 font-mono">
                    ZONE-0{i+1}
                  </div>
                ))}
              </div>
              
              {/* live staff check-ins dot mockup */}
              <div className="absolute top-1/4 left-1/3 flex flex-col items-center gap-1 z-10 animate-bounce">
                <span className="w-2.5 h-2.5 bg-green-500 rounded-full border border-white" />
                <span className="text-[8px] bg-slate-900 border border-slate-800 px-1 py-0.5 rounded text-slate-300 font-mono">
                  John D. (Main Lobby)
                </span>
              </div>
              
              <div className="absolute bottom-1/3 right-1/4 flex flex-col items-center gap-1 z-10">
                <span className="w-2.5 h-2.5 bg-green-500 rounded-full border border-white" />
                <span className="text-[8px] bg-slate-900 border border-slate-800 px-1 py-0.5 rounded text-slate-300 font-mono">
                  Alice M. (Room 402)
                </span>
              </div>
              
              <div className="absolute top-1/3 right-1/3 flex flex-col items-center gap-1 z-10">
                <span className="w-2.5 h-2.5 bg-red-500 rounded-full border border-white animate-ping" />
                <span className="text-[8px] bg-slate-900 border border-red-500/20 px-1 py-0.5 rounded text-red-400 font-mono">
                  Suspicious Completion (Out of bounds)
                </span>
              </div>

              <div className="mt-auto text-[10px] text-slate-500 font-mono text-center z-10 bg-slate-950/80 p-2 rounded border border-slate-800">
                Hotel Geofence Bounds: 25.79065, -80.130045 <br />
                Target Radius: 200m
              </div>
            </div>
          </div>

        </div>
      )}

      {/* 3. INCIDENT & SHIFT HANDOVER CONTROL */}
      {activeTab === 'handover' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Emergency Incident Reporter */}
          <div className="bg-card-dark border border-slate-800/80 p-5 rounded-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Flame size={16} className="text-red-400" />
                <h3 className="font-bold text-sm text-white uppercase tracking-wider">Report Emergency</h3>
              </div>
              <button
                onClick={() => setIncidentModalOpen(true)}
                className="bg-red-600 hover:bg-red-500 text-white font-extrabold px-3 py-1.5 rounded text-[10px] uppercase cursor-pointer"
              >
                Log Incident
              </button>
            </div>

            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1 scrollbar-thin">
              {incidents.map((inc) => (
                <div key={inc._id} className="p-4 bg-slate-950/60 border border-slate-850 rounded-xl space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded uppercase font-bold">
                      {inc.category}
                    </span>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                      inc.status === 'Active' ? 'bg-red-950/40 text-red-300 border border-red-500/20' : 'bg-green-950/40 text-green-300 border border-green-500/20'
                    }`}>
                      {inc.status}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-bold text-xs text-slate-200">{inc.title}</h4>
                    <p className="text-[10px] text-slate-500 mt-1">{inc.description}</p>
                  </div>

                  {inc.recoverySteps && inc.recoverySteps.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[9px] uppercase font-bold text-slate-400">Recovery Procedures Checklists:</p>
                      <ul className="text-[9px] text-slate-500 space-y-0.5">
                        {inc.recoverySteps.map((step, idx) => (
                          <li key={idx} className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 bg-gold rounded-full" />
                            {step}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Incident logs timeline */}
                  <div className="border-t border-slate-900 pt-2 space-y-1.5">
                    <p className="text-[9px] uppercase font-bold text-slate-400">Incident Feed logs:</p>
                    {inc.timeline && inc.timeline.map((log, idx) => (
                      <div key={idx} className="text-[8px] font-mono text-slate-500 flex justify-between">
                        <span>{log.message}</span>
                        <span>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {incidents.length === 0 && (
                <div className="text-center py-12 text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                  No incident logs filed.
                </div>
              )}
            </div>
          </div>

          {/* Shift Handover Portal */}
          <div className="bg-card-dark border border-slate-800/80 p-5 rounded-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <RotateCcw size={16} className="text-gold" />
                <h3 className="font-bold text-sm text-white uppercase tracking-wider">Shift Handover logs</h3>
              </div>
              <button
                onClick={() => setHandoverModalOpen(true)}
                className="bg-gold hover:bg-gold-light text-slate-dark font-extrabold px-3 py-1.5 rounded text-[10px] uppercase cursor-pointer"
              >
                Start Handover
              </button>
            </div>

            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1 scrollbar-thin">
              {handovers.map((ho) => (
                <div key={ho._id} className="p-4 bg-slate-950/60 border border-slate-850 rounded-xl space-y-3">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-slate-400">Outgoing: {ho.outgoingStaff.firstName} ({ho.outgoingStaff.department})</span>
                    <span className={`font-bold uppercase px-2 py-0.5 rounded ${
                      ho.status === 'Pending' ? 'bg-amber-950/40 text-amber-300 border border-amber-500/20 animate-pulse' : 'bg-green-950/40 text-green-300 border border-green-500/20'
                    }`}>
                      {ho.status}
                    </span>
                  </div>

                  <div className="text-[10px] text-slate-300">
                    <p className="font-semibold">Incoming Assignee: {ho.incomingStaff.firstName} {ho.incomingStaff.lastName}</p>
                    <p className="text-slate-500 mt-1">Notes: {ho.notes || 'No notes left'}</p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[9px] uppercase font-bold text-slate-400">Handed Over Tasks ({ho.tasks.length}):</p>
                    <ul className="text-[9px] text-slate-400 space-y-0.5">
                      {ho.tasks.map((t, idx) => (
                        <li key={idx} className="flex justify-between font-mono">
                          <span>{t.title}</span>
                          <span className="text-slate-500">[{t.status}]</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {ho.status === 'Pending' && ho.incomingStaff && (
                    <button
                      onClick={() => handleAcceptHandover(ho._id)}
                      className="w-full py-2 bg-green-600 hover:bg-green-500 text-white rounded font-bold text-[10px] uppercase transition-colors cursor-pointer"
                    >
                      Acknowledge & Accept Handover
                    </button>
                  )}
                </div>
              ))}

              {handovers.length === 0 && (
                <div className="text-center py-12 text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                  No shift handovers logged.
                </div>
              )}
            </div>
          </div>

          {/* Replacement Matching Engine */}
          <div className="bg-card-dark border border-slate-800/80 p-5 rounded-2xl space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Users size={16} className="text-blue-400" />
              <h3 className="font-bold text-sm text-white uppercase tracking-wider">Staff Replacement Engine</h3>
            </div>

            <div className="space-y-4">
              <p className="text-[10px] text-slate-400">
                Instantly recommend active replacements for overloaded or absent personnel in departments:
              </p>
              
              <div className="space-y-3">
                {['Front Office', 'Housekeeping', 'Kitchen'].map(dept => {
                  const activeStaff = employees.filter(emp => emp.department === dept && emp.status === 'Active');
                  const bestReplacement = activeStaff.sort((a, b) => {
                    const aTasks = tasks.filter(t => t.assignedTo?._id === a._id && t.status !== 'Completed').length;
                    const bTasks = tasks.filter(t => t.assignedTo?._id === b._id && t.status !== 'Completed').length;
                    return aTasks - bTasks;
                  })[0];

                  return (
                    <div key={dept} className="p-3 bg-slate-950/40 border border-slate-800/60 rounded-xl flex justify-between items-center">
                      <div>
                        <h4 className="font-bold text-xs text-slate-200">{dept}</h4>
                        <p className="text-[9px] text-slate-500">Replacements pool: {activeStaff.length} active</p>
                      </div>
                      {bestReplacement ? (
                        <div className="text-right">
                          <span className="text-[10px] text-green-400 font-bold block">{bestReplacement.firstName} {bestReplacement.lastName}</span>
                          <span className="text-[9px] text-slate-500">Available capacity</span>
                        </div>
                      ) : (
                        <span className="text-[9px] text-red-400 font-bold">No Staff Available</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

        </div>
      )}

      {/* 4. GAMIFICATION & XP */}
      {activeTab === 'gamification' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* User gamified profile */}
          <div className="bg-card-dark border border-slate-800/80 p-5 rounded-2xl space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <Trophy size={16} className="text-gold" />
                <h3 className="font-bold text-sm text-white uppercase tracking-wider">My Gamification Hub</h3>
              </div>

              {/* level progress */}
              <div className="p-4 bg-slate-950/60 border border-slate-850 rounded-xl text-center space-y-4">
                <div className="w-20 h-20 bg-slate-900 border-2 border-gold rounded-full flex items-center justify-center mx-auto text-gold font-bold text-2xl shadow-lg gold-glow">
                  Lvl {user?.level || 1}
                </div>
                
                <div className="space-y-1">
                  <h4 className="font-bold text-xs text-slate-200">Current XP Score: {user?.xp || 0}</h4>
                  <p className="text-[9px] text-slate-500 uppercase">XP to next Level: {(user?.level || 1)*100 - (user?.xp || 0)}</p>
                  <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                    <div className="h-full bg-gold" style={{ width: `${Math.min(100, ((user?.xp || 0)/((user?.level || 1)*100))*100)}%` }} />
                  </div>
                </div>
              </div>

              {/* unlocked badges list */}
              <div className="space-y-2">
                <p className="text-[10px] uppercase font-bold text-slate-400">Unlocked Badges achievements:</p>
                <div className="flex flex-wrap gap-2">
                  {['Task Warrior', 'Complaint Slayer', 'Compliance Champion', 'Hotel Hero'].map((badge) => {
                    const hasBadge = user?.badges?.includes(badge) || (badge === 'Task Warrior' && (user?.level || 1) >= 2);
                    return (
                      <span
                        key={badge}
                        className={`text-[9px] font-bold px-2.5 py-1 rounded-full border uppercase ${
                          hasBadge
                            ? 'bg-gold/15 text-gold border-gold/30 gold-glow'
                            : 'bg-slate-950/40 text-slate-600 border-slate-900'
                        }`}
                      >
                        {badge}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-950/40 border border-slate-800 rounded-xl text-[10px] text-slate-400 text-center font-mono">
              Earn XP points by completing operations tasks before SLAs expire. Don't compromise quality metrics!
            </div>
          </div>

          {/* Employee accountability rating board */}
          <div className="bg-card-dark border border-slate-800/80 p-5 rounded-2xl space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Award size={16} className="text-emerald-400" />
              <h3 className="font-bold text-sm text-white uppercase tracking-wider">Accountability Index Rankings</h3>
            </div>

            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1 scrollbar-thin">
              {metrics.employees && metrics.employees.map((emp: any, index: number) => (
                <div key={emp._id} className="flex justify-between items-center p-3 bg-slate-950/40 border border-slate-800/60 rounded-xl">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-xs text-slate-500 w-5">#{index + 1}</span>
                    <div>
                      <h4 className="font-bold text-xs text-slate-200">{emp.firstName} {emp.lastName}</h4>
                      <p className="text-[9px] text-slate-500 uppercase">{emp.department} • Lvl {emp.level || 1}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-xs text-emerald-400 block">{emp.accountabilityIndex || 100}%</span>
                    <span className="text-[9px] text-slate-500">Accountability Score</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Managers and hotel regional rankings */}
          <div className="bg-card-dark border border-slate-800/80 p-5 rounded-2xl space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <TrendingUp size={16} className="text-blue-400" />
              <h3 className="font-bold text-sm text-white uppercase tracking-wider">Operations Effectiveness scores</h3>
            </div>

            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1 scrollbar-thin">
              <p className="text-[10px] uppercase font-bold text-slate-400 border-l-2 border-blue-400 pl-2">Manager Effectiveness Index</p>
              {metrics.managers && metrics.managers.map((mgr: any, index: number) => (
                <div key={mgr._id} className="flex justify-between items-center p-3 bg-slate-950/40 border border-slate-800/60 rounded-xl">
                  <div>
                    <h4 className="font-bold text-xs text-slate-200">{mgr.name}</h4>
                    <p className="text-[9px] text-slate-500 uppercase">{mgr.role.replace('_', ' ')} • SLA compliance</p>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-xs text-blue-400 block">{mgr.effectivenessScore}%</span>
                  </div>
                </div>
              ))}

              <p className="text-[10px] uppercase font-bold text-slate-400 border-l-2 border-blue-400 pl-2 pt-2">Hotel Regional Scorecards</p>
              {metrics.hotels && metrics.hotels.map((h: any, index: number) => (
                <div key={h._id} className="flex justify-between items-center p-3 bg-slate-950/40 border border-slate-800/60 rounded-xl">
                  <div>
                    <h4 className="font-bold text-xs text-slate-200">{h.name}</h4>
                    <p className="text-[9px] text-slate-500 uppercase">Region: {h.region}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-xs text-gold block">{h.operationsScore}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* 5. AI OPERATIONS COPILOT */}
      {activeTab === 'ai-copilot' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* left panel: Suggested analytics prompts */}
          <div className="bg-card-dark border border-slate-800/80 p-5 rounded-2xl space-y-4 lg:col-span-1">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Bot size={16} className="text-gold" />
              <h3 className="font-bold text-sm text-white uppercase tracking-wider">Suggested Queries</h3>
            </div>
            
            <div className="space-y-2">
              {[
                "Which tasks are at risk today?",
                "Which employee is overloaded?",
                "Which hotel has most overdue tasks?",
                "Which department causes maximum delays?"
              ].map((query, idx) => (
                <button
                  key={idx}
                  onClick={() => handleQuickQuestion(query)}
                  className="w-full text-left p-2.5 bg-slate-950/40 hover:bg-slate-900/60 border border-slate-800 hover:border-gold/30 rounded-lg text-[10px] text-slate-300 font-medium transition-all cursor-pointer"
                >
                  {query}
                </button>
              ))}
            </div>
          </div>

          {/* right panel: Copilot Chat Console */}
          <div className="bg-card-dark border border-slate-800/80 p-5 rounded-2xl flex flex-col h-[60vh] lg:col-span-3">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Bot size={18} className="text-gold" />
                <div>
                  <h3 className="font-bold text-sm text-white uppercase tracking-wider">Operations Copilot Chat</h3>
                  <p className="text-[8px] text-slate-500 uppercase tracking-widest font-mono">Cognitive Analytics Engine v4.0</p>
                </div>
              </div>
            </div>

            {/* Message window */}
            <div className="flex-1 overflow-y-auto my-4 space-y-4 pr-1 scrollbar-thin">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-xl p-3 text-xs space-y-2 ${
                    msg.sender === 'user'
                      ? 'bg-gold text-slate-dark font-medium rounded-tr-none'
                      : 'bg-slate-950/80 text-slate-200 border border-slate-800/80 rounded-tl-none'
                  }`}>
                    <p>{msg.text}</p>
                    
                    {/* Render table context for metrics queries if present */}
                    {msg.context && Array.isArray(msg.context) && (
                      <div className="border-t border-slate-800/40 pt-2 mt-2 overflow-x-auto">
                        <table className="w-full text-[9px] font-mono text-slate-400">
                          <thead>
                            <tr className="border-b border-slate-800">
                              <th className="text-left py-1">Metric Target</th>
                              <th className="text-right py-1">Score / Count</th>
                            </tr>
                          </thead>
                          <tbody>
                            {msg.context.map((item: any, i: number) => (
                              <tr key={i} className="border-b border-slate-900">
                                <td className="py-1">{item.name || item.title || item.hotelName || item.department}</td>
                                <td className="text-right py-1 text-gold">{item.activeCount ?? item.overdueCount ?? item.delayCount ?? item.priority ?? 'Overload'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* input bar */}
            <form onSubmit={handleChatSubmit} className="flex gap-2">
              <input
                type="text"
                placeholder="Ask anything about workloads, delays, or hotel rankings..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="flex-1 bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-gold"
              />
              <button
                type="submit"
                className="bg-gold hover:bg-gold-light text-slate-dark p-2.5 rounded-lg transition-colors cursor-pointer"
              >
                <Send size={15} />
              </button>
            </form>
          </div>

        </div>
      )}

      {/* POPUP MODALS */}

      {/* 1. Create Task Modal */}
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
                  placeholder="e.g. Clean VIP Suite AC fan"
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
                      {employees.map((emp) => (
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
                      placeholder="e.g. Front Office, Housekeeping"
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
                className="w-full bg-gold hover:bg-gold-light text-slate-dark font-extrabold py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Confirm Task Assignment
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 2. Update Progress/Status Modal */}
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

              {/* Geo Verification Proof Inputs */}
              <div className="space-y-3 border-t border-slate-800/60 pt-3">
                <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Geo-Verification Data (Enforced)</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-500 mb-1">Simulate Lat</label>
                    <input
                      type="text"
                      placeholder="e.g. 25.79065"
                      className="w-full bg-slate-950/60 border border-slate-800 rounded p-1.5 text-white"
                      {...registerUpdate('lat')}
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">Simulate Lng</label>
                    <input
                      type="text"
                      placeholder="e.g. -80.130045"
                      className="w-full bg-slate-950/60 border border-slate-800 rounded p-1.5 text-white"
                      {...registerUpdate('lng')}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-500 mb-1">Selfie Verification URL</label>
                  <input
                    type="text"
                    placeholder="Proof image URL"
                    className="w-full bg-slate-950/60 border border-slate-800 rounded p-1.5 text-white"
                    {...registerUpdate('selfieUrl')}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full bg-gold hover:bg-gold-light text-slate-dark font-extrabold py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Save Task Progress
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 3. RCA Modal (Triggered when delayed completion occurs) */}
      {rcaModalOpen && selectedTask && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card-dark border border-red-500/20 rounded-xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-red-400 text-sm">Root Cause Analysis required</h3>
              <button onClick={() => setRcaModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <p className="text-[10px] text-slate-400">
              This task has breached its SLA or is past due. Operational guidelines require logging the reason for this delay before completion.
            </p>

            <form onSubmit={handleSubmitRca(onSubmitRca)} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider">Delay Category</label>
                <select
                  className="w-full bg-slate-950/60 border border-slate-800 rounded p-2 text-white"
                  {...registerRca('rcaCategory')}
                >
                  <option value="Resource Issue">Resource Issue (Out of Stock)</option>
                  <option value="Staff Issue">Staff Issue (Shortage)</option>
                  <option value="Approval Delay">Approval Delay</option>
                  <option value="Vendor Delay">Vendor Delay</option>
                  <option value="Inventory Delay">Inventory Delay</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider">RCA Action Report Details</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Explain exactly why the task was delayed and how to prevent it in the future..."
                  className="w-full bg-slate-950/60 border border-slate-800 rounded p-2 text-white resize-none"
                  {...registerRca('rcaReason')}
                />
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full bg-red-600 hover:bg-red-500 text-white font-extrabold py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                File RCA & Complete Task
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 4. Timeline Modal */}
      {timelineModalOpen && selectedTask && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card-dark border border-gold/20 rounded-xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-white text-sm">Digital Command Timeline</h3>
              <button onClick={() => setTimelineModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 font-mono text-[10px] text-slate-400">
              <div className="border-l-2 border-gold pl-3 space-y-3 py-1">
                <div>
                  <p className="text-gold font-bold uppercase">Task Created</p>
                  <p>Triggered by management console</p>
                </div>
                
                {selectedTask.slaStart && (
                  <div>
                    <p className="text-blue-400 font-bold uppercase">SLA Tracker Initiated</p>
                    <p>Shift employee moved status to In Progress</p>
                  </div>
                )}

                {selectedTask.reworkCount && selectedTask.reworkCount > 0 ? (
                  <div>
                    <p className="text-amber-400 font-bold uppercase">Rework Triggered ({selectedTask.reworkCount}x)</p>
                    <p>Manager rejected validation - task recycled</p>
                  </div>
                ) : null}

                {selectedTask.geoVerified?.verified && (
                  <div>
                    <p className="text-emerald-400 font-bold uppercase">Geo-Verification Check Completed</p>
                    <p>Coordinates: {selectedTask.geoVerified.lat}, {selectedTask.geoVerified.lng}</p>
                    {selectedTask.geoVerified.isSuspicious && (
                      <p className="text-red-400 font-bold">FRAUD RISK FLAGGED: {selectedTask.geoVerified.fraudFlags.join(', ')}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => setTimelineModalOpen(false)}
              className="w-full bg-slate-900 border border-slate-800 text-slate-350 py-2 rounded text-xs font-bold uppercase hover:text-white transition-colors cursor-pointer"
            >
              Close Timeline Viewer
            </button>
          </div>
        </div>
      )}

      {/* 5. QR Room Simulator Modal */}
      {qrModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card-dark border border-gold/20 rounded-xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-white text-sm">Room QR Operations Simulator</h3>
              <button onClick={() => setQrModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <p className="text-[10px] text-slate-400">
              Simulates checking room status and operations history by scanning QR codes.
            </p>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-450 font-semibold mb-1">Enter Room Number</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. 402"
                    value={qrRoomCode}
                    onChange={(e) => setQrRoomCode(e.target.value)}
                    className="flex-1 bg-slate-950/60 border border-slate-800 rounded p-2 text-white focus:outline-none focus:border-gold"
                  />
                  <button
                    onClick={handleQRScan}
                    className="bg-gold hover:bg-gold-light text-slate-dark font-extrabold px-4 rounded cursor-pointer uppercase tracking-wider text-[10px]"
                  >
                    Scan QR
                  </button>
                </div>
              </div>

              {qrMessage && (
                <div className="p-3 bg-slate-950 border border-slate-850 rounded-lg text-[10px] text-slate-300">
                  <p className="font-bold text-gold">{qrMessage}</p>
                  
                  {roomHistory.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-900 space-y-1.5 text-slate-400 font-mono">
                      {roomHistory.map((h, i) => (
                        <p key={i}>{h}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {qrRoomCode && (
                <button
                  onClick={handleQRCreateMaintenance}
                  className="w-full py-2 bg-slate-900 border border-slate-800 text-gold hover:bg-slate-950 rounded font-bold text-[10px] uppercase transition-all cursor-pointer"
                >
                  Create Maintenance Task for Room {qrRoomCode.toUpperCase()}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 6. Log Incident Modal */}
      {incidentModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card-dark border border-red-500/20 rounded-xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-red-400 text-sm">Report Emergency Incident</h3>
              <button onClick={() => setIncidentModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitIncident(onSubmitIncident)} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider">Incident Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Major Water leakage inside server room"
                  className="w-full bg-slate-950/60 border border-slate-800 rounded p-2 text-white"
                  {...registerIncident('title')}
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider">Category</label>
                <select
                  required
                  className="w-full bg-slate-950/60 border border-slate-800 rounded p-2 text-white"
                  {...registerIncident('category')}
                >
                  <option value="Fire">Fire Breakout</option>
                  <option value="Guest_Injury">Guest Injury / Medical Emergency</option>
                  <option value="Security_Threat">Security Threat</option>
                  <option value="Water_Leakage">Water Leakage</option>
                  <option value="Electrical_Failure">Electrical Failure</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider">Incident Details</label>
                <textarea
                  required
                  rows={3}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded p-2 text-white resize-none"
                  {...registerIncident('description')}
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider">Recovery steps (Comma separated)</label>
                <input
                  type="text"
                  placeholder="Shut off main valve, Call vendor, Evacuate sector"
                  className="w-full bg-slate-950/60 border border-slate-800 rounded p-2 text-white"
                  {...registerIncident('recoverySteps')}
                />
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full bg-red-600 hover:bg-red-500 text-white font-extrabold py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Confirm Emergency Report
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 7. Start Shift Handover Modal */}
      {handoverModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card-dark border border-gold/20 rounded-xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-white text-sm">Shift Handover Operations</h3>
              <button onClick={() => setHandoverModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <p className="text-[10px] text-slate-400">
              Hands over all your incomplete shift tasks to an incoming staff member.
            </p>

            <form onSubmit={handleSubmitHandover(onSubmitHandover)} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider">Incoming Assignee</label>
                <select
                  required
                  className="w-full bg-slate-950/60 border border-slate-800 rounded p-2 text-white cursor-pointer"
                  {...registerHandover('incomingStaffId')}
                >
                  <option value="">Select Incoming Colleague...</option>
                  {employees.map((emp) => (
                    emp._id !== user?.id && (
                      <option key={emp._id} value={emp._id}>
                        {emp.firstName} {emp.lastName} ({emp.department || 'Operations'})
                      </option>
                    )
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider">Handover Notes</label>
                <textarea
                  rows={3}
                  placeholder="Specify status and details about these pending handovers..."
                  className="w-full bg-slate-950/60 border border-slate-800 rounded p-2 text-white resize-none"
                  {...registerHandover('notes')}
                />
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full bg-gold hover:bg-gold-light text-slate-dark font-extrabold py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Initiate Shift Handover
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
