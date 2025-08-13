import { DrivingLog, Location, AppSettings, DrivingLogStatus, LocationType, ExportFormat } from '../../types';
import { ValidationResult } from '../base/BaseModel';
import { AppError, ErrorCode } from '../../types';

/**
 * モデルバリデーター
 * データ検証とエラー処理の統一管理
 */
export class ModelValidator {
  /**
   * DrivingLogのバリデーション
   */
  static validateDrivingLog(data: any): ValidationResult {
    const errors: any[] = [];

    // 必須フィールド検証
    if (!data.date) {
      errors.push({ field: 'date', message: 'Date is required' });
    } else if (!this.validateDate(data.date)) {
      errors.push({ field: 'date', message: 'Invalid date format' });
    }

    if (!data.startLocation) {
      errors.push({ field: 'startLocation', message: 'Start location is required' });
    }

    if (!Array.isArray(data.waypoints)) {
      errors.push({ field: 'waypoints', message: 'Waypoints must be an array' });
    }

    // ステータス検証
    if (data.status && !Object.values(DrivingLogStatus).includes(data.status)) {
      errors.push({ field: 'status', message: 'Invalid status value' });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Locationのバリデーション
   */
  static validateLocation(data: any): ValidationResult {
    const errors: any[] = [];

    // 座標検証
    if (data.latitude !== undefined || data.longitude !== undefined) {
      if (!this.validateCoordinates(data.latitude, data.longitude)) {
        errors.push({ field: 'coordinates', message: 'Invalid coordinate values' });
      }
    }

    // 必須フィールド
    if (!data.timestamp) {
      errors.push({ field: 'timestamp', message: 'Timestamp is required' });
    } else if (!this.validateDate(data.timestamp)) {
      errors.push({ field: 'timestamp', message: 'Invalid timestamp format' });
    }

    if (!data.type || !Object.values(LocationType).includes(data.type)) {
      errors.push({ field: 'type', message: 'Valid location type is required' });
    }

    // 精度検証
    if (data.accuracy !== undefined && (typeof data.accuracy !== 'number' || data.accuracy < 0)) {
      errors.push({ field: 'accuracy', message: 'Accuracy must be a positive number' });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * AppSettingsのバリデーション
   */
  static validateSettings(data: any): ValidationResult {
    const errors: any[] = [];

    // 言語検証
    if (data.language && !['ja', 'en'].includes(data.language)) {
      errors.push({ field: 'language', message: 'Invalid language setting' });
    }

    // GPSタイムアウト検証
    if (data.gpsTimeout !== undefined) {
      if (typeof data.gpsTimeout !== 'number' || data.gpsTimeout < 1 || data.gpsTimeout > 300) {
        errors.push({ field: 'gpsTimeout', message: 'GPS timeout must be between 1 and 300 seconds' });
      }
    }

    // テーマ検証
    if (data.theme && !['light', 'dark', 'auto'].includes(data.theme)) {
      errors.push({ field: 'theme', message: 'Invalid theme setting' });
    }

    // エクスポート形式検証
    if (data.exportFormat && !Object.values(ExportFormat).includes(data.exportFormat)) {
      errors.push({ field: 'exportFormat', message: 'Invalid export format' });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * GPS座標の有効性チェック
   */
  static validateCoordinates(latitude?: number, longitude?: number): boolean {
    if (latitude === undefined || longitude === undefined) {
      return false;
    }

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return false;
    }

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return false;
    }

    // 緯度: -90 to 90, 経度: -180 to 180
    return latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
  }

  /**
   * 日付の有効性チェック
   */
  static validateDate(date: any): boolean {
    if (!date) return false;
    
    if (!(date instanceof Date)) {
      return false;
    }
    
    return !isNaN(date.getTime());
  }
}