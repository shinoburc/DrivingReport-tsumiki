import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { HistoryListScreen } from './HistoryListScreen';
import { useHistoryList } from '../../hooks/useHistoryList';
import { DrivingLogStatus, LocationType } from '../../types';

// Mock the useHistoryList hook
jest.mock('../../hooks/useHistoryList');
const mockUseHistoryList = useHistoryList as jest.MockedFunction<typeof useHistoryList>;

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
    endTime: undefined,
    status: DrivingLogStatus.IN_PROGRESS,
    createdAt: new Date('2024-01-14T18:00:00'),
    updatedAt: new Date('2024-01-14T18:00:00'),
    waypoints: [
      {
        id: 'loc-progress',
        name: '途中地点',
        latitude: 35.6900,
        longitude: 139.7400,
        timestamp: new Date('2024-01-14T18:00:00'),
        type: LocationType.CURRENT
      }
    ]
  }
];

const mockHistoryState = {
  records: mockDrivingLogs,
  loading: false,
  hasMore: true,
  filters: {
    dateRange: {},
    locationSearch: undefined,
    status: undefined,
    distanceRange: undefined,
    durationRange: undefined
  },
  sortBy: 'date-desc' as const,
  selectedRecords: [],
  error: null
};

const mockHistoryActions = {
  loadHistory: jest.fn(),
  loadMoreHistory: jest.fn(),
  setFilters: jest.fn(),
  setSortBy: jest.fn(),
  selectRecord: jest.fn(),
  selectMultipleRecords: jest.fn(),
  deleteRecord: jest.fn(),
  deleteMultipleRecords: jest.fn(),
  exportRecords: jest.fn(),
  refreshHistory: jest.fn()
};

