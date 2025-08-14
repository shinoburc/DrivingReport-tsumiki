import { StorageService } from '../StorageService';
import { DrivingLog, Location, DrivingLogStatus, LocationType, ErrorCode, AppError } from '../../types';

// Mock IndexedDB for testing
const mockIndexedDB = {
  open: jest.fn(),
  deleteDatabase: jest.fn(),
};

const mockIDBDatabase = {
  createObjectStore: jest.fn(),
  transaction: jest.fn(),
  close: jest.fn(),
};

const mockIDBTransaction = {
  objectStore: jest.fn(),
  oncomplete: null as any,
  onerror: null as any,
  onabort: null as any,
} as any;

const mockIDBObjectStore = {
  add: jest.fn(),
  get: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  getAll: jest.fn(),
  getAllKeys: jest.fn(),
  openCursor: jest.fn(),
  clear: jest.fn(),
  createIndex: jest.fn(),
  index: jest.fn(),
};

const mockIDBIndex = {
  getAll: jest.fn(),
};

// Global mocks
(global as any).indexedDB = mockIndexedDB;
(global as any).IDBDatabase = jest.fn(() => mockIDBDatabase);
(global as any).IDBTransaction = jest.fn(() => mockIDBTransaction);
(global as any).IDBObjectStore = jest.fn(() => mockIDBObjectStore);
(global as any).IDBIndex = jest.fn(() => mockIDBIndex);

// Mock data
const mockLocation: Location = {
  id: 'loc-001',
  name: 'テスト地点',
  address: '東京都千代田区',
  latitude: 35.6762,
  longitude: 139.6503,
  accuracy: 10,
  timestamp: new Date('2024-01-15T09:00:00Z'),
  type: LocationType.START
};

const mockDrivingLogData: Omit<DrivingLog, 'id' | 'createdAt' | 'updatedAt'> = {
  date: new Date('2024-01-15'),
  driverName: 'テストドライバー',
  vehicleNumber: '品川001',
  startLocation: mockLocation,
  waypoints: [],
  status: DrivingLogStatus.IN_PROGRESS
};

