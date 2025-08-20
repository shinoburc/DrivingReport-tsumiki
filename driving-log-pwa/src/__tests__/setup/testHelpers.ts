/**
 * テストヘルパー関数
 * 
 * 共通的なテスト操作とアサーションのヘルパー関数
 */

import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DrivingLogModel } from '../../models/entities/DrivingLogModel';
import { LocationModel } from '../../models/entities/LocationModel';
import { DrivingLogStatus, LocationType } from '../../types';

// DOM interaction helpers
export const testHelpers = {
  // Form interactions
  async fillDrivingLogForm(data: {
    purpose?: string;
    vehicle?: string;
    driver?: string;
  }) {
    const user = userEvent.setup();
    
    if (data.purpose) {
      const purposeInput = screen.getByRole('textbox', { name: /purpose|目的/i });
      await user.clear(purposeInput);
      await user.type(purposeInput, data.purpose);
    }
    
    if (data.vehicle) {
      const vehicleInput = screen.getByRole('textbox', { name: /vehicle|車両/i });
      await user.clear(vehicleInput);
      await user.type(vehicleInput, data.vehicle);
    }
    
    if (data.driver) {
      const driverInput = screen.getByRole('textbox', { name: /driver|運転者/i });
      await user.clear(driverInput);
      await user.type(driverInput, data.driver);
    }
  },

  async submitForm(formTestId?: string) {
    const user = userEvent.setup();
    const submitButton = formTestId 
      ? within(screen.getByTestId(formTestId)).getByRole('button', { name: /submit|送信|保存/i })
      : screen.getByRole('button', { name: /submit|送信|保存/i });
    
    await user.click(submitButton);
  },

  async selectFromDropdown(labelText: string, optionText: string) {
    const user = userEvent.setup();
    const select = screen.getByRole('combobox', { name: new RegExp(labelText, 'i') });
    await user.selectOptions(select, optionText);
  },

  async clickButton(buttonText: string) {
    const user = userEvent.setup();
    const button = screen.getByRole('button', { name: new RegExp(buttonText, 'i') });
    await user.click(button);
  },

  async typeInInput(labelText: string, value: string) {
    const user = userEvent.setup();
    const input = screen.getByRole('textbox', { name: new RegExp(labelText, 'i') });
    await user.clear(input);
    await user.type(input, value);
  },

  // Waiting helpers
  async waitForLoadingToFinish() {
    await waitFor(() => {
      expect(screen.queryByText(/loading|読み込み中/i)).not.toBeInTheDocument();
    });
  },

  async waitForErrorToDisappear() {
    await waitFor(() => {
      expect(screen.queryByText(/error|エラー/i)).not.toBeInTheDocument();
    });
  },

  async waitForElementToAppear(text: string, timeout = 3000) {
    return await waitFor(() => {
      return screen.getByText(new RegExp(text, 'i'));
    }, { timeout });
  },

  async waitForElementToDisappear(text: string, timeout = 3000) {
    await waitFor(() => {
      expect(screen.queryByText(new RegExp(text, 'i'))).not.toBeInTheDocument();
    }, { timeout });
  },

  // Assertion helpers
  expectElementToBeVisible(text: string) {
    const element = screen.getByText(new RegExp(text, 'i'));
    expect(element).toBeVisible();
    return element;
  },

  expectElementNotToBeInDocument(text: string) {
    expect(screen.queryByText(new RegExp(text, 'i'))).not.toBeInTheDocument();
  },

  expectFormToHaveValue(labelText: string, expectedValue: string) {
    const input = screen.getByRole('textbox', { name: new RegExp(labelText, 'i') });
    expect(input).toHaveValue(expectedValue);
  },

  expectButtonToBeDisabled(buttonText: string) {
    const button = screen.getByRole('button', { name: new RegExp(buttonText, 'i') });
    expect(button).toBeDisabled();
  },

  expectButtonToBeEnabled(buttonText: string) {
    const button = screen.getByRole('button', { name: new RegExp(buttonText, 'i') });
    expect(button).toBeEnabled();
  },

  // List and table helpers
  expectListToHaveItems(listTestId: string, expectedCount: number) {
    const list = screen.getByTestId(listTestId);
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(expectedCount);
  },

  expectTableToHaveRows(tableTestId: string, expectedCount: number) {
    const table = screen.getByTestId(tableTestId);
    const rows = within(table).getAllByRole('row');
    // Subtract 1 for header row
    expect(rows).toHaveLength(expectedCount + 1);
  },

  async selectListItem(listTestId: string, itemText: string) {
    const user = userEvent.setup();
    const list = screen.getByTestId(listTestId);
    const item = within(list).getByText(new RegExp(itemText, 'i'));
    await user.click(item);
  },

  // Modal and dialog helpers
  expectModalToBeOpen(modalTestId: string) {
    const modal = screen.getByTestId(modalTestId);
    expect(modal).toBeInTheDocument();
    expect(modal).toBeVisible();
  },

  expectModalToBeClosed(modalTestId: string) {
    expect(screen.queryByTestId(modalTestId)).not.toBeInTheDocument();
  },

  async closeModal(modalTestId?: string) {
    const user = userEvent.setup();
    const closeButton = modalTestId
      ? within(screen.getByTestId(modalTestId)).getByRole('button', { name: /close|閉じる|×/i })
      : screen.getByRole('button', { name: /close|閉じる|×/i });
    
    await user.click(closeButton);
  },

  async confirmDialog() {
    const user = userEvent.setup();
    const confirmButton = screen.getByRole('button', { name: /confirm|確認|ok/i });
    await user.click(confirmButton);
  },

  async cancelDialog() {
    const user = userEvent.setup();
    const cancelButton = screen.getByRole('button', { name: /cancel|キャンセル/i });
    await user.click(cancelButton);
  }
};

