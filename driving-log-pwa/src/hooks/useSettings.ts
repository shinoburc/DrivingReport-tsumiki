import { useState, useEffect, useCallback } from 'react';
import { AppSettings, ExportFormat, FavoriteLocation } from '../types';
import { StorageService } from '../services/StorageService';

export interface UseSettingsReturn {
  settings: AppSettings | null;
  loading: boolean;
  error: string | null;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => Promise<void>;
  resetSettings: () => Promise<void>;
  exportSettings: () => string;
  importSettings: (settingsJson: string) => Promise<void>;
}

const DEFAULT_SETTINGS: AppSettings = {
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
  firstLaunchDate: new Date(),
  appVersion: process.env.REACT_APP_VERSION || '1.0.0',
};

export function useSettings(): UseSettingsReturn {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const storageService = StorageService.getInstance();

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const loadedSettings = await storageService.getSettings();
      
      if (loadedSettings) {
        // Merge with defaults to ensure all properties exist
        const mergedSettings = { ...DEFAULT_SETTINGS, ...loadedSettings };
        setSettings(mergedSettings);
      } else {
        // First time user, set defaults
        setSettings(DEFAULT_SETTINGS);
        await storageService.saveSettings(DEFAULT_SETTINGS);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to load settings');
      setSettings(DEFAULT_SETTINGS); // Fallback to defaults
    } finally {
      setLoading(false);
    }
  };

  const validateSetting = <K extends keyof AppSettings>(
    key: K, 
    value: AppSettings[K]
  ): boolean => {
    switch (key) {
      case 'gpsTimeout':
        const timeout = value as number;
        return timeout >= 5 && timeout <= 60;
      
      case 'gpsAccuracyThreshold':
        const threshold = value as number;
        return threshold >= 1 && threshold <= 1000;
      
      case 'language':
        return ['ja', 'en'].includes(value as string);
      
      case 'theme':
        return ['light', 'dark', 'auto'].includes(value as string);
      
      case 'exportFormat':
        return Object.values(ExportFormat).includes(value as ExportFormat);
      
      case 'defaultExportPeriod':
        return ['month', 'quarter', 'year', 'all'].includes(value as string);
      
      case 'exportPrivacyLevel':
        return ['full', 'approximate', 'minimal'].includes(value as string);
      
      case 'autoExportFrequency':
        return ['weekly', 'monthly', 'manual'].includes(value as string);
      
      default:
        return true;
    }
  };

  const updateSetting = useCallback(async <K extends keyof AppSettings>(
    key: K, 
    value: AppSettings[K]
  ) => {
    try {
      setError(null);

      // Validate setting value
      if (!validateSetting(key, value)) {
        throw new Error(`Invalid value for setting "${key}"`);
      }

      if (!settings) {
        throw new Error('Settings not loaded');
      }

      const updatedSettings = { ...settings, [key]: value };
      
      // Save to storage
      await storageService.saveSettings(updatedSettings);
      
      // Update local state
      setSettings(updatedSettings);
    } catch (err) {
      console.error('Failed to update setting:', err);
      setError(err instanceof Error ? err.message : 'Failed to update setting');
      throw err;
    }
  }, [settings, storageService]);

  const resetSettings = useCallback(async () => {
    try {
      setError(null);
      
      const resetSettings = {
        ...DEFAULT_SETTINGS,
        firstLaunchDate: settings?.firstLaunchDate || new Date(),
        favoriteLocations: [], // Clear favorite locations on reset
      };
      
      await storageService.saveSettings(resetSettings);
      setSettings(resetSettings);
    } catch (err) {
      console.error('Failed to reset settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to reset settings');
      throw err;
    }
  }, [settings, storageService]);

  const exportSettings = useCallback((): string => {
    if (!settings) {
      throw new Error('Settings not loaded');
    }

    return JSON.stringify(settings, null, 2);
  }, [settings]);

  const importSettings = useCallback(async (settingsJson: string) => {
    try {
      setError(null);
      
      const importedSettings = JSON.parse(settingsJson) as Partial<AppSettings>;
      
      // Validate imported settings
      const validatedSettings = { ...DEFAULT_SETTINGS };
      
      Object.entries(importedSettings).forEach(([key, value]) => {
        if (key in DEFAULT_SETTINGS && validateSetting(key as keyof AppSettings, value)) {
          (validatedSettings as any)[key] = value;
        }
      });

      // Preserve certain system settings
      validatedSettings.firstLaunchDate = settings?.firstLaunchDate || new Date();
      validatedSettings.appVersion = DEFAULT_SETTINGS.appVersion;

      await storageService.saveSettings(validatedSettings);
      setSettings(validatedSettings);
    } catch (err) {
      console.error('Failed to import settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to import settings');
      throw err;
    }
  }, [settings, storageService]);

  return {
    settings,
    loading,
    error,
    updateSetting,
    resetSettings,
    exportSettings,
    importSettings,
  };
}