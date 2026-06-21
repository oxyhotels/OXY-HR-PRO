'use client';

import React from 'react';

export default function MovingClouds() {
  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none z-0">
      <style>{`
        @keyframes floatLTR {
          0% { transform: translateX(-150px); }
          100% { transform: translateX(105vw); }
        }
        @keyframes floatRTL {
          0% { transform: translateX(105vw); }
          100% { transform: translateX(-450px); }
        }

        .cloud-ltr-1 { animation: floatLTR 70s linear infinite; left: -250px; }
        .cloud-ltr-2 { animation: floatLTR 50s linear infinite; left: -250px; }
        .cloud-ltr-3 { animation: floatLTR 90s linear infinite; left: -250px; }

        .cloud-rtl-1 { animation: floatRTL 85s linear infinite; left: 0; }
        .cloud-rtl-2 { animation: floatRTL 60s linear infinite; left: 0; }
        .cloud-rtl-3 { animation: floatRTL 110s linear infinite; left: 0; }
      `}</style>

      {/* Cloud Definitions with shadow filters */}
      <svg className="hidden">
        <defs>
          {/* Volumetric shadow for realistic dark cloud depths */}
          <filter id="cloudShadow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="16" />
            <feOffset dx="8" dy="24" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.35" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Premium sky gradients */}
          <linearGradient id="cloudGradBase" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.25" />
            <stop offset="60%" stopColor="#d2e4ff" stopOpacity="0.14" />
            <stop offset="100%" stopColor="#7cb3f5" stopOpacity="0.02" />
          </linearGradient>
        </defs>
      </svg>

      {/* Cloud 1 - LTR (Top Sky) */}
      <div className="cloud-ltr-1 absolute w-[350px] h-[180px] top-[4%] opacity-25 filter drop-shadow-[0_4px_12px_rgba(15,23,42,0.08)]">
        <svg viewBox="0 0 200 100" className="w-full h-full" style={{ filter: 'url(#cloudShadow)' }}>
          <path d="M 20,50 a 15,15 0 0,1 25,-12 a 22,22 0 0,1 35,-5 a 28,28 0 0,1 50,2 a 20,20 0 0,1 25,15 a 15,15 0 0,1 5,18 l -140,0 z" fill="url(#cloudGradBase)" />
        </svg>
      </div>

      {/* Cloud 2 - RTL (High Horizon) */}
      <div className="cloud-rtl-1 absolute w-[480px] h-[240px] top-[18%] opacity-15 filter drop-shadow-[0_6px_20px_rgba(15,23,42,0.06)]" style={{ animationDelay: '-30s' }}>
        <svg viewBox="0 0 200 100" className="w-full h-full" style={{ filter: 'url(#cloudShadow)' }}>
          <path d="M 10,60 a 12,12 0 0,1 20,-10 a 18,18 0 0,1 30,-3 a 24,24 0 0,1 42,0 a 18,18 0 0,1 22,12 a 12,12 0 0,1 -2,11 l -112,0 z" fill="url(#cloudGradBase)" />
        </svg>
      </div>

      {/* Cloud 3 - LTR (Mid Horizon) */}
      <div className="cloud-ltr-2 absolute w-[280px] h-[140px] top-[46%] opacity-20 filter drop-shadow-[0_4px_10px_rgba(15,23,42,0.07)]" style={{ animationDelay: '-15s' }}>
        <svg viewBox="0 0 200 100" className="w-full h-full" style={{ filter: 'url(#cloudShadow)' }}>
          <path d="M 30,40 a 20,20 0 0,1 30,-15 a 25,25 0 0,1 40,-5 a 35,35 0 0,1 60,5 a 25,25 0 0,1 30,20 a 20,20 0 0,1 -10,25 l -150,0 z" fill="url(#cloudGradBase)" />
        </svg>
      </div>

      {/* Cloud 4 - RTL (Lower Mid) */}
      <div className="cloud-rtl-2 absolute w-[520px] h-[260px] top-[34%] opacity-12 filter drop-shadow-[0_8px_24px_rgba(15,23,42,0.05)]" style={{ animationDelay: '-60s' }}>
        <svg viewBox="0 0 200 100" className="w-full h-full" style={{ filter: 'url(#cloudShadow)' }}>
          <path d="M 20,50 a 15,15 0 0,1 25,-12 a 22,22 0 0,1 35,-5 a 28,28 0 0,1 50,2 a 20,20 0 0,1 25,15 a 15,15 0 0,1 5,18 l -140,0 z" fill="url(#cloudGradBase)" />
        </svg>
      </div>

      {/* Cloud 5 - LTR (Low Horizon) */}
      <div className="cloud-ltr-3 absolute w-[220px] h-[110px] top-[68%] opacity-28 filter drop-shadow-[0_3px_8px_rgba(15,23,42,0.09)]" style={{ animationDelay: '-5s' }}>
        <svg viewBox="0 0 200 100" className="w-full h-full" style={{ filter: 'url(#cloudShadow)' }}>
          <path d="M 10,60 a 12,12 0 0,1 20,-10 a 18,18 0 0,1 30,-3 a 24,24 0 0,1 42,0 a 18,18 0 0,1 22,12 a 12,12 0 0,1 -2,11 l -112,0 z" fill="url(#cloudGradBase)" />
        </svg>
      </div>

      {/* Cloud 6 - RTL (Bottom horizon) */}
      <div className="cloud-rtl-3 absolute w-[440px] h-[220px] top-[78%] opacity-15 filter drop-shadow-[0_5px_15px_rgba(15,23,42,0.06)]" style={{ animationDelay: '-45s' }}>
        <svg viewBox="0 0 200 100" className="w-full h-full" style={{ filter: 'url(#cloudShadow)' }}>
          <path d="M 30,40 a 20,20 0 0,1 30,-15 a 25,25 0 0,1 40,-5 a 35,35 0 0,1 60,5 a 25,25 0 0,1 30,20 a 20,20 0 0,1 -10,25 l -150,0 z" fill="url(#cloudGradBase)" />
        </svg>
      </div>

    </div>
  );
}
