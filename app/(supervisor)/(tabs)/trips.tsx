import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import axios from 'axios';
import API_BASE_URL from '../../../src/config/api';

export default function SupervisorTrips() {
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');

  const fetchTrips = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/trips`);
      setTrips(Array.isArray(res.data) ? res.data : []);
    } catch {
      setTrips([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchTrips(); }, [fetchTrips]);

  const onRefresh = () => { setRefreshing(true); fetchTrips(); };

  const filterMap: Record<string, string[]> = {
    'All': [],
    'In Progress': ['IN_PROGRESS'],
    'Completed': ['COMPLETED'],
    'Pending': ['PENDING_APPROVAL'],
    'Approved': ['APPROVED'],
    'Rejected': ['REJECTED'],
  };

  const filtered = trips.filter((t) => {
    const statuses = filterMap[filter];
    const matchesFilter = statuses.length === 0 || statuses.includes(t.status);
    const q = search.toLowerCase();
    const matchesSearch = !q ||
      (t.driver?.user?.name || t.driver?.name || '').toLowerCase().includes(q) ||
      (t.vesselName || '').toLowerCase().includes(q) ||
      (t.vehicleNumber || '').toLowerCase().includes(q) ||
      (t.tripNumber || '').toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });

  const formatDuration = (start?: string, end?: string) => {
    if (!start) return '--';
    const endDate = end ? new Date(end) : new Date();
    const diff = Math.floor((endDate.getTime() - new Date(start).getTime()) / 60000);
    if (diff < 0) return '--';
    return `${Math.floor(diff / 60)}h ${diff % 60}m`;
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Trip Monitoring</Text>
        <Text style={styles.headerSub}>
          {loading ? 'Loading...' : `${trips.length} total trips`}
        </Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by driver, vessel, trip number..."
          placeholderTextColor="#8E99A4"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
        {Object.keys(filterMap).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.chip, filter === f && styles.chipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.chipText, filter === f && styles.chipTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator size="large" color="#1E88E5" style={{ marginTop: 40 }} />
      ) : filtered.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>No trips found for this filter</Text>
        </View>
      ) : (
        filtered.map((trip) => {
          const driverName = trip.driver?.user?.name || trip.driver?.name || 'Unknown';
          const vehicle = trip.vehicleNumber || 'N/A';
          const tripNum = trip.tripNumber || `TRP-${trip.id?.slice(0, 6)}`;

          return (
            <View key={trip.id} style={styles.card}>
              <View style={styles.cardTopRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.tripNumText}>{tripNum}</Text>
                  <Text style={styles.driverName}>{driverName}</Text>
                  <Text style={styles.vehicleText}>🚛 {vehicle}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: getStatusColor(trip.status) + '20' }]}>
                  <Text style={[styles.badgeText, { color: getStatusColor(trip.status) }]}>
                    {(trip.status || '').replace(/_/g, ' ')}
                  </Text>
                </View>
              </View>

              <Text style={styles.vesselText}>🚢 {trip.vesselName || 'Vessel'}</Text>

              <View style={styles.routeRow}>
                <View style={styles.termBox}>
                  <Text style={styles.termLabel}>From</Text>
                  <Text style={styles.termValue}>{trip.sourceTerminal || 'ECT'}</Text>
                </View>
                <Text style={styles.arrow}>→</Text>
                <View style={styles.termBox}>
                  <Text style={styles.termLabel}>To</Text>
                  <Text style={styles.termValue}>{trip.destTerminal || 'JCT'}</Text>
                </View>
              </View>

              <View style={styles.metaRow}>
                <Text style={styles.metaText}>📦 {(trip.containers || []).length} Container(s)</Text>
                <Text style={styles.metaText}>⏱ {formatDuration(trip.startTime, trip.endTime)}</Text>
              </View>

              {/* Container list */}
              {(trip.containers || []).length > 0 && (
                <View style={styles.containerList}>
                  {trip.containers.map((c: any) => (
                    <View key={c.id} style={styles.containerRow}>
                      <Text style={styles.containerNum}>📦 {c.containerNumber}</Text>
                      <Text style={styles.containerSize}>{c.size || 'FT_40'}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'COMPLETED': case 'APPROVED': return '#43A047';
    case 'IN_PROGRESS': return '#1E88E5';
    case 'PENDING_APPROVAL': return '#FB8C00';
    case 'REJECTED': return '#E53935';
    default: return '#8E99A4';
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  header: {
    backgroundColor: '#0A1628', padding: 24, paddingTop: 54, paddingBottom: 24,
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
  },
  headerTitle: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  headerSub: { color: '#8E99A4', fontSize: 13, marginTop: 4 },
  searchContainer: { paddingHorizontal: 16, marginTop: 16 },
  searchInput: {
    backgroundColor: '#fff', borderRadius: 12,
    paddingHorizontal: 16, height: 48, fontSize: 14,
    borderWidth: 1, borderColor: '#E8ECF0', color: '#0A1628',
  },
  filterRow: { paddingHorizontal: 16, paddingVertical: 12 },
  chip: {
    backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: '#E8ECF0',
  },
  chipActive: { backgroundColor: '#1E88E5', borderColor: '#1E88E5' },
  chipText: { fontSize: 12, color: '#8E99A4', fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  emptyBox: { alignItems: 'center', marginTop: 40, padding: 20 },
  emptyText: { fontSize: 15, color: '#718096' },
  card: {
    backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 14,
    padding: 16, marginBottom: 12, elevation: 2, borderWidth: 1, borderColor: '#E2E8F0',
  },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  tripNumText: { fontSize: 11, fontWeight: '800', color: '#1E88E5', textTransform: 'uppercase' },
  driverName: { fontSize: 16, fontWeight: '700', color: '#0A1628', marginTop: 2 },
  vehicleText: { fontSize: 12, color: '#8E99A4', marginTop: 2 },
  vesselText: { fontSize: 13, color: '#5A6570', marginTop: 10 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' },
  badgeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  routeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 8 },
  termBox: { backgroundColor: '#F5F7FA', borderRadius: 10, padding: 10, flex: 1 },
  termLabel: { fontSize: 10, color: '#8E99A4' },
  termValue: { fontSize: 15, fontWeight: '700', color: '#0A1628', marginTop: 2 },
  arrow: { fontSize: 18, color: '#8E99A4' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  metaText: { fontSize: 12, color: '#8E99A4' },
  containerList: {
    backgroundColor: '#F8FAFC', borderRadius: 8, padding: 10,
    marginTop: 10, borderWidth: 1, borderColor: '#EDF2F7',
  },
  containerRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  containerNum: { fontSize: 13, fontWeight: '600', color: '#2D3748' },
  containerSize: { fontSize: 12, color: '#718096', fontWeight: '600' },
});
