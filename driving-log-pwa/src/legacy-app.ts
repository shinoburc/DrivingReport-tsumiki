// Main Application Entry Point with TypeScript support

import { AppSettings, NotificationMessage, AppEvent, AppEventType } from './types/index';

declare global {
  interface Window {
    app?: App;
  }
}

/**
 * メインアプリケーションクラス
 */
class App {
  private isOnline: boolean;
  private settings: AppSettings | null = null;
  private eventBus: EventTarget;
  private deferredPrompt: BeforeInstallPromptEvent | null = null;

  constructor() {
    this.isOnline = navigator.onLine;
    this.eventBus = new EventTarget();
    
    // グローバルオブジェクトに登録
    window.drivingLogPWA = {
      version: '1.0.0',
      initialized: false,
      settings: this.settings,
      eventBus: this.eventBus
    };
    
    this.init();
  }

  private init(): void {
    console.log('Initializing 運転日報PWA...');
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Check online status
    this.setupOnlineStatusHandler();
    
    // Initialize navigation
    this.setupNavigation();
    
    // Remove loading screen
    this.hideLoading();
    
    // Check for PWA install prompt
    this.setupInstallPrompt();
    
    // Load settings
    this.loadSettings();
    
    // Mark as initialized
    window.drivingLogPWA.initialized = true;
    
    // Dispatch initialization event
    this.dispatchEvent(AppEventType.ONLINE_DETECTED, { initialized: true });
  }

