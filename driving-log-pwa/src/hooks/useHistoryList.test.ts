import { renderHook, act, waitFor } from '@testing-library/react';
import { useHistoryList } from './useHistoryList';
import { HistoryController } from '../controllers/HistoryController';
import { DrivingLogStatus, LocationType } from '../types';

// Mock controllers
jest.mock('../controllers/HistoryController');
const mockHistoryController = HistoryController as jest.MockedClass<typeof HistoryController>;

// Mock data
const mockDrivingLogs = [
  {
    id: 'log-001',
    date: new Date('2024-01-15'),
    startTime: new Date('2024-01-15T09:00:00'),
    endTime: new Date('2024-01-15T10:30:00'),
    status: DrivingLogStatus.COMPLETED,
    createdAt: new Date('2024-01-15T09:00:00'),
    updatedAt: new Date('2024-01-15T10:30:00'),
    waypoints: [
      {
        id: 'loc-start',
        name: '自宅',
        latitude: 35.6580,
        longitude: 139.7016,
        timestamp: new Date('2024-01-15T09:00:00'),
        type: LocationType.START
      },
      {
        id: 'loc-end',
        name: '会社',
        latitude: 35.6812,
        longitude: 139.7671,
        timestamp: new Date('2024-01-15T10:30:00'),
        type: LocationType.END
      }
    ]
  },
  {
    id: 'log-002',
    date: new Date('2024-01-14'),
    startTime: new Date('2024-01-14T18:00:00'),
    endTime: new Date('2024-01-14T19:30:00'),
    status: DrivingLogStatus.COMPLETED,
    createdAt: new Date('2024-01-14T18:00:00'),
    updatedAt: new Date('2024-01-14T19:30:00'),
    waypoints: [
      {
        id: 'loc-start2',
        name: '会社',
        latitude: 35.6812,
        longitude: 139.7671,
        timestamp: new Date('2024-01-14T18:00:00'),
        type: LocationType.START
      },
      {
        id: 'loc-end2',
        name: '自宅',
        latitude: 35.6580,
        longitude: 139.7016,
        timestamp: new Date('2024-01-14T19:30:00'),
        type: LocationType.END
      }
    ]
  }
];

