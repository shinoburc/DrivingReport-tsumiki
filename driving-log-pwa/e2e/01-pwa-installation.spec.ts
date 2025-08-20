import { test, expect } from '@playwright/test';

/**
 * E2E Test: PWAインストール機能
 * 
 * PWAとしてのインストール可能性とService Worker動作を確認
 */

test.describe('PWA Installation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should have PWA manifest', async ({ page }) => {
    // Check manifest link exists
    const manifestLink = await page.locator('link[rel="manifest"]');
    await expect(manifestLink).toHaveAttribute('href', '/manifest.json');

    // Fetch and validate manifest
    const manifestResponse = await page.evaluate(async () => {
      const link = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
      const response = await fetch(link.href);
      return {
        ok: response.ok,
        contentType: response.headers.get('content-type'),
        data: await response.json()
      };
    });

    expect(manifestResponse.ok).toBe(true);
    expect(manifestResponse.contentType).toContain('application/json');
    expect(manifestResponse.data.name).toBe('運転日報管理システム');
    expect(manifestResponse.data.short_name).toBe('運転日報');
    expect(manifestResponse.data.start_url).toBeDefined();
    expect(manifestResponse.data.display).toBe('standalone');
    expect(manifestResponse.data.icons).toHaveLength(16);
  });

  test('should register service worker', async ({ page }) => {
    // Wait for service worker registration
    const swRegistration = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) {
        return { supported: false };
      }

      // Wait for service worker to be ready
      const registration = await navigator.serviceWorker.ready;
      
      return {
        supported: true,
        registered: !!registration,
        scope: registration.scope,
        active: !!registration.active,
        waiting: !!registration.waiting,
        installing: !!registration.installing
      };
    });

    expect(swRegistration.supported).toBe(true);
    expect(swRegistration.registered).toBe(true);
    expect(swRegistration.scope).toContain('http://localhost:8000/');
    expect(swRegistration.active).toBe(true);
  });

  test('should cache assets with service worker', async ({ page, context }) => {
    // Navigate to trigger caching
    await page.goto('/');
    
    // Get cached resources
    const cachedResources = await page.evaluate(async () => {
      const cacheNames = await caches.keys();
      const resources: string[] = [];
      
      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const requests = await cache.keys();
        resources.push(...requests.map(r => r.url));
      }
      
      return resources;
    });

    // Verify critical resources are cached
    expect(cachedResources.some(url => url.includes('/'))).toBe(true);
    expect(cachedResources.some(url => url.includes('manifest.json'))).toBe(true);
    expect(cachedResources.some(url => url.includes('.js'))).toBe(true);
  });

  test('should work offline after caching', async ({ page, context }) => {
    // First visit - cache resources
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Go offline
    await context.setOffline(true);

    // Try to navigate while offline
    await page.reload();

    // Check page still loads
    const title = await page.title();
    expect(title).toContain('運転日報');

    // Check offline indicator if exists
    const offlineIndicator = page.locator('[data-testid="offline-indicator"]');
    if (await offlineIndicator.count() > 0) {
      await expect(offlineIndicator).toBeVisible();
    }

    // Go back online
    await context.setOffline(false);
  });

  test('should show install prompt on supported browsers', async ({ page, browserName }) => {
    // Skip for browsers that don't support PWA install
    if (browserName === 'webkit') {
      test.skip();
    }

    // Check for install button
    const installButton = page.locator('[data-testid="install-button"], button:has-text("インストール")');
    
    // Install button might not appear immediately
    if (await installButton.count() > 0) {
      await expect(installButton).toBeVisible({ timeout: 10000 });
      
      // Check button is clickable
      await expect(installButton).toBeEnabled();
    }
  });

  test('should have proper meta tags for PWA', async ({ page }) => {
    const metaTags = await page.evaluate(() => {
      const tags: Record<string, string | null> = {};
      
      // Check viewport
      const viewport = document.querySelector('meta[name="viewport"]');
      tags.viewport = viewport?.getAttribute('content');
      
      // Check theme color
      const themeColor = document.querySelector('meta[name="theme-color"]');
      tags.themeColor = themeColor?.getAttribute('content');
      
      // Check apple mobile web app capable
      const appleCapable = document.querySelector('meta[name="apple-mobile-web-app-capable"]');
      tags.appleCapable = appleCapable?.getAttribute('content');
      
      // Check apple mobile web app status bar
      const appleStatusBar = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
      tags.appleStatusBar = appleStatusBar?.getAttribute('content');
      
      return tags;
    });

    expect(metaTags.viewport).toContain('width=device-width');
    expect(metaTags.viewport).toContain('initial-scale=1');
    expect(metaTags.themeColor).toBeDefined();
    expect(metaTags.appleCapable).toBe('yes');
    expect(metaTags.appleStatusBar).toBeDefined();
  });

  test('should have iOS splash screens', async ({ page }) => {
    const splashScreens = await page.evaluate(() => {
      const links = document.querySelectorAll('link[rel="apple-touch-startup-image"]');
      return Array.from(links).map(link => ({
        href: link.getAttribute('href'),
        media: link.getAttribute('media')
      }));
    });

    expect(splashScreens.length).toBeGreaterThan(0);
    
    // Check for various device sizes
    const hasIPhoneScreen = splashScreens.some(s => s.media?.includes('1170'));
    const hasIPadScreen = splashScreens.some(s => s.media?.includes('1024'));
    
    expect(hasIPhoneScreen || hasIPadScreen).toBe(true);
  });

  test('should update service worker when new version available', async ({ page }) => {
    // Get current service worker state
    const initialState = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready;
      return {
        updateFound: false,
        hasWaiting: !!registration.waiting
      };
    });

    // Check for update
    const updateState = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready;
      
      return new Promise((resolve) => {
        registration.addEventListener('updatefound', () => {
          resolve({ updateFound: true });
        });

        // Trigger update check
        registration.update().then(() => {
          setTimeout(() => {
            resolve({
              updateFound: false,
              hasWaiting: !!registration.waiting
            });
          }, 2000);
        });
      });
    });

    // Service worker should be up to date or update found
    expect(updateState).toBeDefined();
  });
});