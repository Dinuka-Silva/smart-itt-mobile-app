import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { useAuthStore } from '../src/store/authStore';

export default function Index() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const { isAuthenticated, user, isInitializing, initializeSession } = useAuthStore();
  const [initTimeoutReached, setInitTimeoutReached] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  // Trigger session initialization on mount
  useEffect(() => {
    initializeSession();
  }, [initializeSession]);

  // Safety fallback timer: If still initializing after 4.5s, surface retry / proceed options
  useEffect(() => {
    if (!isInitializing) {
      setInitTimeoutReached(false);
      return;
    }
    const timer = setTimeout(() => {
      if (useAuthStore.getState().isInitializing) {
        setInitTimeoutReached(true);
      }
    }, 4500);

    return () => clearTimeout(timer);
  }, [isInitializing]);

  // Navigation handler once initialization completes
  const navigateToAppropriateScreen = useCallback(() => {
    if (!isAuthenticated || !user) {
      router.replace('/(auth)/login');
    } else if (user.role === 'DRIVER') {
      router.replace('/(driver)/(tabs)');
    } else if (user.role === 'ADMIN') {
      router.replace('/(admin)/(tabs)');
    } else {
      router.replace('/(supervisor)/(tabs)');
    }
  }, [isAuthenticated, user, router]);

  useEffect(() => {
    if (!isInitializing) {
      navigateToAppropriateScreen();
    }
  }, [isInitializing, navigateToAppropriateScreen]);

  const handleRetry = async () => {
    setIsRetrying(true);
    setInitTimeoutReached(false);
    try {
      await initializeSession();
    } finally {
      setIsRetrying(false);
    }
  };

  const handleSkipToLogin = () => {
    useAuthStore.setState({ isInitializing: false });
    router.replace('/(auth)/login');
  };

  // Sizing calculated responsively for phones and tablets
  const logoSize = Math.min(Math.max(Math.min(width, height) * 0.28, 96), 140);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.contentWrap}>
        {/* Centered SCK Logistics / Smart ITT Official Brand Logo */}
        <View style={[styles.logoCard, { width: logoSize + 16, height: logoSize + 16 }]}>
          <Image
            source={require('../assets/sck-logo.png')}
            style={[styles.logo, { width: logoSize, height: logoSize }]}
            resizeMode="contain"
            accessible={true}
            accessibilityLabel="SCK Logistics Official Brand Logo"
          />
        </View>

        {/* Brand Typography */}
        <Text style={styles.brandTitle} numberOfLines={1}>
          SCK Logistics
        </Text>
        <Text style={styles.brandSubtitle} numberOfLines={1}>
          Inter-Terminal Transportation
        </Text>

        {/* Status & Animated Indicator */}
        <View style={styles.indicatorContainer}>
          {!initTimeoutReached ? (
            <>
              <ActivityIndicator size="small" color="#173B70" style={styles.spinner} />
              <Text style={styles.loadingStatusText}>
                {isRetrying ? 'Retrying session restoration...' : 'Starting secure environment...'}
              </Text>
            </>
          ) : (
            <View style={styles.fallbackBox}>
              <Text style={styles.fallbackText}>
                Startup is taking longer than expected.
              </Text>
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.retryBtn]}
                  onPress={handleRetry}
                  activeOpacity={0.8}
                >
                  <Text style={styles.retryBtnText}>Retry</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.skipBtn]}
                  onPress={handleSkipToLogin}
                  activeOpacity={0.8}
                >
                  <Text style={styles.skipBtnText}>Go to Login</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* System Footer Tag */}
      <View style={styles.footerWrap}>
        <Text style={styles.footerText}>Smart ITT • Version 1.0.0</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Platform.OS === 'ios' ? 48 : 36,
    paddingHorizontal: 24,
  },
  contentWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    maxWidth: 380,
  },
  logoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 4px 14px rgba(15, 23, 42, 0.08)',
      },
    }),
  },
  logo: {
    borderRadius: 16,
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#173B70',
    letterSpacing: 0.3,
    textAlign: 'center',
    marginBottom: 4,
  },
  brandSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#5A779D',
    textAlign: 'center',
    letterSpacing: 0.2,
    marginBottom: 28,
  },
  indicatorContainer: {
    alignItems: 'center',
    minHeight: 80,
    justifyContent: 'center',
  },
  spinner: {
    marginBottom: 10,
  },
  loadingStatusText: {
    fontSize: 13,
    color: '#5A779D',
    fontWeight: '400',
  },
  fallbackBox: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  fallbackText: {
    fontSize: 13,
    color: '#5A779D',
    textAlign: 'center',
    marginBottom: 14,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  retryBtn: {
    backgroundColor: '#173B70',
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  skipBtn: {
    backgroundColor: '#F0F5FA',
    borderWidth: 1.5,
    borderColor: '#173B70',
  },
  skipBtnText: {
    color: '#173B70',
    fontSize: 13,
    fontWeight: '600',
  },
  footerWrap: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#CBD5E1',
    fontWeight: '500',
    letterSpacing: 0.4,
  },
});
