/**
 * Reactコンポーネントのモック設定
 * 
 * 複雑なコンポーネントやサードパーティライブラリのモック実装
 */

import React from 'react';

// GPS関連コンポーネントのモック
export const MockGPSIndicator = jest.fn(({ status, accuracy }: any) => (
  <div data-testid="gps-indicator">
    <span data-testid="gps-status">{status}</span>
    <span data-testid="gps-accuracy">{accuracy}</span>
  </div>
));

export const MockLocationPicker = jest.fn(({ onLocationSelect, initialLocation }: any) => (
  <div data-testid="location-picker">
    <button 
      data-testid="select-location-button"
      onClick={() => onLocationSelect && onLocationSelect({
        latitude: 35.6762,
        longitude: 139.6503,
        address: 'Mock Location'
      })}
    >
      Select Location
    </button>
    {initialLocation && (
      <div data-testid="initial-location">
        {initialLocation.address}
      </div>
    )}
  </div>
));

// フォーム関連コンポーネントのモック
export const MockDrivingLogForm = jest.fn(({ onSubmit, initialData, mode }: any) => (
  <form 
    data-testid="driving-log-form"
    onSubmit={(e) => {
      e.preventDefault();
      onSubmit && onSubmit({
        purpose: 'Test Purpose',
        vehicle: 'Test Vehicle',
        driver: 'Test Driver'
      });
    }}
  >
    <input 
      data-testid="purpose-input" 
      defaultValue={initialData?.purpose || ''} 
      placeholder="Purpose"
    />
    <input 
      data-testid="vehicle-input" 
      defaultValue={initialData?.vehicle || ''} 
      placeholder="Vehicle"
    />
    <input 
      data-testid="driver-input" 
      defaultValue={initialData?.driver || ''} 
      placeholder="Driver"
    />
    <button type="submit" data-testid="submit-button">
      {mode === 'edit' ? 'Update' : 'Create'}
    </button>
  </form>
));

export const MockLocationForm = jest.fn(({ onSubmit, initialData, logId }: any) => (
  <form 
    data-testid="location-form"
    onSubmit={(e) => {
      e.preventDefault();
      onSubmit && onSubmit({
        type: 'START',
        address: 'Test Address',
        logId: logId || 'test-log-id'
      });
    }}
  >
    <select data-testid="location-type-select" defaultValue={initialData?.type || 'START'}>
      <option value="START">Start</option>
      <option value="WAYPOINT">Waypoint</option>
      <option value="END">End</option>
    </select>
    <input 
      data-testid="address-input" 
      defaultValue={initialData?.address || ''} 
      placeholder="Address"
    />
    <button type="submit" data-testid="submit-button">
      Add Location
    </button>
  </form>
));

// リスト表示コンポーネントのモック
export const MockDrivingLogList = jest.fn(({ logs, onSelect, onDelete, onEdit }: any) => (
  <div data-testid="driving-log-list">
    {logs?.map((log: any, index: number) => (
      <div key={log.id || index} data-testid={`log-item-${index}`}>
        <span data-testid="log-purpose">{log.purpose}</span>
        <span data-testid="log-status">{log.status}</span>
        <button 
          data-testid="select-log-button"
          onClick={() => onSelect && onSelect(log)}
        >
          Select
        </button>
        <button 
          data-testid="edit-log-button"
          onClick={() => onEdit && onEdit(log)}
        >
          Edit
        </button>
        <button 
          data-testid="delete-log-button"
          onClick={() => onDelete && onDelete(log.id)}
        >
          Delete
        </button>
      </div>
    ))}
  </div>
));

export const MockLocationList = jest.fn(({ locations, onSelect, onDelete }: any) => (
  <div data-testid="location-list">
    {locations?.map((location: any, index: number) => (
      <div key={location.id || index} data-testid={`location-item-${index}`}>
        <span data-testid="location-type">{location.type}</span>
        <span data-testid="location-address">{location.address}</span>
        <button 
          data-testid="select-location-button"
          onClick={() => onSelect && onSelect(location)}
        >
          Select
        </button>
        <button 
          data-testid="delete-location-button"
          onClick={() => onDelete && onDelete(location.id)}
        >
          Delete
        </button>
      </div>
    ))}
  </div>
));

