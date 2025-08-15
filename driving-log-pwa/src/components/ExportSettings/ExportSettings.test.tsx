import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ExportSettings } from './ExportSettings';
import { AppSettings, ExportFormat } from '../../types';

describe('ExportSettings', () => {
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

  describe('Basic Configuration', () => {
    test('should display export format options', () => {
      render(
        <ExportSettings 
          settings={mockSettings} 
          onSettingChange={mockOnSettingChange} 
        />
      );

      expect(screen.getByLabelText('CSV形式')).toBeInTheDocument();
      expect(screen.getByLabelText('JSON形式')).toBeInTheDocument();

      // Check if CSV is selected by default
      expect(screen.getByLabelText('CSV形式')).toBeChecked();
    });

    test('should display default period settings', () => {
      render(
        <ExportSettings 
          settings={mockSettings} 
          onSettingChange={mockOnSettingChange} 
        />
      );

      const periodSelect = screen.getByLabelText('デフォルト期間');
      expect(periodSelect).toBeInTheDocument();
      expect(periodSelect).toHaveValue('month');

      // Check all period options
      expect(screen.getByText('過去1ヶ月')).toBeInTheDocument();
      expect(screen.getByText('過去3ヶ月')).toBeInTheDocument();
      expect(screen.getByText('過去1年')).toBeInTheDocument();
      expect(screen.getByText('全期間')).toBeInTheDocument();
    });

    test('should configure default filename format', () => {
      render(
        <ExportSettings 
          settings={mockSettings} 
          onSettingChange={mockOnSettingChange} 
        />
      );

      const filenameInput = screen.getByLabelText('ファイル名形式');
      expect(filenameInput).toBeInTheDocument();
      
      // Default format should be displayed
      expect(filenameInput).toHaveValue('driving-log-{date}');

      // Should show preview
      expect(screen.getByText(/プレビュー:/)).toBeInTheDocument();
    });

    test('should save export preferences', () => {
      render(
        <ExportSettings 
          settings={mockSettings} 
          onSettingChange={mockOnSettingChange} 
        />
      );

      // Change export format
      const jsonFormat = screen.getByLabelText('JSON形式');
      fireEvent.click(jsonFormat);

      expect(mockOnSettingChange).toHaveBeenCalledWith('exportFormat', ExportFormat.JSON);

      // Change period
      const periodSelect = screen.getByLabelText('デフォルト期間');
      fireEvent.change(periodSelect, { target: { value: 'year' } });

      expect(mockOnSettingChange).toHaveBeenCalledWith('defaultExportPeriod', 'year');
    });
  });

  describe('Privacy Configuration', () => {
    test('should configure data filtering options', () => {
      render(
        <ExportSettings 
          settings={mockSettings} 
          onSettingChange={mockOnSettingChange} 
        />
      );

      // Check privacy level options
      expect(screen.getByLabelText('完全データ')).toBeInTheDocument();
      expect(screen.getByLabelText('概算データ')).toBeInTheDocument();
      expect(screen.getByLabelText('最小データ')).toBeInTheDocument();

      // Full data should be selected by default
      expect(screen.getByLabelText('完全データ')).toBeChecked();
    });

    test('should set location precision levels', () => {
      render(
        <ExportSettings 
          settings={mockSettings} 
          onSettingChange={mockOnSettingChange} 
        />
      );

      // Change to approximate data
      const approximateOption = screen.getByLabelText('概算データ');
      fireEvent.click(approximateOption);

      expect(mockOnSettingChange).toHaveBeenCalledWith('exportPrivacyLevel', 'approximate');

      // Should show precision explanation
      expect(screen.getByText('位置情報は約1km範囲で概算されます')).toBeInTheDocument();
    });

    test('should preview filtered export data', () => {
      const minimalSettings = { ...mockSettings, exportPrivacyLevel: 'minimal' as const };
      
      render(
        <ExportSettings 
          settings={minimalSettings} 
          onSettingChange={mockOnSettingChange} 
        />
      );

      // Should show what data will be excluded
      expect(screen.getByText('除外される項目:')).toBeInTheDocument();
      expect(screen.getByText('・正確な位置情報')).toBeInTheDocument();
      expect(screen.getByText('・個人識別可能な情報')).toBeInTheDocument();
    });
  });

  describe('Auto Export', () => {
    test('should enable/disable auto export', () => {
      render(
        <ExportSettings 
          settings={mockSettings} 
          onSettingChange={mockOnSettingChange} 
        />
      );

      const autoExportToggle = screen.getByLabelText('自動エクスポートを有効にする');
      expect(autoExportToggle).not.toBeChecked();

      fireEvent.click(autoExportToggle);

      expect(mockOnSettingChange).toHaveBeenCalledWith('autoExportEnabled', true);
    });

    test('should configure auto export frequency', () => {
      const autoEnabledSettings = { ...mockSettings, autoExportEnabled: true };
      
      render(
        <ExportSettings 
          settings={autoEnabledSettings} 
          onSettingChange={mockOnSettingChange} 
        />
      );

      const frequencySelect = screen.getByLabelText('エクスポート頻度');
      expect(frequencySelect).toBeInTheDocument();
      expect(frequencySelect).toHaveValue('monthly');

      fireEvent.change(frequencySelect, { target: { value: 'weekly' } });

      expect(mockOnSettingChange).toHaveBeenCalledWith('autoExportFrequency', 'weekly');
    });

    test('should set notification preferences', () => {
      const autoEnabledSettings = { ...mockSettings, autoExportEnabled: true };
      
      render(
        <ExportSettings 
          settings={autoEnabledSettings} 
          onSettingChange={mockOnSettingChange} 
        />
      );

      const notificationToggle = screen.getByLabelText('エクスポート完了時に通知');
      expect(notificationToggle).toBeInTheDocument();

      fireEvent.click(notificationToggle);

      expect(mockOnSettingChange).toHaveBeenCalledWith('exportNotificationEnabled', true);
    });
  });

  describe('Export Testing', () => {
    test('should provide export preview functionality', () => {
      render(
        <ExportSettings 
          settings={mockSettings} 
          onSettingChange={mockOnSettingChange} 
        />
      );

      const previewButton = screen.getByText('プレビューを表示');
      fireEvent.click(previewButton);

      // Should show preview modal
      expect(screen.getByText('エクスポートプレビュー')).toBeInTheDocument();
      expect(screen.getByText('現在の設定でエクスポートされるデータ:')).toBeInTheDocument();
    });

    test('should validate export settings', () => {
      render(
        <ExportSettings 
          settings={mockSettings} 
          onSettingChange={mockOnSettingChange} 
        />
      );

      // Clear filename format
      const filenameInput = screen.getByLabelText('ファイル名形式');
      fireEvent.change(filenameInput, { target: { value: '' } });

      // Should show validation error
      expect(screen.getByText('ファイル名形式は必須です')).toBeInTheDocument();
    });

    test('should handle export format change effects', () => {
      render(
        <ExportSettings 
          settings={mockSettings} 
          onSettingChange={mockOnSettingChange} 
        />
      );

      // Change to JSON format
      const jsonFormat = screen.getByLabelText('JSON形式');
      fireEvent.click(jsonFormat);

      // Should show JSON-specific options
      expect(screen.getByText('JSON圧縮')).toBeInTheDocument();
      expect(screen.getByText('フォーマット')).toBeInTheDocument();
    });
  });

  describe('Integration with other settings', () => {
    test('should respect global privacy settings', () => {
      const privacySettings = { 
        ...mockSettings, 
        exportPrivacyLevel: 'minimal' as const,
        globalPrivacyMode: true 
      };
      
      render(
        <ExportSettings 
          settings={privacySettings} 
          onSettingChange={mockOnSettingChange} 
        />
      );

      // Should show global privacy notice
      expect(screen.getByText('グローバルプライバシーモードが有効です')).toBeInTheDocument();
    });

    test('should update filename preview in real-time', () => {
      render(
        <ExportSettings 
          settings={mockSettings} 
          onSettingChange={mockOnSettingChange} 
        />
      );

      const filenameInput = screen.getByLabelText('ファイル名形式');
      fireEvent.change(filenameInput, { target: { value: 'my-export-{date}' } });

      // Preview should update immediately
      expect(screen.getByText(/my-export-2024/)).toBeInTheDocument();
    });

    test('should show storage impact estimates', () => {
      render(
        <ExportSettings 
          settings={mockSettings} 
          onSettingChange={mockOnSettingChange} 
        />
      );

      // Should show estimated file sizes
      expect(screen.getByText('推定ファイルサイズ:')).toBeInTheDocument();
      expect(screen.getByText(/CSV: 約/)).toBeInTheDocument();
    });
  });
});