// Jest setup file for test environment configuration

// Mock IndexedDB for testing
import 'fake-indexeddb/auto';

// Import jest-dom matchers
import '@testing-library/jest-dom';

// Basic polyfills
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

// Mock CSS.supports for CSS-in-JS compatibility
Object.defineProperty(window, 'CSS', {
  value: {
    supports: jest.fn().mockReturnValue(true),
  }
});

// Mock window.requestAnimationFrame for React DOM
global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 0));
global.cancelAnimationFrame = jest.fn(id => clearTimeout(id));

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock IntersectionObserver  
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

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

// Mock URL object for file downloads
global.URL = {
  createObjectURL: jest.fn().mockReturnValue('blob:mock-url'),
  revokeObjectURL: jest.fn(),
};

// Mock document.createElement for file downloads
const mockLink = {
  href: '',
  download: '',
  click: jest.fn(),
};

Object.defineProperty(document, 'createElement', {
  value: jest.fn().mockReturnValue(mockLink),
  writable: true,
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