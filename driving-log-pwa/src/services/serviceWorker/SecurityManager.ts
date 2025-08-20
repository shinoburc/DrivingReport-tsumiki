import { SecurityHeaders } from './types';

export class SecurityManager {
  constructor() {}

  checkHTTPSRequirement(): boolean {
    // Check if running on HTTPS
    return location.protocol === 'https:' || location.hostname === 'localhost';
  }

  async canRegisterServiceWorker(): Promise<boolean> {
    // Service Worker requires HTTPS (except localhost)
    if (!this.checkHTTPSRequirement()) {
      return false;
    }

    // Check if Service Worker is supported
    return 'serviceWorker' in navigator;
  }

  async shouldCacheData(data: any): Promise<boolean> {
    // Check if data contains sensitive information
    const sensitiveFields = [
      'userToken', 'password', 'secret', 'token',
      'personalInfo', 'email', 'phone', 'address',
      'licenseNumber', 'creditCard', 'ssn'
    ];

    const dataString = JSON.stringify(data).toLowerCase();
    
    return !sensitiveFields.some(field => 
      dataString.includes(field.toLowerCase())
    );
  }

  async setAllowedOrigins(origins: string[]): Promise<void> {
    localStorage.setItem('allowed-origins', JSON.stringify(origins));
  }

  async isOriginAllowed(request: Request): Promise<boolean> {
    const allowedOrigins = JSON.parse(
      localStorage.getItem('allowed-origins') || '[]'
    );
    
    const requestOrigin = new URL(request.url).origin;
    return allowedOrigins.includes(requestOrigin);
  }

  async getContentSecurityPolicy(): Promise<string> {
    return [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "connect-src 'self'",
      "img-src 'self' data: https:",
      "font-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; ');
  }

  async getSecurityHeaders(): Promise<SecurityHeaders> {
    return {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Content-Security-Policy': await this.getContentSecurityPolicy(),
    };
  }

  async validateRequestIntegrity(request: Request): Promise<boolean> {
    // Check for suspicious headers
    const suspiciousPatterns = [
      /<script[^>]*>/i,
      /javascript:/i,
      /vbscript:/i,
      /on\w+\s*=/i,
    ];

    // Check headers
    for (const [_name, value] of request.headers.entries()) {
      if (suspiciousPatterns.some(pattern => pattern.test(value))) {
        return false;
      }
    }

    // Check URL
    if (suspiciousPatterns.some(pattern => pattern.test(request.url))) {
      return false;
    }

    // Check body if present
    if (request.body) {
      try {
        const body = await request.clone().text();
        if (suspiciousPatterns.some(pattern => pattern.test(body))) {
          return false;
        }
      } catch (error) {
        // If we can't read the body, assume it's valid
      }
    }

    return true;
  }

  async validateResponse(response: Response): Promise<boolean> {
    // Check response headers for security issues
    const contentType = response.headers.get('Content-Type') || '';
    
    // Ensure content type is safe
    if (contentType.includes('text/html') || contentType.includes('application/javascript')) {
      // Additional validation for HTML/JS content
      try {
        const content = await response.clone().text();
        if (this.containsMaliciousContent(content)) {
          return false;
        }
      } catch (error) {
        return false;
      }
    }

    return true;
  }

  private containsMaliciousContent(content: string): boolean {
    const maliciousPatterns = [
      /<script[^>]*>[\s\S]*?<\/script>/gi,
      /javascript:/gi,
      /vbscript:/gi,
      /on\w+\s*=\s*['"]/gi,
      /<iframe[^>]*>/gi,
      /<object[^>]*>/gi,
      /<embed[^>]*>/gi,
    ];

    return maliciousPatterns.some(pattern => pattern.test(content));
  }

  async sanitizeUrl(url: string): Promise<string> {
    try {
      const urlObj = new URL(url);
      
      // Remove potentially dangerous parameters
      urlObj.searchParams.delete('javascript');
      urlObj.searchParams.delete('vbscript');
      
      // Ensure protocol is safe
      if (!['http:', 'https:', 'data:'].includes(urlObj.protocol)) {
        throw new Error('Unsafe protocol');
      }

      return urlObj.toString();
    } catch (error) {
      throw new Error('Invalid URL');
    }
  }

  async generateNonce(): Promise<string> {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  async hashData(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = new Uint8Array(hashBuffer);
    return Array.from(hashArray, byte => byte.toString(16).padStart(2, '0')).join('');
  }
}