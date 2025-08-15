// Recording-related constants
export const TIMER_INTERVAL = 1000; // 1 second
export const AUTO_WAYPOINT_DISTANCE_THRESHOLD = 0.1; // 100 meters
export const GPS_SIGNAL_THRESHOLDS = {
  EXCELLENT: 10,
  GOOD: 25,
  FAIR: 50,
  POOR: 100
} as const;

export const WAYPOINT_TYPE_LABELS = {
  start: '出発地',
  end: '到着地', 
  fuel: '給油',
  rest: '休憩',
  parking: '駐車',
  other: '地点'
} as const;