'use client';

import React from 'react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen w-full bg-slate-dark flex flex-col items-center justify-center relative overflow-hidden px-4">
      {/* Decorative Glowing Elements */}
      <div className="absolute top-1/3 left-1/4 w-80 h-80 bg-gold/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-gold/5 rounded-full blur-3xl" />

      {/* Glassmorphic Error Container */}
      <div className="glass-panel gold-glow max-w-lg w-full text-center p-10 md:p-12 rounded-2xl border border-gold/15 relative z-10">
        <h1 className="text-8xl font-black bg-gradient-to-r from-gold via-gold-light to-gold-dark bg-clip-text text-transparent select-none mb-4 animate-pulse">
          404
        </h1>
        <h2 className="text-xl font-semibold text-slate-100 tracking-wide mb-3">
          Page Not Found
        </h2>
        <p className="text-sm text-slate-400 max-w-sm mx-auto mb-8 leading-relaxed">
          The luxury hospitality resource you are looking for has either been moved, updated, or is temporarily unavailable.
        </p>

        {/* Navigation Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/dashboard"
            className="px-6 py-3 rounded-lg text-xs font-semibold uppercase tracking-widest bg-gold hover:bg-gold-light text-slate-dark transition-all duration-300 font-medium text-center shadow-lg hover:shadow-gold/20"
          >
            Dashboard
          </Link>
          <Link
            href="/login"
            className="px-6 py-3 rounded-lg text-xs font-semibold uppercase tracking-widest border border-gold/30 hover:border-gold/60 text-gold hover:text-gold-light transition-all duration-300 font-medium text-center"
          >
            Login Page
          </Link>
        </div>
      </div>
    </div>
  );
}
