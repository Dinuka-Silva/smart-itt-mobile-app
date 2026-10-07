
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { colors, radius, spacing, shadow } from '../theme';

type Variant = 'driver' | 'supervisor' | 'default';

type Props = {
  title?: string;
  subtitle?: string;
  eyebrow?: string;
  variant?: Variant;
  right?: React.ReactNode;
  style?: ViewStyle;
};

const accent: Record<Variant, string> = {
  driver: colors.secondaryContainer,
  supervisor: colors.tertiaryContainer,
  default: colors.primaryContainer,
};

export function ScreenHeader({ title, subtitle, eyebrow, variant = 'default', right, style }: Props) {
  const bar = accent[variant];

  return (
    <View style={[styles.wrap, style]}>
      <View style={[styles.accentBar, { backgroundColor: bar }]} />
      <View style={styles.inner}>
        <View style={styles.textBlock}>
          {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
          {title ? <Text style={styles.title}>{title}</Text> : null}
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {right ? <View style={styles.right}>{right}</View> : null}
      </View>
    </View>
  );
}

type HeaderButtonProps = {
  label: string;
  onPress: () => void;
  tone?: 'primary' | 'danger' | 'muted';
};

export function HeaderButton({ label, onPress, tone = 'primary' }: HeaderButtonProps) {
  const toneStyle =
    tone === 'danger'
      ? styles.btnDanger
      : tone === 'muted'
        ? styles.btnMuted
        : styles.btnPrimary;

  return (
    <TouchableOpacity style={[styles.btn, toneStyle]} onPress={onPress} activeOpacity={0.85}>
      <Text style={[styles.btnText, tone === 'muted' && styles.btnTextMuted]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surfaceContainer,
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
    overflow: 'hidden',
    paddingTop: 52,
    paddingBottom: spacing.lg,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.outlineVariant,
  },
  accentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  inner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  textBlock: { flex: 1 },
  right: { alignItems: 'flex-end', gap: spacing.sm },
  eyebrow: {
    color: colors.onSurfaceVariant,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  title: {
    color: colors.onSurface,
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: colors.onSurfaceVariant,
    fontSize: 13,
    marginTop: 6,
    lineHeight: 18,
    fontFamily: 'monospace',
  },
  btn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
  },
  btnPrimary: { 
    backgroundColor: colors.primaryContainer,
    borderColor: colors.primaryContainer,
    ...shadow.glow,
  },
  btnDanger: { 
    backgroundColor: colors.errorContainer,
    borderColor: colors.errorContainer,
  },
  btnMuted: {
    backgroundColor: colors.surfaceContainerHigh,
    borderColor: colors.outline,
  },
  btnText: { color: colors.onPrimaryContainer, fontSize: 12, fontWeight: '700' },
  btnTextMuted: { color: colors.onSurface },
});
