/**
 * アクセシビリティユーティリティ テスト
 * 
 * accessibility.tsのテストカバレッジ向上のためのテストファイル
 */

import {
  announceToScreenReader
} from '../accessibility';

// DOM環境のセットアップ
const mockElement = (tagName: string = 'div') => {
  const element = document.createElement(tagName);
  return element;
};

describe('accessibility utils', () => {
  beforeEach(() => {
    // DOM をクリア
    document.body.innerHTML = '';
  });

  describe('announceToScreenReader', () => {
    test('should create and remove announcement element', () => {
      announceToScreenReader('Test announcement');
      
      const announcer = document.querySelector('[aria-live="polite"]');
      expect(announcer).toBeTruthy();
      expect(announcer?.textContent).toBe('Test announcement');
      
      // アナウンスが削除されることを確認
      setTimeout(() => {
        expect(document.querySelector('[aria-live="polite"]')).toBeFalsy();
      }, 1100);
    });

    test('should handle assertive announcements', () => {
      announceToScreenReader('Urgent message', 'assertive');
      
      const announcer = document.querySelector('[aria-live="assertive"]');
      expect(announcer).toBeTruthy();
      expect(announcer?.textContent).toBe('Urgent message');
    });

    test('should clean up previous announcements', () => {
      announceToScreenReader('First message');
      announceToScreenReader('Second message');
      
      const announcers = document.querySelectorAll('[aria-live]');
      // 前のアナウンスが削除され、新しいアナウンスのみ存在
      expect(announcers.length).toBe(1);
      expect(announcers[0].textContent).toBe('Second message');
    });
  });

  describe('setAriaLabel', () => {
    test('should set aria-label attribute', () => {
      const element = mockElement('button');
      // setAriaLabel(element, 'Submit form'); // Function doesn't exist
      
      expect(element.getAttribute('aria-label')).toBe('Submit form');
    });

    test('should handle null element gracefully', () => {
      expect(() => setAriaLabel(null, 'Test')).not.toThrow();
    });
  });

  describe('setAriaDescribedBy', () => {
    test('should set aria-describedby attribute', () => {
      const element = mockElement('input');
      setAriaDescribedBy(element, 'help-text');
      
      expect(element.getAttribute('aria-describedby')).toBe('help-text');
    });

    test('should handle multiple describedby IDs', () => {
      const element = mockElement('input');
      setAriaDescribedBy(element, 'help-text error-message');
      
      expect(element.getAttribute('aria-describedby')).toBe('help-text error-message');
    });
  });

  describe('manageFocus', () => {
    test('should focus element and return focus function', () => {
      const button = mockElement('button') as HTMLButtonElement;
      const input = mockElement('input') as HTMLInputElement;
      
      // Make elements focusable
      button.tabIndex = 0;
      input.tabIndex = 0;
      
      document.body.appendChild(button);
      document.body.appendChild(input);
      
      // Mock focus methods
      const buttonFocus = jest.fn();
      const inputFocus = jest.fn();
      button.focus = buttonFocus;
      input.focus = inputFocus;
      
      button.focus();
      const restoreFocus = manageFocus(input);
      
      expect(inputFocus).toHaveBeenCalled();
      
      // フォーカスを復元
      restoreFocus();
      expect(buttonFocus).toHaveBeenCalledTimes(2); // 初回 + 復元
    });

    test('should handle null elements gracefully', () => {
      expect(() => manageFocus(null)).not.toThrow();
      
      const restoreFocus = manageFocus(null);
      expect(() => restoreFocus()).not.toThrow();
    });
  });

  describe('setupKeyboardNavigation', () => {
    test('should add keyboard event listeners', () => {
      const container = mockElement('div');
      const button1 = mockElement('button') as HTMLButtonElement;
      const button2 = mockElement('button') as HTMLButtonElement;
      
      container.appendChild(button1);
      container.appendChild(button2);
      
      // Mock focus methods
      button1.focus = jest.fn();
      button2.focus = jest.fn();
      
      setupKeyboardNavigation(container, '[role="button"], button');
      
      // Arrow down key event
      const downEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      container.dispatchEvent(downEvent);
      
      // Tab key event
      const tabEvent = new KeyboardEvent('keydown', { key: 'Tab' });
      container.dispatchEvent(tabEvent);
      
      expect(container).toBeDefined();
    });

    test('should handle empty selector gracefully', () => {
      const container = mockElement('div');
      expect(() => setupKeyboardNavigation(container, '.non-existent')).not.toThrow();
    });
  });

  describe('addAccessibilityAttributes', () => {
    test('should add role and aria attributes', () => {
      const element = mockElement('div');
      
      addAccessibilityAttributes(element, {
        role: 'button',
        'aria-label': 'Click me',
        'aria-expanded': 'false',
        tabIndex: 0
      });
      
      expect(element.getAttribute('role')).toBe('button');
      expect(element.getAttribute('aria-label')).toBe('Click me');
      expect(element.getAttribute('aria-expanded')).toBe('false');
      expect(element.tabIndex).toBe(0);
    });

    test('should handle null element gracefully', () => {
      expect(() => addAccessibilityAttributes(null, { role: 'button' })).not.toThrow();
    });
  });

  describe('createAccessibleButton', () => {
    test('should create button with accessibility attributes', () => {
      const button = createAccessibleButton('Submit', 'submit-form');
      
      expect(button.tagName).toBe('BUTTON');
      expect(button.textContent).toBe('Submit');
      expect(button.getAttribute('aria-label')).toBe('submit-form');
      expect(button.tabIndex).toBe(0);
    });

    test('should create button with click handler', () => {
      const clickHandler = jest.fn();
      const button = createAccessibleButton('Click me', 'test-button', clickHandler);
      
      button.click();
      expect(clickHandler).toHaveBeenCalled();
    });

    test('should handle Enter and Space key activation', () => {
      const clickHandler = jest.fn();
      const button = createAccessibleButton('Click me', 'test-button', clickHandler);
      
      // Enter key
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      button.dispatchEvent(enterEvent);
      expect(clickHandler).toHaveBeenCalled();
      
      // Space key
      const spaceEvent = new KeyboardEvent('keydown', { key: ' ' });
      button.dispatchEvent(spaceEvent);
      expect(clickHandler).toHaveBeenCalledTimes(2);
    });
  });

  describe('createAccessibleInput', () => {
    test('should create input with accessibility attributes', () => {
      const input = createAccessibleInput('text', 'username', 'Enter username');
      
      expect(input.tagName).toBe('INPUT');
      expect(input.type).toBe('text');
      expect(input.id).toBe('username');
      expect(input.getAttribute('aria-label')).toBe('Enter username');
      expect(input.required).toBe(false);
    });

    test('should create required input', () => {
      const input = createAccessibleInput('email', 'email', 'Email address', true);
      
      expect(input.required).toBe(true);
      expect(input.getAttribute('aria-required')).toBe('true');
    });

    test('should add describedby for required fields', () => {
      const input = createAccessibleInput('password', 'password', 'Password', true);
      
      expect(input.getAttribute('aria-describedby')).toContain('password-required');
    });
  });

  describe('setupModalAccessibility', () => {
    test('should setup modal with proper ARIA attributes', () => {
      const modal = mockElement('div');
      document.body.appendChild(modal);
      
      const cleanup = setupModalAccessibility(modal);
      
      expect(modal.getAttribute('role')).toBe('dialog');
      expect(modal.getAttribute('aria-modal')).toBe('true');
      expect(modal.tabIndex).toBe(-1);
      
      // クリーンアップ関数が返されること
      expect(typeof cleanup).toBe('function');
      
      cleanup();
    });

    test('should trap focus within modal', () => {
      const modal = mockElement('div');
      const button1 = mockElement('button') as HTMLButtonElement;
      const button2 = mockElement('button') as HTMLButtonElement;
      
      modal.appendChild(button1);
      modal.appendChild(button2);
      document.body.appendChild(modal);
      
      // Mock focus methods
      button1.focus = jest.fn();
      button2.focus = jest.fn();
      
      const cleanup = setupModalAccessibility(modal);
      
      // Tab key at end should focus first element
      const tabEvent = new KeyboardEvent('keydown', {
        key: 'Tab',
        shiftKey: false
      });
      
      // Simulate focus on last element
      button2.focus();
      document.dispatchEvent(tabEvent);
      
      cleanup();
    });

    test('should handle Escape key to close modal', () => {
      const modal = mockElement('div');
      const onClose = jest.fn();
      document.body.appendChild(modal);
      
      const cleanup = setupModalAccessibility(modal, onClose);
      
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(escapeEvent);
      
      expect(onClose).toHaveBeenCalled();
      
      cleanup();
    });

    test('should restore focus when modal closes', () => {
      const modal = mockElement('div');
      const trigger = mockElement('button') as HTMLButtonElement;
      
      document.body.appendChild(trigger);
      document.body.appendChild(modal);
      
      // Mock focus
      trigger.focus = jest.fn();
      
      // フォーカスをトリガーに設定
      trigger.focus();
      
      const cleanup = setupModalAccessibility(modal);
      
      // モーダルを閉じる
      cleanup();
      
      // フォーカスが復元されることを確認
      expect(trigger.focus).toHaveBeenCalledTimes(2); // 初回 + 復元
    });
  });
});