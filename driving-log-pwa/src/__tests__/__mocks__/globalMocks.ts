/**
 * グローバルモック設定
 * 
 * すべてのテストで共通して使用されるモック設定を定義
 */

// LocalStorage Mock
export const createLocalStorageMock = () => {
  let store: Record<string, string> = {};

  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: jest.fn((index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    })
  };
};

// Navigator Mock
export const createNavigatorMock = (options: {
  geolocation?: boolean;
  serviceWorker?: boolean;
  permissions?: boolean;
} = {}) => {
  const mockNavigator = {
    ...navigator,
    geolocation: options.geolocation ? {
      getCurrentPosition: jest.fn(),
      watchPosition: jest.fn(),
      clearWatch: jest.fn()
    } : undefined,
    
    serviceWorker: options.serviceWorker ? {
      register: jest.fn(),
      getRegistration: jest.fn(),
      ready: Promise.resolve({
        active: { postMessage: jest.fn() },
        waiting: null,
        installing: null,
        update: jest.fn(),
        unregister: jest.fn()
      })
    } : undefined,

    permissions: options.permissions ? {
      query: jest.fn().mockResolvedValue({ state: 'granted' })
    } : undefined
  };

  return mockNavigator;
};

// Crypto Mock
export const createCryptoMock = () => {
  return {
    getRandomValues: jest.fn((array: Uint8Array) => {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
      return array;
    }),
    subtle: {
      digest: jest.fn().mockResolvedValue(new ArrayBuffer(32)),
      encrypt: jest.fn().mockResolvedValue(new ArrayBuffer(64)),
      decrypt: jest.fn().mockResolvedValue(new ArrayBuffer(32)),
      generateKey: jest.fn().mockResolvedValue({}),
      importKey: jest.fn().mockResolvedValue({}),
      exportKey: jest.fn().mockResolvedValue(new ArrayBuffer(32))
    }
  };
};

// Fetch Mock
export const createFetchMock = () => {
  return jest.fn().mockImplementation((url: string, _options?: RequestInit) => {
    // デフォルトのレスポンス
    const mockResponse = {
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers({
        'Content-Type': 'application/json'
      }),
      json: () => Promise.resolve({ data: 'mock response' }),
      text: () => Promise.resolve('mock response'),
      blob: () => Promise.resolve(new Blob()),
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
      clone: () => mockResponse
    };

    // URL別の応答をカスタマイズ
    if (url.includes('/api/')) {
      return Promise.resolve({
        ...mockResponse,
        json: () => Promise.resolve({ 
          success: true, 
          data: { id: '123', message: 'API response' } 
        })
      });
    }

    if (url.includes('/error')) {
      return Promise.resolve({
        ...mockResponse,
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });
    }

    return Promise.resolve(mockResponse);
  });
};

// Request/Response Mock for Service Worker tests
export const createRequestMock = (url: string, init?: RequestInit): any => {
  return {
    url,
    method: init?.method || 'GET',
    headers: new Map(Object.entries(init?.headers || {})),
    body: init?.body || null,
    clone: jest.fn(() => createRequestMock(url, init)),
    text: jest.fn(() => Promise.resolve(init?.body?.toString() || ''))
  };
};

export const createResponseMock = (body?: any, init?: ResponseInit): any => {
  return {
    ok: init?.status ? init.status < 400 : true,
    status: init?.status || 200,
    statusText: init?.statusText || 'OK',
    headers: new Map(Object.entries(init?.headers || {})),
    body,
    clone: jest.fn(() => createResponseMock(body, init)),
    json: jest.fn(() => Promise.resolve(typeof body === 'string' ? JSON.parse(body) : body)),
    text: jest.fn(() => Promise.resolve(typeof body === 'object' ? JSON.stringify(body) : body)),
    blob: jest.fn(() => Promise.resolve(new Blob([body || '']))),
    arrayBuffer: jest.fn(() => Promise.resolve(new ArrayBuffer(0)))
  };
};

// IndexedDB Mock
export const createIndexedDBMock = () => {
  const databases = new Map();
  
  const mockIDBRequest = (result?: any, error?: any) => ({
    result,
    error,
    onsuccess: null as any,
    onerror: null as any,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
  });

  const mockIDBTransaction = () => ({
    objectStore: jest.fn(() => mockIDBObjectStore()),
    abort: jest.fn(),
    commit: jest.fn(),
    oncomplete: null,
    onerror: null,
    onabort: null
  });

  const mockIDBObjectStore = () => ({
    add: jest.fn(() => mockIDBRequest()),
    put: jest.fn(() => mockIDBRequest()),
    get: jest.fn(() => mockIDBRequest()),
    getAll: jest.fn(() => mockIDBRequest([])),
    delete: jest.fn(() => mockIDBRequest()),
    clear: jest.fn(() => mockIDBRequest()),
    count: jest.fn(() => mockIDBRequest(0)),
    createIndex: jest.fn(),
    deleteIndex: jest.fn(),
    index: jest.fn()
  });

  const mockIDBDatabase = (name: string) => ({
    name,
    version: 1,
    objectStoreNames: ['driving_logs', 'locations', 'settings'],
    transaction: jest.fn(() => mockIDBTransaction()),
    createObjectStore: jest.fn(() => mockIDBObjectStore()),
    deleteObjectStore: jest.fn(),
    close: jest.fn(),
    onupgradeneeded: null,
    onversionchange: null
  });

  return {
    open: jest.fn((name: string, _version?: number) => {
      const request = mockIDBRequest();
      const db = mockIDBDatabase(name);
      databases.set(name, db);
      
      setTimeout(() => {
        request.result = db;
        if (request.onsuccess) request.onsuccess({ target: request });
      }, 0);
      
      return request;
    }),
    deleteDatabase: jest.fn((name: string) => {
      const request = mockIDBRequest();
      databases.delete(name);
      
      setTimeout(() => {
        if (request.onsuccess) request.onsuccess({ target: request });
      }, 0);
      
      return request;
    })
  };
};

