import { DrivingLogController } from './DrivingLogController';
import { StorageService } from '../services/StorageService';
import { DrivingLogModel } from '../models/entities/DrivingLogModel';
import {
  IHistoryController,
  HistoryQueryOptions,
  HistoryFilters,
  SortOptions,
  SearchQuery,
  DateRange,
  ViewSettings,
  HistoryListResult,
  HistoryPage,
  HistoryStatistics,
  DrivingLogStatus,
  PaginationOptions
} from '../types';

/**
 * 履歴管理コントローラー実装
 * 運転記録の一覧表示・検索・フィルタリング機能を提供
 */
export class HistoryController implements IHistoryController {
  private drivingLogController: DrivingLogController;
  private storageService: StorageService;
  private defaultPageSize = 20;
  private maxSearchHistory = 10;

  constructor(drivingLogController: DrivingLogController, storageService: StorageService) {
    this.drivingLogController = drivingLogController;
    this.storageService = storageService;
  }

  /**
   * 履歴一覧の取得
   */
  async getHistoryList(options?: HistoryQueryOptions): Promise<HistoryListResult> {
    // 全データを取得
    let allLogs = await this.storageService.getAll('drivingLogs') || [];

    // フィルタリング
    if (options?.filters) {
      allLogs = this.applyFilters(allLogs, options.filters);
    }

    // 検索
    if (options?.search) {
      allLogs = this.applySearch(allLogs, { text: options.search });
    }

    // ソート
    if (options?.sort) {
      allLogs = this.applySorting(allLogs, options.sort);
    } else {
      // デフォルトソート（日付降順）
      allLogs = this.applySorting(allLogs, { field: 'date', order: 'desc' });
    }

    // ページネーション
    const pageSize = options?.pagination?.size || this.defaultPageSize;
    const page = options?.pagination?.page || 1;
    const offset = (page - 1) * pageSize;

    const paginatedItems = allLogs.slice(offset, offset + pageSize);
    const hasMore = offset + pageSize < allLogs.length;

    return {
      items: paginatedItems,
      totalCount: allLogs.length,
      hasMore,
      nextCursor: hasMore ? `${page + 1}` : undefined
    };
  }

  /**
   * 履歴の検索
   */
  async searchHistory(query: SearchQuery): Promise<HistoryListResult> {
    const allLogs = await this.storageService.getAll('drivingLogs') || [];
    const filteredLogs = this.applySearch(allLogs, query);

    // 検索結果を最新順でソート
    const sortedLogs = this.applySorting(filteredLogs, { field: 'date', order: 'desc' });

    // 結果数制限
    const maxResults = query.maxResults || 100;
    const limitedLogs = sortedLogs.slice(0, maxResults);

    return {
      items: limitedLogs,
      totalCount: filteredLogs.length,
      hasMore: filteredLogs.length > maxResults
    };
  }

  /**
   * 履歴のフィルタリング
   */
  async filterHistory(filters: HistoryFilters): Promise<HistoryListResult> {
    const allLogs = await this.storageService.getAll('drivingLogs') || [];
    const filteredLogs = this.applyFilters(allLogs, filters);

    // フィルタ結果を最新順でソート
    const sortedLogs = this.applySorting(filteredLogs, { field: 'date', order: 'desc' });

    return {
      items: sortedLogs,
      totalCount: filteredLogs.length,
      hasMore: false
    };
  }

  /**
   * 履歴のソート
   */
  async sortHistory(sortOptions: SortOptions): Promise<HistoryListResult> {
    const allLogs = await this.storageService.getAll('drivingLogs') || [];
    const sortedLogs = this.applySorting(allLogs, sortOptions);

    return {
      items: sortedLogs,
      totalCount: sortedLogs.length,
      hasMore: false
    };
  }

  /**
   * 履歴詳細の取得
   */
  async getHistoryDetail(logId: string): Promise<DrivingLogModel | null> {
    return await this.storageService.get('drivingLogs', logId);
  }