// Mock data creators
export const mockDataCreators = {
  createDrivingLog(overrides: Partial<DrivingLogModel> = {}): DrivingLogModel {
    return DrivingLogModel.create({
      purpose: 'Test Purpose',
      vehicle: 'Test Vehicle',
      driver: 'Test Driver',
      startTime: new Date('2024-01-15T08:00:00Z'),
      status: DrivingLogStatus.IN_PROGRESS,
      ...overrides
    });
  },

  createCompletedDrivingLog(overrides: Partial<DrivingLogModel> = {}): DrivingLogModel {
    return DrivingLogModel.create({
      purpose: 'Completed Trip',
      vehicle: 'Test Vehicle',
      driver: 'Test Driver',
      startTime: new Date('2024-01-15T08:00:00Z'),
      endTime: new Date('2024-01-15T09:30:00Z'),
      status: DrivingLogStatus.COMPLETED,
      totalDistance: 25.5,
      totalTime: 90,
      ...overrides
    });
  },

  createLocation(overrides: Partial<LocationModel> = {}): LocationModel {
    return LocationModel.create({
      type: LocationType.START,
      address: 'Test Address',
      logId: 'test-log-id',
      coordinates: {
        latitude: 35.6762,
        longitude: 139.6503
      },
      accuracy: 10,
      ...overrides
    });
  },

  createMultipleDrivingLogs(count: number): DrivingLogModel[] {
    return Array.from({ length: count }, (_, index) => 
      this.createDrivingLog({
        purpose: `Test Purpose ${index + 1}`,
        vehicle: `Vehicle ${index + 1}`
      })
    );
  },

  createMultipleLocations(logId: string, count: number): LocationModel[] {
    const types = [LocationType.START, LocationType.WAYPOINT, LocationType.END];
    
    return Array.from({ length: count }, (_, index) => 
      this.createLocation({
        logId,
        type: types[index % types.length],
        address: `Location ${index + 1}`,
        coordinates: {
          latitude: 35.6762 + (index * 0.001),
          longitude: 139.6503 + (index * 0.001)
        }
      })
    );
  }
};