describe('useHistoryList Hook', () => {
  let mockHistoryInstance: jest.Mocked<HistoryController>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock controller instance
    mockHistoryInstance = {
      getHistoryList: jest.fn(),
      searchHistory: jest.fn(),
      deleteRecord: jest.fn(),
      deleteMultipleRecords: jest.fn(),
      exportRecords: jest.fn(),
      getStatistics: jest.fn()
    } as jest.Mocked<HistoryController>;

    mockHistoryController.mockImplementation(() => mockHistoryInstance);

    // Setup default mock returns
    mockHistoryInstance.getHistoryList.mockResolvedValue({
      records: mockDrivingLogs,
      total: 2,
      hasMore: false
    });
  });

  describe('Initialization', () => {
    // TC-051: 初期状態が正しく設定される
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() => useHistoryList());

      expect(result.current.state.records).toEqual([]);
      expect(result.current.state.loading).toBe(false);
      expect(result.current.state.hasMore).toBe(false);
      expect(result.current.state.filters).toEqual({
        dateRange: {},
        locationSearch: undefined,
        status: undefined,
        distanceRange: undefined,
        durationRange: undefined
      });
      expect(result.current.state.sortBy).toBe('date-desc');
      expect(result.current.state.selectedRecords).toEqual([]);
      expect(result.current.state.error).toBeNull();

      // Actions should be defined
      expect(result.current.actions.loadHistory).toBeDefined();
      expect(result.current.actions.loadMoreHistory).toBeDefined();
      expect(result.current.actions.setFilters).toBeDefined();
      expect(result.current.actions.setSortBy).toBeDefined();
      expect(result.current.actions.selectRecord).toBeDefined();
      expect(result.current.actions.deleteRecord).toBeDefined();
    });

    // TC-052: 履歴データ取得時に状態が更新される
    it('should update state when history data is loaded', async () => {
      const { result } = renderHook(() => useHistoryList());

      await act(async () => {
        await result.current.actions.loadHistory();
      });

      expect(mockHistoryInstance.getHistoryList).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        filters: result.current.state.filters,
        sortBy: 'date-desc'
      });

      expect(result.current.state.records).toEqual(mockDrivingLogs);
      expect(result.current.state.loading).toBe(false);
    });

    // TC-053: ローディング状態が正しく管理される
    it('should manage loading state correctly', async () => {
      const { result } = renderHook(() => useHistoryList());

      // Mock slow API response
      mockHistoryInstance.getHistoryList.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          records: mockDrivingLogs,
          total: 2,
          hasMore: false
        }), 100))
      );

      act(() => {
        result.current.actions.loadHistory();
      });

      expect(result.current.state.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.state.loading).toBe(false);
      });
    });

    // TC-054: エラー状態が正しく管理される
    it('should manage error state correctly', async () => {
      const { result } = renderHook(() => useHistoryList());

      const error = new Error('データの取得に失敗しました');
      mockHistoryInstance.getHistoryList.mockRejectedValue(error);

      await act(async () => {
        await result.current.actions.loadHistory();
      });

      expect(result.current.state.error).toBe('データの取得に失敗しました');
      expect(result.current.state.loading).toBe(false);
    });
  });

  describe('Functionality', () => {
    // TC-055: フィルター変更時にデータが再取得される
    it('should reload data when filters change', async () => {
      const { result } = renderHook(() => useHistoryList());

      const newFilters = {
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31')
        },
        locationSearch: '自宅',
        status: [DrivingLogStatus.COMPLETED],
        distanceRange: { min: 0, max: 100 },
        durationRange: { min: 30, max: 120 }
      };

      await act(async () => {
        result.current.actions.setFilters(newFilters);
      });

      expect(result.current.state.filters).toEqual(newFilters);
      expect(mockHistoryInstance.getHistoryList).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        filters: newFilters,
        sortBy: 'date-desc'
      });
    });

    // TC-056: ページネーション機能が正しく動作する
    it('should handle pagination correctly', async () => {
      const { result } = renderHook(() => useHistoryList());

      // First load
      await act(async () => {
        await result.current.actions.loadHistory();
      });

      // Mock additional data for second page
      mockHistoryInstance.getHistoryList.mockResolvedValueOnce({
        records: [mockDrivingLogs[0]],
        total: 3,
        hasMore: false
      });

      // Load more
      await act(async () => {
        await result.current.actions.loadMoreHistory();
      });

      expect(mockHistoryInstance.getHistoryList).toHaveBeenCalledWith({
        page: 2,
        limit: 20,
        filters: result.current.state.filters,
        sortBy: 'date-desc'
      });

      expect(result.current.state.records).toHaveLength(3);
    });

    // TC-057: 並び替え機能が正しく動作する
    it('should handle sorting correctly', async () => {
      const { result } = renderHook(() => useHistoryList());

      await act(async () => {
        result.current.actions.setSortBy('distance-desc');
      });

      expect(result.current.state.sortBy).toBe('distance-desc');
      expect(mockHistoryInstance.getHistoryList).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        filters: result.current.state.filters,
        sortBy: 'distance-desc'
      });
    });

    // TC-058: 記録削除時に一覧から除外される
    it('should remove record from list when deleted', async () => {
      const { result } = renderHook(() => useHistoryList());

      // Load initial data
      await act(async () => {
        await result.current.actions.loadHistory();
      });

      expect(result.current.state.records).toHaveLength(2);

      // Mock successful deletion
      mockHistoryInstance.deleteRecord.mockResolvedValue(undefined);

      // Delete record
      await act(async () => {
        await result.current.actions.deleteRecord('log-001');
      });

      expect(mockHistoryInstance.deleteRecord).toHaveBeenCalledWith('log-001');
      expect(result.current.state.records).toHaveLength(1);
      expect(result.current.state.records[0].id).toBe('log-002');
    });
  });

  describe('Advanced Features', () => {
    // Multiple record selection test
    it('should handle multiple record selection', async () => {
      const { result } = renderHook(() => useHistoryList());

      await act(async () => {
        await result.current.actions.loadHistory();
      });

      act(() => {
        result.current.actions.selectRecord('log-001');
      });

      expect(result.current.state.selectedRecords).toContain('log-001');

      act(() => {
        result.current.actions.selectMultipleRecords(['log-001', 'log-002']);
      });

      expect(result.current.state.selectedRecords).toEqual(['log-001', 'log-002']);
    });

    // Bulk delete test
    it('should handle bulk deletion', async () => {
      const { result } = renderHook(() => useHistoryList());

      await act(async () => {
        await result.current.actions.loadHistory();
      });

      mockHistoryInstance.deleteMultipleRecords.mockResolvedValue(undefined);

      await act(async () => {
        result.current.actions.selectMultipleRecords(['log-001', 'log-002']);
        await result.current.actions.deleteMultipleRecords(['log-001', 'log-002']);
      });

      expect(mockHistoryInstance.deleteMultipleRecords).toHaveBeenCalledWith(['log-001', 'log-002']);
      expect(result.current.state.records).toHaveLength(0);
      expect(result.current.state.selectedRecords).toEqual([]);
    });

    // Export functionality test
    it('should handle record export', async () => {
      const { result } = renderHook(() => useHistoryList());

      await act(async () => {
        await result.current.actions.loadHistory();
      });

      mockHistoryInstance.exportRecords.mockResolvedValue(undefined);

      await act(async () => {
        await result.current.actions.exportRecords(['log-001']);
      });

      expect(mockHistoryInstance.exportRecords).toHaveBeenCalledWith(['log-001']);
    });

    // Refresh functionality test
    it('should handle data refresh', async () => {
      const { result } = renderHook(() => useHistoryList());

      await act(async () => {
        await result.current.actions.loadHistory();
      });

      // Clear previous calls
      mockHistoryInstance.getHistoryList.mockClear();

      await act(async () => {
        await result.current.actions.refreshHistory();
      });

      expect(mockHistoryInstance.getHistoryList).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        filters: result.current.state.filters,
        sortBy: 'date-desc'
      });
    });
  });

  describe('Error Handling', () => {
    // Network error handling
    it('should handle network errors gracefully', async () => {
      const { result } = renderHook(() => useHistoryList());

      const networkError = new Error('ネットワークエラー');
      mockHistoryInstance.getHistoryList.mockRejectedValue(networkError);

      await act(async () => {
        await result.current.actions.loadHistory();
      });

      expect(result.current.state.error).toBe('ネットワークエラー');
      expect(result.current.state.loading).toBe(false);
    });

    // Delete error handling
    it('should handle delete errors gracefully', async () => {
      const { result } = renderHook(() => useHistoryList());

      await act(async () => {
        await result.current.actions.loadHistory();
      });

      const deleteError = new Error('削除に失敗しました');
      mockHistoryInstance.deleteRecord.mockRejectedValue(deleteError);

      await act(async () => {
        await result.current.actions.deleteRecord('log-001');
      });

      expect(result.current.state.error).toBe('削除に失敗しました');
      // Record should still be in the list
      expect(result.current.state.records).toHaveLength(2);
    });
  });

  describe('Performance', () => {
    // Memory efficiency test
    it('should cleanup resources on unmount', () => {
      const { unmount } = renderHook(() => useHistoryList());

      // Should not throw when unmounting
      expect(() => unmount()).not.toThrow();
    });

    // Rapid filter changes test
    it('should handle rapid filter changes efficiently', async () => {
      const { result } = renderHook(() => useHistoryList());

      // Simulate rapid filter changes
      for (let i = 0; i < 10; i++) {
        act(() => {
          result.current.actions.setFilters({
            ...result.current.state.filters,
            locationSearch: `location-${i}`
          });
        });
      }

      // Should handle without crashing
      expect(result.current.state.filters.locationSearch).toBe('location-9');
    });
  });
});