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
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import API_BASE_URL from '../../../src/config/api';
import { colors, radius, spacing } from '../../../src/theme';
import { useAuthStore } from '../../../src/store/authStore';

export default function SupervisorMissionDispatcher() {
  const user = useAuthStore((s) => s.user);

  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [assignedMoves, setAssignedMoves] = useState<Record<string, boolean>>({});

  const fetchTrips = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/trips`);
      const data = Array.isArray(res.data) ? res.data : [];
      setTrips(data);
    } catch {
      // Demo fallback trips for rich UI
      setTrips([
        {
          id: 'demo-1',
          tripNumber: '#MSN-8840',
          vesselName: 'Vessel Maersk Halifax',
          sourceTerminal: 'QC-04 [Slot 42-08-A]',
          destTerminal: 'Block D-4',
          vehicleNumber: 'TR-107 (140m)',
          status: 'PENDING_APPROVAL',
          createdAt: new Date().toISOString(),
          containers: [{ containerNumber: 'MSKU-88401-2', isoType: '40ft High Cube', weight: '28.4 MT' }],
        },
        {
          id: 'demo-2',
          tripNumber: '#MSN-8819',
          vesselName: 'MSC Mediterranean',
          sourceTerminal: 'Quay Berth 02',
          destTerminal: 'Yard Bay 14',
          vehicleNumber: 'TR-108 (Ken R.)',
          status: 'IN_PROGRESS',
          createdAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
          containers: [{ containerNumber: 'MSCU-90214-4', isoType: '40ft HC Reefer', weight: '24.1 MT' }],
        },
      ]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchTrips(); }, [fetchTrips]);

  const onRefresh = () => { setRefreshing(true); fetchTrips(); };

  const autoAssign = (tripId: string) => {
    setAssignedMoves({ ...assignedMoves, [tripId]: true });
    Alert.alert('AUTO-DISPATCH CONFIRMED', 'Nearest tractor TR-107 dispatched to Quay Crane QC-04. Route instructions transmitted.');
  };

  const filtered = trips.filter((t) => {
    if (filter === 'ACTIVE') return t.status === 'IN_PROGRESS';
    if (filter === 'PENDING') return t.status === 'PENDING_APPROVAL';
    if (filter === 'DONE') return t.status === 'COMPLETED' || t.status === 'APPROVED';
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      (t.vesselName || '').toLowerCase().includes(q) ||
      (t.tripNumber || '').toLowerCase().includes(q) ||
      (t.vehicleNumber || '').toLowerCase().includes(q)
    );
  });

  return (
    <View style={styles.container}>
      {/* ─── Header ─── */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerSuper}>MISSION TELEMATICS DISPATCH</Text>
            <Text style={styles.headerTitle}>MISSION DISPATCHER</Text>
          </View>
          <View style={styles.onlinePill}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineText}>DISPATCH ACTIVE</Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchRow}>
          <Ionicons name="search" size={16} color="#849396" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search Mission #, Vessel, Tractor..."
            placeholderTextColor="#849396"
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color="#849396" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Filter Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {[
            { id: 'ALL', label: `ALL MOVES (${trips.length})` },
            { id: 'PENDING', label: 'UNASSIGNED (2)' },
            { id: 'ACTIVE', label: 'HAULING (1)' },
            { id: 'DONE', label: 'COMPLETED' },
          ].map((f) => {
            const active = filter === f.id;
            return (
              <TouchableOpacity
                key={f.id}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setFilter(f.id)}
              >
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollInside}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.secondaryContainer}
          />
        }
      >
        {/* Stream Header */}
        <View style={styles.streamHeaderRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={styles.amberPulseDot} />
            <Text style={styles.streamTitle}>LIVE MISSION ALLOCATION STREAM</Text>
          </View>
          <View style={styles.priorityPill}>
            <Text style={styles.priorityPillText}>2 PRIORITY MOVES</Text>
          </View>
        </View>

        {/* Move 1: Priority Unassigned */}
        <View style={styles.missionCardUnassigned}>
          <View style={styles.leftBarAmber} />
          <View style={styles.cardInner}>
            <View style={styles.cardHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.cardMissionNum}>#MSN-8840</Text>
                <View style={styles.waitBadge}>
                  <Ionicons name="hourglass" size={11} color="#feb300" />
                  <Text style={styles.waitText}>4m WAIT</Text>
                </View>
              </View>
              <View style={styles.unassignedBadge}>
                <Text style={styles.unassignedText}>
                  {assignedMoves['demo-1'] ? 'DISPATCHED' : 'UNASSIGNED'}
                </Text>
              </View>
            </View>

            <View style={styles.routeHeaderRow}>
              <Text style={styles.vesselTitle}>Vessel Maersk Halifax</Text>
              <Ionicons name="arrow-forward" size={16} color="#00e5ff" />
              <Text style={styles.destTitle}>Block D-4</Text>
            </View>

            <View style={styles.specLocationRow}>
              <Ionicons name="location" size={14} color="#00e5ff" />
              <Text style={styles.specLocationText}>
                Quay Crane QC-04 [Slot 42-08-A] • 40ft High Cube • 28.4 MT
              </Text>
            </View>

            <View style={styles.proximityRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="navigate" size={14} color="#849396" />
                <Text style={styles.proximityText}>
                  Nearest TR: <Text style={{ color: '#dde2f0', fontWeight: '900' }}>TR-107 (140m)</Text>
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.autoAssignBtn, assignedMoves['demo-1'] && { backgroundColor: '#22ef7e' }]}
                onPress={() => autoAssign('demo-1')}
              >
                <Ionicons name="flash" size={14} color="#00363d" />
                <Text style={styles.autoAssignBtnText}>
                  {assignedMoves['demo-1'] ? 'ASSIGNED TR-107' : 'AUTO-ASSIGN NEAREST'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Move 2: Delayed / Bottleneck Card */}
        <View style={styles.missionCardDelayed}>
          <View style={styles.leftBarRed} />
          <View style={styles.cardInner}>
            <View style={styles.cardHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.cardMissionNum}>#MSN-8819</Text>
                <View style={styles.delayBadge}>
                  <Ionicons name="warning" size={11} color="#ff5252" />
                  <Text style={styles.delayText}>+8m DELAY</Text>
                </View>
              </View>
              <View style={styles.chassisBadge}>
                <Text style={styles.chassisText}>CHASSIS #CH-42</Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <Text style={styles.driverLabel}>Driver:</Text>
              <Text style={styles.driverName}>Ken R. (TR-108)</Text>
            </View>

            <View style={styles.routeHeaderRow}>
              <Text style={styles.vesselTitle}>MSC Mediterranean</Text>
              <Ionicons name="arrow-forward" size={16} color="#00e5ff" />
              <Text style={styles.destTitle}>Yard Bay 14</Text>
            </View>

            <View style={styles.specLocationRow}>
              <Ionicons name="alert-circle" size={14} color="#ff5252" />
              <Text style={styles.specLocationText}>
                Delayed at Berth 02 Hoist guide. Crane operator reassigned.
              </Text>
            </View>

            <View style={styles.expediteRow}>
              <TouchableOpacity
                style={styles.expediteBtn}
                onPress={() => Alert.alert('EXPEDITE SENT', 'Priority green-light sequence activated for TR-108.')}
              >
                <Ionicons name="speedometer" size={14} color="#ffd799" />
                <Text style={styles.expediteBtnText}>EXPEDITE ROUTE</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.reassignBtn}
                onPress={() => Alert.alert('REASSIGN DIALOG', 'Alternative available tractors: TR-104 (320m), TR-112 (500m).')}
              >
                <Text style={styles.reassignBtnText}>REASSIGN</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Real System Trips */}
        {loading ? (
          <ActivityIndicator size="large" color={colors.secondaryContainer} style={{ marginTop: 20 }} />
        ) : (
          filtered.map((trip) => {
            if (trip.tripNumber === '#MSN-8840' || trip.tripNumber === '#MSN-8819') return null;
            const tripNum = trip.tripNumber || `TRP-${trip.id?.slice(0, 6)}`;
            return (
              <View key={trip.id} style={styles.regularTripCard}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardMissionNum}>{tripNum}</Text>
                  <View style={styles.statusPill}>
                    <Text style={styles.statusPillText}>{trip.status?.replace(/_/g, ' ')}</Text>
                  </View>
                </View>
                <Text style={styles.vesselTitle}>{trip.vesselName || 'PORT CONTAINER RUN'}</Text>
                <View style={styles.routeHeaderRow}>
                  <Text style={styles.termText}>{trip.sourceTerminal || 'ECT'}</Text>
                  <Ionicons name="arrow-forward" size={14} color="#00e5ff" />
                  <Text style={styles.termText}>{trip.destTerminal || 'JCT'}</Text>
                </View>
              </View>
            );
          })
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0e141d',
  },
  header: {
    paddingTop: 48,
    paddingHorizontal: spacing.margin,
    paddingBottom: 12,
    backgroundColor: 'rgba(14, 20, 29, 0.96)',
    borderBottomWidth: 1,
    borderBottomColor: '#1a2029',
    gap: 10,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerSuper: {
    fontSize: 9,
    fontWeight: '800',
    color: '#849396',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#dde2f0',
    letterSpacing: 0.8,
  },
  onlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#080e17',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#242a34',
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22ef7e',
  },
  onlineText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#22ef7e',
    fontFamily: 'monospace',
    letterSpacing: 0.6,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161c25',
    paddingHorizontal: 10,
    height: 40,
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: '#242a34',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: '#dde2f0',
    fontWeight: '600',
  },
  filterScroll: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.DEFAULT,
    backgroundColor: '#161c25',
    borderWidth: 1,
    borderColor: '#242a34',
  },
  filterChipActive: {
    backgroundColor: '#feb300',
    borderColor: '#feb300',
  },
  filterChipText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#bac9cc',
    letterSpacing: 0.6,
  },
  filterChipTextActive: {
    color: '#432c00',
  },

  scrollContent: {
    flex: 1,
  },
  scrollInside: {
    padding: spacing.margin,
    gap: 12,
  },

  streamHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amberPulseDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#feb300',
  },
  streamTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#dde2f0',
    letterSpacing: 0.8,
  },
  priorityPill: {
    backgroundColor: '#161c25',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  priorityPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#ffd799',
    fontFamily: 'monospace',
  },

  // Move 1 Unassigned
  missionCardUnassigned: {
    backgroundColor: '#161c25',
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: '#242a34',
    position: 'relative',
    overflow: 'hidden',
  },
  leftBarAmber: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: '#feb300',
  },
  cardInner: {
    padding: 14,
    paddingLeft: 16,
    gap: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardMissionNum: {
    fontSize: 13,
    fontWeight: '900',
    color: '#00e5ff',
    fontFamily: 'monospace',
  },
  waitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#080e17',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  waitText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#feb300',
    fontFamily: 'monospace',
  },
  unassignedBadge: {
    backgroundColor: '#93000a',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  unassignedText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#ffdad6',
    letterSpacing: 0.8,
  },
  routeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  vesselTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#dde2f0',
  },
  destTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#00e5ff',
  },
  specLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  specLocationText: {
    fontSize: 10,
    color: '#bac9cc',
    fontFamily: 'monospace',
  },
  proximityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#080e17',
  },
  proximityText: {
    fontSize: 10,
    color: '#849396',
    fontFamily: 'monospace',
  },
  autoAssignBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#00e5ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.DEFAULT,
  },
  autoAssignBtnText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#00363d',
    letterSpacing: 0.6,
  },

  // Move 2 Delayed
  missionCardDelayed: {
    backgroundColor: '#161c25',
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: '#242a34',
    position: 'relative',
    overflow: 'hidden',
  },
  leftBarRed: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: '#ff5252',
  },
  delayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#080e17',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  delayText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#ff5252',
    fontFamily: 'monospace',
  },
  chassisBadge: {
    backgroundColor: '#1a2029',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  chassisText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#849396',
    fontFamily: 'monospace',
  },
  driverLabel: {
    fontSize: 10,
    color: '#849396',
  },
  driverName: {
    fontSize: 11,
    fontWeight: '800',
    color: '#00e5ff',
    fontFamily: 'monospace',
  },
  expediteRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#080e17',
  },
  expediteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#1a2029',
    paddingVertical: 8,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#feb300',
  },
  expediteBtnText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#ffd799',
    letterSpacing: 0.6,
  },
  reassignBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a2029',
    paddingVertical: 8,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#3b494c',
  },
  reassignBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#849396',
    letterSpacing: 0.6,
  },

  // Regular Trips
  regularTripCard: {
    backgroundColor: '#161c25',
    padding: 12,
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: '#242a34',
    gap: 6,
  },
  statusPill: {
    backgroundColor: '#080e17',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  statusPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#bac9cc',
    fontFamily: 'monospace',
  },
  termText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#dde2f0',
    fontFamily: 'monospace',
  },
});
