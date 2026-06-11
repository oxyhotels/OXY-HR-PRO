'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../lib/api';
import { Lock, Mail, Hotel, ArrowRight, Loader2, Phone, User, Landmark, Eye, EyeOff, Briefcase } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const registerSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  phone: z.string().min(8, 'Mobile number must be at least 8 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Confirm password must be at least 6 characters'),
  property: z.string().min(1, 'Property selection is required'),
  department: z.string().min(1, 'Department selection is required'),
  role: z.string().min(1, 'Role selection is required'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const employeeRegisterSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  phone: z.string().min(8, 'Mobile number must be at least 8 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Confirm password must be at least 6 characters'),
  property: z.string().min(1, 'Property selection is required'),
  department: z.string().min(1, 'Department selection is required'),
  role: z.string().default('EMPLOYEE'),
  employeeId: z.string().min(1, 'Employee ID is required'),
  reportingManager: z.string().min(1, 'Reporting Manager is required'),
  employmentType: z.string().min(1, 'Employment status is required'),
  designation: z.string().min(1, 'Designation is required'),
  salary: z.string().min(1, 'Salary details are required'),
  address: z.string().min(5, 'Address details are required'),
  aadhaarNumber: z.string().min(12, 'Aadhaar number must be 12 digits').max(12, 'Aadhaar number must be 12 digits'),
  panNumber: z.string().min(10, 'PAN number must be 10 characters').max(10, 'PAN number must be 10 characters'),
  bankName: z.string().optional(),
  accountNo: z.string().optional(),
  ifsc: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactRelation: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  joiningDate: z.string().min(1, 'Joining Date is required'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

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
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Properties list for dropdown
  const [properties, setProperties] = useState<any[]>([]);

  // Registration sub-tab state
  const [signupType, setSignupType] = useState<'manager' | 'employee'>('manager');

  // Employee doc uploads states
  const [empAadhaarFile, setEmpAadhaarFile] = useState<string | null>(null);
  const [empPanFile, setEmpPanFile] = useState<string | null>(null);
  const [empBankFile, setEmpBankFile] = useState<string | null>(null);

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const res = await api.get('/hotels/public');
        setProperties(res.data.hotels || []);
      } catch (err) {
        console.error('Failed to load active properties', err);
      }
    };
    fetchProperties();
  }, []);

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

  // Sign Up Form Hook
  const {
    register: registerSignup,
    handleSubmit: handleSubmitSignup,
    formState: { errors: signupErrors },
    reset: resetSignup,
    setValue,
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  // Employee Sign Up Form Hook
  const {
    register: registerEmpSignup,
    handleSubmit: handleSubmitEmpSignup,
    formState: { errors: empSignupErrorsRaw },
    reset: resetEmpSignup,
    setValue: setEmpValue,
  } = useForm<any>({
    resolver: zodResolver(employeeRegisterSchema),
  });
  const empSignupErrors = empSignupErrorsRaw as any;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setter(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

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

  const onRegisterSubmit = async (values: RegisterFormValues) => {
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await api.post('/auth/register', values);
      setShowApprovalModal(true);
      resetSignup();
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onEmployeeRegisterSubmit = async (values: any) => {
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    
    // Construct documents payload
    const documents = [];
    if (empAadhaarFile) {
      documents.push({ name: 'Aadhaar Card', fileUrl: empAadhaarFile, uploadedAt: new Date().toISOString() });
    }
    if (empPanFile) {
      documents.push({ name: 'PAN Card', fileUrl: empPanFile, uploadedAt: new Date().toISOString() });
    }
    if (empBankFile) {
      documents.push({ name: 'Bank Document', fileUrl: empBankFile, uploadedAt: new Date().toISOString() });
    }

    const payload = {
      ...values,
      role: 'EMPLOYEE', // Hardcoded for self-signing employees
      documents
    };

    try {
      await api.post('/auth/register', payload);
      setShowApprovalModal(true);
      resetEmpSignup();
      setEmpAadhaarFile(null);
      setEmpPanFile(null);
      setEmpBankFile(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-slate-dark overflow-hidden py-12 px-4">
      {/* Background Gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] bg-amber-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] bg-gold/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Container */}
      <div className="relative w-full max-w-lg glass-panel rounded-2xl p-8 shadow-2xl gold-glow border border-gold/20">
        
        {/* Branding header */}
        <div className="flex flex-col items-center mb-6">
          <img src="/logo.png" alt="OxyHotels Logo" className="h-10 w-auto mb-2 object-contain" />
          <p className="text-[9px] text-slate-400 mt-0.5 uppercase tracking-widest">Enterprise Hospitality Suite</p>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-slate-800 mb-6 text-xs font-semibold">
          <button
            onClick={() => {
              setActiveTab('signin');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`flex-1 pb-3 text-center border-b-2 transition-all cursor-pointer ${
              activeTab === 'signin' ? 'border-gold text-white' : 'border-transparent text-slate-500 hover:text-slate-350'
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
              activeTab === 'signup' ? 'border-gold text-white' : 'border-transparent text-slate-500 hover:text-slate-350'
            }`}
          >
            Sign Up
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-950/40 border border-red-500/30 rounded-lg text-xs text-red-300">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 bg-green-950/40 border border-green-500/30 rounded-lg text-xs text-green-300">
            {successMsg}
          </div>
        )}

        {/* Sign In Form */}
        {activeTab === 'signin' && (
          <form onSubmit={handleSubmitLogin(onLoginSubmit)} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Admin / Staff Email
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <Mail size={16} />
                </span>
                <input
                  type="email"
                  placeholder="name@hotel.com"
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-lg py-2 pl-9 pr-10 text-white focus:outline-none focus:border-gold transition-colors"
                  {...registerLogin('email')}
                />
              </div>
              {loginErrors.email && (
                <p className="text-red-400 text-[10px] mt-1">{loginErrors.email.message}</p>
              )}
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block font-semibold text-slate-400 uppercase tracking-wider">
                  Password
                </label>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <Lock size={16} />
                </span>
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-lg py-2 pl-9 pr-10 text-white focus:outline-none focus:border-gold transition-colors"
                  {...registerLogin('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white cursor-pointer"
                >
                  {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {loginErrors.password && (
                <p className="text-red-400 text-[10px] mt-1">{loginErrors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 bg-gold hover:bg-gold-light text-slate-dark font-bold py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-xs uppercase"
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>
        )}

        {/* Sign Up Form */}
        {activeTab === 'signup' && (
          <div className="space-y-4">
            {/* Signup Type Sub-tabs */}
            <div className="flex bg-slate-950/40 p-1 rounded-lg border border-slate-900 mb-4 text-[10px]">
              <button
                type="button"
                onClick={() => {
                  setSignupType('manager');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className={`flex-1 py-1.5 text-center rounded transition-all cursor-pointer font-bold ${
                  signupType === 'manager' ? 'bg-gold text-slate-dark shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Manager Sign Up
              </button>
              <button
                type="button"
                onClick={() => {
                  setSignupType('employee');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className={`flex-1 py-1.5 text-center rounded transition-all cursor-pointer font-bold ${
                  signupType === 'employee' ? 'bg-gold text-slate-dark shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Employee Sign Up
              </button>
            </div>

            {signupType === 'manager' ? (
              <form onSubmit={handleSubmitSignup(onRegisterSubmit)} className="space-y-4 text-xs">
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Full Name *</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-500">
                        <User size={14} />
                      </span>
                      <input
                        type="text"
                        placeholder="John Doe"
                        className="w-full bg-slate-950/60 border border-slate-800 rounded py-1.5 pl-8 pr-3 text-white focus:outline-none focus:border-gold"
                        {...registerSignup('fullName')}
                      />
                    </div>
                    {signupErrors.fullName && <p className="text-red-400 text-[9px] mt-0.5">{signupErrors.fullName.message}</p>}
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Mobile Number *</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-500">
                        <Phone size={14} />
                      </span>
                      <input
                        type="text"
                        placeholder="9876543210"
                        className="w-full bg-slate-950/60 border border-slate-800 rounded py-1.5 pl-8 pr-3 text-white focus:outline-none focus:border-gold"
                        {...registerSignup('phone')}
                      />
                    </div>
                    {signupErrors.phone && <p className="text-red-400 text-[9px] mt-0.5">{signupErrors.phone.message}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Email *</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-500">
                      <Mail size={14} />
                    </span>
                    <input
                      type="email"
                      placeholder="john@hotel.com"
                      className="w-full bg-slate-950/60 border border-slate-800 rounded py-1.5 pl-8 pr-3 text-white focus:outline-none focus:border-gold"
                      {...registerSignup('email')}
                    />
                  </div>
                  {signupErrors.email && <p className="text-red-400 text-[9px] mt-0.5">{signupErrors.email.message}</p>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Password *</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-500">
                        <Lock size={14} />
                      </span>
                      <input
                        type={showRegisterPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        className="w-full bg-slate-950/60 border border-slate-800 rounded py-1.5 pl-8 pr-10 text-white focus:outline-none focus:border-gold"
                        {...registerSignup('password')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                        className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-500 hover:text-white cursor-pointer"
                      >
                        {showRegisterPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    {signupErrors.password && <p className="text-red-400 text-[9px] mt-0.5">{signupErrors.password.message}</p>}
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Confirm Password *</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-500">
                        <Lock size={14} />
                      </span>
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        className="w-full bg-slate-950/60 border border-slate-800 rounded py-1.5 pl-8 pr-10 text-white focus:outline-none focus:border-gold"
                        {...registerSignup('confirmPassword')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-500 hover:text-white cursor-pointer"
                      >
                        {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    {signupErrors.confirmPassword && <p className="text-red-400 text-[9px] mt-0.5">{signupErrors.confirmPassword.message}</p>}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">Property *</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-500">
                          <Hotel size={14} />
                        </span>
                        <select
                          className="w-full bg-slate-950/60 border border-slate-800 rounded py-1.5 pl-8 pr-3 text-white focus:outline-none focus:border-gold cursor-pointer"
                          {...registerSignup('property')}
                        >
                          <option value="" className="bg-slate-950 text-slate-400">Select Existing Property</option>
                          {properties.map((p) => (
                            <option key={p._id} value={p._id} className="bg-slate-950 text-white">
                              {p.name}
                            </option>
                          ))}
                          <option value="other" className="bg-slate-950 text-white">Other</option>
                        </select>
                      </div>
                      {signupErrors.property && <p className="text-red-400 text-[9px] mt-0.5">{signupErrors.property.message}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-400 font-semibold mb-1">Department *</label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-500">
                            <Briefcase size={14} />
                          </span>
                          <select
                            className="w-full bg-slate-950/60 border border-slate-800 rounded py-1.5 pl-8 pr-3 text-white focus:outline-none focus:border-gold cursor-pointer"
                            {...registerSignup('department')}
                          >
                            <option value="" className="bg-slate-950 text-slate-400">Select Department</option>
                            <option value="Front Office" className="bg-slate-950 text-white">Front Office</option>
                            <option value="Housekeeping" className="bg-slate-950 text-white">Housekeeping</option>
                            <option value="Kitchen" className="bg-slate-950 text-white">Kitchen</option>
                            <option value="F&B" className="bg-slate-950 text-white">F&B</option>
                            <option value="Human Resources" className="bg-slate-950 text-white">Human Resources</option>
                            <option value="IT Services" className="bg-slate-950 text-white">IT Services</option>
                            <option value="Finance" className="bg-slate-950 text-white">Finance</option>
                            <option value="Security" className="bg-slate-950 text-white">Security</option>
                            <option value="Maintenance" className="bg-slate-950 text-white">Maintenance</option>
                          </select>
                        </div>
                        {signupErrors.department && <p className="text-red-400 text-[9px] mt-0.5">{signupErrors.department.message}</p>}
                      </div>

                      <div>
                        <label className="block text-slate-400 font-semibold mb-1">Role *</label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-500">
                            <User size={14} />
                          </span>
                          <select
                            className="w-full bg-slate-950/60 border border-slate-800 rounded py-1.5 pl-8 pr-3 text-white focus:outline-none focus:border-gold cursor-pointer"
                            {...registerSignup('role')}
                          >
                            <option value="" className="bg-slate-950 text-slate-400">Select Role</option>
                            <option value="EMPLOYEE" className="bg-slate-950 text-white">Employee</option>
                            <option value="DEPT_MANAGER" className="bg-slate-950 text-white">Department Manager</option>
                            <option value="HR_MANAGER" className="bg-slate-950 text-white">HR Manager</option>
                            <option value="HOTEL_ADMIN" className="bg-slate-950 text-white">Manager</option>
                          </select>
                        </div>
                        {signupErrors.role && <p className="text-red-400 text-[9px] mt-0.5">{signupErrors.role.message}</p>}
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-4 bg-gold hover:bg-gold-light text-slate-dark font-bold py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-xs uppercase"
                >
                  {loading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    <>
                      Complete Registration
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleSubmitEmpSignup(onEmployeeRegisterSubmit)} className="space-y-4 text-xs max-h-[60vh] overflow-y-auto pr-2 scrollbar-thin">
                <div className="border-b border-slate-800 pb-2 mb-2">
                  <h4 className="text-[10px] font-bold text-gold uppercase tracking-widest font-sans">Employee Master</h4>
                  <p className="text-[9px] text-slate-400 mt-0.5">Please provide complete details to register employee record.</p>
                </div>

                {/* Basic & Account Info */}
                <div className="space-y-3">
                  <h5 className="font-bold text-slate-300 text-[10px] uppercase border-l-2 border-gold pl-2">Basic & Account Info</h5>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1">Employee ID *</label>
                      <input
                        type="text"
                        placeholder="EMP101"
                        className="w-full bg-slate-950/60 border border-slate-800 rounded py-1.5 px-3 text-white focus:outline-none focus:border-gold"
                        {...registerEmpSignup('employeeId')}
                      />
                      {empSignupErrors.employeeId?.message && <p className="text-red-400 text-[9px] mt-0.5">{empSignupErrors.employeeId.message}</p>}
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Name *</label>
                      <input
                        type="text"
                        placeholder="John Doe"
                        className="w-full bg-slate-950/60 border border-slate-800 rounded py-1.5 px-3 text-white focus:outline-none focus:border-gold"
                        {...registerEmpSignup('fullName')}
                      />
                      {empSignupErrors.fullName?.message && <p className="text-red-400 text-[9px] mt-0.5">{empSignupErrors.fullName.message}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1">Mobile Number *</label>
                      <input
                        type="text"
                        placeholder="9876543210"
                        className="w-full bg-slate-950/60 border border-slate-800 rounded py-1.5 px-3 text-white focus:outline-none focus:border-gold"
                        {...registerEmpSignup('phone')}
                      />
                      {empSignupErrors.phone?.message && <p className="text-red-400 text-[9px] mt-0.5">{empSignupErrors.phone.message}</p>}
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Email *</label>
                      <input
                        type="email"
                        placeholder="john@hotel.com"
                        className="w-full bg-slate-950/60 border border-slate-800 rounded py-1.5 px-3 text-white focus:outline-none focus:border-gold"
                        {...registerEmpSignup('email')}
                      />
                      {empSignupErrors.email?.message && <p className="text-red-400 text-[9px] mt-0.5">{empSignupErrors.email.message}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1">Password *</label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        className="w-full bg-slate-950/60 border border-slate-800 rounded py-1.5 px-3 text-white focus:outline-none focus:border-gold"
                        {...registerEmpSignup('password')}
                      />
                      {empSignupErrors.password?.message && <p className="text-red-400 text-[9px] mt-0.5">{empSignupErrors.password.message}</p>}
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Confirm Password *</label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        className="w-full bg-slate-950/60 border border-slate-800 rounded py-1.5 px-3 text-white focus:outline-none focus:border-gold"
                        {...registerEmpSignup('confirmPassword')}
                      />
                      {empSignupErrors.confirmPassword?.message && <p className="text-red-400 text-[9px] mt-0.5">{empSignupErrors.confirmPassword.message}</p>}
                    </div>
                  </div>
                </div>

                {/* Job & Hotel Scoping */}
                <div className="space-y-3 pt-2">
                  <h5 className="font-bold text-slate-300 text-[10px] uppercase border-l-2 border-gold pl-2">Job & Hotel Scoping</h5>
                  
                  {/* Property Section */}
                  <div>
                    <label className="block text-slate-400 mb-1">Property Selection *</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-500">
                        <Hotel size={14} />
                      </span>
                      <select
                        className="w-full bg-slate-950/60 border border-slate-800 rounded py-1.5 pl-8 pr-3 text-white focus:outline-none focus:border-gold cursor-pointer"
                        {...registerEmpSignup('property')}
                      >
                        <option value="" className="bg-slate-950 text-slate-400">Select Existing Property</option>
                        {properties.map((p) => (
                          <option key={p._id} value={p._id} className="bg-slate-950 text-white">
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    {empSignupErrors.property?.message && <p className="text-red-400 text-[9px] mt-0.5">{empSignupErrors.property.message}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1">Department *</label>
                      <select
                        className="w-full bg-slate-950/60 border border-slate-800 rounded py-1.5 px-3 text-white focus:outline-none focus:border-gold cursor-pointer"
                        {...registerEmpSignup('department')}
                      >
                        <option value="" className="bg-slate-950 text-slate-400">Select Department</option>
                        <option value="Front Office" className="bg-slate-950 text-white">Front Office</option>
                        <option value="Housekeeping" className="bg-slate-950 text-white">Housekeeping</option>
                        <option value="Kitchen" className="bg-slate-950 text-white">Kitchen</option>
                        <option value="F&B" className="bg-slate-950 text-white">F&B</option>
                        <option value="Human Resources" className="bg-slate-950 text-white">Human Resources</option>
                        <option value="IT Services" className="bg-slate-950 text-white">IT Services</option>
                        <option value="Finance" className="bg-slate-950 text-white">Finance</option>
                        <option value="Security" className="bg-slate-950 text-white">Security</option>
                        <option value="Maintenance" className="bg-slate-950 text-white">Maintenance</option>
                      </select>
                      {empSignupErrors.department?.message && <p className="text-red-400 text-[9px] mt-0.5">{empSignupErrors.department.message}</p>}
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Designation *</label>
                      <input
                        type="text"
                        placeholder="Receptionist"
                        className="w-full bg-slate-950/60 border border-slate-800 rounded py-1.5 px-3 text-white focus:outline-none focus:border-gold"
                        {...registerEmpSignup('designation')}
                      />
                      {empSignupErrors.designation?.message && <p className="text-red-400 text-[9px] mt-0.5">{empSignupErrors.designation.message}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1">Reporting Manager *</label>
                      <input
                        type="text"
                        placeholder="Manager Name"
                        className="w-full bg-slate-950/60 border border-slate-800 rounded py-1.5 px-3 text-white focus:outline-none focus:border-gold"
                        {...registerEmpSignup('reportingManager')}
                      />
                      {empSignupErrors.reportingManager?.message && <p className="text-red-400 text-[9px] mt-0.5">{empSignupErrors.reportingManager.message}</p>}
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Employment Status *</label>
                      <select
                        className="w-full bg-slate-950/60 border border-slate-800 rounded py-1.5 px-3 text-white focus:outline-none focus:border-gold cursor-pointer"
                        {...registerEmpSignup('employmentType')}
                      >
                        <option value="" className="bg-slate-950 text-slate-400">Select Status</option>
                        <option value="Full-time" className="bg-slate-950 text-white">Full-time</option>
                        <option value="Part-time" className="bg-slate-950 text-white">Part-time</option>
                        <option value="Intern" className="bg-slate-950 text-white">Intern</option>
                        <option value="Contract" className="bg-slate-950 text-white">Contract</option>
                      </select>
                      {empSignupErrors.employmentType?.message && <p className="text-red-400 text-[9px] mt-0.5">{empSignupErrors.employmentType.message}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1">Joining Date *</label>
                      <input
                        type="date"
                        className="w-full bg-slate-950/60 border border-slate-800 rounded py-1.5 px-3 text-white focus:outline-none focus:border-gold"
                        {...registerEmpSignup('joiningDate')}
                      />
                      {empSignupErrors.joiningDate?.message && <p className="text-red-400 text-[9px] mt-0.5">{empSignupErrors.joiningDate.message}</p>}
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Salary Structure *</label>
                      <input
                        type="number"
                        placeholder="25000"
                        className="w-full bg-slate-950/60 border border-slate-800 rounded py-1.5 px-3 text-white focus:outline-none focus:border-gold"
                        {...registerEmpSignup('salary')}
                      />
                      {empSignupErrors.salary?.message && <p className="text-red-400 text-[9px] mt-0.5">{empSignupErrors.salary.message}</p>}
                    </div>
                  </div>
                </div>

                {/* Personal & Verification Details */}
                <div className="space-y-3 pt-2">
                  <h5 className="font-bold text-slate-300 text-[10px] uppercase border-l-2 border-gold pl-2">Address & Verification</h5>
                  <div>
                    <label className="block text-slate-400 mb-1">Address *</label>
                    <textarea
                      rows={2}
                      placeholder="Street, City, State, ZIP, Country"
                      className="w-full bg-slate-950/60 border border-slate-800 rounded py-1.5 px-3 text-white focus:outline-none focus:border-gold"
                      {...registerEmpSignup('address')}
                    />
                    {empSignupErrors.address?.message && <p className="text-red-400 text-[9px] mt-0.5">{empSignupErrors.address.message}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1">Aadhaar Card *</label>
                      <input
                        type="text"
                        placeholder="12-digit number"
                        className="w-full bg-slate-950/60 border border-slate-800 rounded py-1.5 px-3 text-white focus:outline-none focus:border-gold"
                        {...registerEmpSignup('aadhaarNumber')}
                      />
                      {empSignupErrors.aadhaarNumber?.message && <p className="text-red-400 text-[9px] mt-0.5">{empSignupErrors.aadhaarNumber.message}</p>}
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">PAN Card *</label>
                      <input
                        type="text"
                        placeholder="10-digit PAN"
                        className="w-full bg-slate-950/60 border border-slate-800 rounded py-1.5 px-3 text-white focus:outline-none focus:border-gold"
                        {...registerEmpSignup('panNumber')}
                      />
                      {empSignupErrors.panNumber?.message && <p className="text-red-400 text-[9px] mt-0.5">{empSignupErrors.panNumber.message}</p>}
                    </div>
                  </div>
                </div>

                {/* Bank Details */}
                <div className="space-y-3 pt-2">
                  <h5 className="font-bold text-slate-300 text-[10px] uppercase border-l-2 border-gold pl-2">Bank Details</h5>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-slate-400 mb-1">Bank Name</label>
                      <input
                        type="text"
                        placeholder="SBI"
                        className="w-full bg-slate-950/60 border border-slate-800 rounded py-1.5 px-3 text-white focus:outline-none focus:border-gold"
                        {...registerEmpSignup('bankName')}
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Account No</label>
                      <input
                        type="text"
                        placeholder="A/C Number"
                        className="w-full bg-slate-950/60 border border-slate-800 rounded py-1.5 px-3 text-white focus:outline-none focus:border-gold"
                        {...registerEmpSignup('accountNo')}
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">IFSC Code</label>
                      <input
                        type="text"
                        placeholder="IFSC Code"
                        className="w-full bg-slate-950/60 border border-slate-800 rounded py-1.5 px-3 text-white focus:outline-none focus:border-gold"
                        {...registerEmpSignup('ifsc')}
                      />
                    </div>
                  </div>
                </div>

                {/* Emergency Contact */}
                <div className="space-y-3 pt-2">
                  <h5 className="font-bold text-slate-300 text-[10px] uppercase border-l-2 border-gold pl-2">Emergency Contact</h5>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-slate-400 mb-1">Emergency Contact</label>
                      <input
                        type="text"
                        placeholder="Contact Name"
                        className="w-full bg-slate-950/60 border border-slate-800 rounded py-1.5 px-2 text-white focus:outline-none focus:border-gold"
                        {...registerEmpSignup('emergencyContactName')}
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Relation</label>
                      <input
                        type="text"
                        placeholder="Relation"
                        className="w-full bg-slate-950/60 border border-slate-800 rounded py-1.5 px-2 text-white focus:outline-none focus:border-gold"
                        {...registerEmpSignup('emergencyContactRelation')}
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Phone</label>
                      <input
                        type="text"
                        placeholder="Phone"
                        className="w-full bg-slate-950/60 border border-slate-800 rounded py-1.5 px-2 text-white focus:outline-none focus:border-gold"
                        {...registerEmpSignup('emergencyContactPhone')}
                      />
                    </div>
                  </div>
                </div>

                {/* Documents Repository */}
                <div className="space-y-3 pt-2">
                  <h5 className="font-bold text-slate-300 text-[10px] uppercase border-l-2 border-gold pl-2">Documents Repository</h5>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1 text-[10px]">Aadhaar Card Document</label>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={(e) => handleFileChange(e, setEmpAadhaarFile)}
                        className="w-full text-[10px] text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-slate-800 file:text-gold hover:file:bg-slate-700 cursor-pointer"
                      />
                      {empAadhaarFile && <div className="text-green-400 text-[9px] mt-1 font-semibold">✓ Aadhaar Loaded</div>}
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1 text-[10px]">PAN Card Document</label>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={(e) => handleFileChange(e, setEmpPanFile)}
                        className="w-full text-[10px] text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-slate-800 file:text-gold hover:file:bg-slate-700 cursor-pointer"
                      />
                      {empPanFile && <div className="text-green-400 text-[9px] mt-1 font-semibold">✓ PAN Loaded</div>}
                    </div>
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1 text-[10px]">Cancelled Cheque / Bank Doc</label>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => handleFileChange(e, setEmpBankFile)}
                      className="w-full text-[10px] text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-slate-800 file:text-gold hover:file:bg-slate-700 cursor-pointer"
                    />
                    {empBankFile && <div className="text-green-400 text-[9px] mt-1 font-semibold">✓ Document Loaded</div>}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-4 bg-gold hover:bg-gold-light text-slate-dark font-bold py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-xs uppercase"
                >
                  {loading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    <>
                      Complete Registration
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
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
