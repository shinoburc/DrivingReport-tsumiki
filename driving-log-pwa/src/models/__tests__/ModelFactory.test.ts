import { ModelFactory } from '../factories/ModelFactory';
import { DrivingLogModel } from '../entities/DrivingLogModel';
import { LocationModel } from '../entities/LocationModel';
import { SettingsModel } from '../entities/SettingsModel';
import { DrivingLogStatus, LocationType, ExportFormat } from '../../types';
import type { Location } from '../../types';

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

describe('ModelFactory', () => {
  describe('ID生成', () => {
    test('UC-009: 一意なIDの生成', () => {
      const ids = Array.from({ length: 1000 }, () => ModelFactory.generateId());
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(1000); // 全てユニーク
      ids.forEach(id => {
        expect(typeof id).toBe('string');
        expect(id.length).toBeGreaterThan(10);
        expect(id).toMatch(/^[a-z0-9-]+$/i); // UUIDパターン
      });
    });

    test('ID生成のフォーマット検証', () => {
      const id = ModelFactory.generateId();
      
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
      // タイムスタンプベースのIDであることを確認
      expect(id).toMatch(/\d+-[a-z0-9]+/);
    });
  });

  describe('DrivingLogModel作成', () => {
    test('UC-009: デフォルト値でのDrivingLog作成', () => {
      const drivingLog = ModelFactory.createDrivingLog();

      expect(drivingLog).toBeInstanceOf(DrivingLogModel);
      expect(drivingLog.id).toBeDefined();
      expect(drivingLog.status).toBe(DrivingLogStatus.IN_PROGRESS); // デフォルト値
      expect(drivingLog.createdAt).toBeInstanceOf(Date);
      expect(drivingLog.updatedAt).toBeInstanceOf(Date);
      expect(drivingLog.waypoints).toEqual([]);
    });

    test('UC-009: カスタムデータでのDrivingLog作成', () => {
      const customData = {
        date: new Date('2024-01-15'),
        driverName: '山田太郎',
        startLocation: mockStartLocation,
        waypoints: []
      };

      const drivingLog = ModelFactory.createDrivingLog(customData);

      expect(drivingLog.date).toEqual(customData.date);
      expect(drivingLog.driverName).toBe('山田太郎');
      expect(drivingLog.startLocation).toEqual(mockStartLocation);
      expect(drivingLog.status).toBe(DrivingLogStatus.IN_PROGRESS); // デフォルト
    });
  });

  describe('LocationModel作成', () => {
    test('UC-009: デフォルト値でのLocation作成', () => {
      const location = ModelFactory.createLocation();

      expect(location).toBeInstanceOf(LocationModel);
      expect(location.id).toBeDefined();
      expect(location.timestamp).toBeInstanceOf(Date);
      // デフォルトのtypeが設定される
      expect(Object.values(LocationType)).toContain(location.type);
    });

    test('カスタムデータでのLocation作成', () => {
      const customData = {
        name: '東京駅',
        latitude: 35.6762,
        longitude: 139.6503,
        type: LocationType.WAYPOINT,
        timestamp: new Date('2024-01-15T10:00:00Z')
      };

      const location = ModelFactory.createLocation(customData);

      expect(location.name).toBe('東京駅');
      expect(location.latitude).toBe(35.6762);
      expect(location.longitude).toBe(139.6503);
      expect(location.type).toBe(LocationType.WAYPOINT);
      expect(location.timestamp).toEqual(customData.timestamp);
    });
  });

  describe('SettingsModel作成', () => {
    test('デフォルト値でのSettings作成', () => {
      const settings = ModelFactory.createSettings();

      expect(settings).toBeInstanceOf(SettingsModel);
      expect(settings.language).toBe('ja');
      expect(settings.gpsTimeout).toBe(10);
      expect(settings.autoExportEnabled).toBe(false);
      expect(settings.exportFormat).toBe(ExportFormat.CSV);
      expect(settings.theme).toBe('auto');
    });

    test('カスタムデータでのSettings作成', () => {
      const customData = {
        language: 'en' as const,
        gpsTimeout: 15,
        autoExportEnabled: true,
        theme: 'dark' as const
      };

      const settings = ModelFactory.createSettings(customData);

      expect(settings.language).toBe('en');
      expect(settings.gpsTimeout).toBe(15);
      expect(settings.autoExportEnabled).toBe(true);
      expect(settings.theme).toBe('dark');
      // デフォルト値が設定される
      expect(settings.exportFormat).toBe(ExportFormat.CSV);
    });
  });

  describe('モデル複製', () => {
    test('UC-009: DrivingLogModel複製', () => {
      const original = ModelFactory.createDrivingLog({
        date: new Date('2024-01-15'),
        driverName: '山田太郎',
        startLocation: mockStartLocation,
        waypoints: []
      });

      const cloned = ModelFactory.cloneDrivingLog(original);

      expect(cloned.id).not.toBe(original.id); // 新しいID
      expect(cloned.date).toEqual(original.date);
      expect(cloned.driverName).toBe(original.driverName);
      expect(cloned.startLocation).toEqual(original.startLocation);
      expect(cloned.createdAt).toEqual(original.createdAt);
      expect(cloned.status).toBe(original.status);
      
      // 異なるインスタンスであることを確認
      expect(cloned).not.toBe(original);
    });

    test('UC-009: LocationModel複製', () => {
      const original = ModelFactory.createLocation({
        name: '東京駅',
        latitude: 35.6762,
        longitude: 139.6503,
        type: LocationType.START,
        timestamp: new Date('2024-01-15T08:00:00Z')
      });

      const cloned = ModelFactory.cloneLocation(original);

      expect(cloned.id).not.toBe(original.id); // 新しいID
      expect(cloned.name).toBe(original.name);
      expect(cloned.latitude).toBe(original.latitude);
      expect(cloned.longitude).toBe(original.longitude);
      expect(cloned.type).toBe(original.type);
      expect(cloned.timestamp).toEqual(original.timestamp);
      
      // 異なるインスタンスであることを確認
      expect(cloned).not.toBe(original);
    });
  });

  describe('バッチ作成', () => {
    test('PT-001: 大量のモデル作成性能', () => {
      const startTime = Date.now();
      
      const models = Array.from({ length: 1000 }, () => 
        ModelFactory.createDrivingLog({
          date: new Date(),
          startLocation: mockStartLocation,
          waypoints: []
        })
      );

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(models).toHaveLength(1000);
      expect(duration).toBeLessThan(100); // 100ms以内
      
      // 全てのIDが一意であることも確認
      const ids = models.map(m => m.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(1000);
      
      // 全てが正しいインスタンスであることを確認
      models.forEach(model => {
        expect(model).toBeInstanceOf(DrivingLogModel);
        expect(model.date).toBeInstanceOf(Date);
        expect(model.startLocation).toEqual(mockStartLocation);
      });
    });
  });

  describe('エラーハンドリング', () => {
    test('不正なデータでの作成エラー', () => {
      expect(() => ModelFactory.createDrivingLog({
        date: 'invalid-date' as any
      })).toThrow();

      expect(() => ModelFactory.createLocation({
        latitude: 'invalid' as any,
        timestamp: new Date(),
        type: LocationType.START
      })).toThrow();
    });

    test('nullやundefinedでの複製エラー', () => {
      expect(() => ModelFactory.cloneDrivingLog(null as any))
        .toThrow();

      expect(() => ModelFactory.cloneLocation(undefined as any))
        .toThrow();
    });
  });

  describe('デフォルト値の一貫性', () => {
    test('複数回作成時の一貫したデフォルト値', () => {
      const models = Array.from({ length: 10 }, () => 
        ModelFactory.createDrivingLog()
      );

      models.forEach(model => {
        expect(model.status).toBe(DrivingLogStatus.IN_PROGRESS);
        expect(model.waypoints).toEqual([]);
        expect(model.createdAt).toBeInstanceOf(Date);
      });
    });

    test('設定のデフォルト値一貫性', () => {
      const settings = Array.from({ length: 5 }, () => 
        ModelFactory.createSettings()
      );

      settings.forEach(setting => {
        expect(setting.language).toBe('ja');
        expect(setting.gpsTimeout).toBe(10);
        expect(setting.autoExportEnabled).toBe(false);
        expect(setting.exportFormat).toBe(ExportFormat.CSV);
        expect(setting.theme).toBe('auto');
        expect(setting.favoriteLocations).toEqual([]);
      });
    });
  });

  describe('メモリ効率性', () => {
    test('PT-002: メモリリークなしでの大量作成', () => {
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;
      
      // 大量のオブジェクトを作成・破棄
      for (let i = 0; i < 10; i++) {
        const models = Array.from({ length: 1000 }, () => 
          ModelFactory.createDrivingLog({
            date: new Date(),
            startLocation: mockStartLocation,
            waypoints: []
          })
        );
        
        // 参照を削除してGCを促進
        models.length = 0;
        
        if ((global as any).gc) {
          (global as any).gc();
        }
      }

      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryIncrease = finalMemory - initialMemory;

      // メモリ使用量の増加が許容範囲内であること
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // 10MB以内
    });
  });
});