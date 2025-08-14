# TASK-201: GPS サービス実装 - テストケース設計

## テスト戦略
- **Test-Driven Development**: テストファーストアプローチ
- **カバレッジ目標**: 90%以上
- **テストピラミッド**: 単体テスト重視、統合テストで補完
- **Mock戦略**: Geolocation API, Permissions APIをモック化

## 単体テスト (Unit Tests)

### UT-201-001: GPS位置情報取得機能
**目的**: getCurrentPosition メソッドの基本動作テスト

#### UT-201-001-01: 正常な位置情報取得
```typescript
describe('getCurrentPosition - 正常ケース', () => {
  test('GPS位置情報が正常に取得できる', async () => {
    // モックGPS データ
    const mockPosition = {
      coords: {
        latitude: 35.6762,
        longitude: 139.6503,
        accuracy: 15,
        timestamp: Date.now()
      }
    };
    
    // 期待値: LocationModel 形式のデータ
    // 実行時間: 5秒以内
    // 精度: 15m (高精度)
  });
});
```

#### UT-201-001-02: デフォルトオプション確認
```typescript
test('デフォルトオプションが適用される', async () => {
  // 期待値:
  // - timeout: 5000ms
  // - enableHighAccuracy: true
  // - maximumAge: 30000ms
  // - retryCount: 2
});
```

#### UT-201-001-03: カスタムオプション適用
```typescript  
test('カスタムオプションが適用される', async () => {
  // カスタムオプション: timeout: 3000, retryCount: 1
  // 期待値: 設定したオプションでGPS取得が実行される
});
```

### UT-201-002: 権限管理機能
**目的**: GPS権限の確認・要求機能テスト

#### UT-201-002-01: 権限状態確認
```typescript
describe('checkPermission', () => {
  test('権限が許可されている場合', async () => {
    // Mock: navigator.permissions.query → granted
    // 期待値: PermissionState.GRANTED
  });
  
  test('権限が拒否されている場合', async () => {
    // Mock: navigator.permissions.query → denied  
    // 期待値: PermissionState.DENIED
  });
  
  test('権限が未確定の場合', async () => {
    // Mock: navigator.permissions.query → prompt
    // 期待値: PermissionState.PROMPT
  });
});
```

#### UT-201-002-02: 権限要求
```typescript
describe('requestPermission', () => {
  test('権限要求が成功する', async () => {
    // Mock: navigator.geolocation.getCurrentPosition success
    // 期待値: PermissionState.GRANTED
  });
  
  test('権限要求が拒否される', async () => {
    // Mock: navigator.geolocation.getCurrentPosition → PERMISSION_DENIED
    // 期待値: PermissionState.DENIED + 適切なエラー
  });
});
```

### UT-201-003: タイムアウト処理機能  
**目的**: GPS取得タイムアウトの適切な処理テスト

#### UT-201-003-01: タイムアウト発生
```typescript
describe('タイムアウト処理', () => {
  test('設定時間内にGPS取得できない場合', async () => {
    // Mock: 6秒後にレスポンス (timeout: 5000ms)
    // 期待値: GPS_TIMEOUT エラー
    // リトライオプションの提示
  });
  
  test('タイムアウト後のリトライ機能', async () => {
    // 1回目: timeout, 2回目: success
    // 期待値: 2回目で正常な位置情報取得
  });
});
```

#### UT-201-003-02: リトライ回数制限
```typescript
test('最大リトライ回数に達した場合', async () => {
  // retryCount: 2, 全てtimeout
  // 期待値: 最終的にGPS_TIMEOUT エラー
});
```

### UT-201-004: 精度チェック機能
**目的**: 位置情報精度の評価とレベル判定テスト

