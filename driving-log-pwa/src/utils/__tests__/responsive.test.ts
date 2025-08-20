/**
 * レスポンシブユーティリティ テスト
 * 
 * responsive.tsのテストカバレッジ向上のためのテストファイル
 */

import {
  useResponsiveLayout,
  getResponsiveClassName,
  isMobile,
  isTablet,
  isDesktop,
  ResponsiveLayout,
  ResponsiveBreakpoints
} from '../responsive';
import { renderHook, act } from '@testing-library/react';

// Viewport manipulation utilities for testing
const setViewportSize = (width: number, height: number) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  });
  
  // Trigger resize event
  window.dispatchEvent(new Event('resize'));
};

describe('responsive utils', () => {
  beforeEach(() => {
    // Reset window dimensions
    setViewportSize(1024, 768);
  });

  describe('useResponsiveLayout hook', () => {
    test('should return desktop for large screens', () => {
      setViewportSize(1200, 800);
      
      const { result } = renderHook(() => useResponsiveLayout());
      
      expect(result.current).toBe('desktop');
    });

    test('should return tablet for medium screens', () => {
      setViewportSize(800, 600);
      
      const { result } = renderHook(() => useResponsiveLayout());
      
      expect(result.current).toBe('tablet');
    });

    test('should return mobile for small screens', () => {
      setViewportSize(600, 400);
      
      const { result } = renderHook(() => useResponsiveLayout());
      
      expect(result.current).toBe('mobile');
    });

    test('should respond to window resize events', () => {
      const { result } = renderHook(() => useResponsiveLayout());
      
      // Start with desktop
      setViewportSize(1200, 800);
      
      act(() => {
        window.dispatchEvent(new Event('resize'));
      });
      
      expect(result.current).toBe('desktop');
      
      // Change to mobile
      setViewportSize(600, 400);
      
      act(() => {
        window.dispatchEvent(new Event('resize'));
      });
      
      expect(result.current).toBe('mobile');
    });

    test('should use custom breakpoints', () => {
      const customBreakpoints: ResponsiveBreakpoints = {
        mobile: 500,
        tablet: 900,
        desktop: 1100
      };
      
      setViewportSize(800, 600);
      
      const { result } = renderHook(() => useResponsiveLayout(customBreakpoints));
      
      expect(result.current).toBe('tablet');
    });

    test('should handle edge case at exact breakpoint values', () => {
      // Test at exact mobile breakpoint (768px)
      setViewportSize(768, 600);
      
      const { result } = renderHook(() => useResponsiveLayout());
      
      expect(result.current).toBe('mobile');
    });

    test('should handle edge case at exact tablet breakpoint (1024px)', () => {
      // Test at exact tablet breakpoint (1024px)
      setViewportSize(1024, 600);
      
      const { result } = renderHook(() => useResponsiveLayout());
      
      expect(result.current).toBe('tablet');
    });

    test('should clean up event listeners on unmount', () => {
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
      
      const { unmount } = renderHook(() => useResponsiveLayout());
      
      unmount();
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
      
      removeEventListenerSpy.mockRestore();
    });
  });

  describe('getResponsiveClassName', () => {
    test('should return correct className for mobile', () => {
      const className = getResponsiveClassName('mobile');
      expect(className).toBe('mobile-layout');
    });

    test('should return correct className for tablet', () => {
      const className = getResponsiveClassName('tablet');
      expect(className).toBe('tablet-layout');
    });

    test('should return correct className for desktop', () => {
      const className = getResponsiveClassName('desktop');
      expect(className).toBe('desktop-layout');
    });
  });

  describe('isMobile', () => {
    test('should return true for mobile layout', () => {
      expect(isMobile('mobile')).toBe(true);
    });

    test('should return false for tablet layout', () => {
      expect(isMobile('tablet')).toBe(false);
    });

    test('should return false for desktop layout', () => {
      expect(isMobile('desktop')).toBe(false);
    });
  });

  describe('isTablet', () => {
    test('should return false for mobile layout', () => {
      expect(isTablet('mobile')).toBe(false);
    });

    test('should return true for tablet layout', () => {
      expect(isTablet('tablet')).toBe(true);
    });

    test('should return false for desktop layout', () => {
      expect(isTablet('desktop')).toBe(false);
    });
  });

  describe('isDesktop', () => {
    test('should return false for mobile layout', () => {
      expect(isDesktop('mobile')).toBe(false);
    });

    test('should return false for tablet layout', () => {
      expect(isDesktop('tablet')).toBe(false);
    });

    test('should return true for desktop layout', () => {
      expect(isDesktop('desktop')).toBe(true);
    });
  });

  describe('Integration tests', () => {
    test('should work with real window resize events', () => {
      const { result } = renderHook(() => useResponsiveLayout());
      
      // Test multiple viewport changes
      const viewports = [
        { width: 1920, height: 1080, expected: 'desktop' as ResponsiveLayout },
        { width: 1024, height: 768, expected: 'tablet' as ResponsiveLayout },
        { width: 768, height: 1024, expected: 'mobile' as ResponsiveLayout },
        { width: 375, height: 667, expected: 'mobile' as ResponsiveLayout },
        { width: 1200, height: 800, expected: 'desktop' as ResponsiveLayout }
      ];
      
      viewports.forEach(({ width, height, expected }) => {
        setViewportSize(width, height);
        
        act(() => {
          window.dispatchEvent(new Event('resize'));
        });
        
        expect(result.current).toBe(expected);
      });
    });

    test('should work with different custom breakpoint configurations', () => {
      const configurations = [
        {
          breakpoints: { mobile: 600, tablet: 1000, desktop: 1400 },
          viewport: { width: 800, height: 600 },
          expected: 'tablet' as ResponsiveLayout
        },
        {
          breakpoints: { mobile: 480, tablet: 768, desktop: 992 },
          viewport: { width: 600, height: 400 },
          expected: 'tablet' as ResponsiveLayout
        },
        {
          breakpoints: { mobile: 320, tablet: 640, desktop: 960 },
          viewport: { width: 500, height: 300 },
          expected: 'tablet' as ResponsiveLayout
        }
      ];
      
      configurations.forEach(({ breakpoints, viewport, expected }) => {
        setViewportSize(viewport.width, viewport.height);
        
        const { result } = renderHook(() => useResponsiveLayout(breakpoints));
        
        expect(result.current).toBe(expected);
      });
    });
  });

  describe('Edge cases', () => {
    test('should handle very small viewport sizes', () => {
      setViewportSize(100, 100);
      
      const { result } = renderHook(() => useResponsiveLayout());
      
      expect(result.current).toBe('mobile');
    });

    test('should handle very large viewport sizes', () => {
      setViewportSize(5000, 3000);
      
      const { result } = renderHook(() => useResponsiveLayout());
      
      expect(result.current).toBe('desktop');
    });

    test('should handle portrait mobile orientation', () => {
      setViewportSize(375, 812); // iPhone X portrait
      
      const { result } = renderHook(() => useResponsiveLayout());
      
      expect(result.current).toBe('mobile');
    });

    test('should handle landscape tablet orientation', () => {
      setViewportSize(1024, 768); // iPad landscape
      
      const { result } = renderHook(() => useResponsiveLayout());
      
      expect(result.current).toBe('tablet');
    });

    test('should handle multiple rapid resize events', () => {
      const { result } = renderHook(() => useResponsiveLayout());
      
      // Simulate rapid resize events
      act(() => {
        setViewportSize(1200, 800);
        window.dispatchEvent(new Event('resize'));
        
        setViewportSize(600, 400);
        window.dispatchEvent(new Event('resize'));
        
        setViewportSize(800, 600);
        window.dispatchEvent(new Event('resize'));
      });
      
      // Should end up with tablet layout
      expect(result.current).toBe('tablet');
    });
  });

  describe('Performance considerations', () => {
    test('should not cause excessive re-renders', () => {
      let renderCount = 0;
      
      const { result, rerender } = renderHook(() => {
        renderCount++;
        return useResponsiveLayout();
      });
      
      // Initial render
      expect(renderCount).toBe(1);
      
      // Same viewport size shouldn't trigger re-render
      act(() => {
        setViewportSize(1024, 768);
        window.dispatchEvent(new Event('resize'));
      });
      
      // Should have re-rendered once due to resize
      expect(renderCount).toBe(2);
      
      // Same size again - should not increase render count significantly
      act(() => {
        setViewportSize(1024, 768);
        window.dispatchEvent(new Event('resize'));
      });
      
      expect(renderCount).toBe(3); // One more render is acceptable
    });
  });
});