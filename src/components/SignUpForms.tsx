'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '../lib/api';
import GoogleIcon from './GoogleIcon';
import { DEPARTMENTS } from '@/constants/departments';

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

type RegisterFormValues = z.infer<typeof registerSchema>;

interface SignUpFormsProps {
  onRegisterSuccess: () => void;
}

export default function SignUpForms({ onRegisterSuccess }: SignUpFormsProps) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [properties, setProperties] = useState<any[]>([]);
  const [signupType, setSignupType] = useState<'manager' | 'employee'>('manager');

  // Password visibility states
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Employee doc uploads states
  const [empAadhaarFile, setEmpAadhaarFile] = useState<string | null>(null);
  const [empPanFile, setEmpPanFile] = useState<string | null>(null);
  const [empBankFile, setEmpBankFile] = useState<string | null>(null);
  const [empResumeFile, setEmpResumeFile] = useState<string | null>(null);

  // Fetch properties only when SignUpForms is mounted (lazy loaded!)
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

  const [departmentsList, setDepartmentsList] = useState<string[]>(Array.from(DEPARTMENTS));

  useEffect(() => {
    const fetchDepts = async () => {
      try {
        const res = await api.get('/organization/public-departments');
        if (res?.data?.departments) {
          setDepartmentsList(res.data.departments);
        }
      } catch (err) {
        console.error('Failed to load active departments', err);
      }
    };
    fetchDepts();
  }, []);

  // Sign Up Form Hook
  const {
    register: registerSignup,
    handleSubmit: handleSubmitSignup,
    formState: { errors: signupErrors },
    reset: resetSignup,
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  // Employee Sign Up Form Hook
  const {
    register: registerEmpSignup,
    handleSubmit: handleSubmitEmpSignup,
    formState: { errors: empSignupErrorsRaw },
    reset: resetEmpSignup,
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

  const onRegisterSubmit = async (values: RegisterFormValues) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      await api.post('/auth/register', values);
      resetSignup();
      onRegisterSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onEmployeeRegisterSubmit = async (values: any) => {
    setLoading(true);
    setErrorMsg(null);
    
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
    if (empResumeFile) {
      documents.push({ name: 'Resume', fileUrl: empResumeFile, uploadedAt: new Date().toISOString() });
    }

    const payload = {
      ...values,
      role: 'EMPLOYEE', // Hardcoded for self-signing employees
      documents
    };

    try {
      await api.post('/auth/register', payload);
      resetEmpSignup();
      setEmpAadhaarFile(null);
      setEmpPanFile(null);
      setEmpBankFile(null);
      setEmpResumeFile(null);
      onRegisterSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Signup Type Sub-tabs */}
      <div className="flex bg-slate-950/40 p-1 rounded-lg border border-slate-900 mb-4 text-[10px]">
        <button
          type="button"
          onClick={() => {
            setSignupType('manager');
            setErrorMsg(null);
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
          }}
          className={`flex-1 py-1.5 text-center rounded transition-all cursor-pointer font-bold ${
            signupType === 'employee' ? 'bg-gold text-slate-dark shadow' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Employee Sign Up
        </button>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-lg text-xs text-red-300">
          {errorMsg}
        </div>
      )}

      {signupType === 'manager' ? (
        <form onSubmit={handleSubmitSignup(onRegisterSubmit)} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Full Name *</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-500">
                  <GoogleIcon name="person" size={14} />
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
                  <GoogleIcon name="phone" size={14} />
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
                <GoogleIcon name="mail" size={14} />
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
                  <GoogleIcon name="lock" size={14} />
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
                  {showRegisterPassword ? <GoogleIcon name="visibility_off" size={14} /> : <GoogleIcon name="visibility" size={14} />}
                </button>
              </div>
              {signupErrors.password && <p className="text-red-400 text-[9px] mt-0.5">{signupErrors.password.message}</p>}
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Confirm Password *</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-500">
                  <GoogleIcon name="lock" size={14} />
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
                  {showConfirmPassword ? <GoogleIcon name="visibility_off" size={14} /> : <GoogleIcon name="visibility" size={14} />}
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
                    <GoogleIcon name="corporate_fare" size={14} />
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
                      <GoogleIcon name="work" size={14} />
                    </span>
                    <select
                      className="w-full bg-slate-950/60 border border-slate-800 rounded py-1.5 pl-8 pr-3 text-white focus:outline-none focus:border-gold cursor-pointer"
                      {...registerSignup('department')}
                    >
                      <option value="" className="bg-slate-950 text-slate-400">Select Department</option>
                      {departmentsList.map((dept) => (
                        <option key={dept} value={dept} className="bg-slate-950 text-white">
                          {dept}
                        </option>
                      ))}
                    </select>
                  </div>
                  {signupErrors.department && <p className="text-red-400 text-[9px] mt-0.5">{signupErrors.department.message}</p>}
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Role *</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-500">
                      <GoogleIcon name="person" size={14} />
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
                <GoogleIcon name="progress_activity" size={14} className="animate-spin-icon" />
                Creating Account...
              </>
            ) : (
              <>
                Complete Registration
                <GoogleIcon name="arrow_forward" size={14} />
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
                  <GoogleIcon name="corporate_fare" size={14} />
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
                  {departmentsList.map((dept) => (
                    <option key={dept} value={dept} className="bg-slate-950 text-white">
                      {dept}
                    </option>
                  ))}
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
            <div>
              <label className="block text-slate-400 mb-1 text-[10px]">Resume (PDF format only, optional)</label>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => handleFileChange(e, setEmpResumeFile)}
                className="w-full text-[10px] text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-slate-800 file:text-gold hover:file:bg-slate-700 cursor-pointer"
              />
              {empResumeFile && <div className="text-green-400 text-[9px] mt-1 font-semibold">✓ Resume Loaded</div>}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 bg-gold hover:bg-gold-light text-slate-dark font-bold py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-xs uppercase"
          >
            {loading ? (
              <>
                <GoogleIcon name="progress_activity" size={14} className="animate-spin-icon" />
                Creating Account...
              </>
            ) : (
              <>
                Complete Registration
                <GoogleIcon name="arrow_forward" size={14} />
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
