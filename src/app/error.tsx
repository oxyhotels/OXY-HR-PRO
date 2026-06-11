'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorBoundary({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log error to console or error tracking services
    console.error('Captured Runtime Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen w-full bg-slate-dark flex flex-col items-center justify-center relative overflow-hidden px-4">
      {/* Background Glowing Decorative Elements */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-red-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gold/5 rounded-full blur-3xl" />

      {/* Glassmorphic Card Container */}
      <div className="glass-panel max-w-lg w-full text-center p-10 md:p-12 rounded-2xl border border-gold/15 relative z-10">
        <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-8 h-8 text-red-500 animate-pulse"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        <h1 className="text-3xl font-extrabold text-slate-100 tracking-wide mb-3">
          System Encountered an Error
        </h1>
        
        <p className="text-xs text-slate-400 font-mono bg-slate-dark/50 border border-slate-700/30 p-3 rounded-lg max-w-sm mx-auto mb-8 break-words text-left">
          {error.message || 'An unexpected runtime crash occurred inside the application server.'}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => reset()}
            className="px-6 py-3 rounded-lg text-xs font-semibold uppercase tracking-widest bg-gold hover:bg-gold-light text-slate-dark transition-all duration-300 font-medium text-center shadow-lg hover:shadow-gold/20"
          >
            Try Again
          </button>
          
          <Link
            href="/dashboard"
            className="px-6 py-3 rounded-lg text-xs font-semibold uppercase tracking-widest border border-gold/30 hover:border-gold/60 text-gold hover:text-gold-light transition-all duration-300 font-medium text-center"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
