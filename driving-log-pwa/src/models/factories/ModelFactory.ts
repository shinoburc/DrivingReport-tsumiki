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
    if (data) {
      return SettingsModel.create(data);
    } else {
      return SettingsModel.createDefault();
    }
  }

  /**
   * DrivingLogModel複製
   */
  static cloneDrivingLog(original: DrivingLogModel): DrivingLogModel {
    if (!original) {
      throw new AppError(ErrorCode.INVALID_DATA_FORMAT, 'Original DrivingLog is required for cloning');
    }

    const clonedData = {
      date: original.date,
      driverName: original.driverName,
      vehicleNumber: original.vehicleNumber,
      startLocation: original.startLocation,
      waypoints: [...original.waypoints],
      endLocation: original.endLocation,
      totalDistance: original.totalDistance,
      status: original.status,
      createdAt: original.createdAt,
      updatedAt: original.updatedAt
    };

    return DrivingLogModel.create(clonedData);
  }

  /**
   * LocationModel複製
   */
  static cloneLocation(original: LocationModel): LocationModel {
    if (!original) {
      throw new AppError(ErrorCode.INVALID_DATA_FORMAT, 'Original Location is required for cloning');
    }

    const clonedData = {
      name: original.name,
      address: original.address,
      latitude: original.latitude,
      longitude: original.longitude,
      accuracy: original.accuracy,
      timestamp: original.timestamp,
      type: original.type,
      note: original.note,
      imageDataUrl: original.imageDataUrl
    };

    return LocationModel.create(clonedData);
  }
}