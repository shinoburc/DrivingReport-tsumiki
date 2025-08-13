# TASK-101: ストレージサービス実装 - テストケース

## 概要

ストレージサービス（StorageService）の品質を保証するための包括的なテストケース定義。
TDDアプローチに基づき、要件定義から導出されたテストケースを実装前に明確化する。

## テストカテゴリ

### 1. 単体テスト（Unit Tests）
### 2. 統合テスト（Integration Tests）  
### 3. エラーハンドリングテスト（Error Handling Tests）
### 4. 性能テスト（Performance Tests）
### 5. エッジケーステスト（Edge Case Tests）

---

## 1. 単体テスト（Unit Tests）

### 1.1 初期化テスト

#### UC-001: StorageService正常初期化
```typescript
describe('StorageService initialization', () => {
  test('should initialize with default database configuration', async () => {
    const storage = new StorageService();
    await expect(storage.initialize()).resolves.toBeUndefined();
    expect(storage.isInitialized).toBe(true);
  });
});
```

**期待値**: 
- IndexedDB "DrivingLogDB" が作成される
- 必要なオブジェクトストア（drivingLogs, locations, settings）が作成される
- インデックスが正しく設定される

#### UC-002: 重複初期化防止
```typescript
test('should not reinitialize if already initialized', async () => {
  const storage = new StorageService();
  await storage.initialize();
  const firstInit = storage.isInitialized;
  await storage.initialize(); // 2回目の初期化
  expect(storage.isInitialized).toBe(firstInit);
});
```

### 1.2 運転日報CRUD操作テスト

#### UC-003: 運転日報作成
```typescript
test('should create driving log successfully', async () => {
  const logData = {
    date: new Date('2024-01-15'),
    startLocation: mockLocation,
    waypoints: [],
    status: DrivingLogStatus.IN_PROGRESS
  };
  
  const result = await storage.createDrivingLog(logData);
  
  expect(result).toMatchObject({
    id: expect.any(String),
    date: logData.date,
    startLocation: logData.startLocation,
    status: logData.status,
    createdAt: expect.any(Date),
    updatedAt: expect.any(Date)
  });
});
```

#### UC-004: 運転日報取得
```typescript
test('should retrieve driving log by ID', async () => {
  const created = await storage.createDrivingLog(mockDrivingLogData);
  const retrieved = await storage.getDrivingLog(created.id);
  
  expect(retrieved).toEqual(created);
});
```

#### UC-005: 運転日報更新
```typescript
test('should update driving log successfully', async () => {
  const created = await storage.createDrivingLog(mockDrivingLogData);
  const updates = { 
    status: DrivingLogStatus.COMPLETED,
    endLocation: mockEndLocation 
  };
  
  const updated = await storage.updateDrivingLog(created.id, updates);
  
  expect(updated.status).toBe(DrivingLogStatus.COMPLETED);
  expect(updated.endLocation).toEqual(mockEndLocation);
  expect(updated.updatedAt).not.toEqual(created.updatedAt);
});
```

#### UC-006: 運転日報削除
```typescript
test('should delete driving log successfully', async () => {
  const created = await storage.createDrivingLog(mockDrivingLogData);
  
  await expect(storage.deleteDrivingLog(created.id)).resolves.toBeUndefined();
  
  const retrieved = await storage.getDrivingLog(created.id);
  expect(retrieved).toBeNull();
});
```

### 1.3 位置情報CRUD操作テスト

#### UC-007: 位置情報作成
```typescript
test('should create location successfully', async () => {
  const locationData = {
    latitude: 35.6762,
    longitude: 139.6503,
    timestamp: new Date(),
    type: LocationType.START,
    name: '東京駅'
  };
  
  const result = await storage.createLocation(locationData);
  
  expect(result).toMatchObject({
    id: expect.any(String),
    ...locationData
  });
});
```

#### UC-008: 位置情報クエリ
```typescript
test('should query locations with filters', async () => {
  await createMultipleLocations(); // ヘルパー関数
  
  const results = await storage.queryLocations({
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-01-31'),
    type: LocationType.START
  });
  
  expect(results).toHaveLength(expect.any(Number));
  results.forEach(loc => {
    expect(loc.type).toBe(LocationType.START);
  });
});
```

