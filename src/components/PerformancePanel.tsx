'use client';

import React, { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { getPerformanceSummary } from '@/lib/performanceMetrics';

export default function PerformancePanel() {
  const user = useAuthStore((state) => state.user);
  const [visible, setVisible] = useState(false);
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [summary, setSummary] = useState(getPerformanceSummary());

  useEffect(() => {
    const toggleKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'p') {
        setVisible((current) => !current);
      }
    };

    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    const updateMetrics = () => setSummary(getPerformanceSummary());
    const interval = window.setInterval(updateMetrics, 2500);

    window.addEventListener('keydown', toggleKey);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    updateMetrics();

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('keydown', toggleKey);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  if (!visible || !user || user.role !== 'ROOT_ADMIN') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm w-full rounded-3xl border border-slate-700/80 bg-slate-950/95 p-4 shadow-2xl backdrop-blur-xl text-white">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Admin Performance Panel</div>
          <div className="text-sm font-semibold text-white">Hidden metrics & PWA health</div>
        </div>
        <button
          onClick={() => setVisible(false)}
          className="rounded-full border border-slate-700/80 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-slate-300 hover:bg-slate-800"
        >
          Close
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 text-[12px] mb-4">
        <div className="rounded-2xl bg-slate-900/80 p-3 border border-slate-700">
          <div className="text-slate-400 uppercase tracking-[0.18em] mb-1">Online</div>
          <div className={`font-semibold ${online ? 'text-emerald-300' : 'text-rose-300'}`}>{online ? 'Online' : 'Offline'}</div>
        </div>
        <div className="rounded-2xl bg-slate-900/80 p-3 border border-slate-700">
          <div className="text-slate-400 uppercase tracking-[0.18em] mb-1">Cache Hit</div>
          <div className="font-semibold text-sky-300">{summary.cacheHitRate}%</div>
        </div>
        <div className="rounded-2xl bg-slate-900/80 p-3 border border-slate-700">
          <div className="text-slate-400 uppercase tracking-[0.18em] mb-1">Avg API ms</div>
          <div className="font-semibold text-amber-300">{summary.averageResponseTime} ms</div>
        </div>
        <div className="rounded-2xl bg-slate-900/80 p-3 border border-slate-700">
          <div className="text-slate-400 uppercase tracking-[0.18em] mb-1">Success Rate</div>
          <div className="font-semibold text-emerald-300">{summary.successRate}%</div>
        </div>
      </div>

      <div className="space-y-3 text-[12px]">
        <div className="rounded-2xl bg-slate-900/80 p-3 border border-slate-700">
          <div className="text-slate-400 uppercase tracking-[0.18em] mb-2">Recent Requests</div>
          <div className="space-y-2">
            {summary.apiMetrics.length === 0 ? (
              <div className="text-slate-500">No recent requests recorded yet.</div>
            ) : (
              summary.apiMetrics.map((metric) => (
                <div key={`${metric.endpoint}-${metric.durationMs}`} className="flex items-center justify-between gap-3">
                  <span className="truncate text-slate-300">{metric.endpoint}</span>
                  <span className="font-semibold text-slate-100">{metric.durationMs}ms</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl bg-slate-900/80 p-3 border border-slate-700 text-[11px] text-slate-400">
        Press <span className="text-white font-semibold">Ctrl+Shift+P</span> or <span className="text-white font-semibold">⌘+Shift+P</span> to toggle.
      </div>
    </div>
  );
}
