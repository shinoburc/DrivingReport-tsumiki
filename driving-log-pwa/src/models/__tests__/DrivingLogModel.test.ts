import { DrivingLogModel } from '../entities/DrivingLogModel';
import { ModelFactory } from '../factories/ModelFactory';
import { LocationModel } from '../entities/LocationModel';
import { DrivingLogStatus, LocationType, AppError, ErrorCode } from '../../types';
import type { Location } from '../../types';

// Mock data
const mockStartLocation: Location = {
  id: 'loc-start-001',
  name: '本社',
  address: '東京都千代田区丸の内1-1-1',
  latitude: 35.6762,
  longitude: 139.6503,
  accuracy: 10,
  timestamp: new Date('2024-01-15T08:00:00Z'),
  type: LocationType.START
};

const mockWaypoint: Location = {
  id: 'loc-waypoint-001',
  name: 'A社',
  address: '東京都港区六本木1-1-1',
  latitude: 35.6586,
  longitude: 139.7454,
  accuracy: 15,
  timestamp: new Date('2024-01-15T10:00:00Z'),
  type: LocationType.WAYPOINT
};

const mockEndLocation: Location = {
  id: 'loc-end-001',
  name: '本社',
  address: '東京都千代田区丸の内1-1-1',
  latitude: 35.6762,
  longitude: 139.6503,
  accuracy: 12,
  timestamp: new Date('2024-01-15T17:00:00Z'),
  type: LocationType.END
};

