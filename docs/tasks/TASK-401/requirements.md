# TASK-401: CSV Service Implementation - 要件定義

## 概要

運転日報データのCSVエクスポート機能を提供するサービスの実装。
プライバシー保護とパフォーマンスを重視し、大量データの効率的な処理を実現する。

## 機能要件

### 1. CSVデータ生成機能

#### 1.1 基本CSV生成
- **機能**: 運転日報データをCSV形式に変換
- **入力**: DrivingLogModel配列
- **出力**: CSV文字列またはBlob
- **仕様**:
  - UTF-8エンコーディング
  - BOM付きCSV（Excel対応）
  - カスタムヘッダー設定可能
  - 日付フォーマットのカスタマイズ

#### 1.2 フィールド選択機能
- **機能**: エクスポート対象フィールドの選択
- **設定可能項目**:
  - 基本情報（日付、時刻、ステータス）
  - 地点情報（出発地、到着地、経由地）
  - 距離・時間情報
  - メモ・目的
  - GPS座標（オプション）
  - 個人情報（ドライバー名、車両番号）

#### 1.3 データフィルタリング
- **機能**: エクスポート前のデータ絞り込み
- **フィルター条件**:
  - 期間指定（開始日〜終了日）
  - ステータス指定
  - 距離範囲指定
  - 特定地点を含む記録のみ
  - 完了済み記録のみ

### 2. プライバシー保護機能

#### 2.1 個人情報フィルタリング
- **機能**: 個人情報の除外・匿名化
- **対象データ**:
  - ドライバー名の匿名化
  - 車両番号の匿名化
  - GPS座標の丸め（精度調整）
  - 具体的な住所の除外

#### 2.2 データマスキング
- **機能**: センシティブ情報の部分マスキング
- **例**:
  - ドライバー名: "田中太郎" → "田中***"
  - 車両番号: "品川123あ4567" → "***123***567"
  - 住所: "東京都新宿区西新宿1-1-1" → "東京都新宿区***"

### 3. エクスポートオプション機能

#### 3.1 形式オプション
- **CSV区切り文字**: カンマ、セミコロン、タブ
- **文字エンコーディング**: UTF-8 (BOM), UTF-8, Shift_JIS
- **改行コード**: CRLF, LF
- **クォート設定**: 全フィールド、必要時のみ

#### 3.2 日付フォーマット
- **標準形式**: YYYY-MM-DD, YYYY/MM/DD
- **時刻形式**: HH:mm, HH:mm:ss
- **和暦対応**: 令和6年1月1日
- **ISO8601形式**: 2024-01-01T09:00:00+09:00

#### 3.3 数値フォーマット
- **距離単位**: km, m, mile
- **時間単位**: 分, 時間:分, 秒
- **小数点桁数**: 0〜3桁
- **3桁区切り**: カンマ、なし

### 4. パフォーマンス機能

#### 4.1 大量データ処理
- **ストリーミング処理**: メモリ効率的な変換
- **チャンク処理**: 1000件単位での分割処理
- **プログレス報告**: 処理進捗の通知
- **キャンセル機能**: 長時間処理の中断

#### 4.2 バックグラウンド処理
- **Web Worker利用**: UIブロックの回避
- **非同期処理**: Promise/async-awaitベース
- **エラーハンドリング**: 適切な例外処理

## 非機能要件

### 1. パフォーマンス要件

#### 1.1 処理時間
- **少量データ（100件未満）**: 1秒以内
- **中量データ（1000件未満）**: 5秒以内
- **大量データ（3000件）**: 10秒以内
- **超大量データ（10000件）**: 30秒以内

#### 1.2 メモリ使用量
- **最大メモリ使用量**: 100MB以下
- **ストリーミング処理**: 同時保持データ1000件以下
- **ガベージコレクション**: 適切なメモリ解放

#### 1.3 ファイルサイズ
- **圧縮率**: 元データの30-50%
- **最大ファイルサイズ**: 50MB
- **分割エクスポート**: 大量データ時の分割機能

### 2. 品質要件

#### 2.1 正確性
- **データ整合性**: 100%の正確性
- **文字エンコーディング**: 文字化けなし
- **数値精度**: 小数点以下の精度保持

#### 2.2 信頼性
- **エラー率**: 0.1%以下
- **データ欠損**: ゼロ
- **フォーマット整合性**: 標準CSV準拠

### 3. セキュリティ要件

#### 3.1 データ保護
- **一時ファイル**: メモリ内処理、ディスク未保存
- **データ暗号化**: 必要に応じてAES暗号化
- **アクセス制御**: 適切な権限チェック

#### 3.2 プライバシー
- **GDPR準拠**: 個人データの適切な処理
- **匿名化**: 可逆性のない匿名化処理
- **同意管理**: エクスポート前の確認

## 技術要件

### 1. 使用技術

#### 1.1 ライブラリ
- **CSV生成**: Papa Parse または カスタム実装
- **文字エンコーディング**: TextEncoder/TextDecoder
- **圧縮**: pako (gzip圧縮)
- **Web Worker**: 重い処理の分離

