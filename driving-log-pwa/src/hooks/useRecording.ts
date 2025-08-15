import { useState, useEffect, useCallback, useRef } from 'react';
import { DrivingLog, DrivingLogStatus, Location, LocationType } from '../types';
import { DrivingLogController } from '../controllers/DrivingLogController';
import { LocationController } from '../controllers/LocationController';
import { StorageService } from '../services/StorageService';
import { TIMER_INTERVAL, AUTO_WAYPOINT_DISTANCE_THRESHOLD, GPS_SIGNAL_THRESHOLDS, WAYPOINT_TYPE_LABELS } from '../constants/recording';

export interface GPSStatus {
  isAvailable: boolean;
  accuracy: number;
  signal: 'excellent' | 'good' | 'fair' | 'poor' | 'none';
  lastUpdate: Date;
}

export interface Waypoint {
  id: string;
  location: Location;
  timestamp: Date;
  name?: string;
  type: WaypointType;
  notes?: string;
}

export type WaypointType = 'start' | 'end' | 'fuel' | 'rest' | 'parking' | 'other';

export interface RecordingStatistics {
  distance: number;
  averageSpeed: number;
  maxSpeed: number;
  stopTime: number;
  movingTime: number;
}

export interface RecordingError {
  type: 'GPS' | 'STORAGE' | 'BATTERY' | 'NETWORK';
  message: string;
  recoverable: boolean;
  action?: () => void;
}

export interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  startTime?: Date;
  elapsedTime: number;
  currentLocation?: Location;
  gpsStatus: GPSStatus;
  waypoints: Waypoint[];
  statistics: RecordingStatistics;
  errors: RecordingError[];
}

export interface RecordingActions {
  startRecording: () => Promise<void>;
  pauseRecording: () => void;
  resumeRecording: () => void;
  completeRecording: () => Promise<DrivingLog>;
  cancelRecording: () => void;
  addWaypoint: (name?: string, type?: WaypointType) => Promise<void>;
  updateWaypointName: (id: string, name: string) => void;
  removeWaypoint: (id: string) => void;
  dismissError: (index: number) => void;
}

export interface UseRecording {
  state: RecordingState;
  actions: RecordingActions;
}

// Create singleton instances
let storageService: StorageService | null = null;
let locationController: LocationController | null = null;
let drivingLogController: DrivingLogController | null = null;

function getControllers() {
  if (!storageService) {
    storageService = new StorageService();
    locationController = new LocationController();
    drivingLogController = new DrivingLogController(locationController, storageService);
  }
  return { drivingLogController: drivingLogController!, locationController: locationController! };
}

