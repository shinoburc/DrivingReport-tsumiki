import { renderHook, act, waitFor } from '@testing-library/react';
import { useHistoryDetail } from './useHistoryDetail';
import { HistoryController } from '../controllers/HistoryController';
import { DrivingLogStatus, LocationType } from '../types';

// Mock controllers
jest.mock('../controllers/HistoryController');
const mockHistoryController = HistoryController as jest.MockedClass<typeof HistoryController>;

// Mock data
const mockDetailRecord = {
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
      id: 'loc-fuel',
      name: 'ガソリンスタンド',
      latitude: 35.6650,
      longitude: 139.7200,
      timestamp: new Date('2024-01-15T09:30:00'),
      type: LocationType.FUEL
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
};

describe('useHistoryDetail Hook', () => {
  let mockHistoryInstance: jest.Mocked<HistoryController>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock controller instance
    mockHistoryInstance = {
      getRecord: jest.fn(),
      updateRecord: jest.fn(),
      deleteRecord: jest.fn(),
      updateWaypoint: jest.fn(),
      deleteWaypoint: jest.fn(),
      exportRecord: jest.fn(),
      getRecordStatistics: jest.fn()
    } as jest.Mocked<HistoryController>;

    mockHistoryController.mockImplementation(() => mockHistoryInstance);

    // Setup default mock returns
    mockHistoryInstance.getRecord.mockResolvedValue(mockDetailRecord);
    mockHistoryInstance.getRecordStatistics.mockResolvedValue({
      totalDistance: 15.5,
      averageSpeed: 25.8,
      maxSpeed: 45.0,
      stopTime: 300,
      movingTime: 5100
    });
  });

  describe('State Management', () => {
    // TC-059: 詳細データ取得時に状態が更新される
    it('should update state when detail data is loaded', async () => {
      const { result } = renderHook(() => useHistoryDetail());

      await act(async () => {
        await result.current.actions.loadRecord('log-001');
      });

      expect(mockHistoryInstance.getRecord).toHaveBeenCalledWith('log-001');
      expect(result.current.state.record).toEqual(mockDetailRecord);
      expect(result.current.state.waypoints).toEqual(mockDetailRecord.waypoints);
      expect(result.current.state.loading).toBe(false);
      expect(result.current.state.error).toBeNull();
    });

    // TC-060: ローディング・エラー状態が正しく管理される
    it('should manage loading and error states correctly', async () => {
      const { result } = renderHook(() => useHistoryDetail());

      // Test loading state
      mockHistoryInstance.getRecord.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockDetailRecord), 100))
      );

      act(() => {
        result.current.actions.loadRecord('log-001');
      });

      expect(result.current.state.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.state.loading).toBe(false);
      });

      // Test error state
      const error = new Error('記録が見つかりません');
      mockHistoryInstance.getRecord.mockRejectedValueOnce(error);

      await act(async () => {
        await result.current.actions.loadRecord('log-999');
      });

      expect(result.current.state.error).toBe('記録が見つかりません');
      expect(result.current.state.loading).toBe(false);
    });
  });

  describe('Functionality', () => {
    // TC-061: 記録編集時に状態が更新される
    it('should update state when record is edited', async () => {
      const { result } = renderHook(() => useHistoryDetail());

      // Load initial record
      await act(async () => {
        await result.current.actions.loadRecord('log-001');
      });

      const updatedRecord = {
        ...mockDetailRecord,
        notes: '編集されたメモ'
      };

      mockHistoryInstance.updateRecord.mockResolvedValue(updatedRecord);

      await act(async () => {
        await result.current.actions.editRecord('log-001', { notes: '編集されたメモ' });
      });

      expect(mockHistoryInstance.updateRecord).toHaveBeenCalledWith('log-001', { notes: '編集されたメモ' });
      expect(result.current.state.record).toEqual(updatedRecord);
    });

    // TC-062: ウェイポイント編集機能が動作する
    it('should handle waypoint editing', async () => {
      const { result } = renderHook(() => useHistoryDetail());

      // Load initial record
      await act(async () => {
        await result.current.actions.loadRecord('log-001');
      });

      const updatedWaypoint = {
        ...mockDetailRecord.waypoints[1],
        name: 'ENEOS'
      };

      mockHistoryInstance.updateWaypoint.mockResolvedValue(updatedWaypoint);

      await act(async () => {
        await result.current.actions.editWaypoint('loc-fuel', { name: 'ENEOS' });
      });

      expect(mockHistoryInstance.updateWaypoint).toHaveBeenCalledWith('loc-fuel', { name: 'ENEOS' });
      
      // Check waypoint was updated in state
      const updatedWaypoints = result.current.state.waypoints;
      const editedWaypoint = updatedWaypoints.find(wp => wp.id === 'loc-fuel');
      expect(editedWaypoint?.name).toBe('ENEOS');
    });

    // TC-063: 記録削除機能が動作する
    it('should handle record deletion', async () => {
      const { result } = renderHook(() => useHistoryDetail());

      // Load initial record
      await act(async () => {
        await result.current.actions.loadRecord('log-001');
      });

      mockHistoryInstance.deleteRecord.mockResolvedValue(undefined);

      await act(async () => {
        await result.current.actions.deleteRecord('log-001');
      });

      expect(mockHistoryInstance.deleteRecord).toHaveBeenCalledWith('log-001');
      expect(result.current.state.record).toBeNull();
      expect(result.current.state.waypoints).toEqual([]);
    });
  });

  describe('Advanced Features', () => {
    // Toggle editing mode test
    it('should toggle editing mode correctly', async () => {
      const { result } = renderHook(() => useHistoryDetail());

      await act(async () => {
        await result.current.actions.loadRecord('log-001');
      });

      expect(result.current.state.editing).toBe(false);

      act(() => {
        result.current.actions.toggleEditing();
      });

      expect(result.current.state.editing).toBe(true);

      act(() => {
        result.current.actions.toggleEditing();
      });

      expect(result.current.state.editing).toBe(false);
    });

    // Export functionality test
    it('should handle record export', async () => {
      const { result } = renderHook(() => useHistoryDetail());

      await act(async () => {
        await result.current.actions.loadRecord('log-001');
      });

      mockHistoryInstance.exportRecord.mockResolvedValue(undefined);

      await act(async () => {
        await result.current.actions.exportRecord('log-001');
      });

      expect(mockHistoryInstance.exportRecord).toHaveBeenCalledWith('log-001');
    });

    // Waypoint deletion test
    it('should handle waypoint deletion', async () => {
      const { result } = renderHook(() => useHistoryDetail());

      await act(async () => {
        await result.current.actions.loadRecord('log-001');
      });

      mockHistoryInstance.deleteWaypoint.mockResolvedValue(undefined);

      await act(async () => {
        await result.current.actions.deleteWaypoint('loc-fuel');
      });

      expect(mockHistoryInstance.deleteWaypoint).toHaveBeenCalledWith('loc-fuel');
      
      // Check waypoint was removed from state
      const updatedWaypoints = result.current.state.waypoints;
      const deletedWaypoint = updatedWaypoints.find(wp => wp.id === 'loc-fuel');
      expect(deletedWaypoint).toBeUndefined();
      expect(updatedWaypoints).toHaveLength(2);
    });
  });

  describe('Error Handling', () => {
    // Record not found error
    it('should handle record not found error', async () => {
      const { result } = renderHook(() => useHistoryDetail());

      const notFoundError = new Error('記録が見つかりません');
      mockHistoryInstance.getRecord.mockRejectedValue(notFoundError);

      await act(async () => {
        await result.current.actions.loadRecord('non-existent');
      });

      expect(result.current.state.error).toBe('記録が見つかりません');
      expect(result.current.state.record).toBeNull();
    });

    // Edit error handling
    it('should handle edit errors gracefully', async () => {
      const { result } = renderHook(() => useHistoryDetail());

      await act(async () => {
        await result.current.actions.loadRecord('log-001');
      });

      const editError = new Error('編集に失敗しました');
      mockHistoryInstance.updateRecord.mockRejectedValue(editError);

      await act(async () => {
        await result.current.actions.editRecord('log-001', { notes: 'test' });
      });

      expect(result.current.state.error).toBe('編集に失敗しました');
      // Original record should remain unchanged
      expect(result.current.state.record).toEqual(mockDetailRecord);
    });

    // Delete error handling
    it('should handle delete errors gracefully', async () => {
      const { result } = renderHook(() => useHistoryDetail());

      await act(async () => {
        await result.current.actions.loadRecord('log-001');
      });

      const deleteError = new Error('削除に失敗しました');
      mockHistoryInstance.deleteRecord.mockRejectedValue(deleteError);

      await act(async () => {
        await result.current.actions.deleteRecord('log-001');
      });

      expect(result.current.state.error).toBe('削除に失敗しました');
      // Record should still exist
      expect(result.current.state.record).toEqual(mockDetailRecord);
    });
  });

  describe('Performance', () => {
    // Cleanup test
    it('should cleanup resources on unmount', () => {
      const { unmount } = renderHook(() => useHistoryDetail());

      // Should not throw when unmounting
      expect(() => unmount()).not.toThrow();
    });

    // Rapid operations test
    it('should handle rapid operations efficiently', async () => {
      const { result } = renderHook(() => useHistoryDetail());

      await act(async () => {
        await result.current.actions.loadRecord('log-001');
      });

      // Simulate rapid editing operations
      for (let i = 0; i < 5; i++) {
        act(() => {
          result.current.actions.toggleEditing();
        });
      }

      // Should handle without crashing
      expect(result.current.state.editing).toBe(false);
    });
  });

  describe('Initialization', () => {
    // Initial state test
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() => useHistoryDetail());

      expect(result.current.state.record).toBeNull();
      expect(result.current.state.waypoints).toEqual([]);
      expect(result.current.state.loading).toBe(false);
      expect(result.current.state.editing).toBe(false);
      expect(result.current.state.error).toBeNull();

      // Actions should be defined
      expect(result.current.actions.loadRecord).toBeDefined();
      expect(result.current.actions.editRecord).toBeDefined();
      expect(result.current.actions.deleteRecord).toBeDefined();
      expect(result.current.actions.editWaypoint).toBeDefined();
      expect(result.current.actions.deleteWaypoint).toBeDefined();
      expect(result.current.actions.exportRecord).toBeDefined();
      expect(result.current.actions.toggleEditing).toBeDefined();
    });
  });
});