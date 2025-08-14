import { LocationModel } from '../../models/entities/LocationModel';
import { 
  GPSOptions, 
  AccuracyLevel, 
  PermissionState, 
  LocationType,
  ErrorCode, 
  AppError,
  IGPSService 
} from '../../types';

// GPS関連の定数
const GPS_CONSTANTS = {
  DEFAULT_TIMEOUT: 5000,
  DEFAULT_MAX_AGE: 30000,
  DEFAULT_RETRY_COUNT: 2,
  ACCURACY_THRESHOLDS: {
    HIGH: 20,
    MEDIUM: 50
  },
  PERMISSION_CHECK_TIMEOUT: 1000
} as const;

/**
 * GPS サービス実装
 * GPS位置情報の取得、権限管理、エラーハンドリングを提供
 */
export class GPSService implements IGPSService {
  private options: GPSOptions;

  constructor(initialOptions?: Partial<GPSOptions>) {
    this.options = this.getDefaultOptions();
    if (initialOptions) {
      this.updateOptions(initialOptions);
    }
  }

  /**
   * デフォルトオプションを取得
   */
  private getDefaultOptions(): GPSOptions {
    return {
      timeout: GPS_CONSTANTS.DEFAULT_TIMEOUT,
      enableHighAccuracy: true,
      maximumAge: GPS_CONSTANTS.DEFAULT_MAX_AGE,
      retryCount: GPS_CONSTANTS.DEFAULT_RETRY_COUNT
    };
  }

  /**
   * GPS位置情報を取得する
   * @param options オプション設定
   * @returns LocationModel形式の位置情報
   */
  async getCurrentPosition(options?: Partial<GPSOptions>): Promise<LocationModel> {
    this.validateGeolocationSupport();
    
    const mergedOptions = this.mergeOptions(options);
    
    return new Promise((resolve, reject) => {
      const retryCountRef = { current: 0 };
      
      const attemptGetPosition = () => {
        const positionOptions = this.createPositionOptions(mergedOptions);
        
        navigator.geolocation.getCurrentPosition(
          (position) => this.handlePositionSuccess(position, resolve, reject),
          (error) => this.handlePositionError(error, retryCountRef, mergedOptions, attemptGetPosition, reject),
          positionOptions
        );
      };
      
      attemptGetPosition();
    });
  }

  /**
   * Geolocation APIの利用可能性を検証
   */
  private validateGeolocationSupport(): void {
    if (!navigator.geolocation) {
      throw new AppError(
        ErrorCode.GPS_UNAVAILABLE,
        'GPS機能が利用できません'
      );
    }
  }

  /**
   * オプションをマージ
   */
  private mergeOptions(options?: Partial<GPSOptions>): GPSOptions {
    return { ...this.options, ...options };
  }

  /**
   * PositionOptionsを作成
   */
  private createPositionOptions(options: GPSOptions): PositionOptions {
    return {
      timeout: options.timeout,
      enableHighAccuracy: options.enableHighAccuracy,
      maximumAge: options.maximumAge
    };
  }

  /**
   * 位置取得成功時の処理
   */
  private handlePositionSuccess(
    position: GeolocationPosition,
    resolve: (value: LocationModel) => void,
    reject: (reason: any) => void
  ): void {
    try {
      const locationModel = this.createLocationFromPosition(position);
      resolve(locationModel);
    } catch (error) {
      reject(error);
    }
  }

  /**
   * GeolocationPositionからLocationModelを作成
   */
  private createLocationFromPosition(position: GeolocationPosition): LocationModel {
    const locationData = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      timestamp: new Date(position.timestamp),
      type: LocationType.GPS
    };
    
