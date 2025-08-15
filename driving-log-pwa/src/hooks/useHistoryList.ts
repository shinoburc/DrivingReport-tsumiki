import { useState, useCallback, useEffect } from 'react';
import { DrivingLog, DrivingLogStatus } from '../types';
import { HistoryController } from '../controllers/HistoryController';

// Create interfaces that match our test expectations
export interface HistoryFilters {
  dateRange: {
    start?: Date;
    end?: Date;
  };
  locationSearch?: string;
  status?: DrivingLogStatus[];
  distanceRange?: {
    min?: number;
    max?: number;
  };
  durationRange?: {
    min?: number;
    max?: number;
  };
}

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
      dateRange: {},
      locationSearch: undefined,
      status: undefined,
      distanceRange: undefined,
      durationRange: undefined
    },
    sortBy: 'date-desc',
    selectedRecords: [],
    error: null
  });

  const [currentPage, setCurrentPage] = useState(1);
  const historyController = new HistoryController(null as any, null as any); // TODO: Inject dependencies

  // Load history data
  const loadHistory = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await historyController.getHistoryList({
        page: 1,
        limit: 20,
        filters: state.filters,
        sortBy: state.sortBy
      });

      setState(prev => ({
        ...prev,
        records: response.records,
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
      const nextPage = currentPage + 1;
      const response = await historyController.getHistoryList({
        page: nextPage,
        limit: 20,
        filters: state.filters,
        sortBy: state.sortBy
      });

      setState(prev => ({
        ...prev,
        records: [...prev.records, ...response.records],
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
      await historyController.deleteRecord(recordId);
      setState(prev => ({
        ...prev,
        records: prev.records.filter(record => record.id !== recordId),
        selectedRecords: prev.selectedRecords.filter(id => id !== recordId)
      }));
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
      await historyController.deleteMultipleRecords(recordIds);
      setState(prev => ({
        ...prev,
        records: prev.records.filter(record => !recordIds.includes(record.id)),
        selectedRecords: []
      }));
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
      await historyController.exportRecords(recordIds);
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

  // Reload data when filters or sort options change
  useEffect(() => {
    loadHistory();
  }, [state.filters, state.sortBy]);

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