/**
 * SMART ITT — App Privacy Shield
 * Obfuscates sensitive terminal, driver, and container data when the app is minimized,
 * in multitasking view, or backgrounded to prevent OS screen capture & shoulder surfing.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, AppState, AppStateStatus, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

interface AppPrivacyShieldProps {
  enabled?: boolean;
}

export function AppPrivacyShield({ enabled = true }: AppPrivacyShieldProps) {
  const [isShieldActive, setIsShieldActive] = useState(false);

  useEffect(() => {
    if (!enabled || Platform.OS === 'web') return;

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      // Inactive (iOS app switcher) or Background (Android / iOS multitasking)
      if (nextAppState === 'inactive' || nextAppState === 'background') {
        setIsShieldActive(true);
      } else if (nextAppState === 'active') {
        setIsShieldActive(false);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [enabled]);

  if (!isShieldActive) {
    return null;
  }

  return (
    <View style={styles.overlay} pointerEvents="auto">
      <View style={styles.badgeContainer}>
        <View style={styles.iconCircle}>
          <Ionicons name="shield-checkmark" size={44} color="#2563EB" />
        </View>
        <Text style={styles.title}>SMART ITT SECURITY SHIELD</Text>
        <Text style={styles.subtitle}>Protected Terminal & Fleet Data</Text>
        <View style={styles.lockRow}>
          <Ionicons name="lock-closed" size={14} color="#64748B" />
          <Text style={styles.lockNotice}>Screen hidden to protect sensitive port operations</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#F8FAFC',
    zIndex: 999999,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  badgeContainer: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    paddingVertical: 32,
    paddingHorizontal: 28,
    maxWidth: 360,
    width: '100%',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  title: {
    color: '#1E293B',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1.2,
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 20,
  },
  lockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  lockNotice: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
  },
});
