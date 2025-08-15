import { useState, useEffect } from 'react';

export type ResponsiveLayout = 'mobile' | 'tablet' | 'desktop';

export interface ResponsiveBreakpoints {
  mobile: number;
  tablet: number;
  desktop: number;
}

const DEFAULT_BREAKPOINTS: ResponsiveBreakpoints = {
  mobile: 768,
  tablet: 1024,
  desktop: 1200
};

export function useResponsiveLayout(breakpoints: ResponsiveBreakpoints = DEFAULT_BREAKPOINTS): ResponsiveLayout {
  const [layout, setLayout] = useState<ResponsiveLayout>('desktop');

  useEffect(() => {
    const updateLayout = () => {
      const width = window.innerWidth;
      if (width <= breakpoints.mobile) {
        setLayout('mobile');
      } else if (width <= breakpoints.tablet) {
        setLayout('tablet');
      } else {
        setLayout('desktop');
      }
    };

    updateLayout();
    window.addEventListener('resize', updateLayout);
    return () => window.removeEventListener('resize', updateLayout);
  }, [breakpoints]);

  return layout;
}

export function getResponsiveClassName(layout: ResponsiveLayout): string {
  return `${layout}-layout`;
}

export function isMobile(layout: ResponsiveLayout): boolean {
  return layout === 'mobile';
}

export function isTablet(layout: ResponsiveLayout): boolean {
  return layout === 'tablet';
}

export function isDesktop(layout: ResponsiveLayout): boolean {
  return layout === 'desktop';
}