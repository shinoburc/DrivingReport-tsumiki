# TASK-502: 運転記録画面実装 - 要件定義

## 概要

運転中に使用する記録画面を実装する。安全性を最優先に、運転しながらでも簡単に操作できるユーザーインターフェースを提供する。

## 機能要件

### 1. 記録進行画面

#### 1.1 基本情報表示
- **現在の記録時間**: リアルタイムで更新
- **経過時間表示**: 開始からの経過時間（HH:MM:SS形式）
- **現在の位置**: GPS取得した最新の位置情報
- **記録状態**: 記録中・一時停止・完了などの状態表示

#### 1.2 GPS状態インジケーター
- **GPS取得状態**: アイコンと色で視覚的に表示
  - 🟢 緑: GPS精度良好（±10m以内）
  - 🟡 黄: GPS精度普通（±50m以内）
  - 🔴 赤: GPS精度不良（±50m超過）
  - ⚫ グレー: GPS取得不可
- **座標情報**: デバッグ用の座標表示（設定で切り替え可能）
- **精度表示**: 現在のGPS精度をメートル単位で表示

#### 1.3 記録制御機能
- **一時停止ボタン**: 記録を一時停止
- **再開ボタン**: 一時停止から記録を再開
- **完了ボタン**: 記録を終了・保存
- **キャンセルボタン**: 記録を破棄

### 2. 地点追加機能

#### 2.1 ウェイポイント追加
- **地点追加ボタン**: 現在位置をウェイポイントとして追加
- **地点名入力**: 任意の地点名を設定可能（例：「コンビニ休憩」）
- **地点タイプ選択**: 
  - 🏠 出発地点
  - 🏁 到着地点
  - ⛽ 給油
  - 🍽️ 休憩
  - 🚗 駐車
  - 📍 その他

#### 2.2 クイックアクション
- **よく使う地点**: 事前登録した地点から選択
- **音声メモ**: 簡単な音声録音機能（将来拡張）
- **写真撮影**: 地点の写真撮影（将来拡張）

### 3. プログレス表示

#### 3.1 記録進捗
- **走行距離**: リアルタイム更新
- **平均速度**: 移動区間の平均速度
- **最高速度**: 記録中の最高速度
- **停止時間**: 停止状態の累計時間

#### 3.2 バッテリー・データ使用量
- **バッテリー残量**: 端末のバッテリー状態
- **データ使用量**: GPS・地図データの使用量（概算）

### 4. エラーハンドリング

#### 4.1 GPS関連エラー
- **GPS取得失敗**: 代替手段の提示
- **GPS精度低下**: 警告表示と対処法案内
- **位置情報権限エラー**: 権限再要求

#### 4.2 ストレージエラー
- **容量不足**: 空き容量警告
- **保存失敗**: 自動リトライとエラー表示
- **データ破損**: データ整合性チェック

## 非機能要件

### 1. ユーザビリティ要件

#### 1.1 運転中操作対応
- **大きなタップターゲット**: 最小44x44px、推奨60x60px
- **片手操作対応**: 親指で届く範囲にメイン操作
- **簡単な操作フロー**: 最小限のタップ数で目的完了
- **音声フィードバック**: 操作時の音声確認（オプション）

#### 1.2 視認性
- **高コントラスト**: 日中屋外でも読みやすい
- **大きなフォントサイズ**: 最小18px以上
- **色覚対応**: 色のみに依存しない情報伝達
- **ナイトモード**: 夜間運転用の暗いテーマ

#### 1.3 レスポンシブデザイン
- **スマートフォン最適化**: 縦向き画面メイン
- **タブレット対応**: より詳細な情報表示
- **横画面対応**: ランドスケープモード

### 2. パフォーマンス要件

#### 2.1 レスポンス時間
- **画面表示**: 1秒以内に基本UI表示
- **GPS更新**: 3秒以内に位置情報更新
- **操作反応**: 0.5秒以内にフィードバック表示

#### 2.2 リソース使用量
- **バッテリー**: 1時間の記録で5%以下の消費
- **メモリ**: 50MB以下の使用量
- **CPU**: バックグラウンド処理でのCPU使用率最小化

### 3. 信頼性要件

#### 3.1 データ保護
- **自動保存**: 5分間隔での自動保存
- **障害復旧**: アプリクラッシュ時の記録復旧
- **データ整合性**: 保存データの検証

#### 3.2 継続性
- **スリープ対応**: 画面スリープ中も記録継続
- **バックグラウンド処理**: アプリ切替時の記録継続
- **ネットワーク断絶**: オフライン時の記録継続

