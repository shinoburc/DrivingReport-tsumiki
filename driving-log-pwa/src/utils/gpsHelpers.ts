import type { GPSStatus } from '../hooks/useRecording';
import { formatDistance } from './formatters';

export const getGPSStatusColor = (signal: GPSStatus['signal']): string => {
  switch (signal) {
    case 'excellent':
      return '#4CAF50';
    case 'good':
      return '#8BC34A';
    case 'fair':
      return '#FF9800';
    case 'poor':
      return '#FF5722';
    case 'none':
      return '#9E9E9E';
    default:
      return '#9E9E9E';
  }
};

export const getGPSStatusText = (gpsStatus: GPSStatus): string => {
  if (!gpsStatus.isAvailable) return 'GPS利用不可';
  return `${formatDistance(gpsStatus.accuracy)}m`;
};

export const getGPSIconBySignal = (signal: GPSStatus['signal']): string => {
  switch (signal) {
    case 'excellent':
      return '📍';
    case 'good':
      return '📍';
    case 'fair':
      return '📍';
    case 'poor':
      return '📍';
    case 'none':
      return '📍';
    default:
      return '📍';
  }
};