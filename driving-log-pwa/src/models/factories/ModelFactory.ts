import { DrivingLog, Location, AppSettings, DrivingLogStatus, LocationType } from '../../types';
import { DrivingLogModel } from '../entities/DrivingLogModel';
import { LocationModel } from '../entities/LocationModel';
import { SettingsModel } from '../entities/SettingsModel';
import { AppError, ErrorCode } from '../../types';

/**
 * モデルファクトリー
 * データモデルインスタンスの作成と管理
 */
export class ModelFactory {
  /**
   * 一意なIDを生成 (timestamp + random文字列)
   */
  static generateId(): string {
    const timestamp = Date.now();
    const randomPart = Math.random().toString(36).substring(2, 11);
    return `${timestamp}-${randomPart}`;
  }

  /**
   * DrivingLogModelインスタンス作成
   */
  static createDrivingLog(data?: Partial<DrivingLog>): DrivingLogModel {
    const defaultData: Partial<DrivingLog> = {
      date: new Date(),
      waypoints: [],
      status: DrivingLogStatus.IN_PROGRESS,
      ...data
    };

    return DrivingLogModel.create(defaultData);
  }

  /**
   * LocationModelインスタンス作成
   */
  static createLocation(data?: Partial<Location>): LocationModel {
    const defaultData: Partial<Location> = {
      timestamp: new Date(),
      type: LocationType.START,
      ...data
    };

    return LocationModel.create(defaultData);
  }

  /**
   * SettingsModelインスタンス作成
   */
  static createSettings(data?: Partial<AppSettings>): SettingsModel {
    throw new AppError(ErrorCode.UNKNOWN_ERROR, 'Not implemented yet');
  }

  /**
   * DrivingLogModel複製
   */
  static cloneDrivingLog(original: DrivingLogModel): DrivingLogModel {
    throw new AppError(ErrorCode.UNKNOWN_ERROR, 'Not implemented yet');
  }

  /**
   * LocationModel複製
   */
  static cloneLocation(original: LocationModel): LocationModel {
    throw new AppError(ErrorCode.UNKNOWN_ERROR, 'Not implemented yet');
  }
}