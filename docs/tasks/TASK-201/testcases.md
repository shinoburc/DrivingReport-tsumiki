# TASK-201: GPS サービス実装 - テストケース設計

## テストケース一覧

### 1. GPS利用可能性確認テスト

#### TC-001: Geolocation API存在確認
- **目的**: ブラウザがGeolocation APIをサポートしているか確認
- **入力**: なし
- **期待結果**: isAvailable()がtrueを返す（API存在時）
- **期待結果**: isAvailable()がfalseを返す（API非存在時）

### 2. 位置情報取得テスト

#### TC-002: 位置情報取得成功
- **目的**: 正常に位置情報を取得できることを確認
- **入力**: getCurrentLocation()呼び出し
- **期待結果**: 
  - GPSLocationオブジェクトが返される
  - latitude, longitude, accuracyが含まれる
  - accuracyLevelが適切に判定される

#### TC-003: タイムアウト処理
- **目的**: 指定時間内に取得できない場合のタイムアウト
- **入力**: getCurrentLocation({ timeout: 1000 })
- **期待結果**: 
  - 1秒後にTIMEOUTエラーが発生
  - エラーコード: 'TIMEOUT'
  - 適切なエラーメッセージ

#### TC-004: 高精度モード
- **目的**: 高精度モードでの位置情報取得
- **入力**: getCurrentLocation({ enableHighAccuracy: true })
- **期待結果**: 
  - enableHighAccuracyオプションが適用される
  - より精度の高い位置情報が取得される

### 3. 権限管理テスト

#### TC-005: 権限状態確認
- **目的**: 現在の権限状態を確認
- **入力**: checkPermission()
- **期待結果**: 'granted' | 'denied' | 'prompt' のいずれかを返す

#### TC-006: 権限要求
- **目的**: 位置情報の権限を要求
- **入力**: requestPermission()
- **期待結果**: 
  - 権限が許可された場合: true
  - 権限が拒否された場合: false

#### TC-007: 権限拒否時のエラー
- **目的**: 権限拒否時の適切なエラーハンドリング
- **入力**: 権限拒否状態でgetCurrentLocation()
- **期待結果**: 
  - エラーコード: 'PERMISSION_DENIED'
  - 適切なエラーメッセージ

### 4. 精度レベル判定テスト

#### TC-008: 高精度判定
- **目的**: 精度50m以内を高精度と判定
- **入力**: accuracy: 30
- **期待結果**: accuracyLevel: 'high'

#### TC-009: 中精度判定
- **目的**: 精度50-100mを中精度と判定
- **入力**: accuracy: 75
- **期待結果**: accuracyLevel: 'medium'

#### TC-010: 低精度判定
- **目的**: 精度100m超を低精度と判定
- **入力**: accuracy: 150
- **期待結果**: accuracyLevel: 'low'

### 5. 位置情報監視テスト

#### TC-011: watchPosition開始
- **目的**: 継続的な位置情報取得を開始
- **入力**: watchPosition(callback)
- **期待結果**: 
  - watchIdが返される
  - callbackが位置情報更新時に呼ばれる

#### TC-012: watchPosition停止
- **目的**: 位置情報監視を停止
- **入力**: clearWatch(watchId)
- **期待結果**: 
  - 監視が停止される
  - callbackが呼ばれなくなる

#### TC-013: watchPositionエラー処理
- **目的**: 監視中のエラーハンドリング
- **入力**: watchPosition(callback, errorCallback)
- **期待結果**: 
  - エラー発生時にerrorCallbackが呼ばれる
  - 適切なエラー情報が渡される

### 6. エラーハンドリングテスト

#### TC-014: 位置情報利用不可エラー
- **目的**: 位置情報が利用できない場合のエラー
- **入力**: 位置情報無効状態でgetCurrentLocation()
- **期待結果**: 
  - エラーコード: 'POSITION_UNAVAILABLE'
  - 適切なエラーメッセージ

#### TC-015: ブラウザ非対応エラー
- **目的**: Geolocation API非対応ブラウザでのエラー
- **入力**: API非対応環境でgetCurrentLocation()
- **期待結果**: 
  - エラーコード: 'NOT_SUPPORTED'
  - 適切なエラーメッセージ

### 7. オプション設定テスト

#### TC-016: デフォルトオプション
- **目的**: オプション未指定時のデフォルト値確認
- **入力**: getCurrentLocation()（オプションなし）
- **期待結果**: 
  - timeout: 5000
  - enableHighAccuracy: true
  - maximumAge: 0

#### TC-017: カスタムオプション
- **目的**: カスタムオプションの適用確認
- **入力**: getCurrentLocation({ timeout: 10000, maximumAge: 60000 })
- **期待結果**: 指定したオプションが適用される

### 8. メモリリークテスト

#### TC-018: watchPosition複数回呼び出し
- **目的**: メモリリークが発生しないことを確認
- **入力**: watchPositionを複数回呼び出し、clearWatch
- **期待結果**: 
  - メモリが適切に解放される
  - 古いwatchが適切に停止される

## モックデータ

```typescript
// 成功時のモック位置情報
const mockSuccessPosition = {
  coords: {
    latitude: 35.6762,
    longitude: 139.6503,
    accuracy: 30,
    altitude: null,
    altitudeAccuracy: null,
    heading: null,
    speed: null
  },
  timestamp: Date.now()
};

// エラー時のモックエラー
const mockErrors = {
  permissionDenied: {
    code: 1,
    message: 'User denied Geolocation'
  },
  positionUnavailable: {
    code: 2,
    message: 'Position unavailable'
  },
  timeout: {
    code: 3,
    message: 'Request timeout'
  }
};
```

## テスト優先順位

1. **必須テスト**（P1）
   - TC-001, TC-002, TC-003, TC-007, TC-011, TC-012

2. **重要テスト**（P2）
   - TC-005, TC-006, TC-008, TC-009, TC-010, TC-014

3. **補完テスト**（P3）
   - TC-004, TC-013, TC-015, TC-016, TC-017, TC-018