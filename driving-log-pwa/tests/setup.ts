// Jest setup file for test environment configuration

// Mock IndexedDB for testing
import 'fake-indexeddb/auto';

// Mock navigator.geolocation
const mockGeolocation = {
  getCurrentPosition: jest.fn(),
  watchPosition: jest.fn(),
  clearWatch: jest.fn(),
};

Object.defineProperty(navigator, 'geolocation', {
  value: mockGeolocation,
  writable: true,
});

// Mock Service Worker
const mockServiceWorker = {
  register: jest.fn().mockResolvedValue({
    installing: null,
    waiting: null,
    active: {
      state: 'activated',
    },
    addEventListener: jest.fn(),
    update: jest.fn().mockResolvedValue(undefined),
  }),
  getRegistration: jest.fn().mockResolvedValue(undefined),
};

Object.defineProperty(navigator, 'serviceWorker', {
  value: mockServiceWorker,
  writable: true,
});

// Mock LocalStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string): string | null => {
      return store[key] || null;
    },
    setItem: (key: string, value: string): void => {
      store[key] = value.toString();
    },
    removeItem: (key: string): void => {
      delete store[key];
    },
    clear: (): void => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
});

// Global test utilities
global.createMockFile = (content: string, type = 'text/plain'): File => {
  const blob = new Blob([content], { type });
  return new File([blob], 'test.txt', { type });
};

// Suppress console errors in tests unless explicitly testing error handling
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]): void => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});