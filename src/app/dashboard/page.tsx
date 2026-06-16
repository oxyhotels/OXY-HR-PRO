'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../lib/api';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatRole } from '../../lib/utils';
import GoogleIcon from '../../components/GoogleIcon';
import WorkLogDrawer from '../../components/reports/WorkLogDrawer';
import EmployeeReportModal from '../../components/reports/EmployeeReportModal';
import AttendanceAnalytics from '../../components/reports/AttendanceAnalytics';
import { exportToCSV, exportToExcel, exportToPDF } from '../../utils/reportExport';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';

interface Stats {
  totalEmployees: number;
  attendanceRate: number;
  pendingLeaves: number;
  pendingTasks: number;
}

interface DeptBreakdown {
  _id: string;
  count: number;
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [depts, setDepts] = useState<DeptBreakdown[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [gamificationProfile, setGamificationProfile] = useState<any>(null);
  const [gamificationLevelProgress, setGamificationLevelProgress] = useState<any>(null);
  const [leaderboardRank, setLeaderboardRank] = useState<number | null>(null);
  const [leaderboardTotalEmployees, setLeaderboardTotalEmployees] = useState<number>(0);

  // ROOT_ADMIN specific states
  const [liveAttendance, setLiveAttendance] = useState<any[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedPendingUser, setSelectedPendingUser] = useState<any | null>(null);
  const [editRole, setEditRole] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editSalary, setEditSalary] = useState('');

  // Dynamic shift date string and time clock
  const [currentDateStr, setCurrentDateStr] = useState<string>('June 13, 2026');
  const [currentTime, setCurrentTime] = useState<string>('');

  // GPS & Selfie Verification states
  const [verificationModalOpen, setVerificationModalOpen] = useState(false);
  const [verificationMode, setVerificationMode] = useState<'check-in' | 'check-out'>('check-in');
  const [gpsCoords, setGpsCoords] = useState<{ latitude: number; longitude: number; accuracy: number } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [gpsChecking, setGpsChecking] = useState(false);
  const [gpsIsIpBased, setGpsIsIpBased] = useState(false);
  const [tempCheckoutData, setTempCheckoutData] = useState<{ workDescription: string; workPictureUrl?: string; workVideoUrl?: string } | null>(null);

