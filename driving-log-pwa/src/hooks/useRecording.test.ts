import { renderHook, act, waitFor } from '@testing-library/react';
import { useRecording } from './useRecording';
import { DrivingLogController } from '../controllers/DrivingLogController';
import { LocationController } from '../controllers/LocationController';
import { LocationType, DrivingLogStatus } from '../types';
import { DrivingLogModel } from '../models/entities/DrivingLogModel';
import { LocationModel } from '../models/entities/LocationModel';

// Mock controllers
jest.mock('../controllers/DrivingLogController');
jest.mock('../controllers/LocationController');

const mockDrivingLogController = DrivingLogController as jest.MockedClass<typeof DrivingLogController>;
const mockLocationController = LocationController as jest.MockedClass<typeof LocationController>;

// Mock data
const mockCurrentLocation = LocationModel.create({
  id: 'loc-current',
  name: '現在地',
  latitude: 35.6812,
  longitude: 139.7671,
  timestamp: new Date(),
  type: LocationType.CURRENT
});

const mockWaypoint = {
  id: 'wp-001',
  location: LocationModel.create({
    id: 'loc-start',
    name: '出発地',
    latitude: 35.6580,
    longitude: 139.7016,
    timestamp: new Date(),
    type: LocationType.START
  }),
  timestamp: new Date(),
  name: '自宅',
  type: 'start' as const,
  notes: ''
};

const mockRecordingLog = DrivingLogModel.create({
  id: 'record-001',
  date: new Date(),
  startTime: new Date(),
  startLocation: {
    id: 'loc-start',
    name: '出発地',
    latitude: 35.6812,
    longitude: 139.7671,
    timestamp: new Date(),
    type: LocationType.START
  },
  status: DrivingLogStatus.IN_PROGRESS,
  createdAt: new Date(),
  updatedAt: new Date(),
  waypoints: []
});

