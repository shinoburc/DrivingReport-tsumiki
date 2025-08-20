// ========================================
// エンティティ定義
// ========================================

/**
 * 運転日報エンティティ
 */
export interface DrivingLog {
  id: string;                    // UUID
  date: Date;                    // 運転日
  startTime?: Date;              // 開始時刻
  endTime?: Date;                // 終了時刻
  driverName?: string;           // ドライバー名（オプション）
  vehicleNumber?: string;        // 車両番号（オプション）
  startLocation: Location;       // 出発地点
  waypoints: Location[];         // 経由地点（複数）
  endLocation?: Location;        // 到着地点
  totalDistance?: number;        // 総走行距離（km）
  duration?: number;             // 所要時間（分）
  purpose?: string;              // 目的
  memo?: string;                 // メモ
  status: DrivingLogStatus;      // ステータス
  createdAt: Date;              // 作成日時
  updatedAt: Date;              // 更新日時
  deletedAt?: Date;             // 削除日時（論理削除）
}

/**
 * 位置情報エンティティ
 */
export interface Location {
  id: string;                    // UUID
  name?: string;                 // 地点名
  address?: string;              // 住所
  latitude?: number;             // 緯度
  longitude?: number;            // 経度
  accuracy?: number;             // GPS精度（メートル）
  timestamp: Date;               // 記録日時
  type: LocationType;            // 地点タイプ
  note?: string;                 // メモ
  imageDataUrl?: string;         // 写真（Base64）
}


/**
 * アプリケーション設定
 */
export interface AppSettings {
  language: 'ja' | 'en';         // 言語設定
  theme: 'light' | 'dark' | 'auto'; // テーマ設定
  gpsTimeout: number;            // GPS取得タイムアウト（秒）
  gpsAccuracyThreshold: number;  // GPS精度閾値（メートル）
  exportFormat: ExportFormat;    // エクスポート形式
  defaultExportPeriod: number;   // デフォルトエクスポート期間（日数）
  exportPrivacyLevel: 'full' | 'approximate' | 'minimal'; // エクスポートプライバシーレベル
  autoExportEnabled: boolean;    // 自動エクスポート有効化
  autoExportFrequency: 'weekly' | 'monthly' | 'manual'; // 自動エクスポート頻度
  favoriteLocations: FavoriteLocation[]; // よく使う地点
  notificationsEnabled: boolean; // 通知有効化
  offlineModeEnabled: boolean;   // オフラインモード有効化
  autoClearDataEnabled: boolean; // 自動データクリア有効化
  compactMode?: boolean;         // コンパクトモード
  showTutorial?: boolean;        // チュートリアル表示
  firstLaunchDate?: Date;        // 初回起動日
  appVersion?: string;           // アプリバージョン
  lastBackupDate?: Date;         // 最終バックアップ日
  driverName?: string;           // ドライバー名
  vehicleInfo?: VehicleInfo;     // 車両情報
}

/**
 * 車両情報
 */
export interface VehicleInfo {
  make?: string;        // メーカー
  model?: string;       // 車種
  year?: number;        // 年式
  licensePlate?: string; // ナンバープレート
}

// FavoriteLocation interface already defined above with Service Worker integration

// ========================================
// 列挙型定義
// ========================================

/**
 * 運転日報ステータス
 */
export enum DrivingLogStatus {
  IN_PROGRESS = 'IN_PROGRESS',   // 記録中
  COMPLETED = 'COMPLETED',       // 完了
  CANCELLED = 'CANCELLED'        // キャンセル
}

/**
 * 地点タイプ
 */
