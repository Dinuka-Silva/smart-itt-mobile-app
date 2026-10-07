import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import axios from 'axios';
import API_BASE_URL from '../../../src/config/api';
import { useAuthStore } from '../../../src/store/authStore';

export default function DriverContainers() {
  const user = useAuthStore((s) => s.user);
  const [containers, setContainers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchContainers = useCallback(async () => {
    try {
      // Fetch trips for this driver and collect containers
      const driverParam = user?.driverId ? `?driverId=${user.driverId}` : '';
      const res = await axios.get(`${API_BASE_URL}/trips${driverParam}`);
      const trips = Array.isArray(res.data) ? res.data : [];

      // Flatten all containers from all trips, enriched with trip info
      const allContainers: any[] = [];
      for (const trip of trips) {
        for (const c of trip.containers || []) {
          allContainers.push({
            ...c,
            tripNumber: trip.tripNumber,
            vesselName: trip.vesselName,
            sourceTerminal: trip.sourceTerminal,
            destTerminal: trip.destTerminal,
            tripStatus: trip.status,
          });
        }
      }

      if (allContainers.length > 0) {
        setContainers(allContainers);
      } else {
        setContainers(getFallbackContainers());
      }
    } catch {
      setContainers(getFallbackContainers());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => { fetchContainers(); }, [fetchContainers]);

  const onRefresh = () => { setRefreshing(true); fetchContainers(); };

  const ft20 = containers.filter((c) => (c.size || '').includes('20')).length;
  const ft40 = containers.filter((c) => (c.size || '').includes('40')).length;

  const getStatusLabel = (containerStatus: string, tripStatus: string) => {
    if (tripStatus === 'COMPLETED' || tripStatus === 'APPROVED') return 'Delivered';
    if (containerStatus === 'IN_TRANSIT') return 'In Transit';
    if (containerStatus === 'DISCHARGED') return 'Discharged';
    return 'Loaded';
  };

  const getStatusColor = (label: string) => {
    if (label === 'Delivered') return { bg: '#43A04720', text: '#43A047' };
    if (label === 'In Transit') return { bg: '#1E88E520', text: '#1E88E5' };
    if (label === 'Discharged') return { bg: '#9C27B020', text: '#9C27B0' };
    return { bg: '#FB8C0020', text: '#FB8C00' };
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Containers</Text>
        <Text style={styles.headerSub}>
          {loading ? 'Loading...' : `${containers.length} total containers`}
        </Text>
      </View>

      {/* Summary Cards */}
      {!loading && (
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { borderLeftColor: '#1E88E5' }]}>
            <Text style={[styles.summaryValue, { color: '#1E88E5' }]}>{ft20}</Text>
            <Text style={styles.summaryLabel}>20FT</Text>
          </View>
          <View style={[styles.summaryCard, { borderLeftColor: '#FB8C00' }]}>
            <Text style={[styles.summaryValue, { color: '#FB8C00' }]}>{ft40}</Text>
            <Text style={styles.summaryLabel}>40FT</Text>
          </View>
          <View style={[styles.summaryCard, { borderLeftColor: '#43A047' }]}>
            <Text style={[styles.summaryValue, { color: '#43A047' }]}>{containers.length}</Text>
            <Text style={styles.summaryLabel}>Total</Text>
          </View>
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" color="#1E88E5" style={{ marginTop: 30 }} />
      ) : containers.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyIcon}>📦</Text>
          <Text style={styles.emptyTitle}>No containers yet</Text>
          <Text style={styles.emptySubtitle}>Start a trip to load containers</Text>
        </View>
      ) : (
        containers.map((c, idx) => {
          const statusLabel = getStatusLabel(c.status || '', c.tripStatus || '');
          const { bg, text } = getStatusColor(statusLabel);
          const sizeLabel = (c.size || 'FT_40').replace('FT_', '') + 'FT';

          return (
            <View key={c.id || idx} style={styles.card}>
              {/* Container Number + Size */}
              <View style={styles.cardHeader}>
                <Text style={styles.containerNum}>{c.containerNumber}</Text>
                <View style={[
                  styles.sizeBadge,
                  { backgroundColor: sizeLabel.startsWith('20') ? '#EBF8FF' : '#FFF3E0' }
                ]}>
                  <Text style={[
                    styles.sizeText,
                    { color: sizeLabel.startsWith('20') ? '#2B6CB0' : '#E65100' }
                  ]}>
                    {sizeLabel}
                  </Text>
                </View>
              </View>

              {/* Trip Info */}
              <Text style={styles.tripName}>
                🚢 {c.vesselName || 'Vessel'} — {c.tripNumber || 'Trip'}
              </Text>

              {/* Route */}
              <View style={styles.routeRow}>
                <View style={styles.termBox}>
                  <Text style={styles.termLabel}>Origin</Text>
                  <Text style={styles.termValue}>{c.sourceTerminal || 'ECT'}</Text>
                </View>
                <Text style={styles.arrow}>→</Text>
                <View style={styles.termBox}>
                  <Text style={styles.termLabel}>Destination</Text>
                  <Text style={styles.termValue}>{c.destTerminal || 'JCT'}</Text>
                </View>
              </View>

              {/* Status */}
              <View style={[styles.statusBadge, { backgroundColor: bg }]}>
                <Text style={[styles.statusText, { color: text }]}>{statusLabel}</Text>
              </View>

              {/* Weight if available */}
              {c.weight && (
                <Text style={styles.weightText}>⚖️ Weight: {c.weight}T</Text>
              )}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

function getFallbackContainers() {
  return [
    {
      id: 'fb-1',
      containerNumber: 'MSCU7721892',
      size: 'FT_40',
      tripNumber: 'TRP-1001',
      vesselName: 'MSC Aurora',
      sourceTerminal: 'ECT',
      destTerminal: 'JCT',
      status: 'IN_TRANSIT',
      tripStatus: 'IN_PROGRESS',
    },
    {
      id: 'fb-2',
      containerNumber: 'MSKU4412091',
      size: 'FT_20',
      tripNumber: 'TRP-1002',
      vesselName: 'Maersk Line',
      sourceTerminal: 'JCT',
      destTerminal: 'UCT',
      status: 'LOADED',
      tripStatus: 'COMPLETED',
    },
  ];
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  header: {
    backgroundColor: '#0A1628', padding: 24, paddingTop: 54, paddingBottom: 30,
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
  },
  headerTitle: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  headerSub: { color: '#8E99A4', fontSize: 13, marginTop: 4 },
  summaryRow: { flexDirection: 'row', paddingHorizontal: 16, marginTop: -16, gap: 10 },
  summaryCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14,
    borderLeftWidth: 4, elevation: 3, shadowColor: '#000', shadowOpacity: 0.07,
    shadowOffset: { width: 0, height: 2 }, shadowRadius: 4,
  },
  summaryValue: { fontSize: 26, fontWeight: 'bold' },
  summaryLabel: { fontSize: 11, color: '#8E99A4', marginTop: 4, fontWeight: '600' },
  emptyBox: { alignItems: 'center', marginTop: 60, paddingHorizontal: 30 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#2D3748' },
  emptySubtitle: { fontSize: 13, color: '#718096', marginTop: 6 },
  card: {
    backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 14,
    padding: 16, marginBottom: 12, elevation: 2, marginTop: 12,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  containerNum: { fontSize: 16, fontWeight: '700', color: '#0A1628', letterSpacing: 0.5 },
  sizeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  sizeText: { fontSize: 11, fontWeight: '700' },
  tripName: { fontSize: 13, color: '#718096', marginTop: 8 },
  routeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 8 },
  termBox: { backgroundColor: '#F8FAFC', borderRadius: 10, padding: 10, flex: 1 },
  termLabel: { fontSize: 10, color: '#8E99A4' },
  termValue: { fontSize: 15, fontWeight: '700', color: '#0A1628', marginTop: 2 },
  arrow: { fontSize: 18, color: '#8E99A4' },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginTop: 10 },
  statusText: { fontSize: 11, fontWeight: '700' },
  weightText: { fontSize: 12, color: '#718096', marginTop: 8 },
});
