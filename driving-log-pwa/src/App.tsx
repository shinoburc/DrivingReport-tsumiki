import React, { useState } from 'react';
import { Dashboard } from './components/Dashboard/Dashboard';
import { HistoryListScreen } from './components/HistoryListScreen/HistoryListScreen';
import { RecordingScreen } from './components/RecordingScreen/RecordingScreen';
import { SettingsScreen } from './components/SettingsScreen/SettingsScreen';

type Screen = 'dashboard' | 'history' | 'recording' | 'settings';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('dashboard');
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [dashboardRefreshKey, setDashboardRefreshKey] = useState(0);

  const navigateToScreen = (screen: string) => {
    switch (screen) {
      case '/history':
        setCurrentScreen('history');
        break;
      case '/settings':
        setCurrentScreen('settings');
        break;
      case '/recording':
        setCurrentScreen('recording');
        break;
      default:
        setCurrentScreen('dashboard');
    }
  };

  const handleRecordStart = () => {
    setCurrentScreen('recording');
  };

  const handleRecordComplete = () => {
    setCurrentScreen('dashboard');
    setRecordingId(null);
    setDashboardRefreshKey(prev => prev + 1);
  };

  const handleBackToDashboard = () => {
    setCurrentScreen('dashboard');
    setDashboardRefreshKey(prev => prev + 1);
  };

  const handleRecordCancel = () => {
    setCurrentScreen('dashboard');
    setDashboardRefreshKey(prev => prev + 1);
  };

  const renderCurrentScreen = () => {
    switch (currentScreen) {
      case 'dashboard':
        return (
          <Dashboard
            onRecordStart={handleRecordStart}
            onNavigate={navigateToScreen}
            refreshKey={dashboardRefreshKey}
          />
        );
      case 'history':
        return (
          <div>
            <button onClick={handleBackToDashboard} style={{ marginBottom: '20px' }}>
              ← ダッシュボードに戻る
            </button>
            <HistoryListScreen
              onRecordSelect={(id) => console.log('Selected record:', id)}
              onNewRecord={handleRecordStart}
            />
          </div>
        );
      case 'recording':
        return (
          <div>
            <button onClick={handleBackToDashboard} style={{ marginBottom: '20px' }}>
              ← ダッシュボードに戻る
            </button>
            <RecordingScreen
              onRecordComplete={handleRecordComplete}
              onRecordCancel={handleRecordCancel}
            />
          </div>
        );
      case 'settings':
        return (
          <div>
            <button onClick={handleBackToDashboard} style={{ marginBottom: '20px' }}>
              ← ダッシュボードに戻る
            </button>
            <SettingsScreen />
          </div>
        );
      default:
        return (
          <Dashboard
            onRecordStart={handleRecordStart}
            onNavigate={navigateToScreen}
            refreshKey={dashboardRefreshKey}
          />
        );
    }
  };

  return (
    <div className="app">
      {renderCurrentScreen()}
    </div>
  );
}