### 1.4 設定管理テスト

#### UC-009: 設定取得・更新
```typescript
test('should get and update settings', async () => {
  const settings = await storage.getSettings();
  expect(settings).toBeDefined();
  
  const updates = { gpsTimeout: 15, theme: 'dark' as const };
  const updated = await storage.updateSettings(updates);
  
  expect(updated.gpsTimeout).toBe(15);
  expect(updated.theme).toBe('dark');
});
```

---

## 2. 統合テスト（Integration Tests）

### IT-001: データ永続化テスト
```typescript
test('should persist data across service instances', async () => {
  const storage1 = new StorageService();
  await storage1.initialize();
  
  const created = await storage1.createDrivingLog(mockDrivingLogData);
  
  const storage2 = new StorageService();
  await storage2.initialize();
  
  const retrieved = await storage2.getDrivingLog(created.id);
  expect(retrieved).toEqual(created);
});
```

### IT-002: 複雑なクエリ統合テスト
```typescript
test('should handle complex queries with multiple conditions', async () => {
  await createTestDataSet(); // 大量のテストデータ作成
  
  const results = await storage.queryDrivingLogs({
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-06-30'),
    status: DrivingLogStatus.COMPLETED,
    limit: 10,
    orderBy: 'date',
    order: 'desc'
  });
  
  expect(results).toHaveLength(10);
  expect(results[0].date >= results[1].date).toBe(true); // 降順確認
});
```

### IT-003: データ整合性テスト
```typescript
test('should maintain referential integrity', async () => {
  const location = await storage.createLocation(mockLocationData);
  const drivingLog = await storage.createDrivingLog({
    ...mockDrivingLogData,
    startLocation: location
  });
  
  // 位置情報削除を試行（参照されている場合は削除できない想定）
  await expect(storage.deleteLocation(location.id))
    .rejects.toThrow('Location is referenced by driving logs');
});
```

---

## 3. エラーハンドリングテスト（Error Handling Tests）

### EH-001: ストレージ容量不足
```typescript
test('should handle storage quota exceeded error', async () => {
  // モックでクォータ不足をシミュレート
  jest.spyOn(IDBObjectStore.prototype, 'add')
    .mockRejectedValue(new DOMException('QuotaExceededError'));
  
  await expect(storage.createDrivingLog(mockDrivingLogData))
    .rejects.toThrow(AppError);
  
  const error = await storage.createDrivingLog(mockDrivingLogData)
    .catch(e => e);
  expect(error.code).toBe(ErrorCode.STORAGE_QUOTA_EXCEEDED);
});
```

### EH-002: IndexedDB接続エラー
```typescript
test('should handle IndexedDB unavailable error', async () => {
  // IndexedDBをundefinedにしてテスト
  const originalIndexedDB = global.indexedDB;
  global.indexedDB = undefined;
  
  const storage = new StorageService();
  await expect(storage.initialize())
    .rejects.toThrow(AppError);
  
  global.indexedDB = originalIndexedDB;
});
```

### EH-003: データ形式エラー
```typescript
test('should validate data format before save', async () => {
  const invalidData = {
    // 必須フィールド欠落
    // date: new Date(), 
    startLocation: mockLocation
  };
  
  await expect(storage.createDrivingLog(invalidData as any))
    .rejects.toThrow(AppError);
});
```

### EH-004: 存在しないレコードの操作
```typescript
test('should handle operations on non-existent records', async () => {
  const nonExistentId = 'non-existent-id';
  
  const result = await storage.getDrivingLog(nonExistentId);
  expect(result).toBeNull();
  
  await expect(storage.updateDrivingLog(nonExistentId, {}))
    .rejects.toThrow(AppError);
  
  await expect(storage.deleteDrivingLog(nonExistentId))
    .rejects.toThrow(AppError);
});
```

---

## 4. 性能テスト（Performance Tests）

