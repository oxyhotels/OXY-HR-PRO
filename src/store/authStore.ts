'use client';

import { create } from 'zustand';

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'ROOT_ADMIN' | 'HOTEL_ADMIN' | 'HR_MANAGER' | 'DEPT_MANAGER' | 'EMPLOYEE';
  hotel?: {
    _id?: string;
    id?: string;
    name: string;
    hotelCode: string;
  } | string;
  department?: string;
  designation?: string;
  photoUrl?: string;
  personalDetails?: {
    dob?: string;
    gender?: 'Male' | 'Female' | 'Other';
    address?: string;
  };
  salaryDetails?: {
    baseSalary: number;
    allowances: { name: string; amount: number }[];
    deductions: { name: string; amount: number }[];
  };
  bankDetails?: {
    accountNo?: string;
    bankName?: string;
    ifsc?: string;
  };
  documents?: { name: string; fileUrl: string; uploadedAt: string }[];
  phone?: string;
  employeeId?: string;
  reportingManager?: string;
  employmentType?: string;
  aadhaarNumber?: string;
  panNumber?: string;
  emergencyContact?: {
    name: string;
    relation: string;
    phone: string;
  };
  // Intelligent Ops Gamification
  xp?: number;
  level?: number;
  badges?: string[];
  accountabilityIndex?: number;
  shift?: string;
  enabledFeatures?: string[];
}

interface AuthState {
  user: UserProfile | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  setAuth: (user: UserProfile, token: string) => void;
  updateUser: (user: Partial<UserProfile>) => void;
  setAccessToken: (token: string) => void;
  clearAuth: () => void;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isHydrated: false,

  setAuth: (user, token) => {
    // Persist token in localStorage for cross-tab/page hydration
    if (typeof window !== 'undefined') {
      localStorage.setItem('oxy_access_token', token);
      localStorage.setItem('oxy_user', JSON.stringify(user));
    }
    set({ user, accessToken: token, isAuthenticated: true, isHydrated: true });
  },

  updateUser: (updates) =>
    set((state) => {
      const updatedUser = state.user ? { ...state.user, ...updates } : null;
      if (updatedUser && typeof window !== 'undefined') {
        localStorage.setItem('oxy_user', JSON.stringify(updatedUser));
      }
      return { user: updatedUser };
    }),

  setAccessToken: (token) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('oxy_access_token', token);
    }
    set({ accessToken: token });
  },

  clearAuth: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('oxy_access_token');
      localStorage.removeItem('oxy_user');
    }
    set({ user: null, accessToken: null, isAuthenticated: false, isHydrated: true });
  },

  hydrate: async () => {
    if (typeof window === 'undefined') return;
    
    // Already hydrated
    if (get().isHydrated) return;

    // Check localStorage first (fast path)
    const storedToken = localStorage.getItem('oxy_access_token');
    const storedUser = localStorage.getItem('oxy_user');

    if (storedToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        set({ user: parsedUser, accessToken: storedToken, isAuthenticated: true, isHydrated: true });
        
        // Verify token is still valid by calling /auth/me
        try {
          const res = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${storedToken}` },
          });
          if (res.ok) {
            const data = await res.json();
            if (data?.data?.user) {
              get().updateUser(data.data.user);
            }
          } else if (res.status === 401) {
            // Token expired, try refresh
            const refreshRes = await fetch('/api/auth/refresh', { method: 'POST' });
            if (refreshRes.ok) {
              const refreshData = await refreshRes.json();
              if (refreshData?.data?.accessToken) {
                get().setAccessToken(refreshData.data.accessToken);
              }
            } else {
              // Refresh failed, clear auth
              get().clearAuth();
            }
          }
        } catch {
          // Network error, keep localStorage auth for offline resilience
          console.warn('[AUTH] Hydration network check failed, using cached auth');
        }
        return;
      } catch {
        // Corrupted storage, clear it
        localStorage.removeItem('oxy_access_token');
        localStorage.removeItem('oxy_user');
      }
    }

    // No localStorage tokens, try cookie-based refresh
    try {
      const res = await fetch('/api/auth/refresh', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data?.data?.accessToken) {
          const token = data.data.accessToken;
          // Fetch user profile
          const meRes = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (meRes.ok) {
            const meData = await meRes.json();
            if (meData?.data?.user) {
              if (typeof window !== 'undefined') {
                localStorage.setItem('oxy_access_token', token);
                localStorage.setItem('oxy_user', JSON.stringify(meData.data.user));
              }
              set({ user: meData.data.user, accessToken: token, isAuthenticated: true, isHydrated: true });
              return;
            }
          }
        }
      }
    } catch {
      // No valid session
    }

    set({ isHydrated: true });
  },
}));