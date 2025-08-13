# TASK-102: データモデル実装 - テストケース設計

## 概要

データモデル層の包括的なテストケース設計。TDDアプローチに基づき、全ての要件を網羅するテストケースを定義します。

## テストカテゴリ

### 1. 単体テスト（Unit Tests）
### 2. 統合テスト（Integration Tests）  
### 3. バリデーションテスト（Validation Tests）
### 4. パフォーマンステスト（Performance Tests）
### 5. エラーハンドリングテスト（Error Handling Tests）

---

## 1. 単体テスト（Unit Tests）

### 1.1 BaseModel テスト

#### UC-001: BaseModelの基本機能
```typescript
describe('BaseModel', () => {
  test('should create instance with default properties', () => {
    // BaseModelから派生したクラスのインスタンス作成
    expect(instance).toBeDefined();
    expect(instance.validate).toBeInstanceOf(Function);
    expect(instance.toJSON).toBeInstanceOf(Function);
  });

  test('should implement immutability pattern', () => {
    const original = createTestInstance();
    const attempt = () => { original.someProperty = 'modified'; };
    expect(attempt).toThrow();
  });
});
```

### 1.2 DrivingLogModel テスト

#### UC-002: DrivingLog基本CRUD
```typescript
describe('DrivingLogModel', () => {
  const mockStartLocation: Location = {
    id: 'loc-start',
    latitude: 35.6762,
    longitude: 139.6503,
    timestamp: new Date('2024-01-15T08:00:00Z'),
    type: LocationType.START
  };

  test('should create DrivingLog with minimal required data', () => {
    const data = {
      date: new Date('2024-01-15'),
      startLocation: mockStartLocation,
      waypoints: [],
      status: DrivingLogStatus.IN_PROGRESS
    };

    const drivingLog = DrivingLogModel.create(data);

    expect(drivingLog.id).toBeDefined();
    expect(drivingLog.date).toEqual(data.date);
    expect(drivingLog.startLocation).toEqual(mockStartLocation);
    expect(drivingLog.status).toBe(DrivingLogStatus.IN_PROGRESS);
    expect(drivingLog.createdAt).toBeInstanceOf(Date);
    expect(drivingLog.updatedAt).toBeInstanceOf(Date);
  });

  test('should create DrivingLog with full data', () => {
    const endLocation: Location = {
      id: 'loc-end',
      latitude: 35.6895,
      longitude: 139.6917,
      timestamp: new Date('2024-01-15T17:00:00Z'),
      type: LocationType.END
    };

    const data = {
      date: new Date('2024-01-15'),
      driverName: '山田太郎',
      vehicleNumber: '品川500 あ 12-34',
      startLocation: mockStartLocation,
      waypoints: [],
      endLocation,
      status: DrivingLogStatus.COMPLETED
    };

    const drivingLog = DrivingLogModel.create(data);

    expect(drivingLog.driverName).toBe('山田太郎');
    expect(drivingLog.vehicleNumber).toBe('品川500 あ 12-34');
    expect(drivingLog.endLocation).toEqual(endLocation);
  });
});
```

#### UC-003: DrivingLog更新機能
```typescript
test('should update DrivingLog properties', () => {
  const originalLog = DrivingLogModel.create(minimalData);
  
  const updates = {
    driverName: '佐藤花子',
    status: DrivingLogStatus.COMPLETED
  };

  const updatedLog = originalLog.update(updates);

  expect(updatedLog.driverName).toBe('佐藤花子');
  expect(updatedLog.status).toBe(DrivingLogStatus.COMPLETED);
  expect(updatedLog.updatedAt).not.toEqual(originalLog.updatedAt);
  // 元のオブジェクトは変更されない（Immutability）
  expect(originalLog.driverName).toBeUndefined();
});
```

#### UC-004: DrivingLog計算機能
```typescript
test('should calculate total distance automatically', () => {
  const waypoint1: Location = {
    id: 'loc-way1',
    latitude: 35.6586,
    longitude: 139.7454,
    timestamp: new Date('2024-01-15T10:00:00Z'),
    type: LocationType.WAYPOINT
  };

  const endLocation: Location = {
    id: 'loc-end',
    latitude: 35.6895,
    longitude: 139.6917,
    timestamp: new Date('2024-01-15T17:00:00Z'),
    type: LocationType.END
  };

  const data = {
    ...minimalData,
    waypoints: [waypoint1],
    endLocation
  };

  const drivingLog = DrivingLogModel.create(data);
  const calculatedDistance = drivingLog.calculateTotalDistance();

  expect(calculatedDistance).toBeGreaterThan(0);
  expect(calculatedDistance).toBeLessThan(100); // 東京都内想定
  expect(typeof calculatedDistance).toBe('number');
});
```

