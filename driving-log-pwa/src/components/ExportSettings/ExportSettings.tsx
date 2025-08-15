import { JSX, useState } from 'react';
import { AppSettings, ExportFormat } from '../../types';
import { createButtonProps } from '../../utils/accessibility';
import './ExportSettings.css';

export interface ExportSettingsProps {
  settings: AppSettings;
  onSettingChange: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => Promise<void>;
}

export function ExportSettings({ settings, onSettingChange }: ExportSettingsProps): JSX.Element {
  const [showPreview, setShowPreview] = useState(false);
  const [filenameFormat, setFilenameFormat] = useState('driving-log-{date}');

  const handleFormatChange = (format: ExportFormat) => {
    onSettingChange('exportFormat', format);
  };

  const handlePeriodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onSettingChange('defaultExportPeriod', e.target.value as any);
  };

  const handlePrivacyLevelChange = (level: 'full' | 'approximate' | 'minimal') => {
    onSettingChange('exportPrivacyLevel', level);
  };

  const handleAutoExportToggle = (enabled: boolean) => {
    onSettingChange('autoExportEnabled', enabled);
  };

  const handleFrequencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onSettingChange('autoExportFrequency', e.target.value as any);
  };

  const getFilenamePreview = () => {
    const now = new Date();
    return filenameFormat.replace('{date}', now.toISOString().split('T')[0]);
  };

  const getPrivacyDescription = (level: string) => {
    switch (level) {
      case 'full':
        return '完全な位置情報と全データを含みます';
      case 'approximate':
        return '位置情報は約1km範囲で概算されます';
      case 'minimal':
        return '位置情報と個人識別情報を除外します';
      default:
        return '';
    }
  };

  const getExcludedItems = (level: string) => {
    switch (level) {
      case 'minimal':
        return ['正確な位置情報', '個人識別可能な情報', '詳細なタイムスタンプ'];
      case 'approximate':
        return ['正確な位置情報（概算に変換）'];
      default:
        return [];
    }
  };

  return (
    <div className="export-settings">
      <h2>エクスポート設定</h2>

      {/* Export Format */}
      <fieldset className="setting-group" role="group">
        <legend>エクスポート形式</legend>
        
        <div className="format-options" role="radiogroup" aria-labelledby="format-label">
          <span id="format-label" className="setting-label">ファイル形式</span>
          
          <label className="format-option">
            <input
              type="radio"
              name="exportFormat"
              value={ExportFormat.CSV}
              checked={settings.exportFormat === ExportFormat.CSV}
              onChange={() => handleFormatChange(ExportFormat.CSV)}
            />
            <span>CSV形式</span>
            <small>表計算ソフトで開けます</small>
          </label>

          <label className="format-option">
            <input
              type="radio"
              name="exportFormat"
              value={ExportFormat.JSON}
              checked={settings.exportFormat === ExportFormat.JSON}
              onChange={() => handleFormatChange(ExportFormat.JSON)}
            />
            <span>JSON形式</span>
            <small>プログラムで処理しやすい形式</small>
          </label>
        </div>

        {settings.exportFormat === ExportFormat.JSON && (
          <div className="json-options">
            <label className="checkbox-label">
              <input type="checkbox" defaultChecked />
              <span>JSON圧縮</span>
            </label>
            <label className="checkbox-label">
              <input type="checkbox" />
              <span>フォーマット</span>
            </label>
          </div>
        )}
      </fieldset>

      {/* Default Settings */}
      <fieldset className="setting-group" role="group">
        <legend>デフォルト設定</legend>
        
        <div className="setting-item">
          <label htmlFor="default-period">デフォルト期間</label>
          <select
            id="default-period"
            value={settings.defaultExportPeriod}
            onChange={handlePeriodChange}
          >
            <option value="month">過去1ヶ月</option>
            <option value="quarter">過去3ヶ月</option>
            <option value="year">過去1年</option>
            <option value="all">全期間</option>
          </select>
        </div>

        <div className="setting-item">
          <label htmlFor="filename-format">ファイル名形式</label>
          <input
            id="filename-format"
            type="text"
            value={filenameFormat}
            onChange={(e) => setFilenameFormat(e.target.value)}
            placeholder="driving-log-{date}"
          />
          <small>プレビュー: {getFilenamePreview()}.{settings.exportFormat.toLowerCase()}</small>
        </div>

        <div className="setting-item">
          <div className="file-size-estimate">
            <span className="estimate-label">推定ファイルサイズ:</span>
            <span className="estimate-value">
              CSV: 約{Math.ceil(settings.favoriteLocations.length * 0.5)}KB, 
              JSON: 約{Math.ceil(settings.favoriteLocations.length * 1.2)}KB
            </span>
          </div>
        </div>
      </fieldset>

      {/* Privacy Settings */}
      <fieldset className="setting-group" role="group">
        <legend>プライバシー設定</legend>
        
        <div className="privacy-options" role="radiogroup" aria-labelledby="privacy-label">
          <span id="privacy-label" className="setting-label">データの詳細度</span>
          
          <label className="privacy-option">
            <input
              type="radio"
              name="privacyLevel"
              value="full"
              checked={settings.exportPrivacyLevel === 'full'}
              onChange={() => handlePrivacyLevelChange('full')}
            />
            <span>完全データ</span>
            <small>{getPrivacyDescription('full')}</small>
          </label>

          <label className="privacy-option">
            <input
              type="radio"
              name="privacyLevel"
              value="approximate"
              checked={settings.exportPrivacyLevel === 'approximate'}
              onChange={() => handlePrivacyLevelChange('approximate')}
            />
            <span>概算データ</span>
            <small>{getPrivacyDescription('approximate')}</small>
          </label>

          <label className="privacy-option">
            <input
              type="radio"
              name="privacyLevel"
              value="minimal"
              checked={settings.exportPrivacyLevel === 'minimal'}
              onChange={() => handlePrivacyLevelChange('minimal')}
            />
            <span>最小データ</span>
            <small>{getPrivacyDescription('minimal')}</small>
          </label>
        </div>

        {settings.exportPrivacyLevel !== 'full' && (
          <div className="privacy-info">
            <h4>除外される項目:</h4>
            <ul>
              {getExcludedItems(settings.exportPrivacyLevel).map((item, index) => (
                <li key={index}>・{item}</li>
              ))}
            </ul>
          </div>
        )}
      </fieldset>

      {/* Auto Export */}
      <fieldset className="setting-group" role="group">
        <legend>自動エクスポート</legend>
        
        <div className="setting-item">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={settings.autoExportEnabled}
              onChange={(e) => handleAutoExportToggle(e.target.checked)}
            />
            <span>自動エクスポートを有効にする</span>
          </label>
          <small>定期的にデータを自動でエクスポートします</small>
        </div>

        {settings.autoExportEnabled && (
          <>
            <div className="setting-item">
              <label htmlFor="export-frequency">エクスポート頻度</label>
              <select
                id="export-frequency"
                value={settings.autoExportFrequency}
                onChange={handleFrequencyChange}
              >
                <option value="weekly">週次</option>
                <option value="monthly">月次</option>
                <option value="manual">手動のみ</option>
              </select>
            </div>

            <div className="setting-item">
              <label className="checkbox-label">
                <input type="checkbox" />
                <span>エクスポート完了時に通知</span>
              </label>
            </div>
          </>
        )}
      </fieldset>

      {/* Preview and Test */}
      <div className="setting-group">
        <h3>プレビューとテスト</h3>
        
        <div className="preview-actions">
          <button
            onClick={() => setShowPreview(true)}
            className="preview-button"
            {...createButtonProps('エクスポートプレビューを表示')}
          >
            プレビューを表示
          </button>
        </div>
      </div>

      {/* Global Privacy Notice */}
      {(settings as any).globalPrivacyMode && (
        <div className="privacy-notice">
          <span className="notice-icon">🔒</span>
          <span>グローバルプライバシーモードが有効です</span>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="preview-title">
          <div className="modal-content large">
            <h3 id="preview-title">エクスポートプレビュー</h3>
            
            <div className="preview-content">
              <p>現在の設定でエクスポートされるデータ:</p>
              
              <div className="preview-settings">
                <div className="preview-item">
                  <span className="preview-label">形式:</span>
                  <span className="preview-value">{settings.exportFormat}</span>
                </div>
                <div className="preview-item">
                  <span className="preview-label">期間:</span>
                  <span className="preview-value">
                    {settings.defaultExportPeriod === 'month' && '過去1ヶ月'}
                    {settings.defaultExportPeriod === 'quarter' && '過去3ヶ月'}
                    {settings.defaultExportPeriod === 'year' && '過去1年'}
                    {settings.defaultExportPeriod === 'all' && '全期間'}
                  </span>
                </div>
                <div className="preview-item">
                  <span className="preview-label">プライバシー:</span>
                  <span className="preview-value">{getPrivacyDescription(settings.exportPrivacyLevel)}</span>
                </div>
              </div>

              <div className="preview-sample">
                <h4>サンプルデータ:</h4>
                <pre>
                  {settings.exportFormat === ExportFormat.CSV ? 
                    `日付,開始時刻,終了時刻,出発地,到着地,距離\n2024-01-15,09:00,10:30,自宅,職場,12.5km` :
                    `{\n  "date": "2024-01-15",\n  "startTime": "09:00",\n  "endTime": "10:30",\n  "startLocation": "自宅",\n  "endLocation": "職場",\n  "distance": "12.5km"\n}`
                  }
                </pre>
              </div>
            </div>
            
            <div className="modal-actions">
              <button
                onClick={() => setShowPreview(false)}
                className="close-button"
                {...createButtonProps('閉じる')}
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}