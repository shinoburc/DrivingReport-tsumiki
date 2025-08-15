import { useCallback } from 'react';
import { WaypointType } from './useRecording';

export interface UseWaypointActions {
  handleAddWaypoint: (name?: string, type?: WaypointType) => Promise<void>;
  handleQuickAddFuel: () => Promise<void>;
  handleQuickAddRest: () => Promise<void>;
  handleQuickAddParking: () => Promise<void>;
}

interface UseWaypointActionsProps {
  addWaypoint: (name?: string, type?: WaypointType) => Promise<void>;
}

export function useWaypointActions({ addWaypoint }: UseWaypointActionsProps): UseWaypointActions {
  const handleAddWaypoint = useCallback(async (name?: string, type?: WaypointType) => {
    await addWaypoint(name, type);
  }, [addWaypoint]);

  const handleQuickAddFuel = useCallback(async () => {
    await addWaypoint('給油', 'fuel');
  }, [addWaypoint]);

  const handleQuickAddRest = useCallback(async () => {
    await addWaypoint('休憩', 'rest');
  }, [addWaypoint]);

  const handleQuickAddParking = useCallback(async () => {
    await addWaypoint('駐車', 'parking');
  }, [addWaypoint]);

  return {
    handleAddWaypoint,
    handleQuickAddFuel,
    handleQuickAddRest,
    handleQuickAddParking
  };
}