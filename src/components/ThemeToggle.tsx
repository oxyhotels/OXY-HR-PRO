"use client";

import React, { useEffect, useState } from 'react';
import useThemeStore from '@/store/themeStore';

export default function ThemeToggle() {
  const theme = useThemeStore((s: any) => s.theme);
  const setTheme = useThemeStore((s: any) => s.setTheme);
  const toggle = useThemeStore((s: any) => s.toggle);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <div className="fixed top-3 right-3 z-50">
      <button
        aria-label="Toggle theme"
        onClick={() => toggle()}
        title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        className="flex items-center gap-2 px-3 py-2 rounded-full border border-slate-200 bg-white text-slate-800 shadow-sm hover:shadow-md transition-all dark:bg-[#0f172a] dark:border-[#334155] dark:text-[#F8FAFC]"
      >
        <span className="text-sm">{theme === 'dark' ? '☀️' : '🌙'}</span>
        <span className="text-[13px] font-semibold hidden sm:inline">
          {theme === 'dark' ? 'Light' : 'Dark'} Mode
        </span>
      </button>
    </div>
  );
}
