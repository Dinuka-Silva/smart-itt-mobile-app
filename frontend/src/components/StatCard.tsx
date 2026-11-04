import React from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Layout } from '../constants/theme';

interface StatCardProps {
  label: string;
  value: string | number;
  iconName?: keyof typeof Ionicons.glyphMap;
  hint?: string;
  style?: StyleProp<ViewStyle>;
  valueColor?: string;
}

export function StatCard({
  label,
  value,
  iconName,
  hint,
  style,
  valueColor = '#173B70',
}: StatCardProps) {
  return (
    <View style={[styles.card, style]}>
      <View style={styles.topRow}>
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
        {iconName && <Ionicons name={iconName} size={16} color="#173B70" />}
      </View>
      <Text style={[styles.value, { color: valueColor }]}>{value}</Text>
      {hint ? (
        <Text style={styles.hint} numberOfLines={1}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: Layout.radius,
    borderWidth: 1,
    borderColor: '#D0DEEB',
    padding: 14,
    justifyContent: 'center',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3A567F',
  },
  value: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  hint: {
    fontSize: 12,
    color: '#5E799E',
    marginTop: 4,
  },
});

export default StatCard;

