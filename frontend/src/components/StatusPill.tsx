import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { getStatusChipStyle } from '../theme';

type Props = {
  status: string;
  size?: 'sm' | 'md';
  customLabel?: string;
};

export function StatusPill({ status, size = 'md', customLabel }: Props) {
  const chip = getStatusChipStyle(status);
  const isSm = size === 'sm';

  return (
    <View
      style={[
        styles.pill,
        {
          backgroundColor: chip.bg,
          paddingHorizontal: isSm ? 8 : 10,
          paddingVertical: isSm ? 2 : 4,
        },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: chip.text }]} />
      <Text
        style={[
          styles.text,
          {
            color: chip.text,
            fontSize: isSm ? 11 : 12,
          },
        ]}
      >
        {customLabel || chip.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 6,
    gap: 6,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontWeight: '500',
    letterSpacing: 0.3,
  },
});

export default StatusPill;