#### UT-201-004-01: 精度レベル判定
```typescript
describe('精度レベル判定', () => {
  test('高精度判定 (<20m)', () => {
    // 入力: accuracy 15m
    // 期待値: AccuracyLevel.HIGH
  });
  
  test('中精度判定 (20-50m)', () => {
    // 入力: accuracy 35m
    // 期待値: AccuracyLevel.MEDIUM
  });
  
  test('低精度判定 (>50m)', () => {
    // 入力: accuracy 75m
    // 期待値: AccuracyLevel.LOW + 警告
  });
});
```

#### UT-201-004-02: 精度向上提案
```typescript
test('低精度時の改善提案', () => {
  // 入力: accuracy 100m
  // 期待値: 再取得オプション + ヒント表示
});
```

### UT-201-005: エラーハンドリング機能
**目的**: 各種エラー条件での適切な処理テスト

#### UT-201-005-01: GPS権限エラー
```typescript
describe('エラーハンドリング', () => {
  test('GPS権限拒否エラー', async () => {
    // Mock: GeolocationPositionError.PERMISSION_DENIED
    // 期待値: GPS_PERMISSION_DENIED + 適切なメッセージ
  });
});
```

#### UT-201-005-02: GPS利用不可エラー  
```typescript
test('GPS機能利用不可エラー', async () => {
  // Mock: GeolocationPositionError.POSITION_UNAVAILABLE
  // 期待値: GPS_UNAVAILABLE + フォールバック提案
});
```

#### UT-201-005-03: 一般的なGPSエラー
```typescript
test('不明なGPSエラー', async () => {
  // Mock: 予期しないエラー
  // 期待値: 汎用エラーメッセージ + デバッグ情報
});
```

### UT-201-006: 設定管理機能
**目的**: GPSサービス設定の更新・取得テスト

#### UT-201-006-01: オプション更新
```typescript
describe('設定管理', () => {
  test('オプション部分更新', () => {
    // 入力: { timeout: 8000 }
    // 期待値: timeout のみ更新、他は既存値保持
  });
  
  test('オプション取得', () => {
    // 期待値: 現在の設定値を正確に返却
  });
});
```

#### UT-201-006-02: 無効なオプション処理
```typescript
test('無効なオプション値の処理', () => {
  // 入力: { timeout: -1000 }
  // 期待値: デフォルト値に補正 + 警告
});
```

## 統合テスト (Integration Tests)

### IT-201-001: LocationModelとの統合
**目的**: GPS取得データのLocationModel変換テスト

#### IT-201-001-01: データ変換の正確性
```typescript
describe('LocationModel統合', () => {
  test('GPS データが正しくLocationModelに変換される', async () => {
    // 実行: getCurrentPosition()
    // 期待値: 
    // - LocationModel インスタンス
    // - 必須フィールドが全て設定
    // - 型安全性が保たれる
  });
});
```

#### IT-201-001-02: LocationType の適切な設定
```typescript
test('LocationType.GPS が自動設定される', async () => {
  // 期待値: type フィールドに LocationType.GPS が設定
});
```

### IT-201-002: StorageServiceとの統合  
**目的**: GPS取得した位置情報の永続化テスト

#### IT-201-002-01: 位置情報保存
```typescript
describe('StorageService統合', () => {
  test('GPS位置情報が正しく保存される', async () => {
    // 実行: getCurrentPosition → 保存
    // 期待値: IndexedDB に位置情報が格納される
  });
});
```

### IT-201-003: 権限管理フロー統合
**目的**: 権限要求から位置取得までのフローテスト

#### IT-201-003-01: 権限許可フロー
```typescript
describe('権限管理フロー', () => {
  test('権限要求 → 許可 → GPS取得の完全フロー', async () => {
    // 段階1: 権限確認 (prompt)
    // 段階2: 権限要求 (granted)  
    // 段階3: GPS取得 (success)
    // 期待値: 完全なLocationModelが取得される
  });
});
```

#### IT-201-003-02: 権限拒否フロー
```typescript
test('権限拒否時の適切なフォールバック', async () => {
  // 段階1: 権限要求 (denied)
  // 段階2: エラーハンドリング
  // 期待値: 適切なエラー + 手動入力提案
});
```