export enum LocationType {
  START = 'START',               // 出発地点
  WAYPOINT = 'WAYPOINT',         // 経由地点
  END = 'END',                   // 到着地点
  GPS = 'GPS',                   // GPS取得地点
  DEPARTURE = 'DEPARTURE',       // 出発地点（別名）
  ARRIVAL = 'ARRIVAL',           // 到着地点（別名）
  MANUAL = 'MANUAL',             // 手動入力地点
  FUEL = 'FUEL',                 // 給油地点
  REST = 'REST',                 // 休憩地点
  PARKING = 'PARKING',           // 駐車地点
  CURRENT = 'CURRENT',           // 現在地点
  HOME = 'HOME',                 // 自宅
  WORK = 'WORK',                 // 職場
  OTHER = 'OTHER'                // その他
}

/**
 * エクスポート形式
 */
export enum ExportFormat {
  CSV = 'CSV',
  JSON = 'JSON'
}

// ========================================
// サービスインターフェース
// ========================================

/**
 * GPS位置情報取得レスポンス
 */
export interface GPSPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

/**
 * ストレージサービスのクエリオプション
 */
export interface QueryOptions {
  startDate?: Date;
  endDate?: Date;
  status?: DrivingLogStatus;
  limit?: number;
  offset?: number;
  orderBy?: 'date' | 'createdAt' | 'updatedAt';
  order?: 'asc' | 'desc';
}

/**
 * CSVエクスポートオプション
 */
export interface ExportOptions {
  startDate?: Date;
  endDate?: Date;
  includePersonalInfo: boolean;
  includeGPSCoordinates: boolean;
  dateFormat: string;
}

// ========================================
// UIコンポーネントインターフェース
// ========================================

/**
 * 通知メッセージ
 */
export interface NotificationMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;             // 表示時間（ミリ秒）
  action?: NotificationAction;
}

/**
 * 通知アクション
 */
export interface NotificationAction {
  label: string;
  callback: () => void;
}

/**
 * フォーム検証エラー
 */
export interface ValidationError {
  field: string;
  message: string;
}

// ========================================
// ストレージスキーマ
// ========================================

/**
 * IndexedDBスキーマ定義
 */
export interface DatabaseSchema {
  drivingLogs: {
    key: string;
    value: DrivingLog;
    indexes: {
      'by-date': Date;
      'by-status': DrivingLogStatus;
      'by-createdAt': Date;
    };
  };
  locations: {
    key: string;
    value: Location;
    indexes: {
      'by-timestamp': Date;
      'by-type': LocationType;
    };
  };
  settings: {
    key: string;
    value: AppSettings;
  };
}

// ========================================
// イベントインターフェース
// ========================================

/**
 * アプリケーションイベント
 */
export interface AppEvent {
  type: AppEventType;
  timestamp: Date;
  data?: any;
}

/**
 * アプリケーションイベントタイプ
 */
export enum AppEventType {
  DRIVING_LOG_CREATED = 'DRIVING_LOG_CREATED',
  DRIVING_LOG_UPDATED = 'DRIVING_LOG_UPDATED',
  DRIVING_LOG_DELETED = 'DRIVING_LOG_DELETED',
  LOCATION_RECORDED = 'LOCATION_RECORDED',
  GPS_ERROR = 'GPS_ERROR',
  STORAGE_ERROR = 'STORAGE_ERROR',
  EXPORT_STARTED = 'EXPORT_STARTED',
  EXPORT_COMPLETED = 'EXPORT_COMPLETED',
  EXPORT_FAILED = 'EXPORT_FAILED',
  OFFLINE_DETECTED = 'OFFLINE_DETECTED',
  ONLINE_DETECTED = 'ONLINE_DETECTED'
}

// ========================================
// エラー定義
// ========================================

/**
 * アプリケーションエラー
 */
export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * エラーコード
 */
