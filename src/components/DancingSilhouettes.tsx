'use client';

import React from 'react';
import { motion } from 'framer-motion';

export default function DancingSilhouettes() {
  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none z-0">
      
      {/* Dancer 1: The Lean (Tilt & Sway) - Left side */}
      <motion.div
        className="absolute w-[120px] h-[220px] text-brand-primary dark:text-slate-200"
        style={{
          left: '8%',
          bottom: '12%',
          opacity: 0.08,
          filter: 'blur(3px)',
          transformOrigin: 'bottom center',
        }}
        animate={{
          rotate: [-15, 18, -15],
          skewX: [-8, 8, -8],
          y: [0, -5, 0],
        }}
        transition={{
          duration: 9,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <svg viewBox="0 0 100 180" className="w-full h-full">
          {/* Head */}
          <circle cx="50" cy="20" r="9" fill="currentColor" />
          {/* Spine / Torso */}
          <path d="M50,29 Q52,50 48,80" stroke="currentColor" strokeWidth="13" fill="none" strokeLinecap="round" />
          {/* Arms (Left & Right) with separate flapping joints */}
          <motion.path
            d="M48,35 Q25,40 18,65"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            animate={{ rotate: [-10, 25, -10] }}
            origin="48px 35px"
            transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.path
            d="M52,35 Q75,30 85,15"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            animate={{ rotate: [15, -20, 15] }}
            origin="52px 35px"
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          />
          {/* Legs (Iconic Lean Stance) */}
          <path d="M48,80 Q40,120 35,170" stroke="currentColor" strokeWidth="11" fill="none" strokeLinecap="round" />
          <path d="M48,80 Q62,118 70,170" stroke="currentColor" strokeWidth="11" fill="none" strokeLinecap="round" />
        </svg>
      </motion.div>

      {/* Dancer 2: The Spin (3D Spin & Balance) - Middle Left */}
      <motion.div
        className="absolute w-[100px] h-[200px] text-brand-primary dark:text-slate-200"
        style={{
          left: '28%',
          bottom: '22%',
          opacity: 0.06,
          filter: 'blur(3px)',
          perspective: 600,
        }}
        animate={{
          rotateY: [0, 360],
          y: [0, -12, 0],
        }}
        transition={{
          rotateY: { duration: 14, repeat: Infinity, ease: 'linear' },
          y: { duration: 7, repeat: Infinity, ease: 'easeInOut' },
        }}
      >
        <svg viewBox="0 0 100 180" className="w-full h-full">
          {/* Head */}
          <circle cx="50" cy="22" r="8" fill="currentColor" />
          {/* Spine */}
          <path d="M50,30 L50,85" stroke="currentColor" strokeWidth="12" fill="none" strokeLinecap="round" />
          {/* Arms out wide (perfect for spinning visual effect) */}
          <motion.path
            d="M50,38 L15,35"
            stroke="currentColor"
            strokeWidth="7.5"
            fill="none"
            strokeLinecap="round"
            animate={{ rotate: [-8, 8, -8] }}
            origin="50px 38px"
            transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.path
            d="M50,38 L85,30"
            stroke="currentColor"
            strokeWidth="7.5"
            fill="none"
            strokeLinecap="round"
            animate={{ rotate: [8, -8, 8] }}
            origin="50px 38px"
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          />
          {/* Legs (Spinning Pivot Stance) */}
          <path d="M50,85 L44,168" stroke="currentColor" strokeWidth="10" fill="none" strokeLinecap="round" />
          <path d="M50,85 L56,135 L68,165" stroke="currentColor" strokeWidth="10" fill="none" strokeLinecap="round" />
        </svg>
      </motion.div>

      {/* Dancer 3: The Slide (Glide & Slide Step) - Right Side */}
      <motion.div
        className="absolute w-[115px] h-[215px] text-brand-primary dark:text-slate-200"
        style={{
          right: '8%',
          bottom: '10%',
          opacity: 0.08,
          filter: 'blur(3px)',
        }}
        animate={{
          x: [-65, 65, -65],
          y: [0, -8, 0, -8, 0],
        }}
        transition={{
          duration: 9.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <svg viewBox="0 0 100 180" className="w-full h-full">
          {/* Head */}
          <circle cx="50" cy="18" r="8.5" fill="currentColor" />
          {/* Torso */}
          <path d="M50,27 Q48,55 52,78" stroke="currentColor" strokeWidth="13" fill="none" strokeLinecap="round" />
          {/* Arms (Sliding Balance Pose) */}
          <motion.path
            d="M48,32 Q25,25 15,48"
            stroke="currentColor"
            strokeWidth="7"
            fill="none"
            strokeLinecap="round"
            animate={{ rotate: [-20, 10, -20] }}
            origin="48px 32px"
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.path
            d="M52,32 Q70,45 82,68"
            stroke="currentColor"
            strokeWidth="7"
            fill="none"
            strokeLinecap="round"
            animate={{ rotate: [10, -25, 10] }}
            origin="52px 32px"
            transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
          />
          {/* Legs (Slide/Glide Stance) */}
          <path d="M52,78 L38,125 L35,172" stroke="currentColor" strokeWidth="11" fill="none" strokeLinecap="round" />
          <path d="M52,78 L60,118 L72,172" stroke="currentColor" strokeWidth="11" fill="none" strokeLinecap="round" />
        </svg>
      </motion.div>

      {/* Dancer 4: The Step (Stepping & Popping) - Middle Right */}
      <motion.div
        className="absolute w-[110px] h-[210px] text-brand-primary dark:text-slate-200"
        style={{
          right: '27%',
          bottom: '24%',
          opacity: 0.07,
          filter: 'blur(3.5px)',
          transformOrigin: 'bottom center',
        }}
        animate={{
          y: [0, -22, 0],
          rotate: [-6, 6, -6],
          scaleY: [1, 0.96, 1],
        }}
        transition={{
          duration: 7.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <svg viewBox="0 0 100 180" className="w-full h-full">
          {/* Head */}
          <circle cx="50" cy="21" r="8.5" fill="currentColor" />
          {/* Spine */}
          <path d="M50,29.5 Q45,55 50,82" stroke="currentColor" strokeWidth="12" fill="none" strokeLinecap="round" />
          {/* Arms (Stepping Step Stance) */}
          <motion.path
            d="M48,34 Q32,15 25,5"
            stroke="currentColor"
            strokeWidth="7"
            fill="none"
            strokeLinecap="round"
            animate={{ rotate: [-15, 30, -15] }}
            origin="48px 34px"
            transition={{ duration: 4.8, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.path
            d="M52,34 Q72,55 82,85"
            stroke="currentColor"
            strokeWidth="7"
            fill="none"
            strokeLinecap="round"
            animate={{ rotate: [12, -18, 12] }}
            origin="52px 34px"
            transition={{ duration: 5.2, repeat: Infinity, ease: 'easeInOut' }}
          />
          {/* Legs (Step / Knee Lift Stance) */}
          <path d="M50,82 L35,115 L20,165" stroke="currentColor" strokeWidth="10.5" fill="none" strokeLinecap="round" />
          <path d="M50,82 Q65,95 62,120 L78,165" stroke="currentColor" strokeWidth="10.5" fill="none" strokeLinecap="round" />
        </svg>
      </motion.div>

      {/* Dancer 5: Torso sway & Gesture (Center stage, behind form) */}
      <motion.div
        className="absolute w-[125px] h-[225px] text-brand-primary dark:text-slate-200"
        style={{
          left: '46%',
          bottom: '6%',
          opacity: 0.05,
          filter: 'blur(4px)',
          transformOrigin: 'bottom center',
        }}
        animate={{
          skewY: [-4, 4, -4],
          rotate: [-8, 8, -8],
          x: [-15, 15, -15],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <svg viewBox="0 0 100 180" className="w-full h-full">
          {/* Head */}
          <circle cx="50" cy="23" r="8" fill="currentColor" />
          {/* Torso */}
          <path d="M50,31 L50,85" stroke="currentColor" strokeWidth="13" fill="none" strokeLinecap="round" />
          {/* Arms (Gestures pointing up and sideways) */}
          <motion.path
            d="M50,39 Q30,48 20,40"
            stroke="currentColor"
            strokeWidth="7.5"
            fill="none"
            strokeLinecap="round"
            animate={{ rotate: [-25, 20, -25] }}
            origin="50px 39px"
            transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.path
            d="M50,39 Q72,25 78,5"
            stroke="currentColor"
            strokeWidth="7.5"
            fill="none"
            strokeLinecap="round"
            animate={{ rotate: [20, -20, 20] }}
            origin="50px 39px"
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          />
          {/* Legs (Broad Dance Base) */}
          <path d="M50,85 L32,120 L22,168" stroke="currentColor" strokeWidth="11" fill="none" strokeLinecap="round" />
          <path d="M50,85 L68,120 L78,168" stroke="currentColor" strokeWidth="11" fill="none" strokeLinecap="round" />
        </svg>
      </motion.div>

    </div>
  );
}
