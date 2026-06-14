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

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, setAuth, clearAuth, isAuthenticated } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Notifications states
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load notifications and start WebSocket connection
  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
      try {
        const res = await api.get('/notifications');
        if (res?.status === 'success' && res?.data?.notifications) {
          setNotifications(res.data.notifications);
        }
      } catch (err) {
        console.error('Failed to fetch notifications:', err);
      }
    };

    fetchNotifications();

    const socketToken = useAuthStore.getState().accessToken;
    if (!socketToken) return;

    const socketConn = io({
      auth: {
        token: socketToken
      }
    });

    socketConn.on('connect', () => {
      console.log('[Dashboard Layout Socket connected for notifications]');
    });

    socketConn.on('new_notification', (notification: any) => {
      console.log('[Socket Received new notification]', notification);
      setNotifications(prev => [notification, ...prev]);
    });

    return () => {
      socketConn.disconnect();
    };
  }, [user]);

  // Click outside listener for dropdown close
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
      await api.patch('/notifications');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}`);
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
      img.onerror = () => {
        setProfilePhoto(base64);
      };
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
      personalDetails: {
        address: profileAddress,
      },
      bankDetails: {
        bankName: profileBankName,
        accountNo: profileAccountNo,
        ifsc: profileIfsc,
      },
      emergencyContact: {
        name: profileEmergencyName,
        relation: profileEmergencyRelation,
        phone: profileEmergencyPhone,
      },
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

      useAuthStore.getState().updateUser(userStoreUpdates);
      setProfileSuccess('Profile updated successfully!');
      setTimeout(() => {
        setProfileModalOpen(false);
        setProfileSuccess(null);
      }, 1500);
    } catch (err: any) {
      setProfileError(err.message || 'Failed to update profile.');
    } finally {
      setProfileSaveLoading(false);
    }
  };

  // Dynamic timezone and date clock states
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [timeZoneStr, setTimeZoneStr] = useState<string>('');

  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const offsetMin = new Date().getTimezoneOffset();
      const offsetHr = -offsetMin / 60;
      const offsetSign = offsetHr >= 0 ? '+' : '';
      setTimeZoneStr(`UTC${offsetSign}${offsetHr} (${tz})`);
    } catch (e) {
      console.error(e);
      setTimeZoneStr('UTC-5 (EST)');
    }

    const updateDateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setCurrentDate(now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }));
    };

    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const checkInProgress = useRef(false);

  // Authenticate / session validation check
  useEffect(() => {
    const checkSession = async () => {
      if (checkInProgress.current) return;
      checkInProgress.current = true;
      try {
        const response = await api.get('/auth/me');
        const userData = response.data.user;
        const currentToken = useAuthStore.getState().accessToken || '';
        setAuth(userData, currentToken);
        setLoading(false);
      } catch (error) {
        console.error('Session expired or invalid', error);
        clearAuth();
        router.push('/login');
      } finally {
        checkInProgress.current = false;
      }
    };

    if (!isAuthenticated) {
      checkSession();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, router, setAuth, clearAuth]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-dark flex flex-col items-center justify-center text-slate-300">
        <div className="w-12 h-12 border-4 border-gold border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs uppercase tracking-widest text-gold animate-pulse">Initializing Security Session...</p>
      </div>
    );
  }

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout', {});
    } catch (err) {
      console.error('Logout API failed', err);
    } finally {
      clearAuth();
      router.push('/login');
    }
  };

  // Define nav links dynamically based on user role
  const menuItems = [
    { name: 'Overview', href: '/dashboard', icon: 'dashboard', roles: ['ROOT_ADMIN', 'HOTEL_ADMIN', 'HR_MANAGER', 'DEPT_MANAGER', 'EMPLOYEE'] },
    { name: 'Hotels', href: '/dashboard/hotels', icon: 'corporate_fare', roles: ['ROOT_ADMIN'] },
    { name: 'Employees', href: '/dashboard/employees', icon: 'group', roles: ['ROOT_ADMIN', 'HOTEL_ADMIN', 'HR_MANAGER', 'DEPT_MANAGER', 'EMPLOYEE'] },
    { name: 'Attendance', href: '/dashboard/attendance', icon: 'event_available', roles: ['ROOT_ADMIN', 'HOTEL_ADMIN', 'HR_MANAGER', 'DEPT_MANAGER', 'EMPLOYEE'] },
    { name: 'Tasks', href: '/dashboard/tasks', icon: 'fact_check', roles: ['ROOT_ADMIN', 'HOTEL_ADMIN', 'HR_MANAGER', 'DEPT_MANAGER', 'EMPLOYEE'] },
    { name: 'Leaves', href: '/dashboard/leaves', icon: 'description', roles: ['ROOT_ADMIN', 'HOTEL_ADMIN', 'HR_MANAGER', 'DEPT_MANAGER', 'EMPLOYEE'] },
    { name: 'Payroll & Payslips', href: '/dashboard/payroll', icon: 'payments', roles: ['ROOT_ADMIN', 'HOTEL_ADMIN', 'HR_MANAGER', 'EMPLOYEE'] },
    { name: 'Reports & Analytics', href: '/dashboard/reports', icon: 'trending_up', roles: ['ROOT_ADMIN', 'HOTEL_ADMIN', 'HR_MANAGER'] },
    { name: 'Workforce Analytics', href: '/dashboard/analytics', icon: 'query_stats', roles: ['ROOT_ADMIN', 'HOTEL_ADMIN', 'HR_MANAGER'] },
    { name: 'LMS Courses', href: '/dashboard/lms', icon: 'school', roles: ['ROOT_ADMIN', 'HOTEL_ADMIN', 'HR_MANAGER', 'DEPT_MANAGER', 'EMPLOYEE'] },
    { name: 'Operations Tickets', href: '/dashboard/tickets', icon: 'support', roles: ['ROOT_ADMIN', 'HOTEL_ADMIN', 'HR_MANAGER', 'DEPT_MANAGER', 'EMPLOYEE'] },
    { name: 'Compliance Audits', href: '/dashboard/compliance', icon: 'shield', roles: ['ROOT_ADMIN', 'HOTEL_ADMIN', 'HR_MANAGER', 'DEPT_MANAGER'] },
    { name: 'Performance Hub', href: '/dashboard/performance', icon: 'emoji_events', roles: ['ROOT_ADMIN', 'HOTEL_ADMIN', 'HR_MANAGER', 'DEPT_MANAGER', 'EMPLOYEE'] },
    { name: 'Policy Center', href: '/dashboard/policy', icon: 'description', roles: ['ROOT_ADMIN', 'HOTEL_ADMIN', 'HR_MANAGER', 'DEPT_MANAGER', 'EMPLOYEE'] },
    { name: 'Community Hub', href: '/dashboard/community', icon: 'forum', roles: ['ROOT_ADMIN', 'HOTEL_ADMIN', 'HR_MANAGER', 'DEPT_MANAGER', 'EMPLOYEE'] },
  ];

  const visibleMenuItems = menuItems.filter((item) => user && item.roles.includes(user.role));

  const getHotelLabel = () => {
    if (user?.role === 'ROOT_ADMIN') return 'GLOBAL SYSTEM';
    if (typeof user?.hotel === 'object' && user.hotel?.name) return user.hotel.name;
    return 'Hotel Chain Partner';
  };

  const isRootAdmin = user?.role === 'ROOT_ADMIN';
  console.log('[DEBUG LAYOUT] user role:', user?.role, 'isRootAdmin:', isRootAdmin);

  return (
    <div className={`min-h-screen bg-slate-dark text-slate-100 flex flex-col md:flex-row ${isRootAdmin ? 'theme-root-admin' : ''}`}>
      
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-card-dark border-r border-slate-800/80 p-5 flex-shrink-0 z-30">
        {/* Logo */}
        <div className="flex flex-col items-start gap-2 px-2 mb-8 border-b border-slate-800/40 pb-4">
          <img src="/oxy-logo.jpeg" alt="OxyHotels Logo" className="h-8 w-auto object-contain" />
          <div className="text-[9px] text-gold tracking-widest uppercase font-bold truncate max-w-[180px] mt-1">
            {getHotelLabel()}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1.5">
          {visibleMenuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] lg:text-[13.5px] whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-gold text-slate-dark font-bold shadow-md gold-glow'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
                }`}
              >
                <GoogleIcon name={item.icon} size={20} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Footer info & logout */}
        <div className="pt-4 border-t border-slate-800/60 flex flex-col gap-3">
          <div 
            onClick={() => setProfileModalOpen(true)}
            className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-slate-900/60 cursor-pointer transition-colors"
            title="View & Edit Profile"
          >
            <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center border border-gold/30 text-gold font-bold overflow-hidden">
              {user?.photoUrl ? (
                <img src={user.photoUrl} alt="Avatar" className="w-full h-full rounded-full object-cover" />
              ) : (
                <GoogleIcon name="person" size={20} />
              )}
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-xs font-semibold truncate text-slate-200">{user?.firstName} {user?.lastName}</p>
              <p className="text-[10px] text-slate-500 font-medium truncate uppercase">{formatRole(user?.role)}</p>
            </div>
          </div>
          
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-red-400 hover:text-red-300 hover:bg-red-950/20 transition-all cursor-pointer"
          >
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
      <aside
        className={`fixed top-0 bottom-0 left-0 w-64 bg-card-dark border-r border-slate-800 p-5 z-50 md:hidden transition-transform duration-300 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex justify-between items-center mb-8 border-b border-slate-800/40 pb-4">
          <img src="/oxy-logo.jpeg" alt="OxyHotels Logo" className="h-7 w-auto object-contain" />
          <button onClick={() => setMobileMenuOpen(false)} className="text-slate-400 hover:text-white">
            <GoogleIcon name="close" size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-1.5 mb-6">
          {visibleMenuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13.5px] whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-gold text-slate-dark font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
                }`}
              >
                <GoogleIcon name={item.icon} size={20} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="pt-4 border-t border-slate-800/60">
          <div 
            onClick={() => {
              setMobileMenuOpen(false);
              setProfileModalOpen(true);
            }}
            className="flex items-center gap-3 mb-4 p-1.5 rounded-lg hover:bg-slate-900/60 cursor-pointer transition-colors"
            title="View & Edit Profile"
          >
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-gold/30 text-gold font-semibold text-xs overflow-hidden flex-shrink-0">
              {user?.photoUrl ? (
                <img src={user.photoUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                'U'
              )}
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-xs font-semibold truncate text-slate-200">{user?.firstName} {user?.lastName}</p>
              <p className="text-[9px] text-slate-500 font-semibold truncate uppercase">{formatRole(user?.role)}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-red-400 hover:text-red-300 transition-all cursor-pointer"
          >
            <GoogleIcon name="logout" size={18} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Header - Mobile & Action bar */}
        <header className="flex items-center justify-between h-16 bg-card-dark border-b border-slate-800/80 px-4 md:px-8 z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="text-slate-400 hover:text-white cursor-pointer"
            >
              <GoogleIcon name="menu" size={22} />
            </button>
            {/* Mobile Brand Logo */}
            <div className="md:hidden flex items-center">
              <img src="/oxy-logo.jpeg" alt="OXY Logo" className="h-6 w-auto object-contain rounded" />
            </div>
            <div className="hidden md:flex flex-col">
              <span className="text-[10px] uppercase font-bold text-gold tracking-widest">Enterprise Platform</span>
              <h2 className="text-base font-bold text-white capitalize">{pathname.split('/').pop() || 'Overview'}</h2>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Clock Widget */}
            <div className="hidden lg:flex flex-col items-end text-xs text-slate-400 font-medium">
              <span>Shift Time Zone: {timeZoneStr || 'UTC-5 (EST)'}</span>
              <span className="text-gold font-mono mt-0.5">{currentDate} {currentTime}</span>
            </div>

            {/* Notification Bell Widget & Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => {
                  if (window.innerWidth < 768) {
                    router.push('/dashboard/notifications');
                  } else {
                    setShowNotifications(!showNotifications);
                  }
                }}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-gold transition-colors relative flex items-center justify-center cursor-pointer"
                title="Notifications"
              >
                <GoogleIcon name="notifications" size={20} />
                {notifications.some(n => !n.read) && (
                  <span className="absolute top-1 right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-gold"></span>
                  </span>
                )}
              </button>

              {/* Responsive Dropdown Glass Panel */}
              {showNotifications && (
                <div className="absolute right-0 mt-3 w-80 md:w-96 bg-card-dark/95 backdrop-blur-md border border-gold/20 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-3 duration-250 flex flex-col max-h-[480px]">
                  
                  {/* Header */}
                  <div className="p-4 border-b border-slate-800/60 flex items-center justify-between bg-slate-900/30 flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white uppercase tracking-wider">Inbox Notifications</span>
                      {notifications.filter(n => !n.read).length > 0 && (
                        <span className="text-[10px] bg-gold/15 border border-gold/30 text-gold px-2 py-0.5 rounded-full font-bold">
                          {notifications.filter(n => !n.read).length} New
                        </span>
                      )}
                    </div>
                    {notifications.some(n => !n.read) && (
                      <button
                        onClick={handleMarkAllAsRead}
                        className="text-[11px] text-gold hover:text-gold-light hover:underline font-bold transition-all cursor-pointer"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  {/* Notification items */}
                  <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40 max-h-[360px] scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
                        <GoogleIcon name="notifications_off" size={32} className="text-slate-650" />
                        <p className="text-xs font-semibold">All clean! No new notifications.</p>
                      </div>
                    ) : (
                      notifications.map((notif) => {
                        const { icon, color } = getNotificationIcon(notif.type);
                        return (
                          <div
                            key={notif._id}
                            onClick={() => handleMarkAsRead(notif._id)}
                            className={`p-3.5 flex items-start gap-3.5 hover:bg-slate-800/60 cursor-pointer transition-colors ${
                              !notif.read ? 'bg-slate-900/30 border-l-2 border-gold' : ''
                            }`}
                          >
                            {/* Icon Indicator */}
                            <div className={`w-9 h-9 rounded-xl border flex items-center justify-center flex-shrink-0 ${color}`}>
                              <GoogleIcon name={icon} size={18} />
                            </div>

                            {/* Message Body */}
                            <div className="flex-1 min-w-0 text-left">
                              <div className="flex justify-between items-start gap-1">
                                <h4 className={`text-xs font-bold truncate ${!notif.read ? 'text-white' : 'text-slate-300'}`}>
                                  {notif.title}
                                </h4>
                                <span className="text-[9px] text-slate-500 font-mono flex-shrink-0">
                                  {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                                {notif.message}
                              </p>
                              {notif.link && (
                                <Link
                                  href={notif.link}
                                  onClick={() => setShowNotifications(false)}
                                  className="inline-flex items-center gap-1 text-[10px] text-gold hover:text-gold-light font-bold mt-2 uppercase tracking-wider hover:underline"
                                >
                                  View Action &rarr;
                                </Link>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                  
                  {/* Footer */}
                  <div className="p-3 border-t border-slate-800/60 text-center bg-slate-900/20 flex-shrink-0">
                    <span className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">OXY-HR PRO Notification Feed</span>
                  </div>
                </div>
              )}
            </div>

            {/* Profile Avatar Trigger */}
            <button
              onClick={() => {
                if (window.innerWidth < 768) {
                  router.push('/dashboard/profile');
                } else {
                  setProfileModalOpen(true);
                }
              }}
              className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-gold/30 text-gold font-bold overflow-hidden cursor-pointer flex-shrink-0"
              title="My Profile"
            >
              {user?.photoUrl ? (
                <img src={user.photoUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <GoogleIcon name="person" size={16} />
              )}
            </button>

            {/* User status Indicator */}
            <div className="hidden sm:flex items-center gap-2 border-l border-slate-800 pl-3">
              <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs font-semibold text-slate-300 uppercase">Online</span>
            </div>
          </div>
        </header>

        {/* Content body with responsive scrolling */}
        <main className="flex-1 p-3 md:p-8 pb-20 md:pb-8 overflow-y-auto max-w-full flex flex-col justify-between">
          <div className="flex-1">
            {children}
          </div>
          <Footer forceRender className="mt-12" />
        </main>

        {/* Mobile Bottom Navigation */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-card-dark/95 backdrop-blur-md border-t border-slate-800/60 z-35 flex justify-around items-center px-2">
          {[
            { name: 'Home', href: '/dashboard', icon: 'home' },
            { name: 'Attendance', href: '/dashboard/attendance', icon: 'event_available' },
            { name: 'Tasks', href: '/dashboard/tasks', icon: 'fact_check' },
            { name: 'LMS', href: '/dashboard/lms', icon: 'school' },
            { name: 'Community', href: '/dashboard/community', icon: 'forum' }
          ].map((tab) => {
            const isActive = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
                  isActive ? 'text-gold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <GoogleIcon name={tab.icon} size={22} className={isActive ? 'scale-110' : ''} />
                <span className="text-[9px] font-bold mt-1 tracking-wider uppercase">{tab.name}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Profile Form Modal */}
      {profileModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-card-dark border border-gold/30 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-6 animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="flex justify-between items-start border-b border-slate-800 pb-4 flex-shrink-0">
              <div>
                <h3 className="font-extrabold text-white text-lg tracking-wide">My Profile Details</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">View and update your registration profile information and image.</p>
              </div>
              <button 
                onClick={() => setProfileModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <GoogleIcon name="close" size={20} />
              </button>
            </div>

            {/* Error / Success Feedback */}
            {profileError && (
              <div className="p-3 bg-red-950/40 border border-red-500/30 text-xs text-red-300 rounded-lg animate-pulse flex-shrink-0">
                ⚠️ {profileError}
              </div>
            )}
            {profileSuccess && (
              <div className="p-3 bg-green-950/40 border border-green-500/30 text-xs text-green-300 rounded-lg animate-fade flex-shrink-0">
                ✓ {profileSuccess}
              </div>
            )}

            {/* Form Fields */}
            <form onSubmit={handleProfileSubmit} className="space-y-6 overflow-y-auto pr-2 flex-1 text-xs text-slate-300">
              
              {/* Profile Photo Upload */}
              <div className="flex flex-col sm:flex-row items-center gap-6 bg-slate-950/35 p-4 rounded-xl border border-slate-900">
                <div className="w-20 h-20 rounded-full border-2 border-gold/30 overflow-hidden relative group bg-slate-850 flex-shrink-0">
                  {profilePhoto ? (
                    <img src={profilePhoto} alt="Profile preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-500 text-3xl font-bold uppercase">
                      {profileFirstName?.[0] || 'U'}
                    </div>
                  )}
                </div>
                <div className="space-y-2 text-center sm:text-left">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Update Profile Picture</label>
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={handleProfilePhotoChange}
                    className="text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-slate-800 file:text-gold hover:file:bg-slate-700 cursor-pointer text-xs"
                  />
                  <p className="text-[10px] text-slate-500">Supports PNG, JPG, or GIF up to 2MB. Image will convert dynamically.</p>
                </div>
              </div>

              {/* Grid sections */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Basic Details */}
                <div className="space-y-4 bg-slate-950/20 p-4 rounded-xl border border-slate-850">
                  <h4 className="text-[10px] font-bold text-gold uppercase tracking-wider mb-2 border-b border-slate-800 pb-1.5">👤 Basic Information</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-500 font-semibold mb-1">First Name</label>
                      <input 
                        required
                        type="text" 
                        value={profileFirstName} 
                        onChange={(e) => setProfileFirstName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white placeholder-slate-600 focus:border-gold focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 font-semibold mb-1">Last Name</label>
                      <input 
                        required
                        type="text" 
                        value={profileLastName} 
                        onChange={(e) => setProfileLastName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white placeholder-slate-600 focus:border-gold focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-500 font-semibold mb-1">Email ID</label>
                      <input 
                        required
                        type="email" 
                        value={profileEmail} 
                        onChange={(e) => setProfileEmail(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white placeholder-slate-600 focus:border-gold focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 font-semibold mb-1">Phone Number</label>
                      <input 
                        required
                        type="text" 
                        value={profilePhone} 
                        onChange={(e) => setProfilePhone(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white placeholder-slate-600 focus:border-gold focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Professional Info */}
                <div className="space-y-4 bg-slate-950/20 p-4 rounded-xl border border-slate-850">
                  <h4 className="text-[10px] font-bold text-gold uppercase tracking-wider mb-2 border-b border-slate-800 pb-1.5">💼 Professional Info</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-500 font-semibold mb-1">Department</label>
                      <input 
                        type="text" 
                        disabled={user?.role === 'EMPLOYEE'}
                        value={profileDept} 
                        onChange={(e) => setProfileDept(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white placeholder-slate-600 focus:border-gold focus:outline-none disabled:opacity-40"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 font-semibold mb-1">Designation</label>
                      <input 
                        type="text" 
                        disabled={user?.role === 'EMPLOYEE'}
                        value={profileDesig} 
                        onChange={(e) => setProfileDesig(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white placeholder-slate-600 focus:border-gold focus:outline-none disabled:opacity-40"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-500 font-semibold mb-1">Employee ID</label>
                      <input 
                        type="text" 
                        disabled={user?.role === 'EMPLOYEE'}
                        value={profileEmpId} 
                        onChange={(e) => setProfileEmpId(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white placeholder-slate-600 focus:border-gold focus:outline-none disabled:opacity-40"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 font-semibold mb-1">Role Type</label>
                      <input 
                        type="text" 
                        disabled
                        value={formatRole(user?.role || '')}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-400 placeholder-slate-600 focus:outline-none opacity-45 cursor-not-allowed font-semibold uppercase"
                      />
                    </div>
                  </div>
                </div>

                {/* Gov ID & Address */}
                <div className="space-y-4 bg-slate-950/20 p-4 rounded-xl border border-slate-850">
                  <h4 className="text-[10px] font-bold text-gold uppercase tracking-wider mb-2 border-b border-slate-800 pb-1.5">📝 Government ID & Address</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-500 font-semibold mb-1">Aadhaar Number</label>
                      <input 
                        type="text" 
                        value={profileAadhaar} 
                        onChange={(e) => setProfileAadhaar(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white placeholder-slate-600 focus:border-gold focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 font-semibold mb-1">PAN Card Number</label>
                      <input 
                        type="text" 
                        value={profilePan} 
                        onChange={(e) => setProfilePan(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white placeholder-slate-600 focus:border-gold focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">Residential Address</label>
                    <textarea 
                      rows={2} 
                      value={profileAddress} 
                      onChange={(e) => setProfileAddress(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white placeholder-slate-600 focus:border-gold focus:outline-none"
                    />
                  </div>
                </div>

                {/* Bank Details */}
                <div className="space-y-4 bg-slate-950/20 p-4 rounded-xl border border-slate-850">
                  <h4 className="text-[10px] font-bold text-gold uppercase tracking-wider mb-2 border-b border-slate-800 pb-1.5">🏦 Bank Accounts Details</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-500 font-semibold mb-1">Bank Name</label>
                      <input 
                        type="text" 
                        value={profileBankName} 
                        onChange={(e) => setProfileBankName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white placeholder-slate-600 focus:border-gold focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 font-semibold mb-1">IFSC Code</label>
                      <input 
                        type="text" 
                        value={profileIfsc} 
                        onChange={(e) => setProfileIfsc(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white placeholder-slate-600 focus:border-gold focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">Account Number</label>
                    <input 
                      type="text" 
                      value={profileAccountNo} 
                      onChange={(e) => setProfileAccountNo(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white placeholder-slate-600 focus:border-gold focus:outline-none"
                    />
                  </div>
                </div>

                {/* Emergency Contact */}
                <div className="space-y-4 bg-slate-950/20 p-4 rounded-xl border border-slate-850 md:col-span-2">
                  <h4 className="text-[10px] font-bold text-gold uppercase tracking-wider mb-2 border-b border-slate-800 pb-1.5">🚨 Emergency Contact Details</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-500 font-semibold mb-1">Emergency Name</label>
                      <input 
                        type="text" 
                        value={profileEmergencyName} 
                        onChange={(e) => setProfileEmergencyName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white placeholder-slate-600 focus:border-gold focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 font-semibold mb-1">Relation</label>
                      <input 
                        type="text" 
                        value={profileEmergencyRelation} 
                        onChange={(e) => setProfileEmergencyRelation(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white placeholder-slate-600 focus:border-gold focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 font-semibold mb-1">Emergency Phone</label>
                      <input 
                        type="text" 
                        value={profileEmergencyPhone} 
                        onChange={(e) => setProfileEmergencyPhone(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white placeholder-slate-600 focus:border-gold focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setProfileModalOpen(false)}
                  className="bg-slate-850 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white px-5 py-2.5 rounded-xl font-bold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={profileSaveLoading}
                  className="bg-gold hover:bg-gold/90 text-slate-dark px-6 py-2.5 rounded-xl font-extrabold shadow-md hover:scale-[1.02] transition-transform active:scale-95 disabled:opacity-40 cursor-pointer flex items-center gap-1.5"
                >
                  {profileSaveLoading ? 'Saving Info...' : 'Save Profile Details'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}
