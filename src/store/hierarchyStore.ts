import { create } from 'zustand';
import { api } from '../lib/api';

export interface OrganizationData {
  _id: string;
  name: string;
  code?: string;
  createdAt: string;
}

export interface DepartmentData {
  _id: string;
  name: string;
  organization: string;
  hotel?: string;
  manager?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  createdAt: string;
}

export interface TreeNode {
  id: string;
  name: string;
  email: string;
  role: string;
  departmentName?: string;
  designation?: string;
  status: string;
  phone?: string;
  employeeId?: string;
  joinedDate: string;
  hotelCode: string;
  children: TreeNode[];
}

export interface DepartmentTreeNode {
  id: string;
  name: string;
  hotelCode?: string | null;
  employeesCount: number;
  structure: TreeNode[];
}

export interface OrgTreeNode {
  id: string;
  name: string;
  code?: string;
  departments: DepartmentTreeNode[];
}

export interface InviteLinkData {
  _id: string;
  inviteCode: string;
  inviteLink: string;
  qrCode: string;
  organizationId: { _id: string; name: string };
  departmentId: { _id: string; name: string };
  managerId: { _id: string; firstName: string; lastName: string };
  expiresAt?: string;
  status: 'Active' | 'Disabled';
  createdAt: string;
}

export interface JoinRequestData {
  _id: string;
  inviteCode: string;
  name: string;
  email: string;
  mobile: string;
  employeeId: string;
  designation: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  createdAt: string;
  departmentId?: { _id: string; name: string };
}

export interface AuditLogData {
  _id: string;
  userId: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
  action: string;
  details: string;
  createdAt: string;
}

export interface HierarchyAnalytics {
  totals: {
    organizations: number;
    departments: number;
    managers: number;
    employees: number;
    pendingJoinRequests: number;
    activeInviteLinks: number;
  };
  departmentDistribution: { department: string; count: number }[];
  hierarchyGrowth: { month: string; count: number }[];
  recentAudits: AuditLogData[];
}

interface HierarchyState {
  organizations: OrganizationData[];
  departments: DepartmentData[];
  tree: OrgTreeNode[];
  invites: InviteLinkData[];
  pendingRequests: JoinRequestData[];
  team: any[];
  reportingPath: any[];
  analytics: HierarchyAnalytics | null;
  loading: boolean;
  actionLoading: boolean;
  error: string | null;

  fetchOrganizationsAndDepartments: () => Promise<void>;
  createOrganization: (name: string, code?: string) => Promise<OrganizationData>;
  createDepartment: (name: string, organizationId: string, hotelId?: string, managerId?: string) => Promise<DepartmentData>;
  fetchHierarchyTree: (filters?: { departmentId?: string; hotelId?: string; managerId?: string; search?: string }) => Promise<void>;
  generateInvite: (organizationId: string, departmentId: string, expiresInDays?: number) => Promise<InviteLinkData>;
  fetchActiveInvites: () => Promise<void>;
  disableInviteLink: (inviteCode: string) => Promise<void>;
  fetchPendingRequests: () => Promise<void>;
  approveJoinRequest: (requestId: string) => Promise<void>;
  rejectJoinRequest: (requestId: string) => Promise<void>;
  fetchTeamStructure: () => Promise<void>;
  fetchReportingPath: () => Promise<void>;
  fetchAnalytics: () => Promise<void>;
  transferEmployee: (employeeId: string, newManagerId: string | null, newDepartmentId: string) => Promise<void>;
}

