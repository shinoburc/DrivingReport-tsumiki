import { test, expect } from '@playwright/test';

/**
 * E2E Test: プライバシー保護テスト
 * 
 * 個人情報保護とデータプライバシーの確認
 */

test.describe('Privacy Protection Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should protect location data privacy', async ({ page, context }) => {
    // Grant geolocation permission
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 35.6812, longitude: 139.7671 });

    const locationPrivacyTest = await page.evaluate(async () => {
      if (!('geolocation' in navigator)) {
        return { supported: false };
      }

      const results = {
        supported: true,
        permissionRequested: false,
        locationAccessed: false,
        dataStored: false,
        dataEncrypted: false
      };

      try {
        // Check if permission is properly requested
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        results.permissionRequested = permission.state !== 'denied';

        // Attempt to get location
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
        });

        if (position) {
          results.locationAccessed = true;
          
          // Check if location data is stored
          const storedData = localStorage.getItem('driving_logs') || 
                           localStorage.getItem('locations') ||
                           localStorage.getItem('gps_data');
          
          if (storedData) {
            results.dataStored = true;
            
            // Check if stored location data appears encrypted/obfuscated
            const data = JSON.parse(storedData);
            const hasRawCoordinates = JSON.stringify(data).includes('35.6812') || 
                                    JSON.stringify(data).includes('139.7671');
            
            // If raw coordinates are not visible, assume some protection
            results.dataEncrypted = !hasRawCoordinates;
          }
        }
      } catch (error) {
        console.error('Location access error:', error);
      }

      return results;
    });

    if (locationPrivacyTest.supported) {
      // Permission should be properly handled
      expect(locationPrivacyTest.permissionRequested).toBe(true);
      
      // If location data is stored, it should be protected
      if (locationPrivacyTest.dataStored) {
        // Location data should be encrypted or obfuscated
        expect(locationPrivacyTest.dataEncrypted).toBe(true);
      }
    }
  });

  test('should implement data minimization', async ({ page }) => {
    // Test that only necessary data is collected
    const dataCollectionTest = await page.evaluate(() => {
      const collectedData = [];
      
      // Check what data the app tries to access
      const dataAccessAttempts = {
        localStorage: Object.keys(localStorage),
        sessionStorage: Object.keys(sessionStorage),
        cookies: document.cookie.split(';').map(c => c.trim().split('=')[0]),
        permissions: []
      };

      // Simulate data input
      const testData = {
        personalInfo: {
          name: 'Test User',
          email: 'test@example.com',
          phone: '123-456-7890',
          address: '123 Test St'
        },
        drivingInfo: {
          purpose: 'Test Drive',
          vehicle: 'Test Car',
          distance: 10.5
        }
      };

      // Check storage keys for unnecessary personal data collection
      const unnecessaryDataPatterns = [
        /name/i, /email/i, /phone/i, /address/i, /ssn/i, /birthday/i,
        /credit/i, /payment/i, /bank/i, /income/i, /personal/i
      ];

      const collectedUnnecessaryData = [...dataAccessAttempts.localStorage, ...dataAccessAttempts.sessionStorage]
        .filter(key => unnecessaryDataPatterns.some(pattern => pattern.test(key)));

      return {
        localStorageKeys: dataAccessAttempts.localStorage,
        sessionStorageKeys: dataAccessAttempts.sessionStorage,
        cookieCount: dataAccessAttempts.cookies.filter(c => c.length > 0).length,
        unnecessaryDataCollection: collectedUnnecessaryData,
        hasUnnecessaryData: collectedUnnecessaryData.length > 0
      };
    });

    // App should not collect unnecessary personal information
    expect(dataCollectionTest.hasUnnecessaryData).toBe(false);
    
    // Storage should only contain driving-related data
    const allowedDataPatterns = [
      /driving/i, /log/i, /gps/i, /location/i, /vehicle/i, /trip/i, 
      /setting/i, /preference/i, /cache/i, /temp/i
    ];

    dataCollectionTest.localStorageKeys.forEach(key => {
      const isAllowed = allowedDataPatterns.some(pattern => pattern.test(key));
      expect(isAllowed).toBe(true);
    });
  });

  test('should provide data export functionality', async ({ page }) => {
    // Test user's right to data portability
    const dataExportTest = await page.evaluate(() => {
      // Check if export functionality is available
      const exportButtons = document.querySelectorAll('button, a').length;
      const exportElements = Array.from(document.querySelectorAll('*')).filter(el => {
        const text = el.textContent?.toLowerCase() || '';
        return text.includes('export') || text.includes('download') || text.includes('データ') || text.includes('エクスポート');
      });

      return {
        hasExportElements: exportElements.length > 0,
        exportElements: exportElements.map(el => ({
          tagName: el.tagName,
          text: el.textContent?.trim(),
          isClickable: ['BUTTON', 'A'].includes(el.tagName)
        }))
      };
    });

    // Should provide data export capability
    expect(dataExportTest.hasExportElements).toBe(true);
    
    // Export should be accessible via clickable elements
    const clickableExports = dataExportTest.exportElements.filter(el => el.isClickable);
    expect(clickableExports.length).toBeGreaterThan(0);
  });

  test('should provide data deletion functionality', async ({ page }) => {
    // Test user's right to erasure
    const dataDeletionTest = await page.evaluate(() => {
      // Check if deletion functionality is available
      const deleteElements = Array.from(document.querySelectorAll('*')).filter(el => {
        const text = el.textContent?.toLowerCase() || '';
        const title = el.title?.toLowerCase() || '';
        const ariaLabel = el.getAttribute('aria-label')?.toLowerCase() || '';
        
        return text.includes('delete') || text.includes('remove') || text.includes('clear') ||
               text.includes('削除') || text.includes('消去') || text.includes('クリア') ||
               title.includes('delete') || ariaLabel.includes('delete');
      });

      return {
        hasDeletionElements: deleteElements.length > 0,
        deletionElements: deleteElements.map(el => ({
          tagName: el.tagName,
          text: el.textContent?.trim(),
          title: el.title,
          ariaLabel: el.getAttribute('aria-label'),
          isClickable: ['BUTTON', 'A'].includes(el.tagName)
        }))
      };
    });

    // Should provide data deletion capability
    expect(dataDeletionTest.hasDeletionElements).toBe(true);
  });

  test('should handle data retention properly', async ({ page }) => {
    // Test data retention policies
    const dataRetentionTest = await page.evaluate(() => {
      // Create test data with timestamps
      const testLog = {
        id: 'retention-test',
        purpose: 'Retention Test',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year
      };

      localStorage.setItem('retention_test_log', JSON.stringify(testLog));

      // Check existing data for retention indicators
      const allKeys = Object.keys(localStorage);
      const dataWithDates = allKeys.map(key => {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}');
          return {
            key,
            hasCreatedAt: Boolean(data.createdAt),
            hasExpiresAt: Boolean(data.expiresAt),
            hasTimestamp: Boolean(data.timestamp || data.date),
            data: data
          };
        } catch {
          return { key, hasCreatedAt: false, hasExpiresAt: false, hasTimestamp: false };
        }
      });

      // Clean up test data
      localStorage.removeItem('retention_test_log');

      return {
        totalStoredItems: allKeys.length,
        itemsWithDates: dataWithDates.filter(item => 
          item.hasCreatedAt || item.hasTimestamp
        ).length,
        itemsWithExpiration: dataWithDates.filter(item => 
          item.hasExpiresAt
        ).length,
        dataWithDates: dataWithDates
      };
    });

    // Should track creation dates for stored data
    if (dataRetentionTest.totalStoredItems > 0) {
      expect(dataRetentionTest.itemsWithDates).toBeGreaterThan(0);
    }
  });

  test('should anonymize or pseudonymize sensitive data', async ({ page, context }) => {
    // Test data anonymization
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 35.6812, longitude: 139.7671 });

    const anonymizationTest = await page.evaluate(() => {
      // Check if location data is anonymized
      const testLocation = { latitude: 35.6812, longitude: 139.7671 };
      
      // Simulate storing location data
      const anonymizedLocation = {
        // Round coordinates to reduce precision (anonymization technique)
        lat: Math.round(testLocation.latitude * 1000) / 1000,
        lng: Math.round(testLocation.longitude * 1000) / 1000,
        timestamp: Date.now()
      };

      localStorage.setItem('test_anonymized_location', JSON.stringify(anonymizedLocation));

      // Check existing stored data for anonymization
      const storedData = Object.keys(localStorage).map(key => {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}');
          return { key, data };
        } catch {
          return { key, data: null };
        }
      });

      // Look for raw precise coordinates (potential privacy leak)
      const hasRawCoordinates = storedData.some(item => {
        const dataStr = JSON.stringify(item.data);
        return dataStr.includes('35.6812') || dataStr.includes('139.7671');
      });

      // Clean up
      localStorage.removeItem('test_anonymized_location');

      return {
        hasRawCoordinates: hasRawCoordinates,
        storedItemsCount: storedData.length,
        anonymizationApplied: !hasRawCoordinates
      };
    });

    // Sensitive location data should be anonymized
    expect(anonymizationTest.hasRawCoordinates).toBe(false);
    expect(anonymizationTest.anonymizationApplied).toBe(true);
  });

  test('should respect Do Not Track preferences', async ({ page }) => {
    // Test DNT header respect
    const dntTest = await page.evaluate(() => {
      const dntHeader = navigator.doNotTrack || 
                       (window as any).doNotTrack || 
                       (navigator as any).msDoNotTrack;

      return {
        dntValue: dntHeader,
        dntEnabled: dntHeader === '1' || dntHeader === 'yes',
        hasTrackingCode: document.querySelectorAll('script[src*="analytics"], script[src*="tracking"], script[src*="google-analytics"]').length > 0
      };
    });

    // If DNT is enabled, should respect it
    if (dntTest.dntEnabled) {
      // Should not load tracking scripts when DNT is enabled
      expect(dntTest.hasTrackingCode).toBe(false);
    }
  });

  test('should implement consent management', async ({ page }) => {
    // Test consent mechanisms
    const consentTest = await page.evaluate(() => {
      // Look for consent-related elements
      const consentElements = Array.from(document.querySelectorAll('*')).filter(el => {
        const text = el.textContent?.toLowerCase() || '';
        const id = el.id?.toLowerCase() || '';
        const className = el.className?.toString().toLowerCase() || '';
        
        return text.includes('consent') || text.includes('privacy') || text.includes('cookie') ||
               text.includes('agree') || text.includes('accept') || text.includes('同意') ||
               id.includes('consent') || id.includes('privacy') || id.includes('cookie') ||
               className.includes('consent') || className.includes('privacy');
      });

      // Check for consent storage
      const consentKeys = Object.keys(localStorage).filter(key => 
        key.toLowerCase().includes('consent') || 
        key.toLowerCase().includes('privacy') ||
        key.toLowerCase().includes('cookie')
      );

      return {
        hasConsentElements: consentElements.length > 0,
        consentElements: consentElements.map(el => ({
          tagName: el.tagName,
          text: el.textContent?.trim().substring(0, 50),
          id: el.id,
          className: el.className
        })),
        hasConsentStorage: consentKeys.length > 0,
        consentKeys: consentKeys
      };
    });

    // Should have consent mechanism if processing personal data
    const isProcessingPersonalData = await page.evaluate(() => {
      // Check if app processes personal data
      const hasGeoLocation = 'geolocation' in navigator;
      const hasStorage = Object.keys(localStorage).length > 0;
      return hasGeoLocation || hasStorage;
    });

    if (isProcessingPersonalData) {
      // Should have consent management
      expect(consentTest.hasConsentElements || consentTest.hasConsentStorage).toBe(true);
    }
  });

  test('should provide privacy policy access', async ({ page }) => {
    // Test privacy policy availability
    const privacyPolicyTest = await page.evaluate(() => {
      const privacyElements = Array.from(document.querySelectorAll('a, button, [role="button"]')).filter(el => {
        const text = el.textContent?.toLowerCase() || '';
        const href = (el as HTMLAnchorElement).href?.toLowerCase() || '';
        const title = el.title?.toLowerCase() || '';
        
        return text.includes('privacy') || text.includes('policy') || text.includes('プライバシー') ||
               href.includes('privacy') || href.includes('policy') ||
               title.includes('privacy') || title.includes('policy');
      });

      return {
        hasPrivacyLinks: privacyElements.length > 0,
        privacyElements: privacyElements.map(el => ({
          tagName: el.tagName,
          text: el.textContent?.trim(),
          href: (el as HTMLAnchorElement).href || null,
          title: el.title
        }))
      };
    });

    // Should provide access to privacy policy
    expect(privacyPolicyTest.hasPrivacyLinks).toBe(true);
    
    // Privacy links should be accessible
    const accessiblePrivacyLinks = privacyPolicyTest.privacyElements.filter(el => 
      el.tagName === 'A' && el.href
    );
    expect(accessiblePrivacyLinks.length).toBeGreaterThan(0);
  });

  test('should handle cross-border data transfer restrictions', async ({ page }) => {
    // Test data localization and transfer restrictions
    const dataTransferTest = await page.evaluate(() => {
      // Check for external data transfers
      const externalRequests = Array.from(document.querySelectorAll('script, link, img')).filter(el => {
        const src = (el as HTMLScriptElement).src || (el as HTMLLinkElement).href;
        if (!src) return false;
        
        try {
          const url = new URL(src);
          return url.hostname !== window.location.hostname && 
                 !url.hostname.includes('localhost') &&
                 !url.hostname.includes('127.0.0.1');
        } catch {
          return false;
        }
      });

      return {
        externalRequestsCount: externalRequests.length,
        externalDomains: [...new Set(externalRequests.map(el => {
          const src = (el as HTMLScriptElement).src || (el as HTMLLinkElement).href;
          try {
            return new URL(src).hostname;
          } catch {
            return '';
          }
        }).filter(Boolean))],
        hasDataTransfer: externalRequests.length > 0
      };
    });

    // Document external data transfers
    if (dataTransferTest.hasDataTransfer) {
      console.log('External data transfers detected:', dataTransferTest.externalDomains);
      
      // Should minimize external data transfers
      expect(dataTransferTest.externalRequestsCount).toBeLessThan(10);
    }
  });

  test('should generate privacy compliance report', async ({ page }) => {
    // Generate comprehensive privacy compliance report
    const privacyReport = await page.evaluate(() => {
      const report = {
        timestamp: new Date().toISOString(),
        url: window.location.href,
        compliance: {
          dataMinimization: false,
          consentManagement: false,
          dataPortability: false,
          rightToErasure: false,
          dataProtection: false,
          privacyByDesign: false
        },
        findings: []
      };

      // Check data minimization
      const storageKeys = Object.keys(localStorage);
      const unnecessaryData = storageKeys.filter(key => 
        /name|email|phone|address|ssn|personal/i.test(key)
      );
      report.compliance.dataMinimization = unnecessaryData.length === 0;
      if (!report.compliance.dataMinimization) {
        report.findings.push(`Unnecessary personal data collected: ${unnecessaryData.join(', ')}`);
      }

      // Check consent management
      const hasConsentElements = Array.from(document.querySelectorAll('*')).some(el => 
        el.textContent?.toLowerCase().includes('consent') || 
        el.textContent?.toLowerCase().includes('privacy')
      );
      report.compliance.consentManagement = hasConsentElements;
      if (!report.compliance.consentManagement) {
        report.findings.push('No consent management mechanism found');
      }

      // Check data portability (export)
      const hasExportFunction = Array.from(document.querySelectorAll('*')).some(el => 
        el.textContent?.toLowerCase().includes('export') ||
        el.textContent?.toLowerCase().includes('download')
      );
      report.compliance.dataPortability = hasExportFunction;
      if (!report.compliance.dataPortability) {
        report.findings.push('No data export functionality found');
      }

      // Check right to erasure (delete)
      const hasDeleteFunction = Array.from(document.querySelectorAll('*')).some(el => 
        el.textContent?.toLowerCase().includes('delete') ||
        el.textContent?.toLowerCase().includes('remove') ||
        el.textContent?.toLowerCase().includes('clear')
      );
      report.compliance.rightToErasure = hasDeleteFunction;
      if (!report.compliance.rightToErasure) {
        report.findings.push('No data deletion functionality found');
      }

      // Check data protection (encryption/security)
      const hasSecurityMeasures = window.isSecureContext && 
        Boolean(document.querySelector('meta[http-equiv="Content-Security-Policy"]'));
      report.compliance.dataProtection = hasSecurityMeasures;
      if (!report.compliance.dataProtection) {
        report.findings.push('Insufficient data protection measures');
      }

      // Check privacy by design
      const privacyElements = Array.from(document.querySelectorAll('*')).filter(el => 
        el.textContent?.toLowerCase().includes('privacy')
      ).length;
      report.compliance.privacyByDesign = privacyElements > 0;
      if (!report.compliance.privacyByDesign) {
        report.findings.push('No evidence of privacy by design implementation');
      }

      // Calculate overall compliance score
      const complianceCount = Object.values(report.compliance).filter(Boolean).length;
      const totalChecks = Object.keys(report.compliance).length;
      report.complianceScore = Math.round((complianceCount / totalChecks) * 100);

      return report;
    });

    console.log('Privacy Compliance Report:', JSON.stringify(privacyReport, null, 2));

    // Privacy compliance assertions
    expect(privacyReport.compliance.dataMinimization).toBe(true);
    expect(privacyReport.compliance.dataPortability).toBe(true);
    expect(privacyReport.compliance.rightToErasure).toBe(true);
    expect(privacyReport.compliance.dataProtection).toBe(true);

    // Should achieve high compliance score
    expect(privacyReport.complianceScore).toBeGreaterThanOrEqual(80);

    const reportContent = `
Privacy Compliance Report
========================
Test Date: ${privacyReport.timestamp}
URL: ${privacyReport.url}
Compliance Score: ${privacyReport.complianceScore}%

Compliance Checks:
${Object.entries(privacyReport.compliance).map(([key, value]) => 
  `- ${key}: ${value ? '✅' : '❌'}`
).join('\n')}

${privacyReport.findings.length > 0 ? `
Findings:
${privacyReport.findings.map(finding => `- ${finding}`).join('\n')}
` : '✅ No privacy compliance issues found!'}
    `;

    console.log(reportContent);
  });
});