export enum ErrorCode {
  GPS_PERMISSION_DENIED = 'GPS_PERMISSION_DENIED',
  GPS_TIMEOUT = 'GPS_TIMEOUT',
  GPS_UNAVAILABLE = 'GPS_UNAVAILABLE',
  GPS_LOW_ACCURACY = 'GPS_LOW_ACCURACY',
  STORAGE_QUOTA_EXCEEDED = 'STORAGE_QUOTA_EXCEEDED',
  STORAGE_UNAVAILABLE = 'STORAGE_UNAVAILABLE',
  INVALID_DATA_FORMAT = 'INVALID_DATA_FORMAT',
  EXPORT_FAILED = 'EXPORT_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

// ========================================
// GPS サービス関連型定義
// ========================================

/**
 * GPS サービスオプション
 */
export interface GPSOptions {
  timeout: number;
  enableHighAccuracy: boolean;
  maximumAge: number;
  retryCount: number;
}

/**
 * 精度レベル
 */
export enum AccuracyLevel {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

/**
 * 権限状態
 */
export enum PermissionState {
  GRANTED = 'granted',
  DENIED = 'denied',
  PROMPT = 'prompt'
}

/**
 * GPS サービスインターフェース
 */
export interface IGPSService {
  getCurrentPosition(options?: Partial<GPSOptions>): Promise<any>; // LocationModel import避けるためanyにしておく
  checkPermission(): Promise<PermissionState>;
  requestPermission(): Promise<PermissionState>;
  updateOptions(options: Partial<GPSOptions>): void;
  getOptions(): GPSOptions;
  checkAccuracy(location: any): AccuracyLevel; // LocationModel import避けるためanyにしておく
  cleanup(): void;
  isAvailable(): boolean;
}

// ========================================
// Location Controller 関連型定義
// ========================================

/**
 * 記録オプション
 */
export interface RecordOptions {
  name?: string;              // 地点名
  type?: LocationType;        // 地点種類
  autoName?: boolean;         // 自動命名（日時ベース）
  requireHighAccuracy?: boolean; // 高精度要求
}

/**
 * 手動位置情報入力
 */
export interface ManualLocationInput {
  name: string;
  address?: string;           // 住所
  latitude?: number;          // 緯度
  longitude?: number;         // 経度
  type: LocationType;
  memo?: string;
}

/**
 * 検索条件
 */
export interface SearchCriteria {
  query?: string;             // 検索クエリ
  startDate?: Date;           // 開始日
  endDate?: Date;             // 終了日
  type?: LocationType;        // 地点種類
  favoriteOnly?: boolean;     // よく使う地点のみ
  sortBy?: 'date' | 'name' | 'distance';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
}

/**
 * よく使う地点
 */
export interface FavoriteLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  address?: string;
  type: LocationType;
  timestamp: Date;
  memo?: string;
  category?: string;          // カテゴリ
  usageCount: number;         // 使用回数
  lastUsed?: Date;           // 最終使用日時
  isDefault?: boolean;       // デフォルト地点フラグ
  icon?: string;             // アイコン
  color?: string;            // 色
  createdAt?: Date;          // 作成日時
}

/**
 * 位置情報コントローラーインターフェース
 */
export interface ILocationController {
  // GPS位置情報の記録
  recordCurrentLocation(options?: RecordOptions): Promise<any>;
  
  // 手動入力による地点記録
  recordManualLocation(input: ManualLocationInput): Promise<any>;
  
  // よく使う地点の追加
  addFavoriteLocation(location: any, category?: string): Promise<void>;
  
  // よく使う地点の取得
  getFavoriteLocations(category?: string): Promise<FavoriteLocation[]>;
  
  // よく使う地点の削除
  removeFavoriteLocation(locationId: string): Promise<void>;
  
  // 位置情報の検索
  searchLocations(criteria: SearchCriteria): Promise<any[]>;
  
  // 最近の位置情報取得
  getRecentLocations(limit?: number): Promise<any[]>;
  
  // GPS利用可能性チェック
  isGPSAvailable(): boolean;
  
  // 位置情報の更新
  updateLocation(locationId: string, updates: any): Promise<any>;
  