    return LocationModel.create(locationData);
  }

  /**
   * 位置取得エラー時の処理
   */
  private handlePositionError(
    error: GeolocationPositionError,
    retryCountRef: { current: number },
    options: GPSOptions,
    attemptGetPosition: () => void,
    reject: (reason: any) => void
  ): void {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        reject(new AppError(
          ErrorCode.GPS_PERMISSION_DENIED,
          '位置情報の利用が拒否されました'
        ));
        break;
      case error.POSITION_UNAVAILABLE:
        reject(new AppError(
          ErrorCode.GPS_UNAVAILABLE,
          'GPS機能が利用できません'
        ));
        break;
      case error.TIMEOUT:
        this.handleTimeout(retryCountRef, options, attemptGetPosition, reject);
        break;
      default:
        reject(new AppError(
          ErrorCode.UNKNOWN_ERROR,
          `GPS取得エラー: ${error.message}`
        ));
    }
  }

  /**
   * タイムアウト時の処理（リトライ機能付き）
   */
  private handleTimeout(
    retryCountRef: { current: number },
    options: GPSOptions,
    attemptGetPosition: () => void,
    reject: (reason: any) => void
  ): void {
    if (retryCountRef.current < options.retryCount) {
      retryCountRef.current++;
      attemptGetPosition();
    } else {
      reject(new AppError(
        ErrorCode.GPS_TIMEOUT,
        '位置情報の取得がタイムアウトしました'
      ));
    }
  }

  /**
   * GPS権限の状態を確認する
   * @returns 権限状態
   */
  async checkPermission(): Promise<PermissionState> {
    if (!navigator.permissions) {
      return PermissionState.PROMPT;
    }
    
    try {
      const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
      switch (result.state) {
        case 'granted':
          return PermissionState.GRANTED;
        case 'denied':
          return PermissionState.DENIED;
        case 'prompt':
        default:
          return PermissionState.PROMPT;
      }
    } catch (error) {
      // Permissions API が利用できない場合は PROMPT を返す
      return PermissionState.PROMPT;
    }
  }

  /**
   * GPS権限を要求する
   * @returns 権限要求結果
   */
  async requestPermission(): Promise<PermissionState> {
    if (!navigator.geolocation) {
      return PermissionState.DENIED;
    }
    
    return new Promise((resolve) => {
      const permissionOptions: PositionOptions = {
        timeout: GPS_CONSTANTS.PERMISSION_CHECK_TIMEOUT,
        enableHighAccuracy: false,
        maximumAge: Infinity
      };
      
      navigator.geolocation.getCurrentPosition(
        () => resolve(PermissionState.GRANTED),
        (error) => this.handlePermissionError(error, resolve),
        permissionOptions
      );
    });
  }

  /**
   * 権限要求時のエラー処理
   */
  private handlePermissionError(
    error: GeolocationPositionError,
    resolve: (value: PermissionState) => void
  ): void {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        resolve(PermissionState.DENIED);
        break;
      default:
        // タイムアウトや利用不可は権限許可済みと判定
        resolve(PermissionState.GRANTED);
    }
  }

  /**
   * GPSオプションを更新する
   * @param options 更新するオプション
   */
  updateOptions(options: Partial<GPSOptions>): void {
    // オプションの妥当性チェックとデフォルト値での補正
    const validatedOptions: Partial<GPSOptions> = {};
    
    if (options.timeout !== undefined) {
      validatedOptions.timeout = options.timeout > 0 ? options.timeout : 5000;
    }
    
    if (options.enableHighAccuracy !== undefined) {
      validatedOptions.enableHighAccuracy = options.enableHighAccuracy;
    }
    
    if (options.maximumAge !== undefined) {
      validatedOptions.maximumAge = options.maximumAge >= 0 ? options.maximumAge : 30000;
    }
    
    if (options.retryCount !== undefined) {
      validatedOptions.retryCount = options.retryCount >= 0 ? options.retryCount : 2;
    }
    
    this.options = { ...this.options, ...validatedOptions };
  }

  /**
   * 現在のGPSオプションを取得する
   * @returns 現在のオプション
   */
  getOptions(): GPSOptions {
    return { ...this.options };
  }

  /**
   * 位置情報の精度をチェックする
   * @param location 位置情報
   * @returns 精度レベル
   */
  checkAccuracy(location: LocationModel): AccuracyLevel {
    const accuracy = location.accuracy;
    
    if (!accuracy || accuracy < 0) {
      return AccuracyLevel.LOW;
    }
    
    return this.determineAccuracyLevel(accuracy);
  }

  /**
   * 精度値から精度レベルを決定
   */
  private determineAccuracyLevel(accuracy: number): AccuracyLevel {
    if (accuracy < GPS_CONSTANTS.ACCURACY_THRESHOLDS.HIGH) {
      return AccuracyLevel.HIGH;
    } else if (accuracy < GPS_CONSTANTS.ACCURACY_THRESHOLDS.MEDIUM) {
      return AccuracyLevel.MEDIUM;
    } else {
      return AccuracyLevel.LOW;
    }
  }

  /**
   * リソースをクリーンアップする
   */
  cleanup(): void {
    // 現在はクリーンアップする特別なリソースはないが、
    // 将来的にwatchPositionなどを追加した場合のために準備
  }
}