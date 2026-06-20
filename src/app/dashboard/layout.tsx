'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../lib/api';
import { formatRole } from '../../lib/utils';
import GoogleIcon from '../../components/GoogleIcon';
import Link from 'next/link';
import Footer from '@/components/Footer';
import { io } from 'socket.io-client';
import TaskNotificationPopup from '@/components/TaskNotificationPopup';
import TaskDeadlineAlert from '@/components/TaskDeadlineAlert';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isHydrated, hydrate } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef<ReturnType<typeof io> | null>(null);
  const hydrationDone = useRef(false);

  // Notifications states
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ═══ 1. FAST AUTH HYDRATION ═══
  useEffect(() => {
    if (hydrationDone.current) return;
    hydrationDone.current = true;

    const init = async () => {
      await hydrate();
    };
    init();
  }, [hydrate]);

  // ═══ 2. AUTH CHECK + REDIRECT ═══
  useEffect(() => {
    if (!isHydrated) return; // Wait for hydration

    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    setLoading(false);
  }, [isHydrated, isAuthenticated, router]);

  // ═══ 3. FETCH NOTIFICATIONS (only after authenticated) ═══
  useEffect(() => {
    if (!user || !isAuthenticated) return;

    const fetchNotifications = async () => {
      try {
        const res = await api.get('/notifications');
        if (res?.status === 'success' && res?.data?.notifications) {
          setNotifications(res.data.notifications);
        }
      } catch (err) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[Dashboard] Notifications fetch skipped:', (err as Error)?.message);
        }
      }
    };

    fetchNotifications();
  }, [user?.id, isAuthenticated]);

  // ═══ 4. SOCKET.IO CONNECTION (stable) ═══
  useEffect(() => {
    if (!user || !isAuthenticated) return;

    const socketToken = useAuthStore.getState().accessToken;
    if (!socketToken) return;

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    const socketConn = io({
      auth: { token: socketToken },
      reconnection: true,
      reconnectionAttempts: 3,
      reconnectionDelay: 2000,
      timeout: 8000,
    });

    socketRef.current = socketConn;

    socketConn.on('connect', () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('[Socket] Connected');
      }
    });

    socketConn.on('new_notification', (notification: any) => {
      setNotifications(prev => [notification, ...prev]);
      window.dispatchEvent(new CustomEvent('new_notification', { detail: notification }));
    });

    socketConn.on('disconnect', (reason) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('[Socket] Disconnected:', reason);
      }
    });

    socketConn.on('connect_error', (err) => {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[Socket] Connection error:', err.message);
      }
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [user?.id, isAuthenticated]);

  // ═══ 5. CLICK OUTSIDE LISTENER ═══
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleMarkAllAsRead = async () => {
    try {
      await api.patch('/notifications', {});
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}`, {});
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return { icon: 'event_available', color: 'text-green-400 bg-green-500/10 border-green-500/20' };
      case 'warning':
        return { icon: 'date_range', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
      case 'info':
        return { icon: 'person_add', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' };
      case 'alert':
      default:
        return { icon: 'notifications_active', color: 'text-red-400 bg-red-500/10 border-red-500/20' };
    }
  };

  // Profile modal states
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState('');
  const [profileFirstName, setProfileFirstName] = useState('');
  const [profileLastName, setProfileLastName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileDept, setProfileDept] = useState('');
  const [profileDesig, setProfileDesig] = useState('');
  const [profileEmpId, setProfileEmpId] = useState('');
  const [profileRepMgr, setProfileRepMgr] = useState('');
  const [profileEmpType, setProfileEmpType] = useState('');
  const [profileAadhaar, setProfileAadhaar] = useState('');
  const [profilePan, setProfilePan] = useState('');
  const [profileAddress, setProfileAddress] = useState('');
  const [profileBankName, setProfileBankName] = useState('');
  const [profileAccountNo, setProfileAccountNo] = useState('');
  const [profileIfsc, setProfileIfsc] = useState('');
  const [profileEmergencyName, setProfileEmergencyName] = useState('');
  const [profileEmergencyRelation, setProfileEmergencyRelation] = useState('');
  const [profileEmergencyPhone, setProfileEmergencyPhone] = useState('');
  const [profileSaveLoading, setProfileSaveLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setProfilePhoto(user.photoUrl || '');
      setProfileFirstName(user.firstName || '');
      setProfileLastName(user.lastName || '');
      setProfileEmail(user.email || '');
      setProfilePhone(user.phone || '');
      setProfileDept(user.department || '');
      setProfileDesig(user.designation || '');
      setProfileEmpId(user.employeeId || '');
      setProfileRepMgr(user.reportingManager || '');
      setProfileEmpType(user.employmentType || '');
      setProfileAadhaar(user.aadhaarNumber || '');
      setProfilePan(user.panNumber || '');
      setProfileAddress(user.personalDetails?.address || '');
      setProfileBankName(user.bankDetails?.bankName || '');
      setProfileAccountNo(user.bankDetails?.accountNo || '');
      setProfileIfsc(user.bankDetails?.ifsc || '');
      
      const ec = (user as any).emergencyContact || {};
      setProfileEmergencyName(ec.name || '');
      setProfileEmergencyRelation(ec.relation || '');
      setProfileEmergencyPhone(ec.phone || '');
    }
  }, [user, profileModalOpen]);

  const handleProfilePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
          setProfilePhoto(canvas.toDataURL('image/jpeg', 0.8));
        } else {
          setProfilePhoto(base64);
        }
      };
      img.onerror = () => { setProfilePhoto(base64); };
    };
    reader.readAsDataURL(file);
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setProfileSaveLoading(true);
    setProfileError(null);
    setProfileSuccess(null);

    const payload: any = {
      firstName: profileFirstName,
      lastName: profileLastName,
      email: profileEmail,
      phone: profilePhone,
      aadhaarNumber: profileAadhaar,
      panNumber: profilePan,
      personalDetails: { address: profileAddress },
      bankDetails: { bankName: profileBankName, accountNo: profileAccountNo, ifsc: profileIfsc },
      emergencyContact: { name: profileEmergencyName, relation: profileEmergencyRelation, phone: profileEmergencyPhone },
      photoUrl: profilePhoto,
    };

    if (user.role !== 'EMPLOYEE') {
      payload.department = profileDept;
      payload.designation = profileDesig;
      payload.employeeId = profileEmpId;
      payload.reportingManager = profileRepMgr;
      payload.employmentType = profileEmpType;
    }

    try {
      const res = await api.put(`/employees/${user.id || (user as any)._id}`, payload);
      const updatedUser = res.data.employee;
      const userStoreUpdates: any = {
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
        phone: updatedUser.phone,
        aadhaarNumber: updatedUser.aadhaarNumber,
        panNumber: updatedUser.panNumber,
      };

      if (updatedUser.photoUrl) userStoreUpdates.photoUrl = updatedUser.photoUrl;
      if (updatedUser.personalDetails?.address) userStoreUpdates.personalDetails = { address: updatedUser.personalDetails.address };
      if (updatedUser.bankDetails) userStoreUpdates.bankDetails = updatedUser.bankDetails;
      if (updatedUser.emergencyContact) userStoreUpdates.emergencyContact = updatedUser.emergencyContact;
      if (updatedUser.department) userStoreUpdates.department = updatedUser.department;
      if (updatedUser.designation) userStoreUpdates.designation = updatedUser.designation;
      if (updatedUser.employeeId) userStoreUpdates.employeeId = updatedUser.employeeId;
      if (updatedUser.reportingManager) userStoreUpdates.reportingManager = updatedUser.reportingManager;
      if (updatedUser.employmentType) userStoreUpdates.employmentType = updatedUser.employmentType;

      useAuthStore.getState().updateUser(userStoreUpdates);
      setProfileSuccess('Profile saved successfully!');
    } catch (err: any) {
      setProfileError(err.message || 'Failed to save profile');
    } finally {
      setProfileSaveLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout', {});
    } catch (err) {
      console.error('Logout failed:', err);
    }
    useAuthStore.getState().clearAuth();
    router.push('/login');
  };

  // Navigation items
  const menuItems = [
    { name: 'Dashboard', icon: 'dashboard', href: '/dashboard' },
    { name: 'Attendance', icon: 'fingerprint', href: '/dashboard/attendance' },
    { name: 'Employees', icon: 'group', href: '/dashboard/employees' },
    { name: 'Leaves', icon: 'calendar_today', href: '/dashboard/leaves' },
    { name: 'Payroll', icon: 'payments', href: '/dashboard/payroll' },
    { name: 'Tasks', icon: 'fact_check', href: '/dashboard/tasks' },
    { name: 'My Tasks', icon: 'assignment', href: '/dashboard/tasks/my-tasks' },
    { name: 'Task Monitoring', icon: 'monitor', href: '/dashboard/tasks/monitoring' },
    { name: 'Performance', icon: 'leaderboard', href: '/dashboard/performance' },
    { name: 'Reports', icon: 'description', href: '/dashboard/reports' },
    { name: 'LMS', icon: 'school', href: '/dashboard/lms' },
    { name: 'Policy', icon: 'gavel', href: '/dashboard/policy' },
    { name: 'Tickets', icon: 'support', href: '/dashboard/tickets' },
    { name: 'Compliance', icon: 'verified', href: '/dashboard/compliance' },
    { name: 'Hotels', icon: 'hotel', href: '/dashboard/hotels' },
    { name: 'Hierarchy', icon: 'account_tree', href: '/dashboard/hierarchy' },
    { name: 'Community', icon: 'forum', href: '/dashboard/community' },
    { name: 'Notifications', icon: 'notifications', href: '/dashboard/notifications' },
    { name: 'Employee Tracking', icon: 'my_location', href: '/dashboard/tracking' },
    { name: 'Profile', icon: 'account_circle', href: '/dashboard/profile' },
  ];

  const visibleMenuItems = menuItems.filter(item => {
    if (user?.role === 'EMPLOYEE') {
      const employeeAllowed = ['/dashboard', '/dashboard/attendance', '/dashboard/tasks', '/dashboard/tasks/my-tasks', '/dashboard/performance', '/dashboard/lms', '/dashboard/policy', '/dashboard/tickets', '/dashboard/compliance', '/dashboard/community', '/dashboard/notifications', '/dashboard/profile'];
      return employeeAllowed.includes(item.href);
    }
    if (item.href === '/dashboard/tracking' && user?.role !== 'ROOT_ADMIN') {
      return false;
    }
    return true;
  });

  if (loading || !isHydrated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#060e26] via-[#0a1f5c] to-[#050c21]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-gold border-t-transparent rounded-full animate-spin" />
          <p className="text-gold text-sm font-semibold animate-pulse">Initializing Security Session..</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#060e26] via-[#0a1f5c] to-[#050c21]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-gold border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-64 bg-gradient-to-b from-[#0a1f5c] to-[#06143c] border-r border-[#112d8a]/30 flex-col p-5 z-30">
        <div className="flex items-center gap-3 mb-8 pb-5 border-b border-slate-700/60">
          <img src="/oxy-logo.jpeg" alt="OxyHotels Logo" className="h-10 w-auto object-contain rounded" />
        </div>

        <nav className="flex-1 space-y-1.5 overflow-y-auto pr-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-700/30">
          {visibleMenuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-gold to-gold-light text-[#0a1f5c] font-bold shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <GoogleIcon name={item.icon} size={18} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="pt-4 border-t border-slate-700/60 mt-4">
          <div className="flex items-center gap-3 mb-3 p-1.5 rounded-lg hover:bg-white/5 cursor-pointer transition-colors" onClick={() => setProfileModalOpen(true)} title="View & Edit Profile">
            <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center border border-gold/30 text-gold font-bold text-xs overflow-hidden flex-shrink-0">
              {user?.photoUrl ? (
                <img src={user.photoUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span>{(user?.firstName?.[0] || '')}{(user?.lastName?.[0] || '')}</span>
              )}
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-xs font-semibold truncate text-slate-100">{user?.firstName} {user?.lastName}</p>
              <p className="text-[10px] text-slate-400 font-medium truncate uppercase">{formatRole(user?.role)}</p>
            </div>
          </div>
          
          <button onClick={handleLogout} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all cursor-pointer">
            <GoogleIcon name="logout" size={20} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Mobile Drawer */}
      <aside className={`fixed top-0 bottom-0 left-0 w-64 bg-gradient-to-b from-[#0a1f5c] to-[#06143c] text-white border-r border-[#112d8a]/30 p-5 z-50 md:hidden transition-transform duration-300 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex justify-between items-center mb-8 border-b border-slate-700/50 pb-4">
          <img src="/oxy-logo.jpeg" alt="OxyHotels Logo" className="h-8 w-auto object-contain rounded" />
          <button onClick={() => setMobileMenuOpen(false)} className="text-slate-300 hover:text-white p-1">
            <GoogleIcon name="close" size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-1.5 mb-6 overflow-y-auto max-h-[60vh] pr-1 scrollbar-none">
          {visibleMenuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] tracking-wide transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-gold to-gold-light text-[#0a1f5c] font-bold shadow-md'
                    : 'text-slate-350 hover:text-white hover:bg-white/8'
                }`}
              >
                <GoogleIcon name={item.icon} size={20} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="pt-4 border-t border-slate-700/60">
          <div onClick={() => { setMobileMenuOpen(false); setProfileModalOpen(true); }} className="flex items-center gap-3 mb-4 p-1.5 rounded-lg hover:bg-white/5 cursor-pointer transition-colors" title="View & Edit Profile">
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-gold/30 text-gold font-semibold text-xs overflow-hidden flex-shrink-0">
              {user?.photoUrl ? (<img src={user.photoUrl} alt="Avatar" className="w-full h-full object-cover" />) : 'U'}
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-xs font-semibold truncate text-slate-100">{user?.firstName} {user?.lastName}</p>
              <p className="text-[9px] text-slate-400 font-semibold truncate uppercase">{formatRole(user?.role)}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all cursor-pointer">
            <GoogleIcon name="logout" size={18} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Workspace Frame */}
      <div className="md:ml-64 flex-1 flex flex-col">
        {/* Top Mobile Header Bar */}
        <header className="md:hidden flex items-center justify-between p-4 bg-[#0a1f5c] border-b border-[#112d8a]/30 sticky top-0 z-20">
          <button onClick={() => setMobileMenuOpen(true)} className="text-slate-300 hover:text-white p-1">
            <GoogleIcon name="menu" size={22} />
          </button>
          <div className="flex items-center gap-2 text-xs">
            <img src="/oxy-logo.jpeg" alt="OxyHotels Logo" className="h-7 w-auto object-contain rounded" />
          </div>
          <div className="relative" ref={dropdownRef}>
            <button onClick={() => setShowNotifications(!showNotifications)} className="relative text-slate-300 hover:text-white p-1">
              <GoogleIcon name="notifications" size={20} />
              {notifications.filter(n => !n.read).length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {notifications.filter(n => !n.read).length}
                </span>
              )}
            </button>
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-200 max-h-96 overflow-y-auto">
                <div className="p-3 border-b border-slate-800 flex justify-between items-center">
                  <h3 className="text-xs font-bold text-white">Notifications</h3>
                  <button onClick={handleMarkAllAsRead} className="text-[10px] text-gold hover:text-gold-light uppercase font-bold cursor-pointer">Mark All Read</button>
                </div>
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-xs italic">All caught up!</div>
                ) : (
                  notifications.map((n: any) => {
                    const ni = getNotificationIcon(n.type);
                    return (
                      <div key={n._id} className={`p-3 border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors ${!n.read ? 'bg-gold/5' : ''}`}>
                        <div className="flex items-start gap-2.5">
                          <span className={`p-1.5 rounded-lg ${ni.color}`}>
                            <GoogleIcon name={ni.icon} size={14} />
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] text-slate-200 font-semibold truncate">{n.title}</p>
                            <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="text-[9px] text-slate-600 font-mono">{new Date(n.createdAt).toLocaleDateString()}</span>
                              {!n.read && (
                                <button onClick={() => handleMarkAsRead(n._id)} className="text-[9px] text-gold hover:text-gold-light uppercase font-bold cursor-pointer">Mark Read</button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 overflow-x-hidden">
          {children}
          <TaskNotificationPopup />
          <TaskDeadlineAlert />
        </main>

        <Footer />
      </div>

      {/* Profile Edit Modal */}
      {profileModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <GoogleIcon name="account_circle" className="text-gold" size={20} />
                Edit Profile
              </h2>
              <button onClick={() => { setProfileModalOpen(false); setProfileSuccess(null); setProfileError(null); }} className="text-slate-400 hover:text-white cursor-pointer">
                <GoogleIcon name="close" size={18} />
              </button>
            </div>

            {profileError && (<div className="p-3 bg-red-950/40 border border-red-500/30 rounded-xl text-xs text-red-300">{profileError}</div>)}
            {profileSuccess && (<div className="p-3 bg-green-950/40 border border-green-500/30 rounded-xl text-xs text-green-300 flex items-center gap-2"><GoogleIcon name="check_circle" size={16} />{profileSuccess}</div>)}

            <form onSubmit={handleProfileSubmit} className="space-y-4 text-xs">
              <div className="flex flex-col items-center gap-2">
                <div className="w-16 h-16 rounded-full bg-slate-800 border border-gold/30 flex items-center justify-center overflow-hidden">
                  {profilePhoto ? (<img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />) : (<GoogleIcon name="person" size={28} className="text-slate-400" />)}
                </div>
                <label className="text-[10px] text-gold hover:text-gold-light cursor-pointer font-semibold">Change Photo
                  <input type="file" accept="image/*" className="hidden" onChange={handleProfilePhotoChange} />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 text-[9px] uppercase tracking-wider">First Name</label>
                  <input type="text" value={profileFirstName} onChange={(e) => setProfileFirstName(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-white" />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 text-[9px] uppercase tracking-wider">Last Name</label>
                  <input type="text" value={profileLastName} onChange={(e) => setProfileLastName(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-white" />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1 text-[9px] uppercase tracking-wider">Email</label>
                <input type="email" value={profileEmail} onChange={(e) => setProfileEmail(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-white" />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1 text-[9px] uppercase tracking-wider">Phone</label>
                <input type="text" value={profilePhone} onChange={(e) => setProfilePhone(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-white" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 text-[9px] uppercase tracking-wider">Aadhaar Number</label>
                  <input type="text" value={profileAadhaar} onChange={(e) => setProfileAadhaar(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-white" />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 text-[9px] uppercase tracking-wider">PAN Number</label>
                  <input type="text" value={profilePan} onChange={(e) => setProfilePan(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-white" />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1 text-[9px] uppercase tracking-wider">Address</label>
                <textarea value={profileAddress} onChange={(e) => setProfileAddress(e.target.value)} rows={2} className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-white" />
              </div>

              <div className="grid grid-cols-2 gap-3 border-t border-slate-800 pt-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 text-[9px] uppercase tracking-wider">Bank Name</label>
                  <input type="text" value={profileBankName} onChange={(e) => setProfileBankName(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-white" />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 text-[9px] uppercase tracking-wider">Account No.</label>
                  <input type="text" value={profileAccountNo} onChange={(e) => setProfileAccountNo(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-white" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 text-[9px] uppercase tracking-wider">Emergency Contact</label>
                  <input type="text" placeholder="Name" value={profileEmergencyName} onChange={(e) => setProfileEmergencyName(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-white" />
                </div>
                <div>
                  <input type="text" placeholder="Relation" value={profileEmergencyRelation} onChange={(e) => setProfileEmergencyRelation(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-white" />
                </div>
                <div>
                  <input type="text" placeholder="Phone" value={profileEmergencyPhone} onChange={(e) => setProfileEmergencyPhone(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-white" />
                </div>
              </div>

              <button type="submit" disabled={profileSaveLoading} className="w-full bg-gold hover:bg-gold-light text-slate-dark font-bold py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer">
                {profileSaveLoading ? (<GoogleIcon name="progress_activity" size={14} className="animate-spin-icon" />) : (<GoogleIcon name="check" size={14} />)}
                Save Profile
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}