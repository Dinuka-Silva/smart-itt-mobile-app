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
  valueColor = '#1F2D33',
}: StatCardProps) {
  return (
    <View style={[styles.card, style]}>
      <View style={styles.topRow}>
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
        {iconName && <Ionicons name={iconName} size={16} color="#6B7C85" />}
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
    borderColor: '#E5EAEC',
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
    fontWeight: '500',
    color: '#6B7C85',
  },
  value: {
    fontSize: 24,
    fontWeight: '600',
    letterSpacing: -0.5,
  },
  hint: {
    fontSize: 12,
    color: '#A3B1B8',
    marginTop: 4,
  },
});

export default StatCard;