describe('StorageService', () => {
  let storage: StorageService;

  beforeEach(() => {
    jest.clearAllMocks();
    storage = new StorageService();
  });

  afterEach(async () => {
    // テスト環境では clear() をスキップ（fake-indexeddb制限のため）
    if (storage.isInitialized) {
      try {
        await storage.clear();
      } catch (error) {
        // テスト環境でのclearエラーは無視
        console.warn('Clear operation failed in test environment:', error);
      }
    }
  });

  describe('初期化テスト', () => {
    test('UC-001: StorageService正常初期化', async () => {
      // このテストは実装前なので失敗する（RED）
      const mockRequest = {
        onsuccess: null as any,
        onerror: null as any,
        result: mockIDBDatabase
      } as any;
      
      mockIndexedDB.open.mockReturnValue(mockRequest);
      
      // 初期化を試行
      const initPromise = storage.initialize();
      
      // onsuccess イベントをシミュレート
      mockRequest.onsuccess({ target: { result: mockIDBDatabase } } as any);
      
      await expect(initPromise).resolves.toBeUndefined();
      expect(storage.isInitialized).toBe(true);
    });

    test('UC-002: 重複初期化防止', async () => {
      const mockRequest = {
        onsuccess: null as any,
        onerror: null as any,
        result: mockIDBDatabase
      } as any;
      
      mockIndexedDB.open.mockReturnValue(mockRequest);
      
      await storage.initialize();
      mockRequest.onsuccess({ target: { result: mockIDBDatabase } } as any);
      
      const firstInit = storage.isInitialized;
      
      await storage.initialize(); // 2回目の初期化
      expect(storage.isInitialized).toBe(firstInit);
    });
  });

  describe('運転日報CRUD操作テスト', () => {
    beforeEach(async () => {
      // 各テスト前に初期化
      const mockRequest = {
        onsuccess: null as any,
        onerror: null as any,
        result: mockIDBDatabase
      } as any;
      
      mockIndexedDB.open.mockReturnValue(mockRequest);
      const initPromise = storage.initialize();
      mockRequest.onsuccess({ target: { result: mockIDBDatabase } } as any);
      await initPromise;
    });

    test('UC-003: 運転日報作成', async () => {
      // Mock transaction setup
      const mockTransaction = { ...mockIDBTransaction };
      const mockStore = { ...mockIDBObjectStore };
      
      mockIDBDatabase.transaction.mockReturnValue(mockTransaction);
      mockTransaction.objectStore.mockReturnValue(mockStore);
      
      const mockAddRequest = {
        onsuccess: null as any,
        onerror: null as any,
        result: 'generated-id'
      };
      
      mockStore.add.mockReturnValue(mockAddRequest);
      
      // テスト実行
      const resultPromise = storage.createDrivingLog(mockDrivingLogData);
      
      // Transaction complete event
      if (mockTransaction.oncomplete) {
        mockTransaction.oncomplete({} as any);
      }
      
      // Add request success
      mockAddRequest.onsuccess({ target: { result: 'generated-id' } } as any);
      
      const result = await resultPromise;
      
      expect(result).toMatchObject({
        id: expect.any(String),
        date: mockDrivingLogData.date,
        startLocation: mockDrivingLogData.startLocation,
        status: mockDrivingLogData.status,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date)
      });
    });

    test('UC-004: 運転日報取得', async () => {
      // まず作成
      const created = await storage.createDrivingLog(mockDrivingLogData);
      
      // Mock get operation
      const mockTransaction = { ...mockIDBTransaction };
      const mockStore = { ...mockIDBObjectStore };
      
      mockIDBDatabase.transaction.mockReturnValue(mockTransaction);
      mockTransaction.objectStore.mockReturnValue(mockStore);
      
      const mockGetRequest = {
        onsuccess: null as any,
        onerror: null as any,
        result: created
      };
      
      mockStore.get.mockReturnValue(mockGetRequest);
      
      // テスト実行
      const resultPromise = storage.getDrivingLog(created.id);
      
      // Get request success
      mockGetRequest.onsuccess({ target: { result: created } } as any);
      
      const retrieved = await resultPromise;
      expect(retrieved).toEqual(created);
    });

    test('UC-005: 運転日報更新', async () => {
      const created = await storage.createDrivingLog(mockDrivingLogData);
      const updates = { 
        status: DrivingLogStatus.COMPLETED,
        endLocation: mockLocation 
      };
      
      // Mock update operation
      const mockTransaction = { ...mockIDBTransaction };
      const mockStore = { ...mockIDBObjectStore };
      
      mockIDBDatabase.transaction.mockReturnValue(mockTransaction);
      mockTransaction.objectStore.mockReturnValue(mockStore);
      
      const mockPutRequest = {
        onsuccess: null as any,
        onerror: null as any,
        result: created.id
      };
      
      mockStore.put.mockReturnValue(mockPutRequest);
      
      const resultPromise = storage.updateDrivingLog(created.id, updates);
      
      // Put request success
      mockPutRequest.onsuccess({ target: { result: created.id } } as any);
      
      const updated = await resultPromise;
      
      expect(updated.status).toBe(DrivingLogStatus.COMPLETED);
      expect(updated.endLocation).toEqual(mockLocation);
      expect(updated.updatedAt).not.toEqual(created.updatedAt);
    });

    test('UC-006: 運転日報削除', async () => {
      const created = await storage.createDrivingLog(mockDrivingLogData);
      
      // Mock delete operation
      const mockTransaction = { ...mockIDBTransaction };
      const mockStore = { ...mockIDBObjectStore };
      
      mockIDBDatabase.transaction.mockReturnValue(mockTransaction);
      mockTransaction.objectStore.mockReturnValue(mockStore);
      
      const mockDeleteRequest = {
        onsuccess: null as any,
        onerror: null as any,
        result: undefined
      };
      
      mockStore.delete.mockReturnValue(mockDeleteRequest);
      
      const deletePromise = storage.deleteDrivingLog(created.id);
      
      // Delete request success
      mockDeleteRequest.onsuccess({ target: { result: undefined } } as any);
      
      await expect(deletePromise).resolves.toBeUndefined();
      
      // 削除後の取得テスト
      const mockGetRequest = {
        onsuccess: null as any,
        onerror: null as any,
        result: undefined
      };
      
      mockStore.get.mockReturnValue(mockGetRequest);
      
      const getPromise = storage.getDrivingLog(created.id);
      mockGetRequest.onsuccess({ target: { result: undefined } } as any);
      
      const retrieved = await getPromise;
      expect(retrieved).toBeNull();
    });
  });

  describe('位置情報CRUD操作テスト', () => {
    beforeEach(async () => {
      const mockRequest = {
        onsuccess: null as any,
        onerror: null as any,
        result: mockIDBDatabase
      } as any;
      
      mockIndexedDB.open.mockReturnValue(mockRequest);
      const initPromise = storage.initialize();
      mockRequest.onsuccess({ target: { result: mockIDBDatabase } } as any);
      await initPromise;
    });

    test('UC-007: 位置情報作成', async () => {
      const locationData = {
        latitude: 35.6762,
        longitude: 139.6503,
        timestamp: new Date(),
        type: LocationType.START,
        name: '東京駅'
      };
      
      // Mock transaction setup
      const mockTransaction = { ...mockIDBTransaction };
      const mockStore = { ...mockIDBObjectStore };
      
      mockIDBDatabase.transaction.mockReturnValue(mockTransaction);
      mockTransaction.objectStore.mockReturnValue(mockStore);
      
      const mockAddRequest = {
        onsuccess: null as any,
        onerror: null as any,
        result: 'location-id'
      };
      
      mockStore.add.mockReturnValue(mockAddRequest);
      
      const resultPromise = storage.createLocation(locationData);
      
      // Add request success
      mockAddRequest.onsuccess({ target: { result: 'location-id' } } as any);
      
      const result = await resultPromise;
      
      expect(result).toMatchObject({
        id: expect.any(String),
        ...locationData
      });
    });
  });

  describe('エラーハンドリングテスト', () => {
    test('EH-001: ストレージ容量不足', async () => {
      const mockRequest = {
        onsuccess: null as any,
        onerror: null as any,
        result: mockIDBDatabase
      } as any;
      
      mockIndexedDB.open.mockReturnValue(mockRequest);
      const initPromise = storage.initialize();
      mockRequest.onsuccess({ target: { result: mockIDBDatabase } } as any);
      await initPromise;
      
      // Mock quota exceeded error
      const mockTransaction = { ...mockIDBTransaction };
      const mockStore = { ...mockIDBObjectStore };
      
      mockIDBDatabase.transaction.mockReturnValue(mockTransaction);
      mockTransaction.objectStore.mockReturnValue(mockStore);
      
      const mockAddRequest = {
        onsuccess: null as any,
        onerror: null as any,
        error: new DOMException('QuotaExceededError')
      };
      
      mockStore.add.mockReturnValue(mockAddRequest);
      
      const resultPromise = storage.createDrivingLog(mockDrivingLogData);
      
      // Simulate error
      mockAddRequest.onerror({ target: { error: new DOMException('QuotaExceededError') } } as any);
      
      const error = await resultPromise.catch(e => e);
      expect(error).toBeInstanceOf(AppError);
      expect(error.code).toBe(ErrorCode.STORAGE_QUOTA_EXCEEDED);
    });

    test('EH-002: IndexedDB接続エラー', async () => {
      // IndexedDBをundefinedにしてテスト
      const originalIndexedDB = (global as any).indexedDB;
      (global as any).indexedDB = undefined;
      
      const storage = new StorageService();
      await expect(storage.initialize())
        .rejects.toThrow(AppError);
      
      (global as any).indexedDB = originalIndexedDB;
    });

    test('EH-004: 存在しないレコードの操作', async () => {
      const mockRequest = {
        onsuccess: null as any,
        onerror: null as any,
        result: mockIDBDatabase
      } as any;
      
      mockIndexedDB.open.mockReturnValue(mockRequest);
      const initPromise = storage.initialize();
      mockRequest.onsuccess({ target: { result: mockIDBDatabase } } as any);
      await initPromise;
      
      const nonExistentId = 'non-existent-id';
      
      // Mock get operation for non-existent record
      const mockTransaction = { ...mockIDBTransaction };
      const mockStore = { ...mockIDBObjectStore };
      
      mockIDBDatabase.transaction.mockReturnValue(mockTransaction);
      mockTransaction.objectStore.mockReturnValue(mockStore);
      
      const mockGetRequest = {
        onsuccess: null as any,
        onerror: null as any,
        result: undefined
      };
      
      mockStore.get.mockReturnValue(mockGetRequest);
      
      const getPromise = storage.getDrivingLog(nonExistentId);
      mockGetRequest.onsuccess({ target: { result: undefined } } as any);
      
      const result = await getPromise;
      expect(result).toBeNull();
      
      // Update non-existent record should fail
      await expect(storage.updateDrivingLog(nonExistentId, {}))
        .rejects.toThrow(AppError);
        
      // Delete non-existent record should fail  
      await expect(storage.deleteDrivingLog(nonExistentId))
        .rejects.toThrow(AppError);
    });
  });

  describe('性能テスト', () => {
    beforeEach(async () => {
      const mockRequest = {
        onsuccess: null as any,
        onerror: null as any,
        result: mockIDBDatabase
      } as any;
      
      mockIndexedDB.open.mockReturnValue(mockRequest);
      const initPromise = storage.initialize();
      mockRequest.onsuccess({ target: { result: mockIDBDatabase } } as any);
      await initPromise;
    });

    test('PT-001: 大量データ処理テスト', async () => {
      const startTime = Date.now();
      
      // Mock bulk operations
      const mockTransaction = { ...mockIDBTransaction };
      const mockStore = { ...mockIDBObjectStore };
      
      mockIDBDatabase.transaction.mockReturnValue(mockTransaction);
      mockTransaction.objectStore.mockReturnValue(mockStore);
      
      // 1000件のデータ作成をモック
      const promises = Array.from({ length: 1000 }, (_, i) => {
        const mockAddRequest = {
          onsuccess: null as any,
          onerror: null as any,
          result: `id-${i}`
        };
        
        mockStore.add.mockReturnValue(mockAddRequest);
        
        const promise = storage.createDrivingLog({
          ...mockDrivingLogData,
          date: new Date(2024, 0, i + 1)
        });
        
        // Immediately resolve the mock
        setTimeout(() => {
          mockAddRequest.onsuccess({ target: { result: `id-${i}` } } as any);
        }, 0);
        
        return promise;
      });
      
      const results = await Promise.all(promises);
      const endTime = Date.now();
      
      expect(results).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(10000); // 10秒以内
    }, 15000); // テストタイムアウト15秒
  });
});