  // Card-level GPS/camera status for the pre-check-in location panel
  const [cardGpsCoords, setCardGpsCoords] = useState<{ latitude: number; longitude: number; accuracy: number } | null>(null);
  const [cardGpsError, setCardGpsError] = useState<string | null>(null);
  const [cardAddress, setCardAddress] = useState<string | null>(null);
  const [cardAddressLoading, setCardAddressLoading] = useState(false);
  const [cardCameraStatus, setCardCameraStatus] = useState<string>('Checking...');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraRetrying, setCameraRetrying] = useState(false);
  const [cameraStarted, setCameraStarted] = useState(false); // Camera only starts on user click
  const [capturedSelfie, setCapturedSelfie] = useState<string | null>(null); // base64 JPEG snapshot
  const [hotels, setHotels] = useState<any[]>([]);
  const [selectedHotelId, setSelectedHotelId] = useState<string>('');
  // Stable refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const gpsWatchId = useRef<number | null>(null); // watchPosition ID for live GPS tracking

  // Frontend Exemption check helper
  const isExempt = (user: any): boolean => {
    if (!user) return false;
    if (user.role === 'ROOT_ADMIN') return true;

    const dept = (user.department || '').toLowerCase();
    const role = (user.role || '').toLowerCase();

    // HR Department
    if (dept.includes('hr') || dept.includes('human resources') || role === 'hr_manager') {
      return true;
    }

    // IT Department
    if (dept.includes('it') || dept.includes('information technology') || dept.includes('it services')) {
      return true;
    }

    return false;
  };

  // Checkout modal states
  const [workOutModalOpen, setWorkOutModalOpen] = useState(false);
  const [workDescription, setWorkDescription] = useState('');
  const [workPicture, setWorkPicture] = useState<string | null>(null);
  const [workVideo, setWorkVideo] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Search & Select states for Root Admin overview
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [selectedStaffName, setSelectedStaffName] = useState<string>('');
  const [selectedPreviewImage, setSelectedPreviewImage] = useState<string | null>(null);
  const [selectedWorkLog, setSelectedWorkLog] = useState<any | null>(null);
  const [showAnalytics, setShowAnalytics] = useState<boolean>(false);
  const [reportEmployeeId, setReportEmployeeId] = useState<string | null>(null);

  // Staff Graph Specific States
  const [selectedStaffLogs, setSelectedStaffLogs] = useState<any[]>([]);
  const [graphLoading, setGraphLoading] = useState(false);

  const getPerformanceTierLabel = (level: number) => {
    if (level <= 2) return 'Bronze Elite';
    if (level <= 4) return 'Silver Champion';
    if (level <= 6) return 'Gold Vanguard';
    if (level <= 8) return 'Platinum Leader';
    return 'Diamond Legend';
  };

  const fetchGamificationPerformance = useCallback(async () => {
    if (!user) return;
    try {
      const profilePromise = api.get('/gamification/my-profile');
      const leaderboardPromise = api.get('/gamification/leaderboard?scope=month&limit=100');
      const [profileRes, leaderboardRes] = await Promise.all([profilePromise, leaderboardPromise]);

      const profile = profileRes?.data?.profile || null;
      setGamificationProfile(profile);
      setGamificationLevelProgress(profileRes?.data?.levelProgress || null);

      const leaderboard = leaderboardRes?.data?.leaderboard || [];
      const currentRank = leaderboard.find((entry: any) => entry.employeeId === user.id)?.rank ?? null;
      setLeaderboardRank(currentRank);
      setLeaderboardTotalEmployees(leaderboard.length);
    } catch (err) {
      console.error('Failed to fetch gamification performance', err);
    }
  }, [user]);

  // Fetch dashboard numbers
  const fetchDashboardData = async () => {
    try {
      const statsPromise = api.get('/reports/dashboard');
      const attPromise = api.get('/attendance/me').catch(err => {
        console.error('My attendance details not loaded', err);
        return null;
      });

      const [statsRes, attRes] = await Promise.all([statsPromise, attPromise]);

      if (statsRes) {
        setStats(statsRes.data.stats);
        setDepts(statsRes.data.departmentBreakdown || []);
      }

      if (attRes) {
        const todayStr = new Date().toISOString().split('T')[0];
        const todayLog = attRes.data.logs.find((log: any) => log.date === todayStr);
        setTodayAttendance(todayLog || null);
      }
    } catch (err: any) {
      console.error('Failed to fetch dashboard reports', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLiveAttendance = async () => {
    setAttendanceLoading(true);
    try {
      const url = (user?.role === 'ROOT_ADMIN' || user?.role === 'HOTEL_ADMIN' || user?.role === 'HR_MANAGER') 
        ? '/attendance/hotel?all=true' 
        : '/attendance/hotel';
      const res = await api.get(url);
      setLiveAttendance(res.data.logs || []);
    } catch (err) {
      console.error('Failed to fetch live attendance', err);
    } finally {
      setAttendanceLoading(false);
    }
  };

  const handleCSVExport = () => {
    exportToCSV(filteredLogs, 'work_updates_report.csv');
  };

  const handleExcelExport = () => {
    exportToExcel(filteredLogs, 'OXY Hotels HRMS - Employee Work Updates Report', 'work_updates_report.xlsx');
  };

  const handlePDFExport = () => {
    exportToPDF(filteredLogs, 'OXY Hotels HRMS - Employee Work Updates Report', 'work_updates_report.pdf');
  };

  const fetchPendingUsers = async () => {
    if (user?.role !== 'ROOT_ADMIN' && user?.role !== 'HOTEL_ADMIN') return;
    try {
      const res = await api.get('/employees/pending/list');
      const list = res.data.pendingUsers || [];
      setPendingUsers(list);
      // Auto open modal on load if there are pending signups
      if (list.length > 0) {
        setShowApprovalModal(true);
        setSelectedPendingUser(list[0]);
        setEditRole(list[0].role || '');
        setEditDepartment(list[0].department || '');
        setEditSalary(list[0].salaryDetails?.baseSalary?.toString() || '');
      }
    } catch (err) {
      console.error('Failed to fetch pending signups', err);
    }
  };

  const handleOnboardingAction = async (userId: string, action: 'approve' | 'reject') => {
    setActionLoading(true);
    setFeedback(null);
    try {
      await api.post(`/employees/pending/${userId}/approve`, {
        action,
        role: editRole || undefined,
        department: editDepartment || undefined,
        salary: editSalary ? Number(editSalary) : undefined,
      });

      setFeedback({
        type: 'success',
        message: action === 'approve' 
          ? 'Employee signup request approved successfully! They can now log in.' 
          : 'Employee signup request has been rejected and deactivated.'
      });

      // Refresh data
      const res = await api.get('/employees/pending/list');
      const list = res.data.pendingUsers || [];
      setPendingUsers(list);

      if (list.length > 0) {
        // Switch to the next pending user in the list
        const nextUser = list[0];
        setSelectedPendingUser(nextUser);
        setEditRole(nextUser.role || '');
        setEditDepartment(nextUser.department || '');
        setEditSalary(nextUser.salaryDetails?.baseSalary?.toString() || '');
      } else {
        // No more pending requests left
        setShowApprovalModal(false);
        setSelectedPendingUser(null);
      }

      fetchDashboardData();
      fetchLiveAttendance();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Onboarding action failed' });
    } finally {
      setActionLoading(false);
    }
  };

  // Dynamic clock and date updater
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentDateStr(now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }));
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const syncUserProfile = async () => {
      try {
        const res = await api.get('/auth/me');
        if (res.data?.user) {
          useAuthStore.getState().updateUser(res.data.user);
        }
      } catch (err) {
        console.error('Failed to sync profile on dashboard mount:', err);
      }
    };
    syncUserProfile();
  }, []);

  useEffect(() => {
    fetchDashboardData();
    fetchGamificationPerformance();
    const fetchUnreadCount = async () => {
      try {
        const res = await api.get('/notifications');
        if (res?.data?.notifications) {
          const unread = res.data.notifications.filter((n: any) => !n.read).length;
          setUnreadCount(unread);
        }
      } catch (e) {
        console.error('Failed to fetch unread notifications count:', e);
      }
    };
    fetchUnreadCount();
    if (user?.role === 'ROOT_ADMIN' || user?.role === 'HOTEL_ADMIN') {
      fetchPendingUsers();
    }
    if (user && user.role !== 'EMPLOYEE') {
      fetchLiveAttendance();
    }
    if (user?.role === 'ROOT_ADMIN') {
      const fetchHotelsList = async () => {
        try {
          const res = await api.get('/hotels/public');
          setHotels(res.data.hotels || []);
        } catch (err) {
          console.error('Failed to fetch hotels', err);
        }
      };
      fetchHotelsList();
    }
  }, [user, fetchGamificationPerformance]);

  useEffect(() => {
    if (verificationModalOpen && verificationMode === 'check-in') {
      const fetchHotelsList = async () => {
        try {
          const res = await api.get('/hotels/public');
          setHotels(res.data.hotels || []);
        } catch (err) {
          console.error('Failed to fetch hotels', err);
        }
      };
      fetchHotelsList();
      setSelectedHotelId('');
    }
  }, [verificationModalOpen, verificationMode]);

  useEffect(() => {
    if (!user || user.role === 'EMPLOYEE') return;

    // Poll every 10 seconds for live feed updates
    const interval = setInterval(() => {
      fetchLiveAttendance();
    }, 10000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if (!selectedStaffId) {
      setSelectedStaffLogs([]);
      return;
    }
    const fetchStaffHistory = async () => {
      setGraphLoading(true);
      try {
        const res = await api.get(`/attendance/hotel?all=true&employeeId=${selectedStaffId}`);
        setSelectedStaffLogs(res.data.logs || []);
      } catch (err) {
        console.error('Failed to fetch staff history', err);
      } finally {
        setGraphLoading(false);
      }
    };
    fetchStaffHistory();
  }, [selectedStaffId]);

  const handleCheckoutFileChange = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setter(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const startCamera = async (el?: HTMLVideoElement | null) => {
    const videoElement = el || videoRef.current;
    setCameraRetrying(true);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('UNAVAILABLE');
        setCameraRetrying(false);
        return;
      }

      // Stop any old stream first
      if (cameraStream) {
        cameraStream.getTracks().forEach(t => t.stop());
        setCameraStream(null);
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      setCameraStream(stream);
      setCameraError(null);
      setCameraStarted(true);

      if (videoElement) {
        videoElement.srcObject = stream;
        videoRef.current = videoElement;
        try { await videoElement.play(); } catch { /* autoPlay handles this */ }
      }
    } catch (err: any) {
      console.error('Camera access failed:', err?.name, err?.message);
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        setCameraError('BLOCKED');
      } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
        setCameraError('NOTFOUND');
      } else if (err?.name === 'NotReadableError') {
        setCameraError('INUSE');
      } else {
        setCameraError('BLOCKED');
      }
    } finally {
      setCameraRetrying(false);
    }
  };

  const retryCamera = () => {
    setCameraError(null);
    setCameraStarted(false);
    // Small delay then restart
    setTimeout(() => startCamera(videoRef.current), 300);
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop());
      setCameraStream(null);
    }
    setCameraStarted(false);
    setCameraError(null);
    videoRef.current = null;
  };

  // Stop live GPS watch
  const stopGPSWatch = () => {
    if (gpsWatchId.current !== null) {
      navigator.geolocation.clearWatch(gpsWatchId.current);
      gpsWatchId.current = null;
    }
  };

  // Capture a still frame from the live video stream as base64 JPEG
  const captureSelfie = (): string | null => {
    const video = videoRef.current;
    if (!video || !cameraStream) return null;
    try {
      const canvas = document.createElement('canvas');
      const w = video.videoWidth || 640;
      const h = video.videoHeight || 480;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      // Mirror the image to match what user sees (un-mirror for storage)
      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(video, -w, 0, w, h);
      ctx.restore();
      return canvas.toDataURL('image/jpeg', 0.85);
    } catch (e) {
      console.error('captureSelfie error:', e);
      return null;
    }
  };

  // Start live GPS watch (updates coordinates in real-time)
  const startGPSWatch = () => {
    stopGPSWatch(); // clear any existing watcher
    setGpsChecking(true);
    setGpsError(null);
    setGpsIsIpBased(false);
    setGpsCoords(null);

    if (typeof window === 'undefined' || !navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      setGpsChecking(false);
      return;
    }

    // Kick off immediate one-shot with low accuracy for fast first fix
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setGpsIsIpBased(accuracy > 1000);
        setGpsCoords({ latitude, longitude, accuracy });
        setGpsError(null);
        setGpsChecking(false);
      },
      () => { /* ignore — watchPosition below will handle errors */ },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
    );

    // Start live watch for continuous updates
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setGpsIsIpBased(accuracy > 1000);
        setGpsCoords({ latitude, longitude, accuracy });
        setGpsError(null);
        setGpsChecking(false);
      },
      (error: GeolocationPositionError) => {
        console.error(`GPS watch failed: code=${error.code}, message=${error.message}`);
        if (error.code === GeolocationPositionError.PERMISSION_DENIED) {
          setGpsError('DENIED');
        } else if (error.code === GeolocationPositionError.POSITION_UNAVAILABLE) {
          setGpsError('UNAVAILABLE');
        } else {
          setGpsError('TIMEOUT');
        }
        setGpsChecking(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    );
    gpsWatchId.current = watchId;
  };

  const handleAttendanceActionClick = (endpoint: string, actionName: string) => {
    if (endpoint === 'check-out') {
      setWorkOutModalOpen(true);
      setSubmitError(null);
      setWorkDescription('');
      setWorkPicture(null);
      setWorkVideo(null);
    } else {
      // Check-In Geolocation and Selfie Verification flow
      const exempt = isExempt(user);
      if (exempt) {
        handleAttendanceAction(endpoint, actionName, {});
      } else {
        setVerificationMode('check-in');
        setGpsCoords(null);
        setGpsError(null);
        setGpsIsIpBased(false);
        setCameraError(null);
        setCameraStarted(false);
        setCapturedSelfie(null);
        setVerificationModalOpen(true);
        // Start live GPS watch immediately
        setTimeout(() => startGPSWatch(), 100);
      }
    }
  };

  const handleAttendanceAction = async (endpoint: string, actionName: string, verificationParams: any = {}) => {
    setActionLoading(true);
    setFeedback(null);
    try {
      const payload = {
        ...verificationParams
      };
      await api.post(`/attendance/${endpoint}`, payload);
      setFeedback({ type: 'success', message: `Successfully logged: ${actionName}` });
      await fetchDashboardData();
      if (user && user.role !== 'EMPLOYEE') {
        fetchLiveAttendance();
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Operation failed. Please try again.' });
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  const handleWorkOutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workDescription.trim()) {
      setSubmitError('Work description is compulsory.');
      return;
    }
    setSubmitError(null);

    const exempt = isExempt(user);
    if (exempt) {
      setActionLoading(true);
      try {
        await api.post('/attendance/check-out', {
          workDescription,
          workPictureUrl: workPicture || undefined,
          workVideoUrl: workVideo || undefined,
        });
        setFeedback({ type: 'success', message: 'Checked out successfully with work update!' });
        setWorkOutModalOpen(false);
        setWorkDescription('');
        setWorkPicture(null);
        setWorkVideo(null);
        await fetchDashboardData();
        if (user?.role !== 'EMPLOYEE') {
          fetchLiveAttendance();
        }
      } catch (err: any) {
        setSubmitError(err.message || 'Check-out failed. Please try again.');
      } finally {
        setActionLoading(false);
      }
    } else {
      // Save data temporarily and trigger Selfie/GPS verification modal
      setTempCheckoutData({
        workDescription,
        workPictureUrl: workPicture || undefined,
        workVideoUrl: workVideo || undefined,
      });
      setWorkOutModalOpen(false);
      
      // Open verification modal
      setVerificationMode('check-out');
      setGpsCoords(null);
      setGpsError(null);
      setGpsIsIpBased(false);
      setCameraError(null);
      setCameraStarted(false);
      setCapturedSelfie(null);
      setVerificationModalOpen(true);
      // Start live GPS watch
      setTimeout(() => startGPSWatch(), 100);
    }
  };

  const handleVerificationSubmit = async (videoElement: HTMLVideoElement | null) => {
    if (!gpsCoords) {
      alert('Please wait for GPS location to be verified before proceeding.');
      return;
    }
    
    // Use pre-captured selfie if available, otherwise try real-time capture
    let photoData: string | null = capturedSelfie;

    // Fallback: try to capture from live video if no pre-captured selfie
    if (!photoData && videoElement && cameraStream) {
      try {
        const canvas = document.createElement('canvas');
        // Wait for video metadata if not ready
        if (videoElement.videoWidth === 0) {
          await new Promise<void>(resolve => {
            videoElement.onloadedmetadata = () => resolve();
            setTimeout(resolve, 1000); // max wait 1s
          });
        }
        canvas.width = videoElement.videoWidth || 640;
        canvas.height = videoElement.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        if (ctx && canvas.width > 0) {
          ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
          photoData = canvas.toDataURL('image/jpeg', 0.8);
        }
      } catch (e) {
        console.error('Selfie frame capture error:', e);
      }
    }

    const deviceInfo = `${navigator.platform} (${navigator.hardwareConcurrency || 4} cores)`;
    const browserInfo = navigator.userAgent;

    const verificationParams: Record<string, any> = {
      latitude: gpsCoords.latitude,
      longitude: gpsCoords.longitude,
      accuracy: gpsCoords.accuracy,
      deviceInfo,
      browserInfo,
    };

    if (photoData) {
      verificationParams.photo = photoData;
    }

    if (verificationMode === 'check-in' && selectedHotelId) {
      verificationParams.hotelId = selectedHotelId;
    }

    try {
      if (verificationMode === 'check-in') {
        if (!selectedHotelId) {
          alert('Please select a hotel property to complete clock-in.');
          return;
        }
        await handleAttendanceAction('check-in', 'Work In', verificationParams);
      } else {
        if (!tempCheckoutData) return;
        setActionLoading(true);
        await api.post('/attendance/check-out', {
          ...tempCheckoutData,
          ...verificationParams,
        });
        setFeedback({ type: 'success', message: 'Checked out successfully with work update!' });
        setTempCheckoutData(null);
        setWorkDescription('');
        setWorkPicture(null);
        setWorkVideo(null);
        await fetchDashboardData();
        if (user?.role !== 'EMPLOYEE') {
          fetchLiveAttendance();
        }
      }

      // Cleanup
      stopCamera();
      setVerificationModalOpen(false);
    } catch (err: any) {
      alert(err.message || 'Verification failed. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isBreakActive = todayAttendance?.breaks?.some((b: any) => !b.end);
  const performanceTierLabel = getPerformanceTierLabel(gamificationProfile?.level || 1);
  const performancePoints = gamificationProfile?.totalXp ?? 0;
  const performanceRankLabel = leaderboardRank ? `#${leaderboardRank}` : '—';
  const performanceStaffCount = stats?.totalEmployees || leaderboardTotalEmployees || 0;
  const performanceProgressPercent = gamificationLevelProgress?.progressPercent ?? 0;
  const performanceXpToNextLevel = gamificationProfile?.xpToNextLevel ?? 0;

  // Search logic on work logs
  const filteredLogs = liveAttendance.filter(log => {
    if (!log.employee) return false;
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    const empName = `${log.employee?.firstName} ${log.employee?.lastName}`.toLowerCase();
    const managerName = log.manager?.name?.toLowerCase() || '';
    const aadhaar = log.employee?.aadhaarNumber || '';
    const pan = log.employee?.panNumber || '';
    
    return empName.includes(searchLower) ||
           managerName.includes(searchLower) ||
           aadhaar.includes(searchLower) ||
           pan.includes(searchLower);
  });

  const chartData = selectedStaffLogs
    .sort((a, b) => a.date.localeCompare(b.date))
  return (
    <div className="max-w-7xl mx-auto">
      {/* ═══ UNIVERSAL SHIFT STATUS CARD — Shows on ALL devices (desktop, tablet, mobile) ═══ */}
      {user?.role !== 'ROOT_ADMIN' && (
        <div style={{
          background: '#ffffff',
          border: '2px solid #e2e8f0',
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '24px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)'
        }}>
          {/* Card Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px', marginBottom: '16px' }}>
            <span style={{ fontSize: '13px', fontWeight: '800', color: '#0a1f5c', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              ⏱ Shift Status Tracker
            </span>
            <span style={{
              background: todayAttendance ? (todayAttendance.checkOut ? '#fee2e2' : '#dcfce7') : '#fef9c3',
              color: todayAttendance ? (todayAttendance.checkOut ? '#991b1b' : '#166534') : '#854d0e',
              fontSize: '11px', fontWeight: '700', padding: '4px 12px', borderRadius: '99px', textTransform: 'uppercase'
            }}>
              {todayAttendance
                ? (todayAttendance.checkOut ? '🔴 Shift Ended' : isBreakActive ? '🟡 On Break' : '🟢 Active Duty')
                : '⚫ Off Duty'}
            </span>
          </div>

          {/* Shift Info Row */}
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginBottom: '16px', fontSize: '12px', color: '#475569' }}>
            <div>
              <span style={{ color: '#94a3b8', fontWeight: '600' }}>Assigned Shift: </span>
              <span style={{ fontWeight: '700', color: '#0f172a' }}>{user?.shift || 'General Shift'}</span>
            </div>
            {todayAttendance && (
              <>
                <div>
                  <span style={{ color: '#94a3b8', fontWeight: '600' }}>Clock-In: </span>
                  <span style={{ fontWeight: '700', color: '#0f172a', fontFamily: 'monospace' }}>
                    {new Date(todayAttendance.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div>
                  <span style={{ color: '#94a3b8', fontWeight: '600' }}>Duration: </span>
                  <span style={{ fontWeight: '700', color: '#0f172a', fontFamily: 'monospace' }}>{todayAttendance.totalWorkingHours || 0} hrs</span>
                </div>
              </>
            )}
          </div>

          {/* Action Buttons — 4 buttons, always visible, inline styles, no Tailwind */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
            {/* Work In */}
            <button
              type="button"
              onClick={() => handleAttendanceActionClick('check-in', 'Work In')}
              disabled={actionLoading || !!todayAttendance}
              style={{
                minHeight: '52px', background: '#16a34a', color: '#ffffff',
                border: 'none', borderRadius: '12px', fontSize: '13px', fontWeight: '800',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                opacity: (actionLoading || !!todayAttendance) ? 0.45 : 1,
                cursor: (actionLoading || !!todayAttendance) ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 8px rgba(22,163,74,0.3)'
              }}
            >
              <GoogleIcon name="play_arrow" size={18} /> Work In
            </button>

            {/* Work Out — ALWAYS RED, always rendered */}
            <button
              type="button"
              onClick={() => handleAttendanceActionClick('check-out', 'Work Out')}
              disabled={actionLoading || !todayAttendance || !!todayAttendance?.checkOut}
              style={{
                minHeight: '52px', background: '#DC2626', color: '#ffffff',
                border: 'none', borderRadius: '12px', fontSize: '13px', fontWeight: '800',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                opacity: (actionLoading || !todayAttendance || !!todayAttendance?.checkOut) ? 0.45 : 1,
                cursor: (actionLoading || !todayAttendance || !!todayAttendance?.checkOut) ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 8px rgba(220,38,38,0.3)'
              }}
            >
              <GoogleIcon name="logout" size={18} /> Work Out
            </button>

            {/* Break Start */}
            <button
              type="button"
              onClick={() => handleAttendanceActionClick('break-start', 'Start Break')}
              disabled={actionLoading || !todayAttendance || isBreakActive || !!todayAttendance?.checkOut}
              style={{
                minHeight: '52px', background: '#fef3c7', color: '#92400e',
                border: '1px solid #fde68a', borderRadius: '12px', fontSize: '13px', fontWeight: '700',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                opacity: (actionLoading || !todayAttendance || isBreakActive || !!todayAttendance?.checkOut) ? 0.4 : 1,
                cursor: (actionLoading || !todayAttendance || isBreakActive || !!todayAttendance?.checkOut) ? 'not-allowed' : 'pointer'
              }}
            >
              <GoogleIcon name="coffee" size={16} /> Break Start
            </button>

            {/* Break End */}
            <button
              type="button"
              onClick={() => handleAttendanceActionClick('break-end', 'End Break')}
              disabled={actionLoading || !todayAttendance || !isBreakActive || !!todayAttendance?.checkOut}
              style={{
                minHeight: '52px', background: '#dbeafe', color: '#1e40af',
                border: '1px solid #bfdbfe', borderRadius: '12px', fontSize: '13px', fontWeight: '700',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                opacity: (actionLoading || !todayAttendance || !isBreakActive || !!todayAttendance?.checkOut) ? 0.4 : 1,
                cursor: (actionLoading || !todayAttendance || !isBreakActive || !!todayAttendance?.checkOut) ? 'not-allowed' : 'pointer'
              }}
            >
              <GoogleIcon name="play_arrow" size={16} /> Break End
            </button>
          </div>

          {/* Mobile: stack buttons vertically on small screens */}
          <style>{`
            @media (max-width: 640px) {
              .shift-btn-grid { grid-template-columns: 1fr 1fr !important; }
            }
            @media (max-width: 400px) {
              .shift-btn-grid { grid-template-columns: 1fr !important; }
            }
          `}</style>
        </div>
      )}

      {/* Desktop Dashboard Overview Layout */}
      <div className="hidden md:block space-y-8">
        
        {/* Welcome Banner / Top Greeting */}
        <div className="relative bg-gradient-to-r from-[#0a1f5c] to-[#112d8a] text-white rounded-2xl p-6 md:p-8 overflow-hidden border border-gold/20 shadow-md">
          {/* Decorative geometric patterns */}
          <div className="absolute right-0 top-0 w-64 h-64 bg-gold/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute left-1/3 bottom-0 w-32 h-32 bg-[#f5d36a]/5 rounded-full blur-2xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              {/* Profile Photo Avatar */}
              <div className="w-16 h-16 rounded-full border-2 border-gold/40 flex-shrink-0 overflow-hidden shadow-md bg-white/10 flex items-center justify-center">
                {user?.photoUrl ? (
                  <img src={user.photoUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xl font-bold text-gold uppercase">{user?.firstName?.[0]}{user?.lastName?.[0]}</span>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-gold-dark bg-gold/15 border border-gold/30 px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">
                    {formatRole(user?.role)}
                  </span>
                  <span className="text-slate-350 text-xs font-semibold font-mono">Scope: Active Chain Portal</span>
                </div>
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mt-1 text-white">
                  Welcome back, {user?.firstName} {user?.lastName}!
                </h1>
                <p className="text-slate-300 text-xs mt-1.5 font-medium leading-relaxed max-w-xl">
                  Manage operations, check-in for your shift, view tasks, and review hotel properties dynamically.
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Notification Trigger Button */}
              <button
                onClick={() => router.push('/dashboard/notifications')}
                className="relative w-12 h-12 bg-white/8 hover:bg-white/15 border border-white/10 hover:border-gold/30 rounded-xl flex items-center justify-center transition-all cursor-pointer shadow-sm group"
                title="View Notifications"
              >
                <GoogleIcon name="notifications" className="text-gold group-hover:scale-110 transition-transform" size={24} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-red-500 border-2 border-[#0a1f5c] text-white text-[9px] font-extrabold w-5 h-5 rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Shift Date Card */}
              <div className="flex items-center gap-3 bg-white/8 border border-white/15 rounded-xl px-4 py-2.5">
                <GoogleIcon name="calendar_today" className="text-gold-light" size={20} />
                <div className="text-xs">
                  <p className="font-bold text-green-200">Shift Date</p>
                  <p className="text-slate-300 font-mono font-medium">{currentDateStr}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feedback Banner */}
        {feedback && (
          <div className={`p-4 rounded-xl border text-sm flex items-center gap-3 ${
            feedback.type === 'success' 
              ? 'bg-green-55 hover:bg-green-50 border-green-200 text-green-800' 
              : 'bg-red-55 hover:bg-red-55 border-red-200 text-red-800'
          }`}>
            <GoogleIcon name="info" className={feedback.type === 'success' ? 'text-green-600' : 'text-red-600'} size={18} />
            <span className="font-semibold">{feedback.message}</span>
          </div>
        )}

        {/* Dashboard Top Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Performance & Shift Status */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* My Performance Card */}
            {user && ['EMPLOYEE', 'HR_MANAGER', 'DEPT_MANAGER'].includes(user.role) && gamificationProfile && (
              <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all relative overflow-hidden">
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-gold/5 rounded-full pointer-events-none" />
                
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-bold text-[#0a1f5c] uppercase tracking-wider flex items-center gap-1.5">
                    <GoogleIcon name="workspace_premium" className="text-gold" size={18} />
                    My Performance
                  </h3>
                  <span className="text-[10px] font-bold text-gold bg-gold/10 px-2.5 py-0.5 rounded-full uppercase tracking-wider font-mono">
                    {performanceTierLabel}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Total XP</span>
                    <span className="text-3xl font-extrabold text-[#0a1f5c] tracking-tight">
                      {performancePoints.toLocaleString()}
                    </span>
                    <span className="text-xs text-slate-500 font-semibold block mt-0.5">XP Points</span>
                  </div>
                  <div className="border-l border-slate-100 pl-4">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Leaderboard Rank</span>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="text-2xl font-extrabold text-[#0a1f5c]">{performanceRankLabel}</span>
                    </div>
                    <span className="text-[9px] text-slate-400 block mt-0.5">
                      Out of {performanceStaffCount || 'N/A'} staff
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-slate-50">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-500">Level Progress (Level {gamificationProfile?.level ?? 1})</span>
                    <span className="text-[#0a1f5c]">{performanceProgressPercent}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-gold to-[#f5d36a] rounded-full"
                      style={{ width: `${Math.min(Math.max(performanceProgressPercent, 0), 100)}%` }}
                    />
                  </div>
                  <span className="text-[9px] text-slate-400 block mt-1">
                    {performanceXpToNextLevel.toLocaleString()} XP needed for next level
                  </span>
                </div>
              </div>
            )}

            {/* Work Status Tracker (Visible to all EXCEPT ROOT_ADMIN) */}
            {user?.role !== 'ROOT_ADMIN' && (
              <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all space-y-4">
                <div>
                  <h2 className="text-sm font-bold text-[#0a1f5c] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <GoogleIcon name="schedule" className="text-gold" size={18} />
                    Work Status Tracker
                  </h2>
                  <p className="text-slate-550 text-slate-500 text-xs">Log your check-in/out and breaks for daily attendance logs.</p>
                </div>
                
                {/* Clock & Status Panel */}
                <div className="flex flex-col items-center justify-center bg-slate-50/50 border border-slate-100 rounded-xl p-5 text-center">
                  <span className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Shift Status</span>
                  <span className="text-base font-extrabold text-[#0a1f5c] mt-1">
                    {todayAttendance ? (
                      todayAttendance.checkOut ? 'Work Shift Ended' : isBreakActive ? 'On Break' : 'Currently Active (Working)'
                    ) : (
                      'Not Checked In'
                    )}
                  </span>

                  {/* Running local clock & shift */}
                  <div className="mt-3.5 flex flex-col gap-2.5 bg-white border border-slate-100 p-3 rounded-xl w-full text-left">
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase tracking-wider font-bold block">Current Local Time</span>
                      <span className="text-sm font-extrabold text-[#0a1f5c] font-mono">{currentTime || '--:--:--'}</span>
                    </div>
                    <div className="border-t border-slate-50 pt-2">
                      <span className="text-[9px] text-slate-400 uppercase tracking-wider font-bold block">Assigned Duty Shift</span>
                      <span className="text-xs font-bold text-gold">{user?.shift || 'General Shift (09:00 AM - 05:00 PM)'}</span>
                    </div>
                  </div>

                  {/* Pre-Clock-In Location Status Tracker */}
                  {!todayAttendance && !isExempt(user) && (
                    <div className="mt-3.5 w-full bg-white border border-slate-100 p-3.5 rounded-xl text-xs space-y-2 text-slate-600">
                      <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                        <span className="font-bold text-[#0a1f5c] uppercase text-[9px] tracking-wider flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
                          Geo Verification Link
                        </span>
                        <span className="text-[8px] font-mono text-slate-400">Mandatory</span>
                      </div>
                      
                      <div className="flex items-start justify-between gap-4">
                        <span className="text-slate-400 font-semibold">Location Coordinates:</span>
                        <span className="font-mono text-right text-slate-700">
                          {cardGpsCoords ? `${cardGpsCoords.latitude.toFixed(5)}°N, ${cardGpsCoords.longitude.toFixed(5)}°E` : cardGpsError ? 'N/A' : 'Accessing GPS...'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-semibold">GPS Accuracy:</span>
                        <span className={`font-bold flex items-center gap-1 ${cardGpsError ? 'text-red-500' : cardGpsCoords ? 'text-green-600' : 'text-amber-500'}`}>
                          {cardGpsError ? `🔴 ${cardGpsError}` : cardGpsCoords ? `🟢 Verified (±${Math.round(cardGpsCoords.accuracy)}m)` : '🟡 Resolving Coordinates...'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-semibold">Selfie Camera:</span>
                        <span className={`font-bold ${cardCameraStatus === 'Permission Granted' || cardCameraStatus.includes('Ready') ? 'text-green-600' : 'text-red-500'}`}>
                          {cardCameraStatus === 'Permission Granted' ? '🟢 Active' : cardCameraStatus === 'Blocked' ? '🔴 Blocked' : `🟡 ${cardCameraStatus}`}
                        </span>
                      </div>

                      <div className="flex flex-col gap-1 border-t border-slate-100 pt-2 text-[10.5px]">
                        <span className="text-slate-450 font-bold text-slate-400 uppercase text-[8.5px]">Resolved Address:</span>
                        <span className="text-slate-700 leading-normal font-sans">
                          {cardAddressLoading ? (
                            <span className="text-slate-450 italic animate-pulse flex items-center gap-1 text-slate-400">
                              <span className="w-2 h-2 border border-t-transparent border-[#0a1f5c] rounded-full animate-spin" />
                              Resolving real-world address...
                            </span>
                          ) : cardAddress ? (
                            cardAddress
                          ) : cardGpsError ? (
                            <span className="text-red-500/80 italic">Please enable GPS to fetch address</span>
                          ) : (
                            <span className="text-slate-450 italic text-slate-400">Waiting for GPS Coordinates...</span>
                          )}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Post-Clock-In Location Status Tracker */}
                  {todayAttendance && (
                    <div className="mt-3.5 w-full bg-white border border-slate-100 p-3.5 rounded-xl text-xs space-y-2 text-slate-600">
                      <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                        <span className="font-bold text-green-600 uppercase text-[9px] tracking-wider flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                          Checked In Successfully
                        </span>
                        <span className="text-[8px] font-mono text-slate-400">Live Session Active</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-semibold">Duty Started:</span>
                        <span className="font-mono text-slate-700 font-bold">
                          {new Date(todayAttendance.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {todayAttendance.checkInAddress ? (
                        <div className="space-y-1.5 border-t border-slate-100 pt-2">
                          <div className="flex items-start justify-between gap-4">
                            <span className="text-slate-400 font-semibold">Verify Address:</span>
                            <span className="text-right text-slate-700 flex-1 pl-4 leading-normal font-sans">{todayAttendance.checkInAddress}</span>
                          </div>
                          {todayAttendance.village && (
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400 font-semibold">Location Area:</span>
                              <span className="text-slate-700 font-bold">{todayAttendance.village}</span>
                            </div>
                          )}
                          {todayAttendance.district && (
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400 font-semibold">District:</span>
                              <span className="text-slate-700 font-bold">{todayAttendance.district}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="border-t border-slate-100 pt-2 text-[10px] text-slate-400 italic">
                          Address verification skipped (exempt profile).
                        </div>
                      )}

                      {!isExempt(user) && (
                        <div className="flex gap-4 border-t border-slate-100 pt-2 text-[9px] justify-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-green-50 text-green-600 border border-green-200 font-bold uppercase">
                            ✓ GPS Checked
                          </span>
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-green-50 text-green-600 border border-green-200 font-bold uppercase">
                            ✓ Selfie OK
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Duty Action Triggers */}
                <div className="grid grid-cols-2 gap-3.5">
                  <button
                    onClick={() => handleAttendanceActionClick('check-in', 'Work In')}
                    disabled={actionLoading || !!todayAttendance}
                    className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 disabled:opacity-30 disabled:cursor-not-allowed text-white text-xs font-bold py-3 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm hover:shadow-md cursor-pointer border-0"
                  >
                    <GoogleIcon name="play_arrow" size={16} />
                    Work In
                  </button>

                  <button
                    onClick={() => handleAttendanceActionClick('check-out', 'Work Out')}
                    disabled={actionLoading || !todayAttendance || !!todayAttendance.checkOut}
                    className="bg-gradient-to-r from-red-650 to-red-550 to-red-600 hover:from-red-500 hover:to-red-400 disabled:opacity-30 disabled:cursor-not-allowed text-white text-xs font-bold py-3 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm hover:shadow-md cursor-pointer border-0"
                  >
                    <GoogleIcon name="logout" size={16} />
                    Work Out
                  </button>

                  <button
                    onClick={() => handleAttendanceActionClick('break-start', 'Start Break')}
                    disabled={actionLoading || !todayAttendance || isBreakActive || !!todayAttendance.checkOut}
                    className="bg-slate-50 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed border border-slate-200 text-slate-700 text-xs font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <GoogleIcon name="coffee" className="text-amber-500" size={16} />
                    Start Break
                  </button>

                  <button
                    onClick={() => handleAttendanceActionClick('break-end', 'End Break')}
                    disabled={actionLoading || !todayAttendance || !isBreakActive || !!todayAttendance.checkOut}
                    className="bg-slate-50 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed border border-slate-200 text-slate-700 text-xs font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <GoogleIcon name="play_arrow" className="text-blue-500" size={16} />
                    End Break
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Quick Access & Stats Grid */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Quick Access Portal Grid */}
            <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all">
              <h3 className="text-sm font-bold text-[#0a1f5c] uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="w-1.5 h-3.5 bg-gold rounded-full" />
                Quick Access Portal
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Link
                  href="/dashboard/attendance"
                  className="group flex flex-col items-center justify-center p-4 bg-slate-50/50 hover:bg-gradient-to-br hover:from-[#0a1f5c] hover:to-[#112d8a] border border-slate-100 rounded-2xl text-center transition-all duration-300 hover:shadow-md hover:-translate-y-1"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#0a1f5c]/5 group-hover:bg-white/15 flex items-center justify-center text-[#0a1f5c] group-hover:text-gold transition-all mb-2.5">
                    <GoogleIcon name="fingerprint" size={20} />
                  </div>
                  <span className="text-xs font-bold text-slate-700 group-hover:text-white transition-colors">Attendance</span>
                </Link>

                <Link
                  href="/dashboard/tasks"
                  className="group flex flex-col items-center justify-center p-4 bg-slate-50/50 hover:bg-gradient-to-br hover:from-[#0a1f5c] hover:to-[#112d8a] border border-slate-100 rounded-2xl text-center transition-all duration-300 hover:shadow-md hover:-translate-y-1"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#0a1f5c]/5 group-hover:bg-white/15 flex items-center justify-center text-[#0a1f5c] group-hover:text-gold transition-all mb-2.5">
                    <GoogleIcon name="fact_check" size={20} />
                  </div>
                  <span className="text-xs font-bold text-slate-700 group-hover:text-white transition-colors">Tasks</span>
                </Link>

                <Link
                  href="/dashboard/performance"
                  className="group flex flex-col items-center justify-center p-4 bg-slate-50/50 hover:bg-gradient-to-br hover:from-[#0a1f5c] hover:to-[#112d8a] border border-slate-100 rounded-2xl text-center transition-all duration-300 hover:shadow-md hover:-translate-y-1"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#0a1f5c]/5 group-hover:bg-white/15 flex items-center justify-center text-[#0a1f5c] group-hover:text-gold transition-all mb-2.5">
                    <GoogleIcon name="leaderboard" size={20} />
                  </div>
                  <span className="text-xs font-bold text-slate-700 group-hover:text-white transition-colors">Leaderboard</span>
                </Link>

                <Link
                  href="/dashboard/lms"
                  className="group flex flex-col items-center justify-center p-4 bg-slate-50/50 hover:bg-gradient-to-br hover:from-[#0a1f5c] hover:to-[#112d8a] border border-slate-100 rounded-2xl text-center transition-all duration-300 hover:shadow-md hover:-translate-y-1"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#0a1f5c]/5 group-hover:bg-white/15 flex items-center justify-center text-[#0a1f5c] group-hover:text-gold transition-all mb-2.5">
                    <GoogleIcon name="school" size={20} />
                  </div>
                  <span className="text-xs font-bold text-slate-700 group-hover:text-white transition-colors">Learning</span>
                </Link>

                <Link
                  href="/dashboard/policy"
                  className="group flex flex-col items-center justify-center p-4 bg-slate-50/50 hover:bg-gradient-to-br hover:from-[#0a1f5c] hover:to-[#112d8a] border border-slate-100 rounded-2xl text-center transition-all duration-300 hover:shadow-md hover:-translate-y-1"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#0a1f5c]/5 group-hover:bg-white/15 flex items-center justify-center text-[#0a1f5c] group-hover:text-gold transition-all mb-2.5">
                    <GoogleIcon name="gavel" size={20} />
                  </div>
                  <span className="text-xs font-bold text-slate-700 group-hover:text-white transition-colors">Policy</span>
                </Link>

                <Link
                  href="/dashboard/performance"
                  className="group flex flex-col items-center justify-center p-4 bg-slate-50/50 hover:bg-gradient-to-br hover:from-[#0a1f5c] hover:to-[#112d8a] border border-slate-100 rounded-2xl text-center transition-all duration-300 hover:shadow-md hover:-translate-y-1"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#0a1f5c]/5 group-hover:bg-white/15 flex items-center justify-center text-[#0a1f5c] group-hover:text-gold transition-all mb-2.5">
                    <GoogleIcon name="workspace_premium" size={20} />
                  </div>
                  <span className="text-xs font-bold text-slate-700 group-hover:text-white transition-colors">Rewards</span>
                </Link>

                <button
                  onClick={() => router.push('/dashboard/profile')}
                  className="group flex flex-col items-center justify-center p-4 bg-slate-50/50 hover:bg-gradient-to-br hover:from-[#0a1f5c] hover:to-[#112d8a] border border-slate-100 rounded-2xl text-center transition-all duration-300 hover:shadow-md hover:-translate-y-1 cursor-pointer w-full"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#0a1f5c]/5 group-hover:bg-white/15 flex items-center justify-center text-[#0a1f5c] group-hover:text-gold transition-all mb-2.5">
                    <GoogleIcon name="account_circle" size={20} />
                  </div>
                  <span className="text-xs font-bold text-slate-700 group-hover:text-white transition-colors">Profile</span>
                </button>

                <Link
                  href="/dashboard"
                  className="group flex flex-col items-center justify-center p-4 bg-slate-50/50 hover:bg-gradient-to-br hover:from-[#0a1f5c] hover:to-[#112d8a] border border-slate-100 rounded-2xl text-center transition-all duration-300 hover:shadow-md hover:-translate-y-1"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#0a1f5c]/5 group-hover:bg-white/15 flex items-center justify-center text-[#0a1f5c] group-hover:text-gold transition-all mb-2.5">
                    <GoogleIcon name="apps" size={20} />
                  </div>
                  <span className="text-xs font-bold text-slate-700 group-hover:text-white transition-colors">More</span>
                </Link>
              </div>
            </div>

            {/* Stats Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-100 rounded-2xl p-5 hover:border-gold/30 hover:shadow-md transition-all shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Headcount</p>
                    <h3 className="text-2xl font-extrabold mt-2 text-[#0a1f5c]">{stats?.totalEmployees || 0}</h3>
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-slate-100 text-[#0a1f5c] rounded-xl">
                    <GoogleIcon name="group" size={18} />
                  </div>
                </div>
                <p className="text-[9.5px] text-slate-450 mt-4 text-slate-500">Active operational staff</p>
              </div>

              <div className="bg-white border border-slate-100 rounded-2xl p-5 hover:border-gold/30 hover:shadow-md transition-all shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Attendance Rate</p>
                    <h3 className="text-2xl font-extrabold mt-2 text-[#0a1f5c]">{stats?.attendanceRate || 0}%</h3>
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-slate-100 text-[#0a1f5c] rounded-xl">
                    <GoogleIcon name="trending_up" size={18} />
                  </div>
                </div>
                <p className="text-[9.5px] text-slate-450 mt-4 text-slate-500">Calculated for today</p>
              </div>

              <div className="bg-white border border-slate-100 rounded-2xl p-5 hover:border-gold/30 hover:shadow-md transition-all shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Leaves Review</p>
                    <h3 className="text-2xl font-extrabold mt-2 text-[#0a1f5c]">{stats?.pendingLeaves || 0}</h3>
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-slate-100 text-[#0a1f5c] rounded-xl">
                    <GoogleIcon name="calendar_today" size={18} />
                  </div>
                </div>
                <p className="text-[9.5px] text-slate-455 mt-4 text-slate-500">Pending leaves</p>
              </div>

              <div className="bg-white border border-slate-100 rounded-2xl p-5 hover:border-gold/30 hover:shadow-md transition-all shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Pending Tasks</p>
                    <h3 className="text-2xl font-extrabold mt-2 text-[#0a1f5c]">{stats?.pendingTasks || 0}</h3>
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-slate-100 text-[#0a1f5c] rounded-xl">
                    <GoogleIcon name="check_circle" size={18} />
                  </div>
                </div>
                <p className="text-[9.5px] text-slate-450 mt-4 text-slate-500">Tasks in progress</p>
              </div>
            </div>

            {/* Row 1: Pending Onboarding banner */}
            {(user?.role === 'ROOT_ADMIN' || user?.role === 'HOTEL_ADMIN') && pendingUsers.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-3">
                  <span className="p-2.5 bg-amber-500/10 text-amber-600 rounded-xl animate-pulse font-sans text-sm">🔔</span>
                  <div>
                    <p className="font-bold text-slate-800">Pending Onboarding Approvals Queue</p>
                    <p className="text-slate-505 text-slate-500 mt-0.5 font-sans">There are {pendingUsers.length} newly registered employee/manager accounts waiting for credential verification.</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowApprovalModal(true)}
                  className="bg-amber-500 hover:bg-amber-600 text-white font-extrabold px-4 py-2.5 rounded-xl cursor-pointer transition-colors whitespace-nowrap shadow-sm"
                >
                  Review Requests ({pendingUsers.length})
                </button>
              </div>
            )}

            {/* Row 2: Staff Allocation (Visible to all EXCEPT ROOT_ADMIN) */}
            {user?.role !== 'ROOT_ADMIN' && (
              <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all space-y-4">
                <div>
                  <h2 className="text-sm font-bold text-[#0a1f5c] uppercase tracking-wider flex items-center gap-1.5">
                    <GoogleIcon name="corporate_fare" className="text-gold" size={18} />
                    Staff Allocation
                  </h2>
                  <p className="text-slate-505 text-slate-500 text-xs">Distribution of active employees across hotel departments.</p>
                </div>

                <div className="space-y-4">
                  {depts.map((d) => (
                    <div key={d._id} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-600 font-bold">{d._id || 'Operations'}</span>
                        <span className="text-gold font-bold">{d.count} staff</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-gold to-[#f5d36a] rounded-full" 
                          style={{ width: `${Math.min(100, (d.count / (stats?.totalEmployees || 1)) * 100)}%` }} 
                        />
                      </div>
                    </div>
                  ))}

                  {depts.length === 0 && (
                    <div className="text-center py-6 text-slate-400 text-xs italic">
                      No department distribution data available.
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-50">
                  <a href="/dashboard/employees" className="text-xs text-gold hover:text-gold-light transition-colors flex items-center gap-1 font-bold">
                    View Staff Directory
                    <GoogleIcon name="arrow_forward" size={14} />
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Row 3: Employee Work Updates Logs & Search Directory (Visible to ROOT_ADMIN, HOTEL_ADMIN, and HR_MANAGER) */}
        {(user?.role === 'ROOT_ADMIN' || user?.role === 'HOTEL_ADMIN' || user?.role === 'HR_MANAGER') && (
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-sm font-bold text-[#0a1f5c] uppercase tracking-wider flex items-center gap-1.5">
                  <GoogleIcon name="description" className="text-gold" size={18} />
                  Employee Work Updates Logs
                </h2>
                <p className="text-slate-500 text-xs mt-0.5">Historical shift logs, daily tasks summaries, and evidence documents.</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {/* Analytics & Export Actions Toolbar */}
                <div className="flex items-center gap-2 mr-2 border-r border-slate-200 pr-4">
                  <button
                    type="button"
                    onClick={() => setShowAnalytics(true)}
                    className="px-3 py-1.5 bg-[#0a1f5c]/5 hover:bg-[#0a1f5c] border border-[#0a1f5c]/10 text-[#0a1f5c] hover:text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    title="Fullscreen Analytics Dashboard"
                  >
                    <GoogleIcon name="analytics" size={14} />
                    Analytics
                  </button>
                  <button
                    type="button"
                    onClick={handleCSVExport}
                    className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-800 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    title="Export CSV"
                  >
                    <GoogleIcon name="description" size={14} />
                    CSV
                  </button>
                  <button
                    type="button"
                    onClick={handleExcelExport}
                    className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 text-emerald-700 hover:text-emerald-900 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    title="Export Excel"
                  >
                    <GoogleIcon name="table_view" size={14} />
                    Excel
                  </button>
                  <button
                    type="button"
                    onClick={handlePDFExport}
                    className="px-3 py-1.5 bg-red-50 hover:bg-red-100 border border-red-100 text-red-700 hover:text-red-900 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    title="Export PDF"
                  >
                    <GoogleIcon name="picture_as_pdf" size={14} />
                    PDF
                  </button>
                </div>

                <div className="relative">
                  <GoogleIcon name="search" className="absolute left-3 top-2.5 text-slate-400" size={16} />
                  <input
                    type="text"
                    placeholder="Search Name, Aadhaar, PAN..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs text-[#111827] w-64 focus:outline-none focus:border-gold placeholder-slate-400"
                  />
                </div>
                <button
                  onClick={fetchLiveAttendance}
                  disabled={attendanceLoading}
                  className="text-xs bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-gold px-3 py-1.5 rounded border border-slate-200 disabled:opacity-40 cursor-pointer"
                >
                  {attendanceLoading ? 'Refreshing...' : 'Refresh Logs'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* Updates Table Column */}
              <div className="xl:col-span-2 space-y-4">
                <div className="overflow-x-auto border border-slate-100 rounded-xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-[#0a1f5c] uppercase tracking-wider font-semibold">
                        <th className="p-3">Staff Details</th>
                        <th className="p-3">Shift Date</th>
                        <th className="p-3">Hours Details</th>
                        <th className="p-3">Work description & Evidence</th>
                        <th className="p-3 text-right">Analytics</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150 text-slate-700 bg-white">
                      {filteredLogs.map((log) => (
                        <tr 
                          key={log._id} 
                          className={`hover:bg-slate-50/50 transition-colors cursor-pointer ${selectedStaffId === log.employee?._id ? 'bg-gold/5 border-l-4 border-l-gold' : ''}`}
                          onClick={() => {
                            if (log.employee) {
                              setSelectedStaffId(log.employee._id);
                              setSelectedStaffName(`${log.employee.firstName} ${log.employee.lastName}`);
                            }
                          }}
                        >
                          <td className="p-3">
                            <div className="flex items-center gap-3">
                              {/* Check-In Selfie Thumbnail */}
                              <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 flex-shrink-0 overflow-hidden relative group">
                                {log.checkInPhoto ? (
                                  <>
                                    <img src={log.checkInPhoto} alt="Selfie" className="w-full h-full object-cover" />
                                    <div 
                                      className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedPreviewImage(log.checkInPhoto);
                                      }}
                                    >
                                      <span className="text-[9px] text-gold font-bold uppercase">View</span>
                                    </div>
                                  </>
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-slate-500 bg-slate-100 font-bold uppercase text-xs">
                                    {log.employee ? `${log.employee.firstName[0]}${log.employee.lastName[0]}` : '??'}
                                  </div>
                                )}
                              </div>
                              <div>
                                <div className="font-semibold text-slate-800">{log.employee?.firstName} {log.employee?.lastName}</div>
                                <div className="text-slate-400 font-mono text-[10px]">{log.employee?.email}</div>
                                <div className="text-[10px] text-slate-500 mt-0.5 uppercase font-semibold text-gold font-mono">Role: {formatRole(log.employee?.role)} | Shift: {log.employee?.shift || 'General Shift'}</div>
                                <div className="text-slate-500 text-[10px] mt-0.5">Property: <span className="text-slate-700 font-semibold">{log.hotel?.name || 'N/A'} ({log.hotel?.hotelCode?.toUpperCase() || 'N/A'})</span></div>
                                <div className="text-[9px] text-slate-400 mt-1">Aadhaar: {log.employee?.aadhaarNumber || 'N/A'} | PAN: {log.employee?.panNumber || 'N/A'}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-3 font-mono text-slate-500">
                            {log.date}
                          </td>
                          <td className="p-3 space-y-1">
                            <div className="text-slate-600"><span className="text-slate-450 uppercase text-[9px] font-bold text-slate-400 font-mono">Check-In:</span> {log.checkIn ? new Date(log.checkIn).toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}</div>
                            <div className="text-slate-600"><span className="text-slate-450 uppercase text-[9px] font-bold text-slate-400 font-mono">Check-Out:</span> {log.checkOut ? new Date(log.checkOut).toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}</div>
                            <div className="text-[10.5px] font-bold text-slate-800">Hours: {log.totalWorkingHours} hrs</div>
                            {log.checkInLatitude !== undefined && (
                              <div className="text-[9.5px] text-green-600 font-mono mt-0.5">
                                📍 {log.checkInLatitude.toFixed(4)}°, {log.checkInLongitude?.toFixed(4)}°
                              </div>
                            )}
                            {log.checkInAddress && (
                              <div className="text-[9.5px] text-slate-500 font-sans mt-1 leading-normal max-w-[220px] whitespace-pre-wrap" title={log.checkInAddress}>
                                🏠 {log.checkInAddress}
                              </div>
                            )}
                          </td>
                          <td className="p-3 max-w-xs">
                            {log.workDescription ? (
                              <div className="space-y-1.5">
                                <p className="text-slate-700 leading-relaxed font-sans text-xs bg-slate-50 p-2.5 rounded border border-slate-100">
                                  {log.workDescription.length > 30 
                                    ? `${log.workDescription.slice(0, 30)}...` 
                                    : log.workDescription
                                  }
                                </p>
                                {log.workDescription.length > 30 && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedWorkLog(log);
                                    }}
                                    className="text-[10px] text-gold hover:text-gold-light hover:underline font-bold transition-all cursor-pointer inline-flex items-center gap-0.5 font-mono"
                                  >
                                    See More &rarr;
                                  </button>
                                )}
                                {log.workDescription.length <= 30 && (log.workPictureUrl || log.workVideoUrl) && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedWorkLog(log);
                                    }}
                                    className="text-[10px] text-gold hover:text-gold-light hover:underline font-bold transition-all cursor-pointer inline-flex items-center gap-0.5 font-mono"
                                  >
                                    View Evidence &rarr;
                                  </button>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">No checkout work update submitted yet</span>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (log.employee) {
                                  setReportEmployeeId(log.employee._id);
                                }
                              }}
                              className="bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-gold border border-slate-200 hover:border-gold/30 px-2.5 py-1.5 rounded transition-colors text-[10px] uppercase font-bold cursor-pointer font-mono"
                            >
                              View Report
                            </button>
                          </td>
                        </tr>
                      ))}
                      {filteredLogs.length === 0 && (
                        <tr>
                          <td colSpan={5} className="text-center p-8 text-slate-400 italic">
                            No work updates match your search filter.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Analytics Graph Column */}
              <div className="xl:col-span-1">
                {selectedStaffId ? (
                  <div className="bg-slate-550/50 bg-slate-50/50 border border-slate-100 rounded-2xl p-5 space-y-4 h-full flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <h3 className="font-bold text-[#0a1f5c] text-xs">Work Hours Trend</h3>
                        <button 
                          onClick={() => {
                            setSelectedStaffId(null);
                            setSelectedStaffName('');
                          }} 
                          className="text-slate-400 hover:text-[#0a1f5c]"
                        >
                          ✕
                        </button>
                      </div>
                      <p className="text-gold font-extrabold text-[11px] mb-6 uppercase tracking-wider">{selectedStaffName}</p>

                      {graphLoading ? (
                        <div className="flex items-center justify-center h-56 mt-2">
                          <GoogleIcon name="progress_activity" size={24} className="text-gold animate-spin-icon" />
                        </div>
                      ) : chartData.length > 0 ? (
                        <div className="w-full h-56 mt-2">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                              <defs>
                                <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.4}/>
                                  <stop offset="95%" stopColor="#D4AF37" stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                              <XAxis dataKey="date" stroke="#64748b" fontSize={9} tickLine={false} />
                              <YAxis stroke="#64748b" fontSize={9} tickLine={false} />
                              <Tooltip 
                                contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', fontSize: '10px', color: '#111827' }}
                                labelStyle={{ color: '#D4AF37', fontWeight: 'bold' }}
                              />
                              <Area type="monotone" dataKey="hours" name="Work Hours" stroke="#D4AF37" strokeWidth={2} fillOpacity={1} fill="url(#colorHours)" />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="text-center py-16 text-slate-400 italic text-[11px]">
                          No historical check-out hours logged for this staff member.
                        </div>
                      )}
                    </div>
                    
                    <div className="text-[10px] text-slate-400 pt-3 border-t border-slate-100">
                      Shows daily checked-in duty hours for the selected employee.
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50/30 border border-slate-200 border-dashed rounded-2xl p-8 text-center h-full flex flex-col items-center justify-center text-slate-400 italic text-xs">
                    <GoogleIcon name="trending_up" size={24} className="text-slate-350 mb-2 animate-pulse" />
                    Select a staff member from the logs table to view their work updates productivity analytics graph.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile-First Dashboard Overview Layout */}
      <div className="md:hidden space-y-6 pb-36">
        {/* Mobile Greeting Header Card */}
        <div className="bg-gradient-to-r from-[#0a1f5c] to-[#112d8a] text-white p-5 rounded-2xl shadow-lg border border-gold/15 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full border-2 border-gold/30 bg-white/10 flex items-center justify-center overflow-hidden">
              {user?.photoUrl ? (
                <img src={user.photoUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm font-bold text-gold uppercase">{user?.firstName?.[0]}{user?.lastName?.[0]}</span>
              )}
            </div>
            <div>
              <span className="text-[9px] font-bold text-gold-light uppercase tracking-wider block font-mono">{formatRole(user?.role)}</span>
              <h2 className="text-base font-extrabold text-white">Hello, {user?.firstName}!</h2>
              <p className="text-[9.5px] text-slate-300">Let's make today productive.</p>
            </div>
          </div>
          
          <button
            onClick={() => router.push('/dashboard/notifications')}
            className="relative w-10 h-10 bg-white/10 border border-white/10 rounded-xl flex items-center justify-center transition-all cursor-pointer"
            title="View Notifications"
          >
            <GoogleIcon name="notifications" className="text-gold" size={20} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 border border-[#0a1f5c] text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        {/* Date & Time Widget */}
        <div className="grid grid-cols-2 gap-3 bg-white border border-slate-100 p-4 rounded-xl shadow-sm text-xs">
          <div className="flex items-center gap-2">
            <GoogleIcon name="calendar_today" className="text-gold" size={16} />
            <div className="text-[10.5px]">
              <span className="text-slate-400 block font-semibold uppercase text-[8px]">Date</span>
              <span className="font-bold text-slate-700">{currentDateStr}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 border-l border-slate-100 pl-3">
            <GoogleIcon name="schedule" className="text-gold" size={16} />
            <div className="text-[10.5px]">
              <span className="text-slate-400 block font-semibold uppercase text-[8px]">Clock</span>
              <span className="font-bold text-slate-700 font-mono">{currentTime || '--:--:--'}</span>
            </div>
          </div>
        </div>

        {/* Feedback Banner */}
        {feedback && (
          <div className={`p-3 rounded-xl border text-[11px] flex items-center gap-2 ${
            feedback.type === 'success' 
              ? 'bg-green-50 border-green-200 text-green-800' 
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <GoogleIcon name="info" className={feedback.type === 'success' ? 'text-green-600' : 'text-red-600'} size={14} />
            <span className="font-semibold">{feedback.message}</span>
          </div>
        )}

        {/* ✅ SHIFT STATUS CARD — Moved to TOP for immediate mobile visibility */}
        {user?.role !== 'ROOT_ADMIN' && (
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px', marginBottom: '12px' }}>
              <span style={{ fontSize: '10px', fontWeight: '800', color: '#0a1f5c', textTransform: 'uppercase', letterSpacing: '0.05em' }}>⏱ Shift Status</span>
              <span style={{ background: '#fef9c3', color: '#854d0e', fontSize: '9px', fontWeight: '700', padding: '2px 8px', borderRadius: '99px', textTransform: 'uppercase' }}>
                {todayAttendance
                  ? (todayAttendance.checkOut ? 'Shift Ended' : isBreakActive ? 'On Break' : '🟢 Active Duty')
                  : '⭕ Off Duty'}
              </span>
            </div>

            {/* Info rows */}
            <div style={{ fontSize: '11px', color: '#475569', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8', fontWeight: '600' }}>Assigned Shift:</span>
                <span style={{ fontWeight: '700', color: '#1e293b' }}>{user?.shift || 'General Shift'}</span>
              </div>
              {todayAttendance && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8', fontWeight: '600' }}>Clock-In:</span>
                    <span style={{ fontWeight: '700', color: '#1e293b', fontFamily: 'monospace' }}>
                      {new Date(todayAttendance.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8', fontWeight: '600' }}>Duration:</span>
                    <span style={{ fontWeight: '700', color: '#1e293b', fontFamily: 'monospace' }}>{todayAttendance.totalWorkingHours || 0} hrs</span>
                  </div>
                </>
              )}
            </div>

            {/* Action Buttons — all 4, always visible */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Work In */}
              <button
                type="button"
                onClick={() => handleAttendanceActionClick('check-in', 'Work In')}
                disabled={actionLoading || !!todayAttendance}
                style={{
                  width: '100%', minHeight: '52px',
                  background: (actionLoading || !!todayAttendance) ? '#86efac' : '#16a34a',
                  color: '#fff', border: 'none', borderRadius: '12px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  fontSize: '15px', fontWeight: '800',
                  opacity: (actionLoading || !!todayAttendance) ? 0.5 : 1,
                  cursor: (actionLoading || !!todayAttendance) ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 8px rgba(22,163,74,0.25)'
                }}
              >
                <GoogleIcon name="play_arrow" size={20} /> Work In
              </button>

              {/* Work Out — ALWAYS SHOWN IN RED */}
              <button
                type="button"
                onClick={() => handleAttendanceActionClick('check-out', 'Work Out')}
                disabled={actionLoading || !todayAttendance || !!todayAttendance?.checkOut}
                style={{
                  width: '100%', minHeight: '52px',
                  background: '#DC2626',
                  color: '#fff', border: 'none', borderRadius: '12px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  fontSize: '15px', fontWeight: '800',
                  opacity: (actionLoading || !todayAttendance || !!todayAttendance?.checkOut) ? 0.4 : 1,
                  cursor: (actionLoading || !todayAttendance || !!todayAttendance?.checkOut) ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 8px rgba(220,38,38,0.25)'
                }}
              >
                <GoogleIcon name="logout" size={20} /> Work Out
              </button>

              {/* Break buttons — side by side */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => handleAttendanceActionClick('break-start', 'Start Break')}
                  disabled={actionLoading || !todayAttendance || isBreakActive || !!todayAttendance?.checkOut}
                  style={{
                    minHeight: '48px', background: '#fef3c7', color: '#92400e',
                    border: '1px solid #fde68a', borderRadius: '12px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    fontSize: '13px', fontWeight: '700',
                    opacity: (actionLoading || !todayAttendance || isBreakActive || !!todayAttendance?.checkOut) ? 0.4 : 1,
                    cursor: (actionLoading || !todayAttendance || isBreakActive || !!todayAttendance?.checkOut) ? 'not-allowed' : 'pointer'
                  }}
                >
                  <GoogleIcon name="coffee" size={16} /> Break
                </button>
                <button
                  type="button"
                  onClick={() => handleAttendanceActionClick('break-end', 'End Break')}
                  disabled={actionLoading || !todayAttendance || !isBreakActive || !!todayAttendance?.checkOut}
                  style={{
                    minHeight: '48px', background: '#dbeafe', color: '#1e40af',
                    border: '1px solid #bfdbfe', borderRadius: '12px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    fontSize: '13px', fontWeight: '700',
                    opacity: (actionLoading || !todayAttendance || !isBreakActive || !!todayAttendance?.checkOut) ? 0.4 : 1,
                    cursor: (actionLoading || !todayAttendance || !isBreakActive || !!todayAttendance?.checkOut) ? 'not-allowed' : 'pointer'
                  }}
                >
                  <GoogleIcon name="play_arrow" size={16} /> Resume
                </button>
              </div>
            </div>
          </div>
        )}

        {/* My Performance Card */}
        {user && ['EMPLOYEE', 'HR_MANAGER', 'DEPT_MANAGER'].includes(user.role) && gamificationProfile && (
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-24 h-24 bg-gold/5 rounded-full pointer-events-none" />
            
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xs font-bold text-[#0a1f5c] uppercase tracking-wider flex items-center gap-1 font-mono">
                <GoogleIcon name="workspace_premium" className="text-gold" size={16} />
                My Performance
              </h3>
              <span className="text-[9px] font-bold text-gold bg-gold/10 px-2.5 py-0.5 rounded-full uppercase tracking-wider font-mono">
                {performanceTierLabel}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider block">Total XP</span>
                <span className="text-2xl font-extrabold text-[#0a1f5c] tracking-tight">
                  {performancePoints.toLocaleString()}
                </span>
              </div>
              <div className="border-l border-slate-100 pl-3">
                <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider block">Rank</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-extrabold text-[#0a1f5c]">{performanceRankLabel}</span>
                </div>
                <span className="text-[8px] text-slate-400 block mt-0.5 font-medium">
                  Out of {performanceStaffCount || 'N/A'} staff
                </span>
              </div>
            </div>

            <div className="space-y-1 pt-2 border-t border-slate-50">
              <div className="flex justify-between text-[11px] font-bold">
                <span className="text-slate-500">Level Progress (Level {gamificationProfile?.level ?? 1})</span>
                <span className="text-[#0a1f5c]">{performanceProgressPercent}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-gold to-[#f5d36a] rounded-full"
                  style={{ width: `${Math.min(Math.max(performanceProgressPercent, 0), 100)}%` }}
                />
              </div>
              <span className="text-[8px] text-slate-400 block mt-1 font-medium">
                {performanceXpToNextLevel.toLocaleString()} XP needed for next level
              </span>
            </div>
          </div>
        )}

        {/* Quick Access Portal Grid */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
          <h3 className="text-xs font-bold text-[#0a1f5c] uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <span className="w-1 h-3 bg-gold rounded-full" />
            Quick Access Portal
          </h3>
          <div className="grid grid-cols-4 gap-2.5">
            <Link
              href="/dashboard/attendance"
              className="flex flex-col items-center justify-center p-2.5 bg-slate-50/50 border border-slate-100 rounded-xl text-center active:bg-slate-100"
            >
              <GoogleIcon name="fingerprint" className="text-[#0a1f5c] mb-1.5" size={20} />
              <span className="text-[9.5px] font-bold text-slate-700">Attendance</span>
            </Link>

            <Link
              href="/dashboard/tasks"
              className="flex flex-col items-center justify-center p-2.5 bg-slate-50/50 border border-slate-100 rounded-xl text-center active:bg-slate-100"
            >
              <GoogleIcon name="fact_check" className="text-[#0a1f5c] mb-1.5" size={20} />
              <span className="text-[9.5px] font-bold text-slate-700">Tasks</span>
            </Link>

            <Link
              href="/dashboard/performance"
              className="flex flex-col items-center justify-center p-2.5 bg-slate-50/50 border border-slate-100 rounded-xl text-center active:bg-slate-100"
            >
              <GoogleIcon name="leaderboard" className="text-[#0a1f5c] mb-1.5" size={20} />
              <span className="text-[9.5px] font-bold text-slate-700">Leaderboard</span>
            </Link>

            <Link
              href="/dashboard/lms"
              className="flex flex-col items-center justify-center p-2.5 bg-slate-50/50 border border-slate-100 rounded-xl text-center active:bg-slate-100"
            >
              <GoogleIcon name="school" className="text-[#0a1f5c] mb-1.5" size={20} />
              <span className="text-[9.5px] font-bold text-slate-700">Learning</span>
            </Link>

            <Link
              href="/dashboard/policy"
              className="flex flex-col items-center justify-center p-2.5 bg-slate-50/50 border border-slate-100 rounded-xl text-center active:bg-slate-100"
            >
              <GoogleIcon name="gavel" className="text-[#0a1f5c] mb-1.5" size={20} />
              <span className="text-[9.5px] font-bold text-slate-700">Policy</span>
            </Link>

            <Link
              href="/dashboard/performance"
              className="flex flex-col items-center justify-center p-2.5 bg-slate-50/50 border border-slate-100 rounded-xl text-center active:bg-slate-100"
            >
              <GoogleIcon name="workspace_premium" className="text-[#0a1f5c] mb-1.5" size={20} />
              <span className="text-[9.5px] font-bold text-slate-700">Rewards</span>
            </Link>

            <button
              onClick={() => router.push('/dashboard/profile')}
              className="flex flex-col items-center justify-center p-2.5 bg-slate-50/50 border border-slate-100 rounded-xl text-center active:bg-slate-100 cursor-pointer w-full"
            >
              <GoogleIcon name="account_circle" className="text-[#0a1f5c] mb-1.5" size={20} />
              <span className="text-[9.5px] font-bold text-slate-700">Profile</span>
            </button>

            <Link
              href="/dashboard"
              className="flex flex-col items-center justify-center p-2.5 bg-slate-50/50 border border-slate-100 rounded-xl text-center active:bg-slate-100"
            >
              <GoogleIcon name="apps" className="text-[#0a1f5c] mb-1.5" size={20} />
              <span className="text-[9.5px] font-bold text-slate-700">More</span>
            </Link>
          </div>
        </div>

        {/* Work Status Tracker Panel — now moved to top of mobile layout, this is the old location placeholder */}

        {/* Pending onboarding approvals for Admins */}
        {(user?.role === 'ROOT_ADMIN' || user?.role === 'HOTEL_ADMIN') && pendingUsers.length > 0 && (
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-gold uppercase tracking-wider">Staff Onboarding</span>
              <span className="text-[9.5px] text-red-500 font-bold font-mono">{pendingUsers.length} Action Needed</span>
            </div>
            <p className="text-[11px] text-slate-500">There are pending staff registration requests waiting for review.</p>
            <button
              type="button"
              onClick={() => setShowApprovalModal(true)}
              className="w-full bg-gold hover:bg-gold-light text-slate-dark text-[10.5px] font-extrabold py-2.5 rounded-xl transition-all shadow-md gold-glow cursor-pointer border-0"
            >
              Review Requests ({pendingUsers.length})
            </button>
          </div>
        )}

        {/* Team updates feed for managers */}
        {user?.role !== 'EMPLOYEE' && (
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-[10px] font-bold text-[#0a1f5c] uppercase tracking-wider font-mono">Team Activity Stream</h3>
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {filteredLogs.slice(0, 10).map((log) => (
                <div key={log._id} className="flex gap-3 p-3 bg-slate-50/50 border border-slate-100 rounded-xl text-[11px] items-center">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[#0a1f5c] font-bold uppercase flex-shrink-0">
                    {log.employee?.photoUrl ? (
                      <img src={log.employee.photoUrl} alt="Avatar" className="w-full h-full object-cover rounded-full" />
                    ) : (
                      <span>{log.employee?.firstName[0]}{log.employee?.lastName[0]}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 truncate font-sans">{log.employee?.firstName} {log.employee?.lastName}</p>
                    <p className="text-slate-550 text-slate-500 text-[9.5px] mt-0.5 font-sans">{log.status} &bull; {log.totalWorkingHours || 8} hrs</p>
                  </div>
                </div>
              ))}
              {filteredLogs.length === 0 && (
                <p className="text-slate-450 text-center py-4 italic text-[10.5px]">No logs matching query.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Work Out Evidence Input Modal */}
      {workOutModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0d1117] border border-gold/30 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-sm">Work Shift Check-Out</h3>
              <button onClick={() => setWorkOutModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <GoogleIcon name="close" size={18} />
              </button>
            </div>

            {submitError && (
              <div className="p-3 bg-red-950/40 border border-red-500/30 text-xs text-red-300 rounded animate-pulse">
                {submitError}
              </div>
            )}

            <form onSubmit={handleWorkOutSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1.5 uppercase tracking-wider">
                  Describe today's work done <span className="text-gold font-bold">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Describe the tasks, achievements and updates completed during your shift today (Compulsory)..."
                  className="w-full bg-slate-950/60 border border-slate-800 rounded p-2.5 text-white placeholder-slate-600 focus:border-gold focus:outline-none text-xs"
                  value={workDescription}
                  onChange={(e) => setWorkDescription(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider">
                  Upload Image Evidence (Optional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleCheckoutFileChange(e, setWorkPicture)}
                  className="w-full text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-slate-800 file:text-gold hover:file:bg-slate-700 cursor-pointer text-[11px]"
                />
                {workPicture && <span className="text-green-400 text-[10px] mt-1 block font-semibold">✓ Image Loaded</span>}
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider">
                  Upload Video Evidence (Optional)
                </label>
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => handleCheckoutFileChange(e, setWorkVideo)}
                  className="w-full text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-slate-800 file:text-gold hover:file:bg-slate-700 cursor-pointer text-[11px]"
                />
                {workVideo && <span className="text-green-400 text-[10px] mt-1 block font-semibold">✓ Video Loaded</span>}
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setWorkOutModalOpen(false)}
                  className="bg-slate-800 text-slate-300 hover:bg-slate-700 px-4 py-2 rounded font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {actionLoading ? <GoogleIcon name="progress_activity" size={12} className="animate-spin-icon" /> : <GoogleIcon name="logout" size={12} />}
                  Complete Check-Out
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GPS + Selfie Verification Modal */}
      {verificationModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3">
          <div className="bg-[#0d1117] border border-slate-700/60 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            
            {/* Header */}
            <div className="flex justify-between items-center px-5 pt-5 pb-4 border-b border-slate-800/80">
              <div>
                <h3 className="font-extrabold text-white text-sm flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  Attendance Verification
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {verificationMode === 'check-in' ? '🟢 Work In — ' : '🔴 Work Out — '}
                  GPS location + selfie required
                </p>
              </div>
              <button
                onClick={() => {
                  stopCamera();
                  stopGPSWatch();
                  setVerificationModalOpen(false);
                }}
                className="text-slate-500 hover:text-white p-1.5 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <GoogleIcon name="close" size={16} />
              </button>
            </div>

            {/* Status Row */}
            <div className="grid grid-cols-2 gap-3 px-5 pt-4 text-xs">
              
              {/* GPS Status */}
              <div className={`rounded-xl p-3 border flex flex-col gap-1.5 ${
                gpsCoords
                  ? 'bg-green-950/20 border-green-700/40'
                  : gpsError
                    ? 'bg-red-950/20 border-red-700/40'
                    : 'bg-slate-900/50 border-slate-800'
              }`}>
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">📍 Live Location</span>
                  {gpsCoords && (
                    <span className={`text-[7px] px-1.5 py-0.5 rounded font-bold uppercase border ${gpsIsIpBased ? 'bg-amber-500/15 text-amber-400 border-amber-600/30' : 'bg-green-500/15 text-green-400 border-green-600/30'}`}>
                      {gpsIsIpBased ? 'Network' : 'GPS'}
                    </span>
                  )}
                  {gpsChecking && (
                    <span className="w-2.5 h-2.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin ml-auto" />
                  )}
                  {gpsCoords && !gpsChecking && (
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse ml-auto" />
                  )}
                </div>

                {gpsCoords ? (
                  <>
                    <p className="text-[10px] font-bold text-green-400">✓ Location Live</p>
                    <p className="text-[9px] font-mono text-slate-400">
                      {gpsCoords.latitude.toFixed(4)}°N<br />
                      {gpsCoords.longitude.toFixed(4)}°E
                    </p>
                    <p className="text-[8px] text-slate-600">
                      ±{gpsCoords.accuracy > 1000 ? `${(gpsCoords.accuracy/1000).toFixed(0)}km` : `${Math.round(gpsCoords.accuracy)}m`}
                    </p>
                  </>
                ) : gpsError === 'DENIED' ? (
                  <>
                    <p className="text-[10px] font-semibold text-red-400">⛔ Permission Blocked</p>
                    <p className="text-[8px] text-red-400/70">Click 🔒 lock → Allow Location → retry</p>
                    <button onClick={startGPSWatch} className="text-[9px] bg-red-950/40 text-red-300 border border-red-800/40 rounded px-2 py-1 w-fit cursor-pointer hover:bg-red-900/30">
                      🔄 Retry GPS
                    </button>
                  </>
                ) : (
                  <p className="text-[10px] text-slate-500">
                    {gpsChecking ? 'Detecting your location...' : 'Waiting for location...'}
                  </p>
                )}
              </div>

              {/* Camera Status */}
              <div className={`rounded-xl p-3 border flex flex-col gap-1.5 ${
                cameraStream
                  ? 'bg-green-950/20 border-green-700/40'
                  : cameraError
                    ? 'bg-amber-950/20 border-amber-700/30'
                    : 'bg-slate-900/50 border-slate-800'
              }`}>
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">📷 Selfie Camera</span>
                  <span className="text-[7px] bg-slate-800 text-slate-500 border border-slate-700 px-1.5 py-0.5 rounded font-bold uppercase ml-auto">Optional</span>
                </div>

                {cameraStream ? (
                  <>
                    <p className="text-[10px] font-bold text-green-400">✓ Camera Live</p>
                    <p className="text-[8px] text-green-400/60">Selfie captured on submit</p>
                  </>
                ) : cameraRetrying ? (
                  <>
                    <p className="text-[10px] font-semibold text-amber-400 flex items-center gap-1">
                      <span className="w-2.5 h-2.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                      Starting...
                    </p>
                  </>
                ) : cameraError === 'BLOCKED' ? (
                  <>
                    <p className="text-[10px] font-semibold text-amber-400">🔒 Blocked</p>
                    <p className="text-[8px] text-amber-400/70">Lock icon → Allow Camera → Retry</p>
                    <button onClick={() => startCamera(videoRef.current)} className="text-[9px] bg-amber-950/40 text-amber-300 border border-amber-800/40 rounded px-2 py-1 w-fit cursor-pointer hover:bg-amber-900/30">
                      🔄 Retry
                    </button>
                  </>
                ) : cameraError === 'INUSE' ? (
                  <>
                    <p className="text-[10px] font-semibold text-amber-400">📷 In Use</p>
                    <p className="text-[8px] text-amber-400/70">Close other apps then retry</p>
                    <button onClick={() => startCamera(videoRef.current)} className="text-[9px] bg-amber-950/40 text-amber-300 border border-amber-800/40 rounded px-2 py-1 w-fit cursor-pointer hover:bg-amber-900/30">
                      🔄 Retry
                    </button>
                  </>
                ) : cameraError === 'NOTFOUND' ? (
                  <>
                    <p className="text-[10px] font-semibold text-slate-400">No Camera</p>
                    <p className="text-[8px] text-slate-500">GPS-Only mode — proceed below</p>
                  </>
                ) : !cameraStarted ? (
                  <>
                    <p className="text-[10px] text-slate-400">Camera not started</p>
                    <button
                      onClick={() => startCamera(videoRef.current)}
                      className="text-[9px] bg-blue-600/20 text-blue-300 border border-blue-600/40 rounded-lg px-2.5 py-1.5 w-fit cursor-pointer hover:bg-blue-600/30 font-bold flex items-center gap-1"
                    >
                      📷 Enable Camera
                    </button>
                  </>
                ) : (
                  <p className="text-[10px] text-slate-500">Loading camera...</p>
                )}
              </div>
            </div>

            {/* Live Camera Feed */}
            <div className="px-5 pt-3 pb-4">
              <div className="relative w-full aspect-video bg-slate-950 rounded-xl overflow-hidden border border-slate-800/60">
                {capturedSelfie ? (
                  <img src={capturedSelfie} className="w-full h-full object-cover" alt="Captured Selfie" />
                ) : (
                  <video
                    ref={(el) => {
                      videoRef.current = el;
                      if (el && cameraStream && el.srcObject !== cameraStream) {
                        el.srcObject = cameraStream;
                      }
                    }}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover scale-x-[-1] ${!cameraStream ? 'hidden' : ''}`}
                  />
                )}

                {/* Shutter button overlay */}
                {cameraStream && !capturedSelfie && (
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
                    <button
                      type="button"
                      onClick={() => {
                        const selfie = captureSelfie();
                        if (selfie) {
                          setCapturedSelfie(selfie);
                          stopCamera();
                        }
                      }}
                      className="w-12 h-12 bg-red-600 hover:bg-red-500 text-white rounded-full flex items-center justify-center border-4 border-white/30 shadow-lg transition-transform hover:scale-110 active:scale-95 cursor-pointer"
                      title="Capture Selfie"
                    >
                      <span className="w-4 h-4 bg-white rounded-full" />
                    </button>
                  </div>
                )}

                {/* Retake button overlay */}
                {capturedSelfie && (
                  <button
                    type="button"
                    onClick={() => {
                      setCapturedSelfie(null);
                      setTimeout(() => startCamera(videoRef.current), 100);
                    }}
                    className="absolute top-2 right-2 bg-black/75 hover:bg-black text-white text-xs px-2.5 py-1.5 rounded-lg border border-slate-700/65 flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    🔄 Retake
                  </button>
                )}

                {/* Not started yet */}
                {!capturedSelfie && !cameraStream && !cameraRetrying && !cameraError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                    <div className="w-16 h-16 rounded-full border-2 border-dashed border-slate-700 flex items-center justify-center">
                      <span className="text-2xl opacity-40">📷</span>
                    </div>
                    <div className="text-center">
                      <p className="text-slate-400 text-xs font-semibold">Camera Not Active</p>
                      <p className="text-slate-600 text-[10px] mt-1">Click "Enable Camera" above to start</p>
                    </div>
                    {gpsCoords && (
                      <p className="text-[9px] text-green-500/70 bg-green-950/20 border border-green-800/30 px-3 py-1.5 rounded-lg">
                        ✓ GPS verified — you can check in without selfie
                      </p>
                    )}
                  </div>
                )}

                {/* Retrying */}
                {!capturedSelfie && cameraRetrying && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950">
                    <span className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                    <p className="text-amber-400 text-xs font-semibold">Starting Camera...</p>
                  </div>
                )}

                {/* Camera error with GPS OK */}
                {!capturedSelfie && cameraError && !cameraRetrying && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/95 text-center px-6">
                    {gpsCoords ? (
                      <>
                        <div className="w-14 h-14 rounded-full bg-green-950/50 border border-green-700/40 flex items-center justify-center">
                          <span className="text-xl">📍</span>
                        </div>
                        <div>
                          <p className="text-green-400 font-bold text-xs">GPS-Only Mode Active</p>
                          <p className="text-slate-500 text-[9px] mt-1">Location verified • No selfie required</p>
                        </div>
                        {cameraError !== 'NOTFOUND' && (
                          <button onClick={() => startCamera(videoRef.current)} className="text-[9px] bg-amber-950/40 text-amber-300 border border-amber-700/40 rounded px-2.5 py-1 cursor-pointer hover:bg-amber-900/30">
                            🔄 Retry Camera
                          </button>
                        )}
                      </>
                    ) : (
                      <>
                        <span className="text-3xl">📷</span>
                        <div>
                          <p className="text-amber-300 font-bold text-xs">Camera Blocked</p>
                          <p className="text-slate-500 text-[9px] mt-1">Allow camera or proceed with GPS only</p>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Live indicator badge when camera active */}
                {!capturedSelfie && cameraStream && (
                  <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm border border-red-500/50 rounded-full px-2.5 py-1 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-[9px] text-white font-bold uppercase tracking-wider">LIVE</span>
                  </div>
                )}

                {/* GPS live badge overlay */}
                {gpsCoords && (
                  <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm border border-green-600/40 rounded-lg px-2 py-1">
                    <p className="text-[8px] font-mono text-green-400">
                      {gpsCoords.latitude.toFixed(4)}°, {gpsCoords.longitude.toFixed(4)}°
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Hotel Selector Dropdown (Shown after Selfie Capture for Check-In) */}
            {verificationMode === 'check-in' && capturedSelfie && (
              <div className="px-5 pb-4 space-y-1.5 text-xs animate-in fade-in slide-in-from-bottom-2 duration-200">
                <label className="block text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                  🏨 Select Property/Hotel <span className="text-gold">*</span>
                </label>
                <div className="relative">
                  <select
                    required
                    value={selectedHotelId}
                    onChange={(e) => setSelectedHotelId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 focus:border-gold focus:outline-none text-xs appearance-none cursor-pointer pr-10"
                  >
                    <option value="" className="text-slate-600">-- Select property name and code --</option>
                    {hotels.map((hotel: any) => (
                      <option key={hotel._id} value={hotel._id} className="text-white bg-slate-950">
                        {hotel.name} ({hotel.code?.toUpperCase()})
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-500">
                    <GoogleIcon name="expand_more" size={14} />
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 px-5 pb-5 text-xs">
              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  stopGPSWatch();
                  setVerificationModalOpen(false);
                }}
                className="flex-1 bg-slate-800/80 hover:bg-slate-700 text-slate-300 py-3 rounded-xl border border-slate-700/60 font-bold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={
                  actionLoading || 
                  !gpsCoords || 
                  !capturedSelfie ||
                  (verificationMode === 'check-in' && !selectedHotelId)
                }
                onClick={() => handleVerificationSubmit(videoRef.current)}
                className="flex-[2] bg-green-600 hover:bg-green-500 disabled:opacity-30 text-white py-3 rounded-xl font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg disabled:cursor-not-allowed"
              >
                {actionLoading ? (
                  <>
                    <GoogleIcon name="progress_activity" size={14} className="animate-spin-icon" />
                    Saving...
                  </>
                ) : (
                  <>
                    <GoogleIcon name="check" size={14} />
                    {verificationMode === 'check-in' ? '✓ Complete Check In' : '✓ Complete Check Out'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enlarged Image Evidence Preview modal */}
      {selectedPreviewImage && (
        <div 
          className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4" 
          onClick={() => setSelectedPreviewImage(null)}
        >
          <div className="relative max-w-4xl max-h-[85vh] w-auto h-auto flex flex-col items-center">
            <button className="absolute top-[-35px] right-0 text-white font-bold text-xs bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded">✕ Close</button>
            <img src={selectedPreviewImage} alt="Evidence enlargement preview" className="max-w-full max-h-[80vh] rounded shadow-2xl object-contain border border-gold/20" />
          </div>
        </div>
      )}

      {/* Employee Work Update Details Drawer */}
      <WorkLogDrawer 
        isOpen={!!selectedWorkLog} 
        onClose={() => setSelectedWorkLog(null)} 
        log={selectedWorkLog} 
      />

      {/* Advanced Fullscreen Analytics Dashboard overlay */}
      <AttendanceAnalytics 
        isOpen={showAnalytics} 
        onClose={() => setShowAnalytics(false)} 
        user={user} 
        hotels={hotels} 
      />

      {/* Interactive 30-Day Employee Report Modal */}
      <EmployeeReportModal 
        isOpen={!!reportEmployeeId} 
        onClose={() => setReportEmployeeId(null)} 
        employeeId={reportEmployeeId || ''} 
      />

      {/* Root Admin Onboarding Approvals Modal */}
      {showApprovalModal && selectedPendingUser && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-card-dark border border-gold/30 rounded-2xl max-w-4xl w-full p-6 shadow-2xl flex flex-col md:flex-row gap-6 max-h-[90vh] overflow-y-auto">
            
            {/* Left Column: Pending Queue List */}
            <div className="w-full md:w-1/3 border-b md:border-b-0 md:border-r border-slate-800/80 pb-4 md:pb-0 pr-0 md:pr-6 flex flex-col">
              <h3 className="text-xs font-bold text-white mb-3 flex items-center gap-2 uppercase tracking-wider">
                📥 Pending Requests 
                <span className="bg-gold/15 text-gold text-[10px] px-2 py-0.5 rounded-full font-bold">
                  {pendingUsers.length}
                </span>
              </h3>
              <div className="space-y-2 overflow-y-auto max-h-[50vh] flex-1 pr-2">
                {pendingUsers.map((p) => (
                  <button
                    key={p._id}
                    onClick={() => {
                      setSelectedPendingUser(p);
                      setEditRole(p.role || '');
                      setEditDepartment(p.department || '');
                      setEditSalary(p.salaryDetails?.baseSalary?.toString() || '');
                    }}
                    className={`w-full text-left p-3 rounded-lg border transition-all text-xs cursor-pointer ${
                      selectedPendingUser._id === p._id
                        ? 'bg-gold/10 border-gold text-white font-semibold'
                        : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <p className="truncate text-slate-100">{p.firstName} {p.lastName}</p>
                    <p className="text-[10px] font-mono opacity-60 mt-0.5 truncate">{p.email}</p>
                    <span className="inline-block mt-2 text-[9px] bg-slate-850 px-1.5 py-0.5 rounded uppercase font-semibold text-gold border border-gold/10">
                      {p.role}
                    </span>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowApprovalModal(false)}
                className="mt-4 w-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold py-2 rounded text-xs transition-colors cursor-pointer"
              >
                Close Window
              </button>
            </div>

            {/* Right Column: Active Approval & optional fields Form */}
            <div className="flex-1 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Review Registration Details</h3>
                  <p className="text-slate-400 text-[10px] mt-0.5">Validate information, configure optional fields, and decide to approve or reject the request.</p>
                </div>
                <button
                  onClick={() => setShowApprovalModal(false)}
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* User Meta Data */}
              <div className="grid grid-cols-2 gap-4 bg-slate-950/40 p-4 rounded-xl border border-slate-800 text-xs">
                <div>
                  <p className="text-slate-500 font-semibold uppercase text-[9px]">Full Name</p>
                  <p className="text-white font-semibold mt-0.5">{selectedPendingUser.firstName} {selectedPendingUser.lastName}</p>
                </div>
                <div>
                  <p className="text-slate-500 font-semibold uppercase text-[9px]">Registered Email</p>
                  <p className="text-white font-mono mt-0.5">{selectedPendingUser.email}</p>
                </div>
                {user?.role === 'ROOT_ADMIN' && selectedPendingUser.password && (
                  <div>
                    <p className="text-amber-500 font-semibold uppercase text-[9px]">🔑 Login Password</p>
                    <p className="text-amber-400 font-mono mt-0.5 bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-900/40 w-fit">{selectedPendingUser.password}</p>
                  </div>
                )}
                <div>
                  <p className="text-slate-500 font-semibold uppercase text-[9px]">Mobile / Phone</p>
                  <p className="text-white mt-0.5">{selectedPendingUser.phone || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-slate-500 font-semibold uppercase text-[9px]">Property / Hotel</p>
                  <p className="text-gold font-semibold mt-0.5">
                    {selectedPendingUser.hotel?.name || 'No Hotel Associated'}
                  </p>
                </div>
                {selectedPendingUser.aadhaarNumber && (
                  <div>
                    <p className="text-slate-500 font-semibold uppercase text-[9px]">Aadhaar Number</p>
                    <p className="text-white font-mono mt-0.5">{selectedPendingUser.aadhaarNumber}</p>
                  </div>
                )}
                {selectedPendingUser.panNumber && (
                  <div>
                    <p className="text-slate-500 font-semibold uppercase text-[9px]">PAN Number</p>
                    <p className="text-white font-mono mt-0.5">{selectedPendingUser.panNumber}</p>
                  </div>
                )}
              </div>

              {/* Optional Parameters to Update */}
              <div className="space-y-3 p-4 bg-slate-950/20 rounded-xl border border-slate-800">
                <h4 className="text-[10px] font-bold text-gold uppercase tracking-wider">Configure Settings (Optional)</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1 text-[10px] uppercase">Designated Role</label>
                    <select
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value)}
                      className="w-full bg-slate-950/60 border border-slate-800 rounded p-1.5 text-white focus:outline-none focus:border-gold cursor-pointer"
                    >
                      <option value="EMPLOYEE">Employee</option>
                      <option value="DEPT_MANAGER">Department Manager</option>
                      <option value="HR_MANAGER">HR Manager</option>
                      <option value="HOTEL_ADMIN">Manager</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 font-semibold mb-1 text-[10px] uppercase">Department</label>
                    <input
                      type="text"
                      placeholder="e.g. Front Office"
                      value={editDepartment}
                      onChange={(e) => setEditDepartment(e.target.value)}
                      className="w-full bg-slate-950/60 border border-slate-800 rounded p-1.5 text-white focus:outline-none focus:border-gold"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-semibold mb-1 text-[10px] uppercase">Salary Details (INR)</label>
                    <input
                      type="number"
                      placeholder="e.g. 25000"
                      value={editSalary}
                      onChange={(e) => setEditSalary(e.target.value)}
                      className="w-full bg-slate-950/60 border border-slate-800 rounded p-1.5 text-white focus:outline-none focus:border-gold"
                    />
                  </div>
                </div>
              </div>

              {/* Uploaded Documents */}
              {selectedPendingUser.documents && selectedPendingUser.documents.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Uploaded Evidence / Documents</p>
                  <div className="flex flex-wrap gap-3">
                    {selectedPendingUser.documents.map((doc: any, idx: number) => (
                      <a
                        key={idx}
                        href={doc.fileUrl}
                        download={doc.name}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center bg-slate-900 border border-slate-800 hover:border-gold px-2.5 py-1.5 rounded text-[10px] text-gold font-semibold transition-colors"
                      >
                        📥 Download {doc.name}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Decision Action Buttons (Compulsory) */}
              <div className="flex gap-4 pt-4 border-t border-slate-800">
                <button
                  onClick={() => handleOnboardingAction(selectedPendingUser._id, 'reject')}
                  disabled={actionLoading}
                  className="flex-1 bg-red-650 hover:bg-red-550 text-white font-bold py-2.5 px-4 rounded-xl text-xs uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  ❌ Reject Signup
                </button>
                <button
                  onClick={() => handleOnboardingAction(selectedPendingUser._id, 'approve')}
                  disabled={actionLoading}
                  className="flex-1 bg-green-650 hover:bg-green-550 text-white font-bold py-2.5 px-4 rounded-xl text-xs uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-lg"
                >
                  ✅ Approve & Activate
                </button>
              </div>

            </div>

          </div>
        </div>
      )}
    </div>
  );
}