// Test scenario helpers
export const testScenarios = {
  async createNewDrivingLog(data: {
    purpose: string;
    vehicle?: string;
    driver?: string;
  }) {
    await testHelpers.clickButton('new|新規作成');
    await testHelpers.fillDrivingLogForm(data);
    await testHelpers.submitForm();
    await testHelpers.waitForLoadingToFinish();
  },

  async editDrivingLog(logId: string, updates: {
    purpose?: string;
    vehicle?: string;
    driver?: string;
  }) {
    // Select log from list
    await testHelpers.selectListItem('driving-log-list', logId);
    await testHelpers.clickButton('edit|編集');
    
    // Update form
    await testHelpers.fillDrivingLogForm(updates);
    await testHelpers.submitForm();
    await testHelpers.waitForLoadingToFinish();
  },

  async deleteDrivingLog(logId: string) {
    await testHelpers.selectListItem('driving-log-list', logId);
    await testHelpers.clickButton('delete|削除');
    await testHelpers.confirmDialog();
    await testHelpers.waitForLoadingToFinish();
  },

  async addLocationToLog(logData: {
    type: string;
    address: string;
  }) {
    await testHelpers.clickButton('add location|地点追加');
    await testHelpers.selectFromDropdown('type|種別', logData.type);
    await testHelpers.typeInInput('address|住所', logData.address);
    await testHelpers.submitForm();
    await testHelpers.waitForLoadingToFinish();
  },

  async completeTrip(data: {
    endAddress?: string;
    totalDistance?: number;
    notes?: string;
  }) {
    if (data.endAddress) {
      await this.addLocationToLog({
        type: 'END',
        address: data.endAddress
      });
    }
    
    await testHelpers.clickButton('complete|完了');
    
    if (data.totalDistance) {
      await testHelpers.typeInInput('distance|距離', data.totalDistance.toString());
    }
    
    if (data.notes) {
      await testHelpers.typeInInput('notes|備考', data.notes);
    }
    
    await testHelpers.submitForm();
    await testHelpers.waitForLoadingToFinish();
  },

  async exportLogs(format: string = 'csv') {
    await testHelpers.clickButton('export|エクスポート');
    await testHelpers.selectFromDropdown('format|形式', format);
    await testHelpers.clickButton('download|ダウンロード');
    await testHelpers.waitForLoadingToFinish();
  }
};

// Performance helpers
export const performanceHelpers = {
  measureRenderTime<T>(renderFunction: () => T): { result: T; renderTime: number } {
    const startTime = performance.now();
    const result = renderFunction();
    const endTime = performance.now();
    
    return {
      result,
      renderTime: endTime - startTime
    };
  },

  async measureAsyncOperation<T>(operation: () => Promise<T>): Promise<{ result: T; duration: number }> {
    const startTime = performance.now();
    const result = await operation();
    const endTime = performance.now();
    
    return {
      result,
      duration: endTime - startTime
    };
  },

  expectRenderTimeBelow(renderTime: number, maxTime: number) {
    expect(renderTime).toBeLessThan(maxTime);
  },

  expectAsyncOperationTimeBelow(duration: number, maxTime: number) {
    expect(duration).toBeLessThan(maxTime);
  }
};

// Accessibility helpers
export const a11yHelpers = {
  expectElementToHaveAccessibleName(element: HTMLElement, expectedName: string) {
    expect(element).toHaveAccessibleName(expectedName);
  },

  expectElementToHaveRole(element: HTMLElement, expectedRole: string) {
    expect(element).toHaveAttribute('role', expectedRole);
  },

  expectElementToBeAccessible(element: HTMLElement) {
    // Check for basic accessibility attributes
    expect(element).toBeVisible();
    
    if (element.tagName === 'BUTTON' || element.getAttribute('role') === 'button') {
      expect(element).toHaveAttribute('type');
    }
    
    if (element.tagName === 'INPUT') {
      expect(element).toHaveAttribute('type');
      expect(element).toHaveAccessibleName();
    }
  },

  expectFormToBeAccessible(formElement: HTMLElement) {
    const inputs = within(formElement).getAllByRole('textbox');
    inputs.forEach(input => {
      expect(input).toHaveAccessibleName();
    });
    
    const buttons = within(formElement).getAllByRole('button');
    buttons.forEach(button => {
      expect(button).toHaveAccessibleName();
    });
  },

  async testKeyboardNavigation(startElement: HTMLElement, expectedFocusOrder: string[]) {
    const user = userEvent.setup();
    
    // Focus start element
    startElement.focus();
    expect(startElement).toHaveFocus();
    
    // Tab through expected order
    for (const testId of expectedFocusOrder) {
      await user.tab();
      const expectedElement = screen.getByTestId(testId);
      expect(expectedElement).toHaveFocus();
    }
  }
};

export default {
  testHelpers,
  mockDataCreators,
  testScenarios,
  performanceHelpers,
  a11yHelpers
};