#### 1.2 ブラウザAPI
- **File API**: ファイル生成・ダウンロード
- **Blob API**: バイナリデータ処理
- **URL.createObjectURL**: ダウンロードURL生成
- **Worker API**: バックグラウンド処理

### 2. 依存関係

#### 2.1 内部依存
- **StorageService**: データ取得
- **DrivingLogModel**: データモデル
- **LocationModel**: 地点データ
- **型定義**: TypeScript型

#### 2.2 外部依存
- **最小限の外部ライブラリ**: 軽量化のため
- **ポリフィル**: 古いブラウザ対応
- **型定義**: @types パッケージ

## API設計

### 1. CSVService インターフェース

```typescript
interface ICSVService {
  // CSV生成
  generateCSV(data: DrivingLogModel[], options?: ExportOptions): Promise<string>;
  generateCSVBlob(data: DrivingLogModel[], options?: ExportOptions): Promise<Blob>;
  
  // ストリーミング生成
  generateCSVStream(data: DrivingLogModel[], options?: ExportOptions): AsyncGenerator<string>;
  
  // フィールド設定
  setFieldMapping(mapping: FieldMapping): void;
  getAvailableFields(): ExportField[];
  
  // フォーマット設定
  setFormatOptions(options: FormatOptions): void;
  getFormatOptions(): FormatOptions;
  
  // プライバシー設定
  setPrivacyOptions(options: PrivacyOptions): void;
  
  // バリデーション
  validateData(data: DrivingLogModel[]): ValidationResult;
  validateOptions(options: ExportOptions): ValidationResult;
}
```

### 2. オプション型定義

```typescript
interface ExportOptions {
  // フィールド選択
  fields?: ExportField[];
  excludeFields?: ExportField[];
  
  // フィルタリング
  dateRange?: DateRange;
  statusFilter?: DrivingLogStatus[];
  distanceRange?: NumberRange;
  
  // フォーマット
  format?: FormatOptions;
  privacy?: PrivacyOptions;
  
  // パフォーマンス
  chunkSize?: number;
  useWebWorker?: boolean;
  
  // コールバック
  onProgress?: (progress: ProgressInfo) => void;
  onError?: (error: Error) => void;
}

interface FormatOptions {
  delimiter: ',' | ';' | '\t';
  encoding: 'utf-8' | 'utf-8-bom' | 'shift_jis';
  lineEnding: '\r\n' | '\n';
  quote: 'all' | 'minimal' | 'none';
  dateFormat: string;
  timeFormat: string;
  numberFormat: NumberFormatOptions;
}

interface PrivacyOptions {
  anonymizeDriverName: boolean;
  anonymizeVehicleNumber: boolean;
  excludeGPSCoordinates: boolean;
  maskSensitiveLocations: boolean;
  coordinatePrecision: number;
}
```

## エラーハンドリング

### 1. エラー種別

#### 1.1 データエラー
- **InvalidDataError**: 不正なデータ形式
- **MissingFieldError**: 必須フィールド不足
- **DataValidationError**: バリデーション失敗

#### 1.2 処理エラー
- **MemoryError**: メモリ不足
- **ProcessingError**: 処理中のエラー
- **TimeoutError**: 処理タイムアウト

#### 1.3 ブラウザエラー
- **BrowserNotSupportedError**: ブラウザ未対応
- **FileSystemError**: ファイル操作エラー
- **WorkerError**: Web Worker エラー

### 2. エラー処理方針

#### 2.1 復旧可能エラー
- **リトライ機能**: 自動再試行
- **部分処理**: エラー行をスキップして継続
- **代替処理**: フォールバック機能

#### 2.2 復旧不可能エラー
- **適切なエラーメッセージ**: ユーザーフレンドリーな通知
- **ログ出力**: デバッグ用の詳細情報
- **状態リセット**: 安全な初期状態への復帰

## テスト要件

### 1. ユニットテスト
- **カバレッジ**: 90%以上
- **境界値テスト**: 最小・最大データでのテスト
- **異常系テスト**: エラー条件での動作確認

### 2. 統合テスト
- **エンドツーエンド**: データ取得からファイル生成まで
- **パフォーマンステスト**: 大量データでの性能確認
- **ブラウザ互換性**: 主要ブラウザでの動作確認

### 3. モックテスト
- **大量データ**: 10,000件のモックデータ
- **異常データ**: 不正・欠損データ
- **エッジケース**: 特殊文字、長いテキスト

## 運用要件

### 1. 監視・ログ
- **処理時間**: エクスポート処理の時間計測
- **エラー率**: エラー発生率の監視
- **使用状況**: 機能利用状況の記録

### 2. メンテナンス
- **設定更新**: フォーマット設定の動的更新
- **フィールド追加**: 新しいエクスポートフィールドの追加
- **バージョン管理**: CSV形式のバージョン管理