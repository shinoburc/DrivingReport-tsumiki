import { AppSettings, FavoriteLocation, ExportFormat } from '../../types';
import { BaseModel, ValidationResult } from '../base/BaseModel';
import { AppError, ErrorCode } from '../../types';

/**
 * アプリケーション設定モデル
 * TDD Red フェーズ: テストを失敗させるためのスタブ実装
 */
export class SettingsModel extends BaseModel implements AppSettings {
  public readonly language!: 'ja' | 'en';
  public readonly gpsTimeout!: number;
  public readonly autoExportEnabled!: boolean;
  public readonly exportFormat!: ExportFormat;
  public readonly favoriteLocations!: FavoriteLocation[];
  public readonly theme!: 'light' | 'dark' | 'auto';

  private constructor() {
    super();
    // 意図的に実装なし - Red フェーズ
  }

  /**
   * デフォルト設定でインスタンス作成
   */
  static createDefault(): SettingsModel {
    throw new AppError(ErrorCode.UNKNOWN_ERROR, 'Not implemented yet');
  }

  /**
   * SettingsModelインスタンス作成
   */
  static create(data: Partial<AppSettings>): SettingsModel {
    throw new AppError(ErrorCode.UNKNOWN_ERROR, 'Not implemented yet');
  }

  /**
   * 更新されたインスタンスを作成
   */
  update(updates: Partial<AppSettings>): SettingsModel {
    throw new AppError(ErrorCode.UNKNOWN_ERROR, 'Not implemented yet');
  }

  /**
   * お気に入り地点を追加
   */
  addFavoriteLocation(location: FavoriteLocation): SettingsModel {
    throw new AppError(ErrorCode.UNKNOWN_ERROR, 'Not implemented yet');
  }

  /**
   * お気に入り地点を削除
   */
  removeFavoriteLocation(locationId: string): SettingsModel {
    throw new AppError(ErrorCode.UNKNOWN_ERROR, 'Not implemented yet');
  }

  validate(): ValidationResult {
    throw new AppError(ErrorCode.UNKNOWN_ERROR, 'Not implemented yet');
  }

  toJSON(): Record<string, any> {
    throw new AppError(ErrorCode.UNKNOWN_ERROR, 'Not implemented yet');
  }

  static fromJSON(data: Record<string, any>): SettingsModel {
    throw new AppError(ErrorCode.UNKNOWN_ERROR, 'Not implemented yet');
  }
}