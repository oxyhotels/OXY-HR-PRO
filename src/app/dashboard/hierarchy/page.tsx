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
  Edit,
  Eye,
  Share2,
  Download,
  RefreshCw,
  Ban,
  Mail,
} from 'lucide-react';

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
  code?: string;
  description?: string;
  status?: 'Active' | 'Inactive';
  createdAt?: string | Date;
}

interface InviteDetails {
  inviteCode: string;
  inviteLink: string;
  organizationId: { _id: string; name: string; code?: string };
  departmentId: { _id: string; name: string };
  managerId: { _id: string; firstName: string; lastName: string; designation?: string };
}

const HIERARCHY_FEATURES = [
  { key: 'organisationSettings', label: 'Organisation Settings', Icon: Building },
  { key: 'rightsManagement', label: 'Rights Management', Icon: ShieldCheck },
  { key: 'shiftManagement', label: 'Shift Management', Icon: Clock },
  { key: 'organisationCategories', label: 'Organisation Categories', Icon: Building },
  { key: 'liveLocationSettings', label: 'Live Location Settings', Icon: Compass },
  { key: 'employeeConfiguration', label: 'Employee Configuration', Icon: Users },
  { key: 'shiftMaster', label: 'Shift Master', Icon: Clock },
  { key: 'approverManagement', label: 'Approver Management', Icon: CheckCircle2 },
  { key: 'holidays', label: 'Holidays', Icon: Info },
  { key: 'bulkMaster', label: 'Bulk Master', Icon: UserPlus },
  { key: 'payroll', label: 'Payroll', Icon: Activity },
  { key: 'mySubscription', label: 'My Subscription', Icon: ShieldCheck },
  { key: 'groupMaster', label: 'Group Master', Icon: Users },
  { key: 'googleCalendarSettings', label: 'Google Calendar Settings', Icon: Clock },
];

const downloadQRCode = async (url: string, filename: string, format: 'png' | 'svg') => {
  try {
    const qrUrl = new URL(url);
    qrUrl.searchParams.set('format', format);
    
    const response = await fetch(qrUrl.toString());
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error('Failed to download QR code:', error);
    window.open(url, '_blank');
  }
};

