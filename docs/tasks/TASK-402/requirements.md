# TASK-402: Export Controller Implementation - 要件定義

## 概要

CSV Service を利用して運転日報データのエクスポート機能を提供するコントローラーの実装。
ユーザーフレンドリーなインターフェースと確実なエクスポート処理を実現する。

## 機能要件

### 1. エクスポート設定管理

#### 1.1 エクスポート設定の保存・読み込み
- **機能**: ユーザーが設定したエクスポート設定の永続化
- **設定項目**:
  - フィールド選択（含める/除外するフィールド）
  - フィルタリング設定（日付範囲、ステータス、距離範囲）
  - フォーマット設定（区切り文字、エンコーディング、日付形式）
  - プライバシー設定（匿名化レベル、GPS精度）
  - ファイル名テンプレート
- **仕様**:
  - 設定をプリセットとして保存可能
  - デフォルト設定の提供
  - 設定の検証とエラーハンドリング

#### 1.2 プリセット管理
- **機能**: よく使用するエクスポート設定のプリセット化
- **仕様**:
  - プリセットの作成・更新・削除
  - プリセット名と説明の設定
  - プリセットの一覧表示
  - デフォルトプリセットの設定

### 2. エクスポート実行機能

#### 2.1 基本エクスポート
- **機能**: 指定された設定でのCSVエクスポート実行
- **入力**: エクスポート設定、データ範囲
- **出力**: CSVファイルのダウンロード
- **仕様**:
  - Storage Service からのデータ取得
  - CSV Service を利用したCSV生成
  - ブラウザダウンロード機能の実行

#### 2.2 プログレス表示
- **機能**: エクスポート進行状況の可視化
- **表示内容**:
  - 現在の処理段階（データ取得、変換、生成中）
  - 進行率（％表示）
  - 処理済み/総レコード数
  - 推定残り時間
  - キャンセルボタン

#### 2.3 大量データ対応
- **機能**: 大量データの効率的なエクスポート処理
- **仕様**:
  - ストリーミング処理によるメモリ効率化
  - Web Worker による UI ブロッキング回避
  - 分割ダウンロード（必要に応じて）

### 3. ダウンロード機能

#### 3.1 ファイル生成・ダウンロード
- **機能**: 生成されたCSVファイルのダウンロード
- **仕様**:
  - 適切なファイル名の自動生成
  - ダウンロード完了通知
  - ダウンロード履歴の記録

#### 3.2 ファイル名生成
- **機能**: エクスポート内容に応じたファイル名の自動生成
- **テンプレート例**:
  - 基本: `driving-log-{YYYY-MM-DD}.csv`
  - 期間指定: `driving-log-{START_DATE}-{END_DATE}.csv`
  - フィルタ付き: `driving-log-{STATUS}-{YYYY-MM-DD}.csv`
- **カスタマイズ**: ユーザー定義テンプレート対応

### 4. エラーハンドリング

#### 4.1 エクスポートエラー対応
- **エラー種別**:
  - データ取得エラー
  - CSV生成エラー
  - ファイルダウンロードエラー
  - ブラウザ制限エラー
- **対応方針**:
  - エラーの詳細表示
  - 再試行オプション
  - 代替手段の提案

#### 4.2 ユーザーフレンドリーなエラー表示
- **機能**: 技術的エラーの分かりやすい説明
- **例**:
  - "データが多すぎます" → "データ量が多いため、期間を短くするか、フィルターを使用してください"
  - "ダウンロードに失敗しました" → "ネットワークエラーです。再試行ボタンをクリックしてください"

## 非機能要件

### 1. パフォーマンス要件

#### 1.1 レスポンス時間
- **設定変更**: 0.5秒以内の UI 反映
- **エクスポート開始**: 2秒以内の処理開始
- **プログレス更新**: 1秒間隔での更新

#### 1.2 データ処理能力
- **小量データ（～100件）**: 3秒以内
- **中量データ（～1000件）**: 10秒以内
- **大量データ（～3000件）**: 30秒以内

### 2. ユーザビリティ要件

#### 2.1 直感的な操作
- **設定画面**: 段階的な設定フロー
- **プログレス表示**: 明確な進行状況
- **エラー回復**: 簡単な再試行手順

#### 2.2 アクセシビリティ
- **キーボード操作**: 全機能のキーボード対応
- **スクリーンリーダー**: 適切な ARIA 属性
- **色覚異常対応**: 色以外の情報表示

### 3. 信頼性要件

#### 3.1 データ整合性
- **エクスポート精度**: 100%の正確性
- **設定保存**: 確実な永続化
- **状態管理**: 一貫した状態保持

#### 3.2 エラー回復力
- **一時的エラー**: 自動リトライ機能
- **致命的エラー**: 安全な初期状態復帰
- **中断処理**: 処理中断時の適切なクリーンアップ

## 技術要件

### 1. アーキテクチャ

#### 1.1 Controller パターン
- **責務**: UI とビジネスロジックの仲介
- **依存関係**: CSV Service, Storage Service
- **状態管理**: エクスポート設定とプログレス状態

#### 1.2 非同期処理
- **Promise ベース**: async/await の活用
- **Web Worker**: 重い処理の分離
- **キャンセル機能**: AbortController の使用

### 2. 使用技術

#### 2.1 フロントエンド技術
- **TypeScript**: 型安全な実装
- **Service Layer**: CSV Service の活用
- **Storage API**: 設定の永続化

#### 2.2 ブラウザ API
- **File API**: ファイル生成・ダウンロード
- **Web Worker**: バックグラウンド処理
- **Notification API**: 完了通知

## API設計

### 1. Export Controller インターフェース

