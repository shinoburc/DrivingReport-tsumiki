import { ServiceWorkerConfig, CacheStrategy, NetworkQuality, CacheUsage } from './types';

export class ServiceWorkerManager {
  private config: ServiceWorkerConfig;
  private stateChangeListeners: Array<(state: string) => void> = [];
  private networkStateListeners: Array<(isOnline: boolean) => void> = [];
  private syncRequiredListeners: Array<(trigger: string) => void> = [];

  constructor() {
    this.config = {
      version: '1.0.0',
      cacheNames: {
        appShell: `driving-log-shell-v1.0.0`,
        runtime: `driving-log-runtime-v1.0.0`,
        data: `driving-log-data-v1.0.0`,
      },
      precacheFiles: [],
      networkStrategies: {},
      syncConfig: {
        backgroundSync: true,
        maxRetryTime: 86400000, // 24 hours
        retryInterval: 5000, // 5 seconds
      },
    };

    this.setupNetworkStateMonitoring();
  }

  async register(): Promise<ServiceWorkerRegistration> {
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service Worker not supported');
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      
      if (registration.installing) {
        this.monitorStateChanges(registration.installing);
      }

      return registration;
    } catch (error) {
      throw new Error(`Registration failed: ${error.message}`);
    }
  }

  async checkForUpdates(): Promise<boolean> {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      return false;
    }

    await registration.update();
    return registration.installing !== null;
  }

  onStateChange(callback: (state: string) => void): void {
    this.stateChangeListeners.push(callback);
  }

  onNetworkStateChange(callback: (isOnline: boolean) => void): void {
    this.networkStateListeners.push(callback);
  }

  onSyncRequired(callback: (trigger: string) => void): void {
    this.syncRequiredListeners.push(callback);
  }

  async initializeCaches(): Promise<void> {
    await caches.open(this.config.cacheNames.appShell);
    await caches.open(this.config.cacheNames.runtime);
    await caches.open(this.config.cacheNames.data);
  }

  async updateCacheVersion(version: string): Promise<void> {
    this.config.version = version;
    this.config.cacheNames = {
      appShell: `driving-log-shell-v${version}`,
      runtime: `driving-log-runtime-v${version}`,
      data: `driving-log-data-v${version}`,
    };

    await this.initializeCaches();
  }

  async cleanupOldCaches(currentVersion: string): Promise<void> {
    const cacheNames = await caches.keys();
    const currentCacheNames = Object.values(this.config.cacheNames);
    
    const deletePromises = cacheNames
      .filter(cacheName => 
        cacheName.startsWith('driving-log-') && 
        !currentCacheNames.includes(cacheName)
      )
      .map(cacheName => caches.delete(cacheName));

    await Promise.all(deletePromises);
  }

  async getCacheUsage(): Promise<CacheUsage> {
    const estimate = await navigator.storage?.estimate?.() || { usage: 0, quota: 0 };
    
    return {
      total: estimate.usage || 0,
      byCache: {
        [this.config.cacheNames.appShell]: 0,
        [this.config.cacheNames.runtime]: 0,
        [this.config.cacheNames.data]: 0,
      },
      exceeds: {
        limit: false,
        threshold: 50 * 1024 * 1024, // 50MB
      },
    };
  }

  async getCachedResponse(url: string): Promise<Response | null> {
    try {
      return await caches.match(url);
    } catch (error) {
      console.error('Cache access error:', error);
      return null;
    }
  }

  async assessNetworkQuality(): Promise<NetworkQuality> {
    // Simplified network quality assessment
    const connection = (navigator as any).connection;
    
    if (!connection) {
      return {
        speed: 'fast',
        reliability: 1.0,
        category: 'fast',
      };
    }

    const speed = connection.effectiveType === '4g' ? 'fast' : 'slow';
    const reliability = connection.downlink > 1 ? 1.0 : 0.5;
    
    return {
      speed,
      reliability,
      category: speed === 'fast' && reliability > 0.8 ? 'fast' : 'slow',
    };
  }

  async fetchWithTimeout(url: string, options: { timeout: number }): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeout);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    }
  }

  async classifyNetworkError(error: Error): Promise<string> {
    if (error.message.includes('Failed to fetch')) {
      return 'network-unavailable';
    }
    if (error.message.includes('timeout')) {
      return 'timeout';
    }
    return 'network-error';
  }

  private monitorStateChanges(worker: ServiceWorker): void {
    worker.addEventListener('statechange', () => {
      this.stateChangeListeners.forEach(callback => callback(worker.state));
    });
  }

  private setupNetworkStateMonitoring(): void {
    window.addEventListener('online', () => {
      this.networkStateListeners.forEach(callback => callback(true));
      this.syncRequiredListeners.forEach(callback => callback('connection-recovery'));
    });

    window.addEventListener('offline', () => {
      this.networkStateListeners.forEach(callback => callback(false));
    });
  }
}