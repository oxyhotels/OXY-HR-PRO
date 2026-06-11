'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../lib/api';
import { formatRole } from '../../lib/utils';
import {
  LayoutDashboard,
  Hotel,
  Users,
  CalendarCheck,
  CheckSquare,
  FileText,
  DollarSign,
  TrendingUp,
  LogOut,
  Menu,
  X,
  Bell,
  User,
  GraduationCap,
  LifeBuoy,
  Shield,
  Trophy
} from 'lucide-react';
import Link from 'next/link';
import Footer from '@/components/Footer';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, setAuth, clearAuth, isAuthenticated } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);

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

  // Authenticate / session validation check
  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await api.get('/auth/me');
        const userData = response.data.user;
        const currentToken = useAuthStore.getState().accessToken;
        if (currentToken) {
          setAuth(userData, currentToken);
        }
        setLoading(false);
      } catch (error) {
        console.error('Session expired or invalid', error);
        clearAuth();
        router.push('/login');
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
    { name: 'Overview', href: '/dashboard', icon: LayoutDashboard, roles: ['ROOT_ADMIN', 'HOTEL_ADMIN', 'HR_MANAGER', 'DEPT_MANAGER', 'EMPLOYEE'] },
    { name: 'Hotels', href: '/dashboard/hotels', icon: Hotel, roles: ['ROOT_ADMIN'] },
    { name: 'Employees', href: '/dashboard/employees', icon: Users, roles: ['ROOT_ADMIN', 'HOTEL_ADMIN', 'HR_MANAGER', 'DEPT_MANAGER', 'EMPLOYEE'] },
    { name: 'Attendance', href: '/dashboard/attendance', icon: CalendarCheck, roles: ['ROOT_ADMIN', 'HOTEL_ADMIN', 'HR_MANAGER', 'DEPT_MANAGER', 'EMPLOYEE'] },
    { name: 'Tasks', href: '/dashboard/tasks', icon: CheckSquare, roles: ['ROOT_ADMIN', 'HOTEL_ADMIN', 'HR_MANAGER', 'DEPT_MANAGER', 'EMPLOYEE'] },
    { name: 'Leaves', href: '/dashboard/leaves', icon: FileText, roles: ['ROOT_ADMIN', 'HOTEL_ADMIN', 'HR_MANAGER', 'DEPT_MANAGER', 'EMPLOYEE'] },
    { name: 'Payroll & Payslips', href: '/dashboard/payroll', icon: DollarSign, roles: ['ROOT_ADMIN', 'HOTEL_ADMIN', 'HR_MANAGER', 'EMPLOYEE'] },
    { name: 'Reports & Analytics', href: '/dashboard/reports', icon: TrendingUp, roles: ['ROOT_ADMIN', 'HOTEL_ADMIN', 'HR_MANAGER'] },
    { name: 'LMS Courses', href: '/dashboard/lms', icon: GraduationCap, roles: ['ROOT_ADMIN', 'HOTEL_ADMIN', 'HR_MANAGER', 'DEPT_MANAGER', 'EMPLOYEE'] },
    { name: 'Operations Tickets', href: '/dashboard/tickets', icon: LifeBuoy, roles: ['ROOT_ADMIN', 'HOTEL_ADMIN', 'HR_MANAGER', 'DEPT_MANAGER', 'EMPLOYEE'] },
    { name: 'Compliance Audits', href: '/dashboard/compliance', icon: Shield, roles: ['ROOT_ADMIN', 'HOTEL_ADMIN', 'HR_MANAGER', 'DEPT_MANAGER'] },
    { name: 'Performance Hub', href: '/dashboard/performance', icon: Trophy, roles: ['ROOT_ADMIN', 'HOTEL_ADMIN', 'HR_MANAGER', 'DEPT_MANAGER', 'EMPLOYEE'] },
    { name: 'Policy Center', href: '/dashboard/policy', icon: FileText, roles: ['ROOT_ADMIN', 'HOTEL_ADMIN', 'HR_MANAGER', 'DEPT_MANAGER', 'EMPLOYEE'] },
  ];

  const visibleMenuItems = menuItems.filter((item) => user && item.roles.includes(user.role));

  const getHotelLabel = () => {
    if (user?.role === 'ROOT_ADMIN') return 'GLOBAL SYSTEM';
    if (typeof user?.hotel === 'object' && user.hotel?.name) return user.hotel.name;
    return 'Hotel Chain Partner';
  };

  return (
    <div className="min-h-screen bg-slate-dark text-slate-100 flex flex-col md:flex-row">
      
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-card-dark border-r border-slate-800/80 p-5 flex-shrink-0 z-30">
        {/* Logo */}
        <div className="flex flex-col items-start gap-2 px-2 mb-8 border-b border-slate-800/40 pb-4">
          <img src="/logo.png" alt="OxyHotels Logo" className="h-8 w-auto object-contain" />
          <div className="text-[9px] text-gold tracking-widest uppercase font-bold truncate max-w-[180px] mt-1">
            {getHotelLabel()}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1.5">
          {visibleMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                  isActive
                    ? 'bg-gold text-slate-dark font-bold shadow-md gold-glow'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
                }`}
              >
                <Icon size={18} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Footer info & logout */}
        <div className="pt-4 border-t border-slate-800/60 flex flex-col gap-3">
          <div className="flex items-center gap-3 px-2">
            <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center border border-gold/30 text-gold font-bold">
              {user?.photoUrl ? (
                <img src={user.photoUrl} alt="Avatar" className="w-full h-full rounded-full object-cover" />
              ) : (
                <User size={16} />
              )}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold truncate text-slate-200">{user?.firstName} {user?.lastName}</p>
              <p className="text-[10px] text-slate-500 font-medium truncate uppercase">{formatRole(user?.role)}</p>
            </div>
          </div>
          
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-red-400 hover:text-red-300 hover:bg-red-950/20 transition-all cursor-pointer"
          >
            <LogOut size={18} />
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
          <img src="/logo.png" alt="OxyHotels Logo" className="h-7 w-auto object-contain" />
          <button onClick={() => setMobileMenuOpen(false)} className="text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-1.5 mb-6">
          {visibleMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                  isActive
                    ? 'bg-gold text-slate-dark font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
                }`}
              >
                <Icon size={18} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="pt-4 border-t border-slate-800/60">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-gold/30 text-gold font-semibold text-xs">
              U
            </div>
            <div>
              <p className="text-xs font-semibold truncate text-slate-200">{user?.firstName} {user?.lastName}</p>
              <p className="text-[9px] text-slate-500 font-semibold truncate uppercase">{formatRole(user?.role)}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-red-400 hover:text-red-300 transition-all cursor-pointer"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Header - Mobile & Action bar */}
        <header className="flex items-center justify-between h-16 bg-card-dark border-b border-slate-800/80 px-4 md:px-8 z-20">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="text-slate-400 hover:text-white md:hidden"
            >
              <Menu size={22} />
            </button>
            <div className="hidden md:flex flex-col">
              <span className="text-[10px] uppercase font-bold text-gold tracking-widest">Enterprise Platform</span>
              <h2 className="text-base font-bold text-white capitalize">{pathname.split('/').pop() || 'Overview'}</h2>
            </div>
          </div>

          <div className="flex items-center gap-5">
            {/* Clock Widget */}
            <div className="hidden lg:flex flex-col items-end text-xs text-slate-400 font-medium">
              <span>Shift Time Zone: {timeZoneStr || 'UTC-5 (EST)'}</span>
              <span className="text-gold font-mono mt-0.5">{currentDate} {currentTime}</span>
            </div>

            {/* Notification alert icon */}
            <button className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-gold transition-colors relative">
              <Bell size={18} />
              <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-gold rounded-full" />
            </button>

            {/* User status Indicator */}
            <div className="flex items-center gap-2 border-l border-slate-800 pl-4">
              <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs font-semibold text-slate-300 uppercase hidden sm:inline">Online</span>
            </div>
          </div>
        </header>

        {/* Content body with responsive scrolling */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto max-w-full flex flex-col justify-between">
          <div className="flex-1">
            {children}
          </div>
          <Footer forceRender className="mt-12" />
        </main>
      </div>

    </div>
  );
}
