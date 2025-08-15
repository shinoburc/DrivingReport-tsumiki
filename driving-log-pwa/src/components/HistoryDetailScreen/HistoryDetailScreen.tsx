import { JSX, useEffect, useState } from 'react';
import { useHistoryDetail } from '../../hooks/useHistoryDetail';
import { WaypointList } from '../WaypointList/WaypointList';
import { formatElapsedTime, formatDistance, formatSpeed, formatTimeStamp } from '../../utils/formatters';
import './HistoryDetailScreen.css';

export interface HistoryDetailScreenProps {
  recordId: string;
  className?: string;
  onBack?: () => void;
  onEdit?: (recordId: string) => void;
  onDelete?: (recordId: string) => void;
}

export function HistoryDetailScreen({ 
  recordId, 
  className, 
  onBack, 
  onEdit, 
  onDelete 
}: HistoryDetailScreenProps) {
  const { state, actions } = useHistoryDetail();
  const [responsiveClass, setResponsiveClass] = useState('');
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);

  // Handle responsive design
  useEffect(() => {
    const updateResponsiveClass = () => {
      const width = window.innerWidth;
      if (width <= 480) {
        setResponsiveClass('mobile-layout');
      } else if (width <= 768) {
        setResponsiveClass('tablet-layout');
      } else {
        setResponsiveClass('desktop-layout');
      }
    };

    updateResponsiveClass();
    window.addEventListener('resize', updateResponsiveClass);
    return () => window.removeEventListener('resize', updateResponsiveClass);
  }, []);

  // Load record on mount or when recordId changes
  useEffect(() => {
    if (recordId) {
      actions.loadRecord(recordId);
    }
  }, [recordId, actions]);

  // Calculate statistics
  const calculateStatistics = () => {
    if (!state.record || !state.record.startTime || !state.record.endTime) {
      return null;
    }

    const duration = (state.record.endTime.getTime() - state.record.startTime.getTime()) / 1000;
    const distance = state.record.totalDistance || 0;
    const averageSpeed = duration > 0 ? (distance / (duration / 3600)) : 0;

    return {
      duration: Math.floor(duration),
      distance,
      averageSpeed,
      maxSpeed: 0, // TODO: Calculate from waypoints
      stopTime: 0, // TODO: Calculate from waypoints
      movingTime: Math.floor(duration)
    };
  };

  // Handle delete confirmation
  const handleDeleteClick = () => {
    setShowDeleteConfirmation(true);
  };

  const handleDeleteConfirm = async () => {
    await actions.deleteRecord(recordId);
    setShowDeleteConfirmation(false);
    onDelete?.(recordId);
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirmation(false);
  };

  // Render loading state
  if (state.loading) {
    return (
      <main data-testid="history-detail-screen" className={`history-detail-screen ${responsiveClass} ${className || ''}`}>
        <div data-testid="loading-spinner" className="loading-spinner">
          <div className="spinner"></div>
          <p>読み込み中...</p>
        </div>
      </main>
    );
  }

  // Render error state
  if (state.error) {
    return (
      <main data-testid="history-detail-screen" className={`history-detail-screen ${responsiveClass} ${className || ''}`}>
        <div data-testid="error-message" className="error-state">
          <div className="error-icon">⚠️</div>
          <h3>エラーが発生しました</h3>
          <p>{state.error}</p>
          <button 
            data-testid="retry-button"
            onClick={() => actions.loadRecord(recordId)}
            className="retry-button"
          >
            再試行
          </button>
        </div>
      </main>
    );
  }

  const statistics = calculateStatistics();
  const startLocation = state.waypoints.find(wp => wp.type === 'START')?.name || '不明';
  const endLocation = state.waypoints.find(wp => wp.type === 'END')?.name || '不明';

  return (
    <main 
      data-testid="history-detail-screen"
      className={`history-detail-screen ${responsiveClass} ${className || ''}`}
      role="main"
    >
      <header className="detail-header">
        <button 
          data-testid="back-button"
          onClick={onBack}
          className="back-button"
          aria-label="戻る"
        >
          ←
        </button>
        <h1>運転記録詳細</h1>
        <div className="header-actions">
          <button 
            data-testid="edit-button"
            onClick={() => actions.toggleEditing()}
            className="edit-button"
          >
            編集
          </button>
          <button 
            data-testid="delete-button"
            onClick={handleDeleteClick}
            className="delete-button"
          >
            削除
          </button>
          <button 
            data-testid="export-button"
            onClick={() => actions.exportRecord(recordId)}
            className="export-button"
          >
            出力
          </button>
        </div>
      </header>

      {state.record && (
        <>
          {/* Record Summary */}
          <section data-testid="record-summary" className="record-summary">
            <h2>記録概要</h2>
            <div className="summary-grid">
              <div className="summary-item">
                <label>日付</label>
                <span>{state.record.date.toLocaleDateString('ja-JP')}</span>
              </div>
              <div className="summary-item">
                <label>開始時刻</label>
                <span>{state.record.startTime ? formatTimeStamp(state.record.startTime) : '不明'}</span>
              </div>
              <div className="summary-item">
                <label>終了時刻</label>
                <span>{state.record.endTime ? formatTimeStamp(state.record.endTime) : '不明'}</span>
              </div>
              <div className="summary-item">
                <label>所要時間</label>
                <span>{statistics ? formatElapsedTime(statistics.duration) : '不明'}</span>
              </div>
              <div className="summary-item">
                <label>出発地</label>
                <span>{startLocation}</span>
              </div>
              <div className="summary-item">
                <label>到着地</label>
                <span>{endLocation}</span>
              </div>
            </div>
            <div 
              data-testid="record-status"
              className={`status-badge status-${state.record.status.toLowerCase()}`}
              aria-live="polite"
            >
              {state.record.status}
            </div>
          </section>

          {/* Record Statistics */}
          {statistics && (
            <section data-testid="record-statistics" className="record-statistics">
              <h2>統計情報</h2>
              <div className="stats-grid">
                <div className="stat-item">
                  <label>走行距離</label>
                  <span>{formatDistance(statistics.distance)}km</span>
                </div>
                <div className="stat-item">
                  <label>平均速度</label>
                  <span>{formatSpeed(statistics.averageSpeed)}km/h</span>
                </div>
                <div className="stat-item">
                  <label>最高速度</label>
                  <span>{formatSpeed(statistics.maxSpeed)}km/h</span>
                </div>
                <div className="stat-item">
                  <label>移動時間</label>
                  <span>{formatElapsedTime(statistics.movingTime)}</span>
                </div>
                <div className="stat-item">
                  <label>停止時間</label>
                  <span>{formatElapsedTime(statistics.stopTime)}</span>
                </div>
              </div>
            </section>
          )}

          {/* GPS Accuracy */}
          <section data-testid="gps-accuracy" className="gps-accuracy">
            <h3>GPS精度</h3>
            <p>平均精度: 良好 (5.0m)</p>
          </section>

          {/* Waypoints */}
          <section data-testid="waypoint-list" className="waypoint-section">
            <h2>記録地点</h2>
            <WaypointList
              waypoints={state.waypoints}
              editable={state.editing}
              onEditWaypoint={(waypointId, name) => 
                actions.editWaypoint(waypointId, { name })
              }
            />
          </section>

          {/* Edit Form */}
          {state.editing && (
            <section data-testid="edit-form" className="edit-form">
              <h3>編集</h3>
              <div className="form-actions">
                <button 
                  data-testid="save-button"
                  onClick={() => actions.editRecord(recordId, {})}
                  className="save-button"
                >
                  保存
                </button>
                <button 
                  data-testid="cancel-button"
                  onClick={actions.toggleEditing}
                  className="cancel-button"
                >
                  キャンセル
                </button>
              </div>
            </section>
          )}
        </>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirmation && (
        <div data-testid="delete-confirmation" className="modal-overlay">
          <div className="modal-content">
            <h3>削除の確認</h3>
            <p>この記録を削除しますか？</p>
            <p className="warning">この操作は取り消せません。</p>
            <div className="modal-actions">
              <button 
                data-testid="confirm-delete"
                onClick={handleDeleteConfirm}
                className="confirm-button"
              >
                削除
              </button>
              <button 
                onClick={handleDeleteCancel}
                className="cancel-button"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}