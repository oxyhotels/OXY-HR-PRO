'use client';

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, X, ExternalLink, Sparkles } from 'lucide-react';

const LinkedinIcon = ({ size = 16, className = '' }: { size?: number; className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect width="4" height="12" x="2" y="9" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

interface FooterDeveloperCardProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef?: React.RefObject<HTMLButtonElement | null>;
}

export default function FooterDeveloperCard({ isOpen, onClose, triggerRef }: FooterDeveloperCardProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on ESC key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Focus trap and restore
  useEffect(() => {
    if (!isOpen) return;

    const focusableElementsSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const modalElement = modalRef.current;
    
    // Set focus to the modal itself
    modalElement?.focus();

    const handleFocusTrap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusableElements = modalElement?.querySelectorAll(focusableElementsSelector);
      if (!focusableElements || focusableElements.length === 0) return;

      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    };

    window.addEventListener('keydown', handleFocusTrap);
    
    const activeElementBeforeOpen = document.activeElement as HTMLElement | null;
    const currentTrigger = triggerRef?.current;

    return () => {
      window.removeEventListener('keydown', handleFocusTrap);
      if (currentTrigger) {
        currentTrigger.focus();
      } else if (activeElementBeforeOpen) {
        activeElementBeforeOpen.focus();
      }
    };
  }, [isOpen, triggerRef]);

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const tags = [
    'Digital Growth Expert',
    'Full Stack Developer',
    'SEO Specialist',
    'AI Automation Consultant',
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md overflow-y-auto"
          onClick={handleBackdropClick}
          role="presentation"
        >
          <motion.div
            ref={modalRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="dev-card-title"
            aria-describedby="dev-card-desc"
            initial={{ opacity: 0, scale: 0.92, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 dark:border-white/10 bg-slate-900/85 backdrop-blur-2xl p-6 md:p-8 text-white shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] focus:outline-none"
          >
            {/* Top decorative gradient lighting line */}
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-gold via-gold-light to-gold-dark" />

            {/* Glowing abstract background circle */}
            <div className="absolute -top-12 -right-12 w-36 h-36 rounded-full bg-gold/10 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-16 -left-16 w-40 h-40 rounded-full bg-gold/5 blur-3xl pointer-events-none" />

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 rounded-lg border border-slate-700/50 bg-slate-800/40 text-slate-400 hover:text-white hover:bg-slate-800/80 hover:border-gold/30 hover:scale-105 active:scale-95 transition-all duration-200"
              aria-label="Close profile card"
            >
              <X size={16} />
            </button>

            {/* Card Content Header */}
            <div className="flex flex-col items-center text-center mt-2">
              {/* Profile Avatar Badge */}
              <div className="relative mb-5 group">
                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-gold via-gold-light to-gold-dark opacity-40 blur-md group-hover:opacity-75 transition-opacity duration-300" />
                <div className="relative w-20 h-20 rounded-full border border-gold/40 bg-slate-950 flex items-center justify-center shadow-inner overflow-hidden">
                  <div className="absolute inset-[2px] rounded-full bg-gradient-to-br from-slate-900 to-slate-950" />
                  <span className="relative text-3xl font-bold tracking-tighter bg-gradient-to-r from-gold via-gold-light to-gold bg-clip-text text-transparent group-hover:scale-110 transition-transform duration-300">
                    MA
                  </span>
                  {/* Small animated sparkles icon */}
                  <div className="absolute bottom-1 right-1 bg-gold rounded-full p-0.5 text-slate-950">
                    <Sparkles size={10} className="animate-spin-icon" style={{ animationDuration: '3s' }} />
                  </div>
                </div>
              </div>

              {/* Developer Name */}
              <h2
                id="dev-card-title"
                className="text-2xl font-extrabold tracking-wide font-sans flex items-center gap-1.5 text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-gold"
              >
                👨‍💻 MD ATAUR ANSARI
              </h2>

              {/* Position Subtitle */}
              <div className="mt-1 flex flex-col items-center justify-center">
                <span className="text-gold font-bold font-sans text-sm tracking-widest uppercase">
                  Founder & CEO
                </span>
                <span className="text-slate-400 text-xs font-semibold tracking-wider hover:text-gold transition-colors duration-200">
                  Ataur Agency
                </span>
              </div>

              <div className="w-16 h-[1px] bg-slate-800 my-4" />

              {/* Description & Tags */}
              <p id="dev-card-desc" className="sr-only">
                Digital Growth Expert, Full Stack Developer, SEO Specialist, AI Automation Consultant
              </p>

              {/* Modern Tag Layout */}
              <div className="flex flex-wrap justify-center gap-2 mb-6">
                {tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="text-[10px] md:text-xs font-medium bg-slate-950/60 text-slate-300 border border-slate-800/80 px-2.5 py-1 rounded-full hover:border-gold/30 hover:text-white transition-all duration-200 select-none hover:shadow-[0_0_10px_rgba(212,175,55,0.08)]"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="w-full flex flex-col gap-3">
                {/* Visit Website Button */}
                <a
                  href="https://atauragency.in/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl font-bold text-sm text-slate-950 bg-gradient-to-r from-gold via-gold-light to-gold-dark hover:brightness-105 active:scale-[0.99] transition-all duration-200 shadow-[0_4px_20px_rgba(212,175,55,0.2)] hover:shadow-[0_4px_25px_rgba(212,175,55,0.35)]"
                >
                  <Globe size={16} className="text-slate-950 transition-transform duration-300 group-hover:rotate-12" />
                  <span>🌐 Visit Website</span>
                  <ExternalLink size={12} className="opacity-60 text-slate-950 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </a>

                {/* LinkedIn Profile Button */}
                <a
                  href="https://www.linkedin.com/in/md-ataur-ansari-b18790271/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl font-bold text-sm text-white bg-slate-950 border border-slate-800 hover:border-blue-500/50 hover:bg-slate-950/80 hover:shadow-[0_0_15px_rgba(59,130,246,0.15)] active:scale-[0.99] transition-all duration-200"
                >
                  <LinkedinIcon size={16} className="text-blue-400 group-hover:scale-110 transition-transform duration-200" />
                  <span>💼 LinkedIn Profile</span>
                  <ExternalLink size={12} className="opacity-40 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
