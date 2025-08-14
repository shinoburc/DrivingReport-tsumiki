import { DrivingLog, DrivingLogStatus, Location } from '../../types';
import { BaseModel, ValidationResult } from '../base/BaseModel';
import { ModelValidator } from '../validators/ModelValidator';
import { ModelFactory } from '../factories/ModelFactory';
import { LocationModel } from './LocationModel';
import { AppError, ErrorCode } from '../../types';

/**
 * 運転日報モデル
 * 運転記録と位置情報の統合管理
 */
export class DrivingLogModel extends BaseModel implements DrivingLog {
  public readonly id: string;
  public readonly date: Date;
  public readonly driverName?: string;
  public readonly vehicleNumber?: string;
  public readonly startLocation: Location;
  public readonly waypoints: Location[];
  public readonly endLocation?: Location;
  public readonly totalDistance?: number;
  public readonly status: DrivingLogStatus;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  private constructor(data: DrivingLog) {
    super();
    this.id = data.id;
    this.date = data.date;
    this.driverName = data.driverName;
    this.vehicleNumber = data.vehicleNumber;
    this.startLocation = data.startLocation;
    this.waypoints = Object.freeze([...data.waypoints]) as readonly Location[];
    this.endLocation = data.endLocation;
    this.totalDistance = data.totalDistance;
    this.status = data.status;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;

    // 不変オブジェクトとして固定
    this.freeze();
  }

  /**
   * DrivingLogModelインスタンス作成
   */
  static create(data: Partial<DrivingLog>): DrivingLogModel {
    // バリデーション
    const validation = ModelValidator.validateDrivingLog(data);
    if (!validation.isValid) {
      throw new AppError(
        ErrorCode.INVALID_DATA_FORMAT,
        `DrivingLog validation failed: ${validation.errors.map(e => e.message).join(', ')}`,
        { errors: validation.errors }
      );
    }

    const now = new Date();
    const drivingLogData: DrivingLog = {
      id: data.id || ModelFactory.generateId(),
      date: data.date!,
      driverName: data.driverName,
      vehicleNumber: data.vehicleNumber,
      startLocation: data.startLocation!,
      waypoints: data.waypoints || [],
      endLocation: data.endLocation,
      totalDistance: data.totalDistance,
      status: data.status || DrivingLogStatus.IN_PROGRESS,
      createdAt: data.createdAt || now,
      updatedAt: data.updatedAt || now
    };

    // 時系列検証
    const model = new DrivingLogModel(drivingLogData);
    if (!model.validateLocationSequence()) {
      throw new AppError(
        ErrorCode.INVALID_DATA_FORMAT,
        'Location timestamp sequence is invalid'
      );
    }

    return model;
  }

  /**
   * 更新されたインスタンスを作成
   */
  update(updates: Partial<Omit<DrivingLog, 'id' | 'createdAt'>>): DrivingLogModel {
    const updatedData: DrivingLog = {
      id: this.id,
      date: this.updateProperty(updates.date, this.date),
      driverName: this.updateProperty(updates.driverName, this.driverName),
      vehicleNumber: this.updateProperty(updates.vehicleNumber, this.vehicleNumber),
      startLocation: this.updateProperty(updates.startLocation, this.startLocation),
      waypoints: this.updateProperty(updates.waypoints, this.waypoints),
      endLocation: this.updateProperty(updates.endLocation, this.endLocation),
      totalDistance: this.updateProperty(updates.totalDistance, this.totalDistance),
      status: this.updateProperty(updates.status, this.status),
      createdAt: this.createdAt,
      updatedAt: this.createUpdatedTimestamp()
    };

    return DrivingLogModel.create(updatedData);
  }

  /**
   * 総距離の計算
   */
  calculateTotalDistance(): number {
    if (!this.startLocation.latitude || !this.startLocation.longitude) {
      return 0;
    }

    const locations = [this.startLocation, ...this.waypoints];
    if (this.endLocation?.latitude && this.endLocation?.longitude) {
      locations.push(this.endLocation);
    }

    if (locations.length < 2) {
      return 0;
    }

    let totalDistance = 0;
    for (let i = 0; i < locations.length - 1; i++) {
      const from = LocationModel.create(locations[i]);
      const to = locations[i + 1];
      
      if (to && from.isValidCoordinates() && ModelValidator.validateCoordinates(to.latitude, to.longitude)) {
        totalDistance += from.distanceTo(to);
      }
    }

    return Math.round(totalDistance * 100) / 100; // 小数点2桁で四捨五入
  }

  /**
   * 位置情報の時系列バリデーション
   */
  validateLocationSequence(): boolean {
    const locations = [this.startLocation, ...this.waypoints];
    if (this.endLocation) {
      locations.push(this.endLocation);
    }

    // 時系列順序チェック
    for (let i = 0; i < locations.length - 1; i++) {
      const current = locations[i];
      const next = locations[i + 1];

      if (current?.timestamp && next?.timestamp && current.timestamp >= next.timestamp) {
        return false;
      }
    }

    return true;
  }

  /**
   * ストレージ形式への変換
   */
  toStorageFormat(): DrivingLog {
    return {
      id: this.id,
      date: this.date,
      driverName: this.driverName,
      vehicleNumber: this.vehicleNumber,
      startLocation: this.startLocation,
      waypoints: [...this.waypoints],
      endLocation: this.endLocation,
      totalDistance: this.totalDistance,
      status: this.status,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  /**
   * ストレージ形式からの変換
   */
  static fromStorageFormat(data: DrivingLog): DrivingLogModel {
    return DrivingLogModel.create(data);
  }

  validate(): ValidationResult {
    return ModelValidator.validateDrivingLog(this);
  }

  toJSON(): Record<string, any> {
    return {
      id: this.id,
      date: this.date.toISOString(),
      driverName: this.driverName,
      vehicleNumber: this.vehicleNumber,
      startLocation: this.startLocation,
      waypoints: [...this.waypoints],
      endLocation: this.endLocation,
      totalDistance: this.totalDistance,
      status: this.status,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString()
    };
  }

  static fromJSON(data: Record<string, any>): DrivingLogModel {
    return DrivingLogModel.create({
      id: data.id,
      date: new Date(data.date),
      driverName: data.driverName,
      vehicleNumber: data.vehicleNumber,
      startLocation: data.startLocation,
      waypoints: data.waypoints || [],
      endLocation: data.endLocation,
      totalDistance: data.totalDistance,
      status: data.status,
      createdAt: data.createdAt ? new Date(data.createdAt) : undefined,
      updatedAt: data.updatedAt ? new Date(data.updatedAt) : undefined
    });
  }
}