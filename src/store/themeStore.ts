"use client";

import { create } from 'zustand';

type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
}

const STORAGE_KEY = 'oxy-theme';

export const useThemeStore = create<ThemeState>((set: any, get: any) => ({
  theme: (typeof window !== 'undefined' && (localStorage.getItem(STORAGE_KEY) as Theme)) || 'light',
  setTheme: (t: Theme) => {
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch (e) {
      // ignore
    }
    // apply class on document
    if (typeof document !== 'undefined') {
      if (t === 'dark') document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
    }
    set({ theme: t });
  },
  toggle: () => {
    const current = get().theme;
    const next: Theme = current === 'dark' ? 'light' : 'dark';
    get().setTheme(next);
  }
}));

// Ensure initial DOM sync on module load for client usage
if (typeof window !== 'undefined') {
  try {
    const stored = (localStorage.getItem(STORAGE_KEY) as Theme) || 'light';
    if (stored === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  } catch (e) {}
}

export default useThemeStore;
