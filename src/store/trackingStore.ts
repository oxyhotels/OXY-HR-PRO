import { create } from 'zustand';

export interface TrackingState {
  // Current session
  currentSessionId: string | null;
  isTracking: boolean;
  watchId: number | null;
  
  // Current location
  currentLatitude: number | null;
  currentLongitude: number | null;
  currentAccuracy: number | null;
  currentAddress: string | null;
  lastUpdateTime: Date | null;
  
  // Actions
  startTracking: (sessionId: string) => void;
  stopTracking: () => void;
  updateLocation: (lat: number, lng: number, accuracy: number, address: string) => void;
  setTrackingState: (isActive: boolean) => void;
}

export const useTrackingStore = create<TrackingState>((set) => ({
  currentSessionId: null,
  isTracking: false,
  watchId: null,
  currentLatitude: null,
  currentLongitude: null,
  currentAccuracy: null,
  currentAddress: null,
  lastUpdateTime: null,

  startTracking: (sessionId) => set({
    currentSessionId: sessionId,
    isTracking: true,
    watchId: null,
  }),

  stopTracking: () => set({
    currentSessionId: null,
    isTracking: false,
    watchId: null,
    currentLatitude: null,
    currentLongitude: null,
    currentAccuracy: null,
    currentAddress: null,
    lastUpdateTime: null,
  }),

  updateLocation: (lat, lng, accuracy, address) => set({
    currentLatitude: lat,
    currentLongitude: lng,
    currentAccuracy: accuracy,
    currentAddress: address,
    lastUpdateTime: new Date(),
  }),

  setTrackingState: (isActive) => set({ isTracking: isActive }),
}));