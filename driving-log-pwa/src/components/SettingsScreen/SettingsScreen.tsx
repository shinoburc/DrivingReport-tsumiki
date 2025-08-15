import { JSX, useState, useEffect, useCallback, memo } from 'react';
import { useSettings } from '../../hooks/useSettings';
import { useResponsiveLayout, getResponsiveClassName } from '../../utils/responsive';
import { createButtonProps } from '../../utils/accessibility';
import { BasicSettings } from '../BasicSettings/BasicSettings';
import { FavoriteLocations } from '../FavoriteLocations/FavoriteLocations';
import { ExportSettings } from '../ExportSettings/ExportSettings';
import { DataManagement } from '../DataManagement/DataManagement';
import { ProfileSettings } from '../ProfileSettings/ProfileSettings';
import { AppInfo } from '../AppInfo/AppInfo';
import './SettingsScreen.css';

export interface SettingsScreenProps {
  className?: string;
  onBack?: () => void;
}

type SettingsTab = 'basic' | 'locations' | 'export' | 'data' | 'profile' | 'info';

export function SettingsScreen({ className, onBack }: SettingsScreenProps): JSX.Element {
  const { settings, loading, error, updateSetting, resetSettings, exportSettings, importSettings } = useSettings();
  const layout = useResponsiveLayout();
  const responsiveClass = getResponsiveClassName(layout);
  
  const [activeTab, setActiveTab] = useState<SettingsTab>('basic');
  const [scrollPositions, setScrollPositions] = useState<Record<SettingsTab, number>>({
    basic: 0,
    locations: 0,
    export: 0,
    data: 0,
    profile: 0,
    info: 0,
  });

  // Save scroll position when switching tabs
  const handleTabChange = useCallback((newTab: SettingsTab) => {
    if (activeTab !== newTab) {
      const currentSection = document.querySelector(`[data-tab="${activeTab}"]`);
      if (currentSection) {
        setScrollPositions(prev => ({
          ...prev,
          [activeTab]: currentSection.scrollTop,
        }));
      }
      setActiveTab(newTab);
    }
  }, [activeTab]);

  // Restore scroll position when tab changes
  useEffect(() => {
    const newSection = document.querySelector(`[data-tab="${activeTab}"]`);
    if (newSection) {
      newSection.scrollTop = scrollPositions[activeTab];
    }
  }, [activeTab, scrollPositions]);

  const tabs = [
    { id: 'basic' as SettingsTab, label: '基本設定', icon: '⚙️' },
    { id: 'locations' as SettingsTab, label: 'よく使う地点', icon: '📍' },
    { id: 'export' as SettingsTab, label: 'エクスポート設定', icon: '📤' },
    { id: 'data' as SettingsTab, label: 'データ管理', icon: '💾' },
    { id: 'profile' as SettingsTab, label: 'プロファイル', icon: '👤' },
    { id: 'info' as SettingsTab, label: 'アプリ情報', icon: 'ℹ️' },
  ];

  if (loading) {
    return (
      <div className={`settings-screen ${responsiveClass} ${className || ''}`}>
        <div className="loading-container">
          <div data-testid="loading-spinner" className="spinner" />
          <p>設定を読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error && !settings) {
    return (
      <div className={`settings-screen ${responsiveClass} ${className || ''}`}>
        <div className="error-container" role="alert">
          <h2>設定の読み込みに失敗しました</h2>
          <p>{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="retry-button"
            {...createButtonProps('設定を再読み込み')}
          >
            再試行
          </button>
        </div>
      </div>
    );
  }

  return (
    <main 
      className={`settings-screen ${responsiveClass} ${className || ''}`}
      data-testid="settings-container"
      role="main"
    >
      {/* Header */}
      <header className="settings-header">
        <nav className="breadcrumb" role="navigation" aria-label="breadcrumb">
          <ol>
            <li><a href="/">ホーム</a></li>
            <li aria-current="page">設定</li>
          </ol>
        </nav>
        
        <div className="header-content">
          {onBack && (
            <button 
              onClick={onBack}
              className="back-button"
              {...createButtonProps('戻る')}
            >
              ←
            </button>
          )}
          <h1>設定</h1>
          <div className="header-info">
            <span className="app-version">バージョン {settings?.appVersion}</span>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="settings-navigation" role="navigation" aria-label="設定カテゴリ">
        <div className="tab-list" role="tablist">
          {tabs.map(tab => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`panel-${tab.id}`}
              onClick={() => handleTabChange(tab.id)}
              className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
              {...createButtonProps(tab.label)}
            >
              <span className="tab-icon" aria-hidden="true">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <div className="settings-content">
        {/* Basic Settings */}
        <section
          id="panel-basic"
          role="tabpanel"
          aria-labelledby="tab-basic"
          data-tab="basic"
          className={`settings-panel ${activeTab === 'basic' ? 'active' : 'hidden'}`}
        >
          {settings && (
            <BasicSettings
              settings={settings}
              onSettingChange={updateSetting}
              onResetToDefaults={resetSettings}
            />
          )}
        </section>

        {/* Favorite Locations */}
        <section
          id="panel-locations"
          role="tabpanel"
          aria-labelledby="tab-locations"
          data-tab="locations"
          className={`settings-panel ${activeTab === 'locations' ? 'active' : 'hidden'}`}
        >
          {settings && (
            <FavoriteLocations
              locations={settings.favoriteLocations}
              onLocationChange={(locations) => updateSetting('favoriteLocations', locations)}
              onLocationAdd={(location) => {
                updateSetting('favoriteLocations', [...settings.favoriteLocations, location]);
              }}
              onLocationEdit={(id, updatedLocation) => {
                const newLocations = settings.favoriteLocations.map(loc =>
                  loc.id === id ? { ...loc, ...updatedLocation } : loc
                );
                updateSetting('favoriteLocations', newLocations);
              }}
              onLocationDelete={(id) => {
                const newLocations = settings.favoriteLocations.filter(loc => loc.id !== id);
                updateSetting('favoriteLocations', newLocations);
              }}
            />
          )}
        </section>

        {/* Export Settings */}
        <section
          id="panel-export"
          role="tabpanel"
          aria-labelledby="tab-export"
          data-tab="export"
          className={`settings-panel ${activeTab === 'export' ? 'active' : 'hidden'}`}
        >
          {settings && (
            <ExportSettings
              settings={settings}
              onSettingChange={updateSetting}
            />
          )}
        </section>

        {/* Data Management */}
        <section
          id="panel-data"
          role="tabpanel"
          aria-labelledby="tab-data"
          data-tab="data"
          className={`settings-panel ${activeTab === 'data' ? 'active' : 'hidden'}`}
        >
          {settings && (
            <DataManagement
              settings={settings}
              onExportSettings={exportSettings}
              onImportSettings={importSettings}
              onResetAllData={resetSettings}
            />
          )}
        </section>

        {/* Profile Settings */}
        <section
          id="panel-profile"
          role="tabpanel"
          aria-labelledby="tab-profile"
          data-tab="profile"
          className={`settings-panel ${activeTab === 'profile' ? 'active' : 'hidden'}`}
        >
          {settings && (
            <ProfileSettings
              settings={settings}
              onSettingChange={updateSetting}
            />
          )}
        </section>

        {/* App Info */}
        <section
          id="panel-info"
          role="tabpanel"
          aria-labelledby="tab-info"
          data-tab="info"
          className={`settings-panel ${activeTab === 'info' ? 'active' : 'hidden'}`}
        >
          {settings && (
            <AppInfo settings={settings} />
          )}
        </section>
      </div>

      {/* Status/Error Display */}
      {error && (
        <div className="error-notification" role="status" aria-live="polite">
          設定の保存に失敗しました: {error}
        </div>
      )}

      {/* Announcement region for screen readers */}
      <div role="status" aria-live="polite" aria-hidden="true" className="sr-only">
        {/* Announcements will be inserted here dynamically */}
      </div>
    </main>
  );
}