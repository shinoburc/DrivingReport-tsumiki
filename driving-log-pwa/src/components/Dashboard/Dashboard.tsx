import { useDashboard } from '../../hooks/useDashboard';
import { useEffect, useState } from 'react';
import './Dashboard.css';

export interface DashboardProps {
  className?: string;
  onRecordStart?: () => void;
  onNavigate?: (route: string) => void;
  refreshKey?: number;
}

export function Dashboard({ className, onRecordStart, onNavigate, refreshKey }: DashboardProps) {
  const { state, actions } = useDashboard();
  const [responsiveClass, setResponsiveClass] = useState('');

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

  // Refresh data when component becomes visible
  useEffect(() => {
    if (refreshKey > 0) {
      actions.refreshData();
    }
  }, [refreshKey]);

  const handleStartRecording = async () => {
    await actions.startRecording();
    onRecordStart?.();
  };

  const handleStopRecording = () => {
    // Navigate to recording screen for proper recording management
    onNavigate?.('/recording');
  };

  const handleNavigate = (route: string) => {
    onNavigate?.(route);
  };

  const formatDistance = (distance: number): string => {
    return distance.toLocaleString('ja-JP', { 
      minimumFractionDigits: 1, 
      maximumFractionDigits: 1 
    });
  };

  if (state.isLoading) {
    return (
      <div data-testid="loading-indicator">Loading...</div>
    );
  }

  return (
    <main 
      data-testid="dashboard"
      className={`dashboard ${responsiveClass} ${className || ''}`}
      role="main"
    >
      {/* Header */}
      <header role="banner">
        <h1>運転日報</h1>
      </header>

      {/* Recording Section */}
      <section data-testid="recording-section" role="region" aria-label="記録操作">
        {state.currentRecording ? (
          <div>
            <span>記録中</span>
            <div data-testid="recording-timer">進行時間表示</div>
            <button 
              role="button" 
              aria-label="記録停止"
              onClick={handleStopRecording}
            >
              記録停止
            </button>
          </div>
        ) : (
          <button 
            role="button"
            aria-label="運転記録を開始"
            onClick={handleStartRecording}
            tabIndex={0}
          >
            記録開始
          </button>
        )}
        <div data-testid="gps-indicator">GPS状態</div>
      </section>

      {/* Recent Logs Section */}
      <section data-testid="recent-logs-section" role="region" aria-label="最近の記録">
        <h2>最近の記録</h2>
        {state.recentLogs.length === 0 ? (
          <div>
            <p>記録がありません</p>
            <p>記録を開始してみましょう</p>
          </div>
        ) : (
          <div>
            {state.recentLogs.map((log) => (
              <div 
                key={log.id}
                data-testid={`log-item-${log.id}`}
                onClick={() => handleNavigate(`/history/${log.id}`)}
                tabIndex={0}
                role="button"
              >
                <div>{log.startLocation?.name}</div>
                <div>{log.endLocation?.name}</div>
                <div>{formatDistance(log.totalDistance || 0)}km</div>
                <div>{log.duration || 0}分</div>
                <div data-testid={`status-${log.status?.toLowerCase() || 'unknown'}`}>
                  {log.status === 'COMPLETED' && '完了'}
                  {log.status === 'IN_PROGRESS' && '進行中'}
                  {log.status === 'CANCELLED' && 'キャンセル'}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Statistics Section */}
      <section 
        data-testid="statistics-section" 
        role="region" 
        aria-label="統計情報"
      >
        <h2>統計</h2>
        <div data-testid="statistics-grid" className="grid-responsive">
          <div>今日: {formatDistance(state.statistics.todayDistance)}km</div>
          <div>今週: {formatDistance(state.statistics.weekDistance)}km</div>
          <div>今月: {formatDistance(state.statistics.monthDistance)}km</div>
          <div>総記録: {state.statistics.totalRecords}件</div>
        </div>
      </section>

      {/* Navigation Section */}
      <section data-testid="navigation-section" role="region" aria-label="ナビゲーション">
        <button 
          role="button"
          onClick={() => handleNavigate('/history')}
          tabIndex={0}
        >
          履歴
        </button>
        <button 
          role="button"
          onClick={() => handleNavigate('/settings')}
          tabIndex={0}
        >
          設定
        </button>
        <button 
          role="button"
          onClick={() => handleNavigate('/export')}
          tabIndex={0}
        >
          エクスポート
        </button>
      </section>

      {/* Error Display */}
      {state.errors.map((error, index) => (
        <div key={index} className="error-message">
          <p>{error.message}</p>
          {error.recoverable && (
            <button onClick={() => actions.retryAction(index)}>
              再試行
            </button>
          )}
          <button onClick={() => actions.dismissError(index)} style={{ marginLeft: '8px' }}>
            ✕
          </button>
        </div>
      ))}
    </main>
  );
}