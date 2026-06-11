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
    code: string;
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
}

interface AuthState {
  user: UserProfile | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: UserProfile, token: string) => void;
  updateUser: (user: Partial<UserProfile>) => void;
  setAccessToken: (token: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  setAuth: (user, token) => set({ user, accessToken: token, isAuthenticated: true }),
  updateUser: (updates) =>
    set((state) => ({
      user: state.user ? { ...state.user, ...updates } : null,
    })),
  setAccessToken: (token) => set({ accessToken: token }),
  clearAuth: () => set({ user: null, accessToken: null, isAuthenticated: false }),
}));
