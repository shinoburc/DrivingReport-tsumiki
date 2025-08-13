// ========================================
// API関連の型定義
// ========================================

import { 
  DrivingLog, 
  Location, 
  AppSettings, 
  QueryOptions, 
  ExportOptions,
  GPSPosition 
} from './index';
import { ApiResponse, PaginatedResponse } from './utils';

// ========================================
// サービスインターフェース
// ========================================

/**
 * ストレージサービスのインターフェース
 */
export interface StorageService {
  // 運転日報操作
  createDrivingLog(log: Omit<DrivingLog, 'id' | 'createdAt' | 'updatedAt'>): Promise<DrivingLog>;
  getDrivingLog(id: string): Promise<DrivingLog | null>;
  updateDrivingLog(id: string, updates: Partial<DrivingLog>): Promise<DrivingLog>;
  deleteDrivingLog(id: string): Promise<void>;
  queryDrivingLogs(options?: QueryOptions): Promise<DrivingLog[]>;
  
  // 位置情報操作
  createLocation(location: Omit<Location, 'id'>): Promise<Location>;
  getLocation(id: string): Promise<Location | null>;
  updateLocation(id: string, updates: Partial<Location>): Promise<Location>;
  deleteLocation(id: string): Promise<void>;
  queryLocations(options?: QueryOptions): Promise<Location[]>;
  
  // 設定操作
  getSettings(): Promise<AppSettings>;
  updateSettings(settings: Partial<AppSettings>): Promise<AppSettings>;
  
  // データベース操作
  clear(): Promise<void>;
  export(): Promise<Blob>;
  import(data: Blob): Promise<void>;
}

/**
 * GPSサービスのインターフェース
 */
export interface GPSService {
  getCurrentPosition(options?: PositionOptions): Promise<GPSPosition>;
  watchPosition(
    callback: (position: GPSPosition) => void,
    errorCallback?: (error: GeolocationPositionError) => void,
    options?: PositionOptions
  ): number;
  clearWatch(watchId: number): void;
  checkPermission(): Promise<'granted' | 'denied' | 'prompt'>;
  requestPermission(): Promise<'granted' | 'denied'>;
}

/**
 * CSVサービスのインターフェース
 */
export interface CSVService {
  exportDrivingLogs(logs: DrivingLog[], options: ExportOptions): Promise<Blob>;
  exportLocations(locations: Location[], options: ExportOptions): Promise<Blob>;
  parseCSV<T>(csvContent: string): Promise<T[]>;
  downloadFile(blob: Blob, filename: string): void;
}

/**
 * 通知サービスのインターフェース
 */
export interface NotificationService {
  showNotification(title: string, options?: NotificationOptions): Promise<void>;
  requestPermission(): Promise<'granted' | 'denied' | 'default'>;
  checkPermission(): Promise<'granted' | 'denied' | 'default'>;
  scheduleNotification(title: string, options: NotificationOptions, delay: number): Promise<number>;
  cancelNotification(id: number): void;
}

// ========================================
// API レスポンス型
// ========================================

/**
 * 運転日報API レスポンス
 */
export type DrivingLogResponse = ApiResponse<DrivingLog>;
export type DrivingLogsResponse = PaginatedResponse<DrivingLog>;

/**
 * 位置情報API レスポンス
 */
export type LocationResponse = ApiResponse<Location>;
export type LocationsResponse = PaginatedResponse<Location>;

/**
 * 設定API レスポンス
 */
export type SettingsResponse = ApiResponse<AppSettings>;

/**
 * エクスポートAPI レスポンス
 */
export type ExportResponse = ApiResponse<{
  downloadUrl: string;
  filename: string;
  size: number;
}>;

// ========================================
// API リクエスト型
// ========================================

/**
 * 運転日報作成リクエスト
 */
export type CreateDrivingLogRequest = Omit<DrivingLog, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * 運転日報更新リクエスト
 */
export type UpdateDrivingLogRequest = Partial<Omit<DrivingLog, 'id' | 'createdAt' | 'updatedAt'>>;

/**
 * 位置情報作成リクエスト
 */
export type CreateLocationRequest = Omit<Location, 'id'>;

/**
 * 位置情報更新リクエスト
 */
export type UpdateLocationRequest = Partial<Omit<Location, 'id'>>;

/**
 * 設定更新リクエスト
 */
export type UpdateSettingsRequest = Partial<AppSettings>;

/**
 * エクスポートリクエスト
 */
export interface ExportRequest {
  type: 'driving-logs' | 'locations' | 'all';
  format: 'csv' | 'json';
  options: ExportOptions;
}

// ========================================
// サービス設定型
// ========================================

/**
 * GPS サービス設定
 */
export interface GPSServiceConfig {
  timeout: number;
  maximumAge: number;
  enableHighAccuracy: boolean;
  fallbackToLastKnown: boolean;
}

/**
 * ストレージサービス設定
 */
export interface StorageServiceConfig {
  databaseName: string;
  version: number;
  enableBackup: boolean;
  maxRetries: number;
  retryDelay: number;
}

/**
 * CSV サービス設定
 */
export interface CSVServiceConfig {
  delimiter: string;
  encoding: 'utf-8' | 'shift_jis';
  bom: boolean;
  dateFormat: string;
}