  /**
   * ページネーション用履歴取得
   */
  async getHistoryPage(pageNumber: number, pageSize: number): Promise<HistoryPage> {
    const allLogs = await this.storageService.getAll('drivingLogs') || [];
    
    // 日付順でソート
    const sortedLogs = this.applySorting(allLogs, { field: 'date', order: 'desc' });

    const totalItems = sortedLogs.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    const offset = (pageNumber - 1) * pageSize;
    const items = sortedLogs.slice(offset, offset + pageSize);

    return {
      items,
      pageNumber,
      totalPages,
      totalItems
    };
  }

  /**
   * 追加履歴の読み込み（無限スクロール用）
   */
  async loadMoreHistory(cursor: string): Promise<HistoryListResult> {
    const page = parseInt(cursor, 10) || 1;
    const pageSize = this.defaultPageSize;
    
    const allLogs = await this.storageService.getAll('drivingLogs') || [];
    const sortedLogs = this.applySorting(allLogs, { field: 'date', order: 'desc' });

    const offset = (page - 1) * pageSize;
    const items = sortedLogs.slice(offset, offset + pageSize);
    const hasMore = offset + pageSize < sortedLogs.length;

    return {
      items,
      totalCount: sortedLogs.length,
      hasMore,
      nextCursor: hasMore ? `${page + 1}` : undefined
    };
  }

  /**
   * 表示設定の保存
   */
  async saveViewSettings(settings: ViewSettings): Promise<void> {
    await this.storageService.save('historyViewSettings', settings);
  }

  /**
   * 表示設定の読み込み
   */
  async loadViewSettings(): Promise<ViewSettings> {
    const settings = await this.storageService.get('historyViewSettings');
    
    // デフォルト設定
    const defaultSettings: ViewSettings = {
      defaultSort: { field: 'date', order: 'desc' },
      pageSize: 20,
      showStatistics: true,
      compactView: false,
      autoRefresh: false
    };

    return settings || defaultSettings;
  }

  /**
   * 検索履歴の保存
   */
  async saveSearchHistory(query: string): Promise<void> {
    if (!query.trim()) return;

    const existingHistory = await this.storageService.get('searchHistory') || [];
    
    // 重複削除と先頭追加
    const filteredHistory = existingHistory.filter((item: string) => item !== query);
    const updatedHistory = [query, ...filteredHistory].slice(0, this.maxSearchHistory);

    await this.storageService.save('searchHistory', updatedHistory);
  }

  /**
   * 検索履歴の取得
   */
  async getSearchHistory(): Promise<string[]> {
    return await this.storageService.get('searchHistory') || [];
  }

  /**
   * 検索履歴の削除
   */
  async clearSearchHistory(): Promise<void> {
    await this.storageService.save('searchHistory', []);
  }

  /**
   * 統計情報の取得
   */
  async getStatistics(period?: DateRange): Promise<HistoryStatistics> {
    let allLogs = await this.storageService.getAll('drivingLogs') || [];

    // 期間フィルタリング
    if (period) {
      allLogs = allLogs.filter(log => {
        const logDate = new Date(log.date);
        return logDate >= period.startDate && logDate <= period.endDate;
      });
    }

    // 完了済みのみを対象
    const completedLogs = allLogs.filter(log => log.status === DrivingLogStatus.COMPLETED);

    const totalRecords = allLogs.length;
    const totalDistance = completedLogs.reduce((sum, log) => sum + (log.totalDistance || 0), 0);
    const totalDuration = completedLogs.reduce((sum, log) => sum + (log.duration || 0), 0);

    const avgDistance = completedLogs.length > 0 ? totalDistance / completedLogs.length : 0;
    const avgDuration = completedLogs.length > 0 ? totalDuration / completedLogs.length : 0;

    // ステータス別カウント
    const statusCounts = {
      [DrivingLogStatus.IN_PROGRESS]: 0,
      [DrivingLogStatus.COMPLETED]: 0,
      [DrivingLogStatus.CANCELLED]: 0
    };

    allLogs.forEach(log => {
      statusCounts[log.status]++;
    });

    return {
      totalRecords,
      totalDistance: Math.round(totalDistance * 10) / 10,
      totalDuration,
      avgDistance: Math.round(avgDistance * 10) / 10,
      avgDuration: Math.round(avgDuration),
      statusCounts
    };
  }

