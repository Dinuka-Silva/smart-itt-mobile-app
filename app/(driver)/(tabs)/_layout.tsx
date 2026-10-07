import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../../../src/theme';
import { View } from 'react-native';

export default function DriverTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primaryContainer,
        tabBarInactiveTintColor: colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: colors.surfaceContainer,
          borderTopWidth: 1,
          borderTopColor: colors.outlineVariant,
          elevation: 0,
          height: 66,
          paddingBottom: 10,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          letterSpacing: 0.2,
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <View style={{ alignItems: 'center' }}>
              <Ionicons name={focused ? 'home' : 'home-outline'} size={23} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="trips"
        options={{
          title: 'Trips',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'cube' : 'cube-outline'} size={23} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="containers"
        options={{
          title: 'Load',
          tabBarIcon: ({ color, focused }) => (
            <View style={{
              width: 46, height: 46, borderRadius: 23,
              backgroundColor: focused ? colors.primaryContainer : colors.surfaceContainerHigh,
              alignItems: 'center', justifyContent: 'center',
              marginBottom: 4,
              borderWidth: 2,
              borderColor: focused ? colors.primaryContainer : colors.outlineVariant,
            }}>
              <Ionicons name="add" size={26} color={focused ? colors.onPrimaryContainer : colors.onSurfaceVariant} />
            </View>
          ),
          tabBarLabel: () => null,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'notifications' : 'notifications-outline'} size={23} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person-circle' : 'person-circle-outline'} size={23} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
