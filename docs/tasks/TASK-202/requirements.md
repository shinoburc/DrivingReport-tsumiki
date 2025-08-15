# TASK-202: 位置情報コントローラー実装 - 要件定義

## 概要
GPSサービスと連携して位置情報の記録・管理を行うコントローラーを実装する。GPS取得、手動入力、よく使う地点の管理機能を提供する。

## 機能要件

### 1. 地点記録機能
- GPSサービスを使用した現在地点の記録
- 記録時の地点名の自動/手動設定
- 地点の種類（出発地、到着地、経由地）の指定
- 記録日時の自動設定
- 位置情報の精度表示

### 2. 手動入力機能
- 住所からの位置情報入力
- 地図上での位置指定（将来実装）
- 緯度経度の直接入力
- 入力値のバリデーション
- GPS取得失敗時の代替入力

### 3. よく使う地点管理
- よく使う地点の登録・削除・更新
- 地点のカテゴリ分類（自宅、会社、顧客先など）
- 地点の検索・選択
- 使用頻度によるソート
- デフォルト地点の設定

### 4. 位置情報の検索・フィルタリング
- 地点名での検索
- 日付範囲でのフィルタリング
- 地点種類でのフィルタリング
- 距離による近隣地点検索
- ソート機能（日時、名前、距離）

## 非機能要件

### パフォーマンス要件
- 地点記録は1秒以内に完了
- よく使う地点の読み込みは500ms以内
- 検索結果は2秒以内に表示

### データ管理要件
- 位置情報の永続化（StorageService利用）
- データの整合性保証
- 削除時の確認処理

### ユーザビリティ要件
- 直感的な地点選択UI
- 入力エラーの明確な表示
- オフライン時の適切な動作

## インターフェース設計

### LocationController クラス

```typescript
interface ILocationController {
  // GPS位置情報の記録
  recordCurrentLocation(options?: RecordOptions): Promise<LocationModel>;
  
  // 手動入力による地点記録
  recordManualLocation(input: ManualLocationInput): Promise<LocationModel>;
  
  // よく使う地点の追加
  addFavoriteLocation(location: LocationModel, category?: string): Promise<void>;
  
  // よく使う地点の取得
  getFavoriteLocations(category?: string): Promise<LocationModel[]>;
  
  // よく使う地点の削除
  removeFavoriteLocation(locationId: string): Promise<void>;
  
  // 位置情報の検索
  searchLocations(criteria: SearchCriteria): Promise<LocationModel[]>;
  
  // 最近の位置情報取得
  getRecentLocations(limit?: number): Promise<LocationModel[]>;
  
  // GPS利用可能性チェック
  isGPSAvailable(): boolean;
  
  // 位置情報の更新
  updateLocation(locationId: string, updates: Partial<LocationModel>): Promise<LocationModel>;
  
  // 位置情報の削除
  deleteLocation(locationId: string): Promise<void>;
}

interface RecordOptions {
  name?: string;              // 地点名
  type?: LocationType;        // 地点種類
  autoName?: boolean;         // 自動命名（日時ベース）
  requireHighAccuracy?: boolean; // 高精度要求
}

interface ManualLocationInput {
  name: string;
  address?: string;           // 住所
  latitude?: number;          // 緯度
  longitude?: number;         // 経度
  type: LocationType;
  memo?: string;
}

interface SearchCriteria {
  query?: string;             // 検索クエリ
  startDate?: Date;           // 開始日
  endDate?: Date;             // 終了日
  type?: LocationType;        // 地点種類
  favoriteOnly?: boolean;     // よく使う地点のみ
  sortBy?: 'date' | 'name' | 'distance';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
}

interface FavoriteLocation extends LocationModel {
  category?: string;          // カテゴリ
  usageCount: number;         // 使用回数
  lastUsed?: Date;           // 最終使用日時
  isDefault?: boolean;       // デフォルト地点フラグ
}
```

## 実装の制約事項

1. **依存関係**
   - GPSServiceに依存
   - StorageServiceに依存
   - LocationModelを使用

2. **データ保存**
   - IndexedDBを使用（StorageService経由）
   - よく使う地点はLocalStorageにも保存

3. **エラーハンドリング**
   - GPS取得失敗時は手動入力を促す
   - ストレージエラー時の復旧処理

## テスト要件

### 単体テスト
1. GPS地点記録の成功・失敗
2. 手動入力のバリデーション
3. よく使う地点のCRUD操作
4. 検索・フィルタリング機能
5. エラーハンドリング

### 統合テスト
1. GPS→記録→保存の一連フロー
2. GPS失敗→手動入力フロー
3. よく使う地点選択→記録フロー
4. 検索→結果表示フロー

### モックデータ
```typescript
// テスト用のモック地点
const mockLocations = {
  home: { 
    name: '自宅', 
    latitude: 35.6762, 
    longitude: 139.6503,
    type: LocationType.DEPARTURE
  },
  office: { 
    name: '会社', 
    latitude: 35.6897, 
    longitude: 139.6922,
    type: LocationType.ARRIVAL
  },
  customer: { 
    name: '顧客A', 
    latitude: 35.6580, 
    longitude: 139.7016,
    type: LocationType.WAYPOINT
  }
};
```

## 受け入れ基準

1. [ ] GPSを使用して現在地点を記録できる
2. [ ] GPS取得失敗時に手動入力で地点を記録できる
3. [ ] よく使う地点を登録・削除・更新できる
4. [ ] よく使う地点から選択して記録できる
5. [ ] 地点名や日付で位置情報を検索できる
6. [ ] 入力値のバリデーションが適切に動作する
7. [ ] データが永続化され、再起動後も保持される
8. [ ] すべての単体テストが成功する
9. [ ] パフォーマンス要件を満たす