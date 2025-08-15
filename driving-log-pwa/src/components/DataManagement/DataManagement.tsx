import { JSX, useState } from 'react';
import { AppSettings } from '../../types';
import { createButtonProps } from '../../utils/accessibility';

export interface DataManagementProps {
  settings: AppSettings;
  onExportSettings: () => string;
  onImportSettings: (data: string) => Promise<void>;
  onResetAllData: () => Promise<void>;
}

export function DataManagement({ 
  settings, 
  onExportSettings, 
  onImportSettings, 
  onResetAllData 
}: DataManagementProps): JSX.Element {
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleExportData = () => {
    try {
      const data = onExportSettings();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `settings-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export data:', error);
    }
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const data = event.target?.result as string;
          await onImportSettings(data);
          alert('設定を復元しました');
        } catch (error) {
          console.error('Failed to import data:', error);
          alert('設定の復元に失敗しました');
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="data-management">
      <h2>データ管理</h2>

      {/* Statistics */}
      <div className="setting-group">
        <h3>データ統計</h3>
        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-label">よく使う地点数:</span>
            <span className="stat-value">{settings.favoriteLocations.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">アプリ使用開始日:</span>
            <span className="stat-value">{settings.firstLaunchDate.toLocaleDateString('ja-JP')}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">最終バックアップ:</span>
            <span className="stat-value">
              {settings.lastBackupDate?.toLocaleDateString('ja-JP') || '未実行'}
            </span>
          </div>
        </div>
      </div>

      {/* Backup & Restore */}
      <div className="setting-group">
        <h3>バックアップと復元</h3>
        
        <div className="backup-actions">
          <button
            onClick={handleExportData}
            className="export-button"
            {...createButtonProps('設定をバックアップ')}
          >
            設定をバックアップ
          </button>
          
          <label className="import-button">
            <input
              type="file"
              accept=".json"
              onChange={handleImportData}
              style={{ display: 'none' }}
            />
            設定を復元
          </label>
        </div>
      </div>

      {/* Data Reset */}
      <div className="setting-group danger">
        <h3>データ削除</h3>
        <p>すべての設定とデータを削除します。この操作は取り消せません。</p>
        
        <button
          onClick={() => setShowResetConfirm(true)}
          className="danger-button"
          {...createButtonProps('すべてのデータを削除')}
        >
          すべてのデータを削除
        </button>
      </div>

      {/* Reset Confirmation */}
      {showResetConfirm && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-content">
            <h3>すべてのデータを削除しますか？</h3>
            <p className="warning">この操作は取り消せません。</p>
            
            <div className="modal-actions">
              <button onClick={() => setShowResetConfirm(false)}>キャンセル</button>
              <button onClick={onResetAllData} className="danger-button">削除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}