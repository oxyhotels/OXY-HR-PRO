'use client';

import React, { useEffect, useState } from 'react';
import GoogleIcon from './GoogleIcon';

export default function PwaRegister() {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const swRegistered = React.useRef(false);

  useEffect(() => {
    // 1. Register service worker as early as possible
    const registerServiceWorker = () => {
      if (swRegistered.current) return;
      if ('serviceWorker' in navigator) {
        swRegistered.current = true;
        navigator.serviceWorker.register('/sw.js')
          .then((reg) => {
            console.log('[PWA] ServiceWorker registered with scope:', reg.scope);
          })
          .catch((err) => {
            console.error('[PWA] ServiceWorker registration failed:', err);
          });
      }
    };

    const onWindowLoad = () => registerServiceWorker();

    if (typeof window !== 'undefined') {
      if (document.readyState === 'complete') {
        registerServiceWorker();
      } else {
        window.addEventListener('load', onWindowLoad);
      }
    }

    // 2. Intercept beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event & { prompt?: () => Promise<void>; userChoice?: Promise<{ outcome: string }> }) => {
      e.preventDefault();
      setInstallPrompt(e);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 3. Track successful installation
    const onAppInstalled = () => {
      console.log('[PWA] App installed successfully');
      setInstallPrompt(null);
      setShowBanner(false);
      setIsInstalled(true);
    };

    window.addEventListener('appinstalled', onAppInstalled);

    // Check if running in standalone PWA mode
    if (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('load', onWindowLoad);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    
    // Show native install prompt
    installPrompt.prompt();
    
    // Wait for the user choice
    const { outcome } = await installPrompt.userChoice;
    console.log(`[PWA] User install choice outcome: ${outcome}`);
    
    // Clear prompt state
    setInstallPrompt(null);
    setShowBanner(false);
  };

  if (!showBanner || isInstalled) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 md:bottom-6 md:right-6 md:left-auto md:w-96 bg-card-dark/95 backdrop-blur-md border border-gold/30 rounded-2xl p-4 shadow-xl z-50 animate-in slide-in-from-bottom-6 duration-300">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center text-gold shrink-0">
          <GoogleIcon name="install_mobile" size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-xs font-bold text-slate-100">Install OXY Hotels App</h4>
          <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
            Add OXY-HR PRO to your home screen for quick offline access, GPS attendance tracking, and push notifications.
          </p>
          <div className="flex gap-2.5 mt-3">
            <button
              onClick={handleInstallClick}
              className="bg-gold hover:bg-gold-light text-slate-dark text-[10.5px] font-bold px-3 py-1.5 rounded-lg transition-all shadow-md gold-glow cursor-pointer"
            >
              Install App
            </button>
            <button
              onClick={() => setShowBanner(false)}
              className="text-slate-400 hover:text-slate-200 text-[10px] font-bold px-2 py-1.5 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
        <button 
          onClick={() => setShowBanner(false)}
          className="text-slate-500 hover:text-slate-300 cursor-pointer"
        >
          <GoogleIcon name="close" size={16} />
        </button>
      </div>
    </div>
  );
}
