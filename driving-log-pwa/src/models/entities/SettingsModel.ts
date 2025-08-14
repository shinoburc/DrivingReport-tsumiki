import { AppSettings, FavoriteLocation, ExportFormat } from '../../types';
import { BaseModel, ValidationResult } from '../base/BaseModel';
import { ModelValidator } from '../validators/ModelValidator';
import { AppError, ErrorCode } from '../../types';

/**
 * アプリケーション設定モデル
 * アプリ設定とお気に入り地点の管理
 */
export class SettingsModel extends BaseModel implements AppSettings {
  public readonly language: 'ja' | 'en';
  public readonly gpsTimeout: number;
  public readonly autoExportEnabled: boolean;
  public readonly exportFormat: ExportFormat;
  public readonly favoriteLocations: FavoriteLocation[];
  public readonly theme: 'light' | 'dark' | 'auto';

  private constructor(data: AppSettings) {
    super();
    this.language = data.language;
    this.gpsTimeout = data.gpsTimeout;
    this.autoExportEnabled = data.autoExportEnabled;
    this.exportFormat = data.exportFormat;
    this.favoriteLocations = Object.freeze([...data.favoriteLocations]);
    this.theme = data.theme;

    // 不変オブジェクトとして固定
    this.freeze();
  }

  /**
   * デフォルト設定でインスタンス作成
   */
  static createDefault(): SettingsModel {
    const defaultSettings: AppSettings = {
      language: 'ja',
      gpsTimeout: 10,
      autoExportEnabled: false,
      exportFormat: ExportFormat.CSV,
      favoriteLocations: [],
      theme: 'auto'
    };

    return new SettingsModel(defaultSettings);
  }

  /**
   * SettingsModelインスタンス作成
   */
  static create(data: Partial<AppSettings>): SettingsModel {
    // デフォルト値とマージ
    const defaultSettings = SettingsModel.createDefault();
    const settingsData: AppSettings = {
      language: data.language || defaultSettings.language,
      gpsTimeout: data.gpsTimeout !== undefined ? data.gpsTimeout : defaultSettings.gpsTimeout,
      autoExportEnabled: data.autoExportEnabled !== undefined ? data.autoExportEnabled : defaultSettings.autoExportEnabled,
      exportFormat: data.exportFormat || defaultSettings.exportFormat,
      favoriteLocations: data.favoriteLocations || defaultSettings.favoriteLocations,
      theme: data.theme || defaultSettings.theme
    };

    // バリデーション
    const validation = ModelValidator.validateSettings(settingsData);
    if (!validation.isValid) {
      throw new AppError(
        ErrorCode.INVALID_DATA_FORMAT,
        `Settings validation failed: ${validation.errors.map(e => e.message).join(', ')}`,
        { errors: validation.errors }
      );
    }

    return new SettingsModel(settingsData);
  }

  /**
   * 更新されたインスタンスを作成
   */
  update(updates: Partial<AppSettings>): SettingsModel {
    const updatedData: AppSettings = {
      language: this.updateProperty(updates.language, this.language),
      gpsTimeout: this.updateProperty(updates.gpsTimeout, this.gpsTimeout),
      autoExportEnabled: this.updateProperty(updates.autoExportEnabled, this.autoExportEnabled),
      exportFormat: this.updateProperty(updates.exportFormat, this.exportFormat),
      favoriteLocations: this.updateProperty(updates.favoriteLocations, this.favoriteLocations),
      theme: this.updateProperty(updates.theme, this.theme)
    };

    return SettingsModel.create(updatedData);
  }

  /**
   * お気に入り地点を追加
   */
  addFavoriteLocation(location: FavoriteLocation): SettingsModel {
    // 既存の同じIDがある場合は更新、なければ追加
    const existingIndex = this.favoriteLocations.findIndex(loc => loc.id === location.id);
    let newFavorites: FavoriteLocation[];

    if (existingIndex >= 0) {
      // 既存を更新
      newFavorites = [...this.favoriteLocations];
      newFavorites[existingIndex] = location;
    } else {
      // 新規追加
      newFavorites = [...this.favoriteLocations, location];
    }

    return this.update({ favoriteLocations: newFavorites });
  }

  /**
   * お気に入り地点を削除
   */
  removeFavoriteLocation(locationId: string): SettingsModel {
    const existingIndex = this.favoriteLocations.findIndex(loc => loc.id === locationId);
    
    if (existingIndex < 0) {
      // 存在しない場合は変更なし
      return this;
    }

    const newFavorites = this.favoriteLocations.filter(loc => loc.id !== locationId);
    return this.update({ favoriteLocations: newFavorites });
  }

  validate(): ValidationResult {
    return ModelValidator.validateSettings(this);
  }

  toJSON(): Record<string, any> {
    return {
      language: this.language,
      gpsTimeout: this.gpsTimeout,
      autoExportEnabled: this.autoExportEnabled,
      exportFormat: this.exportFormat,
      favoriteLocations: this.favoriteLocations.map(loc => ({ ...loc })),
      theme: this.theme
    };
  }

  static fromJSON(data: Record<string, any>): SettingsModel {
    return SettingsModel.create({
      language: data.language,
      gpsTimeout: data.gpsTimeout,
      autoExportEnabled: data.autoExportEnabled,
      exportFormat: data.exportFormat,
      favoriteLocations: data.favoriteLocations || [],
      theme: data.theme
    });
  }
}