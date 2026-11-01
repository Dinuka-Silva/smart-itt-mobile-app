import React from 'react';
import { Redirect } from 'expo-router';

/**
 * Clean Redirect from legacy duplicate route /(admin)/supervisors
 * to the official Tab route /(admin)/(tabs)/supervisors
 */
export default function AdminSupervisorsRoute() {
  return <Redirect href="/(admin)/(tabs)/supervisors" />;
}