### 1.3 LocationModel テスト

#### UC-005: Location基本作成
```typescript
describe('LocationModel', () => {
  test('should create Location with GPS data', () => {
    const locationData = {
      latitude: 35.6762,
      longitude: 139.6503,
      accuracy: 10,
      timestamp: new Date(),
      type: LocationType.START
    };

    const location = LocationModel.create(locationData);

    expect(location.id).toBeDefined();
    expect(location.latitude).toBe(35.6762);
    expect(location.longitude).toBe(139.6503);
    expect(location.accuracy).toBe(10);
    expect(location.type).toBe(LocationType.START);
  });

  test('should create Location with address geocoding', async () => {
    const locationData = {
      name: '東京駅',
      address: '東京都千代田区丸の内1丁目',
      timestamp: new Date(),
      type: LocationType.WAYPOINT
    };

    const location = LocationModel.create(locationData);
    // 住所のジオコーディングは将来実装
    expect(location.name).toBe('東京駅');
    expect(location.address).toBe('東京都千代田区丸の内1丁目');
  });
});
```

#### UC-006: Location距離計算
```typescript
test('should calculate distance between two locations', () => {
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
});
```

### 1.4 SettingsModel テスト

#### UC-007: Settings基本管理
```typescript
describe('SettingsModel', () => {
  test('should create Settings with default values', () => {
    const settings = SettingsModel.createDefault();

    expect(settings.language).toBe('ja');
    expect(settings.gpsTimeout).toBe(10);
    expect(settings.autoExportEnabled).toBe(false);
    expect(settings.exportFormat).toBe(ExportFormat.CSV);
    expect(settings.theme).toBe('auto');
    expect(settings.favoriteLocations).toEqual([]);
  });

  test('should update Settings partially', () => {
    const originalSettings = SettingsModel.createDefault();
    
    const updates = {
      language: 'en' as const,
      gpsTimeout: 15,
      theme: 'dark' as const
    };

    const updatedSettings = originalSettings.update(updates);

    expect(updatedSettings.language).toBe('en');
    expect(updatedSettings.gpsTimeout).toBe(15);
    expect(updatedSettings.theme).toBe('dark');
    // 他の設定は保持される
    expect(updatedSettings.autoExportEnabled).toBe(false);
    expect(updatedSettings.exportFormat).toBe(ExportFormat.CSV);
  });
});
```

#### UC-008: FavoriteLocation管理
```typescript
test('should manage favorite locations', () => {
  const settings = SettingsModel.createDefault();
  
  const favoriteLocation: FavoriteLocation = {
    id: 'fav-001',
    name: '本社',
    address: '東京都千代田区',
    latitude: 35.6762,
    longitude: 139.6503
  };

  const updatedSettings = settings.addFavoriteLocation(favoriteLocation);

  expect(updatedSettings.favoriteLocations).toHaveLength(1);
  expect(updatedSettings.favoriteLocations[0]).toEqual(favoriteLocation);

  const removedSettings = updatedSettings.removeFavoriteLocation('fav-001');
  expect(removedSettings.favoriteLocations).toHaveLength(0);
});
```

### 1.5 ModelFactory テスト

#### UC-009: Factory基本機能
```typescript
describe('ModelFactory', () => {
  test('should generate unique IDs', () => {
    const ids = Array.from({ length: 1000 }, () => ModelFactory.generateId());
    const uniqueIds = new Set(ids);

    expect(uniqueIds.size).toBe(1000); // 全てユニーク
    ids.forEach(id => {
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(10);
    });
  });

  test('should create DrivingLog with factory', () => {
    const startLocation = ModelFactory.createLocation({
      latitude: 35.6762,
      longitude: 139.6503,
      type: LocationType.START,
      timestamp: new Date()
    });

    const drivingLog = ModelFactory.createDrivingLog({
      date: new Date(),
      startLocation,
      waypoints: []
    });

    expect(drivingLog.id).toBeDefined();
    expect(drivingLog.status).toBe(DrivingLogStatus.IN_PROGRESS); // デフォルト値
    expect(drivingLog.createdAt).toBeInstanceOf(Date);
  });

  test('should clone existing models', () => {
    const original = ModelFactory.createDrivingLog({
      date: new Date(),
      startLocation: mockStartLocation,
      waypoints: []
    });

    const cloned = ModelFactory.cloneDrivingLog(original);

    expect(cloned.id).not.toBe(original.id); // 新しいID
    expect(cloned.date).toEqual(original.date);
    expect(cloned.startLocation).toEqual(original.startLocation);
    expect(cloned.createdAt).toEqual(original.createdAt);
  });
});
```

