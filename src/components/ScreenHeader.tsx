import React from 'react';
import { StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Variant = 'driver' | 'supervisor' | 'default';

type Props = {
  title?: string;
  subtitle?: string;
  eyebrow?: string;
  variant?: Variant;
  right?: React.ReactNode;
  style?: ViewStyle;
};

export function ScreenHeader({ title, subtitle, eyebrow, right, style }: Props) {
  return (
    <ThemedView style={[styles.wrap, style]}>
      <View style={styles.inner}>
        <View style={styles.textBlock}>
          {eyebrow ? (
            <ThemedText type="code" themeColor="textSecondary" style={styles.eyebrow}>
              {eyebrow}
            </ThemedText>
          ) : null}
          {title ? <ThemedText type="subtitle">{title}</ThemedText> : null}
          {subtitle ? (
            <ThemedText type="small" themeColor="textSecondary">
              {subtitle}
            </ThemedText>
          ) : null}
        </View>
        {right ? <View style={styles.right}>{right}</View> : null}
      </View>
    </ThemedView>
  );
}

type HeaderButtonProps = {
  label: string;
  onPress: () => void;
  tone?: 'primary' | 'danger' | 'muted';
};

export function HeaderButton({ label, onPress, tone = 'primary' }: HeaderButtonProps) {
  const theme = useTheme();
  const backgroundColor =
    tone === 'danger' ? theme.danger : tone === 'muted' ? theme.backgroundElement : theme.accent;
  const color = tone === 'muted' ? theme.text : '#ffffff';

  return (
    <TouchableOpacity
      style={[styles.btn, { backgroundColor }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <ThemedText type="smallBold" style={{ color }}>
        {label}
      </ThemedText>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: 52,
    paddingBottom: Spacing.four,
  },
  inner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  textBlock: { flex: 1, gap: Spacing.one },
  right: { alignItems: 'flex-end', gap: Spacing.two },
  eyebrow: {
    textTransform: 'uppercase',
  },
  btn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Spacing.two,
  },
});
