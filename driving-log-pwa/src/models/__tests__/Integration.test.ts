import { DrivingLogModel, LocationModel, SettingsModel, ModelFactory } from '../index';
import { StorageService } from '../../services/StorageService';
import { DrivingLogStatus, LocationType, ExportFormat } from '../../types';
import type { DrivingLog, Location } from '../../types';

// Mock data
const mockStartLocation: Location = {
  id: 'loc-start-001',
  name: '本社',
  latitude: 35.6762,
  longitude: 139.6503,
  accuracy: 10,
  timestamp: new Date('2024-01-15T08:00:00Z'),
  type: LocationType.START
};

const mockWaypoint: Location = {
  id: 'loc-waypoint-001',
  name: 'A社',
  latitude: 35.6586,
  longitude: 139.7454,
  accuracy: 15,
  timestamp: new Date('2024-01-15T10:00:00Z'),
  type: LocationType.WAYPOINT
};

const mockEndLocation: Location = {
  id: 'loc-end-001',
  name: '本社',
  latitude: 35.6762,
  longitude: 139.6503,
  accuracy: 12,
  timestamp: new Date('2024-01-15T17:00:00Z'),
  type: LocationType.END
};

describe('Integration Tests', () => {
  let storageService: StorageService;

  beforeEach(async () => {
    storageService = new StorageService();
    await storageService.initialize();
    await storageService.clear(); // テスト用にクリア
  });

  afterEach(async () => {
    if (storageService.isInitialized) {
      await storageService.clear();
    }
  });

  describe('IT-001: StorageService連携', () => {
    test('DrivingLogModelとStorageServiceの連携', async () => {
      const drivingLog = ModelFactory.createDrivingLog({
        date: new Date('2024-01-15'),
        driverName: '山田太郎',
        startLocation: mockStartLocation,
        waypoints: [mockWaypoint],
        endLocation: mockEndLocation,
        status: DrivingLogStatus.COMPLETED
      });

      // StorageServiceに保存
      const storageFormat = drivingLog.toStorageFormat();
      const saved = await storageService.createDrivingLog(storageFormat);
      
      // StorageServiceから取得
      const retrieved = await storageService.getDrivingLog(saved.id);
      expect(retrieved).toBeDefined();
      
      // Modelに変換
      const retrievedModel = DrivingLogModel.fromStorageFormat(retrieved!);

      expect(retrievedModel.id).toBe(drivingLog.id);
      expect(retrievedModel.date).toEqual(drivingLog.date);
      expect(retrievedModel.driverName).toBe(drivingLog.driverName);
      expect(retrievedModel.status).toBe(drivingLog.status);
      expect(retrievedModel.waypoints).toHaveLength(1);
      expect(retrievedModel.endLocation).toEqual(mockEndLocation);
    });

    test('IT-001: 複数回の保存・取得サイクル', async () => {
      const locations = Array.from({ length: 10 }, (_, i) => 
        ModelFactory.createLocation({
          latitude: 35.6762 + i * 0.001,
          longitude: 139.6503 + i * 0.001,
          type: i === 0 ? LocationType.START : 
                i === 9 ? LocationType.END : LocationType.WAYPOINT,
          timestamp: new Date(Date.now() + i * 60000)
        })
      );

      const originalLog = ModelFactory.createDrivingLog({
        date: new Date(),
        startLocation: locations[0],
        waypoints: locations.slice(1, -1),
        endLocation: locations[locations.length - 1],
        status: DrivingLogStatus.COMPLETED
      });

      // 複数回の保存・取得サイクル
      let currentLog = originalLog;
      for (let i = 0; i < 3; i++) {
        const storageFormat = currentLog.toStorageFormat();
        const saved = await storageService.createDrivingLog(storageFormat);
        const retrieved = await storageService.getDrivingLog(saved.id);
        currentLog = DrivingLogModel.fromStorageFormat(retrieved!);
        
        await storageService.deleteDrivingLog(saved.id);
      }

      expect(currentLog.waypoints).toHaveLength(8);
      expect(currentLog.calculateTotalDistance()).toBeGreaterThan(0);
      expect(currentLog.status).toBe(DrivingLogStatus.COMPLETED);
    });

    test('大量データでの整合性確認', async () => {
      const logs = Array.from({ length: 100 }, (_, i) =>
        ModelFactory.createDrivingLog({
          date: new Date(2024, 0, i + 1),
          driverName: `ドライバー${i}`,
          startLocation: mockStartLocation,
          waypoints: [],
          status: i % 2 === 0 ? DrivingLogStatus.COMPLETED : DrivingLogStatus.IN_PROGRESS
        })
      );

      // 全てを保存
      const savedIds: string[] = [];
      for (const log of logs) {
        const saved = await storageService.createDrivingLog(log.toStorageFormat());
        savedIds.push(saved.id);
      }

      expect(savedIds).toHaveLength(100);

      // ランダムにいくつか取得して確認
      const randomIds = savedIds.slice(0, 10);
      for (const id of randomIds) {
        const retrieved = await storageService.getDrivingLog(id);
        expect(retrieved).toBeDefined();
        
        const model = DrivingLogModel.fromStorageFormat(retrieved!);
        expect(model.driverName).toMatch(/^ドライバー\d+$/);
        expect([DrivingLogStatus.COMPLETED, DrivingLogStatus.IN_PROGRESS])
          .toContain(model.status);
      }
    });
  });

  describe('IT-002: 型定義との整合性', () => {
    test('DrivingLogインターフェースとの互換性', () => {
      const model = ModelFactory.createDrivingLog({
        date: new Date(),
        startLocation: mockStartLocation,
        waypoints: []
      });

      // TypeScriptの型として扱えることを確認
      const interfaceObj: DrivingLog = model;
      expect(interfaceObj.id).toBe(model.id);
      expect(interfaceObj.date).toEqual(model.date);
      expect(interfaceObj.startLocation).toEqual(model.startLocation);
      expect(interfaceObj.status).toBe(model.status);
    });

    test('全enum値のサポート確認', () => {
      Object.values(DrivingLogStatus).forEach(status => {
        const model = ModelFactory.createDrivingLog({
          date: new Date(),
          startLocation: mockStartLocation,
          waypoints: [],
          status
        });
        
        expect(model.status).toBe(status);
      });

      Object.values(LocationType).forEach(type => {
        const location = ModelFactory.createLocation({
          latitude: 35.6762,
          longitude: 139.6503,
          timestamp: new Date(),
          type
        });
        
        expect(location.type).toBe(type);
      });

      Object.values(ExportFormat).forEach(format => {
        const settings = ModelFactory.createSettings({
          exportFormat: format
        });
        
        expect(settings.exportFormat).toBe(format);
      });
    });

    test('必須・オプションフィールドの正しい扱い', () => {
      // 必須フィールドのみでの作成
      const minimalLog = ModelFactory.createDrivingLog({
        date: new Date(),
        startLocation: mockStartLocation,
        waypoints: []
      });

      expect(minimalLog.date).toBeInstanceOf(Date);
      expect(minimalLog.startLocation).toEqual(mockStartLocation);
      expect(minimalLog.waypoints).toEqual([]);
      expect(minimalLog.status).toBe(DrivingLogStatus.IN_PROGRESS);
      
      // オプションフィールドが未定義であることを確認
      expect(minimalLog.driverName).toBeUndefined();
      expect(minimalLog.vehicleNumber).toBeUndefined();
      expect(minimalLog.endLocation).toBeUndefined();
      expect(minimalLog.totalDistance).toBeUndefined();
    });
  });

  describe('モデル間の連携', () => {
    test('DrivingLogとLocationの関係性', () => {
      const startLocation = ModelFactory.createLocation({
        name: '出発地',
        latitude: 35.6762,
        longitude: 139.6503,
        type: LocationType.START,
        timestamp: new Date('2024-01-15T08:00:00Z')
      });

      const endLocation = ModelFactory.createLocation({
        name: '到着地',
        latitude: 35.6895,
        longitude: 139.6917,
        type: LocationType.END,
        timestamp: new Date('2024-01-15T17:00:00Z')
      });

      const drivingLog = ModelFactory.createDrivingLog({
        date: new Date('2024-01-15'),
        startLocation,
        waypoints: [],
        endLocation
      });

      expect(drivingLog.startLocation).toBe(startLocation);
      expect(drivingLog.endLocation).toBe(endLocation);
      
      // 距離計算
      const calculatedDistance = drivingLog.calculateTotalDistance();
      const directDistance = startLocation.distanceTo(endLocation);
      
      expect(calculatedDistance).toBe(directDistance);
    });

    test('SettingsとFavoriteLocationの関係性', () => {
      const homeLocation = ModelFactory.createLocation({
        name: '自宅',
        latitude: 35.6762,
        longitude: 139.6503,
        type: LocationType.START,
        timestamp: new Date()
      });

      const favoriteLocation = {
        id: homeLocation.id,
        name: homeLocation.name!,
        address: homeLocation.address,
        latitude: homeLocation.latitude,
        longitude: homeLocation.longitude
      };

      const settings = ModelFactory.createSettings()
        .addFavoriteLocation(favoriteLocation);

      expect(settings.favoriteLocations).toHaveLength(1);
      expect(settings.favoriteLocations[0]).toEqual(favoriteLocation);
      
      // LocationModelとの互換性確認
      const recreatedLocation = ModelFactory.createLocation({
        ...favoriteLocation,
        type: LocationType.START,
        timestamp: new Date()
      });

      expect(recreatedLocation.name).toBe(favoriteLocation.name);
      expect(recreatedLocation.latitude).toBe(favoriteLocation.latitude);
      expect(recreatedLocation.longitude).toBe(favoriteLocation.longitude);
    });
  });

  describe('JSON serialization/deserialization', () => {
    test('完全なモデルのJSONラウンドトリップ', () => {
      const originalLog = ModelFactory.createDrivingLog({
        date: new Date('2024-01-15T12:00:00Z'),
        driverName: '山田太郎',
        vehicleNumber: '品川500 あ 12-34',
        startLocation: mockStartLocation,
        waypoints: [mockWaypoint],
        endLocation: mockEndLocation,
        status: DrivingLogStatus.COMPLETED
      });

      // JSON化
      const json = originalLog.toJSON();
      
      // JSON文字列化・パース
      const jsonString = JSON.stringify(json);
      const parsed = JSON.parse(jsonString);
      
      // モデルに復元
      const restored = DrivingLogModel.fromJSON(parsed);

      expect(restored.id).toBe(originalLog.id);
      expect(restored.date).toEqual(originalLog.date);
      expect(restored.driverName).toBe(originalLog.driverName);
      expect(restored.vehicleNumber).toBe(originalLog.vehicleNumber);
      expect(restored.status).toBe(originalLog.status);
      expect(restored.waypoints).toHaveLength(1);
    });

    test('設定のJSONラウンドトリップ', () => {
      const originalSettings = ModelFactory.createSettings({
        language: 'en',
        gpsTimeout: 15,
        autoExportEnabled: true,
        exportFormat: ExportFormat.JSON,
        theme: 'dark'
      }).addFavoriteLocation({
        id: 'fav-001',
        name: 'お気に入り地点',
        latitude: 35.6762,
        longitude: 139.6503
      });

      const json = originalSettings.toJSON();
      const jsonString = JSON.stringify(json);
      const parsed = JSON.parse(jsonString);
      const restored = SettingsModel.fromJSON(parsed);

      expect(restored.language).toBe('en');
      expect(restored.gpsTimeout).toBe(15);
      expect(restored.autoExportEnabled).toBe(true);
      expect(restored.exportFormat).toBe(ExportFormat.JSON);
      expect(restored.theme).toBe('dark');
      expect(restored.favoriteLocations).toHaveLength(1);
      expect(restored.favoriteLocations[0].name).toBe('お気に入り地点');
    });
  });
});