import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Dashboard } from './Dashboard';
import { useDashboard } from '../../hooks/useDashboard';
import { DrivingLogStatus, LocationType } from '../../types';

// Mock the useDashboard hook
jest.mock('../../hooks/useDashboard');
const mockUseDashboard = useDashboard as jest.MockedFunction<typeof useDashboard>;

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

const mockStatistics = {
  todayDistance: 25.5,
  weekDistance: 120.3,
  monthDistance: 450.8,
  totalRecords: 42
};

const mockCurrentRecording = {
  id: 'log-current',
  date: new Date(),
  startTime: new Date(),
  startLocation: {
    id: 'loc-current',
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

const mockDashboardState = {
  isLoading: false,
  recentLogs: mockRecentLogs,
  statistics: mockStatistics,
  currentRecording: undefined,
  errors: []
};

const mockDashboardActions = {
  startRecording: jest.fn(),
  refreshData: jest.fn(),
  dismissError: jest.fn(),
  retryAction: jest.fn()
};

describe('Dashboard Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDashboard.mockReturnValue({
      state: mockDashboardState,
      actions: mockDashboardActions
    });
  });

  describe('Basic Rendering', () => {
    // TC-001: 基本レンダリング
    it('should render all main sections', () => {
      render(<Dashboard />);
      
      expect(screen.getByTestId('recording-section')).toBeInTheDocument();
      expect(screen.getByTestId('recent-logs-section')).toBeInTheDocument();
      expect(screen.getByTestId('statistics-section')).toBeInTheDocument();
      expect(screen.getByTestId('navigation-section')).toBeInTheDocument();
    });

    // TC-002: プロパティ受け渡し
    it('should apply custom className', () => {
      const { container } = render(<Dashboard className="custom-class" />);
      
      expect(container.firstChild).toHaveClass('custom-class');
    });

    // TC-003: 初期状態の確認
    it('should handle loading state correctly', () => {
      mockUseDashboard.mockReturnValue({
        state: { ...mockDashboardState, isLoading: true },
        actions: mockDashboardActions
      });

      render(<Dashboard />);
      
      expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
    });
  });

  describe('RecordingSection', () => {
    // TC-004: 記録開始ボタン表示
    it('should display start recording button when not recording', () => {
      render(<Dashboard />);
      
      const startButton = screen.getByRole('button', { name: /記録開始/i });
      expect(startButton).toBeInTheDocument();
      expect(startButton).toHaveAttribute('aria-label', '運転記録を開始');
    });

    // TC-005: 記録中状態の表示
    it('should display recording status when currently recording', () => {
      mockUseDashboard.mockReturnValue({
        state: { ...mockDashboardState, currentRecording: mockCurrentRecording },
        actions: mockDashboardActions
      });

      render(<Dashboard />);
      
      expect(screen.getByText('記録中')).toBeInTheDocument();
      expect(screen.getByTestId('recording-timer')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /記録停止/i })).toBeInTheDocument();
    });

    // TC-006: GPS状態インジケーター
    it('should display GPS status indicator', () => {
      render(<Dashboard />);
      
      expect(screen.getByTestId('gps-indicator')).toBeInTheDocument();
    });

    // TC-007: 記録開始アクション
    it('should call startRecording when start button is clicked', async () => {
      render(<Dashboard />);
      
      const startButton = screen.getByRole('button', { name: /記録開始/i });
      fireEvent.click(startButton);
      
      expect(mockDashboardActions.startRecording).toHaveBeenCalledTimes(1);
    });
  });

  describe('RecentLogsSection', () => {
    // TC-008: 最近の記録一覧表示
    it('should display recent logs correctly', () => {
      render(<Dashboard />);
      
      expect(screen.getByText('東京駅')).toBeInTheDocument();
      expect(screen.getByText('新宿駅')).toBeInTheDocument();
      expect(screen.getByText('15.2km')).toBeInTheDocument();
      expect(screen.getByText('90分')).toBeInTheDocument();
    });

    // TC-009: 空の記録一覧
    it('should display empty state when no logs exist', () => {
      mockUseDashboard.mockReturnValue({
        state: { ...mockDashboardState, recentLogs: [] },
        actions: mockDashboardActions
      });

      render(<Dashboard />);
      
      expect(screen.getByText('記録がありません')).toBeInTheDocument();
      expect(screen.getByText('記録を開始してみましょう')).toBeInTheDocument();
    });

    // TC-010: 記録項目クリック
    it('should navigate to detail when log item is clicked', () => {
      const mockOnNavigate = jest.fn();
      render(<Dashboard onNavigate={mockOnNavigate} />);
      
      const logItem = screen.getByTestId('log-item-log-001');
      fireEvent.click(logItem);
      
      expect(mockOnNavigate).toHaveBeenCalledWith('/history/log-001');
    });

    // TC-011: 記録状態の表示
    it('should display correct status icons', () => {
      render(<Dashboard />);
      
      expect(screen.getByTestId('status-completed')).toBeInTheDocument();
    });
  });

  describe('StatisticsSection', () => {
    // TC-012: 統計情報表示
    it('should display statistics correctly', () => {
      render(<Dashboard />);
      
      expect(screen.getByText('25.5km')).toBeInTheDocument();
      expect(screen.getByText('120.3km')).toBeInTheDocument();
      expect(screen.getByText('450.8km')).toBeInTheDocument();
      expect(screen.getByText('42件')).toBeInTheDocument();
    });

    // TC-013: 数値フォーマット
    it('should format numbers correctly', () => {
      mockUseDashboard.mockReturnValue({
        state: {
          ...mockDashboardState,
          statistics: { ...mockStatistics, todayDistance: 1234.56 }
        },
        actions: mockDashboardActions
      });

      render(<Dashboard />);
      
      expect(screen.getByText('1,234.6km')).toBeInTheDocument();
    });

    // TC-014: 統計カードのレスポンシブ表示
    it('should apply responsive grid layout', () => {
      render(<Dashboard />);
      
      const statisticsGrid = screen.getByTestId('statistics-grid');
      expect(statisticsGrid).toHaveClass('grid-responsive');
    });
  });

  describe('NavigationSection', () => {
    // TC-015: ナビゲーションボタン表示
    it('should display all navigation buttons', () => {
      render(<Dashboard />);
      
      expect(screen.getByRole('button', { name: /履歴/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /設定/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /エクスポート/i })).toBeInTheDocument();
    });

    // TC-016: ナビゲーションアクション
    it('should call onNavigate with correct routes', () => {
      const mockOnNavigate = jest.fn();
      render(<Dashboard onNavigate={mockOnNavigate} />);
      
      fireEvent.click(screen.getByRole('button', { name: /履歴/i }));
      expect(mockOnNavigate).toHaveBeenCalledWith('/history');
      
      fireEvent.click(screen.getByRole('button', { name: /設定/i }));
      expect(mockOnNavigate).toHaveBeenCalledWith('/settings');
      
      fireEvent.click(screen.getByRole('button', { name: /エクスポート/i }));
      expect(mockOnNavigate).toHaveBeenCalledWith('/export');
    });
  });

  describe('Error Handling', () => {
    // TC-034: GPS権限エラー
    it('should display GPS permission error correctly', () => {
      const errorState = {
        ...mockDashboardState,
        errors: [{
          type: 'GPS' as const,
          message: 'GPS信号を取得できません',
          recoverable: true,
          action: jest.fn()
        }]
      };

      mockUseDashboard.mockReturnValue({
        state: errorState,
        actions: mockDashboardActions
      });

      render(<Dashboard />);
      
      expect(screen.getByText('GPS信号を取得できません')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /再試行/i })).toBeInTheDocument();
    });

    // TC-035: データ取得エラー
    it('should display data fetch error correctly', () => {
      const errorState = {
        ...mockDashboardState,
        errors: [{
          type: 'DATA' as const,
          message: 'データの読み込みに失敗しました',
          recoverable: true,
          action: jest.fn()
        }]
      };

      mockUseDashboard.mockReturnValue({
        state: errorState,
        actions: mockDashboardActions
      });

      render(<Dashboard />);
      
      expect(screen.getByText('データの読み込みに失敗しました')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /再試行/i })).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    // TC-026: セマンティックHTML
    it('should use semantic HTML elements', () => {
      render(<Dashboard />);
      
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('banner')).toBeInTheDocument();
      expect(screen.getAllByRole('region')).toHaveLength(4); // 4 sections
    });

    // TC-027: ARIA属性
    it('should have proper ARIA attributes', () => {
      render(<Dashboard />);
      
      const startButton = screen.getByRole('button', { name: /記録開始/i });
      expect(startButton).toHaveAttribute('aria-label');
      
      const statisticsSection = screen.getByTestId('statistics-section');
      expect(statisticsSection).toHaveAttribute('aria-label', '統計情報');
    });

    // TC-028: キーボードナビゲーション
    it('should support keyboard navigation', () => {
      render(<Dashboard />);
      
      const focusableElements = screen.getAllByRole('button');
      focusableElements.forEach(element => {
        expect(element).toHaveAttribute('tabIndex');
      });
    });
  });

  describe('Responsive Design', () => {
    // TC-022: スマートフォン表示
    it('should apply mobile styles correctly', () => {
      // Mock window.innerWidth
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<Dashboard />);
      
      const dashboard = screen.getByTestId('dashboard');
      expect(dashboard).toHaveClass('mobile-layout');
    });

    // TC-023: タブレット表示
    it('should apply tablet styles correctly', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });

      render(<Dashboard />);
      
      const dashboard = screen.getByTestId('dashboard');
      expect(dashboard).toHaveClass('tablet-layout');
    });
  });

  describe('Performance', () => {
    // TC-031: 初期レンダリング性能
    it('should render within performance budget', async () => {
      const startTime = performance.now();
      
      render(<Dashboard />);
      
      await waitFor(() => {
        expect(screen.getByTestId('dashboard')).toBeInTheDocument();
      });
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      expect(renderTime).toBeLessThan(100); // 100ms以内でレンダリング
    });
  });
});