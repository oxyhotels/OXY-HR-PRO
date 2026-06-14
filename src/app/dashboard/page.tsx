'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../lib/api';
import { useRouter } from 'next/navigation';
import { formatRole } from '../../lib/utils';
import GoogleIcon from '../../components/GoogleIcon';
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

  // Staff Graph Specific States
  const [selectedStaffLogs, setSelectedStaffLogs] = useState<any[]>([]);
  const [graphLoading, setGraphLoading] = useState(false);

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
    if (user?.role === 'ROOT_ADMIN' || user?.role === 'HOTEL_ADMIN') {
      fetchPendingUsers();
    }
    if (user && user.role !== 'EMPLOYEE') {
      fetchLiveAttendance();
    }
  }, [user]);

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
    .map(log => ({
      date: log.date,
      hours: log.totalWorkingHours || 0,
      breakMins: log.totalBreakMinutes || 0
    }));

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="relative glass-panel rounded-2xl p-6 md:p-8 overflow-hidden border border-gold/10">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <span className="text-xs font-bold text-gold uppercase tracking-wider">Hospitality Administration Hub</span>
            <h1 className="text-2xl md:text-3xl font-bold text-white mt-1">
              Welcome back, {user?.firstName} {user?.lastName}
            </h1>
            <p className="text-slate-400 text-sm mt-2 max-w-xl">
              You are logged in as <span className="text-gold font-semibold uppercase">{formatRole(user?.role)}</span>. Scoped tenant environment is active.
            </p>
          </div>
          <div className="flex items-center gap-3 bg-slate-950/40 border border-slate-800 rounded-xl px-4 py-3">
            <GoogleIcon name="calendar_today" className="text-gold" size={20} />
            <div className="text-xs">
              <p className="font-semibold text-slate-200">Shift Date</p>
              <p className="text-slate-400 font-mono">{currentDateStr}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div className={`p-4 rounded-xl border text-sm flex items-center gap-3 ${
          feedback.type === 'success' 
            ? 'bg-green-950/30 border-green-500/30 text-green-300' 
            : 'bg-red-950/30 border-red-500/30 text-red-300'
        }`}>
          <GoogleIcon name="info" size={18} />
          {feedback.message}
        </div>
      )}

      {/* Work Status Tracker (Visible to all EXCEPT ROOT_ADMIN) - Positioned immediately under Welcome/Feedback Banners */}
      {user?.role !== 'ROOT_ADMIN' && (
        <div className="bg-card-dark border border-slate-800/80 rounded-xl p-6 flex flex-col justify-between border-gold/10">
          <div>
            <h2 className="text-base font-bold text-white mb-2">Work Status Tracker</h2>
            <p className="text-slate-400 text-xs mb-6">Log your Work In, Work Out, and Break times for daily shift records.</p>
            
            {/* Clock View */}
            <div className="flex flex-col items-center justify-center bg-slate-950/50 border border-slate-900 rounded-xl p-6 mb-6">
              <GoogleIcon name="schedule" size={32} className="text-gold mb-2 animate-pulse" />
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">Today's Work Status</span>
              <span className="text-lg font-bold text-white mt-1">
                {todayAttendance ? (
                  todayAttendance.checkOut ? 'Work Shift Ended' : isBreakActive ? 'On Break' : 'Currently Active (Working)'
                ) : (
                  'Not Checked In'
                )}
              </span>

              {/* Dynamic running clock and assigned shift */}
              <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-4 bg-slate-900/60 border border-slate-800/80 px-4 py-2.5 rounded-xl w-full max-w-md">
                <div className="text-center sm:text-left flex-1">
                  <span className="text-[9px] text-slate-500 uppercase tracking-wider font-bold block">Current local time</span>
                  <span className="text-sm font-extrabold text-white font-mono">{currentTime || '--:--:--'}</span>
                </div>
                <div className="hidden sm:block w-[1px] h-6 bg-slate-800" />
                <div className="text-center sm:text-left flex-1">
                  <span className="text-[9px] text-slate-500 uppercase tracking-wider font-bold block">Assigned Shift Schedule</span>
                  <span className="text-xs font-bold text-gold">{user?.shift || 'General Shift (09:00 AM - 05:00 PM)'}</span>
                </div>
              </div>

              {todayAttendance && (
                <div className="mt-4 grid grid-cols-3 gap-8 text-center text-xs text-slate-400">
                  <div>
                    <p className="font-semibold text-slate-500 uppercase text-[9px]">Work-In Time</p>
                    <p className="text-slate-200 mt-1 font-mono">{new Date(todayAttendance.checkIn).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-500 uppercase text-[9px]">Break Mins</p>
                    <p className="text-slate-200 mt-1 font-mono">{todayAttendance.totalBreakMinutes || 0} min</p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-500 uppercase text-[9px]">Working Hours</p>
                    <p className="text-slate-200 mt-1 font-mono">{todayAttendance.totalWorkingHours || 0} hrs</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Triggers */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              onClick={() => handleAttendanceActionClick('check-in', 'Work In')}
              disabled={actionLoading || !!todayAttendance}
              className="bg-green-600 hover:bg-green-500 disabled:opacity-30 text-white text-xs font-bold py-3 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <GoogleIcon name="play_arrow" size={14} />
              Work In
            </button>

            <button
              onClick={() => handleAttendanceActionClick('break-start', 'Start Break')}
              disabled={actionLoading || !todayAttendance || isBreakActive || !!todayAttendance.checkOut}
              className="bg-amber-600 hover:bg-amber-500 disabled:opacity-30 text-white text-xs font-bold py-3 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <GoogleIcon name="coffee" size={14} />
              Start Break
            </button>

            <button
              onClick={() => handleAttendanceActionClick('break-end', 'End Break')}
              disabled={actionLoading || !todayAttendance || !isBreakActive || !!todayAttendance.checkOut}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-30 text-white text-xs font-bold py-3 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <GoogleIcon name="play_arrow" size={14} />
              End Break
            </button>

            <button
              onClick={() => handleAttendanceActionClick('check-out', 'Work Out')}
              disabled={actionLoading || !todayAttendance || !!todayAttendance.checkOut}
              className="bg-red-600 hover:bg-red-500 disabled:opacity-30 text-white text-xs font-bold py-3 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <GoogleIcon name="logout" size={14} />
              Work Out
            </button>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-card-dark border border-slate-800/80 rounded-xl p-5 hover:border-gold/30 transition-all gold-border-glow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Headcount</p>
              <h3 className="text-2xl font-bold mt-2 text-white">{stats?.totalEmployees || 0}</h3>
            </div>
            <div className="p-2.5 bg-slate-800 rounded-lg text-slate-300">
              <GoogleIcon name="group" size={18} />
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-4">Active operational staff</p>
        </div>

        <div className="bg-card-dark border border-slate-800/80 rounded-xl p-5 hover:border-gold/30 transition-all gold-border-glow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Attendance Rate</p>
              <h3 className="text-2xl font-bold mt-2 text-white">{stats?.attendanceRate || 0}%</h3>
            </div>
            <div className="p-2.5 bg-slate-800 rounded-lg text-slate-300">
              <GoogleIcon name="trending_up" size={18} />
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-4">Calculated for today</p>
        </div>

        <div className="bg-card-dark border border-slate-800/80 rounded-xl p-5 hover:border-gold/30 transition-all gold-border-glow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Leaves Review</p>
              <h3 className="text-2xl font-bold mt-2 text-white">{stats?.pendingLeaves || 0}</h3>
            </div>
            <div className="p-2.5 bg-slate-800 rounded-lg text-slate-300">
              <GoogleIcon name="calendar_today" size={18} />
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-4">Requests pending approval</p>
        </div>

        <div className="bg-card-dark border border-slate-800/80 rounded-xl p-5 hover:border-gold/30 transition-all gold-border-glow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Pending Tasks</p>
              <h3 className="text-2xl font-bold mt-2 text-white">{stats?.pendingTasks || 0}</h3>
            </div>
            <div className="p-2.5 bg-slate-800 rounded-lg text-slate-300">
              <GoogleIcon name="check_circle" size={18} />
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-4">Tasks in progress / todo</p>
        </div>
      </div>

      {/* Row 1: Pending Onboarding banner */}
      {(user?.role === 'ROOT_ADMIN' || user?.role === 'HOTEL_ADMIN') && pendingUsers.length > 0 && (
        <div className="bg-amber-950/20 border border-amber-500/20 rounded-xl p-4 flex items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-amber-500/10 text-amber-500 rounded-lg animate-pulse font-sans">🔔</span>
            <div>
              <p className="font-bold text-slate-200">Pending Onboarding Approvals Queue</p>
              <p className="text-slate-400 mt-0.5 font-sans">There are {pendingUsers.length} newly registered employee/manager accounts waiting for credential verification.</p>
            </div>
          </div>
          <button
            onClick={() => setShowApprovalModal(true)}
            className="bg-amber-500 hover:bg-amber-600 text-slate-dark font-bold px-4 py-2 rounded-lg cursor-pointer transition-colors whitespace-nowrap"
          >
            Review Requests ({pendingUsers.length})
          </button>
        </div>
      )}

      {/* Row 2: Staff Allocation (Visible to all EXCEPT ROOT_ADMIN) */}
      {user?.role !== 'ROOT_ADMIN' && (
        <div className="bg-card-dark border border-slate-800/80 rounded-xl p-6 flex flex-col justify-between border-gold/10">
          <div>
            <h2 className="text-base font-bold text-white mb-2">Staff Allocation</h2>
            <p className="text-slate-404 text-xs mb-6">Distribution of active employees across hotel departments.</p>

            <div className="space-y-4">
              {depts.map((d) => (
                <div key={d._id} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-300">{d._id || 'Operations'}</span>
                    <span className="text-gold">{d.count} staff</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gold rounded-full" 
                      style={{ width: `${Math.min(100, (d.count / (stats?.totalEmployees || 1)) * 100)}%` }} 
                    />
                  </div>
                </div>
              ))}

              {depts.length === 0 && (
                <div className="text-center py-6 text-slate-500 text-xs">
                  No department distribution data available.
                </div>
              )}
            </div>
          </div>

          <div className="pt-6 border-t border-slate-800/40">
            <a href="/dashboard/employees" className="text-xs text-gold hover:text-gold-light transition-colors flex items-center gap-1">
              View Staff Directory
              <GoogleIcon name="arrow_forward" size={14} />
            </a>
          </div>
        </div>
      )}

      {/* Row 3: Employee Work Updates Logs & Search Directory (Visible to ROOT_ADMIN, HOTEL_ADMIN, and HR_MANAGER) */}
      {(user?.role === 'ROOT_ADMIN' || user?.role === 'HOTEL_ADMIN' || user?.role === 'HR_MANAGER') && (
        <div className="bg-card-dark border border-slate-800/80 rounded-xl p-6 border-gold/10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-base font-bold text-white">Employee Work Updates Logs</h2>
              <p className="text-slate-400 text-xs mt-0.5">Historical shift logs, daily tasks summaries, and evidence documents.</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <GoogleIcon name="search" className="absolute left-3 top-2.5 text-slate-500" size={16} />
                <input
                  type="text"
                  placeholder="Search Name, Aadhaar, PAN..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-slate-950/60 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-white w-64 focus:outline-none focus:border-gold"
                />
              </div>
              <button
                onClick={fetchLiveAttendance}
                disabled={attendanceLoading}
                className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-gold px-3 py-1.5 rounded border border-slate-700 disabled:opacity-40"
              >
                {attendanceLoading ? 'Refreshing...' : 'Refresh Logs'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Updates Table Column */}
            <div className="xl:col-span-2 space-y-4">
              <div className="overflow-x-auto border border-slate-800/80 rounded-lg">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-950/40 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                      <th className="p-3">Staff Details</th>
                      <th className="p-3">Shift Date</th>
                      <th className="p-3">Hours Details</th>
                      <th className="p-3">Work description & Evidence</th>
                      <th className="p-3 text-right">Analytics</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {filteredLogs.map((log) => (
                      <tr 
                        key={log._id} 
                        className={`hover:bg-slate-900/20 transition-colors cursor-pointer ${selectedStaffId === log.employee?._id ? 'bg-gold/5 border-l-2 border-l-gold' : ''}`}
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
                            <div className="w-12 h-12 rounded-lg bg-slate-800 border border-slate-700 flex-shrink-0 overflow-hidden relative group">
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
                                    <span className="text-[7px] text-gold font-bold uppercase">View</span>
                                  </div>
                                </>
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-500 bg-slate-900/40 font-bold uppercase text-xs">
                                  {log.employee ? `${log.employee.firstName[0]}${log.employee.lastName[0]}` : '??'}
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="font-semibold text-white">{log.employee?.firstName} {log.employee?.lastName}</div>
                              <div className="text-slate-500 font-mono text-[10px]">{log.employee?.email}</div>
                              <div className="text-[10px] text-slate-400 mt-0.5 uppercase font-semibold text-gold">Role: {formatRole(log.employee?.role)} | Shift: {log.employee?.shift || 'General Shift'}</div>
                              <div className="text-slate-500 text-[10px] mt-0.5">Property: <span className="text-slate-300 font-semibold">{log.hotel?.name || 'N/A'} ({log.hotel?.code?.toUpperCase() || 'N/A'})</span></div>
                              <div className="text-[9px] text-slate-500 mt-1">Aadhaar: {log.employee?.aadhaarNumber || 'N/A'} | PAN: {log.employee?.panNumber || 'N/A'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 font-mono">
                          {log.date}
                        </td>
                        <td className="p-3 space-y-1">
                          <div><span className="text-slate-500 uppercase text-[9px]">Check-In:</span> {log.checkIn ? new Date(log.checkIn).toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}</div>
                          <div><span className="text-slate-500 uppercase text-[9px]">Check-Out:</span> {log.checkOut ? new Date(log.checkOut).toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}</div>
                          <div className="text-[10px] font-semibold text-slate-200">Hours: {log.totalWorkingHours} hrs</div>
                          {log.checkInLatitude !== undefined && (
                            <div className="text-[9px] text-green-400 font-mono mt-0.5">
                              📍 {log.checkInLatitude.toFixed(4)}°, {log.checkInLongitude?.toFixed(4)}°
                            </div>
                          )}
                        </td>
                        <td className="p-3 max-w-xs">
                          {log.workDescription ? (
                            <div className="space-y-1.5">
                              <p className="text-slate-200 leading-relaxed font-sans text-xs bg-slate-950/30 p-2.5 rounded border border-slate-850/60">
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
                                  className="text-[10px] text-gold hover:text-gold-light hover:underline font-bold transition-all cursor-pointer inline-flex items-center gap-0.5"
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
                                  className="text-[10px] text-gold hover:text-gold-light hover:underline font-bold transition-all cursor-pointer inline-flex items-center gap-0.5"
                                >
                                  View Evidence &rarr;
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-500 italic">No checkout work update submitted yet</span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (log.employee) {
                                router.push(`/dashboard/analytics?employeeId=${log.employee._id}`);
                              }
                            }}
                            className="bg-slate-800 text-slate-300 hover:text-gold border border-slate-700 px-2.5 py-1.5 rounded transition-colors text-[10px] uppercase font-bold cursor-pointer"
                          >
                            Analytics
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredLogs.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center p-8 text-slate-500 italic">
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
                <div className="bg-slate-950/40 border border-slate-800 rounded-lg p-5 space-y-4 h-full flex flex-col justify-between border-gold/10">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <h3 className="font-bold text-white text-xs">Work Hours Trend</h3>
                      <button 
                        onClick={() => {
                          setSelectedStaffId(null);
                          setSelectedStaffName('');
                        }} 
                        className="text-slate-400 hover:text-white"
                      >
                        ✕
                      </button>
                    </div>
                    <p className="text-gold font-semibold text-[11px] mb-6 uppercase tracking-wider">{selectedStaffName}</p>

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
                            <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                            <XAxis dataKey="date" stroke="#64748B" fontSize={9} tickLine={false} />
                            <YAxis stroke="#64748B" fontSize={9} tickLine={false} />
                            <Tooltip 
                              contentStyle={{ backgroundColor: '#0B0F19', borderColor: '#334155', borderRadius: '6px', fontSize: '10px', color: '#fff' }}
                              labelStyle={{ color: '#D4AF37', fontWeight: 'bold' }}
                            />
                            <Area type="monotone" dataKey="hours" name="Work Hours" stroke="#D4AF37" strokeWidth={2} fillOpacity={1} fill="url(#colorHours)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="text-center py-16 text-slate-500 italic text-[11px]">
                        No historical check-out hours logged for this staff member.
                      </div>
                    )}
                  </div>
                  
                  <div className="text-[10px] text-slate-500 pt-3 border-t border-slate-800/40">
                    Shows daily checked-in duty hours for the selected employee.
                  </div>
                </div>
              ) : (
                <div className="bg-slate-950/20 border border-slate-800 border-dashed rounded-lg p-8 text-center h-full flex flex-col items-center justify-center text-slate-500 italic text-xs">
                  <GoogleIcon name="trending_up" size={24} className="text-slate-600 mb-2" />
                  Select a staff member from the logs table to view their work updates productivity analytics graph.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Work Out Evidence Input Modal */}
      {workOutModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card-dark border border-gold/30 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
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
                  className="bg-slate-800 text-slate-350 hover:bg-slate-700 px-4 py-2 rounded font-bold cursor-pointer"
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

      {/* Employee Work Update Details Modal */}
      {selectedWorkLog && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-card-dark border border-gold/30 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-6 animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="flex justify-between items-start border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-gold/30 text-gold font-bold text-sm">
                  {selectedWorkLog.employee?.photoUrl ? (
                    <img src={selectedWorkLog.employee.photoUrl} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    selectedWorkLog.employee?.firstName?.[0] || 'U'
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">
                    {selectedWorkLog.employee?.firstName} {selectedWorkLog.employee?.lastName}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-slate-400 font-mono">{selectedWorkLog.employee?.email}</span>
                    <span className="w-1 h-1 rounded-full bg-slate-600" />
                    <span className="text-[9px] bg-gold/10 text-gold border border-gold/10 px-1.5 py-0.5 rounded font-semibold uppercase">
                      {selectedWorkLog.employee?.role ? formatRole(selectedWorkLog.employee.role) : 'Staff'}
                    </span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setSelectedWorkLog(null)} 
                className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <GoogleIcon name="close" size={18} />
              </button>
            </div>

            {/* Info Summary Row */}
            <div className="grid grid-cols-3 gap-4 bg-slate-950/40 p-4 rounded-xl border border-slate-900 text-xs">
              <div>
                <p className="text-slate-500 font-semibold uppercase text-[9px]">Shift Date</p>
                <p className="text-slate-200 font-semibold font-mono mt-0.5">{selectedWorkLog.date}</p>
              </div>
              <div>
                <p className="text-slate-500 font-semibold uppercase text-[9px]">Check-In / Out</p>
                <p className="text-slate-200 mt-0.5">
                  {selectedWorkLog.checkIn ? new Date(selectedWorkLog.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                  {' '}→{' '}
                  {selectedWorkLog.checkOut ? new Date(selectedWorkLog.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Active'}
                </p>
              </div>
              <div>
                <p className="text-slate-500 font-semibold uppercase text-[9px]">Duty Hours</p>
                <p className="text-gold font-bold mt-0.5">{selectedWorkLog.totalWorkingHours || 0} hrs</p>
              </div>
            </div>

            {/* GPS, Selfie & Property Verification Info */}
            <div className="space-y-3 p-4 bg-slate-950/40 rounded-xl border border-slate-900 text-xs">
              <h4 className="text-[10px] font-bold text-gold uppercase tracking-wider">🔒 Check-In Verification Info</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <p className="text-slate-500 font-semibold uppercase text-[9px]">Property Name</p>
                  <p className="text-slate-200 font-semibold mt-0.5">{selectedWorkLog.hotel?.name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-slate-500 font-semibold uppercase text-[9px]">Property Code</p>
                  <p className="text-slate-200 font-semibold font-mono mt-0.5 uppercase">{selectedWorkLog.hotel?.code || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-slate-500 font-semibold uppercase text-[9px]">Shift</p>
                  <p className="text-slate-200 font-semibold mt-0.5">{selectedWorkLog.employee?.shift || 'General Shift'}</p>
                </div>
                <div>
                  <p className="text-slate-500 font-semibold uppercase text-[9px]">GPS Coordinates</p>
                  {selectedWorkLog.checkInLatitude !== undefined ? (
                    <p className="text-slate-200 font-mono mt-0.5">
                      {selectedWorkLog.checkInLatitude.toFixed(4)}°, {selectedWorkLog.checkInLongitude?.toFixed(4)}°
                    </p>
                  ) : (
                    <p className="text-slate-505 italic mt-0.5 text-slate-500">No GPS (Exempt)</p>
                  )}
                </div>
              </div>

              {/* Check-In Selfie Preview */}
              {selectedWorkLog.checkInPhoto && (
                <div className="mt-3 space-y-1.5">
                  <p className="text-slate-500 font-semibold uppercase text-[9px]">Check-In Selfie</p>
                  <div className="relative w-32 aspect-square rounded-lg overflow-hidden border border-slate-805 hover:border-gold/30 transition-colors">
                    <img 
                      src={selectedWorkLog.checkInPhoto} 
                      alt="Check-in Selfie" 
                      className="w-full h-full object-cover"
                    />
                    <div 
                      className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
                      onClick={() => setSelectedPreviewImage(selectedWorkLog.checkInPhoto)}
                    >
                      <span className="text-[8px] bg-slate-900/90 text-gold px-1.5 py-0.5 rounded border border-gold/20 font-bold uppercase">
                        View
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Work Description */}
            <div className="space-y-2">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">📋 Daily Task Update Summary</h4>
              <div className="bg-slate-950/60 border border-slate-850 p-4 rounded-xl max-h-[180px] overflow-y-auto">
                <p className="text-slate-200 leading-relaxed font-sans text-xs whitespace-pre-wrap">
                  {selectedWorkLog.workDescription}
                </p>
              </div>
            </div>

            {/* Evidence Attachments */}
            {(selectedWorkLog.workPictureUrl || selectedWorkLog.workVideoUrl) && (
              <div className="space-y-2.5">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">📸 Submitted Duty Evidence</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedWorkLog.workPictureUrl && (
                    <div className="flex flex-col bg-slate-950/40 border border-slate-900 rounded-xl p-3 items-center">
                      <span className="text-[9px] text-slate-500 uppercase font-semibold mb-2 self-start">Duty Snapshot</span>
                      <div className="relative w-full aspect-video rounded-lg overflow-hidden group border border-slate-800 hover:border-gold/30 transition-colors">
                        <img 
                          src={selectedWorkLog.workPictureUrl} 
                          alt="Work evidence photo" 
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <div 
                          className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
                          onClick={() => {
                            setSelectedPreviewImage(selectedWorkLog.workPictureUrl);
                          }}
                        >
                          <span className="text-[10px] bg-slate-900/90 text-gold px-2.5 py-1 rounded-md border border-gold/20 font-bold uppercase tracking-wider">
                            Enlarge Image
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedWorkLog.workVideoUrl && (
                    <div className="flex flex-col bg-slate-950/40 border border-slate-900 rounded-xl p-3 items-center">
                      <span className="text-[9px] text-slate-500 uppercase font-semibold mb-2 self-start">Video Summary</span>
                      <div className="w-full aspect-video rounded-lg overflow-hidden bg-black border border-slate-800">
                        <video 
                          src={selectedWorkLog.workVideoUrl} 
                          controls 
                          className="w-full h-full object-contain"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedWorkLog(null)}
                className="bg-slate-850 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white px-5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Close Review
              </button>
            </div>
          </div>
        </div>
      )}

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
