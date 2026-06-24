'use client';

import React, { use, useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import AnimatedSkyBackground from '@/components/AnimatedSkyBackground';
import Image from 'next/image';
import dynamic from 'next/dynamic';

const SignUpForms = dynamic(() => import('../../../components/SignUpForms'), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center py-8">
      <Loader2 className="w-6 h-6 animate-spin text-gold" />
    </div>
  ),
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
        setErrorMsg('Invalid or Expired Invite Code');
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
      
      <div className="relative w-full max-w-lg bg-[#0a1631]/80 backdrop-blur-xl border border-gold/20 rounded-3xl p-8 shadow-[0_0_50px_rgba(255,255,255,0.1)] z-10 my-12 mx-auto">
        <div className="flex flex-col items-center mb-6">
          <Image 
            src="/oxy-logo.jpeg" 
            alt="OxyHotels Logo" 
            width={160}
            height={40}
            className="h-12 w-auto mb-3 object-contain rounded" 
            priority
          />
          <h2 className="text-2xl font-extrabold text-white tracking-tight font-heading gold-text-glow text-center">
            {submitted ? 'Registration Successful!' : 'Join OXY-HR PRO'}
          </h2>
          {!submitted && invite && (
            <p className="text-[10.5px] text-slate-400 mt-1.5 uppercase tracking-widest font-bold font-sans text-center">
              You have been invited by {invite?.managerId?.firstName} {invite?.managerId?.lastName}
            </p>
          )}
        </div>

        {errorMsg && !submitted && (
          <div className="p-4 mb-6 bg-red-950/40 border border-red-500/30 rounded-xl flex items-center gap-3">
            <AlertTriangle className="text-red-400 w-6 h-6 shrink-0" />
            <p className="text-red-400/80 text-xs">{errorMsg}</p>
          </div>
        )}

        {submitted ? (
          <div className="p-8 bg-green-950/40 border border-green-500/30 rounded-xl text-center space-y-4">
            <CheckCircle2 className="text-green-400 w-16 h-16 mx-auto" />
            <h3 className="text-green-300 font-bold text-xl uppercase tracking-widest">Successfully Joined!</h3>
            <p className="text-green-400/80 text-sm">
              Your registration request has been submitted successfully. You can now log in using your phone number and password.
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
