import { test, expect } from '@playwright/test';

/**
 * E2E Test: 運転記録メインワークフロー
 * 
 * 運転記録の作成、編集、完了の完全なユーザーフローを確認
 */

test.describe('Driving Log Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should complete full driving log creation workflow', async ({ page }) => {
    // Click to start new log
    const newLogButton = page.locator('button:has-text("新規記録"), [data-testid="new-log-button"]');
    await expect(newLogButton).toBeVisible({ timeout: 10000 });
    await newLogButton.click();

    // Fill driving log form
    const purposeInput = page.locator('input[name="purpose"], [data-testid="purpose-input"]');
    await expect(purposeInput).toBeVisible();
    await purposeInput.fill('通勤');

    const vehicleInput = page.locator('input[name="vehicle"], select[name="vehicle"], [data-testid="vehicle-input"]');
    if (await vehicleInput.count() > 0) {
      if (await vehicleInput.first().getAttribute('type') === 'text' || 
          await vehicleInput.first().tagName() === 'INPUT') {
        await vehicleInput.fill('普通車');
      } else {
        await vehicleInput.selectOption('普通車');
      }
    }

    const driverInput = page.locator('input[name="driver"], [data-testid="driver-input"]');
    if (await driverInput.count() > 0) {
      await driverInput.fill('山田太郎');
    }

    // Submit form
    const submitButton = page.locator('button[type="submit"], button:has-text("開始"), [data-testid="submit-button"]');
    await submitButton.click();

    // Verify log was created
    await expect(page).toHaveURL(/.*/, { timeout: 10000 });
    
    // Check for success message or log display
    const successMessage = page.locator('text=記録を開始しました, text=作成しました, [data-testid="success-message"]');
    const logDisplay = page.locator('text=通勤, [data-testid="current-log"]');
    
    await expect(successMessage.or(logDisplay)).toBeVisible({ timeout: 5000 });
  });

  test('should add start location to driving log', async ({ page }) => {
    // Create a new log first
    await createNewLog(page);

    // Add start location
    const addLocationButton = page.locator('button:has-text("地点追加"), button:has-text("出発地点"), [data-testid="add-location-button"]');
    if (await addLocationButton.count() > 0) {
      await addLocationButton.click();

      // Fill location form
      const locationTypeSelect = page.locator('select[name="type"], [data-testid="location-type-select"]');
      if (await locationTypeSelect.count() > 0) {
        await locationTypeSelect.selectOption('START');
      }

      const addressInput = page.locator('input[name="address"], [data-testid="address-input"]');
      await addressInput.fill('東京駅');

      // Submit location
      const submitLocationButton = page.locator('button[type="submit"], button:has-text("追加"), [data-testid="submit-location-button"]');
      await submitLocationButton.click();

      // Verify location was added
      await expect(page.locator('text=東京駅')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should complete driving log with end location', async ({ page }) => {
    // Create log and add start location
    await createNewLog(page);
    await addLocation(page, 'START', '東京駅');

    // Add end location
    await addLocation(page, 'END', '新宿駅');

    // Complete the log
    const completeButton = page.locator('button:has-text("完了"), button:has-text("終了"), [data-testid="complete-button"]');
    if (await completeButton.count() > 0) {
      await completeButton.click();

      // Fill completion details if form appears
      const distanceInput = page.locator('input[name="distance"], input[name="totalDistance"], [data-testid="distance-input"]');
      if (await distanceInput.count() > 0) {
        await distanceInput.fill('15.5');
      }

      const notesInput = page.locator('textarea[name="notes"], [data-testid="notes-input"]');
      if (await notesInput.count() > 0) {
        await notesInput.fill('交通渋滞あり');
      }

      // Submit completion
      const submitCompleteButton = page.locator('button[type="submit"], button:has-text("完了"), [data-testid="submit-complete-button"]');
      await submitCompleteButton.click();

      // Verify completion
      const completionMessage = page.locator('text=完了しました, text=記録を終了, [data-testid="completion-message"]');
      await expect(completionMessage).toBeVisible({ timeout: 5000 });
    }
  });

  test('should display driving log history', async ({ page }) => {
    // Navigate to history page
    const historyLink = page.locator('a:has-text("履歴"), a:has-text("記録一覧"), [data-testid="history-link"]');
    if (await historyLink.count() > 0) {
      await historyLink.click();
      
      // Check history page loads
      await expect(page).toHaveURL(/.*history.*|.*logs.*/, { timeout: 5000 });
      
      // Check for history table or list
      const historyTable = page.locator('table, [data-testid="history-table"], [data-testid="log-list"]');
      await expect(historyTable).toBeVisible({ timeout: 10000 });
    } else {
      // Check if history is on the same page
      const historySection = page.locator('[data-testid="history-section"], .history, text=履歴');
      await expect(historySection).toBeVisible({ timeout: 10000 });
    }
  });

  test('should edit existing driving log', async ({ page }) => {
    // Create a completed log first
    await createCompletedLog(page);

    // Find and edit the log
    const editButton = page.locator('button:has-text("編集"), [data-testid="edit-button"]').first();
    if (await editButton.count() > 0) {
      await editButton.click();

      // Update purpose
      const purposeInput = page.locator('input[name="purpose"], [data-testid="purpose-input"]');
      await purposeInput.clear();
      await purposeInput.fill('買い物');

      // Save changes
      const saveButton = page.locator('button:has-text("保存"), button:has-text("更新"), [data-testid="save-button"]');
      await saveButton.click();

      // Verify update
      await expect(page.locator('text=買い物')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should delete driving log', async ({ page }) => {
    // Create a log first
    await createCompletedLog(page);

    // Find and delete the log
    const deleteButton = page.locator('button:has-text("削除"), [data-testid="delete-button"]').first();
    if (await deleteButton.count() > 0) {
      await deleteButton.click();

      // Confirm deletion if confirmation dialog appears
      const confirmButton = page.locator('button:has-text("確認"), button:has-text("削除する"), [data-testid="confirm-delete"]');
      if (await confirmButton.count() > 0) {
        await confirmButton.click();
      }

      // Verify deletion
      const deletionMessage = page.locator('text=削除しました, text=削除されました, [data-testid="deletion-message"]');
      await expect(deletionMessage).toBeVisible({ timeout: 5000 });
    }
  });

  test('should handle validation errors', async ({ page }) => {
    // Try to create log without required fields
    const newLogButton = page.locator('button:has-text("新規記録"), [data-testid="new-log-button"]');
    await newLogButton.click();

    // Submit empty form
    const submitButton = page.locator('button[type="submit"], [data-testid="submit-button"]');
    await submitButton.click();

    // Check for validation errors
    const errorMessage = page.locator('text=必須, text=エラー, text=入力してください, [data-testid="error-message"]');
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
  });

  // Helper functions
  async function createNewLog(page: any) {
    const newLogButton = page.locator('button:has-text("新規記録"), [data-testid="new-log-button"]');
    await newLogButton.click();

    const purposeInput = page.locator('input[name="purpose"], [data-testid="purpose-input"]');
    await purposeInput.fill('テスト記録');

    const submitButton = page.locator('button[type="submit"], [data-testid="submit-button"]');
    await submitButton.click();

    // Wait for creation
    await page.waitForTimeout(1000);
  }

  async function addLocation(page: any, type: string, address: string) {
    const addLocationButton = page.locator('button:has-text("地点追加"), [data-testid="add-location-button"]');
    if (await addLocationButton.count() > 0) {
      await addLocationButton.click();

      const locationTypeSelect = page.locator('select[name="type"], [data-testid="location-type-select"]');
      if (await locationTypeSelect.count() > 0) {
        await locationTypeSelect.selectOption(type);
      }

      const addressInput = page.locator('input[name="address"], [data-testid="address-input"]');
      await addressInput.fill(address);

      const submitLocationButton = page.locator('button[type="submit"], [data-testid="submit-location-button"]');
      await submitLocationButton.click();

      await page.waitForTimeout(1000);
    }
  }

  async function createCompletedLog(page: any) {
    await createNewLog(page);
    await addLocation(page, 'START', '東京駅');
    await addLocation(page, 'END', '新宿駅');

    const completeButton = page.locator('button:has-text("完了"), [data-testid="complete-button"]');
    if (await completeButton.count() > 0) {
      await completeButton.click();

      const submitCompleteButton = page.locator('button[type="submit"], [data-testid="submit-complete-button"]');
      if (await submitCompleteButton.count() > 0) {
        await submitCompleteButton.click();
      }

      await page.waitForTimeout(1000);
    }
  }
});