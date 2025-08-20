import { useState, useCallback, useEffect } from 'react';
import { DrivingLog, DrivingLogStatus, HistoryFilters } from '../types';
import { HistoryController } from '../controllers/HistoryController';
import { DrivingLogController } from '../controllers/DrivingLogController';
import { LocationController } from '../controllers/LocationController';
import { StorageService } from '../services/StorageService';
import { GPSService } from '../services/gps/GPSService';

// Create interfaces that match our test expectations
// Using HistoryFilters from types/index.ts

export type HistorySortOption = 
  | 'date-desc' | 'date-asc'
  | 'distance-desc' | 'distance-asc'
  | 'duration-desc' | 'duration-asc'
  | 'location-asc' | 'location-desc';

export interface HistoryListState {
  records: DrivingLog[];
  loading: boolean;
  hasMore: boolean;
  filters: HistoryFilters;
  sortBy: HistorySortOption;
  selectedRecords: string[];
  error: string | null;
}

export interface HistoryListActions {
  loadHistory: () => Promise<void>;
  loadMoreHistory: () => Promise<void>;
  setFilters: (filters: HistoryFilters) => void;
  setSortBy: (sortBy: HistorySortOption) => void;
  selectRecord: (recordId: string) => void;
  selectMultipleRecords: (recordIds: string[]) => void;
  deleteRecord: (recordId: string) => Promise<void>;
  deleteMultipleRecords: (recordIds: string[]) => Promise<void>;
  exportRecords: (recordIds: string[]) => Promise<void>;
  refreshHistory: () => Promise<void>;
}

export interface UseHistoryList {
  state: HistoryListState;
  actions: HistoryListActions;
}

export function useHistoryList(): UseHistoryList {
  const [state, setState] = useState<HistoryListState>({
    records: [],
    loading: false,
    hasMore: false,
    filters: {
      dateRange: undefined
    },
    sortBy: 'date-desc',
    selectedRecords: [],
    error: null
  });

  const [currentPage, setCurrentPage] = useState(1);

  // Load history data
  const loadHistory = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const { historyController } = await getControllers();
      const response = await historyController.getHistoryList({
        filters: state.filters,
        pagination: { page: 1, size: 20 }
      });

      setState(prev => ({
        ...prev,
        records: response.items,
        hasMore: response.hasMore,
        loading: false
      }));
      setCurrentPage(1);
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'データの取得に失敗しました'
      }));
    }
  }, [state.filters, state.sortBy]);

  // Load more history for pagination
  const loadMoreHistory = useCallback(async () => {
    if (state.loading || !state.hasMore) return;

    setState(prev => ({ ...prev, loading: true }));
    
    try {
      const { historyController } = await getControllers();
      const nextPage = currentPage + 1;
      const response = await historyController.getHistoryList({
        filters: state.filters,
        pagination: { page: nextPage, size: 20 }
      });

      setState(prev => ({
        ...prev,
        records: [...prev.records, ...response.items],
        hasMore: response.hasMore,
        loading: false
      }));
      setCurrentPage(nextPage);
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'データの読み込みに失敗しました'
      }));
    }
  }, [currentPage, state.filters, state.sortBy, state.loading, state.hasMore]);

  // Set filters and reload data
  const setFilters = useCallback((filters: HistoryFilters) => {
    setState(prev => ({ ...prev, filters }));
  }, []);

  // Set sort option and reload data
  const setSortBy = useCallback((sortBy: HistorySortOption) => {
    setState(prev => ({ ...prev, sortBy }));
  }, []);

  // Select a single record
  const selectRecord = useCallback((recordId: string) => {
    setState(prev => ({
      ...prev,
      selectedRecords: prev.selectedRecords.includes(recordId)
        ? prev.selectedRecords.filter(id => id !== recordId)
        : [...prev.selectedRecords, recordId]
    }));
  }, []);

  // Select multiple records
  const selectMultipleRecords = useCallback((recordIds: string[]) => {
    setState(prev => ({ ...prev, selectedRecords: recordIds }));
  }, []);

  // Delete a single record
  const deleteRecord = useCallback(async (recordId: string) => {
    try {
      // Note: This should probably use DrivingLogController
      // await drivingLogController.deleteLog(recordId);
      throw new Error('Delete functionality needs to be implemented');
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : '削除に失敗しました'
      }));
    }
  }, []);

  // Delete multiple records
  const deleteMultipleRecords = useCallback(async (recordIds: string[]) => {
    try {
      // Note: This should probably use DrivingLogController
      // for (const id of recordIds) await drivingLogController.deleteLog(id);
      throw new Error('Bulk delete functionality needs to be implemented');
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : '一括削除に失敗しました'
      }));
    }
  }, []);

  // Export records
  const exportRecords = useCallback(async (recordIds: string[]) => {
    try {
      // Note: Export functionality needs to be implemented
      throw new Error('Export functionality needs to be implemented');
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'エクスポートに失敗しました'
      }));
    }
  }, []);

  // Refresh history data
  const refreshHistory = useCallback(async () => {
    setCurrentPage(1);
    await loadHistory();
  }, [loadHistory]);

  // Load data on mount
  useEffect(() => {
    loadHistory();
  }, []); // 初回のみ実行

  return {
    state,
    actions: {
      loadHistory,
      loadMoreHistory,
      setFilters,
      setSortBy,
      selectRecord,
      selectMultipleRecords,
      deleteRecord,
      deleteMultipleRecords,
      exportRecords,
      refreshHistory
    }
  };
}

// Create singleton instances
let storageService: StorageService | null = null;
let gpsService: GPSService | null = null;
let locationController: LocationController | null = null;
let drivingLogController: DrivingLogController | null = null;
let historyController: HistoryController | null = null;

async function getControllers() {
  if (!storageService) {
    storageService = new StorageService();
    await storageService.initialize();
    gpsService = new GPSService();
    locationController = new LocationController(gpsService, storageService);
    drivingLogController = new DrivingLogController(locationController, storageService);
    historyController = new HistoryController(drivingLogController, storageService);
  }
  return { historyController: historyController!, drivingLogController: drivingLogController! };
}