import React from 'react';
import { Location } from '../../types';
import { formatTimeStamp } from '../../utils/formatters';
import { createListProps, createListItemProps } from '../../utils/accessibility';
import './WaypointList.css';

export interface WaypointListProps {
  waypoints: Location[];
  editable?: boolean;
  onEditWaypoint?: (waypointId: string, name: string) => void;
}

export function WaypointList({ waypoints, editable = false, onEditWaypoint }: WaypointListProps) {
  const getWaypointIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'start': return '🏠';
      case 'end': return '🏢';
      case 'fuel': return '⛽';
      case 'rest': return '☕';
      case 'parking': return '🅿️';
      default: return '📍';
    }
  };

  const getWaypointClass = (type: string) => {
    return `waypoint-item ${type.toLowerCase()}`;
  };

  if (waypoints.length === 0) {
    return (
      <div className="waypoint-list-empty">
        <p>記録された地点はありません</p>
      </div>
    );
  }

  return (
    <div className="waypoint-list" {...createListProps('記録された地点一覧')}>
      {waypoints.map((waypoint, index) => (
        <div 
          key={waypoint.id}
          data-testid={`waypoint-item-${waypoint.id}`}
          className={getWaypointClass(waypoint.type)}
          role="listitem"
        >
          <div className="waypoint-icon">
            {getWaypointIcon(waypoint.type)}
          </div>
          
          <div className="waypoint-content">
            <div className="waypoint-header">
              {editable ? (
                <input
                  type="text"
                  defaultValue={waypoint.name || '地点'}
                  onBlur={(e) => onEditWaypoint?.(waypoint.id, e.target.value)}
                  className="waypoint-name-input"
                />
              ) : (
                <span className="waypoint-name">{waypoint.name || '地点'}</span>
              )}
            </div>
            
            <div className="waypoint-details">
              <div className="waypoint-time">
                {formatTimeStamp(waypoint.timestamp)}
              </div>
              {waypoint.latitude && waypoint.longitude && (
                <div className="waypoint-coordinates">
                  {waypoint.latitude.toFixed(6)}, {waypoint.longitude.toFixed(6)}
                </div>
              )}
              {waypoint.accuracy && (
                <div className="waypoint-accuracy">
                  精度: {waypoint.accuracy}m
                </div>
              )}
            </div>
          </div>

          {index < waypoints.length - 1 && (
            <div className="waypoint-connector">
              <div className="connector-line"></div>
              <div className="connector-arrow">↓</div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}