import { Platform } from 'react-native';

export const Colors = {
  dark: {
    text: '#dde2f0',
    background: '#0e141d',
    backgroundElement: '#1a2029',
    backgroundSelected: '#242a34',
    backgroundSurfaceLowest: '#080e17',
    backgroundSurfaceLow: '#161c25',
    backgroundSurfaceHighest: '#2f353f',
    textSecondary: '#bac9cc',
    accent: '#00e5ff', // Primary Electric Cyan
    accentSoft: '#c3f5ff',
    success: '#22ef7e', // Terminal Success Lime
    warning: '#feb300', // Safety Signal Amber
    danger: '#ff5252', // Critical Emergency Crimson
    dangerContainer: '#93000a',
  },
  light: {
    text: '#dde2f0',
    background: '#0e141d',
    backgroundElement: '#1a2029',
    backgroundSelected: '#242a34',
    backgroundSurfaceLowest: '#080e17',
    backgroundSurfaceLow: '#161c25',
    backgroundSurfaceHighest: '#2f353f',
    textSecondary: '#bac9cc',
    accent: '#00e5ff',
    accentSoft: '#c3f5ff',
    success: '#22ef7e',
    warning: '#feb300',
    danger: '#ff5252',
    dangerContainer: '#93000a',
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
