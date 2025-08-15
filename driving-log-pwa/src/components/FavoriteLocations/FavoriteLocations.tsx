import { JSX, useState, useCallback, useMemo } from 'react';
import { FavoriteLocation } from '../../types';
import { createButtonProps, createListProps, createListItemProps } from '../../utils/accessibility';
import './FavoriteLocations.css';

export interface FavoriteLocationsProps {
  locations: FavoriteLocation[];
  onLocationChange: (locations: FavoriteLocation[]) => void;
  onLocationAdd: (location: FavoriteLocation) => void;
  onLocationEdit: (id: string, location: Partial<FavoriteLocation>) => void;
  onLocationDelete: (id: string) => void;
}

interface LocationFormData {
  name: string;
  address: string;
  latitude: number | '';
  longitude: number | '';
  type: 'home' | 'work' | 'other';
  icon: string;
  color: string;
}

export function FavoriteLocations({
  locations,
  onLocationChange,
  onLocationAdd,
  onLocationEdit,
  onLocationDelete,
}: FavoriteLocationsProps): JSX.Element {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'home' | 'work' | 'other'>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [formData, setFormData] = useState<LocationFormData>({
    name: '',
    address: '',
    latitude: '',
    longitude: '',
    type: 'other',
    icon: '📍',
    color: '#757575',
  });
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof LocationFormData, string>>>({});

  // Filter and search locations
  const filteredLocations = useMemo(() => {
    return locations.filter(location => {
      const matchesSearch = !searchQuery || 
        location.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (location.address && location.address.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesType = typeFilter === 'all' || location.type === typeFilter;
      
      return matchesSearch && matchesType;
    });
  }, [locations, searchQuery, typeFilter]);

  const validateForm = (data: LocationFormData): boolean => {
    const errors: Partial<Record<keyof LocationFormData, string>> = {};

    if (!data.name.trim()) {
      errors.name = '地点名は必須です';
    } else if (locations.some(loc => loc.name === data.name.trim() && loc.id !== editingId)) {
      errors.name = 'この名前は既に使用されています';
    }

    if (data.latitude !== '' && (data.latitude < -90 || data.latitude > 90)) {
      errors.latitude = '緯度は-90から90の間で入力してください';
    }

    if (data.longitude !== '' && (data.longitude < -180 || data.longitude > 180)) {
      errors.longitude = '経度は-180から180の間で入力してください';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddCurrentLocation = useCallback(async () => {
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000,
        });
      });

      // Generate unique ID for the location
      const locationId = `location-${Date.now()}`;
      
      const newLocation = {
        id: locationId,
        name: `現在地 ${new Date().toLocaleString('ja-JP')}`,
        address: '',
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        type: 'other' as const,
        icon: '🚩',
        color: '#4CAF50',
        createdAt: new Date(),
        usageCount: 0,
      };

      onLocationAdd(newLocation);
    } catch (error) {
      console.error('Failed to get current location:', error);
      alert('現在位置の取得に失敗しました');
    }
  }, [onLocationAdd]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm(formData)) {
      return;
    }

    if (editingId) {
      const locationData = {
        name: formData.name.trim(),
        address: formData.address.trim(),
        latitude: formData.latitude === '' ? undefined : formData.latitude,
        longitude: formData.longitude === '' ? undefined : formData.longitude,
        type: formData.type,
        icon: formData.icon,
        color: formData.color,
      };
      onLocationEdit(editingId, locationData);
      setEditingId(null);
    } else {
      const newLocationData = {
        id: `location-${Date.now()}`,
        name: formData.name.trim(),
        address: formData.address.trim(),
        latitude: formData.latitude === '' ? undefined : formData.latitude,
        longitude: formData.longitude === '' ? undefined : formData.longitude,
        type: formData.type,
        icon: formData.icon,
        color: formData.color,
        createdAt: new Date(),
        usageCount: 0,
      };
      onLocationAdd(newLocationData);
    }

    resetForm();
    setShowAddForm(false);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      latitude: '',
      longitude: '',
      type: 'other',
      icon: '📍',
      color: '#757575',
    });
    setFormErrors({});
  };

  const handleEdit = (location: FavoriteLocation) => {
    setFormData({
      name: location.name,
      address: location.address || '',
      latitude: location.latitude || '',
      longitude: location.longitude || '',
      type: location.type,
      icon: location.icon || '📍',
      color: location.color || '#757575',
    });
    setEditingId(location.id);
    setShowAddForm(true);
  };

  const handleDelete = (id: string) => {
    onLocationDelete(id);
    setDeleteConfirmId(null);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));
    
    if (dragIndex !== dropIndex) {
      const newLocations = [...locations];
      const draggedItem = newLocations[dragIndex];
      newLocations.splice(dragIndex, 1);
      newLocations.splice(dropIndex, 0, draggedItem);
      onLocationChange(newLocations);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'home': return '🏠';
      case 'work': return '🏢';
      default: return '📍';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'home': return '自宅';
      case 'work': return '職場';
      default: return 'その他';
    }
  };

  return (
    <div className="favorite-locations">
      <h2>よく使う地点</h2>

      {/* Search and Filter */}
      <div className="controls">
        <div className="search-container">
          <input
            type="text"
            placeholder="地点を検索"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-container">
          <label htmlFor="type-filter">地点タイプ</label>
          <select
            id="type-filter"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
          >
            <option value="all">すべて</option>
            <option value="home">自宅</option>
            <option value="work">職場</option>
            <option value="other">その他</option>
          </select>
        </div>

        <div className="action-buttons">
          <button
            onClick={() => setShowAddForm(true)}
            className="add-button"
            {...createButtonProps('地点を追加')}
          >
            地点を追加
          </button>
          <button
            onClick={handleAddCurrentLocation}
            className="current-location-button"
            {...createButtonProps('現在地を追加')}
          >
            現在地を追加
          </button>
        </div>
      </div>

      {/* Locations List */}
      {filteredLocations.length === 0 ? (
        <div className="empty-state">
          {locations.length === 0 ? (
            <>
              <h3>よく使う地点が登録されていません</h3>
              <p>地点を追加して、運転記録をより便利に管理しましょう</p>
              <button
                onClick={() => setShowAddForm(true)}
                className="add-button"
                {...createButtonProps('地点を追加')}
              >
                地点を追加
              </button>
            </>
          ) : (
            <>
              <h3>該当する地点が見つかりません</h3>
              <p>検索条件を変更してください</p>
            </>
          )}
        </div>
      ) : (
        <div className="locations-list" {...createListProps('よく使う地点一覧')}>
          {filteredLocations.map((location, index) => (
            <div
              key={location.id}
              data-testid={`location-item-${location.id}`}
              className="location-item"
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, index)}
              {...createListItemProps(`${location.name} - ${getTypeLabel(location.type)}`)}
            >
              <div className="location-icon" style={{ color: location.color }}>
                {location.icon || getTypeIcon(location.type)}
              </div>

              <div className="location-content">
                <h4 className="location-name">
                  {searchQuery && location.name.toLowerCase().includes(searchQuery.toLowerCase()) ? (
                    <span data-testid="search-highlight" className="search-highlight">
                      {location.name}
                    </span>
                  ) : (
                    location.name
                  )}
                </h4>
                
                <div className="location-details">
                  <span className="location-type">{getTypeLabel(location.type)}</span>
                  {location.address && (
                    <span className="location-address">{location.address}</span>
                  )}
                  {location.latitude && location.longitude && (
                    <span className="location-coordinates">
                      {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                    </span>
                  )}
                </div>

                <div className="location-stats">
                  <span className="usage-count">{location.usageCount}回使用</span>
                  <span className="created-date">
                    作成: {location.createdAt.toLocaleDateString('ja-JP')}
                  </span>
                </div>
              </div>

              <div className="location-actions">
                <button
                  onClick={() => handleEdit(location)}
                  className="edit-button"
                  {...createButtonProps('編集')}
                >
                  編集
                </button>
                <button
                  onClick={() => setDeleteConfirmId(location.id)}
                  className="delete-button"
                  {...createButtonProps('削除')}
                >
                  削除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Form Modal */}
      {showAddForm && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="form-title">
          <div className="modal-content">
            <h3 id="form-title">
              {editingId ? '地点を編集' : '新しい地点を追加'}
            </h3>

            <form onSubmit={handleFormSubmit} className="location-form">
              <div className="form-group">
                <label htmlFor="location-name">地点名 *</label>
                <input
                  id="location-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className={formErrors.name ? 'error' : ''}
                  required
                />
                {formErrors.name && <span className="error-message">{formErrors.name}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="location-address">住所</label>
                <input
                  id="location-address"
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="location-latitude">緯度</label>
                  <input
                    id="location-latitude"
                    type="number"
                    step="any"
                    value={formData.latitude}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      latitude: e.target.value === '' ? '' : parseFloat(e.target.value) 
                    }))}
                    className={formErrors.latitude ? 'error' : ''}
                  />
                  {formErrors.latitude && <span className="error-message">{formErrors.latitude}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="location-longitude">経度</label>
                  <input
                    id="location-longitude"
                    type="number"
                    step="any"
                    value={formData.longitude}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      longitude: e.target.value === '' ? '' : parseFloat(e.target.value) 
                    }))}
                    className={formErrors.longitude ? 'error' : ''}
                  />
                  {formErrors.longitude && <span className="error-message">{formErrors.longitude}</span>}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="location-type">地点タイプ</label>
                <select
                  id="location-type"
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    type: e.target.value as 'home' | 'work' | 'other'
                  }))}
                >
                  <option value="home">自宅</option>
                  <option value="work">職場</option>
                  <option value="other">その他</option>
                </select>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingId(null);
                    resetForm();
                  }}
                  className="cancel-button"
                  {...createButtonProps('キャンセル')}
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="save-button"
                  {...createButtonProps('保存')}
                >
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="delete-title">
          <div className="modal-content">
            <h3 id="delete-title">地点を削除しますか？</h3>
            <p>この操作は取り消せません。</p>
            
            <div className="modal-actions">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="cancel-button"
                {...createButtonProps('キャンセル')}
              >
                キャンセル
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="delete-button"
                {...createButtonProps('削除')}
              >
                削除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}