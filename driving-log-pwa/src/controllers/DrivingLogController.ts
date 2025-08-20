import { LocationController } from './LocationController';
import { StorageService } from '../services/StorageService';
import { DrivingLogModel } from '../models/entities/DrivingLogModel';
import { LocationModel } from '../models/entities/LocationModel';
import {
  IDrivingLogController,
  DrivingLogStatus,
  LocationType,
  QueryOptions,
  AutoSaveConfig,
  DrivingLog,
  Location,
  AppError,
  ErrorCode
} from '../types';

/**
 * 運転日報コントローラー実装
 * 運転記録の作成・管理・状態制御を提供
 */
export class DrivingLogController implements IDrivingLogController {
  private locationController: LocationController;
  private storageService: StorageService;
  private logs: Map<string, DrivingLogModel> = new Map();
  private autoSaveConfigs: Map<string, AutoSaveConfig> = new Map();
  private autoSaveTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(locationController: LocationController, storageService: StorageService) {
    this.locationController = locationController;
    this.storageService = storageService;
  }

  /**
   * 記録の作成
   */
  async createLog(initialData?: Partial<DrivingLog>): Promise<DrivingLogModel> {
    // 未来日付のチェック
    if (initialData?.date) {
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (initialData.date > today) {
        throw new Error('未来の日付は設定できません');
      }
    }

    // デフォルト値の設定
    const logData: Partial<DrivingLog> = {
      date: new Date(),
      startTime: new Date(),
      startLocation: { 
        id: 'temp-start',
        name: '開始地点',
        latitude: 0,
        longitude: 0,
        timestamp: new Date(),
        type: LocationType.START
      },
      waypoints: [],
      status: DrivingLogStatus.IN_PROGRESS,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...initialData
    };

    // DrivingLogModelの作成
    const log = DrivingLogModel.create(logData);

    // ストレージに保存
    await this.storageService.createDrivingLog(log);
    this.logs.set(log.id, log);

    return log;
  }

  /**
   * 記録の取得
   */
  async getLog(logId: string): Promise<DrivingLogModel | null> {
    // まずメモリキャッシュから確認
    if (this.logs.has(logId)) {
      return this.logs.get(logId)!;
    }
    
    // ストレージから取得
    const log = await this.storageService.getDrivingLog(logId);
    if (log) {
      const logModel = DrivingLogModel.fromStorageFormat(log);
      this.logs.set(logId, logModel);
      return logModel;
    }
    return null;
  }

  /**
   * アクティブな記録の取得
   */
  async getActiveLogs(): Promise<DrivingLogModel[]> {
    const allLogs = await this.storageService.queryDrivingLogs() || [];
    return allLogs
      .filter(log => log.status === DrivingLogStatus.IN_PROGRESS)
      .map(log => DrivingLogModel.fromStorageFormat(log));
  }

  /**
   * すべての記録を取得
   */
  async getAllLogs(options?: QueryOptions): Promise<DrivingLogModel[]> {
    let logs = await this.storageService.queryDrivingLogs() || [];
    const logModels = logs.map(log => DrivingLogModel.fromStorageFormat(log));

    // フィルタリング
    let filteredModels = logModels;
    if (options) {
      if (options.startDate) {
        filteredModels = filteredModels.filter(log => new Date(log.date) >= options.startDate!);
      }
      if (options.endDate) {
        filteredModels = filteredModels.filter(log => new Date(log.date) <= options.endDate!);
      }
      if (options.status) {
        filteredModels = filteredModels.filter(log => log.status === options.status);
      }
      if (!options.includeDeleted) {
        filteredModels = filteredModels.filter(log => !(log as any).deletedAt);
      }

      // ソート
      if (options.sortBy) {
        filteredModels.sort((a, b) => {
          let comparison = 0;
          switch (options.sortBy) {
            case 'date':
              comparison = new Date(b.date).getTime() - new Date(a.date).getTime();
              break;
            case 'distance':
              comparison = (b.totalDistance || 0) - (a.totalDistance || 0);
              break;
            case 'duration':
              comparison = this.calculateDuration(b.id) - this.calculateDuration(a.id);
              break;
          }
          return options.sortOrder === 'asc' ? -comparison : comparison;
        });
      }

      // ページネーション
      if (options.offset !== undefined && options.limit !== undefined) {
        filteredModels = filteredModels.slice(options.offset, options.offset + options.limit);
      }
    }

    return filteredModels;
  }

