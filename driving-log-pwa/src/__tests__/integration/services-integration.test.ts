/**
 * 統合テスト: サービス間の連携
 * 
 * このテストは、異なるサービス間の連携が正常に動作することを確認します：
 * 1. StorageService + GPSService
 * 2. StorageService + CSVService
 * 3. ModelFactory + Validator + StorageService
 */

import { StorageService } from '../../services/StorageService';
import { CSVService } from '../../services/CSVService';
import { GPSService } from '../../services/gps/GPSService';
import { ModelFactory } from '../../models/factories/ModelFactory';
import { ModelValidator } from '../../models/validators/ModelValidator';
import { DrivingLogModel } from '../../models/entities/DrivingLogModel';
import { LocationModel } from '../../models/entities/LocationModel';
import { DrivingLogStatus, LocationType } from '../../types';

// Mock GPS Service
jest.mock('../../services/gps/GPSService');

describe('Services Integration Test', () => {
  let storageService: StorageService;
  let csvService: CSVService;

  beforeEach(() => {
    localStorage.clear();
    storageService = new StorageService();
    csvService = new CSVService();

    // Mock GPS service
    const mockGPS = GPSService as jest.Mocked<typeof GPSService>;
    mockGPS.getCurrentPosition = jest.fn().mockResolvedValue({
      latitude: 35.6762,
      longitude: 139.6503,
      accuracy: 10,
      timestamp: new Date()
    });
  });

  afterEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  describe('StorageService + ModelFactory + ModelValidator Integration', () => {
    test('should create, validate, and store driving logs', async () => {
      // Create a driving log using ModelFactory
      const logData = {
        purpose: '通勤',
        vehicle: '普通車',
        driver: 'テストユーザー',
        startTime: new Date(),
        status: DrivingLogStatus.IN_PROGRESS
      };

      // Validate data before creating model
      const validation = ModelValidator.validateDrivingLog(logData);
      expect(validation.isValid).toBe(false); // Should fail due to missing start location

      // Add required start location
      const startLocation = ModelFactory.createLocation({
        type: LocationType.START,
        address: '東京駅',
        coordinates: { latitude: 35.6812, longitude: 139.7671 }
      });

      const completeLogData = {
        ...logData,
        startLocationId: startLocation.id
      };

      // Re-validate with complete data
      const validValidation = ModelValidator.validateDrivingLog(completeLogData);
      expect(validValidation.isValid).toBe(true);

      // Create model
      const drivingLog = DrivingLogModel.create(completeLogData);
      expect(drivingLog).toBeDefined();

      // Store in storage service
      const storedLog = await storageService.createDrivingLog(drivingLog);
      expect(storedLog.id).toBe(drivingLog.id);

      // Retrieve and verify
      const retrievedLog = await storageService.getDrivingLog(drivingLog.id);
      expect(retrievedLog).toBeDefined();
      expect(retrievedLog!.purpose).toBe('通勤');
    });

    test('should handle model factory defaults correctly', async () => {
      // Create location with minimal data
      const location = ModelFactory.createLocation({
        type: LocationType.START,
        address: 'Test Location'
      });

      // Store location
      const storedLocation = await storageService.createLocation(location);
      expect(storedLocation.id).toBe(location.id);

      // Verify defaults are applied
      expect(location.coordinates).toBeNull();
      expect(location.accuracy).toBeNull();
      expect(location.createdAt).toBeInstanceOf(Date);
    });
  });

  describe('StorageService + CSVService Integration', () => {
    test('should export stored data to CSV format', async () => {
      // Create test data
      const log1 = ModelFactory.createDrivingLog({
        purpose: '通勤',
        vehicle: '普通車',
        startTime: new Date('2024-01-15T08:00:00'),
        endTime: new Date('2024-01-15T09:30:00'),
        totalDistance: 25.5,
        status: DrivingLogStatus.COMPLETED
      });

      const log2 = ModelFactory.createDrivingLog({
        purpose: '買い物',
        vehicle: '軽自動車',
        startTime: new Date('2024-01-16T10:00:00'),
        endTime: new Date('2024-01-16T11:00:00'),
        totalDistance: 8.2,
        status: DrivingLogStatus.COMPLETED
      });

      // Store logs
      await storageService.createDrivingLog(log1);
      await storageService.createDrivingLog(log2);

      // Retrieve all logs
      const allLogs = await storageService.getAllDrivingLogs();
      expect(allLogs).toHaveLength(2);

      // Export to CSV
      const csvData = await csvService.exportDrivingLogs(allLogs, {
        includeHeaders: true,
        dateFormat: 'YYYY/MM/DD HH:mm'
      });

      expect(csvData).toBeDefined();
      expect(csvData).toContain('通勤');
      expect(csvData).toContain('買い物');
      expect(csvData).toContain('25.5');
      expect(csvData).toContain('8.2');
      expect(csvData).toContain('2024/01/15');
      expect(csvData).toContain('2024/01/16');
    });

    test('should handle empty data export', async () => {
      // Export empty data
      const csvData = await csvService.exportDrivingLogs([], {
        includeHeaders: true
      });

      expect(csvData).toBeDefined();
      // Should contain only headers
      expect(csvData.split('\n')).toHaveLength(2); // Header + empty line
    });

    test('should export with location data', async () => {
      // Create log with locations
      const startLocation = ModelFactory.createLocation({
        type: LocationType.START,
        address: '東京駅',
        coordinates: { latitude: 35.6812, longitude: 139.7671 }
      });

      const endLocation = ModelFactory.createLocation({
        type: LocationType.END,
        address: '新宿駅',
        coordinates: { latitude: 35.6896, longitude: 139.7006 }
      });

      const log = ModelFactory.createDrivingLog({
        purpose: 'テスト',
        startLocationId: startLocation.id,
        endLocationId: endLocation.id,
        status: DrivingLogStatus.COMPLETED
      });

      // Store all data
      await storageService.createLocation(startLocation);
      await storageService.createLocation(endLocation);
      await storageService.createDrivingLog(log);

      // Get logs with locations
      const logs = [log];
      const locations = [startLocation, endLocation];

      // Export with location data
      const csvData = await csvService.exportWithLocations(logs, locations, {
        includeCoordinates: true
      });

      expect(csvData).toContain('東京駅');
      expect(csvData).toContain('新宿駅');
      expect(csvData).toContain('35.6812');
      expect(csvData).toContain('139.7671');
    });
  });

  describe('Error Handling Integration', () => {
    test('should handle storage errors gracefully', async () => {
      // Create invalid data that should be rejected
      const invalidLog = {
        id: 'test-id',
        purpose: '',  // Empty purpose should be invalid
        vehicle: '',  // Empty vehicle should be invalid
        status: DrivingLogStatus.IN_PROGRESS,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Validation should fail
      const validation = ModelValidator.validateDrivingLog(invalidLog);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);

      // Storage should reject invalid data
      await expect(async () => {
        DrivingLogModel.create(invalidLog);
      }).rejects.toThrow();
    });

    test('should handle CSV export errors', async () => {
      // Create log with problematic data
      const log = ModelFactory.createDrivingLog({
        purpose: 'Test with "quotes" and, commas',
        vehicle: 'Vehicle with\nnewlines',
        notes: 'Special chars: éñ中文',
        status: DrivingLogStatus.COMPLETED
      });

      await storageService.createDrivingLog(log);
      const logs = await storageService.getAllDrivingLogs();

      // CSV export should handle special characters
      const csvData = await csvService.exportDrivingLogs(logs);
      expect(csvData).toBeDefined();
      expect(csvData).toContain('"Test with ""quotes"" and, commas"');
    });
  });

  describe('Performance Integration', () => {
    test('should handle bulk operations efficiently', async () => {
      const startTime = Date.now();

      // Create bulk data
      const logs = [];
      const locations = [];

      for (let i = 0; i < 100; i++) {
        const startLoc = ModelFactory.createLocation({
          type: LocationType.START,
          address: `Start Location ${i}`
        });

        const endLoc = ModelFactory.createLocation({
          type: LocationType.END,
          address: `End Location ${i}`
        });

        const log = ModelFactory.createDrivingLog({
          purpose: `Test ${i}`,
          vehicle: i % 2 === 0 ? '普通車' : '軽自動車',
          startLocationId: startLoc.id,
          endLocationId: endLoc.id,
          status: DrivingLogStatus.COMPLETED,
          totalDistance: Math.random() * 50
        });

        locations.push(startLoc, endLoc);
        logs.push(log);
      }

      // Store all data
      for (const location of locations) {
        await storageService.createLocation(location);
      }

      for (const log of logs) {
        await storageService.createDrivingLog(log);
      }

      const storageTime = Date.now() - startTime;
      expect(storageTime).toBeLessThan(10000); // Should complete within 10 seconds

      // Test bulk retrieval
      const retrievalStart = Date.now();
      const allLogs = await storageService.getAllDrivingLogs();
      const retrievalTime = Date.now() - retrievalStart;

      expect(allLogs).toHaveLength(100);
      expect(retrievalTime).toBeLessThan(1000); // Should retrieve within 1 second

      // Test bulk export
      const exportStart = Date.now();
      const csvData = await csvService.exportDrivingLogs(allLogs);
      const exportTime = Date.now() - exportStart;

      expect(csvData).toBeDefined();
      expect(exportTime).toBeLessThan(2000); // Should export within 2 seconds
    });
  });

  describe('Data Consistency Integration', () => {
    test('should maintain referential integrity', async () => {
      // Create related data
      const location = ModelFactory.createLocation({
        type: LocationType.START,
        address: 'Test Location'
      });

      const log = ModelFactory.createDrivingLog({
        purpose: 'Test',
        startLocationId: location.id,
        status: DrivingLogStatus.COMPLETED
      });

      // Store in correct order
      await storageService.createLocation(location);
      await storageService.createDrivingLog(log);

      // Verify relationships
      const retrievedLog = await storageService.getDrivingLog(log.id);
      const retrievedLocation = await storageService.getLocation(location.id);

      expect(retrievedLog).toBeDefined();
      expect(retrievedLocation).toBeDefined();
      expect(retrievedLog!.startLocationId).toBe(location.id);

      // Test cleanup - deleting referenced location should be handled
      await storageService.deleteLocation(location.id);
      
      // Log should still exist but reference should be handled gracefully
      const logAfterLocationDelete = await storageService.getDrivingLog(log.id);
      expect(logAfterLocationDelete).toBeDefined();
    });
  });
});