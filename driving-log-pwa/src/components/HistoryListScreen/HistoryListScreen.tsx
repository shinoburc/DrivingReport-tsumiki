import React, { useEffect, useState } from 'react';
import { useHistoryList } from '../../hooks/useHistoryList';
import { HistoryFilter } from '../HistoryFilter/HistoryFilter';
import { HistoryCard } from '../HistoryCard/HistoryCard';
import { useResponsiveLayout, getResponsiveClassName } from '../../utils/responsive';
import { createListProps, createButtonProps } from '../../utils/accessibility';
import './HistoryListScreen.css';

export interface HistoryListScreenProps {
  className?: string;
  onRecordSelect?: (recordId: string) => void;
  onNewRecord?: () => void;
}

export function HistoryListScreen({ 
  className, 
  onRecordSelect, 
  onNewRecord 
}: HistoryListScreenProps) {
  const { state, actions } = useHistoryList();
  const layout = useResponsiveLayout();
  const responsiveClass = getResponsiveClassName(layout);

  // Handle scroll for infinite loading
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight * 1.5 && state.hasMore && !state.loading) {
      actions.loadMoreHistory();
    }
  };

  // Render skeleton loader
  const renderSkeletonLoader = () => (
    <div data-testid="skeleton-loader" className="skeleton-loader">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="skeleton-card">
          <div className="skeleton-line skeleton-title"></div>
          <div className="skeleton-line skeleton-subtitle"></div>
          <div className="skeleton-line skeleton-content"></div>
        </div>
      ))}
    </div>
  );

  // Render empty state
  const renderEmptyState = () => {
    const hasActiveFilters = Boolean(
      state.filters.dateRange?.startDate || 
      state.filters.locations?.length ||
      state.filters.status?.length ||
      state.filters.distanceRange ||
      state.filters.durationRange
    );

    if (hasActiveFilters) {
      return (
        <div data-testid="no-results" className="empty-state">
          <div className="empty-icon">🔍</div>
          <h3>検索条件に一致する記録がありません</h3>
          <p>条件を変更して再度お試しください</p>
          <button 
            onClick={() => actions.setFilters({
              dateRange: { startDate: new Date(), endDate: new Date() },
              locations: undefined,
              status: undefined,
              distanceRange: undefined,
              durationRange: undefined
            })}
            className="reset-filters-button"
          >
            フィルターをリセット
          </button>
        </div>
      );
    }

    return (
      <div data-testid="empty-state" className="empty-state">
        <div className="empty-icon">📝</div>
        <h3>運転記録がありません</h3>
        <p>新しい運転記録を作成してみましょう</p>
        {onNewRecord && (
          <button onClick={onNewRecord} className="new-record-button">
            新規記録作成
          </button>
        )}
      </div>
    );
  };

  // Render error state
  const renderErrorState = () => (
    <div data-testid="error-message" className="error-state">
      <div className="error-icon">⚠️</div>
      <h3>エラーが発生しました</h3>
      <p>{state.error}</p>
      <button 
        data-testid="retry-button"
        onClick={actions.refreshHistory}
        className="retry-button"
      >
        再試行
      </button>
    </div>
  );

  return (
    <main 
      data-testid="history-list-screen"
      className={`history-list-screen ${responsiveClass} ${className || ''}`}
      role="main"
    >
      <header className="screen-header">
        <h1>運転記録履歴</h1>
        {onNewRecord && (
          <button 
            onClick={onNewRecord} 
            className="new-record-fab"
            {...createButtonProps('新しい運転記録を作成')}
          >
            ＋
          </button>
        )}
      </header>

      <HistoryFilter
        filters={state.filters}
        onFiltersChange={actions.setFilters}
        onReset={() => actions.setFilters({
          dateRange: { startDate: new Date(), endDate: new Date() },
          locations: undefined,
          status: undefined,
          distanceRange: undefined,
          durationRange: undefined
        })}
      />

      {state.error ? (
        renderErrorState()
      ) : (
        <div 
          data-testid="scroll-container"
          className="scroll-container"
          onScroll={handleScroll}
        >
          {state.loading && state.records.length === 0 ? (
            renderSkeletonLoader()
          ) : state.records.length === 0 ? (
            renderEmptyState()
          ) : (
            <>
              <div 
                data-testid="history-list"
                className="history-list"
                {...createListProps('運転記録一覧')}
              >
                {state.records.map((record) => (
                  <HistoryCard
                    key={record.id}
                    record={record}
                    onClick={onRecordSelect}
                    onEdit={() => console.log('Edit:', record.id)}
                    onDelete={(recordId) => actions.deleteRecord(recordId)}
                  />
                ))}
              </div>

              {state.hasMore && (
                <div className="load-more-container">
                  <button
                    data-testid="load-more-button"
                    onClick={actions.loadMoreHistory}
                    disabled={state.loading}
                    className="load-more-button"
                  >
                    {state.loading ? '読み込み中...' : 'さらに読み込む'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </main>
  );
}