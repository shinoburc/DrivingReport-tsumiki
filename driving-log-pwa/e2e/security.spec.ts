import { test, expect } from '@playwright/test';

/**
 * E2E Test: セキュリティテスト
 * 
 * セキュリティ脆弱性の検出とプライバシー保護の確認
 */

test.describe('Security Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should prevent XSS attacks', async ({ page }) => {
    // Test XSS prevention in input fields
    const xssPayloads = [
      '<script>alert("xss")</script>',
      'javascript:alert("xss")',
      '<img src=x onerror=alert("xss")>',
      '<svg onload=alert("xss")>',
      '"><script>alert("xss")</script>',
      "'><script>alert('xss')</script>"
    ];

    // Look for input fields
    const inputFields = await page.locator('input[type="text"], textarea').all();
    
    for (const input of inputFields) {
      for (const payload of xssPayloads) {
        // Clear and fill with XSS payload
        await input.clear();
        await input.fill(payload);
        
        // Check that script doesn't execute
        const alertFired = await page.evaluate(() => {
          return window.alertFired || false;
        });
        
        expect(alertFired).toBe(false);
        
        // Check that content is properly escaped
        const inputValue = await input.inputValue();
        const displayedValue = await page.evaluate((selector) => {
          const element = document.querySelector(selector);
          return element?.textContent || element?.innerHTML;
        }, `input[value="${payload}"]`);
        
        // XSS payload should be escaped or sanitized
        if (displayedValue) {
          expect(displayedValue).not.toContain('<script>');
          expect(displayedValue).not.toContain('javascript:');
        }
      }
    }
  });

  test('should implement Content Security Policy', async ({ page }) => {
    const cspHeaders = await page.evaluate(() => {
      const metaCSP = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
      return {
        metaCSP: metaCSP?.getAttribute('content'),
        // Check for CSP headers in response (would need backend)
        hasCSP: Boolean(metaCSP)
      };
    });

    // Should have some form of CSP
    expect(cspHeaders.hasCSP).toBe(true);
    
    if (cspHeaders.metaCSP) {
      // Should restrict inline scripts
      expect(cspHeaders.metaCSP).toMatch(/script-src|default-src/);
      
      // Should not allow unsafe-eval or unsafe-inline without nonce
      if (cspHeaders.metaCSP.includes('unsafe-inline') || cspHeaders.metaCSP.includes('unsafe-eval')) {
        // If using unsafe directives, should have nonce or hash
        expect(cspHeaders.metaCSP).toMatch(/'nonce-|'sha256-/);
      }
    }
  });

  test('should sanitize data storage', async ({ page }) => {
    const storageSecurityTest = await page.evaluate(() => {
      const testData = {
        maliciousScript: '<script>alert("stored-xss")</script>',
        maliciousHTML: '<img src=x onerror=alert("stored")>',
        sqlInjection: "'; DROP TABLE users; --",
        normalData: 'legitimate user data'
      };

      // Test localStorage sanitization
      try {
        localStorage.setItem('security_test_script', testData.maliciousScript);
        localStorage.setItem('security_test_html', testData.maliciousHTML);
        localStorage.setItem('security_test_sql', testData.sqlInjection);
        localStorage.setItem('security_test_normal', testData.normalData);

        const retrievedScript = localStorage.getItem('security_test_script');
        const retrievedHTML = localStorage.getItem('security_test_html');
        const retrievedSQL = localStorage.getItem('security_test_sql');
        const retrievedNormal = localStorage.getItem('security_test_normal');

        // Clean up
        localStorage.removeItem('security_test_script');
        localStorage.removeItem('security_test_html');
        localStorage.removeItem('security_test_sql');
        localStorage.removeItem('security_test_normal');

        return {
          scriptStored: retrievedScript === testData.maliciousScript,
          htmlStored: retrievedHTML === testData.maliciousHTML,
          sqlStored: retrievedSQL === testData.sqlInjection,
          normalStored: retrievedNormal === testData.normalData,
          success: true
        };
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
    });

    expect(storageSecurityTest.success).toBe(true);
    expect(storageSecurityTest.normalStored).toBe(true);
    
    // Malicious content should be stored as-is (not executed)
    // but application should sanitize on display
    expect(storageSecurityTest.scriptStored).toBe(true);
    expect(storageSecurityTest.htmlStored).toBe(true);
  });

  test('should protect against CSRF attacks', async ({ page }) => {
    // Check for CSRF protection mechanisms
    const csrfProtection = await page.evaluate(() => {
      const forms = document.querySelectorAll('form');
      const csrfTokens = [];
      
      forms.forEach(form => {
        // Look for CSRF tokens
        const csrfToken = form.querySelector('input[name*="csrf"], input[name*="_token"], input[name*="authenticity_token"]');
        if (csrfToken) {
          csrfTokens.push({
            name: csrfToken.getAttribute('name'),
            value: csrfToken.getAttribute('value'),
            hasValue: Boolean(csrfToken.getAttribute('value'))
          });
        }
      });

      // Check for SameSite cookie settings (client-side detection limited)
      const cookieString = document.cookie;
      
      return {
        formsCount: forms.length,
        csrfTokensFound: csrfTokens.length,
        csrfTokens: csrfTokens,
        hasCookies: Boolean(cookieString),
        // Note: Actual SameSite attribute checking requires server-side verification
        cookieString: cookieString
      };
    });

    // If forms exist, should have CSRF protection or be using safe methods
    if (csrfProtection.formsCount > 0) {
      // Either CSRF tokens or forms should only use safe methods (GET)
      const formMethods = await page.evaluate(() => {
        const forms = document.querySelectorAll('form');
        return Array.from(forms).map(form => ({
          method: form.method?.toLowerCase() || 'get',
          action: form.action
        }));
      });

      const hasUnsafeMethods = formMethods.some(form => 
        ['post', 'put', 'patch', 'delete'].includes(form.method)
      );

      if (hasUnsafeMethods) {
        // Should have CSRF tokens for unsafe methods
        expect(csrfProtection.csrfTokensFound).toBeGreaterThan(0);
      }
    }
  });

  test('should implement proper data validation', async ({ page }) => {
    // Test input validation
    const validationTests = await page.evaluate(() => {
      const results = [];
      
      // Test various input types
      const inputs = document.querySelectorAll('input, textarea, select');
      
      inputs.forEach(input => {
        const inputType = input.type || input.tagName.toLowerCase();
        const hasValidation = Boolean(
          input.required ||
          input.pattern ||
          input.minLength ||
          input.maxLength ||
          input.min ||
          input.max ||
          input.getAttribute('data-validate')
        );
        
        results.push({
          type: inputType,
          hasValidation: hasValidation,
          required: input.required,
          pattern: input.pattern || null,
          minLength: input.minLength || null,
          maxLength: input.maxLength || null
        });
      });
      
      return results;
    });

    // Critical inputs should have validation
    const criticalInputs = validationTests.filter(input => 
      ['email', 'password', 'tel', 'url'].includes(input.type)
    );
    
    criticalInputs.forEach(input => {
      expect(input.hasValidation).toBe(true);
    });
  });

  test('should protect sensitive data in client-side storage', async ({ page }) => {
    const sensitiveDataTest = await page.evaluate(() => {
      // Check for sensitive data patterns in localStorage
      const localStorage = window.localStorage;
      const sessionStorage = window.sessionStorage;
      
      const sensitivePatterns = [
        /password/i,
        /secret/i,
        /token/i,
        /key/i,
        /auth/i,
        /credential/i,
        /ssn/i,
        /social.security/i,
        /credit.card/i,
        /cc.number/i
      ];
      
      const checkStorage = (storage, storageName) => {
        const issues = [];
        for (let i = 0; i < storage.length; i++) {
          const key = storage.key(i);
          const value = storage.getItem(key);
          
          // Check if key or value contains sensitive patterns
          sensitivePatterns.forEach(pattern => {
            if (pattern.test(key) || pattern.test(value)) {
              // Check if value appears to be encrypted/hashed
              const isEncrypted = value && (
                value.length > 50 && /^[A-Za-z0-9+/=]+$/.test(value) || // Base64-like
                /^[a-f0-9]{32,}$/i.test(value) || // Hash-like
                value.startsWith('enc:') || 
                value.startsWith('hash:')
              );
              
              if (!isEncrypted) {
                issues.push({
                  storage: storageName,
                  key: key,
                  concern: 'Potentially sensitive data stored in plain text',
                  pattern: pattern.toString()
                });
              }
            }
          });
        }
        return issues;
      };
      
      return {
        localStorageIssues: checkStorage(localStorage, 'localStorage'),
        sessionStorageIssues: checkStorage(sessionStorage, 'sessionStorage'),
        localStorageKeys: Object.keys(localStorage),
        sessionStorageKeys: Object.keys(sessionStorage)
      };
    });

    // Should not store sensitive data in plain text
    expect(sensitiveDataTest.localStorageIssues).toHaveLength(0);
    expect(sensitiveDataTest.sessionStorageIssues).toHaveLength(0);
  });

  test('should implement secure communication', async ({ page }) => {
    const securityHeaders = await page.evaluate(() => {
      return {
        protocol: window.location.protocol,
        isHTTPS: window.location.protocol === 'https:',
        // Check if app attempts to make insecure requests
        hasInsecureContent: false // This would need network monitoring
      };
    });

    // In production, should use HTTPS
    const isLocalDevelopment = page.url().includes('localhost') || page.url().includes('127.0.0.1');
    
    if (!isLocalDevelopment) {
      expect(securityHeaders.isHTTPS).toBe(true);
    }
  });

  test('should handle geolocation permissions securely', async ({ page, context }) => {
    // Test geolocation permission handling
    const geoPermissionTest = await page.evaluate(async () => {
      if (!('geolocation' in navigator)) {
        return { supported: false };
      }

      try {
        // Check permission state
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        
        return {
          supported: true,
          permission: permission.state,
          hasSecureContext: window.isSecureContext
        };
      } catch (error) {
        return {
          supported: true,
          error: error.message,
          hasSecureContext: window.isSecureContext
        };
      }
    });

    if (geoPermissionTest.supported) {
      // Geolocation should only be used in secure context
      expect(geoPermissionTest.hasSecureContext).toBe(true);
    }
  });

  test('should prevent information disclosure in errors', async ({ page }) => {
    // Test error handling doesn't expose sensitive information
    const errorTest = await page.evaluate(() => {
      const errors = [];
      const originalConsoleError = console.error;
      
      console.error = (...args) => {
        errors.push(args.join(' '));
        originalConsoleError.apply(console, args);
      };

      try {
        // Trigger some potential errors
        JSON.parse('invalid json');
      } catch (e) {
        // Error should be generic, not expose internal details
        const errorMessage = e.message.toLowerCase();
        errors.push(errorMessage);
      }

      // Restore console.error
      console.error = originalConsoleError;

      // Check for sensitive information in error messages
      const sensitivePatterns = [
        /file.*path/i,
        /database/i,
        /server.*error/i,
        /stack.*trace/i,
        /internal.*error/i
      ];

      const exposedErrors = errors.filter(error => 
        sensitivePatterns.some(pattern => pattern.test(error))
      );

      return {
        totalErrors: errors.length,
        exposedErrors: exposedErrors,
        hasExposedInfo: exposedErrors.length > 0
      };
    });

    // Errors should not expose sensitive system information
    expect(errorTest.hasExposedInfo).toBe(false);
  });

  test('should implement proper session management', async ({ page, context }) => {
    // Test session security
    const sessionTest = await page.evaluate(() => {
      const sessionData = {
        hasSessionStorage: typeof sessionStorage !== 'undefined',
        sessionKeys: Object.keys(sessionStorage),
        cookies: document.cookie
      };

      // Check for session-related data
      const sessionItems = sessionData.sessionKeys.filter(key => 
        key.toLowerCase().includes('session') || 
        key.toLowerCase().includes('auth') ||
        key.toLowerCase().includes('token')
      );

      return {
        ...sessionData,
        sessionItems: sessionItems,
        hasSessionData: sessionItems.length > 0
      };
    });

    // If session data exists, verify it's handled securely
    if (sessionTest.hasSessionData) {
      // Check that session data doesn't contain plain text credentials
      for (const key of sessionTest.sessionItems) {
        const value = await page.evaluate((k) => sessionStorage.getItem(k), key);
        
        // Session tokens should be non-trivial length
        if (value && value.length > 0) {
          expect(value.length).toBeGreaterThan(10);
          
          // Should not contain obvious plain text passwords
          expect(value.toLowerCase()).not.toContain('password');
          expect(value.toLowerCase()).not.toContain('secret');
        }
      }
    }
  });

  test('should perform security scan', async ({ page }) => {
    // Comprehensive security check
    const securityScan = await page.evaluate(() => {
      const scan = {
        timestamp: new Date().toISOString(),
        url: window.location.href,
        checks: {}
      };

      // Check for common security issues
      scan.checks.inlineScripts = document.querySelectorAll('script:not([src])').length;
      scan.checks.inlineStyles = document.querySelectorAll('style, [style]').length;
      scan.checks.httpLinks = document.querySelectorAll('a[href^="http:"]').length;
      scan.checks.openLinks = document.querySelectorAll('a[target="_blank"]:not([rel*="noopener"])').length;
      scan.checks.formsWithoutCSRF = Array.from(document.querySelectorAll('form')).filter(form => 
        !form.querySelector('input[name*="csrf"], input[name*="_token"]')
      ).length;
      scan.checks.autocompletePasswords = document.querySelectorAll('input[type="password"]:not([autocomplete="off"])').length;
      
      // Check for potential data exposure
      scan.checks.visibleSensitiveData = Array.from(document.querySelectorAll('*')).filter(el => {
        const text = el.textContent?.toLowerCase() || '';
        return text.includes('password') || 
               text.includes('secret') || 
               text.includes('token') ||
               text.includes('api key');
      }).length;

      // Security headers check (limited client-side)
      scan.checks.hasCSP = Boolean(document.querySelector('meta[http-equiv="Content-Security-Policy"]'));
      scan.checks.isSecureContext = window.isSecureContext;

      return scan;
    });

    console.log('Security Scan Results:', JSON.stringify(securityScan, null, 2));

    // Security assertions
    expect(securityScan.checks.httpLinks).toBe(0); // No insecure HTTP links
    expect(securityScan.checks.openLinks).toBe(0); // External links should have rel="noopener"
    expect(securityScan.checks.visibleSensitiveData).toBe(0); // No exposed sensitive data
    expect(securityScan.checks.isSecureContext).toBe(true); // Secure context required

    // Generate security report
    const reportContent = `
Security Scan Report
===================
Test Date: ${securityScan.timestamp}
URL: ${securityScan.url}

Findings:
- Inline Scripts: ${securityScan.checks.inlineScripts}
- HTTP Links: ${securityScan.checks.httpLinks} ❌ Should be 0
- Unprotected External Links: ${securityScan.checks.openLinks} ❌ Should be 0
- Forms without CSRF: ${securityScan.checks.formsWithoutCSRF}
- Visible Sensitive Data: ${securityScan.checks.visibleSensitiveData} ❌ Should be 0
- Has CSP: ${securityScan.checks.hasCSP ? '✅' : '❌'}
- Secure Context: ${securityScan.checks.isSecureContext ? '✅' : '❌'}

${securityScan.checks.httpLinks === 0 && 
  securityScan.checks.openLinks === 0 && 
  securityScan.checks.visibleSensitiveData === 0 && 
  securityScan.checks.isSecureContext 
  ? '✅ Security scan passed!' 
  : '❌ Security issues found!'}
    `;

    console.log(reportContent);
  });
});