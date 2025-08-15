import { JSX, useState, useEffect } from 'react';
import { AppSettings } from '../../types';
import { createButtonProps } from '../../utils/accessibility';
import './BasicSettings.css';

export interface BasicSettingsProps {
  settings: AppSettings;
  onSettingChange: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => Promise<void>;
  onResetToDefaults?: () => Promise<void>;
}

export function BasicSettings({ 
  settings, 
  onSettingChange, 
  onResetToDefaults 
}: BasicSettingsProps): JSX.Element {
  const [gpsPermissionStatus, setGpsPermissionStatus] = useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown');
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>('light');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Check GPS permission status
  useEffect(() => {
    const checkGpsPermission = async () => {
      if ('permissions' in navigator) {
        try {
          const permission = await navigator.permissions.query({ name: 'geolocation' });
          setGpsPermissionStatus(permission.state);
        } catch {
          setGpsPermissionStatus('unknown');
        }
      }
    };

    checkGpsPermission();
  }, []);

  // Detect system theme preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemTheme(mediaQuery.matches ? 'dark' : 'light');

    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const showFeedback = (message: string) => {
    setFeedback(message);
    setTimeout(() => setFeedback(null), 2000);
  };

  const handleLanguageChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const language = e.target.value as 'ja' | 'en';
    try {
      await onSettingChange('language', language);
      showFeedback('言語設定を保存しました');
    } catch (error) {
      console.error('Failed to save language setting:', error);
    }
  };

  const handleThemeChange = async (theme: 'light' | 'dark' | 'auto') => {
    try {
      setIsTransitioning(true);
      await onSettingChange('theme', theme);
      showFeedback('テーマ設定を保存しました');
      
      setTimeout(() => setIsTransitioning(false), 300);
    } catch (error) {
      console.error('Failed to save theme setting:', error);
      setIsTransitioning(false);
    }
  };

  const handleGpsTimeoutChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const timeout = parseInt(e.target.value);
    if (timeout >= 5 && timeout <= 60) {
      try {
        await onSettingChange('gpsTimeout', timeout);
      } catch (error) {
        console.error('Failed to save GPS timeout:', error);
      }
    }
  };

  const handleGpsAccuracyChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const accuracy = parseInt(e.target.value);
    if (accuracy >= 1 && accuracy <= 1000) {
      try {
        await onSettingChange('gpsAccuracyThreshold', accuracy);
      } catch (error) {
        console.error('Failed to save GPS accuracy:', error);
      }
    }
  };

  const handleReset = async () => {
    if (onResetToDefaults) {
      try {
        await onResetToDefaults();
        setShowResetConfirm(false);
        showFeedback('設定をデフォルトに戻しました');
      } catch (error) {
        console.error('Failed to reset settings:', error);
      }
    }
  };

  const getPermissionStatusText = () => {
    switch (gpsPermissionStatus) {
      case 'granted': return 'GPS権限: 許可済み';
      case 'denied': return 'GPS権限: 拒否済み';
      case 'prompt': return 'GPS権限: 未設定';
      default: return 'GPS権限: 不明';
    }
  };

  const getPermissionStatusColor = () => {
    switch (gpsPermissionStatus) {
      case 'granted': return '#4CAF50';
      case 'denied': return '#F44336';
      case 'prompt': return '#FF9800';
      default: return '#757575';
    }
  };

  return (
    <div 
      data-testid="basic-settings" 
      className={`basic-settings ${isTransitioning ? 'theme-transitioning' : ''}`}
    >
      <h2>基本設定</h2>

      {/* Language Settings */}
      <fieldset className="setting-group" role="group">
        <legend>言語設定</legend>
        
        <div className="setting-item">
          <label htmlFor="language-select">言語</label>
          <select
            id="language-select"
            value={settings.language}
            onChange={handleLanguageChange}
            aria-describedby="language-help"
          >
            <option value="ja">日本語</option>
            <option value="en">English</option>
          </select>
          <small id="language-help">アプリの表示言語を変更します</small>
        </div>
      </fieldset>

      {/* Theme Settings */}
      <fieldset className="setting-group" role="group">
        <legend>テーマ設定</legend>
        
        <div className="setting-item">
          <div className="theme-options" role="radiogroup" aria-labelledby="theme-label">
            <span id="theme-label" className="setting-label">外観</span>
            
            <label className="theme-option">
              <input
                type="radio"
                name="theme"
                value="light"
                checked={settings.theme === 'light'}
                onChange={() => handleThemeChange('light')}
              />
              <span className="theme-icon">☀️</span>
              <span>ライトテーマ</span>
            </label>

            <label className="theme-option">
              <input
                type="radio"
                name="theme"
                value="dark"
                checked={settings.theme === 'dark'}
                onChange={() => handleThemeChange('dark')}
              />
              <span className="theme-icon">🌙</span>
              <span>ダークテーマ</span>
            </label>

            <label className="theme-option">
              <input
                type="radio"
                name="theme"
                value="auto"
                checked={settings.theme === 'auto'}
                onChange={() => handleThemeChange('auto')}
              />
              <span className="theme-icon">🔄</span>
              <span>自動</span>
            </label>
          </div>
          
          {settings.theme === 'auto' && (
            <small className="theme-info">
              システム設定: {systemTheme === 'dark' ? 'ダーク' : 'ライト'}
            </small>
          )}
        </div>
      </fieldset>

      {/* GPS Settings */}
      <fieldset className="setting-group" role="group">
        <legend>GPS設定</legend>
        
        <div className="setting-item">
          <div className="gps-status" style={{ color: getPermissionStatusColor() }}>
            {getPermissionStatusText()}
          </div>
        </div>

        <div className="setting-item">
          <label htmlFor="gps-timeout">GPS タイムアウト (秒)</label>
          <div className="slider-container">
            <input
              id="gps-timeout"
              type="range"
              min="5"
              max="60"
              value={settings.gpsTimeout}
              onChange={handleGpsTimeoutChange}
              aria-describedby="gps-timeout-help"
              role="slider"
              aria-valuemin={5}
              aria-valuemax={60}
              aria-valuenow={settings.gpsTimeout}
            />
            <span className="slider-value">{settings.gpsTimeout}秒</span>
          </div>
          <small id="gps-timeout-help">GPS取得の最大待機時間</small>
        </div>

        <div className="setting-item">
          <label htmlFor="gps-accuracy">GPS精度閾値 (メートル)</label>
          <div className="slider-container">
            <input
              id="gps-accuracy"
              type="range"
              min="1"
              max="1000"
              value={settings.gpsAccuracyThreshold}
              onChange={handleGpsAccuracyChange}
              aria-describedby="gps-accuracy-help"
              role="slider"
              aria-valuemin={1}
              aria-valuemax={1000}
              aria-valuenow={settings.gpsAccuracyThreshold}
            />
            <span className="slider-value">{settings.gpsAccuracyThreshold}m</span>
          </div>
          <small id="gps-accuracy-help">この精度以下の位置情報のみ受け入れます</small>
        </div>
      </fieldset>

      {/* Other Settings */}
      <fieldset className="setting-group" role="group">
        <legend>その他</legend>
        
        <div className="setting-item">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={settings.compactMode}
              onChange={(e) => onSettingChange('compactMode', e.target.checked)}
            />
            <span>コンパクトモード</span>
          </label>
          <small>より多くの情報を表示します</small>
        </div>

        <div className="setting-item">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={settings.showTutorial}
              onChange={(e) => onSettingChange('showTutorial', e.target.checked)}
            />
            <span>チュートリアルを表示</span>
          </label>
          <small>初回使用時のガイドを表示します</small>
        </div>
      </fieldset>

      {/* Reset to Defaults */}
      {onResetToDefaults && (
        <div className="setting-group">
          <button
            onClick={() => setShowResetConfirm(true)}
            className="reset-button"
            {...createButtonProps('設定をデフォルトに戻す')}
          >
            デフォルトに戻す
          </button>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="reset-title">
          <div className="modal-content">
            <h3 id="reset-title">設定をデフォルトに戻しますか？</h3>
            <p>この操作により、すべての基本設定がデフォルト値に戻ります。</p>
            <p className="warning">この操作は取り消せません。</p>
            
            <div className="modal-actions">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="cancel-button"
                {...createButtonProps('キャンセル')}
              >
                キャンセル
              </button>
              <button
                onClick={handleReset}
                className="confirm-button"
                {...createButtonProps('デフォルトに戻す')}
              >
                デフォルトに戻す
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Messages */}
      {feedback && (
        <div className="feedback-message" role="status" aria-live="polite">
          {feedback}
        </div>
      )}
    </div>
  );
}