  // 位置情報の削除
  deleteLocation(locationId: string): Promise<void>;
}

// ========================================
// Driving Log Controller 関連型定義
// ========================================

/**
 * 運転日報コントローラーインターフェース
 */
export interface IDrivingLogController {
  // 記録の作成
  createLog(initialData?: Partial<DrivingLog>): Promise<any>;
  
  // 記録の取得
  getLog(logId: string): Promise<any | null>;
  getActiveLogs(): Promise<any[]>;
  getAllLogs(options?: QueryOptions): Promise<any[]>;
  
  // 記録の更新
  updateLog(logId: string, updates: Partial<DrivingLog>): Promise<any>;
  
  // 記録の削除
  deleteLog(logId: string, soft?: boolean): Promise<void>;
  
  // 地点の追加
  addLocation(logId: string, location: any, type: LocationType): Promise<any>;
  
  // 簡易入力モード
  quickStart(startLocation?: any): Promise<any>;
  quickAddWaypoint(logId: string, location: any): Promise<any>;
  quickComplete(logId: string, endLocation: any): Promise<any>;
  
  // 状態管理
  changeStatus(logId: string, newStatus: DrivingLogStatus): Promise<any>;
  completeLog(logId: string): Promise<any>;
  cancelLog(logId: string, reason?: string): Promise<any>;
  
  // 自動保存
  enableAutoSave(logId: string, interval?: number): void;
  disableAutoSave(logId: string): void;
  saveLog(logId: string): Promise<void>;
  
  // 復旧機能
  recoverInProgressLogs(): Promise<any[]>;
  hasUnsavedChanges(logId: string): boolean;
  getLastSaveTime(logId: string): Date | null;
  
  // 統計・集計
  calculateDistance(logId: string): number;
  calculateDuration(logId: string): number;
  getTotalDistance(startDate?: Date, endDate?: Date): Promise<number>;
}

/**
 * クエリオプション
 */
export interface QueryOptions {
  startDate?: Date;
  endDate?: Date;
  status?: DrivingLogStatus;
  limit?: number;
  offset?: number;
  sortBy?: 'date' | 'distance' | 'duration';
  sortOrder?: 'asc' | 'desc';
  includeDeleted?: boolean;
}

/**
 * 自動保存設定
 */
export interface AutoSaveConfig {
  enabled: boolean;
  interval: number;
  lastSaveTime?: Date;
  unsavedChanges: boolean;
}

// ========================================
// History Controller 関連型定義
// ========================================

/**
 * 履歴管理コントローラーインターフェース
 */
export interface IHistoryController {
  // 一覧取得
  getHistoryList(options?: HistoryQueryOptions): Promise<HistoryListResult>;
  
  // 検索
  searchHistory(query: SearchQuery): Promise<HistoryListResult>;
  
  // フィルタリング
  filterHistory(filters: HistoryFilters): Promise<HistoryListResult>;
  
  // ソート
  sortHistory(sortOptions: SortOptions): Promise<HistoryListResult>;
  
  // 詳細取得
  getHistoryDetail(logId: string): Promise<any>;
  
  // ページネーション
  getHistoryPage(pageNumber: number, pageSize: number): Promise<HistoryPage>;
  loadMoreHistory(cursor: string): Promise<HistoryListResult>;
  
  // 設定管理
  saveViewSettings(settings: ViewSettings): Promise<void>;
  loadViewSettings(): Promise<ViewSettings>;
  
  // 検索履歴管理
  saveSearchHistory(query: string): Promise<void>;
  getSearchHistory(): Promise<string[]>;
  clearSearchHistory(): Promise<void>;
  
