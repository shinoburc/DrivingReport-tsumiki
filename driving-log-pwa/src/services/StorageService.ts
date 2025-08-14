import { 
  DrivingLog, 
  Location, 
  AppSettings, 
  QueryOptions,
  ErrorCode,
  AppError,
  ExportFormat
} from '../types';

/**
 * ストレージサービス - IndexedDBとLocalStorageを使用したデータ永続化
 * 
 * PWAアプリケーション用の包括的なデータ永続化ソリューション
 * - 運転日報とルート情報の管理
 * - オフライン対応とデータ同期
 * - 高性能なクエリとインデックス最適化
 */
export class StorageService {
  private static readonly DB_NAME = 'DrivingLogDB';
  private static readonly DB_VERSION = 1;
  private static readonly STORES = {
    DRIVING_LOGS: 'drivingLogs',
    LOCATIONS: 'locations', 
    SETTINGS: 'settings'
  } as const;

  private static readonly SETTINGS_KEY = 'app-settings';

  private db: IDBDatabase | null = null;
  private initialized = false;

  /**
   * 初期化状態を取得
   */
  get isInitialized(): boolean {
    return this.initialized && this.db !== null;
  }

  /**
   * ストレージサービスを初期化
   */
  async initialize(): Promise<void> {
    // 重複初期化を防ぐ
    if (this.initialized) {
      return;
    }

    // IndexedDBサポートチェック
    if (!window.indexedDB) {
      throw new AppError(
        ErrorCode.STORAGE_UNAVAILABLE,
        'IndexedDB is not supported'
      );
    }

    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(StorageService.DB_NAME, StorageService.DB_VERSION);

      request.onerror = () => {
        reject(new AppError(
          ErrorCode.STORAGE_UNAVAILABLE,
          'Failed to open IndexedDB'
        ));
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        this.initialized = true;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        this.createObjectStores(db);
      };
    });
  }

  /**
   * IndexedDBオブジェクトストアとインデックスを作成
   */
  private createObjectStores(db: IDBDatabase): void {
    // 運転日報ストア
    if (!db.objectStoreNames.contains(StorageService.STORES.DRIVING_LOGS)) {
      const drivingLogsStore = db.createObjectStore(StorageService.STORES.DRIVING_LOGS, { keyPath: 'id' });
      drivingLogsStore.createIndex('by-date', 'date', { unique: false });
      drivingLogsStore.createIndex('by-status', 'status', { unique: false });
      drivingLogsStore.createIndex('by-createdAt', 'createdAt', { unique: false });
    }

    // 位置情報ストア
    if (!db.objectStoreNames.contains(StorageService.STORES.LOCATIONS)) {
      const locationsStore = db.createObjectStore(StorageService.STORES.LOCATIONS, { keyPath: 'id' });
      locationsStore.createIndex('by-timestamp', 'timestamp', { unique: false });
      locationsStore.createIndex('by-type', 'type', { unique: false });
    }

    // 設定ストア
    if (!db.objectStoreNames.contains(StorageService.STORES.SETTINGS)) {
      db.createObjectStore(StorageService.STORES.SETTINGS, { keyPath: 'key' });
    }
  }

  /**
   * IndexedDBストア操作の共通処理
   */
  private executeStoreOperation<T, R>(
    storeName: string,
    mode: IDBTransactionMode,
    operation: (store: IDBObjectStore) => IDBRequest<T>,
    resultProcessor: (result: T) => R,
    errorMessage: string
  ): Promise<R> {
    if (!this.isInitialized || !this.db) {
      throw new AppError(ErrorCode.STORAGE_UNAVAILABLE, 'Storage not initialized');
    }

    return new Promise<R>((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], mode);
      const store = transaction.objectStore(storeName);
      const request = operation(store);

      request.onerror = () => {
        const error = request.error;
        if (error && error.name === 'QuotaExceededError') {
          reject(new AppError(ErrorCode.STORAGE_QUOTA_EXCEEDED, 'Storage quota exceeded'));
        } else {
          reject(new AppError(ErrorCode.STORAGE_UNAVAILABLE, errorMessage));
        }
      };

      request.onsuccess = () => {
        resolve(resultProcessor(request.result));
      };
    });
  }

  /**
   * 運転日報を作成
   */
  async createDrivingLog(data: Omit<DrivingLog, 'id' | 'createdAt' | 'updatedAt'>): Promise<DrivingLog> {
    const now = new Date();
    const log: DrivingLog = {
      ...data,
      id: this.generateId(),
      createdAt: now,
      updatedAt: now
    };

    return this.executeStoreOperation(
      StorageService.STORES.DRIVING_LOGS,
      'readwrite',
      (store) => store.add(log),
      () => log,
      'Failed to create driving log'
    );
  }

  /**
   * 運転日報を取得
   */
  async getDrivingLog(id: string): Promise<DrivingLog | null> {
    return this.executeStoreOperation(
      StorageService.STORES.DRIVING_LOGS,
      'readonly',
      (store) => store.get(id),
      (result) => result || null,
      'Failed to get driving log'
    );
  }

  /**
   * 運転日報を更新
   */
  async updateDrivingLog(id: string, updates: Partial<Omit<DrivingLog, 'id' | 'createdAt'>>): Promise<DrivingLog> {
    // 既存データを取得
    const existing = await this.getDrivingLog(id);
    if (!existing) {
      throw new AppError(ErrorCode.INVALID_DATA_FORMAT, 'Driving log not found');
    }

    const updated: DrivingLog = {
      ...existing,
      ...updates,
      updatedAt: new Date()
    };

    return this.executeStoreOperation(
      StorageService.STORES.DRIVING_LOGS,
      'readwrite',
      (store) => store.put(updated),
      () => updated,
      'Failed to update driving log'
    );
  }

  /**
   * 運転日報を削除
   */
  async deleteDrivingLog(id: string): Promise<void> {
    // 存在確認
    const existing = await this.getDrivingLog(id);
    if (!existing) {
      throw new AppError(ErrorCode.INVALID_DATA_FORMAT, 'Driving log not found');
    }

    return this.executeStoreOperation(
      StorageService.STORES.DRIVING_LOGS,
      'readwrite',
      (store) => store.delete(id),
      () => undefined,
      'Failed to delete driving log'
    );
  }

  /**
   * 運転日報を検索
   */
  async queryDrivingLogs(options?: QueryOptions): Promise<DrivingLog[]> {
    if (!this.isInitialized || !this.db) {
      throw new AppError(ErrorCode.STORAGE_UNAVAILABLE, 'Storage not initialized');
    }

    return new Promise<DrivingLog[]>((resolve, reject) => {
      const transaction = this.db!.transaction(['drivingLogs'], 'readonly');
      const store = transaction.objectStore('drivingLogs');
      
      let request: IDBRequest<DrivingLog[]>;
      
      // インデックス使用の判定
      if (options?.status) {
        const index = store.index('by-status');
        request = index.getAll(options.status);
      } else if (options?.orderBy === 'date') {
        const index = store.index('by-date');
        request = index.getAll();
      } else if (options?.orderBy === 'createdAt') {
        const index = store.index('by-createdAt');
        request = index.getAll();
      } else {
        request = store.getAll();
      }

      request.onerror = () => {
        reject(new AppError(ErrorCode.STORAGE_UNAVAILABLE, 'Failed to query driving logs'));
      };

      request.onsuccess = () => {
        let results = request.result;

        // フィルタリング
        if (options?.startDate || options?.endDate) {
          results = results.filter(log => {
            if (options.startDate && log.date < options.startDate) return false;
            if (options.endDate && log.date > options.endDate) return false;
            return true;
          });
        }

        // ソート
        if (options?.orderBy) {
          results.sort((a, b) => {
            const field = options.orderBy!;
            const aVal = a[field as keyof DrivingLog];
            const bVal = b[field as keyof DrivingLog];
            
            // undefined値のハンドリング
            if (aVal === undefined && bVal === undefined) return 0;
            if (aVal === undefined) return options.order === 'desc' ? 1 : -1;
            if (bVal === undefined) return options.order === 'desc' ? -1 : 1;
            
            if (aVal < bVal) return options.order === 'desc' ? 1 : -1;
            if (aVal > bVal) return options.order === 'desc' ? -1 : 1;
            return 0;
          });
        }

        // リミット
        if (options?.limit) {
          results = results.slice(options.offset || 0, (options.offset || 0) + options.limit);
        }

        resolve(results);
      };
    });
  }

  /**
   * 位置情報を作成
   */
  async createLocation(data: Omit<Location, 'id'>): Promise<Location> {
    const location: Location = {
      ...data,
      id: this.generateId()
    };

    return this.executeStoreOperation(
      StorageService.STORES.LOCATIONS,
      'readwrite',
      (store) => store.add(location),
      () => location,
      'Failed to create location'
    );
  }

  /**
   * 位置情報を取得
   */
  async getLocation(id: string): Promise<Location | null> {
    return this.executeStoreOperation(
      StorageService.STORES.LOCATIONS,
      'readonly',
      (store) => store.get(id),
      (result) => result || null,
      'Failed to get location'
    );
  }

  /**
   * 位置情報を更新
   */
  async updateLocation(id: string, updates: Partial<Omit<Location, 'id'>>): Promise<Location> {
    const existing = await this.getLocation(id);
    if (!existing) {
      throw new AppError(ErrorCode.INVALID_DATA_FORMAT, 'Location not found');
    }

    const updated: Location = { ...existing, ...updates };

    return this.executeStoreOperation(
      StorageService.STORES.LOCATIONS,
      'readwrite',
      (store) => store.put(updated),
      () => updated,
      'Failed to update location'
    );
  }

  /**
   * 位置情報を削除
   */
  async deleteLocation(id: string): Promise<void> {
    const existing = await this.getLocation(id);
    if (!existing) {
      throw new AppError(ErrorCode.INVALID_DATA_FORMAT, 'Location not found');
    }

    return this.executeStoreOperation(
      StorageService.STORES.LOCATIONS,
      'readwrite',
      (store) => store.delete(id),
      () => undefined,
      'Failed to delete location'
    );
  }

  /**
   * 位置情報を検索
   */
  async queryLocations(options?: QueryOptions): Promise<Location[]> {
    if (!this.isInitialized || !this.db) {
      throw new AppError(ErrorCode.STORAGE_UNAVAILABLE, 'Storage not initialized');
    }

    return new Promise<Location[]>((resolve, reject) => {
      const transaction = this.db!.transaction(['locations'], 'readonly');
      const store = transaction.objectStore('locations');
      const request = store.getAll();

      request.onerror = () => {
        reject(new AppError(ErrorCode.STORAGE_UNAVAILABLE, 'Failed to query locations'));
      };

      request.onsuccess = () => {
        let results = request.result;

        // 基本フィルタリング（簡易実装）
        if (options?.limit) {
          results = results.slice(0, options.limit);
        }

        resolve(results);
      };
    });
  }

  /**
   * アプリケーション設定を取得
   */
  async getSettings(): Promise<AppSettings> {
    // LocalStorageからの取得（簡易実装）
    try {
      const stored = localStorage.getItem(StorageService.SETTINGS_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      // Fallback to defaults
    }

    // デフォルト設定
    const defaultSettings: AppSettings = {
      language: 'ja',
      gpsTimeout: 10,
      autoExportEnabled: false,
      exportFormat: ExportFormat.CSV,
      favoriteLocations: [],
      theme: 'auto'
    };

    return defaultSettings;
  }

  /**
   * アプリケーション設定を更新
   */
  async updateSettings(updates: Partial<AppSettings>): Promise<AppSettings> {
    const current = await this.getSettings();
    const updated = { ...current, ...updates };

    try {
      localStorage.setItem(StorageService.SETTINGS_KEY, JSON.stringify(updated));
    } catch (error) {
      throw new AppError(ErrorCode.STORAGE_QUOTA_EXCEEDED, 'Failed to save settings');
    }

    return updated;
  }

  /**
   * 全てのデータを削除（テスト用）
   */
  async clear(): Promise<void> {
    if (!this.isInitialized || !this.db) {
      return;
    }

    return new Promise<void>((resolve, reject) => {
      const transaction = this.db!.transaction(['drivingLogs', 'locations'], 'readwrite');
      
      const drivingLogsStore = transaction.objectStore('drivingLogs');
      const locationsStore = transaction.objectStore('locations');
      
      let completedOperations = 0;
      const totalOperations = 2;
      
      const checkComplete = () => {
        completedOperations++;
        if (completedOperations === totalOperations) {
          resolve();
        }
      };

      const clearStore = (store: IDBObjectStore, storeName: string) => {
        try {
          if (typeof store.clear === 'function') {
            const clearRequest = store.clear();
            clearRequest.onsuccess = checkComplete;
            clearRequest.onerror = () => {
              reject(new AppError(ErrorCode.STORAGE_UNAVAILABLE, `Failed to clear ${storeName}`));
            };
          } else {
            // clear()が使えない場合のフォールバック
            if (typeof store.getAllKeys === 'function') {
              const getAllKeysRequest = store.getAllKeys();
              getAllKeysRequest.onsuccess = () => {
                const keys = getAllKeysRequest.result;
                if (keys.length === 0) {
                  checkComplete();
                  return;
                }
                
                let deletedCount = 0;
                keys.forEach(key => {
                  const deleteRequest = store.delete(key);
                  deleteRequest.onsuccess = () => {
                    deletedCount++;
                    if (deletedCount === keys.length) {
                      checkComplete();
                    }
                  };
                  deleteRequest.onerror = () => {
                    reject(new AppError(ErrorCode.STORAGE_UNAVAILABLE, `Failed to delete from ${storeName}`));
                  };
                });
              };
              getAllKeysRequest.onerror = () => {
                reject(new AppError(ErrorCode.STORAGE_UNAVAILABLE, `Failed to get keys from ${storeName}`));
              };
            } else {
              // getAllKeysもopenCursorも使えない場合（テスト環境等）
              // この場合は空のクリア操作として完了
              console.warn(`Clear operation not supported for ${storeName} in this environment`);
              checkComplete();
            }
          }
        } catch (error) {
          reject(new AppError(ErrorCode.STORAGE_UNAVAILABLE, `Error clearing ${storeName}: ${error}`));
        }
      };

      clearStore(drivingLogsStore, 'driving logs');
      clearStore(locationsStore, 'locations');

      transaction.onerror = () => {
        reject(new AppError(ErrorCode.STORAGE_UNAVAILABLE, 'Transaction failed during clear'));
      };
    });
  }

  /**
   * データをエクスポート
   */
  async export(): Promise<Blob> {
    const drivingLogs = await this.queryDrivingLogs();
    const locations = await this.queryLocations();
    const settings = await this.getSettings();

    const exportData = {
      drivingLogs,
      locations,
      settings,
      exportedAt: new Date().toISOString()
    };

    return new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
  }

  /**
   * データをインポート
   */
  async import(data: Blob): Promise<void> {
    try {
      const text = await data.text();
      const importData = JSON.parse(text);

      // データ検証（簡易）
      if (!importData.drivingLogs || !Array.isArray(importData.drivingLogs)) {
        throw new Error('Invalid import data format');
      }

      // 既存データをクリア
      await this.clear();

      // データを復元
      for (const log of importData.drivingLogs) {
        await this.createDrivingLog(log);
      }

      if (importData.locations) {
        for (const location of importData.locations) {
          await this.createLocation(location);
        }
      }

      if (importData.settings) {
        await this.updateSettings(importData.settings);
      }
    } catch (error) {
      throw new AppError(ErrorCode.INVALID_DATA_FORMAT, 'Failed to import data');
    }
  }

  /**
   * ユニークIDを生成 (timestamp + random文字列)
   * 
   * @returns 一意なID文字列 (例: "1642176000123-x4k8n2p9q")
   */
  private generateId(): string {
    const timestamp = Date.now();
    const randomPart = Math.random().toString(36).substring(2, 11);
    return `${timestamp}-${randomPart}`;
  }
}