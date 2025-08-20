/**
 * サービス層のモック設定
 * 
 * StorageService、GPSService、CSVServiceなどのモック実装
 */

import { DrivingLogModel } from '../../models/entities/DrivingLogModel';
import { LocationModel } from '../../models/entities/LocationModel';
import { SettingsModel } from '../../models/entities/SettingsModel';
import { DrivingLogStatus, LocationType } from '../../types';

// StorageService Mock
export const createStorageServiceMock = () => {
  const mockData = {
    drivingLogs: new Map<string, DrivingLogModel>(),
    locations: new Map<string, LocationModel>(),
    settings: null as SettingsModel | null
  };

  return {
    // Driving Log operations
    createDrivingLog: jest.fn().mockImplementation(async (log: DrivingLogModel) => {
      mockData.drivingLogs.set(log.id, log);
      return log;
    }),

    getDrivingLog: jest.fn().mockImplementation(async (id: string) => {
      return mockData.drivingLogs.get(id) || null;
    }),

    getAllDrivingLogs: jest.fn().mockImplementation(async () => {
      return Array.from(mockData.drivingLogs.values());
    }),

    updateDrivingLog: jest.fn().mockImplementation(async (id: string, updates: Partial<DrivingLogModel>) => {
      const existing = mockData.drivingLogs.get(id);
      if (!existing) throw new Error('Driving log not found');
      
      const updated = { ...existing, ...updates, updatedAt: new Date() };
      mockData.drivingLogs.set(id, updated as DrivingLogModel);
      return updated;
    }),

    deleteDrivingLog: jest.fn().mockImplementation(async (id: string) => {
      const exists = mockData.drivingLogs.has(id);
      if (!exists) throw new Error('Driving log not found');
      
      mockData.drivingLogs.delete(id);
      return true;
    }),

    // Location operations
    createLocation: jest.fn().mockImplementation(async (location: LocationModel) => {
      mockData.locations.set(location.id, location);
      return location;
    }),

    getLocation: jest.fn().mockImplementation(async (id: string) => {
      return mockData.locations.get(id) || null;
    }),

    getAllLocations: jest.fn().mockImplementation(async () => {
      return Array.from(mockData.locations.values());
    }),

    getLocationsByLogId: jest.fn().mockImplementation(async (logId: string) => {
      return Array.from(mockData.locations.values()).filter(loc => (loc as any).logId === logId);
    }),

    updateLocation: jest.fn().mockImplementation(async (id: string, updates: Partial<LocationModel>) => {
      const existing = mockData.locations.get(id);
      if (!existing) throw new Error('Location not found');
      
      const updated = { ...existing, ...updates, updatedAt: new Date() } as LocationModel;
      mockData.locations.set(id, updated);
      return updated;
    }),

    deleteLocation: jest.fn().mockImplementation(async (id: string) => {
      const exists = mockData.locations.has(id);
      if (!exists) throw new Error('Location not found');
      
      mockData.locations.delete(id);
      return true;
    }),

    // Settings operations
    getSettings: jest.fn().mockImplementation(async () => {
      return mockData.settings || SettingsModel.createDefault();
    }),

    updateSettings: jest.fn().mockImplementation(async (settings: SettingsModel) => {
      mockData.settings = settings;
      return settings;
    }),

    // Search and filter operations
    getLogsByDateRange: jest.fn().mockImplementation(async (from: Date, to: Date) => {
      return Array.from(mockData.drivingLogs.values()).filter(log => 
        (log as any).startTime >= from && (log as any).startTime <= to
      );
    }),

    getLogsByPurpose: jest.fn().mockImplementation(async (purpose: string) => {
      return Array.from(mockData.drivingLogs.values()).filter(log => 
        log.purpose === purpose
      );
    }),

    getLogsByStatus: jest.fn().mockImplementation(async (status: DrivingLogStatus) => {
      return Array.from(mockData.drivingLogs.values()).filter(log => 
        log.status === status
      );
    }),

    getStatistics: jest.fn().mockImplementation(async () => {
      const logs = Array.from(mockData.drivingLogs.values());
      const completedLogs = logs.filter(log => log.status === DrivingLogStatus.COMPLETED);
      const totalDistance = completedLogs.reduce((sum, log) => sum + (log.totalDistance || 0), 0);
      
      return {
        totalLogs: logs.length,
        completedLogs: completedLogs.length,
        totalDistance,
        averageDistance: completedLogs.length > 0 ? totalDistance / completedLogs.length : 0
      };
    }),

    // Helper methods for testing
    __clearMockData: () => {
      mockData.drivingLogs.clear();
      mockData.locations.clear();
      mockData.settings = null;
    },

    __getMockData: () => mockData,

    __setMockData: (data: Partial<typeof mockData>) => {
      Object.assign(mockData, data);
    }
  };
};

