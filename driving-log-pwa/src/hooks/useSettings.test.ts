import { renderHook, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useSettings } from './useSettings';
import { AppSettings, ExportFormat } from '../types';

// Mock StorageService
jest.mock('../services/StorageService', () => ({
  StorageService: {
    getInstance: jest.fn(() => ({
      getSettings: jest.fn(),
      saveSettings: jest.fn(),
    })),
  },
}));

describe('useSettings Hook', () => {
  const mockStorageService = {
    getSettings: jest.fn(),
    saveSettings: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    const { StorageService } = require('../services/StorageService');
    StorageService.getInstance.mockReturnValue(mockStorageService);
  });

  describe('Settings Data Management', () => {
    test('should load settings on mount', async () => {
      const mockSettings: AppSettings = {
        language: 'ja',
        theme: 'light',
        gpsTimeout: 30,
        gpsAccuracyThreshold: 50,
        exportFormat: ExportFormat.CSV,
        defaultExportPeriod: 'month',
        exportPrivacyLevel: 'full',
        autoExportEnabled: false,
        autoExportFrequency: 'monthly',
        compactMode: false,
        showTutorial: true,
        favoriteLocations: [],
        driverName: 'Test Driver',
        vehicleInfo: {
          make: 'Toyota',
          model: 'Prius',
          year: 2023,
          licensePlate: '123-4567',
        },
        firstLaunchDate: new Date('2024-01-01'),
        appVersion: '1.0.0',
        lastBackupDate: new Date('2024-01-15'),
      };

      mockStorageService.getSettings.mockResolvedValue(mockSettings);

      const { result } = renderHook(() => useSettings());

      expect(result.current.loading).toBe(true);
      expect(result.current.settings).toBeNull();

      await act(async () => {
        // Wait for settings to load
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.settings).toEqual(mockSettings);
      expect(mockStorageService.getSettings).toHaveBeenCalledTimes(1);
    });

    test('should update settings and persist changes', async () => {
      const initialSettings: AppSettings = {
        language: 'ja',
        theme: 'light',
        gpsTimeout: 30,
        gpsAccuracyThreshold: 50,
        exportFormat: ExportFormat.CSV,
        defaultExportPeriod: 'month',
        exportPrivacyLevel: 'full',
        autoExportEnabled: false,
        autoExportFrequency: 'monthly',
        compactMode: false,
        showTutorial: true,
        favoriteLocations: [],
        firstLaunchDate: new Date('2024-01-01'),
        appVersion: '1.0.0',
      };

      mockStorageService.getSettings.mockResolvedValue(initialSettings);
      mockStorageService.saveSettings.mockResolvedValue(true);

      const { result } = renderHook(() => useSettings());

      await act(async () => {
        // Wait for initial load
      });

      await act(async () => {
        result.current.updateSetting('language', 'en');
      });

      expect(mockStorageService.saveSettings).toHaveBeenCalledWith({
        ...initialSettings,
        language: 'en',
      });
      expect(result.current.settings?.language).toBe('en');
    });

    test('should handle settings loading errors', async () => {
      const error = new Error('Storage unavailable');
      mockStorageService.getSettings.mockRejectedValue(error);

      const { result } = renderHook(() => useSettings());

      await act(async () => {
        // Wait for error to be processed
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(error.message);
      expect(result.current.settings).toBeNull();
    });

    test('should provide settings validation', async () => {
      const initialSettings: AppSettings = {
        language: 'ja',
        theme: 'light',
        gpsTimeout: 30,
        gpsAccuracyThreshold: 50,
        exportFormat: ExportFormat.CSV,
        defaultExportPeriod: 'month',
        exportPrivacyLevel: 'full',
        autoExportEnabled: false,
        autoExportFrequency: 'monthly',
        compactMode: false,
        showTutorial: true,
        favoriteLocations: [],
        firstLaunchDate: new Date('2024-01-01'),
        appVersion: '1.0.0',
      };

      mockStorageService.getSettings.mockResolvedValue(initialSettings);

      const { result } = renderHook(() => useSettings());

      await act(async () => {
        // Wait for initial load
      });

      // Test invalid GPS timeout (outside 5-60 range)
      await act(async () => {
        try {
          result.current.updateSetting('gpsTimeout', 200);
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
        }
      });

      // Settings should not be updated with invalid value
      expect(result.current.settings?.gpsTimeout).toBe(30);
    });
  });

  describe('Settings Operations API', () => {
    test('should provide updateSetting function', async () => {
      const initialSettings: AppSettings = {
        language: 'ja',
        theme: 'light',
        gpsTimeout: 30,
        gpsAccuracyThreshold: 50,
        exportFormat: ExportFormat.CSV,
        defaultExportPeriod: 'month',
        exportPrivacyLevel: 'full',
        autoExportEnabled: false,
        autoExportFrequency: 'monthly',
        compactMode: false,
        showTutorial: true,
        favoriteLocations: [],
        firstLaunchDate: new Date('2024-01-01'),
        appVersion: '1.0.0',
      };

      mockStorageService.getSettings.mockResolvedValue(initialSettings);
      mockStorageService.saveSettings.mockResolvedValue(true);

      const { result } = renderHook(() => useSettings());

      await act(async () => {
        // Wait for initial load
      });

      expect(typeof result.current.updateSetting).toBe('function');

      await act(async () => {
        result.current.updateSetting('theme', 'dark');
      });

      expect(result.current.settings?.theme).toBe('dark');
    });

    test('should provide resetSettings function', async () => {
      const modifiedSettings: AppSettings = {
        language: 'en',
        theme: 'dark',
        gpsTimeout: 45,
        gpsAccuracyThreshold: 100,
        exportFormat: ExportFormat.JSON,
        defaultExportPeriod: 'year',
        exportPrivacyLevel: 'minimal',
        autoExportEnabled: true,
        autoExportFrequency: 'weekly',
        compactMode: true,
        showTutorial: false,
        favoriteLocations: [],
        firstLaunchDate: new Date('2024-01-01'),
        appVersion: '1.0.0',
      };

      mockStorageService.getSettings.mockResolvedValue(modifiedSettings);
      mockStorageService.saveSettings.mockResolvedValue(true);

      const { result } = renderHook(() => useSettings());

      await act(async () => {
        // Wait for initial load
      });

      expect(typeof result.current.resetSettings).toBe('function');

      await act(async () => {
        result.current.resetSettings();
      });

      // Should reset to default values
      expect(result.current.settings?.language).toBe('ja');
      expect(result.current.settings?.theme).toBe('light');
      expect(result.current.settings?.gpsTimeout).toBe(30);
    });

    test('should provide exportSettings function', async () => {
      const settings: AppSettings = {
        language: 'ja',
        theme: 'light',
        gpsTimeout: 30,
        gpsAccuracyThreshold: 50,
        exportFormat: ExportFormat.CSV,
        defaultExportPeriod: 'month',
        exportPrivacyLevel: 'full',
        autoExportEnabled: false,
        autoExportFrequency: 'monthly',
        compactMode: false,
        showTutorial: true,
        favoriteLocations: [],
        firstLaunchDate: new Date('2024-01-01'),
        appVersion: '1.0.0',
      };

      mockStorageService.getSettings.mockResolvedValue(settings);

      const { result } = renderHook(() => useSettings());

      await act(async () => {
        // Wait for initial load
      });

      expect(typeof result.current.exportSettings).toBe('function');

      let exportedData: string | null = null;
      await act(async () => {
        exportedData = result.current.exportSettings();
      });

      expect(exportedData).toContain('"language":"ja"');
      expect(exportedData).toContain('"theme":"light"');
      expect(() => JSON.parse(exportedData!)).not.toThrow();
    });

    test('should provide importSettings function', async () => {
      const initialSettings: AppSettings = {
        language: 'ja',
        theme: 'light',
        gpsTimeout: 30,
        gpsAccuracyThreshold: 50,
        exportFormat: ExportFormat.CSV,
        defaultExportPeriod: 'month',
        exportPrivacyLevel: 'full',
        autoExportEnabled: false,
        autoExportFrequency: 'monthly',
        compactMode: false,
        showTutorial: true,
        favoriteLocations: [],
        firstLaunchDate: new Date('2024-01-01'),
        appVersion: '1.0.0',
      };

      const importedSettings = {
        language: 'en',
        theme: 'dark',
        gpsTimeout: 45,
      };

      mockStorageService.getSettings.mockResolvedValue(initialSettings);
      mockStorageService.saveSettings.mockResolvedValue(true);

      const { result } = renderHook(() => useSettings());

      await act(async () => {
        // Wait for initial load
      });

      expect(typeof result.current.importSettings).toBe('function');

      await act(async () => {
        result.current.importSettings(JSON.stringify(importedSettings));
      });

      expect(result.current.settings?.language).toBe('en');
      expect(result.current.settings?.theme).toBe('dark');
      expect(result.current.settings?.gpsTimeout).toBe(45);
    });
  });
});