  // 統計情報
  getStatistics(period?: DateRange): Promise<HistoryStatistics>;
}

/**
 * 履歴クエリオプション
 */
export interface HistoryQueryOptions {
  filters?: HistoryFilters;
  sort?: SortOptions;
  pagination?: PaginationOptions;
  search?: string;
}

/**
 * 履歴フィルター
 */
export interface HistoryFilters {
  dateRange?: DateRange;
  status?: DrivingLogStatus[];
  distanceRange?: NumberRange;
  durationRange?: NumberRange;
  locations?: string[];
  favorites?: boolean;
}

/**
 * 日付範囲
 */
export interface DateRange {
  startDate: Date;
  endDate: Date;
}

/**
 * 数値範囲
 */
export interface NumberRange {
  min?: number;
  max?: number;
}

/**
 * ソートオプション
 */
export interface SortOptions {
  field: 'date' | 'distance' | 'duration' | 'createdAt';
  order: 'asc' | 'desc';
}

/**
 * ページネーションオプション
 */
export interface PaginationOptions {
  page: number;
  size: number;
  cursor?: string;
}

/**
 * 履歴一覧結果
 */
export interface HistoryListResult {
  items: any[];
  totalCount: number;
  hasMore: boolean;
  nextCursor?: string;
  statistics?: HistoryStatistics;
}

/**
 * 履歴ページ
 */
export interface HistoryPage {
  items: any[];
  pageNumber: number;
  totalPages: number;
  totalItems: number;
}

/**
 * 表示設定
 */
export interface ViewSettings {
  defaultSort: SortOptions;
  pageSize: number;
  showStatistics: boolean;
  compactView: boolean;
  autoRefresh: boolean;
}

/**
 * 履歴統計
 */
export interface HistoryStatistics {
  totalRecords: number;
  totalDistance: number;
  totalDuration: number;
  avgDistance: number;
  avgDuration: number;
  statusCounts: Record<DrivingLogStatus, number>;
}

/**
 * 検索クエリ
 */
export interface SearchQuery {
  text: string;
  fields?: ('location' | 'memo' | 'purpose')[];
  fuzzy?: boolean;
  maxResults?: number;
}

// ========================================
// CSV Service 関連型定義
// ========================================

/**
 * CSV サービスインターフェース
 */
export interface ICSVService {
  // CSV生成
  generateCSV(data: any[], options?: CSVExportOptions): Promise<string>;
  generateCSVBlob(data: any[], options?: CSVExportOptions): Promise<Blob>;
  
  // ストリーミング生成
  generateCSVStream(data: any[], options?: CSVExportOptions): AsyncGenerator<string>;
  
  // フィールド設定
  setFieldMapping(mapping: FieldMapping): void;
  getAvailableFields(): ExportField[];
  
  // フォーマット設定
  setFormatOptions(options: FormatOptions): void;
  getFormatOptions(): FormatOptions;
  
  // プライバシー設定
  setPrivacyOptions(options: PrivacyOptions): void;
  
  // バリデーション
  validateData(data: any[]): ValidationResult;
  validateOptions(options: CSVExportOptions): ValidationResult;
}

/**
 * CSVエクスポートオプション
 */
export interface CSVExportOptions {
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

/**
 * エクスポート対象フィールド
 */
export enum ExportField {
  // 基本情報
  ID = 'id',
  DATE = 'date',
  START_TIME = 'startTime',
  END_TIME = 'endTime',
  DRIVER_NAME = 'driverName',
  VEHICLE_NUMBER = 'vehicleNumber',
  
  // 地点情報
  START_LOCATION_NAME = 'startLocationName',
  START_LOCATION_ADDRESS = 'startLocationAddress',
  START_LOCATION_LATITUDE = 'startLocationLatitude',
  START_LOCATION_LONGITUDE = 'startLocationLongitude',
  
  END_LOCATION_NAME = 'endLocationName',
  END_LOCATION_ADDRESS = 'endLocationAddress',
  END_LOCATION_LATITUDE = 'endLocationLatitude',
  END_LOCATION_LONGITUDE = 'endLocationLongitude',
  
  WAYPOINTS = 'waypoints',
  
  // 数値情報
  TOTAL_DISTANCE = 'totalDistance',
  DURATION = 'duration',
  
