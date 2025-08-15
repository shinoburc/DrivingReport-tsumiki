import {
  getGPSStatusColor,
  getGPSStatusText,
  getGPSIconBySignal,
} from '../gpsHelpers';
import type { GPSStatus } from '../../hooks/useRecording';

describe('gpsHelpers', () => {
  describe('getGPSStatusColor', () => {
    test('should return correct colors for signal strength', () => {
      expect(getGPSStatusColor('excellent')).toBe('#4CAF50');
      expect(getGPSStatusColor('good')).toBe('#8BC34A');
      expect(getGPSStatusColor('fair')).toBe('#FF9800');
      expect(getGPSStatusColor('poor')).toBe('#FF5722');
      expect(getGPSStatusColor('none')).toBe('#9E9E9E');
    });

    test('should return default color for unknown signal', () => {
      expect(getGPSStatusColor('unknown' as any)).toBe('#9E9E9E');
    });
  });

  describe('getGPSStatusText', () => {
    test('should return unavailable text when GPS not available', () => {
      const gpsStatus: GPSStatus = {
        isAvailable: false,
        signal: 'none',
        accuracy: 0,
        lastUpdate: null,
      };
      
      expect(getGPSStatusText(gpsStatus)).toBe('GPS利用不可');
    });

    test('should return formatted accuracy when GPS is available', () => {
      const gpsStatus: GPSStatus = {
        isAvailable: true,
        signal: 'good',
        accuracy: 5.5,
        lastUpdate: new Date(),
      };
      
      const result = getGPSStatusText(gpsStatus);
      expect(result).toMatch(/\d+\.\d+m/); // Should match formatted distance
    });

    test('should handle zero accuracy', () => {
      const gpsStatus: GPSStatus = {
        isAvailable: true,
        signal: 'excellent',
        accuracy: 0,
        lastUpdate: new Date(),
      };
      
      const result = getGPSStatusText(gpsStatus);
      expect(result).toBe('0.0m');
    });
  });

  describe('getGPSIconBySignal', () => {
    test('should return location pin icon for all signal levels', () => {
      expect(getGPSIconBySignal('excellent')).toBe('📍');
      expect(getGPSIconBySignal('good')).toBe('📍');
      expect(getGPSIconBySignal('fair')).toBe('📍');
      expect(getGPSIconBySignal('poor')).toBe('📍');
      expect(getGPSIconBySignal('none')).toBe('📍');
    });

    test('should return default icon for unknown signal', () => {
      expect(getGPSIconBySignal('unknown' as any)).toBe('📍');
    });
  });
});