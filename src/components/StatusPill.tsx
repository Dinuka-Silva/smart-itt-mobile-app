import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { statusLabel } from '../theme';

type Props = { status: string };

export function StatusPill({ status }: Props) {
  const theme = useTheme();
  const color =
    status === 'COMPLETED' || status === 'APPROVED'
      ? theme.success
      : status === 'IN_PROGRESS'
        ? theme.accent
        : status === 'REJECTED'
          ? theme.danger
          : status === 'PENDING_APPROVAL' || status === 'NOT_STARTED'
            ? theme.warning
            : theme.textSecondary;

  return (
    <ThemedView type="backgroundElement" style={[styles.pill, { borderColor: color }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <ThemedText type="code" style={[styles.text, { color }]}>
        {statusLabel(status)}
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
});
