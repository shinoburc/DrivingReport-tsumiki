import { CachePolicy, EncryptedData, PrivacySettings, ExportOptions } from './types';

export class PrivacyManager {
  private encryptionKey: CryptoKey | null = null;

  constructor() {
    this.initializeEncryption();
  }

  async getCachePolicy(data: any): Promise<CachePolicy> {
    const personalFields = [
      'driverName', 'name', 'email', 'phone', 'address',
      'licenseNumber', 'personalInfo', 'phoneNumber'
    ];

    const dataString = JSON.stringify(data).toLowerCase();
    const containsPersonalInfo = personalFields.some(field =>
      dataString.includes(field.toLowerCase())
    );

    if (containsPersonalInfo) {
      return {
        allowed: false,
        reason: 'Contains personal information - not suitable for caching'
      };
    }

    return {
      allowed: true,
      duration: 24 * 60 * 60 * 1000, // 24 hours default
    };
  }

  async getLocationCacheExpiry(locationData: any): Promise<number> {
    // Location data has shorter cache duration for privacy
    const baseExpiry = 24 * 60 * 60 * 1000; // 24 hours
    
    // If high precision location, shorter expiry
    if (locationData.accuracy && locationData.accuracy < 10) {
      return 6 * 60 * 60 * 1000; // 6 hours for high precision
    }

    return baseExpiry;
  }

  async encryptUserData(userData: any): Promise<EncryptedData> {
    if (!this.encryptionKey) {
      await this.initializeEncryption();
    }

    const dataString = JSON.stringify(userData);
    const encoder = new TextEncoder();
    const data = encoder.encode(dataString);

    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const encryptedData = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      this.encryptionKey!,
      data
    );

