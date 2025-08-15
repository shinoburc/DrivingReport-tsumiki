import { JSX, useState, useEffect } from 'react';
import { useServiceWorker } from '../../hooks/useServiceWorker';
import './ServiceWorkerStatus.css';

export interface ServiceWorkerStatusProps {
  className?: string;
  showDetailed?: boolean;
}

export function ServiceWorkerStatus({ 
  className, 
  showDetailed = false 
}: ServiceWorkerStatusProps): JSX.Element {
  const {
    isRegistered,
    isLoading,
    error,
    updateAvailable,
    isOnline,
    syncStatus,
    cacheStatus,
    updateServiceWorker,
    triggerSync,
    getCacheStatus,
  } = useServiceWorker();

  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [showCacheDetails, setShowCacheDetails] = useState(false);

  // Show update dialog when update is available
  useEffect(() => {
    if (updateAvailable) {
      setShowUpdateDialog(true);
    }
  }, [updateAvailable]);

  // Load cache status on mount
  useEffect(() => {
    if (isRegistered && showDetailed) {
      getCacheStatus();
    }
  }, [isRegistered, showDetailed, getCacheStatus]);

  const handleUpdate = async () => {
    await updateServiceWorker();
    setShowUpdateDialog(false);
  };

  const handleManualSync = async () => {
    await triggerSync();
  };

  const toggleCacheDetails = async () => {
    if (!showCacheDetails) {
      await getCacheStatus();
    }
    setShowCacheDetails(!showCacheDetails);
  };

  const getStatusIcon = () => {
    if (isLoading) return '⏳';
    if (error) return '❌';
    if (!isRegistered) return '🚫';
    if (!isOnline) return '📱';
    return '✅';
  };

  const getStatusText = () => {
    if (isLoading) return '初期化中...';
    if (error) return 'エラー';
    if (!isRegistered) return '未登録';
    if (!isOnline) return 'オフライン';
    return 'オンライン';
  };

  const getSyncStatusIcon = () => {
    switch (syncStatus) {
      case 'syncing': return '🔄';
      case 'completed': return '✅';
      case 'error': return '❌';
      default: return '⏸️';
    }
  };

  const getSyncStatusText = () => {
    switch (syncStatus) {
      case 'syncing': return '同期中...';
      case 'completed': return '同期完了';
      case 'error': return '同期エラー';
      default: return '待機中';
    }
  };

  return (
    <div className={`service-worker-status ${className || ''}`}>
      {/* Basic Status */}
      <div className="status-summary">
        <span className="status-icon" role="img" aria-label="Service Worker状態">
          {getStatusIcon()}
        </span>
        <span className="status-text">{getStatusText()}</span>
        
        {syncStatus !== 'idle' && (
          <div className="sync-indicator">
            <span className="sync-icon" role="img" aria-label="同期状態">
              {getSyncStatusIcon()}
            </span>
            <span className="sync-text">{getSyncStatusText()}</span>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-message" role="alert">
          <span className="error-icon">⚠️</span>
          <span className="error-text">{error}</span>
        </div>
      )}

      {/* Detailed Status */}
      {showDetailed && isRegistered && (
        <div className="detailed-status">
          <div className="status-row">
            <span className="label">ネットワーク:</span>
            <span className={`value ${isOnline ? 'online' : 'offline'}`}>
              {isOnline ? 'オンライン' : 'オフライン'}
            </span>
          </div>

          <div className="status-row">
            <span className="label">同期状態:</span>
            <span className={`value sync-${syncStatus}`}>
              {getSyncStatusText()}
            </span>
          </div>

          <div className="actions">
            <button
              onClick={handleManualSync}
              disabled={syncStatus === 'syncing'}
              className="action-button sync-button"
              title="手動同期を実行"
            >
              手動同期
            </button>

            <button
              onClick={toggleCacheDetails}
              className="action-button cache-button"
              title="キャッシュ詳細を表示"
            >
              {showCacheDetails ? 'キャッシュ詳細を隠す' : 'キャッシュ詳細'}
            </button>
          </div>

          {/* Cache Details */}
          {showCacheDetails && cacheStatus && (
            <div className="cache-details">
              <h4>キャッシュ状況</h4>
              <div className="cache-info">
                <div className="cache-row">
                  <span className="label">バージョン:</span>
                  <span className="value">{cacheStatus.version}</span>
                </div>
                <div className="cache-row">
                  <span className="label">キャッシュ数:</span>
                  <span className="value">{cacheStatus.caches?.length || 0}</span>
                </div>
                {cacheStatus.caches && (
                  <div className="cache-list">
                    {cacheStatus.caches.map((cacheName: string) => (
                      <div key={cacheName} className="cache-item">
                        {cacheName}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Update Dialog */}
      {showUpdateDialog && (
        <div className="update-dialog" role="dialog" aria-modal="true">
          <div className="dialog-content">
            <h3>アプリの更新</h3>
            <p>新しいバージョンが利用可能です。今すぐ更新しますか？</p>
            <div className="dialog-actions">
              <button
                onClick={() => setShowUpdateDialog(false)}
                className="dialog-button secondary"
              >
                後で
              </button>
              <button
                onClick={handleUpdate}
                className="dialog-button primary"
              >
                今すぐ更新
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}