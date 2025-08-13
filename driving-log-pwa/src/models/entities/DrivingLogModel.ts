import { DrivingLog, DrivingLogStatus, Location } from '../../types';
import { BaseModel, ValidationResult } from '../base/BaseModel';
import { AppError, ErrorCode } from '../../types';

/**
 * 運転日報モデル
 * TDD Red フェーズ: テストを失敗させるためのスタブ実装
 */
export class DrivingLogModel extends BaseModel implements DrivingLog {
  public readonly id!: string;
  public readonly date!: Date;
  public readonly driverName?: string;
  public readonly vehicleNumber?: string;
  public readonly startLocation!: Location;
  public readonly waypoints!: Location[];
  public readonly endLocation?: Location;
  public readonly totalDistance?: number;
  public readonly status!: DrivingLogStatus;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  private constructor() {
    super();
    // 意図的に実装なし - Red フェーズ
  }

  /**
   * DrivingLogModelインスタンス作成
   */
  static create(data: Partial<DrivingLog>): DrivingLogModel {
    throw new AppError(ErrorCode.UNKNOWN_ERROR, 'Not implemented yet');
  }

  /**
   * 更新されたインスタンスを作成
   */
  update(updates: Partial<Omit<DrivingLog, 'id' | 'createdAt'>>): DrivingLogModel {
    throw new AppError(ErrorCode.UNKNOWN_ERROR, 'Not implemented yet');
  }

  /**
   * 総距離の計算
   */
  calculateTotalDistance(): number {
    throw new AppError(ErrorCode.UNKNOWN_ERROR, 'Not implemented yet');
  }

  /**
   * 位置情報の時系列バリデーション
   */
  validateLocationSequence(): boolean {
    throw new AppError(ErrorCode.UNKNOWN_ERROR, 'Not implemented yet');
  }

  /**
   * ストレージ形式への変換
   */
  toStorageFormat(): DrivingLog {
    throw new AppError(ErrorCode.UNKNOWN_ERROR, 'Not implemented yet');
  }

  /**
   * ストレージ形式からの変換
   */
  static fromStorageFormat(data: DrivingLog): DrivingLogModel {
    throw new AppError(ErrorCode.UNKNOWN_ERROR, 'Not implemented yet');
  }

  validate(): ValidationResult {
    throw new AppError(ErrorCode.UNKNOWN_ERROR, 'Not implemented yet');
  }

  toJSON(): Record<string, any> {
    throw new AppError(ErrorCode.UNKNOWN_ERROR, 'Not implemented yet');
  }

  static fromJSON(data: Record<string, any>): DrivingLogModel {
    throw new AppError(ErrorCode.UNKNOWN_ERROR, 'Not implemented yet');
  }
}