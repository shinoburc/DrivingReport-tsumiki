import {
  formatElapsedTime,
  formatTime,
  formatDistance,
  formatSpeed,
  formatCoordinates,
  formatTimeStamp,
} from '../formatters';

describe('formatters', () => {
  describe('formatElapsedTime', () => {
    test('should format time in minutes and seconds for less than 1 hour', () => {
      expect(formatElapsedTime(30)).toBe('00:30');
      expect(formatElapsedTime(0)).toBe('00:00');
      expect(formatElapsedTime(59)).toBe('00:59');
      expect(formatElapsedTime(3599)).toBe('59:59');
    });

    test('should format time in hours, minutes, and seconds for 1 hour or more', () => {
      expect(formatElapsedTime(3600)).toBe('01:00:00');
      expect(formatElapsedTime(3661)).toBe('01:01:01');
      expect(formatElapsedTime(7200)).toBe('02:00:00');
      expect(formatElapsedTime(86400)).toBe('24:00:00');
    });
  });

  describe('formatTime', () => {
    test('should format time in minutes and seconds', () => {
      expect(formatTime(30)).toBe('00:30');
      expect(formatTime(0)).toBe('00:00');
      expect(formatTime(90)).toBe('01:30');
      expect(formatTime(3600)).toBe('60:00');
    });

    test('should pad single digits', () => {
      expect(formatTime(5)).toBe('00:05');
      expect(formatTime(65)).toBe('01:05');
    });
  });

  describe('formatDistance', () => {
    test('should format distance with Japanese locale', () => {
      expect(formatDistance(1234.5)).toBe('1,234.5');
      expect(formatDistance(0)).toBe('0.0');
      expect(formatDistance(999.9)).toBe('999.9');
    });

    test('should handle large numbers', () => {
      expect(formatDistance(1000000)).toBe('1,000,000.0');
    });
  });

  describe('formatSpeed', () => {
    test('should format speed with Japanese locale', () => {
      expect(formatSpeed(50.5)).toBe('50.5');
      expect(formatSpeed(0)).toBe('0.0');
      expect(formatSpeed(120.0)).toBe('120.0');
    });

    test('should handle decimal values', () => {
      expect(formatSpeed(59.99)).toBe('60.0');
      expect(formatSpeed(59.94)).toBe('59.9');
    });
  });

  describe('formatCoordinates', () => {
    test('should format coordinates to 6 decimal places', () => {
      expect(formatCoordinates(35.6762, 139.6503)).toBe('35.676200, 139.650300');
      expect(formatCoordinates(0, 0)).toBe('0.000000, 0.000000');
    });

    test('should handle negative coordinates', () => {
      expect(formatCoordinates(-35.6762, -139.6503)).toBe('-35.676200, -139.650300');
    });

    test('should handle high precision values', () => {
      expect(formatCoordinates(35.123456789, 139.987654321)).toBe('35.123457, 139.987654');
    });
  });

  describe('formatTimeStamp', () => {
    test('should format timestamp correctly', () => {
      const date = new Date('2024-03-15T10:30:00');
      const result = formatTimeStamp(date);
      expect(result).toMatch(/\d{2}:\d{2}/); // Should match HH:MM format
    });

    test('should handle different times', () => {
      const date1 = new Date('2024-03-15T00:00:00');
      const date2 = new Date('2024-03-15T23:59:00');
      
      const result1 = formatTimeStamp(date1);
      const result2 = formatTimeStamp(date2);
      
      expect(result1).toMatch(/\d{2}:\d{2}/);
      expect(result2).toMatch(/\d{2}:\d{2}/);
    });
  });
});