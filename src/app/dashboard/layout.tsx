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
import { useCommunityStore } from '../../store/communityStore';
import ThemeToggle from '@/components/ThemeToggle';
import QRScannerModal from '@/components/QRScannerModal';
import GlobalNotificationManager from '@/components/GlobalNotificationManager';
import NotificationCenterModal from '@/components/NotificationCenterModal';
import { useActivityBadges } from '@/hooks/useActivityBadges';
import { motion, AnimatePresence } from 'framer-motion';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isHydrated, hydrate } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef<ReturnType<typeof io> | null>(null);
  const hydrationDone = useRef(false);

  // Call session states (Atomic Selectors)
  const incomingCall = useCommunityStore(state => state.incomingCall);
  const setIncomingCall = useCommunityStore(state => state.setIncomingCall);
  const joinCall = useCommunityStore(state => state.joinCall);
  const setCallUpdated = useCommunityStore(state => state.setCallUpdated);
  const setCallEnded = useCommunityStore(state => state.setCallEnded);
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);

  // Notifications states
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const [notificationTab, setNotificationTab] = useState<'all' | 'unread' | 'approval' | 'task' | 'community' | 'call'>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [showPermissionBanner, setShowPermissionBanner] = useState(false);

  // Activity Badges
  const { badges } = useActivityBadges();

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const isDismissed = localStorage.getItem('notification_prompt_dismissed');
      if (Notification.permission === 'default' && !isDismissed) {
        setShowPermissionBanner(true);
      }
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const handleServiceWorkerMessage = (event: MessageEvent) => {
        if (event.data?.type === 'NAVIGATE' && event.data?.url) {
          router.push(event.data.url);
        }
      };
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
      return () => {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      };
    }
  }, [router]);

  const handleRequestPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        if ('serviceWorker' in navigator) {
          const token = `mock_fcm_token_${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`;
          await api.post('/community/push-tokens', {
            token,
            deviceType: window.innerWidth < 768 ? 'mobile' : 'web'
          });
          localStorage.setItem('fcm_push_token', token);
        }
      }
    } catch (err) {
      console.error('Error requesting notification permission:', err);
    } finally {
      setShowPermissionBanner(false);
    }
  };

  const handleDismissPermission = () => {
    localStorage.setItem('notification_prompt_dismissed', 'true');
    setShowPermissionBanner(false);
  };

  const handleAcceptCall = async () => {
    if (ringtoneRef.current) {
      try {
        ringtoneRef.current.pause();
        ringtoneRef.current.currentTime = 0;
      } catch (e) {}
    }
    if (incomingCall) {
      await joinCall(incomingCall.callId);
      const gid = incomingCall.groupId;
      setIncomingCall(null);
      router.push(`/dashboard/community?groupId=${gid}&callId=${incomingCall.callId}`);
    }
  };

  const handleDeclineCall = () => {
    if (ringtoneRef.current) {
      try {
        ringtoneRef.current.pause();
        ringtoneRef.current.currentTime = 0;
      } catch (e) {}
    }
    setIncomingCall(null);
  };

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

    socketConn.on('incoming_call', (call: any) => {
      setIncomingCall(call);
      try {
        if (!ringtoneRef.current) {
          ringtoneRef.current = new Audio('/alerm sound.mp3');
          ringtoneRef.current.loop = true;
        }
        ringtoneRef.current.play().catch(err => console.log('[Ringtone Play Error]:', err));
      } catch (err) {
        console.error(err);
      }
    });

    socketConn.on('call_updated', (call: any) => {
      setCallUpdated(call);
    });

    socketConn.on('call_ended', (callId: string) => {
      setCallEnded(callId);
      setIncomingCall(null);
      try {
        if (ringtoneRef.current) {
          ringtoneRef.current.pause();
          ringtoneRef.current.currentTime = 0;
        }
      } catch (err) {
        console.error(err);
      }
    });

    socketConn.on('hierarchy_updated', (data: any) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('[Socket] Hierarchy Updated:', data);
      }
      window.dispatchEvent(new CustomEvent('hierarchy_updated', { detail: data }));
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
          setProfilePhoto(canvas.toDataURL('image/webp', 0.7));
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
    const savedToken = localStorage.getItem('fcm_push_token');
    if (savedToken) {
      try {
        await api.delete('/community/push-tokens', { body: JSON.stringify({ token: savedToken }) });
      } catch (err) {
        console.error('Failed to deregister push token:', err);
      }
      localStorage.removeItem('fcm_push_token');
    }
    try {
      await api.post('/auth/logout', {});
    } catch (err) {
      console.error('Logout failed:', err);
    }
    useAuthStore.getState().clearAuth();
    router.push('/login');
  };

  const menuItems = [
    { name: 'Profile', icon: 'account_circle', href: '/dashboard/profile' },
    { name: 'Dashboard', icon: 'dashboard', href: '/dashboard' },
    { name: 'Community', icon: 'forum', href: '/dashboard/community' },
    { name: 'Attendance', icon: 'fingerprint', href: '/dashboard/attendance' },
    { name: 'Employees', icon: 'group', href: '/dashboard/employees' },
    { name: 'Tasks', icon: 'fact_check', href: '/dashboard/tasks' },
    { name: 'My Tasks', icon: 'assignment', href: '/dashboard/tasks/my-tasks' },
    { name: 'Leaves', icon: 'calendar_today', href: '/dashboard/leaves' },
    { name: 'Payroll', icon: 'payments', href: '/dashboard/payroll' },
    { name: 'Task Monitoring', icon: 'monitor', href: '/dashboard/tasks/monitoring' },
    { name: 'Performance', icon: 'leaderboard', href: '/dashboard/performance' },
    { name: 'Reports', icon: 'description', href: '/dashboard/reports' },
    { name: 'LMS', icon: 'school', href: '/dashboard/lms' },
    { name: 'Policy', icon: 'gavel', href: '/dashboard/policy' },
    { name: 'Tickets', icon: 'support', href: '/dashboard/tickets' },
    { name: 'Compliance', icon: 'verified', href: '/dashboard/compliance' },
    { name: 'Hotels', icon: 'hotel', href: '/dashboard/hotels' },
    { name: 'Hierarchy', icon: 'account_tree', href: '/dashboard/hierarchy' },
    { name: 'Notifications', icon: 'notifications', href: '/dashboard/notifications' },
    { name: 'Employee Tracking', icon: 'my_location', href: '/dashboard/tracking' },
  ];

  // Scanner states
  const [scannerOpen, setScannerOpen] = useState(false);

  const visibleMenuItems = menuItems.filter(item => {
    if (user?.role === 'EMPLOYEE') {
      const employeeAllowed = ['/dashboard', '/dashboard/attendance', '/dashboard/tasks', '/dashboard/tasks/my-tasks', '/dashboard/performance', '/dashboard/lms', '/dashboard/policy', '/dashboard/tickets', '/dashboard/compliance', '/dashboard/community', '/dashboard/notifications', '/dashboard/profile'];
      return employeeAllowed.includes(item.href);
    }

    // Role feature rights control mapping
    if (user?.role !== 'ROOT_ADMIN' && user?.enabledFeatures && user.enabledFeatures.length > 0) {
      const routeFeatureMap: Record<string, string> = {
        '/dashboard/hierarchy': 'organisationSettings',
        '/dashboard/employees': 'employeeConfiguration',
        '/dashboard/payroll': 'payroll',
        '/dashboard/tracking': 'liveLocationSettings',
        '/dashboard/community': 'groupMaster',
        '/dashboard/leaves': 'approverManagement'
      };

      const requiredFeature = routeFeatureMap[item.href];
      if (requiredFeature && !user.enabledFeatures.includes(requiredFeature)) {
        return false;
      }
    }

    if (item.href === '/dashboard/tracking') {
      if (user?.role === 'ROOT_ADMIN') return true;
      if (user?.enabledFeatures && user.enabledFeatures.includes('liveLocationSettings')) return true;
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
            const badgeCount = badges[item.name] || 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                data-notification-bell={item.name === 'Notifications' ? "true" : undefined}
                onClick={(e) => {
                  if (item.name === 'Notifications') {
                    e.preventDefault();
                    setIsNotificationCenterOpen(true);
                  }
                }}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all relative ${
                  isActive
                    ? 'bg-gradient-to-r from-gold to-gold-light text-[#0a1f5c] font-bold shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <GoogleIcon name={item.icon} size={18} />
                  {item.name}
                </div>
                <AnimatePresence mode="popLayout">
                  {badgeCount > 0 && (
                    <motion.div
                      key={badgeCount}
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: [1.2, 1], opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 15 }}
                      className="bg-red-500 text-white text-[10px] font-bold h-5 min-w-[20px] px-1.5 flex items-center justify-center rounded-full shadow-md border border-white/20"
                    >
                      {badgeCount > 99 ? '99+' : badgeCount}
                    </motion.div>
                  )}
                </AnimatePresence>
              </Link>
            );
          })}
        </nav>

        <div className="pt-4 border-t border-slate-700/60 mt-4">
          <div className="px-1.5 mb-3 flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Appearance</span>
            <ThemeToggle />
          </div>
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
            const badgeCount = badges[item.name] || 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                onClick={(e) => {
                  if (item.name === 'Notifications') {
                    e.preventDefault();
                    setIsNotificationCenterOpen(true);
                  }
                  setMobileMenuOpen(false);
                }}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] tracking-wide transition-all relative ${
                  isActive
                    ? 'bg-gradient-to-r from-gold to-gold-light text-[#0a1f5c] font-bold shadow-md'
                    : 'text-slate-350 hover:text-white hover:bg-white/8'
                }`}
              >
                <div className="flex items-center gap-3">
                  <GoogleIcon name={item.icon} size={20} />
                  {item.name}
                </div>
                <AnimatePresence mode="popLayout">
                  {badgeCount > 0 && (
                    <motion.div
                      key={badgeCount}
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: [1.2, 1], opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 15 }}
                      className="bg-red-500 text-white text-[10px] font-bold h-5 min-w-[20px] px-1.5 flex items-center justify-center rounded-full shadow-md border border-white/20"
                    >
                      {badgeCount > 99 ? '99+' : badgeCount}
                    </motion.div>
                  )}
                </AnimatePresence>
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
      <div className="md:ml-64 flex-1 flex flex-col font-sans">
        {/* Notification Permission Banner */}
        {showPermissionBanner && (
          <div className="bg-[#0b1739] border-b border-gold/20 p-3 text-slate-200 text-xs flex flex-wrap items-center justify-between gap-3 animate-in slide-in-from-top-4 duration-300">
            <div className="flex items-center gap-2">
              <GoogleIcon name="notifications_active" className="text-gold animate-bounce" size={18} />
              <span>Enable push notifications to receive real-time messages and calls even when the tab is closed.</span>
            </div>
            <div className="flex gap-2">
              <button onClick={handleDismissPermission} className="text-slate-400 hover:text-slate-200 px-3 py-1 font-bold">Dismiss</button>
              <button onClick={handleRequestPermission} className="bg-gold hover:bg-gold-light text-[#0a1f5c] px-3.5 py-1 rounded-lg font-bold shadow-md gold-glow cursor-pointer">Enable Alerts</button>
            </div>
          </div>
        )}
        {/* Top Mobile Header Bar */}
        <header className="md:hidden flex items-center justify-between p-4 bg-[#0a1f5c] border-b border-[#112d8a]/30 sticky top-0 z-20">
          <button onClick={() => setMobileMenuOpen(true)} className="text-slate-300 hover:text-white p-1">
            <GoogleIcon name="menu" size={22} />
          </button>
          <div className="flex items-center gap-2 text-xs">
            <img src="/oxy-logo.jpeg" alt="OxyHotels Logo" className="h-7 w-auto object-contain rounded" />
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="relative" ref={dropdownRef}>
              <button onClick={() => setShowNotifications(!showNotifications)} className="relative text-slate-300 hover:text-white p-1" data-notification-bell="true">
                <GoogleIcon name="notifications" size={20} />
                {notifications.filter(n => !n.read).length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {notifications.filter(n => !n.read).length}
                  </span>
                )}
              </button>
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-96 bg-[#0a1631]/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden flex flex-col max-h-[80vh]">
                  <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center shrink-0">
                    <h3 className="text-xs font-bold text-white flex items-center gap-2 uppercase tracking-wider">
                      <GoogleIcon name="notifications" className="text-gold" size={16} />
                      Notification Center
                    </h3>
                    <button onClick={handleMarkAllAsRead} className="text-[10px] text-slate-400 hover:text-gold uppercase font-bold cursor-pointer transition-colors bg-slate-800 px-2 py-1 rounded">Mark All Read</button>
                  </div>
                  
                  {/* Tabs */}
                  <div className="flex overflow-x-auto scrollbar-none border-b border-slate-800 bg-slate-900/30 shrink-0 px-2 py-1 gap-1">
                    {['all', 'unread', 'approval', 'task', 'community', 'call'].map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setNotificationTab(tab as any)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-colors cursor-pointer ${
                          notificationTab === tab
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>

                  <div className="overflow-y-auto flex-1 p-2 space-y-1">
                    {notifications.filter(n => {
                      if (notificationTab === 'all') return true;
                      if (notificationTab === 'unread') return !n.read;
                      return n.type === notificationTab;
                    }).length === 0 ? (
                      <div className="p-8 text-center flex flex-col items-center gap-2">
                         <GoogleIcon name="done_all" className="text-slate-600" size={32} />
                         <span className="text-slate-500 text-xs italic font-semibold">All caught up!</span>
                      </div>
                    ) : (
                      notifications.filter(n => {
                        if (notificationTab === 'all') return true;
                        if (notificationTab === 'unread') return !n.read;
                        return n.type === notificationTab;
                      }).map((n: any) => {
                        const ni = getNotificationIcon(n.type);
                        return (
                          <div key={n._id} className={`p-3 rounded-xl border transition-colors ${!n.read ? 'bg-blue-900/20 border-blue-500/30' : 'bg-slate-900/40 border-slate-800/50 hover:bg-slate-800/80'}`}>
                            <div className="flex items-start gap-3">
                              <span className={`p-2 rounded-xl shrink-0 ${ni.color}`}>
                                <GoogleIcon name={ni.icon} size={16} />
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className={`text-[11px] font-bold truncate ${!n.read ? 'text-white' : 'text-slate-300'}`}>{n.title}</p>
                                <p className={`text-[10px] mt-1 line-clamp-2 ${!n.read ? 'text-slate-300' : 'text-slate-500'}`}>{n.message}</p>
                                <div className="flex items-center justify-between mt-2">
                                  <span className="text-[9px] text-slate-500 font-mono font-semibold">{new Date(n.createdAt).toLocaleString()}</span>
                                  {!n.read && (
                                    <button onClick={() => handleMarkAsRead(n._id)} className="text-[9px] bg-slate-800 hover:bg-slate-700 text-gold px-2 py-1 rounded uppercase font-bold cursor-pointer transition-colors">Mark Read</button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 overflow-x-hidden">
          <GlobalNotificationManager />
          <NotificationCenterModal 
            isOpen={isNotificationCenterOpen} 
            onClose={() => setIsNotificationCenterOpen(false)} 
          />
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

      {incomingCall && incomingCall.callType === 'voice' && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-4 duration-300 max-w-sm w-full bg-[#0b1739]/95 backdrop-blur-md border border-gold/30 rounded-2xl p-4 shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center text-gold shrink-0 animate-pulse">
              <GoogleIcon name="call" size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[9px] text-gold font-bold uppercase tracking-wider">Incoming Voice Call</span>
              <h4 className="text-xs font-bold text-slate-100 truncate">{incomingCall.groupName}</h4>
              <p className="text-[10px] text-slate-400 truncate">{incomingCall.callerName} is inviting you</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleDeclineCall}
                className="bg-red-650/20 hover:bg-red-600 text-red-400 hover:text-white px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
              >
                Decline
              </button>
              <button
                onClick={handleAcceptCall}
                className="bg-gold hover:bg-gold-light text-[#0a1f5c] px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all shadow-md gold-glow cursor-pointer"
              >
                Join
              </button>
            </div>
          </div>
        </div>
      )}

      {incomingCall && incomingCall.callType === 'video' && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-lg z-50 flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="relative mx-auto w-32 h-32 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-gold/10 border border-gold/20 animate-ping opacity-75" />
              <div className="absolute inset-2 rounded-full bg-gold/5 border border-gold/30 animate-pulse" />
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center text-slate-950 shadow-2xl relative">
                <GoogleIcon name="video_call" size={48} />
              </div>
            </div>
            
            <div className="space-y-2">
              <span className="text-[10px] bg-gold/10 border border-gold/30 text-gold px-3 py-1 rounded-full font-bold uppercase tracking-widest font-mono">Incoming Video Call</span>
              <h2 className="text-xl font-extrabold text-white uppercase tracking-wider pt-2">{incomingCall.groupName}</h2>
              <p className="text-xs text-slate-400">Caller: <span className="text-white font-semibold">{incomingCall.callerName}</span> is inviting you to join...</p>
            </div>

            <div className="flex gap-4 max-w-sm mx-auto pt-6">
              <button
                onClick={handleDeclineCall}
                className="flex-1 bg-red-650 hover:bg-red-500 text-white text-xs font-bold py-3 rounded-xl transition-all shadow-lg shadow-red-950/20 active:scale-95 cursor-pointer uppercase tracking-wider"
              >
                Decline Call
              </button>
              <button
                onClick={handleAcceptCall}
                className="flex-1 bg-gradient-to-r from-gold to-gold-light text-[#0a1f5c] text-xs font-extrabold py-3 rounded-xl transition-all shadow-xl gold-glow active:scale-95 cursor-pointer uppercase tracking-wider"
              >
                Accept & Join
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating QR Scanner Button */}
      <div className="fixed right-6 bottom-6 z-40">
        <button
          onClick={() => {
            setScannerOpen(true);
          }}
          className="bg-slate-900/95 hover:bg-slate-855 text-gold border border-gold/30 hover:border-gold/60 w-14 h-14 rounded-full shadow-[0_0_25px_rgba(0,0,0,0.8)] flex flex-col items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 group hover:shadow-gold/10 cursor-pointer"
          style={{ textShadow: '0 0 10px rgba(212,175,55,0.2)' }}
        >
          <div className="flex flex-col items-center justify-center">
            <GoogleIcon name="qr_code_scanner" size={22} className="animate-pulse" />
            <span className="text-[8px] font-bold uppercase tracking-widest mt-0.5 select-none">Scan</span>
          </div>
        </button>
      </div>

      {/* QR Scanner Modal */}
      <QRScannerModal isOpen={scannerOpen} onClose={() => setScannerOpen(false)} />
    </div>
  );
}