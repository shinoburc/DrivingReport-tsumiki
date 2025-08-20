import {
  ICSVService,
  CSVExportOptions,
  ExportField,
  FormatOptions,
  PrivacyOptions,
  NumberFormatOptions,
  FieldMapping,
  ProgressInfo,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  CSVProcessingStats,
  CSVExportResult,
  DrivingLogStatus,
  LocationType,
  DateRange,
  NumberRange
} from '../types';
import { DrivingLogModel } from '../models/entities/DrivingLogModel';

/**
 * CSV エクスポートサービス実装
 * 運転日報データのCSV形式への変換を提供
 */
export class CSVService implements ICSVService {
  private fieldMapping: FieldMapping = {};
  private formatOptions: FormatOptions;
  private privacyOptions: PrivacyOptions;

  constructor() {
    // デフォルトフォーマット設定
    this.formatOptions = {
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
    };

    // デフォルトプライバシー設定
    this.privacyOptions = {
      anonymizeDriverName: false,
      anonymizeVehicleNumber: false,
      excludeGPSCoordinates: false,
      maskSensitiveLocations: false,
      coordinatePrecision: 4
    };

    this.initializeDefaultFieldMapping();
  }

  /**
   * CSV文字列の生成
   */
  async generateCSV(data: DrivingLogModel[], options?: CSVExportOptions): Promise<string> {
    this.validateInputs(data, options);
    
    const startTime = Date.now();
    const processedData = await this.processData(data, options);
    
    const csvContent = this.buildCSVContent(processedData, options);
    
    const endTime = Date.now();
    this.reportProgress(100, 100, options?.onProgress, 'finalizing');
    
    return csvContent;
  }

  /**
   * CSV Blobの生成
   */
  async generateCSVBlob(data: DrivingLogModel[], options?: CSVExportOptions): Promise<Blob> {
    const csvString = await this.generateCSV(data, options);
    
    let encodedData: Uint8Array;
    const format = options?.format || this.formatOptions;
    
    // TextEncoder のポリフィル（Jest環境対応）
    const encoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : {
      encode: (str: string) => new Uint8Array(Array.from(str).map(char => char.charCodeAt(0)))
    };
    
    switch (format.encoding) {
      case 'utf-8-bom':
        const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
        const textData = encoder.encode(csvString);
        encodedData = new Uint8Array(bom.length + textData.length);
        encodedData.set(bom);
        encodedData.set(textData, bom.length);
        break;
      case 'shift_jis':
        // Note: Shift_JIS encoding would require additional library
        throw new Error('Shift_JIS encoding not yet implemented');
      default: // utf-8
        encodedData = encoder.encode(csvString);
        break;
    }
    
    return new Blob([encodedData as any], { 
      type: 'text/csv;charset=utf-8' 
    });
  }

  /**
   * ストリーミングCSV生成
   */
  async* generateCSVStream(data: DrivingLogModel[], options?: CSVExportOptions): AsyncGenerator<string> {
    this.validateInputs(data, options);
    
    const processedData = await this.processData(data, options);
    const chunkSize = options?.chunkSize || 100;
    
    // ヘッダーを最初に生成
    const headers = this.getSelectedFields(options);
    const lineEnding = (options?.format || this.formatOptions).lineEnding;
    yield this.formatCSVLine(headers.map(field => this.getFieldHeader(field)), options);
    
    // データを chunk 単位で処理
    for (let i = 0; i < processedData.length; i += chunkSize) {
      const chunk = processedData.slice(i, i + chunkSize);
      const csvLines: string[] = [];
      
      chunk.forEach(record => {
        const values = headers.map(field => this.extractFieldValue(record, field, options));
        csvLines.push(this.formatCSVLine(values, options));
      });
      
      if (csvLines.length > 0) {
        yield lineEnding + csvLines.join(lineEnding);
      }
      
      // プログレス報告
      this.reportProgress(Math.min(i + chunkSize, processedData.length), processedData.length, options?.onProgress, 'processing');
    }
  }

