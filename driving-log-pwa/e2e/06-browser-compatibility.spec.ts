import { test, expect, devices } from '@playwright/test';

/**
 * E2E Test: ブラウザ互換性テスト
 * 
 * 主要ブラウザでの動作確認とPWA機能の互換性確認
 */

// Test configurations for different browsers
const browserConfigs = [
  { name: 'Chromium', device: devices['Desktop Chrome'] },
  { name: 'Firefox', device: devices['Desktop Firefox'] },
  { name: 'WebKit', device: devices['Desktop Safari'] },
  { name: 'Edge', device: devices['Desktop Edge'] }
];

test.describe('Browser Compatibility', () => {
  
  // Test core functionality across browsers
  browserConfigs.forEach(config => {
    test.describe(`${config.name} Browser`, () => {
      test.use({ ...config.device });

      test('should load application correctly', async ({ page, browserName }) => {
        await page.goto('/');
        
        // Check page loads
        await expect(page).toHaveTitle(/運転日報|Driving Log/);
        
        // Check for critical elements
        const body = page.locator('body');
        await expect(body).toBeVisible();
        
        // Check for JavaScript execution
        const jsWorking = await page.evaluate(() => {
          return typeof document !== 'undefined' && document.readyState === 'complete';
        });
        expect(jsWorking).toBe(true);
      });

      test('should support required web APIs', async ({ page, browserName }) => {
        const apiSupport = await page.evaluate(() => {
          return {
            localStorage: typeof Storage !== 'undefined' && 'localStorage' in window,
            sessionStorage: typeof Storage !== 'undefined' && 'sessionStorage' in window,
            indexedDB: 'indexedDB' in window,
            serviceWorker: 'serviceWorker' in navigator,
            geolocation: 'geolocation' in navigator,
            fetch: 'fetch' in window,
            Promise: 'Promise' in window,
            crypto: 'crypto' in window || 'msCrypto' in window
          };
        });

        // Core APIs should be supported
        expect(apiSupport.localStorage).toBe(true);
        expect(apiSupport.fetch).toBe(true);
        expect(apiSupport.Promise).toBe(true);

        // PWA APIs (may not be supported in all browsers)
        if (browserName === 'chromium') {
          expect(apiSupport.serviceWorker).toBe(true);
        }
        
        if (browserName !== 'webkit') {
          expect(apiSupport.indexedDB).toBe(true);
        }
      });

      test('should handle CSS features correctly', async ({ page, browserName }) => {
        await page.goto('/');
        
        const cssSupport = await page.evaluate(() => {
          const testElement = document.createElement('div');
          document.body.appendChild(testElement);
          
          const support = {
            flexbox: 'flex' in testElement.style,
            grid: 'grid' in testElement.style,
            customProperties: CSS.supports && CSS.supports('--test: red'),
            transforms: 'transform' in testElement.style,
            transitions: 'transition' in testElement.style
          };
          
          document.body.removeChild(testElement);
          return support;
        });

        // Modern CSS features should be supported
        expect(cssSupport.flexbox).toBe(true);
        expect(cssSupport.transforms).toBe(true);
        expect(cssSupport.transitions).toBe(true);
        
        // Grid might not be supported in older browsers
        if (browserName !== 'webkit') {
          expect(cssSupport.grid).toBe(true);
        }
      });

      test('should render responsive design correctly', async ({ page }) => {
        await page.goto('/');
        
        // Test different viewport sizes
        const viewports = [
          { width: 320, height: 568, name: 'Mobile Portrait' },
          { width: 568, height: 320, name: 'Mobile Landscape' },
          { width: 768, height: 1024, name: 'Tablet Portrait' },
          { width: 1024, height: 768, name: 'Tablet Landscape' },
          { width: 1920, height: 1080, name: 'Desktop' }
        ];

        for (const viewport of viewports) {
          await page.setViewportSize(viewport);
          await page.waitForTimeout(500);
          
          // Check that content is visible and accessible
          const body = page.locator('body');
          await expect(body).toBeVisible();
          
          // Check that no content overflows horizontally
          const scrollWidth = await page.evaluate(() => {
            return {
              scrollWidth: document.body.scrollWidth,
              clientWidth: document.body.clientWidth
            };
          });
          
          // Allow for minor differences
          expect(scrollWidth.scrollWidth).toBeLessThanOrEqual(scrollWidth.clientWidth + 20);
        }
      });
    });
  });

  // PWA specific tests
  test.describe('PWA Compatibility', () => {
    test('should support PWA features in Chromium', async ({ page, browserName }) => {
      test.skip(browserName !== 'chromium', 'PWA features primarily supported in Chromium-based browsers');
      
      await page.goto('/');
      
      const pwaSupport = await page.evaluate(async () => {
        const support = {
          manifest: !!document.querySelector('link[rel="manifest"]'),
          serviceWorker: 'serviceWorker' in navigator,
          beforeInstallPrompt: false,
          notification: 'Notification' in window,
          pushManager: 'PushManager' in window
        };
        
        // Check for install prompt capability
        window.addEventListener('beforeinstallprompt', () => {
          support.beforeInstallPrompt = true;
        });
        
        return support;
      });
      
      expect(pwaSupport.manifest).toBe(true);
      expect(pwaSupport.serviceWorker).toBe(true);
      expect(pwaSupport.notification).toBe(true);
    });

    test('should handle service worker registration across browsers', async ({ page, browserName }) => {
      await page.goto('/');
      
      const swSupport = await page.evaluate(async () => {
        if (!('serviceWorker' in navigator)) {
          return { supported: false };
        }
        
        try {
          const registration = await navigator.serviceWorker.ready;
          return {
            supported: true,
            registered: !!registration,
            scope: registration.scope
          };
        } catch (error) {
          return {
            supported: true,
            registered: false,
            error: error.message
          };
        }
      });
      
      if (browserName === 'webkit') {
        // Safari has limited service worker support
        expect(swSupport.supported).toBe(false);
      } else {
        expect(swSupport.supported).toBe(true);
        if (swSupport.supported) {
          expect(swSupport.registered).toBe(true);
        }
      }
    });
  });

  // Form and input compatibility
  test.describe('Form Compatibility', () => {
    test('should handle form inputs across browsers', async ({ page, browserName }) => {
      await page.goto('/');
      
      // Look for form elements
      const newLogButton = page.locator('button:has-text("新規記録"), [data-testid="new-log-button"]');
      if (await newLogButton.count() > 0) {
        await newLogButton.click();
        
        // Test different input types
        const inputs = await page.evaluate(() => {
          const inputElements = document.querySelectorAll('input');
          const results: any[] = [];
          
          inputElements.forEach(input => {
            results.push({
              type: input.type,
              required: input.required,
              placeholder: input.placeholder,
              validity: input.validity.valid
            });
          });
          
          return results;
        });
        
        expect(inputs.length).toBeGreaterThan(0);
        
        // Check HTML5 input validation
        const textInput = page.locator('input[type="text"], input[name="purpose"]').first();
        if (await textInput.count() > 0) {
          await textInput.fill('Test input');
          const value = await textInput.inputValue();
          expect(value).toBe('Test input');
        }
      }
    });

    test('should handle date inputs correctly', async ({ page, browserName }) => {
      await page.goto('/');
      
      const dateSupport = await page.evaluate(() => {
        const input = document.createElement('input');
        input.type = 'date';
        return input.type === 'date';
      });
      
      // Most modern browsers support date input
      if (browserName !== 'webkit') {
        expect(dateSupport).toBe(true);
      }
    });
  });

  // Storage compatibility
  test.describe('Storage Compatibility', () => {
    test('should handle localStorage across browsers', async ({ page }) => {
      await page.goto('/');
      
      const storageTest = await page.evaluate(() => {
        try {
          const testKey = 'browser_compatibility_test';
          const testValue = { test: true, timestamp: Date.now() };
          
          // Test localStorage
          localStorage.setItem(testKey, JSON.stringify(testValue));
          const retrieved = localStorage.getItem(testKey);
          const parsed = retrieved ? JSON.parse(retrieved) : null;
          
          // Cleanup
          localStorage.removeItem(testKey);
          
          return {
            success: parsed && parsed.test === true,
            error: null
          };
        } catch (error) {
          return {
            success: false,
            error: error.message
          };
        }
      });
      
      expect(storageTest.success).toBe(true);
    });

    test('should handle IndexedDB where supported', async ({ page, browserName }) => {
      await page.goto('/');
      
      const indexedDBTest = await page.evaluate(async () => {
        if (!('indexedDB' in window)) {
          return { supported: false };
        }
        
        try {
          const request = indexedDB.open('compatibility_test', 1);
          
          return new Promise((resolve) => {
            request.onsuccess = () => {
              const db = request.result;
              db.close();
              indexedDB.deleteDatabase('compatibility_test');
              resolve({ supported: true, success: true });
            };
            
            request.onerror = () => {
              resolve({ supported: true, success: false, error: request.error });
            };
            
            request.onupgradeneeded = () => {
              const db = request.result;
              if (!db.objectStoreNames.contains('test')) {
                db.createObjectStore('test', { keyPath: 'id' });
              }
            };
            
            setTimeout(() => {
              resolve({ supported: true, success: false, error: 'timeout' });
            }, 5000);
          });
        } catch (error) {
          return { supported: true, success: false, error: error.message };
        }
      });
      
      if (browserName === 'webkit') {
        // Safari has IndexedDB but with limitations
        expect(indexedDBTest.supported).toBe(true);
      } else {
        expect(indexedDBTest.supported).toBe(true);
        expect(indexedDBTest.success).toBe(true);
      }
    });
  });

  // Geolocation compatibility
  test.describe('Geolocation Compatibility', () => {
    test('should handle geolocation API across browsers', async ({ page, context, browserName }) => {
      await context.grantPermissions(['geolocation']);
      await context.setGeolocation({ latitude: 35.6812, longitude: 139.7671 });
      
      await page.goto('/');
      
      const geoTest = await page.evaluate(async () => {
        if (!('geolocation' in navigator)) {
          return { supported: false };
        }
        
        return new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              resolve({
                supported: true,
                success: true,
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy
              });
            },
            (error) => {
              resolve({
                supported: true,
                success: false,
                error: error.message
              });
            },
            { timeout: 5000 }
          );
        });
      });
      
      expect(geoTest.supported).toBe(true);
      expect(geoTest.success).toBe(true);
      if (geoTest.success) {
        expect(geoTest.latitude).toBeCloseTo(35.6812, 1);
        expect(geoTest.longitude).toBeCloseTo(139.7671, 1);
      }
    });
  });

  // Event handling compatibility
  test.describe('Event Handling Compatibility', () => {
    test('should handle touch events on touch devices', async ({ page, browserName }) => {
      await page.goto('/');
      
      const touchSupport = await page.evaluate(() => {
        return {
          touchEvents: 'ontouchstart' in window || 'TouchEvent' in window,
          pointerEvents: 'PointerEvent' in window,
          gestureEvents: 'GestureEvent' in window
        };
      });
      
      // Touch events should be supported on mobile browsers
      if (browserName === 'webkit') {
        expect(touchSupport.touchEvents).toBe(true);
      }
      
      // Test basic touch simulation
      const touchTestButton = page.locator('button').first();
      if (await touchTestButton.count() > 0) {
        await touchTestButton.tap();
        // Should not throw errors
      }
    });

    test('should handle keyboard navigation', async ({ page }) => {
      await page.goto('/');
      
      // Test Tab navigation
      await page.keyboard.press('Tab');
      
      const focusedElement = await page.evaluate(() => {
        return {
          hasFocus: !!document.activeElement,
          tagName: document.activeElement?.tagName,
          type: (document.activeElement as HTMLInputElement)?.type
        };
      });
      
      expect(focusedElement.hasFocus).toBe(true);
    });
  });

  // Network and offline compatibility
  test.describe('Network Compatibility', () => {
    test('should handle offline mode across browsers', async ({ page, context, browserName }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Go offline
      await context.setOffline(true);
      
      // Test offline functionality
      const offlineTest = await page.evaluate(() => {
        return {
          navigator: navigator.onLine,
          cache: 'caches' in window,
          serviceWorker: 'serviceWorker' in navigator
        };
      });
      
      expect(offlineTest.navigator).toBe(false);
      
      // Try to perform offline operations
      const offlineOperation = await page.evaluate(() => {
        try {
          const data = { test: 'offline', timestamp: Date.now() };
          localStorage.setItem('offline_test', JSON.stringify(data));
          return { success: true };
        } catch (error) {
          return { success: false, error: error.message };
        }
      });
      
      expect(offlineOperation.success).toBe(true);
      
      // Go back online
      await context.setOffline(false);
    });
  });
});