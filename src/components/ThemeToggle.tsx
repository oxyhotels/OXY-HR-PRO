"use client";

import React, { useEffect, useState } from 'react';
import useThemeStore from '@/store/themeStore';

export default function ThemeToggle() {
  const theme = useThemeStore((s: any) => s.theme);
  const toggle = useThemeStore((s: any) => s.toggle);
  const initializeTheme = useThemeStore((s: any) => s.initializeTheme);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    initializeTheme();
    setMounted(true);
  }, [initializeTheme]);

  if (!mounted) {
    return (
      <div className="w-9 h-9 rounded-xl flex items-center justify-center border border-white/5 bg-white/5 opacity-40">
        <div className="w-4 h-4 rounded-full bg-slate-400 animate-pulse" />
      </div>
    );
  }

  const isDark = theme === 'dark';

  return (
    <button
      aria-label="Toggle theme"
      onClick={() => toggle()}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="relative w-9 h-9 rounded-xl flex items-center justify-center border border-white/10 hover:border-gold/50 bg-white/5 text-slate-300 hover:text-gold shadow-sm hover:bg-white/10 hover:shadow-md transition-all duration-300 cursor-pointer overflow-hidden group"
    >
      {/* Sun Icon */}
      <svg
        className={`w-5 h-5 absolute transition-all duration-500 transform ${
          isDark 
            ? 'rotate-90 scale-0 opacity-0 text-slate-400' 
            : 'rotate-0 scale-100 opacity-100 text-amber-500'
        }`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="2.5"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707m9 5.657a4 4 0 11-8 0 4 4 0 018 0z"
        />
      </svg>

      {/* Moon Icon */}
      <svg
        className={`w-5 h-5 absolute transition-all duration-500 transform ${
          isDark 
            ? 'rotate-0 scale-100 opacity-100 text-gold' 
            : '-rotate-90 scale-0 opacity-0 text-slate-300'
        }`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="2.5"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
        />
      </svg>
    </button>
  );
}
