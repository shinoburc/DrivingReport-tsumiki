import { LocationModel } from '../entities/LocationModel';
import { ModelFactory } from '../factories/ModelFactory';
import { LocationType, AppError, ErrorCode } from '../../types';

describe('LocationModel', () => {
  describe('基本インスタンス作成', () => {
    test('UC-005: GPS座標での位置情報作成', () => {
      const locationData = {
        latitude: 35.6762,
        longitude: 139.6503,
        accuracy: 10,
        timestamp: new Date(),
        type: LocationType.START
      };

      const location = LocationModel.create(locationData);

      expect(location.id).toBeDefined();
      expect(typeof location.id).toBe('string');
      expect(location.latitude).toBe(35.6762);
      expect(location.longitude).toBe(139.6503);
      expect(location.accuracy).toBe(10);
      expect(location.type).toBe(LocationType.START);
      expect(location.timestamp).toEqual(locationData.timestamp);
    });

    test('UC-005: 住所情報での位置情報作成', () => {
      const locationData = {
        name: '東京駅',
        address: '東京都千代田区丸の内1丁目',
        timestamp: new Date(),
        type: LocationType.WAYPOINT
      };

      const location = LocationModel.create(locationData);

      expect(location.name).toBe('東京駅');
      expect(location.address).toBe('東京都千代田区丸の内1丁目');
      expect(location.type).toBe(LocationType.WAYPOINT);
      expect(location.latitude).toBeUndefined(); // GPS座標がない場合
      expect(location.longitude).toBeUndefined();
    });

    test('完全なデータでの位置情報作成', () => {
      const locationData = {
        name: '東京駅',
        address: '東京都千代田区丸の内1丁目',
        latitude: 35.6762,
        longitude: 139.6503,
        accuracy: 10,
        timestamp: new Date(),
        type: LocationType.START,
        note: 'テスト地点',
        imageDataUrl: 'data:image/jpeg;base64,test'
      };

      const location = LocationModel.create(locationData);

      expect(location.name).toBe('東京駅');
      expect(location.address).toBe('東京都千代田区丸の内1丁目');
      expect(location.latitude).toBe(35.6762);
      expect(location.longitude).toBe(139.6503);
      expect(location.note).toBe('テスト地点');
      expect(location.imageDataUrl).toBe('data:image/jpeg;base64,test');
    });
  });

  describe('更新機能', () => {
    test('位置情報の更新', () => {
      const original = LocationModel.create({
        latitude: 35.6762,
        longitude: 139.6503,
        timestamp: new Date(),
        type: LocationType.START
      });

      const updates = {
        name: '更新された地点',
        accuracy: 5,
        note: '追加メモ'
      };

      const updated = original.update(updates);

      expect(updated.name).toBe('更新された地点');
      expect(updated.accuracy).toBe(5);
      expect(updated.note).toBe('追加メモ');
      expect(updated.latitude).toBe(original.latitude); // 変更されない
      
      // Immutability確認
      expect(original.name).toBeUndefined();
      expect(original.accuracy).toBeUndefined();
    });
  });

  describe('距離計算', () => {
    test('UC-006: 2点間の距離計算', () => {
      const location1 = LocationModel.create({
        latitude: 35.6762, // 東京駅
        longitude: 139.6503,
        timestamp: new Date(),
        type: LocationType.START
      });

      const location2 = LocationModel.create({
        latitude: 35.6895, // 神保町駅
        longitude: 139.6917,
        timestamp: new Date(),
        type: LocationType.END
      });

      const distance = location1.distanceTo(location2);

      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(5); // 5km以内の想定
      expect(typeof distance).toBe('number');
      expect(Number.isFinite(distance)).toBe(true);
    });

    test('同一地点の距離計算', () => {
      const location1 = LocationModel.create({
        latitude: 35.6762,
        longitude: 139.6503,
        timestamp: new Date(),
        type: LocationType.START
      });

      const location2 = LocationModel.create({
        latitude: 35.6762,
        longitude: 139.6503,
        timestamp: new Date(),
        type: LocationType.END
      });

      const distance = location1.distanceTo(location2);

      expect(distance).toBe(0);
    });

    test('GPS座標がない場合の距離計算エラー', () => {
      const location1 = LocationModel.create({
        name: '東京駅',
        timestamp: new Date(),
        type: LocationType.START
      });

      const location2 = LocationModel.create({
        latitude: 35.6762,
        longitude: 139.6503,
        timestamp: new Date(),
        type: LocationType.END
      });

      expect(() => location1.distanceTo(location2))
        .toThrow(/coordinates.*required/i);
    });
  });

  describe('座標検証', () => {
    test('GPS座標の有効性チェック', () => {
      const validLocation = LocationModel.create({
        latitude: 35.6762,
        longitude: 139.6503,
        timestamp: new Date(),
        type: LocationType.START
      });

      const invalidLocation = LocationModel.create({
        name: '住所のみ',
        timestamp: new Date(),
        type: LocationType.START
      });

      expect(validLocation.isValidCoordinates()).toBe(true);
      expect(invalidLocation.isValidCoordinates()).toBe(false);
    });
  });

  describe('バリデーション', () => {
    test('VT-001: 必須フィールドの検証', () => {
      const invalidData = [
        { latitude: 35.6762 }, // longitudeとtimestampなし
        { longitude: 139.6503 }, // latitudeとtimestampなし
        { timestamp: new Date() }, // typeなし
        { latitude: 35.6762, longitude: 139.6503 } // timestampとtypeなし
      ];

      invalidData.forEach(data => {
        expect(() => LocationModel.create(data as any))
          .toThrow();
      });
    });

    test('VT-002: 無効な座標タイプの検証', () => {
      const invalidCoordinates = [
        { latitude: '35.6762', longitude: 139.6503 }, // 文字列
        { latitude: 35.6762, longitude: '139.6503' }, // 文字列
        { latitude: null, longitude: 139.6503 }, // null
        { latitude: undefined, longitude: 139.6503 }, // undefined
        { latitude: NaN, longitude: 139.6503 }, // NaN
        { latitude: Infinity, longitude: 139.6503 } // Infinity
      ];

      invalidCoordinates.forEach(coords => {
        expect(() => LocationModel.create({
          ...coords,
          timestamp: new Date(),
          type: LocationType.START
        } as any)).toThrow();
      });
    });

    test('VT-003: 座標範囲の検証', () => {
      const invalidRanges = [
        { latitude: -91, longitude: 139.6503 }, // 緯度範囲外
        { latitude: 91, longitude: 139.6503 },  // 緯度範囲外
        { latitude: 35.6762, longitude: -181 }, // 経度範囲外
        { latitude: 35.6762, longitude: 181 }   // 経度範囲外
      ];

      invalidRanges.forEach(coords => {
        expect(() => LocationModel.create({
          ...coords,
          timestamp: new Date(),
          type: LocationType.START
        })).toThrow();
      });
    });

    test('VT-003: 負の精度値の検証', () => {
      expect(() => LocationModel.create({
        latitude: 35.6762,
        longitude: 139.6503,
        accuracy: -1,
        timestamp: new Date(),
        type: LocationType.START
      })).toThrow();
    });
  });

  describe('データ変換', () => {
    test('JSON形式への変換', () => {
      const locationData = {
        name: '東京駅',
        latitude: 35.6762,
        longitude: 139.6503,
        accuracy: 10,
        timestamp: new Date(),
        type: LocationType.START
      };

      const location = LocationModel.create(locationData);
      const json = location.toJSON();

      expect(json.id).toBe(location.id);
      expect(json.name).toBe('東京駅');
      expect(json.latitude).toBe(35.6762);
      expect(json.longitude).toBe(139.6503);
      expect(typeof json.timestamp).toBe('string'); // ISO文字列に変換
      expect(json.type).toBe(LocationType.START);
    });

    test('JSON形式からの変換', () => {
      const jsonData = {
        id: 'test-id',
        name: '東京駅',
        latitude: 35.6762,
        longitude: 139.6503,
        timestamp: '2024-01-15T08:00:00Z',
        type: LocationType.START
      };

      const location = LocationModel.fromJSON(jsonData);

      expect(location.id).toBe('test-id');
      expect(location.name).toBe('東京駅');
      expect(location.latitude).toBe(35.6762);
      expect(location.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('不変性（Immutability）', () => {
    test('インスタンスが不変であることを確認', () => {
      const location = LocationModel.create({
        latitude: 35.6762,
        longitude: 139.6503,
        timestamp: new Date(),
        type: LocationType.START
      });

      expect(() => {
        (location as any).latitude = 99;
      }).toThrow();

      expect(() => {
        (location as any).type = LocationType.END;
      }).toThrow();
    });
  });

  describe('パフォーマンステスト', () => {
    test('PT-002: 大量の距離計算', () => {
      const locations = Array.from({ length: 100 }, (_, i) =>
        LocationModel.create({
          latitude: 35.6762 + i * 0.001,
          longitude: 139.6503 + i * 0.001,
          timestamp: new Date(),
          type: LocationType.WAYPOINT
        })
      );

      const startTime = Date.now();
      
      const distances = locations.map((loc1, i) =>
        locations.slice(i + 1).map(loc2 => loc1.distanceTo(loc2))
      ).flat();

      const endTime = Date.now();

      expect(distances.length).toBe(4950); // 100 * 99 / 2
      expect(endTime - startTime).toBeLessThan(50); // 50ms以内
      distances.forEach(distance => {
        expect(distance).toBeGreaterThanOrEqual(0);
      });
    });
  });
});