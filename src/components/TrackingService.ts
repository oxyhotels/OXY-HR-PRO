'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useTrackingStore } from '@/store/trackingStore';
import { api } from '@/lib/api';

const TRACKING_INTERVAL = 2 * 60 * 1000; // 2 minutes

export function useGPSTracking(sessionId: string | null, isActive: boolean) {
  const { updateLocation, stopTracking } = useTrackingStore();
  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const sendLocationToServer = useCallback(async (lat: number, lng: number, accuracy: number, address: string) => {
    if (!sessionId) return;
    
    try {
      await api.post('/tracking/location', {
        sessionId,
        latitude: lat,
        longitude: lng,
        accuracy,
        address,
      });
    } catch (err) {
      console.error('Failed to send location:', err);
    }
  }, [sessionId]);

  const startTracking = useCallback(() => {
    if (!sessionId || !isActive) return;

    if (!navigator.geolocation) {
      console.warn('Geolocation not supported');
      return;
    }

    // Watch position for live updates
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        updateLocation(latitude, longitude, accuracy, 'Updating...');
      },
      (error) => {
        console.error('GPS watch error:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 5000,
      }
    );

    // Send location every 2 minutes
    intervalRef.current = setInterval(async () => {
      if (watchIdRef.current === null) return;
      
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          
          // Reverse geocode (simplified - use actual geocoding service in production)
          const address = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
          
          updateLocation(latitude, longitude, accuracy, address);
          await sendLocationToServer(latitude, longitude, accuracy, address);
        },
        (error) => {
          console.error('Location fetch error:', error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        }
      );
    }, TRACKING_INTERVAL);
  }, [sessionId, isActive, updateLocation, sendLocationToServer]);

  const cleanup = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    stopTracking();
  }, [stopTracking]);

  useEffect(() => {
    if (isActive && sessionId) {
      startTracking();
    } else {
      cleanup();
    }

    return cleanup;
  }, [isActive, sessionId, startTracking, cleanup]);

  return { startTracking, cleanup };
}