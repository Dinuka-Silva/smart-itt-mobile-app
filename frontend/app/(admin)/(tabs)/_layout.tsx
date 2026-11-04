import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AdminTabsLayout() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 8 : 12);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#173B70',
        tabBarInactiveTintColor: '#5A779D',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#D0DEEB',
          height: Platform.select({
            ios: 62 + bottomInset,
            android: 64 + (insets.bottom > 0 ? insets.bottom : 8),
            default: 64,
          }),
          paddingBottom: Platform.select({
            ios: bottomInset,
            android: insets.bottom > 0 ? insets.bottom + 4 : 8,
            default: 8,
          }),
          paddingTop: 8,
          elevation: 6,
          shadowColor: '#173B70',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.06,
          shadowRadius: 4,
        },
        tabBarItemStyle: {
          justifyContent: 'center',
          alignItems: 'center',
          paddingVertical: 2,
        },
        tabBarIconStyle: {
          width: 48,
          height: 28,
          justifyContent: 'center',
          alignItems: 'center',
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginTop: 3,
          textAlign: 'center',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => (
            <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
              <Ionicons
                name={focused ? 'home' : 'home-outline'}
                size={20}
                color={focused ? '#173B70' : '#5A779D'}
                style={{ textAlign: 'center' }}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="drivers"
        options={{
          title: 'Drivers',
          tabBarIcon: ({ focused }) => (
            <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
              <Ionicons
                name={focused ? 'people' : 'people-outline'}
                size={20}
                color={focused ? '#173B70' : '#5A779D'}
                style={{ textAlign: 'center' }}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="supervisors"
        options={{
          title: 'Supervisors',
          tabBarIcon: ({ focused }) => (
            <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
              <Ionicons
                name={focused ? 'shield-checkmark' : 'shield-checkmark-outline'}
                size={20}
                color={focused ? '#173B70' : '#5A779D'}
                style={{ textAlign: 'center' }}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="vehicles"
        options={{
          title: 'Vehicles',
          tabBarIcon: ({ focused }) => (
            <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
              <Ionicons
                name={focused ? 'bus' : 'bus-outline'}
                size={20}
                color={focused ? '#173B70' : '#5A779D'}
                style={{ textAlign: 'center' }}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Reports',
          tabBarIcon: ({ focused }) => (
            <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
              <Ionicons
                name={focused ? 'document-text' : 'document-text-outline'}
                size={20}
                color={focused ? '#173B70' : '#5A779D'}
                style={{ textAlign: 'center' }}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="trips"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 44,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  iconWrapActive: {
    backgroundColor: '#E8F1FA',
  },
});