---

## 2. 統合テスト（Integration Tests）

### IT-001: StorageService連携
```typescript
describe('Models and StorageService Integration', () => {
  let storageService: StorageService;

  beforeEach(async () => {
    storageService = new StorageService();
    await storageService.initialize();
  });

  test('should save and retrieve DrivingLogModel', async () => {
    const drivingLog = ModelFactory.createDrivingLog({
      date: new Date(),
      startLocation: mockStartLocation,
      waypoints: []
    });

    // StorageServiceに保存
    const saved = await storageService.createDrivingLog(drivingLog.toStorageFormat());
    
    // StorageServiceから取得
    const retrieved = await storageService.getDrivingLog(saved.id);
    
    // Modelに変換
    const retrievedModel = DrivingLogModel.fromStorageFormat(retrieved!);

    expect(retrievedModel.id).toBe(drivingLog.id);
    expect(retrievedModel.date).toEqual(drivingLog.date);
    expect(retrievedModel.status).toBe(drivingLog.status);
  });

  test('should maintain data integrity across save/load cycles', async () => {
    const locations = Array.from({ length: 10 }, (_, i) => 
      ModelFactory.createLocation({
        latitude: 35.6762 + i * 0.001,
        longitude: 139.6503 + i * 0.001,
        type: i === 0 ? LocationType.START : 
              i === 9 ? LocationType.END : LocationType.WAYPOINT,
        timestamp: new Date(Date.now() + i * 60000)
      })
    );

    const drivingLog = ModelFactory.createDrivingLog({
      date: new Date(),
      startLocation: locations[0],
      waypoints: locations.slice(1, -1),
      endLocation: locations[locations.length - 1]
    });

    // 複数回の保存・取得サイクル
    let currentLog = drivingLog;
    for (let i = 0; i < 3; i++) {
      const saved = await storageService.createDrivingLog(currentLog.toStorageFormat());
      const retrieved = await storageService.getDrivingLog(saved.id);
      currentLog = DrivingLogModel.fromStorageFormat(retrieved!);
      
      await storageService.deleteDrivingLog(saved.id);
    }

    expect(currentLog.waypoints).toHaveLength(8);
    expect(currentLog.calculateTotalDistance()).toBeGreaterThan(0);
  });
});
```

### IT-002: 型定義との整合性
```typescript
describe('TypeScript Type Compatibility', () => {
  test('should be compatible with interface definitions', () => {
    const model = ModelFactory.createDrivingLog({
      date: new Date(),
      startLocation: mockStartLocation,
      waypoints: []
    });

    // TypeScriptの型として扱えることを確認
    const interfaceObj: DrivingLog = model;
    expect(interfaceObj.id).toBe(model.id);
    expect(interfaceObj.date).toEqual(model.date);
  });

  test('should support all enum values', () => {
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
  });
});
```

---

## 3. バリデーションテスト（Validation Tests）

### VT-001: 必須フィールド検証
```typescript
describe('Required Field Validation', () => {
  test('should reject DrivingLog without required fields', () => {
    const invalidData = [
      {}, // 全てなし
      { date: new Date() }, // startLocationなし
      { startLocation: mockStartLocation }, // dateなし
      { date: new Date(), startLocation: mockStartLocation } // waypointsなし
    ];

    invalidData.forEach(data => {
      expect(() => DrivingLogModel.create(data as any))
        .toThrow(/required field/i);
    });
  });

  test('should reject Location without required fields', () => {
    const invalidData = [
      { latitude: 35.6762 }, // longitudeとtimestampなし
      { longitude: 139.6503 }, // latitudeとtimestampなし
      { timestamp: new Date() }, // 座標なし
      { latitude: 35.6762, longitude: 139.6503 } // timestampなし
    ];

    invalidData.forEach(data => {
      expect(() => LocationModel.create(data as any))
        .toThrow(/required field/i);
    });
  });
});
```

