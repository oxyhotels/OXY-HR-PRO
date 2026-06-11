'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Code2 } from 'lucide-react';

interface FooterProps {
  className?: string;
  forceRender?: boolean;
}

export default function Footer({ className = '', forceRender = false }: FooterProps) {
  const pathname = usePathname();
  const isDashboard = pathname.startsWith('/dashboard');

  // If we are on a dashboard route and forceRender is false, we do not render here.
  // This allows us to instead render it within the dashboard's inner scroll container.
  if (isDashboard && !forceRender) {
    return null;
  }

  // Slide-up and fade-in entry animation
  const containerVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: 'easeOut' as const,
      },
    },
  };

  return (
    <motion.footer
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className={`w-full py-5 px-6 md:px-8 border-t border-slate-800/80 bg-slate-950 dark:bg-slate-dark/95 shadow-[0_-10px_30px_rgba(0,0,0,0.5)] transition-all duration-300 ${className}`}
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
        {/* Left Side: Copyright */}
        <div className="text-white dark:text-white font-bold font-sans tracking-wide text-center sm:text-left">
          © 2026{' '}
          <span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-gold via-gold-light to-gold-dark uppercase tracking-wider select-none relative group">
            OXY Hotels
            <span className="absolute -bottom-0.5 left-0 w-0 h-0.5 bg-gold transition-all duration-300 group-hover:w-full" />
          </span>
          . All Rights Reserved.
        </div>

        {/* Right Side: Developer Credit */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 text-white dark:text-white font-bold font-sans select-none">
          <span className="opacity-95">Designed & Developed by</span>
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="flex items-center gap-1.5 bg-slate-900 border border-slate-700/80 px-2.5 py-1 rounded-md transition-all duration-300 hover:border-gold/60 dark:hover:border-gold/60 hover:shadow-[0_0_12px_rgba(212,175,55,0.15)] cursor-default"
          >
            <Code2 size={12} className="text-gold animate-pulse" />
            <span className="font-mono font-extrabold tracking-wider text-white dark:text-white hover:text-gold dark:hover:text-gold transition-colors duration-300">
              MD ATAUR ANSARI
            </span>
          </motion.div>
        </div>
      </div>
    </motion.footer>
  );
}