### 4. セキュリティ要件

#### 4.1 プライバシー保護
- **位置情報暗号化**: ローカルストレージでの暗号化
- **データ匿名化**: 個人特定不可能な形式での保存
- **アクセス制御**: 不要なデータアクセス防止

#### 4.2 データ管理
- **データ保持期間**: ユーザー設定可能な自動削除
- **データエクスポート**: いつでも完全エクスポート可能
- **データ削除**: 完全削除機能

## API設計

### 1. Component Interface

```typescript
interface RecordingScreenProps {
  className?: string;
  onRecordComplete?: (log: DrivingLog) => void;
  onRecordCancel?: () => void;
  onNavigate?: (route: string) => void;
}

interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  startTime?: Date;
  elapsedTime: number;
  currentLocation?: Location;
  gpsStatus: GPSStatus;
  waypoints: Waypoint[];
  statistics: RecordingStatistics;
  errors: RecordingError[];
}

interface RecordingStatistics {
  distance: number;
  averageSpeed: number;
  maxSpeed: number;
  stopTime: number;
  movingTime: number;
}

interface GPSStatus {
  isAvailable: boolean;
  accuracy: number; // meters
  signal: 'excellent' | 'good' | 'fair' | 'poor' | 'none';
  lastUpdate: Date;
}

interface Waypoint {
  id: string;
  location: Location;
  timestamp: Date;
  name?: string;
  type: WaypointType;
  notes?: string;
}

type WaypointType = 'start' | 'end' | 'fuel' | 'rest' | 'parking' | 'other';

interface RecordingError {
  type: 'GPS' | 'STORAGE' | 'BATTERY' | 'NETWORK';
  message: string;
  recoverable: boolean;
  action?: () => void;
}
```

### 2. Hook Interface

```typescript
interface UseRecording {
  state: RecordingState;
  actions: {
    startRecording: () => Promise<void>;
    pauseRecording: () => void;
    resumeRecording: () => void;
    completeRecording: () => Promise<DrivingLog>;
    cancelRecording: () => void;
    addWaypoint: (name?: string, type?: WaypointType) => void;
    updateWaypointName: (id: string, name: string) => void;
    removeWaypoint: (id: string) => void;
    dismissError: (index: number) => void;
  };
}
```

### 3. Service Integration

```typescript
interface RecordingService {
  // 記録制御
  startRecording(): Promise<string>; // returns recordId
  pauseRecording(recordId: string): Promise<void>;
  resumeRecording(recordId: string): Promise<void>;
  completeRecording(recordId: string): Promise<DrivingLog>;
  cancelRecording(recordId: string): Promise<void>;
  
  // 位置情報
  getCurrentLocation(): Promise<Location>;
  watchLocation(callback: (location: Location) => void): string; // returns watchId
  clearLocationWatch(watchId: string): void;
  
  // ウェイポイント管理
  addWaypoint(recordId: string, waypoint: Omit<Waypoint, 'id'>): Promise<Waypoint>;
  updateWaypoint(recordId: string, waypointId: string, updates: Partial<Waypoint>): Promise<void>;
  removeWaypoint(recordId: string, waypointId: string): Promise<void>;
  
  // 統計計算
  calculateStatistics(recordId: string): Promise<RecordingStatistics>;
  
  // エラー処理
  onError(callback: (error: RecordingError) => void): void;
}
```

## UI設計

### 1. コンポーネント構造

```
RecordingScreen
├── RecordingHeader
│   ├── BackButton
│   ├── ElapsedTime
│   └── RecordingStatus
├── GPSIndicator
│   ├── SignalStrength
│   ├── AccuracyDisplay
│   └── CoordinateInfo
├── MainControls
│   ├── PauseResumeButton
│   ├── CompleteButton
│   └── CancelButton
├── WaypointSection
│   ├── AddWaypointButton
│   ├── WaypointList
│   └── WaypointItem[]
├── StatisticsPanel
│   ├── DistanceDisplay
│   ├── SpeedDisplay
│   └── TimeDisplay
├── QuickActions
│   ├── FuelStopButton
│   ├── RestBreakButton
│   └── ParkingButton
└── ErrorDisplay
    ├── ErrorMessage[]
    └── RetryButton[]
```

### 2. レイアウト仕様

#### 2.1 スマートフォン（縦画面）
```
┌─────────────────────┐
│ Header (Time/Status)│ 60px
├─────────────────────┤
│ GPS Indicator       │ 80px
├─────────────────────┤
│ Main Controls       │ 120px
├─────────────────────┤
│ Statistics Panel    │ 100px
├─────────────────────┤
│ Quick Actions       │ 80px
├─────────────────────┤
│ Waypoint Section    │ flexible
├─────────────────────┤
│ Error Display       │ auto
└─────────────────────┘
```

