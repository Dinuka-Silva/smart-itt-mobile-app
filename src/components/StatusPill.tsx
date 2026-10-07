import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { statusColor, statusLabel, radius, colors, shadow } from '../theme';

type Props = { status: string };

export function StatusPill({ status }: Props) {
  const color = statusColor(status);
  const isWarning = status === 'REJECTED' || status === 'PENDING_APPROVAL';
  return (
    <View style={[styles.pill, { 
      backgroundColor: colors.surfaceContainerHigh,
      borderColor: color,
      ...(isWarning ? shadow.warningGlow : {})
    }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.text, { color }]}>{statusLabel(status)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
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
    fontFamily: 'monospace',
  },
});
