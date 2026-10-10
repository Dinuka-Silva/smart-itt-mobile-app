import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import API_BASE_URL from '../../../src/config/api';
import { useAuthStore } from '../../../src/store/authStore';
import { colors, radius, spacing } from '../../../src/theme';
import { useMockTripStore } from '../../../src/store/mockTripStore';

const TERMINALS = ['CWIT', 'JCT', 'ECT', 'UCT', 'SAGT', 'CICT'];

function showMessage(title: string, message: string) {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
}

export default function DriverJobQueue() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('ALL');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [dvirStatus, setDvirStatus] = useState('PASSED');
  const mockTrips = useMockTripStore((s) => s.mockTrips);

  const [unloadSelections, setUnloadSelections] = useState<Record<string, string>>({});
  const prevStatusRef = useRef<Record<string, string>>({});
  const notifiedRef = useRef<Set<string>>(new Set());

  const notifyStatusChanges = useCallback((nextTrips: any[]) => {
    const prev = prevStatusRef.current;
    nextTrips.forEach((trip) => {
      const id = trip.id as string;
      const nextStatus = trip.status as string;
      const prevStatus = prev[id];
      const tripNum = trip.tripNumber || `TRP-${id?.slice(0, 6)}`;
      const notifyKey = `${id}:${nextStatus}`;

      if (!prevStatus || notifiedRef.current.has(notifyKey)) return;

      if (prevStatus === 'PENDING_APPROVAL' && nextStatus === 'IN_PROGRESS') {
        notifiedRef.current.add(notifyKey);
        showMessage('Trip Confirmed', `Supervisor confirmed trip ${tripNum}.\nYou can proceed.`);
      }

      if (prevStatus === 'PENDING_APPROVAL' && nextStatus === 'REJECTED') {
        notifiedRef.current.add(notifyKey);
        showMessage('Trip Rejected', `Supervisor rejected trip ${tripNum}.`);
      }
    });

    const map: Record<string, string> = {};
    nextTrips.forEach((t) => {
      if (t.id && t.status) map[t.id] = t.status;
    });
    prevStatusRef.current = map;
  }, []);

  const fetchTrips = useCallback(async () => {
    const driverId = user?.driverId || user?.id || 'demo-driver';
    const demoTrips = useMockTripStore.getState().getTripsForDriver(driverId);
    try {
      const res = await axios.get(`${API_BASE_URL}/trips/driver/${user?.driverId}`);
      const apiTrips = Array.isArray(res.data) ? res.data : [];
      const byId = new Map<string, any>();
      apiTrips.forEach((t) => byId.set(t.id, t));
      demoTrips.forEach((t) => { if (!byId.has(t.id)) byId.set(t.id, t); });
      const merged = Array.from(byId.values());
      notifyStatusChanges(merged);
      setTrips(merged);
    } catch {
      notifyStatusChanges(demoTrips);
      setTrips(demoTrips);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, mockTrips, notifyStatusChanges]);

  useEffect(() => { fetchTrips(); }, [fetchTrips]);
  useFocusEffect(useCallback(() => { fetchTrips(); }, [fetchTrips]));

  const completeTrip = async (tripId: string) => {
    setUpdatingId(tripId);
    try {
      const trip = trips.find((t) => t.id === tripId);
      const containerUpdates = (trip?.containers || []).map((c: any) => ({
        containerId: c.id,
        unloadedTerminal: unloadSelections[c.id] || c.unloadedTerminal || trip?.destTerminal || 'ECT',
      }));

      await axios.patch(`${API_BASE_URL}/trips/${tripId}/complete`, { containerUpdates });
      useMockTripStore.getState().updateTripStatus(tripId, 'COMPLETED');
      showMessage('Trip Completed', 'Trip completed and containers marked unloaded.');
      fetchTrips();
    } catch {
      useMockTripStore.getState().updateTripStatus(tripId, 'COMPLETED');
      showMessage('Completed (Demo)', 'Trip completed successfully.');
      fetchTrips();
    } finally {
      setUpdatingId(null);
    }
  };

  const completedCount = trips.filter((t) => t.status === 'COMPLETED' || t.status === 'APPROVED').length;
  const inProgressCount = trips.filter((t) => t.status === 'IN_PROGRESS').length;
  const pendingCount = trips.filter((t) => t.status === 'PENDING_APPROVAL').length;
  const totalMoves = trips.length || 8;
  const remainingCount = Math.max(0, totalMoves - completedCount);

  const filteredTrips = trips.filter((t) => {
    if (filter === 'ALL') return true;
    if (filter === 'ACTIVE') return t.status === 'IN_PROGRESS';
    if (filter === 'PENDING') return t.status === 'PENDING_APPROVAL';
    if (filter === 'DONE') return t.status === 'COMPLETED' || t.status === 'APPROVED';
    return true;
  });

  return (
    <View style={styles.container}>
      {/* ─── Header ─── */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerSuper}>MISSION TELEMATICS</Text>
            <Text style={styles.headerTitle}>DRIVER JOB QUEUE</Text>
          </View>
          <TouchableOpacity
            style={styles.newTripBtn}
            onPress={() => router.push('/(driver)/trips/new')}
          >
            <Ionicons name="add" size={16} color="#00363d" />
            <Text style={styles.newTripBtnText}>DISPATCH</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollInside}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchTrips(); }}
            tintColor={colors.primaryContainer}
          />
        }
      >
        {/* ─── 1. DVIR Pre-Trip Inspection Badge ─── */}
        <View style={styles.dvirCard}>
          <View style={styles.dvirIconBox}>
            <Ionicons name="shield-checkmark" size={24} color={colors.tertiaryContainer} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.dvirStatusText}>DVIR: {dvirStatus}</Text>
              <Text style={styles.dvirTime}>06:12 AM</Text>
            </View>
            <Text style={styles.dvirSub}>TR-104 Certified Safe for Shift</Text>
          </View>
          <TouchableOpacity
            style={styles.dvirLogBtn}
            onPress={() => {
              Alert.alert('LOG DEFECT', 'Cab inspection log opened. Reporting mechanic notified.');
            }}
          >
            <Ionicons name="build" size={15} color={colors.primaryContainer} />
            <Text style={styles.dvirLogBtnText}>LOG DEFECT</Text>
          </TouchableOpacity>
        </View>

        {/* ─── 2. Shift Telematics Dashboard Card ─── */}
        <View style={styles.shiftCard}>
          <View style={styles.shiftTop}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="time" size={18} color={colors.secondaryContainer} />
              <Text style={styles.shiftTitle}>SHIFT 06:00 - 14:00</Text>
            </View>
            <View style={styles.onTimePill}>
              <Text style={styles.onTimePillText}>98% ON-TIME</Text>
            </View>
          </View>

          {/* Progress Metric Segments */}
          <View style={styles.metricGrid}>
            <View style={styles.metricTile}>
              <Text style={styles.metricLabel}>TOTAL MOVES</Text>
              <Text style={styles.metricNumber}>{String(totalMoves).padStart(2, '0')}</Text>
            </View>
            <View style={styles.metricTile}>
              <Text style={styles.metricLabel}>COMPLETED</Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                <Text style={styles.metricNumberGreen}>{String(completedCount).padStart(2, '0')}</Text>
                <Text style={{ color: colors.tertiaryContainer, fontSize: 12 }}>✔</Text>
              </View>
            </View>
            <View style={styles.metricTile}>
              <Text style={styles.metricLabel}>REMAINING</Text>
              <Text style={styles.metricNumberAmber}>{String(remainingCount).padStart(2, '0')}</Text>
            </View>
          </View>

          {/* Live Segmented Progress Bar */}
          <View style={styles.segmentBar}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((idx) => {
              const isDone = idx <= completedCount;
              const isCurrent = idx === completedCount + 1 && inProgressCount > 0;
              return (
                <View
                  key={idx}
                  style={[
                    styles.segmentPiece,
                    isDone && { backgroundColor: colors.tertiaryContainer },
                    isCurrent && { backgroundColor: colors.primaryContainer },
                  ]}
                />
              );
            })}
          </View>
        </View>

        {/* ─── 3. Tractor Cockpit Telemetry Strip ─── */}
        <View style={styles.telemCard}>
          <View style={styles.telemHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="flash" size={16} color={colors.primaryContainer} />
              <Text style={styles.telemTitle}>TRACTOR TR-104 TELEMETRY</Text>
            </View>
            <Text style={styles.telemNominal}>ALL SYSTEMS NOMINAL</Text>
          </View>

          <View style={styles.telemRow}>
            {/* Battery */}
            <View style={styles.telemBox}>
              <View style={styles.telemBoxHead}>
                <Text style={styles.telemBoxLabel}>BATTERY</Text>
                <Ionicons name="battery-charging" size={14} color={colors.tertiaryContainer} />
              </View>
              <Text style={styles.telemBoxValueCyan}>78%</Text>
              <Text style={styles.telemBoxSub}>4.2h REM</Text>
            </View>

            {/* Hydraulics */}
            <View style={styles.telemBox}>
              <View style={styles.telemBoxHead}>
                <Text style={styles.telemBoxLabel}>HYD PIN</Text>
                <Ionicons name="hardware-chip" size={14} color={colors.secondaryContainer} />
              </View>
              <Text style={styles.telemBoxValueWhite}>
                210 <Text style={styles.telemBoxUnit}>BAR</Text>
              </Text>
              <Text style={styles.telemBoxSubLime}>LOCKED</Text>
            </View>

            {/* Tires */}
            <View style={styles.telemBox}>
              <View style={styles.telemBoxHead}>
                <Text style={styles.telemBoxLabel}>TIRES</Text>
                <Ionicons name="car" size={14} color="#849396" />
              </View>
              <Text style={styles.telemBoxValueWhite}>
                110 <Text style={styles.telemBoxUnit}>PSI</Text>
              </Text>
              <Text style={styles.telemBoxSub}>4/4 OK</Text>
            </View>
          </View>
        </View>

        {/* ─── 4. Queue Filters Bar ─── */}
        <View style={styles.filterSection}>
          <View style={styles.filterHeader}>
            <Text style={styles.filterTitle}>ASSIGNED BACKLOG</Text>
            <Text style={styles.filterCountBadge}>{filteredTrips.length} DISPATCHED</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterPillsScroll}>
            {[
              { id: 'ALL', label: `ALL (${trips.length})` },
              { id: 'ACTIVE', label: `ACTIVE (${inProgressCount})` },
              { id: 'PENDING', label: `PENDING (${pendingCount})` },
              { id: 'DONE', label: `DONE (${completedCount})` },
            ].map((f) => {
              const active = filter === f.id;
              return (
                <TouchableOpacity
                  key={f.id}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                  onPress={() => setFilter(f.id)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ─── 5. Job Queue List ─── */}
        {loading ? (
          <ActivityIndicator size="large" color={colors.primaryContainer} style={{ marginTop: 24 }} />
        ) : filteredTrips.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="cube-outline" size={36} color="#3b494c" />
            <Text style={styles.emptyTitle}>NO JOBS IN QUEUE</Text>
            <Text style={styles.emptySub}>All movements completed or awaiting dispatch from tower.</Text>
          </View>
        ) : (
          filteredTrips.map((trip) => {
            const tripNum = trip.tripNumber || `TRP-${trip.id?.slice(0, 6)}`;
            const isProgress = trip.status === 'IN_PROGRESS';
            const isPending = trip.status === 'PENDING_APPROVAL';
            const isDone = trip.status === 'COMPLETED' || trip.status === 'APPROVED';

            return (
              <View key={trip.id} style={styles.jobCard}>
                <View style={[styles.jobBorderIndicator, isProgress && { backgroundColor: '#00e5ff' }, isPending && { backgroundColor: '#feb300' }, isDone && { backgroundColor: '#22ef7e' }]} />

                <View style={styles.jobCardContent}>
                  {/* Card Header */}
                  <View style={styles.jobHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.jobNumText}>{tripNum}</Text>
                      <View style={[styles.statusTag, isProgress && { backgroundColor: 'rgba(0, 229, 255, 0.15)' }, isPending && { backgroundColor: 'rgba(254, 179, 0, 0.15)' }, isDone && { backgroundColor: 'rgba(34, 239, 126, 0.15)' }]}>
                        <Text style={[styles.statusTagText, isProgress && { color: '#00e5ff' }, isPending && { color: '#feb300' }, isDone && { color: '#22ef7e' }]}>
                          {trip.status?.replace(/_/g, ' ')}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.jobTimeText}>{trip.createdAt?.slice(11, 16) || 'NOW'}</Text>
                  </View>

                  {/* Vessel & Route */}
                  <Text style={styles.vesselText}>{trip.vesselName || 'PORT LOGISTICS HAUL'}</Text>

                  <View style={styles.routeRow}>
                    <View style={styles.termBox}>
                      <Text style={styles.termLabel}>ORIGIN</Text>
                      <Text style={styles.termCode}>{trip.sourceTerminal || 'ECT'}</Text>
                    </View>
                    <View style={styles.routeArrow}>
                      <Ionicons name="arrow-forward" size={16} color={colors.primaryContainer} />
                      <Text style={styles.routeDist}>2.4 KM</Text>
                    </View>
                    <View style={styles.termBox}>
                      <Text style={styles.termLabel}>DESTINATION</Text>
                      <Text style={styles.termCode}>{trip.destTerminal || 'JCT'}</Text>
                    </View>
                  </View>

                  {/* Containers List */}
                  <View style={styles.containersBox}>
                    {(trip.containers || []).map((c: any, cIdx: number) => {
                      const sel = unloadSelections[c.id] || c.unloadedTerminal || trip.destTerminal;
                      return (
                        <View key={c.id || cIdx} style={styles.containerItem}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Ionicons name="cube" size={14} color={colors.primaryContainer} />
                              <Text style={styles.containerNumText}>{c.containerNumber || 'MSKU-88219-0'}</Text>
                            </View>
                            <Text style={styles.isoType}>{c.isoType || '40FT HC'}</Text>
                          </View>

                          {/* Unload Terminal Selector if in progress */}
                          {isProgress && (
                            <View style={styles.unloadRow}>
                              <Text style={styles.unloadLabel}>UNLOAD BAY:</Text>
                              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 4 }}>
                                {TERMINALS.map((term) => (
                                  <TouchableOpacity
                                    key={term}
                                    style={[styles.termChoice, sel === term && styles.termChoiceActive]}
                                    onPress={() => setUnloadSelections({ ...unloadSelections, [c.id]: term })}
                                  >
                                    <Text style={[styles.termChoiceText, sel === term && styles.termChoiceTextActive]}>
                                      {term}
                                    </Text>
                                  </TouchableOpacity>
                                ))}
                              </ScrollView>
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>

                  {/* Actions */}
                  {isProgress && (
                    <TouchableOpacity
                      style={styles.completeBtn}
                      onPress={() => completeTrip(trip.id)}
                      disabled={updatingId === trip.id}
                    >
                      {updatingId === trip.id ? (
                        <ActivityIndicator size="small" color="#00363d" />
                      ) : (
                        <>
                          <Ionicons name="checkmark-done" size={20} color="#00363d" />
                          <Text style={styles.completeBtnText}>CONFIRM UNLOAD & COMPLETE TRIP</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
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
  newTripBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#00e5ff',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.DEFAULT,
  },
  newTripBtnText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#00363d',
    letterSpacing: 0.8,
  },
  scrollContent: {
    flex: 1,
  },
  scrollInside: {
    padding: spacing.margin,
    gap: 12,
  },

  // DVIR Card
  dvirCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161c25',
    padding: 12,
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: '#242a34',
    gap: 12,
  },
  dvirIconBox: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    backgroundColor: '#080e17',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dvirStatusText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#22ef7e',
    fontFamily: 'monospace',
    letterSpacing: 0.6,
  },
  dvirTime: {
    fontSize: 10,
    color: '#849396',
    fontFamily: 'monospace',
  },
  dvirSub: {
    fontSize: 11,
    color: '#dde2f0',
    marginTop: 1,
  },
  dvirLogBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#1a2029',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#3b494c',
  },
  dvirLogBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#00e5ff',
    letterSpacing: 0.6,
  },

  // Shift Card
  shiftCard: {
    backgroundColor: '#161c25',
    padding: 14,
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: '#242a34',
    gap: 10,
  },
  shiftTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  shiftTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#dde2f0',
    letterSpacing: 0.8,
  },
  onTimePill: {
    backgroundColor: '#080e17',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  onTimePillText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#22ef7e',
    fontFamily: 'monospace',
  },
  metricGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  metricTile: {
    flex: 1,
    backgroundColor: '#080e17',
    padding: 10,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#1a2029',
  },
  metricLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: '#849396',
    letterSpacing: 0.5,
  },
  metricNumber: {
    fontSize: 20,
    fontWeight: '900',
    color: '#dde2f0',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  metricNumberGreen: {
    fontSize: 20,
    fontWeight: '900',
    color: '#22ef7e',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  metricNumberAmber: {
    fontSize: 20,
    fontWeight: '900',
    color: '#feb300',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  segmentBar: {
    flexDirection: 'row',
    height: 7,
    backgroundColor: '#080e17',
    borderRadius: 4,
    gap: 3,
    padding: 2,
  },
  segmentPiece: {
    flex: 1,
    height: '100%',
    backgroundColor: '#242a34',
    borderRadius: 2,
  },

  // Telemetry Card
  telemCard: {
    backgroundColor: '#161c25',
    padding: 14,
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: '#242a34',
    gap: 10,
  },
  telemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  telemTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#849396',
    letterSpacing: 0.8,
  },
  telemNominal: {
    fontSize: 9,
    fontWeight: '800',
    color: '#22ef7e',
    fontFamily: 'monospace',
  },
  telemRow: {
    flexDirection: 'row',
    gap: 8,
  },
  telemBox: {
    flex: 1,
    backgroundColor: '#080e17',
    padding: 8,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#1a2029',
  },
  telemBoxHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  telemBoxLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: '#849396',
  },
  telemBoxValueCyan: {
    fontSize: 16,
    fontWeight: '900',
    color: '#00e5ff',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  telemBoxValueWhite: {
    fontSize: 16,
    fontWeight: '900',
    color: '#dde2f0',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  telemBoxUnit: {
    fontSize: 9,
    color: '#849396',
    fontWeight: '600',
  },
  telemBoxSub: {
    fontSize: 8,
    color: '#849396',
    marginTop: 1,
  },
  telemBoxSubLime: {
    fontSize: 8,
    fontWeight: '800',
    color: '#22ef7e',
    marginTop: 1,
  },

  // Filters Bar
  filterSection: {
    gap: 8,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  filterTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#dde2f0',
    letterSpacing: 0.8,
  },
  filterCountBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#00e5ff',
    fontFamily: 'monospace',
  },
  filterPillsScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.DEFAULT,
    backgroundColor: '#161c25',
    borderWidth: 1,
    borderColor: '#242a34',
  },
  filterChipActive: {
    backgroundColor: '#00e5ff',
    borderColor: '#00e5ff',
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#bac9cc',
    letterSpacing: 0.5,
  },
  filterChipTextActive: {
    color: '#00363d',
  },

  // Job Cards
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 36,
    backgroundColor: '#161c25',
    borderRadius: radius.DEFAULT,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#dde2f0',
    letterSpacing: 0.8,
  },
  emptySub: {
    fontSize: 11,
    color: '#849396',
    textAlign: 'center',
  },
  jobCard: {
    backgroundColor: '#161c25',
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: '#242a34',
    position: 'relative',
    overflow: 'hidden',
  },
  jobBorderIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: '#3b494c',
  },
  jobCardContent: {
    padding: 14,
    paddingLeft: 16,
    gap: 10,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  jobNumText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#00e5ff',
    fontFamily: 'monospace',
    letterSpacing: 0.5,
  },
  statusTag: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  statusTagText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  jobTimeText: {
    fontSize: 10,
    color: '#849396',
    fontFamily: 'monospace',
  },
  vesselText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#dde2f0',
    letterSpacing: 0.5,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#080e17',
    padding: 10,
    borderRadius: radius.sm,
  },
  termBox: {
    alignItems: 'center',
  },
  termLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: '#849396',
    letterSpacing: 0.5,
  },
  termCode: {
    fontSize: 14,
    fontWeight: '900',
    color: '#dde2f0',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  routeArrow: {
    alignItems: 'center',
    gap: 2,
  },
  routeDist: {
    fontSize: 8,
    fontWeight: '700',
    color: '#00e5ff',
    fontFamily: 'monospace',
  },
  containersBox: {
    gap: 8,
  },
  containerItem: {
    backgroundColor: '#080e17',
    padding: 10,
    borderRadius: radius.sm,
    gap: 8,
  },
  containerNumText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#dde2f0',
    fontFamily: 'monospace',
  },
  isoType: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffd799',
    fontFamily: 'monospace',
  },
  unloadRow: {
    gap: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#161c25',
  },
  unloadLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: '#849396',
    letterSpacing: 0.5,
  },
  termChoice: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
    backgroundColor: '#161c25',
    borderWidth: 1,
    borderColor: '#242a34',
  },
  termChoiceActive: {
    backgroundColor: '#00e5ff',
    borderColor: '#00e5ff',
  },
  termChoiceText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#bac9cc',
    fontFamily: 'monospace',
  },
  termChoiceTextActive: {
    color: '#00363d',
  },
  completeBtn: {
    height: 48,
    backgroundColor: '#00e5ff',
    borderRadius: radius.DEFAULT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  completeBtnText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#00363d',
    letterSpacing: 0.8,
  },
});