export default function HierarchyPage() {
  const [user, setUser] = useState<any>(null);
  
  // Audit Logs & Latest Updates States
  const [latestUpdates, setLatestUpdates] = useState<Record<string, any>>({});
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsPage, setLogsPage] = useState(1);
  const [logsTotalPages, setLogsTotalPages] = useState(1);
  const [logsFilterModule, setLogsFilterModule] = useState('');
  const [logsFilterStartDate, setLogsFilterStartDate] = useState('');
  const [logsFilterEndDate, setLogsFilterEndDate] = useState('');
  const [logsSearchQuery, setLogsSearchQuery] = useState('');

  const [activeTab, setActiveTab] = useState('invites');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Root Admin password confirmation states
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordValue, setPasswordValue] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordConfirmLoading, setPasswordConfirmLoading] = useState(false);
  const [passwordAction, setPasswordAction] = useState<(() => Promise<void>) | null>(null);

  // Organization & Department
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [publicDepartments, setPublicDepartments] = useState<string[]>([]);
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
  const [treeScale, setTreeScale] = useState(1);

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
  const [shareQrData, setShareQrData] = useState<any>(null);
  const [memberEditForm, setMemberEditForm] = useState<any>(null);

  // Subordinate edit fields
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmployeeId, setEditEmployeeId] = useState('');
  const [editDesignation, setEditDesignation] = useState('');
  const [editRole, setEditRole] = useState('EMPLOYEE');
  const [editDepartment, setEditDepartment] = useState('');
  const [editBaseSalary, setEditBaseSalary] = useState(0);
  const [editFeatures, setEditFeatures] = useState<string[]>([]);

  // Hydrate form states on edit selection
  useEffect(() => {
    if (memberEditForm) {
      const parts = (memberEditForm.name || '').trim().split(/\s+/);
      setEditFirstName(parts[0] || '');
      setEditLastName(parts.slice(1).join(' ') || '');
      setEditEmail(memberEditForm.email || '');
      setEditPhone(memberEditForm.phone || '');
      setEditEmployeeId(memberEditForm.employeeId || '');
      setEditDesignation(memberEditForm.designation || '');
      setEditRole(memberEditForm.role || 'EMPLOYEE');
      setEditDepartment(memberEditForm.departmentName || '');
      setEditBaseSalary(memberEditForm.salaryDetails?.baseSalary || 0);
      setEditFeatures(memberEditForm.enabledFeatures || []);
    }
  }, [memberEditForm]);

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
  const [inviteType, setInviteType] = useState<'employee' | 'manager'>('employee');
  const [transferEmpId, setTransferEmpId] = useState('');
  const [transferManagerId, setTransferManagerId] = useState('');
  const [transferDeptId, setTransferDeptId] = useState('');

  // Edit Department Modal State
  const [editDeptModalOpen, setEditDeptModalOpen] = useState(false);
  const [editingDeptId, setEditingDeptId] = useState<string | null>(null);
  const [editDeptName, setEditDeptName] = useState('');
  const [editDeptDesc, setEditDeptDesc] = useState('');
  const [editDeptStatus, setEditDeptStatus] = useState<'Active' | 'Inactive'>('Active');
  const [deptModalError, setDeptModalError] = useState<string | null>(null);
  const [deptModalSuccess, setDeptModalSuccess] = useState<string | null>(null);

  const startEditingDept = (dept: Department) => {
    setEditingDeptId(dept._id);
    setEditDeptName(dept.name || '');
    setEditDeptDesc(dept.description || '');
    setEditDeptStatus(dept.status || 'Active');
    setDeptModalError(null);
    setDeptModalSuccess(null);
  };

  const handleUpdateDept = async (deptId: string) => {
    if (!editDeptName.trim()) {
      setDeptModalError('Department name is required');
      return;
    }
    setActionLoading(true);
    setDeptModalError(null);
    setDeptModalSuccess(null);
    try {
      await api.patch(`/organization/department/${deptId}`, {
        name: editDeptName.trim(),
        description: editDeptDesc.trim(),
        status: editDeptStatus,
      });
      setDeptModalSuccess('Department updated successfully');
      setEditingDeptId(null);
      fetchOrganizationsAndDepartments();
    } catch (err: any) {
      setDeptModalError(err.message || 'Failed to update department');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteDept = async (deptId: string) => {
    if (!confirm('Are you sure you want to delete this department?')) return;
    setActionLoading(true);
    setDeptModalError(null);
    setDeptModalSuccess(null);
    try {
      await api.delete(`/organization/department/${deptId}`);
      setDeptModalSuccess('Department deleted successfully');
      fetchOrganizationsAndDepartments();
    } catch (err: any) {
      setDeptModalError(err.message || 'Failed to delete department');
    } finally {
      setActionLoading(false);
    }
  };

  const [localSuccess, setLocalSuccess] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const fetchLatestUpdates = async () => {
    try {
      const res = await api.get('/hierarchy/audit-logs/latest');
      if (res.data && res.data.latestUpdates) {
        setLatestUpdates(res.data.latestUpdates);
      }
    } catch (err) {
      console.error('Error fetching latest updates:', err);
    }
  };

  const fetchHierarchyAuditLogs = async (page = 1) => {
    setLogsLoading(true);
    try {
      const query = new URLSearchParams();
      query.set('page', page.toString());
      query.set('limit', '20');
      if (logsFilterModule) query.set('module', logsFilterModule);
      if (logsFilterStartDate) query.set('startDate', logsFilterStartDate);
      if (logsFilterEndDate) query.set('endDate', logsFilterEndDate);
      if (logsSearchQuery) query.set('search', logsSearchQuery);

      const res = await api.get(`/hierarchy/audit-logs?${query.toString()}`);
      setAuditLogs(res.data.logs || []);
      setLogsPage(res.data.pagination?.page || page);
      setLogsTotalPages(res.data.pagination?.pages || 1);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleExportLogs = () => {
    const params = new URLSearchParams();
    params.set('exportCsv', 'true');
    if (logsFilterModule) params.set('module', logsFilterModule);
    if (logsFilterStartDate) params.set('startDate', logsFilterStartDate);
    if (logsFilterEndDate) params.set('endDate', logsFilterEndDate);
    if (logsSearchQuery) params.set('search', logsSearchQuery);

    window.open(`/api/hierarchy/audit-logs?${params.toString()}`, '_blank');
  };

  // Fetch functions defined before use
  const fetchOrganizationsAndDepartments = async () => {
    try {
      const res = await api.get('/organization/list');
      setOrganizations(res.data.organizations || []);
      setDepartments(res.data.departments || []);
      
      const pDepts = await api.get('/organization/public-departments');
      if (pDepts.data?.departments) {
        setPublicDepartments(pDepts.data.departments);
      }
      
      fetchLatestUpdates();
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
    } else {
      setActiveTab('tree');
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
    } else if (activeTab === 'activity-logs') {
      fetchHierarchyAuditLogs(logsPage);
    }
  }, [
    activeTab,
    filterDept,
    filterHotel,
    filterManager,
    searchQuery,
    logsPage,
    logsFilterModule,
    logsFilterStartDate,
    logsFilterEndDate,
    logsSearchQuery,
  ]);

  useEffect(() => {
    if (activeTab === 'activity-logs') {
      setLogsPage(1);
    }
  }, [logsFilterModule, logsFilterStartDate, logsFilterEndDate, logsSearchQuery]);

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
      const res = await api.post('/hierarchy/invite', {
        organizationId: inviteOrgId,
        departmentId: inviteDeptId,
        expiresInDays: inviteExpiry,
        inviteType: inviteType,
      });
      setQrDirectView(res.data.invite);
      setInviteOrgId('');
      setInviteDeptId('');
      setInviteType('employee');
      fetchActiveInvites();
    } catch (err: any) {
      showError(err.message || 'Failed to generate invite');
    }
  };

  const handleDeleteInvite = (inviteCode: string) => {
    setPasswordAction(() => async () => {
      try {
        await api.post('/hierarchy/invite/delete', { inviteCode });
        showSuccess('Invite link deleted successfully.');
        fetchActiveInvites();
      } catch (err: any) {
        showError(err.message || 'Failed to delete invite link');
      }
    });
    setPasswordValue('');
    setPasswordError(null);
    setPasswordModalOpen(true);
  };

  const handleToggleInviteStatus = async (inviteCode: string, currentStatus: 'Active' | 'Disabled') => {
    const newStatus = currentStatus === 'Active' ? 'Disabled' : 'Active';
    try {
      await api.post('/hierarchy/invite/toggle-status', { inviteCode, status: newStatus });
      showSuccess(`Invite link status updated to ${newStatus}.`);
      fetchActiveInvites();
    } catch (err: any) {
      showError(err.message || 'Failed to update invite link status');
    }
  };


  const handleVerifyPasswordConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordValue) {
      setPasswordError('Password is required');
      return;
    }
    setPasswordConfirmLoading(true);
    setPasswordError(null);
    try {
      await api.post('/auth/verify-password', { password: passwordValue });
      if (passwordAction) {
        await passwordAction();
      }
      setPasswordModalOpen(false);
    } catch (err: any) {
      setPasswordError(err.message || 'Incorrect password or verification failed');
    } finally {
      setPasswordConfirmLoading(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    try {
      await api.post('/hierarchy/approve', { requestId });
      showSuccess('Join request approved. Node added to hierarchy.');
      fetchPendingRequests();
    } catch (err: any) {
      showError(err.message || 'Approval failed');
    }
  };

  const handleReject = async (requestId: string) => {
    if (!confirm('Are you sure you want to reject this join request?')) return;
    try {
      await api.post('/hierarchy/reject', { requestId });
      showSuccess('Join request rejected.');
      fetchPendingRequests();
    } catch (err: any) {
      showError(err.message || 'Rejection failed');
    }
  };

  const handleUpdateSubordinate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberEditForm?.id) return;
    setActionLoading(true);
    try {
      await api.post('/hierarchy/update-node', {
        targetUserId: memberEditForm.id,
        firstName: editFirstName,
        lastName: editLastName,
        email: editEmail,
        phone: editPhone,
        employeeId: editEmployeeId,
        designation: editDesignation,
        role: editRole,
        department: editDepartment,
        baseSalary: Number(editBaseSalary),
        enabledFeatures: editFeatures,
      });
      setMemberEditForm(null);
      showSuccess('Subordinate details and rights updated successfully.');
      fetchLatestUpdates();
      
      // Refresh tree
      fetchHierarchyTree({
        departmentId: filterDept || undefined,
        hotelId: filterHotel || undefined,
        managerId: filterManager || undefined,
        search: searchQuery || undefined,
      });
    } catch (err: any) {
      showError(err.message || 'Failed to update subordinate');
    } finally {
      setActionLoading(false);
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
      fetchLatestUpdates();
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

  const handleOpenViewModal = (inv: any) => {
    setQrDirectView(inv);
  };

  const handleOpenShareModal = (inv: any) => {
    handleShareQR(inv);
  };

  const handleShareQR = async (inv: any) => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Join OXY-HR ${inv.department || inv.departmentId?.name || ''} Department`,
          text: `You have been invited to join the team on OXY-HR PRO as a ${inv.role || 'member'}. Register here:`,
          url: inv.inviteLink,
        });
        showSuccess('Link shared successfully');
      } catch (err) {
        console.error('Error sharing:', err);
        setShareQrData(inv);
      }
    } else {
      setShareQrData(inv);
    }
  };

  const handleDownloadQR = async (inv: any) => {
    try {
      const deptName = (inv.department || inv.departmentId?.name || 'Staff').replace(/\s+/g, '-');
      const dateStr = new Date(inv.createdAt).toISOString().split('T')[0];
      const filename = `OXY-HR-${deptName}-${dateStr}`;

      await downloadQRCode(inv.qrCode, `${filename}.png`, 'png');
      await downloadQRCode(inv.qrCode, `${filename}.svg`, 'svg');
      showSuccess('QR Code downloaded in PNG and SVG formats');
    } catch (err) {
      showError('Failed to download QR code');
    }
  };

  const handleRegenerateQR = async (inviteCode: string) => {
    if (!confirm('Are you sure you want to regenerate this QR code? The old QR code will be disabled automatically.')) return;
    setActionLoading(true);
    try {
      const res = await api.post('/hierarchy/invite/regenerate', { inviteCode });
      showSuccess('QR code regenerated successfully');
      fetchActiveInvites();
      setQrDirectView(res.data.invite);
    } catch (err: any) {
      showError(err.message || 'Failed to regenerate invite QR');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisableQR = async (inviteCode: string) => {
    if (!confirm('Are you sure you want to disable this QR invitation link?')) return;
    try {
      await api.post('/hierarchy/invite/disable', { inviteCode });
      showSuccess('Invite link successfully disabled');
      fetchActiveInvites();
    } catch (err: any) {
      showError(err.message || 'Failed to disable invite');
    }
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

            {user?.role !== 'EMPLOYEE' && (node.id !== user?._id && node.id !== user?.id) && (
              <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 transition-opacity">
                <button
                  onClick={() => {
                    setMemberEditForm(node);
                  }}
                  title="Edit Subordinate Details & Access Rights"
                  className="p-1.5 text-slate-400 hover:text-gold hover:bg-slate-800 rounded transition-colors cursor-pointer"
                >
                  <Edit size={13} />
                </button>
                {user?.role === 'ROOT_ADMIN' && (
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
                )}
              </div>
            )}
          </div>
        </div>

        {/* TAB 5: ACTIVITY LOGS */}
            {activeTab === 'activity-logs' && user?.role !== 'EMPLOYEE' && (
              <div className="bg-card-dark border border-slate-800/80 rounded-xl p-5 space-y-4 animate-fadeIn">
                {/* Header & Controls */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-850 pb-4">
                  <div>
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider">Hierarchy Operational Activity Logs</h2>
                    <p className="text-[10px] text-slate-500 mt-1">Track all modifications made to departments, hierarchy connections, properties, and user profiles.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {user?.role === 'ROOT_ADMIN' && (
                      <button
                        onClick={handleExportLogs}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-800 text-slate-200 hover:text-white rounded-lg text-xs font-semibold hover:bg-slate-850 transition-colors cursor-pointer"
                      >
                        <Download size={14} />
                        Export Logs (CSV)
                      </button>
                    )}
                    <button
                      onClick={() => fetchHierarchyAuditLogs(logsPage)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-800 text-slate-200 hover:text-white rounded-lg text-xs font-semibold hover:bg-slate-850 transition-colors cursor-pointer"
                    >
                      <RefreshCw size={14} className={logsLoading ? 'animate-spin' : ''} />
                      Refresh
                    </button>
                  </div>
                </div>

                {/* Filters Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 bg-slate-950/20 p-3 rounded-lg border border-slate-850">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-450 uppercase tracking-wider mb-1">Module</label>
                    <select
                      value={logsFilterModule}
                      onChange={(e) => setLogsFilterModule(e.target.value)}
                      className="w-full bg-slate-900 text-white text-xs border border-slate-800 rounded-lg px-2.5 py-1.5 outline-none focus:border-gold"
                    >
                      <option value="">All Modules</option>
                      <option value="Department">Department</option>
                      <option value="Employee">Employee</option>
                      <option value="Manager">Manager</option>
                      <option value="Property">Property</option>
                      <option value="Hierarchy">Hierarchy</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-450 uppercase tracking-wider mb-1">Start Date</label>
                    <input
                      type="date"
                      value={logsFilterStartDate}
                      onChange={(e) => setLogsFilterStartDate(e.target.value)}
                      className="w-full bg-slate-900 text-white text-xs border border-slate-800 rounded-lg px-2.5 py-1.5 outline-none focus:border-gold"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-450 uppercase tracking-wider mb-1">End Date</label>
                    <input
                      type="date"
                      value={logsFilterEndDate}
                      onChange={(e) => setLogsFilterEndDate(e.target.value)}
                      className="w-full bg-slate-900 text-white text-xs border border-slate-800 rounded-lg px-2.5 py-1.5 outline-none focus:border-gold"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[9px] font-bold text-slate-450 uppercase tracking-wider mb-1">Search Logs</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={logsSearchQuery}
                        onChange={(e) => setLogsSearchQuery(e.target.value)}
                        placeholder="Search action, details, edited by..."
                        className="w-full bg-slate-900 text-white text-xs border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 outline-none focus:border-gold"
                      />
                      <Search size={12} className="absolute left-2.5 top-2.5 text-slate-500" />
                    </div>
                  </div>
                </div>

                {/* Table View */}
                {logsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 text-gold animate-spin" />
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto border border-slate-850 rounded-xl">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-900/60 border-b border-slate-850 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                            <th className="p-3">Date & Time</th>
                            <th className="p-3">Module</th>
                            <th className="p-3">Action</th>
                            <th className="p-3 w-1/4">Old Value</th>
                            <th className="p-3 w-1/4">New Value</th>
                            <th className="p-3">Edited By</th>
                            <th className="p-3">Role</th>
                          </tr>
                        </thead>
                        <tbody>
                          {auditLogs.map((log: any) => {
                            const dateObj = new Date(log.createdAt);
                            const formattedDate = dateObj.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
                            const formattedTime = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                            
                            const editor = log.userId;
                            const editorName = editor ? `${editor.firstName} ${editor.lastName}` : 'System';
                            
                            let roleDisplay = log.editedByRole || 'System';
                            let formattedEditor = editorName;
                            
                            if (roleDisplay.includes('(')) {
                              const startIdx = roleDisplay.indexOf('(');
                              const endIdx = roleDisplay.indexOf(')');
                              const roleStr = roleDisplay.substring(0, startIdx).trim();
                              const nameStr = roleDisplay.substring(startIdx + 1, endIdx).trim();
                              
                              roleDisplay = roleStr;
                              formattedEditor = nameStr;
                            } else if (log.editedByRole === 'Root Admin') {
                              formattedEditor = 'Root Admin';
                              roleDisplay = 'Root Admin';
                            }

                            return (
                              <tr key={log._id} className="border-b border-slate-850 hover:bg-slate-900/10 text-slate-300">
                                <td className="p-3 font-mono text-[10px]">
                                  <div>{formattedDate}</div>
                                  <div className="text-slate-500 mt-0.5">{formattedTime}</div>
                                </td>
                                <td className="p-3">
                                  <span className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded text-[10px]">
                                    {log.module || 'System'}
                                  </span>
                                </td>
                                <td className="p-3 font-semibold text-white">
                                  {log.action}
                                </td>
                                <td className="p-3 font-mono text-[10px] whitespace-pre-line leading-relaxed text-slate-400">
                                  {log.oldValue || <span className="text-slate-650">None</span>}
                                </td>
                                <td className="p-3 font-mono text-[10px] whitespace-pre-line leading-relaxed text-slate-200">
                                  {log.newValue || <span className="text-slate-650">None</span>}
                                </td>
                                <td className="p-3 font-semibold text-slate-200">
                                  {formattedEditor}
                                </td>
                                <td className="p-3">
                                  <div className="font-semibold text-white">{roleDisplay}</div>
                                  {log.ipAddress && (
                                    <div className="text-[9px] text-slate-500 font-mono mt-0.5">IP: {log.ipAddress}</div>
                                  )}
                                </td>
                              </tr>
                            );
                          })}

                          {auditLogs.length === 0 && (
                            <tr>
                              <td colSpan={7} className="text-center py-10 text-slate-500">
                                No activity logs found matching the filter criteria.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    {logsTotalPages > 1 && (
                      <div className="flex justify-between items-center text-xs text-slate-400 pt-2">
                        <div>
                          Showing page {logsPage} of {logsTotalPages}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            disabled={logsPage === 1}
                            onClick={() => setLogsPage(p => Math.max(1, p - 1))}
                            className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded disabled:opacity-40 hover:text-white transition-colors cursor-pointer"
                          >
                            Previous
                          </button>
                          <button
                            disabled={logsPage === logsTotalPages}
                            onClick={() => setLogsPage(p => Math.min(logsTotalPages, p + 1))}
                            className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded disabled:opacity-40 hover:text-white transition-colors cursor-pointer"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

        {hasChildren && !isCollapsed && (
          <div className="mt-1 border-l border-slate-800/80 ml-5.5 space-y-1">
            {node.children.map((child) => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const matchesSearch = (node: any) => {
    if (!searchQuery) return false;
    const q = searchQuery.toLowerCase();
    return (
      (node.name || '').toLowerCase().includes(q) ||
      (node.designation || '').toLowerCase().includes(q) ||
      (node.email || '').toLowerCase().includes(q) ||
      (node.employeeId && node.employeeId.toLowerCase().includes(q))
    );
  };

  const renderVisualTree = (node: any): React.ReactNode => {
    const isCollapsed = collapsedNodes[node.id];
    const hasChildren = node.children && node.children.length > 0;
    const highlight = matchesSearch(node);

    return (
      <div key={node.id} className="tree-node-container">
        {/* Node Profile Card */}
        <div 
          onClick={() => {
            if (user?.role !== 'EMPLOYEE' && (node.id !== user?._id && node.id !== user?.id)) {
              setMemberEditForm(node);
            }
          }}
          className={`relative w-64 bg-slate-900 border ${highlight ? 'border-gold ring-2 ring-gold/45 shadow-[0_0_15px_rgba(212,175,55,0.45)]' : 'border-slate-800 hover:border-slate-700'} rounded-xl p-4 flex flex-col gap-3 transition-all cursor-pointer shadow-lg`}
        >
          {/* Card Header: Avatar & Roles */}
          <div className="flex items-center gap-3">
            {node.photoUrl ? (
              <img 
                src={node.photoUrl} 
                alt={node.name} 
                className="w-10 h-10 rounded-full border border-slate-700 object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-slate-850 border border-slate-750 flex items-center justify-center font-bold text-xs text-gold uppercase shadow">
                {node.name.substring(0, 2)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-white truncate">{node.name}</h4>
              <p className="text-[10px] text-slate-400 truncate mt-0.5">{node.designation}</p>
            </div>
            {node.role !== 'EMPLOYEE' && (
              <span className="bg-gold/15 text-[8px] text-gold border border-gold/20 px-1 py-0.5 rounded font-bold tracking-wide shrink-0">
                MGR
              </span>
            )}
          </div>

          {/* Card Info Details */}
          <div className="border-t border-slate-850 pt-2 flex flex-col gap-1 text-[9px] text-slate-500 font-mono">
            <p className="flex justify-between">
              <span>ID:</span>
              <span className="text-slate-300">{node.employeeId || 'N/A'}</span>
            </p>
            <p className="flex justify-between">
              <span>Email:</span>
              <span className="text-slate-300 truncate max-w-[120px]">{node.email}</span>
            </p>
            {node.hotelCode && (
              <p className="flex justify-between">
                <span>Hotel:</span>
                <span className="text-gold uppercase">{node.hotelCode}</span>
              </p>
            )}
            {latestUpdates[node.id] && (
              <div className="border-t border-slate-850/50 pt-1.5 mt-1 text-[8px] text-slate-500 font-normal leading-tight font-sans">
                <span className="font-bold text-slate-450">Edited By:</span>{' '}
                <span className="text-slate-350">{latestUpdates[node.id].editedBy}</span>
              </div>
            )}
          </div>

          {/* Card Footer: Expand/Collapse & Direct Reports count */}
          {hasChildren && (
            <div className="border-t border-slate-850 pt-2 flex items-center justify-between text-[10px]">
              <span className="text-slate-400 font-medium">
                {node.children.length} {node.children.length === 1 ? 'direct report' : 'direct reports'}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleNode(node.id);
                }}
                className="flex items-center gap-1 text-slate-400 hover:text-white bg-slate-800 border border-slate-700/50 rounded px-1.5 py-0.5 transition-colors cursor-pointer"
              >
                {isCollapsed ? (
                  <>
                    <span>Expand</span>
                    <ChevronRight size={10} />
                  </>
                ) : (
                  <>
                    <span>Collapse</span>
                    <ChevronDown size={10} />
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Children Nodes rendering recursively */}
        {hasChildren && !isCollapsed && (
          <div className="tree-children-container">
            {node.children.map((child: any) => (
              <div key={child.id} className="tree-child-node">
                {renderVisualTree(child)}
              </div>
            ))}
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
              onClick={() => setEditDeptModalOpen(true)}
              className="bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 px-3.5 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Edit size={14} />
              Edit Department
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
        {user?.role !== 'EMPLOYEE' && (
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
        {user?.role !== 'EMPLOYEE' && (
          <button
            onClick={() => setActiveTab('activity-logs')}
            className={`px-4 py-3.5 border-b-2 font-bold transition-all cursor-pointer ${
              activeTab === 'activity-logs' ? 'border-gold text-white bg-slate-900/10' : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Activity Logs
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
          {activeTab === 'tree' && user?.role !== 'EMPLOYEE' && (
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
              <div className="relative bg-card-dark border border-slate-800/80 rounded-xl p-6 overflow-hidden min-h-[600px] flex flex-col">
                <style>{`
                  .tree-node-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    position: relative;
                  }
                  .tree-children-container {
                    display: flex;
                    flex-direction: row;
                    justify-content: center;
                    position: relative;
                    padding-top: 24px;
                  }
                  .tree-children-container::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 50%;
                    border-left: 2px solid #475569; /* slate-600 */
                    height: 24px;
                    width: 0;
                  }
                  .tree-child-node {
                    padding: 24px 12px 0 12px;
                    position: relative;
                  }
                  .tree-child-node::before, .tree-child-node::after {
                    content: '';
                    position: absolute;
                    top: 0;
                    right: 50%;
                    border-top: 2px solid #475569;
                    width: 50%;
                    height: 24px;
                  }
                  .tree-child-node::after {
                    right: auto;
                    left: 50%;
                    border-left: 2px solid #475569;
                  }
                  .tree-child-node:only-child::after, .tree-child-node:only-child::before {
                    display: none;
                  }
                  .tree-child-node:only-child {
                    padding-top: 24px;
                  }
                  .tree-child-node:only-child::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 50%;
                    border-left: 2px solid #475569;
                    height: 24px;
                  }
                  .tree-child-node:first-child::before {
                    border: 0 none;
                  }
                  .tree-child-node:last-child::after {
                    border: 0 none;
                  }
                  .tree-child-node:first-child::after {
                    border-left: 2px solid #475569;
                    border-radius: 4px 0 0 0;
                  }
                  .tree-child-node:last-child::before {
                    border-right: 2px solid #475569;
                    border-radius: 0 4px 0 0;
                  }
                `}</style>

                {/* Zoom Controls */}
                <div className="absolute right-6 top-6 z-10 flex items-center gap-2 bg-slate-950/80 backdrop-blur border border-slate-800 p-1.5 rounded-lg shadow-lg">
                  <button 
                    onClick={() => setTreeScale(prev => Math.max(0.5, prev - 0.1))}
                    className="w-8 h-8 flex items-center justify-center bg-slate-900 hover:bg-slate-850 hover:text-white border border-slate-800 rounded text-slate-400 font-bold transition-all text-sm cursor-pointer select-none"
                    title="Zoom Out"
                  >
                    -
                  </button>
                  <span className="px-2 text-slate-300 text-xs font-mono select-none w-12 text-center">
                    {Math.round(treeScale * 100)}%
                  </span>
                  <button 
                    onClick={() => setTreeScale(prev => Math.min(2, prev + 0.1))}
                    className="w-8 h-8 flex items-center justify-center bg-slate-900 hover:bg-slate-850 hover:text-white border border-slate-800 rounded text-slate-400 font-bold transition-all text-sm cursor-pointer select-none"
                    title="Zoom In"
                  >
                    +
                  </button>
                  <div className="w-px h-5 bg-slate-800 mx-1" />
                  <button 
                    onClick={() => setTreeScale(1)}
                    className="px-2 py-1.5 text-[10px] bg-slate-900 hover:bg-slate-850 hover:text-white border border-slate-800 rounded text-slate-400 font-semibold transition-all cursor-pointer select-none"
                    title="Reset Zoom"
                  >
                    Reset
                  </button>
                </div>

                {tree.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 text-xs my-auto">
                    No organizational nodes match the current criteria.
                  </div>
                ) : (
                  <div className="flex-1 overflow-auto p-4" style={{ touchAction: 'pan-x pan-y' }}>
                    <div 
                      style={{ 
                        transform: `scale(${treeScale})`, 
                        transformOrigin: 'top center', 
                        transition: 'transform 0.15s ease-out' 
                      }} 
                      className="space-y-12 min-w-max pb-8"
                    >
                      {tree.map((org) => (
                        <div key={org.id} className="space-y-6 flex flex-col items-center">
                          {/* Org Header */}
                          <div className="flex items-center gap-2 border-b border-slate-800 pb-2 w-full justify-center">
                            <Building className="text-gold shrink-0" size={16} />
                            <h2 className="text-sm font-bold text-white uppercase tracking-wider">{org.name}</h2>
                            {org.code && (
                              <span className="bg-slate-800/80 text-slate-400 font-mono text-[9px] border border-slate-700 px-1.5 py-0.5 rounded">
                                {org.code}
                              </span>
                            )}
                          </div>

                          {/* Dept Level */}
                          <div className="space-y-12 w-full flex flex-col items-center">
                            {org.departments.map((dept: any) => (
                              <div key={dept.id} className="w-full flex flex-col items-center space-y-6">
                                <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 bg-slate-900/30 py-1.5 px-3 rounded-lg border border-slate-850/60 justify-center">
                                  <span className="w-1.5 h-1.5 rounded-full bg-gold" />
                                  <span>{dept.name} Department</span>
                                  <span className="text-[10px] text-slate-500 font-normal">
                                    ({dept.employeesCount} staff)
                                  </span>
                                </div>

                                {/* Department Employee Tree Nodes */}
                                <div className="flex flex-row justify-center gap-12 pt-4 w-full">
                                  {dept.structure.map((node: any) => renderVisualTree(node))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
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
                      {publicDepartments.map((name) => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-2">Invite Type *</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-350 hover:text-white select-none">
                        <input
                          type="radio"
                          name="inviteType"
                          value="employee"
                          checked={inviteType === 'employee'}
                          onChange={() => setInviteType('employee')}
                          className="accent-gold cursor-pointer"
                        />
                        <span>Employee</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-355 hover:text-white select-none">
                        <input
                          type="radio"
                          name="inviteType"
                          value="manager"
                          checked={inviteType === 'manager'}
                          onChange={() => setInviteType('manager')}
                          className="accent-gold cursor-pointer"
                        />
                        <span>Manager</span>
                      </label>
                    </div>
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

                {/* Active QR Codes / Requests */}
                <div className="bg-card-dark border border-slate-800/80 rounded-xl p-5 space-y-4">
                  <div className="border-b border-slate-850 pb-3">
                    <h2 className="text-xs font-bold text-white uppercase tracking-wider">Active QR Codes / Requests</h2>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-950/30 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                          <th className="p-3">QR Name</th>
                          <th className="p-3">Role</th>
                          <th className="p-3">Department</th>
                          <th className="p-3">Created Date</th>
                          <th className="p-3">Status</th>
                          <th className="p-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850 text-slate-300">
                        {invites.map((inv) => {
                          const statusColor = 
                            ['ACTIVE', 'Active'].includes(inv.status) ? 'bg-green-500/15 text-green-400 border border-green-500/20' :
                            ['EXPIRED', 'Expired'].includes(inv.status) ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' :
                            'bg-red-500/15 text-red-400 border border-red-500/20';

                          return (
                            <tr key={inv._id} className="hover:bg-slate-900/10">
                              <td className="p-3 font-mono font-bold text-gold flex flex-col">
                                <span>{inv.qrId || 'N/A'}</span>
                                <span className="text-[10px] text-slate-500 font-normal">{inv.inviteCode}</span>
                              </td>
                              <td className="p-3">
                                <span className="font-semibold">{inv.role || inv.inviteType || 'EMPLOYEE'}</span>
                              </td>
                              <td className="p-3">
                                <span>{inv.department || inv.departmentId?.name || 'N/A'}</span>
                              </td>
                              <td className="p-3 font-mono text-[10px] text-slate-450">
                                {new Date(inv.createdAt).toLocaleDateString()}
                              </td>
                              <td className="p-3">
                                <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase ${statusColor}`}>
                                  {inv.status}
                                </span>
                              </td>
                              <td className="p-3 text-right space-x-2 flex items-center justify-end">
                                {/* View QR */}
                                <button
                                  onClick={() => handleOpenViewModal(inv)}
                                  className="p-1.5 hover:bg-slate-850 rounded text-slate-400 hover:text-white transition-colors cursor-pointer inline-flex items-center"
                                  title="View QR Code"
                                >
                                  <Eye size={14} />
                                </button>

                                {/* Share QR */}
                                <button
                                  onClick={() => handleOpenShareModal(inv)}
                                  className="p-1.5 hover:bg-slate-850 rounded text-slate-400 hover:text-white transition-colors cursor-pointer inline-flex items-center"
                                  title="Share QR"
                                >
                                  <Share2 size={14} />
                                </button>

                                {/* Download QR */}
                                <button
                                  onClick={() => handleDownloadQR(inv)}
                                  className="p-1.5 hover:bg-slate-850 rounded text-slate-400 hover:text-white transition-colors cursor-pointer inline-flex items-center"
                                  title="Download QR"
                                >
                                  <Download size={14} />
                                </button>

                                {/* Regenerate QR */}
                                <button
                                  onClick={() => handleRegenerateQR(inv.inviteCode)}
                                  className="p-1.5 hover:bg-slate-850 rounded text-slate-400 hover:text-white transition-colors cursor-pointer inline-flex items-center"
                                  title="Regenerate QR"
                                >
                                  <RefreshCw size={14} />
                                </button>

                                {/* Disable QR */}
                                <button
                                  onClick={() => handleDisableQR(inv.inviteCode)}
                                  className="p-1.5 hover:bg-red-950/40 rounded text-slate-400 hover:text-red-400 transition-colors cursor-pointer inline-flex items-center"
                                  title="Disable QR"
                                >
                                  <Ban size={14} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}

                        {invites.length === 0 && (
                          <tr>
                            <td colSpan={6} className="text-center p-6 text-slate-500">
                              No invite QR codes generated.
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
                          <th className="p-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850 text-slate-300">
                        {team.map((struct) => (
                          <tr key={struct._id} className="hover:bg-slate-900/10">
                            <td className="p-3 font-semibold text-white">
                              <div>{struct.userId?.firstName} {struct.userId?.lastName}</div>
                              {latestUpdates[struct.userId?._id] && (
                                <div className="text-[9px] text-slate-500 font-normal mt-1 leading-tight">
                                  <span className="font-bold text-slate-450">Edited By:</span>{' '}
                                  <span className="text-slate-350">{latestUpdates[struct.userId?._id].editedBy}</span>
                                  <div className="text-slate-550 mt-0.5">
                                    <span className="font-bold text-slate-455">Last Updated:</span>{' '}
                                    <span>{new Date(latestUpdates[struct.userId?._id].updatedAt).toLocaleString()}</span>
                                  </div>
                                </div>
                              )}
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
                            <td className="p-3 text-right">
                              <button
                                onClick={() => {
                                  const node = {
                                    id: struct.userId?._id || struct.userId?.id,
                                    name: `${struct.userId?.firstName} ${struct.userId?.lastName}`,
                                    email: struct.userId?.email,
                                    role: struct.userId?.role,
                                    departmentName: struct.userId?.department,
                                    designation: struct.userId?.designation,
                                    status: struct.userId?.status,
                                    phone: struct.userId?.phone,
                                    employeeId: struct.userId?.employeeId,
                                    joinedDate: struct.userId?.joinedDate,
                                    hotelCode: struct.userId?.hotel?.hotelCode || 'OTHER',
                                    enabledFeatures: struct.userId?.enabledFeatures || [],
                                    salaryDetails: struct.userId?.salaryDetails || { baseSalary: 0 },
                                  };
                                  setMemberEditForm(node);
                                }}
                                className="p-1 text-slate-400 hover:text-gold hover:bg-slate-850 rounded transition-all cursor-pointer inline-flex items-center gap-1 text-[11px] font-medium"
                              >
                                <Edit size={12} />
                                <span>Edit</span>
                              </button>
                            </td>
                          </tr>
                        ))}

                        {team.length === 0 && (
                          <tr>
                            <td colSpan={7} className="text-center p-6 text-slate-500">
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
                  {Array.from(new Set(departments.map((d) => d.name).filter(Boolean))).map((name) => (
                    <option key={name} value={name}>{name}</option>
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
                {qrDirectView.organizationId?.name || ''} • {qrDirectView.departmentId?.name || qrDirectView.department || ''} Department
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

            {/* Detailed Metadata Table */}
            <div className="text-left bg-slate-950 border border-slate-850 rounded-xl p-3.5 space-y-2 text-[11px] text-slate-400">
              <div className="flex justify-between">
                <span>Inviter Name:</span>
                <span className="text-white font-semibold">
                  {qrDirectView.managerId?.firstName ? `${qrDirectView.managerId.firstName} ${qrDirectView.managerId.lastName}` : (user?.firstName ? `${user.firstName} ${user.lastName}` : 'N/A')}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Department:</span>
                <span className="text-white font-semibold">{qrDirectView.department || qrDirectView.departmentId?.name || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span>Role:</span>
                <span className="text-white font-semibold text-gold">{qrDirectView.role || qrDirectView.inviteType || 'EMPLOYEE'}</span>
              </div>
              <div className="flex justify-between">
                <span>Created Date:</span>
                <span className="text-white font-mono">{new Date(qrDirectView.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Expiry Date:</span>
                <span className="text-white font-mono">{new Date(qrDirectView.expiresAt || qrDirectView.expiryDate || qrDirectView.createdAt).toLocaleDateString()}</span>
              </div>
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

              <div className="flex gap-2">
                <button
                  onClick={() => handleDownloadQR(qrDirectView)}
                  className="flex-1 bg-slate-800 hover:bg-slate-750 text-white border border-slate-700 py-2 rounded-lg text-[11px] font-bold transition-colors cursor-pointer flex items-center justify-center gap-1"
                >
                  <Download size={12} />
                  Download
                </button>
                <button
                  onClick={() => handleOpenShareModal(qrDirectView)}
                  className="flex-1 bg-gold hover:bg-gold-light text-slate-dark py-2 rounded-lg text-[11px] font-bold transition-colors cursor-pointer flex items-center justify-center gap-1"
                >
                  <Share2 size={12} />
                  Share Link
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Share QR Modal */}
      {shareQrData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl relative text-center space-y-4">
            <button
              onClick={() => setShareQrData(null)}
              className="absolute top-4 right-4 text-slate-500 hover:text-white p-1 hover:bg-slate-850 rounded-lg transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
            
            <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-850 pb-3">
              Share QR Link
            </h2>

            <p className="text-xs text-slate-400">
              Select sharing option for department: <span className="text-white font-medium">{shareQrData.department || shareQrData.departmentId?.name}</span> ({shareQrData.role})
            </p>

            <div className="grid grid-cols-3 gap-3 pt-2 text-xs">
              {/* Copy Link */}
              <button
                onClick={() => {
                  handleCopyLink(shareQrData.inviteLink);
                  setShareQrData(null);
                }}
                className="flex flex-col items-center gap-2 p-3 bg-slate-950 hover:bg-slate-850 border border-slate-800 rounded-xl text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <Copy size={16} className="text-gold" />
                <span className="text-[10px] font-bold">Copy Link</span>
              </button>

              {/* WhatsApp Share */}
              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`You are invited to join OXY-HR: ${shareQrData.inviteLink}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShareQrData(null)}
                className="flex flex-col items-center gap-2 p-3 bg-slate-950 hover:bg-slate-850 border border-slate-800 rounded-xl text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <Share2 size={16} className="text-emerald-500" />
                <span className="text-[10px] font-bold">WhatsApp</span>
              </a>

              {/* Email Share */}
              <a
                href={`mailto:?subject=${encodeURIComponent('OXY-HR Team Join Invitation')}&body=${encodeURIComponent(`You are invited to join the team on OXY-HR PRO.\n\nRegister here: ${shareQrData.inviteLink}`)}`}
                onClick={() => setShareQrData(null)}
                className="flex flex-col items-center gap-2 p-3 bg-slate-950 hover:bg-slate-850 border border-slate-800 rounded-xl text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <Mail size={16} className="text-blue-400" />
                <span className="text-[10px] font-bold">Email</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Member Edit Form - Manage details and access rights */}
      {memberEditForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto space-y-4">
            <button
              type="button"
              onClick={() => setMemberEditForm(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 hover:bg-slate-850 rounded-lg transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
            
            <div className="border-b border-slate-850 pb-3">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="text-gold" size={18} />
                Configure Subordinate Access & Details
              </h2>
              <p className="text-[10px] text-slate-450 mt-1">
                Modify roles, salary, department parameters, and toggle their 14-Feature access checklist.
              </p>
            </div>

            <form onSubmit={handleUpdateSubordinate} className="space-y-5 text-xs text-slate-200">
              
              {/* Section 1: Basic Parameters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1.5">First Name *</label>
                  <input
                    required
                    type="text"
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-gold text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1.5">Last Name *</label>
                  <input
                    required
                    type="text"
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-gold text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1.5">Email Address *</label>
                  <input
                    required
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-gold text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1.5">Phone/Mobile *</label>
                  <input
                    required
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-gold text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1.5">Employee ID *</label>
                  <input
                    required
                    type="text"
                    value={editEmployeeId}
                    onChange={(e) => setEditEmployeeId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-gold text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1.5">Designation *</label>
                  <input
                    required
                    type="text"
                    value={editDesignation}
                    onChange={(e) => setEditDesignation(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-gold text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1.5">Role *</label>
                  <select
                    required
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2.5 outline-none focus:border-gold cursor-pointer text-white"
                  >
                    <option value="EMPLOYEE">Employee</option>
                    <option value="DEPT_MANAGER">Department Manager</option>
                    <option value="HR_MANAGER">HR Manager</option>
                    <option value="HOTEL_ADMIN">Hotel Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1.5">Department *</label>
                  <select
                    required
                    value={editDepartment}
                    onChange={(e) => setEditDepartment(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2.5 outline-none focus:border-gold cursor-pointer text-white"
                  >
                    <option value="" disabled>Select department...</option>
                    {publicDepartments.map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1.5">Base Monthly Salary (₹) *</label>
                  <input
                    required
                    type="number"
                    min="0"
                    value={editBaseSalary}
                    onChange={(e) => setEditBaseSalary(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-gold text-white"
                  />
                </div>
              </div>

              {/* Section 2: Feature checklist rights grid */}
              <div className="border-t border-slate-800/80 pt-4 space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Feature Rights Checklist</h3>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditFeatures(HIERARCHY_FEATURES.map(f => f.key))}
                      className="text-[9px] text-gold hover:text-gold-light uppercase font-bold cursor-pointer"
                    >
                      Select All
                    </button>
                    <span className="text-slate-750">|</span>
                    <button
                      type="button"
                      onClick={() => setEditFeatures([])}
                      className="text-[9px] text-slate-400 hover:text-slate-200 uppercase font-bold cursor-pointer"
                    >
                      Clear All
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {HIERARCHY_FEATURES.map((feat) => {
                    const isChecked = editFeatures.includes(feat.key);
                    const FeatureIcon = feat.Icon;
                    return (
                      <label
                        key={feat.key}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                          isChecked
                            ? 'bg-gold/5 border-gold/45 text-white'
                            : 'bg-slate-900/40 border-slate-850 text-slate-400 hover:bg-slate-900/60'
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setEditFeatures(prev => prev.filter(k => k !== feat.key));
                            } else {
                              setEditFeatures(prev => [...prev, feat.key]);
                            }
                          }}
                        />
                        <span className={`p-1.5 rounded-lg shrink-0 ${isChecked ? 'bg-gold/15 text-gold' : 'bg-slate-950 text-slate-550'}`}>
                          <FeatureIcon size={14} />
                        </span>
                        <span className="text-[10px] font-semibold truncate leading-tight">{feat.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Edited By Label details */}
              {latestUpdates[memberEditForm.id] && (
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3 text-[10px] text-slate-400 space-y-1 mt-2">
                  <div className="flex items-center gap-1.5 text-slate-350">
                    <span className="font-bold">Edited By:</span>
                    <span className="font-medium text-white">{latestUpdates[memberEditForm.id].editedBy}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <span className="font-bold">Last Updated:</span>
                    <span>{new Date(latestUpdates[memberEditForm.id].updatedAt).toLocaleString()}</span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setMemberEditForm(null)}
                  className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="bg-gold hover:bg-gold-light disabled:bg-gold/45 text-slate-dark px-5 py-2 rounded-lg text-xs font-bold transition-all shadow-md gold-glow cursor-pointer flex items-center gap-1.5"
                >
                  {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-dark" /> : <Check size={14} />}
                  Save Settings
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

      {/* Root Admin Password Confirmation Modal */}
      {passwordModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-red-500/30 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white flex items-center gap-2">
                <ShieldAlert className="text-red-500" size={18} />
                Delete Protection
              </h3>
              <button 
                onClick={() => setPasswordModalOpen(false)} 
                className="text-slate-400 hover:text-white"
                disabled={passwordConfirmLoading}
              >
                <X size={18} />
              </button>
            </div>

            {passwordError && (
              <div className="p-3 bg-red-950/40 border border-red-500/30 text-xs text-red-300 rounded-lg">
                {passwordError}
              </div>
            )}

            <form onSubmit={handleVerifyPasswordConfirm} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-2 uppercase tracking-wider">
                  Enter Root Admin Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-lg p-2.5 text-white outline-none focus:border-gold"
                  value={passwordValue}
                  onChange={(e) => setPasswordValue(e.target.value)}
                  disabled={passwordConfirmLoading}
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setPasswordModalOpen(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  disabled={passwordConfirmLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={passwordConfirmLoading}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-800/50 text-white py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {passwordConfirmLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-dark" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      Confirm Delete
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2.6: Edit Department */}
      {editDeptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => {
                setEditDeptModalOpen(false);
                setEditingDeptId(null);
                setDeptModalError(null);
                setDeptModalSuccess(null);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 hover:bg-slate-850 rounded-lg transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-850 pb-3 mb-4 flex items-center gap-2">
              <Edit size={16} className="text-gold" />
              Manage Departments
            </h2>

            {deptModalError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs py-2.5 px-4 rounded-lg flex items-center gap-2 mb-4 animate-fadeIn">
                <AlertTriangle size={14} className="shrink-0" />
                <span>{deptModalError}</span>
              </div>
            )}

            {deptModalSuccess && (
              <div className="bg-green-500/10 border border-green-500/20 text-green-400 text-xs py-2.5 px-4 rounded-lg flex items-center gap-2 mb-4 animate-fadeIn">
                <Check size={14} className="shrink-0" />
                <span>{deptModalSuccess}</span>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950/30 border-b border-slate-800 text-slate-450 font-bold uppercase tracking-wider text-[10px]">
                    <th className="p-3">Department Name</th>
                    <th className="p-3">Code / Description</th>
                    <th className="p-3">Created Date</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850 text-slate-350">
                  {departments.map((dept) => {
                    const isEditing = editingDeptId === dept._id;
                    return (
                      <tr key={dept._id} className="hover:bg-slate-900/10 align-top">
                        <td className="p-3">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editDeptName}
                              onChange={(e) => setEditDeptName(e.target.value)}
                              className="bg-slate-950 text-white text-xs border border-slate-800 rounded px-2.5 py-1.5 outline-none focus:border-gold w-full"
                            />
                          ) : (
                            <span className="font-semibold text-white">{dept.name}</span>
                          )}
                        </td>
                        <td className="p-3">
                          {isEditing ? (
                            <div className="space-y-2">
                              <span className="text-[10px] text-slate-500 font-mono block">Code: {dept.code || 'N/A'}</span>
                              <textarea
                                value={editDeptDesc}
                                onChange={(e) => setEditDeptDesc(e.target.value)}
                                placeholder="Description"
                                className="bg-slate-950 text-white text-xs border border-slate-800 rounded px-2.5 py-1.5 outline-none focus:border-gold w-full min-h-[40px] placeholder:text-slate-650"
                              />
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <span className="text-[10px] text-slate-450 font-mono block">Code: {dept.code || 'N/A'}</span>
                              <p className="text-slate-500 text-[10px] leading-relaxed max-w-sm truncate" title={dept.description}>
                                {dept.description || 'No description provided.'}
                              </p>
                              {latestUpdates[dept._id] && (
                                <div className="text-[9px] text-slate-500 font-normal mt-2 leading-tight pt-1.5 border-t border-slate-800/20">
                                  <span className="font-bold text-slate-450">Edited By:</span>{' '}
                                  <span className="text-slate-350">{latestUpdates[dept._id].editedBy}</span>
                                  <div className="text-slate-550 mt-0.5">
                                    <span className="font-bold text-slate-455">Last Updated:</span>{' '}
                                    <span>{new Date(latestUpdates[dept._id].updatedAt).toLocaleString()}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="p-3 font-mono text-[10px] text-slate-500">
                          {dept.createdAt ? new Date(dept.createdAt).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="p-3">
                          {isEditing ? (
                            <select
                              value={editDeptStatus}
                              onChange={(e) => setEditDeptStatus(e.target.value as 'Active' | 'Inactive')}
                              className="bg-slate-950 text-white text-xs border border-slate-800 rounded px-2 py-1.5 outline-none focus:border-gold cursor-pointer"
                            >
                              <option value="Active">Active</option>
                              <option value="Inactive">Inactive</option>
                            </select>
                          ) : (
                            <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                              dept.status === 'Active' ? 'bg-green-500/15 text-green-400 border border-green-500/20' : 'bg-red-500/15 text-red-400 border border-red-500/20'
                            }`}>
                              {dept.status || 'Active'}
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          {isEditing ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleUpdateDept(dept._id)}
                                disabled={actionLoading}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded text-[10px] font-bold transition-colors cursor-pointer flex items-center gap-1"
                              >
                                <Check size={12} />
                                Save
                              </button>
                              <button
                                onClick={() => setEditingDeptId(null)}
                                className="bg-slate-800 hover:bg-slate-700 text-white px-2.5 py-1.5 rounded text-[10px] font-bold transition-colors cursor-pointer flex items-center gap-1"
                              >
                                <X size={12} />
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => startEditingDept(dept)}
                                className="p-1.5 hover:bg-slate-850 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
                                title="Edit Department"
                              >
                                <Edit size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteDept(dept._id)}
                                className="p-1.5 hover:bg-red-950/40 rounded text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
                                title="Delete Department"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {departments.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center p-6 text-slate-500">
                        No departments found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end pt-4 border-t border-slate-850 mt-4">
              <button
                type="button"
                onClick={() => {
                  setEditDeptModalOpen(false);
                  setEditingDeptId(null);
                  setDeptModalError(null);
                  setDeptModalSuccess(null);
                }}
                className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}