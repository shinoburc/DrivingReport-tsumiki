import { LocationController } from '../LocationController';
import { GPSService } from '../../services/gps/GPSService';
import { StorageService } from '../../services/StorageService';
import { LocationModel } from '../../models/entities/LocationModel';
import { 
  LocationType,
  ErrorCode,
  AppError,
  ILocationController,
  RecordOptions,
  ManualLocationInput,
  SearchCriteria,
  FavoriteLocation
} from '../../types';

// Mock dependencies
jest.mock('../../services/gps/GPSService');
jest.mock('../../services/StorageService');

describe('LocationController', () => {
  let controller: ILocationController;
  let mockGPSService: jest.Mocked<GPSService>;
  let mockStorageService: jest.Mocked<StorageService>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create mock instances
    mockGPSService = new GPSService() as jest.Mocked<GPSService>;
    mockStorageService = new StorageService() as jest.Mocked<StorageService>;

    // Setup default mock implementations
    mockStorageService.get = jest.fn().mockResolvedValue(null);
    mockStorageService.save = jest.fn().mockImplementation((key, data) => Promise.resolve(data));
    mockStorageService.getAll = jest.fn().mockResolvedValue([]);
    mockStorageService.delete = jest.fn().mockResolvedValue(true);
    mockGPSService.getCurrentPosition = jest.fn();
    mockGPSService.isAvailable = jest.fn().mockReturnValue(true);

    // Initialize controller
    controller = new LocationController(mockGPSService, mockStorageService);
  });

  describe('recordCurrentLocation', () => {
    it('should record current GPS location successfully', async () => {
      // Arrange
      const mockLocation = LocationModel.create({
        name: 'Current Location',
        latitude: 35.6762,
        longitude: 139.6503,
        accuracy: 30,
        type: LocationType.GPS,
        timestamp: new Date()
      });

      mockGPSService.getCurrentPosition.mockResolvedValue(mockLocation);
      mockStorageService.save.mockResolvedValue(mockLocation);

      // Act
      const result = await controller.recordCurrentLocation();

      // Assert
      expect(result).toEqual(mockLocation);
      expect(mockGPSService.getCurrentPosition).toHaveBeenCalled();
      expect(mockStorageService.save).toHaveBeenCalledWith('locations', mockLocation);
    });

    it('should auto-generate location name when autoName is true', async () => {
      // Arrange
      const mockLocation = LocationModel.create({
        name: '',
        latitude: 35.6762,
        longitude: 139.6503,
        accuracy: 30,
        type: LocationType.GPS,
        timestamp: new Date()
      });

      mockGPSService.getCurrentPosition.mockResolvedValue(mockLocation);
      mockStorageService.save.mockImplementation((key, data) => Promise.resolve(data));

      // Act
      const result = await controller.recordCurrentLocation({ autoName: true });

      // Assert
      expect(result.name).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2} 地点$/);
    });

    it('should use custom name when provided', async () => {
      // Arrange
      const customName = '顧客A訪問';
      const mockLocation = LocationModel.create({
        name: '',
        latitude: 35.6762,
        longitude: 139.6503,
        accuracy: 30,
        type: LocationType.GPS,
        timestamp: new Date()
      });

      mockGPSService.getCurrentPosition.mockResolvedValue(mockLocation);
      mockStorageService.save.mockImplementation((key, data) => Promise.resolve(data));

      // Act
      const result = await controller.recordCurrentLocation({ 
        name: customName,
        type: LocationType.WAYPOINT 
      });

      // Assert
      expect(result.name).toBe(customName);
      expect(result.type).toBe(LocationType.WAYPOINT);
    });

    it('should throw error when GPS is not available', async () => {
      // Arrange
      mockGPSService.getCurrentPosition.mockRejectedValue(
        new AppError(ErrorCode.GPS_UNAVAILABLE, 'GPS is not available')
      );

      // Act & Assert
      await expect(controller.recordCurrentLocation()).rejects.toThrow(AppError);
      await expect(controller.recordCurrentLocation()).rejects.toMatchObject({
        code: ErrorCode.GPS_UNAVAILABLE
      });
    });
  });

  describe('recordManualLocation', () => {
    it('should record location with address', async () => {
      // Arrange
      const input: ManualLocationInput = {
        name: '東京駅',
        address: '東京都千代田区丸の内1-9-1',
        type: LocationType.DEPARTURE
      };

      mockStorageService.save.mockImplementation((key, data) => Promise.resolve(data));

      // Act
      const result = await controller.recordManualLocation(input);

      // Assert
      expect(result.name).toBe('東京駅');
      expect(result.type).toBe(LocationType.MANUAL);
      expect(result.address).toBe('東京都千代田区丸の内1-9-1');
      expect(mockStorageService.save).toHaveBeenCalled();
    });

    it('should record location with coordinates', async () => {
      // Arrange
      const input: ManualLocationInput = {
        name: 'テスト地点',
        latitude: 35.6762,
        longitude: 139.6503,
        type: LocationType.ARRIVAL
      };

      mockStorageService.save.mockImplementation((key, data) => Promise.resolve(data));

      // Act
      const result = await controller.recordManualLocation(input);

      // Assert
      expect(result.latitude).toBe(35.6762);
      expect(result.longitude).toBe(139.6503);
      expect(result.type).toBe(LocationType.MANUAL);
    });

    it('should validate latitude range', async () => {
      // Arrange
      const input: ManualLocationInput = {
        name: 'Invalid Location',
        latitude: 91, // Invalid latitude
        longitude: 139,
        type: LocationType.WAYPOINT
      };

      // Act & Assert
      await expect(controller.recordManualLocation(input)).rejects.toThrow(
        '緯度は-90〜90の範囲で入力してください'
      );
    });

    it('should validate longitude range', async () => {
      // Arrange
      const input: ManualLocationInput = {
        name: 'Invalid Location',
        latitude: 35,
        longitude: 181, // Invalid longitude
        type: LocationType.WAYPOINT
      };

      // Act & Assert
      await expect(controller.recordManualLocation(input)).rejects.toThrow(
        '経度は-180〜180の範囲で入力してください'
      );
    });

    it('should require location name', async () => {
      // Arrange
      const input: ManualLocationInput = {
        name: '', // Empty name
        latitude: 35,
        longitude: 139,
        type: LocationType.DEPARTURE
      };

      // Act & Assert
      await expect(controller.recordManualLocation(input)).rejects.toThrow(
        '地点名は必須です'
      );
    });
  });

  describe('Favorite Locations', () => {
    it('should add favorite location', async () => {
      // Arrange
      const location = LocationModel.create({
        id: 'loc-001',
        name: '自宅',
        latitude: 35.6762,
        longitude: 139.6503,
        type: LocationType.MANUAL,
        timestamp: new Date()
      });

      mockStorageService.get.mockResolvedValue([]);
      mockStorageService.save.mockImplementation((key, data) => Promise.resolve(data));

      // Act
      await controller.addFavoriteLocation(location, '個人');

      // Assert
      expect(mockStorageService.save).toHaveBeenCalledWith(
        'favoriteLocations',
        expect.arrayContaining([
          expect.objectContaining({
            id: 'loc-001',
            name: '自宅',
            category: '個人',
            usageCount: 0
          })
        ])
      );
    });

    it('should get all favorite locations', async () => {
      // Arrange
      const mockFavorites: FavoriteLocation[] = [
        {
          id: 'fav-001',
          name: '自宅',
          latitude: 35.6762,
          longitude: 139.6503,
          type: LocationType.MANUAL,
          timestamp: new Date(),
          category: '個人',
          usageCount: 5,
          isDefault: true
        },
        {
          id: 'fav-002',
          name: '会社',
          latitude: 35.6897,
          longitude: 139.6922,
          type: LocationType.MANUAL,
          timestamp: new Date(),
          category: '仕事',
          usageCount: 10,
          isDefault: false
        }
      ];

      mockStorageService.get.mockResolvedValue(mockFavorites);

      // Act
      const result = await controller.getFavoriteLocations();

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].usageCount).toBe(10); // Sorted by usage count
      expect(result[1].usageCount).toBe(5);
    });

    it('should get favorite locations by category', async () => {
      // Arrange
      const mockFavorites: FavoriteLocation[] = [
        {
          id: 'fav-001',
          name: '自宅',
          latitude: 35.6762,
          longitude: 139.6503,
          type: LocationType.MANUAL,
          timestamp: new Date(),
          category: '個人',
          usageCount: 5,
          isDefault: false
        },
        {
          id: 'fav-002',
          name: '会社',
          latitude: 35.6897,
          longitude: 139.6922,
          type: LocationType.MANUAL,
          timestamp: new Date(),
          category: '仕事',
          usageCount: 10,
          isDefault: false
        }
      ];

      mockStorageService.get.mockResolvedValue(mockFavorites);

      // Act
      const result = await controller.getFavoriteLocations('仕事');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('会社');
    });

    it('should remove favorite location', async () => {
      // Arrange
      const mockFavorites: FavoriteLocation[] = [
        {
          id: 'fav-001',
          name: '自宅',
          latitude: 35.6762,
          longitude: 139.6503,
          type: LocationType.MANUAL,
          timestamp: new Date(),
          category: '個人',
          usageCount: 5,
          isDefault: false
        }
      ];

      mockStorageService.get.mockResolvedValue(mockFavorites);
      mockStorageService.save.mockImplementation((key, data) => Promise.resolve(data));

      // Act
      await controller.removeFavoriteLocation('fav-001');

      // Assert
      expect(mockStorageService.save).toHaveBeenCalledWith('favoriteLocations', []);
    });
  });

  describe('searchLocations', () => {
    const mockLocations = [
      LocationModel.create({
        id: 'loc-001',
        name: '東京駅',
        latitude: 35.6812,
        longitude: 139.7671,
        type: LocationType.DEPARTURE,
        timestamp: new Date('2024-01-15')
      }),
      LocationModel.create({
        id: 'loc-002',
        name: '新宿駅',
        latitude: 35.6896,
        longitude: 139.7006,
        type: LocationType.ARRIVAL,
        timestamp: new Date('2024-01-16')
      }),
      LocationModel.create({
        id: 'loc-003',
        name: '顧客A',
        latitude: 35.6762,
        longitude: 139.6503,
        type: LocationType.WAYPOINT,
        timestamp: new Date('2024-01-17')
      })
    ];

    beforeEach(() => {
      mockStorageService.getAll.mockResolvedValue(mockLocations);
    });

    it('should search locations by query', async () => {
      // Arrange
      const criteria: SearchCriteria = { query: '駅' };

      // Act
      const result = await controller.searchLocations(criteria);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].name).toContain('駅');
      expect(result[1].name).toContain('駅');
    });

    it('should filter locations by date range', async () => {
      // Arrange
      const criteria: SearchCriteria = {
        startDate: new Date('2024-01-15'),
        endDate: new Date('2024-01-16')
      };

      // Act
      const result = await controller.searchLocations(criteria);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('loc-001');
      expect(result[1].id).toBe('loc-002');
    });

    it('should filter locations by type', async () => {
      // Arrange
      const criteria: SearchCriteria = { type: LocationType.WAYPOINT };

      // Act
      const result = await controller.searchLocations(criteria);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('顧客A');
    });

    it('should sort locations by date descending', async () => {
      // Arrange
      const criteria: SearchCriteria = {
        sortBy: 'date',
        sortOrder: 'desc'
      };

      // Act
      const result = await controller.searchLocations(criteria);

      // Assert
      expect(result[0].id).toBe('loc-003'); // Latest
      expect(result[2].id).toBe('loc-001'); // Oldest
    });

    it('should apply multiple filters', async () => {
      // Arrange
      const criteria: SearchCriteria = {
        query: '駅',
        type: LocationType.DEPARTURE
      };

      // Act
      const result = await controller.searchLocations(criteria);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('東京駅');
    });
  });

  describe('getRecentLocations', () => {
    it('should get recent locations with limit', async () => {
      // Arrange
      const mockLocations = Array.from({ length: 30 }, (_, i) => 
        LocationModel.create({
          id: `loc-${i}`,
          name: `Location ${i}`,
          latitude: 35.6762,
          longitude: 139.6503,
          type: LocationType.MANUAL,
          timestamp: new Date(Date.now() - i * 3600000) // 1 hour apart
        })
      );

      mockStorageService.getAll.mockResolvedValue(mockLocations);

      // Act
      const result = await controller.getRecentLocations(10);

      // Assert
      expect(result).toHaveLength(10);
      expect(result[0].id).toBe('loc-0'); // Most recent
    });

    it('should get default 20 locations when no limit specified', async () => {
      // Arrange
      const mockLocations = Array.from({ length: 30 }, (_, i) => 
        LocationModel.create({
          id: `loc-${i}`,
          name: `Location ${i}`,
          latitude: 35.6762,
          longitude: 139.6503,
          type: LocationType.MANUAL,
          timestamp: new Date(Date.now() - i * 3600000)
        })
      );

      mockStorageService.getAll.mockResolvedValue(mockLocations);

      // Act
      const result = await controller.getRecentLocations();

      // Assert
      expect(result).toHaveLength(20);
    });
  });

  describe('updateLocation', () => {
    it('should update location successfully', async () => {
      // Arrange
      const existingLocation = LocationModel.create({
        id: 'loc-001',
        name: 'Old Name',
        latitude: 35.6762,
        longitude: 139.6503,
        type: LocationType.MANUAL,
        timestamp: new Date()
      });

      mockStorageService.get.mockResolvedValue(existingLocation);
      mockStorageService.save.mockImplementation((key, data) => Promise.resolve(data));

      // Act
      const result = await controller.updateLocation('loc-001', {
        name: 'New Name',
        memo: 'Updated memo'
      });

      // Assert
      expect(result.name).toBe('New Name');
      expect(result.memo).toBe('Updated memo');
      expect(result.latitude).toBe(35.6762); // Unchanged
    });

    it('should throw error for non-existent location', async () => {
      // Arrange
      mockStorageService.get.mockResolvedValue(null);

      // Act & Assert
      await expect(controller.updateLocation('invalid-id', {})).rejects.toThrow(
        '指定された位置情報が見つかりません'
      );
    });
  });

  describe('deleteLocation', () => {
    it('should delete location successfully', async () => {
      // Arrange
      mockStorageService.delete.mockResolvedValue(true);

      // Act
      await controller.deleteLocation('loc-001');

      // Assert
      expect(mockStorageService.delete).toHaveBeenCalledWith('locations', 'loc-001');
    });

    it('should throw error when deletion fails', async () => {
      // Arrange
      mockStorageService.delete.mockResolvedValue(false);

      // Act & Assert
      await expect(controller.deleteLocation('loc-001')).rejects.toThrow(
        '位置情報の削除に失敗しました'
      );
    });
  });

  describe('isGPSAvailable', () => {
    it('should return true when GPS is available', () => {
      // Arrange
      mockGPSService.isAvailable.mockReturnValue(true);

      // Act
      const result = controller.isGPSAvailable();

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when GPS is not available', () => {
      // Arrange
      mockGPSService.isAvailable.mockReturnValue(false);

      // Act
      const result = controller.isGPSAvailable();

      // Assert
      expect(result).toBe(false);
    });
  });
});