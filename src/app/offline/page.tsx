'use client';

import React from 'react';
import GoogleIcon from '../../components/GoogleIcon';

export default function OfflinePage() {
  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-slate-dark text-slate-100 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-24 h-24 rounded-full bg-gold/10 border border-gold/25 flex items-center justify-center text-gold mb-6 animate-pulse">
        <GoogleIcon name="signal_wifi_off" size={48} />
      </div>
      <h1 className="text-xl font-black text-slate-100 tracking-tight">You're Offline</h1>
      <p className="text-xs text-slate-400 mt-2 max-w-xs leading-relaxed">
        It looks like you don't have an active internet connection. Please verify your data/WiFi settings and try again.
      </p>
      
      <div className="bg-card-dark/60 border border-slate-800/80 rounded-2xl p-4 mt-6 max-w-xs w-full text-left space-y-2.5">
        <div className="flex items-center gap-2 text-[11px] text-slate-350 font-bold">
          <GoogleIcon name="check_circle" size={14} className="text-green-500" />
          <span>Cached views remain active</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-350 font-bold">
          <GoogleIcon name="check_circle" size={14} className="text-green-500" />
          <span>Local storage holds credentials</span>
        </div>
      </div>

      <button
        onClick={handleRetry}
        className="mt-8 bg-gold hover:bg-gold-light text-slate-dark font-extrabold px-6 py-3 rounded-xl text-xs transition-all shadow-md gold-glow cursor-pointer"
      >
        Retry Connection
      </button>
    </div>
  );
}
