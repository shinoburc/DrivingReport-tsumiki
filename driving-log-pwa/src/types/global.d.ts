// Global type definitions

import { AppEvent, AppSettings } from './index';

declare global {
  interface Window {
    drivingLogPWA: {
      version: string;
      initialized: boolean;
      settings?: AppSettings;
      eventBus?: EventTarget;
    };
  }

  // Service Worker types
  interface ServiceWorkerRegistration {
    sync?: SyncManager;
    showNotification(title: string, options?: NotificationOptions): Promise<void>;
  }

  interface SyncManager {
    register(tag: string): Promise<void>;
    getTags(): Promise<string[]>;
  }

  // PWA Install prompt
  interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<{outcome: 'accepted' | 'dismissed'}>;
    userChoice: Promise<{outcome: 'accepted' | 'dismissed'}>;
  }

  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
    appinstalled: Event;
  }

  // Geolocation API enhancements
  interface GeolocationPosition {
    coords: GeolocationCoordinates & {
      altitude?: number;
      altitudeAccuracy?: number;
      heading?: number;
      speed?: number;
    };
  }

  // IndexedDB types for better type safety
  interface IDBObjectStore {
    index(name: 'by-date' | 'by-status' | 'by-createdAt' | 'by-timestamp' | 'by-type'): IDBIndex;
  }

  // Notification API
  interface NotificationOptions {
    body?: string;
    icon?: string;
    image?: string;
    badge?: string;
    vibrate?: number | number[];
    timestamp?: number;
    renotify?: boolean;
    silent?: boolean;
    requireInteraction?: boolean;
    data?: any;
    actions?: NotificationAction[];
    tag?: string;
    dir?: 'auto' | 'ltr' | 'rtl';
    lang?: string;
  }

  interface NotificationAction {
    action: string;
    title: string;
    icon?: string;
  }

  // File System Access API (for future enhancement)
  interface FileSystemFileHandle {
    createWritable(): Promise<FileSystemWritableFileStream>;
    getFile(): Promise<File>;
  }

  interface FileSystemWritableFileStream extends WritableStream {
    write(data: BufferSource | Blob | string): Promise<void>;
    close(): Promise<void>;
  }

  interface Window {
    showSaveFilePicker?(options?: {
      suggestedName?: string;
      types?: Array<{
        description: string;
        accept: Record<string, string[]>;
      }>;
    }): Promise<FileSystemFileHandle>;
  }

  // Test utilities
  const createMockFile: (content: string, type?: string) => File;

  // Custom event types
  interface CustomEventMap {
    'app:event': CustomEvent<AppEvent>;
    'app:offline': CustomEvent;
    'app:online': CustomEvent;
    'driving-log:created': CustomEvent<{id: string}>;
    'driving-log:updated': CustomEvent<{id: string}>;
    'driving-log:deleted': CustomEvent<{id: string}>;
    'location:recorded': CustomEvent<{locationId: string}>;
    'gps:error': CustomEvent<{error: string}>;
    'storage:error': CustomEvent<{error: string}>;
    'export:started': CustomEvent;
    'export:completed': CustomEvent<{filename: string}>;
    'export:failed': CustomEvent<{error: string}>;
  }

  interface EventTarget {
    addEventListener<K extends keyof CustomEventMap>(
      type: K,
      listener: (this: EventTarget, ev: CustomEventMap[K]) => any,
      options?: boolean | AddEventListenerOptions
    ): void;
    addEventListener(
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions
    ): void;
  }
}

export {};
