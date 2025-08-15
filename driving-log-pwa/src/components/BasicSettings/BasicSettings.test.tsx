import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BasicSettings } from './BasicSettings';
import { AppSettings, ExportFormat } from '../../types';

describe('BasicSettings', () => {
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
    firstLaunchDate: new Date('2024-01-01'),
    appVersion: '1.0.0',
  };

  const mockOnSettingChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Language Settings', () => {
    test('should display language selection dropdown', () => {
      render(
        <BasicSettings 
          settings={mockSettings} 
          onSettingChange={mockOnSettingChange} 
        />
      );

      const languageSelect = screen.getByLabelText('言語');
      expect(languageSelect).toBeInTheDocument();
      expect(languageSelect).toHaveValue('ja');

      // Check for language options
      expect(screen.getByDisplayValue('日本語')).toBeInTheDocument();
    });

    test('should change language and apply immediately', async () => {
      render(
        <BasicSettings 
          settings={mockSettings} 
          onSettingChange={mockOnSettingChange} 
        />
      );

      const languageSelect = screen.getByLabelText('言語');
      fireEvent.change(languageSelect, { target: { value: 'en' } });

      expect(mockOnSettingChange).toHaveBeenCalledWith('language', 'en');
    });

    test('should persist language preference', () => {
      const englishSettings = { ...mockSettings, language: 'en' as const };
      const { rerender } = render(
        <BasicSettings 
          settings={mockSettings} 
          onSettingChange={mockOnSettingChange} 
        />
      );

      // Rerender with updated settings
      rerender(
        <BasicSettings 
          settings={englishSettings} 
          onSettingChange={mockOnSettingChange} 
        />
      );

      const languageSelect = screen.getByLabelText('Language');
      expect(languageSelect).toHaveValue('en');
    });

    test('should handle invalid language codes gracefully', () => {
      const invalidSettings = { ...mockSettings, language: 'invalid' as any };
      
      render(
        <BasicSettings 
          settings={invalidSettings} 
          onSettingChange={mockOnSettingChange} 
        />
      );

      // Should fallback to default language
      const languageSelect = screen.getByLabelText('言語');
      expect(languageSelect).toHaveValue('ja');
    });
  });

  describe('Theme Settings', () => {
    test('should display theme selection options', () => {
      render(
        <BasicSettings 
          settings={mockSettings} 
          onSettingChange={mockOnSettingChange} 
        />
      );

      expect(screen.getByLabelText('ライトテーマ')).toBeInTheDocument();
      expect(screen.getByLabelText('ダークテーマ')).toBeInTheDocument();
      expect(screen.getByLabelText('自動')).toBeInTheDocument();
    });

    test('should apply theme changes with smooth transition', async () => {
      render(
        <BasicSettings 
          settings={mockSettings} 
          onSettingChange={mockOnSettingChange} 
        />
      );

      const darkThemeButton = screen.getByLabelText('ダークテーマ');
      fireEvent.click(darkThemeButton);

      expect(mockOnSettingChange).toHaveBeenCalledWith('theme', 'dark');

      // Check if transition class is applied
      await waitFor(() => {
        const container = screen.getByTestId('basic-settings');
        expect(container).toHaveClass('theme-transitioning');
      });
    });

    test('should sync with system theme when auto is selected', () => {
      // Mock prefers-color-scheme
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation((query) => ({
          matches: query === '(prefers-color-scheme: dark)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      const autoSettings = { ...mockSettings, theme: 'auto' as const };
      render(
        <BasicSettings 
          settings={autoSettings} 
          onSettingChange={mockOnSettingChange} 
        />
      );

      const autoThemeButton = screen.getByLabelText('自動');
      expect(autoThemeButton).toBeChecked();

      // Should display system preference
      expect(screen.getByText('システム設定: ダーク')).toBeInTheDocument();
    });

    test('should persist theme preference', () => {
      const darkSettings = { ...mockSettings, theme: 'dark' as const };
      render(
        <BasicSettings 
          settings={darkSettings} 
          onSettingChange={mockOnSettingChange} 
        />
      );

      const darkThemeButton = screen.getByLabelText('ダークテーマ');
      expect(darkThemeButton).toBeChecked();
    });
  });

  describe('GPS Settings', () => {
    test('should display GPS timeout slider', () => {
      render(
        <BasicSettings 
          settings={mockSettings} 
          onSettingChange={mockOnSettingChange} 
        />
      );

      const timeoutSlider = screen.getByLabelText('GPS タイムアウト (秒)');
      expect(timeoutSlider).toBeInTheDocument();
      expect(timeoutSlider).toHaveAttribute('type', 'range');
      expect(timeoutSlider).toHaveAttribute('min', '5');
      expect(timeoutSlider).toHaveAttribute('max', '60');
      expect(timeoutSlider).toHaveValue('30');
    });

    test('should validate GPS timeout values', () => {
      render(
        <BasicSettings 
          settings={mockSettings} 
          onSettingChange={mockOnSettingChange} 
        />
      );

      const timeoutSlider = screen.getByLabelText('GPS タイムアウト (秒)');
      
      // Try to set value outside range
      fireEvent.change(timeoutSlider, { target: { value: '100' } });
      
      // Should not call onSettingChange with invalid value
      expect(mockOnSettingChange).not.toHaveBeenCalledWith('gpsTimeout', 100);
    });

    test('should display GPS permission status', async () => {
      // Mock geolocation permission
      const mockPermissions = {
        query: jest.fn().mockResolvedValue({ state: 'granted' }),
      };
      Object.defineProperty(navigator, 'permissions', {
        value: mockPermissions,
        writable: true,
      });

      render(
        <BasicSettings 
          settings={mockSettings} 
          onSettingChange={mockOnSettingChange} 
        />
      );

      await waitFor(() => {
        expect(screen.getByText('GPS権限: 許可済み')).toBeInTheDocument();
      });
    });

    test('should update GPS settings in real-time', () => {
      render(
        <BasicSettings 
          settings={mockSettings} 
          onSettingChange={mockOnSettingChange} 
        />
      );

      const timeoutSlider = screen.getByLabelText('GPS タイムアウト (秒)');
      fireEvent.change(timeoutSlider, { target: { value: '45' } });

      expect(mockOnSettingChange).toHaveBeenCalledWith('gpsTimeout', 45);

      // Should update display immediately
      expect(screen.getByDisplayValue('45')).toBeInTheDocument();
    });
  });

  describe('Settings Integration', () => {
    test('should handle multiple setting changes', () => {
      render(
        <BasicSettings 
          settings={mockSettings} 
          onSettingChange={mockOnSettingChange} 
        />
      );

      // Change language
      const languageSelect = screen.getByLabelText('言語');
      fireEvent.change(languageSelect, { target: { value: 'en' } });

      // Change theme
      const darkThemeButton = screen.getByLabelText('ダークテーマ');
      fireEvent.click(darkThemeButton);

      // Change GPS timeout
      const timeoutSlider = screen.getByLabelText('GPS タイムアウト (秒)');
      fireEvent.change(timeoutSlider, { target: { value: '45' } });

      expect(mockOnSettingChange).toHaveBeenCalledTimes(3);
      expect(mockOnSettingChange).toHaveBeenCalledWith('language', 'en');
      expect(mockOnSettingChange).toHaveBeenCalledWith('theme', 'dark');
      expect(mockOnSettingChange).toHaveBeenCalledWith('gpsTimeout', 45);
    });

    test('should show setting change feedback', async () => {
      render(
        <BasicSettings 
          settings={mockSettings} 
          onSettingChange={mockOnSettingChange} 
        />
      );

      const languageSelect = screen.getByLabelText('言語');
      fireEvent.change(languageSelect, { target: { value: 'en' } });

      // Should show temporary feedback
      await waitFor(() => {
        expect(screen.getByText('設定を保存しました')).toBeInTheDocument();
      });

      // Feedback should disappear after delay
      await waitFor(() => {
        expect(screen.queryByText('設定を保存しました')).not.toBeInTheDocument();
      }, { timeout: 3000 });
    });

    test('should reset to defaults when requested', () => {
      render(
        <BasicSettings 
          settings={mockSettings} 
          onSettingChange={mockOnSettingChange} 
          onResetToDefaults={jest.fn()}
        />
      );

      const resetButton = screen.getByText('デフォルトに戻す');
      fireEvent.click(resetButton);

      // Should show confirmation dialog
      expect(screen.getByText('設定をデフォルトに戻しますか？')).toBeInTheDocument();
    });
  });
});