### VT-002: データ型検証
```typescript
describe('Data Type Validation', () => {
  test('should reject invalid coordinate types', () => {
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
      } as any)).toThrow(/invalid coordinate/i);
    });
  });

  test('should reject invalid date types', () => {
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
      } as any)).toThrow(/invalid date/i);
    });
  });
});
```

### VT-003: 値範囲検証
```typescript
describe('Value Range Validation', () => {
  test('should reject coordinates outside valid range', () => {
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
      })).toThrow(/coordinate.*range/i);
    });
  });

  test('should reject negative accuracy values', () => {
    expect(() => LocationModel.create({
      latitude: 35.6762,
      longitude: 139.6503,
      accuracy: -1,
      timestamp: new Date(),
      type: LocationType.START
    })).toThrow(/accuracy.*positive/i);
  });

  test('should reject invalid GPS timeout values', () => {
    const invalidTimeouts = [-1, 0, 301]; // 負数、0、上限超過

    invalidTimeouts.forEach(timeout => {
      expect(() => SettingsModel.createDefault().update({
        gpsTimeout: timeout
      })).toThrow(/timeout.*range/i);
    });
  });
});
```

### VT-004: 関連データ整合性検証
```typescript
describe('Related Data Consistency', () => {
  test('should validate location sequence timestamps', () => {
    const baseTime = new Date('2024-01-15T08:00:00Z');
    
    // 正常なケース：時系列順
    const validSequence = DrivingLogModel.create({
      date: new Date('2024-01-15'),
      startLocation: {
        ...mockStartLocation,
        timestamp: baseTime
      },
      waypoints: [{
        id: 'way1',
        latitude: 35.6586,
        longitude: 139.7454,
        timestamp: new Date(baseTime.getTime() + 3600000), // 1時間後
        type: LocationType.WAYPOINT
      }],
      endLocation: {
        id: 'end1',
        latitude: 35.6895,
        longitude: 139.6917,
        timestamp: new Date(baseTime.getTime() + 7200000), // 2時間後
        type: LocationType.END
      }
    });

    expect(validSequence.validateLocationSequence()).toBe(true);

    // 異常なケース：時系列逆転
    expect(() => DrivingLogModel.create({
      date: new Date('2024-01-15'),
      startLocation: {
        ...mockStartLocation,
        timestamp: new Date(baseTime.getTime() + 7200000) // 2時間後
      },
      waypoints: [],
      endLocation: {
        id: 'end1',
        latitude: 35.6895,
        longitude: 139.6917,
        timestamp: baseTime, // 開始より前
        type: LocationType.END
      }
    })).toThrow(/timestamp.*sequence/i);
  });
});
```

---

## 4. パフォーマンステスト（Performance Tests）

### PT-001: データ作成性能
```typescript
describe('Performance Tests', () => {
  test('should create models within performance threshold', () => {
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
  });

  test('should perform distance calculations efficiently', () => {
    const locations = Array.from({ length: 100 }, (_, i) =>
      ModelFactory.createLocation({
        latitude: 35.6762 + i * 0.001,
        longitude: 139.6503 + i * 0.001,
        timestamp: new Date(),
        type: LocationType.WAYPOINT
      })
    );

    const startTime = Date.now();
    
    // 全地点間の距離を計算（最悪ケース）
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
```

### PT-002: メモリ使用量テスト
```typescript
describe('Memory Usage Tests', () => {
  test('should not cause memory leaks with large datasets', () => {
    const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;
    
    // 大量のオブジェクトを作成・破棄
    for (let i = 0; i < 10; i++) {
      const logs = Array.from({ length: 1000 }, () => 
        ModelFactory.createDrivingLog({
          date: new Date(),
          startLocation: mockStartLocation,
          waypoints: Array.from({ length: 10 }, () => mockWaypoint)
        })
      );
      
      // 参照を削除してGCを促進
      logs.length = 0;
      
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
```

---

## 5. エラーハンドリングテスト（Error Handling Tests）

