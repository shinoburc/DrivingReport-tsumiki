/**
 * 統合テスト: 完全な運転記録ワークフロー
 * 
 * このテストは、アプリの主要な機能が統合的に動作することを確認します：
 * 1. 新しい運転記録の作成
 * 2. 地点の追加
 * 3. 記録の完了
 * 4. データの保存・取得
 * 5. エクスポート機能
 */

import { DrivingLogController } from '../../controllers/DrivingLogController';
import { LocationController } from '../../controllers/LocationController';
import { HistoryController } from '../../controllers/HistoryController';
import { ExportController } from '../../controllers/ExportController';
import { StorageService } from '../../services/StorageService';
import { GPSService } from '../../services/gps/GPSService';
import { DrivingLogStatus, LocationType } from '../../types';

// Mock GPS Service
jest.mock('../../services/gps/GPSService');

describe('Complete Workflow Integration Test', () => {
  let drivingLogController: DrivingLogController;
  let locationController: LocationController;
  let historyController: HistoryController;
  let exportController: ExportController;
  let storageService: StorageService;

  beforeEach(() => {
    // Reset storage
    localStorage.clear();
    
    // Initialize services
    storageService = new StorageService();
    
    // Initialize controllers
    drivingLogController = new DrivingLogController();
    locationController = new LocationController();
    historyController = new HistoryController();
    exportController = new ExportController();

    // Mock GPS service
    const mockGPS = GPSService as jest.Mocked<typeof GPSService>;
    mockGPS.getCurrentPosition = jest.fn().mockResolvedValue({
      latitude: 35.6762,
      longitude: 139.6503,
      accuracy: 10,
      timestamp: new Date()
    });
  });

  afterEach(async () => {
    // Cleanup
    localStorage.clear();
    jest.clearAllMocks();
  });

  test('Complete driving log workflow', async () => {
    // Step 1: Create a new driving log
    const newLog = await drivingLogController.startNewLog({
      purpose: '通勤',
      vehicle: '普通車',
      driver: 'テストユーザー'
    });

    expect(newLog).toBeDefined();
    expect(newLog.status).toBe(DrivingLogStatus.IN_PROGRESS);
    expect(newLog.id).toBeDefined();

    // Step 2: Add start location
    const startLocation = await locationController.addLocation({
      logId: newLog.id,
      type: LocationType.START,
      address: '東京駅',
      coordinates: { latitude: 35.6812, longitude: 139.7671 }
    });

    expect(startLocation).toBeDefined();
    expect(startLocation.type).toBe(LocationType.START);

    // Step 3: Add waypoint
    const waypoint = await locationController.addLocation({
      logId: newLog.id,
      type: LocationType.WAYPOINT,
      address: '新宿駅',
      coordinates: { latitude: 35.6896, longitude: 139.7006 }
    });

    expect(waypoint).toBeDefined();
    expect(waypoint.type).toBe(LocationType.WAYPOINT);

    // Step 4: Add end location and complete log
    const endLocation = await locationController.addLocation({
      logId: newLog.id,
      type: LocationType.END,
      address: '渋谷駅',
      coordinates: { latitude: 35.6580, longitude: 139.7016 }
    });

    expect(endLocation).toBeDefined();
    expect(endLocation.type).toBe(LocationType.END);

    // Step 5: Complete the driving log
    const completedLog = await drivingLogController.completeLog(newLog.id, {
      endTime: new Date(),
      totalDistance: 15.2,
      notes: '交通渋滞のため通常より時間がかかった'
    });

    expect(completedLog).toBeDefined();
    expect(completedLog.status).toBe(DrivingLogStatus.COMPLETED);
    expect(completedLog.totalDistance).toBe(15.2);

    // Step 6: Verify data is saved
    const savedLogs = await historyController.getAllLogs();
    expect(savedLogs).toHaveLength(1);
    expect(savedLogs[0].id).toBe(newLog.id);

    // Step 7: Verify locations are associated
    const logWithLocations = await historyController.getLogWithLocations(newLog.id);
    expect(logWithLocations).toBeDefined();
    expect(logWithLocations!.locations).toHaveLength(3);
    
    const locations = logWithLocations!.locations;
    expect(locations.find(l => l.type === LocationType.START)).toBeDefined();
    expect(locations.find(l => l.type === LocationType.WAYPOINT)).toBeDefined();
    expect(locations.find(l => l.type === LocationType.END)).toBeDefined();

    // Step 8: Test export functionality
    const exportData = await exportController.exportLogs([completedLog.id], {
      format: 'csv',
      includeLocations: true,
      dateRange: {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
        end: new Date(Date.now() + 24 * 60 * 60 * 1000)    // Tomorrow
      }
    });

    expect(exportData).toBeDefined();
    expect(exportData.data).toContain('東京駅');
    expect(exportData.data).toContain('新宿駅');
    expect(exportData.data).toContain('渋谷駅');
    expect(exportData.filename).toMatch(/\.csv$/);
  });

  test('Error handling in workflow', async () => {
    // Test invalid operations
    await expect(drivingLogController.completeLog('invalid-id', {
      endTime: new Date(),
      totalDistance: 0
    })).rejects.toThrow();

    // Test adding location to non-existent log
    await expect(locationController.addLocation({
      logId: 'invalid-id',
      type: LocationType.START,
      address: 'Test Address'
    })).rejects.toThrow();

    // Test getting non-existent log
    const result = await historyController.getLogWithLocations('invalid-id');
    expect(result).toBeNull();
  });

  test('Multiple concurrent logs workflow', async () => {
    // Create first log
    const log1 = await drivingLogController.startNewLog({
      purpose: '通勤',
      vehicle: '普通車'
    });

    // Create second log
    const log2 = await drivingLogController.startNewLog({
      purpose: '買い物',
      vehicle: '軽自動車'
    });

    // Both logs should be independent
    expect(log1.id).not.toBe(log2.id);
    expect(log1.purpose).toBe('通勤');
    expect(log2.purpose).toBe('買い物');

    // Add locations to both logs
    const location1 = await locationController.addLocation({
      logId: log1.id,
      type: LocationType.START,
      address: 'Location 1'
    });

    const location2 = await locationController.addLocation({
      logId: log2.id,
      type: LocationType.START,
      address: 'Location 2'
    });

    // Verify locations are associated with correct logs
    expect(location1.logId).toBe(log1.id);
    expect(location2.logId).toBe(log2.id);

    // Complete both logs
    await drivingLogController.completeLog(log1.id, {
      endTime: new Date(),
      totalDistance: 10
    });

    await drivingLogController.completeLog(log2.id, {
      endTime: new Date(),
      totalDistance: 5
    });

    // Verify both logs are saved
    const allLogs = await historyController.getAllLogs();
    expect(allLogs).toHaveLength(2);
  });

  test('Data persistence across sessions', async () => {
    // Create and complete a log
    const log = await drivingLogController.startNewLog({
      purpose: 'テスト'
    });

    await locationController.addLocation({
      logId: log.id,
      type: LocationType.START,
      address: 'Test Start'
    });

    const completedLog = await drivingLogController.completeLog(log.id, {
      endTime: new Date(),
      totalDistance: 5.5
    });

    // Simulate new session by creating new controller instances
    const newHistoryController = new HistoryController();
    
    // Verify data persists
    const persistedLogs = await newHistoryController.getAllLogs();
    expect(persistedLogs).toHaveLength(1);
    expect(persistedLogs[0].id).toBe(completedLog.id);
    expect(persistedLogs[0].totalDistance).toBe(5.5);
  });

  test('Performance with large dataset', async () => {
    const startTime = Date.now();
    
    // Create multiple logs
    const logs = [];
    for (let i = 0; i < 50; i++) {
      const log = await drivingLogController.startNewLog({
        purpose: `テスト ${i}`,
        vehicle: '普通車'
      });

      // Add multiple locations
      await locationController.addLocation({
        logId: log.id,
        type: LocationType.START,
        address: `Start ${i}`
      });

      await locationController.addLocation({
        logId: log.id,
        type: LocationType.END,
        address: `End ${i}`
      });

      const completed = await drivingLogController.completeLog(log.id, {
        endTime: new Date(),
        totalDistance: Math.random() * 50
      });

      logs.push(completed);
    }

    const creationTime = Date.now() - startTime;
    expect(creationTime).toBeLessThan(5000); // Should complete within 5 seconds

    // Test retrieval performance
    const retrievalStart = Date.now();
    const allLogs = await historyController.getAllLogs();
    const retrievalTime = Date.now() - retrievalStart;

    expect(allLogs).toHaveLength(50);
    expect(retrievalTime).toBeLessThan(1000); // Should retrieve within 1 second

    // Test export performance
    const exportStart = Date.now();
    const exportData = await exportController.exportLogs(logs.map(l => l.id), {
      format: 'csv'
    });
    const exportTime = Date.now() - exportStart;

    expect(exportData).toBeDefined();
    expect(exportTime).toBeLessThan(2000); // Should export within 2 seconds
  });
});