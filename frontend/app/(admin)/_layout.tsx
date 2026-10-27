import { Stack } from 'expo-router';

export default function AdminLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="supervisors" options={{ presentation: 'modal' }} />
      <Stack.Screen name="audit" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
