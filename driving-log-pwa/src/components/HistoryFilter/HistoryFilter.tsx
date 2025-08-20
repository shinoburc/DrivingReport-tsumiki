import React, { useState, useCallback, useEffect } from 'react';
import { HistoryFilters } from '../../types';
import { DrivingLogStatus } from '../../types';
import { useResponsiveLayout, getResponsiveClassName, isMobile } from '../../utils/responsive';
import { createButtonProps } from '../../utils/accessibility';
import './HistoryFilter.css';

export interface HistoryFilterProps {
  filters: HistoryFilters;
  onFiltersChange: (filters: HistoryFilters) => void;
  onReset: () => void;
}

export function HistoryFilter({ filters, onFiltersChange, onReset }: HistoryFilterProps) {
  const [expanded, setExpanded] = useState(false);
  const layout = useResponsiveLayout();
  const responsiveClass = getResponsiveClassName(layout);

  useEffect(() => {
    if (!isMobile(layout)) {
      setExpanded(true);
    }
  }, [layout]);

  const handleLocationSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    onFiltersChange({
      ...filters,
      locations: value ? [value] : undefined
    });
  }, [filters, onFiltersChange]);

  const handleStatusChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    onFiltersChange({
      ...filters,
      status: value ? [value as DrivingLogStatus] : undefined
    });
  }, [filters, onFiltersChange]);

  const handleStartDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    onFiltersChange({
      ...filters,
      dateRange: {
        startDate: value ? new Date(value) : new Date(),
        endDate: filters.dateRange?.endDate || new Date()
      }
    });
  }, [filters, onFiltersChange]);

  const handleEndDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    onFiltersChange({
      ...filters,
      dateRange: {
        startDate: filters.dateRange?.startDate || new Date(),
        endDate: value ? new Date(value) : new Date()
      }
    });
  }, [filters, onFiltersChange]);

  const handleMinDistanceChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value)) {
      onFiltersChange({
        ...filters,
        distanceRange: {
          ...filters.distanceRange,
          min: value
        }
      });
    }
  }, [filters, onFiltersChange]);

  const handleMaxDistanceChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value)) {
      onFiltersChange({
        ...filters,
        distanceRange: {
          ...filters.distanceRange,
          max: value
        }
      });
    }
  }, [filters, onFiltersChange]);

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.dateRange?.startDate || filters.dateRange?.endDate) count++;
    if (filters.locations?.length) count++;
    if (filters.status?.length) count++;
    if (filters.distanceRange) count++;
    return count;
  };

  return (
    <div data-testid="history-filter" className={`history-filter ${responsiveClass}`}>
      <div className="filter-header">
        <h3>検索・フィルター</h3>
        <div className="filter-controls">
          {getActiveFilterCount() > 0 && (
            <span data-testid="active-filter-count" className="filter-count">
              {getActiveFilterCount()}
            </span>
          )}
          <button
            data-testid="filter-expand-button"
            onClick={() => setExpanded(!expanded)}
            className="expand-button"
            {...createButtonProps('フィルターを展開')}
          >
            {expanded ? '▼' : '▶'}
          </button>
        </div>
      </div>

      <div 
        data-testid="filter-panel"
        className={`filter-panel ${responsiveClass} ${expanded ? 'expanded' : 'collapsed'}`}
      >
        {/* Search */}
        <div className="filter-group">
          <label htmlFor="location-search">検索</label>
          <input
            id="location-search"
            data-testid="location-search-input"
            type="text"
            value={filters.locations?.[0] || ''}
            onChange={handleLocationSearchChange}
            placeholder="地点名で検索"
            aria-describedby="location-search-help"
            tabIndex={0}
          />
          <small id="location-search-help">出発地・到着地・経由地から検索</small>
        </div>

        {/* Date Range */}
        <div className="filter-group">
          <label htmlFor="start-date">開始日</label>
          <input
            id="start-date"
            data-testid="start-date-input"
            type="date"
            value={filters.dateRange?.startDate?.toISOString().split('T')[0] || ''}
            onChange={handleStartDateChange}
            tabIndex={0}
          />
        </div>

        <div className="filter-group">
          <label htmlFor="end-date">終了日</label>
          <input
            id="end-date"
            data-testid="end-date-input"
            type="date"
            value={filters.dateRange?.endDate?.toISOString().split('T')[0] || ''}
            onChange={handleEndDateChange}
            tabIndex={0}
          />
        </div>

        {/* Status Filter */}
        <div className="filter-group">
          <label htmlFor="status-filter">ステータス</label>
          <select
            id="status-filter"
            data-testid="status-filter-select"
            value={filters.status?.[0] || ''}
            onChange={handleStatusChange}
            tabIndex={0}
          >
            <option value="">すべて</option>
            <option value="completed">完了</option>
            <option value="in_progress">進行中</option>
            <option value="cancelled">キャンセル</option>
          </select>
        </div>

        {/* Distance Range */}
        <div className="filter-group">
          <label htmlFor="min-distance">最小距離 (km)</label>
          <input
            id="min-distance"
            data-testid="min-distance-input"
            type="number"
            min="0"
            step="0.1"
            value={filters.distanceRange?.min || ''}
            onChange={handleMinDistanceChange}
            tabIndex={0}
          />
        </div>

        <div className="filter-group">
          <label htmlFor="max-distance">最大距離 (km)</label>
          <input
            id="max-distance"
            data-testid="max-distance-input"
            type="number"
            min="0"
            step="0.1"
            value={filters.distanceRange?.max || ''}
            onChange={handleMaxDistanceChange}
            tabIndex={0}
          />
        </div>

        {/* Duration Range */}
        <div className="filter-group">
          <label htmlFor="min-duration">最小時間 (分)</label>
          <input
            id="min-duration"
            data-testid="min-duration-input"
            type="number"
            min="0"
            value={filters.durationRange?.min || ''}
            onChange={(e) => {
              const value = parseInt(e.target.value);
              if (!isNaN(value)) {
                onFiltersChange({
                  ...filters,
                  durationRange: { ...filters.durationRange, min: value }
                });
              }
            }}
            tabIndex={0}
          />
        </div>

        <div className="filter-group">
          <label htmlFor="max-duration">最大時間 (分)</label>
          <input
            id="max-duration"
            data-testid="max-duration-input"
            type="number"
            min="0"
            value={filters.durationRange?.max || ''}
            onChange={(e) => {
              const value = parseInt(e.target.value);
              if (!isNaN(value)) {
                onFiltersChange({
                  ...filters,
                  durationRange: { ...filters.durationRange, max: value }
                });
              }
            }}
            tabIndex={0}
          />
        </div>

        {/* Quick Presets */}
        <div className="filter-group">
          <button
            data-testid="preset-today"
            onClick={() => {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const tomorrow = new Date(today);
              tomorrow.setDate(today.getDate() + 1);
              onFiltersChange({
                ...filters,
                dateRange: { startDate: today, endDate: tomorrow }
              });
            }}
            className="preset-button"
            tabIndex={0}
          >
            今日
          </button>
        </div>

        {/* Reset Button */}
        <div className="filter-actions">
          <button
            data-testid="filter-reset-button"
            onClick={onReset}
            className="reset-button"
            tabIndex={0}
          >
            リセット
          </button>
        </div>

        {/* Validation Errors (placeholders) */}
        <div data-testid="date-range-error" className="error-message" style={{ display: 'none' }}>
          終了日は開始日より後の日付を選択してください
        </div>
        <div data-testid="distance-validation-error" className="error-message" style={{ display: 'none' }}>
          有効な数値を入力してください
        </div>
        <div data-testid="distance-range-error" className="error-message" style={{ display: 'none' }}>
          最小値は最大値より小さい値を入力してください
        </div>
      </div>
    </div>
  );
}