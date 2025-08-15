import { CSVService } from '../services/CSVService';
import { StorageService } from '../services/StorageService';
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
  ExportFilters,
  ExportHistoryEntry,
  ValidationWarning,
  ExportSettingsValidation
} from '../types';

export class ExportController implements IExportController {
  private csvService: CSVService;
  private storageService: StorageService;
  private isExportingFlag: boolean = false;
  private currentProgress: ExportProgress | null = null;
  private progressCallbacks: Array<(progress: ExportProgress) => void> = [];
  private completeCallbacks: Array<(result: ExportResult) => void> = [];
  private errorCallbacks: Array<(error: ExportError) => void> = [];
  private abortController: AbortController | null = null;

  constructor(csvService: CSVService, storageService: StorageService) {
    this.csvService = csvService;
    this.storageService = storageService;
  }

  async saveExportSettings(settings: ExportSettings): Promise<void> {
    await this.storageService.save('exportSettings', settings);
  }

  async loadExportSettings(): Promise<ExportSettings> {
    const settings = await this.storageService.get('exportSettings');
    if (settings) {
      return settings;
    }
    return this.getDefaultSettings();
  }

  getDefaultSettings(): ExportSettings {
    return {
      fields: [
        ExportField.ID,
        ExportField.DATE,
        ExportField.START_TIME,
        ExportField.END_TIME,
        ExportField.START_LOCATION_NAME,
        ExportField.END_LOCATION_NAME,
        ExportField.TOTAL_DISTANCE,
        ExportField.DURATION,
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
  }

  async validateSettings(settings: ExportSettings): Promise<ExportSettingsValidation> {
    const errors: Array<{ field: keyof ExportSettings; message: string; code: string }> = [];
    const warnings: Array<{ field: keyof ExportSettings; message: string; suggestion: string }> = [];

    if (!settings.fields || settings.fields.length === 0) {
      errors.push({
        field: 'fields',
        message: 'エクスポートするフィールドが選択されていません',
        code: 'FIELDS_REQUIRED'
      });
    }

    if (!settings.fileNameTemplate || settings.fileNameTemplate.trim() === '') {
      errors.push({
        field: 'fileNameTemplate',
        message: 'ファイル名テンプレートが設定されていません',
        code: 'FILENAME_TEMPLATE_REQUIRED'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  async savePreset(preset: ExportPreset): Promise<void> {
    const existingPresets = await this.storageService.get('exportPresets') || {};
    existingPresets[preset.id] = preset;
    await this.storageService.save('exportPresets', existingPresets);
  }

  async getPresets(): Promise<ExportPreset[]> {
    const presets = await this.storageService.get('exportPresets') || {};
    return Object.values(presets);
  }

  async deletePreset(presetId: string): Promise<void> {
    const presets = await this.storageService.get('exportPresets') || {};
    if (!presets[presetId]) {
      throw new Error(`Preset ${presetId} not found`);
    }
    delete presets[presetId];
    await this.storageService.save('exportPresets', presets);
  }

  async setDefaultPreset(presetId: string): Promise<void> {
    const presets = await this.storageService.get('exportPresets') || {};
    
    Object.values(presets).forEach((preset: any) => {
      preset.isDefault = false;
    });
    
    if (presets[presetId]) {
      presets[presetId].isDefault = true;
      await this.storageService.save('exportPresets', presets);
    }
  }

  async startExport(options: ExportRequestOptions): Promise<ExportResult> {
    if (this.isExportingFlag) {
      throw new Error('Export already in progress');
    }

    this.isExportingFlag = true;
    this.abortController = new AbortController();
    const startTime = new Date();

    try {
      this.updateProgress({
        phase: ExportPhase.PREPARING,
        percentage: 0,
        current: 0,
        total: 0,
        currentMessage: '準備中...',
        canCancel: true,
        startTime
      });

      this.updateProgress({
        phase: ExportPhase.FETCHING,
        percentage: 10,
        current: 0,
        total: 0,
        currentMessage: 'データ取得中...',
        canCancel: true,
        startTime
      });

      let data;
      try {
        data = await this.storageService.getAll();
        if (this.abortController?.signal.aborted) {
          throw new Error('Export cancelled by user');
        }
      } catch (error) {
        if (error.message === 'Export cancelled by user') {
          throw error;
        }
        throw this.createStorageError(error);
      }
      
      this.updateProgress({
        phase: ExportPhase.FILTERING,
        percentage: 30,
        current: 0,
        total: data.length,
        currentMessage: 'データフィルタリング中...',
        canCancel: true,
        startTime
      });

      let filteredData = data;
      if (options.filters) {
        filteredData = this.applyFilters(data, options.filters);
      }

      this.updateProgress({
        phase: ExportPhase.PROCESSING,
        percentage: 50,
        current: 0,
        total: filteredData.length,
        currentMessage: 'データ処理中...',
        canCancel: true,
        startTime
      });

      this.updateProgress({
        phase: ExportPhase.GENERATING,
        percentage: 80,
        current: filteredData.length,
        total: filteredData.length,
        currentMessage: 'CSV生成中...',
        canCancel: false,
        startTime
      });

      let csvData, blob;
      try {
        csvData = await this.csvService.generateCSV(filteredData, {
          fields: options.fields,
          excludeFields: options.excludeFields,
          format: options.format,
          privacy: options.privacy,
          statusFilter: options.filters?.status,
          dateRange: options.filters?.dateRange
        });

        blob = await this.csvService.generateCSVBlob(filteredData, {
          fields: options.fields,
          excludeFields: options.excludeFields,
          format: options.format,
          privacy: options.privacy
        });
      } catch (error) {
        throw this.createCSVError(error);
      }

      const fileName = this.generateFileName(options);

      this.updateProgress({
        phase: ExportPhase.DOWNLOADING,
        percentage: 90,
        current: filteredData.length,
        total: filteredData.length,
        currentMessage: 'ダウンロード準備中...',
        canCancel: false,
        startTime
      });

      try {
        await this.downloadFile(blob, fileName);
      } catch (error) {
        throw this.createDownloadError(error);
      }

      this.updateProgress({
        phase: ExportPhase.COMPLETED,
        percentage: 100,
        current: filteredData.length,
        total: filteredData.length,
        currentMessage: '完了',
        canCancel: false,
        startTime
      });

      const endTime = new Date();
      const processingTime = endTime.getTime() - startTime.getTime();

      const result: ExportResult = {
        success: true,
        fileName,
        fileSize: blob.size,
        recordCount: filteredData.length,
        filteredCount: filteredData.length,
        processingTime,
        averageSpeed: filteredData.length / (processingTime / 1000),
        timestamp: endTime,
        settings: options,
        errors: [],
        warnings: this.generateWarnings(filteredData, options)
      };

      await this.addToHistory(result);
      this.emitComplete(result);
      return result;

    } catch (error) {
      const exportError = this.handleError(error, ExportPhase.PROCESSING);
      this.emitError(exportError);
      
      const result: ExportResult = {
        success: false,
        fileName: '',
        fileSize: 0,
        recordCount: 0,
        filteredCount: 0,
        processingTime: Date.now() - startTime.getTime(),
        averageSpeed: 0,
        timestamp: new Date(),
        settings: options,
        errors: [exportError],
        warnings: []
      };

      return result;
    } finally {
      this.isExportingFlag = false;
      this.currentProgress = null;
      this.abortController = null;
    }
  }

  async cancelExport(): Promise<void> {
    if (this.abortController) {
      this.abortController.abort();
    }
    this.isExportingFlag = false;
    this.currentProgress = null;
    
    // Emit a cancelled error
    const cancelError: ExportError = {
      code: ExportErrorCode.CANCELLED_BY_USER,
      message: 'エクスポートがキャンセルされました',
      details: null,
      recoverable: true,
      suggestion: '再度エクスポートを実行してください',
      timestamp: new Date(),
      phase: ExportPhase.CANCELLED
    };
    
    this.emitError(cancelError);
  }

  onProgress(callback: (progress: ExportProgress) => void): void {
    this.progressCallbacks.push(callback);
  }

  onComplete(callback: (result: ExportResult) => void): void {
    this.completeCallbacks.push(callback);
  }

  onError(callback: (error: ExportError) => void): void {
    this.errorCallbacks.push(callback);
  }

  removeProgressListener(callback: (progress: ExportProgress) => void): void {
    const index = this.progressCallbacks.indexOf(callback);
    if (index > -1) {
      this.progressCallbacks.splice(index, 1);
    }
  }

  removeCompleteListener(callback: (result: ExportResult) => void): void {
    const index = this.completeCallbacks.indexOf(callback);
    if (index > -1) {
      this.completeCallbacks.splice(index, 1);
    }
  }

  removeErrorListener(callback: (error: ExportError) => void): void {
    const index = this.errorCallbacks.indexOf(callback);
    if (index > -1) {
      this.errorCallbacks.splice(index, 1);
    }
  }

  generateFileName(options: ExportRequestOptions): string {
    const now = new Date();
    const timestamp = now.getTime();
    
    let template = options.fileNameTemplate || 'driving-log-{YYYY-MM-DD}.csv';
    
    const replacements: Record<string, string> = {
      'YYYY': now.getFullYear().toString(),
      'MM': (now.getMonth() + 1).toString().padStart(2, '0'),
      'DD': now.getDate().toString().padStart(2, '0'),
      'HH': now.getHours().toString().padStart(2, '0'),
      'mm': now.getMinutes().toString().padStart(2, '0'),
      'SS': now.getSeconds().toString().padStart(2, '0')
    };

    if (options.filters?.dateRange) {
      const start = options.filters.dateRange.startDate;
      const end = options.filters.dateRange.endDate;
      replacements['START_DATE'] = start.toISOString().split('T')[0];
      replacements['END_DATE'] = end.toISOString().split('T')[0];
      template = template.replace('{YYYY-MM-DD}', '{START_DATE}-{END_DATE}');
    }

    if (options.filters?.status && options.filters.status.length > 0) {
      replacements['STATUS'] = options.filters.status.join('-');
      if (!template.includes('{STATUS}')) {
        template = template.replace('.csv', '-{STATUS}.csv');
      }
    }

    Object.entries(replacements).forEach(([key, value]) => {
      template = template.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    });

    // Add timestamp to make filename unique
    const extension = template.endsWith('.csv') ? '.csv' : '';
    const baseName = template.replace('.csv', '');
    return `${baseName}-${timestamp}${extension}`;
  }

  async downloadFile(blob: Blob, fileName: string): Promise<void> {
    try {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      throw new Error('Download failed');
    }
  }

  isExporting(): boolean {
    return this.isExportingFlag;
  }

  getCurrentProgress(): ExportProgress | null {
    return this.currentProgress;
  }

  async getExportHistory(): Promise<ExportHistoryEntry[]> {
    const history = await this.storageService.get('exportHistory') || [];
    return history;
  }

  private updateProgress(progress: ExportProgress): void {
    this.currentProgress = progress;
    this.progressCallbacks.forEach(callback => callback(progress));
  }

  private emitComplete(result: ExportResult): void {
    this.completeCallbacks.forEach(callback => callback(result));
  }

  private emitError(error: ExportError): void {
    this.errorCallbacks.forEach(callback => callback(error));
  }

  private applyFilters(data: any[], filters: ExportFilters): any[] {
    let filteredData = [...data];

    if (filters.dateRange) {
      filteredData = filteredData.filter(item => {
        const itemDate = new Date(item.date);
        return itemDate >= filters.dateRange!.startDate && itemDate <= filters.dateRange!.endDate;
      });
    }

    if (filters.status && filters.status.length > 0) {
      filteredData = filteredData.filter(item => filters.status!.includes(item.status));
    }

    if (filters.distanceRange) {
      filteredData = filteredData.filter(item => {
        const distance = item.totalDistance || 0;
        return (!filters.distanceRange!.min || distance >= filters.distanceRange!.min) &&
               (!filters.distanceRange!.max || distance <= filters.distanceRange!.max);
      });
    }

    return filteredData;
  }

  private generateWarnings(data: any[], options: ExportRequestOptions): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];

    if (data.length === 0) {
      warnings.push({
        field: 'data',
        message: 'エクスポートするデータがありません',
        suggestion: 'フィルター条件を確認してください'
      });
    }

    if (options.fields?.includes(ExportField.DRIVER_NAME) && !options.privacy?.anonymizeDriverName) {
      warnings.push({
        field: 'privacy',
        message: 'ドライバー名が含まれています',
        suggestion: 'プライバシー設定で匿名化を検討してください'
      });
    }

    if (options.fields?.includes(ExportField.VEHICLE_NUMBER) && !options.privacy?.anonymizeVehicleNumber) {
      warnings.push({
        field: 'privacy',
        message: '車両番号が含まれています',
        suggestion: 'プライバシー設定で匿名化を検討してください'
      });
    }

    return warnings;
  }

  private createStorageError(error: any): Error {
    const newError = new Error('Data fetch failed');
    newError.name = 'DataFetchError';
    return newError;
  }

  private createCSVError(error: any): Error {
    const newError = new Error('CSV generation failed');
    newError.name = 'CSVError';
    return newError;
  }

  private createDownloadError(error: any): Error {
    const newError = new Error('Download failed');
    newError.name = 'DownloadError';
    return newError;
  }

  private handleError(error: any, phase: ExportPhase): ExportError {
    let code: ExportErrorCode;
    let message: string;
    let recoverable = false;
    let suggestion: string | undefined;

    if (error.message?.includes('Data fetch failed') || error.name === 'DataFetchError') {
      code = ExportErrorCode.DATA_FETCH_FAILED;
      message = 'データ取得に失敗しました';
      recoverable = true;
      suggestion = 'しばらく待ってから再試行してください';
    } else if (error.message?.includes('Storage') || error.name === 'StorageError') {
      code = ExportErrorCode.STORAGE_UNAVAILABLE;
      message = 'ストレージにアクセスできません';
      recoverable = true;
      suggestion = 'しばらく待ってから再試行してください';
    } else if (error.message?.includes('CSV generation failed') || error.name === 'CSVError') {
      code = ExportErrorCode.CSV_GENERATION_FAILED;
      message = 'CSV生成に失敗しました';
      recoverable = true;
      suggestion = '設定を確認して再試行してください';
    } else if (error.message?.includes('Download failed') || error.name === 'DownloadError') {
      code = ExportErrorCode.DOWNLOAD_FAILED;
      message = 'ダウンロードに失敗しました';
      recoverable = true;
      suggestion = 'ブラウザの設定を確認してください';
    } else if (error.message?.includes('RangeError') || error.message?.includes('Maximum call stack')) {
      code = ExportErrorCode.MEMORY_INSUFFICIENT;
      message = 'メモリが不足しています';
      recoverable = true;
      suggestion = 'データ量を減らして再試行してください';
    } else {
      code = ExportErrorCode.UNKNOWN_ERROR;
      message = '不明なエラーが発生しました';
      recoverable = false;
    }

    return {
      code,
      message,
      details: error,
      recoverable,
      suggestion,
      timestamp: new Date(),
      phase
    };
  }

  private async addToHistory(result: ExportResult): Promise<void> {
    const history = await this.storageService.get('exportHistory') || [];
    const entry: ExportHistoryEntry = {
      id: `export-${Date.now()}`,
      timestamp: result.timestamp,
      fileName: result.fileName,
      recordCount: result.recordCount,
      fileSize: result.fileSize,
      processingTime: result.processingTime,
      success: result.success,
      settings: result.settings,
      errorMessage: result.errors.length > 0 ? result.errors[0].message : undefined
    };

    history.unshift(entry);
    if (history.length > 100) {
      history.splice(100);
    }

    await this.storageService.save('exportHistory', history);
  }
}