// GPSService Mock
export const createGPSServiceMock = () => {
  let mockPosition = {
    latitude: 35.6762,
    longitude: 139.6503,
    accuracy: 10,
    timestamp: new Date()
  };

  return {
    getCurrentPosition: jest.fn().mockImplementation(async () => {
      return { ...mockPosition };
    }),

    watchPosition: jest.fn().mockImplementation((callback: (position: any) => void) => {
      const watchId = setInterval(() => {
        callback({ ...mockPosition });
      }, 1000);
      
      return watchId;
    }),

    clearWatch: jest.fn().mockImplementation((watchId: number) => {
      clearInterval(watchId);
    }),

    isSupported: jest.fn().mockReturnValue(true),

    checkPermission: jest.fn().mockResolvedValue('granted'),

    requestPermission: jest.fn().mockResolvedValue('granted'),

    getAccuracyLevel: jest.fn().mockReturnValue('high'),

    calculateDistance: jest.fn().mockImplementation((pos1: any, pos2: any) => {
      // Simple mock distance calculation
      const latDiff = Math.abs(pos1.latitude - pos2.latitude);
      const lngDiff = Math.abs(pos1.longitude - pos2.longitude);
      return Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111000; // Rough conversion to meters
    }),

    // Helper methods for testing
    __setMockPosition: (position: Partial<typeof mockPosition>) => {
      mockPosition = { ...mockPosition, ...position };
    },

    __getMockPosition: () => ({ ...mockPosition }),

    __simulateError: (errorCode: number = 1) => {
      const error = {
        code: errorCode,
        message: 'GPS error simulation'
      };
      return Promise.reject(error);
    }
  };
};

