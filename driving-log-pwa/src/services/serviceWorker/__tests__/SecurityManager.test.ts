/**
 * SecurityManager テスト - カバレッジ向上
 * 
 * SecurityManager.tsの低カバレッジ領域をテストして
 * セキュリティ機能の品質を確保します。
 */

import { SecurityManager } from '../SecurityManager';

// Mock global APIs
const mockLocation = (protocol: string, hostname: string) => {
  Object.defineProperty(window, 'location', {
    value: {
      protocol,
      hostname,
    },
    writable: true,
  });
};

const mockNavigator = (hasServiceWorker: boolean) => {
  Object.defineProperty(window, 'navigator', {
    value: {
      ...navigator,
      serviceWorker: hasServiceWorker ? {} : undefined,
    },
    writable: true,
  });
};

const mockCrypto = () => {
  const mockGetRandomValues = jest.fn((array) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  });

  const mockDigest = jest.fn().mockResolvedValue(
    new ArrayBuffer(32) // SHA-256 hash length
  );

  Object.defineProperty(window, 'crypto', {
    value: {
      getRandomValues: mockGetRandomValues,
      subtle: {
        digest: mockDigest,
      },
    },
    writable: true,
  });

  return { mockGetRandomValues, mockDigest };
};

describe('SecurityManager - Coverage Enhancement', () => {
  let securityManager: SecurityManager;

  beforeEach(() => {
    securityManager = new SecurityManager();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('HTTPS Requirement Checks', () => {
    test('should return true for HTTPS protocol', () => {
      mockLocation('https:', 'example.com');
      expect(securityManager.checkHTTPSRequirement()).toBe(true);
    });

    test('should return true for localhost HTTP', () => {
      mockLocation('http:', 'localhost');
      expect(securityManager.checkHTTPSRequirement()).toBe(true);
    });

    test('should return false for HTTP non-localhost', () => {
      mockLocation('http:', 'example.com');
      expect(securityManager.checkHTTPSRequirement()).toBe(false);
    });
  });

  describe('Service Worker Registration Checks', () => {
    test('should allow registration on HTTPS with service worker support', async () => {
      mockLocation('https:', 'example.com');
      mockNavigator(true);
      
      const canRegister = await securityManager.canRegisterServiceWorker();
      expect(canRegister).toBe(true);
    });

    test('should deny registration on HTTP non-localhost', async () => {
      mockLocation('http:', 'example.com');
      mockNavigator(true);
      
      const canRegister = await securityManager.canRegisterServiceWorker();
      expect(canRegister).toBe(false);
    });

    test('should deny registration without service worker support', async () => {
      mockLocation('https:', 'example.com');
      mockNavigator(false);
      
      const canRegister = await securityManager.canRegisterServiceWorker();
      expect(canRegister).toBe(false);
    });

    test('should allow registration on localhost HTTP with support', async () => {
      mockLocation('http:', 'localhost');
      mockNavigator(true);
      
      const canRegister = await securityManager.canRegisterServiceWorker();
      expect(canRegister).toBe(true);
    });
  });

  describe('Data Caching Security', () => {
    test('should allow caching safe data', async () => {
      const safeData = {
        purpose: '通勤',
        vehicle: '普通車',
        distance: 25.5,
        timestamp: new Date().toISOString()
      };

      const shouldCache = await securityManager.shouldCacheData(safeData);
      expect(shouldCache).toBe(true);
    });

    test('should deny caching data with user tokens', async () => {
      const sensitiveData = {
        purpose: '通勤',
        userToken: 'abc123',
        distance: 25.5
      };

      const shouldCache = await securityManager.shouldCacheData(sensitiveData);
      expect(shouldCache).toBe(false);
    });

    test('should deny caching data with passwords', async () => {
      const sensitiveData = {
        user: 'john',
        password: 'secret123'
      };

      const shouldCache = await securityManager.shouldCacheData(sensitiveData);
      expect(shouldCache).toBe(false);
    });

    test('should deny caching data with personal information', async () => {
      const sensitiveData = {
        driver: 'John Doe',
        email: 'john@example.com',
        phone: '123-456-7890',
        personalInfo: { age: 30 }
      };

      const shouldCache = await securityManager.shouldCacheData(sensitiveData);
      expect(shouldCache).toBe(false);
    });

    test('should deny caching data with financial information', async () => {
      const sensitiveData = {
        payment: {
          creditCard: '1234-5678-9012-3456',
          ssn: '123-45-6789'
        }
      };

      const shouldCache = await securityManager.shouldCacheData(sensitiveData);
      expect(shouldCache).toBe(false);
    });

    test('should handle case-insensitive sensitive field detection', async () => {
      const sensitiveData = {
        UserToken: 'ABC123',
        PASSWORD: 'secret',
        LicenseNumber: 'DL123456'
      };

      const shouldCache = await securityManager.shouldCacheData(sensitiveData);
      expect(shouldCache).toBe(false);
    });
  });

  describe('Origin Management', () => {
    test('should set and retrieve allowed origins', async () => {
      const origins = ['https://api.example.com', 'https://cdn.example.com'];
      
      await securityManager.setAllowedOrigins(origins);
      
      const storedOrigins = JSON.parse(localStorage.getItem('allowed-origins') || '[]');
      expect(storedOrigins).toEqual(origins);
    });

    test('should allow requests from allowed origins', async () => {
      const allowedOrigins = ['https://api.example.com'];
      await securityManager.setAllowedOrigins(allowedOrigins);
      
      const request = new Request('https://api.example.com/data');
      const isAllowed = await securityManager.isOriginAllowed(request);
      
      expect(isAllowed).toBe(true);
    });

    test('should deny requests from non-allowed origins', async () => {
      const allowedOrigins = ['https://api.example.com'];
      await securityManager.setAllowedOrigins(allowedOrigins);
      
      const request = new Request('https://malicious.com/data');
      const isAllowed = await securityManager.isOriginAllowed(request);
      
      expect(isAllowed).toBe(false);
    });

    test('should handle empty allowed origins list', async () => {
      const request = new Request('https://api.example.com/data');
      const isAllowed = await securityManager.isOriginAllowed(request);
      
      expect(isAllowed).toBe(false);
    });
  });

  describe('Content Security Policy', () => {
    test('should return comprehensive CSP', async () => {
      const csp = await securityManager.getContentSecurityPolicy();
      
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("script-src 'self'");
      expect(csp).toContain("style-src 'self' 'unsafe-inline'");
      expect(csp).toContain("object-src 'none'");
      expect(csp).toContain("base-uri 'self'");
    });

    test('should return security headers with CSP', async () => {
      const headers = await securityManager.getSecurityHeaders();
      
      expect(headers['X-Content-Type-Options']).toBe('nosniff');
      expect(headers['X-Frame-Options']).toBe('DENY');
      expect(headers['X-XSS-Protection']).toBe('1; mode=block');
      expect(headers['Strict-Transport-Security']).toContain('max-age=31536000');
      expect(headers['Content-Security-Policy']).toContain("default-src 'self'");
    });
  });

  describe('Request Integrity Validation', () => {
    test('should validate clean requests', async () => {
      const request = new Request('https://api.example.com/data', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer token123'
        }
      });
      
      const isValid = await securityManager.validateRequestIntegrity(request);
      expect(isValid).toBe(true);
    });

    test('should reject requests with script injection in headers', async () => {
      const request = new Request('https://api.example.com/data', {
        headers: {
          'X-Custom-Header': '<script>alert("xss")</script>'
        }
      });
      
      const isValid = await securityManager.validateRequestIntegrity(request);
      expect(isValid).toBe(false);
    });

    test('should reject requests with javascript protocol in headers', async () => {
      const request = new Request('https://api.example.com/data', {
        headers: {
          'X-Redirect': 'javascript:alert("xss")'
        }
      });
      
      const isValid = await securityManager.validateRequestIntegrity(request);
      expect(isValid).toBe(false);
    });

    test('should reject requests with event handlers in headers', async () => {
      const request = new Request('https://api.example.com/data', {
        headers: {
          'X-Data': 'onclick="alert(1)"'
        }
      });
      
      const isValid = await securityManager.validateRequestIntegrity(request);
      expect(isValid).toBe(false);
    });

    test('should reject requests with malicious URLs', async () => {
      const request = new Request('https://api.example.com/data?callback=<script>alert(1)</script>');
      
      const isValid = await securityManager.validateRequestIntegrity(request);
      expect(isValid).toBe(false);
    });

    test('should reject requests with malicious body content', async () => {
      const request = new Request('https://api.example.com/data', {
        method: 'POST',
        body: JSON.stringify({
          data: '<script>alert("xss")</script>'
        })
      });
      
      const isValid = await securityManager.validateRequestIntegrity(request);
      expect(isValid).toBe(false);
    });

    test('should handle requests with unreadable body gracefully', async () => {
      const request = new Request('https://api.example.com/data', {
        method: 'POST',
        body: new ReadableStream() // Unreadable stream
      });
      
      // Mock clone to throw error
      jest.spyOn(request, 'clone').mockImplementation(() => {
        throw new Error('Cannot clone');
      });
      
      const isValid = await securityManager.validateRequestIntegrity(request);
      expect(isValid).toBe(true); // Should assume valid if can't read
    });
  });

  describe('Response Validation', () => {
    test('should validate safe JSON responses', async () => {
      const response = new Response(JSON.stringify({ data: 'safe' }), {
        headers: { 'Content-Type': 'application/json' }
      });
      
      const isValid = await securityManager.validateResponse(response);
      expect(isValid).toBe(true);
    });

    test('should validate HTML responses for malicious content', async () => {
      const safeHtml = '<html><body><h1>Safe Content</h1></body></html>';
      const response = new Response(safeHtml, {
        headers: { 'Content-Type': 'text/html' }
      });
      
      const isValid = await securityManager.validateResponse(response);
      expect(isValid).toBe(true);
    });

    test('should reject HTML responses with script tags', async () => {
      const maliciousHtml = '<html><body><script>alert("xss")</script></body></html>';
      const response = new Response(maliciousHtml, {
        headers: { 'Content-Type': 'text/html' }
      });
      
      const isValid = await securityManager.validateResponse(response);
      expect(isValid).toBe(false);
    });

    test('should reject JavaScript responses with malicious code', async () => {
      const maliciousJs = 'alert("xss"); document.cookie = "stolen";';
      const response = new Response(maliciousJs, {
        headers: { 'Content-Type': 'application/javascript' }
      });
      
      const isValid = await securityManager.validateResponse(response);
      expect(isValid).toBe(false);
    });

    test('should reject responses with iframe tags', async () => {
      const maliciousHtml = '<div><iframe src="javascript:alert(1)"></iframe></div>';
      const response = new Response(maliciousHtml, {
        headers: { 'Content-Type': 'text/html' }
      });
      
      const isValid = await securityManager.validateResponse(response);
      expect(isValid).toBe(false);
    });

    test('should handle unreadable response content', async () => {
      const response = new Response('content', {
        headers: { 'Content-Type': 'text/html' }
      });
      
      // Mock clone to throw error
      jest.spyOn(response, 'clone').mockImplementation(() => {
        throw new Error('Cannot clone');
      });
      
      const isValid = await securityManager.validateResponse(response);
      expect(isValid).toBe(false); // Should reject if can't validate
    });
  });

  describe('URL Sanitization', () => {
    test('should sanitize safe URLs', async () => {
      const safeUrl = 'https://api.example.com/data?id=123';
      const sanitized = await securityManager.sanitizeUrl(safeUrl);
      
      expect(sanitized).toBe(safeUrl);
    });

    test('should remove dangerous parameters', async () => {
      const dangerousUrl = 'https://api.example.com/data?javascript=alert(1)&id=123';
      const sanitized = await securityManager.sanitizeUrl(dangerousUrl);
      
      expect(sanitized).not.toContain('javascript=');
      expect(sanitized).toContain('id=123');
    });

    test('should reject URLs with unsafe protocols', async () => {
      const unsafeUrl = 'javascript:alert(1)';
      
      await expect(securityManager.sanitizeUrl(unsafeUrl))
        .rejects.toThrow('Unsafe protocol');
    });

    test('should allow data URLs', async () => {
      const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const sanitized = await securityManager.sanitizeUrl(dataUrl);
      
      expect(sanitized).toBe(dataUrl);
    });

    test('should reject invalid URLs', async () => {
      const invalidUrl = 'not-a-url';
      
      await expect(securityManager.sanitizeUrl(invalidUrl))
        .rejects.toThrow('Invalid URL');
    });
  });

  describe('Cryptographic Functions', () => {
    test('should generate random nonce', async () => {
      const { mockGetRandomValues } = mockCrypto();
      
      const nonce = await securityManager.generateNonce();
      
      expect(nonce).toHaveLength(32); // 16 bytes * 2 hex chars
      expect(mockGetRandomValues).toHaveBeenCalledWith(expect.any(Uint8Array));
    });

    test('should generate different nonces', async () => {
      mockCrypto();
      
      const nonce1 = await securityManager.generateNonce();
      const nonce2 = await securityManager.generateNonce();
      
      expect(nonce1).not.toBe(nonce2);
    });

    test('should hash data using SHA-256', async () => {
      const { mockDigest } = mockCrypto();
      
      const data = 'test data to hash';
      const hash = await securityManager.hashData(data);
      
      expect(mockDigest).toHaveBeenCalledWith('SHA-256', expect.any(Uint8Array));
      expect(hash).toHaveLength(64); // 32 bytes * 2 hex chars
    });

    test('should produce consistent hashes for same data', async () => {
      mockCrypto();
      
      const data = 'consistent data';
      const hash1 = await securityManager.hashData(data);
      const hash2 = await securityManager.hashData(data);
      
      expect(hash1).toBe(hash2);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle malformed JSON in localStorage', async () => {
      localStorage.setItem('allowed-origins', 'invalid-json');
      
      const request = new Request('https://api.example.com/data');
      const isAllowed = await securityManager.isOriginAllowed(request);
      
      expect(isAllowed).toBe(false);
    });

    test('should handle empty data in shouldCacheData', async () => {
      const emptyData = {};
      const shouldCache = await securityManager.shouldCacheData(emptyData);
      
      expect(shouldCache).toBe(true);
    });

    test('should handle null data in shouldCacheData', async () => {
      const shouldCache = await securityManager.shouldCacheData(null);
      
      expect(shouldCache).toBe(true);
    });

    test('should handle complex nested sensitive data', async () => {
      const complexData = {
        user: {
          profile: {
            credentials: {
              token: 'secret123'
            }
          }
        }
      };
      
      const shouldCache = await securityManager.shouldCacheData(complexData);
      expect(shouldCache).toBe(false);
    });
  });
});