describe('useRecording Hook', () => {
  let mockDrivingLogInstance: jest.Mocked<DrivingLogController>;
  let mockLocationInstance: jest.Mocked<LocationController>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Mock controller instances
    mockDrivingLogInstance = {
      createLog: jest.fn(),
      updateLog: jest.fn(),
      completeLog: jest.fn(),
      deleteLog: jest.fn(),
      quickStart: jest.fn(),
      addLocation: jest.fn(),
      getLog: jest.fn(),
      getAllLogs: jest.fn(),
      getActiveLogs: jest.fn(),
      quickAddWaypoint: jest.fn(),
      quickComplete: jest.fn(),
      changeStatus: jest.fn(),
      cancelLog: jest.fn(),
      enableAutoSave: jest.fn(),
      disableAutoSave: jest.fn(),
      saveLog: jest.fn(),
      recoverInProgressLogs: jest.fn(),
      hasUnsavedChanges: jest.fn(),
      getLastSaveTime: jest.fn(),
      calculateDistance: jest.fn(),
      calculateDuration: jest.fn(),
      getTotalDistance: jest.fn(),
      getCachedLog: jest.fn(),
      isValidStatusTransition: jest.fn(),
      getDistanceBetweenPoints: jest.fn(),
      locationController: {} as any,
      storageService: {} as any,
      logs: new Map(),
      autoSaveConfigs: new Map(),
      autoSaveTimers: new Map()
    } as any;

    mockLocationInstance = {
      getCurrentLocation: jest.fn(),
      watchLocation: jest.fn(),
      stopWatchingLocation: jest.fn(),
      recordCurrentLocation: jest.fn(),
      isLocationAvailable: jest.fn(),
      requestLocationPermission: jest.fn(),
      calculateDistance: jest.fn(),
      getLocationAccuracy: jest.fn(),
      isHighAccuracy: jest.fn(),
      recordManualLocation: jest.fn(),
      addFavoriteLocation: jest.fn(),
      getFavoriteLocations: jest.fn(),
      removeFavoriteLocation: jest.fn(),
      searchLocations: jest.fn(),
      getRecentLocations: jest.fn(),
      isGPSAvailable: jest.fn(),
      updateLocation: jest.fn(),
      deleteLocation: jest.fn(),
      gpsService: {} as any,
      storageService: {} as any,
      favoriteLocations: [],
      loadFavoriteLocations: jest.fn()
    } as any;

    mockDrivingLogController.mockImplementation(() => mockDrivingLogInstance);
    mockLocationController.mockImplementation(() => mockLocationInstance);

    // Setup default mock returns
    mockLocationInstance.getCurrentLocation.mockResolvedValue(mockCurrentLocation);
    mockLocationInstance.isLocationAvailable.mockReturnValue(true);
    mockLocationInstance.getLocationAccuracy.mockReturnValue(5.0);
    mockLocationInstance.isHighAccuracy.mockReturnValue(true);
    mockDrivingLogInstance.quickStart.mockResolvedValue(mockRecordingLog);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Initialization', () => {
    // TC-021: 初期化
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() => useRecording());

      expect(result.current.state.isRecording).toBe(false);
      expect(result.current.state.isPaused).toBe(false);
      expect(result.current.state.elapsedTime).toBe(0);
      expect(result.current.state.currentLocation).toBeUndefined();
      expect(result.current.state.waypoints).toEqual([]);
      expect(result.current.state.statistics).toEqual({
        distance: 0,
        averageSpeed: 0,
        maxSpeed: 0,
        stopTime: 0,
        movingTime: 0
      });
      expect(result.current.state.errors).toEqual([]);

      // Actions should be defined
      expect(result.current.actions.startRecording).toBeDefined();
      expect(result.current.actions.pauseRecording).toBeDefined();
      expect(result.current.actions.resumeRecording).toBeDefined();
      expect(result.current.actions.completeRecording).toBeDefined();
      expect(result.current.actions.cancelRecording).toBeDefined();
      expect(result.current.actions.addWaypoint).toBeDefined();
    });

    it('should initialize GPS status', async () => {
      const { result } = renderHook(() => useRecording());

      await waitFor(() => {
        expect(result.current.state.gpsStatus).toBeDefined();
      });

      expect(result.current.state.gpsStatus.isAvailable).toBe(true);
      expect(result.current.state.gpsStatus.accuracy).toBe(5.0);
      expect(result.current.state.gpsStatus.signal).toBe('excellent');
    });
  });

  describe('Recording Control', () => {
    // TC-022: 記録制御
    it('should start recording correctly', async () => {
      const { result } = renderHook(() => useRecording());

      await act(async () => {
        await result.current.actions.startRecording();
      });

      expect(mockDrivingLogInstance.quickStart).toHaveBeenCalled();
      expect(result.current.state.isRecording).toBe(true);
      expect(result.current.state.startTime).toBeDefined();
      expect(mockLocationInstance.watchLocation).toHaveBeenCalled();
    });

    it('should handle start recording failure', async () => {
      const error = new Error('GPS not available');
      mockDrivingLogInstance.quickStart.mockRejectedValue(error);

      const { result } = renderHook(() => useRecording());

      await act(async () => {
        await result.current.actions.startRecording();
      });

      expect(result.current.state.errors).toHaveLength(1);
      expect(result.current.state.errors[0].type).toBe('GPS');
      expect(result.current.state.errors[0].message).toContain('GPS');
      expect(result.current.state.isRecording).toBe(false);
    });

    it('should pause recording correctly', async () => {
      const { result } = renderHook(() => useRecording());

      // Start recording first
      await act(async () => {
        await result.current.actions.startRecording();
      });

      // Then pause
      act(() => {
        result.current.actions.pauseRecording();
      });

      expect(result.current.state.isPaused).toBe(true);
      expect(mockLocationInstance.stopWatchingLocation).toHaveBeenCalled();
    });

    it('should resume recording correctly', async () => {
      const { result } = renderHook(() => useRecording());

      // Start and pause recording first
      await act(async () => {
        await result.current.actions.startRecording();
      });

      act(() => {
        result.current.actions.pauseRecording();
      });

      // Then resume
      act(() => {
        result.current.actions.resumeRecording();
      });

      expect(result.current.state.isPaused).toBe(false);
      expect(mockLocationInstance.watchLocation).toHaveBeenCalledTimes(2); // Once for start, once for resume
    });

    it('should complete recording correctly', async () => {
      const completedLog = DrivingLogModel.create({ ...mockRecordingLog, status: DrivingLogStatus.COMPLETED });
      mockDrivingLogInstance.completeLog.mockResolvedValue(completedLog);

      const { result } = renderHook(() => useRecording());

      // Start recording first
      await act(async () => {
        await result.current.actions.startRecording();
      });

      // Then complete
      let completedResult;
      await act(async () => {
        completedResult = await result.current.actions.completeRecording();
      });

      expect(mockDrivingLogInstance.completeLog).toHaveBeenCalled();
      expect(completedResult).toEqual(completedLog);
      expect(result.current.state.isRecording).toBe(false);
      expect(mockLocationInstance.stopWatchingLocation).toHaveBeenCalled();
    });

    it('should cancel recording correctly', async () => {
      const { result } = renderHook(() => useRecording());

      // Start recording first
      await act(async () => {
        await result.current.actions.startRecording();
      });

      // Then cancel
      act(() => {
        result.current.actions.cancelRecording();
      });

      expect(mockDrivingLogInstance.deleteLog).toHaveBeenCalled();
      expect(result.current.state.isRecording).toBe(false);
      expect(result.current.state.isPaused).toBe(false);
      expect(mockLocationInstance.stopWatchingLocation).toHaveBeenCalled();
    });
  });

  describe('Location Monitoring', () => {
    // TC-023: 位置情報監視
    it('should update location when GPS data is received', async () => {
      const { result } = renderHook(() => useRecording());

      await act(async () => {
        await result.current.actions.startRecording();
      });

      // Simulate location update
      const watchCallback = mockLocationInstance.watchLocation.mock.calls[0][0];
      const newLocation = LocationModel.create({
        ...mockCurrentLocation,
        latitude: 35.6820
      });

      act(() => {
        watchCallback(newLocation);
      });

      expect(result.current.state.currentLocation).toEqual(newLocation);
    });

    it('should update GPS status based on location accuracy', async () => {
      const { result } = renderHook(() => useRecording());

      await act(async () => {
        await result.current.actions.startRecording();
      });

      // Simulate poor GPS accuracy
      mockLocationInstance.getLocationAccuracy.mockReturnValue(100.0);
      mockLocationInstance.isHighAccuracy.mockReturnValue(false);

      const watchCallback = mockLocationInstance.watchLocation.mock.calls[0][0];
      const poorLocation = LocationModel.create({
        ...mockCurrentLocation,
        accuracy: 100.0
      });

      act(() => {
        watchCallback(poorLocation);
      });

      expect(result.current.state.gpsStatus.accuracy).toBe(100.0);
      expect(result.current.state.gpsStatus.signal).toBe('poor');
    });

    it('should calculate statistics on location updates', async () => {
      mockDrivingLogInstance.calculateDistance.mockReturnValue(5.2);

      const { result } = renderHook(() => useRecording());

      await act(async () => {
        await result.current.actions.startRecording();
      });

      // Simulate multiple location updates
      const watchCallback = mockLocationInstance.watchLocation.mock.calls[0][0];
      const locations = [
        LocationModel.create({ ...mockCurrentLocation, latitude: 35.6810 }),
        LocationModel.create({ ...mockCurrentLocation, latitude: 35.6820 }),
        LocationModel.create({ ...mockCurrentLocation, latitude: 35.6830 })
      ];

      for (const location of locations) {
        act(() => {
          watchCallback(location);
        });
      }

      expect(result.current.state.statistics.distance).toBeGreaterThan(0);
    });
  });

  describe('Waypoint Management', () => {
    // TC-024: ウェイポイント管理
    it('should add waypoint correctly', async () => {
      const { result } = renderHook(() => useRecording());

      await act(async () => {
        await result.current.actions.startRecording();
      });

      await act(async () => {
        await result.current.actions.addWaypoint('給油所', 'fuel');
      });

      expect(mockDrivingLogInstance.quickAddWaypoint).toHaveBeenCalledWith(
        expect.objectContaining({
          name: '給油所',
          type: 'fuel'
        })
      );
      expect(result.current.state.waypoints).toHaveLength(1);
    });

    it('should update waypoint name', async () => {
      const { result } = renderHook(() => useRecording());

      await act(async () => {
        await result.current.actions.startRecording();
      });

      await act(async () => {
        await result.current.actions.addWaypoint('休憩', 'rest');
      });

      act(() => {
        result.current.actions.updateWaypointName(result.current.state.waypoints[0].id, 'コンビニ休憩');
      });

      expect(result.current.state.waypoints[0].name).toBe('コンビニ休憩');
    });

    it('should remove waypoint correctly', async () => {
      const { result } = renderHook(() => useRecording());

      await act(async () => {
        await result.current.actions.startRecording();
      });

      await act(async () => {
        await result.current.actions.addWaypoint('削除予定', 'other');
      });

      const waypointId = result.current.state.waypoints[0].id;

      act(() => {
        result.current.actions.removeWaypoint(waypointId);
      });

      expect(result.current.state.waypoints).toHaveLength(0);
    });
  });

  describe('Timer Management', () => {
    it('should update elapsed time correctly', async () => {
      const { result } = renderHook(() => useRecording());

      await act(async () => {
        await result.current.actions.startRecording();
      });

      // Fast-forward time by 60 seconds
      act(() => {
        jest.advanceTimersByTime(60000);
      });

      expect(result.current.state.elapsedTime).toBe(60);
    });

    it('should pause timer when recording is paused', async () => {
      const { result } = renderHook(() => useRecording());

      await act(async () => {
        await result.current.actions.startRecording();
      });

      // Fast-forward 30 seconds
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      // Pause recording
      act(() => {
        result.current.actions.pauseRecording();
      });

      // Fast-forward another 30 seconds
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      // Should still be 30 seconds since timer was paused
      expect(result.current.state.elapsedTime).toBe(30);
    });

    it('should resume timer when recording is resumed', async () => {
      const { result } = renderHook(() => useRecording());

      await act(async () => {
        await result.current.actions.startRecording();
      });

      // Fast-forward 30 seconds
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      // Pause recording
      act(() => {
        result.current.actions.pauseRecording();
      });

      // Fast-forward 30 seconds (should not affect elapsed time)
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      // Resume recording
      act(() => {
        result.current.actions.resumeRecording();
      });

      // Fast-forward another 30 seconds
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      // Should be 60 seconds total (30 before pause + 30 after resume)
      expect(result.current.state.elapsedTime).toBe(60);
    });
  });

  describe('Error Handling', () => {
    // TC-025: エラー処理
    it('should handle GPS errors', async () => {
      const error = new Error('GPS signal lost');
      mockLocationInstance.getCurrentLocation.mockRejectedValue(error);

      const { result } = renderHook(() => useRecording());

      await act(async () => {
        await result.current.actions.startRecording();
      });

      expect(result.current.state.errors).toHaveLength(1);
      expect(result.current.state.errors[0].type).toBe('GPS');
    });

    it('should handle storage errors', async () => {
      const error = new Error('Storage quota exceeded');
      mockDrivingLogInstance.saveLog.mockRejectedValue(error);

      const { result } = renderHook(() => useRecording());

      await act(async () => {
        await result.current.actions.startRecording();
      });

      // Trigger auto-save
      act(() => {
        jest.advanceTimersByTime(300000); // 5 minutes
      });

      await waitFor(() => {
        expect(result.current.state.errors).toHaveLength(1);
        expect(result.current.state.errors[0].type).toBe('STORAGE');
      });
    });

    it('should dismiss errors correctly', async () => {
      const error = new Error('Test error');
      mockLocationInstance.getCurrentLocation.mockRejectedValue(error);

      const { result } = renderHook(() => useRecording());

      await act(async () => {
        await result.current.actions.startRecording();
      });

      expect(result.current.state.errors).toHaveLength(1);

      act(() => {
        result.current.actions.dismissError(0);
      });

      expect(result.current.state.errors).toHaveLength(0);
    });
  });

  describe('Performance', () => {
    it('should cleanup on unmount', () => {
      const { unmount } = renderHook(() => useRecording());

      // Should not throw when unmounting
      expect(() => unmount()).not.toThrow();
    });

    it('should handle rapid location updates efficiently', async () => {
      const { result } = renderHook(() => useRecording());

      await act(async () => {
        await result.current.actions.startRecording();
      });

      const watchCallback = mockLocationInstance.watchLocation.mock.calls[0][0];

      // Simulate rapid location updates
      for (let i = 0; i < 100; i++) {
        act(() => {
          watchCallback(LocationModel.create({
            ...mockCurrentLocation,
            latitude: 35.6812 + (i * 0.0001),
            timestamp: new Date(Date.now() + i * 1000)
          }));
        });
      }

      // Should handle updates without crashing
      expect(result.current.state.currentLocation).toBeDefined();
    });
  });
});