  // メタ情報
  PURPOSE = 'purpose',
  MEMO = 'memo',
  STATUS = 'status',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt'
}

/**
 * フォーマットオプション
 */
export interface FormatOptions {
  delimiter: ',' | ';' | '\t';
  encoding: 'utf-8' | 'utf-8-bom' | 'shift_jis';
  lineEnding: '\r\n' | '\n';
  quote: 'all' | 'minimal' | 'none';
  dateFormat: string;
  timeFormat: string;
  numberFormat: NumberFormatOptions;
}

/**
 * 数値フォーマットオプション
 */
export interface NumberFormatOptions {
  decimalPlaces: number;
  thousandSeparator: boolean;
  distanceUnit: 'km' | 'm' | 'mile';
  durationUnit: 'minutes' | 'hours' | 'seconds';
}

/**
 * プライバシーオプション
 */
export interface PrivacyOptions {
  anonymizeDriverName: boolean;
  anonymizeVehicleNumber: boolean;
  excludeGPSCoordinates: boolean;
  maskSensitiveLocations: boolean;
  coordinatePrecision: number;
}

/**
 * フィールドマッピング
 */
export interface FieldMapping {
  [key: string]: {
    header: string;
    accessor: string | ((data: any) => any);
    formatter?: (value: any) => string;
  };
}

/**
 * プログレス情報
 */
export interface ProgressInfo {
  current: number;
  total: number;
  percentage: number;
  estimatedTimeRemaining?: number;
  currentPhase: 'filtering' | 'processing' | 'formatting' | 'finalizing';
}

/**
 * バリデーション結果
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

/**
 * バリデーション警告
 */
export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

/**
 * CSV処理統計
 */
export interface CSVProcessingStats {
  totalRecords: number;
  processedRecords: number;
  skippedRecords: number;
  processingTime: number;
  fileSize: number;
  compressionRatio?: number;
}

/**
 * CSVエクスポート結果
 */
export interface CSVExportResult {
  success: boolean;
  data?: string;
  blob?: Blob;
  downloadUrl?: string;
  stats: CSVProcessingStats;
  errors: Error[];
  warnings: ValidationWarning[];
}

/**
 * ストリーミング処理設定
 */
export interface StreamingOptions {
  chunkSize: number;
  bufferSize: number;
  enableBackpressure: boolean;
  maxMemoryUsage: number;
}

/**
 * Web Worker メッセージ
 */
export interface WorkerMessage {
  id: string;
  type: 'start' | 'progress' | 'complete' | 'error' | 'cancel';
  data?: any;
  error?: string;
}

/**
 * CSV設定プリセット
 */
export interface CSVPreset {
  id: string;
  name: string;
  description: string;
  options: CSVExportOptions;
  isDefault: boolean;
  createdAt: Date;
  lastUsed?: Date;
}

/**
 * ファイル出力オプション
 */
export interface FileOutputOptions {
  filename: string;
  mimeType: string;
  compression?: {
    enabled: boolean;
    level: number;
    algorithm: 'gzip' | 'deflate';
  };
  splitting?: {
    enabled: boolean;
    maxSize: number; // bytes
    maxRecords: number;
  };
}

// ========================================
// Export Controller 関連型定義
// ========================================

/**
 * Export Controller インターフェース
 */
export interface IExportController {
  // 設定管理
  saveExportSettings(settings: ExportSettings): Promise<void>;
  loadExportSettings(): Promise<ExportSettings>;
  getDefaultSettings(): ExportSettings;
  
  // プリセット管理
  savePreset(preset: ExportPreset): Promise<void>;
  getPresets(): Promise<ExportPreset[]>;
  deletePreset(presetId: string): Promise<void>;
  setDefaultPreset(presetId: string): Promise<void>;
  
  // エクスポート実行
  startExport(options: ExportRequestOptions): Promise<ExportResult>;
  cancelExport(): Promise<void>;
  
