import { useState, useEffect, useCallback } from 'react';
import { DrivingLog, DrivingLogStatus, HistoryStatistics, DrivingLogModel } from '../types';
import { DrivingLogController } from '../controllers/DrivingLogController';
import { HistoryController } from '../controllers/HistoryController';
import { LocationController } from '../controllers/LocationController';
import { StorageService } from '../services/StorageService';

interface DashboardStatistics {
  todayDistance: number;
  weekDistance: number;
  monthDistance: number;
  totalRecords: number;
}

interface DashboardError {
  type: 'GPS' | 'DATA' | 'NETWORK' | 'STORAGE';
  message: string;
  recoverable: boolean;
  action?: () => void;
}

interface DashboardState {
  isLoading: boolean;
  recentLogs: DrivingLog[];
  statistics: DashboardStatistics;
  currentRecording?: DrivingLog;
  errors: DashboardError[];
}

interface DashboardActions {
  startRecording: () => Promise<void>;
  refreshData: () => Promise<void>;
  dismissError: (index: number) => void;
  retryAction: (errorIndex: number) => Promise<void>;
}

export interface UseDashboard {
  state: DashboardState;
  actions: DashboardActions;
}

// Create singleton instances - these could be injected via context in the future
let storageService: StorageService | null = null;
let locationController: LocationController | null = null;
let drivingLogController: DrivingLogController | null = null;
let historyController: HistoryController | null = null;

function getControllers() {
  if (!storageService) {
    storageService = new StorageService();
    locationController = new LocationController();
    drivingLogController = new DrivingLogController(locationController, storageService);
    historyController = new HistoryController(drivingLogController, storageService);
  }
  return { drivingLogController: drivingLogController!, historyController: historyController! };
}

export function useDashboard(): UseDashboard {
  const [state, setState] = useState<DashboardState>({
    isLoading: true,
    recentLogs: [],
    statistics: {
      todayDistance: 0,
      weekDistance: 0,
      monthDistance: 0,
      totalRecords: 0
    },
    currentRecording: undefined,
    errors: []
  });

  const calculateDashboardStatistics = useCallback((logs: DrivingLogModel[]): DashboardStatistics => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const todayLogs = logs.filter(log => new Date(log.date) >= today);
    const weekLogs = logs.filter(log => new Date(log.date) >= weekStart);
    const monthLogs = logs.filter(log => new Date(log.date) >= monthStart);

    return {
      todayDistance: todayLogs.reduce((sum, log) => sum + (log.totalDistance || 0), 0),
      weekDistance: weekLogs.reduce((sum, log) => sum + (log.totalDistance || 0), 0),
      monthDistance: monthLogs.reduce((sum, log) => sum + (log.totalDistance || 0), 0),
      totalRecords: logs.length
    };
  }, []);

  const loadData = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, errors: [] }));
      
      const { drivingLogController } = getControllers();

      // Get recent logs and active recordings in parallel
      const [allLogs, activeLogs] = await Promise.all([
        drivingLogController.getAllLogs(),
        drivingLogController.getActiveLogs()
      ]);

      // Get most recent 5 logs
      const recentLogs = allLogs
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);

      // Calculate statistics
      const statistics = calculateDashboardStatistics(allLogs);

      // Find current recording
      const currentRecording = activeLogs.length > 0 ? activeLogs[0] : undefined;

      setState(prev => ({
        ...prev,
        isLoading: false,
        recentLogs,
        statistics,
        currentRecording,
        errors: []
      }));
    } catch (error) {
      console.error('Dashboard data loading failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'データの読み込みに失敗しました';
      setState(prev => ({
        ...prev,
        isLoading: false,
        errors: [{
          type: 'DATA',
          message: errorMessage,
          recoverable: true,
          action: loadData
        }]
      }));
    }
  }, [calculateDashboardStatistics]);

  const startRecording = useCallback(async () => {
    try {
      const { drivingLogController } = getControllers();
      const newLog = await drivingLogController.quickStart();
      setState(prev => ({
        ...prev,
        currentRecording: newLog
      }));
      // Refresh data to update recent logs
      await loadData();
    } catch (error) {
      console.error('Recording start failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'GPS信号を取得できません';
      setState(prev => ({
        ...prev,
        errors: [...prev.errors, {
          type: 'GPS',
          message: errorMessage,
          recoverable: true,
          action: startRecording
        }]
      }));
    }
  }, [loadData]);

  const refreshData = useCallback(async () => {
    await loadData();
  }, [loadData]);

  const dismissError = useCallback((index: number) => {
    setState(prev => ({
      ...prev,
      errors: prev.errors.filter((_, i) => i !== index)
    }));
  }, []);

  const retryAction = useCallback(async (errorIndex: number) => {
    const error = state.errors[errorIndex];
    if (error?.action) {
      dismissError(errorIndex);
      await error.action();
    }
  }, [state.errors, dismissError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    state,
    actions: {
      startRecording,
      refreshData,
      dismissError,
      retryAction
    }
  };
}