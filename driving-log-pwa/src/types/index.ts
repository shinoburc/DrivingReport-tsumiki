// ========================================
// エンティティ定義
// ========================================

/**
 * 運転日報エンティティ
 */
export interface DrivingLog {
  id: string;                    // UUID
  date: Date;                    // 運転日
  driverName?: string;           // ドライバー名（オプション）
  vehicleNumber?: string;        // 車両番号（オプション）
  startLocation: Location;       // 出発地点
  waypoints: Location[];         // 経由地点（複数）
  endLocation?: Location;        // 到着地点
  totalDistance?: number;        // 総走行距離（km）
  status: DrivingLogStatus;      // ステータス
  createdAt: Date;              // 作成日時
  updatedAt: Date;              // 更新日時
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
  gpsTimeout: number;            // GPS取得タイムアウト（秒）
  autoExportEnabled: boolean;    // 自動エクスポート有効化
  exportFormat: ExportFormat;    // エクスポート形式
  favoriteLocations: FavoriteLocation[]; // よく使う地点
  theme: 'light' | 'dark' | 'auto'; // テーマ設定
}

/**
 * よく使う地点
 */
export interface FavoriteLocation {
  id: string;
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
}

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
  GPS = 'GPS'                    // GPS取得地点
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
}