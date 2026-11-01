import { Platform } from 'react-native';

export const Colors = {
  dark: {
    text: '#1F2D33',
    textSecondary: '#6B7C85',
    textHint: '#A3B1B8',
    background: '#F7F9FA',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#E3F4F1',
    backgroundSurfaceLowest: '#FFFFFF',
    backgroundSurfaceLow: '#F7F9FA',
    backgroundSurfaceHighest: '#E5EAEC',
    border: '#E5EAEC',
    accent: '#0F766E', // Primary Teal Accent
    accentSoft: '#E3F4F1', // Soft Accent
    // Status Chips
    statusApprovedBg: '#E6F6EC',
    statusApprovedText: '#1E7A45',
    statusPendingBg: '#FFF4DB',
    statusPendingText: '#8A5A00',
    statusRejectedBg: '#FDE8E8',
    statusRejectedText: '#B42318',
    success: '#1E7A45',
    warning: '#8A5A00',
    danger: '#B42318',
    dangerContainer: '#FDE8E8',
  },
  light: {
    text: '#1F2D33',
    textSecondary: '#6B7C85',
    textHint: '#A3B1B8',
    background: '#F7F9FA',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#E3F4F1',
    backgroundSurfaceLowest: '#FFFFFF',
    backgroundSurfaceLow: '#F7F9FA',
    backgroundSurfaceHighest: '#E5EAEC',
    border: '#E5EAEC',
    accent: '#0F766E', // Primary Teal Accent
    accentSoft: '#E3F4F1', // Soft Accent
    // Status Chips
    statusApprovedBg: '#E6F6EC',
    statusApprovedText: '#1E7A45',
    statusPendingBg: '#FFF4DB',
    statusPendingText: '#8A5A00',
    statusRejectedBg: '#FDE8E8',
    statusRejectedText: '#B42318',
    success: '#1E7A45',
    warning: '#8A5A00',
    danger: '#B42318',
    dangerContainer: '#FDE8E8',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

const PrimaryFont = Platform.select({
  web: 'Inter, "Noto Sans Sinhala", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  ios: 'System',
  default: 'sans-serif',
});

export const Fonts = {
  sans: PrimaryFont,
  serif: PrimaryFont,
  rounded: PrimaryFont,
  mono: PrimaryFont,
};

export const Typography = {
  pageTitle: { fontSize: 22, fontWeight: '600' as const, color: '#1F2D33' },
  sectionTitle: { fontSize: 18, fontWeight: '600' as const, color: '#1F2D33' },
  listTitle: { fontSize: 16, fontWeight: '500' as const, color: '#1F2D33' },
  body: { fontSize: 15, fontWeight: '400' as const, color: '#1F2D33' },
  label: { fontSize: 13, fontWeight: '500' as const, color: '#6B7C85' },
  chip: { fontSize: 12, fontWeight: '500' as const },
  button: { fontSize: 16, fontWeight: '600' as const },
  dashboardNumber: { fontSize: 24, fontWeight: '600' as const, color: '#1F2D33' },
};

export const Layout = {
  screenPadding: 16,
  radius: 12,
  minTapTarget: 48,
  borderWidth: 1,
};

export const Spacing = {
  half: 4,
  one: 8,
  two: 16,
  three: 24,
  four: 32,
  five: 40,
  six: 48,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
