import React, { useEffect } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { applyGlobalTypography } from '../src/theme/typography';
import { useAuthStore } from '../src/store/authStore';
import { useSessionActivity } from '../src/hooks/useSessionActivity';
import { AppPrivacyShield } from '../src/components/AppPrivacyShield';
import { SecurityLockOverlay } from '../src/components/SecurityLockOverlay';
import { securityAuditService } from '../src/services/securityAuditService';

applyGlobalTypography();

if (Platform.OS === 'web') {
  require('../src/global.css');
}

const queryClient = new QueryClient();

function RouteSecurityController({ children }: { children: React.ReactNode }) {
  useSessionActivity();
  const segments = useSegments();
  const router = useRouter();
  const { isAuthenticated, user, touchActivity } = useAuthStore();

  useEffect(() => {
    const segmentList = (segments || []) as string[];
    if (segmentList.length === 0) return;
    const rootGroup = segmentList[0];

    // Admin Section Protection
    if (rootGroup === '(admin)') {
      const isLoginScreen = segmentList.length > 1 && segmentList[1] === 'login';
      if (!isLoginScreen) {
        if (!isAuthenticated || user?.role !== 'ADMIN') {
          securityAuditService.logEvent(
            'UNAUTHORIZED_ROUTE_ATTEMPT',
            user?.username || 'ANONYMOUS',
            `Unauthorized navigation attempt to admin route: /${segmentList.join('/')}`,
            'CRITICAL',
            user?.role
          );
          router.replace('/(admin)/login');
        }
      }
    }

    // Supervisor Section Protection
    if (rootGroup === '(supervisor)') {
      if (!isAuthenticated) {
        router.replace('/(auth)/login');
      } else if (user?.role === 'DRIVER') {
        securityAuditService.logEvent(
          'UNAUTHORIZED_ROUTE_ATTEMPT',
          user?.username || 'DRIVER',
          `Driver restricted from accessing supervisor route: /${segmentList.join('/')}`,
          'WARNING',
          user?.role
        );
        router.replace('/(driver)/(tabs)');
      }
    }

    // Driver Section Protection
    if (rootGroup === '(driver)') {
      if (!isAuthenticated) {
        router.replace('/(auth)/login');
      }
    }
  }, [segments, isAuthenticated, user, router]);

  return (
    <View style={{ flex: 1 }} onTouchStart={() => touchActivity()}>
      {children}
      <AppPrivacyShield />
      <SecurityLockOverlay />
    </View>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  useFonts({
    ionicons: require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf'),
    Ionicons: require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf'),
  });

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
          <RouteSecurityController>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(driver)" />
              <Stack.Screen name="(supervisor)" />
              <Stack.Screen name="(admin)" />
            </Stack>
          </RouteSecurityController>
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
