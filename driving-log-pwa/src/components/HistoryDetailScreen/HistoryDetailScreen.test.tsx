import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { HistoryDetailScreen } from './HistoryDetailScreen';
import { useHistoryDetail } from '../../hooks/useHistoryDetail';
import { DrivingLogStatus, LocationType } from '../../types';

// Mock the useHistoryDetail hook
jest.mock('../../hooks/useHistoryDetail');
const mockUseHistoryDetail = useHistoryDetail as jest.MockedFunction<typeof useHistoryDetail>;

// Mock data
const mockDetailRecord = {
  id: 'log-001',
  date: new Date('2024-01-15'),
  startTime: new Date('2024-01-15T09:00:00'),
  endTime: new Date('2024-01-15T10:30:00'),
  status: DrivingLogStatus.COMPLETED,
  startLocation: {
    id: 'loc-start',
    name: '自宅',
    latitude: 35.6580,
    longitude: 139.7016,
    timestamp: new Date('2024-01-15T09:00:00'),
    type: LocationType.START
  },
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

const mockDetailState = {
  record: mockDetailRecord,
  waypoints: mockDetailRecord.waypoints,
  loading: false,
  editing: false,
  error: null
};

const mockDetailActions = {
  loadRecord: jest.fn(),
  editRecord: jest.fn(),
  deleteRecord: jest.fn(),
  editWaypoint: jest.fn(),
  deleteWaypoint: jest.fn(),
  exportRecord: jest.fn(),
  toggleEditing: jest.fn()
};

describe('HistoryDetailScreen Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseHistoryDetail.mockReturnValue({
      state: mockDetailState,
      actions: mockDetailActions
    });
  });

  describe('Basic Rendering', () => {
    // TC-016: 詳細画面が正常にレンダリングされる
    it('should render detail screen correctly', () => {
      render(<HistoryDetailScreen recordId="log-001" />);
      
      expect(screen.getByTestId('history-detail-screen')).toBeInTheDocument();
      expect(screen.getByRole('main')).toBeInTheDocument();
    });

    // TC-017: 記録IDに対応する詳細データが表示される
    it('should display detail data for the specified record ID', () => {
      render(<HistoryDetailScreen recordId="log-001" />);
      
      expect(mockDetailActions.loadRecord).toHaveBeenCalledWith('log-001');
      expect(screen.getByText('2024年01月15日')).toBeInTheDocument();
      expect(screen.getByText('自宅')).toBeInTheDocument();
      expect(screen.getByText('会社')).toBeInTheDocument();
    });

    // TC-018: 戻るボタンが正しく動作する
    it('should handle back button correctly', () => {
      const mockOnBack = jest.fn();
      render(<HistoryDetailScreen recordId="log-001" onBack={mockOnBack} />);
      
      const backButton = screen.getByTestId('back-button');
      fireEvent.click(backButton);
      
      expect(mockOnBack).toHaveBeenCalledTimes(1);
    });

    // TC-019: 記録が存在しない場合エラーメッセージが表示される
    it('should display error message when record does not exist', () => {
      mockUseHistoryDetail.mockReturnValue({
        state: { ...mockDetailState, record: null, error: '記録が見つかりません' },
        actions: mockDetailActions
      });

      render(<HistoryDetailScreen recordId="log-999" />);
      
      expect(screen.getByTestId('error-message')).toBeInTheDocument();
      expect(screen.getByText('記録が見つかりません')).toBeInTheDocument();
    });
  });

  describe('Detail Information Display', () => {
    // TC-020: 記録概要が正確に表示される
    it('should display record summary accurately', () => {
      render(<HistoryDetailScreen recordId="log-001" />);
      
      expect(screen.getByTestId('record-summary')).toBeInTheDocument();
      expect(screen.getByText('2024年01月15日')).toBeInTheDocument();
      expect(screen.getByText('09:00')).toBeInTheDocument();
      expect(screen.getByText('10:30')).toBeInTheDocument();
      expect(screen.getByText('1時間30分')).toBeInTheDocument();
    });

    // TC-021: 記録統計が表示される
    it('should display record statistics', () => {
      render(<HistoryDetailScreen recordId="log-001" />);
      
      const statisticsSection = screen.getByTestId('record-statistics');
      expect(statisticsSection).toBeInTheDocument();
      
      expect(screen.getByText('平均速度')).toBeInTheDocument();
      expect(screen.getByText('最高速度')).toBeInTheDocument();
      expect(screen.getByText('停止時間')).toBeInTheDocument();
    });

    // TC-022: GPS精度情報が表示される
    it('should display GPS accuracy information', () => {
      render(<HistoryDetailScreen recordId="log-001" />);
      
      const gpsInfo = screen.getByTestId('gps-accuracy');
      expect(gpsInfo).toBeInTheDocument();
      expect(screen.getByText('GPS精度')).toBeInTheDocument();
    });

    // TC-023: ウェイポイント一覧が時系列順で表示される
    it('should display waypoints in chronological order', () => {
      render(<HistoryDetailScreen recordId="log-001" />);
      
      const waypointList = screen.getByTestId('waypoint-list');
      expect(waypointList).toBeInTheDocument();
      
      const waypoints = screen.getAllByTestId(/waypoint-item-/);
      expect(waypoints).toHaveLength(3);
      
      // Check order
      expect(waypoints[0]).toHaveTextContent('自宅');
      expect(waypoints[1]).toHaveTextContent('ガソリンスタンド');
      expect(waypoints[2]).toHaveTextContent('会社');
    });
  });

  describe('Operation Functionality', () => {
    // TC-024: 編集ボタンクリックで編集モードに切り替わる
    it('should switch to edit mode when edit button is clicked', () => {
      render(<HistoryDetailScreen recordId="log-001" />);
      
      const editButton = screen.getByTestId('edit-button');
      fireEvent.click(editButton);
      
      expect(mockDetailActions.toggleEditing).toHaveBeenCalledTimes(1);
    });

    // TC-025: 削除ボタンクリックで確認ダイアログが表示される
    it('should display confirmation dialog when delete button is clicked', () => {
      render(<HistoryDetailScreen recordId="log-001" />);
      
      const deleteButton = screen.getByTestId('delete-button');
      fireEvent.click(deleteButton);
      
      expect(screen.getByTestId('delete-confirmation')).toBeInTheDocument();
      expect(screen.getByText('この記録を削除しますか？')).toBeInTheDocument();
    });

    // TC-026: 削除確認で記録が削除される
    it('should delete record when deletion is confirmed', async () => {
      const mockOnDelete = jest.fn();
      render(<HistoryDetailScreen recordId="log-001" onDelete={mockOnDelete} />);
      
      const deleteButton = screen.getByTestId('delete-button');
      fireEvent.click(deleteButton);
      
      const confirmButton = screen.getByTestId('confirm-delete');
      fireEvent.click(confirmButton);
      
      await waitFor(() => {
        expect(mockDetailActions.deleteRecord).toHaveBeenCalledWith('log-001');
        expect(mockOnDelete).toHaveBeenCalledWith('log-001');
      });
    });

    // TC-027: エクスポートボタンで個別エクスポートが実行される
    it('should execute individual export when export button is clicked', () => {
      render(<HistoryDetailScreen recordId="log-001" />);
      
      const exportButton = screen.getByTestId('export-button');
      fireEvent.click(exportButton);
      
      expect(mockDetailActions.exportRecord).toHaveBeenCalledWith('log-001');
    });
  });

  describe('Loading and Error States', () => {
    // Loading state test
    it('should display loading state correctly', () => {
      mockUseHistoryDetail.mockReturnValue({
        state: { ...mockDetailState, loading: true, record: null },
        actions: mockDetailActions
      });

      render(<HistoryDetailScreen recordId="log-001" />);
      
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    // Error state test
    it('should handle errors gracefully', () => {
      mockUseHistoryDetail.mockReturnValue({
        state: { ...mockDetailState, error: 'データの読み込みに失敗しました' },
        actions: mockDetailActions
      });

      render(<HistoryDetailScreen recordId="log-001" />);
      
      expect(screen.getByText('データの読み込みに失敗しました')).toBeInTheDocument();
      expect(screen.getByTestId('retry-button')).toBeInTheDocument();
    });
  });

  describe('Editing Mode', () => {
    beforeEach(() => {
      mockUseHistoryDetail.mockReturnValue({
        state: { ...mockDetailState, editing: true },
        actions: mockDetailActions
      });
    });

    it('should display edit form in editing mode', () => {
      render(<HistoryDetailScreen recordId="log-001" />);
      
      expect(screen.getByTestId('edit-form')).toBeInTheDocument();
      expect(screen.getByTestId('save-button')).toBeInTheDocument();
      expect(screen.getByTestId('cancel-button')).toBeInTheDocument();
    });

    it('should allow waypoint name editing', () => {
      render(<HistoryDetailScreen recordId="log-001" />);
      
      const waypointNameInput = screen.getByDisplayValue('ガソリンスタンド');
      fireEvent.change(waypointNameInput, { target: { value: 'ENEOS' } });
      
      expect(waypointNameInput).toHaveValue('ENEOS');
    });

    it('should save changes when save button is clicked', async () => {
      render(<HistoryDetailScreen recordId="log-001" />);
      
      const saveButton = screen.getByTestId('save-button');
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(mockDetailActions.editRecord).toHaveBeenCalled();
      });
    });
  });

  describe('Accessibility', () => {
    // AC-002: リスト構造が適切に使用されている
    it('should use proper list structure for waypoints', () => {
      render(<HistoryDetailScreen recordId="log-001" />);
      
      const waypointList = screen.getByRole('list');
      expect(waypointList).toBeInTheDocument();
      
      const listItems = screen.getAllByRole('listitem');
      expect(listItems).toHaveLength(3);
    });

    // AC-003: ボタン要素が適切に使用されている
    it('should use button elements appropriately', () => {
      render(<HistoryDetailScreen recordId="log-001" />);
      
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button.tagName).toBe('BUTTON');
      });
    });

    // AC-006: ステータス表示にaria-liveが設定されている
    it('should have aria-live on status displays', () => {
      render(<HistoryDetailScreen recordId="log-001" />);
      
      const statusDisplay = screen.getByTestId('record-status');
      expect(statusDisplay).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('Responsive Design', () => {
    // RD-004: タブレットレイアウトが適切に表示される
    it('should display tablet layout correctly', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });

      render(<HistoryDetailScreen recordId="log-001" />);
      
      const container = screen.getByTestId('history-detail-screen');
      expect(container).toHaveClass('tablet-layout');
    });
  });

  describe('Performance', () => {
    // Performance test for detail screen rendering
    it('should render detail screen within performance budget', async () => {
      const startTime = performance.now();
      
      render(<HistoryDetailScreen recordId="log-001" />);
      
      await waitFor(() => {
        expect(screen.getByTestId('history-detail-screen')).toBeInTheDocument();
      });
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      expect(renderTime).toBeLessThan(100);
    });
  });
});