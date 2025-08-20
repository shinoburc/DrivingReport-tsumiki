import { GPSService } from '../services/gps/GPSService';
import { StorageService } from '../services/StorageService';
import { LocationModel } from '../models/entities/LocationModel';
import {
  ILocationController,
  RecordOptions,
  ManualLocationInput,
  SearchCriteria,
  FavoriteLocation,
  LocationType,
  AppError,
  ErrorCode
} from '../types';

/**
 * 位置情報コントローラー実装
 * GPS取得、手動入力、よく使う地点管理などの位置情報関連機能を提供
 */
export class LocationController implements ILocationController {
  private gpsService: GPSService;
  private storageService: StorageService;
  private favoriteLocations: FavoriteLocation[] = [];

  constructor(gpsService: GPSService, storageService: StorageService) {
    this.gpsService = gpsService;
    this.storageService = storageService;
    this.loadFavoriteLocations();
  }

  /**
   * よく使う地点をストレージから読み込み
   */
  private async loadFavoriteLocations(): Promise<void> {
    try {
      const favorites = JSON.parse(localStorage.getItem('favoriteLocations') || '[]');
      this.favoriteLocations = favorites || [];
    } catch (error) {
      console.error('Failed to load favorite locations:', error);
      this.favoriteLocations = [];
    }
  }

