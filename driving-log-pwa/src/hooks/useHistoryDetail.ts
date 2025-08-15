import { useState, useCallback } from 'react';
import { DrivingLog, Location } from '../types';
import { HistoryController } from '../controllers/HistoryController';

export interface HistoryDetailState {
  record: DrivingLog | null;
  waypoints: Location[];
  loading: boolean;
  editing: boolean;
  error: string | null;
}

export interface HistoryDetailActions {
  loadRecord: (recordId: string) => Promise<void>;
  editRecord: (recordId: string, updates: Partial<DrivingLog>) => Promise<void>;
  deleteRecord: (recordId: string) => Promise<void>;
  editWaypoint: (waypointId: string, updates: Partial<Location>) => Promise<void>;
  deleteWaypoint: (waypointId: string) => Promise<void>;
  exportRecord: (recordId: string) => Promise<void>;
  toggleEditing: () => void;
}

export interface UseHistoryDetail {
  state: HistoryDetailState;
  actions: HistoryDetailActions;
}

export function useHistoryDetail(): UseHistoryDetail {
  const [state, setState] = useState<HistoryDetailState>({
    record: null,
    waypoints: [],
    loading: false,
    editing: false,
    error: null
  });

  const historyController = new HistoryController(null as any, null as any); // TODO: Inject dependencies

  // Load a specific record
  const loadRecord = useCallback(async (recordId: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const record = await historyController.getRecord(recordId);
      
      if (record) {
        setState(prev => ({
          ...prev,
          record,
          waypoints: record.waypoints || [],
          loading: false
        }));
      } else {
        setState(prev => ({
          ...prev,
          record: null,
          waypoints: [],
          loading: false,
          error: '記録が見つかりません'
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'データの読み込みに失敗しました'
      }));
    }
  }, []);

  // Edit record details
  const editRecord = useCallback(async (recordId: string, updates: Partial<DrivingLog>) => {
    try {
      const updatedRecord = await historyController.updateRecord(recordId, updates);
      setState(prev => ({
        ...prev,
        record: updatedRecord,
        editing: false
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : '編集に失敗しました'
      }));
    }
  }, []);

  // Delete record
  const deleteRecord = useCallback(async (recordId: string) => {
    try {
      await historyController.deleteRecord(recordId);
      setState(prev => ({
        ...prev,
        record: null,
        waypoints: []
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : '削除に失敗しました'
      }));
    }
  }, []);

  // Edit waypoint
  const editWaypoint = useCallback(async (waypointId: string, updates: Partial<Location>) => {
    try {
      const updatedWaypoint = await historyController.updateWaypoint(waypointId, updates);
      setState(prev => ({
        ...prev,
        waypoints: prev.waypoints.map(wp => 
          wp.id === waypointId ? { ...wp, ...updatedWaypoint } : wp
        )
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'ウェイポイントの編集に失敗しました'
      }));
    }
  }, []);

  // Delete waypoint
  const deleteWaypoint = useCallback(async (waypointId: string) => {
    try {
      await historyController.deleteWaypoint(waypointId);
      setState(prev => ({
        ...prev,
        waypoints: prev.waypoints.filter(wp => wp.id !== waypointId)
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'ウェイポイントの削除に失敗しました'
      }));
    }
  }, []);

  // Export record
  const exportRecord = useCallback(async (recordId: string) => {
    try {
      await historyController.exportRecord(recordId);
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'エクスポートに失敗しました'
      }));
    }
  }, []);

  // Toggle editing mode
  const toggleEditing = useCallback(() => {
    setState(prev => ({ ...prev, editing: !prev.editing }));
  }, []);

  return {
    state,
    actions: {
      loadRecord,
      editRecord,
      deleteRecord,
      editWaypoint,
      deleteWaypoint,
      exportRecord,
      toggleEditing
    }
  };
}