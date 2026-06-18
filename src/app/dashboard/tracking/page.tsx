'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import GoogleIcon from '@/components/GoogleIcon';

interface TrackingSession {
  _id: string;
  employee: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    department: string;
    designation: string;
    photoUrl?: string;
    role: string;
  };
  hotel: {
    _id: string;
    name: string;
    hotelCode: string;
  };
  department: string;
  role: string;
  startTime: string;
  checkInLatitude?: number;
  checkInLongitude?: number;
  checkInAddress?: string;
  totalDistance: number;
  locationUpdateCount: number;
}

type MarkerColor = 'green' | 'blue' | 'yellow' | 'red';

export default function TrackingPage() {
  const { user } = useAuthStore();
  const [sessions, setSessions] = useState<TrackingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<TrackingSession | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [L, setL] = useState<any>(null);

  const fetchActiveSessions = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);
      const res = await api.get('/tracking/active');
      if (res?.status === 'success' && res?.data?.sessions) {
        setSessions(res.data.sessions);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load tracking data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchActiveSessions();
    const interval = setInterval(() => fetchActiveSessions(false), 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const loadLeaflet = async () => {
      try {
        const leaflet = await import('leaflet');
        setL(leaflet);
        setLeafletLoaded(true);
      } catch (err) {
        console.error('Failed to load Leaflet:', err);
      }
    };
    loadLeaflet();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchActiveSessions(false);
  };

  const getMarkerColor = (session: TrackingSession): MarkerColor => {
    if (session.role === 'ROOT_ADMIN' || session.role === 'HOTEL_ADMIN') return 'blue';
    if (session.department === 'HR' || session.department === 'IT') return 'red';
    return 'green';
  };

  const markerIcons = useMemo(() => {
    if (!L) return null;
    return {
      green: new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      }),
      blue: new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      }),
      yellow: new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-yellow.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      }),
      red: new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      }),
    };
  }, [L]);

  const validSessions = useMemo(() => {
    return sessions.filter(s => s.checkInLatitude != null && s.checkInLongitude != null);
  }, [sessions]);

  const stats = useMemo(() => {
    const active = validSessions.length;
    const total = sessions.length;
    const offline = total - active;
    const managers = validSessions.filter(s => s.role === 'DEPT_MANAGER' || s.role === 'HR_MANAGER' || s.role === 'HOTEL_ADMIN').length;
    const employees = validSessions.filter(s => s.role === 'EMPLOYEE').length;
    return { active, total, offline, managers, employees };
  }, [sessions, validSessions]);

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  useEffect(() => {
    if (!leafletLoaded || !L || sessions.length === 0) return;

    const initMap = () => {
      const mapEl = document.getElementById('tracking-map');
      if (!mapEl) return;

      if ((window as any).__trackingMapInstance) {
        (window as any).__trackingMapInstance.remove();
        (window as any).__trackingMapInstance = null;
      }

      const map = L.map('tracking-map').setView([20.5937, 78.9629], 5);
      (window as any).__trackingMapInstance = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      const bounds = L.latLngBounds();

      const markerIcons = {
        green: L.icon({
          iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41],
        }),
        blue: L.icon({
          iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41],
        }),
        yellow: L.icon({
          iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-yellow.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41],
        }),
        red: L.icon({
          iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41],
        }),
      };

      function getColor(session: any) {
        if (session.role === 'ROOT_ADMIN' || session.role === 'HOTEL_ADMIN') return 'blue';
        if (session.department === 'HR' || session.department === 'IT') return 'red';
        return 'green';
      }

      sessions.forEach((session: any) => {
        if (session.checkInLatitude == null || session.checkInLongitude == null) return;
        const latLng = [session.checkInLatitude, session.checkInLongitude];
        bounds.extend(latLng);

        const color = getColor(session);
        const marker = L.marker(latLng, { icon: markerIcons[color] }).addTo(map);

        const popupContent = `
          <div style="font-family: system-ui, sans-serif; min-width: 220px; padding: 4px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid #e2e8f0;">
              <div style="width: 36px; height: 36px; border-radius: 50%; background: #f1f5f9; display: flex; align-items: center; justify-content: center; font-weight: bold; color: #334155; font-size: 12px;">
                ${session.employee.firstName[0]}${session.employee.lastName[0]}
              </div>
              <div>
                <div style="font-weight: 600; color: #0f172a; font-size: 13px;">${session.employee.firstName} ${session.employee.lastName}</div>
                <div style="color: #64748b; font-size: 11px;">${session.employee.designation}</div>
              </div>
            </div>
            <div style="display: grid; gap: 4px; font-size: 11px; color: #475569;">
              <div><strong>Department:</strong> ${session.department || 'N/A'}</div>
              <div><strong>Hotel:</strong> ${session.hotel?.name || 'N/A'}</div>
              <div><strong>Address:</strong> ${session.checkInAddress || 'N/A'}</div>
              <div><strong>Last Seen:</strong> ${new Date(session.startTime).toLocaleString()}</div>
              <div><strong>Coordinates:</strong> ${session.checkInLatitude.toFixed(6)}, ${session.checkInLongitude.toFixed(6)}</div>
            </div>
          </div>
        `;

        marker.bindPopup(popupContent);
      });

      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [40, 40] });
      }
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initMap);
    } else {
      initMap();
    }

    const handleResize = () => {
      if ((window as any).__trackingMapInstance) {
        (window as any).__trackingMapInstance.invalidateSize();
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [leafletLoaded, L, sessions]);

  if (loading || !leafletLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-600 text-sm font-medium">Loading tracking data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 md:px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-2">
              <GoogleIcon name="my_location" className="text-blue-600" size={28} />
              Employee Tracking
            </h1>
            <p className="text-slate-500 text-xs md:text-sm mt-1">Real-time location monitoring for operational staff</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            <GoogleIcon name="refresh" size={16} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-4 md:mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-red-700 text-sm">{error}</p>
          <button onClick={() => fetchActiveSessions()} className="mt-2 text-red-600 text-xs font-semibold hover:underline">
            Try Again
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="px-4 md:px-6 py-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-[10px] md:text-xs font-medium uppercase tracking-wider">Active Now</p>
                <p className="text-2xl md:text-3xl font-bold text-slate-900 mt-1">{stats.active}</p>
              </div>
              <div className="w-10 h-10 md:w-12 md:h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <GoogleIcon name="person" className="text-green-600" size={20} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-[10px] md:text-xs font-medium uppercase tracking-wider">Managers</p>
                <p className="text-2xl md:text-3xl font-bold text-slate-900 mt-1">{stats.managers}</p>
              </div>
              <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <GoogleIcon name="admin_panel_settings" className="text-blue-600" size={20} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-[10px] md:text-xs font-medium uppercase tracking-wider">Staff</p>
                <p className="text-2xl md:text-3xl font-bold text-slate-900 mt-1">{stats.employees}</p>
              </div>
              <div className="w-10 h-10 md:w-12 md:h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <GoogleIcon name="groups" className="text-purple-600" size={20} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-[10px] md:text-xs font-medium uppercase tracking-wider">Offline</p>
                <p className="text-2xl md:text-3xl font-bold text-slate-900 mt-1">{stats.offline}</p>
              </div>
              <div className="w-10 h-10 md:w-12 md:h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                <GoogleIcon name="wifi_off" className="text-slate-600" size={20} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Map and List */}
      <div className="px-4 md:px-6 pb-6">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-6">
          {/* Map */}
          <div className="xl:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-3 md:p-4 border-b border-slate-200">
              <h2 className="text-sm md:text-base font-bold text-slate-900 flex items-center gap-2">
                <GoogleIcon name="map" className="text-blue-600" size={18} />
                Live Location Map
              </h2>
              <p className="text-slate-500 text-[10px] md:text-xs mt-0.5">
                {validSessions.length} tracked {validSessions.length === 1 ? 'employee' : 'employees'} with GPS
              </p>
            </div>
            <div id="tracking-map" className="w-full h-[300px] md:h-[400px] lg:h-[500px]" />
          </div>

          {/* Employee List */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="p-3 md:p-4 border-b border-slate-200">
              <h2 className="text-sm md:text-base font-bold text-slate-900 flex items-center gap-2">
                <GoogleIcon name="list_alt" className="text-blue-600" size={18} />
                Active Sessions
              </h2>
              <p className="text-slate-500 text-[10px] md:text-xs mt-0.5">
                {sessions.length} total {sessions.length === 1 ? 'session' : 'sessions'}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[400px] md:max-h-[500px]">
              {sessions.length === 0 ? (
                <div className="p-8 text-center">
                  <GoogleIcon name="search_off" className="text-slate-300 mx-auto" size={48} />
                  <p className="text-slate-500 text-xs md:text-sm mt-3">No active tracking sessions</p>
                  <p className="text-slate-400 text-[10px] md:text-xs mt-1">Sessions appear when employees check in</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {sessions.map((session) => {
                    const hasLocation = session.checkInLatitude != null && session.checkInLongitude != null;
                    const markerColor = getMarkerColor(session);
                    const colorClasses: Record<MarkerColor, { bg: string; text: string; dot: string }> = {
                      green: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
                      blue: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
                      yellow: { bg: 'bg-yellow-50', text: 'text-yellow-700', dot: 'bg-yellow-500' },
                      red: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
                    };
                    const colors = colorClasses[markerColor];

                    return (
                      <div
                        key={session._id}
                        onClick={() => {
                          setSelectedSession(session);
                          if (hasLocation && L) {
                            setTimeout(() => {
                              const mapEl = document.getElementById('tracking-map');
                              if (mapEl && (window as any).__trackingMapInstance) {
                                const map = (window as any).__trackingMapInstance;
                                const latLng = new L.LatLng(session.checkInLatitude!, session.checkInLongitude!);
                                map.setView(latLng, 16);
                              }
                            }, 100);
                          }
                        }}
                        className={`p-3 md:p-4 cursor-pointer transition-colors hover:bg-slate-50 ${selectedSession?._id === session._id ? 'bg-blue-50' : ''}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-full ${colors.bg} flex items-center justify-center flex-shrink-0`}>
                            {session.employee.photoUrl ? (
                              <img src={session.employee.photoUrl} alt="" className="w-full h-full rounded-full object-cover" />
                            ) : (
                              <span className={`text-xs font-bold ${colors.text}`}>
                                {getInitials(session.employee.firstName, session.employee.lastName)}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-xs md:text-sm font-semibold text-slate-900 truncate">
                                {session.employee.firstName} {session.employee.lastName}
                              </p>
                              <span className={`w-2 h-2 rounded-full ${colors.dot} flex-shrink-0`} title={markerColor} />
                            </div>
                            <p className="text-[10px] md:text-xs text-slate-500 truncate">{session.employee.designation}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[9px] md:text-[10px] text-slate-400 font-medium">
                                {formatTime(session.startTime)}
                              </span>
                              <span className="text-slate-300">•</span>
                              <span className="text-[9px] md:text-[10px] text-slate-400 truncate">
                                {session.hotel?.name || 'N/A'}
                              </span>
                            </div>
                            {hasLocation && session.checkInAddress && (
                              <p className="text-[9px] md:text-[10px] text-slate-400 mt-1 truncate">
                                {session.checkInAddress}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}