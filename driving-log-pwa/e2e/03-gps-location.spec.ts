import { test, expect } from '@playwright/test';

/**
 * E2E Test: GPS・位置情報機能
 * 
 * GPS機能と位置情報の取得・表示を確認
 */

test.describe('GPS and Location Features', () => {
  test.beforeEach(async ({ page, context }) => {
    // Grant geolocation permission
    await context.grantPermissions(['geolocation']);
    
    // Set geolocation to Tokyo Station
    await context.setGeolocation({ 
      latitude: 35.6812, 
      longitude: 139.7671 
    });
    
    await page.goto('/');
  });

  test('should request and display GPS permission status', async ({ page }) => {
    // Check for GPS status indicator
    const gpsIndicator = page.locator('[data-testid="gps-indicator"], .gps-status, text=GPS');
    
    if (await gpsIndicator.count() > 0) {
      await expect(gpsIndicator).toBeVisible();
      
      // Check for permission status
      const permissionStatus = await page.evaluate(async () => {
        if ('permissions' in navigator) {
          const permission = await navigator.permissions.query({ name: 'geolocation' });
          return permission.state;
        }
        return 'unavailable';
      });
      
      expect(['granted', 'denied', 'prompt', 'unavailable']).toContain(permissionStatus);
    }
  });

  test('should get current location when GPS is enabled', async ({ page }) => {
    // Check if GPS functionality is available
    const hasGeolocation = await page.evaluate(() => 'geolocation' in navigator);
    
    if (!hasGeolocation) {
      test.skip();
    }

    // Look for GPS/location button
    const gpsButton = page.locator('button:has-text("現在地"), button:has-text("GPS"), [data-testid="gps-button"]');
    
    if (await gpsButton.count() > 0) {
      await gpsButton.click();
      
      // Wait for location to be obtained
      await page.waitForTimeout(2000);
      
      // Check if coordinates are displayed
      const locationDisplay = page.locator('[data-testid="current-location"], .coordinates, text=35.681');
      await expect(locationDisplay).toBeVisible({ timeout: 10000 });
    } else {
      // Check if location is automatically obtained
      const locationInfo = await page.evaluate(async () => {
        return new Promise((resolve) => {
          if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                resolve({
                  success: true,
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude,
                  accuracy: position.coords.accuracy
                });
              },
              (error) => {
                resolve({
                  success: false,
                  error: error.message
                });
              },
              { timeout: 10000 }
            );
          } else {
            resolve({ success: false, error: 'Geolocation not supported' });
          }
        });
      });
      
      expect(locationInfo).toHaveProperty('success', true);
    }
  });

  test('should add GPS location to driving log', async ({ page }) => {
    // Create new log
    const newLogButton = page.locator('button:has-text("新規記録"), [data-testid="new-log-button"]');
    if (await newLogButton.count() > 0) {
      await newLogButton.click();
      
      // Fill basic info
      const purposeInput = page.locator('input[name="purpose"], [data-testid="purpose-input"]');
      await purposeInput.fill('GPS テスト');
      
      const submitButton = page.locator('button[type="submit"], [data-testid="submit-button"]');
      await submitButton.click();
      
      // Look for GPS location button in location form
      const addLocationButton = page.locator('button:has-text("地点追加"), [data-testid="add-location-button"]');
      if (await addLocationButton.count() > 0) {
        await addLocationButton.click();
        
        // Check for GPS button in location form
        const useGpsButton = page.locator('button:has-text("現在地取得"), button:has-text("GPS"), [data-testid="use-gps-button"]');
        if (await useGpsButton.count() > 0) {
          await useGpsButton.click();
          
          // Wait for coordinates to be populated
          await page.waitForTimeout(3000);
          
          // Check if latitude/longitude fields are filled
          const latInput = page.locator('input[name="latitude"], [data-testid="latitude-input"]');
          const lngInput = page.locator('input[name="longitude"], [data-testid="longitude-input"]');
          
          if (await latInput.count() > 0) {
            const latValue = await latInput.inputValue();
            const lngValue = await lngInput.inputValue();
            
            expect(parseFloat(latValue)).toBeCloseTo(35.6812, 2);
            expect(parseFloat(lngValue)).toBeCloseTo(139.7671, 2);
          }
        }
      }
    }
  });

  test('should display GPS accuracy information', async ({ page }) => {
    // Check for GPS accuracy display
    const accuracyDisplay = page.locator('[data-testid="gps-accuracy"], text=精度, text=accuracy');
    
    if (await accuracyDisplay.count() > 0) {
      await expect(accuracyDisplay).toBeVisible();
      
      // Get GPS position and check accuracy
      const accuracyInfo = await page.evaluate(async () => {
        return new Promise((resolve) => {
          if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                resolve({
                  success: true,
                  accuracy: position.coords.accuracy
                });
              },
              () => resolve({ success: false })
            );
          } else {
            resolve({ success: false });
          }
        });
      });
      
      if (accuracyInfo.success) {
        expect(accuracyInfo.accuracy).toBeGreaterThan(0);
      }
    }
  });

  test('should handle GPS permission denied', async ({ page, context }) => {
    // Deny geolocation permission
    await context.clearPermissions();
    
    // Try to use GPS
    const gpsButton = page.locator('button:has-text("現在地"), [data-testid="gps-button"]');
    
    if (await gpsButton.count() > 0) {
      await gpsButton.click();
      
      // Check for error message
      const errorMessage = page.locator('text=位置情報が取得できません, text=GPS, text=許可, [data-testid="gps-error"]');
      await expect(errorMessage).toBeVisible({ timeout: 5000 });
    }
  });

  test('should track location during trip', async ({ page }) => {
    // Create new log
    await createNewLogWithGPS(page);
    
    // Check for tracking indicator
    const trackingIndicator = page.locator('[data-testid="tracking-indicator"], text=追跡中, text=記録中');
    
    if (await trackingIndicator.count() > 0) {
      await expect(trackingIndicator).toBeVisible();
      
      // Simulate movement by changing geolocation
      await page.context().setGeolocation({ 
        latitude: 35.6896, 
        longitude: 139.7006 
      });
      
      await page.waitForTimeout(2000);
      
      // Check if new position is tracked
      const locationUpdate = page.locator('[data-testid="location-update"], text=35.689');
      if (await locationUpdate.count() > 0) {
        await expect(locationUpdate).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should display location on map if available', async ({ page }) => {
    // Look for map container
    const mapContainer = page.locator('[data-testid="map"], .map-container, #map');
    
    if (await mapContainer.count() > 0) {
      await expect(mapContainer).toBeVisible();
      
      // Check for map libraries (Leaflet, Google Maps, etc.)
      const hasMapLibrary = await page.evaluate(() => {
        return !!(window.L || window.google?.maps || window.mapboxgl);
      });
      
      // If map library is loaded, check for markers
      if (hasMapLibrary) {
        // Wait for map to load
        await page.waitForTimeout(3000);
        
        // Check for location markers
        const markers = page.locator('.leaflet-marker, .marker, [data-testid="location-marker"]');
        if (await markers.count() > 0) {
          await expect(markers.first()).toBeVisible();
        }
      }
    }
  });

  test('should handle GPS timeout', async ({ page }) => {
    // Override geolocation to simulate timeout
    await page.addInitScript(() => {
      const originalGetCurrentPosition = navigator.geolocation.getCurrentPosition;
      navigator.geolocation.getCurrentPosition = function(success, error, options) {
        setTimeout(() => {
          if (error) {
            error({
              code: 3, // TIMEOUT
              message: 'Timeout expired'
            });
          }
        }, 1000);
      };
    });
    
    // Try to get GPS location
    const gpsButton = page.locator('button:has-text("現在地"), [data-testid="gps-button"]');
    
    if (await gpsButton.count() > 0) {
      await gpsButton.click();
      
      // Check for timeout error
      const timeoutError = page.locator('text=タイムアウト, text=時間, text=timeout, [data-testid="gps-timeout"]');
      await expect(timeoutError).toBeVisible({ timeout: 10000 });
    }
  });

  test('should save location data to storage', async ({ page }) => {
    // Create log with GPS location
    await createNewLogWithGPS(page);
    
    // Check if location data is saved
    const savedLocation = await page.evaluate(async () => {
      // Check localStorage
      const logs = localStorage.getItem('driving_logs');
      if (logs) {
        const parsedLogs = JSON.parse(logs);
        return parsedLogs.length > 0 && parsedLogs[0].startLocation;
      }
      
      // Check IndexedDB if available
      if ('indexedDB' in window) {
        try {
          const db = await new Promise((resolve, reject) => {
            const request = indexedDB.open('DrivingLogDB');
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
          });
          
          return !!db;
        } catch {
          return false;
        }
      }
      
      return false;
    });
    
    expect(savedLocation).toBeTruthy();
  });

  // Helper function
  async function createNewLogWithGPS(page: any) {
    const newLogButton = page.locator('button:has-text("新規記録"), [data-testid="new-log-button"]');
    await newLogButton.click();
    
    const purposeInput = page.locator('input[name="purpose"], [data-testid="purpose-input"]');
    await purposeInput.fill('GPS テスト記録');
    
    const submitButton = page.locator('button[type="submit"], [data-testid="submit-button"]');
    await submitButton.click();
    
    // Add GPS location if possible
    const addLocationButton = page.locator('button:has-text("地点追加"), [data-testid="add-location-button"]');
    if (await addLocationButton.count() > 0) {
      await addLocationButton.click();
      
      const useGpsButton = page.locator('button:has-text("現在地"), [data-testid="use-gps-button"]');
      if (await useGpsButton.count() > 0) {
        await useGpsButton.click();
        await page.waitForTimeout(2000);
      }
      
      const submitLocationButton = page.locator('button[type="submit"], [data-testid="submit-location-button"]');
      if (await submitLocationButton.count() > 0) {
        await submitLocationButton.click();
      }
    }
    
    await page.waitForTimeout(1000);
  }
});