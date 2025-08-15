import { JSX, useState } from 'react';
import { AppSettings } from '../../types';

export interface ProfileSettingsProps {
  settings: AppSettings;
  onSettingChange: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => Promise<void>;
}

export function ProfileSettings({ settings, onSettingChange }: ProfileSettingsProps): JSX.Element {
  const [driverName, setDriverName] = useState(settings.driverName || '');
  const [vehicleInfo, setVehicleInfo] = useState(settings.vehicleInfo || {});

  const handleDriverNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setDriverName(name);
    onSettingChange('driverName', name);
  };

  const handleVehicleInfoChange = (field: string, value: string) => {
    const newVehicleInfo = { ...vehicleInfo, [field]: value };
    setVehicleInfo(newVehicleInfo);
    onSettingChange('vehicleInfo', newVehicleInfo);
  };

  return (
    <div className="profile-settings">
      <h2>プロファイル</h2>

      {/* User Information */}
      <div className="setting-group">
        <h3>ユーザー情報</h3>
        
        <div className="setting-item">
          <label htmlFor="driver-name">ドライバー名</label>
          <input
            id="driver-name"
            type="text"
            value={driverName}
            onChange={handleDriverNameChange}
            placeholder="山田太郎"
          />
        </div>
      </div>

      {/* Vehicle Information */}
      <div className="setting-group">
        <h3>車両情報</h3>
        
        <div className="setting-item">
          <label htmlFor="vehicle-make">メーカー</label>
          <input
            id="vehicle-make"
            type="text"
            value={vehicleInfo.make || ''}
            onChange={(e) => handleVehicleInfoChange('make', e.target.value)}
            placeholder="トヨタ"
          />
        </div>

        <div className="setting-item">
          <label htmlFor="vehicle-model">車種</label>
          <input
            id="vehicle-model"
            type="text"
            value={vehicleInfo.model || ''}
            onChange={(e) => handleVehicleInfoChange('model', e.target.value)}
            placeholder="プリウス"
          />
        </div>

        <div className="setting-item">
          <label htmlFor="vehicle-year">年式</label>
          <input
            id="vehicle-year"
            type="number"
            value={vehicleInfo.year || ''}
            onChange={(e) => handleVehicleInfoChange('year', e.target.value)}
            placeholder="2023"
          />
        </div>

        <div className="setting-item">
          <label htmlFor="license-plate">ナンバープレート</label>
          <input
            id="license-plate"
            type="text"
            value={vehicleInfo.licensePlate || ''}
            onChange={(e) => handleVehicleInfoChange('licensePlate', e.target.value)}
            placeholder="123-4567"
          />
        </div>
      </div>

      {/* Usage Statistics */}
      <div className="setting-group">
        <h3>使用統計</h3>
        
        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-label">アプリ使用開始日:</span>
            <span className="stat-value">{settings.firstLaunchDate.toLocaleDateString('ja-JP')}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">登録地点数:</span>
            <span className="stat-value">{settings.favoriteLocations.length}件</span>
          </div>
        </div>
      </div>
    </div>
  );
}