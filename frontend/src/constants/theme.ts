import { Platform } from 'react-native';

export const Colors = {
  dark: {
    text: '#173B70',
    textSecondary: '#3A567F',
    textHint: '#5E799E',
    background: '#FFFFFF',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#E8F1FA',
    backgroundSurfaceLowest: '#FFFFFF',
    backgroundSurfaceLow: '#F0F5FA',
    backgroundSurfaceHighest: '#D0DEEB',
    border: '#D0DEEB',
    accent: '#173B70', // Primary Dark Navy Blue
    accentSoft: '#E8F1FA', // Soft Light Blue
    // Status Chips (Two-Color variations)
    statusApprovedBg: '#E8F1FA',
    statusApprovedText: '#173B70',
    statusPendingBg: '#F4F8FC',
    statusPendingText: '#173B70',
    statusRejectedBg: '#F0F5FA',
    statusRejectedText: '#173B70',
    success: '#173B70',
    warning: '#173B70',
    danger: '#173B70',
    dangerContainer: '#F0F5FA',
  },
  light: {
    text: '#173B70',
    textSecondary: '#3A567F',
    textHint: '#5E799E',
    background: '#FFFFFF',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#E8F1FA',
    backgroundSurfaceLowest: '#FFFFFF',
    backgroundSurfaceLow: '#F0F5FA',
    backgroundSurfaceHighest: '#D0DEEB',
    border: '#D0DEEB',
    accent: '#173B70', // Primary Dark Navy Blue
    accentSoft: '#E8F1FA', // Soft Light Blue
    // Status Chips (Two-Color variations)
    statusApprovedBg: '#E8F1FA',
    statusApprovedText: '#173B70',
    statusPendingBg: '#F4F8FC',
    statusPendingText: '#173B70',
    statusRejectedBg: '#F0F5FA',
    statusRejectedText: '#173B70',
    success: '#173B70',
    warning: '#173B70',
    danger: '#173B70',
    dangerContainer: '#F0F5FA',
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
  pageTitle: { fontSize: 22, fontWeight: '700' as const, color: '#173B70' },
  sectionTitle: { fontSize: 18, fontWeight: '700' as const, color: '#173B70' },
  listTitle: { fontSize: 16, fontWeight: '600' as const, color: '#173B70' },
  body: { fontSize: 15, fontWeight: '400' as const, color: '#173B70' },
  label: { fontSize: 13, fontWeight: '600' as const, color: '#3A567F' },
  chip: { fontSize: 12, fontWeight: '600' as const },
  button: { fontSize: 16, fontWeight: '600' as const },
  dashboardNumber: { fontSize: 24, fontWeight: '700' as const, color: '#173B70' },
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

export const typography = Typography;
export const spacing = {
  ...Spacing,
  xs: Spacing.half,
  sm: Spacing.one,
  md: Spacing.two,
  lg: Spacing.three,
  xl: Spacing.four,
  gutter: Layout.screenPadding,
  margin: Layout.screenPadding,
};
export const radius = {
  xs: 4,
  sm: 6,
  md: Layout.radius,
  lg: 16,
  xl: 20,
  pill: 9999,
  full: 9999,
};

export const colors = {
  ...Colors.light,
  primary: '#173B70', // Primary Teal
  accent: '#173B70',
  accentSoft: '#E3F4F1',
  surface: '#FFFFFF',
  surfaceDim: '#F7F9FA',
  surfaceBright: '#FFFFFF',
  surfaceContainerLowest: '#FFFFFF',
  surfaceContainerLow: '#F7F9FA',
  surfaceContainer: '#E3F4F1',
  surfaceContainerHigh: '#E5EAEC',
  surfaceContainerHighest: '#D5DCDE',
  card: '#FFFFFF',
  border: '#E5EAEC',
  text: '#1F2D33',
  textPrimary: '#1F2D33',
  textSecondary: '#6B7C85',
  textMuted: '#A3B1B8',
  teal: '#173B70',
  tealLight: '#E3F4F1',
  surfaceTeal: '#E3F4F1',
  white: '#FFFFFF',
  success: '#1E7A45',
  warning: '#173B70',
  danger: '#173B70',
  dangerContainer: '#FDE8E8',
};
