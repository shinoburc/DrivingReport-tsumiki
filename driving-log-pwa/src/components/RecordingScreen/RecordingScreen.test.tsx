import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RecordingScreen } from './RecordingScreen';
import { useRecording } from '../../hooks/useRecording';
import { DrivingLogStatus, LocationType } from '../../types';

// Mock the useRecording hook
jest.mock('../../hooks/useRecording');
const mockUseRecording = useRecording as jest.MockedFunction<typeof useRecording>;

// Mock data
const mockCurrentLocation = {
  id: 'loc-current',
  name: '現在地',
  latitude: 35.6812,
  longitude: 139.7671,
  timestamp: new Date(),
  type: LocationType.CURRENT
};

const mockWaypoint = {
  id: 'wp-001',
  location: {
    id: 'loc-start',
    name: '出発地',
    latitude: 35.6580,
    longitude: 139.7016,
    timestamp: new Date(),
    type: LocationType.START
  },
  timestamp: new Date(),
  name: '自宅',
  type: 'start' as const,
  notes: ''
};

const mockRecordingState = {
  isRecording: false,
  isPaused: false,
  startTime: undefined,
  elapsedTime: 0,
  currentLocation: undefined,
  gpsStatus: {
    isAvailable: true,
    accuracy: 5.0,
    signal: 'excellent' as const,
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
};

const mockRecordingActions = {
  startRecording: jest.fn(),
  pauseRecording: jest.fn(),
  resumeRecording: jest.fn(),
  completeRecording: jest.fn(),
  cancelRecording: jest.fn(),
  addWaypoint: jest.fn(),
  updateWaypointName: jest.fn(),
  removeWaypoint: jest.fn(),
  dismissError: jest.fn()
};

describe('RecordingScreen Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRecording.mockReturnValue({
      state: mockRecordingState,
      actions: mockRecordingActions
    });
  });

  describe('Basic Rendering', () => {
    // TC-001: 基本レンダリング
    it('should render all main sections', () => {
      render(<RecordingScreen />);
      
      expect(screen.getByTestId('recording-header')).toBeInTheDocument();
      expect(screen.getByTestId('gps-indicator')).toBeInTheDocument();
      expect(screen.getByTestId('main-controls')).toBeInTheDocument();
      expect(screen.getByTestId('statistics-panel')).toBeInTheDocument();
      expect(screen.getByTestId('waypoint-section')).toBeInTheDocument();
    });

    // TC-002: プロパティ受け渡し
    it('should apply custom className', () => {
      const { container } = render(<RecordingScreen className="custom-class" />);
      
      expect(container.firstChild).toHaveClass('custom-class');
    });

    // TC-003: 初期状態の確認
    it('should display initial state correctly', () => {
      render(<RecordingScreen />);
      
      expect(screen.getByText('00:00:00')).toBeInTheDocument(); // Elapsed time
      expect(screen.getByRole('button', { name: /記録開始/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /一時停止/i })).not.toBeInTheDocument();
      expect(screen.getByText('0.0km')).toBeInTheDocument(); // Distance
      expect(screen.getByText('0.0km/h')).toBeInTheDocument(); // Speed
    });
  });

  describe('Recording Controls', () => {
    // TC-004: 記録開始機能
    it('should display start recording button when not recording', () => {
      render(<RecordingScreen />);
      
      const startButton = screen.getByRole('button', { name: /記録開始/i });
      expect(startButton).toBeInTheDocument();
      expect(startButton).toHaveAttribute('aria-label', '運転記録を開始');
    });

    // TC-005: 記録中状態の表示
    it('should display recording controls when recording', () => {
      mockUseRecording.mockReturnValue({
        state: {
          ...mockRecordingState,
          isRecording: true,
          startTime: new Date(),
          elapsedTime: 300, // 5 minutes
          currentLocation: mockCurrentLocation
        },
        actions: mockRecordingActions
      });

      render(<RecordingScreen />);
      
      expect(screen.getByText('05:00')).toBeInTheDocument(); // Elapsed time
      expect(screen.getByRole('button', { name: /一時停止/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /完了/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /キャンセル/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /記録開始/i })).not.toBeInTheDocument();
    });

    // TC-006: 一時停止状態の表示
    it('should display paused state correctly', () => {
      mockUseRecording.mockReturnValue({
        state: {
          ...mockRecordingState,
          isRecording: true,
          isPaused: true,
          startTime: new Date(),
          elapsedTime: 600 // 10 minutes
        },
        actions: mockRecordingActions
      });

      render(<RecordingScreen />);
      
      expect(screen.getByText('10:00')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /再開/i })).toBeInTheDocument();
      expect(screen.getByText('一時停止中')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /一時停止/i })).not.toBeInTheDocument();
    });

    // TC-007: 記録開始アクション
    it('should call startRecording when start button is clicked', async () => {
      render(<RecordingScreen />);
      
      const startButton = screen.getByRole('button', { name: /記録開始/i });
      fireEvent.click(startButton);
      
      expect(mockRecordingActions.startRecording).toHaveBeenCalledTimes(1);
    });

    // TC-008: 一時停止アクション
    it('should call pauseRecording when pause button is clicked', () => {
      mockUseRecording.mockReturnValue({
        state: {
          ...mockRecordingState,
          isRecording: true,
          startTime: new Date()
        },
        actions: mockRecordingActions
      });

      render(<RecordingScreen />);
      
      const pauseButton = screen.getByRole('button', { name: /一時停止/i });
      fireEvent.click(pauseButton);
      
      expect(mockRecordingActions.pauseRecording).toHaveBeenCalledTimes(1);
    });

    // TC-009: 再開アクション
    it('should call resumeRecording when resume button is clicked', () => {
      mockUseRecording.mockReturnValue({
        state: {
          ...mockRecordingState,
          isRecording: true,
          isPaused: true,
          startTime: new Date()
        },
        actions: mockRecordingActions
      });

      render(<RecordingScreen />);
      
      const resumeButton = screen.getByRole('button', { name: /再開/i });
      fireEvent.click(resumeButton);
      
      expect(mockRecordingActions.resumeRecording).toHaveBeenCalledTimes(1);
    });

    // TC-010: 完了アクション
    it('should call completeRecording when complete button is clicked', async () => {
      mockUseRecording.mockReturnValue({
        state: {
          ...mockRecordingState,
          isRecording: true,
          startTime: new Date()
        },
        actions: mockRecordingActions
      });

      render(<RecordingScreen />);
      
      const completeButton = screen.getByRole('button', { name: /完了/i });
      fireEvent.click(completeButton);
      
      expect(mockRecordingActions.completeRecording).toHaveBeenCalledTimes(1);
    });

    // TC-011: キャンセルアクション
    it('should call cancelRecording when cancel button is clicked', () => {
      mockUseRecording.mockReturnValue({
        state: {
          ...mockRecordingState,
          isRecording: true,
          startTime: new Date()
        },
        actions: mockRecordingActions
      });

      render(<RecordingScreen />);
      
      const cancelButton = screen.getByRole('button', { name: /キャンセル/i });
      fireEvent.click(cancelButton);
      
      expect(mockRecordingActions.cancelRecording).toHaveBeenCalledTimes(1);
    });
  });

  describe('GPS Indicator', () => {
    // TC-012: GPS状態表示
    it('should display GPS status correctly', () => {
      render(<RecordingScreen />);
      
      expect(screen.getByTestId('gps-indicator')).toBeInTheDocument();
      expect(screen.getByText('5.0m')).toBeInTheDocument(); // Accuracy
      expect(screen.getByTestId('gps-signal-excellent')).toBeInTheDocument();
    });

    it('should display poor GPS signal correctly', () => {
      mockUseRecording.mockReturnValue({
        state: {
          ...mockRecordingState,
          gpsStatus: {
            isAvailable: true,
            accuracy: 100.0,
            signal: 'poor',
            lastUpdate: new Date()
          }
        },
        actions: mockRecordingActions
      });

      render(<RecordingScreen />);
      
      expect(screen.getByText('100.0m')).toBeInTheDocument();
      expect(screen.getByTestId('gps-signal-poor')).toBeInTheDocument();
    });

    it('should display GPS unavailable state', () => {
      mockUseRecording.mockReturnValue({
        state: {
          ...mockRecordingState,
          gpsStatus: {
            isAvailable: false,
            accuracy: 0,
            signal: 'none',
            lastUpdate: new Date()
          }
        },
        actions: mockRecordingActions
      });

      render(<RecordingScreen />);
      
      expect(screen.getByText('GPS利用不可')).toBeInTheDocument();
      expect(screen.getByTestId('gps-signal-none')).toBeInTheDocument();
    });
  });

  describe('Statistics Panel', () => {
    // TC-013: 統計情報表示
    it('should display statistics correctly', () => {
      mockUseRecording.mockReturnValue({
        state: {
          ...mockRecordingState,
          statistics: {
            distance: 12.5,
            averageSpeed: 35.2,
            maxSpeed: 60.0,
            stopTime: 300, // 5 minutes
            movingTime: 1800 // 30 minutes
          },
          elapsedTime: 2100 // 35 minutes total
        },
        actions: mockRecordingActions
      });

      render(<RecordingScreen />);
      
      expect(screen.getByText('12.5km')).toBeInTheDocument();
      expect(screen.getByText('35.2km/h')).toBeInTheDocument();
      expect(screen.getByText('60.0km/h')).toBeInTheDocument();
      expect(screen.getByText('35:00')).toBeInTheDocument(); // Total time
      expect(screen.getByText('30:00')).toBeInTheDocument(); // Moving time
      expect(screen.getByText('05:00')).toBeInTheDocument(); // Stop time
    });

    // TC-014: 数値フォーマット
    it('should format numbers correctly', () => {
      mockUseRecording.mockReturnValue({
        state: {
          ...mockRecordingState,
          statistics: {
            distance: 1234.567,
            averageSpeed: 89.123,
            maxSpeed: 120.456,
            stopTime: 0,
            movingTime: 0
          }
        },
        actions: mockRecordingActions
      });

      render(<RecordingScreen />);
      
      expect(screen.getByText('1,234.6km')).toBeInTheDocument();
      expect(screen.getByText('89.1km/h')).toBeInTheDocument();
      expect(screen.getByText('120.5km/h')).toBeInTheDocument();
    });
  });

  describe('Waypoint Section', () => {
    // TC-015: ウェイポイント一覧表示
    it('should display waypoints correctly', () => {
      mockUseRecording.mockReturnValue({
        state: {
          ...mockRecordingState,
          waypoints: [mockWaypoint]
        },
        actions: mockRecordingActions
      });

      render(<RecordingScreen />);
      
      expect(screen.getByText('自宅')).toBeInTheDocument();
      expect(screen.getByTestId('waypoint-start')).toBeInTheDocument();
    });

    // TC-016: ウェイポイント追加
    it('should show add waypoint button', () => {
      mockUseRecording.mockReturnValue({
        state: {
          ...mockRecordingState,
          isRecording: true
        },
        actions: mockRecordingActions
      });

      render(<RecordingScreen />);
      
      const addButton = screen.getByRole('button', { name: /地点追加/i });
      expect(addButton).toBeInTheDocument();
      
      fireEvent.click(addButton);
      expect(mockRecordingActions.addWaypoint).toHaveBeenCalled();
    });

    // TC-017: クイックアクション
    it('should display quick action buttons when recording', () => {
      mockUseRecording.mockReturnValue({
        state: {
          ...mockRecordingState,
          isRecording: true
        },
        actions: mockRecordingActions
      });

      render(<RecordingScreen />);
      
      expect(screen.getByRole('button', { name: /給油/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /休憩/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /駐車/i })).toBeInTheDocument();
    });

    it('should call addWaypoint with correct type for quick actions', () => {
      mockUseRecording.mockReturnValue({
        state: {
          ...mockRecordingState,
          isRecording: true
        },
        actions: mockRecordingActions
      });

      render(<RecordingScreen />);
      
      const fuelButton = screen.getByRole('button', { name: /給油/i });
      fireEvent.click(fuelButton);
      
      expect(mockRecordingActions.addWaypoint).toHaveBeenCalledWith('給油', 'fuel');
    });
  });

  describe('Error Handling', () => {
    // TC-018: GPS エラー表示
    it('should display GPS error correctly', () => {
      mockUseRecording.mockReturnValue({
        state: {
          ...mockRecordingState,
          errors: [{
            type: 'GPS',
            message: 'GPS信号を取得できません',
            recoverable: true,
            action: jest.fn()
          }]
        },
        actions: mockRecordingActions
      });

      render(<RecordingScreen />);
      
      expect(screen.getByText('GPS信号を取得できません')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /再試行/i })).toBeInTheDocument();
    });

    // TC-019: ストレージエラー表示
    it('should display storage error correctly', () => {
      mockUseRecording.mockReturnValue({
        state: {
          ...mockRecordingState,
          errors: [{
            type: 'STORAGE',
            message: 'ストレージ容量が不足しています',
            recoverable: true,
            action: jest.fn()
          }]
        },
        actions: mockRecordingActions
      });

      render(<RecordingScreen />);
      
      expect(screen.getByText('ストレージ容量が不足しています')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /再試行/i })).toBeInTheDocument();
    });

    it('should dismiss errors correctly', () => {
      mockUseRecording.mockReturnValue({
        state: {
          ...mockRecordingState,
          errors: [{
            type: 'GPS',
            message: 'Test error',
            recoverable: true,
            action: jest.fn()
          }]
        },
        actions: mockRecordingActions
      });

      render(<RecordingScreen />);
      
      const dismissButton = screen.getByRole('button', { name: /閉じる/i });
      fireEvent.click(dismissButton);
      
      expect(mockRecordingActions.dismissError).toHaveBeenCalledWith(0);
    });
  });

  describe('Accessibility', () => {
    // TC-020: セマンティックHTML
    it('should use semantic HTML elements', () => {
      render(<RecordingScreen />);
      
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('banner')).toBeInTheDocument();
      expect(screen.getAllByRole('region')).toHaveLength(4); // 4 sections
    });

    // TC-021: ARIA属性
    it('should have proper ARIA attributes', () => {
      render(<RecordingScreen />);
      
      const startButton = screen.getByRole('button', { name: /記録開始/i });
      expect(startButton).toHaveAttribute('aria-label');
      
      const gpsIndicator = screen.getByTestId('gps-indicator');
      expect(gpsIndicator).toHaveAttribute('aria-live', 'polite');
    });

    // TC-022: キーボードナビゲーション
    it('should support keyboard navigation', () => {
      render(<RecordingScreen />);
      
      const focusableElements = screen.getAllByRole('button');
      focusableElements.forEach(element => {
        expect(element).toHaveAttribute('tabIndex');
      });
    });
  });

  describe('Responsive Design', () => {
    // TC-023: モバイルレイアウト
    it('should apply mobile styles correctly', () => {
      // Mock window.innerWidth
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<RecordingScreen />);
      
      const recordingScreen = screen.getByTestId('recording-screen');
      expect(recordingScreen).toHaveClass('mobile-layout');
    });

    // TC-024: タブレットレイアウト
    it('should apply tablet styles correctly', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });

      render(<RecordingScreen />);
      
      const recordingScreen = screen.getByTestId('recording-screen');
      expect(recordingScreen).toHaveClass('tablet-layout');
    });

    // TC-025: 大きなタッチターゲット
    it('should have large touch targets', () => {
      render(<RecordingScreen />);
      
      const startButton = screen.getByRole('button', { name: /記録開始/i });
      const styles = window.getComputedStyle(startButton);
      
      // Should have minimum 60x60px touch target
      expect(parseInt(styles.minWidth)).toBeGreaterThanOrEqual(60);
      expect(parseInt(styles.minHeight)).toBeGreaterThanOrEqual(60);
    });
  });

  describe('Performance', () => {
    // TC-026: 初期レンダリング性能
    it('should render within performance budget', async () => {
      const startTime = performance.now();
      
      render(<RecordingScreen />);
      
      await waitFor(() => {
        expect(screen.getByTestId('recording-screen')).toBeInTheDocument();
      });
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      expect(renderTime).toBeLessThan(100); // 100ms以内でレンダリング
    });

    it('should handle rapid state updates efficiently', () => {
      const { rerender } = render(<RecordingScreen />);
      
      // Simulate rapid state updates
      for (let i = 0; i < 100; i++) {
        mockUseRecording.mockReturnValue({
          state: {
            ...mockRecordingState,
            elapsedTime: i,
            statistics: {
              ...mockRecordingState.statistics,
              distance: i * 0.1
            }
          },
          actions: mockRecordingActions
        });
        
        rerender(<RecordingScreen />);
      }
      
      // Should not crash and should display final values
      expect(screen.getByText('99')).toBeInTheDocument(); // Final elapsed time seconds
    });
  });
});