```typescript
interface IExportController {
  // 設定管理
  saveExportSettings(settings: ExportSettings): Promise<void>;
  loadExportSettings(): Promise<ExportSettings>;
  getDefaultSettings(): ExportSettings;
  
  // プリセット管理
  savePreset(preset: ExportPreset): Promise<void>;
  getPresets(): Promise<ExportPreset[]>;
  deletePreset(presetId: string): Promise<void>;
  
  // エクスポート実行
  startExport(options: ExportOptions): Promise<ExportResult>;
  cancelExport(): Promise<void>;
  
  // プログレス監視
  onProgress(callback: (progress: ExportProgress) => void): void;
  onComplete(callback: (result: ExportResult) => void): void;
  onError(callback: (error: ExportError) => void): void;
  
  // ファイル管理
  generateFileName(options: ExportOptions): string;
  downloadFile(blob: Blob, fileName: string): Promise<void>;
  
  // 状態管理
  isExporting(): boolean;
  getCurrentProgress(): ExportProgress | null;
}
```

### 2. 型定義

```typescript
interface ExportSettings {
  fields: ExportField[];
  excludeFields?: ExportField[];
  filters: ExportFilters;
  format: FormatOptions;
  privacy: PrivacyOptions;
  fileNameTemplate: string;
}

interface ExportPreset {
  id: string;
  name: string;
  description: string;
  settings: ExportSettings;
  isDefault: boolean;
  createdAt: Date;
  lastUsed?: Date;
}

interface ExportOptions extends ExportSettings {
  useWebWorker?: boolean;
  chunkSize?: number;
  onProgress?: (progress: ExportProgress) => void;
  onError?: (error: ExportError) => void;
}

interface ExportProgress {
  phase: 'preparing' | 'fetching' | 'processing' | 'generating' | 'downloading';
  percentage: number;
  current: number;
  total: number;
  estimatedTimeRemaining?: number;
  canCancel: boolean;
}

interface ExportResult {
  success: boolean;
  fileName: string;
  fileSize: number;
  recordCount: number;
  processingTime: number;
  downloadUrl?: string;
  errors?: ExportError[];
}

interface ExportError {
  code: string;
  message: string;
  details?: any;
  recoverable: boolean;
  suggestion?: string;
}
```

## ユーザーストーリー

### US-1: 基本エクスポート
**As a** ユーザー  
**I want to** 運転日報データをCSV形式でエクスポートしたい  
**So that** Excelで分析やレポート作成ができる

**受け入れ基準**:
- エクスポートボタンをクリックしてCSVダウンロードできる
- ファイル名が自動生成される
- データが正確にエクスポートされる

### US-2: カスタムエクスポート
**As a** パワーユーザー  
**I want to** エクスポート設定をカスタマイズしたい  
**So that** 必要なデータのみを適切な形式で取得できる

**受け入れ基準**:
- フィールド選択ができる
- フィルタリング条件を設定できる
- フォーマット設定を変更できる
- 設定をプリセットとして保存できる

### US-3: プログレス確認
**As a** ユーザー  
**I want to** エクスポート進行状況を確認したい  
**So that** 処理の完了を待つことができる

**受け入れ基準**:
- プログレスバーが表示される
- 現在の処理段階が分かる
- 残り時間の目安が表示される
- 処理をキャンセルできる

### US-4: エラー対応
**As a** ユーザー  
**I want to** エクスポートでエラーが発生した場合に適切に対応したい  
**So that** データを確実にエクスポートできる

**受け入れ基準**:
- エラーメッセージが分かりやすい
- 再試行ボタンが提供される
- エラーの原因と対処法が示される

## テスト要件

### 1. 単体テスト
- **設定管理**: 保存・読み込み・バリデーション
- **プリセット管理**: CRUD操作
- **エクスポート処理**: 各種設定での実行
- **エラーハンドリング**: 異常系処理

### 2. 統合テスト
- **CSV Service 連携**: 実際のCSV生成
- **Storage Service 連携**: データ取得・設定保存
- **Browser API**: ファイルダウンロード

### 3. UI/UX テスト
- **プログレス表示**: 正確な進行状況
- **エラー表示**: 適切なメッセージ
- **レスポンシブ**: モバイル対応

## セキュリティ要件

### 1. データ保護
- **一時データ**: メモリ内処理、ディスク未保存
- **個人情報**: プライバシー設定の適用
- **設定データ**: ローカルストレージの適切な利用

### 2. 入力検証
- **設定値**: 不正な設定の検出・拒否
- **ファイル名**: 安全なファイル名生成
- **データ量**: 過大なリクエストの制限

## 実装優先順位

### Phase 1: コア機能（必須）
1. 基本エクスポート機能
2. 設定管理（保存・読み込み）
3. プログレス表示
4. エラーハンドリング

### Phase 2: 拡張機能（重要）
1. プリセット管理
2. カスタムファイル名
3. Web Worker 対応
4. 詳細なプログレス情報

### Phase 3: 最適化機能（推奨）
1. ストリーミング処理
2. 分割ダウンロード
3. 高度なエラー回復
4. パフォーマンス最適化

## 成功基準

### 機能面
- ✅ CSV エクスポートが正常に動作する
- ✅ 設定の保存・読み込みが正確に行われる
- ✅ エラー時に適切な対応ができる
- ✅ 大量データでも安定して動作する

### 品質面
- ✅ テストカバレッジ 90% 以上
- ✅ 主要ブラウザでの動作確認
- ✅ アクセシビリティ基準の達成
- ✅ パフォーマンス要件の満足

### ユーザー体験面
- ✅ 直感的で使いやすい UI
- ✅ 分かりやすいエラーメッセージ
- ✅ スムーズな操作フロー
- ✅ 確実なファイルダウンロード