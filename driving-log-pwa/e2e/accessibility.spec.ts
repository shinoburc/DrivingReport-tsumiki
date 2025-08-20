import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y, getViolations } from 'axe-playwright';

/**
 * E2E Test: アクセシビリティテスト
 * 
 * WCAG 2.1 AA準拠確認とユーザビリティテスト
 */

test.describe('Accessibility Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await injectAxe(page);
  });

  test('should have no accessibility violations on main page', async ({ page }) => {
    await checkA11y(page, undefined, {
      detailedReport: true,
      detailedReportOptions: { html: true }
    });
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    const headings = await page.evaluate(() => {
      const headingElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      return Array.from(headingElements).map(el => ({
        level: parseInt(el.tagName.substring(1)),
        text: el.textContent?.trim(),
        hasText: Boolean(el.textContent?.trim())
      }));
    });

    // Should have at least one h1
    const h1Count = headings.filter(h => h.level === 1).length;
    expect(h1Count).toBeGreaterThan(0);
    expect(h1Count).toBeLessThanOrEqual(1); // Only one h1 per page

    // All headings should have text
    headings.forEach(heading => {
      expect(heading.hasText).toBe(true);
    });

    // Check heading hierarchy (no skipping levels)
    for (let i = 1; i < headings.length; i++) {
      const current = headings[i];
      const previous = headings[i - 1];
      
      if (current.level > previous.level) {
        expect(current.level - previous.level).toBeLessThanOrEqual(1);
      }
    }
  });

  test('should have proper color contrast', async ({ page }) => {
    const colorContrastResults = await page.evaluate(async () => {
      // Check color contrast using axe
      const axe = (window as any).axe;
      if (!axe) return { violations: [] };

      const results = await axe.run(document, {
        rules: {
          'color-contrast': { enabled: true },
          'color-contrast-enhanced': { enabled: true }
        }
      });

      return {
        violations: results.violations.filter(v => 
          v.id === 'color-contrast' || v.id === 'color-contrast-enhanced'
        ),
        passes: results.passes.filter(p => 
          p.id === 'color-contrast' || p.id === 'color-contrast-enhanced'
        )
      };
    });

    expect(colorContrastResults.violations).toHaveLength(0);
  });

  test('should support keyboard navigation', async ({ page }) => {
    // Test tab navigation
    await page.keyboard.press('Tab');
    
    let currentFocus = await page.evaluate(() => {
      const active = document.activeElement;
      return {
        tagName: active?.tagName,
        type: (active as HTMLInputElement)?.type,
        tabIndex: active?.tabIndex,
        hasOutline: window.getComputedStyle(active!).outline !== 'none'
      };
    });

    expect(currentFocus.tagName).toBeTruthy();
    expect(['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA']).toContain(currentFocus.tagName);

    // Test shift+tab (reverse navigation)
    await page.keyboard.press('Shift+Tab');
    
    // Test Enter key activation on buttons
    const firstButton = page.locator('button').first();
    if (await firstButton.count() > 0) {
      await firstButton.focus();
      
      // Test space key activation
      await page.keyboard.press('Space');
      await page.waitForTimeout(100);
      
      // Should not produce errors
      const hasErrors = await page.evaluate(() => {
        return window.console?.error?.length > 0;
      });
      expect(hasErrors).toBeFalsy();
    }
  });

  test('should have proper ARIA labels and roles', async ({ page }) => {
    const ariaResults = await page.evaluate(async () => {
      const axe = (window as any).axe;
      if (!axe) return { violations: [] };

      const results = await axe.run(document, {
        rules: {
          'aria-valid-attr-value': { enabled: true },
          'aria-valid-attr': { enabled: true },
          'aria-roles': { enabled: true },
          'aria-required-attr': { enabled: true },
          'aria-allowed-attr': { enabled: true },
          'button-name': { enabled: true },
          'link-name': { enabled: true },
          'label': { enabled: true }
        }
      });

      return {
        violations: results.violations,
        elementsChecked: results.passes.reduce((sum, pass) => sum + pass.nodes.length, 0)
      };
    });

    expect(ariaResults.violations).toHaveLength(0);
    expect(ariaResults.elementsChecked).toBeGreaterThan(0);
  });

  test('should have proper form labels and descriptions', async ({ page }) => {
    // Look for forms
    const formExists = await page.locator('form, input, select, textarea').count() > 0;
    
    if (formExists) {
      const formAccessibilityResults = await page.evaluate(async () => {
        const axe = (window as any).axe;
        if (!axe) return { violations: [] };

        const results = await axe.run(document, {
          rules: {
            'label': { enabled: true },
            'label-title-only': { enabled: true },
            'form-field-multiple-labels': { enabled: true }
          }
        });

        return {
          violations: results.violations,
          inputElements: document.querySelectorAll('input, select, textarea').length
        };
      });

      expect(formAccessibilityResults.violations).toHaveLength(0);
    }
  });

  test('should have appropriate focus management', async ({ page }) => {
    // Test focus visibility
    const focusTestResults = await page.evaluate(() => {
      const focusableElements = document.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      const results = [];
      for (const element of focusableElements) {
        element.focus();
        const styles = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        
        results.push({
          tagName: element.tagName,
          hasVisibleFocus: styles.outline !== 'none' || 
                          styles.boxShadow !== 'none' ||
                          styles.backgroundColor !== 'transparent',
          isVisible: rect.width > 0 && rect.height > 0,
          isClickable: rect.width >= 44 && rect.height >= 44 // WCAG AA minimum
        });
      }
      
      return results;
    });

    // All focusable elements should have visible focus
    focusTestResults.forEach(result => {
      if (result.isVisible) {
        expect(result.hasVisibleFocus).toBe(true);
      }
    });

    // Interactive elements should meet minimum size requirements
    const interactiveElements = focusTestResults.filter(r => 
      ['BUTTON', 'A'].includes(r.tagName)
    );
    
    interactiveElements.forEach(element => {
      if (element.isVisible) {
        expect(element.isClickable).toBe(true);
      }
    });
  });

  test('should support screen reader navigation', async ({ page }) => {
    const screenReaderSupport = await page.evaluate(async () => {
      const axe = (window as any).axe;
      if (!axe) return { violations: [] };

      const results = await axe.run(document, {
        rules: {
          'landmark-one-main': { enabled: true },
          'region': { enabled: true },
          'page-has-heading-one': { enabled: true },
          'bypass': { enabled: true }
        }
      });

      return {
        violations: results.violations,
        hasMain: document.querySelector('main, [role="main"]') !== null,
        hasSkipLink: document.querySelector('a[href^="#"]') !== null,
        landmarks: document.querySelectorAll('[role], main, nav, section, aside, header, footer').length
      };
    });

    expect(screenReaderSupport.violations).toHaveLength(0);
    expect(screenReaderSupport.hasMain).toBe(true);
    expect(screenReaderSupport.landmarks).toBeGreaterThan(0);
  });

  test('should handle text scaling up to 200%', async ({ page }) => {
    // Test text scaling
    await page.addStyleTag({
      content: `
        * {
          font-size: 200% !important;
        }
      `
    });

    await page.waitForTimeout(500);

    const scalingResults = await page.evaluate(() => {
      const body = document.body;
      const bodyRect = body.getBoundingClientRect();
      
      return {
        hasHorizontalScroll: body.scrollWidth > body.clientWidth,
        bodyWidth: bodyRect.width,
        viewportWidth: window.innerWidth,
        readableText: Array.from(document.querySelectorAll('p, span, div'))
          .filter(el => el.textContent?.trim())
          .every(el => {
            const styles = window.getComputedStyle(el);
            return parseFloat(styles.fontSize) >= 16; // At least 16px scaled
          })
      };
    });

    // Text should be readable at 200% scale
    expect(scalingResults.readableText).toBe(true);
    
    // Should not cause excessive horizontal scrolling
    expect(scalingResults.hasHorizontalScroll).toBe(false);
  });

  test('should provide meaningful error messages', async ({ page }) => {
    // Try to trigger form validation if forms exist
    const formExists = await page.locator('form').count() > 0;
    
    if (formExists) {
      // Submit empty form to trigger validation
      const submitButton = page.locator('button[type="submit"], input[type="submit"]').first();
      if (await submitButton.count() > 0) {
        await submitButton.click();
        
        await page.waitForTimeout(1000);
        
        const errorMessages = await page.evaluate(async () => {
          const axe = (window as any).axe;
          if (!axe) return { violations: [] };

          const results = await axe.run(document, {
            rules: {
              'aria-valid-attr-value': { enabled: true },
              'label': { enabled: true }
            }
          });

          const errorElements = document.querySelectorAll(
            '[role="alert"], .error, .validation-error, [aria-describedby]'
          );

          return {
            violations: results.violations,
            errorCount: errorElements.length,
            hasAccessibleErrors: Array.from(errorElements).every(el => 
              el.textContent?.trim() && 
              (el.getAttribute('role') === 'alert' || el.getAttribute('aria-live'))
            )
          };
        });

        if (errorMessages.errorCount > 0) {
          expect(errorMessages.hasAccessibleErrors).toBe(true);
        }
        expect(errorMessages.violations).toHaveLength(0);
      }
    }
  });

  test('should work with reduced motion preferences', async ({ page }) => {
    // Set reduced motion preference
    await page.emulateMedia({ reducedMotion: 'reduce' });
    
    const motionResults = await page.evaluate(() => {
      const animatedElements = document.querySelectorAll('*');
      const problematicAnimations = [];
      
      for (const element of animatedElements) {
        const styles = window.getComputedStyle(element);
        const hasAnimation = styles.animationDuration !== '0s' && styles.animationDuration !== 'none';
        const hasTransition = styles.transitionDuration !== '0s' && styles.transitionDuration !== 'none';
        
        if (hasAnimation || hasTransition) {
          // Check if respects prefers-reduced-motion
          const respectsReducedMotion = 
            styles.animationDuration === '0s' || 
            styles.transitionDuration === '0s' ||
            element.closest('[data-respect-reduced-motion]');
            
          if (!respectsReducedMotion) {
            problematicAnimations.push({
              tagName: element.tagName,
              className: element.className,
              animationDuration: styles.animationDuration,
              transitionDuration: styles.transitionDuration
            });
          }
        }
      }
      
      return {
        problematicAnimations,
        totalAnimatedElements: problematicAnimations.length
      };
    });

    // Should respect reduced motion preferences
    expect(motionResults.totalAnimatedElements).toBe(0);
  });

  test('should provide alternative text for images', async ({ page }) => {
    const imageAccessibilityResults = await page.evaluate(async () => {
      const axe = (window as any).axe;
      if (!axe) return { violations: [] };

      const results = await axe.run(document, {
        rules: {
          'image-alt': { enabled: true },
          'image-redundant-alt': { enabled: true }
        }
      });

      const images = document.querySelectorAll('img');
      const imageResults = Array.from(images).map(img => ({
        src: img.src,
        alt: img.alt,
        hasAlt: Boolean(img.alt),
        isDecorative: img.alt === '' && img.getAttribute('role') === 'presentation'
      }));

      return {
        violations: results.violations,
        images: imageResults,
        totalImages: images.length
      };
    });

    expect(imageAccessibilityResults.violations).toHaveLength(0);
    
    // All non-decorative images should have alt text
    imageAccessibilityResults.images.forEach(img => {
      if (!img.isDecorative) {
        expect(img.hasAlt).toBe(true);
      }
    });
  });

  test('should generate accessibility report', async ({ page }) => {
    // Generate comprehensive accessibility report
    const fullAccessibilityReport = await page.evaluate(async () => {
      const axe = (window as any).axe;
      if (!axe) return { error: 'Axe not available' };

      const results = await axe.run(document, {
        tags: ['wcag2a', 'wcag2aa', 'wcag21aa'],
        reporter: 'v2'
      });

      return {
        violations: results.violations.map(violation => ({
          id: violation.id,
          impact: violation.impact,
          description: violation.description,
          nodes: violation.nodes.length,
          help: violation.help,
          helpUrl: violation.helpUrl
        })),
        passes: results.passes.length,
        incomplete: results.incomplete.length,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        testEngine: results.testEngine,
        testRunner: results.testRunner
      };
    });

    // Log full report for debugging
    console.log('Accessibility Report:', JSON.stringify(fullAccessibilityReport, null, 2));

    // Should have no violations
    expect(fullAccessibilityReport.violations).toHaveLength(0);
    
    // Should have some passing tests
    expect(fullAccessibilityReport.passes).toBeGreaterThan(0);

    // Save report to file
    const reportPath = 'accessibility-report';
    await page.evaluate((report) => {
      const reportContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Accessibility Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .violation { background: #ffe6e6; padding: 10px; margin: 10px 0; border-left: 4px solid #ff0000; }
            .pass { background: #e6ffe6; padding: 10px; margin: 10px 0; border-left: 4px solid #00ff00; }
            .summary { background: #f0f0f0; padding: 15px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <h1>Accessibility Test Report</h1>
          <div class="summary">
            <h2>Summary</h2>
            <p><strong>Test Date:</strong> ${report.timestamp}</p>
            <p><strong>URL:</strong> ${report.url}</p>
            <p><strong>Violations:</strong> ${report.violations.length}</p>
            <p><strong>Passes:</strong> ${report.passes}</p>
            <p><strong>Incomplete:</strong> ${report.incomplete}</p>
          </div>
          
          ${report.violations.length > 0 ? `
            <h2>Violations</h2>
            ${report.violations.map(v => `
              <div class="violation">
                <h3>${v.id} (${v.impact})</h3>
                <p>${v.description}</p>
                <p><strong>Affected nodes:</strong> ${v.nodes}</p>
                <p><a href="${v.helpUrl}" target="_blank">Learn more</a></p>
              </div>
            `).join('')}
          ` : '<h2>✅ No Accessibility Violations Found</h2>'}
        </body>
        </html>
      `;
      
      // In a real implementation, this would save to a file
      console.log('Generated accessibility report HTML');
    }, fullAccessibilityReport);
  });
});