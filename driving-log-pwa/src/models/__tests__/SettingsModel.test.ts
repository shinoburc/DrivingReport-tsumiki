import { SettingsModel } from '../entities/SettingsModel';
import { ExportFormat, AppError, ErrorCode } from '../../types';
import type { FavoriteLocation } from '../../types';

describe('SettingsModel', () => {
  describe('デフォルト設定', () => {
    test('UC-007: デフォルト設定でのインスタンス作成', () => {
      const settings = SettingsModel.createDefault();

      expect(settings.language).toBe('ja');
      expect(settings.gpsTimeout).toBe(10);
      expect(settings.autoExportEnabled).toBe(false);
      expect(settings.exportFormat).toBe(ExportFormat.CSV);
      expect(settings.theme).toBe('auto');
      expect(settings.favoriteLocations).toEqual([]);
      expect(Array.isArray(settings.favoriteLocations)).toBe(true);
    });
  });

  describe('カスタム設定作成', () => {
    test('部分的な設定でのインスタンス作成', () => {
      const customSettings = {
        language: 'en' as const,
        gpsTimeout: 15,
        theme: 'dark' as const
      };

      const settings = SettingsModel.create(customSettings);

      expect(settings.language).toBe('en');
      expect(settings.gpsTimeout).toBe(15);
      expect(settings.theme).toBe('dark');
      // デフォルト値が設定される
      expect(settings.autoExportEnabled).toBe(false);
      expect(settings.exportFormat).toBe(ExportFormat.CSV);
    });

    test('完全な設定でのインスタンス作成', () => {
      const favoriteLocation: FavoriteLocation = {
        id: 'fav-001',
        name: '本社',
        address: '東京都千代田区',
        latitude: 35.6762,
        longitude: 139.6503
      };

      const fullSettings = {
        language: 'en' as const,
        gpsTimeout: 20,
        autoExportEnabled: true,
        exportFormat: ExportFormat.JSON,
        favoriteLocations: [favoriteLocation],
        theme: 'light' as const
      };

      const settings = SettingsModel.create(fullSettings);

      expect(settings.language).toBe('en');
      expect(settings.gpsTimeout).toBe(20);
      expect(settings.autoExportEnabled).toBe(true);
      expect(settings.exportFormat).toBe(ExportFormat.JSON);
      expect(settings.favoriteLocations).toHaveLength(1);
      expect(settings.favoriteLocations[0]).toEqual(favoriteLocation);
      expect(settings.theme).toBe('light');
    });
  });

  describe('設定更新', () => {
    test('UC-007: 部分的な設定更新', () => {
      const originalSettings = SettingsModel.createDefault();
      
      const updates = {
        language: 'en' as const,
        gpsTimeout: 15,
        theme: 'dark' as const
      };

      const updatedSettings = originalSettings.update(updates);

      expect(updatedSettings.language).toBe('en');
      expect(updatedSettings.gpsTimeout).toBe(15);
      expect(updatedSettings.theme).toBe('dark');
      // 他の設定は保持される
      expect(updatedSettings.autoExportEnabled).toBe(false);
      expect(updatedSettings.exportFormat).toBe(ExportFormat.CSV);
      expect(updatedSettings.favoriteLocations).toEqual([]);
      
      // Immutability確認
      expect(originalSettings.language).toBe('ja');
      expect(originalSettings.gpsTimeout).toBe(10);
      expect(originalSettings.theme).toBe('auto');
    });
  });

  describe('お気に入り地点管理', () => {
    test('UC-008: お気に入り地点の追加', () => {
      const settings = SettingsModel.createDefault();
      
      const favoriteLocation: FavoriteLocation = {
        id: 'fav-001',
        name: '本社',
        address: '東京都千代田区',
        latitude: 35.6762,
        longitude: 139.6503
      };

      const updatedSettings = settings.addFavoriteLocation(favoriteLocation);

      expect(updatedSettings.favoriteLocations).toHaveLength(1);
      expect(updatedSettings.favoriteLocations[0]).toEqual(favoriteLocation);
      
      // 元の設定は変更されない
      expect(settings.favoriteLocations).toHaveLength(0);
    });

    test('UC-008: 複数のお気に入り地点追加', () => {
      let settings = SettingsModel.createDefault();
      
      const locations: FavoriteLocation[] = [
        { id: 'fav-001', name: '本社', latitude: 35.6762, longitude: 139.6503 },
        { id: 'fav-002', name: '支社', latitude: 35.6895, longitude: 139.6917 },
        { id: 'fav-003', name: '営業所', latitude: 35.6586, longitude: 139.7454 }
      ];

      locations.forEach(location => {
        settings = settings.addFavoriteLocation(location);
      });

      expect(settings.favoriteLocations).toHaveLength(3);
      expect(settings.favoriteLocations.map(loc => loc.id))
        .toEqual(['fav-001', 'fav-002', 'fav-003']);
    });

    test('UC-008: お気に入り地点の削除', () => {
      const favoriteLocation: FavoriteLocation = {
        id: 'fav-001',
        name: '本社',
        address: '東京都千代田区',
        latitude: 35.6762,
        longitude: 139.6503
      };

      const settingsWithFavorite = SettingsModel.createDefault()
        .addFavoriteLocation(favoriteLocation);
      
      expect(settingsWithFavorite.favoriteLocations).toHaveLength(1);
      
      const removedSettings = settingsWithFavorite.removeFavoriteLocation('fav-001');
      expect(removedSettings.favoriteLocations).toHaveLength(0);
    });

    test('存在しないお気に入り地点の削除', () => {
      const settings = SettingsModel.createDefault();
      
      const result = settings.removeFavoriteLocation('non-existent');
      expect(result.favoriteLocations).toHaveLength(0);
      expect(result).toBe(settings); // 変更なしなので同じインスタンス
    });

    test('重複するお気に入り地点の追加防止', () => {
      const favoriteLocation: FavoriteLocation = {
        id: 'fav-001',
        name: '本社',
        latitude: 35.6762,
        longitude: 139.6503
      };

      const settings = SettingsModel.createDefault()
        .addFavoriteLocation(favoriteLocation);
      
      // 同じIDで再度追加
      const duplicateLocation: FavoriteLocation = {
        id: 'fav-001',
        name: '更新された本社',
        latitude: 35.6000,
        longitude: 139.6000
      };

      const updatedSettings = settings.addFavoriteLocation(duplicateLocation);
      
      expect(updatedSettings.favoriteLocations).toHaveLength(1);
      // 既存のものが更新される
      expect(updatedSettings.favoriteLocations[0].name).toBe('更新された本社');
    });
  });

  describe('バリデーション', () => {
    test('VT-003: 無効なGPSタイムアウト値', () => {
      const invalidTimeouts = [-1, 0, 301]; // 負数、0、上限超過

      invalidTimeouts.forEach(timeout => {
        expect(() => SettingsModel.createDefault().update({
          gpsTimeout: timeout
        })).toThrow();
      });
    });

    test('無効な言語設定', () => {
      expect(() => SettingsModel.create({
        language: 'invalid' as any
      })).toThrow();
    });

    test('無効なテーマ設定', () => {
      expect(() => SettingsModel.create({
        theme: 'invalid' as any
      })).toThrow();
    });

    test('無効なエクスポート形式', () => {
      expect(() => SettingsModel.create({
        exportFormat: 'invalid' as any
      })).toThrow();
    });
  });

  describe('データ変換', () => {
    test('JSON形式への変換', () => {
      const favoriteLocation: FavoriteLocation = {
        id: 'fav-001',
        name: '本社',
        latitude: 35.6762,
        longitude: 139.6503
      };

      const settings = SettingsModel.create({
        language: 'en' as const,
        gpsTimeout: 15,
        autoExportEnabled: true,
        favoriteLocations: [favoriteLocation]
      });

      const json = settings.toJSON();

      expect(json.language).toBe('en');
      expect(json.gpsTimeout).toBe(15);
      expect(json.autoExportEnabled).toBe(true);
      expect(Array.isArray(json.favoriteLocations)).toBe(true);
      expect(json.favoriteLocations[0]).toEqual(favoriteLocation);
    });

    test('JSON形式からの変換', () => {
      const jsonData = {
        language: 'en',
        gpsTimeout: 20,
        autoExportEnabled: false,
        exportFormat: 'JSON',
        favoriteLocations: [
          { id: 'fav-001', name: '本社', latitude: 35.6762, longitude: 139.6503 }
        ],
        theme: 'light'
      };

      const settings = SettingsModel.fromJSON(jsonData);

      expect(settings.language).toBe('en');
      expect(settings.gpsTimeout).toBe(20);
      expect(settings.autoExportEnabled).toBe(false);
      expect(settings.exportFormat).toBe(ExportFormat.JSON);
      expect(settings.favoriteLocations).toHaveLength(1);
      expect(settings.theme).toBe('light');
    });
  });

  describe('不変性（Immutability）', () => {
    test('インスタンスが不変であることを確認', () => {
      const settings = SettingsModel.createDefault();

      expect(() => {
        (settings as any).language = 'en';
      }).toThrow();

      expect(() => {
        (settings as any).favoriteLocations.push({
          id: 'test', name: 'test'
        });
      }).toThrow();
    });
  });

  describe('エラーハンドリング', () => {
    test('EH-002: 不完全なお気に入り地点データの処理', () => {
      const incompleteLocation = {
        id: 'fav-001',
        name: '不完全な地点'
        // address, latitude, longitudeなし
      } as FavoriteLocation;

      const settings = SettingsModel.createDefault();
      const updatedSettings = settings.addFavoriteLocation(incompleteLocation);

      expect(updatedSettings.favoriteLocations).toHaveLength(1);
      expect(updatedSettings.favoriteLocations[0].name).toBe('不完全な地点');
      expect(updatedSettings.favoriteLocations[0].address).toBeUndefined();
    });

    test('nullやundefinedの処理', () => {
      expect(() => SettingsModel.create({
        language: null as any
      })).toThrow();

      expect(() => SettingsModel.create({
        gpsTimeout: undefined as any
      })).toThrow();
    });
  });
});