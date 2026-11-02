import {
  Colors,
  Spacing,
  Typography,
  Layout,
  Fonts,
  BottomTabInset,
  MaxContentWidth,
} from '../constants/theme';
import type { ThemeColor } from '../constants/theme';

type Palette = (typeof Colors)['light'];

function mapPalette(p: Palette) {
  return {
    surface: '#FFFFFF',
    surfaceDim: '#F7F9FA',
    surfaceBright: '#FFFFFF',
    surfaceContainerLowest: '#FFFFFF',
    surfaceContainerLow: '#F7F9FA',
    surfaceContainer: '#E3F4F1',
    surfaceContainerHigh: '#E5EAEC',
    surfaceContainerHighest: '#D5DCDE',
    onSurface: '#1F2D33',
    onSurfaceVariant: '#6B7C85',
    inverseSurface: '#1F2D33',
    inverseOnSurface: '#F7F9FA',
    outline: '#E5EAEC',
    outlineVariant: '#D5DCDE',
    surfaceTint: '#0F766E',
    accent: '#0F766E', // Primary Teal Accent
    accentSoft: '#E3F4F1', // Soft Accent
    primary: '#0F766E', // Primary Teal
    onPrimary: '#FFFFFF',
    primaryContainer: '#E3F4F1',
    onPrimaryContainer: '#0F766E',
    inversePrimary: '#5EEAD4',
    secondary: '#E3F4F1',
    onSecondary: '#1F2D33',
    secondaryContainer: '#CCFBF1',
    onSecondaryContainer: '#134E4A',
    tertiary: '#F7F9FA',
    onTertiary: '#1F2D33',
    tertiaryContainer: '#E5EAEC',
    onTertiaryContainer: '#374151',
    error: '#FDE8E8',
    onError: '#B42318',
    errorContainer: '#B42318',
    onErrorContainer: '#FFFFFF',
    primaryFixed: '#CCFBF1',
    primaryFixedDim: '#99F6E4',
    onPrimaryFixed: '#0F766E',
    onPrimaryFixedVariant: '#115E59',
    secondaryFixed: '#E3F4F1',
    secondaryFixedDim: '#99F6E4',
    onSecondaryFixed: '#134E4A',
    onSecondaryFixedVariant: '#0F766E',
    tertiaryFixed: '#F7F9FA',
    tertiaryFixedDim: '#E5EAEC',
    onTertiaryFixed: '#1F2D33',
    onTertiaryFixedVariant: '#374151',
    background: '#F7F9FA', // Page Background
    onBackground: '#1F2D33', // Main Text
    surfaceVariant: '#E3F4F1',
    navy: '#1F2D33',
    navyMid: '#374151',
    navyLight: '#6B7C85',
    surfaceAlt: '#F7F9FA',
    card: '#FFFFFF', // Cards / Nav
    cardElevated: '#FFFFFF',
    border: '#E5EAEC', // 1px Border
    borderLight: '#F7F9FA',
    borderAccent: '#0F766E',
    text: '#1F2D33', // Main Text
    textSecondary: '#6B7C85', // Secondary Text
    textMuted: '#A3B1B8', // Hint
    textHint: '#A3B1B8',
    textOnDark: '#FFFFFF',
    teal: '#0F766E',
    tealLight: '#E3F4F1',
    tealMuted: '#CCFBF1',
    cyan: '#0F766E',
    amber: '#8A5A00',
    lime: '#1E7A45',
    crimson: '#B42318',
    driver: '#0F766E',
    driverMuted: '#E3F4F1',
    supervisor: '#0F766E',
    supervisorMuted: '#E3F4F1',
    success: '#1E7A45',
    successMuted: '#E6F6EC',
    warning: '#8A5A00',
    warningMuted: '#FFF4DB',
    danger: '#B42318',
    dangerMuted: '#FDE8E8',
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
    shadowColor: '#0F766E',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 1,
  },
  glow: {
    shadowColor: '#0F766E',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 1,
  },
  warningGlow: {
    shadowColor: '#8A5A00',
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
 * Clean status chip styling helper:
 * Approved / Active / Completed -> bg #E6F6EC, text #1E7A45
 * Pending / In Progress       -> bg #FFF4DB, text #8A5A00
 * Rejected / Suspended        -> bg #FDE8E8, text #B42318
 */
export function getStatusChipStyle(status: string): { bg: string; text: string; label: string } {
  const norm = (status || '').toUpperCase().trim();
  switch (norm) {
    case 'COMPLETED':
    case 'APPROVED':
    case 'ACTIVE':
      return { bg: '#E6F6EC', text: '#1E7A45', label: norm.replace(/_/g, ' ') };
    case 'IN_PROGRESS':
    case 'PENDING_APPROVAL':
    case 'PENDING':
    case 'NOT_STARTED':
    case 'ARRIVED':
      return { bg: '#FFF4DB', text: '#8A5A00', label: norm.replace(/_/g, ' ') };
    case 'REJECTED':
    case 'SUSPENDED':
    case 'INACTIVE':
      return { bg: '#FDE8E8', text: '#B42318', label: norm.replace(/_/g, ' ') };
    default:
      return { bg: '#F7F9FA', text: '#6B7C85', label: norm.replace(/_/g, ' ') || 'UNKNOWN' };
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
  Layout,
  Fonts,
  BottomTabInset,
  MaxContentWidth,
};
export type { ThemeColor };
