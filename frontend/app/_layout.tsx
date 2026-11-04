import React, { useEffect } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { Ionicons } from '@expo/vector-icons';

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
  const { isAuthenticated, user, touchActivity, logoutTargetRoute, isInitializing, initializeSession } = useAuthStore();

  useEffect(() => {
    initializeSession();
  }, [initializeSession]);

  useEffect(() => {
    if (isInitializing) return;
    const segmentList = (segments || []) as string[];
    if (segmentList.length === 0) return;
    const rootGroup = segmentList[0];

    // Handle Unauthenticated state (e.g. after logout or session termination)
    if (!isAuthenticated) {
      const explicitTarget = useAuthStore.getState().logoutTargetRoute;
      if (explicitTarget) {
        useAuthStore.setState({ logoutTargetRoute: null });
        router.replace(explicitTarget as any);
        return;
      }

      if (rootGroup === '(admin)') {
        const isLoginScreen = segmentList.length > 1 && segmentList[1] === 'login';
        if (!isLoginScreen) {
          router.replace('/(admin)/login');
        }
      } else if (rootGroup === '(supervisor)' || rootGroup === '(driver)') {
        router.replace('/(auth)/login');
      }
      return;
    }

    // Admin Section Protection: Logged-in non-admins cannot access admin routes
    if (rootGroup === '(admin)') {
      const isLoginScreen = segmentList.length > 1 && segmentList[1] === 'login';
      if (!isLoginScreen && user?.role !== 'ADMIN') {
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

    // Supervisor Section Protection
    if (rootGroup === '(supervisor)') {
      if (user?.role === 'DRIVER') {
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
  }, [segments, isAuthenticated, user, logoutTargetRoute, router]);

  return (
    <View style={{ flex: 1 }} onTouchStart={() => touchActivity()}>
      {children}
      <AppPrivacyShield />
      <SecurityLockOverlay />
    </View>
  );
}

// Prevent auto-hiding the splash screen until font resources are ready
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded, fontError] = useFonts({
    ...Ionicons.font,
    ionicons: require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf'),
    Ionicons: require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf'),
  });

  useEffect(() => {
    // Hide native splash screen once font resources are loaded, with a 2s safety safeguard
    const timer = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});
    }, 2000);

    if (fontsLoaded || fontError) {
      clearTimeout(timer);
      SplashScreen.hideAsync().catch(() => {});
    }

    return () => clearTimeout(timer);
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return <View style={{ flex: 1, backgroundColor: '#FFFFFF' }} />;
  }

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
