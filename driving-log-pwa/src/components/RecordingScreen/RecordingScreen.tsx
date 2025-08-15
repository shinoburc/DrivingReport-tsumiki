import { useRecording } from '../../hooks/useRecording';
import { useResponsive } from '../../hooks/useResponsive';
import { useWaypointActions } from '../../hooks/useWaypointActions';
import { formatElapsedTime, formatTime, formatDistance, formatSpeed, formatCoordinates, formatTimeStamp } from '../../utils/formatters';
import { getGPSStatusColor, getGPSStatusText, getGPSIconBySignal } from '../../utils/gpsHelpers';
import './RecordingScreen.css';

export interface RecordingScreenProps {
  className?: string;
  onRecordComplete?: (log: any) => void;
  onRecordCancel?: () => void;
  onNavigate?: (route: string) => void;
}

export function RecordingScreen({ 
  className, 
  onRecordComplete, 
  onRecordCancel, 
  onNavigate 
}: RecordingScreenProps) {
  const { state, actions } = useRecording();
  const { layout } = useResponsive();
  const waypointActions = useWaypointActions({ addWaypoint: actions.addWaypoint });


  // Handle recording actions
  const handleStartRecording = async () => {
    await actions.startRecording();
  };

  const handleCompleteRecording = async () => {
    try {
      const completedLog = await actions.completeRecording();
      onRecordComplete?.(completedLog);
    } catch (error) {
      console.error('Failed to complete recording:', error);
    }
  };

  const handleCancelRecording = () => {
    actions.cancelRecording();
    onRecordCancel?.();
  };



  return (
    <main 
      data-testid="recording-screen"
      className={`recording-screen ${layout} ${className || ''}`}
      role="main"
    >
      {/* Header */}
      <header data-testid="recording-header" role="banner">
        <button 
          onClick={() => onNavigate?.('/dashboard')}
          aria-label="ダッシュボードに戻る"
        >
          ←
        </button>
        <h1>運転記録</h1>
        <div className="elapsed-time">
          {formatElapsedTime(state.elapsedTime)}
        </div>
      </header>

      {/* GPS Indicator */}
      <section 
        data-testid="gps-indicator"
        role="region"
        aria-label="GPS状態"
        aria-live="polite"
      >
        <div 
          className="gps-status"
          style={{ color: getGPSStatusColor(state.gpsStatus.signal) }}
        >
          <div 
            data-testid={`gps-signal-${state.gpsStatus.signal}`}
            className={`gps-icon signal-${state.gpsStatus.signal}`}
          >
            {getGPSIconBySignal(state.gpsStatus.signal)}
          </div>
          <span>{getGPSStatusText(state.gpsStatus)}</span>
        </div>
        {state.currentLocation && (
          <div className="coordinates">
            {formatCoordinates(state.currentLocation.latitude, state.currentLocation.longitude)}
          </div>
        )}
      </section>

      {/* Main Controls */}
      <section 
        data-testid="main-controls"
        role="region"
        aria-label="記録制御"
      >
        {!state.isRecording ? (
          <button
            className="start-button"
            onClick={handleStartRecording}
            aria-label="運転記録を開始"
            tabIndex={0}
            style={{ minWidth: '60px', minHeight: '60px' }}
          >
            記録開始
          </button>
        ) : (
          <div className="recording-controls">
            {state.isPaused ? (
              <>
                <div className="status-text">一時停止中</div>
                <button
                  onClick={actions.resumeRecording}
                  aria-label="記録を再開"
                  tabIndex={0}
                >
                  再開
                </button>
              </>
            ) : (
              <button
                onClick={actions.pauseRecording}
                aria-label="記録を一時停止"
                tabIndex={0}
              >
                一時停止
              </button>
            )}
            <button
              onClick={handleCompleteRecording}
              aria-label="記録を完了"
              tabIndex={0}
            >
              完了
            </button>
            <button
              onClick={handleCancelRecording}
              aria-label="記録をキャンセル"
              tabIndex={0}
            >
              キャンセル
            </button>
          </div>
        )}
      </section>

      {/* Statistics Panel */}
      <section 
        data-testid="statistics-panel"
        role="region"
        aria-label="記録統計"
      >
        <h2>記録情報</h2>
        <div className="stats-grid">
          <div className="stat-item">
            <label>走行距離</label>
            <span>{formatDistance(state.statistics.distance)}km</span>
          </div>
          <div className="stat-item">
            <label>平均速度</label>
            <span>{formatSpeed(state.statistics.averageSpeed)}km/h</span>
          </div>
          <div className="stat-item">
            <label>最高速度</label>
            <span>{formatSpeed(state.statistics.maxSpeed)}km/h</span>
          </div>
          <div className="stat-item">
            <label>経過時間</label>
            <span>{formatTime(state.elapsedTime)}</span>
          </div>
          <div className="stat-item">
            <label>移動時間</label>
            <span>{formatTime(state.statistics.movingTime)}</span>
          </div>
          <div className="stat-item">
            <label>停止時間</label>
            <span>{formatTime(state.statistics.stopTime)}</span>
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      {state.isRecording && (
        <section className="quick-actions" role="region" aria-label="クイックアクション">
          <h3>クイック追加</h3>
          <div className="quick-buttons">
            <button 
              onClick={waypointActions.handleQuickAddFuel}
              aria-label="給油地点を追加"
            >
              給油
            </button>
            <button 
              onClick={waypointActions.handleQuickAddRest}
              aria-label="休憩地点を追加"
            >
              休憩
            </button>
            <button 
              onClick={waypointActions.handleQuickAddParking}
              aria-label="駐車地点を追加"
            >
              駐車
            </button>
          </div>
        </section>
      )}

      {/* Waypoint Section */}
      <section 
        data-testid="waypoint-section"
        role="region"
        aria-label="地点管理"
      >
        <h2>記録地点</h2>
        {state.isRecording && (
          <button 
            onClick={() => waypointActions.handleAddWaypoint()}
            aria-label="現在地を地点として追加"
          >
            地点追加
          </button>
        )}
        <div className="waypoint-list">
          {state.waypoints.length === 0 ? (
            <p>記録された地点はありません</p>
          ) : (
            state.waypoints.map((waypoint) => (
              <div 
                key={waypoint.id}
                className={`waypoint-item ${waypoint.type}`}
                data-testid={`waypoint-${waypoint.type}`}
              >
                <div className="waypoint-info">
                  <span className="waypoint-name">{waypoint.name || '地点'}</span>
                  <span className="waypoint-time">
                    {formatTimeStamp(waypoint.timestamp)}
                  </span>
                </div>
                <div className="waypoint-actions">
                  <button 
                    onClick={() => actions.removeWaypoint(waypoint.id)}
                    aria-label={`${waypoint.name}を削除`}
                  >
                    削除
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Error Display */}
      {state.errors.map((error, index) => (
        <div key={index} className="error-message" role="alert">
          <p>{error.message}</p>
          <div className="error-actions">
            {error.recoverable && error.action && (
              <button onClick={error.action}>
                再試行
              </button>
            )}
            <button 
              onClick={() => actions.dismissError(index)}
              aria-label="エラーを閉じる"
            >
              閉じる
            </button>
          </div>
        </div>
      ))}
    </main>
  );
}