  // プログレス監視
  onProgress(callback: (progress: ExportProgress) => void): void;
  onComplete(callback: (result: ExportResult) => void): void;
  onError(callback: (error: ExportError) => void): void;
  removeProgressListener(callback: (progress: ExportProgress) => void): void;
  removeCompleteListener(callback: (result: ExportResult) => void): void;
  removeErrorListener(callback: (error: ExportError) => void): void;
  
  // ファイル管理
  generateFileName(options: ExportRequestOptions): string;
  downloadFile(blob: Blob, fileName: string): Promise<void>;
  
  // 状態管理
  isExporting(): boolean;
  getCurrentProgress(): ExportProgress | null;
  getExportHistory(): Promise<ExportHistoryEntry[]>;
}

/**
 * エクスポート設定
 */
export interface ExportSettings {
  fields: ExportField[];
  excludeFields?: ExportField[];
  filters: ExportFilters;
  format: FormatOptions;
  privacy: PrivacyOptions;
  fileNameTemplate: string;
  useWebWorker: boolean;
  chunkSize: number;
}

/**
 * エクスポートフィルター
 */
export interface ExportFilters {
  dateRange?: DateRange;
  status?: DrivingLogStatus[];
  distanceRange?: NumberRange;
  durationRange?: NumberRange;
  locations?: string[];
  favorites?: boolean;
}

/**
 * エクスポートプリセット
 */
export interface ExportPreset {
  id: string;
  name: string;
  description: string;
  settings: ExportSettings;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastUsed?: Date;
  usageCount: number;
}

/**
 * エクスポートリクエストオプション
 */
export interface ExportRequestOptions extends ExportSettings {
  // 追加のリクエスト固有設定
  skipValidation?: boolean;
  dryRun?: boolean;
  onProgress?: (progress: ExportProgress) => void;
  onError?: (error: ExportError) => void;
}

/**
 * エクスポート進捗情報
 */
export interface ExportProgress {
  phase: ExportPhase;
  percentage: number;
  current: number;
  total: number;
  estimatedTimeRemaining?: number;
  currentMessage: string;
  canCancel: boolean;
  startTime: Date;
  speed?: number; // records per second
}

/**
 * エクスポートフェーズ
 */
export enum ExportPhase {
  PREPARING = 'preparing',
  FETCHING = 'fetching',
  FILTERING = 'filtering',
  PROCESSING = 'processing',
  GENERATING = 'generating',
  DOWNLOADING = 'downloading',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  ERROR = 'error'
}

/**
 * エクスポート結果
 */
export interface ExportResult {
  success: boolean;
  fileName: string;
  fileSize: number;
  recordCount: number;
  filteredCount: number;
  processingTime: number;
  averageSpeed: number;
  downloadUrl?: string;
  timestamp: Date;
  settings: ExportSettings;
  errors: ExportError[];
  warnings: ValidationWarning[];
}

/**
 * エクスポートエラー
 */
export interface ExportError {
  code: ExportErrorCode;
  message: string;
  details?: any;
  recoverable: boolean;
  suggestion?: string;
  timestamp: Date;
  phase: ExportPhase;
}

/**
 * エクスポートエラーコード
 */
export enum ExportErrorCode {
  // データ関連
  DATA_FETCH_FAILED = 'DATA_FETCH_FAILED',
  DATA_VALIDATION_FAILED = 'DATA_VALIDATION_FAILED',
  NO_DATA_FOUND = 'NO_DATA_FOUND',
  
  // CSV生成関連
  CSV_GENERATION_FAILED = 'CSV_GENERATION_FAILED',
  INVALID_FIELD_CONFIGURATION = 'INVALID_FIELD_CONFIGURATION',
  FORMAT_ERROR = 'FORMAT_ERROR',
  
  // ダウンロード関連
  DOWNLOAD_FAILED = 'DOWNLOAD_FAILED',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  BROWSER_LIMIT_EXCEEDED = 'BROWSER_LIMIT_EXCEEDED',
  
