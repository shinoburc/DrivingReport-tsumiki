# ブラウザストレージスキーマ設計

## 概要

運転日報PWAのデータは、ブラウザのローカルストレージを使用して永続化されます。主要なデータはIndexedDBに保存し、軽量な設定情報はLocalStorageに保存します。

## ストレージ選択理由

### IndexedDB（メインストレージ）
- **選択理由**:
  - 大容量データの保存が可能（数GB）
  - 非同期API によるパフォーマンス
  - トランザクションサポート
  - 複雑なクエリとインデックス機能
  - バイナリデータ（画像）の保存が可能

### LocalStorage（補助ストレージ）
- **選択理由**:
  - 同期的な読み書きが可能
  - 小さな設定データに最適
  - シンプルなkey-value ストア

## IndexedDB スキーマ

### データベース情報
```javascript
{
  name: "DrivingLogDB",
  version: 1,
  stores: ["drivingLogs", "locations", "settings", "favorites"]
}
```

### Object Stores

#### 1. drivingLogs ストア
```javascript
// Object Store定義
{
  name: "drivingLogs",
  keyPath: "id",
  autoIncrement: false,
  indexes: [
    { name: "by-date", keyPath: "date", unique: false },
    { name: "by-status", keyPath: "status", unique: false },
    { name: "by-createdAt", keyPath: "createdAt", unique: false },
    { name: "by-updatedAt", keyPath: "updatedAt", unique: false }
  ]
}

// データ構造例
{
  id: "550e8400-e29b-41d4-a716-446655440000",
  date: "2024-01-15T00:00:00.000Z",
  driverName: "山田太郎",
  vehicleNumber: "品川500 あ 12-34",
  startLocation: {
    id: "loc-001",
    name: "本社",
    address: "東京都千代田区...",
    latitude: 35.6762,
    longitude: 139.6503,
    accuracy: 10,
    timestamp: "2024-01-15T08:30:00.000Z",
    type: "START"
  },
  waypoints: [
    {
      id: "loc-002",
      name: "A社",
      address: "東京都港区...",
      latitude: 35.6586,
      longitude: 139.7454,
      accuracy: 15,
      timestamp: "2024-01-15T09:15:00.000Z",
      type: "WAYPOINT"
    }
  ],
  endLocation: {
    id: "loc-003",
    name: "本社",
    address: "東京都千代田区...",
    latitude: 35.6762,
    longitude: 139.6503,
    accuracy: 12,
    timestamp: "2024-01-15T17:30:00.000Z",
    type: "END"
  },
  totalDistance: 125.5,
  status: "COMPLETED",
  createdAt: "2024-01-15T08:30:00.000Z",
  updatedAt: "2024-01-15T17:30:00.000Z"
}
```

#### 2. locations ストア
```javascript
// Object Store定義
{
  name: "locations",
  keyPath: "id",
  autoIncrement: false,
  indexes: [
    { name: "by-timestamp", keyPath: "timestamp", unique: false },
    { name: "by-type", keyPath: "type", unique: false },
    { name: "by-logId", keyPath: "drivingLogId", unique: false }
  ]
}

// データ構造例
{
  id: "loc-001",
  drivingLogId: "550e8400-e29b-41d4-a716-446655440000",
  name: "本社",
  address: "東京都千代田区丸の内1-1-1",
  latitude: 35.6762,
  longitude: 139.6503,
  accuracy: 10,
  timestamp: "2024-01-15T08:30:00.000Z",
  type: "START",
  note: "定期点検後出発",
  imageDataUrl: "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
}
```

#### 3. settings ストア
```javascript
// Object Store定義
{
  name: "settings",
  keyPath: "key",
  autoIncrement: false
}

// データ構造例
{
  key: "appSettings",
  value: {
    language: "ja",
    gpsTimeout: 5000,
    autoExportEnabled: false,
    exportFormat: "CSV",
    theme: "light"
  }
}
```

#### 4. favorites ストア
```javascript
// Object Store定義
{
  name: "favorites",
  keyPath: "id",
  autoIncrement: false,
  indexes: [
    { name: "by-name", keyPath: "name", unique: false }
  ]
}

// データ構造例
{
  id: "fav-001",
  name: "本社",
  address: "東京都千代田区丸の内1-1-1",
  latitude: 35.6762,
  longitude: 139.6503,
  createdAt: "2024-01-01T00:00:00.000Z"
}
```

## LocalStorage スキーマ

### キー構造
```javascript
{
  "drivingLog:lastSync": "2024-01-15T17:30:00.000Z",
  "drivingLog:currentLogId": "550e8400-e29b-41d4-a716-446655440000",
  "drivingLog:draftData": "{ ... }",  // 一時保存データ（JSON文字列）
  "drivingLog:uiState": "{ ... }",    // UI状態（JSON文字列）
  "drivingLog:version": "1.0.0"       // アプリバージョン
}
```

## データマイグレーション戦略

### バージョン管理
```javascript
// マイグレーション定義
const migrations = {
  1: (db) => {
    // 初期スキーマ作成
  },
  2: (db) => {
    // 新しいインデックス追加
    const objectStore = db.transaction.objectStore('drivingLogs');
    objectStore.createIndex('by-vehicleNumber', 'vehicleNumber', { unique: false });
  }
};
```

## ストレージ容量管理

### 容量監視
```javascript
// 使用容量の推定
navigator.storage.estimate().then(estimate => {
  const percentUsed = (estimate.usage / estimate.quota) * 100;
  console.log(`Storage: ${percentUsed.toFixed(2)}% used`);
});
```

### データ削除ポリシー
1. **自動削除**: なし（ユーザーの明示的な操作のみ）
2. **警告閾値**: 使用率80%で警告表示
3. **推奨アクション**: 古いデータのCSVエクスポート後削除

## パフォーマンス最適化

### インデックス設計
- 日付による検索が頻繁 → `by-date` インデックス
- ステータスフィルタリング → `by-status` インデックス
- 最新データ表示 → `by-createdAt` インデックス

### クエリ最適化例
```javascript
// 期間指定での効率的なクエリ
const range = IDBKeyRange.bound(startDate, endDate);
const index = objectStore.index('by-date');
const request = index.openCursor(range);
```

## セキュリティ考慮事項

1. **データ暗号化**: ブラウザ標準のセキュリティに依存
2. **アクセス制御**: Same-origin policy による保護
3. **データ削除**: ユーザー操作による完全削除を保証

## バックアップとリストア

### エクスポート機能
- 全データをJSON形式でエクスポート可能
- 選択的なCSVエクスポート

### インポート機能（将来実装）
- JSONファイルからのデータ復元
- データ検証とマージ機能