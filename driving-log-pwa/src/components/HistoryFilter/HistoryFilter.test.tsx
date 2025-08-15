import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { HistoryFilter } from './HistoryFilter';
import { DrivingLogStatus } from '../../types';

// Mock data
const mockFilters = {
  dateRange: {},
  locationSearch: undefined,
  status: undefined,
  distanceRange: undefined,
  durationRange: undefined
};

const mockFiltersWithData = {
  dateRange: {
    start: new Date('2024-01-01'),
    end: new Date('2024-01-31')
  },
  locationSearch: '自宅',
  status: [DrivingLogStatus.COMPLETED],
  distanceRange: { min: 0, max: 100 },
  durationRange: { min: 30, max: 120 }
};

describe('HistoryFilter Component', () => {
  const mockOnFiltersChange = jest.fn();
  const mockOnReset = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Date Filter Tests', () => {
    // TC-028: 日付範囲フィルターが正しく動作する
    it('should handle date range filter correctly', async () => {
      render(
        <HistoryFilter 
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange}
          onReset={mockOnReset}
        />
      );

      const startDateInput = screen.getByTestId('start-date-input');
      const endDateInput = screen.getByTestId('end-date-input');

      fireEvent.change(startDateInput, { target: { value: '2024-01-01' } });
      fireEvent.change(endDateInput, { target: { value: '2024-01-31' } });

      await waitFor(() => {
        expect(mockOnFiltersChange).toHaveBeenCalledWith(
          expect.objectContaining({
            dateRange: {
              start: new Date('2024-01-01'),
              end: new Date('2024-01-31')
            }
          })
        );
      });
    });

    // TC-029: 開始日のみ設定時に正しくフィルタリングされる
    it('should handle start date only filter', async () => {
      render(
        <HistoryFilter 
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange}
          onReset={mockOnReset}
        />
      );

      const startDateInput = screen.getByTestId('start-date-input');
      fireEvent.change(startDateInput, { target: { value: '2024-01-01' } });

      await waitFor(() => {
        expect(mockOnFiltersChange).toHaveBeenCalledWith(
          expect.objectContaining({
            dateRange: {
              start: new Date('2024-01-01'),
              end: undefined
            }
          })
        );
      });
    });

    // TC-030: 終了日のみ設定時に正しくフィルタリングされる
    it('should handle end date only filter', async () => {
      render(
        <HistoryFilter 
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange}
          onReset={mockOnReset}
        />
      );

      const endDateInput = screen.getByTestId('end-date-input');
      fireEvent.change(endDateInput, { target: { value: '2024-01-31' } });

      await waitFor(() => {
        expect(mockOnFiltersChange).toHaveBeenCalledWith(
          expect.objectContaining({
            dateRange: {
              start: undefined,
              end: new Date('2024-01-31')
            }
          })
        );
      });
    });

    // TC-031: 無効な日付範囲でエラー表示される
    it('should display error for invalid date range', async () => {
      render(
        <HistoryFilter 
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange}
          onReset={mockOnReset}
        />
      );

      const startDateInput = screen.getByTestId('start-date-input');
      const endDateInput = screen.getByTestId('end-date-input');

      // Set end date before start date
      fireEvent.change(startDateInput, { target: { value: '2024-01-31' } });
      fireEvent.change(endDateInput, { target: { value: '2024-01-01' } });

      await waitFor(() => {
        expect(screen.getByTestId('date-range-error')).toBeInTheDocument();
        expect(screen.getByText('終了日は開始日より後の日付を選択してください')).toBeInTheDocument();
      });
    });
  });

  describe('Search and Other Filters Tests', () => {
    // TC-032: 地点名検索が部分一致で動作する
    it('should handle location search with partial matching', async () => {
      render(
        <HistoryFilter 
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange}
          onReset={mockOnReset}
        />
      );

      const locationSearch = screen.getByTestId('location-search-input');
      fireEvent.change(locationSearch, { target: { value: '自宅' } });

      await waitFor(() => {
        expect(mockOnFiltersChange).toHaveBeenCalledWith(
          expect.objectContaining({
            locationSearch: '自宅'
          })
        );
      });
    });

    // TC-033: ステータスフィルターが正しく動作する
    it('should handle status filter correctly', async () => {
      render(
        <HistoryFilter 
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange}
          onReset={mockOnReset}
        />
      );

      const statusSelect = screen.getByTestId('status-filter-select');
      fireEvent.change(statusSelect, { target: { value: 'completed' } });

      await waitFor(() => {
        expect(mockOnFiltersChange).toHaveBeenCalledWith(
          expect.objectContaining({
            status: [DrivingLogStatus.COMPLETED]
          })
        );
      });
    });

    // TC-034: 距離範囲フィルターが正しく動作する
    it('should handle distance range filter correctly', async () => {
      render(
        <HistoryFilter 
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange}
          onReset={mockOnReset}
        />
      );

      const minDistanceInput = screen.getByTestId('min-distance-input');
      const maxDistanceInput = screen.getByTestId('max-distance-input');

      fireEvent.change(minDistanceInput, { target: { value: '10' } });
      fireEvent.change(maxDistanceInput, { target: { value: '100' } });

      await waitFor(() => {
        expect(mockOnFiltersChange).toHaveBeenCalledWith(
          expect.objectContaining({
            distanceRange: { min: 10, max: 100 }
          })
        );
      });
    });

    // TC-035: 時間範囲フィルターが正しく動作する
    it('should handle duration range filter correctly', async () => {
      render(
        <HistoryFilter 
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange}
          onReset={mockOnReset}
        />
      );

      const minDurationInput = screen.getByTestId('min-duration-input');
      const maxDurationInput = screen.getByTestId('max-duration-input');

      fireEvent.change(minDurationInput, { target: { value: '30' } });
      fireEvent.change(maxDurationInput, { target: { value: '120' } });

      await waitFor(() => {
        expect(mockOnFiltersChange).toHaveBeenCalledWith(
          expect.objectContaining({
            durationRange: { min: 30, max: 120 }
          })
        );
      });
    });

    // TC-036: フィルター組み合わせがAND条件で動作する
    it('should handle multiple filter combinations with AND logic', async () => {
      render(
        <HistoryFilter 
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange}
          onReset={mockOnReset}
        />
      );

      const locationSearch = screen.getByTestId('location-search-input');
      const statusSelect = screen.getByTestId('status-filter-select');
      const minDistanceInput = screen.getByTestId('min-distance-input');

      fireEvent.change(locationSearch, { target: { value: '自宅' } });
      fireEvent.change(statusSelect, { target: { value: 'completed' } });
      fireEvent.change(minDistanceInput, { target: { value: '5' } });

      await waitFor(() => {
        expect(mockOnFiltersChange).toHaveBeenCalledWith(
          expect.objectContaining({
            locationSearch: '自宅',
            status: [DrivingLogStatus.COMPLETED],
            distanceRange: expect.objectContaining({ min: 5 })
          })
        );
      });
    });

    // TC-037: フィルターリセットで全条件がクリアされる
    it('should clear all conditions when filter is reset', async () => {
      render(
        <HistoryFilter 
          filters={mockFiltersWithData}
          onFiltersChange={mockOnFiltersChange}
          onReset={mockOnReset}
        />
      );

      const resetButton = screen.getByTestId('filter-reset-button');
      fireEvent.click(resetButton);

      expect(mockOnReset).toHaveBeenCalledTimes(1);
    });
  });

  describe('UI and Interaction Tests', () => {
    // Expandable filter panel test
    it('should toggle filter panel expansion', () => {
      render(
        <HistoryFilter 
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange}
          onReset={mockOnReset}
        />
      );

      const expandButton = screen.getByTestId('filter-expand-button');
      
      // Initially collapsed on mobile
      expect(screen.getByTestId('filter-panel')).toHaveClass('collapsed');

      fireEvent.click(expandButton);
      expect(screen.getByTestId('filter-panel')).toHaveClass('expanded');

      fireEvent.click(expandButton);
      expect(screen.getByTestId('filter-panel')).toHaveClass('collapsed');
    });

    // Filter count display test
    it('should display active filter count', () => {
      render(
        <HistoryFilter 
          filters={mockFiltersWithData}
          onFiltersChange={mockOnFiltersChange}
          onReset={mockOnReset}
        />
      );

      const filterCount = screen.getByTestId('active-filter-count');
      expect(filterCount).toBeInTheDocument();
      expect(filterCount).toHaveTextContent('4'); // 4 active filters
    });

    // Preset filter options test
    it('should handle preset filter options', async () => {
      render(
        <HistoryFilter 
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange}
          onReset={mockOnReset}
        />
      );

      const todayPreset = screen.getByTestId('preset-today');
      fireEvent.click(todayPreset);

      await waitFor(() => {
        expect(mockOnFiltersChange).toHaveBeenCalledWith(
          expect.objectContaining({
            dateRange: {
              start: expect.any(Date),
              end: expect.any(Date)
            }
          })
        );
      });
    });
  });

  describe('Accessibility Tests', () => {
    // AC-005: 検索フィールドにaria-describedbyが設定されている
    it('should have aria-describedby on search fields', () => {
      render(
        <HistoryFilter 
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange}
          onReset={mockOnReset}
        />
      );

      const locationSearch = screen.getByTestId('location-search-input');
      expect(locationSearch).toHaveAttribute('aria-describedby');
    });

    // Label associations test
    it('should have proper label associations', () => {
      render(
        <HistoryFilter 
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange}
          onReset={mockOnReset}
        />
      );

      const startDateInput = screen.getByTestId('start-date-input');
      const startDateLabel = screen.getByLabelText('開始日');
      
      expect(startDateInput).toBe(startDateLabel);
    });

    // Keyboard navigation test
    it('should support keyboard navigation', () => {
      render(
        <HistoryFilter 
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange}
          onReset={mockOnReset}
        />
      );

      const inputs = screen.getAllByRole('textbox');
      const selects = screen.getAllByRole('combobox');
      const buttons = screen.getAllByRole('button');
      
      [...inputs, ...selects, ...buttons].forEach(element => {
        expect(element).toHaveAttribute('tabIndex');
      });
    });
  });

  describe('Responsive Design Tests', () => {
    // RD-003: フィルターが展開・折りたたみ可能
    it('should be expandable and collapsible on mobile', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(
        <HistoryFilter 
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange}
          onReset={mockOnReset}
        />
      );

      const filterPanel = screen.getByTestId('filter-panel');
      expect(filterPanel).toHaveClass('mobile-layout');

      const expandButton = screen.getByTestId('filter-expand-button');
      expect(expandButton).toBeVisible();
    });

    // Desktop layout test
    it('should display expanded layout on desktop', () => {
      // Mock desktop viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      });

      render(
        <HistoryFilter 
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange}
          onReset={mockOnReset}
        />
      );

      const filterPanel = screen.getByTestId('filter-panel');
      expect(filterPanel).toHaveClass('desktop-layout');
      expect(filterPanel).toHaveClass('expanded');
    });
  });

  describe('Performance Tests', () => {
    // Debounced input test
    it('should debounce search input to avoid excessive API calls', async () => {
      jest.useFakeTimers();

      render(
        <HistoryFilter 
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange}
          onReset={mockOnReset}
        />
      );

      const locationSearch = screen.getByTestId('location-search-input');

      // Type rapidly
      fireEvent.change(locationSearch, { target: { value: 'a' } });
      fireEvent.change(locationSearch, { target: { value: 'ab' } });
      fireEvent.change(locationSearch, { target: { value: 'abc' } });

      // Should not call immediately
      expect(mockOnFiltersChange).not.toHaveBeenCalled();

      // Fast-forward timers
      act(() => {
        jest.advanceTimersByTime(500);
      });

      // Should call only once with final value
      expect(mockOnFiltersChange).toHaveBeenCalledTimes(1);
      expect(mockOnFiltersChange).toHaveBeenCalledWith(
        expect.objectContaining({
          locationSearch: 'abc'
        })
      );

      jest.useRealTimers();
    });
  });

  describe('Error Handling Tests', () => {
    // Invalid input handling
    it('should handle invalid numeric inputs gracefully', async () => {
      render(
        <HistoryFilter 
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange}
          onReset={mockOnReset}
        />
      );

      const minDistanceInput = screen.getByTestId('min-distance-input');
      fireEvent.change(minDistanceInput, { target: { value: 'invalid' } });

      // Should display validation error
      await waitFor(() => {
        expect(screen.getByTestId('distance-validation-error')).toBeInTheDocument();
      });

      // Should not call onFiltersChange with invalid data
      expect(mockOnFiltersChange).not.toHaveBeenCalled();
    });

    // Range validation test
    it('should validate range inputs', async () => {
      render(
        <HistoryFilter 
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange}
          onReset={mockOnReset}
        />
      );

      const minDistanceInput = screen.getByTestId('min-distance-input');
      const maxDistanceInput = screen.getByTestId('max-distance-input');

      // Set min > max
      fireEvent.change(minDistanceInput, { target: { value: '100' } });
      fireEvent.change(maxDistanceInput, { target: { value: '50' } });

      await waitFor(() => {
        expect(screen.getByTestId('distance-range-error')).toBeInTheDocument();
        expect(screen.getByText('最小値は最大値より小さい値を入力してください')).toBeInTheDocument();
      });
    });
  });
});