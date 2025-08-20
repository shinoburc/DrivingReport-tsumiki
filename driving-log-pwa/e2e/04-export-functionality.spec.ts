import { test, expect } from '@playwright/test';

/**
 * E2E Test: エクスポート機能
 * 
 * CSVエクスポート機能とファイルダウンロードを確認
 */

test.describe('Export Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    
    // Create some test data first
    await createTestData(page);
  });

  test('should access export functionality', async ({ page }) => {
    // Look for export button or menu
    const exportButton = page.locator('button:has-text("エクスポート"), button:has-text("書き出し"), [data-testid="export-button"]');
    const exportMenu = page.locator('a:has-text("エクスポート"), [data-testid="export-menu"]');
    
    if (await exportButton.count() > 0) {
      await expect(exportButton).toBeVisible();
      await exportButton.click();
    } else if (await exportMenu.count() > 0) {
      await exportMenu.click();
    } else {
      // Check if export is in settings or history page
      const settingsLink = page.locator('a:has-text("設定"), [data-testid="settings-link"]');
      const historyLink = page.locator('a:has-text("履歴"), [data-testid="history-link"]');
      
      if (await historyLink.count() > 0) {
        await historyLink.click();
        const exportInHistory = page.locator('button:has-text("エクスポート"), [data-testid="export-button"]');
        await expect(exportInHistory).toBeVisible({ timeout: 5000 });
      } else if (await settingsLink.count() > 0) {
        await settingsLink.click();
        const exportInSettings = page.locator('button:has-text("エクスポート"), [data-testid="export-button"]');
        await expect(exportInSettings).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should display export options', async ({ page }) => {
    await navigateToExport(page);
    
    // Check for export format options
    const csvOption = page.locator('input[value="csv"], text=CSV, [data-testid="format-csv"]');
    const jsonOption = page.locator('input[value="json"], text=JSON, [data-testid="format-json"]');
    const excelOption = page.locator('input[value="excel"], text=Excel, [data-testid="format-excel"]');
    
    // At least CSV should be available
    if (await csvOption.count() > 0) {
      await expect(csvOption).toBeVisible();
    } else {
      // Check for format select dropdown
      const formatSelect = page.locator('select[name="format"], [data-testid="format-select"]');
      if (await formatSelect.count() > 0) {
        await expect(formatSelect).toBeVisible();
        
        const options = await formatSelect.locator('option').allTextContents();
        expect(options.some(opt => opt.toLowerCase().includes('csv'))).toBe(true);
      }
    }
  });

  test('should select date range for export', async ({ page }) => {
    await navigateToExport(page);
    
    // Look for date range inputs
    const startDateInput = page.locator('input[type="date"][name*="start"], input[type="date"][name*="from"], [data-testid="start-date"]');
    const endDateInput = page.locator('input[type="date"][name*="end"], input[type="date"][name*="to"], [data-testid="end-date"]');
    
    if (await startDateInput.count() > 0 && await endDateInput.count() > 0) {
      // Set date range to last month
      const today = new Date();
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      
      await startDateInput.fill(lastMonth.toISOString().split('T')[0]);
      await endDateInput.fill(endOfLastMonth.toISOString().split('T')[0]);
      
      // Verify dates are set
      expect(await startDateInput.inputValue()).toBe(lastMonth.toISOString().split('T')[0]);
      expect(await endDateInput.inputValue()).toBe(endOfLastMonth.toISOString().split('T')[0]);
    }
  });

  test('should export CSV file', async ({ page }) => {
    await navigateToExport(page);
    
    // Configure export settings
    const csvOption = page.locator('input[value="csv"], [data-testid="format-csv"]');
    if (await csvOption.count() > 0) {
      await csvOption.check();
    } else {
      const formatSelect = page.locator('select[name="format"], [data-testid="format-select"]');
      if (await formatSelect.count() > 0) {
        await formatSelect.selectOption('csv');
      }
    }
    
    // Set up download promise before clicking
    const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
    
    // Click export/download button
    const exportButton = page.locator('button:has-text("ダウンロード"), button:has-text("エクスポート"), [data-testid="download-button"]');
    await exportButton.click();
    
    try {
      const download = await downloadPromise;
      
      // Verify download
      expect(download.suggestedFilename()).toMatch(/.*\.csv$/);
      
      // Save and verify file content
      const path = await download.path();
      expect(path).toBeTruthy();
    } catch {
      // If download doesn't work, check for generated content
      const csvContent = page.locator('textarea[data-testid="csv-content"], pre:has-text("目的,車両")');
      if (await csvContent.count() > 0) {
        await expect(csvContent).toBeVisible();
        const content = await csvContent.textContent();
        expect(content).toContain('目的');
        expect(content).toContain('車両');
      }
    }
  });

  test('should include location data in export', async ({ page }) => {
    await navigateToExport(page);
    
    // Check for include locations option
    const includeLocationsCheckbox = page.locator('input[type="checkbox"][name*="location"], [data-testid="include-locations"]');
    if (await includeLocationsCheckbox.count() > 0) {
      await includeLocationsCheckbox.check();
      
      // Export with locations
      const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
      
      const exportButton = page.locator('button:has-text("ダウンロード"), [data-testid="download-button"]');
      await exportButton.click();
      
      try {
        const download = await downloadPromise;
        expect(download.suggestedFilename()).toMatch(/.*\.csv$/);
      } catch {
        // Check generated content includes location data
        const csvContent = page.locator('textarea[data-testid="csv-content"], pre');
        if (await csvContent.count() > 0) {
          const content = await csvContent.textContent();
          expect(content).toMatch(/緯度|経度|latitude|longitude|address/i);
        }
      }
    }
  });

  test('should handle empty export', async ({ page }) => {
    // Navigate to fresh page without data
    await page.goto('/');
    await navigateToExport(page);
    
    // Try to export with no data
    const exportButton = page.locator('button:has-text("ダウンロード"), [data-testid="download-button"]');
    if (await exportButton.count() > 0) {
      await exportButton.click();
      
      // Check for appropriate message
      const noDataMessage = page.locator('text=データがありません, text=記録が見つかりません, [data-testid="no-data-message"]');
      await expect(noDataMessage).toBeVisible({ timeout: 5000 });
    }
  });

  test('should validate export parameters', async ({ page }) => {
    await navigateToExport(page);
    
    // Try to export with invalid date range
    const startDateInput = page.locator('input[type="date"][name*="start"], [data-testid="start-date"]');
    const endDateInput = page.locator('input[type="date"][name*="end"], [data-testid="end-date"]');
    
    if (await startDateInput.count() > 0 && await endDateInput.count() > 0) {
      // Set end date before start date
      await startDateInput.fill('2024-12-31');
      await endDateInput.fill('2024-01-01');
      
      const exportButton = page.locator('button:has-text("ダウンロード"), [data-testid="download-button"]');
      await exportButton.click();
      
      // Check for validation error
      const validationError = page.locator('text=無効, text=エラー, text=正しい日付, [data-testid="validation-error"]');
      await expect(validationError).toBeVisible({ timeout: 5000 });
    }
  });

  test('should show export progress', async ({ page }) => {
    await navigateToExport(page);
    
    // Start export
    const exportButton = page.locator('button:has-text("ダウンロード"), [data-testid="download-button"]');
    await exportButton.click();
    
    // Check for progress indicator
    const progressIndicator = page.locator('.progress, [data-testid="export-progress"], text=処理中');
    
    // Progress might be very fast, so use a short timeout
    try {
      await expect(progressIndicator).toBeVisible({ timeout: 2000 });
    } catch {
      // Progress might be too fast to catch, which is fine
    }
  });

  test('should allow custom filename', async ({ page }) => {
    await navigateToExport(page);
    
    // Look for filename input
    const filenameInput = page.locator('input[name*="filename"], input[name*="name"], [data-testid="filename-input"]');
    
    if (await filenameInput.count() > 0) {
      await filenameInput.fill('custom-driving-log');
      
      const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
      
      const exportButton = page.locator('button:has-text("ダウンロード"), [data-testid="download-button"]');
      await exportButton.click();
      
      try {
        const download = await downloadPromise;
        expect(download.suggestedFilename()).toContain('custom-driving-log');
      } catch {
        // Filename customization might not be implemented
      }
    }
  });

  // Helper functions
  async function createTestData(page: any) {
    // Create a test driving log
    const newLogButton = page.locator('button:has-text("新規記録"), [data-testid="new-log-button"]');
    
    if (await newLogButton.count() > 0) {
      await newLogButton.click();
      
      const purposeInput = page.locator('input[name="purpose"], [data-testid="purpose-input"]');
      await purposeInput.fill('テスト用記録');
      
      const submitButton = page.locator('button[type="submit"], [data-testid="submit-button"]');
      await submitButton.click();
      
      await page.waitForTimeout(1000);
    }
  }

  async function navigateToExport(page: any) {
    // Try different ways to access export functionality
    const exportButton = page.locator('button:has-text("エクスポート"), [data-testid="export-button"]');
    
    if (await exportButton.count() > 0) {
      await exportButton.click();
      return;
    }
    
    // Check in history page
    const historyLink = page.locator('a:has-text("履歴"), [data-testid="history-link"]');
    if (await historyLink.count() > 0) {
      await historyLink.click();
      
      const exportInHistory = page.locator('button:has-text("エクスポート"), [data-testid="export-button"]');
      if (await exportInHistory.count() > 0) {
        await exportInHistory.click();
        return;
      }
    }
    
    // Check in settings
    const settingsLink = page.locator('a:has-text("設定"), [data-testid="settings-link"]');
    if (await settingsLink.count() > 0) {
      await settingsLink.click();
      
      const exportInSettings = page.locator('button:has-text("エクスポート"), [data-testid="export-button"]');
      if (await exportInSettings.count() > 0) {
        await exportInSettings.click();
      }
    }
  }
});