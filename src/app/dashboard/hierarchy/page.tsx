'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import {
  ShieldCheck,
  UserPlus,
  Info,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  QrCode,
  Users,
  Building,
  Plus,
  X,
  ChevronRight,
  ChevronDown,
  ArrowRightLeft,
  Search,
  Copy,
  Check,
  ShieldAlert,
  Activity,
  Clock,
  Compass,
} from 'lucide-react';
import { DEPARTMENTS } from '@/constants/departments';

interface TreeNode {
  id: string;
  name: string;
  designation: string;
  role: string;
  departmentName: string;
  email: string;
  employeeId?: string;
  hotelCode: string;
  children: any[];
  hasParent?: boolean;
}

interface Organization {
  _id: string;
  name: string;
  code?: string;
}

interface Department {
  _id: string;
  name: string;
  organization: string;
  hotel?: any;
  manager?: any;
}

interface InviteDetails {
  inviteCode: string;
  inviteLink: string;
  organizationId: { _id: string; name: string; code?: string };
  departmentId: { _id: string; name: string };
  managerId: { _id: string; firstName: string; lastName: string; designation?: string };
}

export default function HierarchyPage() {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('invites');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Organization & Department
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [allHotels, setAllHotels] = useState<any[]>([]);
  const [allEmployees, setAllEmployees] = useState<any[]>([]);
  const [allManagers, setAllManagers] = useState<any[]>([]);

  // Tree
  const [tree, setTree] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterHotel, setFilterHotel] = useState('');
  const [filterManager, setFilterManager] = useState('');
  const [collapsedNodes, setCollapsedNodes] = useState<Record<string, boolean>>({});

  // Invites
  const [invites, setInvites] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [generatedQR, setGeneratedQR] = useState<any>(null);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // Team
  const [team, setTeam] = useState<any[]>([]);
  const [reportingPath, setReportingPath] = useState<any[]>([]);

  // Analytics
  const [analytics, setAnalytics] = useState<any>(null);

  // Modals
  const [orgModalOpen, setOrgModalOpen] = useState(false);
  const [deptModalOpen, setDeptModalOpen] = useState(false);
  const [createDeptModalOpen, setCreateDeptModalOpen] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [qrDirectView, setQrDirectView] = useState<any>(null);
  const [memberEditForm, setMemberEditForm] = useState<any>(null);

  // Custom Department Form states
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptCode, setNewDeptCode] = useState('');
  const [newDeptDesc, setNewDeptDesc] = useState('');
  const [newDeptHead, setNewDeptHead] = useState('');
  const [newDeptStatus, setNewDeptStatus] = useState('Active');
  const [newDeptOrgId, setNewDeptOrgId] = useState('');
  const [newDeptHotelId, setNewDeptHotelId] = useState('');

  // Form states
  const [orgName, setOrgName] = useState('');
  const [orgCodeInput, setOrgCodeInput] = useState('');
  const [deptName, setDeptName] = useState('');
  const [deptOrgId, setDeptOrgId] = useState('');
  const [deptHotelId, setDeptHotelId] = useState('');
  const [deptManagerId, setDeptManagerId] = useState('');
  const [inviteOrgId, setInviteOrgId] = useState('');
  const [inviteDeptId, setInviteDeptId] = useState('');
  const [inviteExpiry, setInviteExpiry] = useState(7);
  const [transferEmpId, setTransferEmpId] = useState('');
  const [transferManagerId, setTransferManagerId] = useState('');
  const [transferDeptId, setTransferDeptId] = useState('');

  const [localSuccess, setLocalSuccess] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  // Fetch functions defined before use
  const fetchOrganizationsAndDepartments = async () => {
    try {
      const res = await api.get('/organization/list');
      setOrganizations(res.data.organizations || []);
      setDepartments(res.data.departments || []);
    } catch (err) {
      console.error('Error fetching orgs/depts:', err);
    }
  };

  const fetchHierarchyTree = async (params: any) => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (params?.departmentId) query.set('departmentId', params.departmentId);
      if (params?.hotelId) query.set('hotelId', params.hotelId);
      if (params?.managerId) query.set('managerId', params.managerId);
      if (params?.search) query.set('search', params.search);
      const qs = query.toString();
      const res = await api.get(`/hierarchy/tree${qs ? `?${qs}` : ''}`);
      setTree(res.data.tree || []);
    } catch (err) {
      console.error('Error fetching tree:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveInvites = async () => {
    try {
      const res = await api.get('/hierarchy/invites/active');
      setInvites(res.data.invites || []);
    } catch (err) {
      console.error('Error fetching invites:', err);
    }
  };

  const fetchPendingRequests = async () => {
    try {
      const res = await api.get('/hierarchy/requests/pending');
      setPendingRequests(res.data.requests || []);
    } catch (err) {
      console.error('Error fetching pending requests:', err);
    }
  };

  const fetchTeamStructure = async () => {
    try {
      const res = await api.get('/hierarchy/team');
      setTeam(res.data.team || []);
    } catch (err) {
      console.error('Error fetching team:', err);
    }
  };

  const fetchReportingPath = async () => {
    try {
      const res = await api.get('/hierarchy/reporting');
      setReportingPath(res.data.path || []);
    } catch (err) {
      console.error('Error fetching reporting path:', err);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await api.get('/hierarchy/analytics');
      setAnalytics(res.data);
    } catch (err) {
      console.error('Error fetching analytics:', err);
    }
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await api.get('/auth/me');
        setUser(res.data.user);
      } catch (err) {
        console.error('Failed to fetch user', err);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (user?.role === 'EMPLOYEE') {
      setActiveTab('my-team');
    } else if (user?.role !== 'ROOT_ADMIN') {
      setActiveTab('invites');
    }
  }, [user]);

  useEffect(() => {
    fetchOrganizationsAndDepartments();
    const fetchHotels = async () => {
      try {
        const res = await api.get('/hotels');
        setAllHotels(res.data.hotels || []);
      } catch (err) {
        console.error('Error fetching hotels:', err);
      }
    };
    const fetchUsers = async () => {
      try {
        const res = await api.get('/employees');
        const list = res.data.employees || res.data.users || [];
        setAllEmployees(list);
        setAllManagers(list.filter((u: any) => ['ROOT_ADMIN', 'HOTEL_ADMIN', 'HR_MANAGER', 'DEPT_MANAGER'].includes(u.role)));
      } catch (err) {
        console.error('Error fetching users:', err);
      }
    };
    fetchHotels();
    fetchUsers();
  }, []);

  useEffect(() => {
    if (activeTab === 'tree') {
      fetchHierarchyTree({
        departmentId: filterDept || undefined,
        hotelId: filterHotel || undefined,
        managerId: filterManager || undefined,
        search: searchQuery || undefined,
      });
    } else if (activeTab === 'invites') {
      fetchActiveInvites();
      fetchPendingRequests();
    } else if (activeTab === 'analytics') {
      fetchAnalytics();
    } else if (activeTab === 'my-team') {
      if (user?.role === 'EMPLOYEE') {
        fetchReportingPath();
      } else {
        fetchTeamStructure();
      }
    }
  }, [activeTab, filterDept, filterHotel, filterManager, searchQuery]);

  const showSuccess = (msg: string) => {
    setLocalSuccess(msg);
    setTimeout(() => setLocalSuccess(null), 4000);
  };

  const showError = (msg: string) => {
    setLocalError(msg);
    setTimeout(() => setLocalError(null), 5000);
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim()) return;
    try {
      await api.post('/organization/create', { name: orgName, code: orgCodeInput || undefined });
      setOrgName('');
      setOrgCodeInput('');
      setOrgModalOpen(false);
      showSuccess('Organization created successfully.');
      fetchOrganizationsAndDepartments();
    } catch (err: any) {
      showError(err.message || 'Failed to create organization');
    }
  };

  const handleCreateDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptName.trim() || !deptOrgId) return;
    try {
      await api.post('/organization/department', {
        name: deptName,
        organizationId: deptOrgId,
        hotelId: deptHotelId || undefined,
        managerId: deptManagerId || undefined,
      });
      setDeptName('');
      setDeptOrgId('');
      setDeptHotelId('');
      setDeptManagerId('');
      setDeptModalOpen(false);
      showSuccess('Department created successfully.');
      fetchOrganizationsAndDepartments();
    } catch (err: any) {
      showError(err.message || 'Failed to create department');
    }
  };

  const handleCreateCustomDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName.trim() || !newDeptCode.trim() || !newDeptOrgId) {
      showError('Department Name, Code, and Organization are required.');
      return;
    }
    setActionLoading(true);
    try {
      await api.post('/organization/department', {
        name: newDeptName.trim(),
        code: newDeptCode.trim().toUpperCase(),
        description: newDeptDesc.trim() || undefined,
        managerId: newDeptHead || undefined,
        status: newDeptStatus,
        organizationId: newDeptOrgId,
        hotelId: newDeptHotelId || undefined,
      });
      setNewDeptName('');
      setNewDeptCode('');
      setNewDeptDesc('');
      setNewDeptHead('');
      setNewDeptStatus('Active');
      setNewDeptOrgId('');
      setNewDeptHotelId('');
      setCreateDeptModalOpen(false);
      showSuccess('Custom department created successfully.');
      fetchOrganizationsAndDepartments();
    } catch (err: any) {
      showError(err.message || 'Failed to create department');
    } finally {
      setActionLoading(false);
    }
  };

  const handleGenerateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteOrgId || !inviteDeptId) return;
    try {
      const res = await api.post('/hierarchy/invite/generate', {
        organizationId: inviteOrgId,
        departmentId: inviteDeptId,
        expiresInDays: inviteExpiry,
      });
      setQrDirectView(res.data.invite);
      setInviteOrgId('');
      setInviteDeptId('');
      fetchActiveInvites();
    } catch (err: any) {
      showError(err.message || 'Failed to generate invite');
    }
  };

  const handleDisableInvite = async (inviteCode: string) => {
    if (!confirm('Are you sure you want to disable this invite link? This action cannot be undone.')) return;
    try {
      await api.post('/hierarchy/invite/disable', { inviteCode });
      showSuccess('Invite link disabled successfully.');
      fetchActiveInvites();
    } catch (err: any) {
      showError(err.message || 'Failed to disable invite link');
    }
  };

  const handleApprove = async (requestId: string) => {
    try {
      await api.post('/hierarchy/requests/approve', { requestId });
      showSuccess('Join request approved. Node added to hierarchy.');
      fetchPendingRequests();
    } catch (err: any) {
      showError(err.message || 'Approval failed');
    }
  };

  const handleReject = async (requestId: string) => {
    if (!confirm('Are you sure you want to reject this join request?')) return;
    try {
      await api.post('/hierarchy/requests/reject', { requestId });
      showSuccess('Join request rejected.');
      fetchPendingRequests();
    } catch (err: any) {
      showError(err.message || 'Rejection failed');
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferEmpId || !transferDeptId) return;
    try {
      await api.post('/hierarchy/transfer', {
        employeeId: transferEmpId,
        newManagerId: transferManagerId || null,
        newDepartmentId: transferDeptId,
      });
      setTransferEmpId('');
      setTransferManagerId('');
      setTransferDeptId('');
      setTransferModalOpen(false);
      showSuccess('Employee transferred successfully and hierarchy updated.');
      if (activeTab === 'tree') {
        fetchHierarchyTree({});
      }
    } catch (err: any) {
      showError(err.message || 'Transfer failed');
    }
  };

  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    setCopiedLink(link);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const toggleNode = (nodeId: string) => {
    setCollapsedNodes((prev) => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

  const renderTreeNode = (node: TreeNode, depth = 0) => {
    const isCollapsed = collapsedNodes[node.id];
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div key={node.id} className="select-none transition-all">
        <div
          style={{ paddingLeft: `${depth * 20}px` }}
          className="group flex items-center py-2 px-3 hover:bg-slate-800/40 border-l border-transparent hover:border-gold rounded-lg transition-colors cursor-pointer"
        >
          {hasChildren ? (
            <button
              onClick={(e) => { e.stopPropagation(); toggleNode(node.id); }}
              className="text-slate-500 hover:text-white p-0.5 rounded cursor-pointer mr-1"
            >
              {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
            </button>
          ) : (
            <div className="w-5" />
          )}

          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center font-bold text-xs text-gold uppercase shadow">
                {node.name.substring(0, 2)}
              </div>
              <div>
                <p className="text-xs font-semibold text-black flex items-center gap-1.5">
                  {node.name}
                  <span className="bg-slate-800/80 text-[9px] text-slate-400 border border-slate-700/60 px-1.5 py-0.5 rounded-full font-normal">
                    {node.designation}
                  </span>
                  {node.role !== 'EMPLOYEE' && (
                    <span className="bg-gold/15 text-[8px] text-gold border border-gold/20 px-1 py-0.5 rounded font-bold tracking-wide">
                      MGR
                    </span>
                  )}
                </p>
                <p className="text-[10px] text-slate-500 font-mono flex items-center gap-2 mt-0.5">
                  <span>ID: {node.employeeId || 'N/A'}</span>
                  <span>•</span>
                  <span>{node.email}</span>
                  <span>•</span>
                  <span className="text-gold lowercase">@{node.hotelCode}</span>
                </p>
              </div>
            </div>

            {user?.role === 'ROOT_ADMIN' && (
              <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 transition-opacity">
                <button
                  onClick={() => {
                    setTransferEmpId(node.id);
                    setTransferDeptId(departments.find((d) => d.name === node.departmentName)?._id || '');
                    setTransferModalOpen(true);
                  }}
                  title="Transfer Employee"
                  className="p-1 text-slate-400 hover:text-gold hover:bg-slate-800 rounded transition-colors cursor-pointer"
                >
                  <ArrowRightLeft size={13} />
                </button>
              </div>
            )}
          </div>
        </div>

        {hasChildren && !isCollapsed && (
          <div className="mt-1 border-l border-slate-800/80 ml-5.5 space-y-1">
            {node.children.map((child) => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-gold animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Dynamic Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Building className="text-gold" />
            Organization Hierarchy
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Configure enterprise layers, departments, and map manager reporting paths.
          </p>
        </div>

        {localSuccess && (
          <div className="bg-green-500/10 border border-green-500/20 text-green-400 text-xs py-2 px-4 rounded-lg flex items-center gap-2 animate-fadeIn">
            <Check size={14} />
            <span>{localSuccess}</span>
          </div>
        )}
        {localError && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs py-2 px-4 rounded-lg flex items-center gap-2 animate-fadeIn">
            <ShieldAlert size={14} />
            <span>{localError}</span>
          </div>
        )}

        {user?.role === 'ROOT_ADMIN' && (
          <div className="flex gap-2.5">
            <button
              onClick={() => setOrgModalOpen(true)}
              className="bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 px-3.5 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Plus size={14} />
              Add Org
            </button>
            <button
              onClick={() => setDeptModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white border border-blue-500 px-3.5 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-lg shadow-blue-500/20"
            >
              <Plus size={14} />
              Add Department
            </button>
            <button
              onClick={() => setCreateDeptModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-500 px-3.5 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-lg shadow-emerald-500/20"
            >
              <Plus size={14} />
              Create Department
            </button>
          </div>
        )}
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-slate-800/80 text-xs">
        {user?.role === 'ROOT_ADMIN' && (
          <button
            onClick={() => setActiveTab('tree')}
            className={`px-4 py-3.5 border-b-2 font-bold transition-all cursor-pointer ${
              activeTab === 'tree' ? 'border-gold text-white bg-slate-900/10' : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Org Tree Chart
          </button>
        )}
        {user?.role !== 'EMPLOYEE' && (
          <button
            onClick={() => setActiveTab('invites')}
            className={`px-4 py-3.5 border-b-2 font-bold transition-all cursor-pointer relative ${
              activeTab === 'invites' ? 'border-gold text-white bg-slate-900/10' : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Invites & Approvals
            {pendingRequests.length > 0 && (
              <span className="absolute top-2.5 right-1 w-2 h-2 rounded-full bg-gold animate-pulse" />
            )}
          </button>
        )}
        <button
          onClick={() => setActiveTab('my-team')}
          className={`px-4 py-3.5 border-b-2 font-bold transition-all cursor-pointer ${
            activeTab === 'my-team' ? 'border-gold text-white bg-slate-900/10' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          {user?.role === 'EMPLOYEE' ? 'My Reporting Line' : 'My Team Reports'}
        </button>
        {user?.role === 'ROOT_ADMIN' && (
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-3.5 border-b-2 font-bold transition-all cursor-pointer ${
              activeTab === 'analytics' ? 'border-gold text-white bg-slate-900/10' : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Analytics & Audits
          </button>
        )}
      </div>

      {/* Tab Contents */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <Loader2 className="w-8 h-8 text-gold animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* TAB 1: TREE CHART VIEW */}
          {activeTab === 'tree' && user?.role === 'ROOT_ADMIN' && (
            <div className="space-y-4">
              {/* Tree Filters */}
              <div className="bg-card-dark border border-slate-800/80 rounded-xl p-4 flex flex-col md:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search node by name, ID, or designation..."
                    className="w-full bg-slate-950 text-white text-xs border border-slate-800 rounded-lg pl-10 pr-3.5 py-2.5 outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:w-[60%]">
                  <select
                    value={filterDept}
                    onChange={(e) => setFilterDept(e.target.value)}
                    className="bg-slate-950 text-white text-xs border border-slate-800 rounded-lg px-3.5 py-2.5 outline-none focus:border-gold cursor-pointer"
                  >
                    <option value="">All Departments</option>
                    {departments.map((dept) => (
                      <option key={dept._id} value={dept._id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={filterHotel}
                    onChange={(e) => setFilterHotel(e.target.value)}
                    className="bg-slate-950 text-white text-xs border border-slate-800 rounded-lg px-3.5 py-2.5 outline-none focus:border-gold"
                  >
                    <option value="">All Hotels</option>
                    {allHotels.map((h) => (
                      <option key={h._id} value={h._id}>{h.name} ({h.hotelCode})</option>
                    ))}
                  </select>
                  <select
                    value={filterManager}
                    onChange={(e) => setFilterManager(e.target.value)}
                    className="bg-slate-950 text-white text-xs border border-slate-800 rounded-lg px-3.5 py-2.5 outline-none focus:border-gold"
                  >
                    <option value="">All Managers</option>
                    {allManagers.map((m) => (
                      <option key={m._id} value={m._id}>{m.firstName} {m.lastName}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Render Tree Output */}
              <div className="bg-card-dark border border-slate-800/80 rounded-xl p-6 overflow-hidden">
                {tree.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 text-xs">
                    No organizational nodes match the current criteria.
                  </div>
                ) : (
                  <div className="space-y-8">
                    {tree.map((org) => (
                      <div key={org.id} className="space-y-4">
                        {/* Org Header */}
                        <div className="flex items-center gap-2 border-b border-slate-850 pb-2">
                          <Building className="text-gold shrink-0" size={16} />
                          <h2 className="text-sm font-bold text-white uppercase tracking-wider">{org.name}</h2>
                          {org.code && (
                            <span className="bg-slate-800/80 text-slate-400 font-mono text-[9px] border border-slate-700 px-1.5 py-0.5 rounded">
                              {org.code}
                            </span>
                          )}
                        </div>

                        {/* Dept Level */}
                        <div className="ml-4 space-y-6">
                          {org.departments.map((dept: any) => (
                            <div key={dept.id} className="space-y-3">
                              <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 bg-slate-900/30 py-1.5 px-3 rounded-lg border border-slate-850/60 inline-flex">
                                <span className="w-1.5 h-1.5 rounded-full bg-gold" />
                                <span>{dept.name} Department</span>
                                <span className="text-[10px] text-slate-500 font-normal">
                                  ({dept.employeesCount} staff)
                                </span>
                              </div>

                              {/* Department Employee Tree Nodes */}
                              <div className="ml-3 border-l border-slate-850 pl-3 space-y-1">
                                {dept.structure.map((node: any) => renderTreeNode(node))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: INVITES & APPROVALS (MANAGERS / ADMINS) */}
          {activeTab === 'invites' && user?.role !== 'EMPLOYEE' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Generate QR Box */}
              <div className="lg:col-span-1 bg-card-dark border border-slate-800/80 rounded-xl p-5 space-y-4 h-fit">
                <div className="flex items-center gap-2 border-b border-slate-850 pb-3">
                  <QrCode size={18} className="text-gold" />
                  <h2 className="text-xs font-bold text-white uppercase tracking-wider">Generate Join Invite</h2>
                </div>

                <form onSubmit={handleGenerateInvite} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1.5">Select Organization *</label>
                    <select
                      required
                      value={inviteOrgId}
                      onChange={(e) => setInviteOrgId(e.target.value)}
                      className="w-full bg-slate-950 text-white text-xs border border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-gold"
                    >
                      <option value="">Choose organization...</option>
                      {organizations.map((org) => (
                        <option key={org._id} value={org._id}>{org.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1.5">Select Department *</label>
                    <select
                      required
                      value={inviteDeptId}
                      onChange={(e) => setInviteDeptId(e.target.value)}
                      className="w-full bg-slate-950 text-white text-xs border border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-gold"
                    >
                      <option value="">Choose department...</option>
                      {departments.map((d) => (
                        <option key={d._id} value={d._id}>{d.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1.5">Expiry Interval</label>
                    <select
                      value={inviteExpiry}
                      onChange={(e) => setInviteExpiry(Number(e.target.value))}
                      className="w-full bg-slate-950 text-white text-xs border border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-gold"
                    >
                      <option value={1}>Expires in 1 Day</option>
                      <option value={3}>Expires in 3 Days</option>
                      <option value={7}>Expires in 7 Days</option>
                      <option value={30}>Expires in 30 Days</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="w-full bg-gold hover:bg-gold-light disabled:bg-gold/40 text-slate-dark font-bold text-xs py-2.5 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin text-slate-dark" /> : <QrCode size={14} />}
                    Create Invite QR Code
                  </button>
                </form>
              </div>

              {/* Pending Approvals + Active Invite Links list */}
              <div className="lg:col-span-2 space-y-6">
                {/* Pending approvals */}
                <div className="bg-card-dark border border-slate-800/80 rounded-xl p-5 space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-850 pb-3">
                    <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Users size={16} className="text-gold" />
                      Pending Join Requests
                    </h2>
                    <span className="bg-gold/15 text-gold border border-gold/25 text-[9px] px-2 py-0.5 rounded-full font-bold">
                      {pendingRequests.length} pending
                    </span>
                  </div>

                  <div className="space-y-3">
                    {pendingRequests.map((req) => (
                      <div key={req._id} className="p-4 bg-slate-950/40 border border-slate-850 rounded-xl flex flex-col sm:flex-row justify-between sm:items-center gap-4 hover:border-slate-800 transition-colors">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-xs font-bold text-white">{req.name}</h3>
                            <span className="bg-slate-800 text-[8px] text-slate-400 border border-slate-700 px-1.5 py-0.5 rounded font-mono">
                              {req.employeeId}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1">
                            Role: <span className="text-white font-medium">{req.designation}</span> • Department: <span className="text-white font-medium">{req.departmentId?.name || 'N/A'}</span>
                          </p>
                          <p className="text-[9px] text-slate-500 font-mono mt-0.5 flex gap-2">
                            <span>Email: {req.email}</span>
                            <span>•</span>
                            <span>Phone: {req.mobile}</span>
                            <span>•</span>
                            <span>Code: {req.inviteCode}</span>
                          </p>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center">
                          <button
                            onClick={() => handleReject(req._id)}
                            className="bg-red-500/10 hover:bg-red-500/25 border border-red-500/20 hover:border-red-500/40 text-red-400 p-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                            title="Reject Candidate"
                          >
                            <X size={14} />
                          </button>
                          <button
                            onClick={() => handleApprove(req._id)}
                            className="bg-green-500/10 hover:bg-green-500/25 border border-green-500/20 hover:border-green-500/40 text-green-400 px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                            title="Approve & Map"
                          >
                            <Check size={14} />
                            Approve
                          </button>
                        </div>
                      </div>
                    ))}

                    {pendingRequests.length === 0 && (
                      <p className="text-center py-6 text-slate-500 text-xs">
                        No pending join requests to review.
                      </p>
                    )}
                  </div>
                </div>

                {/* Active invites */}
                <div className="bg-card-dark border border-slate-800/80 rounded-xl p-5 space-y-4">
                  <div className="border-b border-slate-850 pb-3">
                    <h2 className="text-xs font-bold text-white uppercase tracking-wider">Active QR Codes / Invites</h2>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-950/30 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                          <th className="p-3">Invite Code</th>
                          <th className="p-3">Org / Department</th>
                          <th className="p-3">Expires At</th>
                          <th className="p-3">Status</th>
                          <th className="p-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850 text-slate-300">
                        {invites.map((inv) => (
                          <tr key={inv._id} className="hover:bg-slate-900/10">
                            <td className="p-3 font-mono font-bold text-gold">{inv.inviteCode}</td>
                            <td className="p-3">
                              <div>{inv.organizationId?.name}</div>
                              <div className="text-[10px] text-slate-500 mt-0.5">{inv.departmentId?.name}</div>
                            </td>
                            <td className="p-3 font-mono text-[10px] text-slate-400">
                              {inv.expiresAt ? new Date(inv.expiresAt).toLocaleDateString() : 'Never'}
                            </td>
                            <td className="p-3">
                              <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                                inv.status === 'Active' ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'
                              }`}>
                                {inv.status}
                              </span>
                            </td>
                            <td className="p-3 text-right space-x-2">
                              <button
                                onClick={() => handleCopyLink(inv.inviteLink)}
                                className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors cursor-pointer inline-flex items-center gap-1"
                                title="Copy Invite Link"
                              >
                                {copiedLink === inv.inviteLink ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                              </button>
                              {inv.status === 'Active' && (
                                <button
                                  onClick={() => handleDisableInvite(inv.inviteCode)}
                                  className="p-1 hover:bg-red-950/40 rounded text-slate-400 hover:text-red-400 transition-colors cursor-pointer inline-flex items-center gap-1"
                                  title="Disable Link"
                                >
                                  <X size={12} />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}

                        {invites.length === 0 && (
                          <tr>
                            <td colSpan={5} className="text-center p-6 text-slate-500">
                              No invite codes generated.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: REPORTING PATH / TEAM (EMPLOYEES & MANAGERS) */}
          {activeTab === 'my-team' && (
            <div className="bg-card-dark border border-slate-800/80 rounded-xl p-6 space-y-6">
              {user?.role === 'EMPLOYEE' ? (
                // Employee Reporting Line
                <div>
                  <h2 className="text-xs font-bold text-white uppercase tracking-wider border-b border-slate-850 pb-3 flex items-center gap-2">
                    <Compass size={16} className="text-gold" />
                    My Direct Reporting Authority Line
                  </h2>
                  <div className="relative border-l-2 border-slate-800 ml-4 pl-6 space-y-8 mt-6">
                    {reportingPath.map((mgr, index) => (
                      <div key={mgr._id} className="relative">
                        {/* Dot */}
                        <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-gold border-4 border-slate-950 shadow" />
                        <div>
                          <p className="text-xs font-bold text-white">{mgr.firstName} {mgr.lastName}</p>
                          <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                            Role: {mgr.designation || 'Reporting Manager'} ({mgr.department})
                          </p>
                          <p className="text-[9px] text-slate-500 font-mono mt-0.5">{mgr.email} • {mgr.phone || 'N/A'}</p>
                        </div>
                      </div>
                    ))}

                    {/* Logged in Employee Node */}
                    <div className="relative">
                      <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-blue-500 border-4 border-slate-950 shadow" />
                      <div>
                        <p className="text-xs font-bold text-blue-400">You ({user.firstName} {user.lastName})</p>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                          Role: {user.designation || 'Staff'} ({user.department})
                        </p>
                        <p className="text-[9px] text-slate-500 font-mono mt-0.5">{user.email}</p>
                      </div>
                    </div>

                    {reportingPath.length === 0 && (
                      <div className="text-xs text-slate-500 py-2">
                        You do not report to any managers in the hierarchy (Top Level).
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                // Manager Team Structure
                <div>
                  <h2 className="text-xs font-bold text-white uppercase tracking-wider border-b border-slate-850 pb-3 flex justify-between items-center">
                    <span>Direct & Indirect Reporting Team members</span>
                    <span className="bg-slate-850 border border-slate-800 text-[10px] px-2.5 py-0.5 rounded-full text-slate-400">
                      Total Size: {team.length} members
                    </span>
                  </h2>

                  <div className="overflow-x-auto mt-4">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-950/30 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                          <th className="p-3">Staff Name</th>
                          <th className="p-3">Employee ID</th>
                          <th className="p-3">Department</th>
                          <th className="p-3">Designation</th>
                          <th className="p-3">Status</th>
                          <th className="p-3">Hierarchy Path</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850 text-slate-300">
                        {team.map((struct) => (
                          <tr key={struct._id} className="hover:bg-slate-900/10">
                            <td className="p-3 font-semibold text-white">
                              {struct.userId?.firstName} {struct.userId?.lastName}
                            </td>
                            <td className="p-3 font-mono text-slate-400">{struct.userId?.employeeId || '—'}</td>
                            <td className="p-3">{struct.userId?.department || '—'}</td>
                            <td className="p-3">{struct.userId?.designation || '—'}</td>
                            <td className="p-3">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                struct.userId?.status === 'Active' ? 'bg-green-500/10 text-green-400' : 'bg-slate-800 text-slate-400'
                              }`}>
                                {struct.userId?.status || 'N/A'}
                              </span>
                            </td>
                            <td className="p-3 font-mono text-[9px] text-slate-500 truncate max-w-[200px]" title={struct.path}>
                              {struct.path}
                            </td>
                          </tr>
                        ))}

                        {team.length === 0 && (
                          <tr>
                            <td colSpan={6} className="text-center p-6 text-slate-500">
                              You currently do not have any employees mapped under your team. Generate invite QRs to bring team members onboard.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: ANALYTICS & AUDIT LOGS (ROOT ADMINS) */}
          {activeTab === 'analytics' && user?.role === 'ROOT_ADMIN' && analytics && (
            <div className="space-y-6">
              {/* Analytics Totals */}
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                <div className="bg-card-dark border border-slate-800/80 rounded-xl p-4 text-center">
                  <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Organizations</p>
                  <p className="text-xl font-bold text-white mt-1.5">{analytics.totals.organizations}</p>
                </div>
                <div className="bg-card-dark border border-slate-800/80 rounded-xl p-4 text-center">
                  <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Departments</p>
                  <p className="text-xl font-bold text-white mt-1.5">{analytics.totals.departments}</p>
                </div>
                <div className="bg-card-dark border border-slate-800/80 rounded-xl p-4 text-center">
                  <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Managers</p>
                  <p className="text-xl font-bold text-white mt-1.5">{analytics.totals.managers}</p>
                </div>
                <div className="bg-card-dark border border-slate-800/80 rounded-xl p-4 text-center">
                  <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Active Staff</p>
                  <p className="text-xl font-bold text-white mt-1.5">{analytics.totals.employees}</p>
                </div>
                <div className="bg-card-dark border border-slate-800/80 rounded-xl p-4 text-center">
                  <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Pending Join</p>
                  <p className="text-xl font-bold text-white mt-1.5 text-gold">{analytics.totals.pendingJoinRequests}</p>
                </div>
                <div className="bg-card-dark border border-slate-800/80 rounded-xl p-4 text-center">
                  <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Active Links</p>
                  <p className="text-xl font-bold text-white mt-1.5">{analytics.totals.activeInviteLinks}</p>
                </div>
              </div>

              {/* Department Distribution & Hierarchy Growth */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Department distribution */}
                <div className="bg-card-dark border border-slate-800/80 rounded-xl p-5 space-y-4">
                  <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Activity size={16} className="text-gold" />
                    Department Employee Distribution
                  </h2>
                  <div className="space-y-3 pt-2">
                    {analytics.departmentDistribution.map((item: any) => (
                      <div key={item.department} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-300">{item.department} Department</span>
                          <span className="text-white font-semibold">{item.count} staff</span>
                        </div>
                        <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-850">
                          <div
                            style={{ width: `${Math.min(100, (item.count / Math.max(1, analytics.totals.employees)) * 100)}%` }}
                            className="bg-gold h-full rounded-full"
                          />
                        </div>
                      </div>
                    ))}
                    {analytics.departmentDistribution.length === 0 && (
                      <p className="text-center py-6 text-slate-500 text-xs">No data registered.</p>
                    )}
                  </div>
                </div>

                {/* Hierarchy growth */}
                <div className="bg-card-dark border border-slate-800/80 rounded-xl p-5 space-y-4">
                  <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Clock size={16} className="text-gold" />
                    Hierarchy Growth Trend
                  </h2>
                  <div className="space-y-3 pt-2">
                    {analytics.hierarchyGrowth.map((item: any) => (
                      <div key={item.month} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-300 font-mono">{item.month}</span>
                          <span className="text-white font-semibold">{item.count} onboarded</span>
                        </div>
                        <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-850">
                          <div
                            style={{ width: `${Math.min(100, (item.count / Math.max(1, analytics.totals.employees)) * 100)}%` }}
                            className="bg-blue-500 h-full rounded-full"
                          />
                        </div>
                      </div>
                    ))}
                    {analytics.hierarchyGrowth.length === 0 && (
                      <p className="text-center py-6 text-slate-500 text-xs">No growth records found.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Recent Audits */}
              <div className="bg-card-dark border border-slate-800/80 rounded-xl p-5 space-y-4">
                <div className="border-b border-slate-850 pb-3">
                  <h2 className="text-xs font-bold text-white uppercase tracking-wider">Hierarchy Operational Audit Logs</h2>
                </div>

                <div className="space-y-2">
                  {analytics.recentAudits.map((log: any) => (
                    <div key={log._id} className="p-3 bg-slate-950/30 border border-slate-850 rounded-lg text-xs flex justify-between gap-4">
                      <div>
                        <span className="font-bold text-slate-200 uppercase tracking-wide bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded mr-2 text-[8px]">
                          {log.action}
                        </span>
                        <span className="text-slate-400 font-mono text-[10px]">{log.details}</span>
                      </div>
                      <div className="text-right text-[10px] text-slate-500 shrink-0 font-mono">
                        <p className="font-medium text-slate-400">{log.userId?.firstName} {log.userId?.lastName}</p>
                        <p className="mt-0.5">{new Date(log.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}

                  {analytics.recentAudits.length === 0 && (
                    <p className="text-center py-4 text-slate-500 text-xs">No logs recorded.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* MODALS SECTION */}
      {/* ==================================================== */}

      {/* Modal 1: Add Organization */}
      {orgModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <button
              onClick={() => setOrgModalOpen(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-white p-1 hover:bg-slate-850 rounded-lg transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-850 pb-3 mb-4">
              Add Top-Level Organization
            </h2>
            <form onSubmit={handleCreateOrg} className="space-y-4">
              <div>
                <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1.5">Organization Name *</label>
                <input
                  required
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="e.g. OXY Hotels"
                  className="w-full bg-slate-950 text-white text-xs border border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-gold placeholder:text-slate-650"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1.5">Org Code (Shortcode)</label>
                <input
                  type="text"
                  value={orgCodeInput}
                  onChange={(e) => setOrgCodeInput(e.target.value)}
                  placeholder="e.g. OXY"
                  className="w-full bg-slate-950 text-white text-xs border border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-gold placeholder:text-slate-650"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOrgModalOpen(false)}
                  className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="bg-gold hover:bg-gold-light disabled:bg-gold/45 text-slate-dark px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  Save Org
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Add Department */}
      {deptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <button
              onClick={() => setDeptModalOpen(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-white p-1 hover:bg-slate-850 rounded-lg transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-850 pb-3 mb-4">
              Add Department
            </h2>
            <form onSubmit={handleCreateDept} className="space-y-4">
              <div>
                <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1.5">Department Name *</label>
                <select
                  required
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                  className="w-full bg-slate-950 text-white text-xs border border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-gold"
                >
                  <option value="">Choose department name...</option>
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1.5">Select Organization *</label>
                <select
                  required
                  value={deptOrgId}
                  onChange={(e) => setDeptOrgId(e.target.value)}
                  className="w-full bg-slate-950 text-white text-xs border border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-gold"
                >
                  <option value="">Choose organization...</option>
                  {organizations.map((org) => (
                    <option key={org._id} value={org._id}>{org.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1.5">Associate Hotel (Optional)</label>
                <select
                  value={deptHotelId}
                  onChange={(e) => setDeptHotelId(e.target.value)}
                  className="w-full bg-slate-950 text-white text-xs border border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-gold"
                >
                  <option value="">None (Global)</option>
                  {allHotels.map((h) => (
                    <option key={h._id} value={h._id}>{h.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1.5">Associate Manager (Optional)</label>
                <select
                  value={deptManagerId}
                  onChange={(e) => setDeptManagerId(e.target.value)}
                  className="w-full bg-slate-950 text-white text-xs border border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-gold"
                >
                  <option value="">None</option>
                  {allManagers.map((m) => (
                    <option key={m._id} value={m._id}>{m.firstName} {m.lastName} ({m.designation || m.role})</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeptModalOpen(false)}
                  className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="bg-gold hover:bg-gold-light disabled:bg-gold/45 text-slate-dark px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  Save Department
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2.5: Create Custom Department */}
      {createDeptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <button
              onClick={() => setCreateDeptModalOpen(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-white p-1 hover:bg-slate-850 rounded-lg transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-850 pb-3 mb-4">
              Create Department
            </h2>
            <form onSubmit={handleCreateCustomDept} className="space-y-4">
              <div>
                <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1.5 font-bold tracking-wider">Department Name *</label>
                <input
                  required
                  type="text"
                  list="hospitality-suggestions"
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                  placeholder="e.g. Front Office"
                  className="w-full bg-slate-950 text-white text-xs border border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-gold placeholder:text-slate-650"
                />
                <datalist id="hospitality-suggestions">
                  <option value="Front Office" />
                  <option value="Housekeeping" />
                  <option value="Food & Beverage Service" />
                  <option value="Kitchen" />
                  <option value="HR" />
                  <option value="IT" />
                  <option value="Accounts" />
                  <option value="Sales & Marketing" />
                  <option value="Maintenance" />
                  <option value="Security" />
                  <option value="Purchase & Store" />
                  <option value="Reservation" />
                  <option value="Laundry" />
                  <option value="Engineering" />
                  <option value="Administration" />
                </datalist>
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1.5 font-bold tracking-wider">Department Code *</label>
                <input
                  required
                  type="text"
                  value={newDeptCode}
                  onChange={(e) => setNewDeptCode(e.target.value)}
                  placeholder="e.g. FRONT"
                  className="w-full bg-slate-950 text-white text-xs border border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-gold placeholder:text-slate-650"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1.5 font-bold tracking-wider">Description</label>
                <textarea
                  value={newDeptDesc}
                  onChange={(e) => setNewDeptDesc(e.target.value)}
                  placeholder="Describe the department's responsibilities..."
                  className="w-full bg-slate-950 text-white text-xs border border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-gold placeholder:text-slate-650 min-h-[60px]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1.5 font-bold tracking-wider">Select Organization *</label>
                <select
                  required
                  value={newDeptOrgId}
                  onChange={(e) => setNewDeptOrgId(e.target.value)}
                  className="w-full bg-slate-950 text-white text-xs border border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-gold cursor-pointer"
                >
                  <option value="">Choose organization...</option>
                  {organizations.map((org) => (
                    <option key={org._id} value={org._id}>{org.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1.5 font-bold tracking-wider">Associate Hotel (Optional)</label>
                <select
                  value={newDeptHotelId}
                  onChange={(e) => setNewDeptHotelId(e.target.value)}
                  className="w-full bg-slate-950 text-white text-xs border border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-gold cursor-pointer"
                >
                  <option value="">None (Global)</option>
                  {allHotels.map((h) => (
                    <option key={h._id} value={h._id}>{h.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1.5 font-bold tracking-wider">Department Head / Manager (Optional)</label>
                <select
                  value={newDeptHead}
                  onChange={(e) => setNewDeptHead(e.target.value)}
                  className="w-full bg-slate-950 text-white text-xs border border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-gold cursor-pointer"
                >
                  <option value="">None</option>
                  {allManagers.map((m) => (
                    <option key={m._id} value={m._id}>{m.firstName} {m.lastName} ({m.designation || m.role})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1.5 font-bold tracking-wider">Status</label>
                <select
                  value={newDeptStatus}
                  onChange={(e) => setNewDeptStatus(e.target.value)}
                  className="w-full bg-slate-950 text-white text-xs border border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-gold cursor-pointer"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateDeptModalOpen(false)}
                  className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="bg-gold hover:bg-gold-light disabled:bg-gold/45 text-slate-dark px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  Create Department
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Direct View - Opens directly on button click */}
      {qrDirectView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl relative text-center space-y-5">
            <button
              onClick={() => setQrDirectView(null)}
              className="absolute top-4 right-4 text-slate-500 hover:text-white p-1 hover:bg-slate-850 rounded-lg transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>

            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">QR Join Invitation</h2>
              <p className="text-[10px] text-slate-400 mt-1">
                {qrDirectView.organizationId?.name} • {qrDirectView.departmentId?.name} Department
              </p>
            </div>

            {/* QR Image */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-850 inline-block">
              <img
                src={qrDirectView.qrCode}
                alt={`QR Link Code ${qrDirectView.inviteCode}`}
                className="w-48 h-48 block"
              />
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-slate-950 border border-slate-850 rounded-lg text-xs flex justify-between items-center">
                <span className="font-mono text-gold font-bold text-sm tracking-wide">{qrDirectView.inviteCode}</span>
                <button
                  onClick={() => handleCopyLink(qrDirectView.inviteLink)}
                  className="bg-slate-850 hover:bg-slate-800 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-colors cursor-pointer flex items-center gap-1"
                >
                  {copiedLink === qrDirectView.inviteLink ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                  Copy Link
                </button>
              </div>

              <p className="text-[10px] text-slate-500 leading-normal">
                Candidates can scan the QR code using their mobile devices or use the invite link directly to register.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Member Edit Form - Manager can fill details after scan */}
      {memberEditForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <button
              onClick={() => setMemberEditForm(null)}
              className="absolute top-4 right-4 text-slate-500 hover:text-white p-1 hover:bg-slate-850 rounded-lg transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-850 pb-3 mb-4">
              Edit Team Member Details
            </h2>
            <form onSubmit={async (e) => {
              e.preventDefault();
              setMemberEditForm(null);
              showSuccess('Member details updated successfully');
            }} className="space-y-4">
              <div>
                <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1.5">Full Name *</label>
                <input
                  required
                  type="text"
                  defaultValue={memberEditForm.name}
                  className="w-full bg-slate-950 text-white text-xs border border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-gold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1.5">Email *</label>
                <input
                  required
                  type="email"
                  defaultValue={memberEditForm.email}
                  className="w-full bg-slate-950 text-white text-xs border border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-gold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1.5">Mobile *</label>
                <input
                  required
                  type="tel"
                  defaultValue={memberEditForm.mobile}
                  className="w-full bg-slate-950 text-white text-xs border border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-gold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1.5">Employee ID *</label>
                <input
                  required
                  type="text"
                  defaultValue={memberEditForm.employeeId}
                  className="w-full bg-slate-950 text-white text-xs border border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-gold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1.5">Designation *</label>
                <input
                  required
                  type="text"
                  defaultValue={memberEditForm.designation}
                  className="w-full bg-slate-950 text-white text-xs border border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-gold"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMemberEditForm(null)}
                  className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-gold hover:bg-gold-light disabled:bg-gold/45 text-slate-dark px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  Update Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 4: Transfer Employee */}
      {transferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <button
              onClick={() => setTransferModalOpen(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-white p-1 hover:bg-slate-850 rounded-lg transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-850 pb-3 mb-4">
              Transfer Employee Hierarchy Node
            </h2>
            <form onSubmit={handleTransfer} className="space-y-4">
              <div>
                <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1.5">Select Employee *</label>
                <select
                  required
                  value={transferEmpId}
                  onChange={(e) => setTransferEmpId(e.target.value)}
                  className="w-full bg-slate-950 text-white text-xs border border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-gold"
                >
                  <option value="">Choose employee...</option>
                  {allEmployees.map((emp) => (
                    <option key={emp._id} value={emp._id}>{emp.firstName} {emp.lastName} ({emp.employeeId || 'No ID'})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1.5">New Reporting Manager</label>
                <select
                  value={transferManagerId}
                  onChange={(e) => setTransferManagerId(e.target.value)}
                  className="w-full bg-slate-950 text-white text-xs border border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-gold"
                >
                  <option value="">None (Top Level Manager)</option>
                  {allManagers.filter((m) => m._id !== transferEmpId).map((mgr) => (
                    <option key={mgr._id} value={mgr._id}>{mgr.firstName} {mgr.lastName} ({mgr.designation || mgr.role})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1.5">New Department *</label>
                <select
                  required
                  value={transferDeptId}
                  onChange={(e) => setTransferDeptId(e.target.value)}
                  className="w-full bg-slate-950 text-white text-xs border border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-gold"
                >
                  <option value="">Choose new department...</option>
                  {departments.map((d) => (
                    <option key={d._id} value={d._id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setTransferModalOpen(false)}
                  className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="bg-gold hover:bg-gold-light disabled:bg-gold/45 text-slate-dark px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-dark" /> : <ArrowRightLeft size={13} />}
                  Transfer & Re-index Node
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}