describe('DrivingLogModel', () => {
  describe('基本インスタンス作成', () => {
    test('UC-002: 最小限の必須データでDrivingLogを作成', () => {
      const data = {
        date: new Date('2024-01-15'),
        startLocation: mockStartLocation,
        waypoints: [],
        status: DrivingLogStatus.IN_PROGRESS
      };

      const drivingLog = DrivingLogModel.create(data);

      expect(drivingLog.id).toBeDefined();
      expect(typeof drivingLog.id).toBe('string');
      expect(drivingLog.date).toEqual(data.date);
      expect(drivingLog.startLocation).toEqual(mockStartLocation);
      expect(drivingLog.waypoints).toEqual([]);
      expect(drivingLog.status).toBe(DrivingLogStatus.IN_PROGRESS);
      expect(drivingLog.createdAt).toBeInstanceOf(Date);
      expect(drivingLog.updatedAt).toBeInstanceOf(Date);
    });

    test('UC-002: 完全なデータでDrivingLogを作成', () => {
      const data = {
        date: new Date('2024-01-15'),
        driverName: '山田太郎',
        vehicleNumber: '品川500 あ 12-34',
        startLocation: mockStartLocation,
        waypoints: [mockWaypoint],
        endLocation: mockEndLocation,
        status: DrivingLogStatus.COMPLETED
      };

      const drivingLog = DrivingLogModel.create(data);

      expect(drivingLog.driverName).toBe('山田太郎');
      expect(drivingLog.vehicleNumber).toBe('品川500 あ 12-34');
      expect(drivingLog.waypoints).toHaveLength(1);
      expect(drivingLog.waypoints[0]).toEqual(mockWaypoint);
      expect(drivingLog.endLocation).toEqual(mockEndLocation);
      expect(drivingLog.status).toBe(DrivingLogStatus.COMPLETED);
    });
  });

  describe('更新機能', () => {
    test('UC-003: DrivingLogプロパティを更新', () => {
      const originalData = {
        date: new Date('2024-01-15'),
        startLocation: mockStartLocation,
        waypoints: [],
        status: DrivingLogStatus.IN_PROGRESS
      };

      const originalLog = DrivingLogModel.create(originalData);
      
      const updates = {
        driverName: '佐藤花子',
        status: DrivingLogStatus.COMPLETED,
        endLocation: mockEndLocation
      };

      const updatedLog = originalLog.update(updates);

      expect(updatedLog.driverName).toBe('佐藤花子');
      expect(updatedLog.status).toBe(DrivingLogStatus.COMPLETED);
      expect(updatedLog.endLocation).toEqual(mockEndLocation);
      expect(updatedLog.updatedAt.getTime()).toBeGreaterThan(originalLog.updatedAt.getTime());
      
      // Immutability確認
      expect(originalLog.driverName).toBeUndefined();
      expect(originalLog.status).toBe(DrivingLogStatus.IN_PROGRESS);
    });
  });

  describe('計算機能', () => {
    test('UC-004: 総距離の自動計算', () => {
      const data = {
        date: new Date('2024-01-15'),
        startLocation: mockStartLocation,
        waypoints: [mockWaypoint],
        endLocation: mockEndLocation,
        status: DrivingLogStatus.COMPLETED
      };

      const drivingLog = DrivingLogModel.create(data);
      const calculatedDistance = drivingLog.calculateTotalDistance();

      expect(calculatedDistance).toBeGreaterThan(0);
      expect(calculatedDistance).toBeLessThan(100); // 東京都内想定
      expect(typeof calculatedDistance).toBe('number');
      expect(Number.isFinite(calculatedDistance)).toBe(true);
    });

    test('位置情報なしの場合の距離計算', () => {
      const data = {
        date: new Date('2024-01-15'),
        startLocation: mockStartLocation,
        waypoints: [],
        status: DrivingLogStatus.IN_PROGRESS
      };

      const drivingLog = DrivingLogModel.create(data);
      const calculatedDistance = drivingLog.calculateTotalDistance();

      expect(calculatedDistance).toBe(0);
    });
  });

  describe('バリデーション', () => {
    test('VT-001: 必須フィールドが不足している場合のエラー', () => {
      const invalidData = [
        {}, // 全てなし
        { date: new Date() }, // startLocationなし
        { startLocation: mockStartLocation }, // dateなし
        { date: new Date(), startLocation: mockStartLocation } // waypointsなし
      ];

      invalidData.forEach(data => {
        expect(() => DrivingLogModel.create(data as any))
          .toThrow();
      });
    });

    test('VT-002: 無効な日付タイプの検証', () => {
      const invalidDates = [
        'invalid-date',
        123456789,
        null,
        undefined,
        new Date('invalid')
      ];

      invalidDates.forEach(date => {
        expect(() => DrivingLogModel.create({
          date,
          startLocation: mockStartLocation,
          waypoints: []
        } as any)).toThrow();
      });
    });

    test('VT-004: 位置情報の時系列検証', () => {
      const baseTime = new Date('2024-01-15T08:00:00Z');
      
      // 正常なケース：時系列順
      const validData = {
        date: new Date('2024-01-15'),
        startLocation: {
          ...mockStartLocation,
          timestamp: baseTime
        },
        waypoints: [{
          ...mockWaypoint,
          timestamp: new Date(baseTime.getTime() + 3600000) // 1時間後
        }],
        endLocation: {
          ...mockEndLocation,
          timestamp: new Date(baseTime.getTime() + 7200000) // 2時間後
        },
        status: DrivingLogStatus.COMPLETED
      };

      const validLog = DrivingLogModel.create(validData);
      expect(validLog.validateLocationSequence()).toBe(true);

      // 異常なケース：時系列逆転
      const invalidData = {
        date: new Date('2024-01-15'),
        startLocation: {
          ...mockStartLocation,
          timestamp: new Date(baseTime.getTime() + 7200000) // 2時間後
        },
        waypoints: [],
        endLocation: {
          ...mockEndLocation,
          timestamp: baseTime // 開始より前
        },
        status: DrivingLogStatus.COMPLETED
      };

      expect(() => DrivingLogModel.create(invalidData))
        .toThrow(/timestamp.*sequence/i);
    });
  });

  describe('データ変換', () => {
    test('ストレージ形式への変換', () => {
      const data = {
        date: new Date('2024-01-15'),
        driverName: '山田太郎',
        startLocation: mockStartLocation,
        waypoints: [],
        status: DrivingLogStatus.IN_PROGRESS
      };

      const drivingLog = DrivingLogModel.create(data);
      const storageFormat = drivingLog.toStorageFormat();

      expect(storageFormat.id).toBe(drivingLog.id);
      expect(storageFormat.date).toEqual(drivingLog.date);
      expect(storageFormat.driverName).toBe(drivingLog.driverName);
      expect(storageFormat.startLocation).toEqual(drivingLog.startLocation);
    });

    test('ストレージ形式からの変換', () => {
      const storageData = {
        id: 'test-id',
        date: new Date('2024-01-15'),
        startLocation: mockStartLocation,
        waypoints: [],
        status: DrivingLogStatus.IN_PROGRESS,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const drivingLog = DrivingLogModel.fromStorageFormat(storageData);

      expect(drivingLog.id).toBe(storageData.id);
      expect(drivingLog.date).toEqual(storageData.date);
      expect(drivingLog.status).toBe(storageData.status);
    });

    test('JSON形式への変換', () => {
      const data = {
        date: new Date('2024-01-15'),
        startLocation: mockStartLocation,
        waypoints: [],
        status: DrivingLogStatus.IN_PROGRESS
      };

      const drivingLog = DrivingLogModel.create(data);
      const json = drivingLog.toJSON();

      expect(json.id).toBe(drivingLog.id);
      expect(typeof json.date).toBe('string'); // ISO文字列に変換
      expect(json.startLocation).toBeDefined();
      expect(Array.isArray(json.waypoints)).toBe(true);
    });
  });

  describe('不変性（Immutability）', () => {
    test('UC-001: インスタンスが不変であることを確認', () => {
      const drivingLog = DrivingLogModel.create({
        date: new Date('2024-01-15'),
        startLocation: mockStartLocation,
        waypoints: [],
        status: DrivingLogStatus.IN_PROGRESS
      });

      expect(() => {
        (drivingLog as any).status = DrivingLogStatus.COMPLETED;
      }).toThrow();

      expect(() => {
        (drivingLog as any).waypoints.push(mockWaypoint);
      }).toThrow();
    });
  });

  describe('エラーハンドリング', () => {
    test('EH-002: 復旧可能エラーの処理', () => {
      const incompleteData = {
        date: new Date(),
        startLocation: mockStartLocation,
        waypoints: []
        // driverName, vehicleNumber等のオプションフィールドなし
      };

      const drivingLog = DrivingLogModel.create(incompleteData);

      expect(drivingLog).toBeDefined();
      expect(drivingLog.driverName).toBeUndefined();
      expect(drivingLog.vehicleNumber).toBeUndefined();
      expect(drivingLog.status).toBe(DrivingLogStatus.IN_PROGRESS); // デフォルト値
    });
  });
});