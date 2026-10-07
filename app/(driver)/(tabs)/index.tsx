import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../../src/store/authStore';
import { tripService } from '../../../src/services/tripService';
import { StatusPill } from '../../../src/components/StatusPill';
import { colors, radius, spacing, shadow } from '../../../src/theme';

export default function DriverHome() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();
  const [trips, setTrips] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTrips = useCallback(async () => {
    try {
      const data = await tripService.getTrips(user?.driverId);
      if (Array.isArray(data)) setTrips(data);
    } catch { /* keep list */ } finally { setRefreshing(false); }
  }, [user]);

  useEffect(() => { fetchTrips(); }, [fetchTrips]);

  const driverCode = user?.driverCode || user?.username || '—';
  const fullName = user?.name || 'Driver';
  const vehicle = user?.vehicleNumber || '—';

  const total = trips.length;
  const active = trips.filter((t) => t.status === 'IN_PROGRESS').length;
  const pending = trips.filter((t) => t.status === 'PENDING_APPROVAL').length;
  const completed = trips.filter((t) => t.status === 'COMPLETED' || t.status === 'APPROVED').length;

  const recentTrips = trips.slice(0, 4);

  const actions = [
    { label: 'My Profile', icon: 'person-circle-outline', color: colors.primaryContainer, route: '/(driver)/(tabs)/profile' },
    { label: 'My Trips', icon: 'cube-outline', color: colors.secondaryContainer, route: '/(driver)/(tabs)/trips' },
    { label: 'Load Cargo', icon: 'add-circle-outline', color: colors.tertiaryContainer, route: '/(driver)/(tabs)/containers' },
    { label: 'Notifications', icon: 'notifications-outline', color: colors.warning, route: '/(driver)/(tabs)/notifications' },
  ];

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchTrips(); }} tintColor={colors.primaryContainer} />}
    >
      {/* ─── Header ─── */}
      <View style={styles.header}>
        <View style={styles.headerGlow} />
        <View style={styles.headerTopRow}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoLetters}>ITT</Text>
          </View>
          <Text style={styles.brandLabel}>SMART ITT</Text>
          <View style={styles.spacer} />
          <TouchableOpacity style={styles.signOutBtn} onPress={() => { logout(); router.replace('/(auth)/login'); }}>
            <Ionicons name="log-out-outline" size={18} color={colors.error} />
          </TouchableOpacity>
        </View>

        <Text style={styles.welcomeLabel}>Welcome,</Text>
        <Text style={styles.driverName}>{fullName}</Text>

        <View style={styles.badgeRow}>
          <View style={styles.codeBadge}>
            <Ionicons name="id-card-outline" size={13} color={colors.onPrimaryContainer} />
            <Text style={styles.codeBadgeLabel}>DRIVER CODE</Text>
            <Text style={styles.codeBadgeValue}>{driverCode}</Text>
          </View>
          <View style={styles.vehicleBadge}>
            <Ionicons name="bus-outline" size={13} color={colors.tertiaryContainer} />
            <Text style={styles.vehicleBadgeLabel}>VEHICLE</Text>
            <Text style={styles.vehicleBadgeValue}>{vehicle}</Text>
          </View>
        </View>
      </View>

      {/* ─── Stats ─── */}
      <View style={styles.statsRow}>
        {[
          { label: 'Total', value: total, color: colors.onSurface },
          { label: 'Active', value: active, color: colors.secondaryContainer },
          { label: 'Pending', value: pending, color: colors.warning },
          { label: 'Done', value: completed, color: colors.primaryContainer },
        ].map((s) => (
          <View key={s.label} style={styles.statTile}>
            <Text style={[styles.statNum, { color: s.color }]}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* ─── Start New Trip CTA ─── */}
      <TouchableOpacity style={styles.ctaCard} onPress={() => router.push('/(driver)/trips/new')} activeOpacity={0.88}>
        <View style={styles.ctaIconWrap}>
          <Ionicons name="add" size={26} color={colors.onPrimaryContainer} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.ctaTitle}>Start New Trip</Text>
          <Text style={styles.ctaSub}>Load containers &amp; submit for supervisor approval</Text>
        </View>
        <Ionicons name="chevron-forward" size={22} color={colors.onPrimaryContainer} />
      </TouchableOpacity>

      {/* ─── Quick Actions ─── */}
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
      </View>
      <View style={styles.actionsGrid}>
        {actions.map((a) => (
          <TouchableOpacity
            key={a.label}
            style={styles.actionTile}
            onPress={() => router.push(a.route as any)}
            activeOpacity={0.85}
          >
            <View style={[styles.actionIconBg, { backgroundColor: `${a.color}1a` }]}>
              <Ionicons name={a.icon as any} size={24} color={a.color} />
            </View>
            <Text style={styles.actionLabel}>{a.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ─── Recent Trips ─── */}
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>Recent Trips</Text>
        <TouchableOpacity onPress={() => router.push('/(driver)/(tabs)/trips')}>
          <Text style={styles.viewAll}>View all</Text>
        </TouchableOpacity>
      </View>

      {recentTrips.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="cube-outline" size={32} color={colors.outlineVariant} />
          <Text style={styles.emptyTitle}>No trips yet</Text>
          <Text style={styles.emptySub}>Tap "Start New Trip" to begin your first transport.</Text>
        </View>
      ) : (
        recentTrips.map((trip) => {
          const tripNum = trip.tripNumber || `TRP-${trip.id?.slice(0, 6)}`;
          return (
            <View key={trip.id} style={styles.tripCard}>
              <View style={styles.tripCardTop}>
                <View>
                  <Text style={styles.tripNum}>{tripNum}</Text>
                  <Text style={styles.tripVessel}>{trip.vesselName || 'Vessel'}</Text>
                </View>
                <StatusPill status={trip.status || 'IN_PROGRESS'} />
              </View>
              <View style={styles.tripRoute}>
                <Text style={styles.tripTerm}>{trip.sourceTerminal || 'ECT'}</Text>
                <View style={styles.routeLine}>
                  <Ionicons name="arrow-forward" size={12} color={colors.outline} />
                </View>
                <Text style={styles.tripTerm}>{trip.destTerminal || 'JCT'}</Text>
              </View>
              <Text style={styles.tripMeta}>{(trip.containers || []).length} container(s)</Text>
            </View>
          );
        })
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  // Header
  header: {
    backgroundColor: colors.surfaceContainer,
    paddingTop: 52, paddingBottom: spacing.xl, paddingHorizontal: spacing.lg,
    borderBottomLeftRadius: radius.xl, borderBottomRightRadius: radius.xl,
    borderWidth: 1, borderTopWidth: 0, borderColor: colors.outlineVariant,
    overflow: 'hidden',
  },
  headerGlow: {
    position: 'absolute', top: -60, right: -60,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: colors.primaryContainer, opacity: 0.06,
  },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg },
  logoBadge: {
    width: 36, height: 36, borderRadius: radius.md,
    backgroundColor: colors.primaryContainer, alignItems: 'center', justifyContent: 'center',
    marginRight: 8, ...shadow.glow,
  },
  logoLetters: { color: colors.onPrimaryContainer, fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  brandLabel: { color: colors.primaryFixedDim, fontSize: 14, fontWeight: '800', letterSpacing: 1 },
  spacer: { flex: 1 },
  signOutBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,75,75,0.1)', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,75,75,0.2)',
  },

  welcomeLabel: { fontSize: 13, color: colors.onSurfaceVariant, fontWeight: '600' },
  driverName: { fontSize: 28, fontWeight: '900', color: colors.onBackground, marginTop: 2 },

  badgeRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  codeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.primaryContainer, paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: radius.DEFAULT, flex: 1,
  },
  codeBadgeLabel: { fontSize: 9, fontWeight: '800', color: colors.onPrimaryContainer, letterSpacing: 0.8 },
  codeBadgeValue: { fontSize: 13, fontWeight: '900', color: colors.onPrimaryContainer, fontFamily: 'monospace', flex: 1, textAlign: 'right' },
  vehicleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.surfaceContainerHigh, paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: radius.DEFAULT, borderWidth: 1, borderColor: colors.outlineVariant, flex: 1,
  },
  vehicleBadgeLabel: { fontSize: 9, fontWeight: '800', color: colors.onSurfaceVariant, letterSpacing: 0.8 },
  vehicleBadgeValue: { fontSize: 13, fontWeight: '900', color: colors.tertiaryContainer, fontFamily: 'monospace', flex: 1, textAlign: 'right' },

  // Stats
  statsRow: {
    flexDirection: 'row', marginHorizontal: spacing.md, marginTop: -16,
    backgroundColor: colors.surfaceContainerHigh, borderRadius: radius.lg,
    padding: spacing.md, gap: spacing.sm, borderWidth: 1, borderColor: colors.outlineVariant,
  },
  statTile: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 24, fontWeight: '800', fontFamily: 'monospace' },
  statLabel: { fontSize: 9, color: colors.onSurfaceVariant, marginTop: 3, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },

  // CTA
  ctaCard: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: spacing.md, marginTop: spacing.lg,
    backgroundColor: colors.primaryContainer, borderRadius: radius.DEFAULT,
    padding: spacing.md, gap: spacing.md, ...shadow.glow,
  },
  ctaIconWrap: {
    width: 48, height: 48, borderRadius: radius.md,
    backgroundColor: 'rgba(0,0,0,0.15)', alignItems: 'center', justifyContent: 'center',
  },
  ctaTitle: { color: colors.onPrimaryContainer, fontSize: 17, fontWeight: '800' },
  ctaSub: { color: colors.onPrimaryContainer, fontSize: 12, marginTop: 2, opacity: 0.85 },

  // Section
  sectionHead: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginHorizontal: spacing.md, marginTop: spacing.lg, marginBottom: spacing.sm,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.onSurface },
  viewAll: { fontSize: 13, fontWeight: '600', color: colors.primaryFixedDim },

  // Quick Actions
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.md, gap: spacing.sm },
  actionTile: {
    width: '47%', backgroundColor: colors.surfaceContainer,
    borderRadius: radius.lg, padding: spacing.md,
    alignItems: 'center', borderWidth: 1, borderColor: colors.outlineVariant,
  },
  actionIconBg: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  actionLabel: { fontSize: 13, fontWeight: '700', color: colors.onSurface, textAlign: 'center' },

  // Trips
  emptyCard: {
    marginHorizontal: spacing.md, padding: spacing.xl,
    backgroundColor: colors.surfaceContainer, borderRadius: radius.lg,
    alignItems: 'center', borderWidth: 1, borderColor: colors.outlineVariant, gap: 8,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.onSurface },
  emptySub: { fontSize: 13, color: colors.onSurfaceVariant, textAlign: 'center', lineHeight: 20 },

  tripCard: {
    marginHorizontal: spacing.md, marginBottom: spacing.sm,
    backgroundColor: colors.surfaceContainer, borderRadius: radius.lg,
    padding: spacing.md, borderWidth: 1, borderColor: colors.outlineVariant,
  },
  tripCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  tripNum: { fontSize: 11, fontWeight: '700', color: colors.secondaryContainer, fontFamily: 'monospace', letterSpacing: 0.5 },
  tripVessel: { fontSize: 16, fontWeight: '700', color: colors.onSurface, marginTop: 2 },
  tripRoute: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm, gap: 8 },
  tripTerm: { fontSize: 14, fontWeight: '700', color: colors.onSurface, fontFamily: 'monospace' },
  routeLine: { flex: 1, alignItems: 'center' },
  tripMeta: { fontSize: 12, color: colors.onSurfaceVariant, marginTop: spacing.sm, fontFamily: 'monospace' },
});
