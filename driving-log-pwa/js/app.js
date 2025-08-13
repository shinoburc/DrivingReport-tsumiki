// Main Application Entry Point
class App {
  constructor() {
    this.isOnline = navigator.onLine;
    this.init();
  }
  
  init() {
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
  }
  
  setupEventListeners() {
    // Menu toggle
    const menuBtn = document.querySelector('.nav-menu-btn');
    const sideMenu = document.getElementById('side-menu');
    
    if (menuBtn && sideMenu) {
      menuBtn.addEventListener('click', () => {
        sideMenu.classList.toggle('active');
        sideMenu.setAttribute('aria-hidden', !sideMenu.classList.contains('active'));
        
        // Create overlay
        this.toggleMenuOverlay(sideMenu.classList.contains('active'));
      });
    }
    
    // Menu item clicks
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        this.navigateTo(item.getAttribute('href'));
        this.closeMenu();
      });
    });
  }
  
  setupOnlineStatusHandler() {
    const offlineIndicator = document.getElementById('offline-indicator');
    
    const updateOnlineStatus = () => {
      this.isOnline = navigator.onLine;
      if (offlineIndicator) {
        offlineIndicator.hidden = this.isOnline;
      }
      console.log(`App is ${this.isOnline ? 'online' : 'offline'}`);
    };
    
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    
    // Initial check
    updateOnlineStatus();
  }
  
  setupNavigation() {
    // Handle browser back/forward buttons
    window.addEventListener('popstate', (event) => {
      this.loadContent(location.pathname);
    });
    
    // Load initial content
    this.loadContent(location.pathname);
  }
  
  navigateTo(path) {
    history.pushState(null, null, path);
    this.loadContent(path);
  }
  
  loadContent(path) {
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
        this.loadSettings();
        break;
      default:
        this.load404();
    }
  }
  
  loadDashboard() {
    const mainContent = document.getElementById('main-content');
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
  
  loadNewRecord() {
    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = `
      <div class="new-record">
        <h2>新規運転記録</h2>
        <p>運転記録機能は現在実装中です。</p>
      </div>
    `;
  }
  
  loadHistory() {
    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = `
      <div class="history">
        <h2>運転履歴</h2>
        <p>履歴表示機能は現在実装中です。</p>
      </div>
    `;
  }
  
  loadExport() {
    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = `
      <div class="export">
        <h2>データエクスポート</h2>
        <p>エクスポート機能は現在実装中です。</p>
      </div>
    `;
  }
  
  loadSettings() {
    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = `
      <div class="settings">
        <h2>設定</h2>
        <p>設定機能は現在実装中です。</p>
      </div>
    `;
  }
  
  load404() {
    const mainContent = document.getElementById('main-content');
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
  
  hideLoading() {
    // Initial loading is handled by route loading
  }
  
  toggleMenuOverlay(show) {
    let overlay = document.querySelector('.menu-overlay');
    
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'menu-overlay';
      overlay.addEventListener('click', () => this.closeMenu());
      document.body.appendChild(overlay);
    }
    
    if (show) {
      overlay.classList.add('active');
    } else {
      overlay.classList.remove('active');
    }
  }
  
  closeMenu() {
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
  
  setupInstallPrompt() {
    let deferredPrompt;
    
    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent the mini-infobar from appearing
      e.preventDefault();
      // Stash the event so it can be triggered later
      deferredPrompt = e;
      console.log('PWA install prompt ready');
      
      // Optionally, show your own install button
      // this.showInstallButton();
    });
    
    window.addEventListener('appinstalled', () => {
      console.log('PWA was installed');
      deferredPrompt = null;
    });
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