### PT-001: 大量データ処理テスト
```typescript
test('should handle 1000 records within 10 seconds', async () => {
  const startTime = Date.now();
  
  // 1000件のデータ作成
  const promises = Array.from({ length: 1000 }, (_, i) => 
    storage.createDrivingLog({
      ...mockDrivingLogData,
      date: new Date(2024, 0, i + 1)
    })
  );
  
  const results = await Promise.all(promises);
  const endTime = Date.now();
  
  expect(results).toHaveLength(1000);
  expect(endTime - startTime).toBeLessThan(10000); // 10秒以内
}, 15000); // テストタイムアウト15秒
```

### PT-002: クエリ性能テスト
```typescript
test('should query large dataset efficiently', async () => {
  await createLargeDataset(5000); // 5000件のテストデータ
  
  const startTime = Date.now();
  const results = await storage.queryDrivingLogs({
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-12-31'),
    limit: 100
  });
  const endTime = Date.now();
  
  expect(results).toHaveLength(100);
  expect(endTime - startTime).toBeLessThan(1000); // 1秒以内
});
```

---

## 5. エッジケーステスト（Edge Case Tests）

### EC-001: 並行アクセステスト
```typescript
test('should handle concurrent operations safely', async () => {
  const promises = Array.from({ length: 10 }, () => 
    storage.createDrivingLog(mockDrivingLogData)
  );
  
  const results = await Promise.all(promises);
  const uniqueIds = new Set(results.map(r => r.id));
  
  expect(uniqueIds.size).toBe(10); // 全て異なるIDが生成される
});
```

### EC-002: データ境界値テスト
```typescript
test('should handle boundary values correctly', async () => {
  const edgeCases = [
    { latitude: -90, longitude: -180 },   // 最小値
    { latitude: 90, longitude: 180 },     // 最大値
    { latitude: 0, longitude: 0 },        // ゼロ値
  ];
  
  for (const coords of edgeCases) {
    const location = await storage.createLocation({
      ...coords,
      timestamp: new Date(),
      type: LocationType.START
    });
    
    expect(location.latitude).toBe(coords.latitude);
    expect(location.longitude).toBe(coords.longitude);
  }
});
```

### EC-003: 特殊文字・多言語テスト
```typescript
test('should handle special characters and multilingual data', async () => {
  const specialData = {
    ...mockDrivingLogData,
    driverName: '山田太郎🚗',
    startLocation: {
      ...mockLocation,
      name: 'Café "Special" & Restaurant <Test>',
      address: '東京都千代田区日本橋１丁目１－１'
    }
  };
  
  const result = await storage.createDrivingLog(specialData);
  expect(result.driverName).toBe(specialData.driverName);
  expect(result.startLocation.name).toBe(specialData.startLocation.name);
});
```

---

## テストデータとモック

### モックデータ定義
```typescript
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
```

### テストヘルパー関数
```typescript
// 大量データ作成ヘルパー
async function createLargeDataset(count: number): Promise<DrivingLog[]> {
  const promises = Array.from({ length: count }, (_, i) =>
    storage.createDrivingLog({
      ...mockDrivingLogData,
      date: new Date(2024, 0, (i % 365) + 1)
    })
  );
  return Promise.all(promises);
}

// データベースクリーンアップ
async function cleanupDatabase(): Promise<void> {
  await storage.clear();
}
```

## テスト実行計画

### フェーズ1: 基本機能テスト
- 単体テスト (UC-001 ~ UC-009)
- 基本的なエラーハンドリング (EH-001 ~ EH-004)

### フェーズ2: 統合・性能テスト  
- 統合テスト (IT-001 ~ IT-003)
- 性能テスト (PT-001 ~ PT-002)

### フェーズ3: エッジケース・堅牢性テスト
- エッジケーステスト (EC-001 ~ EC-003)
- ストレステスト（大量データ、長時間運用）

## 品質指標

### カバレッジ目標
- **行カバレッジ**: 95%以上
- **ブランチカバレッジ**: 90%以上
- **関数カバレッジ**: 100%

### 合格基準
- 全テストケースが成功すること
- 性能要件（NFR-302: 99.9%成功率）を満たすこと
- メモリリークが発生しないこと

## 次のステップ

テストケースの洗い出しが完了しました。次は `/tdd-red` でテスト実装（失敗）フェーズに進みます。
- まず失敗するテストを実装
- テストランナーでRed状態を確認
- その後に最小限の実装でGreen状態を目指す