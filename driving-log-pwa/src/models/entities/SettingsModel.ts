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
  public readonly theme: 'light' | 'dark' | 'auto';
  public readonly gpsTimeout: number;
  public readonly gpsAccuracyThreshold: number;
  public readonly exportFormat: ExportFormat;
  public readonly defaultExportPeriod: number;
  public readonly exportPrivacyLevel: 'full' | 'approximate' | 'minimal';
  public readonly autoExportEnabled: boolean;
  public readonly autoExportFrequency: 'weekly' | 'monthly' | 'manual';
  public readonly favoriteLocations: FavoriteLocation[];
  public readonly notificationsEnabled: boolean;
  public readonly offlineModeEnabled: boolean;
  public readonly autoClearDataEnabled: boolean;
  public readonly compactMode?: boolean;
  public readonly showTutorial?: boolean;
  public readonly firstLaunchDate?: Date;
  public readonly appVersion?: string;
  public readonly lastBackupDate?: Date;
  public readonly driverName?: string;
  public readonly vehicleInfo?: any;

  private constructor(data: AppSettings) {
    super();
    this.language = data.language;
    this.theme = data.theme;
    this.gpsTimeout = data.gpsTimeout;
    this.gpsAccuracyThreshold = data.gpsAccuracyThreshold;
    this.exportFormat = data.exportFormat;
    this.defaultExportPeriod = data.defaultExportPeriod;
    this.exportPrivacyLevel = data.exportPrivacyLevel;
    this.autoExportEnabled = data.autoExportEnabled;
    this.autoExportFrequency = data.autoExportFrequency;
    this.favoriteLocations = [...data.favoriteLocations];
    this.notificationsEnabled = data.notificationsEnabled;
    this.offlineModeEnabled = data.offlineModeEnabled;
    this.autoClearDataEnabled = data.autoClearDataEnabled;
    this.compactMode = data.compactMode;
    this.showTutorial = data.showTutorial;
    this.firstLaunchDate = data.firstLaunchDate;
    this.appVersion = data.appVersion;
    this.lastBackupDate = data.lastBackupDate;
    this.driverName = data.driverName;
    this.vehicleInfo = data.vehicleInfo;

    // 不変オブジェクトとして固定
    this.freeze();
  }

  /**
   * デフォルト設定でインスタンス作成
   */
  static createDefault(): SettingsModel {
    const defaultSettings: AppSettings = {
      language: 'ja',
      theme: 'auto',
      gpsTimeout: 10,
      gpsAccuracyThreshold: 50,
      exportFormat: ExportFormat.CSV,
      defaultExportPeriod: 30,
      exportPrivacyLevel: 'full',
      autoExportEnabled: false,
      autoExportFrequency: 'monthly',
      favoriteLocations: [],
      notificationsEnabled: true,
      offlineModeEnabled: true,
      autoClearDataEnabled: false
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
      theme: data.theme || defaultSettings.theme,
      gpsTimeout: data.gpsTimeout !== undefined ? data.gpsTimeout : defaultSettings.gpsTimeout,
      gpsAccuracyThreshold: data.gpsAccuracyThreshold !== undefined ? data.gpsAccuracyThreshold : defaultSettings.gpsAccuracyThreshold,
      exportFormat: data.exportFormat || defaultSettings.exportFormat,
      defaultExportPeriod: data.defaultExportPeriod !== undefined ? data.defaultExportPeriod : defaultSettings.defaultExportPeriod,
      exportPrivacyLevel: data.exportPrivacyLevel || defaultSettings.exportPrivacyLevel,
      autoExportEnabled: data.autoExportEnabled !== undefined ? data.autoExportEnabled : defaultSettings.autoExportEnabled,
      autoExportFrequency: data.autoExportFrequency || defaultSettings.autoExportFrequency,
      favoriteLocations: data.favoriteLocations || defaultSettings.favoriteLocations,
      notificationsEnabled: data.notificationsEnabled !== undefined ? data.notificationsEnabled : defaultSettings.notificationsEnabled,
      offlineModeEnabled: data.offlineModeEnabled !== undefined ? data.offlineModeEnabled : defaultSettings.offlineModeEnabled,
      autoClearDataEnabled: data.autoClearDataEnabled !== undefined ? data.autoClearDataEnabled : defaultSettings.autoClearDataEnabled,
      compactMode: data.compactMode,
      showTutorial: data.showTutorial,
      firstLaunchDate: data.firstLaunchDate,
      appVersion: data.appVersion,
      lastBackupDate: data.lastBackupDate,
      driverName: data.driverName,
      vehicleInfo: data.vehicleInfo
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
      theme: this.updateProperty(updates.theme, this.theme),
      gpsTimeout: this.updateProperty(updates.gpsTimeout, this.gpsTimeout),
      gpsAccuracyThreshold: this.updateProperty(updates.gpsAccuracyThreshold, this.gpsAccuracyThreshold),
      exportFormat: this.updateProperty(updates.exportFormat, this.exportFormat),
      defaultExportPeriod: this.updateProperty(updates.defaultExportPeriod, this.defaultExportPeriod),
      exportPrivacyLevel: this.updateProperty(updates.exportPrivacyLevel, this.exportPrivacyLevel),
      autoExportEnabled: this.updateProperty(updates.autoExportEnabled, this.autoExportEnabled),
      autoExportFrequency: this.updateProperty(updates.autoExportFrequency, this.autoExportFrequency),
      favoriteLocations: this.updateProperty(updates.favoriteLocations, this.favoriteLocations),
      notificationsEnabled: this.updateProperty(updates.notificationsEnabled, this.notificationsEnabled),
      offlineModeEnabled: this.updateProperty(updates.offlineModeEnabled, this.offlineModeEnabled),
      autoClearDataEnabled: this.updateProperty(updates.autoClearDataEnabled, this.autoClearDataEnabled),
      compactMode: this.updateProperty(updates.compactMode, this.compactMode),
      showTutorial: this.updateProperty(updates.showTutorial, this.showTutorial),
      firstLaunchDate: this.updateProperty(updates.firstLaunchDate, this.firstLaunchDate),
      appVersion: this.updateProperty(updates.appVersion, this.appVersion),
      lastBackupDate: this.updateProperty(updates.lastBackupDate, this.lastBackupDate),
      driverName: this.updateProperty(updates.driverName, this.driverName),
      vehicleInfo: this.updateProperty(updates.vehicleInfo, this.vehicleInfo)
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

  override validate(): ValidationResult {
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

  static override fromJSON(data: Record<string, any>): SettingsModel {
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