describe('HistoryListScreen Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseHistoryList.mockReturnValue({
      state: mockHistoryState,
      actions: mockHistoryActions
    });
  });

  describe('Basic Rendering', () => {
    // TC-001: 履歴一覧画面が正常にレンダリングされる
    it('should render history list screen correctly', () => {
      render(<HistoryListScreen />);
      
      expect(screen.getByTestId('history-list-screen')).toBeInTheDocument();
      expect(screen.getByRole('main')).toBeInTheDocument();
    });

    // TC-002: プロパティ（className）が正しく適用される
    it('should apply custom className', () => {
      const { container } = render(<HistoryListScreen className="custom-class" />);
      
      expect(container.firstChild).toHaveClass('custom-class');
    });

    // TC-003: 記録データが存在する場合、カード形式で表示される
    it('should display records as cards when data exists', () => {
      render(<HistoryListScreen />);
      
      expect(screen.getByTestId('history-card-log-001')).toBeInTheDocument();
      expect(screen.getByTestId('history-card-log-002')).toBeInTheDocument();
      expect(screen.getByText('自宅')).toBeInTheDocument();
      expect(screen.getByText('会社')).toBeInTheDocument();
    });

    // TC-004: 記録データが存在しない場合、空状態メッセージが表示される
    it('should display empty state when no records exist', () => {
      mockUseHistoryList.mockReturnValue({
        state: { ...mockHistoryState, records: [] },
        actions: mockHistoryActions
      });

      render(<HistoryListScreen />);
      
      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
      expect(screen.getByText('運転記録がありません')).toBeInTheDocument();
    });

    // TC-005: ローディング中はスケルトンスクリーンが表示される
    it('should display skeleton screen during loading', () => {
      mockUseHistoryList.mockReturnValue({
        state: { ...mockHistoryState, loading: true },
        actions: mockHistoryActions
      });

      render(<HistoryListScreen />);
      
      expect(screen.getByTestId('skeleton-loader')).toBeInTheDocument();
    });
  });

  describe('List Display Functionality', () => {
    // TC-006: 20件ずつのページネーションが正しく動作する
    it('should handle pagination correctly', async () => {
      render(<HistoryListScreen />);
      
      const loadMoreButton = screen.getByTestId('load-more-button');
      fireEvent.click(loadMoreButton);
      
      expect(mockHistoryActions.loadMoreHistory).toHaveBeenCalledTimes(1);
    });

    // TC-007: 無限スクロールで追加データが読み込まれる
    it('should trigger infinite scroll loading', async () => {
      render(<HistoryListScreen />);
      
      // Simulate scroll to bottom
      const scrollContainer = screen.getByTestId('scroll-container');
      fireEvent.scroll(scrollContainer, { target: { scrollTop: 1000 } });
      
      await waitFor(() => {
        expect(mockHistoryActions.loadMoreHistory).toHaveBeenCalled();
      });
    });

    // TC-008: 記録カードに必要な情報が表示される
    it('should display required information on record cards', () => {
      render(<HistoryListScreen />);
      
      const card = screen.getByTestId('history-card-log-001');
      expect(card).toHaveTextContent('2024年01月15日');
      expect(card).toHaveTextContent('自宅');
      expect(card).toHaveTextContent('会社');
      expect(card).toHaveTextContent('1時間30分');
    });

    // TC-009: 記録ステータスが色分けして表示される
    it('should display record status with color coding', () => {
      render(<HistoryListScreen />);
      
      const completedCard = screen.getByTestId('history-card-log-001');
      const inProgressCard = screen.getByTestId('history-card-log-002');
      
      expect(completedCard.querySelector('.status-completed')).toBeInTheDocument();
      expect(inProgressCard.querySelector('.status-in-progress')).toBeInTheDocument();
    });

    // TC-010: 記録カードクリックで詳細画面に遷移する
    it('should navigate to detail screen on card click', () => {
      const mockOnRecordSelect = jest.fn();
      render(<HistoryListScreen onRecordSelect={mockOnRecordSelect} />);
      
      const card = screen.getByTestId('history-card-log-001');
      fireEvent.click(card);
      
      expect(mockOnRecordSelect).toHaveBeenCalledWith('log-001');
    });
  });

  describe('Filter and Search', () => {
    // TC-011: 検索・フィルター機能が表示される
    it('should display search and filter functionality', () => {
      render(<HistoryListScreen />);
      
      expect(screen.getByTestId('history-filter')).toBeInTheDocument();
      expect(screen.getByLabelText('検索')).toBeInTheDocument();
      expect(screen.getByTestId('filter-toggle')).toBeInTheDocument();
    });

    // TC-012: フィルター適用時に結果が更新される
    it('should update results when filters are applied', async () => {
      render(<HistoryListScreen />);
      
      const statusFilter = screen.getByTestId('status-filter');
      fireEvent.change(statusFilter, { target: { value: 'completed' } });
      
      await waitFor(() => {
        expect(mockHistoryActions.setFilters).toHaveBeenCalledWith(
          expect.objectContaining({
            status: ['completed']
          })
        );
      });
    });

    // TC-013: フィルターリセット機能が動作する
    it('should reset filters when reset button is clicked', () => {
      render(<HistoryListScreen />);
      
      const resetButton = screen.getByTestId('filter-reset');
      fireEvent.click(resetButton);
      
      expect(mockHistoryActions.setFilters).toHaveBeenCalledWith({
        dateRange: {},
        locationSearch: undefined,
        status: undefined,
        distanceRange: undefined,
        durationRange: undefined
      });
    });

    // TC-014: 複数フィルター組み合わせが正しく動作する
    it('should handle multiple filter combinations correctly', async () => {
      render(<HistoryListScreen />);
      
      const locationSearch = screen.getByTestId('location-search');
      const statusFilter = screen.getByTestId('status-filter');
      
      fireEvent.change(locationSearch, { target: { value: '自宅' } });
      fireEvent.change(statusFilter, { target: { value: 'completed' } });
      
      await waitFor(() => {
        expect(mockHistoryActions.setFilters).toHaveBeenCalledWith(
          expect.objectContaining({
            locationSearch: '自宅',
            status: ['completed']
          })
        );
      });
    });

    // TC-015: 検索結果0件時に適切なメッセージが表示される
    it('should display appropriate message when search returns no results', () => {
      mockUseHistoryList.mockReturnValue({
        state: { 
          ...mockHistoryState, 
          records: [],
          filters: { ...mockHistoryState.filters, locationSearch: '存在しない場所' }
        },
        actions: mockHistoryActions
      });

      render(<HistoryListScreen />);
      
      expect(screen.getByTestId('no-results')).toBeInTheDocument();
      expect(screen.getByText('検索条件に一致する記録がありません')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    // AC-001: 適切な見出し構造が使用されている
    it('should use proper heading structure', () => {
      render(<HistoryListScreen />);
      
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
    });

    // AC-004: リスト領域にaria-labelが設定されている
    it('should have aria-label on list region', () => {
      render(<HistoryListScreen />);
      
      const listRegion = screen.getByTestId('history-list');
      expect(listRegion).toHaveAttribute('aria-label', '運転記録一覧');
    });

    // AC-007: 全ての操作要素がキーボードでアクセス可能
    it('should support keyboard navigation', () => {
      render(<HistoryListScreen />);
      
      const interactiveElements = screen.getAllByRole('button');
      interactiveElements.forEach(element => {
        expect(element).toHaveAttribute('tabIndex');
      });
    });
  });

  describe('Responsive Design', () => {
    // RD-001: モバイルレイアウトが適切に表示される
    it('should display mobile layout correctly', () => {
      // Mock window.innerWidth
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<HistoryListScreen />);
      
      const container = screen.getByTestId('history-list-screen');
      expect(container).toHaveClass('mobile-layout');
    });

    // RD-002: タッチ操作に適したボタンサイズ
    it('should have touch-friendly button sizes', () => {
      render(<HistoryListScreen />);
      
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        const styles = window.getComputedStyle(button);
        expect(parseInt(styles.minHeight)).toBeGreaterThanOrEqual(44);
      });
    });
  });

  describe('Error Handling', () => {
    // EH-001: ネットワークエラー時に再試行ボタンが表示される
    it('should display retry button on network error', () => {
      mockUseHistoryList.mockReturnValue({
        state: { ...mockHistoryState, error: 'ネットワークエラーが発生しました' },
        actions: mockHistoryActions
      });

      render(<HistoryListScreen />);
      
      expect(screen.getByTestId('error-message')).toBeInTheDocument();
      expect(screen.getByTestId('retry-button')).toBeInTheDocument();
    });

    // EH-002: サーバーエラー時に適切なエラーメッセージが表示される
    it('should display appropriate error message for server errors', () => {
      mockUseHistoryList.mockReturnValue({
        state: { ...mockHistoryState, error: 'サーバーエラーが発生しました' },
        actions: mockHistoryActions
      });

      render(<HistoryListScreen />);
      
      expect(screen.getByText('サーバーエラーが発生しました')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    // PF-001: 初期表示が2秒以内に完了する
    it('should complete initial render within performance budget', async () => {
      const startTime = performance.now();
      
      render(<HistoryListScreen />);
      
      await waitFor(() => {
        expect(screen.getByTestId('history-list-screen')).toBeInTheDocument();
      });
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      expect(renderTime).toBeLessThan(100); // 100ms以内でレンダリング
    });

    // PF-005: 大量データ表示でも快適に動作する
    it('should handle large datasets efficiently', () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        ...mockDrivingLogs[0],
        id: `log-${i.toString().padStart(3, '0')}`,
        date: new Date(2024, 0, i + 1)
      }));

      mockUseHistoryList.mockReturnValue({
        state: { ...mockHistoryState, records: largeDataset },
        actions: mockHistoryActions
      });

      const { rerender } = render(<HistoryListScreen />);
      
      // Should not crash with large datasets
      expect(() => rerender(<HistoryListScreen />)).not.toThrow();
    });
  });
});