// CSVService Mock
export const createCSVServiceMock = () => {
  return {
    exportDrivingLogs: jest.fn().mockImplementation(async (logs: DrivingLogModel[], options?: any) => {
      // Generate mock CSV content
      const headers = ['ID', 'Purpose', 'Vehicle', 'Start Time', 'End Time', 'Distance'];
      const rows = logs.map(log => [
        log.id,
        log.purpose,
        log.vehicle || '',
        log.startTime.toISOString(),
        log.endTime?.toISOString() || '',
        (log.totalDistance || 0).toString()
      ]);

      const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');

      return csvContent;
    }),

    exportWithLocations: jest.fn().mockImplementation(async (
      logs: DrivingLogModel[], 
      locations: LocationModel[], 
      options?: any
    ) => {
      // Generate mock CSV with location data
      const headers = ['Log ID', 'Purpose', 'Location Type', 'Address', 'Latitude', 'Longitude'];
      const rows: string[][] = [];

      logs.forEach(log => {
        const logLocations = locations.filter(loc => loc.logId === log.id);
        logLocations.forEach(location => {
          rows.push([
            log.id,
            log.purpose,
            location.type,
            location.address,
            location.coordinates?.latitude.toString() || '',
            location.coordinates?.longitude.toString() || ''
          ]);
        });
      });

      const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');

      return csvContent;
    }),

    importFromCSV: jest.fn().mockImplementation(async (csvContent: string) => {
      // Parse mock CSV content
      const lines = csvContent.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.replace(/"/g, ''));
      const dataRows = lines.slice(1);

      return dataRows.map(row => {
        const cells = row.split(',').map(cell => cell.replace(/"/g, ''));
        const obj: any = {};
        headers.forEach((header, index) => {
          obj[header.toLowerCase().replace(/\s+/g, '_')] = cells[index] || '';
        });
        return obj;
      });
    }),

    validateCSVFormat: jest.fn().mockImplementation(async (csvContent: string) => {
      // Mock validation - check for basic CSV structure
      const lines = csvContent.split('\n').filter(line => line.trim());
      if (lines.length < 2) {
        return {
          isValid: false,
          errors: ['CSV must have at least header and one data row']
        };
      }

      return {
        isValid: true,
        errors: []
      };
    }),

    // Helper methods for testing
    __generateMockCSV: (rowCount: number = 5) => {
      const headers = ['ID', 'Purpose', 'Vehicle', 'Start Time', 'Distance'];
      const rows = Array.from({ length: rowCount }, (_, i) => [
        `log-${i + 1}`,
        `Purpose ${i + 1}`,
        'Test Vehicle',
        new Date().toISOString(),
        (Math.random() * 50).toFixed(1)
      ]);

      return [headers, ...rows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');
    }
  };
};

// CacheStrategy Mock for Service Worker tests
export const createCacheStrategyMock = () => {
  const mockCache = new Map<string, Response>();

  return {
    cacheFirst: jest.fn().mockImplementation(async (request: Request) => {
      const cached = mockCache.get(request.url);
      if (cached) {
        return cached;
      }

      const response = new Response('mock response');
      mockCache.set(request.url, response.clone());
      return response;
    }),

    networkFirst: jest.fn().mockImplementation(async (request: Request) => {
      try {
        const response = new Response('network response');
        mockCache.set(request.url, response.clone());
        return response;
      } catch {
        return mockCache.get(request.url) || new Response('Not found', { status: 404 });
      }
    }),

    staleWhileRevalidate: jest.fn().mockImplementation(async (request: Request) => {
      const cached = mockCache.get(request.url);
      
      // Simulate background update
      setTimeout(() => {
        mockCache.set(request.url, new Response('updated response'));
      }, 100);

      return cached || new Response('fresh response');
    }),

    cacheOnly: jest.fn().mockImplementation(async (request: Request) => {
      return mockCache.get(request.url) || new Response('Not found', { status: 404 });
    }),

    networkOnly: jest.fn().mockImplementation(async (request: Request) => {
      return new Response('network only response');
    }),

    // Helper methods for testing
    __clearCache: () => {
      mockCache.clear();
    },

    __getCacheSize: () => {
      return mockCache.size;
    },

    __getCacheKeys: () => {
      return Array.from(mockCache.keys());
    }
  };
};

// BackgroundSync Mock
export const createBackgroundSyncMock = () => {
  const syncQueue: any[] = [];

  return {
    register: jest.fn().mockImplementation(async (tag: string, data?: any) => {
      syncQueue.push({ tag, data, timestamp: Date.now() });
      return true;
    }),

    execute: jest.fn().mockImplementation(async () => {
      const results = [];
      while (syncQueue.length > 0) {
        const task = syncQueue.shift();
        results.push({ ...task, success: true });
      }
      return results;
    }),

    cancel: jest.fn().mockImplementation(async (tag: string) => {
      const index = syncQueue.findIndex(task => task.tag === tag);
      if (index !== -1) {
        syncQueue.splice(index, 1);
        return true;
      }
      return false;
    }),

    getQueuedTasks: jest.fn().mockImplementation(() => {
      return [...syncQueue];
    }),

    // Helper methods for testing
    __clearQueue: () => {
      syncQueue.length = 0;
    },

    __getQueueSize: () => {
      return syncQueue.length;
    }
  };
};

// Mock factory for creating test data
export const createTestDataFactory = () => {
  let idCounter = 1;

  return {
    createMockDrivingLog: (overrides: Partial<DrivingLogModel> = {}) => {
      return DrivingLogModel.create({
        purpose: 'Test Purpose',
        vehicle: 'Test Vehicle',
        driver: 'Test Driver',
        startTime: new Date(),
        status: DrivingLogStatus.IN_PROGRESS,
        ...overrides
      });
    },

    createMockLocation: (overrides: Partial<LocationModel> = {}) => {
      return LocationModel.create({
        type: LocationType.START,
        address: 'Test Address',
        logId: `log-${idCounter++}`,
        ...overrides
      });
    },

    createMockSettings: (overrides: Partial<SettingsModel> = {}) => {
      const defaultSettings = SettingsModel.createDefault();
      return SettingsModel.create({
        ...defaultSettings,
        ...overrides
      });
    },

    createMockGPSPosition: (overrides: any = {}) => {
      return {
        latitude: 35.6762 + (Math.random() - 0.5) * 0.01,
        longitude: 139.6503 + (Math.random() - 0.5) * 0.01,
        accuracy: 10 + Math.random() * 20,
        timestamp: new Date(),
        ...overrides
      };
    },

    // Reset counter for tests
    __resetIdCounter: () => {
      idCounter = 1;
    }
  };
};