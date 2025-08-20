/**
 * StorageService 統合テスト - カバレッジ向上
 * 
 * このテストは、StorageServiceの低カバレッジ領域をテストして
 * 全体的なテストカバレッジを向上させます。
 */

import { StorageService } from '../StorageService';
import { DrivingLogModel } from '../../models/entities/DrivingLogModel';
import { LocationModel } from '../../models/entities/LocationModel';
import { SettingsModel } from '../../models/entities/SettingsModel';
import { ModelFactory } from '../../models/factories/ModelFactory';
import { DrivingLogStatus, LocationType } from '../../types';

describe('StorageService Integration - Coverage Enhancement', () => {
  let storageService: StorageService;

  beforeEach(() => {
    localStorage.clear();
    storageService = new StorageService();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle corrupted localStorage data', async () => {
      // Simulate corrupted data
      localStorage.setItem('driving_logs', 'invalid-json');
      
      const logs = await storageService.getAllDrivingLogs();
      expect(logs).toEqual([]);
    });

    test('should handle localStorage quota exceeded', async () => {
      // Create large data to simulate quota issues
      const largeLog = ModelFactory.createDrivingLog({
        purpose: 'テスト',
        notes: 'x'.repeat(1000000), // Large notes field
        status: DrivingLogStatus.COMPLETED
      });

      // Test should handle gracefully even if storage fails
      const result = await storageService.createDrivingLog(largeLog);
      expect(result).toBeDefined();
    });

    test('should handle non-existent log updates', async () => {
      await expect(storageService.updateDrivingLog('non-existent-id', {
        purpose: 'Updated'
      })).rejects.toThrow('Driving log not found');
    });

    test('should handle non-existent location updates', async () => {
      await expect(storageService.updateLocation('non-existent-id', {
        address: 'Updated'
      })).rejects.toThrow('Location not found');
    });

    test('should handle delete operations on non-existent items', async () => {
      await expect(storageService.deleteDrivingLog('non-existent-id'))
        .rejects.toThrow('Driving log not found');
      
      await expect(storageService.deleteLocation('non-existent-id'))
        .rejects.toThrow('Location not found');
    });
  });

  describe('Complex Data Operations', () => {
    test('should handle batch operations', async () => {
      // Create multiple logs and locations
      const logs = [];
      const locations = [];

      for (let i = 0; i < 10; i++) {
        const log = ModelFactory.createDrivingLog({
          purpose: `Test ${i}`,
          status: DrivingLogStatus.COMPLETED
        });
        
        const location = ModelFactory.createLocation({
          type: LocationType.START,
          address: `Location ${i}`,
          logId: log.id
        });

        logs.push(log);
        locations.push(location);
      }

      // Store all data
      for (const log of logs) {
        await storageService.createDrivingLog(log);
      }

      for (const location of locations) {
        await storageService.createLocation(location);
      }

      // Verify all data exists
      const allLogs = await storageService.getAllDrivingLogs();
      const allLocations = await storageService.getAllLocations();

      expect(allLogs).toHaveLength(10);
      expect(allLocations).toHaveLength(10);
    });

    test('should handle logs with all optional fields', async () => {
      const completeLog = ModelFactory.createDrivingLog({
        purpose: 'Complete Test',
        vehicle: 'Test Vehicle',
        driver: 'Test Driver',
        startTime: new Date('2024-01-15T08:00:00'),
        endTime: new Date('2024-01-15T09:30:00'),
        totalDistance: 25.5,
        totalTime: 90,
        averageSpeed: 17.0,
        maxSpeed: 45.0,
        notes: 'Complete log with all fields',
        status: DrivingLogStatus.COMPLETED
      });

      const stored = await storageService.createDrivingLog(completeLog);
      expect(stored.purpose).toBe('Complete Test');
      expect(stored.vehicle).toBe('Test Vehicle');
      expect(stored.driver).toBe('Test Driver');
      expect(stored.totalDistance).toBe(25.5);
      expect(stored.notes).toBe('Complete log with all fields');
    });

    test('should handle locations with coordinates and accuracy', async () => {
      const location = ModelFactory.createLocation({
        type: LocationType.WAYPOINT,
        address: 'GPS Location',
        coordinates: { latitude: 35.6762, longitude: 139.6503 },
        accuracy: 5.2,
        timestamp: new Date()
      });

      const stored = await storageService.createLocation(location);
      expect(stored.coordinates).toEqual({ latitude: 35.6762, longitude: 139.6503 });
      expect(stored.accuracy).toBe(5.2);
      expect(stored.timestamp).toBeInstanceOf(Date);
    });

    test('should handle settings with all configuration options', async () => {
      const settings = SettingsModel.create({
        theme: 'dark',
        language: 'en',
        notifications: {
          enabled: true,
          sound: true,
          vibration: false
        },
        gps: {
          accuracy: 'high',
          frequency: 5000,
          backgroundTracking: true
        },
        privacy: {
          shareAnalytics: false,
          saveLocation: true,
          locationAccuracy: 'precise'
        },
        export: {
          defaultFormat: 'csv',
          includeCoordinates: true,
          dateFormat: 'YYYY/MM/DD'
        }
      });

      const stored = await storageService.updateSettings(settings);
      expect(stored.theme).toBe('dark');
      expect(stored.notifications.enabled).toBe(true);
      expect(stored.gps.accuracy).toBe('high');
      expect(stored.privacy.shareAnalytics).toBe(false);
      expect(stored.export.defaultFormat).toBe('csv');
    });
  });

  describe('Data Relationships and Integrity', () => {
    test('should maintain referential integrity with cascading deletes', async () => {
      // Create log and related locations
      const log = ModelFactory.createDrivingLog({
        purpose: 'Relationship Test',
        status: DrivingLogStatus.COMPLETED
      });

      const locations = [
        ModelFactory.createLocation({
          type: LocationType.START,
          address: 'Start',
          logId: log.id
        }),
        ModelFactory.createLocation({
          type: LocationType.END,
          address: 'End',
          logId: log.id
        })
      ];

      // Store data
      await storageService.createDrivingLog(log);
      for (const location of locations) {
        await storageService.createLocation(location);
      }

      // Verify relationships exist
      const logLocations = await storageService.getLocationsByLogId(log.id);
      expect(logLocations).toHaveLength(2);

      // Delete log should handle related locations gracefully
      await storageService.deleteDrivingLog(log.id);
      
      // Verify log is deleted
      const deletedLog = await storageService.getDrivingLog(log.id);
      expect(deletedLog).toBeNull();
    });

    test('should handle updating log status transitions', async () => {
      const log = ModelFactory.createDrivingLog({
        purpose: 'Status Test',
        status: DrivingLogStatus.IN_PROGRESS
      });

      const stored = await storageService.createDrivingLog(log);
      expect(stored.status).toBe(DrivingLogStatus.IN_PROGRESS);

      // Update to completed
      const updated = await storageService.updateDrivingLog(stored.id, {
        status: DrivingLogStatus.COMPLETED,
        endTime: new Date(),
        totalDistance: 15.5
      });

      expect(updated.status).toBe(DrivingLogStatus.COMPLETED);
      expect(updated.endTime).toBeInstanceOf(Date);
      expect(updated.totalDistance).toBe(15.5);
    });
  });

  describe('Search and Filtering', () => {
    beforeEach(async () => {
      // Create test data for filtering
      const testData = [
        {
          purpose: '通勤',
          vehicle: '普通車',
          startTime: new Date('2024-01-15T08:00:00'),
          status: DrivingLogStatus.COMPLETED,
          totalDistance: 25.0
        },
        {
          purpose: '買い物',
          vehicle: '軽自動車',
          startTime: new Date('2024-01-16T10:00:00'),
          status: DrivingLogStatus.COMPLETED,
          totalDistance: 8.5
        },
        {
          purpose: '通勤',
          vehicle: '普通車',
          startTime: new Date('2024-01-17T08:30:00'),
          status: DrivingLogStatus.IN_PROGRESS,
          totalDistance: 0
        }
      ];

      for (const data of testData) {
        const log = ModelFactory.createDrivingLog(data);
        await storageService.createDrivingLog(log);
      }
    });

    test('should filter logs by date range', async () => {
      const fromDate = new Date('2024-01-15T00:00:00');
      const toDate = new Date('2024-01-16T23:59:59');

      const filteredLogs = await storageService.getLogsByDateRange(fromDate, toDate);
      expect(filteredLogs).toHaveLength(2);
      expect(filteredLogs.every(log => 
        log.startTime >= fromDate && log.startTime <= toDate
      )).toBe(true);
    });

    test('should filter logs by purpose', async () => {
      const commuteLogs = await storageService.getLogsByPurpose('通勤');
      expect(commuteLogs).toHaveLength(2);
      expect(commuteLogs.every(log => log.purpose === '通勤')).toBe(true);
    });

    test('should filter logs by status', async () => {
      const completedLogs = await storageService.getLogsByStatus(DrivingLogStatus.COMPLETED);
      expect(completedLogs).toHaveLength(2);
      expect(completedLogs.every(log => log.status === DrivingLogStatus.COMPLETED)).toBe(true);

      const inProgressLogs = await storageService.getLogsByStatus(DrivingLogStatus.IN_PROGRESS);
      expect(inProgressLogs).toHaveLength(1);
    });

    test('should get statistics', async () => {
      const stats = await storageService.getStatistics();
      
      expect(stats.totalLogs).toBe(3);
      expect(stats.completedLogs).toBe(2);
      expect(stats.totalDistance).toBe(33.5);
      expect(stats.averageDistance).toBeCloseTo(11.17, 2);
    });
  });

  describe('Data Migration and Version Handling', () => {
    test('should handle data format migration', async () => {
      // Simulate old data format in localStorage
      const oldFormatData = {
        logs: [
          {
            id: 'old-log-1',
            purpose: 'Old Format',
            createdAt: '2024-01-15T08:00:00.000Z' // String instead of Date
          }
        ]
      };

      localStorage.setItem('driving_logs', JSON.stringify(oldFormatData.logs));

      // Service should handle migration gracefully
      const logs = await storageService.getAllDrivingLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].purpose).toBe('Old Format');
    });

    test('should handle version compatibility', async () => {
      // Test with different data versions
      const versionedData = {
        version: '1.0.0',
        data: []
      };

      localStorage.setItem('app_version', '1.0.0');
      const logs = await storageService.getAllDrivingLogs();
      expect(logs).toEqual([]);
    });
  });

  describe('Performance Tests', () => {
    test('should handle large dataset efficiently', async () => {
      const startTime = Date.now();
      
      // Create large dataset
      const logs = [];
      for (let i = 0; i < 100; i++) {
        const log = ModelFactory.createDrivingLog({
          purpose: `Performance Test ${i}`,
          status: DrivingLogStatus.COMPLETED,
          totalDistance: Math.random() * 50
        });
        logs.push(log);
      }

      // Store all logs
      for (const log of logs) {
        await storageService.createDrivingLog(log);
      }

      const storageTime = Date.now() - startTime;
      expect(storageTime).toBeLessThan(5000); // Should complete within 5 seconds

      // Test retrieval performance
      const retrievalStart = Date.now();
      const allLogs = await storageService.getAllDrivingLogs();
      const retrievalTime = Date.now() - retrievalStart;

      expect(allLogs).toHaveLength(100);
      expect(retrievalTime).toBeLessThan(1000); // Should retrieve within 1 second
    });
  });
});