export const useHierarchyStore = create<HierarchyState>((set, get) => ({
  organizations: [],
  departments: [],
  tree: [],
  invites: [],
  pendingRequests: [],
  team: [],
  reportingPath: [],
  analytics: null,
  loading: false,
  actionLoading: false,
  error: null,

  fetchOrganizationsAndDepartments: async () => {
    set({ loading: true, error: null });
    try {
      const res = await api.get('/organization/list');
      set({ 
        organizations: res.data.organizations || [], 
        departments: res.data.departments || [] 
      });
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch organizations and departments' });
    } finally {
      set({ loading: false });
    }
  },

  createOrganization: async (name, code) => {
    set({ actionLoading: true, error: null });
    try {
      const res = await api.post('/organization/create', { name, code });
      const org = res.data.organization;
      set((state) => ({ organizations: [...state.organizations, org].sort((a, b) => a.name.localeCompare(b.name)) }));
      return org;
    } catch (err: any) {
      set({ error: err.message || 'Failed to create organization' });
      throw err;
    } finally {
      set({ actionLoading: false });
    }
  },

  createDepartment: async (name, organizationId, hotelId, managerId) => {
    set({ actionLoading: true, error: null });
    try {
      const res = await api.post('/organization/department', { name, organizationId, hotelId, managerId });
      const dept = res.data.department;
      set((state) => ({ departments: [...state.departments, dept].sort((a, b) => a.name.localeCompare(b.name)) }));
      return dept;
    } catch (err: any) {
      set({ error: err.message || 'Failed to create department' });
      throw err;
    } finally {
      set({ actionLoading: false });
    }
  },

  fetchHierarchyTree: async (filters = {}) => {
    set({ loading: true, error: null });
    try {
      const params = new URLSearchParams();
      if (filters.departmentId) params.append('departmentId', filters.departmentId);
      if (filters.hotelId) params.append('hotelId', filters.hotelId);
      if (filters.managerId) params.append('managerId', filters.managerId);
      if (filters.search) params.append('search', filters.search);

      const res = await api.get(`/organization/tree?${params.toString()}`);
      set({ tree: res.data.tree || [] });
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch hierarchy tree chart' });
    } finally {
      set({ loading: false });
    }
  },

  generateInvite: async (organizationId, departmentId, expiresInDays) => {
    set({ actionLoading: true, error: null });
    try {
      const res = await api.post('/hierarchy/invite', { organizationId, departmentId, expiresInDays });
      const invite = res.data.invite;
      set((state) => ({ invites: [invite, ...state.invites] }));
      return invite;
    } catch (err: any) {
      set({ error: err.message || 'Failed to generate QR invite' });
      throw err;
    } finally {
      set({ actionLoading: false });
    }
  },

  fetchActiveInvites: async () => {
    set({ loading: true, error: null });
    try {
      const res = await api.get('/hierarchy/invites/active');
      set({ invites: res.data.invites || [] });
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch active invites' });
    } finally {
      set({ loading: false });
    }
  },

  disableInviteLink: async (inviteCode) => {
    set({ actionLoading: true, error: null });
    try {
      await api.post('/hierarchy/invite/disable', { inviteCode });
      set((state) => ({
        invites: state.invites.map((inv) => 
          inv.inviteCode === inviteCode ? { ...inv, status: 'Disabled' as const } : inv
        )
      }));
    } catch (err: any) {
      set({ error: err.message || 'Failed to disable invite link' });
      throw err;
    } finally {
      set({ actionLoading: false });
    }
  },

  fetchPendingRequests: async () => {
    set({ loading: true, error: null });
    try {
      const res = await api.get('/hierarchy/requests/pending');
      set({ pendingRequests: res.data.requests || [] });
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch pending join requests' });
    } finally {
      set({ loading: false });
    }
  },

  approveJoinRequest: async (requestId) => {
    set({ actionLoading: true, error: null });
    try {
      await api.post('/hierarchy/approve', { requestId });
      set((state) => ({
        pendingRequests: state.pendingRequests.filter((req) => req._id !== requestId)
      }));
    } catch (err: any) {
      set({ error: err.message || 'Failed to approve join request' });
      throw err;
    } finally {
      set({ actionLoading: false });
    }
  },

  rejectJoinRequest: async (requestId) => {
    set({ actionLoading: true, error: null });
    try {
      await api.post('/hierarchy/reject', { requestId });
      set((state) => ({
        pendingRequests: state.pendingRequests.filter((req) => req._id !== requestId)
      }));
    } catch (err: any) {
      set({ error: err.message || 'Failed to reject join request' });
      throw err;
    } finally {
      set({ actionLoading: false });
    }
  },

  fetchTeamStructure: async () => {
    set({ loading: true, error: null });
    try {
      const res = await api.get('/hierarchy/team');
      set({ team: res.data.team || [] });
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch team reports structure' });
    } finally {
      set({ loading: false });
    }
  },

  fetchReportingPath: async () => {
    set({ loading: true, error: null });
    try {
      const res = await api.get('/hierarchy/reporting');
      set({ reportingPath: res.data.path || [] });
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch reporting path' });
    } finally {
      set({ loading: false });
    }
  },

  fetchAnalytics: async () => {
    set({ loading: true, error: null });
    try {
      const res = await api.get('/hierarchy/analytics');
      set({ analytics: res.data || null });
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch hierarchy tree analytics' });
    } finally {
      set({ loading: false });
    }
  },

  transferEmployee: async (employeeId, newManagerId, newDepartmentId) => {
    set({ actionLoading: true, error: null });
    try {
      await api.post('/hierarchy/transfer', { employeeId, newManagerId, newDepartmentId });
    } catch (err: any) {
      set({ error: err.message || 'Failed to transfer employee' });
      throw err;
    } finally {
      set({ actionLoading: false });
    }
  },
}));
