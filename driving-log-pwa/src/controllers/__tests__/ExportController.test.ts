import { ExportController } from '../ExportController';
import { CSVService } from '../../services/CSVService';
import { StorageService } from '../../services/StorageService';
import { DrivingLogModel } from '../../models/entities/DrivingLogModel';
import {
  IExportController,
  ExportSettings,
  ExportPreset,
  ExportRequestOptions,
  ExportProgress,
  ExportResult,
  ExportError,
  ExportErrorCode,
  ExportPhase,
  ExportField,
  FormatOptions,
  PrivacyOptions,
  DrivingLogStatus,
  LocationType,
  ExportFilters,
  ExportHistoryEntry,
  ValidationWarning,
  ExportSettingsValidation
} from '../../types';

// Mock dependencies
jest.mock('../../services/CSVService');
jest.mock('../../services/StorageService');

describe('ExportController', () => {
  let exportController: IExportController;
  let mockCsvService: jest.Mocked<CSVService>;
  let mockStorageService: jest.Mocked<StorageService>;

  // Mock data
  const mockDrivingLogData = Array.from({ length: 100 }, (_, i) => 
    DrivingLogModel.create({
      id: `log-${i.toString().padStart(3, '0')}`,
      date: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
      startTime: new Date(Date.now() - i * 24 * 60 * 60 * 1000 + 9 * 60 * 60 * 1000),
      endTime: new Date(Date.now() - i * 24 * 60 * 60 * 1000 + 17 * 60 * 60 * 1000),
      driverName: `ドライバー${i}`,
      vehicleNumber: `品川${100 + i}あ${1000 + i}`,
      startLocation: {
        id: `start-${i}`,
        name: `出発地${i}`,
        address: `東京都新宿区${i}-${i}-${i}`,
        latitude: 35.6762 + (i % 10) * 0.01,
        longitude: 139.6503 + (i % 10) * 0.01,
        accuracy: 5,
        timestamp: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
        type: LocationType.START
      },
      endLocation: {
        id: `end-${i}`,
        name: `到着地${i}`,
        address: `東京都渋谷区${i}-${i}-${i}`,
        latitude: 35.6897 + (i % 10) * 0.01,
        longitude: 139.6922 + (i % 10) * 0.01,
        accuracy: 8,
        timestamp: new Date(Date.now() - i * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000),
        type: LocationType.END
      },
      waypoints: [],
      totalDistance: Math.random() * 100,
      duration: Math.random() * 480,
      purpose: ['営業', '通勤', 'プライベート'][i % 3],
      memo: `テストメモ${i}`,
      status: [DrivingLogStatus.COMPLETED, DrivingLogStatus.IN_PROGRESS, DrivingLogStatus.CANCELLED][i % 3],
      createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000)
    })
  );

  const mockDefaultSettings: ExportSettings = {
    fields: [
      ExportField.ID,
      ExportField.DATE,
      ExportField.START_LOCATION_NAME,
      ExportField.END_LOCATION_NAME,
      ExportField.TOTAL_DISTANCE,
      ExportField.STATUS
    ],
    excludeFields: [],
    filters: {},
    format: {
      delimiter: ',',
      encoding: 'utf-8',
      lineEnding: '\n',
      quote: 'minimal',
      dateFormat: 'YYYY-MM-DD',
      timeFormat: 'HH:mm',
      numberFormat: {
        decimalPlaces: 2,
        thousandSeparator: false,
        distanceUnit: 'km',
        durationUnit: 'minutes'
      }
    },
    privacy: {
      anonymizeDriverName: false,
      anonymizeVehicleNumber: false,
      excludeGPSCoordinates: false,
      maskSensitiveLocations: false,
      coordinatePrecision: 4
    },
    fileNameTemplate: 'driving-log-{YYYY-MM-DD}.csv',
    useWebWorker: false,
    chunkSize: 1000
  };

  const mockPreset: ExportPreset = {
    id: 'preset-001',
    name: '標準エクスポート',
    description: '最も一般的な設定でのエクスポート',
    settings: mockDefaultSettings,
    isDefault: true,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
    lastUsed: new Date('2024-01-20'),
    usageCount: 5
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock instances
    mockCsvService = new CSVService() as jest.Mocked<CSVService>;
    mockStorageService = new StorageService() as jest.Mocked<StorageService>;

    // Setup default mock implementations
    mockStorageService.get = jest.fn().mockResolvedValue(null);
    mockStorageService.save = jest.fn().mockImplementation((key, data) => Promise.resolve(data));
    mockStorageService.getAll = jest.fn().mockResolvedValue(mockDrivingLogData);
    
    mockCsvService.generateCSV = jest.fn().mockResolvedValue('id,date,startLocationName\nlog-001,2024-01-15,出発地0');
    mockCsvService.generateCSVBlob = jest.fn().mockResolvedValue(new Blob(['test'], { type: 'text/csv' }));
    mockCsvService.validateData = jest.fn().mockReturnValue({ isValid: true, errors: [], warnings: [] });

    // Initialize controller
    exportController = new ExportController(mockCsvService, mockStorageService);
  });

  describe('Settings Management', () => {
    it('should save export settings', async () => {
      // Arrange
      const settings = { ...mockDefaultSettings };

      // Act
      await exportController.saveExportSettings(settings);

      // Assert
      expect(mockStorageService.save).toHaveBeenCalledWith('exportSettings', settings);
    });

    it('should load export settings', async () => {
      // Arrange
      mockStorageService.get.mockResolvedValue(mockDefaultSettings);

      // Act
      const result = await exportController.loadExportSettings();

      // Assert
      expect(result).toEqual(mockDefaultSettings);
      expect(mockStorageService.get).toHaveBeenCalledWith('exportSettings');
    });

    it('should return default settings when no saved settings exist', async () => {
      // Arrange
      mockStorageService.get.mockResolvedValue(null);

      // Act
      const result = await exportController.loadExportSettings();

      // Assert
      expect(result).toBeDefined();
      expect(result.fields).toContain(ExportField.ID);
      expect(result.fields).toContain(ExportField.DATE);
    });

    it('should get default settings', () => {
      // Act
      const result = exportController.getDefaultSettings();

      // Assert
      expect(result).toBeDefined();
      expect(result.format.delimiter).toBe(',');
      expect(result.privacy.anonymizeDriverName).toBe(false);
      expect(result.useWebWorker).toBe(false);
    });

    it('should validate export settings', async () => {
      // Arrange
      const invalidSettings: ExportSettings = {
        ...mockDefaultSettings,
        fields: [],
        fileNameTemplate: ''
      };

      // Act
      const result = await exportController.validateSettings(invalidSettings);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Preset Management', () => {
    it('should save preset', async () => {
      // Arrange
      const preset = { ...mockPreset };

      // Act
      await exportController.savePreset(preset);

      // Assert
      expect(mockStorageService.save).toHaveBeenCalledWith(
        expect.stringContaining('exportPresets'),
        expect.objectContaining({
          [preset.id]: preset
        })
      );
    });

    it('should get all presets', async () => {
      // Arrange
      const presets = { [mockPreset.id]: mockPreset };
      mockStorageService.get.mockResolvedValue(presets);

      // Act
      const result = await exportController.getPresets();

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockPreset);
    });

    it('should delete preset', async () => {
      // Arrange
      const presets = { 
        [mockPreset.id]: mockPreset,
        'preset-002': { ...mockPreset, id: 'preset-002', name: 'Test Preset 2' }
      };
      mockStorageService.get.mockResolvedValue(presets);

      // Act
      await exportController.deletePreset(mockPreset.id);

      // Assert
      expect(mockStorageService.save).toHaveBeenCalledWith(
        'exportPresets',
        expect.not.objectContaining({
          [mockPreset.id]: expect.anything()
        })
      );
    });

    it('should set default preset', async () => {
      // Arrange
      const presets = { [mockPreset.id]: mockPreset };
      mockStorageService.get.mockResolvedValue(presets);

      // Act
      await exportController.setDefaultPreset(mockPreset.id);

      // Assert
      expect(mockStorageService.save).toHaveBeenCalledWith(
        'exportPresets',
        expect.objectContaining({
          [mockPreset.id]: expect.objectContaining({
            isDefault: true
          })
        })
      );
    });

    it('should handle preset not found error', async () => {
      // Arrange
      mockStorageService.get.mockResolvedValue({});

      // Act & Assert
      await expect(exportController.deletePreset('non-existent')).rejects.toThrow();
    });
  });

  describe('Export Execution', () => {
    it('should start basic export', async () => {
      // Arrange
      const options: ExportRequestOptions = {
        ...mockDefaultSettings
      };

      // Act
      const result = await exportController.startExport(options);

      // Assert
      expect(result.success).toBe(true);
      expect(result.fileName).toContain('driving-log');
      expect(result.recordCount).toBeGreaterThan(0);
      expect(mockCsvService.generateCSV).toHaveBeenCalled();
    });

    it('should handle export with filters', async () => {
      // Arrange
      const options: ExportRequestOptions = {
        ...mockDefaultSettings,
        filters: {
          dateRange: {
            startDate: new Date('2024-01-01'),
            endDate: new Date('2024-01-31')
          },
          status: [DrivingLogStatus.COMPLETED]
        }
      };

      // Act
      const result = await exportController.startExport(options);

      // Assert
      expect(result.success).toBe(true);
      expect(mockCsvService.generateCSV).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({
          statusFilter: [DrivingLogStatus.COMPLETED],
          dateRange: options.filters.dateRange
        })
      );
    });

    it('should handle export with custom fields', async () => {
      // Arrange
      const options: ExportRequestOptions = {
        ...mockDefaultSettings,
        fields: [ExportField.ID, ExportField.DATE, ExportField.TOTAL_DISTANCE],
        excludeFields: [ExportField.DRIVER_NAME]
      };

      // Act
      const result = await exportController.startExport(options);

      // Assert
      expect(result.success).toBe(true);
      expect(mockCsvService.generateCSV).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({
          fields: options.fields,
          excludeFields: options.excludeFields
        })
      );
    });

    it('should handle empty data export', async () => {
      // Arrange
      mockStorageService.getAll.mockResolvedValue([]);
      const options: ExportRequestOptions = { ...mockDefaultSettings };

      // Act
      const result = await exportController.startExport(options);

      // Assert
      expect(result.success).toBe(true);
      expect(result.recordCount).toBe(0);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should cancel export', async () => {
      // Arrange
      let exportPromise: Promise<ExportResult>;
      
      // Start export
      exportPromise = exportController.startExport(mockDefaultSettings);

      // Act
      await exportController.cancelExport();

      // Assert
      await expect(exportPromise).rejects.toThrow();
      expect(exportController.isExporting()).toBe(false);
    });

    it('should handle CSV generation error', async () => {
      // Arrange
      mockCsvService.generateCSV.mockRejectedValue(new Error('CSV generation failed'));
      const options: ExportRequestOptions = { ...mockDefaultSettings };

      // Act
      const result = await exportController.startExport(options);

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].code).toBe(ExportErrorCode.CSV_GENERATION_FAILED);
    });

    it('should handle data fetch error', async () => {
      // Arrange
      mockStorageService.getAll.mockRejectedValue(new Error('Storage error'));
      const options: ExportRequestOptions = { ...mockDefaultSettings };

      // Act
      const result = await exportController.startExport(options);

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors[0].code).toBe(ExportErrorCode.DATA_FETCH_FAILED);
    });
  });

  describe('Progress Monitoring', () => {
    it('should emit progress events', async () => {
      // Arrange
      const progressEvents: ExportProgress[] = [];
      exportController.onProgress((progress) => {
        progressEvents.push(progress);
      });

      // Act
      await exportController.startExport(mockDefaultSettings);

      // Assert
      expect(progressEvents.length).toBeGreaterThan(0);
      expect(progressEvents[0].phase).toBe(ExportPhase.PREPARING);
      expect(progressEvents[progressEvents.length - 1].phase).toBe(ExportPhase.COMPLETED);
    });

    it('should emit complete events', async () => {
      // Arrange
      let completedResult: ExportResult | null = null;
      exportController.onComplete((result) => {
        completedResult = result;
      });

      // Act
      await exportController.startExport(mockDefaultSettings);

      // Assert
      expect(completedResult).not.toBeNull();
      expect(completedResult!.success).toBe(true);
    });

    it('should emit error events', async () => {
      // Arrange
      let errorEvent: ExportError | null = null;
      exportController.onError((error) => {
        errorEvent = error;
      });
      mockCsvService.generateCSV.mockRejectedValue(new Error('Test error'));

      // Act
      await exportController.startExport(mockDefaultSettings);

      // Assert
      expect(errorEvent).not.toBeNull();
      expect(errorEvent!.code).toBe(ExportErrorCode.CSV_GENERATION_FAILED);
    });

    it('should remove event listeners', () => {
      // Arrange
      const progressCallback = jest.fn();
      const completeCallback = jest.fn();
      const errorCallback = jest.fn();

      exportController.onProgress(progressCallback);
      exportController.onComplete(completeCallback);
      exportController.onError(errorCallback);

      // Act
      exportController.removeProgressListener(progressCallback);
      exportController.removeCompleteListener(completeCallback);
      exportController.removeErrorListener(errorCallback);

      // Assert
      expect(() => {
        exportController.removeProgressListener(progressCallback);
        exportController.removeCompleteListener(completeCallback);
        exportController.removeErrorListener(errorCallback);
      }).not.toThrow();
    });

    it('should get current progress during export', async () => {
      // Arrange
      let currentProgress: ExportProgress | null = null;
      
      // Setup progress monitoring
      exportController.onProgress(() => {
        currentProgress = exportController.getCurrentProgress();
      });

      // Act
      await exportController.startExport(mockDefaultSettings);

      // Assert
      expect(currentProgress).not.toBeNull();
      expect(currentProgress!.percentage).toBeGreaterThanOrEqual(0);
      expect(currentProgress!.percentage).toBeLessThanOrEqual(100);
    });
  });

  describe('File Name Generation', () => {
    it('should generate default file name', () => {
      // Arrange
      const options: ExportRequestOptions = { ...mockDefaultSettings };

      // Act
      const fileName = exportController.generateFileName(options);

      // Assert
      expect(fileName).toMatch(/driving-log-\d{4}-\d{2}-\d{2}\.csv/);
    });

    it('should generate file name with date range', () => {
      // Arrange
      const options: ExportRequestOptions = {
        ...mockDefaultSettings,
        filters: {
          dateRange: {
            startDate: new Date('2024-01-01'),
            endDate: new Date('2024-01-31')
          }
        }
      };

      // Act
      const fileName = exportController.generateFileName(options);

      // Assert
      expect(fileName).toContain('2024-01-01');
      expect(fileName).toContain('2024-01-31');
    });

    it('should generate file name with status filter', () => {
      // Arrange
      const options: ExportRequestOptions = {
        ...mockDefaultSettings,
        filters: {
          status: [DrivingLogStatus.COMPLETED]
        }
      };

      // Act
      const fileName = exportController.generateFileName(options);

      // Assert
      expect(fileName).toContain('COMPLETED');
    });

    it('should handle custom template', () => {
      // Arrange
      const options: ExportRequestOptions = {
        ...mockDefaultSettings,
        fileNameTemplate: 'custom-export-{YYYY}-{MM}-{DD}.csv'
      };

      // Act
      const fileName = exportController.generateFileName(options);

      // Assert
      expect(fileName).toMatch(/custom-export-\d{4}-\d{2}-\d{2}\.csv/);
    });

    it('should avoid file name conflicts', () => {
      // Arrange
      const options: ExportRequestOptions = { ...mockDefaultSettings };

      // Act
      const fileName1 = exportController.generateFileName(options);
      const fileName2 = exportController.generateFileName(options);

      // Assert
      expect(fileName1).not.toBe(fileName2);
    });
  });

  describe('Download Functionality', () => {
    it('should download file', async () => {
      // Arrange
      const blob = new Blob(['test data'], { type: 'text/csv' });
      const fileName = 'test-export.csv';
      
      // Mock URL.createObjectURL and document.createElement
      global.URL.createObjectURL = jest.fn().mockReturnValue('blob:mock-url');
      global.URL.revokeObjectURL = jest.fn();
      
      const mockLink = {
        href: '',
        download: '',
        click: jest.fn()
      };
      jest.spyOn(document, 'createElement').mockReturnValue(mockLink as any);

      // Act
      await exportController.downloadFile(blob, fileName);

      // Assert
      expect(global.URL.createObjectURL).toHaveBeenCalledWith(blob);
      expect(mockLink.download).toBe(fileName);
      expect(mockLink.click).toHaveBeenCalled();
      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    });

    it('should handle download failure', async () => {
      // Arrange
      const blob = new Blob(['test data'], { type: 'text/csv' });
      const fileName = 'test-export.csv';
      
      global.URL.createObjectURL = jest.fn().mockImplementation(() => {
        throw new Error('Download failed');
      });

      // Act & Assert
      await expect(exportController.downloadFile(blob, fileName)).rejects.toThrow();
    });
  });

  describe('State Management', () => {
    it('should track export state correctly', async () => {
      // Arrange
      expect(exportController.isExporting()).toBe(false);

      // Act
      const exportPromise = exportController.startExport(mockDefaultSettings);
      
      // Assert during export
      expect(exportController.isExporting()).toBe(true);
      
      // Wait for completion
      await exportPromise;
      
      // Assert after export
      expect(exportController.isExporting()).toBe(false);
    });

    it('should prevent concurrent exports', async () => {
      // Arrange
      const export1Promise = exportController.startExport(mockDefaultSettings);

      // Act & Assert
      await expect(exportController.startExport(mockDefaultSettings)).rejects.toThrow();
      
      // Cleanup
      await export1Promise;
    });

    it('should maintain export history', async () => {
      // Arrange
      await exportController.startExport(mockDefaultSettings);

      // Act
      const history = await exportController.getExportHistory();

      // Assert
      expect(history.length).toBeGreaterThan(0);
      expect(history[0]).toMatchObject({
        id: expect.any(String),
        timestamp: expect.any(Date),
        fileName: expect.any(String),
        success: true
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle storage service errors', async () => {
      // Arrange
      mockStorageService.getAll.mockRejectedValue(new Error('Storage unavailable'));

      // Act
      const result = await exportController.startExport(mockDefaultSettings);

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors[0].code).toBe(ExportErrorCode.STORAGE_UNAVAILABLE);
      expect(result.errors[0].recoverable).toBe(true);
    });

    it('should handle CSV service errors', async () => {
      // Arrange
      mockCsvService.generateCSV.mockRejectedValue(new Error('Invalid format'));

      // Act
      const result = await exportController.startExport(mockDefaultSettings);

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors[0].code).toBe(ExportErrorCode.CSV_GENERATION_FAILED);
    });

    it('should handle memory errors', async () => {
      // Arrange
      mockCsvService.generateCSV.mockRejectedValue(new Error('RangeError: Maximum call stack size exceeded'));

      // Act
      const result = await exportController.startExport(mockDefaultSettings);

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors[0].code).toBe(ExportErrorCode.MEMORY_INSUFFICIENT);
    });

    it('should provide error suggestions', async () => {
      // Arrange
      mockStorageService.getAll.mockResolvedValue([]);

      // Act
      const result = await exportController.startExport(mockDefaultSettings);

      // Assert
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0].suggestion).toBeDefined();
    });
  });

  describe('Large Dataset Handling', () => {
    it('should handle large datasets efficiently', async () => {
      // Arrange
      const largeDataset = Array.from({ length: 5000 }, (_, i) => 
        DrivingLogModel.create({
          ...mockDrivingLogData[0],
          id: `large-${i}`
        })
      );
      mockStorageService.getAll.mockResolvedValue(largeDataset);
      
      const startTime = Date.now();

      // Act
      const result = await exportController.startExport({
        ...mockDefaultSettings,
        chunkSize: 1000
      });

      // Assert
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      expect(result.success).toBe(true);
      expect(processingTime).toBeLessThan(30000); // Should complete within 30 seconds
      expect(result.recordCount).toBe(5000);
    });

    it('should use web worker for large datasets', async () => {
      // Arrange
      const largeDataset = Array.from({ length: 3000 }, (_, i) => 
        DrivingLogModel.create({
          ...mockDrivingLogData[0],
          id: `worker-${i}`
        })
      );
      mockStorageService.getAll.mockResolvedValue(largeDataset);

      const options: ExportRequestOptions = {
        ...mockDefaultSettings,
        useWebWorker: true
      };

      // Act
      const result = await exportController.startExport(options);

      // Assert
      expect(result.success).toBe(true);
      expect(result.recordCount).toBe(3000);
    });
  });

  describe('Privacy and Security', () => {
    it('should apply privacy settings', async () => {
      // Arrange
      const options: ExportRequestOptions = {
        ...mockDefaultSettings,
        privacy: {
          anonymizeDriverName: true,
          anonymizeVehicleNumber: true,
          excludeGPSCoordinates: true,
          maskSensitiveLocations: true,
          coordinatePrecision: 2
        }
      };

      // Act
      const result = await exportController.startExport(options);

      // Assert
      expect(result.success).toBe(true);
      expect(mockCsvService.generateCSV).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({
          privacy: options.privacy
        })
      );
    });

    it('should validate sensitive data export', async () => {
      // Arrange
      const options: ExportRequestOptions = {
        ...mockDefaultSettings,
        fields: [ExportField.DRIVER_NAME, ExportField.VEHICLE_NUMBER],
        privacy: {
          anonymizeDriverName: false,
          anonymizeVehicleNumber: false,
          excludeGPSCoordinates: false,
          maskSensitiveLocations: false,
          coordinatePrecision: 4
        }
      };

      // Act
      const result = await exportController.startExport(options);

      // Assert
      expect(result.warnings.some(w => w.suggestion?.includes('プライバシー'))).toBe(true);
    });
  });

  describe('Performance Tests', () => {
    it('should complete small export quickly', async () => {
      // Arrange
      const smallDataset = mockDrivingLogData.slice(0, 10);
      mockStorageService.getAll.mockResolvedValue(smallDataset);
      
      const startTime = Date.now();

      // Act
      const result = await exportController.startExport(mockDefaultSettings);

      // Assert
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      expect(result.success).toBe(true);
      expect(processingTime).toBeLessThan(3000); // Should complete within 3 seconds
    });

    it('should handle progress updates efficiently', async () => {
      // Arrange
      const progressUpdates: ExportProgress[] = [];
      exportController.onProgress((progress) => {
        progressUpdates.push(progress);
      });

      // Act
      await exportController.startExport(mockDefaultSettings);

      // Assert
      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates.length).toBeLessThan(100); // Should not be too many updates
      
      // Check progress is monotonically increasing
      for (let i = 1; i < progressUpdates.length; i++) {
        expect(progressUpdates[i].percentage).toBeGreaterThanOrEqual(progressUpdates[i - 1].percentage);
      }
    });
  });

  describe('Integration Tests', () => {
    it('should complete full export workflow', async () => {
      // Arrange
      const settings = { ...mockDefaultSettings };
      await exportController.saveExportSettings(settings);

      const preset: ExportPreset = {
        ...mockPreset,
        settings
      };
      await exportController.savePreset(preset);

      // Act
      const loadedSettings = await exportController.loadExportSettings();
      const result = await exportController.startExport(loadedSettings);
      const history = await exportController.getExportHistory();

      // Assert
      expect(result.success).toBe(true);
      expect(history.length).toBeGreaterThan(0);
      expect(history[0].success).toBe(true);
    });

    it('should handle preset-based export', async () => {
      // Arrange
      await exportController.savePreset(mockPreset);

      // Act
      const presets = await exportController.getPresets();
      const result = await exportController.startExport(presets[0].settings);

      // Assert
      expect(result.success).toBe(true);
      expect(result.settings).toEqual(mockPreset.settings);
    });
  });
});