  private setupEventListeners(): void {
    // Menu toggle
    const menuBtn = document.querySelector('.nav-menu-btn');
    const sideMenu = document.getElementById('side-menu');
    
    if (menuBtn && sideMenu) {
      menuBtn.addEventListener('click', () => {
        sideMenu.classList.toggle('active');
        const isActive = sideMenu.classList.contains('active');
        sideMenu.setAttribute('aria-hidden', (!isActive).toString());
        
        // Create overlay
        this.toggleMenuOverlay(isActive);
      });
    }
    
    // Menu item clicks
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
      item.addEventListener('click', (e: Event) => {
        e.preventDefault();
        const href = (item as HTMLAnchorElement).getAttribute('href');
        if (href) {
          this.navigateTo(href);
        }
        this.closeMenu();
      });
    });
  }

  private setupOnlineStatusHandler(): void {
    const offlineIndicator = document.getElementById('offline-indicator');
    
    const updateOnlineStatus = () => {
      this.isOnline = navigator.onLine;
      
      if (offlineIndicator) {
        offlineIndicator.hidden = this.isOnline;
      }
      
      console.log(`App is ${this.isOnline ? 'online' : 'offline'}`);
      
      // Dispatch events
      if (this.isOnline) {
        this.dispatchEvent(AppEventType.ONLINE_DETECTED);
      } else {
        this.dispatchEvent(AppEventType.OFFLINE_DETECTED);
      }
    };
    
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    
    // Initial check
    updateOnlineStatus();
  }

  private setupNavigation(): void {
    // Handle browser back/forward buttons
    window.addEventListener('popstate', () => {
      this.loadContent(location.pathname);
    });
    
    // Load initial content
    this.loadContent(location.pathname);
  }

  private navigateTo(path: string): void {
    history.pushState(null, '', path);
    this.loadContent(path);
  }

  private loadContent(path: string): void {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;
    
    // Show loading
    mainContent.innerHTML = `
      <div class="loading-container">
        <div class="loading-spinner"></div>
        <p>読み込み中...</p>
      </div>
    `;
    
    // Route to appropriate content
    switch (path) {
      case '/':
      case '/index.html':
        this.loadDashboard();
        break;
      case '/new-record':
        this.loadNewRecord();
        break;
      case '/history':
        this.loadHistory();
        break;
      case '/export':
        this.loadExport();
        break;
      case '/settings':
        this.loadSettingsView();
        break;
      default:
        this.load404();
    }
  }

  private loadDashboard(): void {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;
    
    mainContent.innerHTML = `
      <div class="dashboard">
        <h2>ダッシュボード</h2>
        <p>運転日報PWAへようこそ！</p>
        <div class="quick-actions">
          <button class="button button-primary" onclick="app.navigateTo('/new-record')">
            新規記録を開始
          </button>
        </div>
      </div>
    `;
  }

  private loadNewRecord(): void {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;
    
    mainContent.innerHTML = `
      <div class="new-record">
        <h2>新規運転記録</h2>
        <p>運転記録機能は現在実装中です。</p>
      </div>
    `;
  }

  private loadHistory(): void {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;
    
    mainContent.innerHTML = `
      <div class="history">
        <h2>運転履歴</h2>
        <p>履歴表示機能は現在実装中です。</p>
      </div>
    `;
  }

  private loadExport(): void {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;
    
    mainContent.innerHTML = `
      <div class="export">
        <h2>データエクスポート</h2>
        <p>エクスポート機能は現在実装中です。</p>
      </div>
    `;
  }

  private loadSettingsView(): void {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;
    
    mainContent.innerHTML = `
      <div class="settings">
        <h2>設定</h2>
        <p>設定機能は現在実装中です。</p>
      </div>
    `;
  }

  private load404(): void {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;
    
    mainContent.innerHTML = `
      <div class="error-404">
        <h2>ページが見つかりません</h2>
        <p>お探しのページは存在しません。</p>
        <button class="button" onclick="app.navigateTo('/')">
          ホームに戻る
        </button>
      </div>
    `;
  }

  private hideLoading(): void {
    // Initial loading is handled by route loading
  }

  private toggleMenuOverlay(show: boolean): void {
    let overlay = document.querySelector('.menu-overlay') as HTMLElement;
    
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'menu-overlay';
      overlay.addEventListener('click', () => this.closeMenu());
      document.body.appendChild(overlay);
    }
    
    overlay.classList.toggle('active', show);
  }

  private closeMenu(): void {
    const sideMenu = document.getElementById('side-menu');
    const overlay = document.querySelector('.menu-overlay');
    
    if (sideMenu) {
      sideMenu.classList.remove('active');
      sideMenu.setAttribute('aria-hidden', 'true');
    }
    
    if (overlay) {
      overlay.classList.remove('active');
    }
  }

  private setupInstallPrompt(): void {
    window.addEventListener('beforeinstallprompt', (e: BeforeInstallPromptEvent) => {
      // Prevent the mini-infobar from appearing
      e.preventDefault();
      // Stash the event so it can be triggered later
      this.deferredPrompt = e;
      console.log('PWA install prompt ready');
      
      // Optionally, show your own install button
      // this.showInstallButton();
    });
    
    window.addEventListener('appinstalled', () => {
      console.log('PWA was installed');
      this.deferredPrompt = null;
      this.dispatchEvent(AppEventType.ONLINE_DETECTED, { installed: true });
    });
  }

  private async loadSettings(): Promise<void> {
    try {
      // Load settings from localStorage (temporary implementation)
      const savedSettings = localStorage.getItem('app-settings');
      if (savedSettings) {
        this.settings = JSON.parse(savedSettings);
        window.drivingLogPWA.settings = this.settings;
      } else {
        // Default settings
        this.settings = {
          language: 'ja',
          gpsTimeout: 10,
          gpsAccuracyThreshold: 50,
          autoExportEnabled: false,
          exportFormat: 'CSV' as any,
          defaultExportPeriod: 30,
          exportPrivacyLevel: 'full',
          autoExportFrequency: 'monthly',
          favoriteLocations: [],
          theme: 'auto',
          notificationsEnabled: true,
          offlineModeEnabled: true,
          autoClearDataEnabled: false
        };
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      this.dispatchEvent(AppEventType.STORAGE_ERROR, { error: error.message });
    }
  }

  private dispatchEvent(type: AppEventType, data?: any): void {
    const event: AppEvent = {
      type,
      timestamp: new Date(),
      data
    };
    
    // Dispatch to internal event bus
    const customEvent = new CustomEvent('app:event', { detail: event });
    this.eventBus.dispatchEvent(customEvent);
    
    // Also dispatch to window for global listening
    window.dispatchEvent(customEvent);
  }

  /**
   * Public API method to install PWA
   */
  public async installPWA(): Promise<boolean> {
    if (!this.deferredPrompt) {
      return false;
    }
    
    try {
      const result = await this.deferredPrompt.prompt();
      const outcome = await this.deferredPrompt.userChoice;
      
      if (outcome.outcome === 'accepted') {
        console.log('User accepted the install prompt');
        return true;
      } else {
        console.log('User dismissed the install prompt');
        return false;
      }
    } catch (error) {
      console.error('Error during PWA installation:', error);
      return false;
    } finally {
      this.deferredPrompt = null;
    }
  }

  /**
   * Public API method to show notification
   */
  public async showNotification(message: NotificationMessage): Promise<void> {
    // Implementation will be added in later tasks
    console.log('Notification:', message);
  }

  /**
   * Public API method to get current settings
   */
  public getSettings(): AppSettings | null {
    return this.settings;
  }

  /**
   * Public API method to update settings
   */
  public async updateSettings(updates: Partial<AppSettings>): Promise<void> {
    if (!this.settings) return;
    
    this.settings = { ...this.settings, ...updates };
    window.drivingLogPWA.settings = this.settings;
    
    try {
      localStorage.setItem('app-settings', JSON.stringify(this.settings));
    } catch (error) {
      console.error('Failed to save settings:', error);
      this.dispatchEvent(AppEventType.STORAGE_ERROR, { error: error.message });
    }
  }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
  });
} else {
  window.app = new App();
}

export default App;