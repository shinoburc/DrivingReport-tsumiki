# TASK-301: 運転日報コントローラー実装 - 要件定義

## 概要
運転記録の作成・更新・削除と状態管理を行うコントローラーを実装する。記録の開始から完了まで、進行状況を管理し、中断からの復旧機能も提供する。

## 機能要件

### 1. 運転記録のCRUD機能
- 新規運転記録の作成
- 既存記録の更新（地点追加、メモ編集など）
- 記録の削除（論理削除）
- 記録の読み取り（単一・複数）
- 自動IDの生成と管理

### 2. 記録状態管理
- **進行中（IN_PROGRESS）**: 記録中の状態
- **完了（COMPLETED）**: 正常に完了した記録
- **キャンセル（CANCELLED）**: ユーザーによる中断
- 状態遷移の制御と検証
- 不正な状態遷移の防止

### 3. 簡易入力モード（ワンタップ記録）
- 出発地点のワンタップ記録
- 経由地点の追加
- 到着地点のワンタップ記録
- GPSまたはよく使う地点からの選択
- 最小限の操作で記録完了

### 4. 自動保存機能
- 地点追加時の自動保存
- 定期的な自動保存（30秒ごと）
- オフライン時のローカル保存
- 再接続時の同期

### 5. 中断・復旧機能
- アプリクラッシュ時のデータ保護
- 進行中記録の復元
- 最後の保存地点からの再開
- 重複記録の防止

## 非機能要件

### パフォーマンス要件
- 記録の作成は1秒以内
- 地点追加は500ms以内
- 自動保存は非同期で実行
- 履歴読み込みは2秒以内（100件）

### データ整合性要件
- トランザクション的な更新
- 同時編集の防止
- データバリデーション
- 整合性チェック

### ユーザビリティ要件
- 進行状況の明確な表示
- エラー時の分かりやすいメッセージ
- 復旧時の通知
- 操作の取り消し機能

## インターフェース設計

### DrivingLogController クラス

```typescript
interface IDrivingLogController {
  // 記録の作成
  createLog(initialData?: Partial<DrivingLog>): Promise<DrivingLogModel>;
  
  // 記録の取得
  getLog(logId: string): Promise<DrivingLogModel | null>;
  getActiveLogs(): Promise<DrivingLogModel[]>;
  getAllLogs(options?: QueryOptions): Promise<DrivingLogModel[]>;
  
  // 記録の更新
  updateLog(logId: string, updates: Partial<DrivingLog>): Promise<DrivingLogModel>;
  
  // 記録の削除
  deleteLog(logId: string, soft?: boolean): Promise<void>;
  
  // 地点の追加
  addLocation(logId: string, location: LocationModel, type: LocationType): Promise<DrivingLogModel>;
  
  // 簡易入力モード
  quickStart(startLocation?: LocationModel): Promise<DrivingLogModel>;
  quickAddWaypoint(logId: string, location: LocationModel): Promise<DrivingLogModel>;
  quickComplete(logId: string, endLocation: LocationModel): Promise<DrivingLogModel>;
  
  // 状態管理
  changeStatus(logId: string, newStatus: DrivingLogStatus): Promise<DrivingLogModel>;
  completeLog(logId: string): Promise<DrivingLogModel>;
  cancelLog(logId: string, reason?: string): Promise<DrivingLogModel>;
  
  // 自動保存
  enableAutoSave(logId: string, interval?: number): void;
  disableAutoSave(logId: string): void;
  saveLog(logId: string): Promise<void>;
  
  // 復旧機能
  recoverInProgressLogs(): Promise<DrivingLogModel[]>;
  hasUnsavedChanges(logId: string): boolean;
  getLastSaveTime(logId: string): Date | null;
  
  // 統計・集計
  calculateDistance(logId: string): number;
  calculateDuration(logId: string): number;
  getTotalDistance(startDate?: Date, endDate?: Date): Promise<number>;
}

interface DrivingLog {
  id: string;
  date: Date;
  startTime: Date;
  endTime?: Date;
  startLocation?: LocationModel;
  endLocation?: LocationModel;
  waypoints: LocationModel[];
  distance?: number;
  duration?: number;
  purpose?: string;
  memo?: string;
  status: DrivingLogStatus;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

interface QueryOptions {
  startDate?: Date;
  endDate?: Date;
  status?: DrivingLogStatus;
  limit?: number;
  offset?: number;
  sortBy?: 'date' | 'distance' | 'duration';
  sortOrder?: 'asc' | 'desc';
  includeDeleted?: boolean;
}

interface AutoSaveConfig {
  enabled: boolean;
  interval: number; // milliseconds
  lastSaveTime?: Date;
  unsavedChanges: boolean;
}
```

## 実装の制約事項

1. **依存関係**
   - LocationControllerに依存
   - StorageServiceに依存
   - DrivingLogModelを使用

2. **データ保存**
   - IndexedDBを使用（StorageService経由）
   - 進行中記録はLocalStorageにも保存
   - 定期的なバックアップ

3. **状態遷移ルール**
   - IN_PROGRESS → COMPLETED（正常完了）
   - IN_PROGRESS → CANCELLED（中断）
   - COMPLETED/CANCELLED → 変更不可
   - 削除は論理削除を優先

## テスト要件

### 単体テスト
1. CRUD操作の正確性
2. 状態遷移の妥当性検証
3. 簡易入力モードの動作
4. 自動保存の動作確認
5. エラーハンドリング

### 統合テスト
1. 記録開始→地点追加→完了フロー
2. 中断→復旧フロー
3. 自動保存→復元フロー
4. 同時編集の防止

### 性能テスト
1. 大量データ（1000件）での読み込み速度
2. 自動保存の非同期処理
3. メモリリークの確認

### モックデータ
```typescript
// テスト用の運転記録
const mockDrivingLog = {
  id: 'log-001',
  date: new Date('2024-01-15'),
  startTime: new Date('2024-01-15T09:00:00'),
  endTime: new Date('2024-01-15T17:00:00'),
  startLocation: { name: '自宅', latitude: 35.6762, longitude: 139.6503 },
  endLocation: { name: '会社', latitude: 35.6897, longitude: 139.6922 },
  waypoints: [
    { name: '顧客A', latitude: 35.6580, longitude: 139.7016 },
    { name: '顧客B', latitude: 35.6850, longitude: 139.7514 }
  ],
  distance: 45.5,
  duration: 480, // minutes
  purpose: '営業活動',
  status: DrivingLogStatus.COMPLETED
};
```

## 受け入れ基準

1. [ ] 運転記録のCRUD操作が正常に動作する
2. [ ] 状態遷移が適切に制御される
3. [ ] 簡易入力モードで最小限の操作で記録できる
4. [ ] 自動保存が定期的に実行される
5. [ ] アプリクラッシュ後に記録が復旧できる
6. [ ] 不正な状態遷移が防止される
7. [ ] 未来日時の入力に対して警告が表示される
8. [ ] 進行状況が視覚的に表示される
9. [ ] すべての単体テストが成功する
10. [ ] パフォーマンス要件を満たす