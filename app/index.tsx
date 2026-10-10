import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

import { ThemedView } from '../src/components/themed-view';
import { useTheme } from '../src/hooks/use-theme';
import { useAuthStore } from '../src/store/authStore';

export default function Index() {
  const router = useRouter();
  const theme = useTheme();
  const { isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated || !user) {
      router.replace('/(auth)/login');
    } else if (user.role === 'DRIVER') {
      router.replace('/(driver)/(tabs)');
    } else {
      router.replace('/(supervisor)/(tabs)');
    }
  }, [isAuthenticated, user, router]);

  return (
    <ThemedView style={styles.container}>
      <ActivityIndicator size="large" color={theme.accent} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
