import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { api } from '@/lib/api';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/authStore';

export const useActivityBadges = () => {
  const [badges, setBadges] = useState<Record<string, number>>({});
  const pathname = usePathname();
  const { user, isAuthenticated } = useAuthStore();
  const [socket, setSocket] = useState<Socket | null>(null);

  // Fetch initial badges
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const fetchBadges = async () => {
      try {
        const res = await api.get('/activity/badges');
        if (res?.status === 'success') {
          setBadges(res.data.badges || {});
        }
      } catch (err) {
        console.error('Failed to fetch activity badges:', err);
      }
    };
    fetchBadges();
  }, [isAuthenticated, user]);

  // Setup Socket listener
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const token = useAuthStore.getState().accessToken;
    if (!token) return;

    const socketConn = io({
      path: '/api/socket',
      auth: { token },
    });

    socketConn.on('connect', () => {
      socketConn.emit('join_room', { userId: user._id || user.id });
    });

    socketConn.on('ACTIVITY_BADGE_UPDATE', (data: { module: string; count: number }) => {
      setBadges((prev) => ({
        ...prev,
        [data.module]: data.count,
      }));
    });

    socketConn.on('ACTIVITY_BADGE_INCREMENT', (data: { module: string; amount: number }) => {
      setBadges((prev) => ({
        ...prev,
        [data.module]: (prev[data.module] || 0) + data.amount,
      }));
    });

    setSocket(socketConn);

    return () => {
      socketConn.disconnect();
    };
  }, [isAuthenticated, user]);

  // Auto-reset when visiting a module
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    // Map pathname to module name
    let currentModule = '';
    if (pathname.includes('/dashboard/tasks/my-tasks')) currentModule = 'My Tasks';
    else if (pathname.includes('/dashboard/tasks')) currentModule = 'Tasks';
    else if (pathname.includes('/dashboard/community')) currentModule = 'Community';
    else if (pathname.includes('/dashboard/reports')) currentModule = 'Reports';
    else if (pathname.includes('/dashboard/employees')) currentModule = 'Employees';
    else if (pathname.includes('/dashboard/notifications')) currentModule = 'Notifications';
    
    if (currentModule && badges[currentModule] > 0) {
      // Optimistically update UI
      setBadges((prev) => ({ ...prev, [currentModule]: 0 }));
      
      // Reset on backend
      api.patch('/activity/reset', { module: currentModule }).catch(err => {
        console.error(`Failed to reset activity badge for ${currentModule}:`, err);
      });
    }
  }, [pathname, isAuthenticated, user, badges]);

  return { badges };
};
