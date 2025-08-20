// Service Worker integration index
import { ServiceWorkerManager } from './ServiceWorkerManager';
import { CacheHandler } from './CacheStrategy';
import { BackgroundSyncManager } from './BackgroundSyncManager';
import { SecurityManager } from './SecurityManager';
import { PrivacyManager } from './PrivacyManager';

export { ServiceWorkerManager } from './ServiceWorkerManager';
export { CacheHandler } from './CacheStrategy';
export { BackgroundSyncManager } from './BackgroundSyncManager';
export { SecurityManager } from './SecurityManager';
export { PrivacyManager } from './PrivacyManager';

export * from './types';

// Service Worker initialization utility
export class ServiceWorkerService {
  private serviceWorkerManager: ServiceWorkerManager;
  private cacheHandler: CacheHandler;
  private syncManager: BackgroundSyncManager;
  private securityManager: SecurityManager;
  private privacyManager: PrivacyManager;

  constructor() {
    this.serviceWorkerManager = new ServiceWorkerManager();
    this.cacheHandler = new CacheHandler();
    this.syncManager = new BackgroundSyncManager();
    this.securityManager = new SecurityManager();
    this.privacyManager = new PrivacyManager();
  }

  async initialize(): Promise<void> {
    try {
      // Check HTTPS requirement
      if (!this.securityManager.checkHTTPSRequirement()) {
        console.warn('Service Worker requires HTTPS or localhost');
        return;
      }

      // Register Service Worker
      await this.serviceWorkerManager.register();
      
      // Initialize caches
      await this.serviceWorkerManager.initializeCaches();
      
      // Initialize background sync
      await this.syncManager.initialize();
      
      console.log('Service Worker integration initialized successfully');
    } catch (error) {
      console.error('Service Worker initialization failed:', error);
      throw error;
    }
  }

  getServiceWorkerManager(): ServiceWorkerManager {
    return this.serviceWorkerManager;
  }

  getCacheHandler(): CacheHandler {
    return this.cacheHandler;
  }

  getSyncManager(): BackgroundSyncManager {
    return this.syncManager;
  }

  getSecurityManager(): SecurityManager {
    return this.securityManager;
  }

  getPrivacyManager(): PrivacyManager {
    return this.privacyManager;
  }
}