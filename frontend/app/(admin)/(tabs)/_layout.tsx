import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AdminTabsLayout() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 12);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E5EAEC',
          borderTopWidth: 1,
          elevation: 0,
          shadowOpacity: 0,
          height: 60 + bottomInset,
          paddingBottom: bottomInset,
          paddingTop: 6,
        },
        tabBarActiveTintColor: '#0F766E',
        tabBarInactiveTintColor: '#6B7C85',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
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
                color={focused ? '#0F766E' : '#6B7C85'}
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
                color={focused ? '#0F766E' : '#6B7C85'}
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
                color={focused ? '#0F766E' : '#6B7C85'}
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
                color={focused ? '#0F766E' : '#6B7C85'}
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
                color={focused ? '#0F766E' : '#6B7C85'}
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
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  iconWrapActive: {
    backgroundColor: '#E3F4F1',
  },
});