  /**
   * 検索の適用
   */
  private applySearch(logs: DrivingLogModel[], query: SearchQuery): DrivingLogModel[] {
    if (!query.text) return logs;

    const searchText = query.text.toLowerCase();
    const fields = query.fields || ['location', 'memo', 'purpose'];

    return logs.filter(log => {
      // 地点名での検索
      if (fields.includes('location')) {
        const startLocation = log.startLocation?.name?.toLowerCase() || '';
        const endLocation = log.endLocation?.name?.toLowerCase() || '';
        const waypoints = log.waypoints.map(w => w.name?.toLowerCase() || '').join(' ');
        
        if (startLocation.includes(searchText) || 
            endLocation.includes(searchText) || 
            waypoints.includes(searchText)) {
          return true;
        }
      }

      // メモでの検索
      if (fields.includes('memo')) {
        const memo = (log as any).memo?.toLowerCase() || '';
        if (memo.includes(searchText)) {
          return true;
        }
      }

      // 目的での検索
      if (fields.includes('purpose')) {
        const purpose = (log as any).purpose?.toLowerCase() || '';
        if (purpose.includes(searchText)) {
          return true;
        }
      }

      return false;
    });
  }

  /**
   * フィルターの適用
   */
  private applyFilters(logs: DrivingLogModel[], filters: HistoryFilters): DrivingLogModel[] {
    let filteredLogs = [...logs];

    // 日付範囲フィルター
    if (filters.dateRange) {
      filteredLogs = filteredLogs.filter(log => {
        const logDate = new Date(log.date);
        return logDate >= filters.dateRange!.startDate && logDate <= filters.dateRange!.endDate;
      });
    }

    // ステータスフィルター
    if (filters.status && filters.status.length > 0) {
      filteredLogs = filteredLogs.filter(log => filters.status!.includes(log.status));
    }

    // 距離範囲フィルター
    if (filters.distanceRange) {
      filteredLogs = filteredLogs.filter(log => {
        const distance = log.totalDistance || 0;
        const min = filters.distanceRange!.min || 0;
        const max = filters.distanceRange!.max || Number.MAX_VALUE;
        return distance >= min && distance <= max;
      });
    }

    // 時間範囲フィルター
    if (filters.durationRange) {
      filteredLogs = filteredLogs.filter(log => {
        const duration = (log as any).duration || 0;
        const min = filters.durationRange!.min || 0;
        const max = filters.durationRange!.max || Number.MAX_VALUE;
        return duration >= min && duration <= max;
      });
    }

    // 場所フィルター
    if (filters.locations && filters.locations.length > 0) {
      filteredLogs = filteredLogs.filter(log => {
        return filters.locations!.some(location => {
          const startMatch = log.startLocation?.name?.includes(location);
          const endMatch = log.endLocation?.name?.includes(location);
          const waypointMatch = log.waypoints.some(w => w.name?.includes(location));
          return startMatch || endMatch || waypointMatch;
        });
      });
    }

    return filteredLogs;
  }

  /**
   * ソートの適用
   */
  private applySorting(logs: DrivingLogModel[], sortOptions: SortOptions): DrivingLogModel[] {
    return [...logs].sort((a, b) => {
      let comparison = 0;

      switch (sortOptions.field) {
        case 'date':
          comparison = new Date(b.date).getTime() - new Date(a.date).getTime();
          break;
        case 'distance':
          comparison = (b.totalDistance || 0) - (a.totalDistance || 0);
          break;
        case 'duration':
          comparison = ((b as any).duration || 0) - ((a as any).duration || 0);
          break;
        case 'createdAt':
          comparison = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          break;
      }

      return sortOptions.order === 'asc' ? -comparison : comparison;
    });
  }
}