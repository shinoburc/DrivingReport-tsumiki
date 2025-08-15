import { useEffect, useState } from 'react';

export type ResponsiveLayoutType = 'mobile-layout' | 'tablet-layout' | 'desktop-layout';

export interface UseResponsive {
  layout: ResponsiveLayoutType;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
}

export function useResponsive(): UseResponsive {
  const [layout, setLayout] = useState<ResponsiveLayoutType>('desktop-layout');

  useEffect(() => {
    const updateLayout = () => {
      const width = window.innerWidth;
      if (width <= 480) {
        setLayout('mobile-layout');
      } else if (width <= 768) {
        setLayout('tablet-layout');
      } else {
        setLayout('desktop-layout');
      }
    };

    updateLayout();
    window.addEventListener('resize', updateLayout);
    return () => window.removeEventListener('resize', updateLayout);
  }, []);

  return {
    layout,
    isMobile: layout === 'mobile-layout',
    isTablet: layout === 'tablet-layout',
    isDesktop: layout === 'desktop-layout'
  };
}