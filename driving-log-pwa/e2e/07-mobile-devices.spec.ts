import { test, expect, devices } from '@playwright/test';

/**
 * E2E Test: モバイルデバイステスト
 * 
 * 各種モバイルデバイスでの動作確認とタッチ操作テスト
 */

// Mobile device configurations
const mobileDevices = [
  { name: 'iPhone 12', device: devices['iPhone 12'] },
  { name: 'iPhone 12 Pro', device: devices['iPhone 12 Pro'] },
  { name: 'iPhone SE', device: devices['iPhone SE'] },
  { name: 'Pixel 5', device: devices['Pixel 5'] },
  { name: 'Samsung Galaxy S21', device: devices['Galaxy S21'] },
  { name: 'Samsung Galaxy Note 20', device: devices['Galaxy Note 20'] },
  { name: 'iPad Air', device: devices['iPad Air'] },
  { name: 'iPad Mini', device: devices['iPad Mini'] }
];

test.describe('Mobile Device Compatibility', () => {
  
  // Test core functionality on different mobile devices
  mobileDevices.forEach(deviceConfig => {
    test.describe(`${deviceConfig.name}`, () => {
      test.use({ ...deviceConfig.device });

      test('should load and display correctly on mobile', async ({ page }) => {
        await page.goto('/');
        
        // Check page loads
        await expect(page).toHaveTitle(/運転日報|Driving Log/);
        
        // Check viewport meta tag is working
        const viewport = await page.evaluate(() => {
          return {
            width: window.innerWidth,
            height: window.innerHeight,
            devicePixelRatio: window.devicePixelRatio
          };
        });
        
        expect(viewport.width).toBeGreaterThan(300);
        expect(viewport.height).toBeGreaterThan(400);
        
        // Check no horizontal scroll
        const scrollWidth = await page.evaluate(() => {
          return {
            scrollWidth: document.body.scrollWidth,
            clientWidth: document.body.clientWidth
          };
        });
        
        expect(scrollWidth.scrollWidth).toBeLessThanOrEqual(scrollWidth.clientWidth + 10);
      });

      test('should handle touch interactions', async ({ page }) => {
        await page.goto('/');
        
        // Test tap interaction
        const firstButton = page.locator('button').first();
        if (await firstButton.count() > 0) {
          await firstButton.tap();
          
          // Should not produce errors
          const hasErrors = await page.evaluate(() => {
            return window.console?.error?.length > 0;
          });
          
          expect(hasErrors).toBeFalsy();
        }
        
        // Test swipe gesture if applicable
        const scrollContainer = page.locator('body');
        const initialScrollTop = await page.evaluate(() => window.scrollY);
        
        // Perform swipe down
        await scrollContainer.swipe({ 
          direction: 'down', 
          distance: 200,
          speed: 'fast' 
        });
        
        const newScrollTop = await page.evaluate(() => window.scrollY);
        // Scroll position should change or stay same (if at top)
        expect(newScrollTop).toBeGreaterThanOrEqual(initialScrollTop);
      });

      test('should display mobile-optimized layout', async ({ page }) => {
        await page.goto('/');
        
        // Check for mobile-specific styles
        const layoutInfo = await page.evaluate(() => {
          const body = document.body;
          const computedStyle = window.getComputedStyle(body);
          
          return {
            fontSize: computedStyle.fontSize,
            padding: computedStyle.padding,
            margin: computedStyle.margin,
            hasTouch: 'ontouchstart' in window
          };
        });
        
        expect(layoutInfo.hasTouch).toBe(true);
        
        // Check for reasonable touch targets
        const buttons = await page.locator('button').all();
        for (const button of buttons) {
          const bbox = await button.boundingBox();
          if (bbox) {
            // Touch targets should be at least 44px (Apple guideline) or 48dp (Android guideline)
            expect(Math.min(bbox.width, bbox.height)).toBeGreaterThanOrEqual(40);
          }
        }
      });

      test('should handle orientation changes', async ({ page }) => {
        await page.goto('/');
        
        // Test portrait mode (default)
        let orientation = await page.evaluate(() => {
          return {
            width: window.innerWidth,
            height: window.innerHeight,
            orientation: window.orientation || 0
          };
        });
        
        expect(orientation.height).toBeGreaterThan(orientation.width);
        
        // Simulate landscape mode by changing viewport
        if (deviceConfig.name.includes('iPhone') || deviceConfig.name.includes('Pixel')) {
          await page.setViewportSize({ 
            width: orientation.height, 
            height: orientation.width 
          });
          
          await page.waitForTimeout(500);
          
          // Check layout adjusts
          const newOrientation = await page.evaluate(() => {
            return {
              width: window.innerWidth,
              height: window.innerHeight
            };
          });
          
          expect(newOrientation.width).toBeGreaterThan(newOrientation.height);
          
          // Check content is still accessible
          const body = page.locator('body');
          await expect(body).toBeVisible();
        }
      });
    });
  });

  // PWA specific mobile tests
  test.describe('Mobile PWA Features', () => {
    test.use(devices['iPhone 12']);

    test('should support PWA installation on mobile', async ({ page, browserName }) => {
      test.skip(browserName !== 'chromium', 'PWA installation primarily tested on Chromium');
      
      await page.goto('/');
      
      const pwaFeatures = await page.evaluate(() => {
        return {
          manifest: !!document.querySelector('link[rel="manifest"]'),
          serviceWorker: 'serviceWorker' in navigator,
          standalone: window.matchMedia('(display-mode: standalone)').matches,
          appleWebApp: !!document.querySelector('meta[name="apple-mobile-web-app-capable"]')
        };
      });
      
      expect(pwaFeatures.manifest).toBe(true);
      expect(pwaFeatures.appleWebApp).toBe(true);
    });

    test('should handle iOS-specific PWA features', async ({ page }) => {
      await page.goto('/');
      
      const iosFeatures = await page.evaluate(() => {
        const metas = document.querySelectorAll('meta');
        const links = document.querySelectorAll('link');
        
        return {
          appleCapable: !!document.querySelector('meta[name="apple-mobile-web-app-capable"]'),
          appleStatusBar: !!document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]'),
          appleTitle: !!document.querySelector('meta[name="apple-mobile-web-app-title"]'),
          appleTouchIcons: Array.from(links).filter(link => 
            link.rel.includes('apple-touch-icon')
          ).length,
          splashScreens: Array.from(links).filter(link => 
            link.rel === 'apple-touch-startup-image'
          ).length
        };
      });
      
      expect(iosFeatures.appleCapable).toBe(true);
      expect(iosFeatures.appleStatusBar).toBe(true);
      expect(iosFeatures.appleTouchIcons).toBeGreaterThan(0);
    });
  });

  // Touch and gesture specific tests
  test.describe('Touch and Gesture Interactions', () => {
    test.use(devices['Pixel 5']);

    test('should handle form interactions on mobile', async ({ page }) => {
      await page.goto('/');
      
      // Look for form
      const newLogButton = page.locator('button:has-text("新規記録"), [data-testid="new-log-button"]');
      if (await newLogButton.count() > 0) {
        await newLogButton.tap();
        
        // Test text input on mobile
        const textInput = page.locator('input[type="text"], input[name="purpose"]').first();
        if (await textInput.count() > 0) {
          await textInput.tap();
          await textInput.fill('モバイルテスト');
          
          const value = await textInput.inputValue();
          expect(value).toBe('モバイルテスト');
          
          // Test virtual keyboard doesn't break layout
          const inputBox = await textInput.boundingBox();
          expect(inputBox).toBeTruthy();
          expect(inputBox!.y).toBeGreaterThan(0);
        }
      }
    });

    test('should handle scroll interactions', async ({ page }) => {
      await page.goto('/');
      
      // Add some content to make scrolling possible
      await page.evaluate(() => {
        for (let i = 0; i < 20; i++) {
          const div = document.createElement('div');
          div.textContent = `Test content ${i}`;
          div.style.height = '50px';
          div.style.margin = '10px';
          div.style.background = '#f0f0f0';
          document.body.appendChild(div);
        }
      });
      
      // Test scroll
      const initialScrollY = await page.evaluate(() => window.scrollY);
      
      // Scroll down
      await page.mouse.wheel(0, 500);
      await page.waitForTimeout(300);
      
      const newScrollY = await page.evaluate(() => window.scrollY);
      expect(newScrollY).toBeGreaterThan(initialScrollY);
      
      // Test touch scroll
      await page.touchscreen.tap(200, 300);
      await page.touchscreen.tap(200, 100);
    });

    test('should handle pinch-to-zoom appropriately', async ({ page }) => {
      await page.goto('/');
      
      // Check if pinch-to-zoom is disabled (good for PWAs)
      const zoomDisabled = await page.evaluate(() => {
        const viewport = document.querySelector('meta[name="viewport"]');
        if (viewport) {
          const content = viewport.getAttribute('content') || '';
          return content.includes('user-scalable=no') || 
                 content.includes('maximum-scale=1') ||
                 content.includes('minimum-scale=1');
        }
        return false;
      });
      
      // For PWAs, zoom should typically be controlled
      expect(zoomDisabled).toBe(true);
    });
  });

  // Mobile performance tests
  test.describe('Mobile Performance', () => {
    test.use(devices['iPhone SE']); // Test on lower-end device

    test('should load quickly on mobile', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      const loadTime = Date.now() - startTime;
      
      // Mobile should load within 5 seconds (slower than desktop)
      expect(loadTime).toBeLessThan(5000);
    });

    test('should handle touch events efficiently', async ({ page }) => {
      await page.goto('/');
      
      const touchPerformance = await page.evaluate(async () => {
        const measurements: number[] = [];
        
        // Create test area
        const testArea = document.createElement('div');
        testArea.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: 100px;
          height: 100px;
          background: red;
          z-index: 9999;
        `;
        document.body.appendChild(testArea);
        
        // Test touch event performance
        for (let i = 0; i < 10; i++) {
          const startTime = performance.now();
          
          const touchEvent = new TouchEvent('touchstart', {
            touches: [{
              identifier: 0,
              target: testArea,
              clientX: 50,
              clientY: 50,
              force: 1,
              radiusX: 10,
              radiusY: 10,
              rotationAngle: 0
            } as any]
          });
          
          testArea.dispatchEvent(touchEvent);
          
          const endTime = performance.now();
          measurements.push(endTime - startTime);
        }
        
        document.body.removeChild(testArea);
        return measurements;
      });
      
      const avgTime = touchPerformance.reduce((a, b) => a + b, 0) / touchPerformance.length;
      expect(avgTime).toBeLessThan(10); // Touch events should be fast
    });
  });

  // Mobile-specific feature tests
  test.describe('Mobile-Specific Features', () => {
    test.use(devices['Galaxy S21']);

    test('should handle device orientation API', async ({ page }) => {
      await page.goto('/');
      
      const orientationSupport = await page.evaluate(() => {
        return {
          screen: 'screen' in window && 'orientation' in screen,
          orientation: 'orientation' in window,
          orientationAngle: typeof window.orientation !== 'undefined'
        };
      });
      
      // At least one orientation API should be supported
      expect(
        orientationSupport.screen || 
        orientationSupport.orientation || 
        orientationSupport.orientationAngle
      ).toBe(true);
    });

    test('should handle vibration API if supported', async ({ page }) => {
      await page.goto('/');
      
      const vibrationSupport = await page.evaluate(() => {
        return {
          supported: 'vibrate' in navigator,
          canVibrate: typeof navigator.vibrate === 'function'
        };
      });
      
      if (vibrationSupport.supported) {
        const vibrateResult = await page.evaluate(() => {
          try {
            return navigator.vibrate(100);
          } catch (e) {
            return false;
          }
        });
        
        expect(typeof vibrateResult).toBe('boolean');
      }
    });

    test('should handle network information API', async ({ page }) => {
      await page.goto('/');
      
      const networkInfo = await page.evaluate(() => {
        const connection = (navigator as any).connection || 
                          (navigator as any).mozConnection || 
                          (navigator as any).webkitConnection;
        
        if (connection) {
          return {
            supported: true,
            effectiveType: connection.effectiveType,
            downlink: connection.downlink,
            rtt: connection.rtt
          };
        }
        
        return { supported: false };
      });
      
      if (networkInfo.supported) {
        expect(networkInfo.effectiveType).toBeDefined();
        expect(typeof networkInfo.downlink).toBe('number');
      }
    });
  });

  // Accessibility on mobile
  test.describe('Mobile Accessibility', () => {
    test.use(devices['iPhone 12']);

    test('should support screen reader navigation', async ({ page }) => {
      await page.goto('/');
      
      const accessibilityFeatures = await page.evaluate(() => {
        const elements = document.querySelectorAll('*');
        let accessibleElements = 0;
        let totalInteractiveElements = 0;
        
        elements.forEach(element => {
          if (element.tagName === 'BUTTON' || 
              element.tagName === 'A' || 
              element.tagName === 'INPUT') {
            totalInteractiveElements++;
            
            if (element.getAttribute('aria-label') || 
                element.getAttribute('aria-labelledby') ||
                element.textContent?.trim()) {
              accessibleElements++;
            }
          }
        });
        
        return {
          totalInteractiveElements,
          accessibleElements,
          ratio: totalInteractiveElements > 0 ? accessibleElements / totalInteractiveElements : 1
        };
      });
      
      // Most interactive elements should be accessible
      expect(accessibilityFeatures.ratio).toBeGreaterThan(0.8);
    });

    test('should have appropriate focus management', async ({ page }) => {
      await page.goto('/');
      
      // Test tab navigation
      await page.keyboard.press('Tab');
      
      const focusInfo = await page.evaluate(() => {
        const activeElement = document.activeElement;
        if (activeElement) {
          const rect = activeElement.getBoundingClientRect();
          return {
            hasFocus: true,
            tagName: activeElement.tagName,
            visible: rect.width > 0 && rect.height > 0,
            focusable: activeElement.tabIndex >= 0 || 
                      ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'].includes(activeElement.tagName)
          };
        }
        return { hasFocus: false };
      });
      
      expect(focusInfo.hasFocus).toBe(true);
      if (focusInfo.hasFocus) {
        expect(focusInfo.visible).toBe(true);
        expect(focusInfo.focusable).toBe(true);
      }
    });
  });
});