### EH-001: バリデーションエラー詳細
```typescript
describe('Validation Error Details', () => {
  test('should provide detailed validation errors', () => {
    try {
      DrivingLogModel.create({
        // 必須フィールドを意図的に省略
      } as any);
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect(error.code).toBe(ErrorCode.INVALID_DATA_FORMAT);
      expect(error.message).toMatch(/required.*date/i);
      expect(error.details).toEqual({
        missingFields: ['date', 'startLocation', 'waypoints']
      });
    }
  });

  test('should provide field-specific error messages', () => {
    const validationErrors = [
      {
        data: { latitude: 91, longitude: 139.6503, timestamp: new Date(), type: LocationType.START },
        expectedField: 'latitude',
        expectedMessage: /latitude.*range/i
      },
      {
        data: { latitude: 35.6762, longitude: 181, timestamp: new Date(), type: LocationType.START },
        expectedField: 'longitude', 
        expectedMessage: /longitude.*range/i
      },
      {
        data: { latitude: 35.6762, longitude: 139.6503, accuracy: -1, timestamp: new Date(), type: LocationType.START },
        expectedField: 'accuracy',
        expectedMessage: /accuracy.*positive/i
      }
    ];

    validationErrors.forEach(({ data, expectedField, expectedMessage }) => {
      try {
        LocationModel.create(data);
        fail('Should have thrown validation error');
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect(error.message).toMatch(expectedMessage);
        expect(error.details.field).toBe(expectedField);
      }
    });
  });
});
```

### EH-002: 復旧可能エラー処理
```typescript
describe('Recoverable Error Handling', () => {
  test('should handle missing optional fields gracefully', () => {
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

  test('should auto-correct minor data inconsistencies', () => {
    const dataWithMinorIssues = {
      date: new Date(),
      startLocation: {
        ...mockStartLocation,
        accuracy: 0 // 0精度を自動補正
      },
      waypoints: []
    };

    const drivingLog = DrivingLogModel.create(dataWithMinorIssues);
    
    // 精度が自動的に補正されることを確認
    expect(drivingLog.startLocation.accuracy).toBeGreaterThan(0);
  });
});
```

---

## テスト実行計画

### フェーズ1: 基本機能テスト（1-2日目）
- **BaseModel**: 共通機能の検証
- **Factory機能**: ID生成・オブジェクト作成
- **基本バリデーション**: 必須フィールド・データ型

### フェーズ2: エンティティ別テスト（3-4日目）
- **DrivingLogModel**: CRUD・計算機能
- **LocationModel**: GPS処理・距離計算
- **SettingsModel**: 設定管理・永続化

### フェーズ3: 統合・性能テスト（5日目）
- **StorageService連携**: データの永続化
- **パフォーマンス**: 大量データ処理
- **メモリ管理**: リーク防止確認

### フェーズ4: エラー処理・品質確認（6日目）
- **エラーハンドリング**: 異常系の網羅
- **回復処理**: 自動補正機能
- **最終品質チェック**: カバレッジ・静的解析

## 品質指標

### カバレッジ目標
- **行カバレッジ**: 95%以上
- **ブランチカバレッジ**: 90%以上  
- **関数カバレッジ**: 100%

### 合格基準
- 全テストケースが成功すること
- パフォーマンス要件（1ms/処理、100ms/1000件）を満たすこと
- メモリリークが発生しないこと
- バリデーションが適切に動作すること

## モックデータ定義

### 共通テストデータ
```typescript
export const mockStartLocation: Location = {
  id: 'loc-start-001',
  name: '本社',
  address: '東京都千代田区丸の内1-1-1',
  latitude: 35.6762,
  longitude: 139.6503,
  accuracy: 10,
  timestamp: new Date('2024-01-15T08:00:00Z'),
  type: LocationType.START
};

export const mockWaypoint: Location = {
  id: 'loc-waypoint-001',
  name: 'A社',
  address: '東京都港区六本木1-1-1',
  latitude: 35.6586,
  longitude: 139.7454,
  accuracy: 15,
  timestamp: new Date('2024-01-15T10:00:00Z'),
  type: LocationType.WAYPOINT
};

export const mockEndLocation: Location = {
  id: 'loc-end-001',
  name: '本社',
  address: '東京都千代田区丸の内1-1-1',
  latitude: 35.6762,
  longitude: 139.6503,
  accuracy: 12,
  timestamp: new Date('2024-01-15T17:00:00Z'),
  type: LocationType.END
};

export const createMockDrivingLogData = (overrides: Partial<DrivingLog> = {}) => ({
  date: new Date('2024-01-15'),
  startLocation: mockStartLocation,
  waypoints: [mockWaypoint],
  status: DrivingLogStatus.IN_PROGRESS,
  ...overrides
});
```

## 次のステップ

テストケース設計が完了しました。次は実際にテストコードを実装し、Red-Green-Refactorサイクルを開始します。

**重要**: 全てのテストは最初失敗し（Red）、最小限の実装でパスし（Green）、その後品質向上（Refactor）を行います。