  /**
   * 記録の更新
   */
  async updateLog(logId: string, updates: Partial<DrivingLog>): Promise<DrivingLogModel> {
    const log = await this.getLog(logId);
    if (!log) {
      throw new Error('指定された記録が見つかりません');
    }

    // 更新データの作成
    const updated = DrivingLogModel.create({
      ...log,
      ...updates,
      id: log.id, // IDは変更しない
      createdAt: log.createdAt, // 作成日時は変更しない
      updatedAt: new Date()
    });

    // ストレージに保存
    try {
      await this.storageService.updateDrivingLog(logId, updated);
      this.logs.set(logId, updated);
    } catch (error) {
      console.error('Failed to update log in storage:', error);
      // メモリキャッシュには保存して続行
      this.logs.set(logId, updated);
    }

    // 未保存フラグを立てる
    const autoSaveConfig = this.autoSaveConfigs.get(logId);
    if (autoSaveConfig) {
      autoSaveConfig.unsavedChanges = true;
    }

    return updated;
  }

  /**
   * 記録の削除
   */
  async deleteLog(logId: string, soft: boolean = true): Promise<void> {
    if (soft) {
      // 論理削除
      await this.updateLog(logId, { deletedAt: new Date() } as any);
    } else {
      // 物理削除
      await this.storageService.deleteDrivingLog(logId);
      this.logs.delete(logId);
    }
  }

  /**
   * 地点の追加
   */
  async addLocation(logId: string, location: LocationModel, type: LocationType): Promise<DrivingLogModel> {
    const log = await this.getLog(logId);
    if (!log) {
      throw new Error('指定された記録が見つかりません');
    }

    const locationData: Location = {
      id: location.id,
      name: location.name,
      latitude: location.latitude,
      longitude: location.longitude,
      address: location.address,
      timestamp: new Date(),
      type: type
    };

    let updates: Partial<DrivingLog> = {};

    switch (type) {
      case LocationType.START:
      case LocationType.DEPARTURE:
        updates = { 
          startLocation: locationData,
          startTime: new Date()
        };
        break;
      case LocationType.WAYPOINT:
        updates = { 
          waypoints: [...log.waypoints, locationData]
        };
        break;
      case LocationType.END:
      case LocationType.ARRIVAL:
        updates = { 
          endLocation: locationData,
          endTime: new Date()
        };
        break;
    }

    return this.updateLog(logId, updates);
  }

  /**
   * クイックスタート
   */
  async quickStart(startLocation?: LocationModel): Promise<DrivingLogModel> {
    let location: LocationModel;

    if (startLocation) {
      location = startLocation;
    } else {
      // GPSから現在位置を取得
      location = await this.locationController.recordCurrentLocation();
    }

    const log = await this.createLog({
      startLocation: {
        id: location.id,
        name: location.name || '出発地点',
        latitude: location.latitude,
        longitude: location.longitude,
        address: location.address,
        timestamp: new Date(),
        type: LocationType.START
      },
      startTime: new Date()
    });

    // 自動保存を有効化
    this.enableAutoSave(log.id);

    return log;
  }

  /**
   * 経由地点のクイック追加
   */
  async quickAddWaypoint(logId: string, location: LocationModel): Promise<DrivingLogModel> {
    const updated = await this.addLocation(logId, location, LocationType.WAYPOINT);
    
    // 自動保存
    await this.saveLog(logId);
    
    return updated;
  }

  /**
   * クイック完了
   */
  async quickComplete(logId: string, endLocation: LocationModel): Promise<DrivingLogModel> {
    const log = await this.getLog(logId);
    if (!log) {
      throw new Error('指定された記録が見つかりません');
    }

    // 到着地点を設定
    let updated = await this.addLocation(logId, endLocation, LocationType.END);

    // 距離と時間を計算
    const distance = this.calculateDistance(logId);
    const duration = this.calculateDuration(logId);

    // ステータスを完了に変更
    updated = await this.updateLog(logId, {
      status: DrivingLogStatus.COMPLETED,
      endTime: new Date(),
      totalDistance: distance,
      duration: duration
    } as any);

    // 自動保存を無効化
    this.disableAutoSave(logId);

    return updated;
  }

  /**
   * 状態変更
   */
  async changeStatus(logId: string, newStatus: DrivingLogStatus): Promise<DrivingLogModel> {
    const log = await this.getLog(logId);
    if (!log) {
      throw new Error('指定された記録が見つかりません');
    }

    // 状態遷移の検証
    if (!this.isValidStatusTransition(log.status, newStatus)) {
      throw new Error('不正な状態遷移です');
    }

    return this.updateLog(logId, { status: newStatus });
  }

  /**
   * 記録の完了
   */
  async completeLog(logId: string): Promise<DrivingLogModel> {
    return this.changeStatus(logId, DrivingLogStatus.COMPLETED);
  }

  /**
   * 記録のキャンセル
   */
  async cancelLog(logId: string, reason?: string): Promise<DrivingLogModel> {
    const updated = await this.changeStatus(logId, DrivingLogStatus.CANCELLED);
    
    if (reason) {
      return this.updateLog(logId, { memo: reason } as any);
    }
    
    return updated;
  }