// 設定関連コンポーネントのモック
export const MockSettingsPanel = jest.fn(({ settings, onUpdate }: any) => (
  <div data-testid="settings-panel">
    <div data-testid="theme-setting">
      <label>Theme:</label>
      <select 
        data-testid="theme-select"
        value={settings?.theme || 'light'}
        onChange={(e) => onUpdate && onUpdate({ theme: e.target.value })}
      >
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </div>
    
    <div data-testid="language-setting">
      <label>Language:</label>
      <select 
        data-testid="language-select"
        value={settings?.language || 'ja'}
        onChange={(e) => onUpdate && onUpdate({ language: e.target.value })}
      >
        <option value="ja">Japanese</option>
        <option value="en">English</option>
      </select>
    </div>
    
    <div data-testid="notifications-setting">
      <label>
        <input 
          type="checkbox" 
          data-testid="notifications-checkbox"
          checked={settings?.notifications?.enabled || false}
          onChange={(e) => onUpdate && onUpdate({ 
            notifications: { ...settings?.notifications, enabled: e.target.checked }
          })}
        />
        Enable Notifications
      </label>
    </div>
  </div>
));

// ナビゲーション関連コンポーネントのモック
export const MockNavigation = jest.fn(({ currentRoute, onNavigate }: any) => (
  <nav data-testid="navigation">
    <button 
      data-testid="nav-home"
      className={currentRoute === 'home' ? 'active' : ''}
      onClick={() => onNavigate && onNavigate('home')}
    >
      Home
    </button>
    <button 
      data-testid="nav-logs"
      className={currentRoute === 'logs' ? 'active' : ''}
      onClick={() => onNavigate && onNavigate('logs')}
    >
      Logs
    </button>
    <button 
      data-testid="nav-settings"
      className={currentRoute === 'settings' ? 'active' : ''}
      onClick={() => onNavigate && onNavigate('settings')}
    >
      Settings
    </button>
  </nav>
));

export const MockTabBar = jest.fn(({ activeTab, onTabChange, tabs }: any) => (
  <div data-testid="tab-bar">
    {tabs?.map((tab: any) => (
      <button
        key={tab.id}
        data-testid={`tab-${tab.id}`}
        className={activeTab === tab.id ? 'active' : ''}
        onClick={() => onTabChange && onTabChange(tab.id)}
      >
        {tab.label}
      </button>
    ))}
  </div>
));

// モーダル関連コンポーネントのモック
export const MockModal = jest.fn(({ isOpen, onClose, title, children }: any) => 
  isOpen ? (
    <div data-testid="modal-overlay" onClick={onClose}>
      <div data-testid="modal-content" onClick={(e) => e.stopPropagation()}>
        <div data-testid="modal-header">
          <h2>{title}</h2>
          <button data-testid="modal-close-button" onClick={onClose}>×</button>
        </div>
        <div data-testid="modal-body">
          {children}
        </div>
      </div>
    </div>
  ) : null
);

export const MockConfirmDialog = jest.fn(({ isOpen, onConfirm, onCancel, message }: any) =>
  isOpen ? (
    <div data-testid="confirm-dialog">
      <p data-testid="confirm-message">{message}</p>
      <button data-testid="confirm-button" onClick={onConfirm}>Confirm</button>
      <button data-testid="cancel-button" onClick={onCancel}>Cancel</button>
    </div>
  ) : null
);

// データ表示コンポーネントのモック
export const MockStatisticsDisplay = jest.fn(({ statistics }: any) => (
  <div data-testid="statistics-display">
    <div data-testid="total-logs">Total Logs: {statistics?.totalLogs || 0}</div>
    <div data-testid="completed-logs">Completed: {statistics?.completedLogs || 0}</div>
    <div data-testid="total-distance">Total Distance: {statistics?.totalDistance || 0}km</div>
    <div data-testid="average-distance">Average Distance: {statistics?.averageDistance || 0}km</div>
  </div>
));

export const MockChart = jest.fn(({ data, type, title }: any) => (
  <div data-testid="chart">
    <h3 data-testid="chart-title">{title}</h3>
    <div data-testid="chart-type">{type}</div>
    <div data-testid="chart-data-points">{data?.length || 0} data points</div>
  </div>
));

