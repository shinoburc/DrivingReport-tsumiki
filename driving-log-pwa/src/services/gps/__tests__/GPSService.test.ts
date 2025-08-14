import { GPSService } from '../GPSService';
import { LocationModel } from '../../../models/entities/LocationModel';
import { 
  GPSOptions, 
  AccuracyLevel, 
  PermissionState, 
  LocationType, 
  ErrorCode, 
  AppError 
} from '../../../types';

// Mock Geolocation API
const mockGeolocation = {
  getCurrentPosition: jest.fn(),
  watchPosition: jest.fn(),
  clearWatch: jest.fn(),
};

const mockPermissions = {
  query: jest.fn(),
};

// Setup global mocks
Object.defineProperty(global.navigator, 'geolocation', {
  value: mockGeolocation,
  writable: true,
});

Object.defineProperty(global.navigator, 'permissions', {
  value: mockPermissions,
  writable: true,
});

describe('GPSService', () => {
  let gpsService: GPSService;

  beforeEach(() => {
    jest.clearAllMocks();
    gpsService = new GPSService();
  });

  afterEach(() => {
    gpsService.cleanup();
  });

  // ========================================
  // UT-201-001: GPS位置情報取得機能
  // ========================================

  describe('getCurrentPosition - 正常ケース', () => {
    test('UT-201-001-01: GPS位置情報が正常に取得できる', async () => {
      // Arrange
      const mockPosition: GeolocationPosition = {
        coords: {
          latitude: 35.6762,
          longitude: 139.6503,
          accuracy: 15,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null
        },
        timestamp: Date.now()
      };

      mockGeolocation.getCurrentPosition.mockImplementation(
        (success: PositionCallback) => {
          setTimeout(() => success(mockPosition), 100);
        }
      );

      // Act
      const startTime = Date.now();
      const result = await gpsService.getCurrentPosition();
      const endTime = Date.now();

      // Assert
      expect(result).toBeInstanceOf(LocationModel);
      expect(result.latitude).toBe(35.6762);
      expect(result.longitude).toBe(139.6503);
      expect(result.accuracy).toBe(15);
      expect(result.type).toBe(LocationType.GPS);
      expect(endTime - startTime).toBeLessThan(5000); // 5秒以内
    });

    test('UT-201-001-02: デフォルトオプションが適用される', async () => {
      // Arrange
      const mockPosition: GeolocationPosition = {
        coords: {
          latitude: 35.6762,
          longitude: 139.6503,
          accuracy: 20,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null
        },
        timestamp: Date.now()
      };

      mockGeolocation.getCurrentPosition.mockImplementation(
        (success: PositionCallback, error: PositionErrorCallback, options: PositionOptions) => {
          // デフォルトオプションの確認
          expect(options?.timeout).toBe(5000);
          expect(options?.enableHighAccuracy).toBe(true);
          expect(options?.maximumAge).toBe(30000);
          setTimeout(() => success(mockPosition), 100);
        }
      );

      // Act & Assert
      await gpsService.getCurrentPosition();
      expect(mockGeolocation.getCurrentPosition).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function),
        expect.objectContaining({
          timeout: 5000,
          enableHighAccuracy: true,
          maximumAge: 30000
        })
      );
    });

    test('UT-201-001-03: カスタムオプションが適用される', async () => {
      // Arrange
      const customOptions: Partial<GPSOptions> = {
        timeout: 3000,
        retryCount: 1
      };

      const mockPosition: GeolocationPosition = {
        coords: {
          latitude: 35.6762,
          longitude: 139.6503,
          accuracy: 25,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null
        },
        timestamp: Date.now()
      };

      mockGeolocation.getCurrentPosition.mockImplementation(
        (success: PositionCallback, error: PositionErrorCallback, options: PositionOptions) => {
          expect(options?.timeout).toBe(3000);
          setTimeout(() => success(mockPosition), 100);
        }
      );

      // Act & Assert
      await gpsService.getCurrentPosition(customOptions);
    });
  });

  // ========================================
  // UT-201-002: 権限管理機能
  // ========================================

  describe('checkPermission', () => {
    test('UT-201-002-01: 権限が許可されている場合', async () => {
      // Arrange
      mockPermissions.query.mockResolvedValue({ state: 'granted' });

      // Act
      const result = await gpsService.checkPermission();

      // Assert
      expect(result).toBe(PermissionState.GRANTED);
    });

    test('UT-201-002-02: 権限が拒否されている場合', async () => {
      // Arrange
      mockPermissions.query.mockResolvedValue({ state: 'denied' });

      // Act
      const result = await gpsService.checkPermission();

      // Assert
      expect(result).toBe(PermissionState.DENIED);
    });

    test('UT-201-002-03: 権限が未確定の場合', async () => {
      // Arrange
      mockPermissions.query.mockResolvedValue({ state: 'prompt' });

      // Act
      const result = await gpsService.checkPermission();

      // Assert
      expect(result).toBe(PermissionState.PROMPT);
    });
  });

  describe('requestPermission', () => {
    test('UT-201-002-04: 権限要求が成功する', async () => {
      // Arrange
      const mockPosition: GeolocationPosition = {
        coords: {
          latitude: 35.6762,
          longitude: 139.6503,
          accuracy: 15,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null
        },
        timestamp: Date.now()
      };

      mockGeolocation.getCurrentPosition.mockImplementation(
        (success: PositionCallback) => success(mockPosition)
      );

      // Act
      const result = await gpsService.requestPermission();

      // Assert
      expect(result).toBe(PermissionState.GRANTED);
    });

    test('UT-201-002-05: 権限要求が拒否される', async () => {
      // Arrange
      const mockError: GeolocationPositionError = {
        code: 1, // PERMISSION_DENIED
        message: 'User denied geolocation prompt',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3
      };

      mockGeolocation.getCurrentPosition.mockImplementation(
        (success: PositionCallback, error: PositionErrorCallback) => error(mockError)
      );

      // Act
      const result = await gpsService.requestPermission();

      // Assert
      expect(result).toBe(PermissionState.DENIED);
    });
  });

  // ========================================
  // UT-201-003: タイムアウト処理機能
  // ========================================

  describe('タイムアウト処理', () => {
    test('UT-201-003-01: 設定時間内にGPS取得できない場合', async () => {
      // Arrange
      const mockError: GeolocationPositionError = {
        code: 3, // TIMEOUT
        message: 'Timeout expired',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3
      };

      mockGeolocation.getCurrentPosition.mockImplementation(
        (success: PositionCallback, error: PositionErrorCallback) => {
          setTimeout(() => error(mockError), 100);
        }
      );

      // Act & Assert
      await expect(gpsService.getCurrentPosition({ timeout: 5000 }))
        .rejects.toThrow(AppError);
      
      try {
        await gpsService.getCurrentPosition({ timeout: 5000 });
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).code).toBe(ErrorCode.GPS_TIMEOUT);
      }
    });

    test('UT-201-003-02: タイムアウト後のリトライ機能', async () => {
      // Arrange
      let callCount = 0;
      const mockError: GeolocationPositionError = {
        code: 3, // TIMEOUT
        message: 'Timeout expired',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3
      };

      const mockPosition: GeolocationPosition = {
        coords: {
          latitude: 35.6762,
          longitude: 139.6503,
          accuracy: 15,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null
        },
        timestamp: Date.now()
      };

      mockGeolocation.getCurrentPosition.mockImplementation(
        (success: PositionCallback, error: PositionErrorCallback) => {
          callCount++;
          if (callCount === 1) {
            setTimeout(() => error(mockError), 100);
          } else {
            setTimeout(() => success(mockPosition), 100);
          }
        }
      );

      // Act
      const result = await gpsService.getCurrentPosition({ retryCount: 2 });

      // Assert
      expect(result).toBeInstanceOf(LocationModel);
      expect(mockGeolocation.getCurrentPosition).toHaveBeenCalledTimes(2);
    });

    test('UT-201-003-03: 最大リトライ回数に達した場合', async () => {
      // Arrange
      const mockError: GeolocationPositionError = {
        code: 3, // TIMEOUT
        message: 'Timeout expired',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3
      };

      mockGeolocation.getCurrentPosition.mockImplementation(
        (success: PositionCallback, error: PositionErrorCallback) => {
          setTimeout(() => error(mockError), 100);
        }
      );

      // Act & Assert
      await expect(gpsService.getCurrentPosition({ retryCount: 2 }))
        .rejects.toThrow(AppError);
    });
  });

  // ========================================
  // UT-201-004: 精度チェック機能
  // ========================================

  describe('精度レベル判定', () => {
    test('UT-201-004-01: 高精度判定 (<20m)', () => {
      // Arrange
      const location = LocationModel.create({
        latitude: 35.6762,
        longitude: 139.6503,
        accuracy: 15,
        timestamp: new Date(),
        type: LocationType.GPS
      });

      // Act
      const result = gpsService.checkAccuracy(location);

      // Assert
      expect(result).toBe(AccuracyLevel.HIGH);
    });

    test('UT-201-004-02: 中精度判定 (20-50m)', () => {
      // Arrange
      const location = LocationModel.create({
        latitude: 35.6762,
        longitude: 139.6503,
        accuracy: 35,
        timestamp: new Date(),
        type: LocationType.GPS
      });

      // Act
      const result = gpsService.checkAccuracy(location);

      // Assert
      expect(result).toBe(AccuracyLevel.MEDIUM);
    });

    test('UT-201-004-03: 低精度判定 (>50m)', () => {
      // Arrange
      const location = LocationModel.create({
        latitude: 35.6762,
        longitude: 139.6503,
        accuracy: 75,
        timestamp: new Date(),
        type: LocationType.GPS
      });

      // Act
      const result = gpsService.checkAccuracy(location);

      // Assert
      expect(result).toBe(AccuracyLevel.LOW);
    });
  });

  // ========================================
  // UT-201-005: エラーハンドリング機能
  // ========================================

  describe('エラーハンドリング', () => {
    test('UT-201-005-01: GPS権限拒否エラー', async () => {
      // Arrange
      const mockError: GeolocationPositionError = {
        code: 1, // PERMISSION_DENIED
        message: 'User denied geolocation prompt',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3
      };

      mockGeolocation.getCurrentPosition.mockImplementation(
        (success: PositionCallback, error: PositionErrorCallback) => error(mockError)
      );

      // Act & Assert
      try {
        await gpsService.getCurrentPosition();
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).code).toBe(ErrorCode.GPS_PERMISSION_DENIED);
        expect((error as AppError).message).toContain('位置情報の利用が拒否されました');
      }
    });

    test('UT-201-005-02: GPS機能利用不可エラー', async () => {
      // Arrange
      const mockError: GeolocationPositionError = {
        code: 2, // POSITION_UNAVAILABLE
        message: 'Position unavailable',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3
      };

      mockGeolocation.getCurrentPosition.mockImplementation(
        (success: PositionCallback, error: PositionErrorCallback) => error(mockError)
      );

      // Act & Assert
      try {
        await gpsService.getCurrentPosition();
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).code).toBe(ErrorCode.GPS_UNAVAILABLE);
      }
    });

    test('UT-201-005-03: 低精度警告', async () => {
      // Arrange
      const mockPosition: GeolocationPosition = {
        coords: {
          latitude: 35.6762,
          longitude: 139.6503,
          accuracy: 100, // 低精度
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null
        },
        timestamp: Date.now()
      };

      mockGeolocation.getCurrentPosition.mockImplementation(
        (success: PositionCallback) => success(mockPosition)
      );

      // Act
      const result = await gpsService.getCurrentPosition();
      const accuracyLevel = gpsService.checkAccuracy(result);

      // Assert
      expect(accuracyLevel).toBe(AccuracyLevel.LOW);
      expect(result.accuracy).toBe(100);
    });
  });

  // ========================================
  // UT-201-006: 設定管理機能
  // ========================================

  describe('設定管理', () => {
    test('UT-201-006-01: オプション部分更新', () => {
      // Arrange
      const newOptions: Partial<GPSOptions> = { timeout: 8000 };
      
      // Act
      gpsService.updateOptions(newOptions);
      const currentOptions = gpsService.getOptions();

      // Assert
      expect(currentOptions.timeout).toBe(8000);
      expect(currentOptions.enableHighAccuracy).toBe(true); // デフォルト値保持
      expect(currentOptions.maximumAge).toBe(30000); // デフォルト値保持
      expect(currentOptions.retryCount).toBe(2); // デフォルト値保持
    });

    test('UT-201-006-02: オプション取得', () => {
      // Act
      const options = gpsService.getOptions();

      // Assert
      expect(options).toHaveProperty('timeout');
      expect(options).toHaveProperty('enableHighAccuracy');
      expect(options).toHaveProperty('maximumAge');
      expect(options).toHaveProperty('retryCount');
    });

    test('UT-201-006-03: 無効なオプション値の処理', () => {
      // Arrange
      const invalidOptions: Partial<GPSOptions> = { timeout: -1000 };
      
      // Act
      gpsService.updateOptions(invalidOptions);
      const currentOptions = gpsService.getOptions();

      // Assert
      expect(currentOptions.timeout).toBe(5000); // デフォルト値に補正
    });
  });

  // ========================================
  // 統合テスト (Integration Tests)
  // ========================================

  describe('LocationModelとの統合', () => {
    test('IT-201-001-01: GPS データが正しくLocationModelに変換される', async () => {
      // Arrange
      const mockPosition: GeolocationPosition = {
        coords: {
          latitude: 35.6762,
          longitude: 139.6503,
          accuracy: 15,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null
        },
        timestamp: Date.now()
      };

      mockGeolocation.getCurrentPosition.mockImplementation(
        (success: PositionCallback) => success(mockPosition)
      );

      // Act
      const result = await gpsService.getCurrentPosition();

      // Assert
      expect(result).toBeInstanceOf(LocationModel);
      expect(result.latitude).toBe(35.6762);
      expect(result.longitude).toBe(139.6503);
      expect(result.accuracy).toBe(15);
      expect(result.type).toBe(LocationType.GPS);
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.id).toBeDefined();
    });

    test('IT-201-001-02: LocationType.GPS が自動設定される', async () => {
      // Arrange
      const mockPosition: GeolocationPosition = {
        coords: {
          latitude: 35.6762,
          longitude: 139.6503,
          accuracy: 25,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null
        },
        timestamp: Date.now()
      };

      mockGeolocation.getCurrentPosition.mockImplementation(
        (success: PositionCallback) => success(mockPosition)
      );

      // Act
      const result = await gpsService.getCurrentPosition();

      // Assert
      expect(result.type).toBe(LocationType.GPS);
    });
  });

  // ========================================
  // 性能テスト (Performance Tests)
  // ========================================

  describe('性能テスト', () => {
    test('PT-201-001-01: GPS位置情報を5秒以内に取得', async () => {
      // Arrange
      const mockPosition: GeolocationPosition = {
        coords: {
          latitude: 35.6762,
          longitude: 139.6503,
          accuracy: 15,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null
        },
        timestamp: Date.now()
      };

      mockGeolocation.getCurrentPosition.mockImplementation(
        (success: PositionCallback) => {
          setTimeout(() => success(mockPosition), 4000); // 4秒で応答
        }
      );

      // Act
      const startTime = Date.now();
      const result = await gpsService.getCurrentPosition();
      const endTime = Date.now();

      // Assert
      expect(endTime - startTime).toBeLessThan(5000);
      expect(result).toBeInstanceOf(LocationModel);
    }, 6000); // テストタイムアウト6秒

    test('PT-201-001-02: 連続GPS取得の性能', async () => {
      // Arrange
      const mockPosition: GeolocationPosition = {
        coords: {
          latitude: 35.6762,
          longitude: 139.6503,
          accuracy: 15,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null
        },
        timestamp: Date.now()
      };

      mockGeolocation.getCurrentPosition.mockImplementation(
        (success: PositionCallback) => {
          setTimeout(() => success(mockPosition), 500);
        }
      );

      // Act
      const promises = Array.from({ length: 5 }, () => 
        gpsService.getCurrentPosition()
      );
      const startTime = Date.now();
      const results = await Promise.all(promises);
      const endTime = Date.now();

      // Assert
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result).toBeInstanceOf(LocationModel);
      });
      expect(endTime - startTime).toBeLessThan(10000); // 10秒以内で5回完了
    }, 12000);
  });
});