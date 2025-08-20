import { test, expect } from '@playwright/test';

/**
 * E2E Test: データ漏洩防止テスト
 * 
 * データの外部流出防止とセキュアな通信の確認
 */

test.describe('Data Leak Prevention Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should prevent sensitive data exposure in console logs', async ({ page }) => {
    // Monitor console messages
    const consoleMessages: string[] = [];
    const errorMessages: string[] = [];
    
    page.on('console', (msg) => {
      consoleMessages.push(msg.text());
    });
    
    page.on('pageerror', (error) => {
      errorMessages.push(error.message);
    });

    // Interact with the application to generate potential logs
    await page.evaluate(() => {
      // Simulate various operations that might log sensitive data
      const sensitiveData = {
        password: 'secret123',
        token: 'jwt_token_12345',
        apiKey: 'api_key_abcdef',
        personalInfo: 'John Doe',
        location: { lat: 35.6812, lng: 139.7671 }
      };

      // These operations might accidentally log sensitive data
      console.log('User operation completed');
      
      // Simulate form submission
      localStorage.setItem('test_data', JSON.stringify(sensitiveData));
      
      // Simulate error that might expose data
      try {
        throw new Error('Test error with data');
      } catch (e) {
        // Don't log the actual error with sensitive data
      }
      
      // Cleanup
      localStorage.removeItem('test_data');
    });

    await page.waitForTimeout(1000);

    // Check console messages for sensitive data
    const sensitivePatterns = [
      /password/i, /secret/i, /token/i, /key/i, /auth/i,
      /\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}/, // Credit card pattern
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email pattern
      /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/, // Phone pattern
      /jwt_[A-Za-z0-9_-]+/, // JWT token pattern
      /api_key_[A-Za-z0-9]+/ // API key pattern
    ];

    const exposedLogs = consoleMessages.filter(msg => 
      sensitivePatterns.some(pattern => pattern.test(msg))
    );

    const exposedErrors = errorMessages.filter(msg => 
      sensitivePatterns.some(pattern => pattern.test(msg))
    );

    // Should not expose sensitive data in console
    expect(exposedLogs).toHaveLength(0);
    expect(exposedErrors).toHaveLength(0);
  });

  test('should prevent data exposure through DOM inspection', async ({ page }) => {
    const domExposureTest = await page.evaluate(() => {
      // Check DOM for accidentally exposed sensitive data
      const allElements = document.querySelectorAll('*');
      const exposedElements = [];
      
      const sensitivePatterns = [
        /password\s*[:=]\s*[^\s]+/i,
        /token\s*[:=]\s*[^\s]+/i,
        /api[_-]?key\s*[:=]\s*[^\s]+/i,
        /secret\s*[:=]\s*[^\s]+/i,
        /jwt[_\s][^\s]+/i,
        /bearer\s+[^\s]+/i
      ];

      for (const element of allElements) {
        const textContent = element.textContent || '';
        const innerHTML = element.innerHTML || '';
        const attributes = Array.from(element.attributes).map(attr => 
          `${attr.name}="${attr.value}"`
        ).join(' ');

        const allContent = `${textContent} ${innerHTML} ${attributes}`;
        
        for (const pattern of sensitivePatterns) {
          if (pattern.test(allContent)) {
            exposedElements.push({
              tagName: element.tagName,
              textContent: textContent.substring(0, 100),
              innerHTML: innerHTML.substring(0, 100),
              attributes: attributes.substring(0, 100),
              pattern: pattern.toString()
            });
          }
        }
      }

      return {
        exposedElements: exposedElements,
        totalElements: allElements.length,
        hasExposure: exposedElements.length > 0
      };
    });

    // Should not expose sensitive data in DOM
    expect(domExposureTest.hasExposure).toBe(false);
  });

  test('should prevent data leaks through network requests', async ({ page, context }) => {
    const networkRequests: any[] = [];
    
    // Monitor network requests
    page.on('request', (request) => {
      networkRequests.push({
        url: request.url(),
        method: request.method(),
        headers: request.headers(),
        postData: request.postData()
      });
    });

    // Simulate user interactions that might trigger network requests
    const formExists = await page.locator('form').count() > 0;
    
    if (formExists) {
      const form = page.locator('form').first();
      const inputs = await form.locator('input').all();
      
      // Fill form with test data (including sensitive data)
      for (const input of inputs) {
        const inputType = await input.getAttribute('type');
        const inputName = await input.getAttribute('name');
        
        if (inputType === 'text' || !inputType) {
          await input.fill('test_user_data');
        } else if (inputType === 'email') {
          await input.fill('test@example.com');
        } else if (inputType === 'password') {
          await input.fill('test_password_123');
        } else if (inputType === 'tel') {
          await input.fill('123-456-7890');
        }
      }
      
      // Submit form
      const submitButton = form.locator('button[type="submit"], input[type="submit"]');
      if (await submitButton.count() > 0) {
        await submitButton.click();
        await page.waitForTimeout(2000);
      }
    }

    // Analyze network requests for sensitive data exposure
    const sensitiveDataLeaks = networkRequests.filter(request => {
      const url = request.url.toLowerCase();
      const postData = request.postData || '';
      const headerValues = Object.values(request.headers).join(' ').toLowerCase();
      
      // Check for unencrypted transmission of sensitive data
      const isHTTP = url.startsWith('http://');
      const containsSensitiveData = 
        postData.includes('password') ||
        postData.includes('secret') ||
        postData.includes('token') ||
        headerValues.includes('authorization') ||
        headerValues.includes('bearer');
      
      return isHTTP && containsSensitiveData;
    });

    // Should not transmit sensitive data over unencrypted connections
    expect(sensitiveDataLeaks).toHaveLength(0);
    
    // Check for external data leaks
    const externalRequests = networkRequests.filter(request => {
      try {
        const url = new URL(request.url);
        return url.hostname !== new URL(page.url()).hostname &&
               !url.hostname.includes('localhost') &&
               !url.hostname.includes('127.0.0.1');
      } catch {
        return false;
      }
    });

    // Should minimize external requests
    expect(externalRequests.length).toBeLessThan(5);
  });

  test('should prevent storage-based data leaks', async ({ page }) => {
    const storageLeakTest = await page.evaluate(() => {
      // Test for potential storage-based data leaks
      const testSensitiveData = {
        password: 'test_password_123',
        apiKey: 'sk_test_123456789',
        token: 'jwt_eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9',
        personalInfo: {
          name: 'Test User',
          email: 'test@example.com',
          phone: '123-456-7890'
        }
      };

      // Attempt to store sensitive data (this should be prevented or encrypted)
      try {
        localStorage.setItem('sensitive_test', JSON.stringify(testSensitiveData));
        sessionStorage.setItem('sensitive_test', JSON.stringify(testSensitiveData));
      } catch (e) {
        // Storage might be disabled or restricted
      }

      // Check existing storage for potential leaks
      const storageItems = [];
      
      // Check localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const value = localStorage.getItem(key);
        storageItems.push({ storage: 'localStorage', key, value });
      }
      
      // Check sessionStorage
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        const value = sessionStorage.getItem(key);
        storageItems.push({ storage: 'sessionStorage', key, value });
      }

      // Analyze for sensitive data patterns
      const sensitivePatterns = [
        { name: 'Password', pattern: /password\s*[:\"].*[\"]/i },
        { name: 'API Key', pattern: /api[_-]?key\s*[:\"].*[\"]/i },
        { name: 'Token', pattern: /token\s*[:\"].*[\"]/i },
        { name: 'JWT', pattern: /jwt[_\s][\w.-]+/i },
        { name: 'Email', pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i },
        { name: 'Phone', pattern: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/ },
        { name: 'Credit Card', pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/ }
      ];

      const foundLeaks = [];
      
      storageItems.forEach(item => {
        if (!item.value) return;
        
        sensitivePatterns.forEach(({ name, pattern }) => {
          if (pattern.test(item.value)) {
            // Check if data appears to be encrypted/hashed
            const isEncrypted = 
              item.value.length > 100 && /^[A-Za-z0-9+/=]+$/.test(item.value) || // Base64
              /^[a-f0-9]{32,}$/i.test(item.value) || // Hash
              item.value.startsWith('enc:') ||
              item.value.startsWith('hash:');
            
            if (!isEncrypted) {
              foundLeaks.push({
                storage: item.storage,
                key: item.key,
                leakType: name,
                value: item.value.substring(0, 50) + '...' // Truncate for logging
              });
            }
          }
        });
      });

      // Cleanup test data
      localStorage.removeItem('sensitive_test');
      sessionStorage.removeItem('sensitive_test');

      return {
        foundLeaks: foundLeaks,
        totalStorageItems: storageItems.length,
        hasLeaks: foundLeaks.length > 0
      };
    });

    // Should not store sensitive data in plain text
    expect(storageLeakTest.hasLeaks).toBe(false);
    
    if (storageLeakTest.hasLeaks) {
      console.error('Potential data leaks found:', storageLeakTest.foundLeaks);
    }
  });

  test('should prevent clipboard-based data leaks', async ({ page }) => {
    const clipboardTest = await page.evaluate(async () => {
      // Test clipboard API usage
      let clipboardAccess = false;
      let clipboardContent = '';
      
      try {
        // Check if app attempts to access clipboard
        if ('clipboard' in navigator) {
          const permission = await navigator.permissions.query({ name: 'clipboard-read' as PermissionName });
          clipboardAccess = permission.state !== 'denied';
          
          // Test clipboard read (should be careful about sensitive data)
          try {
            clipboardContent = await navigator.clipboard.readText();
          } catch (e) {
            // Clipboard access denied or unavailable
          }
        }
      } catch (e) {
        // Clipboard API not supported or denied
      }

      return {
        hasClipboardAccess: clipboardAccess,
        clipboardContentLength: clipboardContent.length,
        clipboardAPISupported: 'clipboard' in navigator
      };
    });

    // If app has clipboard access, it should handle it securely
    if (clipboardTest.hasClipboardAccess) {
      // Should not persistently store clipboard content
      const storedClipboard = await page.evaluate(() => {
        const keys = Object.keys(localStorage);
        return keys.some(key => 
          key.toLowerCase().includes('clipboard') ||
          key.toLowerCase().includes('copy')
        );
      });
      
      expect(storedClipboard).toBe(false);
    }
  });

  test('should prevent referrer-based data leaks', async ({ page }) => {
    // Check referrer policy
    const referrerTest = await page.evaluate(() => {
      const referrerMeta = document.querySelector('meta[name="referrer"]');
      const referrerPolicy = referrerMeta?.getAttribute('content') || 'default';
      
      // Check for external links
      const externalLinks = Array.from(document.querySelectorAll('a[href]')).filter(link => {
        try {
          const url = new URL((link as HTMLAnchorElement).href);
          return url.hostname !== window.location.hostname;
        } catch {
          return false;
        }
      });

      const linksWithoutNoReferrer = externalLinks.filter(link => {
        const rel = (link as HTMLAnchorElement).rel;
        return !rel.includes('noreferrer') && !rel.includes('noopener');
      });

      return {
        referrerPolicy: referrerPolicy,
        externalLinksCount: externalLinks.length,
        unsafeLinksCount: linksWithoutNoReferrer.length,
        hasReferrerPolicy: Boolean(referrerMeta)
      };
    });

    // Should have referrer policy
    expect(referrerTest.hasReferrerPolicy).toBe(true);
    
    // External links should be safe
    expect(referrerTest.unsafeLinksCount).toBe(0);
  });

  test('should prevent timing-based data leaks', async ({ page }) => {
    // Test for timing attacks
    const timingTest = await page.evaluate(async () => {
      const timingMeasurements: number[] = [];
      
      // Simulate operations that might leak information through timing
      const operations = [
        () => localStorage.getItem('nonexistent_key'),
        () => localStorage.getItem('existing_key'),
        () => JSON.parse('{"valid": "json"}'),
        () => {
          try {
            JSON.parse('invalid json');
          } catch (e) {
            // Handle error
          }
        }
      ];

      // Measure timing of operations
      for (const operation of operations) {
        const start = performance.now();
        operation();
        const end = performance.now();
        timingMeasurements.push(end - start);
      }

      // Calculate timing variance
      const avg = timingMeasurements.reduce((a, b) => a + b, 0) / timingMeasurements.length;
      const variance = timingMeasurements.reduce((sum, time) => sum + Math.pow(time - avg, 2), 0) / timingMeasurements.length;

      return {
        measurements: timingMeasurements,
        average: avg,
        variance: variance,
        hasTimingVariance: variance > 1.0 // Threshold for suspicious timing variance
      };
    });

    // Timing variance should not be excessive (potential timing attack vector)
    expect(timingTest.hasTimingVariance).toBe(false);
  });

  test('should generate comprehensive data leak prevention report', async ({ page }) => {
    // Generate comprehensive report
    const leakPreventionReport = await page.evaluate(() => {
      const report = {
        timestamp: new Date().toISOString(),
        url: window.location.href,
        checks: {
          domExposure: false,
          storageLeaks: false,
          consoleLeaks: false,
          referrerLeaks: false,
          clipboardSecurity: false,
          externalRequests: false
        },
        findings: [],
        riskLevel: 'LOW'
      };

      // DOM exposure check
      const sensitivePatterns = [
        /password\s*[:=]\s*[^\s]+/i,
        /token\s*[:=]\s*[^\s]+/i,
        /api[_-]?key\s*[:=]\s*[^\s]+/i
      ];

      const allElements = document.querySelectorAll('*');
      let domExposure = false;
      
      for (const element of allElements) {
        const allContent = `${element.textContent} ${element.innerHTML}`;
        if (sensitivePatterns.some(pattern => pattern.test(allContent))) {
          domExposure = true;
          break;
        }
      }
      
      report.checks.domExposure = !domExposure;
      if (domExposure) {
        report.findings.push('Sensitive data exposed in DOM');
      }

      // Storage leaks check
      const storageKeys = [...Object.keys(localStorage), ...Object.keys(sessionStorage)];
      const suspiciousKeys = storageKeys.filter(key => 
        /password|token|secret|key|auth/i.test(key)
      );
      
      report.checks.storageLeaks = suspiciousKeys.length === 0;
      if (suspiciousKeys.length > 0) {
        report.findings.push(`Potentially sensitive storage keys: ${suspiciousKeys.join(', ')}`);
      }

      // Referrer policy check
      const referrerMeta = document.querySelector('meta[name="referrer"]');
      report.checks.referrerLeaks = Boolean(referrerMeta);
      if (!referrerMeta) {
        report.findings.push('No referrer policy set');
      }

      // External links check
      const externalLinks = Array.from(document.querySelectorAll('a[href]')).filter(link => {
        try {
          const url = new URL((link as HTMLAnchorElement).href);
          return url.hostname !== window.location.hostname;
        } catch {
          return false;
        }
      });

      const unsafeExternalLinks = externalLinks.filter(link => {
        const rel = (link as HTMLAnchorElement).rel;
        return !rel.includes('noreferrer');
      });

      report.checks.externalRequests = unsafeExternalLinks.length === 0;
      if (unsafeExternalLinks.length > 0) {
        report.findings.push(`${unsafeExternalLinks.length} external links without proper referrer protection`);
      }

      // Clipboard security
      report.checks.clipboardSecurity = !('clipboard' in navigator) || 
        !storageKeys.some(key => key.toLowerCase().includes('clipboard'));

      // Calculate risk level
      const failedChecks = Object.values(report.checks).filter(check => !check).length;
      if (failedChecks === 0) {
        report.riskLevel = 'LOW';
      } else if (failedChecks <= 2) {
        report.riskLevel = 'MEDIUM';
      } else {
        report.riskLevel = 'HIGH';
      }

      return report;
    });

    console.log('Data Leak Prevention Report:', JSON.stringify(leakPreventionReport, null, 2));

    // Should have low risk level
    expect(leakPreventionReport.riskLevel).toBe('LOW');
    
    // Critical checks should pass
    expect(leakPreventionReport.checks.domExposure).toBe(true);
    expect(leakPreventionReport.checks.storageLeaks).toBe(true);

    const reportContent = `
Data Leak Prevention Report
==========================
Test Date: ${leakPreventionReport.timestamp}
URL: ${leakPreventionReport.url}
Risk Level: ${leakPreventionReport.riskLevel}

Security Checks:
${Object.entries(leakPreventionReport.checks).map(([check, passed]) => 
  `- ${check}: ${passed ? '✅' : '❌'}`
).join('\n')}

${leakPreventionReport.findings.length > 0 ? `
Findings:
${leakPreventionReport.findings.map(finding => `- ${finding}`).join('\n')}
` : '✅ No data leak risks found!'}
    `;

    console.log(reportContent);
  });
});