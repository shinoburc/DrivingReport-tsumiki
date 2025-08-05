# コンポーネント設計

## 概要

運転日報PWAのUIコンポーネント設計とインタラクション仕様を定義します。レスポンシブデザインに対応し、モバイルファーストでの実装を前提とします。

## 画面構成

### 1. メイン画面（Dashboard）
- **用途**: アプリのメイン画面、運転記録の開始点
- **構成要素**:
  - ヘッダー（アプリ名、設定ボタン）
  - 新規記録開始ボタン（大きなCTAボタン）
  - 最近の記録一覧（最大5件）
  - フッターナビゲーション

### 2. 運転記録画面（Recording）
- **用途**: 進行中の運転記録管理
- **構成要素**:
  - 進行状況インジケーター
  - 現在の地点情報表示
  - 地点追加ボタン（出発/経由/到着）
  - GPS状態表示
  - 記録完了ボタン

### 3. 履歴一覧画面（History）
- **用途**: 過去の運転記録の一覧と管理
- **構成要素**:
  - 検索・フィルター機能
  - 記録一覧（仮想スクロール対応）
  - エクスポートボタン
  - 削除機能

### 4. 記録詳細画面（Detail）
- **用途**: 個別の運転記録の詳細表示
- **構成要素**:
  - 記録情報の詳細表示
  - 地図表示（オプション）
  - 編集ボタン
  - 削除ボタン

### 5. 設定画面（Settings）
- **用途**: アプリケーション設定
- **構成要素**:
  - GPS設定
  - エクスポート設定
  - よく使う地点管理
  - データ管理

## UI コンポーネント詳細

### 共通コンポーネント

#### Header Component
```typescript
interface HeaderProps {
  title: string;
  showBackButton?: boolean;
  showMenuButton?: boolean;
  actions?: HeaderAction[];
}

interface HeaderAction {
  icon: string;
  label: string;
  onClick: () => void;
}
```

#### Button Component
```typescript
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'danger' | 'outline';
  size: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}
```

#### LocationInput Component
```typescript
interface LocationInputProps {
  value?: Location;
  type: LocationType;
  onLocationChange: (location: Location) => void;
  onGPSRequest: () => void;
  gpsStatus: 'idle' | 'loading' | 'success' | 'error';
}
```

#### NotificationToast Component
```typescript
interface NotificationToastProps {
  notification: NotificationMessage;
  onDismiss: (id: string) => void;
}
```

### 専用コンポーネント

#### DrivingLogCard Component
```typescript
interface DrivingLogCardProps {
  drivingLog: DrivingLog;
  onClick: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}
```

#### GPSStatusIndicator Component
```typescript
interface GPSStatusIndicatorProps {
  status: 'denied' | 'granted' | 'acquiring' | 'success' | 'error';
  accuracy?: number;
  lastUpdate?: Date;
}
```

#### ProgressIndicator Component
```typescript
interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
  steps: ProgressStep[];
}

interface ProgressStep {
  label: string;
  completed: boolean;
}
```

## レスポンシブデザイン

### ブレークポイント
```css
/* モバイル優先 */
:root {
  --breakpoint-sm: 480px;   /* スマートフォン縦 */
  --breakpoint-md: 768px;   /* タブレット縦 */
  --breakpoint-lg: 1024px;  /* タブレット横・小型PC */
  --breakpoint-xl: 1200px;  /* デスクトップ */
}
```

### レイアウトパターン

#### モバイル（〜768px）
- 単一カラムレイアウト
- スタック形式のナビゲーション
- 最小タップ領域: 44x44px

#### タブレット（768px〜1024px）
- 2カラムレイアウト（一覧+詳細）
- タブナビゲーション
- 画面の有効活用

#### デスクトップ（1024px〜）
- 3カラムレイアウト（ナビ+一覧+詳細）
- サイドバーナビゲーション
- マウス操作最適化

## ユーザビリティ設計

### タッチインターフェース
- **最小タップ領域**: 44x44px
- **スワイプジェスチャー**: 
  - 左スワイプ: 削除アクション
  - 右スワイプ: 編集アクション
- **長押し**: コンテキストメニュー表示

### アクセシビリティ
- **セマンティックHTML**: 適切なHTMLタグの使用
- **ARIA属性**: スクリーンリーダー対応
- **キーボードナビゲーション**: Tab移動対応
- **色以外の情報伝達**: アイコンとテキストの併用

### 状態フィードバック
- **ローディング状態**: スピナーとプログレスバー
- **成功/エラー状態**: 色とアイコンによる視覚的フィードバック
- **空状態**: 適切なメッセージとアクション提案

## パフォーマンス考慮事項

### 仮想スクロール
```typescript
interface VirtualScrollProps {
  items: any[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: any, index: number) => React.ReactNode;
}
```

### 遅延読み込み
- 画像の遅延読み込み
- 大きなリストのページネーション
- 必要時のみコンポーネント読み込み

### メモ化
- 重い計算処理のメモ化
- 不要な再レンダリング防止
- 状態の適切な分割

## アニメーション設計

### 画面遷移
```css
.page-transition {
  transition: transform 0.3s ease-out, opacity 0.3s ease-out;
}

.slide-enter {
  transform: translateX(100%);
  opacity: 0;
}

.slide-enter-active {
  transform: translateX(0);
  opacity: 1;
}
```

### マイクロインタラクション
- ボタンホバー/タップ効果
- 入力フィールドフォーカス効果
- 成功/エラー時のフィードバック

## テーマ設計

### カラーパレット
```css
:root {
  /* プライマリーカラー */
  --color-primary: #2563eb;
  --color-primary-dark: #1d4ed8;
  --color-primary-light: #3b82f6;
  
  /* セカンダリーカラー */
  --color-secondary: #64748b;
  --color-secondary-dark: #475569;
  --color-secondary-light: #94a3b8;
  
  /* システムカラー */
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
  --color-info: #3b82f6;
  
  /* ニュートラルカラー */
  --color-gray-50: #f8fafc;
  --color-gray-100: #f1f5f9;
  --color-gray-200: #e2e8f0;
  --color-gray-300: #cbd5e1;
  --color-gray-400: #94a3b8;
  --color-gray-500: #64748b;
  --color-gray-600: #475569;
  --color-gray-700: #334155;
  --color-gray-800: #1e293b;
  --color-gray-900: #0f172a;
}
```

### タイポグラフィ
```css
:root {
  --font-family-base: 'Hiragino Sans', 'Yu Gothic UI', sans-serif;
  --font-family-mono: 'SF Mono', 'Monaco', monospace;
  
  --font-size-xs: 0.75rem;   /* 12px */
  --font-size-sm: 0.875rem;  /* 14px */
  --font-size-base: 1rem;    /* 16px */
  --font-size-lg: 1.125rem;  /* 18px */
  --font-size-xl: 1.25rem;   /* 20px */
  --font-size-2xl: 1.5rem;   /* 24px */
  --font-size-3xl: 1.875rem; /* 30px */
  
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
}
```

### スペーシング
```css
:root {
  --spacing-1: 0.25rem;  /* 4px */
  --spacing-2: 0.5rem;   /* 8px */
  --spacing-3: 0.75rem;  /* 12px */
  --spacing-4: 1rem;     /* 16px */
  --spacing-5: 1.25rem;  /* 20px */
  --spacing-6: 1.5rem;   /* 24px */
  --spacing-8: 2rem;     /* 32px */
  --spacing-10: 2.5rem;  /* 40px */
  --spacing-12: 3rem;    /* 48px */
  --spacing-16: 4rem;    /* 64px */
}
```