// Date Mock for consistent testing
export const createDateMock = (fixedDate?: string | Date) => {
  const mockDate = fixedDate ? new Date(fixedDate) : new Date('2024-01-15T10:00:00Z');
  
  return jest.fn(() => mockDate) as any;
};

// Performance Mock
export const createPerformanceMock = () => {
  let mockTime = 0;
  
  return {
    now: jest.fn(() => {
      mockTime += 16.67; // Simulate 60fps
      return mockTime;
    }),
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByName: jest.fn(() => []),
    getEntriesByType: jest.fn(() => []),
    clearMarks: jest.fn(),
    clearMeasures: jest.fn()
  };
};

// WebWorker Mock
export const createWebWorkerMock = () => {
  return class MockWorker {
    constructor(public scriptURL: string) {}
    
    postMessage = jest.fn();
    terminate = jest.fn();
    onmessage: ((event: MessageEvent) => void) | null = null;
    onerror: ((event: ErrorEvent) => void) | null = null;
    
    // Helper to simulate worker message
    simulateMessage(data: any) {
      if (this.onmessage) {
        this.onmessage({ data } as MessageEvent);
      }
    }
    
    // Helper to simulate worker error
    simulateError(error: string) {
      if (this.onerror) {
        this.onerror({ message: error } as ErrorEvent);
      }
    }
  };
};

// ResizeObserver Mock
export const createResizeObserverMock = () => {
  return class MockResizeObserver {
    public callback: ResizeObserverCallback;
    
    constructor(callback: ResizeObserverCallback) {
      this.callback = callback;
    }
    
    observe = jest.fn();
    unobserve = jest.fn();
    disconnect = jest.fn();
    
    // Helper to simulate resize
    simulateResize(entries: ResizeObserverEntry[]) {
      this.callback(entries, this);
    }
  };
};

// IntersectionObserver Mock
export const createIntersectionObserverMock = () => {
  return class MockIntersectionObserver {
    public callback: IntersectionObserverCallback;
    
    constructor(callback: IntersectionObserverCallback) {
      this.callback = callback;
    }
    
    observe = jest.fn();
    unobserve = jest.fn();
    disconnect = jest.fn();
    
    // Helper to simulate intersection
    simulateIntersection(entries: IntersectionObserverEntry[]) {
      this.callback(entries, this as any);
    }
  };
};

// File and FileReader Mock
export const createFileMock = (content: string, type: string = 'text/plain') => {
  return new File([content], 'test-file.txt', { type });
};

export const createFileReaderMock = () => {
  return class MockFileReader {
    result: string | ArrayBuffer | null = null;
    error: DOMException | null = null;
    readyState: number = 0;
    
    onload: ((event: ProgressEvent<FileReader>) => void) | null = null;
    onerror: ((event: ProgressEvent<FileReader>) => void) | null = null;
    onprogress: ((event: ProgressEvent<FileReader>) => void) | null = null;
    
    readAsText = jest.fn((_file: File) => {
      setTimeout(() => {
        this.result = 'mock file content';
        this.readyState = 2;
        if (this.onload) {
          this.onload({ target: this } as any);
        }
      }, 0);
    });
    
    readAsDataURL = jest.fn((_file: File) => {
      setTimeout(() => {
        this.result = 'data:text/plain;base64,bW9jayBmaWxlIGNvbnRlbnQ=';
        this.readyState = 2;
        if (this.onload) {
          this.onload({ target: this } as any);
        }
      }, 0);
    });
    
    abort = jest.fn();
  };
};

// URL Mock
export const createURLMock = () => {
  return {
    createObjectURL: jest.fn(() => 'blob:mock-url'),
    revokeObjectURL: jest.fn()
  };
};

// Canvas Mock
export const createCanvasMock = () => {
  const mockContext = {
    fillRect: jest.fn(),
    strokeRect: jest.fn(),
    fillText: jest.fn(),
    strokeText: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    arc: jest.fn(),
    fill: jest.fn(),
    stroke: jest.fn(),
    save: jest.fn(),
    restore: jest.fn(),
    translate: jest.fn(),
    rotate: jest.fn(),
    scale: jest.fn(),
    getImageData: jest.fn(() => ({ data: new Uint8ClampedArray(4) })),
    putImageData: jest.fn()
  };

  return {
    getContext: jest.fn(() => mockContext),
    toDataURL: jest.fn(() => 'data:image/png;base64,mock'),
    toBlob: jest.fn((callback) => callback(new Blob())),
    width: 300,
    height: 150
  };
};