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
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import API_BASE_URL from '../../../src/config/api';
import { useAuthStore } from '../../../src/store/authStore';
import { StatusPill } from '../../../src/components/StatusPill';
import { colors, radius, spacing, shadow, statusColor } from '../../../src/theme';

const TERMINALS = ['CWIT', 'JCT', 'ECT', 'UCT', 'SAGT', 'CICT'];

function showMessage(title: string, message: string) {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
}

export default function DriverTrips() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('All');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  
  // State to hold the selected unload terminal for each container while in progress
  // Key: containerId, Value: terminal string
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

      if (!prevStatus || notifiedRef.current.has(notifyKey)) {
        return;
      }

      if (prevStatus === 'PENDING_APPROVAL' && nextStatus === 'IN_PROGRESS') {
        notifiedRef.current.add(notifyKey);
        showMessage(
          'Trip Confirmed',
          `Supervisor confirmed trip ${tripNum}.\nYou can proceed to unload containers.`
        );
      }

      if (prevStatus === 'PENDING_APPROVAL' && nextStatus === 'REJECTED') {
        notifiedRef.current.add(notifyKey);
        showMessage(
          'Trip Rejected',
          `Supervisor rejected trip ${tripNum}.\nPlease review and create a new trip if needed.`
        );
      }
    });

    const map: Record<string, string> = {};
    nextTrips.forEach((t) => {
      map[t.id] = t.status;
    });
    prevStatusRef.current = map;
  }, []);

  const fetchTrips = useCallback(async () => {
    try {
      const driverParam = user?.driverId ? `?driverId=${user.driverId}` : '';
      const res = await axios.get(`${API_BASE_URL}/trips${driverParam}`);
      if (Array.isArray(res.data) && res.data.length > 0) {
        notifyStatusChanges(res.data);
        setTrips(res.data);
      } else {
        setTrips([]);
        prevStatusRef.current = {};
      }
    } catch {
      setTrips([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, notifyStatusChanges]);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  // Poll so driver sees supervisor confirmation without manual refresh
  useEffect(() => {
    const timer = setInterval(() => {
      fetchTrips();
    }, 5000);
    return () => clearInterval(timer);
  }, [fetchTrips]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTrips();
  };

  const handleUnloadContainer = async (tripId: string, containerId: string, defaultTerminal: string) => {
    const selectedTerminal = unloadSelections[containerId] || defaultTerminal;
    
    setUpdatingId(containerId);
    try {
      await axios.patch(`${API_BASE_URL}/trips/${tripId}/containers/${containerId}/unload`, {
        unloadedAt: selectedTerminal,
      });
      
      const msg = `Container unloaded at ${selectedTerminal}.`;
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Container Unloaded', msg);
      }
      fetchTrips();
    } catch (err: any) {
      const errText = err?.response?.data?.message || 'Failed to unload container';
      if (Platform.OS === 'web') {
        window.alert(errText);
      } else {
        Alert.alert('Error', errText);
      }
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredTrips = trips.filter((t) => {
    if (filter === 'All') return true;
    if (filter === 'Active') return t.status === 'IN_PROGRESS';
    if (filter === 'Completed') return t.status === 'COMPLETED';
    if (filter === 'Pending') return t.status === 'PENDING_APPROVAL';
    if (filter === 'Rejected') return t.status === 'REJECTED';
    return true;
  });

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <View style={styles.headerAccent} />
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerEyebrow}>Driver · Trips</Text>
            <Text style={styles.headerTitle}>My trips</Text>
            <Text style={styles.headerSub}>{trips.length} total ITT trips</Text>
          </View>
          <TouchableOpacity
            style={styles.newTripBtn}
            onPress={() => router.push('/(driver)/trips/new')}
          >
            <Ionicons name="add" size={16} color="#fff" style={{ marginRight: 2 }} />
            <Text style={styles.newTripBtnText}>New</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
        {['All', 'Active', 'Completed', 'Pending', 'Rejected'].map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator size="large" color="#1E88E5" style={{ marginTop: 40 }} />
      ) : filteredTrips.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>No trips in this view</Text>
          <TouchableOpacity
            style={styles.startEmptyBtn}
            onPress={() => router.push('/(driver)/trips/new')}
          >
            <Text style={styles.startEmptyText}>Start a Trip Now</Text>
          </TouchableOpacity>
        </View>
      ) : (
        filteredTrips.map((trip) => {
          const tripNum = trip.tripNumber || `TRP-${trip.id?.slice(0, 6)}`;
          const vessel = trip.vesselName || trip.vessel || 'Vessel';
          const from = trip.sourceTerminal || trip.from || 'ECT';
          const status = trip.status || 'IN_PROGRESS';
          const containers = trip.containers || [];

          return (
            <View key={trip.id} style={styles.tripCard}>
              <View style={styles.tripRow}>
                <View>
                  <Text style={styles.tripNumberText}>{tripNum}</Text>
                  <Text style={styles.tripVessel}>🚢 {vessel}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: getStatusColor(status) + '20' }]}>
                  <Text style={[styles.badgeText, { color: getStatusColor(status) }]}>
                    {status.replace('_', ' ')}
                  </Text>
                </View>
              </View>

              <View style={styles.routeRow}>
                <View style={styles.terminalBox}>
                  <Text style={styles.terminalLabel}>Origin</Text>
                  <Text style={styles.terminalValue}>{from}</Text>
                </View>
              </View>

              <View style={styles.containersSection}>
                <Text style={styles.containersTitle}>📦 Containers</Text>

                {status === 'PENDING_APPROVAL' && (
                  <View style={styles.waitingBox}>
                    <Text style={styles.waitingText}>
                      Containers loaded. Waiting for supervisor confirmation.
                    </Text>
                  </View>
                )}

                {status === 'IN_PROGRESS' && (
                  <View style={styles.confirmedBox}>
                    <Text style={styles.confirmedText}>
                      Supervisor confirmed this trip. You can proceed to unload containers.
                    </Text>
                  </View>
                )}

                {status === 'REJECTED' && (
                  <View style={styles.rejectedBox}>
                    <Text style={styles.rejectedText}>
                      Supervisor rejected this trip. Please create a new trip if needed.
                    </Text>
                  </View>
                )}
                
                {containers.length === 0 ? (
                  <Text style={styles.noContainers}>No containers assigned</Text>
                ) : (
                  containers.map((c: any, index: number) => {
                    const isDischarged = c.status === 'DISCHARGED';
                    const defaultTerminal = c.destTerminal || 'JCT';
                    const selectedTerminal = unloadSelections[c.id] || defaultTerminal;
                    
                    return (
                      <View key={c.id || index} style={styles.containerItem}>
                        <View style={styles.containerItemHeader}>
                          <Text style={styles.containerNumber}>{c.containerNumber}</Text>
                          <Text style={styles.containerSize}>{c.size?.replace('FT_', '')}</Text>
                        </View>
                        
                        {isDischarged ? (
                          <View style={styles.dischargedBox}>
                            <Text style={styles.dischargedText}>
                              ✅ Unloaded at {c.unloadedAt || 'Unknown'}
                            </Text>
                          </View>
                        ) : status === 'IN_PROGRESS' ? (
                          <View style={styles.unloadActionBox}>
                            <Text style={styles.selectTerminalLabel}>Unload at Terminal:</Text>
                            <View style={styles.terminalGrid}>
                              {TERMINALS.map((t) => (
                                <TouchableOpacity
                                  key={t}
                                  style={[
                                    styles.terminalBtn,
                                    selectedTerminal === t && styles.terminalBtnActive
                                  ]}
                                  onPress={() => setUnloadSelections(prev => ({ ...prev, [c.id]: t }))}
                                >
                                  <Text style={[
                                    styles.terminalBtnText,
                                    selectedTerminal === t && styles.terminalBtnTextActive
                                  ]}>{t}</Text>
                                </TouchableOpacity>
                              ))}
                            </View>
                            
                            <TouchableOpacity
                              style={styles.actionBtn}
                              disabled={updatingId === c.id}
                              onPress={() => handleUnloadContainer(trip.id, c.id, defaultTerminal)}
                            >
                              {updatingId === c.id ? (
                                <ActivityIndicator color="#fff" size="small" />
                              ) : (
                                <Text style={styles.actionBtnText}>Unload Container</Text>
                              )}
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <Text style={styles.pendingText}>
                            {status === 'PENDING_APPROVAL'
                              ? `Loaded · Target: ${defaultTerminal}`
                              : `Target: ${defaultTerminal}`}
                          </Text>
                        )}
                      </View>
                    );
                  })
                )}
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'COMPLETED':
    case 'APPROVED':
      return '#43A047';
    case 'IN_PROGRESS':
      return '#1E88E5';
    case 'PENDING_APPROVAL':
    case 'NOT_STARTED':
      return '#FB8C00';
    case 'REJECTED':
      return '#E53935';
    default:
      return '#8E99A4';
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  header: {
    backgroundColor: '#0A1628',
    padding: 24,
    paddingTop: 54,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    position: 'relative',
    overflow: 'hidden',
  },
  headerAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#1E88E5',
  },
  headerEyebrow: {
    fontSize: 11,
    color: '#64B5F6',
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  headerSub: { color: '#8E99A4', fontSize: 13, marginTop: 4 },
  newTripBtn: {
    backgroundColor: '#1E88E5',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  newTripBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  filterRow: { paddingHorizontal: 16, paddingVertical: 14 },
  filterChip: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E8ECF0',
  },
  filterChipActive: { backgroundColor: '#1E88E5', borderColor: '#1E88E5' },
  filterText: { fontSize: 13, color: '#8E99A4', fontWeight: '600' },
  filterTextActive: { color: '#fff' },
  tripCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8ECF0',
    elevation: 2,
  },
  tripRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  tripNumberText: { fontSize: 11, fontWeight: '800', color: '#1E88E5', textTransform: 'uppercase' },
  tripVessel: { fontSize: 16, fontWeight: '700', color: '#0A1628', marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  routeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, marginBottom: 12 },
  terminalBox: { backgroundColor: '#F5F7FA', borderRadius: 10, padding: 10, flex: 1 },
  terminalLabel: { fontSize: 11, color: '#8E99A4' },
  terminalValue: { fontSize: 16, fontWeight: '700', color: '#0A1628', marginTop: 2 },
  containersSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  containersTitle: { fontSize: 13, fontWeight: '700', color: '#4A5568', marginBottom: 10 },
  noContainers: { fontSize: 12, color: '#A0AEC0' },
  containerItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  containerItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  containerNumber: { fontSize: 14, fontWeight: '700', color: '#2D3748' },
  containerSize: { fontSize: 12, fontWeight: '600', color: '#718096', backgroundColor: '#EDF2F7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  dischargedBox: {
    backgroundColor: '#F0FFF4',
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#C6F6D5',
  },
  dischargedText: { fontSize: 12, color: '#2F855A', fontWeight: '600' },
  pendingText: { fontSize: 12, color: '#718096' },
  waitingBox: {
    backgroundColor: '#FFF8E1',
    borderWidth: 1,
    borderColor: '#FFE082',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  waitingText: { fontSize: 12, color: '#E65100', fontWeight: '600' },
  confirmedBox: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#A5D6A7',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  confirmedText: { fontSize: 12, color: '#2E7D32', fontWeight: '700' },
  rejectedBox: {
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: '#EF9A9A',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  rejectedText: { fontSize: 12, color: '#C62828', fontWeight: '700' },
  unloadActionBox: {
    marginTop: 8,
  },
  selectTerminalLabel: { fontSize: 11, color: '#718096', marginBottom: 6, fontWeight: '600' },
  terminalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  terminalBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#EDF2F7',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  terminalBtnActive: {
    backgroundColor: '#FB8C00',
    borderColor: '#FB8C00',
  },
  terminalBtnText: { fontSize: 11, fontWeight: '600', color: '#4A5568' },
  terminalBtnTextActive: { color: '#fff' },
  actionBtn: {
    backgroundColor: '#43A047',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  emptyBox: { alignItems: 'center', marginTop: 50, paddingHorizontal: 30 },
  emptyTitle: { fontSize: 16, color: '#718096', marginBottom: 14 },
  startEmptyBtn: {
    backgroundColor: '#1E88E5',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  startEmptyText: { color: '#fff', fontWeight: '700' },
});
