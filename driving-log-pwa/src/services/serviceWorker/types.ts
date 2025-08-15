// Service Worker type definitions for TASK-601

export enum CacheStrategy {
  CacheFirst = 'cache-first',
  NetworkFirst = 'network-first',
  StaleWhileRevalidate = 'stale-while-revalidate',
  NetworkOnly = 'network-only',
  CacheOnly = 'cache-only'
}

export interface ServiceWorkerConfig {
  version: string;
  cacheNames: {
    appShell: string;
    runtime: string;
    data: string;
  };
  precacheFiles: string[];
  networkStrategies: {
    [route: string]: CacheStrategy;
  };
  syncConfig: {
    backgroundSync: boolean;
    maxRetryTime: number;
    retryInterval: number;
  };
}

export interface SyncMessage {
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  entity: 'driving-log' | 'location' | 'settings';
  data: any;
  timestamp: number;
  id: string;
  priority?: 'high' | 'normal' | 'low';
}

export interface SyncResult {
  processed: number;
  conflicts: ConflictData[];
  errors: SyncError[];
  synced?: SyncMessage[];
  batches?: number;
  totalProcessed?: number;
  autoMerged?: number;
  requiresUserInput?: number;
}

export interface ConflictData {
  entityId: string;
  entity: string;
  localData: any;
  remoteData: any;
  options: string[];
  conflictedVersions?: Array<{
    data: any;
    timestamp: number;
  }>;
}

export interface SyncError {
  operation: SyncMessage;
  error: string;
  retryCount: number;
  lastAttempt: number;
}

export interface CacheUsage {
  total: number;
  byCache: Record<string, number>;
  exceeds: {
    limit: boolean;
    threshold: number;
  };
}

export interface NetworkQuality {
  speed: 'fast' | 'slow';
  reliability: number;
  category: 'fast' | 'slow' | 'unreliable';
}

export interface SyncState {
  lastSyncTimestamp: number;
  pendingOperations: number;
  inProgress: boolean;
  nextScheduledSync?: number;
}

export interface SyncStatistics {
  totalOperations: number;
  successRate: number;
  averageProcessingTime: number;
}

export interface SyncLog {
  operation: SyncMessage;
  result: 'success' | 'failure' | 'conflict';
  timestamp: number;
  duration?: number;
  error?: string;
}

export interface EncryptedData {
  encryptedData: ArrayBuffer;
  iv: ArrayBuffer;
  keyId: string;
}

export interface CachePolicy {
  allowed: boolean;
  reason?: string;
  duration?: number;
}

export interface SecurityHeaders {
  'X-Content-Type-Options': string;
  'X-Frame-Options': string;
  'X-XSS-Protection': string;
  'Strict-Transport-Security': string;
  'Content-Security-Policy'?: string;
}

export interface PrivacySettings {
  location: boolean;
  'driving-patterns': boolean;
  'device-info': boolean;
  analytics?: boolean;
  marketing?: boolean;
}

export interface ExportOptions {
  privacyLevel: 'full' | 'approximate' | 'minimal';
  includePersonalInfo: boolean;
  anonymizeLocations: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export type SyncTrigger = 
  | 'connection-recovery'
  | 'user-operation'
  | 'app-startup'
  | 'periodic'
  | 'manual';

export interface PrecacheManifest {
  files: string[];
  revision: string;
  size: number;
}