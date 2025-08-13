// Main application entry point

// Initialize the application
export function initializeApp(): void {
  console.log('Driving Log PWA initializing...');

  // Set global app info
  window.drivingLogPWA = {
    version: '1.0.0',
    initialized: false,
  };

  // Register service worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/service-worker.js')
        .then((registration) => {
          console.log('Service Worker registered:', registration);
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });
    });
  }

  // Mark as initialized
  window.drivingLogPWA.initialized = true;
  console.log('Driving Log PWA initialized successfully');
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}
