/**
 * テスト環境セットアップ
 * 
 * 全テストで共通して使用される設定とモックの初期化
 */

import '@testing-library/jest-dom';
import {
  createLocalStorageMock,
  createNavigatorMock,
  createCryptoMock,
  createFetchMock,
  createIndexedDBMock,
  createPerformanceMock,
  createWebWorkerMock,
  createResizeObserverMock,
  createIntersectionObserverMock,
  createFileReaderMock,
  createURLMock,
  createCanvasMock
} from '../__mocks__/globalMocks';

// テスト環境の設定
const setupTestEnvironment = () => {
  // LocalStorage のモック
  Object.defineProperty(window, 'localStorage', {
    value: createLocalStorageMock(),
    writable: true
  });

  // SessionStorage のモック
  Object.defineProperty(window, 'sessionStorage', {
    value: createLocalStorageMock(),
    writable: true
  });

  // Navigator のモック
  Object.defineProperty(window, 'navigator', {
    value: createNavigatorMock({
      geolocation: true,
      serviceWorker: true,
      permissions: true
    }),
    writable: true
  });

  // Crypto のモック
  Object.defineProperty(window, 'crypto', {
    value: createCryptoMock(),
    writable: true
  });

  // Fetch のモック
  global.fetch = createFetchMock();

  // IndexedDB のモック
  Object.defineProperty(window, 'indexedDB', {
    value: createIndexedDBMock(),
    writable: true
  });

  // Performance のモック
  Object.defineProperty(window, 'performance', {
    value: createPerformanceMock(),
    writable: true
  });

  // WebWorker のモック
  global.Worker = createWebWorkerMock();

  // ResizeObserver のモック
  global.ResizeObserver = createResizeObserverMock();

  // IntersectionObserver のモック
  global.IntersectionObserver = createIntersectionObserverMock();

  // FileReader のモック
  global.FileReader = createFileReaderMock();

  // URL のモック
  Object.defineProperty(window, 'URL', {
    value: createURLMock(),
    writable: true
  });

  // Canvas のモック
  HTMLCanvasElement.prototype.getContext = jest.fn(() => createCanvasMock().getContext());
  HTMLCanvasElement.prototype.toDataURL = createCanvasMock().toDataURL;
  HTMLCanvasElement.prototype.toBlob = createCanvasMock().toBlob;

  // MediaQuery のモック
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });

  // Window dimensions のモック
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: 1024,
  });

  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: 768,
  });

  // Location のモック
  Object.defineProperty(window, 'location', {
    value: {
      href: 'http://localhost/',
      protocol: 'http:',
      hostname: 'localhost',
      port: '',
      pathname: '/',
      search: '',
      hash: '',
      origin: 'http://localhost',
      reload: jest.fn(),
      replace: jest.fn(),
      assign: jest.fn()
    },
    writable: true
  });

  // History のモック
  Object.defineProperty(window, 'history', {
    value: {
      length: 1,
      state: null,
      pushState: jest.fn(),
      replaceState: jest.fn(),
      go: jest.fn(),
      back: jest.fn(),
      forward: jest.fn()
    },
    writable: true
  });

  // Alert, confirm, prompt のモック
  window.alert = jest.fn();
  window.confirm = jest.fn(() => true);
  window.prompt = jest.fn(() => 'mock input');

  // Console のモック（エラーを抑制）
  const originalError = console.error;
  console.error = (...args: any[]) => {
    // React警告やテスト用エラーは表示しない
    if (
      args[0]?.includes?.('Warning: ') ||
      args[0]?.includes?.('Error: ') ||
      args[0]?.includes?.('act()')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };

  // 未処理のPromise拒否をキャッチ
  process.on('unhandledRejection', (reason) => {
    console.warn('Unhandled promise rejection in tests:', reason);
  });
};

// テスト実行前の共通設定
export const setupTestEnvironmentBefore = () => {
  setupTestEnvironment();
};

