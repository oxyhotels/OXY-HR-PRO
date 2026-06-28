import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SearchableDropdownProps {
  options: string[];
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  disabled?: boolean;
  label?: string;
  className?: string;
}

export const SearchableDropdown: React.FC<SearchableDropdownProps> = ({
  options,
  value,
  onChange,
  placeholder,
  disabled,
  label,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = options.filter(opt =>
    opt.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setFocusedIndex(-1);
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex(prev => (prev < filtered.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex(prev => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (focusedIndex >= 0 && focusedIndex < filtered.length) {
        onChange(filtered[focusedIndex]);
        setIsOpen(false);
        setSearchTerm('');
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className={`relative ${className}`} ref={containerRef} onKeyDown={handleKeyDown}>
      {label && <label className="block text-slate-400 font-semibold mb-1 text-[11px] sm:text-xs uppercase tracking-wider">{label}</label>}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full bg-slate-950/60 dark:bg-slate-950/60 bg-white border rounded-lg py-2 px-3 text-slate-900 dark:text-white flex justify-between items-center outline-none transition-all ${
          disabled ? 'opacity-40 cursor-not-allowed border-slate-200 dark:border-slate-800' : 'border-slate-300 dark:border-slate-800 hover:border-gold/60 focus:border-gold cursor-pointer'
        }`}
      >
        <span className={value ? 'text-slate-900 dark:text-white text-xs sm:text-sm truncate' : 'text-slate-500 text-xs sm:text-sm truncate'}>
          {value || placeholder}
        </span>
        <ChevronDown size={14} className={`text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
            className="absolute z-[100] w-full mt-1 bg-white dark:bg-[#0b1424] border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl flex flex-col overflow-hidden"
          >
            <div className="p-2 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 bg-slate-50 dark:bg-slate-950/60">
              <Search size={14} className="text-slate-500 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setFocusedIndex(-1);
                }}
                className="w-full bg-transparent text-slate-900 dark:text-white border-none outline-none text-xs sm:text-sm placeholder:text-slate-400 focus:outline-none"
              />
            </div>
            <div className="overflow-y-auto flex-1 max-h-56 py-1">
              {filtered.map((opt, idx) => (
                <div
                  key={opt}
                  onClick={() => {
                    onChange(opt);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                  className={`px-3 py-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-gold/10 hover:text-slate-900 dark:hover:text-white cursor-pointer transition-colors ${
                    opt === value ? 'bg-slate-100 dark:bg-gold/15 text-slate-900 dark:text-gold font-semibold' : ''
                  } ${focusedIndex === idx ? 'bg-slate-100 dark:bg-gold/10' : ''}`}
                >
                  {opt}
                </div>
              ))}
              {filtered.length === 0 && (
                <div className="px-3 py-4 text-xs sm:text-sm text-slate-500 text-center italic">
                  No matches found
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
