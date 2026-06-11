'use client';

import React from 'react';

export default function Loading() {
  return (
    <div className="min-h-screen w-full bg-slate-dark flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background Decorative Glowing Elements */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gold/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gold/5 rounded-full blur-3xl" />

      {/* Glassmorphic Loader Container */}
      <div className="glass-panel gold-glow px-10 py-12 rounded-2xl flex flex-col items-center justify-center max-w-sm w-full mx-4 border border-gold/10 relative z-10">
        {/* Animated Double Ring Loader */}
        <div className="relative w-16 h-16 mb-6">
          <div className="absolute inset-0 border-4 border-gold/20 rounded-full" />
          <div className="absolute inset-0 border-4 border-t-gold border-r-gold border-transparent rounded-full animate-spin" />
          <div className="absolute inset-2 border-4 border-b-gold-light border-l-gold-light border-transparent rounded-full animate-spin [animation-duration:1s] [animation-direction:reverse]" />
        </div>

        {/* Text */}
        <h2 className="text-sm font-semibold tracking-wider uppercase text-gold animate-pulse text-center mb-1">
          OXY Hotels
        </h2>
        <p className="text-xs text-slate-400 tracking-widest text-center animate-pulse">
          Loading Systems...
        </p>
      </div>
    </div>
  );
}