// エクスポート関連コンポーネントのモック
export const MockExportPanel = jest.fn(({ onExport, formats, selectedLogs }: any) => (
  <div data-testid="export-panel">
    <div data-testid="selected-logs-count">
      Selected: {selectedLogs?.length || 0} logs
    </div>
    
    <div data-testid="format-selection">
      {formats?.map((format: string) => (
        <label key={format}>
          <input 
            type="radio" 
            name="export-format" 
            value={format}
            data-testid={`format-${format}`}
          />
          {format.toUpperCase()}
        </label>
      ))}
    </div>
    
    <button 
      data-testid="export-button"
      onClick={() => onExport && onExport({ format: 'csv', logs: selectedLogs })}
    >
      Export
    </button>
  </div>
));

// ローディング・エラー表示コンポーネントのモック
export const MockLoadingSpinner = jest.fn(({ message }: any) => (
  <div data-testid="loading-spinner">
    <div data-testid="spinner"></div>
    {message && <p data-testid="loading-message">{message}</p>}
  </div>
));

export const MockErrorBoundary = jest.fn(({ children, fallback: _fallback }: any) => (
  <div data-testid="error-boundary">
    {children}
  </div>
));

export const MockErrorMessage = jest.fn(({ error, onRetry, onDismiss }: any) => (
  <div data-testid="error-message">
    <p data-testid="error-text">{error?.message || 'An error occurred'}</p>
    {onRetry && (
      <button data-testid="retry-button" onClick={onRetry}>
        Retry
      </button>
    )}
    {onDismiss && (
      <button data-testid="dismiss-button" onClick={onDismiss}>
        Dismiss
      </button>
    )}
  </div>
));

// フックのモック
export const createMockHook = <T,>(initialValue: T) => {
  let currentValue = initialValue;
  
  const hook: any = jest.fn(() => [
    currentValue,
    jest.fn((newValue: T | ((prev: T) => T)) => {
      if (typeof newValue === 'function') {
        currentValue = (newValue as (prev: T) => T)(currentValue);
      } else {
        currentValue = newValue;
      }
    })
  ]);

  hook.__setValue = (value: T) => {
    currentValue = value;
  };

  hook.__getValue = () => currentValue;

  hook.__reset = () => {
    currentValue = initialValue;
  };

  return hook;
};

// コンテキストプロバイダーのモック
export const MockThemeProvider = jest.fn(({ children, theme }: any) => (
  <div data-testid="theme-provider" data-theme={theme || 'light'}>
    {children}
  </div>
));

export const MockSettingsProvider = jest.fn(({ children, settings }: any) => (
  <div data-testid="settings-provider" data-settings={JSON.stringify(settings || {})}>
    {children}
  </div>
));

export const MockNotificationProvider = jest.fn(({ children }: any) => (
  <div data-testid="notification-provider">
    {children}
    <div data-testid="notification-container"></div>
  </div>
));

// ルーター関連のモック
export const MockRouter = jest.fn(({ children, currentPath }: any) => (
  <div data-testid="router" data-current-path={currentPath || '/'}>
    {children}
  </div>
));

export const MockRoute = jest.fn(({ path, component: Component, exact }: any) => (
  <div data-testid="route" data-path={path} data-exact={exact}>
    {Component && <Component />}
  </div>
));

// PWA関連コンポーネントのモック
export const MockInstallPrompt = jest.fn(({ onInstall, onDismiss }: any) => (
  <div data-testid="install-prompt">
    <p>Install this app for a better experience</p>
    <button data-testid="install-button" onClick={onInstall}>
      Install
    </button>
    <button data-testid="dismiss-button" onClick={onDismiss}>
      Later
    </button>
  </div>
));

export const MockOfflineIndicator = jest.fn(({ isOnline }: any) => (
  <div data-testid="offline-indicator" data-online={isOnline}>
    {isOnline ? 'Online' : 'Offline'}
  </div>
));

// テストユーティリティ
export const createMockComponent = (name: string, props: string[] = []) => {
  return jest.fn((componentProps: any) => (
    <div data-testid={`mock-${name.toLowerCase()}`}>
      {props.map(prop => (
        <span key={prop} data-testid={`${prop}-value`}>
          {componentProps[prop]}
        </span>
      ))}
    </div>
  ));
};

export const createMockProvider = (name: string, contextValue: any = {}) => {
  return jest.fn(({ children }: any) => (
    <div data-testid={`mock-${name.toLowerCase()}-provider`} data-context={JSON.stringify(contextValue)}>
      {children}
    </div>
  ));
};