## 性能テスト (Performance Tests)

### PT-201-001: GPS取得速度テスト
**目的**: 位置情報取得の性能要件確認

#### PT-201-001-01: 取得時間測定
```typescript
describe('性能テスト', () => {
  test('GPS位置情報を5秒以内に取得', async () => {
    // 測定: getCurrentPosition の実行時間
    // 期待値: 5000ms 以内で完了
  });
});
```

#### PT-201-001-02: 連続取得テスト
```typescript
test('連続GPS取得の性能', async () => {
  // 実行: 10回連続でgetCurrentPosition
  // 期待値: 各回とも5秒以内、メモリリークなし
});
```

### PT-201-002: メモリ使用量テスト
```typescript
describe('メモリ使用量', () => {
  test('GPSサービスのメモリ使用量が5MB以内', async () => {
    // 測定: GPS取得前後のメモリ使用量
    // 期待値: 増加分が5MB以内
  });
});
```

## エラーハンドリングテスト (Error Handling Tests)

### EH-201-001: GPS権限拒否シナリオ
```typescript
describe('権限拒否エラー', () => {
  test('権限拒否時の適切なエラーメッセージ', async () => {
    // 期待値: 
    // - エラーコード: GPS_PERMISSION_DENIED
    // - 分かりやすいメッセージ
    // - 権限設定の案内
  });
});
```

### EH-201-002: ネットワーク接続エラー
```typescript
test('オフライン時のGPS動作', async () => {
  // Mock: ネットワーク切断状態
  // 期待値: GPS は動作、A-GPS 利用不可警告
});
```

### EH-201-003: 復旧テスト
```typescript
test('エラーからの自動復旧', async () => {
  // シナリオ: GPS失敗 → 復旧 → 再試行成功
  // 期待値: 適切な復旧処理
});
```

## UI/UXテスト (User Experience Tests)

### UX-201-001: ローディング表示テスト
```typescript
describe('ローディング表示', () => {
  test('GPS取得中の適切なローディング表示', async () => {
    // 期待値:
    // - 取得開始時にローディング表示
    // - 進捗状況の表示
    // - キャンセル可能なUI
  });
});
```

### UX-201-002: エラー表示テスト  
```typescript
test('ユーザーフレンドリーなエラー表示', async () => {
  // 期待値:
  // - 分かりやすいエラーメッセージ
  // - 解決手順の提示
  // - 代替手段の案内
});
```

## モックとテストデータ

### GPS Mock設定
```typescript
const createGPSMock = () => ({
  getCurrentPosition: jest.fn(),
  watchPosition: jest.fn(), 
  clearWatch: jest.fn()
});

const mockPositionSuccess = {
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

const mockPositionError = {
  code: 1, // PERMISSION_DENIED
  message: 'User denied geolocation prompt'
};
```

### テストデータセット
```typescript
const testDataSets = {
  highAccuracy: { accuracy: 10 },    // <20m
  mediumAccuracy: { accuracy: 35 },  // 20-50m  
  lowAccuracy: { accuracy: 75 },     // >50m
  veryLowAccuracy: { accuracy: 150 } // >100m
};
```

## テスト実行戦略

### Phase 1: 単体テスト (6個 × 平均3ケース = 18テスト)
- GPS取得機能の基本動作確認
- 権限管理機能の完全テスト
- エラーハンドリングの網羅的テスト

### Phase 2: 統合テスト (3個 × 平均2ケース = 6テスト)  
- 他サービスとの統合動作確認
- エンドツーエンドフロー検証

### Phase 3: 性能・UXテスト (4テスト)
- 性能要件の確認
- ユーザー体験の品質確認

**総テスト数**: 28テスト
**目標実行時間**: 各テスト5秒以内、全体3分以内
**カバレッジ目標**: 90%以上