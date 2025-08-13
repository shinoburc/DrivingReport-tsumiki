import { ModelValidator } from '../validators/ModelValidator';
import { DrivingLogStatus, LocationType, ExportFormat, ErrorCode } from '../../types';

describe('ModelValidator', () => {
  describe('DrivingLog バリデーション', () => {
    test('VT-001: 正常なDrivingLogデータ', () => {
      const validData = {
        date: new Date('2024-01-15'),
        startLocation: {
          id: 'loc-001',
          latitude: 35.6762,
          longitude: 139.6503,
          timestamp: new Date('2024-01-15T08:00:00Z'),
          type: LocationType.START
        },
        waypoints: [],
        status: DrivingLogStatus.IN_PROGRESS
      };

      const result = ModelValidator.validateDrivingLog(validData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('VT-001: 必須フィールド不足', () => {
      const invalidData = [
        {}, // 全てなし
        { date: new Date() }, // startLocationなし
        { startLocation: { id: 'test', timestamp: new Date(), type: LocationType.START } }, // dateなし
        { date: new Date(), startLocation: { id: 'test', timestamp: new Date(), type: LocationType.START } } // waypointsなし
      ];

      invalidData.forEach((data, index) => {
        const result = ModelValidator.validateDrivingLog(data);

        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
        
        result.errors.forEach(error => {
          expect(error.field).toBeDefined();
          expect(error.message).toMatch(/required/i);
        });
      });
    });

    test('VT-002: 無効な日付タイプ', () => {
      const invalidDates = [
        'invalid-date',
        123456789,
        null,
        undefined,
        new Date('invalid'),
        'not-a-date'
      ];

      invalidDates.forEach(date => {
        const data = {
          date,
          startLocation: {
            id: 'loc-001',
            latitude: 35.6762,
            longitude: 139.6503,
            timestamp: new Date(),
            type: LocationType.START
          },
          waypoints: []
        };

        const result = ModelValidator.validateDrivingLog(data);

        expect(result.isValid).toBe(false);
        expect(result.errors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              field: 'date',
              message: expect.stringMatching(/invalid.*date/i)
            })
          ])
        );
      });
    });

    test('VT-003: 無効なステータス値', () => {
      const invalidStatuses = ['INVALID_STATUS', 123, null, undefined, ''];

      invalidStatuses.forEach(status => {
        const data = {
          date: new Date(),
          startLocation: {
            id: 'loc-001',
            latitude: 35.6762,
            longitude: 139.6503,
            timestamp: new Date(),
            type: LocationType.START
          },
          waypoints: [],
          status
        };

        const result = ModelValidator.validateDrivingLog(data);

        expect(result.isValid).toBe(false);
        expect(result.errors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              field: 'status',
              message: expect.stringMatching(/invalid.*status/i)
            })
          ])
        );
      });
    });
  });

  describe('Location バリデーション', () => {
    test('VT-001: 正常なLocationデータ', () => {
      const validData = {
        latitude: 35.6762,
        longitude: 139.6503,
        accuracy: 10,
        timestamp: new Date(),
        type: LocationType.START
      };

      const result = ModelValidator.validateLocation(validData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('VT-001: 必須フィールド不足', () => {
      const invalidData = [
        { latitude: 35.6762 }, // longitude, timestamp, typeなし
        { longitude: 139.6503 }, // latitude, timestamp, typeなし
        { timestamp: new Date() }, // latitude, longitude, typeなし
        { type: LocationType.START } // latitude, longitude, timestampなし
      ];

      invalidData.forEach(data => {
        const result = ModelValidator.validateLocation(data);

        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    test('VT-002: 無効な座標タイプ', () => {
      const invalidCoordinates = [
        { latitude: '35.6762', longitude: 139.6503 }, // 文字列
        { latitude: 35.6762, longitude: '139.6503' }, // 文字列
        { latitude: null, longitude: 139.6503 }, // null
        { latitude: undefined, longitude: 139.6503 }, // undefined
        { latitude: NaN, longitude: 139.6503 }, // NaN
        { latitude: Infinity, longitude: 139.6503 } // Infinity
      ];

      invalidCoordinates.forEach(coords => {
        const data = {
          ...coords,
          timestamp: new Date(),
          type: LocationType.START
        };

        const result = ModelValidator.validateLocation(data);

        expect(result.isValid).toBe(false);
        expect(result.errors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              message: expect.stringMatching(/invalid.*coordinate/i)
            })
          ])
        );
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
        const data = {
          ...coords,
          timestamp: new Date(),
          type: LocationType.START
        };

        const result = ModelValidator.validateLocation(data);

        expect(result.isValid).toBe(false);
        expect(result.errors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              message: expect.stringMatching(/coordinate.*range/i)
            })
          ])
        );
      });
    });

    test('VT-003: 負の精度値', () => {
      const data = {
        latitude: 35.6762,
        longitude: 139.6503,
        accuracy: -1,
        timestamp: new Date(),
        type: LocationType.START
      };

      const result = ModelValidator.validateLocation(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'accuracy',
            message: expect.stringMatching(/accuracy.*positive/i)
          })
        ])
      );
    });
  });

  describe('AppSettings バリデーション', () => {
    test('正常なAppSettingsデータ', () => {
      const validData = {
        language: 'ja',
        gpsTimeout: 10,
        autoExportEnabled: false,
        exportFormat: ExportFormat.CSV,
        favoriteLocations: [],
        theme: 'auto'
      };

      const result = ModelValidator.validateSettings(validData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('VT-003: 無効なGPSタイムアウト値', () => {
      const invalidTimeouts = [-1, 0, 301, 'invalid', null];

      invalidTimeouts.forEach(timeout => {
        const data = {
          language: 'ja',
          gpsTimeout: timeout,
          autoExportEnabled: false,
          exportFormat: ExportFormat.CSV,
          favoriteLocations: [],
          theme: 'auto'
        };

        const result = ModelValidator.validateSettings(data);

        expect(result.isValid).toBe(false);
        expect(result.errors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              field: 'gpsTimeout',
              message: expect.stringMatching(/timeout.*range/i)
            })
          ])
        );
      });
    });

    test('無効な言語設定', () => {
      const invalidLanguages = ['invalid', 'fr', 123, null, undefined];

      invalidLanguages.forEach(language => {
        const data = {
          language,
          gpsTimeout: 10,
          autoExportEnabled: false,
          exportFormat: ExportFormat.CSV,
          favoriteLocations: [],
          theme: 'auto'
        };

        const result = ModelValidator.validateSettings(data);

        expect(result.isValid).toBe(false);
        expect(result.errors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              field: 'language',
              message: expect.stringMatching(/invalid.*language/i)
            })
          ])
        );
      });
    });

    test('無効なテーマ設定', () => {
      const invalidThemes = ['invalid', 'blue', 123, null];

      invalidThemes.forEach(theme => {
        const data = {
          language: 'ja',
          gpsTimeout: 10,
          autoExportEnabled: false,
          exportFormat: ExportFormat.CSV,
          favoriteLocations: [],
          theme
        };

        const result = ModelValidator.validateSettings(data);

        expect(result.isValid).toBe(false);
        expect(result.errors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              field: 'theme',
              message: expect.stringMatching(/invalid.*theme/i)
            })
          ])
        );
      });
    });
  });

  describe('座標検証ユーティリティ', () => {
    test('有効な座標の検証', () => {
      const validCoordinates = [
        [0, 0], // 赤道・本初子午線
        [35.6762, 139.6503], // 東京
        [-90, -180], // 南極・日付変更線
        [90, 180], // 北極・日付変更線
        [45.5, -122.5] // 一般的な座標
      ];

      validCoordinates.forEach(([lat, lng]) => {
        expect(ModelValidator.validateCoordinates(lat, lng)).toBe(true);
      });
    });

    test('無効な座標の検証', () => {
      const invalidCoordinates = [
        [-91, 0], // 緯度範囲外
        [91, 0],  // 緯度範囲外
        [0, -181], // 経度範囲外
        [0, 181],  // 経度範囲外
        [NaN, 0],  // NaN
        [0, Infinity], // 無限大
        [null, 0], // null
        [undefined, 0] // undefined
      ];

      invalidCoordinates.forEach(([lat, lng]) => {
        expect(ModelValidator.validateCoordinates(lat, lng)).toBe(false);
      });
    });
  });

  describe('日付検証ユーティリティ', () => {
    test('有効な日付の検証', () => {
      const validDates = [
        new Date(),
        new Date('2024-01-15'),
        new Date('2024-12-31T23:59:59Z'),
        new Date(2024, 0, 15) // 月は0ベース
      ];

      validDates.forEach(date => {
        expect(ModelValidator.validateDate(date)).toBe(true);
      });
    });

    test('無効な日付の検証', () => {
      const invalidDates = [
        'invalid-date',
        123456789,
        null,
        undefined,
        new Date('invalid'),
        'not-a-date',
        {},
        []
      ];

      invalidDates.forEach(date => {
        expect(ModelValidator.validateDate(date)).toBe(false);
      });
    });
  });

  describe('複雑なバリデーション', () => {
    test('複数エラーの同時検出', () => {
      const invalidData = {
        // 複数の問題を含むデータ
        date: 'invalid-date',
        startLocation: {
          latitude: 91, // 範囲外
          longitude: 'invalid', // 型違い
          timestamp: null, // null
          type: 'INVALID_TYPE' // 無効なenum
        },
        waypoints: 'not-array', // 配列でない
        status: 123 // 無効な型
      };

      const result = ModelValidator.validateDrivingLog(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(3);
      
      // 各フィールドのエラーが含まれていることを確認
      const errorFields = result.errors.map(error => error.field);
      expect(errorFields).toEqual(
        expect.arrayContaining(['date', 'waypoints', 'status'])
      );
    });

    test('ネストしたオブジェクトのバリデーション', () => {
      const dataWithInvalidNesting = {
        date: new Date(),
        startLocation: {
          id: 'valid-id',
          latitude: 35.6762,
          longitude: 139.6503,
          timestamp: new Date(),
          type: LocationType.START,
          // ネストした無効データ
          someInvalidProperty: {
            nested: 'invalid'
          }
        },
        waypoints: [
          {
            // 無効な位置情報
            latitude: 91,
            longitude: 'invalid'
          }
        ],
        status: DrivingLogStatus.IN_PROGRESS
      };

      const result = ModelValidator.validateDrivingLog(dataWithInvalidNesting);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('パフォーマンステスト', () => {
    test('大量データのバリデーション性能', () => {
      const largeDataSet = Array.from({ length: 1000 }, (_, i) => ({
        date: new Date(),
        startLocation: {
          id: `loc-${i}`,
          latitude: 35.6762,
          longitude: 139.6503,
          timestamp: new Date(),
          type: LocationType.START
        },
        waypoints: [],
        status: DrivingLogStatus.IN_PROGRESS
      }));

      const startTime = Date.now();
      
      const results = largeDataSet.map(data => 
        ModelValidator.validateDrivingLog(data)
      );

      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(500); // 500ms以内
      expect(results.every(result => result.isValid)).toBe(true);
    });
  });
});