  /**
   * GPS位置情報の記録
   */
  async recordCurrentLocation(options?: RecordOptions): Promise<LocationModel> {
    try {
      // GPSから現在位置を取得
      const gpsLocation = await this.gpsService.getCurrentPosition({
        enableHighAccuracy: options?.requireHighAccuracy ?? true
      });

      // 地点名の設定
      let locationName = options?.name || '';
      if (!locationName && options?.autoName) {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        locationName = `${year}-${month}-${day} ${hours}:${minutes} 地点`;
      }

      // LocationModelの作成
      const location = LocationModel.create({
        ...gpsLocation,
        name: locationName || gpsLocation.name || 'GPS地点',
        type: options?.type || gpsLocation.type || LocationType.GPS,
        timestamp: new Date()
      });

      // ストレージに保存
      const locations = JSON.parse(localStorage.getItem('locations') || '[]');
      locations.push(location);
      localStorage.setItem('locations', JSON.stringify(locations));

      return location;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        ErrorCode.GPS_UNAVAILABLE,
        'GPS位置情報の取得に失敗しました。手動入力をお試しください。'
      );
    }
  }

  /**
   * 手動入力による地点記録
   */
  async recordManualLocation(input: ManualLocationInput): Promise<LocationModel> {
    // バリデーション
    if (!input.name || input.name.trim() === '') {
      throw new Error('地点名は必須です');
    }

    if (input.latitude !== undefined) {
      if (input.latitude < -90 || input.latitude > 90) {
        throw new Error('緯度は-90〜90の範囲で入力してください');
      }
    }

    if (input.longitude !== undefined) {
      if (input.longitude < -180 || input.longitude > 180) {
        throw new Error('経度は-180〜180の範囲で入力してください');
      }
    }

    // LocationModelの作成
    const location = LocationModel.create({
      name: input.name,
      address: input.address,
      latitude: input.latitude || 0,
      longitude: input.longitude || 0,
      type: LocationType.MANUAL,
      note: input.memo,
      timestamp: new Date()
    });

    // ストレージに保存
    const locations = JSON.parse(localStorage.getItem('locations') || '[]');
    const index = locations.findIndex(loc => loc.id === location.id);
    if (index >= 0) {
      locations[index] = location;
    } else {
      locations.push(location);
    }
    localStorage.setItem('locations', JSON.stringify(locations));

    return location;
  }

  /**
   * よく使う地点の追加
   */
  async addFavoriteLocation(location: LocationModel, category?: string): Promise<void> {
    // 既存のよく使う地点を取得
    const favorites = JSON.parse(localStorage.getItem('favoriteLocations') || '[]');

    // 新しいよく使う地点を作成
    const favoriteLocation: FavoriteLocation = {
      ...location,
      name: location.name || '名称未設定',
      latitude: location.latitude || 0,
      longitude: location.longitude || 0,
      category: category || '未分類',
      usageCount: 0,
      lastUsed: undefined,
      isDefault: false
    };

    // リストに追加
    favorites.push(favoriteLocation);

    // ストレージに保存
    localStorage.setItem('favoriteLocations', JSON.stringify(favorites));
    this.favoriteLocations = favorites;
  }

  /**
   * よく使う地点の取得
   */
  async getFavoriteLocations(category?: string): Promise<FavoriteLocation[]> {
    const favorites = JSON.parse(localStorage.getItem('favoriteLocations') || '[]');

    // カテゴリでフィルタリング
    let filtered = favorites;
    if (category) {
      filtered = favorites.filter((f: FavoriteLocation) => f.category === category);
    }

    // 使用回数でソート（降順）
    return filtered.sort((a: FavoriteLocation, b: FavoriteLocation) => 
      (b.usageCount || 0) - (a.usageCount || 0)
    );
  }

  /**
   * よく使う地点の削除
   */
  async removeFavoriteLocation(locationId: string): Promise<void> {
    const favorites = JSON.parse(localStorage.getItem('favoriteLocations') || '[]');
    const filtered = favorites.filter((f: FavoriteLocation) => f.id !== locationId);
    
    localStorage.setItem('favoriteLocations', JSON.stringify(filtered));
    this.favoriteLocations = filtered;
  }

  /**
   * 位置情報の検索
   */
  async searchLocations(criteria: SearchCriteria): Promise<LocationModel[]> {
    const allLocations = JSON.parse(localStorage.getItem('locations') || '[]');
    let filtered = [...allLocations];

    // クエリでフィルタリング
    if (criteria.query) {
      const query = criteria.query.toLowerCase();
      filtered = filtered.filter(loc => 
        loc.name?.toLowerCase().includes(query) ||
        loc.address?.toLowerCase().includes(query) ||
        loc.memo?.toLowerCase().includes(query)
      );
    }

    // 日付範囲でフィルタリング
    if (criteria.startDate) {
      filtered = filtered.filter(loc => 
        new Date(loc.timestamp) >= criteria.startDate!
      );
    }
    if (criteria.endDate) {
      filtered = filtered.filter(loc => 
        new Date(loc.timestamp) <= criteria.endDate!
      );
    }

    // タイプでフィルタリング
    if (criteria.type) {
      filtered = filtered.filter(loc => loc.type === criteria.type);
    }

    // ソート
    if (criteria.sortBy) {
      filtered.sort((a, b) => {
        let comparison = 0;
        
        switch (criteria.sortBy) {
          case 'date':
            comparison = new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
            break;
          case 'name':
            comparison = (a.name || '').localeCompare(b.name || '');
            break;
        }

        return criteria.sortOrder === 'asc' ? -comparison : comparison;
      });
    }

    // 件数制限
    if (criteria.limit) {
      filtered = filtered.slice(0, criteria.limit);
    }

    return filtered;
  }

  /**
   * 最近の位置情報取得
   */
  async getRecentLocations(limit: number = 20): Promise<LocationModel[]> {
    const allLocations = JSON.parse(localStorage.getItem('locations') || '[]');
    
    // 日付でソート（新しい順）
    const sorted = allLocations.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // 指定件数を返す
    return sorted.slice(0, limit);
  }

  /**
   * GPS利用可能性チェック
   */
  isGPSAvailable(): boolean {
    return this.gpsService.isAvailable();
  }

  /**
   * 位置情報の更新
   */
  async updateLocation(locationId: string, updates: Partial<LocationModel>): Promise<LocationModel> {
    const locations = JSON.parse(localStorage.getItem('locations') || '[]');
    const location = locations.find(loc => loc.id === locationId);
    
    if (!location) {
      throw new Error('指定された位置情報が見つかりません');
    }

    // 更新を適用
    const updated = {
      ...location,
      ...updates,
      id: location.id, // IDは変更しない
      timestamp: location.timestamp // タイムスタンプは変更しない
    };

    // ストレージに保存
    const index = locations.findIndex(loc => loc.id === updated.id);
    if (index >= 0) {
      locations[index] = updated;
      localStorage.setItem('locations', JSON.stringify(locations));
    }

    return updated;
  }

  /**
   * 位置情報の削除
   */
  async deleteLocation(locationId: string): Promise<void> {
    const locations = JSON.parse(localStorage.getItem('locations') || '[]');
    const filteredLocations = locations.filter(loc => loc.id !== locationId);
    localStorage.setItem('locations', JSON.stringify(filteredLocations));
    const success = true;
    
    if (!success) {
      throw new Error('位置情報の削除に失敗しました');
    }
  }

  /**
   * 現在位置を取得
   */
  async getCurrentLocation(): Promise<LocationModel> {
    return this.recordCurrentLocation();
  }

  /**
   * 位置情報が利用可能かチェック
   */
  isLocationAvailable(): boolean {
    return this.isGPSAvailable();
  }

  /**
   * 位置精度を取得
   */
  getLocationAccuracy(location: LocationModel): number {
    return location.accuracy || 0;
  }

  /**
   * 高精度かどうか判定
   */
  isHighAccuracy(location: LocationModel): boolean {
    const accuracy = this.getLocationAccuracy(location);
    return accuracy > 0 && accuracy <= 10; // 10m以下を高精度とする
  }

  /**
   * 2つの位置間の距離を計算
   */
  calculateDistance(location1: LocationModel, location2: LocationModel): number {
    if (!location1.latitude || !location1.longitude || !location2.latitude || !location2.longitude) {
      return 0;
    }

    const R = 6371; // 地球の半径（km）
    const lat1 = location1.latitude * Math.PI / 180;
    const lat2 = location2.latitude * Math.PI / 180;
    const deltaLat = (location2.latitude - location1.latitude) * Math.PI / 180;
    const deltaLon = (location2.longitude - location1.longitude) * Math.PI / 180;

    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * 位置監視を開始
   */
  watchLocation(callback: (location: LocationModel) => void): void {
    // 簡単な実装：定期的に現在位置を取得
    // 実際の実装ではGeolocation APIのwatchPositionを使用
    console.log('Location watching started');
  }

  /**
   * 位置監視を停止
   */
  stopWatchingLocation(watchId?: any): void {
    console.log('Location watching stopped', watchId);
  }
}