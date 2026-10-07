/** SMART ITT design tokens — Logistics Command System */
export const colors = {
  // Surface colors
  surface: '#0d1321',
  surfaceDim: '#0d1321',
  surfaceBright: '#333948',
  surfaceContainerLowest: '#080e1c',
  surfaceContainerLow: '#151b29',
  surfaceContainer: '#191f2e',
  surfaceContainerHigh: '#242a39',
  surfaceContainerHighest: '#2f3544',
  
  // Text colors
  onSurface: '#dde2f6',
  onSurfaceVariant: '#bac9cc',
  inverseSurface: '#dde2f6',
  inverseOnSurface: '#2a303f',
  outline: '#849396',
  outlineVariant: '#3b494c',
  
  // Primary colors
  surfaceTint: '#00daf3',
  primary: '#c3f5ff',
  onPrimary: '#00363d',
  primaryContainer: '#00e5ff',
  onPrimaryContainer: '#00626e',
  inversePrimary: '#006875',
  
  // Secondary colors
  secondary: '#b0c6ff',
  onSecondary: '#002d6e',
  secondaryContainer: '#0068ed',
  onSecondaryContainer: '#f2f3ff',
  
  // Tertiary colors
  tertiary: '#ffe7e2',
  onTertiary: '#621100',
  tertiaryContainer: '#ffc2b3',
  onTertiaryContainer: '#aa2600',
  
  // Error colors
  error: '#ffb4ab',
  onError: '#690005',
  errorContainer: '#93000a',
  onErrorContainer: '#ffdad6',
  
  // Fixed colors
  primaryFixed: '#9cf0ff',
  primaryFixedDim: '#00daf3',
  onPrimaryFixed: '#001f24',
  onPrimaryFixedVariant: '#004f58',
  secondaryFixed: '#d9e2ff',
  secondaryFixedDim: '#b0c6ff',
  onSecondaryFixed: '#001945',
  onSecondaryFixedVariant: '#00429b',
  tertiaryFixed: '#ffdad2',
  tertiaryFixedDim: '#ffb4a2',
  onTertiaryFixed: '#3c0700',
  onTertiaryFixedVariant: '#8a1d00',
  
  // Background
  background: '#0d1321',
  onBackground: '#dde2f6',
  surfaceVariant: '#2f3544',
  
  // Legacy aliases for compatibility
  navy: '#0d1321',
  navyMid: '#151b29',
  navyLight: '#242a39',
  surfaceAlt: '#191f2e',
  card: '#191f2e',
  border: '#3b494c',
  borderLight: '#849396',
  text: '#dde2f6',
  textSecondary: '#bac9cc',
  textMuted: '#849396',
  textOnDark: '#dde2f6',
  teal: '#00e5ff',
  tealLight: '#00daf3',
  tealMuted: '#9cf0ff',
  cyan: '#00e5ff',
  driver: '#0068ed',
  driverMuted: '#b0c6ff',
  supervisor: '#ffc2b3',
  supervisorMuted: '#ffe7e2',
  success: '#00e5ff',
  successMuted: '#9cf0ff',
  warning: '#ff3d00',
  warningMuted: '#ffc2b3',
  danger: '#ffb4ab',
  dangerMuted: '#ffdad6',
  white: '#dde2f6',
};

export const radius = {
  sm: 2,
  DEFAULT: 4,
  md: 6,
  lg: 8,
  xl: 12,
  pill: 9999,
};

export const spacing = {
  gutter: 16,
  margin: 24,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const shadow = {
  card: {
    shadowColor: '#0d1321',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  button: {
    shadowColor: '#00e5ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  glow: {
    shadowColor: '#00e5ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 8,
  },
  warningGlow: {
    shadowColor: '#ff3d00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 8,
  },
};

export function statusColor(status: string): string {
  switch (status) {
    case 'COMPLETED':
    case 'APPROVED':
      return colors.success;
    case 'IN_PROGRESS':
      return colors.driver;
    case 'PENDING_APPROVAL':
    case 'NOT_STARTED':
      return colors.warning;
    case 'REJECTED':
      return colors.danger;
    default:
      return colors.textMuted;
  }
}

export function statusLabel(status: string): string {
  return status.replace(/_/g, ' ');
}
