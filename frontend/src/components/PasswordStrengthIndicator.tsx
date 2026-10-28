/**
 * SMART ITT — Enterprise Password Strength & Compliance Indicator
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { securityValidator, PasswordStrengthResult } from '../utils/securityValidator';

interface PasswordStrengthIndicatorProps {
  password: string;
  showRules?: boolean;
}

export function PasswordStrengthIndicator({ password, showRules = true }: PasswordStrengthIndicatorProps) {
  if (!password) return null;

  const result: PasswordStrengthResult = securityValidator.evaluatePasswordStrength(password);

  return (
    <View style={styles.container}>
      {/* Strength Bar & Label */}
      <View style={styles.headerRow}>
        <Text style={styles.headerLabel}>Security Strength</Text>
        <View style={[styles.badge, { backgroundColor: `${result.color}20`, borderColor: `${result.color}60` }]}>
          <Text style={[styles.badgeText, { color: result.color }]}>{result.level.replace('_', ' ')}</Text>
        </View>
      </View>

      <View style={styles.barTrack}>
        <View
          style={[
            styles.barFill,
            {
              width: `${Math.max(result.score, 8)}%`,
              backgroundColor: result.color,
            },
          ]}
        />
      </View>

      {/* Rules Checklist */}
      {showRules && (
        <View style={styles.rulesList}>
          {result.rules.map((rule) => (
            <View key={rule.id} style={styles.ruleItem}>
              <Ionicons
                name={rule.passed ? 'checkmark-circle' : 'ellipse-outline'}
                size={14}
                color={rule.passed ? '#10b981' : '#64748b'}
              />
              <Text style={[styles.ruleText, rule.passed && styles.ruleTextPassed]}>
                {rule.label}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    marginBottom: 12,
    padding: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  barTrack: {
    height: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 10,
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  rulesList: {
    gap: 6,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ruleText: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '500',
  },
  ruleTextPassed: {
    color: '#cbd5e1',
  },
});
