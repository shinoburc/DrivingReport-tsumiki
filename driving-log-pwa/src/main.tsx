import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// Service Worker registration
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

// Initialize React app
const container = document.getElementById('app');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}

// Set global app info
declare global {
  interface Window {
    drivingLogPWA: {
      version: string;
      initialized: boolean;
    };
  }
}

window.drivingLogPWA = {
  version: '1.0.0',
  initialized: true,
};

console.log('Driving Log PWA initialized successfully');