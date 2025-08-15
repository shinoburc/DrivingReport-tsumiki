import { useState, useEffect, useCallback } from 'react';
import { ServiceWorkerService } from '../services/serviceWorker';

export interface UseServiceWorkerReturn {
  isRegistered: boolean;
  isLoading: boolean;
  error: string | null;
  updateAvailable: boolean;
  isOnline: boolean;
  syncStatus: 'idle' | 'syncing' | 'completed' | 'error';
  cacheStatus: any;
  updateServiceWorker: () => Promise<void>;
  triggerSync: () => Promise<void>;
  getCacheStatus: () => Promise<any>;
}

export function useServiceWorker(): UseServiceWorkerReturn {
  const [isRegistered, setIsRegistered] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'completed' | 'error'>('idle');
  const [cacheStatus, setCacheStatus] = useState<any>(null);
  const [serviceWorkerService] = useState(() => new ServiceWorkerService());

  // Initialize Service Worker
  useEffect(() => {
    const initServiceWorker = async () => {
      try {
        setIsLoading(true);
        setError(null);

        await serviceWorkerService.initialize();
        setIsRegistered(true);

        // Set up event listeners
        const swManager = serviceWorkerService.getServiceWorkerManager();
        const syncManager = serviceWorkerService.getSyncManager();

        // Listen for state changes
        swManager.onStateChange((state) => {
          if (state === 'activated') {
            setIsRegistered(true);
          }
        });

        // Listen for network state changes
        swManager.onNetworkStateChange((online) => {
          setIsOnline(online);
        });

        // Listen for sync status
        syncManager.onSyncTriggered((trigger) => {
          setSyncStatus('syncing');
        });

        // Listen for Service Worker messages
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
        }

        console.log('Service Worker hook initialized');
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Service Worker initialization failed';
        setError(errorMessage);
        console.error('Service Worker initialization error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initServiceWorker();

    // Cleanup function
    return () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      }
    };
  }, [serviceWorkerService]);

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Handle Service Worker messages
  const handleServiceWorkerMessage = useCallback((event: MessageEvent) => {
    const { type, data } = event.data;

    switch (type) {
      case 'UPDATE_AVAILABLE':
        setUpdateAvailable(true);
        break;
      case 'SYNC_COMPLETE':
        setSyncStatus('completed');
        // Reset to idle after a short delay
        setTimeout(() => setSyncStatus('idle'), 2000);
        break;
      case 'SYNC_ERROR':
        setSyncStatus('error');
        setTimeout(() => setSyncStatus('idle'), 5000);
        break;
      case 'CACHE_STATUS':
        setCacheStatus(data);
        break;
      default:
        console.log('Unhandled Service Worker message:', type, data);
    }
  }, []);

  // Update Service Worker
  const updateServiceWorker = useCallback(async () => {
    try {
      setError(null);
      
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration && registration.waiting) {
          // Tell the waiting service worker to skip waiting
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          
          // Reload the page to activate the new service worker
          window.location.reload();
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Service Worker update failed';
      setError(errorMessage);
    }
  }, []);

  // Trigger manual sync
  const triggerSync = useCallback(async () => {
    try {
      setError(null);
      setSyncStatus('syncing');

      const syncManager = serviceWorkerService.getSyncManager();
      await syncManager.processQueue();
      
      setSyncStatus('completed');
      setTimeout(() => setSyncStatus('idle'), 2000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sync failed';
      setError(errorMessage);
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 5000);
    }
  }, [serviceWorkerService]);

  // Get cache status
  const getCacheStatus = useCallback(async () => {
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration && registration.active) {
          // Request cache status from service worker
          const messageChannel = new MessageChannel();
          
          return new Promise((resolve) => {
            messageChannel.port1.onmessage = (event) => {
              setCacheStatus(event.data);
              resolve(event.data);
            };
            
            registration.active!.postMessage(
              { type: 'CACHE_STATUS' },
              [messageChannel.port2]
            );
          });
        }
      }
      return null;
    } catch (err) {
      console.error('Failed to get cache status:', err);
      return null;
    }
  }, []);

  return {
    isRegistered,
    isLoading,
    error,
    updateAvailable,
    isOnline,
    syncStatus,
    cacheStatus,
    updateServiceWorker,
    triggerSync,
    getCacheStatus,
  };
}