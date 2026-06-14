'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../../store/authStore';
import { api } from '../../../lib/api';
import GoogleIcon from '../../../components/GoogleIcon';

export default function MobileProfilePage() {
  const router = useRouter();
  const { user, updateUser, clearAuth } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'personal' | 'corporate' | 'bank' | 'emergency'>('personal');
  
  // Profile field states
  const [photo, setPhoto] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [dept, setDept] = useState('');
  const [desig, setDesig] = useState('');
  const [empId, setEmpId] = useState('');
  const [repMgr, setRepMgr] = useState('');
  const [empType, setEmpType] = useState('');

  const [bankName, setBankName] = useState('');
  const [accountNo, setAccountNo] = useState('');
  const [ifsc, setIfsc] = useState('');

  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyRelation, setEmergencyRelation] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');

  const [saveLoading, setSaveLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setPhoto(user.photoUrl || '');
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
      setAddress(user.personalDetails?.address || '');
      setAadhaarNumber(user.aadhaarNumber || '');
      setPanNumber(user.panNumber || '');
      
      setDept(user.department || '');
      setDesig(user.designation || '');
      setEmpId(user.employeeId || '');
      setRepMgr(user.reportingManager || '');
      setEmpType(user.employmentType || '');

      setBankName(user.bankDetails?.bankName || '');
      setAccountNo(user.bankDetails?.accountNo || '');
      setIfsc(user.bankDetails?.ifsc || '');
      
      const ec = (user.emergencyContact || {}) as any;
      setEmergencyName(ec.name || '');
      setEmergencyRelation(ec.relation || '');
      setEmergencyPhone(ec.phone || '');
    }
  }, [user]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      const img = new Image();
      img.src = base64;
      img.onload = () => {
        const maxWidth = 256;
        const maxHeight = 256;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          setPhoto(canvas.toDataURL('image/jpeg', 0.8));
        } else {
          setPhoto(base64);
        }
      };
      img.onerror = () => {
        setPhoto(base64);
      };
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaveLoading(true);
    setError(null);
    setSuccess(null);

    const payload: any = {
      firstName,
      lastName,
      email,
      phone,
      aadhaarNumber,
      panNumber,
      personalDetails: {
        address,
      },
      bankDetails: {
        bankName,
        accountNo,
        ifsc,
      },
      emergencyContact: {
        name: emergencyName,
        relation: emergencyRelation,
        phone: emergencyPhone,
      },
      photoUrl: photo,
    };

    if (user.role !== 'EMPLOYEE') {
      payload.department = dept;
      payload.designation = desig;
      payload.employeeId = empId;
      payload.reportingManager = repMgr;
      payload.employmentType = empType;
    }

    try {
      const targetUserId = user.id || (user as any)._id;
      const res = await api.put(`/employees/${targetUserId}`, payload);
      const updatedUser = res.data.employee;
      
      const userStoreUpdates: any = {
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
        phone: updatedUser.phone,
        aadhaarNumber: updatedUser.aadhaarNumber,
        panNumber: updatedUser.panNumber,
        personalDetails: updatedUser.personalDetails,
        bankDetails: updatedUser.bankDetails,
        emergencyContact: updatedUser.emergencyContact,
        photoUrl: updatedUser.photoUrl,
      };

      if (user.role !== 'EMPLOYEE') {
        userStoreUpdates.department = updatedUser.department;
        userStoreUpdates.designation = updatedUser.designation;
        userStoreUpdates.employeeId = updatedUser.employeeId;
        userStoreUpdates.reportingManager = updatedUser.reportingManager;
        userStoreUpdates.employmentType = updatedUser.employmentType;
      }

      updateUser(userStoreUpdates);
      setSuccess('Profile successfully updated!');
    } catch (err: any) {
      setError(err.message || 'Failed to update profile settings.');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout', {});
    } catch (err) {
      console.error('Logout failed', err);
    } finally {
      clearAuth();
      router.push('/login');
    }
  };

  return (
    <div className="max-w-md mx-auto bg-slate-dark text-slate-100 flex flex-col space-y-6 pb-12">
      {/* Header Info */}
      <div className="flex items-center gap-4 bg-card-dark border border-slate-800/80 p-5 rounded-2xl shadow-lg">
        <div className="relative w-16 h-16 rounded-full border-2 border-gold overflow-hidden flex-shrink-0 bg-slate-800 flex items-center justify-center font-bold">
          {photo ? (
            <img src={photo} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <span className="text-xl text-gold uppercase">{firstName[0]}{lastName[0]}</span>
          )}
          <label className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
            <GoogleIcon name="photo_camera" size={18} className="text-white" />
            <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
          </label>
        </div>
        <div>
          <h2 className="text-base font-extrabold text-slate-100">{firstName} {lastName}</h2>
          <p className="text-[10px] text-slate-400 capitalize mt-0.5">{desig || 'Staff'} &bull; {dept || 'Operations'}</p>
          <span className="inline-block bg-gold/10 border border-gold/20 text-gold text-[9px] font-bold px-2 py-0.5 rounded-full mt-1.5 uppercase tracking-wider font-mono">
            {user?.role.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Tabs list */}
      <div className="flex bg-card-dark border border-slate-800/80 p-1 rounded-xl text-[10.5px] font-bold shadow-inner">
        {[
          { id: 'personal', label: 'Personal', icon: 'person' },
          { id: 'corporate', label: 'Work', icon: 'business_center' },
          { id: 'bank', label: 'Bank', icon: 'account_balance' },
          { id: 'emergency', label: 'Emergency', icon: 'contact_phone' }
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`flex-1 py-2 rounded-lg flex flex-col items-center gap-1 transition-all cursor-pointer ${
              activeTab === t.id ? 'bg-gold text-slate-dark' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <GoogleIcon name={t.icon} size={16} />
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Feedback banner */}
      {error && (
        <div className="p-3 bg-red-950/40 border border-red-500/30 text-xs text-red-300 rounded-xl flex items-center gap-2">
          <GoogleIcon name="error" size={16} />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-3 bg-green-950/40 border border-green-500/30 text-xs text-green-300 rounded-xl flex items-center gap-2">
          <GoogleIcon name="check_circle" size={16} />
          <span>{success}</span>
        </div>
      )}

      {/* Profile Form */}
      <form onSubmit={handleSave} className="bg-card-dark border border-slate-800/80 p-5 rounded-2xl shadow-lg space-y-4 text-xs text-slate-300">
        {activeTab === 'personal' && (
          <div className="space-y-4">
            <h3 className="text-[10px] font-bold text-gold uppercase tracking-wider">Personal Details</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 uppercase font-semibold">First Name</label>
                <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} required className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-gold" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 uppercase font-semibold">Last Name</label>
                <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} required className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-gold" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 uppercase font-semibold">Email Address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-gold" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 uppercase font-semibold">Phone Number</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-gold" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 uppercase font-semibold">Residential Address</label>
              <textarea value={address} onChange={e => setAddress(e.target.value)} rows={3} className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-gold" />
            </div>
          </div>
        )}

        {activeTab === 'corporate' && (
          <div className="space-y-4">
            <h3 className="text-[10px] font-bold text-gold uppercase tracking-wider">Workplace Details</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 uppercase font-semibold">Department</label>
                <input type="text" value={dept} onChange={e => setDept(e.target.value)} disabled={user?.role === 'EMPLOYEE'} className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-400 disabled:opacity-75 focus:outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 uppercase font-semibold">Designation</label>
                <input type="text" value={desig} onChange={e => setDesig(e.target.value)} disabled={user?.role === 'EMPLOYEE'} className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-400 disabled:opacity-75 focus:outline-none" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 uppercase font-semibold">Employee ID</label>
                <input type="text" value={empId} onChange={e => setEmpId(e.target.value)} disabled={user?.role === 'EMPLOYEE'} className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-400 disabled:opacity-75 focus:outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 uppercase font-semibold">Employment Type</label>
                <input type="text" value={empType} onChange={e => setEmpType(e.target.value)} disabled={user?.role === 'EMPLOYEE'} className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-400 disabled:opacity-75 focus:outline-none" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 uppercase font-semibold">Reporting Manager</label>
              <input type="text" value={repMgr} onChange={e => setRepMgr(e.target.value)} disabled={user?.role === 'EMPLOYEE'} className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-400 disabled:opacity-75 focus:outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 uppercase font-semibold">Aadhaar Number</label>
                <input type="text" value={aadhaarNumber} onChange={e => setAadhaarNumber(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-gold" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 uppercase font-semibold">PAN Number</label>
                <input type="text" value={panNumber} onChange={e => setPanNumber(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-gold" />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'bank' && (
          <div className="space-y-4">
            <h3 className="text-[10px] font-bold text-gold uppercase tracking-wider">Payroll & Bank Details</h3>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 uppercase font-semibold">Bank Name</label>
              <input type="text" value={bankName} onChange={e => setBankName(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-gold" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 uppercase font-semibold">Account Number</label>
              <input type="text" value={accountNo} onChange={e => setAccountNo(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-gold" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 uppercase font-semibold">IFSC Code</label>
              <input type="text" value={ifsc} onChange={e => setIfsc(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-gold" />
            </div>
          </div>
        )}

        {activeTab === 'emergency' && (
          <div className="space-y-4">
            <h3 className="text-[10px] font-bold text-gold uppercase tracking-wider">Emergency Contact</h3>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 uppercase font-semibold">Contact Person Name</label>
              <input type="text" value={emergencyName} onChange={e => setEmergencyName(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-gold" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 uppercase font-semibold">Relationship</label>
                <input type="text" value={emergencyRelation} onChange={e => setEmergencyRelation(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-gold" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 uppercase font-semibold">Emergency Phone</label>
                <input type="tel" value={emergencyPhone} onChange={e => setEmergencyPhone(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-gold" />
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-4 border-t border-slate-800/60">
          <button
            type="submit"
            disabled={saveLoading}
            className="flex-1 bg-gold text-slate-dark hover:bg-gold-light py-3 rounded-xl font-bold cursor-pointer text-[10.5px] tracking-wider uppercase transition-all shadow-md gold-glow disabled:opacity-50"
          >
            {saveLoading ? 'Saving Settings...' : 'Save Settings'}
          </button>
        </div>
      </form>

      {/* Logout Card */}
      <div className="bg-card-dark border border-slate-800/80 p-4 rounded-2xl shadow-lg flex justify-between items-center text-xs">
        <div>
          <h4 className="font-bold text-slate-100">End Session</h4>
          <p className="text-[9.5px] text-slate-500 mt-0.5">Disconnect completely from this device.</p>
        </div>
        <button
          onClick={handleLogout}
          className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-bold px-4 py-2 rounded-xl text-[10px] uppercase tracking-wider transition-colors cursor-pointer"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
