import { DrivingLogController } from '../DrivingLogController';
import { LocationController } from '../LocationController';
import { StorageService } from '../../services/StorageService';
import { DrivingLogModel } from '../../models/entities/DrivingLogModel';
import { LocationModel } from '../../models/entities/LocationModel';
import {
  IDrivingLogController,
  DrivingLogStatus,
  LocationType,
  QueryOptions,
  AppError,
  ErrorCode
} from '../../types';

// Mock dependencies
jest.mock('../LocationController');
jest.mock('../../services/StorageService');

describe('DrivingLogController', () => {
  let controller: IDrivingLogController;
  let mockLocationController: jest.Mocked<LocationController>;
  let mockStorageService: jest.Mocked<StorageService>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock instances
    mockLocationController = new LocationController(null as any, null as any) as jest.Mocked<LocationController>;
    mockStorageService = new StorageService() as jest.Mocked<StorageService>;

    // Setup default mock implementations
    mockStorageService.get = jest.fn().mockResolvedValue(null);
    mockStorageService.save = jest.fn().mockImplementation((key, data) => Promise.resolve(data));
    mockStorageService.getAll = jest.fn().mockResolvedValue([]);
    mockStorageService.delete = jest.fn().mockResolvedValue(true);
    mockLocationController.recordCurrentLocation = jest.fn();
    mockLocationController.isGPSAvailable = jest.fn().mockReturnValue(true);

    // Initialize controller
    controller = new DrivingLogController(mockLocationController, mockStorageService);
  });

  describe('createLog', () => {
    it('should create a new driving log', async () => {
      // Act
      const log = await controller.createLog();

      // Assert
      expect(log).toBeDefined();
      expect(log.status).toBe(DrivingLogStatus.IN_PROGRESS);
      expect(log.id).toBeDefined();
      expect(log.createdAt).toBeInstanceOf(Date);
      expect(mockStorageService.save).toHaveBeenCalled();
    });

    it('should create log with initial data', async () => {
      // Arrange
      const initialData = {
        purpose: '営業活動',
        memo: '顧客訪問'
      };

      // Act
      const log = await controller.createLog(initialData);

      // Assert
      expect(log.purpose).toBe('営業活動');
      expect(log.memo).toBe('顧客訪問');
    });

    it('should prevent future date', async () => {
      // Arrange
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      // Act & Assert
      await expect(controller.createLog({ date: futureDate }))
        .rejects.toThrow('未来の日付は設定できません');
    });
  });

  describe('getLog', () => {
    it('should retrieve log by ID', async () => {
      // Arrange
      const mockLog = DrivingLogModel.create({
        id: 'log-001',
        date: new Date(),
        startLocation: { 
          id: 'loc-001',
          name: '自宅',
          latitude: 35.6762,
          longitude: 139.6503
        },
        waypoints: [],
        status: DrivingLogStatus.IN_PROGRESS
      });

      mockStorageService.get.mockResolvedValue(mockLog);

      // Act
      const log = await controller.getLog('log-001');

      // Assert
      expect(log).toEqual(mockLog);
      expect(mockStorageService.get).toHaveBeenCalledWith('drivingLogs', 'log-001');
    });

    it('should return null for non-existent log', async () => {
      // Arrange
      mockStorageService.get.mockResolvedValue(null);

      // Act
      const log = await controller.getLog('non-existent');

      // Assert
      expect(log).toBeNull();
    });
  });

  describe('getActiveLogs', () => {
    it('should return only IN_PROGRESS logs', async () => {
      // Arrange
      const mockLogs = [
        DrivingLogModel.create({
          id: 'log-001',
          date: new Date(),
          startLocation: { id: 'loc-001', name: 'Start', latitude: 0, longitude: 0 },
          waypoints: [],
          status: DrivingLogStatus.IN_PROGRESS
        }),
        DrivingLogModel.create({
          id: 'log-002',
          date: new Date(),
          startLocation: { id: 'loc-002', name: 'Start', latitude: 0, longitude: 0 },
          waypoints: [],
          status: DrivingLogStatus.COMPLETED
        })
      ];

      mockStorageService.getAll.mockResolvedValue(mockLogs);

      // Act
      const activeLogs = await controller.getActiveLogs();

      // Assert
      expect(activeLogs).toHaveLength(1);
      expect(activeLogs[0].id).toBe('log-001');
    });
  });

  describe('addLocation', () => {
    it('should add start location', async () => {
      // Arrange
      const mockLog = DrivingLogModel.create({
        id: 'log-001',
        date: new Date(),
        startLocation: { id: 'loc-000', name: 'Initial', latitude: 0, longitude: 0 },
        waypoints: [],
        status: DrivingLogStatus.IN_PROGRESS
      });

      const newLocation = LocationModel.create({
        id: 'loc-001',
        name: '自宅',
        latitude: 35.6762,
        longitude: 139.6503,
        type: LocationType.START,
        timestamp: new Date()
      });

      mockStorageService.get.mockResolvedValue(mockLog);

      // Act
      const updated = await controller.addLocation('log-001', newLocation, LocationType.START);

      // Assert
      expect(updated.startLocation).toEqual(expect.objectContaining({
        name: '自宅',
        latitude: 35.6762,
        longitude: 139.6503
      }));
      expect(mockStorageService.save).toHaveBeenCalled();
    });

    it('should add waypoint', async () => {
      // Arrange
      const mockLog = DrivingLogModel.create({
        id: 'log-001',
        date: new Date(),
        startLocation: { id: 'loc-001', name: 'Start', latitude: 0, longitude: 0 },
        waypoints: [],
        status: DrivingLogStatus.IN_PROGRESS
      });

      const waypoint = LocationModel.create({
        id: 'loc-002',
        name: '経由地',
        latitude: 35.6580,
        longitude: 139.7016,
        type: LocationType.WAYPOINT,
        timestamp: new Date()
      });

      mockStorageService.get.mockResolvedValue(mockLog);

      // Act
      const updated = await controller.addLocation('log-001', waypoint, LocationType.WAYPOINT);

      // Assert
      expect(updated.waypoints).toHaveLength(1);
      expect(updated.waypoints[0].name).toBe('経由地');
    });

    it('should add end location', async () => {
      // Arrange
      const mockLog = DrivingLogModel.create({
        id: 'log-001',
        date: new Date(),
        startLocation: { id: 'loc-001', name: 'Start', latitude: 0, longitude: 0 },
        waypoints: [],
        status: DrivingLogStatus.IN_PROGRESS
      });

      const endLocation = LocationModel.create({
        id: 'loc-003',
        name: '到着地',
        latitude: 35.6897,
        longitude: 139.6922,
        type: LocationType.END,
        timestamp: new Date()
      });

      mockStorageService.get.mockResolvedValue(mockLog);

      // Act
      const updated = await controller.addLocation('log-001', endLocation, LocationType.END);

      // Assert
      expect(updated.endLocation).toEqual(expect.objectContaining({
        name: '到着地'
      }));
    });
  });

  describe('quickStart', () => {
    it('should create log with current GPS location', async () => {
      // Arrange
      const mockLocation = LocationModel.create({
        id: 'loc-001',
        name: '現在地',
        latitude: 35.6762,
        longitude: 139.6503,
        type: LocationType.GPS,
        timestamp: new Date()
      });

      mockLocationController.recordCurrentLocation.mockResolvedValue(mockLocation);

      // Act
      const log = await controller.quickStart();

      // Assert
      expect(log.status).toBe(DrivingLogStatus.IN_PROGRESS);
      expect(log.startLocation).toEqual(expect.objectContaining({
        name: '現在地'
      }));
      expect(mockLocationController.recordCurrentLocation).toHaveBeenCalled();
    });

    it('should create log with specified location', async () => {
      // Arrange
      const favoriteLocation = LocationModel.create({
        id: 'fav-001',
        name: '自宅',
        latitude: 35.6762,
        longitude: 139.6503,
        type: LocationType.MANUAL,
        timestamp: new Date()
      });

      // Act
      const log = await controller.quickStart(favoriteLocation);

      // Assert
      expect(log.startLocation).toEqual(expect.objectContaining({
        name: '自宅'
      }));
      expect(mockLocationController.recordCurrentLocation).not.toHaveBeenCalled();
    });
  });

  describe('quickComplete', () => {
    it('should complete log and calculate stats', async () => {
      // Arrange
      const mockLog = DrivingLogModel.create({
        id: 'log-001',
        date: new Date(),
        startTime: new Date('2024-01-15T09:00:00'),
        startLocation: { id: 'loc-001', name: 'Start', latitude: 35.6762, longitude: 139.6503 },
        waypoints: [],
        status: DrivingLogStatus.IN_PROGRESS
      });

      const endLocation = LocationModel.create({
        id: 'loc-002',
        name: '到着地',
        latitude: 35.6897,
        longitude: 139.6922,
        type: LocationType.END,
        timestamp: new Date('2024-01-15T17:00:00')
      });

      mockStorageService.get.mockResolvedValue(mockLog);

      // Act
      const completed = await controller.quickComplete('log-001', endLocation);

      // Assert
      expect(completed.status).toBe(DrivingLogStatus.COMPLETED);
      expect(completed.endLocation).toBeDefined();
      expect(completed.endTime).toBeDefined();
      expect(completed.distance).toBeGreaterThan(0);
      expect(completed.duration).toBeGreaterThan(0);
    });
  });

  describe('changeStatus', () => {
    it('should allow IN_PROGRESS to COMPLETED transition', async () => {
      // Arrange
      const mockLog = DrivingLogModel.create({
        id: 'log-001',
        date: new Date(),
        startLocation: { id: 'loc-001', name: 'Start', latitude: 0, longitude: 0 },
        waypoints: [],
        status: DrivingLogStatus.IN_PROGRESS
      });

      mockStorageService.get.mockResolvedValue(mockLog);

      // Act
      const updated = await controller.changeStatus('log-001', DrivingLogStatus.COMPLETED);

      // Assert
      expect(updated.status).toBe(DrivingLogStatus.COMPLETED);
    });

    it('should prevent invalid status transition', async () => {
      // Arrange
      const mockLog = DrivingLogModel.create({
        id: 'log-001',
        date: new Date(),
        startLocation: { id: 'loc-001', name: 'Start', latitude: 0, longitude: 0 },
        waypoints: [],
        status: DrivingLogStatus.COMPLETED
      });

      mockStorageService.get.mockResolvedValue(mockLog);

      // Act & Assert
      await expect(controller.changeStatus('log-001', DrivingLogStatus.IN_PROGRESS))
        .rejects.toThrow('不正な状態遷移です');
    });
  });

  describe('Auto Save', () => {
    it('should enable auto save', () => {
      // Act
      controller.enableAutoSave('log-001', 30000);

      // Assert
      expect(controller.hasUnsavedChanges('log-001')).toBe(false);
    });

    it('should disable auto save', () => {
      // Arrange
      controller.enableAutoSave('log-001', 30000);

      // Act
      controller.disableAutoSave('log-001');

      // Assert
      // Auto save should be disabled
    });

    it('should detect unsaved changes', async () => {
      // Arrange
      const mockLog = DrivingLogModel.create({
        id: 'log-001',
        date: new Date(),
        startLocation: { id: 'loc-001', name: 'Start', latitude: 0, longitude: 0 },
        waypoints: [],
        status: DrivingLogStatus.IN_PROGRESS
      });

      mockStorageService.get.mockResolvedValue(mockLog);

      // Act
      await controller.updateLog('log-001', { memo: '更新' });

      // Assert
      expect(controller.hasUnsavedChanges('log-001')).toBe(true);
    });
  });

  describe('Recovery', () => {
    it('should recover in-progress logs', async () => {
      // Arrange
      const mockLogs = [
        DrivingLogModel.create({
          id: 'log-001',
          date: new Date(),
          startLocation: { id: 'loc-001', name: 'Start', latitude: 0, longitude: 0 },
          waypoints: [],
          status: DrivingLogStatus.IN_PROGRESS
        })
      ];

      mockStorageService.getAll.mockResolvedValue(mockLogs);

      // Act
      const recovered = await controller.recoverInProgressLogs();

      // Assert
      expect(recovered).toHaveLength(1);
      expect(recovered[0].status).toBe(DrivingLogStatus.IN_PROGRESS);
    });
  });

  describe('Statistics', () => {
    it('should calculate distance', () => {
      // Arrange
      const mockLog = DrivingLogModel.create({
        id: 'log-001',
        date: new Date(),
        startLocation: { id: 'loc-001', name: 'Start', latitude: 35.6762, longitude: 139.6503 },
        waypoints: [
          { id: 'loc-002', name: 'Waypoint', latitude: 35.6580, longitude: 139.7016 }
        ],
        endLocation: { id: 'loc-003', name: 'End', latitude: 35.6897, longitude: 139.6922 },
        status: DrivingLogStatus.COMPLETED
      });

      // Mock internal storage
      (controller as any).logs.set('log-001', mockLog);

      // Act
      const distance = controller.calculateDistance('log-001');

      // Assert
      expect(distance).toBeGreaterThan(0);
    });

    it('should calculate duration', () => {
      // Arrange - create a simple object with required fields
      const mockLog = {
        id: 'log-001',
        startTime: new Date('2024-01-15T09:00:00'),
        endTime: new Date('2024-01-15T17:00:00'),
        createdAt: new Date('2024-01-15T09:00:00')
      };

      // Mock internal storage
      (controller as any).logs.set('log-001', mockLog);

      // Act
      const duration = controller.calculateDuration('log-001');

      // Assert
      expect(duration).toBe(480); // 8 hours = 480 minutes
    });
  });
});