import { Colors, Spacing } from '../constants/theme';
import type { ThemeColor } from '../constants/theme';

type Palette = (typeof Colors)['light'];

function mapPalette(p: Palette) {
  return {
    surface: '#0a1019',
    surfaceDim: '#060b13',
    surfaceBright: '#1e2838',
    surfaceContainerLowest: '#050910',
    surfaceContainerLow: '#0e1724',
    surfaceContainer: '#131e2e',
    surfaceContainerHigh: '#1a273b',
    surfaceContainerHighest: '#24344d',
    onSurface: '#f1f5f9',
    onSurfaceVariant: '#cbd5e1',
    inverseSurface: '#f8fafc',
    inverseOnSurface: '#0f172a',
    outline: '#64748b',
    outlineVariant: '#334155',
    surfaceTint: '#00e5ff',
    accent: '#00e5ff',
    accentSoft: '#cffafe',
    primary: '#cffafe',
    onPrimary: '#00363d',
    primaryContainer: '#00e5ff', // Electric Port Cyan
    onPrimaryContainer: '#004f58',
    inversePrimary: '#006875',
    secondary: '#fef08a',
    onSecondary: '#422006',
    secondaryContainer: '#feb300', // Safety Signal Amber
    onSecondaryContainer: '#713f12',
    tertiary: '#bbf7d0',
    onTertiary: '#052e16',
    tertiaryContainer: '#10b981', // Terminal Success Emerald
    onTertiaryContainer: '#064e3b',
    error: '#fecdd3',
    onError: '#4c0519',
    errorContainer: '#f43f5e',
    onErrorContainer: '#ffe4e6',
    primaryFixed: '#a5f3fc',
    primaryFixedDim: '#06b6d4',
    onPrimaryFixed: '#083344',
    onPrimaryFixedVariant: '#155e75',
    secondaryFixed: '#fde68a',
    secondaryFixedDim: '#f59e0b',
    onSecondaryFixed: '#451a03',
    onSecondaryFixedVariant: '#78350f',
    tertiaryFixed: '#86efac',
    tertiaryFixedDim: '#22c55e',
    onTertiaryFixed: '#052e16',
    onTertiaryFixedVariant: '#14532d',
    background: '#070c14',
    onBackground: '#f1f5f9',
    surfaceVariant: '#1a273b',
    navy: '#050910',
    navyMid: '#0e1724',
    navyLight: '#1a273b',
    surfaceAlt: '#131e2e',
    card: '#0f1928',
    cardElevated: '#142236',
    border: 'rgba(255, 255, 255, 0.08)',
    borderLight: 'rgba(255, 255, 255, 0.05)',
    borderAccent: 'rgba(0, 229, 255, 0.25)',
    text: '#f8fafc',
    textSecondary: '#cbd5e1',
    textMuted: '#94a3b8',
    textOnDark: '#ffffff',
    teal: '#00e5ff',
    tealLight: '#cffafe',
    tealMuted: '#083344',
    cyan: '#00e5ff',
    amber: '#feb300',
    lime: '#10b981',
    crimson: '#f43f5e',
    driver: '#00e5ff',
    driverMuted: '#0e7490',
    supervisor: '#feb300',
    supervisorMuted: '#b45309',
    success: '#10b981',
    successMuted: '#047857',
    warning: '#feb300',
    warningMuted: '#b45309',
    danger: '#f43f5e',
    dangerMuted: '#be123c',
    white: '#ffffff',
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
    shadowColor: '#00e5ff',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  glow: {
    shadowColor: '#00e5ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 6,
  },
  warningGlow: {
    shadowColor: '#feb300',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 5,
  },
  successGlow: {
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 5,
  },
  subtle: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
};

export function statusColor(status: string): string {
  switch (status) {
    case 'COMPLETED':
    case 'APPROVED':
      return '#10b981';
    case 'IN_PROGRESS':
      return '#00e5ff';
    case 'PENDING_APPROVAL':
    case 'NOT_STARTED':
      return '#feb300';
    case 'REJECTED':
      return '#f43f5e';
    default:
      return '#94a3b8';
  }
}

export function statusLabel(status: string): string {
  return status.replace(/_/g, ' ');
}

export type { ThemeColor };
