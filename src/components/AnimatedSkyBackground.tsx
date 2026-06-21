'use client';

import React from 'react';
import MovingClouds from './MovingClouds';
import DancingSilhouettes from './DancingSilhouettes';
import FloatingParticles from './FloatingParticles';

interface AnimatedSkyBackgroundProps {
  children: React.ReactNode;
}

export default function AnimatedSkyBackground({ children }: AnimatedSkyBackgroundProps) {
  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between bg-gradient-to-br from-[#061B4D] via-[#0A2C7A] to-[#123C9A] overflow-hidden">
      <style>{`
        @keyframes pulseMoon {
          0% { transform: scale(1) translate(0, 0); opacity: 0.75; }
          100% { transform: scale(1.15) translate(-10px, 10px); opacity: 0.98; }
        }
        @keyframes subtleSkyShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .moon-glow {
          animation: pulseMoon 10s ease-in-out infinite alternate;
          will-change: transform, opacity;
        }
        .sky-grad {
          background-size: 200% 200%;
          animation: subtleSkyShift 20s ease-in-out infinite;
        }
      `}</style>

      {/* Sky Background Gradients */}
      <div className="absolute inset-0 sky-grad bg-gradient-to-br from-[#061B4D] via-[#0A2C7A] to-[#123C9A] z-0 pointer-events-none" />

      {/* Animated Moonlight Glow (Top-Right Corner) */}
      <div 
        className="moon-glow absolute top-[-120px] right-[-120px] w-[450px] h-[450px] rounded-full bg-[radial-gradient(circle,_rgba(255,255,255,0.15)_0%,_rgba(245,211,106,0.06)_40%,_transparent_70%)] blur-[50px] pointer-events-none z-0" 
      />

      {/* Subcomponents Layer */}
      <MovingClouds />
      <DancingSilhouettes />
      <FloatingParticles />

      {/* Children content wrapper */}
      <div className="relative z-10 w-full flex-1 flex flex-col items-center justify-center">
        {children}
      </div>
    </div>
  );
}
