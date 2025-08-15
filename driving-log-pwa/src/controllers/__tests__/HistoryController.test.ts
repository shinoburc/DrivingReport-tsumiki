import { HistoryController } from '../HistoryController';
import { DrivingLogController } from '../DrivingLogController';
import { StorageService } from '../../services/StorageService';
import { DrivingLogModel } from '../../models/entities/DrivingLogModel';
import {
  IHistoryController,
  HistoryQueryOptions,
  HistoryFilters,
  SortOptions,
  SearchQuery,
  DateRange,
  ViewSettings,
  DrivingLogStatus,
  HistoryStatistics
} from '../../types';

// Mock dependencies
jest.mock('../DrivingLogController');
jest.mock('../../services/StorageService');

describe('HistoryController', () => {
  let controller: IHistoryController;
  let mockDrivingLogController: jest.Mocked<DrivingLogController>;
  let mockStorageService: jest.Mocked<StorageService>;

  // Mock data
  const mockHistoryData = Array.from({ length: 100 }, (_, i) => 
    DrivingLogModel.create({
      id: `log-${i}`,
      date: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
      startLocation: { 
        id: `start-${i}`,
        name: `出発地${i % 10}`,
        latitude: 35.6762 + (i % 10) * 0.01,
        longitude: 139.6503 + (i % 10) * 0.01
      },
      endLocation: { 
        id: `end-${i}`,
        name: `到着地${i % 10}`,
        latitude: 35.6897 + (i % 10) * 0.01,
        longitude: 139.6922 + (i % 10) * 0.01
      },
      waypoints: [],
      totalDistance: Math.random() * 100,
      duration: Math.random() * 480,
      status: i % 3 === 0 ? DrivingLogStatus.IN_PROGRESS : 
             i % 3 === 1 ? DrivingLogStatus.COMPLETED : DrivingLogStatus.CANCELLED,
      purpose: ['営業', '通勤', 'プライベート'][i % 3],
      memo: `テストメモ${i}`
    })
  );

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock instances
    mockDrivingLogController = {} as jest.Mocked<DrivingLogController>;
    mockStorageService = new StorageService() as jest.Mocked<StorageService>;

    // Setup default mock implementations
    mockStorageService.get = jest.fn().mockResolvedValue(null);
    mockStorageService.save = jest.fn().mockImplementation((key, data) => Promise.resolve(data));
    mockStorageService.getAll = jest.fn().mockResolvedValue(mockHistoryData);

    // Initialize controller
    controller = new HistoryController(mockDrivingLogController, mockStorageService);
  });

  describe('getHistoryList', () => {
    it('should return history list with default options', async () => {
      // Act
      const result = await controller.getHistoryList();

      // Assert
      expect(result.items).toBeDefined();
      expect(result.totalCount).toBe(100);
      expect(result.items.length).toBeLessThanOrEqual(20); // Default page size
      expect(mockStorageService.getAll).toHaveBeenCalledWith('drivingLogs');
    });

    it('should return empty list when no data', async () => {
      // Arrange
      mockStorageService.getAll.mockResolvedValue([]);

      // Act
      const result = await controller.getHistoryList();

      // Assert
      expect(result.items).toEqual([]);
      expect(result.totalCount).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    it('should apply pagination options', async () => {
      // Arrange
      const options: HistoryQueryOptions = {
        pagination: { page: 1, size: 10 }
      };

      // Act
      const result = await controller.getHistoryList(options);

      // Assert
      expect(result.items.length).toBeLessThanOrEqual(10);
      expect(result.hasMore).toBe(true);
    });

    it('should apply sort options', async () => {
      // Arrange
      const options: HistoryQueryOptions = {
        sort: { field: 'date', order: 'asc' }
      };

      // Act
      const result = await controller.getHistoryList(options);

      // Assert
      expect(result.items).toBeDefined();
      // Check if sorted by date ascending
      if (result.items.length > 1) {
        const firstDate = new Date(result.items[0].date);
        const secondDate = new Date(result.items[1].date);
        expect(firstDate.getTime()).toBeLessThanOrEqual(secondDate.getTime());
      }
    });
  });

  describe('searchHistory', () => {
    it('should search by text in location names', async () => {
      // Arrange
      const query: SearchQuery = { text: '出発地1' };

      // Act
      const result = await controller.searchHistory(query);

      // Assert
      expect(result.items).toBeDefined();
      // Should find items with '出発地1' in location name
      result.items.forEach(item => {
        expect(
          item.startLocation?.name?.includes('出発地1') ||
          item.endLocation?.name?.includes('出発地1')
        ).toBeTruthy();
      });
    });

    it('should search by text in memo field', async () => {
      // Arrange
      const query: SearchQuery = { text: 'テストメモ1', fields: ['memo'] };

      // Act
      const result = await controller.searchHistory(query);

      // Assert
      expect(result.items).toBeDefined();
      result.items.forEach(item => {
        expect(item.memo).toContain('テストメモ1');
      });
    });

    it('should return empty result for non-matching search', async () => {
      // Arrange
      const query: SearchQuery = { text: '存在しない文字列' };

      // Act
      const result = await controller.searchHistory(query);

      // Assert
      expect(result.items).toEqual([]);
      expect(result.totalCount).toBe(0);
    });

    it('should limit search results', async () => {
      // Arrange
      const query: SearchQuery = { text: '出発地', maxResults: 5 };

      // Act
      const result = await controller.searchHistory(query);

      // Assert
      expect(result.items.length).toBeLessThanOrEqual(5);
    });
  });

  describe('filterHistory', () => {
    it('should filter by date range', async () => {
      // Arrange
      const startDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000); // 10 days ago
      const endDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);   // 5 days ago
      const filters: HistoryFilters = {
        dateRange: { startDate, endDate }
      };

      // Act
      const result = await controller.filterHistory(filters);

      // Assert
      expect(result.items).toBeDefined();
      result.items.forEach(item => {
        const itemDate = new Date(item.date);
        expect(itemDate.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
        expect(itemDate.getTime()).toBeLessThanOrEqual(endDate.getTime());
      });
    });

    it('should filter by status', async () => {
      // Arrange
      const filters: HistoryFilters = {
        status: [DrivingLogStatus.COMPLETED]
      };

      // Act
      const result = await controller.filterHistory(filters);

      // Assert
      expect(result.items).toBeDefined();
      result.items.forEach(item => {
        expect(item.status).toBe(DrivingLogStatus.COMPLETED);
      });
    });

    it('should filter by distance range', async () => {
      // Arrange
      const filters: HistoryFilters = {
        distanceRange: { min: 10, max: 50 }
      };

      // Act
      const result = await controller.filterHistory(filters);

      // Assert
      expect(result.items).toBeDefined();
      result.items.forEach(item => {
        if (item.totalDistance !== undefined) {
          expect(item.totalDistance).toBeGreaterThanOrEqual(10);
          expect(item.totalDistance).toBeLessThanOrEqual(50);
        }
      });
    });

    it('should apply multiple filters', async () => {
      // Arrange
      const filters: HistoryFilters = {
        status: [DrivingLogStatus.COMPLETED],
        distanceRange: { min: 20 }
      };

      // Act
      const result = await controller.filterHistory(filters);

      // Assert
      expect(result.items).toBeDefined();
      result.items.forEach(item => {
        expect(item.status).toBe(DrivingLogStatus.COMPLETED);
        if (item.totalDistance !== undefined) {
          expect(item.totalDistance).toBeGreaterThanOrEqual(20);
        }
      });
    });
  });

  describe('sortHistory', () => {
    it('should sort by date descending', async () => {
      // Arrange
      const sortOptions: SortOptions = { field: 'date', order: 'desc' };

      // Act
      const result = await controller.sortHistory(sortOptions);

      // Assert
      expect(result.items).toBeDefined();
      if (result.items.length > 1) {
        for (let i = 0; i < result.items.length - 1; i++) {
          const currentDate = new Date(result.items[i].date);
          const nextDate = new Date(result.items[i + 1].date);
          expect(currentDate.getTime()).toBeGreaterThanOrEqual(nextDate.getTime());
        }
      }
    });

    it('should sort by distance ascending', async () => {
      // Arrange
      const sortOptions: SortOptions = { field: 'distance', order: 'asc' };

      // Act
      const result = await controller.sortHistory(sortOptions);

      // Assert
      expect(result.items).toBeDefined();
      if (result.items.length > 1) {
        for (let i = 0; i < result.items.length - 1; i++) {
          const currentDistance = result.items[i].totalDistance || 0;
          const nextDistance = result.items[i + 1].totalDistance || 0;
          expect(currentDistance).toBeLessThanOrEqual(nextDistance);
        }
      }
    });
  });

  describe('getHistoryPage', () => {
    it('should return specific page', async () => {
      // Act
      const result = await controller.getHistoryPage(2, 10);

      // Assert
      expect(result.pageNumber).toBe(2);
      expect(result.items.length).toBeLessThanOrEqual(10);
      expect(result.totalItems).toBe(100);
      expect(result.totalPages).toBe(10);
    });

    it('should handle last page correctly', async () => {
      // Act
      const result = await controller.getHistoryPage(10, 10);

      // Assert
      expect(result.pageNumber).toBe(10);
      expect(result.items.length).toBeLessThanOrEqual(10);
    });
  });

  describe('getHistoryDetail', () => {
    it('should return detailed history record', async () => {
      // Arrange
      const mockDetail = mockHistoryData[0];
      mockStorageService.get.mockResolvedValue(mockDetail);

      // Act
      const result = await controller.getHistoryDetail('log-0');

      // Assert
      expect(result).toEqual(mockDetail);
      expect(mockStorageService.get).toHaveBeenCalledWith('drivingLogs', 'log-0');
    });

    it('should return null for non-existent record', async () => {
      // Arrange
      mockStorageService.get.mockResolvedValue(null);

      // Act
      const result = await controller.getHistoryDetail('non-existent');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('View Settings', () => {
    it('should save view settings', async () => {
      // Arrange
      const settings: ViewSettings = {
        defaultSort: { field: 'date', order: 'desc' },
        pageSize: 25,
        showStatistics: true,
        compactView: false,
        autoRefresh: true
      };

      // Act
      await controller.saveViewSettings(settings);

      // Assert
      expect(mockStorageService.save).toHaveBeenCalledWith('historyViewSettings', settings);
    });

    it('should load view settings', async () => {
      // Arrange
      const mockSettings: ViewSettings = {
        defaultSort: { field: 'distance', order: 'asc' },
        pageSize: 15,
        showStatistics: false,
        compactView: true,
        autoRefresh: false
      };
      mockStorageService.get.mockResolvedValue(mockSettings);

      // Act
      const result = await controller.loadViewSettings();

      // Assert
      expect(result).toEqual(mockSettings);
      expect(mockStorageService.get).toHaveBeenCalledWith('historyViewSettings');
    });
  });

  describe('Search History Management', () => {
    it('should save search history', async () => {
      // Arrange
      const existingHistory = ['previous search'];
      mockStorageService.get.mockResolvedValue(existingHistory);

      // Act
      await controller.saveSearchHistory('新しい検索');

      // Assert
      expect(mockStorageService.save).toHaveBeenCalledWith(
        'searchHistory',
        ['新しい検索', 'previous search']
      );
    });

    it('should get search history', async () => {
      // Arrange
      const mockHistory = ['search1', 'search2', 'search3'];
      mockStorageService.get.mockResolvedValue(mockHistory);

      // Act
      const result = await controller.getSearchHistory();

      // Assert
      expect(result).toEqual(mockHistory);
    });

    it('should clear search history', async () => {
      // Act
      await controller.clearSearchHistory();

      // Assert
      expect(mockStorageService.save).toHaveBeenCalledWith('searchHistory', []);
    });
  });

  describe('getStatistics', () => {
    it('should calculate basic statistics', async () => {
      // Act
      const result = await controller.getStatistics();

      // Assert
      expect(result).toMatchObject({
        totalRecords: expect.any(Number),
        totalDistance: expect.any(Number),
        totalDuration: expect.any(Number),
        avgDistance: expect.any(Number),
        avgDuration: expect.any(Number),
        statusCounts: expect.objectContaining({
          [DrivingLogStatus.COMPLETED]: expect.any(Number),
          [DrivingLogStatus.IN_PROGRESS]: expect.any(Number),
          [DrivingLogStatus.CANCELLED]: expect.any(Number)
        })
      });
    });

    it('should calculate statistics for date range', async () => {
      // Arrange
      const dateRange: DateRange = {
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: new Date()
      };

      // Act
      const result = await controller.getStatistics(dateRange);

      // Assert
      expect(result.totalRecords).toBeGreaterThanOrEqual(0);
      expect(result.totalDistance).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Performance Tests', () => {
    it('should handle large dataset efficiently', async () => {
      // Arrange
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        ...mockHistoryData[0],
        id: `large-${i}`
      }));
      mockStorageService.getAll.mockResolvedValue(largeDataset);

      // Act
      const startTime = Date.now();
      const result = await controller.getHistoryList();
      const endTime = Date.now();

      // Assert
      expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds
      expect(result.items).toBeDefined();
    });

    it('should search efficiently in large dataset', async () => {
      // Arrange
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        ...mockHistoryData[0],
        id: `search-${i}`,
        startLocation: { name: i % 100 === 0 ? 'target location' : 'other location' }
      }));
      mockStorageService.getAll.mockResolvedValue(largeDataset);

      // Act
      const startTime = Date.now();
      const result = await controller.searchHistory({ text: 'target' });
      const endTime = Date.now();

      // Assert
      expect(endTime - startTime).toBeLessThan(500); // Should complete within 500ms
      expect(result.items.length).toBeGreaterThan(0);
    });
  });
});