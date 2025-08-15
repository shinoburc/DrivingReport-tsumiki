import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SettingsScreen } from './SettingsScreen';
import { useSettings } from '../../hooks/useSettings';
import { AppSettings, ExportFormat } from '../../types';

// Mock the useSettings hook
jest.mock('../../hooks/useSettings');
const mockUseSettings = useSettings as jest.MockedFunction<typeof useSettings>;

// Mock window.matchMedia for responsive tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

describe('SettingsScreen', () => {
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

  const mockUseSettingsReturn = {
    settings: mockSettings,
    loading: false,
    error: null,
    updateSetting: jest.fn(),
    resetSettings: jest.fn(),
    exportSettings: jest.fn(),
    importSettings: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSettings.mockReturnValue(mockUseSettingsReturn);
  });

  describe('Basic Rendering', () => {
    test('should render settings screen with all main sections', () => {
      render(<SettingsScreen />);

      // Check for main navigation elements
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByText('設定')).toBeInTheDocument();

      // Check for main setting categories
      expect(screen.getByText('基本設定')).toBeInTheDocument();
      expect(screen.getByText('よく使う地点')).toBeInTheDocument();
      expect(screen.getByText('エクスポート設定')).toBeInTheDocument();
      expect(screen.getByText('データ管理')).toBeInTheDocument();
      expect(screen.getByText('プロファイル')).toBeInTheDocument();
      expect(screen.getByText('アプリ情報')).toBeInTheDocument();
    });

    test('should display current app version', () => {
      render(<SettingsScreen />);

      expect(screen.getByText('バージョン 1.0.0')).toBeInTheDocument();
    });

    test('should render with proper semantic structure', () => {
      render(<SettingsScreen />);

      // Check semantic HTML structure
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('navigation')).toBeInTheDocument();
      
      // Check for sections
      const sections = screen.getAllByRole('region');
      expect(sections.length).toBeGreaterThan(0);
    });
  });

  describe('Navigation', () => {
    test('should navigate between settings categories', () => {
      render(<SettingsScreen />);

      const basicSettingsTab = screen.getByText('基本設定');
      const exportSettingsTab = screen.getByText('エクスポート設定');

      // Click on export settings tab
      fireEvent.click(exportSettingsTab);

      // Should show export settings content
      expect(screen.getByText('エクスポート形式')).toBeInTheDocument();

      // Click back to basic settings
      fireEvent.click(basicSettingsTab);

      // Should show basic settings content
      expect(screen.getByText('言語設定')).toBeInTheDocument();
    });

    test('should display breadcrumb navigation', () => {
      render(<SettingsScreen />);

      const breadcrumb = screen.getByRole('navigation', { name: /breadcrumb/i });
      expect(breadcrumb).toBeInTheDocument();
      expect(screen.getByText('ホーム')).toBeInTheDocument();
      expect(screen.getByText('設定')).toBeInTheDocument();
    });

    test('should handle back button functionality', () => {
      const mockOnBack = jest.fn();
      render(<SettingsScreen onBack={mockOnBack} />);

      const backButton = screen.getByLabelText('戻る');
      fireEvent.click(backButton);

      expect(mockOnBack).toHaveBeenCalledTimes(1);
    });

    test('should maintain scroll position when switching tabs', async () => {
      render(<SettingsScreen />);

      // Scroll down in basic settings
      const basicSettingsSection = screen.getByText('基本設定').closest('section');
      Object.defineProperty(basicSettingsSection, 'scrollTop', {
        writable: true,
        value: 100,
      });

      // Switch to another tab
      fireEvent.click(screen.getByText('エクスポート設定'));

      // Switch back to basic settings
      fireEvent.click(screen.getByText('基本設定'));

      await waitFor(() => {
        expect(basicSettingsSection?.scrollTop).toBe(100);
      });
    });
  });

  describe('Responsive Layout', () => {
    test('should adapt to mobile layout (< 768px)', () => {
      // Mock mobile viewport
      window.matchMedia = jest.fn().mockImplementation((query) => ({
        matches: query === '(max-width: 768px)',
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }));

      render(<SettingsScreen />);

      const settingsContainer = screen.getByTestId('settings-container');
      expect(settingsContainer).toHaveClass('mobile-layout');
    });

    test('should adapt to tablet layout (768px-1024px)', () => {
      // Mock tablet viewport
      window.matchMedia = jest.fn().mockImplementation((query) => ({
        matches: query === '(min-width: 768px) and (max-width: 1024px)',
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }));

      render(<SettingsScreen />);

      const settingsContainer = screen.getByTestId('settings-container');
      expect(settingsContainer).toHaveClass('tablet-layout');
    });

    test('should adapt to desktop layout (> 1024px)', () => {
      // Mock desktop viewport
      window.matchMedia = jest.fn().mockImplementation((query) => ({
        matches: query === '(min-width: 1024px)',
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }));

      render(<SettingsScreen />);

      const settingsContainer = screen.getByTestId('settings-container');
      expect(settingsContainer).toHaveClass('desktop-layout');
    });

    test('should handle orientation changes smoothly', () => {
      const { rerender } = render(<SettingsScreen />);

      // Simulate orientation change
      window.dispatchEvent(new Event('orientationchange'));

      rerender(<SettingsScreen />);

      // Should maintain content visibility
      expect(screen.getByText('設定')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    test('should handle settings loading errors', () => {
      mockUseSettings.mockReturnValue({
        ...mockUseSettingsReturn,
        loading: false,
        error: 'Failed to load settings',
        settings: null,
      });

      render(<SettingsScreen />);

      expect(screen.getByText('設定の読み込みに失敗しました')).toBeInTheDocument();
      expect(screen.getByText('再試行')).toBeInTheDocument();
    });

    test('should handle settings saving errors', async () => {
      const mockUpdateSetting = jest.fn().mockRejectedValue(new Error('Save failed'));
      mockUseSettings.mockReturnValue({
        ...mockUseSettingsReturn,
        updateSetting: mockUpdateSetting,
      });

      render(<SettingsScreen />);

      // Try to change a setting
      const languageSelect = screen.getByLabelText('言語');
      fireEvent.change(languageSelect, { target: { value: 'en' } });

      await waitFor(() => {
        expect(screen.getByText('設定の保存に失敗しました')).toBeInTheDocument();
      });
    });
  });

  describe('Performance', () => {
    test('should load within 2 seconds', async () => {
      const startTime = Date.now();
      
      render(<SettingsScreen />);

      await waitFor(() => {
        expect(screen.getByText('設定')).toBeInTheDocument();
      });

      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(2000);
    });

    test('should handle large settings data efficiently', () => {
      const largeSettings = {
        ...mockSettings,
        favoriteLocations: Array.from({ length: 1000 }, (_, i) => ({
          id: `location-${i}`,
          name: `Location ${i}`,
          address: `Address ${i}`,
          latitude: 35.6762 + (i * 0.001),
          longitude: 139.6503 + (i * 0.001),
          type: 'other' as const,
          createdAt: new Date(),
          usageCount: i,
        })),
      };

      mockUseSettings.mockReturnValue({
        ...mockUseSettingsReturn,
        settings: largeSettings,
      });

      const startTime = Date.now();
      render(<SettingsScreen />);

      const renderTime = Date.now() - startTime;
      expect(renderTime).toBeLessThan(1000); // Should render within 1 second even with large data
    });
  });

  describe('Loading State', () => {
    test('should show loading spinner when settings are loading', () => {
      mockUseSettings.mockReturnValue({
        ...mockUseSettingsReturn,
        loading: true,
        settings: null,
      });

      render(<SettingsScreen />);

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      expect(screen.getByText('設定を読み込み中...')).toBeInTheDocument();
    });

    test('should hide loading spinner when settings are loaded', () => {
      render(<SettingsScreen />);

      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });
  });
});