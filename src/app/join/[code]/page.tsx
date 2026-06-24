'use client';

import React, { use, useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import AnimatedSkyBackground from '@/components/AnimatedSkyBackground';
import Image from 'next/image';

const SignUpForms = dynamic(() => import('@/components/SignUpForms'), {
  loading: () => <div className="text-center py-8 text-xs text-slate-400 animate-pulse">Loading registration forms...</div>,
  ssr: false,
});

interface InviteDetails {
  inviteCode: string;
  inviteLink: string;
  organizationId: { _id: string; name: string; code?: string };
  departmentId: { _id: string; name: string };
  managerId: { _id: string; firstName: string; lastName: string; designation?: string };
  hotelId?: { _id: string; name: string; hotelCode?: string };
  inviteType?: 'employee' | 'manager';
}

export default function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);

  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const fetchInvite = async () => {
      try {
        const res = await api.get(`/hierarchy/invite/${code}`);
        setInvite(res.data.invite);
      } catch (err: any) {
        setErrorMsg(err.message || 'The invitation link is invalid, disabled, or expired.');
      } finally {
        setLoading(false);
      }
    };
    if (code) {
      fetchInvite();
    }
  }, [code]);

  if (loading) {
    return (
      <AnimatedSkyBackground>
        <div className="flex flex-col items-center justify-center min-h-screen text-gold">
          <Loader2 className="w-10 h-10 animate-spin mb-4" />
          <h2 className="text-xl font-bold uppercase tracking-widest font-heading">Validating Invite...</h2>
        </div>
      </AnimatedSkyBackground>
    );
  }

  return (
    <AnimatedSkyBackground>
      <div className="absolute w-[360px] h-[360px] rounded-full bg-[radial-gradient(circle,_rgba(212,175,55,0.05)_0%,_transparent_75%)] blur-[40px] pointer-events-none z-0" />
      
      <div className="relative w-full max-w-2xl bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-[0_0_50px_rgba(255,255,255,0.1)] z-10 my-12 mx-auto">
        <div className="flex flex-col items-center mb-8">
          <Image 
            src="/oxy-logo.jpeg" 
            alt="OxyHotels Logo" 
            width={160}
            height={40}
            className="h-12 w-auto mb-3 object-contain rounded" 
            priority
          />
          <h2 className="text-2xl font-extrabold text-white tracking-tight font-heading gold-text-glow text-center">
            {submitted ? 'Registration Successful!' : 'Complete Your Registration'}
          </h2>
          {!submitted && (
            <p className="text-[10.5px] text-slate-400 mt-1.5 uppercase tracking-widest font-bold font-sans text-center">
              You've been invited to join OXY Hotels
            </p>
          )}
        </div>

        {errorMsg ? (
          <div className="p-6 bg-red-950/40 border border-red-500/30 rounded-xl flex items-center gap-4">
            <AlertTriangle className="text-red-400 w-10 h-10 shrink-0" />
            <div>
              <h3 className="text-red-300 font-bold text-lg mb-1">Invalid Invitation</h3>
              <p className="text-red-400/80 text-sm">{errorMsg}</p>
            </div>
          </div>
        ) : submitted ? (
          <div className="p-8 bg-green-950/40 border border-green-500/30 rounded-xl text-center space-y-4">
            <CheckCircle2 className="text-green-400 w-16 h-16 mx-auto" />
            <h3 className="text-green-300 font-bold text-xl uppercase tracking-widest">Request Submitted</h3>
            <p className="text-green-400/80 text-sm">
              Your registration request has been submitted successfully. You will receive an email once your account is approved.
            </p>
          </div>
        ) : (
          invite && (
            <SignUpForms 
              inviteData={invite} 
              onRegisterSuccess={() => setSubmitted(true)}
            />
          )
        )}
      </div>
    </AnimatedSkyBackground>
  );
}
