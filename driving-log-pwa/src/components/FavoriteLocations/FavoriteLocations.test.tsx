import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { FavoriteLocations } from './FavoriteLocations';
import { FavoriteLocation } from '../../types';

// Mock geolocation
const mockGeolocation = {
  getCurrentPosition: jest.fn(),
};
Object.defineProperty(global.navigator, 'geolocation', {
  value: mockGeolocation,
});

describe('FavoriteLocations', () => {
  const mockLocations: FavoriteLocation[] = [
    {
      id: 'location-1',
      name: '自宅',
      address: '東京都渋谷区1-1-1',
      latitude: 35.6762,
      longitude: 139.6503,
      type: 'home',
      icon: '🏠',
      color: '#4CAF50',
      createdAt: new Date('2024-01-01'),
      usageCount: 25,
    },
    {
      id: 'location-2',
      name: '職場',
      address: '東京都新宿区2-2-2',
      latitude: 35.6895,
      longitude: 139.6917,
      type: 'work',
      icon: '🏢',
      color: '#2196F3',
      createdAt: new Date('2024-01-02'),
      usageCount: 18,
    },
    {
      id: 'location-3',
      name: 'コンビニ',
      address: '東京都港区3-3-3',
      latitude: 35.6584,
      longitude: 139.7329,
      type: 'other',
      icon: '🏪',
      color: '#FF9800',
      createdAt: new Date('2024-01-03'),
      usageCount: 5,
    },
  ];

  const mockOnLocationChange = jest.fn();
  const mockOnLocationAdd = jest.fn();
  const mockOnLocationEdit = jest.fn();
  const mockOnLocationDelete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('List Display', () => {
    test('should display list of favorite locations', () => {
      render(
        <FavoriteLocations
          locations={mockLocations}
          onLocationChange={mockOnLocationChange}
          onLocationAdd={mockOnLocationAdd}
          onLocationEdit={mockOnLocationEdit}
          onLocationDelete={mockOnLocationDelete}
        />
      );

      expect(screen.getByText('自宅')).toBeInTheDocument();
      expect(screen.getByText('職場')).toBeInTheDocument();
      expect(screen.getByText('コンビニ')).toBeInTheDocument();

      expect(screen.getByText('東京都渋谷区1-1-1')).toBeInTheDocument();
      expect(screen.getByText('東京都新宿区2-2-2')).toBeInTheDocument();
      expect(screen.getByText('東京都港区3-3-3')).toBeInTheDocument();
    });

    test('should show location type icons and labels', () => {
      render(
        <FavoriteLocations
          locations={mockLocations}
          onLocationChange={mockOnLocationChange}
          onLocationAdd={mockOnLocationAdd}
          onLocationEdit={mockOnLocationEdit}
          onLocationDelete={mockOnLocationDelete}
        />
      );

      // Check for type icons
      expect(screen.getByText('🏠')).toBeInTheDocument();
      expect(screen.getByText('🏢')).toBeInTheDocument();
      expect(screen.getByText('🏪')).toBeInTheDocument();

      // Check for type labels
      expect(screen.getByText('自宅')).toBeInTheDocument();
      expect(screen.getByText('職場')).toBeInTheDocument();
      expect(screen.getByText('その他')).toBeInTheDocument();
    });

    test('should display empty state when no locations', () => {
      render(
        <FavoriteLocations
          locations={[]}
          onLocationChange={mockOnLocationChange}
          onLocationAdd={mockOnLocationAdd}
          onLocationEdit={mockOnLocationEdit}
          onLocationDelete={mockOnLocationDelete}
        />
      );

      expect(screen.getByText('よく使う地点が登録されていません')).toBeInTheDocument();
      expect(screen.getByText('地点を追加')).toBeInTheDocument();
    });

    test('should support drag and drop reordering', async () => {
      render(
        <FavoriteLocations
          locations={mockLocations}
          onLocationChange={mockOnLocationChange}
          onLocationAdd={mockOnLocationAdd}
          onLocationEdit={mockOnLocationEdit}
          onLocationDelete={mockOnLocationDelete}
        />
      );

      const firstLocation = screen.getByTestId('location-item-location-1');
      const secondLocation = screen.getByTestId('location-item-location-2');

      // Simulate drag and drop
      fireEvent.dragStart(firstLocation);
      fireEvent.dragOver(secondLocation);
      fireEvent.drop(secondLocation);

      expect(mockOnLocationChange).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: 'location-2' }),
          expect.objectContaining({ id: 'location-1' }),
          expect.objectContaining({ id: 'location-3' }),
        ])
      );
    });

    test('should handle large number of locations', () => {
      const manyLocations = Array.from({ length: 100 }, (_, i) => ({
        id: `location-${i}`,
        name: `Location ${i}`,
        address: `Address ${i}`,
        latitude: 35.6762 + (i * 0.001),
        longitude: 139.6503 + (i * 0.001),
        type: 'other' as const,
        icon: '📍',
        color: '#757575',
        createdAt: new Date(2024, 0, i + 1),
        usageCount: i,
      }));

      const startTime = Date.now();
      render(
        <FavoriteLocations
          locations={manyLocations}
          onLocationChange={mockOnLocationChange}
          onLocationAdd={mockOnLocationAdd}
          onLocationEdit={mockOnLocationEdit}
          onLocationDelete={mockOnLocationDelete}
        />
      );
      const renderTime = Date.now() - startTime;

      // Should render efficiently
      expect(renderTime).toBeLessThan(1000);
      expect(screen.getByText('Location 0')).toBeInTheDocument();
    });

    test('should display location usage statistics', () => {
      render(
        <FavoriteLocations
          locations={mockLocations}
          onLocationChange={mockOnLocationChange}
          onLocationAdd={mockOnLocationAdd}
          onLocationEdit={mockOnLocationEdit}
          onLocationDelete={mockOnLocationDelete}
        />
      );

      expect(screen.getByText('25回使用')).toBeInTheDocument();
      expect(screen.getByText('18回使用')).toBeInTheDocument();
      expect(screen.getByText('5回使用')).toBeInTheDocument();
    });
  });

  describe('Search and Filter', () => {
    test('should filter locations by search query', () => {
      render(
        <FavoriteLocations
          locations={mockLocations}
          onLocationChange={mockOnLocationChange}
          onLocationAdd={mockOnLocationAdd}
          onLocationEdit={mockOnLocationEdit}
          onLocationDelete={mockOnLocationDelete}
        />
      );

      const searchInput = screen.getByPlaceholderText('地点を検索');
      fireEvent.change(searchInput, { target: { value: '自宅' } });

      expect(screen.getByText('自宅')).toBeInTheDocument();
      expect(screen.queryByText('職場')).not.toBeInTheDocument();
      expect(screen.queryByText('コンビニ')).not.toBeInTheDocument();
    });

    test('should highlight search matches', () => {
      render(
        <FavoriteLocations
          locations={mockLocations}
          onLocationChange={mockOnLocationChange}
          onLocationAdd={mockOnLocationAdd}
          onLocationEdit={mockOnLocationEdit}
          onLocationDelete={mockOnLocationDelete}
        />
      );

      const searchInput = screen.getByPlaceholderText('地点を検索');
      fireEvent.change(searchInput, { target: { value: '自' } });

      const highlightedText = screen.getByTestId('search-highlight');
      expect(highlightedText).toHaveClass('search-highlight');
    });

    test('should filter by location type', () => {
      render(
        <FavoriteLocations
          locations={mockLocations}
          onLocationChange={mockOnLocationChange}
          onLocationAdd={mockOnLocationAdd}
          onLocationEdit={mockOnLocationEdit}
          onLocationDelete={mockOnLocationDelete}
        />
      );

      const typeFilter = screen.getByLabelText('地点タイプ');
      fireEvent.change(typeFilter, { target: { value: 'home' } });

      expect(screen.getByText('自宅')).toBeInTheDocument();
      expect(screen.queryByText('職場')).not.toBeInTheDocument();
      expect(screen.queryByText('コンビニ')).not.toBeInTheDocument();
    });

    test('should show no results message for empty searches', () => {
      render(
        <FavoriteLocations
          locations={mockLocations}
          onLocationChange={mockOnLocationChange}
          onLocationAdd={mockOnLocationAdd}
          onLocationEdit={mockOnLocationEdit}
          onLocationDelete={mockOnLocationDelete}
        />
      );

      const searchInput = screen.getByPlaceholderText('地点を検索');
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

      expect(screen.getByText('該当する地点が見つかりません')).toBeInTheDocument();
      expect(screen.getByText('検索条件を変更してください')).toBeInTheDocument();
    });
  });

  describe('CRUD Operations', () => {
    test('should open add location form', () => {
      render(
        <FavoriteLocations
          locations={mockLocations}
          onLocationChange={mockOnLocationChange}
          onLocationAdd={mockOnLocationAdd}
          onLocationEdit={mockOnLocationEdit}
          onLocationDelete={mockOnLocationDelete}
        />
      );

      const addButton = screen.getByText('地点を追加');
      fireEvent.click(addButton);

      expect(screen.getByText('新しい地点を追加')).toBeInTheDocument();
      expect(screen.getByLabelText('地点名')).toBeInTheDocument();
      expect(screen.getByLabelText('住所')).toBeInTheDocument();
      expect(screen.getByLabelText('緯度')).toBeInTheDocument();
      expect(screen.getByLabelText('経度')).toBeInTheDocument();
    });

    test('should add location from current position', async () => {
      mockGeolocation.getCurrentPosition.mockImplementation((success) =>
        success({
          coords: {
            latitude: 35.6762,
            longitude: 139.6503,
            accuracy: 10,
          },
        })
      );

      render(
        <FavoriteLocations
          locations={mockLocations}
          onLocationChange={mockOnLocationChange}
          onLocationAdd={mockOnLocationAdd}
          onLocationEdit={mockOnLocationEdit}
          onLocationDelete={mockOnLocationDelete}
        />
      );

      const addCurrentButton = screen.getByText('現在地を追加');
      fireEvent.click(addCurrentButton);

      await waitFor(() => {
        expect(mockOnLocationAdd).toHaveBeenCalledWith(
          expect.objectContaining({
            latitude: 35.6762,
            longitude: 139.6503,
          })
        );
      });
    });

    test('should add location manually with validation', () => {
      render(
        <FavoriteLocations
          locations={mockLocations}
          onLocationChange={mockOnLocationChange}
          onLocationAdd={mockOnLocationAdd}
          onLocationEdit={mockOnLocationEdit}
          onLocationDelete={mockOnLocationDelete}
        />
      );

      const addButton = screen.getByText('地点を追加');
      fireEvent.click(addButton);

      // Fill form
      fireEvent.change(screen.getByLabelText('地点名'), {
        target: { value: '新しい地点' },
      });
      fireEvent.change(screen.getByLabelText('住所'), {
        target: { value: '東京都千代田区4-4-4' },
      });
      fireEvent.change(screen.getByLabelText('緯度'), {
        target: { value: '35.6762' },
      });
      fireEvent.change(screen.getByLabelText('経度'), {
        target: { value: '139.6503' },
      });

      const saveButton = screen.getByText('保存');
      fireEvent.click(saveButton);

      expect(mockOnLocationAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          name: '新しい地点',
          address: '東京都千代田区4-4-4',
          latitude: 35.6762,
          longitude: 139.6503,
        })
      );
    });

    test('should edit existing location', () => {
      render(
        <FavoriteLocations
          locations={mockLocations}
          onLocationChange={mockOnLocationChange}
          onLocationAdd={mockOnLocationAdd}
          onLocationEdit={mockOnLocationEdit}
          onLocationDelete={mockOnLocationDelete}
        />
      );

      const editButton = screen.getAllByLabelText('編集')[0];
      fireEvent.click(editButton);

      // Form should be pre-filled with current values
      expect(screen.getByDisplayValue('自宅')).toBeInTheDocument();
      expect(screen.getByDisplayValue('東京都渋谷区1-1-1')).toBeInTheDocument();

      // Edit the name
      const nameInput = screen.getByDisplayValue('自宅');
      fireEvent.change(nameInput, { target: { value: '新しい自宅' } });

      const saveButton = screen.getByText('保存');
      fireEvent.click(saveButton);

      expect(mockOnLocationEdit).toHaveBeenCalledWith(
        'location-1',
        expect.objectContaining({
          name: '新しい自宅',
        })
      );
    });

    test('should validate location name uniqueness', () => {
      render(
        <FavoriteLocations
          locations={mockLocations}
          onLocationChange={mockOnLocationChange}
          onLocationAdd={mockOnLocationAdd}
          onLocationEdit={mockOnLocationEdit}
          onLocationDelete={mockOnLocationDelete}
        />
      );

      const addButton = screen.getByText('地点を追加');
      fireEvent.click(addButton);

      // Try to add location with existing name
      fireEvent.change(screen.getByLabelText('地点名'), {
        target: { value: '自宅' },
      });

      const saveButton = screen.getByText('保存');
      fireEvent.click(saveButton);

      expect(screen.getByText('この名前は既に使用されています')).toBeInTheDocument();
      expect(mockOnLocationAdd).not.toHaveBeenCalled();
    });

    test('should validate coordinate values', () => {
      render(
        <FavoriteLocations
          locations={mockLocations}
          onLocationChange={mockOnLocationChange}
          onLocationAdd={mockOnLocationAdd}
          onLocationEdit={mockOnLocationEdit}
          onLocationDelete={mockOnLocationDelete}
        />
      );

      const addButton = screen.getByText('地点を追加');
      fireEvent.click(addButton);

      // Enter invalid coordinates
      fireEvent.change(screen.getByLabelText('緯度'), {
        target: { value: '200' }, // Invalid latitude
      });
      fireEvent.change(screen.getByLabelText('経度'), {
        target: { value: '300' }, // Invalid longitude
      });

      const saveButton = screen.getByText('保存');
      fireEvent.click(saveButton);

      expect(screen.getByText('緯度は-90から90の間で入力してください')).toBeInTheDocument();
      expect(screen.getByText('経度は-180から180の間で入力してください')).toBeInTheDocument();
      expect(mockOnLocationAdd).not.toHaveBeenCalled();
    });

    test('should delete location with confirmation', async () => {
      render(
        <FavoriteLocations
          locations={mockLocations}
          onLocationChange={mockOnLocationChange}
          onLocationAdd={mockOnLocationAdd}
          onLocationEdit={mockOnLocationEdit}
          onLocationDelete={mockOnLocationDelete}
        />
      );

      const deleteButton = screen.getAllByLabelText('削除')[0];
      fireEvent.click(deleteButton);

      // Should show confirmation dialog
      expect(screen.getByText('地点を削除しますか？')).toBeInTheDocument();
      expect(screen.getByText('この操作は取り消せません。')).toBeInTheDocument();

      const confirmButton = screen.getByText('削除');
      fireEvent.click(confirmButton);

      expect(mockOnLocationDelete).toHaveBeenCalledWith('location-1');
    });

    test('should cancel edit without saving changes', () => {
      render(
        <FavoriteLocations
          locations={mockLocations}
          onLocationChange={mockOnLocationChange}
          onLocationAdd={mockOnLocationAdd}
          onLocationEdit={mockOnLocationEdit}
          onLocationDelete={mockOnLocationDelete}
        />
      );

      const editButton = screen.getAllByLabelText('編集')[0];
      fireEvent.click(editButton);

      // Make changes
      const nameInput = screen.getByDisplayValue('自宅');
      fireEvent.change(nameInput, { target: { value: '変更された名前' } });

      // Cancel
      const cancelButton = screen.getByText('キャンセル');
      fireEvent.click(cancelButton);

      // Should show confirmation for unsaved changes
      expect(screen.getByText('変更を破棄しますか？')).toBeInTheDocument();

      const discardButton = screen.getByText('破棄');
      fireEvent.click(discardButton);

      expect(mockOnLocationEdit).not.toHaveBeenCalled();
    });
  });
});