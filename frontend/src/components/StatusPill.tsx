import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { statusColor, statusLabel } from '../theme';

type Props = {
  status: string;
  size?: 'sm' | 'md';
};

export function StatusPill({ status, size = 'md' }: Props) {
  const color = statusColor(status);
  const isSm = size === 'sm';

  return (
    <View
      style={[
        styles.pill,
        {
          backgroundColor: `${color}18`,
          borderColor: `${color}40`,
          paddingHorizontal: isSm ? 8 : 10,
          paddingVertical: isSm ? 3 : 5,
        },
      ]}
    >
      <View style={[styles.dotWrapper, { backgroundColor: `${color}30` }]}>
        <View style={[styles.dot, { backgroundColor: color }]} />
      </View>
      <ThemedText
        type="code"
        style={[
          styles.text,
          {
            color,
            fontSize: isSm ? 9 : 10,
          },
        ]}
      >
        {statusLabel(status)}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    gap: 6,
    alignSelf: 'flex-start',
  },
  dotWrapper: {
    width: 10,
    height: 10,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
});
