import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../../src/store/authStore';
import { ScreenHeader, HeaderButton } from '../../../src/components/ScreenHeader';
import { dashboardService } from '../../../src/services/dashboardService';
import { colors, radius, spacing } from '../../../src/theme';

export default function SupervisorHome() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    try {
      const data = await dashboardService.getDashboard();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleLogout = () => {
    logout();
    router.replace('/(auth)/login');
  };

  const statsArray = stats ? [
    { label: 'Total Drivers', value: String(stats.totalDrivers), tint: colors.secondaryContainer },
    { label: 'Active', value: String(stats.activeDrivers), tint: colors.primaryContainer },
    { label: "Today's Trips", value: String(stats.totalTripsToday), tint: colors.tertiaryContainer },
    { label: 'In Progress', value: String(stats.tripsInProgress), tint: colors.warning },
    { label: 'Completed', value: String(stats.completedTrips), tint: colors.primaryContainer },
    { label: 'Pending', value: String(stats.pendingApprovals), tint: colors.error },
    { label: 'Approved', value: String(stats.approvedTrips), tint: colors.primaryContainer },
    { label: 'Rejected', value: String(stats.rejectedTrips), tint: colors.error },
  ] : [
    { label: 'Total Drivers', value: '—', tint: colors.secondaryContainer },
    { label: 'Active', value: '—', tint: colors.primaryContainer },
    { label: "Today's Trips", value: '—', tint: colors.tertiaryContainer },
    { label: 'In Progress', value: '—', tint: colors.warning },
    { label: 'Completed', value: '—', tint: colors.primaryContainer },
    { label: 'Pending', value: '—', tint: colors.error },
    { label: 'Approved', value: '—', tint: colors.primaryContainer },
    { label: 'Rejected', value: '—', tint: colors.error },
  ];

  return (
    <ScrollView style={styles.container}>
      <ScreenHeader
        variant="supervisor"
        eyebrow="Operations control"
        title={user?.name || 'Supervisor'}
        subtitle="Review trips and approve container moves"
        right={
          <>
            <View style={styles.roleChip}>
              <Text style={styles.roleChipText}>Supervisor</Text>
            </View>
            <HeaderButton label="Sign out" onPress={handleLogout} tone="danger" />
          </>
        }
      />

      <View style={styles.grid}>
        {statsArray.map((stat) => (
          <View key={stat.label} style={styles.statCard}>
            <Text style={[styles.statValue, { color: stat.tint }]}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.activitySection}>
        <Text style={styles.sectionTitle}>Today&apos;s throughput</Text>
        <View style={styles.activityCard}>
          {[
            ['20FT containers', '18'],
            ['40FT containers', '12'],
            ['ECT trips', '9'],
            ['JCT trips', '8'],
            ['UCT trips', '7'],
          ].map(([label, value], i, arr) => (
            <View key={label} style={[styles.activityRow, i === arr.length - 1 && styles.activityRowLast]}>
              <Text style={styles.activityLabel}>{label}</Text>
              <Text style={styles.activityValue}>{value}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  roleChip: {
    backgroundColor: colors.surfaceContainerHigh,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  roleChipText: { color: colors.tertiaryContainer, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
    marginTop: -8,
    gap: spacing.sm,
  },
  statCard: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.lg,
    padding: spacing.md,
    width: '47%',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  statValue: { fontSize: 26, fontWeight: '700', fontFamily: 'monospace' },
  statLabel: { fontSize: 11, color: colors.onSurfaceVariant, marginTop: 4, fontWeight: '600', textTransform: 'uppercase' },
  activitySection: { paddingHorizontal: spacing.md, marginTop: spacing.lg, paddingBottom: spacing.xl },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.onSurface, marginBottom: spacing.sm },
  activityCard: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  activityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  activityRowLast: { borderBottomWidth: 0 },
  activityLabel: { fontSize: 14, color: colors.onSurfaceVariant, fontFamily: 'monospace' },
  activityValue: { fontSize: 14, fontWeight: '700', color: colors.onSurface, fontFamily: 'monospace' },
});
