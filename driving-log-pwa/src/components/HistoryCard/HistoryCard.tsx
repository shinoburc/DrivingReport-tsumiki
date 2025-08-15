import { JSX } from 'react';
import { DrivingLog } from '../../types';
import { formatElapsedTime, formatDistance } from '../../utils/formatters';
import { createButtonProps } from '../../utils/accessibility';
import './HistoryCard.css';

export interface HistoryCardProps {
  record: DrivingLog;
  onClick?: (recordId: string) => void;
  onEdit?: (recordId: string) => void;
  onDelete?: (recordId: string) => void;
}

export function HistoryCard({ record, onClick, onEdit, onDelete }: HistoryCardProps) {
  const getStatusClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return 'status-completed';
      case 'in_progress': return 'status-in-progress';
      case 'cancelled': return 'status-cancelled';
      default: return 'status-unknown';
    }
  };

  const formatDuration = () => {
    if (!record.startTime || !record.endTime) return '不明';
    const duration = (record.endTime.getTime() - record.startTime.getTime()) / 1000;
    return formatElapsedTime(Math.floor(duration));
  };

  const getStartLocation = () => {
    return record.waypoints.find(wp => wp.type === 'START')?.name || '不明';
  };

  const getEndLocation = () => {
    return record.waypoints.find(wp => wp.type === 'END')?.name || '不明';
  };

  return (
    <div 
      data-testid={`history-card-${record.id}`}
      className="history-card"
      onClick={() => onClick?.(record.id)}
      {...createButtonProps(`運転記録: ${record.date.toLocaleDateString('ja-JP')}`)}
    >
      <div className="card-header">
        <div className="card-date">
          {record.date.toLocaleDateString('ja-JP', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </div>
        <div className={`card-status ${getStatusClass(record.status)}`}>
          {record.status}
        </div>
      </div>

      <div className="card-content">
        <div className="route-info">
          <span className="start-location">{getStartLocation()}</span>
          <span className="route-arrow"> → </span>
          <span className="end-location">{getEndLocation()}</span>
        </div>

        <div className="trip-stats">
          <div className="stat-item">
            <span className="stat-label">時間:</span>
            <span className="stat-value">{formatDuration()}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">距離:</span>
            <span className="stat-value">{formatDistance(record.totalDistance || 0)}km</span>
          </div>
        </div>
      </div>

      <div className="card-actions" onClick={(e) => e.stopPropagation()}>
        {onEdit && (
          <button
            onClick={() => onEdit(record.id)}
            className="action-button edit-button"
            {...createButtonProps('編集')}
          >
            編集
          </button>
        )}
        {onDelete && (
          <button
            onClick={() => onDelete(record.id)}
            className="action-button delete-button"
            {...createButtonProps('削除')}
          >
            削除
          </button>
        )}
      </div>
    </div>
  );
}