'use client';

import React, { use, useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { ShieldCheck, UserPlus, Info, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';

interface InviteDetails {
  inviteCode: string;
  inviteLink: string;
  organizationId: { _id: string; name: string; code?: string };
  departmentId: { _id: string; name: string };
  managerId: { _id: string; firstName: string; lastName: string; designation?: string };
}

export default function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);

  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Form Fields
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    employeeId: '',
    designation: '',
    password: '',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (formErrors[e.target.name]) {
      setFormErrors({ ...formErrors, [e.target.name]: '' });
    }
  };

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = 'Full name is required';
    if (!formData.email.trim()) {
      errors.email = 'Email address is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    if (!formData.mobile.trim()) {
      errors.mobile = 'Mobile number is required';
    } else if (!/^\d{10}$/.test(formData.mobile.trim())) {
      errors.mobile = 'Mobile number must be a valid 10-digit number';
    }
    if (!formData.employeeId.trim()) errors.employeeId = 'Employee ID is required';
    if (!formData.designation.trim()) errors.designation = 'Designation is required';
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters long';
    }
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      await api.post('/hierarchy/join', {
        inviteCode: code,
        name: formData.name,
        email: formData.email,
        mobile: formData.mobile,
        employeeId: formData.employeeId,
        designation: formData.designation,
        password: formData.password,
      });
      setSubmitted(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'Submission failed. Please check your inputs.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white">
        <Loader2 className="w-10 h-10 text-gold animate-spin mb-4" />
        <p className="text-slate-400 text-sm font-semibold tracking-wide">Resolving Invitation QR Metadata...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))] p-6 font-sans">
      <div className="w-full max-w-lg bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        {/* Decorative ambient gradients */}
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-gold/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Title */}
        <div className="text-center mb-8 relative">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gold/10 border border-gold/20 text-gold mb-3">
            <UserPlus size={24} />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">OXY-HR PRO</h1>
          <p className="text-slate-400 text-xs mt-1">Enterprise Hierarchy Joining Portal</p>
        </div>

        {errorMsg && !submitted && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex gap-3 text-red-400 text-xs">
            <AlertTriangle className="shrink-0 w-5 h-5 text-red-400" />
            <div>
              <p className="font-bold">Registration Alert</p>
              <p className="mt-0.5">{errorMsg}</p>
            </div>
          </div>
        )}

        {submitted ? (
          <div className="text-center py-6 space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 text-green-400">
              <CheckCircle2 size={36} className="animate-bounce" />
            </div>
            <h2 className="text-xl font-bold text-white">Join Request Received!</h2>
            <p className="text-slate-300 text-sm max-w-sm mx-auto leading-relaxed">
              Your profile has been submitted to your reporting manager{' '}
              <span className="text-gold font-semibold">
                {invite?.managerId.firstName} {invite?.managerId.lastName}
              </span>
              .
            </p>
            <div className="p-4 bg-slate-950/40 rounded-xl border border-slate-800/80 text-left text-xs text-slate-400">
              <div className="flex gap-2">
                <Info size={16} className="text-gold shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-200">What happens next?</p>
                  <p className="mt-1">
                    Once the manager approves your registration, your account status will transition to{' '}
                    <span className="text-green-400 font-medium">Active</span> and you can log in to view your profile, attendance logs, and dashboard.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          invite && (
            <div className="space-y-6">
              {/* Invite Meta Details */}
              <div className="p-4 bg-slate-950/50 border border-slate-800/60 rounded-xl space-y-2.5">
                <p className="text-slate-400 text-[10px] uppercase tracking-wider font-semibold">Invitation From</p>
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-white">{invite.organizationId.name}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{invite.departmentId.name} Department</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gold font-medium">
                      {invite.managerId.firstName} {invite.managerId.lastName}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{invite.managerId.designation || 'Reporting Manager'}</p>
                  </div>
                </div>
              </div>

              {/* Input Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1.5">Full Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Enter your complete legal name"
                    className="w-full bg-slate-950 text-white border border-slate-800 rounded-lg px-3.5 py-2 text-xs focus:ring-1 focus:ring-gold focus:border-gold outline-none transition-all placeholder:text-slate-600"
                  />
                  {formErrors.name && <p className="text-red-400 text-[10px] mt-1">{formErrors.name}</p>}
                </div>

                {/* Email & Mobile */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1.5">Email Address *</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="name@hotel.com"
                      className="w-full bg-slate-950 text-white border border-slate-800 rounded-lg px-3.5 py-2 text-xs focus:ring-1 focus:ring-gold focus:border-gold outline-none transition-all placeholder:text-slate-600"
                    />
                    {formErrors.email && <p className="text-red-400 text-[10px] mt-1">{formErrors.email}</p>}
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1.5">Mobile Number *</label>
                    <input
                      type="text"
                      name="mobile"
                      value={formData.mobile}
                      onChange={handleChange}
                      placeholder="10-digit number"
                      className="w-full bg-slate-950 text-white border border-slate-800 rounded-lg px-3.5 py-2 text-xs focus:ring-1 focus:ring-gold focus:border-gold outline-none transition-all placeholder:text-slate-600"
                    />
                    {formErrors.mobile && <p className="text-red-400 text-[10px] mt-1">{formErrors.mobile}</p>}
                  </div>
                </div>

                {/* Employee ID & Designation */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1.5">Employee ID *</label>
                    <input
                      type="text"
                      name="employeeId"
                      value={formData.employeeId}
                      onChange={handleChange}
                      placeholder="e.g. EMP102"
                      className="w-full bg-slate-950 text-white border border-slate-800 rounded-lg px-3.5 py-2 text-xs focus:ring-1 focus:ring-gold focus:border-gold outline-none transition-all placeholder:text-slate-600"
                    />
                    {formErrors.employeeId && <p className="text-red-400 text-[10px] mt-1">{formErrors.employeeId}</p>}
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1.5">Designation *</label>
                    <input
                      type="text"
                      name="designation"
                      value={formData.designation}
                      onChange={handleChange}
                      placeholder="e.g. GRE, Developer"
                      className="w-full bg-slate-950 text-white border border-slate-800 rounded-lg px-3.5 py-2 text-xs focus:ring-1 focus:ring-gold focus:border-gold outline-none transition-all placeholder:text-slate-600"
                    />
                    {formErrors.designation && <p className="text-red-400 text-[10px] mt-1">{formErrors.designation}</p>}
                  </div>
                </div>

                {/* Pre-filled Department */}
                <div>
                  <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1.5">Assigned Department (Autolinked)</label>
                  <input
                    type="text"
                    disabled
                    value={invite.departmentId.name}
                    className="w-full bg-slate-950/40 text-slate-400 border border-slate-800/80 rounded-lg px-3.5 py-2 text-xs cursor-not-allowed outline-none"
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1.5">Account Password *</label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Create a strong account password"
                    className="w-full bg-slate-950 text-white border border-slate-800 rounded-lg px-3.5 py-2 text-xs focus:ring-1 focus:ring-gold focus:border-gold outline-none transition-all placeholder:text-slate-600"
                  />
                  {formErrors.password && <p className="text-red-400 text-[10px] mt-1">{formErrors.password}</p>}
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-gold hover:bg-gold-light disabled:bg-gold/45 text-slate-dark font-bold text-xs py-3 rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer mt-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-slate-dark" />
                      Submitting Join Request...
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={16} />
                      Submit Join Request
                    </>
                  )}
                </button>
              </form>
            </div>
          )
        )}
      </div>
    </div>
  );
}
