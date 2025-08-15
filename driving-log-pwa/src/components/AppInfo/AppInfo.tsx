import { JSX } from 'react';
import { AppSettings } from '../../types';

export interface AppInfoProps {
  settings: AppSettings;
}

export function AppInfo({ settings }: AppInfoProps): JSX.Element {
  return (
    <div className="app-info">
      <h2>アプリ情報</h2>

      {/* Version Information */}
      <div className="setting-group">
        <h3>バージョン情報</h3>
        
        <div className="info-item">
          <span className="info-label">アプリバージョン:</span>
          <span className="info-value">{settings.appVersion}</span>
        </div>

        <div className="info-item">
          <span className="info-label">使用開始日:</span>
          <span className="info-value">{settings.firstLaunchDate.toLocaleDateString('ja-JP')}</span>
        </div>
      </div>

      {/* License Information */}
      <div className="setting-group">
        <h3>ライセンス</h3>
        <p>このアプリケーションはオープンソースソフトウェアです。</p>
        
        <button className="link-button">
          オープンソースライセンス
        </button>
      </div>

      {/* Help & Support */}
      <div className="setting-group">
        <h3>ヘルプ・サポート</h3>
        
        <div className="help-links">
          <button className="link-button">使い方ガイド</button>
          <button className="link-button">よくある質問</button>
          <button className="link-button">お問い合わせ</button>
        </div>
      </div>
    </div>
  );
}