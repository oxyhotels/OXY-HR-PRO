'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../lib/api';
import GoogleIcon from '../../components/GoogleIcon';
import Image from 'next/image';
import dynamic from 'next/dynamic';

const SignUpForms = dynamic(() => import('../../components/SignUpForms'), {
  loading: () => <div className="text-center py-8 text-xs text-slate-400 animate-pulse">Loading registration forms...</div>,
  ssr: false,
});

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { setAuth, isAuthenticated } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);

  // Password visibility states
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  // Sign In Form Hook
  const {
    register: registerLogin,
    handleSubmit: handleSubmitLogin,
    formState: { errors: loginErrors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onLoginSubmit = async (values: LoginFormValues) => {
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const response = await api.post('/auth/login', values);
      const { accessToken, user } = response.data;
      setAuth(user, accessToken);
      router.push('/dashboard');
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-[#060e26] via-[#0a1f5c] to-[#050c21] overflow-hidden py-12 px-4 font-sans">
      {/* Background Gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] bg-brand-secondary/20 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] bg-gold/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Main Container */}
      <div className="relative w-full max-w-md bg-[#0a1631]/75 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 shadow-2xl gold-glow">
        
        {/* Branding header */}
        <div className="flex flex-col items-center mb-8">
          <Image 
            src="/oxy-logo.jpeg" 
            alt="OxyHotels Logo" 
            width={160}
            height={40}
            className="h-12 w-auto mb-3 object-contain rounded" 
            priority
          />
          <h2 className="text-xl font-bold text-white tracking-wide gold-text-glow">Welcome Back!</h2>
          <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest font-semibold">Login to your account</p>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-slate-800/80 mb-6 text-xs font-semibold">
          <button
            onClick={() => {
              setActiveTab('signin');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`flex-1 pb-3 text-center border-b-2 transition-all cursor-pointer ${
              activeTab === 'signin' ? 'border-gold text-gold font-bold' : 'border-transparent text-slate-500 hover:text-slate-350'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => {
              setActiveTab('signup');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`flex-1 pb-3 text-center border-b-2 transition-all cursor-pointer ${
              activeTab === 'signup' ? 'border-gold text-gold font-bold' : 'border-transparent text-slate-500 hover:text-slate-350'
            }`}
          >
            Sign Up
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-950/40 border border-red-500/30 rounded-xl text-xs text-red-300">
            ⚠️ {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 bg-green-950/40 border border-green-500/30 rounded-xl text-xs text-green-300">
            ✓ {successMsg}
          </div>
        )}

        {/* Sign In Form */}
        {activeTab === 'signin' && (
          <form onSubmit={handleSubmitLogin(onLoginSubmit)} className="space-y-5 text-xs">
            <div>
              <label className="block font-bold text-slate-400 uppercase tracking-wider mb-2 text-[9px]">
                Admin / Staff Email
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gold">
                  <GoogleIcon name="mail" size={16} />
                </span>
                <input
                  type="email"
                  placeholder="name@hotel.com"
                  className="w-full bg-[#050c21]/90 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-gold transition-all text-xs"
                  {...registerLogin('email')}
                />
              </div>
              {loginErrors.email && (
                <p className="text-red-400 text-[10px] mt-1">{loginErrors.email.message}</p>
              )}
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block font-bold text-slate-400 uppercase tracking-wider text-[9px]">
                  Password
                </label>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gold">
                  <GoogleIcon name="lock" size={16} />
                </span>
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="w-full bg-[#050c21]/90 border border-slate-800 rounded-xl py-3 pl-12 pr-10 text-white focus:outline-none focus:border-gold transition-all text-xs"
                  {...registerLogin('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-white cursor-pointer"
                >
                  {showLoginPassword ? <GoogleIcon name="visibility_off" size={16} /> : <GoogleIcon name="visibility" size={16} />}
                </button>
              </div>
              {loginErrors.password && (
                <p className="text-red-400 text-[10px] mt-1">{loginErrors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 bg-gradient-to-r from-gold to-gold-light text-[#0a1f5c] font-extrabold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all hover:brightness-110 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-xs uppercase tracking-wider shadow-lg active:scale-95"
            >
              {loading ? (
                <>
                  <GoogleIcon name="progress_activity" size={14} className="animate-spin-icon" />
                  Verifying...
                </>
              ) : (
                <>
                  LOGIN
                  <GoogleIcon name="arrow_forward" size={14} />
                </>
              )}
            </button>
          </form>
        )}

        {/* Dynamic Sign Up Form (Lazy Loaded!) */}
        {activeTab === 'signup' && (
          <SignUpForms
            onRegisterSuccess={() => {
              setShowApprovalModal(true);
              setActiveTab('signin');
            }}
          />
        )}

        <div className="mt-6 pt-4 border-t border-slate-800/60 text-center">
          <p className="text-xs text-slate-500">
            For staging demo, use <span className="text-slate-350 font-mono">root@oxyhr.com / rootpassword</span> or submit a signup request.
          </p>
        </div>
      </div>

      {showApprovalModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-slate-900/90 border border-gold/30 rounded-2xl p-8 text-center shadow-2xl gold-glow animate-in fade-in zoom-in-95 duration-200">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-gold/10 text-gold border border-gold/30 mb-6">
              <svg className="h-8 w-8 animate-pulse text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Registration Submitted</h3>
            <p className="text-sm text-slate-300 leading-relaxed mb-6">
              Your registration request has been successfully created.
              <span className="block mt-2 font-medium text-gold">Waiting for approval.</span>
              Please contact the administrator to activate your account.
            </p>
            <button
              type="button"
              onClick={() => {
                setShowApprovalModal(false);
                setActiveTab('signin');
              }}
              className="w-full bg-gold hover:bg-gold-light text-slate-dark font-bold py-2.5 rounded-lg transition-colors cursor-pointer uppercase text-xs"
            >
              Proceed to Sign In
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
