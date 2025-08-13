import { Location, LocationType } from '../../types';
import { BaseModel, ValidationResult } from '../base/BaseModel';
import { ModelValidator } from '../validators/ModelValidator';
import { ModelFactory } from '../factories/ModelFactory';
import { AppError, ErrorCode } from '../../types';

/**
 * 位置情報モデル
 * GPS座標と地点情報の管理
 */
export class LocationModel extends BaseModel implements Location {
  public readonly id: string;
  public readonly name?: string;
  public readonly address?: string;
  public readonly latitude?: number;
  public readonly longitude?: number;
  public readonly accuracy?: number;
  public readonly timestamp: Date;
  public readonly type: LocationType;
  public readonly note?: string;
  public readonly imageDataUrl?: string;

  private constructor(data: Location) {
    super();
    this.id = data.id;
    this.name = data.name;
    this.address = data.address;
    this.latitude = data.latitude;
    this.longitude = data.longitude;
    this.accuracy = data.accuracy;
    this.timestamp = data.timestamp;
    this.type = data.type;
    this.note = data.note;
    this.imageDataUrl = data.imageDataUrl;

    // 不変オブジェクトとして固定
    this.freeze();
  }

  /**
   * LocationModelインスタンス作成
   */
  static create(data: Partial<Location>): LocationModel {
    // バリデーション
    const validation = ModelValidator.validateLocation(data);
    if (!validation.isValid) {
      throw new AppError(
        ErrorCode.INVALID_DATA_FORMAT,
        `Location validation failed: ${validation.errors.map(e => e.message).join(', ')}`,
        { errors: validation.errors }
      );
    }

    // 必須フィールドと適度の補正
    const locationData: Location = {
      id: data.id || ModelFactory.generateId(),
      name: data.name,
      address: data.address,
      latitude: data.latitude,
      longitude: data.longitude,
      accuracy: data.accuracy && data.accuracy > 0 ? data.accuracy : data.accuracy === 0 ? 1 : data.accuracy,
      timestamp: data.timestamp!,
      type: data.type!,
      note: data.note,
      imageDataUrl: data.imageDataUrl
    };

    return new LocationModel(locationData);
  }

  /**
   * 更新されたインスタンスを作成
   */
  update(updates: Partial<Omit<Location, 'id'>>): LocationModel {
    const updatedData: Location = {
      id: this.id,
      name: updates.name !== undefined ? updates.name : this.name,
      address: updates.address !== undefined ? updates.address : this.address,
      latitude: updates.latitude !== undefined ? updates.latitude : this.latitude,
      longitude: updates.longitude !== undefined ? updates.longitude : this.longitude,
      accuracy: updates.accuracy !== undefined ? updates.accuracy : this.accuracy,
      timestamp: updates.timestamp !== undefined ? updates.timestamp : this.timestamp,
      type: updates.type !== undefined ? updates.type : this.type,
      note: updates.note !== undefined ? updates.note : this.note,
      imageDataUrl: updates.imageDataUrl !== undefined ? updates.imageDataUrl : this.imageDataUrl
    };

    return LocationModel.create(updatedData);
  }

  /**
   * 他の位置との距離計算（km）
   * Haversine公式を使用
   */
  distanceTo(other: Location): number {
    if (!this.isValidCoordinates() || !ModelValidator.validateCoordinates(other.latitude, other.longitude)) {
      throw new AppError(
        ErrorCode.INVALID_DATA_FORMAT,
        'Valid coordinates are required for distance calculation'
      );
    }

    const lat1 = this.latitude!;
    const lon1 = this.longitude!;
    const lat2 = other.latitude!;
    const lon2 = other.longitude!;

    // 同じ座標の場合
    if (lat1 === lat2 && lon1 === lon2) {
      return 0;
    }

    const R = 6371; // 地球の半径（km）
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return Math.round(distance * 1000) / 1000; // 小数点3桁で四捨五入
  }

  /**
   * GPS座標の有効性チェック
   */
  isValidCoordinates(): boolean {
    return ModelValidator.validateCoordinates(this.latitude, this.longitude);
  }

  /**
   * 度をラジアンに変換
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  validate(): ValidationResult {
    return ModelValidator.validateLocation(this);
  }

  toJSON(): Record<string, any> {
    return {
      id: this.id,
      name: this.name,
      address: this.address,
      latitude: this.latitude,
      longitude: this.longitude,
      accuracy: this.accuracy,
      timestamp: this.timestamp.toISOString(),
      type: this.type,
      note: this.note,
      imageDataUrl: this.imageDataUrl
    };
  }

  static fromJSON(data: Record<string, any>): LocationModel {
    return LocationModel.create({
      id: data.id,
      name: data.name,
      address: data.address,
      latitude: data.latitude,
      longitude: data.longitude,
      accuracy: data.accuracy,
      timestamp: new Date(data.timestamp),
      type: data.type,
      note: data.note,
      imageDataUrl: data.imageDataUrl
    });
  }
}