// テスト実行後のクリーンアップ
export const cleanupTestEnvironmentAfter = () => {
  // モックをクリア
  jest.clearAllMocks();
  
  // LocalStorageをクリア
  localStorage.clear();
  sessionStorage.clear();
  
  // DOM をクリア
  document.body.innerHTML = '';
  document.head.innerHTML = '';
  
  // タイマーをクリア
  jest.clearAllTimers();
  
  // ネットワーク モックをリセット
  if (global.fetch && typeof global.fetch.mockClear === 'function') {
    global.fetch.mockClear();
  }
};

// 各テストファイル向けのユーティリティ
export const createTestUtils = () => {
  return {
    // Async イベントの待機
    waitForAsync: (timeout = 100) => 
      new Promise(resolve => setTimeout(resolve, timeout)),

    // DOM 要素の待機
    waitForElement: async (selector: string, timeout = 1000) => {
      return new Promise((resolve, reject) => {
        const interval = setInterval(() => {
          const element = document.querySelector(selector);
          if (element) {
            clearInterval(interval);
            resolve(element);
          }
        }, 10);

        setTimeout(() => {
          clearInterval(interval);
          reject(new Error(`Element ${selector} not found within ${timeout}ms`));
        }, timeout);
      });
    },

    // ローカルストレージのヘルパー
    setLocalStorageItem: (key: string, value: any) => {
      localStorage.setItem(key, JSON.stringify(value));
    },

    getLocalStorageItem: (key: string) => {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    },

    // ビューポートサイズの変更
    setViewportSize: (width: number, height: number) => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: width,
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: height,
      });
      window.dispatchEvent(new Event('resize'));
    },

    // GPS位置のモック
    mockGeolocation: (latitude: number, longitude: number, accuracy = 10) => {
      const mockGeolocation = {
        getCurrentPosition: jest.fn((success) => {
          success({
            coords: {
              latitude,
              longitude,
              accuracy,
              altitude: null,
              altitudeAccuracy: null,
              heading: null,
              speed: null
            },
            timestamp: Date.now()
          });
        }),
        watchPosition: jest.fn(),
        clearWatch: jest.fn()
      };

      Object.defineProperty(navigator, 'geolocation', {
        value: mockGeolocation,
        writable: true
      });

      return mockGeolocation;
    },

    // ネットワーク状態のモック
    mockNetworkStatus: (isOnline: boolean) => {
      Object.defineProperty(navigator, 'onLine', {
        value: isOnline,
        writable: true
      });

      // オンライン/オフライン イベントを発火
      window.dispatchEvent(new Event(isOnline ? 'online' : 'offline'));
    },

    // サービスワーカーのモック
    mockServiceWorker: () => {
      const mockRegistration = {
        active: {
          postMessage: jest.fn(),
          scriptURL: '/sw.js'
        },
        waiting: null,
        installing: null,
        update: jest.fn(),
        unregister: jest.fn().mockResolvedValue(true),
        scope: '/',
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      };

      const mockServiceWorker = {
        register: jest.fn().mockResolvedValue(mockRegistration),
        getRegistration: jest.fn().mockResolvedValue(mockRegistration),
        ready: Promise.resolve(mockRegistration),
        controller: null,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      };

      Object.defineProperty(navigator, 'serviceWorker', {
        value: mockServiceWorker,
        writable: true
      });

      return mockServiceWorker;
    },

    // 時間の進行をモック
    advanceTime: (milliseconds: number) => {
      jest.advanceTimersByTime(milliseconds);
    },

    // ランダム値の固定
    mockMath: (value: number = 0.5) => {
      const mockMath = { ...Math, random: () => value };
      Object.defineProperty(window, 'Math', {
        value: mockMath,
        writable: true
      });
      return mockMath;
    }
  };
};

// デフォルトのセットアップを実行
setupTestEnvironmentBefore();

// テスト終了後のクリーンアップを自動実行
afterEach(() => {
  cleanupTestEnvironmentAfter();
});

// Jest のタイムアウト設定
jest.setTimeout(10000);

export default {
  setupTestEnvironmentBefore,
  cleanupTestEnvironmentAfter,
  createTestUtils
};