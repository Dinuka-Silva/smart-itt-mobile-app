import {
  Colors,
  Spacing,
  Typography,
  typography,
  Layout,
  Fonts,
  BottomTabInset,
  MaxContentWidth,
} from '../constants/theme';
import type { ThemeColor } from '../constants/theme';

type Palette = (typeof Colors)['light'];

function mapPalette(_p: Palette) {
  return {
    surface: '#FFFFFF',
    surfaceDim: '#F0F5FA',
    surfaceBright: '#FFFFFF',
    surfaceContainerLowest: '#FFFFFF',
    surfaceContainerLow: '#F0F5FA',
    surfaceContainer: '#E8F1FA',
    surfaceContainerHigh: '#D0DEEB',
    surfaceContainerHighest: '#B8CDE3',
    onSurface: '#173B70',
    onSurfaceVariant: '#3A567F',
    inverseSurface: '#173B70',
    inverseOnSurface: '#FFFFFF',
    outline: '#D0DEEB',
    outlineVariant: '#B8CDE3',
    surfaceTint: '#173B70',
    accent: '#173B70', // Primary Dark Navy Blue
    accentSoft: '#E8F1FA', // Soft Light Blue
    primary: '#173B70', // Primary Dark Navy Blue
    onPrimary: '#FFFFFF',
    primaryContainer: '#E8F1FA',
    onPrimaryContainer: '#173B70',
    inversePrimary: '#8BB0DE',
    secondary: '#E8F1FA',
    onSecondary: '#173B70',
    secondaryContainer: '#F0F5FA',
    onSecondaryContainer: '#173B70',
    tertiary: '#F0F5FA',
    onTertiary: '#173B70',
    tertiaryContainer: '#CBD5E1',
    onTertiaryContainer: '#24436E',
    error: '#DC2626',
    onError: '#FFFFFF',
    errorContainer: '#FEE2E2',
    onErrorContainer: '#B91C1C',
    primaryFixed: '#E8F1FA',
    primaryFixedDim: '#CBD5E1',
    onPrimaryFixed: '#173B70',
    onPrimaryFixedVariant: '#173B70',
    secondaryFixed: '#E8F1FA',
    secondaryFixedDim: '#CBD5E1',
    onSecondaryFixed: '#173B70',
    onSecondaryFixedVariant: '#173B70',
    tertiaryFixed: '#F0F5FA',
    tertiaryFixedDim: '#CBD5E1',
    onTertiaryFixed: '#173B70',
    onTertiaryFixedVariant: '#24436E',
    background: '#FFFFFF', // Page Background
    onBackground: '#173B70', // Main Text
    surfaceVariant: '#E8F1FA',
    navy: '#173B70',
    navyMid: '#24436E',
    navyLight: '#3A567F',
    surfaceAlt: '#F0F5FA',
    surfaceTeal: '#E8F1FA',
    card: '#FFFFFF', // Cards / Nav
    cardElevated: '#FFFFFF',
    border: '#CBD5E1', // Crisp 1px Border
    borderLight: '#E2E8F0',
    borderAccent: '#173B70',
    text: '#173B70', // Main Text
    textPrimary: '#173B70',
    textSecondary: '#24436E', // Secondary Text (High Contrast)
    textMuted: '#3A567F', // Hint / Subtitle (High Contrast)
    textHint: '#3A567F',
    textOnDark: '#FFFFFF',
    teal: '#173B70',
    tealLight: '#E8F1FA',
    tealMuted: '#CBD5E1',
    cyan: '#173B70',
    amber: '#173B70',
    lime: '#173B70',
    crimson: '#DC2626',
    driver: '#173B70',
    driverMuted: '#E8F1FA',
    supervisor: '#173B70',
    supervisorMuted: '#E8F1FA',
    success: '#173B70',
    successMuted: '#E8F1FA',
    warning: '#173B70',
    warningMuted: '#F4F8FC',
    danger: '#DC2626',
    dangerMuted: '#FEE2E2',
    white: '#FFFFFF',
  };
}

export const colors = mapPalette(Colors.dark);

export const radius = {
  xs: 4,
  sm: 6,
  DEFAULT: Layout.radius,
  md: Layout.radius,
  lg: 16,
  xl: 20,
  '2xl': 24,
  pill: 9999,
  full: 9999,
};

export const spacing = {
  gutter: Layout.screenPadding,
  margin: Layout.screenPadding,
  xs: Spacing.half,
  sm: Spacing.one,
  md: Spacing.two,
  lg: Spacing.three,
  xl: Spacing.four,
};

export const shadow = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cardHover: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  button: {
    shadowColor: '#173B70',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 1,
  },
  glow: {
    shadowColor: '#173B70',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 1,
  },
  warningGlow: {
    shadowColor: '#173B70',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 1,
  },
  successGlow: {
    shadowColor: '#1E7A45',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 1,
  },
  subtle: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
};

/**
 * Two-Color status chip styling helper:
 * Approved / Active / Completed -> bg #E8F1FA, text #173B70
 * Pending / In Progress       -> bg #F4F8FC, text #173B70
 * Rejected / Suspended        -> bg #F0F5FA, text #173B70
 */
export function getStatusChipStyle(status: string): { bg: string; text: string; label: string } {
  const norm = (status || '').toUpperCase().trim();
  switch (norm) {
    case 'COMPLETED':
    case 'APPROVED':
    case 'ACTIVE':
      return { bg: '#E8F1FA', text: '#173B70', label: norm.replace(/_/g, ' ') };
    case 'IN_PROGRESS':
    case 'PENDING_APPROVAL':
    case 'PENDING':
    case 'NOT_STARTED':
    case 'ARRIVED':
      return { bg: '#F4F8FC', text: '#173B70', label: norm.replace(/_/g, ' ') };
    case 'REJECTED':
    case 'SUSPENDED':
    case 'INACTIVE':
      return { bg: '#F0F5FA', text: '#173B70', label: norm.replace(/_/g, ' ') };
    default:
      return { bg: '#F0F5FA', text: '#173B70', label: norm.replace(/_/g, ' ') || 'UNKNOWN' };
  }
}

export function statusColor(status: string): string {
  return getStatusChipStyle(status).text;
}

export function statusLabel(status: string): string {
  return getStatusChipStyle(status).label;
}

export {
  Colors,
  Spacing,
  Typography,
  typography,
  Layout,
  Fonts,
  BottomTabInset,
  MaxContentWidth,
};
export type { ThemeColor };
