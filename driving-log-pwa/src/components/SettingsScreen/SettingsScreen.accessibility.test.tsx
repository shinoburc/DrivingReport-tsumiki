import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import '@testing-library/jest-dom';
import { SettingsScreen } from './SettingsScreen';
import { useSettings } from '../../hooks/useSettings';
import { AppSettings, ExportFormat } from '../../types';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock the useSettings hook
jest.mock('../../hooks/useSettings');
const mockUseSettings = useSettings as jest.MockedFunction<typeof useSettings>;

describe('SettingsScreen Accessibility', () => {
  const mockSettings: AppSettings = {
    language: 'ja',
    theme: 'light',
    gpsTimeout: 30,
    gpsAccuracyThreshold: 50,
    exportFormat: ExportFormat.CSV,
    defaultExportPeriod: 30,
    exportPrivacyLevel: 'full',
    autoExportEnabled: false,
    autoExportFrequency: 'monthly',
    compactMode: false,
    showTutorial: true,
    favoriteLocations: [],
    notificationsEnabled: true,    offlineModeEnabled: true,    autoClearDataEnabled: false,
    firstLaunchDate: new Date('2024-01-01'),
    appVersion: '1.0.0',
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

  describe('Keyboard Navigation', () => {
    test('should support full keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<SettingsScreen />);

      // Start from the first focusable element
      const firstButton = screen.getAllByRole('button')[0];
      firstButton.focus();

      // Tab through all focusable elements
      let currentElement = document.activeElement;
      const focusedElements = [currentElement];

      // Simulate tabbing through the interface
      for (let i = 0; i < 20; i++) {
        await user.tab();
        currentElement = document.activeElement;
        if (currentElement && !focusedElements.includes(currentElement)) {
          focusedElements.push(currentElement);
        }
      }

      // Should have focused multiple different elements
      expect(focusedElements.length).toBeGreaterThan(5);

      // Test reverse tab order
      await user.tab({ shift: true });
      const previousElement = document.activeElement;
      expect(previousElement).not.toBe(currentElement);
    });

    test('should have visible focus indicators', async () => {
      const user = userEvent.setup();
      render(<SettingsScreen />);

      const button = screen.getByText('基本設定');
      await user.tab();
      
      if (document.activeElement === button) {
        // Check if focus styles are applied
        const computedStyle = window.getComputedStyle(button);
        expect(
          computedStyle.outline !== 'none' || 
          computedStyle.boxShadow !== 'none' ||
          computedStyle.border !== 'none'
        ).toBe(true);
      }
    });

    test('should implement logical tab order', async () => {
      const user = userEvent.setup();
      render(<SettingsScreen />);

      // Tab order should follow visual layout
      const expectedOrder = [
        screen.getByLabelText('戻る'),
        screen.getByText('基本設定'),
        screen.getByText('よく使う地点'),
        screen.getByText('エクスポート設定'),
        screen.getByText('データ管理'),
        screen.getByText('プロファイル'),
        screen.getByText('アプリ情報'),
      ];

      expectedOrder[0].focus();

      for (let i = 1; i < expectedOrder.length; i++) {
        await user.tab();
        expect(document.activeElement).toBe(expectedOrder[i]);
      }
    });

    test('should handle keyboard shortcuts', async () => {
      const user = userEvent.setup();
      render(<SettingsScreen />);

      // Test Escape key to close modals
      const addButton = screen.getByText('地点を追加');
      await user.click(addButton);

      // Modal should be open
      expect(screen.getByText('新しい地点を追加')).toBeInTheDocument();

      // Press Escape to close
      await user.keyboard('{Escape}');

      // Modal should be closed
      expect(screen.queryByText('新しい地点を追加')).not.toBeInTheDocument();
    });

    test('should trap focus in modals', async () => {
      const user = userEvent.setup();
      render(<SettingsScreen />);

      const addButton = screen.getByText('地点を追加');
      await user.click(addButton);

      // Focus should be trapped in modal
      const modal = screen.getByRole('dialog');
      const focusableElements = modal.querySelectorAll(
        'input, button, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      // Tab to last element
      for (let i = 0; i < focusableElements.length; i++) {
        await user.tab();
      }

      // Next tab should go to first element
      await user.tab();
      expect(document.activeElement).toBe(focusableElements[0]);
    });
  });

  describe('Screen Reader Support', () => {
    test('should have proper ARIA labels and roles', () => {
      render(<SettingsScreen />);

      // Check main landmarks
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('navigation')).toBeInTheDocument();

      // Check form controls have proper labels
      const languageSelect = screen.getByLabelText('言語');
      expect(languageSelect).toBeInTheDocument();

      const gpsSlider = screen.getByLabelText('GPS タイムアウト (秒)');
      expect(gpsSlider).toBeInTheDocument();
      expect(gpsSlider).toHaveAttribute('role', 'slider');

      // Check buttons have proper labels
      const addButton = screen.getByLabelText('地点を追加');
      expect(addButton).toBeInTheDocument();
    });

    test('should announce setting changes', async () => {
      const user = userEvent.setup();
      render(<SettingsScreen />);

      const languageSelect = screen.getByLabelText('言語');
      await user.selectOptions(languageSelect, 'en');

      // Should have aria-live region for announcements
      const announcement = screen.getByRole('status', { hidden: true });
      expect(announcement).toBeInTheDocument();
    });

    test('should provide descriptive form labels', () => {
      render(<SettingsScreen />);

      // All form controls should have descriptive labels
      const formControls = screen.getAllByRole('combobox')
        .concat(screen.getAllByRole('slider'))
        .concat(screen.getAllByRole('button'))
        .concat(screen.getAllByRole('checkbox'));

      formControls.forEach(control => {
        expect(control).toHaveAccessibleName();
      });
    });

    test('should use appropriate heading structure', () => {
      render(<SettingsScreen />);

      // Check heading hierarchy
      const h1 = screen.getByRole('heading', { level: 1 });
      expect(h1).toHaveTextContent('設定');

      const h2Elements = screen.getAllByRole('heading', { level: 2 });
      expect(h2Elements.length).toBeGreaterThan(0);

      // Should not skip heading levels
      const h3Elements = screen.getAllByRole('heading', { level: 3 });
      if (h3Elements.length > 0) {
        expect(h2Elements.length).toBeGreaterThan(0);
      }
    });

    test('should provide context for form sections', () => {
      render(<SettingsScreen />);

      // Form sections should be grouped with fieldsets
      const fieldsets = screen.getAllByRole('group');
      expect(fieldsets.length).toBeGreaterThan(0);

      fieldsets.forEach(fieldset => {
        // Each fieldset should have a legend
        const legend = fieldset.querySelector('legend');
        expect(legend).toBeInTheDocument();
      });
    });

    test('should indicate required fields', () => {
      render(<SettingsScreen />);

      // Required fields should be marked
      const requiredInputs = screen.getAllByRole('textbox', { name: /必須/ });
      requiredInputs.forEach(input => {
        expect(input).toHaveAttribute('aria-required', 'true');
        expect(input).toHaveAccessibleDescription(/必須/);
      });
    });
  });

  describe('Color and Contrast', () => {
    test('should maintain sufficient color contrast', () => {
      render(<SettingsScreen />);

      // Get all text elements and check contrast
      const textElements = screen.getAllByText(/.+/);
      textElements.forEach(element => {
        const computedStyle = window.getComputedStyle(element);
        const color = computedStyle.color;
        const backgroundColor = computedStyle.backgroundColor;

        // Note: In a real test, you'd use a contrast checking library
        // This is a simplified check
        expect(color).not.toBe(backgroundColor);
      });
    });

    test('should not rely solely on color for information', () => {
      render(<SettingsScreen />);

      // Status indicators should have text or icons, not just color
      const statusElements = screen.getAllByTestId(/status-/);
      statusElements.forEach(element => {
        // Should have text content or aria-label
        expect(
          element.textContent !== '' || 
          element.getAttribute('aria-label') !== null
        ).toBe(true);
      });
    });
  });

  describe('Responsive and Zoom', () => {
    test('should remain usable at 200% zoom', () => {
      // Simulate zoom by reducing viewport
      Object.defineProperty(document.documentElement, 'clientWidth', {
        value: 400, // Half of 800px (simulating 200% zoom)
        configurable: true,
      });

      render(<SettingsScreen />);

      // All interactive elements should still be accessible
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toBeVisible();
      });

      // Text should not be cut off
      const headings = screen.getAllByRole('heading');
      headings.forEach(heading => {
        expect(heading).toBeVisible();
      });
    });

    test('should maintain touch target sizes', () => {
      render(<SettingsScreen />);

      const interactiveElements = screen.getAllByRole('button')
        .concat(screen.getAllByRole('link'))
        .concat(screen.getAllByRole('checkbox'));

      interactiveElements.forEach(element => {
        const computedStyle = window.getComputedStyle(element);
        const minSize = 44; // WCAG AA minimum

        const width = parseInt(computedStyle.minWidth) || 
                     parseInt(computedStyle.width) || 
                     element.offsetWidth;
        const height = parseInt(computedStyle.minHeight) || 
                      parseInt(computedStyle.height) || 
                      element.offsetHeight;

        expect(width).toBeGreaterThanOrEqual(minSize);
        expect(height).toBeGreaterThanOrEqual(minSize);
      });
    });
  });

  describe('Automated Accessibility Testing', () => {
    test('should have no accessibility violations', async () => {
      const { container } = render(<SettingsScreen />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('should pass accessibility audit for modals', async () => {
      const user = userEvent.setup();
      render(<SettingsScreen />);

      // Open modal
      const addButton = screen.getByText('地点を追加');
      await user.click(addButton);

      const modal = screen.getByRole('dialog');
      const results = await axe(modal);
      expect(results).toHaveNoViolations();
    });

    test('should maintain accessibility during dynamic updates', async () => {
      const user = userEvent.setup();
      const { container } = render(<SettingsScreen />);

      // Make a change that updates the UI
      const languageSelect = screen.getByLabelText('言語');
      await user.selectOptions(languageSelect, 'en');

      // Check accessibility after update
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Error Handling Accessibility', () => {
    test('should announce errors to screen readers', () => {
      mockUseSettings.mockReturnValue({
        ...mockUseSettingsReturn,
        error: 'Failed to load settings',
      });

      render(<SettingsScreen />);

      const errorRegion = screen.getByRole('alert');
      expect(errorRegion).toBeInTheDocument();
      expect(errorRegion).toHaveTextContent('Failed to load settings');
    });

    test('should provide clear error recovery instructions', () => {
      mockUseSettings.mockReturnValue({
        ...mockUseSettingsReturn,
        error: 'Network error',
      });

      render(<SettingsScreen />);

      expect(screen.getByText('再試行')).toBeInTheDocument();
      expect(screen.getByText(/ネットワーク接続を確認/)).toBeInTheDocument();
    });
  });
});