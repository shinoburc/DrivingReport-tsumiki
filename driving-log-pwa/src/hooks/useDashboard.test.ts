import { renderHook, act, waitFor } from '@testing-library/react';
import { useDashboard } from './useDashboard';
import { DrivingLogController } from '../controllers/DrivingLogController';
import { HistoryController } from '../controllers/HistoryController';
import { DrivingLogStatus, LocationType } from '../types';

// Mock controllers
jest.mock('../controllers/DrivingLogController');
jest.mock('../controllers/HistoryController');

const mockDrivingLogController = DrivingLogController as jest.MockedClass<typeof DrivingLogController>;
const mockHistoryController = HistoryController as jest.MockedClass<typeof HistoryController>;

// Mock data
const mockRecentLogs = [
  {
    id: 'log-001',
    date: new Date('2024-08-15'),
    startTime: new Date('2024-08-15T09:00:00'),
    endTime: new Date('2024-08-15T10:30:00'),
    startLocation: {
      id: 'loc-001',
      name: '東京駅',
      latitude: 35.6812,
      longitude: 139.7671,
      type: LocationType.START,
      timestamp: new Date('2024-08-15T09:00:00')
    },
    endLocation: {
      id: 'loc-002',
      name: '新宿駅',
      latitude: 35.6896,
      longitude: 139.7006,
      type: LocationType.END,
      timestamp: new Date('2024-08-15T10:30:00')
    },
    totalDistance: 15.2,
    duration: 90,
    status: DrivingLogStatus.COMPLETED,
    createdAt: new Date('2024-08-15T09:00:00'),
    updatedAt: new Date('2024-08-15T10:30:00'),
    waypoints: []
  }
];

const mockAllLogs = [
  ...mockRecentLogs,
  {
    id: 'log-002',
    date: new Date('2024-08-14'),
    startTime: new Date('2024-08-14T14:00:00'),
    endTime: new Date('2024-08-14T15:30:00'),
    startLocation: {
      id: 'loc-003',
      name: '渋谷駅',
      latitude: 35.6580,
      longitude: 139.7016,
      type: LocationType.START,
      timestamp: new Date('2024-08-14T14:00:00')
    },
    endLocation: {
      id: 'loc-004',
      name: '品川駅',
      latitude: 35.6284,
      longitude: 139.7387,
      type: LocationType.END,
      timestamp: new Date('2024-08-14T15:30:00')
    },
    totalDistance: 12.8,
    duration: 90,
    status: DrivingLogStatus.COMPLETED,
    createdAt: new Date('2024-08-14T14:00:00'),
    updatedAt: new Date('2024-08-14T15:30:00'),
    waypoints: []
  }
];

const mockNewLog = {
  id: 'log-new',
  date: new Date(),
  startTime: new Date(),
  startLocation: {
    id: 'loc-new',
    name: '現在地',
    latitude: 35.6812,
    longitude: 139.7671,
    type: LocationType.START,
    timestamp: new Date()
  },
  status: DrivingLogStatus.IN_PROGRESS,
  createdAt: new Date(),
  updatedAt: new Date(),
  waypoints: []
};

