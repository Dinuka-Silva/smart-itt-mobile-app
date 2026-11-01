import { Colors, Spacing } from '../constants/theme';
import type { ThemeColor } from '../constants/theme';

type Palette = (typeof Colors)['light'];

function mapPalette(p: Palette) {
  return {
    surface: '#FFFFFF',
    surfaceDim: '#F8FAFC',
    surfaceBright: '#FFFFFF',
    surfaceContainerLowest: '#FFFFFF',
    surfaceContainerLow: '#F8FAFC',
    surfaceContainer: '#EFF6FF',
    surfaceContainerHigh: '#E2E8F0',
    surfaceContainerHighest: '#CBD5E1',
    onSurface: '#1E293B',
    onSurfaceVariant: '#64748B',
    inverseSurface: '#0F172A',
    inverseOnSurface: '#F8FAFC',
    outline: '#E2E8F0',
    outlineVariant: '#CBD5E1',
    surfaceTint: '#2563EB',
    accent: '#2563EB', // Primary Blue
    accentSoft: '#EFF6FF', // Light Blue
    primary: '#2563EB', // Primary Blue
    onPrimary: '#FFFFFF',
    primaryContainer: '#EFF6FF', // Light Blue container
    onPrimaryContainer: '#1E40AF',
    inversePrimary: '#93C5FD',
    secondary: '#EFF6FF',
    onSecondary: '#1E293B',
    secondaryContainer: '#DBEAFE',
    onSecondaryContainer: '#1E3A8A',
    tertiary: '#F1F5F9',
    onTertiary: '#1E293B',
    tertiaryContainer: '#E2E8F0',
    onTertiaryContainer: '#334155',
    error: '#FEE2E2',
    onError: '#991B1B',
    errorContainer: '#DC2626',
    onErrorContainer: '#FFFFFF',
    primaryFixed: '#DBEAFE',
    primaryFixedDim: '#93C5FD',
    onPrimaryFixed: '#1E3A8A',
    onPrimaryFixedVariant: '#1D4ED8',
    secondaryFixed: '#EFF6FF',
    secondaryFixedDim: '#BFDBFE',
    onSecondaryFixed: '#1E3A8A',
    onSecondaryFixedVariant: '#2563EB',
    tertiaryFixed: '#F1F5F9',
    tertiaryFixedDim: '#E2E8F0',
    onTertiaryFixed: '#0F172A',
    onTertiaryFixedVariant: '#334155',
    background: '#F8FAFC', // Background
    onBackground: '#1E293B', // Main Text
    surfaceVariant: '#EFF6FF',
    navy: '#1E293B',
    navyMid: '#334155',
    navyLight: '#64748B',
    surfaceAlt: '#F8FAFC',
    card: '#FFFFFF', // White Card
    cardElevated: '#FFFFFF',
    border: '#E2E8F0', // Border
    borderLight: '#F1F5F9',
    borderAccent: '#2563EB',
    text: '#1E293B', // Main Text
    textSecondary: '#64748B', // Secondary Text
    textMuted: '#94A3B8',
    textOnDark: '#FFFFFF',
    teal: '#2563EB',
    tealLight: '#EFF6FF',
    tealMuted: '#DBEAFE',
    cyan: '#2563EB',
    amber: '#D97706',
    lime: '#16A34A',
    crimson: '#DC2626',
    driver: '#2563EB',
    driverMuted: '#93C5FD',
    supervisor: '#2563EB',
    supervisorMuted: '#93C5FD',
    success: '#16A34A',
    successMuted: '#DCFCE7',
    warning: '#D97706',
    warningMuted: '#FEF3C7',
    danger: '#DC2626',
    dangerMuted: '#FEE2E2',
    white: '#FFFFFF',
  };
}

export const colors = mapPalette(Colors.dark);

export const radius = {
  xs: 4,
  sm: 8,
  DEFAULT: 12,
  md: 14,
  lg: 18,
  xl: 22,
  '2xl': 28,
  pill: 9999,
  full: 9999,
};

export const spacing = {
  gutter: Spacing.three,
  margin: Spacing.four,
  xs: Spacing.one,
  sm: Spacing.two,
  md: Spacing.three,
  lg: Spacing.four,
  xl: Spacing.five,
};

export const shadow = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  cardHover: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  button: {
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  glow: {
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  warningGlow: {
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  successGlow: {
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  subtle: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
};

export function statusColor(status: string): string {
  switch (status) {
    case 'COMPLETED':
    case 'APPROVED':
      return '#16A34A';
    case 'IN_PROGRESS':
      return '#2563EB';
    case 'PENDING_APPROVAL':
    case 'NOT_STARTED':
      return '#D97706';
    case 'REJECTED':
      return '#DC2626';
    default:
      return '#64748B';
  }
}

export function statusLabel(status: string): string {
  return status.replace(/_/g, ' ');
}

export type { ThemeColor };