#### 2.2 横画面モード
```
┌─────────────┬───────────────┐
│ GPS & Stats │ Main Controls │
│             │ & Quick       │
├─────────────┤ Actions       │
│ Waypoints   │               │
│ List        │               │
├─────────────┼───────────────┤
│ Error Display (if any)      │
└─────────────────────────────┘
```

### 3. スタイリング仕様

#### 3.1 カラーパレット
- **記録中**: #4CAF50 (Green)
- **一時停止**: #FF9800 (Orange)
- **警告**: #FF5722 (Red)
- **GPS良好**: #2196F3 (Blue)
- **GPS不良**: #9E9E9E (Gray)
- **背景**: #FAFAFA (Light Gray)
- **テキスト**: #212121 (Dark Gray)

#### 3.2 タイポグラフィ
- **タイマー表示**: 32px, Bold, Monospace
- **GPS状態**: 24px, Medium
- **統計数値**: 20px, Medium
- **ボタンテキスト**: 18px, Medium
- **ラベル**: 16px, Regular

#### 3.3 コンポーネントスタイル
- **ボタンサイズ**: 最小60x60px
- **角丸**: 12px（大きなボタン）、8px（小さなボタン）
- **影**: box-shadow: 0 4px 8px rgba(0,0,0,0.1)
- **パディング**: 20px (セクション間), 16px (コンテンツ内)
- **マージン**: 16px (コンポーネント間), 8px (要素間)

## テスト要件

### 1. ユニットテスト

#### 1.1 コンポーネントテスト
- **レンダリング**: 各状態での正常表示
- **プロパティ**: props の正しい受け渡し
- **イベント**: ユーザー操作への適切な反応
- **状態管理**: 内部状態の正確な更新

#### 1.2 フックテスト
- **記録制御**: 開始・一時停止・完了の処理
- **位置情報**: GPS監視と位置更新
- **統計計算**: リアルタイム統計の正確性
- **エラーハンドリング**: 各種エラーの適切な処理

### 2. 統合テスト

#### 2.1 GPS統合
- **位置取得**: 実際のGPS機能との連携
- **精度判定**: GPS精度による状態変更
- **エラー処理**: GPS利用不可時の動作

#### 2.2 ストレージ統合
- **自動保存**: 定期的なデータ保存
- **復旧機能**: 異常終了からの復旧
- **データ整合性**: 保存データの検証

### 3. E2Eテスト

#### 3.1 記録フロー
- **完全な記録**: 開始から完了までの流れ
- **中断・再開**: 一時停止機能の確認
- **エラー回復**: エラー発生時の対応

#### 3.2 ユーザビリティ
- **運転中操作**: 実際の運転環境での操作性
- **レスポンシブ**: 各デバイスサイズでの動作
- **アクセシビリティ**: 支援技術での利用可能性

## 実装優先順位

### Phase 1: 基本機能（必須）
1. RecordingScreen コンポーネントの基本構造
2. 記録制御機能（開始・一時停止・完了）
3. GPS状態表示とリアルタイム更新
4. 基本的な統計表示

### Phase 2: 安全性対応（重要）
1. 大きなタッチターゲット
2. 高コントラストデザイン
3. エラーハンドリング
4. 自動保存機能

### Phase 3: 拡張機能（推奨）
1. ウェイポイント機能
2. クイックアクション
3. 詳細統計表示
4. カスタマイズ機能

## 成功基準

### 機能面
- ✅ 記録の開始・一時停止・完了が正常動作する
- ✅ GPS状態がリアルタイムで正確に表示される
- ✅ 統計情報が正しく計算・表示される
- ✅ ウェイポイントの追加・管理が動作する

### 安全性面
- ✅ 運転中でも安全に操作できる
- ✅ 大きなタッチターゲットで誤操作を防ぐ
- ✅ 高コントラストで視認性を確保
- ✅ 最小限の操作で目的を達成できる

### 品質面
- ✅ レスポンス時間要件を満たす
- ✅ バッテリー消費を最小限に抑える
- ✅ メモリ使用量が基準内
- ✅ 各種エラーに適切に対応

### ユーザー体験面
- ✅ 直感的で分かりやすいインターフェース
- ✅ スムーズな操作感
- ✅ 適切なフィードバック
- ✅ 信頼性の高い記録機能