  // システム関連
  MEMORY_INSUFFICIENT = 'MEMORY_INSUFFICIENT',
  STORAGE_UNAVAILABLE = 'STORAGE_UNAVAILABLE',
  NETWORK_ERROR = 'NETWORK_ERROR',
  WORKER_ERROR = 'WORKER_ERROR',
  
  // ユーザー操作
  CANCELLED_BY_USER = 'CANCELLED_BY_USER',
  INVALID_SETTINGS = 'INVALID_SETTINGS',
  
  // 不明なエラー
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * エクスポート履歴エントリ
 */
export interface ExportHistoryEntry {
  id: string;
  timestamp: Date;
  fileName: string;
  recordCount: number;
  fileSize: number;
  processingTime: number;
  success: boolean;
  settings: ExportSettings;
  errorMessage?: string;
}

/**
 * エクスポート統計
 */
export interface ExportStatistics {
  totalExports: number;
  successfulExports: number;
  failedExports: number;
  totalRecordsExported: number;
  totalFileSize: number;
  averageProcessingTime: number;
  mostUsedPreset?: ExportPreset;
  exportsByPhase: Record<ExportPhase, number>;
  errorsByCode: Record<ExportErrorCode, number>;
}

/**
 * ファイル名テンプレート変数
 */
export interface FileNameTemplateVariables {
  YYYY: string;
  MM: string;
  DD: string;
  HH: string;
  mm: string;
  SS: string;
  DATE: string;
  START_DATE?: string;
  END_DATE?: string;
  STATUS?: string;
  RECORD_COUNT?: string;
  USER_NAME?: string;
}

/**
 * エクスポートキューエントリ
 */
export interface ExportQueueEntry {
  id: string;
  options: ExportRequestOptions;
  priority: number;
  timestamp: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  result?: ExportResult;
  error?: ExportError;
}

/**
 * エクスポート設定バリデーション結果
 */
export interface ExportSettingsValidation {
  isValid: boolean;
  errors: Array<{
    field: keyof ExportSettings;
    message: string;
    code: string;
  }>;
  warnings: Array<{
    field: keyof ExportSettings;
    message: string;
    suggestion: string;
  }>;
}

/**
 * Web Worker メッセージ（エクスポート用）
 */
export interface ExportWorkerMessage {
  id: string;
  type: 'export-start' | 'export-progress' | 'export-complete' | 'export-error' | 'export-cancel';
  data?: any;
  error?: string;
  payload?: {
    settings?: ExportSettings;
    data?: any[];
    progress?: ExportProgress;
    result?: ExportResult;
    error?: ExportError;
  };
}

/**
 * ダウンロード設定
 */
export interface DownloadSettings {
  autoDownload: boolean;
  showNotification: boolean;
  openAfterDownload: boolean;
  downloadLocation?: 'default' | 'select';
  retryAttempts: number;
  retryDelay: number;
}

/**
 * エクスポート設定プロファイル
 */
export interface ExportProfile {
  id: string;
  name: string;
  description: string;
  category: 'general' | 'reporting' | 'backup' | 'custom';
  settings: ExportSettings;
  downloadSettings: DownloadSettings;
  isSystemProfile: boolean;
  createdBy?: string;
  sharedWith?: string[];
}

/**
 * 分割エクスポート設定
 */
export interface SplitExportSettings {
  enabled: boolean;
  maxRecordsPerFile: number;
  maxFileSizeMB: number;
  namingPattern: string;
  compressionEnabled: boolean;
}

/**
 * エクスポート品質メトリクス
 */
export interface ExportQualityMetrics {
  dataIntegrity: {
    recordsProcessed: number;
    recordsSkipped: number;
    dataCorruption: number;
  };
  performance: {
    processingTimeMs: number;
    memoryUsageMB: number;
    cpuUsagePercent: number;
  };
  userExperience: {
    responseTimeMs: number;
    errorRate: number;
    cancellationRate: number;
  };
}