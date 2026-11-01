import { Platform } from 'react-native';

export const Colors = {
  dark: {
    text: '#1E293B',
    background: '#F8FAFC',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#EFF6FF',
    backgroundSurfaceLowest: '#FFFFFF',
    backgroundSurfaceLow: '#F8FAFC',
    backgroundSurfaceHighest: '#E2E8F0',
    textSecondary: '#64748B',
    accent: '#2563EB', // Primary Blue
    accentSoft: '#EFF6FF',
    success: '#16A34A',
    warning: '#D97706',
    danger: '#DC2626',
    dangerContainer: '#FEE2E2',
  },
  light: {
    text: '#1E293B',
    background: '#F8FAFC',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#EFF6FF',
    backgroundSurfaceLowest: '#FFFFFF',
    backgroundSurfaceLow: '#F8FAFC',
    backgroundSurfaceHighest: '#E2E8F0',
    textSecondary: '#64748B',
    accent: '#2563EB', // Primary Blue
    accentSoft: '#EFF6FF',
    success: '#16A34A',
    warning: '#D97706',
    danger: '#DC2626',
    dangerContainer: '#FEE2E2',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

const PrimaryFont = Platform.select({
  web: 'Spline Sans, Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  ios: 'System',
  default: 'sans-serif',
});

export const Fonts = {
  sans: PrimaryFont,
  serif: PrimaryFont,
  rounded: PrimaryFont,
  mono: PrimaryFont,
};

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