describe('useDashboard Hook', () => {
  let mockDrivingLogInstance: jest.Mocked<DrivingLogController>;
  let mockHistoryInstance: jest.Mocked<HistoryController>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock controller instances
    mockDrivingLogInstance = {
      getAllLogs: jest.fn(),
      getActiveLogs: jest.fn(),
      quickStart: jest.fn(),
      getTotalDistance: jest.fn(),
      createLog: jest.fn(),
      getLog: jest.fn(),
      updateLog: jest.fn(),
      deleteLog: jest.fn(),
      addLocation: jest.fn(),
      quickAddWaypoint: jest.fn(),
      quickComplete: jest.fn(),
      changeStatus: jest.fn(),
      completeLog: jest.fn(),
      cancelLog: jest.fn(),
      enableAutoSave: jest.fn(),
      disableAutoSave: jest.fn(),
      saveLog: jest.fn(),
      recoverInProgressLogs: jest.fn(),
      hasUnsavedChanges: jest.fn(),
      getLastSaveTime: jest.fn(),
      calculateDistance: jest.fn(),
      calculateDuration: jest.fn()
    } as jest.Mocked<DrivingLogController>;

    mockHistoryInstance = {
      getHistoryList: jest.fn(),
      searchHistory: jest.fn(),
      filterHistory: jest.fn(),
      sortHistory: jest.fn(),
      getHistoryDetail: jest.fn(),
      getHistoryPage: jest.fn(),
      loadMoreHistory: jest.fn(),
      saveViewSettings: jest.fn(),
      loadViewSettings: jest.fn(),
      saveSearchHistory: jest.fn(),
      getSearchHistory: jest.fn(),
      clearSearchHistory: jest.fn(),
      getStatistics: jest.fn()
    } as jest.Mocked<HistoryController>;

    mockDrivingLogController.mockImplementation(() => mockDrivingLogInstance);
    mockHistoryController.mockImplementation(() => mockHistoryInstance);

    // Setup default mock returns
    mockDrivingLogInstance.getAllLogs.mockResolvedValue(mockAllLogs);
    mockDrivingLogInstance.getActiveLogs.mockResolvedValue([]);
    mockDrivingLogInstance.getTotalDistance.mockResolvedValue(120.5);
    mockHistoryInstance.getStatistics.mockResolvedValue({
      totalRecords: 42,
      totalDistance: 450.8,
      totalDuration: 1200,
      avgDistance: 10.7,
      avgDuration: 28.6,
      statusCounts: {
        [DrivingLogStatus.COMPLETED]: 40,
        [DrivingLogStatus.IN_PROGRESS]: 1,
        [DrivingLogStatus.CANCELLED]: 1
      }
    });
  });

  describe('Initialization', () => {
    // TC-017: 初期化
    it('should initialize with correct default state', async () => {
      const { result } = renderHook(() => useDashboard());

      // Initial loading state
      expect(result.current.state.isLoading).toBe(true);
      expect(result.current.state.recentLogs).toEqual([]);
      expect(result.current.state.statistics).toEqual({
        todayDistance: 0,
        weekDistance: 0,
        monthDistance: 0,
        totalRecords: 0
      });
      expect(result.current.state.currentRecording).toBeUndefined();
      expect(result.current.state.errors).toEqual([]);

      // Actions should be defined
      expect(result.current.actions.startRecording).toBeDefined();
      expect(result.current.actions.refreshData).toBeDefined();
      expect(result.current.actions.dismissError).toBeDefined();
      expect(result.current.actions.retryAction).toBeDefined();
    });

    // TC-018: データ取得
    it('should load data on initialization', async () => {
      const { result } = renderHook(() => useDashboard());

      await waitFor(() => {
        expect(result.current.state.isLoading).toBe(false);
      });

      expect(result.current.state.recentLogs).toHaveLength(2);
      expect(result.current.state.recentLogs[0].id).toBe('log-001');
      expect(result.current.state.statistics.totalRecords).toBe(42);
      expect(mockDrivingLogInstance.getAllLogs).toHaveBeenCalled();
      expect(mockHistoryInstance.getStatistics).toHaveBeenCalled();
    });
  });

  describe('Recording Actions', () => {
    // TC-019: 記録開始機能
    it('should start recording correctly', async () => {
      mockDrivingLogInstance.quickStart.mockResolvedValue(mockNewLog);
      
      const { result } = renderHook(() => useDashboard());

      await waitFor(() => {
        expect(result.current.state.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.actions.startRecording();
      });

      expect(mockDrivingLogInstance.quickStart).toHaveBeenCalled();
      expect(result.current.state.currentRecording).toEqual(mockNewLog);
    });

    it('should handle start recording failure', async () => {
      const error = new Error('GPS not available');
      mockDrivingLogInstance.quickStart.mockRejectedValue(error);
      
      const { result } = renderHook(() => useDashboard());

      await waitFor(() => {
        expect(result.current.state.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.actions.startRecording();
      });

      expect(result.current.state.errors).toHaveLength(1);
      expect(result.current.state.errors[0].type).toBe('GPS');
      expect(result.current.state.errors[0].message).toContain('GPS');
    });
  });

  describe('Data Management', () => {
    // TC-020: データ更新機能
    it('should refresh data correctly', async () => {
      const { result } = renderHook(() => useDashboard());

      await waitFor(() => {
        expect(result.current.state.isLoading).toBe(false);
      });

      // Clear previous calls
      jest.clearAllMocks();

      await act(async () => {
        await result.current.actions.refreshData();
      });

      expect(mockDrivingLogInstance.getAllLogs).toHaveBeenCalled();
      expect(mockHistoryInstance.getStatistics).toHaveBeenCalled();
    });

    it('should limit recent logs to 5 items', async () => {
      const manyLogs = Array.from({ length: 10 }, (_, i) => ({
        ...mockRecentLogs[0],
        id: `log-${i}`,
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000)
      }));

      mockDrivingLogInstance.getAllLogs.mockResolvedValue(manyLogs);

      const { result } = renderHook(() => useDashboard());

      await waitFor(() => {
        expect(result.current.state.isLoading).toBe(false);
      });

      expect(result.current.state.recentLogs).toHaveLength(5);
    });
  });

  describe('Statistics Calculation', () => {
    it('should calculate today distance correctly', async () => {
      const today = new Date();
      const todayLogs = [
        { ...mockRecentLogs[0], date: today, totalDistance: 10.5 },
        { ...mockRecentLogs[0], id: 'log-today-2', date: today, totalDistance: 15.0 }
      ];

      mockDrivingLogInstance.getAllLogs.mockResolvedValue(todayLogs);

      const { result } = renderHook(() => useDashboard());

      await waitFor(() => {
        expect(result.current.state.isLoading).toBe(false);
      });

      expect(result.current.state.statistics.todayDistance).toBe(25.5);
    });

    it('should calculate week distance correctly', async () => {
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const weekLogs = [
        { ...mockRecentLogs[0], date: now, totalDistance: 10.5 },
        { ...mockRecentLogs[0], id: 'log-week-2', date: weekAgo, totalDistance: 15.0 }
      ];

      mockDrivingLogInstance.getAllLogs.mockResolvedValue(weekLogs);

      const { result } = renderHook(() => useDashboard());

      await waitFor(() => {
        expect(result.current.state.isLoading).toBe(false);
      });

      expect(result.current.state.statistics.weekDistance).toBe(25.5);
    });

    it('should calculate month distance correctly', async () => {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthLogs = [
        { ...mockRecentLogs[0], date: now, totalDistance: 10.5 },
        { ...mockRecentLogs[0], id: 'log-month-2', date: monthStart, totalDistance: 15.0 }
      ];

      mockDrivingLogInstance.getAllLogs.mockResolvedValue(monthLogs);

      const { result } = renderHook(() => useDashboard());

      await waitFor(() => {
        expect(result.current.state.isLoading).toBe(false);
      });

      expect(result.current.state.statistics.monthDistance).toBe(25.5);
    });
  });

  describe('Error Handling', () => {
    // TC-021: エラー処理
    it('should handle data fetch errors', async () => {
      const error = new Error('Network error');
      mockDrivingLogInstance.getAllLogs.mockRejectedValue(error);

      const { result } = renderHook(() => useDashboard());

      await waitFor(() => {
        expect(result.current.state.isLoading).toBe(false);
      });

      expect(result.current.state.errors).toHaveLength(1);
      expect(result.current.state.errors[0].type).toBe('NETWORK');
      expect(result.current.state.errors[0].recoverable).toBe(true);
    });

    it('should handle storage errors', async () => {
      const error = new Error('Storage quota exceeded');
      mockDrivingLogInstance.getAllLogs.mockRejectedValue(error);

      const { result } = renderHook(() => useDashboard());

      await waitFor(() => {
        expect(result.current.state.isLoading).toBe(false);
      });

      expect(result.current.state.errors).toHaveLength(1);
      expect(result.current.state.errors[0].type).toBe('STORAGE');
    });

    it('should dismiss errors correctly', async () => {
      const error = new Error('Test error');
      mockDrivingLogInstance.getAllLogs.mockRejectedValue(error);

      const { result } = renderHook(() => useDashboard());

      await waitFor(() => {
        expect(result.current.state.errors).toHaveLength(1);
      });

      act(() => {
        result.current.actions.dismissError(0);
      });

      expect(result.current.state.errors).toHaveLength(0);
    });

    it('should retry actions correctly', async () => {
      const error = new Error('Temporary error');
      mockDrivingLogInstance.getAllLogs
        .mockRejectedValueOnce(error)
        .mockResolvedValue(mockRecentLogs);

      const { result } = renderHook(() => useDashboard());

      await waitFor(() => {
        expect(result.current.state.errors).toHaveLength(1);
      });

      await act(async () => {
        await result.current.actions.retryAction(0);
      });

      expect(result.current.state.errors).toHaveLength(0);
      expect(result.current.state.recentLogs).toHaveLength(1);
    });
  });

  describe('Real-time Updates', () => {
    it('should detect active recording', async () => {
      mockDrivingLogInstance.getActiveLogs.mockResolvedValue([mockNewLog]);

      const { result } = renderHook(() => useDashboard());

      await waitFor(() => {
        expect(result.current.state.isLoading).toBe(false);
      });

      expect(result.current.state.currentRecording).toEqual(mockNewLog);
    });

    it('should update data periodically', async () => {
      jest.useFakeTimers();

      const { result } = renderHook(() => useDashboard());

      await waitFor(() => {
        expect(result.current.state.isLoading).toBe(false);
      });

      // Clear initial calls
      jest.clearAllMocks();

      // Fast-forward 5 minutes (300000ms)
      act(() => {
        jest.advanceTimersByTime(300000);
      });

      expect(mockDrivingLogInstance.getAllLogs).toHaveBeenCalled();

      jest.useRealTimers();
    });
  });

  describe('Performance', () => {
    it('should debounce rapid refresh calls', async () => {
      const { result } = renderHook(() => useDashboard());

      await waitFor(() => {
        expect(result.current.state.isLoading).toBe(false);
      });

      // Clear initial calls
      jest.clearAllMocks();

      // Make multiple rapid calls
      await act(async () => {
        await Promise.all([
          result.current.actions.refreshData(),
          result.current.actions.refreshData(),
          result.current.actions.refreshData()
        ]);
      });

      // Should only make one actual call due to debouncing
      expect(mockDrivingLogInstance.getAllLogs).toHaveBeenCalledTimes(1);
    });

    it('should cleanup on unmount', () => {
      const { unmount } = renderHook(() => useDashboard());

      // Should not throw when unmounting
      expect(() => unmount()).not.toThrow();
    });
  });
});