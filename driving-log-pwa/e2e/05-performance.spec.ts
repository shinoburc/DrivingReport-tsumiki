import { test, expect } from '@playwright/test';

/**
 * E2E Test: パフォーマンステスト
 * 
 * アプリケーションのパフォーマンス要件を確認
 */

test.describe('Performance Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load initial page within performance budget', async ({ page }) => {
    const startTime = Date.now();
    
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Performance requirement: Initial load should be under 3 seconds
    expect(loadTime).toBeLessThan(3000);
    
    // Check for critical web vitals
    const webVitals = await page.evaluate(() => {
      return new Promise((resolve) => {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const vitals: Record<string, number> = {};
          
          entries.forEach((entry) => {
            if (entry.name === 'first-contentful-paint') {
              vitals.FCP = entry.startTime;
            }
            if (entry.name === 'largest-contentful-paint') {
              vitals.LCP = entry.startTime;
            }
          });
          
          // Also get First Input Delay if available
          if ('PerformanceEventTiming' in window) {
            const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
            vitals.TTI = navigation.loadEventEnd - navigation.navigationStart;
          }
          
          resolve(vitals);
        });
        
        observer.observe({ entryTypes: ['paint', 'largest-contentful-paint'] });
        
        // Fallback timeout
        setTimeout(() => {
          observer.disconnect();
          resolve({});
        }, 5000);
      });
    });
    
    console.log('Web Vitals:', webVitals);
    
    // Performance assertions
    if (webVitals.FCP) {
      expect(webVitals.FCP).toBeLessThan(2500); // FCP under 2.5s
    }
    if (webVitals.LCP) {
      expect(webVitals.LCP).toBeLessThan(4000); // LCP under 4s
    }
  });

  test('should handle large dataset efficiently', async ({ page }) => {
    // Create multiple driving logs to test performance with data
    await createLargeDataset(page, 50);
    
    // Navigate to history page
    const historyLink = page.locator('a:has-text("履歴"), [data-testid="history-link"]');
    if (await historyLink.count() > 0) {
      const startTime = Date.now();
      
      await historyLink.click();
      await page.waitForLoadState('networkidle');
      
      const loadTime = Date.now() - startTime;
      
      // History page should load within 2 seconds even with data
      expect(loadTime).toBeLessThan(2000);
      
      // Check that all data is displayed
      const logItems = page.locator('[data-testid="log-item"], .log-entry, tr');
      const itemCount = await logItems.count();
      expect(itemCount).toBeGreaterThan(10); // Should show significant amount of data
    }
  });

  test('should perform smooth scrolling with large lists', async ({ page }) => {
    await createLargeDataset(page, 100);
    
    // Navigate to a page with scrollable content
    const historyLink = page.locator('a:has-text("履歴"), [data-testid="history-link"]');
    if (await historyLink.count() > 0) {
      await historyLink.click();
      await page.waitForLoadState('networkidle');
      
      // Measure scroll performance
      const scrollPerformance = await page.evaluate(async () => {
        const container = document.documentElement;
        const measurements: number[] = [];
        
        // Perform multiple scroll operations
        for (let i = 0; i < 10; i++) {
          const startTime = performance.now();
          
          container.scrollTop = i * 200;
          
          // Wait for scroll to complete
          await new Promise(resolve => setTimeout(resolve, 100));
          
          const endTime = performance.now();
          measurements.push(endTime - startTime);
        }
        
        return measurements;
      });
      
      // Average scroll time should be reasonable
      const avgScrollTime = scrollPerformance.reduce((a, b) => a + b, 0) / scrollPerformance.length;
      expect(avgScrollTime).toBeLessThan(50); // Under 50ms per scroll
    }
  });

  test('should handle GPS operations efficiently', async ({ page, context }) => {
    // Grant geolocation permission
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 35.6812, longitude: 139.7671 });
    
    // Test GPS performance
    const gpsPerformance = await page.evaluate(async () => {
      const measurements: number[] = [];
      
      for (let i = 0; i < 5; i++) {
        const startTime = performance.now();
        
        await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            () => resolve(undefined),
            () => reject(),
            { timeout: 5000, enableHighAccuracy: true }
          );
        });
        
        const endTime = performance.now();
        measurements.push(endTime - startTime);
      }
      
      return measurements;
    });
    
    // GPS operations should complete quickly
    const avgGpsTime = gpsPerformance.reduce((a, b) => a + b, 0) / gpsPerformance.length;
    expect(avgGpsTime).toBeLessThan(2000); // Under 2 seconds
  });

  test('should efficiently save and retrieve data', async ({ page }) => {
    // Test storage performance
    const storagePerformance = await page.evaluate(async () => {
      const measurements = {
        save: [] as number[],
        retrieve: [] as number[]
      };
      
      // Test save performance
      for (let i = 0; i < 20; i++) {
        const data = {
          id: `test-${i}`,
          purpose: `Test Purpose ${i}`,
          vehicle: 'Test Vehicle',
          startTime: new Date().toISOString(),
          status: 'COMPLETED'
        };
        
        const startTime = performance.now();
        
        // Save to localStorage (simulate save operation)
        localStorage.setItem(`driving_log_${i}`, JSON.stringify(data));
        
        const endTime = performance.now();
        measurements.save.push(endTime - startTime);
      }
      
      // Test retrieve performance
      for (let i = 0; i < 20; i++) {
        const startTime = performance.now();
        
        const data = localStorage.getItem(`driving_log_${i}`);
        if (data) {
          JSON.parse(data);
        }
        
        const endTime = performance.now();
        measurements.retrieve.push(endTime - startTime);
      }
      
      // Cleanup
      for (let i = 0; i < 20; i++) {
        localStorage.removeItem(`driving_log_${i}`);
      }
      
      return measurements;
    });
    
    // Storage operations should be fast
    const avgSaveTime = storagePerformance.save.reduce((a, b) => a + b, 0) / storagePerformance.save.length;
    const avgRetrieveTime = storagePerformance.retrieve.reduce((a, b) => a + b, 0) / storagePerformance.retrieve.length;
    
    expect(avgSaveTime).toBeLessThan(10); // Under 10ms to save
    expect(avgRetrieveTime).toBeLessThan(5); // Under 5ms to retrieve
  });

  test('should handle concurrent operations', async ({ page }) => {
    // Test concurrent data operations
    const concurrentPerformance = await page.evaluate(async () => {
      const operations = [];
      
      // Create multiple concurrent operations
      for (let i = 0; i < 10; i++) {
        operations.push(
          new Promise((resolve) => {
            const startTime = performance.now();
            
            // Simulate concurrent save operations
            setTimeout(() => {
              const data = {
                id: `concurrent-${i}`,
                purpose: `Concurrent Test ${i}`,
                timestamp: Date.now()
              };
              
              localStorage.setItem(`concurrent_${i}`, JSON.stringify(data));
              
              const endTime = performance.now();
              resolve(endTime - startTime);
            }, Math.random() * 100);
          })
        );
      }
      
      const results = await Promise.all(operations);
      
      // Cleanup
      for (let i = 0; i < 10; i++) {
        localStorage.removeItem(`concurrent_${i}`);
      }
      
      return results;
    });
    
    // All operations should complete quickly
    concurrentPerformance.forEach(time => {
      expect(time).toBeLessThan(200); // Under 200ms
    });
  });

  test('should handle memory efficiently during usage', async ({ page }) => {
    // Monitor memory usage during operations
    const memoryUsage = await page.evaluate(async () => {
      const measurements: number[] = [];
      
      // Get initial memory if available
      if ('memory' in performance) {
        measurements.push((performance as any).memory.usedJSHeapSize);
      }
      
      // Perform memory-intensive operations
      const largeData = [];
      for (let i = 0; i < 1000; i++) {
        largeData.push({
          id: `memory-test-${i}`,
          purpose: `Memory Test ${i}`,
          data: new Array(100).fill('x').join(''),
          timestamp: Date.now()
        });
      }
      
      if ('memory' in performance) {
        measurements.push((performance as any).memory.usedJSHeapSize);
      }
      
      // Clear data
      largeData.length = 0;
      
      // Force garbage collection if available
      if ('gc' in window) {
        (window as any).gc();
      }
      
      // Wait a bit for cleanup
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if ('memory' in performance) {
        measurements.push((performance as any).memory.usedJSHeapSize);
      }
      
      return measurements;
    });
    
    if (memoryUsage.length >= 2) {
      const memoryIncrease = memoryUsage[1] - memoryUsage[0];
      
      // Memory increase should be reasonable
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Under 50MB
      
      if (memoryUsage.length >= 3) {
        // Memory should be cleaned up somewhat
        expect(memoryUsage[2]).toBeLessThan(memoryUsage[1]);
      }
    }
  });

  test('should render UI updates smoothly', async ({ page }) => {
    // Test UI animation performance
    const animationPerformance = await page.evaluate(async () => {
      const measurements: number[] = [];
      
      // Create a test element for animation
      const testElement = document.createElement('div');
      testElement.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100px;
        height: 100px;
        background: red;
        transition: transform 0.3s ease;
      `;
      document.body.appendChild(testElement);
      
      // Measure multiple animations
      for (let i = 0; i < 5; i++) {
        const startTime = performance.now();
        
        // Trigger animation
        testElement.style.transform = `translateX(${i * 100}px)`;
        
        // Wait for animation to complete
        await new Promise(resolve => setTimeout(resolve, 350));
        
        const endTime = performance.now();
        measurements.push(endTime - startTime);
      }
      
      // Cleanup
      document.body.removeChild(testElement);
      
      return measurements;
    });
    
    // Animation should complete within expected time
    animationPerformance.forEach(time => {
      expect(time).toBeLessThan(400); // Under 400ms (including 350ms wait)
      expect(time).toBeGreaterThan(300); // But at least 300ms
    });
  });

  test('should handle offline/online transitions efficiently', async ({ page, context }) => {
    // Test offline performance
    const offlinePerformance = await page.evaluate(async () => {
      const startTime = performance.now();
      
      // Simulate offline operations
      const data = {
        id: 'offline-test',
        purpose: 'Offline Test',
        timestamp: Date.now()
      };
      
      // Store offline data
      localStorage.setItem('offline_log', JSON.stringify(data));
      
      // Retrieve offline data
      const retrieved = localStorage.getItem('offline_log');
      const parsed = retrieved ? JSON.parse(retrieved) : null;
      
      const endTime = performance.now();
      
      // Cleanup
      localStorage.removeItem('offline_log');
      
      return {
        duration: endTime - startTime,
        success: !!parsed
      };
    });
    
    expect(offlinePerformance.success).toBe(true);
    expect(offlinePerformance.duration).toBeLessThan(50); // Under 50ms
    
    // Test online/offline transition
    await context.setOffline(true);
    await page.waitForTimeout(100);
    await context.setOffline(false);
    await page.waitForTimeout(100);
    
    // App should still be responsive
    const isResponsive = await page.evaluate(() => {
      return document.readyState === 'complete';
    });
    
    expect(isResponsive).toBe(true);
  });

  // Helper function to create test data
  async function createLargeDataset(page: any, count: number) {
    await page.evaluate((count) => {
      const logs = [];
      for (let i = 0; i < count; i++) {
        logs.push({
          id: `test-log-${i}`,
          purpose: `Test Purpose ${i}`,
          vehicle: i % 2 === 0 ? '普通車' : '軽自動車',
          startTime: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)).toISOString(),
          endTime: new Date(Date.now() - (i * 24 * 60 * 60 * 1000) + 3600000).toISOString(),
          status: 'COMPLETED',
          totalDistance: Math.random() * 50,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
      localStorage.setItem('driving_logs', JSON.stringify(logs));
    }, count);
  }
});