export function useRecording(): UseRecording {
  const [state, setState] = useState<RecordingState>({
    isRecording: false,
    isPaused: false,
    startTime: undefined,
    elapsedTime: 0,
    currentLocation: undefined,
    gpsStatus: {
      isAvailable: true,
      accuracy: 5.0,
      signal: 'excellent',
      lastUpdate: new Date()
    },
    waypoints: [],
    statistics: {
      distance: 0,
      averageSpeed: 0,
      maxSpeed: 0,
      stopTime: 0,
      movingTime: 0
    },
    errors: []
  });

  const currentRecordId = useRef<string | null>(null);
  const locationWatchId = useRef<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastLocation = useRef<Location | null>(null);
  const pauseStartTime = useRef<Date | null>(null);
  const totalPauseTime = useRef<number>(0);

  // Calculate GPS signal strength based on accuracy
  const getGPSSignal = useCallback((accuracy: number): GPSStatus['signal'] => {
    if (accuracy <= GPS_SIGNAL_THRESHOLDS.EXCELLENT) return 'excellent';
    if (accuracy <= GPS_SIGNAL_THRESHOLDS.GOOD) return 'good';
    if (accuracy <= GPS_SIGNAL_THRESHOLDS.FAIR) return 'fair';
    if (accuracy <= GPS_SIGNAL_THRESHOLDS.POOR) return 'poor';
    return 'none';
  }, []);

  // Update elapsed time
  const updateElapsedTime = useCallback(() => {
    setState(prev => {
      if (!prev.isRecording || prev.isPaused || !prev.startTime) return prev;
      
      const now = new Date();
      const elapsed = Math.floor((now.getTime() - prev.startTime.getTime()) / 1000) - totalPauseTime.current;
      
      return {
        ...prev,
        elapsedTime: Math.max(0, elapsed)
      };
    });
  }, []);

  // Start timer
  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(updateElapsedTime, TIMER_INTERVAL);
  }, [updateElapsedTime]);

  // Stop timer
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Calculate statistics
  const calculateStatistics = useCallback((waypoints: Waypoint[], elapsedTime: number): RecordingStatistics => {
    const { drivingLogController } = getControllers();
    
    if (waypoints.length < 2) {
      return {
        distance: 0,
        averageSpeed: 0,
        maxSpeed: 0,
        stopTime: 0,
        movingTime: 0
      };
    }

    let totalDistance = 0;
    let maxSpeed = 0;
    let movingTime = 0;

    for (let i = 1; i < waypoints.length; i++) {
      const prevWaypoint = waypoints[i - 1];
      const currentWaypoint = waypoints[i];
      
      const distance = drivingLogController.calculateDistance(
        prevWaypoint.location,
        currentWaypoint.location
      );
      totalDistance += distance;

      const timeDiff = (currentWaypoint.timestamp.getTime() - prevWaypoint.timestamp.getTime()) / 1000 / 3600; // hours
      if (timeDiff > 0) {
        const speed = distance / timeDiff;
        maxSpeed = Math.max(maxSpeed, speed);
        movingTime += timeDiff * 3600; // convert back to seconds
      }
    }

    const totalTime = elapsedTime;
    const stopTime = Math.max(0, totalTime - movingTime);
    const averageSpeed = movingTime > 0 ? totalDistance / (movingTime / 3600) : 0;

    return {
      distance: totalDistance,
      averageSpeed,
      maxSpeed,
      stopTime,
      movingTime
    };
  }, []);

  // Handle location updates
  const handleLocationUpdate = useCallback((location: Location) => {
    const { locationController } = getControllers();
    
    setState(prev => {
      const accuracy = locationController.getLocationAccuracy();
      const signal = getGPSSignal(accuracy);
      
      const newGpsStatus: GPSStatus = {
        isAvailable: true,
        accuracy,
        signal,
        lastUpdate: new Date()
      };

      // Add location as waypoint if recording
      let newWaypoints = prev.waypoints;
      if (prev.isRecording && !prev.isPaused) {
        // Add automatic waypoint for significant location changes
        if (!lastLocation.current || 
            locationController.calculateDistance(lastLocation.current, location) > AUTO_WAYPOINT_DISTANCE_THRESHOLD) {
          const waypoint: Waypoint = {
            id: `wp-${Date.now()}`,
            location,
            timestamp: new Date(),
            type: 'other'
          };
          newWaypoints = [...prev.waypoints, waypoint];
          lastLocation.current = location;
        }
      }

      const newStatistics = calculateStatistics(newWaypoints, prev.elapsedTime);

      return {
        ...prev,
        currentLocation: location,
        gpsStatus: newGpsStatus,
        waypoints: newWaypoints,
        statistics: newStatistics
      };
    });
  }, [getGPSSignal, calculateStatistics]);

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      const { drivingLogController, locationController } = getControllers();
      
      // Check GPS availability
      const isAvailable = await locationController.isLocationAvailable();
      if (!isAvailable) {
        setState(prev => ({
          ...prev,
          errors: [...prev.errors, {
            type: 'GPS',
            message: 'GPS機能が利用できません。位置情報を有効にしてください。',
            recoverable: true,
            action: startRecording
          }]
        }));
        return;
      }

      // Start recording
      const recordingLog = await drivingLogController.quickStart();
      currentRecordId.current = recordingLog.id;
      
      // Get initial location
      const currentLocation = await locationController.getCurrentLocation();
      
      // Start location monitoring
      locationWatchId.current = locationController.watchLocation(handleLocationUpdate);
      
      // Initialize with start waypoint
      const startWaypoint: Waypoint = {
        id: `wp-start-${Date.now()}`,
        location: currentLocation,
        timestamp: new Date(),
        name: '出発地',
        type: 'start'
      };

      const startTime = new Date();
      totalPauseTime.current = 0;
      
      setState(prev => ({
        ...prev,
        isRecording: true,
        isPaused: false,
        startTime,
        elapsedTime: 0,
        currentLocation,
        waypoints: [startWaypoint],
        errors: []
      }));

      // Start timer
      startTimer();

      // Handle initial location
      handleLocationUpdate(currentLocation);
      
    } catch (error) {
      console.error('Recording start failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'GPS信号を取得できません';
      setState(prev => ({
        ...prev,
        errors: [...prev.errors, {
          type: 'GPS',
          message: errorMessage,
          recoverable: true,
          action: startRecording
        }]
      }));
    }
  }, [handleLocationUpdate, startTimer]);

  // Pause recording
  const pauseRecording = useCallback(() => {
    const { locationController } = getControllers();
    
    if (locationWatchId.current) {
      locationController.stopWatchingLocation(locationWatchId.current);
      locationWatchId.current = null;
    }
    
    stopTimer();
    pauseStartTime.current = new Date();
    
    setState(prev => ({
      ...prev,
      isPaused: true
    }));
  }, [stopTimer]);

  // Resume recording
  const resumeRecording = useCallback(() => {
    const { locationController } = getControllers();
    
    // Calculate pause time
    if (pauseStartTime.current) {
      const pauseDuration = (new Date().getTime() - pauseStartTime.current.getTime()) / 1000;
      totalPauseTime.current += pauseDuration;
      pauseStartTime.current = null;
    }
    
    // Resume location monitoring
    locationWatchId.current = locationController.watchLocation(handleLocationUpdate);
    
    setState(prev => ({
      ...prev,
      isPaused: false
    }));
    
    startTimer();
  }, [handleLocationUpdate, startTimer]);

  // Complete recording
  const completeRecording = useCallback(async (): Promise<DrivingLog> => {
    const { drivingLogController, locationController } = getControllers();
    
    if (!currentRecordId.current) {
      throw new Error('No active recording found');
    }

    try {
      // Stop monitoring
      if (locationWatchId.current) {
        locationController.stopWatchingLocation(locationWatchId.current);
        locationWatchId.current = null;
      }
      stopTimer();

      // Complete the recording
      const completedLog = await drivingLogController.completeLog(currentRecordId.current);
      
      // Reset state
      setState(prev => ({
        ...prev,
        isRecording: false,
        isPaused: false,
        startTime: undefined,
        elapsedTime: 0,
        currentLocation: undefined,
        waypoints: [],
        statistics: {
          distance: 0,
          averageSpeed: 0,
          maxSpeed: 0,
          stopTime: 0,
          movingTime: 0
        }
      }));

      currentRecordId.current = null;
      lastLocation.current = null;
      totalPauseTime.current = 0;

      return completedLog;
    } catch (error) {
      console.error('Recording completion failed:', error);
      setState(prev => ({
        ...prev,
        errors: [...prev.errors, {
          type: 'STORAGE',
          message: '記録の保存に失敗しました',
          recoverable: true,
          action: () => completeRecording()
        }]
      }));
      throw error;
    }
  }, [stopTimer]);

  // Cancel recording
  const cancelRecording = useCallback(() => {
    const { drivingLogController, locationController } = getControllers();
    
    if (locationWatchId.current) {
      locationController.stopWatchingLocation(locationWatchId.current);
      locationWatchId.current = null;
    }
    
    stopTimer();

    if (currentRecordId.current) {
      drivingLogController.deleteLog(currentRecordId.current);
    }

    setState(prev => ({
      ...prev,
      isRecording: false,
      isPaused: false,
      startTime: undefined,
      elapsedTime: 0,
      currentLocation: undefined,
      waypoints: [],
      statistics: {
        distance: 0,
        averageSpeed: 0,
        maxSpeed: 0,
        stopTime: 0,
        movingTime: 0
      }
    }));

    currentRecordId.current = null;
    lastLocation.current = null;
    totalPauseTime.current = 0;
  }, [stopTimer]);

  // Add waypoint
  const addWaypoint = useCallback(async (name?: string, type: WaypointType = 'other') => {
    const { drivingLogController, locationController } = getControllers();
    
    if (!state.isRecording || !currentRecordId.current) {
      return;
    }

    try {
      const currentLocation = await locationController.getCurrentLocation();
      
      const waypoint: Waypoint = {
        id: `wp-${Date.now()}`,
        location: currentLocation,
        timestamp: new Date(),
        name: name || getDefaultWaypointName(type),
        type,
        notes: ''
      };

      await drivingLogController.quickAddWaypoint(waypoint);

      setState(prev => ({
        ...prev,
        waypoints: [...prev.waypoints, waypoint]
      }));
    } catch (error) {
      console.error('Waypoint add failed:', error);
      setState(prev => ({
        ...prev,
        errors: [...prev.errors, {
          type: 'GPS',
          message: '地点の追加に失敗しました',
          recoverable: true,
          action: () => addWaypoint(name, type)
        }]
      }));
    }
  }, [state.isRecording]);

  // Update waypoint name
  const updateWaypointName = useCallback((id: string, name: string) => {
    setState(prev => ({
      ...prev,
      waypoints: prev.waypoints.map(wp => 
        wp.id === id ? { ...wp, name } : wp
      )
    }));
  }, []);

  // Remove waypoint
  const removeWaypoint = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      waypoints: prev.waypoints.filter(wp => wp.id !== id)
    }));
  }, []);

  // Dismiss error
  const dismissError = useCallback((index: number) => {
    setState(prev => ({
      ...prev,
      errors: prev.errors.filter((_, i) => i !== index)
    }));
  }, []);

  // Initialize GPS status on mount
  useEffect(() => {
    const { locationController } = getControllers();
    
    const initializeGPS = async () => {
      try {
        const isAvailable = await locationController.isLocationAvailable();
        setState(prev => ({
          ...prev,
          gpsStatus: {
            ...prev.gpsStatus,
            isAvailable
          }
        }));
      } catch (error) {
        setState(prev => ({
          ...prev,
          gpsStatus: {
            ...prev.gpsStatus,
            isAvailable: false,
            signal: 'none'
          }
        }));
      }
    };

    initializeGPS();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const { locationController } = getControllers();
      
      if (locationWatchId.current) {
        locationController.stopWatchingLocation(locationWatchId.current);
      }
      stopTimer();
    };
  }, [stopTimer]);

  return {
    state,
    actions: {
      startRecording,
      pauseRecording,
      resumeRecording,
      completeRecording,
      cancelRecording,
      addWaypoint,
      updateWaypointName,
      removeWaypoint,
      dismissError
    }
  };
}

// Helper function to get default waypoint name
function getDefaultWaypointName(type: WaypointType): string {
  return WAYPOINT_TYPE_LABELS[type] || WAYPOINT_TYPE_LABELS.other;
}