  /**
   * フィールドマッピングの設定
   */
  setFieldMapping(mapping: FieldMapping): void {
    this.fieldMapping = { ...this.fieldMapping, ...mapping };
  }

  /**
   * 利用可能なフィールドの取得
   */
  getAvailableFields(): ExportField[] {
    return Object.values(ExportField);
  }

  /**
   * フォーマットオプションの設定
   */
  setFormatOptions(options: FormatOptions): void {
    this.formatOptions = { ...this.formatOptions, ...options };
  }

  /**
   * フォーマットオプションの取得
   */
  getFormatOptions(): FormatOptions {
    return { ...this.formatOptions };
  }

  /**
   * プライバシーオプションの設定
   */
  setPrivacyOptions(options: PrivacyOptions): void {
    this.privacyOptions = { ...this.privacyOptions, ...options };
  }

  /**
   * データの検証
   */
  validateData(data: DrivingLogModel[]): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!data) {
      errors.push({ field: 'data', message: 'Data is required' });
      return { isValid: false, errors, warnings };
    }

    if (!Array.isArray(data)) {
      errors.push({ field: 'data', message: 'Data must be an array' });
      return { isValid: false, errors, warnings };
    }

    // 各レコードの検証（緩い検証でmalformed dataも処理可能に）
    data.forEach((record, index) => {
      if (!record) {
        warnings.push({ 
          field: `data[${index}]`, 
          message: 'Record is null or undefined and will be skipped',
          suggestion: 'Check data source for missing records'
        });
        return;
      }

      if (!record.id) {
        warnings.push({ 
          field: `data[${index}].id`, 
          message: 'Record ID is missing, using index as fallback',
          suggestion: 'Ensure all records have valid IDs'
        });
      }

      // 日付の検証は警告レベルに変更（malformed dataも処理するため）
      if (!record.date || !(record.date instanceof Date)) {
        warnings.push({ 
          field: `data[${index}].date`, 
          message: 'Invalid or missing date, will use empty value',
          suggestion: 'Validate date format before export'
        });
      }

      if (record.totalDistance !== undefined && (typeof record.totalDistance !== 'number' || record.totalDistance < 0)) {
        warnings.push({ 
          field: `data[${index}].totalDistance`, 
          message: 'Total distance should be a positive number',
          suggestion: 'Consider validating distance values before export'
        });
      }
    });

    return {
      isValid: true, // Always return true to allow processing malformed data
      errors,
      warnings
    };
  }

  /**
   * オプションの検証
   */
  validateOptions(options: CSVExportOptions): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!options) {
      return { isValid: true, errors, warnings };
    }

    // フィールド設定の検証
    if (options.fields) {
      const validFields = this.getAvailableFields();
      options.fields.forEach(field => {
        if (!validFields.includes(field)) {
          errors.push({ field: 'fields', message: `Invalid field: ${field}` });
        }
      });
    }

    // フォーマット設定の検証
    if (options.format) {
      const { format } = options;
      
      if (format.delimiter && ![',', ';', '\t'].includes(format.delimiter)) {
        errors.push({ field: 'format.delimiter', message: 'Invalid delimiter' });
      }

      if (format.encoding && !['utf-8', 'utf-8-bom', 'shift_jis'].includes(format.encoding)) {
        errors.push({ field: 'format.encoding', message: 'Invalid encoding' });
      }

      if (format.numberFormat?.decimalPlaces !== undefined && format.numberFormat.decimalPlaces < 0) {
        errors.push({ field: 'format.numberFormat.decimalPlaces', message: 'Decimal places must be non-negative' });
      }
    }

    // 日付範囲の検証
    if (options.dateRange) {
      if (options.dateRange.startDate >= options.dateRange.endDate) {
        errors.push({ field: 'dateRange', message: 'Start date must be before end date' });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 入力の検証
   */
  private validateInputs(data: DrivingLogModel[], options?: CSVExportOptions): void {
    const dataValidation = this.validateData(data);
    if (!dataValidation.isValid) {
      const error = new Error(`Data validation failed: ${dataValidation.errors.map(e => e.message).join(', ')}`);
      if (options?.onError) {
        options.onError(error);
      }
      throw error;
    }

    if (options) {
      const optionsValidation = this.validateOptions(options);
      if (!optionsValidation.isValid) {
        const error = new Error(`Options validation failed: ${optionsValidation.errors.map(e => e.message).join(', ')}`);
        if (options.onError) {
          options.onError(error);
        }
        throw error;
      }
    }
  }

  /**
   * データの前処理
   */
  private async processData(data: DrivingLogModel[], options?: CSVExportOptions): Promise<DrivingLogModel[]> {
    // null/undefined レコードをフィルタリング
    let processedData = data.filter(record => record != null);

    this.reportProgress(0, data.length, options?.onProgress, 'filtering');

    // フィルタリング適用
    if (options?.dateRange) {
      processedData = this.filterByDateRange(processedData, options.dateRange);
    }

    if (options?.statusFilter) {
      processedData = this.filterByStatus(processedData, options.statusFilter);
    }

    if (options?.distanceRange) {
      processedData = this.filterByDistance(processedData, options.distanceRange);
    }

    this.reportProgress(data.length, data.length, options?.onProgress, 'processing');

    return processedData;
  }

  /**
   * 日付範囲フィルター
   */
  private filterByDateRange(data: DrivingLogModel[], dateRange: DateRange): DrivingLogModel[] {
    return data.filter(record => {
      const recordDate = new Date(record.date);
      return recordDate >= dateRange.startDate && recordDate <= dateRange.endDate;
    });
  }

  /**
   * ステータスフィルター
   */
  private filterByStatus(data: DrivingLogModel[], statusFilter: DrivingLogStatus[]): DrivingLogModel[] {
    return data.filter(record => statusFilter.includes(record.status));
  }

  /**
   * 距離範囲フィルター
   */
  private filterByDistance(data: DrivingLogModel[], distanceRange: NumberRange): DrivingLogModel[] {
    return data.filter(record => {
      const distance = record.totalDistance || 0;
      const min = distanceRange.min || 0;
      const max = distanceRange.max || Number.MAX_VALUE;
      return distance >= min && distance <= max;
    });
  }

  /**
   * CSV content の構築
   */
  private buildCSVContent(data: DrivingLogModel[], options?: CSVExportOptions): string {
    const selectedFields = this.getSelectedFields(options);
    const lines: string[] = [];

    // ヘッダー行
    const headers = selectedFields.map(field => this.getFieldHeader(field));
    lines.push(this.formatCSVLine(headers, options));

    // データ行
    data.forEach(record => {
      const values = selectedFields.map(field => this.extractFieldValue(record, field, options));
      lines.push(this.formatCSVLine(values, options));
    });

    return lines.join((options?.format || this.formatOptions).lineEnding);
  }

  /**
   * 選択されたフィールドの取得
   */
  private getSelectedFields(options?: CSVExportOptions): ExportField[] {
    let fields = this.getAvailableFields();

    // フィールド選択
    if (options?.fields) {
      fields = options.fields;
    }

    // フィールド除外
    if (options?.excludeFields) {
      fields = fields.filter(field => !options.excludeFields!.includes(field));
    }

    // プライバシー設定による除外
    const privacy = options?.privacy || this.privacyOptions;
    if (privacy.excludeGPSCoordinates) {
      fields = fields.filter(field => 
        ![ExportField.START_LOCATION_LATITUDE, ExportField.START_LOCATION_LONGITUDE,
          ExportField.END_LOCATION_LATITUDE, ExportField.END_LOCATION_LONGITUDE].includes(field)
      );
    }

    return fields;
  }

  /**
   * フィールドヘッダーの取得
   */
  private getFieldHeader(field: ExportField): string {
    if (this.fieldMapping[field]?.header) {
      return this.fieldMapping[field].header;
    }

    // デフォルトヘッダー
    const headerMap: Record<ExportField, string> = {
      [ExportField.ID]: 'id',
      [ExportField.DATE]: 'date',
      [ExportField.START_TIME]: 'startTime',
      [ExportField.END_TIME]: 'endTime',
      [ExportField.DRIVER_NAME]: 'driverName',
      [ExportField.VEHICLE_NUMBER]: 'vehicleNumber',
      [ExportField.START_LOCATION_NAME]: 'startLocationName',
      [ExportField.START_LOCATION_ADDRESS]: 'startLocationAddress',
      [ExportField.START_LOCATION_LATITUDE]: 'startLocationLatitude',
      [ExportField.START_LOCATION_LONGITUDE]: 'startLocationLongitude',
      [ExportField.END_LOCATION_NAME]: 'endLocationName',
      [ExportField.END_LOCATION_ADDRESS]: 'endLocationAddress',
      [ExportField.END_LOCATION_LATITUDE]: 'endLocationLatitude',
      [ExportField.END_LOCATION_LONGITUDE]: 'endLocationLongitude',
      [ExportField.WAYPOINTS]: 'waypoints',
      [ExportField.TOTAL_DISTANCE]: 'totalDistance',
      [ExportField.DURATION]: 'duration',
      [ExportField.PURPOSE]: 'purpose',
      [ExportField.MEMO]: 'memo',
      [ExportField.STATUS]: 'status',
      [ExportField.CREATED_AT]: 'createdAt',
      [ExportField.UPDATED_AT]: 'updatedAt'
    };

    return headerMap[field] || field;
  }

  /**
   * フィールド値の抽出
   */
  private extractFieldValue(record: DrivingLogModel, field: ExportField, options?: CSVExportOptions): string {
    // null/undefined record の処理
    if (!record) {
      return '';
    }

    // カスタムアクセサーがある場合
    if (this.fieldMapping[field]?.accessor) {
      const accessor = this.fieldMapping[field].accessor;
      let value;
      
      if (typeof accessor === 'function') {
        value = accessor(record);
      } else {
        value = (record as any)[accessor];
      }
      
      // カスタムフォーマッターがある場合
      if (this.fieldMapping[field]?.formatter) {
        return this.fieldMapping[field].formatter!(value);
      }
      
      return this.formatValue(value, field, options);
    }

    // デフォルト値抽出
    let value: any;
    
    switch (field) {
      case ExportField.ID:
        value = record.id;
        break;
      case ExportField.DATE:
        value = record.date;
        break;
      case ExportField.START_TIME:
        value = (record as any).startTime;
        break;
      case ExportField.END_TIME:
        value = (record as any).endTime;
        break;
      case ExportField.DRIVER_NAME:
        value = this.applyPrivacyMask((record as any).driverName, 'driverName', options);
        break;
      case ExportField.VEHICLE_NUMBER:
        value = this.applyPrivacyMask((record as any).vehicleNumber, 'vehicleNumber', options);
        break;
      case ExportField.START_LOCATION_NAME:
        value = record.startLocation?.name;
        break;
      case ExportField.START_LOCATION_ADDRESS:
        value = record.startLocation?.address;
        break;
      case ExportField.START_LOCATION_LATITUDE:
        value = this.formatCoordinate(record.startLocation?.latitude, options);
        break;
      case ExportField.START_LOCATION_LONGITUDE:
        value = this.formatCoordinate(record.startLocation?.longitude, options);
        break;
      case ExportField.END_LOCATION_NAME:
        value = record.endLocation?.name;
        break;
      case ExportField.END_LOCATION_ADDRESS:
        value = record.endLocation?.address;
        break;
      case ExportField.END_LOCATION_LATITUDE:
        value = this.formatCoordinate(record.endLocation?.latitude, options);
        break;
      case ExportField.END_LOCATION_LONGITUDE:
        value = this.formatCoordinate(record.endLocation?.longitude, options);
        break;
      case ExportField.WAYPOINTS:
        value = record.waypoints ? record.waypoints.map(w => w.name || '').join('; ') : '';
        break;
      case ExportField.TOTAL_DISTANCE:
        value = record.totalDistance;
        break;
      case ExportField.DURATION:
        value = (record as any).duration;
        break;
      case ExportField.PURPOSE:
        value = (record as any).purpose;
        break;
      case ExportField.MEMO:
        value = (record as any).memo;
        break;
      case ExportField.STATUS:
        value = record.status;
        break;
      case ExportField.CREATED_AT:
        value = record.createdAt;
        break;
      case ExportField.UPDATED_AT:
        value = record.updatedAt;
        break;
      default:
        value = '';
    }

    return this.formatValue(value, field, options);
  }

  /**
   * 値のフォーマット
   */
  private formatValue(value: any, field: ExportField, options?: CSVExportOptions): string {
    if (value === null || value === undefined) {
      return '';
    }

    // 日付フィールドの処理
    if (value instanceof Date) {
      if (field === ExportField.DATE) {
        return this.formatDate(value, options);
      } else if (field === ExportField.START_TIME || field === ExportField.END_TIME) {
        return this.formatTime(value, options);
      } else {
        return this.formatDateTime(value, options);
      }
    }

    // 数値フィールドの処理
    if (typeof value === 'number') {
      if (field === ExportField.TOTAL_DISTANCE) {
        return this.formatDistance(value, options);
      } else if (field === ExportField.DURATION) {
        return this.formatDuration(value, options);
      } else {
        return this.formatNumber(value, options);
      }
    }

    // 文字列の処理
    return String(value);
  }

  /**
   * プライバシーマスクの適用
   */
  private applyPrivacyMask(value: string, type: 'driverName' | 'vehicleNumber', options?: CSVExportOptions): string {
    if (!value) return '';

    const privacy = options?.privacy || this.privacyOptions;

    if (type === 'driverName' && privacy.anonymizeDriverName) {
      // "田中太郎" → "田中***"
      if (value.length > 2) {
        return value.substring(0, 2) + '***';
      } else if (value.length > 1) {
        return value.charAt(0) + '***';
      }
      return '***';
    }

    if (type === 'vehicleNumber' && privacy.anonymizeVehicleNumber) {
      // "品川123あ4567" → "***123***4567"
      const match = value.match(/^(.*)(\d{3,})(.*)(\d{3,})(.*)$/);
      if (match) {
        return `***${match[2]}***${match[4]}`;
      }
      // Fallback for simpler patterns
      const simpleMatch = value.match(/(\d+)/g);
      if (simpleMatch && simpleMatch.length >= 1) {
        return `***${simpleMatch[0]}***${simpleMatch[simpleMatch.length - 1] || ''}`;
      }
      return '***' + value.slice(-3);
    }

    return value;
  }

  /**
   * 座標のフォーマット
   */
  private formatCoordinate(coordinate?: number, options?: CSVExportOptions): string {
    if (coordinate === undefined) return '';

    const privacy = options?.privacy || this.privacyOptions;
    const precision = privacy.coordinatePrecision;
    return coordinate.toFixed(precision);
  }

  /**
   * 日付のフォーマット
   */
  private formatDate(date: Date, options?: CSVExportOptions): string {
    const format = options?.format?.dateFormat || this.formatOptions.dateFormat;
    
    switch (format) {
      case 'YYYY/MM/DD':
        return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
      case 'DD/MM/YYYY':
        return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
      default: // 'YYYY-MM-DD'
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }
  }

  /**
   * 時刻のフォーマット
   */
  private formatTime(date: Date, options?: CSVExportOptions): string {
    const format = options?.format?.timeFormat || this.formatOptions.timeFormat;
    
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    switch (format) {
      case 'HH:mm:ss':
        return `${hours}:${minutes}:${seconds}`;
      default: // 'HH:mm'
        return `${hours}:${minutes}`;
    }
  }

  /**
   * 日時のフォーマット
   */
  private formatDateTime(date: Date, options?: CSVExportOptions): string {
    return `${this.formatDate(date, options)} ${this.formatTime(date, options)}`;
  }

  /**
   * 距離のフォーマット
   */
  private formatDistance(distance: number, options?: CSVExportOptions): string {
    const numberFormat = options?.format?.numberFormat || this.formatOptions.numberFormat;
    let value = distance;

    // 単位変換
    switch (numberFormat.distanceUnit) {
      case 'm':
        value = distance * 1000;
        break;
      case 'mile':
        value = distance * 0.621371;
        break;
      // 'km' is default, no conversion needed
    }

    return this.formatNumber(value, options);
  }

  /**
   * 時間のフォーマット
   */
  private formatDuration(duration: number, options?: CSVExportOptions): string {
    const numberFormat = options?.format?.numberFormat || this.formatOptions.numberFormat;
    let value = duration;

    // 単位変換（入力は分単位）
    switch (numberFormat.durationUnit) {
      case 'hours':
        value = duration / 60;
        break;
      case 'seconds':
        value = duration * 60;
        break;
      // 'minutes' is default, no conversion needed
    }

    return this.formatNumber(value, options);
  }

  /**
   * 数値のフォーマット
   */
  private formatNumber(value: number, options?: CSVExportOptions): string {
    const numberFormat = options?.format?.numberFormat || this.formatOptions.numberFormat;
    
    // 小数点桁数の調整
    const rounded = Number(value.toFixed(numberFormat.decimalPlaces));
    
    if (numberFormat.thousandSeparator) {
      return rounded.toLocaleString('en-US', {
        minimumFractionDigits: numberFormat.decimalPlaces,
        maximumFractionDigits: numberFormat.decimalPlaces
      });
    }
    
    return rounded.toFixed(numberFormat.decimalPlaces);
  }

  /**
   * CSV行のフォーマット
   */
  private formatCSVLine(values: string[], options?: CSVExportOptions): string {
    const format = options?.format || this.formatOptions;
    const delimiter = format.delimiter;
    const quote = format.quote;

    const processedValues = values.map(value => {
      let processedValue = String(value || '');

      // クォート処理
      if (quote === 'all' || 
          (quote === 'minimal' && this.needsQuoting(processedValue, delimiter))) {
        
        // 既存のダブルクォートをエスケープ
        processedValue = processedValue.replace(/"/g, '""');
        processedValue = `"${processedValue}"`;
      }

      return processedValue;
    });

    return processedValues.join(delimiter);
  }

  /**
   * クォートが必要かどうかの判定
   */
  private needsQuoting(value: string, delimiter: string): boolean {
    return value.includes(delimiter) || 
           value.includes('"') || 
           value.includes('\n') || 
           value.includes('\r');
  }

  /**
   * プログレス報告
   */
  private reportProgress(
    current: number, 
    total: number, 
    onProgress?: (progress: ProgressInfo) => void,
    currentPhase: ProgressInfo['currentPhase'] = 'processing'
  ): void {
    if (onProgress) {
      const percentage = total > 0 ? Math.round((current / total) * 100) : 100;
      onProgress({
        current,
        total,
        percentage,
        currentPhase
      });
    }
  }

  /**
   * デフォルトフィールドマッピングの初期化
   */
  private initializeDefaultFieldMapping(): void {
    // デフォルトのフィールドマッピングを設定
    // 必要に応じて拡張可能
  }
}