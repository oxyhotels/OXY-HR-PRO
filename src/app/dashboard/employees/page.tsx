'use client';

import React, { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { useAuthStore } from '../../../store/authStore';
import { formatRole } from '../../../lib/utils';
import GoogleIcon from '../../../components/GoogleIcon';
import { useForm } from 'react-hook-form';

interface EmployeeProfile {
  _id: string;
  firstName: string;
  lastName: string;
  photoUrl?: string;
  email: string;
  password?: string;
  role: string;
  department?: string;
  designation?: string;
  phone?: string;
  status: string;
  joinedDate: string;
  aadhaarNumber?: string;
  panNumber?: string;
  emergencyContact?: {
    name: string;
    relation: string;
    phone: string;
  };
  salaryDetails?: {
    baseSalary: number;
    allowances: { name: string; amount: number }[];
    deductions: { name: string; amount: number }[];
  };
  bankDetails?: {
    accountNo?: string;
    bankName?: string;
    ifsc?: string;
  };
  documents: { name: string; fileUrl: string; uploadedAt: string }[];
  shift?: string;
}

export default function EmployeesPage() {
  const { user } = useAuthStore();
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [activeEmployee, setActiveEmployee] = useState<EmployeeProfile | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<string>('');

  // States for onboarding uploaded documents (Base64 data URLs)
  const [aadhaarFile, setAadhaarFile] = useState<string | null>(null);
  const [panFile, setPanFile] = useState<string | null>(null);
  const [bankFile, setBankFile] = useState<string | null>(null);

  const { register, handleSubmit, reset } = useForm();
  const { register: registerDoc, handleSubmit: handleSubmitDoc, reset: resetDoc } = useForm();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setter(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const fetchEmployees = async () => {
    try {
      const res = await api.get('/employees');
      setEmployees(res.data.employees);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleOpenCreate = () => {
    setActiveEmployee(null);
    setAadhaarFile(null);
    setPanFile(null);
    setBankFile(null);
    reset({
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      role: 'EMPLOYEE',
      department: '',
      designation: '',
      phone: '',
      baseSalary: 2500,
      bankName: '',
      accountNo: '',
      ifsc: '',
      aadhaarNumber: '',
      panNumber: '',
      emergencyContactName: '',
      emergencyContactRelation: '',
      emergencyContactPhone: '',
      shift: 'General Shift (09:00 AM - 05:00 PM)',
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (emp: EmployeeProfile) => {
    setActiveEmployee(emp);

    const existingAadhaar = emp.documents?.find(d => d.name === 'Aadhaar Card')?.fileUrl || null;
    const existingPan = emp.documents?.find(d => d.name === 'PAN Card')?.fileUrl || null;
    const existingBank = emp.documents?.find(d => d.name === 'Bank Document')?.fileUrl || null;

    setAadhaarFile(existingAadhaar);
    setPanFile(existingPan);
    setBankFile(existingBank);

    reset({
      firstName: emp.firstName,
      lastName: emp.lastName,
      email: emp.email,
      password: user?.role === 'ROOT_ADMIN' ? (emp.password || '') : '',
      role: emp.role,
      department: emp.department || '',
      designation: emp.designation || '',
      phone: emp.phone || '',
      baseSalary: emp.salaryDetails?.baseSalary || 0,
      bankName: emp.bankDetails?.bankName || '',
      accountNo: emp.bankDetails?.accountNo || '',
      ifsc: emp.bankDetails?.ifsc || '',
      aadhaarNumber: emp.aadhaarNumber || '',
      panNumber: emp.panNumber || '',
      emergencyContactName: emp.emergencyContact?.name || '',
      emergencyContactRelation: emp.emergencyContact?.relation || '',
      emergencyContactPhone: emp.emergencyContact?.phone || '',
      shift: emp.shift || 'General Shift (09:00 AM - 05:00 PM)',
    });
    setModalOpen(true);
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate/terminate this employee?')) return;
    try {
      await api.delete(`/employees/${id}`);
      fetchEmployees();
    } catch (err: any) {
      alert(err.message || 'Deactivation failed');
    }
  };

  const handleOpenDocModal = (emp: EmployeeProfile) => {
    setActiveEmployee(emp);
    resetDoc({ name: '', fileUrl: '' });
    setDocModalOpen(true);
  };

  const onSubmitDoc = async (values: any) => {
    if (!activeEmployee) return;
    setActionLoading(true);
    try {
      await api.post(`/employees/${activeEmployee._id}/documents`, {
        name: values.name,
        fileUrl: values.fileUrl || '/uploads/mock-document.pdf',
      });
      setDocModalOpen(false);
      fetchEmployees();
    } catch (err: any) {
      alert(err.message || 'Document upload failed');
    } finally {
      setActionLoading(false);
    }
  };

  const onSubmit = async (values: any) => {
    setActionLoading(true);
    setErrorMsg(null);

    const documentsPayload = [...(activeEmployee?.documents || [])];
    if (aadhaarFile) {
      const idx = documentsPayload.findIndex(d => d.name === 'Aadhaar Card');
      const doc = { name: 'Aadhaar Card', fileUrl: aadhaarFile, uploadedAt: new Date().toISOString() };
      if (idx > -1) documentsPayload[idx] = doc;
      else documentsPayload.push(doc);
    }
    if (panFile) {
      const idx = documentsPayload.findIndex(d => d.name === 'PAN Card');
      const doc = { name: 'PAN Card', fileUrl: panFile, uploadedAt: new Date().toISOString() };
      if (idx > -1) documentsPayload[idx] = doc;
      else documentsPayload.push(doc);
    }
    if (bankFile) {
      const idx = documentsPayload.findIndex(d => d.name === 'Bank Document');
      const doc = { name: 'Bank Document', fileUrl: bankFile, uploadedAt: new Date().toISOString() };
      if (idx > -1) documentsPayload[idx] = doc;
      else documentsPayload.push(doc);
    }

    const payload = {
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email,
      ...(values.password && { password: values.password }),
      role: user?.role === 'EMPLOYEE' ? (activeEmployee?.role || 'EMPLOYEE') : values.role,
      department: user?.role === 'EMPLOYEE' ? (activeEmployee?.department || '') : values.department,
      designation: user?.role === 'EMPLOYEE' ? (activeEmployee?.designation || '') : values.designation,
      phone: values.phone,
      aadhaarNumber: values.aadhaarNumber,
      panNumber: values.panNumber,
      emergencyContact: {
        name: values.emergencyContactName,
        relation: values.emergencyContactRelation,
        phone: values.emergencyContactPhone,
      },
      salaryDetails: {
        baseSalary: user?.role === 'EMPLOYEE' ? (activeEmployee?.salaryDetails?.baseSalary || 0) : Number(values.baseSalary),
        allowances: activeEmployee?.salaryDetails?.allowances || [{ name: 'Standard Allowances', amount: 150 }],
        deductions: activeEmployee?.salaryDetails?.deductions || [{ name: 'Standard Deductions', amount: 100 }],
      },
      bankDetails: {
        bankName: values.bankName,
        accountNo: values.accountNo,
        ifsc: values.ifsc,
      },
      documents: documentsPayload,
      shift: user?.role === 'EMPLOYEE' ? (activeEmployee?.shift || 'General Shift (09:00 AM - 05:00 PM)') : values.shift,
    };

    try {
      if (activeEmployee) {
        await api.put(`/employees/${activeEmployee._id}`, payload);
      } else {
        await api.post('/employees', payload);
      }
      setModalOpen(false);
      fetchEmployees();
    } catch (err: any) {
      setErrorMsg(err.message || 'Saving profile failed');
    } finally {
      setActionLoading(false);
    }
  };

  const canManage = user?.role === 'ROOT_ADMIN' || user?.role === 'HOTEL_ADMIN' || user?.role === 'HR_MANAGER';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-white">Staff Roster</h1>
          <p className="text-slate-400 text-xs mt-1">Manage active personnel directory and designations.</p>
        </div>
        {canManage && (
          <button
            onClick={handleOpenCreate}
            className="bg-gold hover:bg-gold-light text-slate-dark font-bold px-4 py-2.5 rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <GoogleIcon name="add" size={16} />
            Onboard Employee
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[30vh]">
          <div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-card-dark border border-slate-800/80 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950/40 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                  <th className="p-4">Name & Contact</th>
                  <th className="p-4">Department</th>
                  <th className="p-4">Role / Title</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Base Salary</th>
                  <th className="p-4">Docs</th>
                  {(canManage || employees.some(emp => emp._id === user?.id)) && <th className="p-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {employees.map((emp) => (
                  <tr key={emp._id} className="hover:bg-slate-900/20 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 text-gold font-bold uppercase overflow-hidden">
                          {emp.photoUrl ? (
                            <img src={emp.photoUrl} alt="Avatar" className="w-full h-full object-cover" />
                          ) : (
                            <span>{emp.firstName[0]}{emp.lastName[0]}</span>
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-white">{emp.firstName} {emp.lastName}</div>
                          <div className="text-slate-500 mt-0.5 font-mono">{emp.email}</div>
                          {emp.phone && <div className="text-slate-500 text-[10px]">{emp.phone}</div>}
                          {user?.role === 'ROOT_ADMIN' && emp.password && (
                            <div className="text-amber-400 font-mono mt-1 text-[10px] bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-900/40 w-fit">
                              🔑 Pass: {emp.password}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5">
                        <GoogleIcon name="work" size={12} className="text-slate-400" />
                        <span>{emp.department || 'Operations'}</span>
                      </div>
                      <div className="text-slate-500 text-[10px] mt-0.5">{emp.designation || 'Staff Member'}</div>
                    </td>
                    <td className="p-4">
                      <span className="bg-slate-800 text-slate-200 border border-slate-700 px-2 py-0.5 rounded text-[9px] uppercase font-semibold">
                        {formatRole(emp.role)}
                      </span>
                      {emp.shift && (
                        <div className="text-[9px] font-mono text-gold mt-1.5 uppercase font-semibold">
                          ⏱ {emp.shift.split(' (')[0]}
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                        emp.status === 'Active' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${emp.status === 'Active' ? 'bg-green-400' : 'bg-red-400'}`} />
                        {emp.status}
                      </span>
                    </td>
                    <td className="p-4 font-bold text-slate-200">
                      ₹{emp.salaryDetails?.baseSalary?.toLocaleString() || '0'}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 font-semibold">{emp.documents?.length || 0} files</span>
                        {canManage && (
                          <button
                            onClick={() => handleOpenDocModal(emp)}
                            className="p-1 hover:bg-slate-800 text-gold hover:text-gold-light rounded transition-colors cursor-pointer"
                            title="Add Document"
                          >
                            <GoogleIcon name="note_add" size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                    {(canManage || emp._id === user?.id) && (
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => handleOpenEdit(emp)}
                          className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
                          title="Edit Profile"
                        >
                          <GoogleIcon name="edit" size={14} />
                        </button>
                        {canManage && (
                          <button
                            onClick={() => handleDeactivate(emp._id)}
                            className="p-1.5 hover:bg-red-950/40 rounded text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
                            title="Terminate Staff"
                          >
                            <GoogleIcon name="person_remove" size={14} />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}

                {employees.length === 0 && (
                  <tr>
                    <td colSpan={canManage ? 7 : 6} className="text-center p-8 text-slate-500">
                      No staff records found in this tenant directory.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card-dark border border-gold/20 rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-white">{activeEmployee ? 'Modify Employee Profile' : 'Onboard New Employee'}</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white">
                <GoogleIcon name="close" size={18} />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-950/40 border border-red-500/30 text-xs text-red-300 rounded">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider">First Name</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-slate-950/60 border border-slate-800 rounded p-2 text-white"
                    {...register('firstName')}
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider">Last Name</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-slate-950/60 border border-slate-800 rounded p-2 text-white"
                    {...register('lastName')}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider">Login ID (Email)</label>
                  <input
                    type="email"
                    required
                    className="w-full bg-slate-950/60 border border-slate-800 rounded p-2 text-white"
                    {...register('email')}
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider">Login Password</label>
                  <input
                    type={user?.role === 'ROOT_ADMIN' ? 'text' : 'password'}
                    placeholder={activeEmployee ? (user?.role === 'ROOT_ADMIN' ? 'Password' : 'Leave empty to keep current') : '••••••••'}
                    required={!activeEmployee}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded p-2 text-white"
                    {...register('password')}
                  />
                </div>
              </div>
              <p className="text-[10px] text-slate-500 italic mt-1">
                Note: Share this Email and Password with the employee so they can log in to their employee dashboard.
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider">Department</label>
                  <input
                    type="text"
                    placeholder="e.g. Front Office, F&B"
                    disabled={user?.role === 'EMPLOYEE'}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded p-2 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    {...register('department')}
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider">Designation</label>
                  <input
                    type="text"
                    placeholder="e.g. Receptionist"
                    disabled={user?.role === 'EMPLOYEE'}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded p-2 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    {...register('designation')}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider">User Role</label>
                  <select
                    disabled={user?.role === 'EMPLOYEE'}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded p-2 text-white disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    {...register('role')}
                  >
                    <option value="EMPLOYEE">Employee</option>
                    <option value="DEPT_MANAGER">Department Manager</option>
                    <option value="HR_MANAGER">HR Manager</option>
                    <option value="HOTEL_ADMIN">Manager</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider">Phone Number</label>
                  <input
                    type="text"
                    className="w-full bg-slate-950/60 border border-slate-800 rounded p-2 text-white"
                    {...register('phone')}
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider">Shift Schedule</label>
                <div className="flex gap-4 items-center">
                  <select
                    disabled={user?.role === 'EMPLOYEE'}
                    className="flex-1 bg-slate-950/60 border border-slate-800 rounded p-2 text-white disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    {...register('shift')}
                  >
                    <option value="Morning Shift (07:00 AM - 03:00 PM)">Morning Shift (07:00 AM - 03:00 PM)</option>
                    <option value="Afternoon Shift (03:00 PM - 11:00 PM)">Afternoon Shift (03:00 PM - 11:00 PM)</option>
                    <option value="Night Shift (11:00 PM - 07:00 AM)">Night Shift (11:00 PM - 07:00 AM)</option>
                    <option value="General Shift (09:00 AM - 05:00 PM)">General Shift (09:00 AM - 05:00 PM)</option>
                  </select>
                  <div className="bg-slate-950/40 border border-slate-800 px-3 py-2 rounded text-slate-300 font-mono text-[11px] flex items-center gap-1.5 whitespace-nowrap shadow-inner">
                    <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
                    <span>🕒 {currentTime || '--:--:--'}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-slate-800/60 pt-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider">Aadhaar Card Number</label>
                  <input
                    type="text"
                    className="w-full bg-slate-950/60 border border-slate-800 rounded p-2 text-white mb-2"
                    placeholder="12-digit Aadhaar Number"
                    {...register('aadhaarNumber')}
                  />
                  <label className="block text-[10px] text-slate-400 mb-1 uppercase">Aadhaar Card Document</label>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => handleFileChange(e, setAadhaarFile)}
                    className="w-full text-[10px] text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-slate-800 file:text-gold hover:file:bg-slate-700 cursor-pointer"
                  />
                  {aadhaarFile && <div className="text-green-400 text-[10px] mt-1 font-semibold">✓ Aadhaar Loaded</div>}
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider">PAN Card Number</label>
                  <input
                    type="text"
                    className="w-full bg-slate-950/60 border border-slate-800 rounded p-2 text-white mb-2"
                    placeholder="10-digit Alphanumeric PAN"
                    {...register('panNumber')}
                  />
                  <label className="block text-[10px] text-slate-400 mb-1 uppercase">PAN Card Document</label>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => handleFileChange(e, setPanFile)}
                    className="w-full text-[10px] text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-slate-800 file:text-gold hover:file:bg-slate-700 cursor-pointer"
                  />
                  {panFile && <div className="text-green-400 text-[10px] mt-1 font-semibold">✓ PAN Loaded</div>}
                </div>
              </div>

              <div className="space-y-2 border-t border-slate-800/60 pt-3">
                <h4 className="font-bold text-white mb-2 uppercase text-[10px] tracking-widest text-gold">Emergency Contact</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider">Contact Name</label>
                    <input
                      type="text"
                      className="w-full bg-slate-950/60 border border-slate-800 rounded p-2 text-white"
                      placeholder="Full Name"
                      {...register('emergencyContactName')}
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider">Relation</label>
                    <input
                      type="text"
                      className="w-full bg-slate-950/60 border border-slate-800 rounded p-2 text-white"
                      placeholder="e.g. Spouse, Parent"
                      {...register('emergencyContactRelation')}
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider">Phone</label>
                    <input
                      type="text"
                      className="w-full bg-slate-950/60 border border-slate-800 rounded p-2 text-white"
                      placeholder="Contact Phone"
                      {...register('emergencyContactPhone')}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-slate-800/60 pt-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider">Base Salary (USD)</label>
                  <input
                    type="number"
                    required
                    disabled={user?.role === 'EMPLOYEE'}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded p-2 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    {...register('baseSalary')}
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider">Bank Name</label>
                  <input
                    type="text"
                    className="w-full bg-slate-950/60 border border-slate-800 rounded p-2 text-white"
                    {...register('bankName')}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider">Account Number</label>
                  <input
                    type="text"
                    className="w-full bg-slate-950/60 border border-slate-800 rounded p-2 text-white"
                    {...register('accountNo')}
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider">IFSC / Routing Code</label>
                  <input
                    type="text"
                    className="w-full bg-slate-950/60 border border-slate-800 rounded p-2 text-white"
                    {...register('ifsc')}
                  />
                </div>
              </div>

              <div className="border-t border-slate-800/60 pt-3">
                <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider">Upload Cancelled Cheque / Bank Doc</label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => handleFileChange(e, setBankFile)}
                  className="w-full text-[10px] text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-slate-800 file:text-gold hover:file:bg-slate-700 cursor-pointer"
                />
                {bankFile && <div className="text-green-400 text-[10px] mt-1 font-semibold">✓ Bank Document Loaded</div>}
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full bg-gold hover:bg-gold-light text-slate-dark font-bold py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                {actionLoading ? <GoogleIcon name="progress_activity" size={14} className="animate-spin-icon" /> : <GoogleIcon name="check" size={14} />}
                Save Employee Record
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Document Modal */}
      {docModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card-dark border border-gold/20 rounded-xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-white text-sm">Upload Credentials / Doc</h3>
              <button onClick={() => setDocModalOpen(false)} className="text-slate-400 hover:text-white">
                <GoogleIcon name="close" size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitDoc(onSubmitDoc)} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider">Document Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Passport Copy, Contract"
                  className="w-full bg-slate-950/60 border border-slate-800 rounded p-2 text-white"
                  {...registerDoc('name')}
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider">Document File URL (Mock)</label>
                <input
                  type="text"
                  placeholder="/uploads/contract-01.pdf"
                  className="w-full bg-slate-950/60 border border-slate-800 rounded p-2 text-white"
                  {...registerDoc('fileUrl')}
                />
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full bg-gold hover:bg-gold-light text-slate-dark font-bold py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                {actionLoading ? <GoogleIcon name="progress_activity" size={14} className="animate-spin-icon" /> : <GoogleIcon name="check" size={14} />}
                Upload Document Metadata
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