    return {
      encryptedData,
      iv: iv.buffer,
      keyId: 'user-data-key',
    };
  }

  async decryptUserData(encryptedData: EncryptedData): Promise<any> {
    if (!this.encryptionKey) {
      await this.initializeEncryption();
    }

    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: encryptedData.iv },
      this.encryptionKey!,
      encryptedData.encryptedData
    );

    const decoder = new TextDecoder();
    const dataString = decoder.decode(decryptedBuffer);
    return JSON.parse(dataString);
  }

  async anonymizeForAnalytics(drivingLog: any): Promise<any> {
    const anonymized = { ...drivingLog };

    // Remove personally identifiable information
    delete anonymized.driverName;
    delete anonymized.userToken;
    delete anonymized.personalInfo;

    // Remove location names but keep coordinates for analytics
    if (anonymized.startLocation) {
      delete anonymized.startLocation.name;
      delete anonymized.startLocation.address;
    }

    if (anonymized.endLocation) {
      delete anonymized.endLocation.name;
      delete anonymized.endLocation.address;
    }

    // Keep only statistical data
    const allowedFields = [
      'duration', 'distance', 'averageSpeed', 'maxSpeed',
      'fuelEfficiency', 'route', 'weather', 'trafficCondition'
    ];

    const result: any = {};
    allowedFields.forEach(field => {
      if (field in anonymized) {
        result[field] = anonymized[field];
      }
    });

    return result;
  }

  async approximateLocation(location: any, privacyLevel: string): Promise<any> {
    const approximated = { ...location };

    switch (privacyLevel) {
      case 'minimal':
        // Round to 3 decimal places (~100m precision)
        approximated.latitude = Math.round(location.latitude * 1000) / 1000;
        approximated.longitude = Math.round(location.longitude * 1000) / 1000;
        break;
      case 'approximate':
        // Round to 2 decimal places (~1km precision)
        approximated.latitude = Math.round(location.latitude * 100) / 100;
        approximated.longitude = Math.round(location.longitude * 100) / 100;
        break;
      default:
        // Keep full precision for 'full' privacy level
        break;
    }

    return approximated;
  }

  async shouldRetainData(data: any): Promise<boolean> {
    const now = Date.now();
    const dataAge = now - data.timestamp;
    
    // Default retention periods by data type
    const retentionPolicies = {
      'location-history': 30 * 24 * 60 * 60 * 1000, // 30 days
      'driving-log': 365 * 24 * 60 * 60 * 1000, // 1 year
      'settings': Infinity, // Keep indefinitely
      'analytics': 90 * 24 * 60 * 60 * 1000, // 90 days
    };

    const retentionPeriod = retentionPolicies[data.type] || 
                           retentionPolicies['driving-log'];

    return dataAge < retentionPeriod;
  }

  async setUserConsent(consent: PrivacySettings): Promise<void> {
    localStorage.setItem('user-consent', JSON.stringify(consent));
  }

  async getUserConsent(): Promise<PrivacySettings> {
    const stored = localStorage.getItem('user-consent');
    return stored ? JSON.parse(stored) : {
      location: false,
      'driving-patterns': false,
      'device-info': false,
    };
  }

  async canCollectData(dataType: keyof PrivacySettings): Promise<boolean> {
    const consent = await this.getUserConsent();
    return consent[dataType] === true;
  }

  async exportUserData(userData: any, options: ExportOptions): Promise<any> {
    let exportData = JSON.parse(JSON.stringify(userData)); // Deep clone

    if (!options.includePersonalInfo) {
      // Remove personal information
      this.removePersonalInfo(exportData);
    }

    if (options.anonymizeLocations) {
      // Anonymize location data
      exportData = await this.anonymizeLocations(exportData, options.privacyLevel);
    }

    // Apply date range filter if specified
    if (options.dateRange) {
      exportData = this.filterByDateRange(exportData, options.dateRange);
    }

    return exportData;
  }

  async cleanupExpiredData(): Promise<void> {
    // This would typically interact with IndexedDB
    const dataTypes = ['location-history', 'analytics', 'temporary-cache'];
    
    for (const dataType of dataTypes) {
      const storageKey = `privacy-${dataType}`;
      const storedData = localStorage.getItem(storageKey);
      
      if (storedData) {
        try {
          const data = JSON.parse(storedData);
          const filteredData = data.filter((item: any) => 
            this.shouldRetainData({ ...item, type: dataType })
          );
          
          if (filteredData.length !== data.length) {
            localStorage.setItem(storageKey, JSON.stringify(filteredData));
          }
        } catch (error) {
          console.error(`Error cleaning up ${dataType}:`, error);
        }
      }
    }
  }

  async getDataInventory(): Promise<any> {
    return {
      personalData: this.getPersonalDataInventory(),
      locationData: this.getLocationDataInventory(),
      analyticsData: this.getAnalyticsDataInventory(),
      retentionPolicies: this.getRetentionPolicies(),
    };
  }

  private async initializeEncryption(): Promise<void> {
    try {
      // Generate or retrieve encryption key
      const keyData = localStorage.getItem('encryption-key');
      
      if (keyData) {
        // Import existing key
        const keyBuffer = this.base64ToArrayBuffer(keyData);
        this.encryptionKey = await crypto.subtle.importKey(
          'raw',
          keyBuffer,
          { name: 'AES-GCM' },
          false,
          ['encrypt', 'decrypt']
        );
      } else {
        // Generate new key
        this.encryptionKey = await crypto.subtle.generateKey(
          { name: 'AES-GCM', length: 256 },
          true,
          ['encrypt', 'decrypt']
        );

        // Store key for future use
        const exportedKey = await crypto.subtle.exportKey('raw', this.encryptionKey);
        const keyBase64 = this.arrayBufferToBase64(exportedKey);
        localStorage.setItem('encryption-key', keyBase64);
      }
    } catch (error) {
      console.error('Failed to initialize encryption:', error);
      throw new Error('Encryption initialization failed');
    }
  }

  private removePersonalInfo(data: any): void {
    const personalFields = [
      'driverName', 'name', 'email', 'phone', 'address',
      'licenseNumber', 'personalInfo', 'phoneNumber'
    ];

    const removeFromObject = (obj: any) => {
      if (Array.isArray(obj)) {
        obj.forEach(removeFromObject);
      } else if (obj && typeof obj === 'object') {
        personalFields.forEach(field => {
          delete obj[field];
        });
        Object.values(obj).forEach(removeFromObject);
      }
    };

    removeFromObject(data);
  }

  private async anonymizeLocations(data: any, privacyLevel: string): Promise<any> {
    const anonymizeObject = async (obj: any): Promise<any> => {
      if (Array.isArray(obj)) {
        return Promise.all(obj.map(anonymizeObject));
      } else if (obj && typeof obj === 'object') {
        const result: any = {};
        
        for (const [key, value] of Object.entries(obj)) {
          if (key.includes('location') || key.includes('Location')) {
            if (value && typeof value === 'object' && 'latitude' in value && 'longitude' in value) {
              result[key] = await this.approximateLocation(value, privacyLevel);
            } else {
              result[key] = value;
            }
          } else {
            result[key] = await anonymizeObject(value);
          }
        }
        
        return result;
      }
      
      return obj;
    };

    return anonymizeObject(data);
  }

  private filterByDateRange(data: any, dateRange: { start: Date; end: Date }): any {
    const filterObject = (obj: any): any => {
      if (Array.isArray(obj)) {
        return obj
          .filter(item => {
            if (item.timestamp) {
              const itemDate = new Date(item.timestamp);
              return itemDate >= dateRange.start && itemDate <= dateRange.end;
            }
            return true;
          })
          .map(filterObject);
      } else if (obj && typeof obj === 'object') {
        const result: any = {};
        for (const [key, value] of Object.entries(obj)) {
          result[key] = filterObject(value);
        }
        return result;
      }
      return obj;
    };

    return filterObject(data);
  }

  private getPersonalDataInventory(): any {
    return {
      driverProfiles: 'User names, vehicle information',
      favoriteLocations: 'Location names and addresses',
      settings: 'User preferences and configurations',
    };
  }

  private getLocationDataInventory(): any {
    return {
      drivingLogs: 'Start/end coordinates and timestamps',
      routes: 'GPS tracks and waypoints',
      favoriteLocations: 'Saved location coordinates',
    };
  }

  private getAnalyticsDataInventory(): any {
    return {
      usageStatistics: 'App usage patterns (anonymized)',
      performanceMetrics: 'Response times and error rates',
      aggregatedData: 'Statistical summaries (no personal data)',
    };
  }

  private getRetentionPolicies(): any {
    return {
      locationHistory: '30 days',
      drivingLogs: '1 year',
      settings: 'Until user deletion',
      analytics: '90 days',
      crashLogs: '30 days',
    };
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}