  /**
   * 自動保存の有効化
   */
  enableAutoSave(logId: string, interval: number = 30000): void {
    // 既存のタイマーをクリア
    this.disableAutoSave(logId);

    // 設定を保存
    this.autoSaveConfigs.set(logId, {
      enabled: true,
      interval,
      lastSaveTime: new Date(),
      unsavedChanges: false
    });

    // タイマーを設定
    const timer = setInterval(async () => {
      const config = this.autoSaveConfigs.get(logId);
      if (config?.unsavedChanges) {
        await this.saveLog(logId);
      }
    }, interval);

    this.autoSaveTimers.set(logId, timer);
  }

  /**
   * 自動保存の無効化
   */
  disableAutoSave(logId: string): void {
    const timer = this.autoSaveTimers.get(logId);
    if (timer) {
      clearInterval(timer);
      this.autoSaveTimers.delete(logId);
    }
    this.autoSaveConfigs.delete(logId);
  }

  /**
   * 記録の保存
   */
  async saveLog(logId: string): Promise<void> {
    const log = this.logs.get(logId);
    if (!log) {
      throw new Error('指定された記録が見つかりません');
    }

    await this.storageService.createDrivingLog(log);

    const config = this.autoSaveConfigs.get(logId);
    if (config) {
      config.lastSaveTime = new Date();
      config.unsavedChanges = false;
    }
  }

  /**
   * 進行中記録の復旧
   */
  async recoverInProgressLogs(): Promise<DrivingLogModel[]> {
    const allLogs = await this.storageService.queryDrivingLogs() || [];
    const inProgressLogs = allLogs
      .filter(log => log.status === DrivingLogStatus.IN_PROGRESS)
      .map(log => DrivingLogModel.fromStorageFormat(log));
    
    // キャッシュに保存
    inProgressLogs.forEach(log => {
      this.logs.set(log.id, log);
    });

    return inProgressLogs;
  }

  /**
   * 未保存変更の確認
   */
  hasUnsavedChanges(logId: string): boolean {
    const config = this.autoSaveConfigs.get(logId);
    return config?.unsavedChanges || false;
  }

  /**
   * 最終保存時刻の取得
   */
  getLastSaveTime(logId: string): Date | null {
    const config = this.autoSaveConfigs.get(logId);
    return config?.lastSaveTime || null;
  }

  /**
   * 走行距離の計算
   */
  calculateDistance(logId: string): number {
    const log = this.logs.get(logId);
    if (!log) return 0;

    let totalDistance = 0;
    const points: Location[] = [];

    if (log.startLocation) points.push(log.startLocation);
    points.push(...log.waypoints);
    if (log.endLocation) points.push(log.endLocation);

    for (let i = 0; i < points.length - 1; i++) {
      totalDistance += this.getDistanceBetweenPoints(points[i], points[i + 1]);
    }

    return Math.round(totalDistance * 10) / 10; // 小数点第1位まで
  }

  /**
   * 所要時間の計算（分）
   */
  calculateDuration(logId: string): number {
    const log = this.logs.get(logId) || this.getCachedLog(logId);
    if (!log) return 0;

    const startTime = (log as any).startTime || log.createdAt;
    const endTime = (log as any).endTime || new Date();

    const durationMs = new Date(endTime).getTime() - new Date(startTime).getTime();
    return Math.round(durationMs / 1000 / 60); // 分単位
  }

  /**
   * キャッシュからログを取得（テスト用）
   */
  private getCachedLog(logId: string): any {
    // テスト環境での直接アクセス用
    return null;
  }

  /**
   * 期間内総距離の集計
   */
  async getTotalDistance(startDate?: Date, endDate?: Date): Promise<number> {
    const logs = await this.getAllLogs({
      startDate,
      endDate,
      status: DrivingLogStatus.COMPLETED
    });

    return logs.reduce((total, log) => {
      return total + (log.totalDistance || this.calculateDistance(log.id));
    }, 0);
  }

  /**
   * 状態遷移の妥当性チェック
   */
  private isValidStatusTransition(current: DrivingLogStatus, next: DrivingLogStatus): boolean {
    if (current === DrivingLogStatus.IN_PROGRESS) {
      return next === DrivingLogStatus.COMPLETED || next === DrivingLogStatus.CANCELLED;
    }
    return false; // COMPLETED/CANCELLEDからの遷移は不可
  }

  /**
   * 2点間の距離計算（Haversine formula）
   */
  private getDistanceBetweenPoints(point1: Location, point2: Location): number {
    const R = 6371; // 地球の半径（km）
    const lat1 = point1.latitude * Math.PI / 180;
    const lat2 = point2.latitude * Math.PI / 180;
    const deltaLat = (point2.latitude - point1.latitude) * Math.PI / 180;
    const deltaLon = (point2.longitude - point1.longitude) * Math.PI / 180;

    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }
}