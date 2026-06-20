'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import GoogleIcon from '@/components/GoogleIcon';
import { DEPARTMENTS } from '@/constants/departments';

interface Task {
  _id: string;
  title: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  status: 'Pending' | 'Accepted' | 'In_Progress' | 'Completed' | 'On_Hold' | 'Rejected';
  progress: number;
  dueDate: string;
  dueTime?: string;
  evidenceRequirement: 'optional' | 'mandatory';
  assignmentType: string;
  assignedTo?: any[];
  assignedDepartments?: string[];
  department?: string;
  assignedBy: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  responses: {
    userId: string;
    action: string;
    reason?: string;
    timestamp: string;
    evidenceUrl?: string;
  }[];
  viewCount: number;
  createdAt: string;
}

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  designation: string;
  role: string;
}

export default function TasksPage() {
  const { user } = useAuthStore();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showTaskDetail, setShowTaskDetail] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const localToday = new Date();
  const yyyy = localToday.getFullYear();
  const mm = String(localToday.getMonth() + 1).padStart(2, '0');
  const dd = String(localToday.getDate()).padStart(2, '0');
  const todayStr = `${yyyy}-${mm}-${dd}`;

  // Form states
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'Medium' as 'Low' | 'Medium' | 'High' | 'Urgent',
    dueDate: '',
    dueTime: '',
    evidenceRequirement: 'optional' as 'optional' | 'mandatory',
    assignmentType: 'individual' as 'all_departments' | 'individual' | 'department_wise' | 'name_wise' | 'designation_wise',
    assignedTo: '',
    assignedDepartments: [] as string[],
    department: '',
    taskType: 'one_time' as 'daily' | 'recurring' | 'one_time',
    recurringInterval: 'weekly' as 'weekly' | 'monthly',
  });

  const [submitting, setSubmitting] = useState(false);

  const [departmentsList, setDepartmentsList] = useState<string[]>(Array.from(DEPARTMENTS));

  useEffect(() => {
    const fetchDepts = async () => {
      try {
        const res = await api.get('/organization/public-departments');
        if (res?.data?.departments) {
          setDepartmentsList(res.data.departments);
        }
      } catch (err) {
        console.error('Failed to load active departments', err);
      }
    };
    fetchDepts();
  }, []);

  const isManager = user?.role === 'ROOT_ADMIN' || user?.role === 'HOTEL_ADMIN' || user?.role === 'HR_MANAGER' || user?.role === 'DEPT_MANAGER';

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.append('status', filterStatus);
      const res = await api.get(`/tasks?${params.toString()}`);
      setTasks(res.data.tasks || []);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get('/employees');
      setUsers(res.data.employees || []);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  useEffect(() => {
    fetchTasks();
    if (isManager) {
      fetchUsers();
    }
  }, [filterStatus, isManager]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    // Date Validation
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedD = new Date(formData.dueDate);
    selectedD.setHours(0, 0, 0, 0);
    if (selectedD < today) {
      alert('Due Date cannot be in the past');
      setSubmitting(false);
      return;
    }

    try {
      let isRecurring = false;
      let recurringInterval = undefined;
      if (formData.taskType === 'daily') {
        isRecurring = true;
        recurringInterval = 'daily';
      } else if (formData.taskType === 'recurring') {
        isRecurring = true;
        recurringInterval = formData.recurringInterval || 'weekly';
      }

      const payload: any = {
        ...formData,
        isRecurring,
        recurringInterval,
        hotelId: user?.hotel,
      };

      if ((formData.assignmentType === 'individual' || formData.assignmentType === 'name_wise' || formData.assignmentType === 'designation_wise') && formData.assignedTo) {
        payload.assignedTo = formData.assignedTo;
      } else if (formData.assignmentType === 'department_wise' && formData.department) {
        payload.department = formData.department;
        payload.assignedDepartments = [formData.department];
      } else if (formData.assignmentType === 'all_departments') {
        payload.assignedDepartments = departmentsList;
      }

      await api.post('/tasks', payload);
      setShowCreateModal(false);
      setFormData({
        title: '',
        description: '',
        priority: 'Medium',
        dueDate: '',
        dueTime: '',
        evidenceRequirement: 'optional',
        assignmentType: 'individual',
        assignedTo: '',
        assignedDepartments: [],
        department: '',
        taskType: 'one_time',
        recurringInterval: 'weekly',
      });
      fetchTasks();
    } catch (err: any) {
      alert(err.message || 'Failed to create task');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTaskAction = async (taskId: string, action: 'accept' | 'hold' | 'reject' | 'complete', reason?: string) => {
    try {
      const payload: any = {};
      if (reason) payload.reason = reason;
      if (action === 'complete') {
        payload.description = 'Task completed successfully';
      }

      await api.post(`/tasks/${taskId}/${action}`, payload);
      fetchTasks();
      setShowTaskDetail(false);
    } catch (err: any) {
      alert(err.message || `Failed to ${action} task`);
    }
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Accepted': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'In_Progress': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'Completed': return 'bg-green-100 text-green-700 border-green-200';
      case 'On_Hold': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'Rejected': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const filteredTasks = tasks.filter(task => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return task.title.toLowerCase().includes(search) || task.description.toLowerCase().includes(search);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Task Management</h1>
          <p className="text-slate-500 text-xs mt-1">Enterprise Smart Task Assignment & Tracking System</p>
        </div>
        {isManager && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-sm"
          >
            <GoogleIcon name="add" size={18} />
            Create New Task
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <div className="relative">
              <GoogleIcon name="search" className="absolute left-3 top-2.5 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Search tasks..."
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
            <option value="Pending">Pending</option>
            <option value="Accepted">Accepted</option>
            <option value="In_Progress">In Progress</option>
            <option value="Completed">Completed</option>
            <option value="On_Hold">On Hold</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Tasks Grid */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <GoogleIcon name="assignment" className="text-slate-300 mx-auto" size={48} />
          <p className="text-slate-500 text-sm mt-3">No tasks found</p>
          <p className="text-slate-400 text-xs mt-1">Create a new task to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTasks.map((task) => (
            <div
              key={task._id}
              onClick={() => {
                setSelectedTask(task);
                setShowTaskDetail(true);
              }}
              className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-3">
                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${getPriorityColor(task.priority)}`}>
                  {task.priority}
                </span>
                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${getStatusColor(task.status)}`}>
                  {task.status.replace('_', ' ')}
                </span>
              </div>

              <h3 className="text-sm font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
                {task.title}
              </h3>
              <p className="text-xs text-slate-600 mb-4 line-clamp-2">{task.description}</p>

              <div className="space-y-2 text-[10px] text-slate-500">
                <div className="flex items-center gap-2">
                  <GoogleIcon name="schedule" size={14} />
                  <span>Due: {new Date(task.dueDate).toLocaleDateString()} {task.dueTime && `at ${task.dueTime}`}</span>
                </div>
                <div className="flex items-center gap-2">
                  <GoogleIcon name="person" size={14} />
                  <span>By: {task.assignedBy?.firstName ? `${task.assignedBy.firstName} ${task.assignedBy.lastName}` : 'Unknown'}</span>
                </div>
                {task.assignedTo && task.assignedTo.length > 0 && (
                  <div className="flex items-center gap-2">
                    <GoogleIcon name="group" size={14} />
                    <span>{task.assignedTo.length} assignee(s)</span>
                  </div>
                )}
                {task.evidenceRequirement === 'mandatory' && (
                  <div className="flex items-center gap-2 text-amber-600">
                    <GoogleIcon name="photo_camera" size={14} />
                    <span className="font-semibold">Photo Required</span>
                  </div>
                )}
              </div>

              {task.responses.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-2 text-[10px] text-slate-600">
                    <GoogleIcon name="history" size={14} />
                    <span>{task.responses.length} response(s)</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Task Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <GoogleIcon name="add_task" className="text-blue-600" size={22} />
                Create New Task
              </h2>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <GoogleIcon name="close" size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-slate-700 font-semibold mb-1.5 text-xs uppercase tracking-wider">Task Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm text-slate-800 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  placeholder="Enter task title..."
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1.5 text-xs uppercase tracking-wider">Description *</label>
                <textarea
                  required
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm text-slate-800 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  placeholder="Describe the task in detail..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1.5 text-xs uppercase tracking-wider">Priority *</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm text-slate-800 focus:outline-none focus:border-blue-400 cursor-pointer"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1.5 text-xs uppercase tracking-wider">Evidence Requirement</label>
                  <select
                    value={formData.evidenceRequirement}
                    onChange={(e) => setFormData({ ...formData, evidenceRequirement: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm text-slate-800 focus:outline-none focus:border-blue-400 cursor-pointer"
                  >
                    <option value="optional">Optional Photo Upload</option>
                    <option value="mandatory">Mandatory Photo Upload</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1.5 text-xs uppercase tracking-wider">Task Type *</label>
                <select
                  value={formData.taskType}
                  onChange={(e) => setFormData({ ...formData, taskType: e.target.value as any })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm text-slate-800 focus:outline-none focus:border-blue-400 cursor-pointer"
                >
                  <option value="one_time">One-time Task</option>
                  <option value="daily">Daily Checklist</option>
                  <option value="recurring">Recurring Task (Weekly/Monthly)</option>
                </select>
                
                <div className="mt-2 text-[10px] text-slate-500 bg-slate-50 p-3 rounded-lg space-y-1 border border-slate-100">
                  {formData.taskType === 'daily' && (
                    <>
                      <p className="font-bold text-slate-600 uppercase">Daily Checklist Examples:</p>
                      <ul className="list-disc pl-4 space-y-0.5">
                        <li>Routine checks (e.g., Toilet inspection log)</li>
                        <li>Shift handovers & daily cleanups</li>
                        <li>Daily opening/closing checklist</li>
                      </ul>
                    </>
                  )}
                  {formData.taskType === 'recurring' && (
                    <>
                      <p className="font-bold text-slate-600 uppercase">Recurring Task Examples:</p>
                      <ul className="list-disc pl-4 space-y-0.5">
                        <li>Weekly deep cleaning audits (e.g., Kitchen deep clean every Monday)</li>
                        <li>Monthly machinery & HVAC maintenance</li>
                        <li>Periodic safety and fire extinguisher inspections</li>
                      </ul>
                    </>
                  )}
                  {formData.taskType === 'one_time' && (
                    <>
                      <p className="font-bold text-slate-600 uppercase">One-time Task Examples:</p>
                      <ul className="list-disc pl-4 space-y-0.5">
                        <li>Isolated repairs (e.g., Fix broken lock in room 204)</li>
                        <li>Ad-hoc event preparations</li>
                        <li>Immediate/urgent customer service requests</li>
                      </ul>
                    </>
                  )}
                </div>
              </div>

              {formData.taskType === 'recurring' && (
                <div>
                  <label className="block text-slate-700 font-semibold mb-1.5 text-xs uppercase tracking-wider">Recurring Interval *</label>
                  <select
                    value={formData.recurringInterval}
                    onChange={(e) => setFormData({ ...formData, recurringInterval: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm text-slate-800 focus:outline-none focus:border-blue-400 cursor-pointer"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1.5 text-xs uppercase tracking-wider">Due Date *</label>
                  <input
                    type="date"
                    required
                    min={todayStr}
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm text-slate-800 focus:outline-none focus:border-blue-400 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1.5 text-xs uppercase tracking-wider">Due Time</label>
                  <input
                    type="time"
                    value={formData.dueTime}
                    onChange={(e) => setFormData({ ...formData, dueTime: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm text-slate-800 focus:outline-none focus:border-blue-400 cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1.5 text-xs uppercase tracking-wider">Assignment Type *</label>
                <select
                  value={formData.assignmentType}
                  onChange={(e) => setFormData({ ...formData, assignmentType: e.target.value as any })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm text-slate-800 focus:outline-none focus:border-blue-400 cursor-pointer"
                >
                  <option value="individual">Individual</option>
                  <option value="department_wise">Department Wise</option>
                  <option value="all_departments">All Departments</option>
                  <option value="name_wise">Name Wise</option>
                  <option value="designation_wise">Designation Wise</option>
                </select>
              </div>

              {formData.assignmentType === 'individual' && (
                <div>
                  <label className="block text-slate-700 font-semibold mb-1.5 text-xs uppercase tracking-wider">Select Employee *</label>
                  <select
                    required
                    value={formData.assignedTo}
                    onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm text-slate-800 focus:outline-none focus:border-blue-400 cursor-pointer"
                  >
                    <option value="">Select employee...</option>
                    {users.map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.firstName} {u.lastName} - {u.department} ({u.designation})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {formData.assignmentType === 'department_wise' && (
                <div>
                  <label className="block text-slate-700 font-semibold mb-1.5 text-xs uppercase tracking-wider">Select Department *</label>
                  <select
                    required
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm text-slate-800 focus:outline-none focus:border-blue-400 cursor-pointer"
                  >
                    <option value="">Select department...</option>
                    {departmentsList.map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
              )}

              {formData.assignmentType === 'name_wise' && (
                <div>
                  <label className="block text-slate-700 font-semibold mb-1.5 text-xs uppercase tracking-wider">Select Employee *</label>
                  <select
                    required
                    value={formData.assignedTo}
                    onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm text-slate-800 focus:outline-none focus:border-blue-400 cursor-pointer"
                  >
                    <option value="">Select employee...</option>
                    {users.map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.firstName} {u.lastName} - {u.department} ({u.designation})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {formData.assignmentType === 'designation_wise' && (
                <div>
                  <label className="block text-slate-700 font-semibold mb-1.5 text-xs uppercase tracking-wider">Select Designation *</label>
                  <select
                    required
                    value={formData.department}
                    onChange={(e) => {
                      const selectedDesignation = e.target.value;
                      const usersWithDesignation = users.filter(u => u.designation === selectedDesignation);
                      const userIds = usersWithDesignation.map(u => u._id).join(',');
                      setFormData({ ...formData, department: selectedDesignation, assignedTo: userIds });
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm text-slate-800 focus:outline-none focus:border-blue-400 cursor-pointer"
                  >
                    <option value="">Select designation...</option>
                    {[...new Set(users.map(u => u.designation))].map((desig) => {
                      const count = users.filter(u => u.designation === desig).length;
                      return (
                        <option key={desig} value={desig}>
                          {desig} (Total Users: {count})
                        </option>
                      );
                    })}
                  </select>
                  {formData.department && formData.assignmentType === 'designation_wise' && (
                    <div className="mt-2 p-2.5 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-[10px] text-blue-800 font-semibold">
                        Task will be assigned to {users.filter(u => u.designation === formData.department).length} user(s) with designation "{formData.department}"
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <GoogleIcon name="progress_activity" size={14} className="animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <GoogleIcon name="check" size={14} />
                      Create Task
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Detail Modal */}
      {showTaskDetail && selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => {
            setShowTaskDetail(false);
            setSelectedTask(null);
          }}
          onAction={handleTaskAction}
          isManager={isManager}
        />
      )}
    </div>
  );
}

// Task Detail Modal Component
function TaskDetailModal({ task, onClose, onAction, isManager }: { task: Task; onClose: () => void; onAction: (id: string, action: any, reason?: string) => void; isManager: boolean }) {
  const [actionReason, setActionReason] = useState('');
  const [showReasonInput, setShowReasonInput] = useState<'hold' | 'reject' | null>(null);

  const handleActionClick = (action: 'accept' | 'hold' | 'reject' | 'complete') => {
    if (action === 'hold' || action === 'reject') {
      setShowReasonInput(action);
    } else {
      onAction(task._id, action);
    }
  };

  const handleReasonSubmit = () => {
    if (!actionReason || !actionReason.trim()) {
      alert('Please provide a reason');
      return;
    }
    onAction(task._id, showReasonInput!, actionReason);
    setShowReasonInput(null);
    setActionReason('');
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

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start border-b border-slate-200 pb-3">
          <div className="flex-1">
            <h3 className="text-base font-bold text-slate-900 pr-8">{task.title}</h3>
              <p className="text-xs text-slate-500 mt-1">{task.description || 'No description provided'}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 cursor-pointer">
            <GoogleIcon name="close" size={20} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-slate-500 font-semibold block text-[10px] uppercase">Priority</span>
            <span className={`inline-block mt-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border ${getPriorityColor(task.priority)}`}>
              {task.priority}
            </span>
          </div>
          <div>
            <span className="text-slate-500 font-semibold block text-[10px] uppercase">Status</span>
            <span className="inline-block mt-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border bg-slate-100 text-slate-700 border-slate-200">
              {task.status.replace('_', ' ')}
            </span>
          </div>
          <div>
            <span className="text-slate-500 font-semibold block text-[10px] uppercase">Due Date</span>
            <span className="text-slate-800 font-bold text-sm mt-1 block">
              {new Date(task.dueDate).toLocaleDateString()} {task.dueTime && <span className="font-mono">at {task.dueTime}</span>}
            </span>
          </div>
          <div>
            <span className="text-slate-500 font-semibold block text-[10px] uppercase">Evidence</span>
            <span className="text-slate-800 font-bold text-sm mt-1 block">
              {task.evidenceRequirement === 'mandatory' ? '📸 Mandatory' : 'Optional'}
            </span>
          </div>
        </div>

        {task.responses.length > 0 && (
          <div className="border-t border-slate-200 pt-4">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">Response History</h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {task.responses.map((resp, idx) => (
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
                </div>
              ))}
            </div>
          </div>
        )}

        {showReasonInput && (
          <div className="border-t border-slate-200 pt-4">
            <label className="block text-slate-700 font-semibold mb-2 text-xs uppercase tracking-wider">
              {showReasonInput === 'hold' ? 'Hold Reason' : 'Rejection Reason'} *
            </label>
            <textarea
              rows={3}
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm text-slate-800 focus:outline-none focus:border-blue-400"
              placeholder={`Please provide reason...`}
            />
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => setShowReasonInput(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleReasonSubmit}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                Submit
              </button>
            </div>
          </div>
        )}

        {!showReasonInput && (
          <div className="flex gap-2 pt-4 border-t border-slate-200">
            {task.status === 'Pending' && (
              <>
                <button
                  onClick={() => handleActionClick('accept')}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  ✓ Accept
                </button>
                <button
                  onClick={() => handleActionClick('hold')}
                  className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white py-2.5 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  ⏸ Hold
                </button>
                <button
                  onClick={() => handleActionClick('reject')}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  ✕ Reject
                </button>
              </>
            )}
            {(task.status === 'Accepted' || task.status === 'In_Progress') && (
              <button
                onClick={() => handleActionClick('complete')}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                ✓ Mark Complete
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}