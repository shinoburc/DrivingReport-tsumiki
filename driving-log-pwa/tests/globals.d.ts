// Global type declarations for test environment

declare global {
  function createMockFile(content: string, type?: string): File;
  
  interface Window {
    matchMedia: (query: string) => MediaQueryList;
  }
  
  var TextEncoder: {
    new (): TextEncoder;
  };
  
  var TextDecoder: {
    new (): TextDecoder;
  };
}

export {};