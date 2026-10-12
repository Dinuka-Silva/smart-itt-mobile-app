import { useWindowDimensions, Platform, DimensionValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface ResponsiveLayout {
  width: number;
  height: number;
  isSmallMobile: boolean; // Width < 360 (Compact phones / iPhone SE 1st gen)
  isMobile: boolean;      // Width < 768
  isTablet: boolean;      // Width 768 - 1023 (iPads / Android Tablets)
  isDesktop: boolean;     // Width >= 1024 (Laptops / Large Monitors)
  isLandscape: boolean;
  contentMaxWidth: number;
  containerPaddingHorizontal: number;
  topInset: number;
  bottomInset: number;
  numSummaryCols: number;
  summaryCardWidth: DimensionValue;
  scaleFont: (size: number) => number;
}

/**
 * Custom hook to dynamically adapt UI layouts across all screen form factors:
 * Small Mobile, Standard Mobile (iPhone/Android), Tablets, and Desktop/Web.
 */
export function useResponsive(): ResponsiveLayout {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const isSmallMobile = width < 360;
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const isDesktop = width >= 1024;
  const isLandscape = width > height;

  // Adaptive content max width: keeps content comfortable on large screens
  const contentMaxWidth = isDesktop ? 1080 : isTablet ? 780 : Math.min(width, 540);

  // Responsive padding
  const containerPaddingHorizontal = isSmallMobile
    ? 10
    : isMobile
    ? 12
    : isTablet
    ? 20
    : 32;

  // Safe area insets with rock-solid defaults for iPhone notches, Dynamic Island, and Android status bars
  // iPhones with notches/Dynamic Island report 44px to 59px. Ensure at least 44 on iOS when not in fullscreen.
  const minIosTop = Platform.OS === 'ios' ? 44 : 24;
  const topInset = Math.max(insets.top, minIosTop);
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'ios' ? 20 : 10);

  // Responsive grid columns
  const numSummaryCols = isDesktop ? 4 : isTablet ? 3 : isSmallMobile ? 1 : 2;
  const summaryCardWidth =
    numSummaryCols === 4
      ? '23.5%'
      : numSummaryCols === 3
      ? '31.5%'
      : numSummaryCols === 2
      ? '48.5%'
      : '100%';

  // Font scaling helper (caps scaling to prevent overflow on extreme zoom)
  const scaleFont = (size: number): number => {
    if (isSmallMobile) return Math.max(size * 0.88, 9);
    if (isDesktop) return Math.min(size * 1.1, size + 2);
    return size;
  };

  return {
    width,
    height,
    isSmallMobile,
    isMobile,
    isTablet,
    isDesktop,
    isLandscape,
    contentMaxWidth,
    containerPaddingHorizontal,
    topInset,
    bottomInset,
    numSummaryCols,
    summaryCardWidth,
    scaleFont,
  };
}
