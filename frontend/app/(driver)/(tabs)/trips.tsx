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
import { securityAuditService } from '../../../src/services/securityAuditService';
import { useResponsive } from '../../../src/hooks/useResponsive';
import { getTripTimingDetails } from '../../../src/utils/tripDateUtils';
import { getTripDischargeTerminal } from '../../../src/utils/tripTerminalUtils';

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
  const { topInset, bottomInset, contentMaxWidth, containerPaddingHorizontal } = useResponsive();

  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('ALL');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const mockTrips = useMockTripStore((s) => s.mockTrips);
  const [arrivedTrips, setArrivedTrips] = useState<Set<string>>(new Set());

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

  const handleStartTrip = async (tripId: string) => {
    setUpdatingId(tripId);
    const targetTrip = trips.find((t) => t.id === tripId);
    const tripNum = targetTrip?.tripNumber || `TRP-${tripId.slice(0, 6)}`;
    const driverUser = user?.username || user?.driverCode || user?.employeeId || 'DRIVER';

    try {
      await axios.patch(`${API_BASE_URL}/trips/${tripId}/status`, { status: 'IN_PROGRESS' });
      useMockTripStore.getState().updateTripStatus(tripId, 'IN_PROGRESS');
      await securityAuditService.logEvent(
        'TRIP_STARTED',
        driverUser,
        `Driver ${user?.name || driverUser} started trip ${tripNum} (${targetTrip?.sourceTerminal || 'Gate'} → ${targetTrip?.destTerminal || 'ECT'}) · Truck ${targetTrip?.vehicleNumber || user?.vehicleNumber || 'LY-6439'}`,
        'INFO',
        'DRIVER',
        { tripId, tripNumber: tripNum, role: 'DRIVER', status: 'IN_PROGRESS', vehicleNumber: targetTrip?.vehicleNumber || user?.vehicleNumber }
      );
      showMessage('Trip Started', 'Gate pass validated. Trip is now IN PROGRESS.');
      fetchTrips();
    } catch {
      useMockTripStore.getState().updateTripStatus(tripId, 'IN_PROGRESS');
      await securityAuditService.logEvent(
        'TRIP_STARTED',
        driverUser,
        `Driver ${user?.name || driverUser} started trip ${tripNum} (${targetTrip?.sourceTerminal || 'Gate'} → ${targetTrip?.destTerminal || 'ECT'}) · Truck ${targetTrip?.vehicleNumber || user?.vehicleNumber || 'LY-6439'}`,
        'INFO',
        'DRIVER',
        { tripId, tripNumber: tripNum, role: 'DRIVER', status: 'IN_PROGRESS', vehicleNumber: targetTrip?.vehicleNumber || user?.vehicleNumber }
      );
      showMessage('Trip Started', 'Gate pass validated. Trip is now IN PROGRESS.');
      fetchTrips();
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCompleteTrip = async (tripId: string) => {
    setUpdatingId(tripId);
    const driverUser = user?.username || user?.driverCode || user?.employeeId || 'DRIVER';

    try {
      const trip = trips.find((t) => t.id === tripId);
      const tripNum = trip?.tripNumber || `TRP-${tripId.slice(0, 6)}`;
      const selTerm = (trip?.containers || []).map((c: any) => unloadSelections[c.id]).filter(Boolean)[0] || trip?.destTerminal || 'ECT';
      const dischargeBay = trip?.dischargeBay || 'Bay 04, Crane 02';
      const sealStatus = trip?.sealStatus || 'INTACT (VERIFIED)';
      const damageStatus = trip?.damageStatus || 'NONE';
      const driverNotes = trip?.driverCompletionNotes || 'Containers discharged safely at destination terminal berth. Seals verified.';

      await axios.patch(`${API_BASE_URL}/trips/${tripId}/complete`, {
        dischargeTerminal: selTerm,
        dischargeBay,
        sealStatus,
        damageStatus,
        driverNotes,
      }).catch(() => {});
      await axios.patch(`${API_BASE_URL}/trips/${tripId}/submit`, { notes: driverNotes }).catch(() => {});

      useMockTripStore.getState().submitCompletedTripToSupervisor(tripId, {
        dischargeTerminal: selTerm,
        dischargeBay,
        sealStatus,
        damageStatus,
        driverNotes,
      });

      await securityAuditService.logEvent(
        'TRIP_COMPLETED',
        driverUser,
        `Driver ${user?.name || driverUser} completed trip ${tripNum} · Discharged at ${selTerm} (${dischargeBay}) · Submitted for supervisor approval`,
        'INFO',
        'DRIVER',
        { tripId, tripNumber: tripNum, dischargeTerminal: selTerm, dischargeBay, role: 'DRIVER', status: 'PENDING_APPROVAL' }
      );

      showMessage(
        'Trip Submitted to Supervisor! 📋',
        'Discharge details & seal status submitted to Port Operations Supervisor to confirm delivery and credit your 300 Containers target (+1)!'
      );
      fetchTrips();
    } catch {
      const trip = trips.find((t) => t.id === tripId);
      const tripNum = trip?.tripNumber || `TRP-${tripId.slice(0, 6)}`;
      useMockTripStore.getState().submitCompletedTripToSupervisor(tripId, {
        dischargeTerminal: 'ECT',
        dischargeBay: 'Bay 04, Crane 02',
        sealStatus: 'INTACT (VERIFIED)',
        damageStatus: 'NONE',
        driverNotes: 'Containers discharged safely. Awaiting supervisor clearance.',
      });

      await securityAuditService.logEvent(
        'TRIP_COMPLETED',
        driverUser,
        `Driver ${user?.name || driverUser} completed trip ${tripNum} · Discharged at ECT (Bay 04, Crane 02) · Submitted for supervisor approval`,
        'INFO',
        'DRIVER',
        { tripId, tripNumber: tripNum, dischargeTerminal: 'ECT', role: 'DRIVER', status: 'PENDING_APPROVAL' }
      );

      showMessage(
        'Trip Submitted to Supervisor! 📋',
        'Discharge details submitted to Port Operations Supervisor for clearance.'
      );
      fetchTrips();
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDirectCompleteTrip = async (tripId: string) => {
    handleCompleteTrip(tripId);
  };

  const completedCount = trips.filter((t) => t.status === 'COMPLETED' || t.status === 'APPROVED').length;
  const inProgressCount = trips.filter((t) => t.status === 'IN_PROGRESS').length;
  const pendingCount = trips.filter((t) => t.status === 'PENDING_APPROVAL').length;

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
      <View
        style={[
          styles.header,
          {
            paddingTop: Math.max(topInset, 16),
            paddingHorizontal: containerPaddingHorizontal,
            maxWidth: contentMaxWidth,
            width: '100%',
            alignSelf: 'center',
          },
        ]}
      >
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerSuper}>{new Date().toLocaleDateString('en-LK', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}</Text>
            <Text style={styles.headerTitle}>TODAY'S TRIPS</Text>
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
        contentContainerStyle={[
          styles.scrollInside,
          {
            paddingHorizontal: containerPaddingHorizontal,
            paddingBottom: Math.max(bottomInset + 24, 40),
            maxWidth: contentMaxWidth,
            width: '100%',
            alignSelf: 'center',
          },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchTrips(); }}
            tintColor={colors.primaryContainer}
          />
        }
      >
        {/* ─── Today's Trips Filters Bar ─── */}
        <View style={styles.filterSection}>
          <View style={styles.filterHeader}>
            <Text style={styles.filterTitle}>TODAY'S TRIPS</Text>
            <Text style={styles.filterCountBadge}>{filteredTrips.length} TOTAL</Text>
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
            const isApproved = trip.status === 'APPROVED';
            const isProgress = trip.status === 'IN_PROGRESS';
            const isPending = trip.status === 'PENDING_APPROVAL';
            const isDone = trip.status === 'COMPLETED';

            const statusColor = isDone
              ? '#22ef7e'
              : isProgress
              ? '#00e5ff'
              : isApproved
              ? '#00e5ff'
              : '#feb300';

            return (
              <View key={trip.id} style={styles.jobCard}>
                <View style={[styles.jobBorderIndicator, { backgroundColor: statusColor }]} />

                <View style={styles.jobCardContent}>
                  {/* Card Header */}
                  <View style={styles.jobHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.jobNumText}>{tripNum}</Text>
                      <View style={[styles.statusTag, { backgroundColor: `${statusColor}22` }]}>
                        <Text style={[styles.statusTagText, { color: statusColor }]}>
                          {isPending
                            ? 'DELIVERY COMPLETED (PENDING SIGN-OFF)'
                            : isDone || isApproved
                            ? 'COMPLETED & CONFIRMED'
                            : trip.status?.replace(/_/g, ' ')}
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
                      <Text style={styles.termCode}>{getTripDischargeTerminal(trip)}</Text>
                    </View>
                  </View>

                  {/* ─── TRIP STARTED DATE TIME & END TIME DETAILS ─── */}
                  {(() => {
                    const timing = getTripTimingDetails(trip);
                    return (
                      <View style={styles.timingCard}>
                        {/* Started Date & Time */}
                        <View style={styles.timingCol}>
                          <View style={styles.timingColHeader}>
                            <Ionicons name="play-circle" size={13} color="#00e5ff" />
                            <Text style={styles.timingColLabel}>TRIP STARTED</Text>
                          </View>
                          <Text style={styles.timingDateVal}>{timing.startDate}</Text>
                          <Text style={styles.timingTimeVal}>{timing.startTime}</Text>
                        </View>

                        {/* Middle Arrow & Duration */}
                        <View style={styles.timingDividerCol}>
                          <Ionicons name="arrow-forward" size={14} color="#3a4756" />
                          {timing.duration && (
                            <View style={styles.durationPill}>
                              <Ionicons name="timer-outline" size={10} color="#22ef7e" />
                              <Text style={styles.durationPillText}>{timing.duration}</Text>
                            </View>
                          )}
                        </View>

                        {/* End Date & Time */}
                        <View style={styles.timingCol}>
                          <View style={styles.timingColHeader}>
                            <Ionicons
                              name={timing.isCompleted ? 'checkmark-circle' : timing.isPending ? 'time' : 'navigate-circle'}
                              size={13}
                              color={timing.statusColor}
                            />
                            <Text style={[styles.timingColLabel, { color: timing.statusColor }]}>
                              {timing.isCompleted ? 'TRIP COMPLETED' : timing.isPending ? 'DISCHARGED' : 'EST. ARRIVAL'}
                            </Text>
                          </View>
                          <Text style={[styles.timingDateVal, !timing.isCompleted && !timing.isPending && { color: '#849396' }]}>
                            {timing.endDate}
                          </Text>
                          <Text style={[styles.timingTimeVal, { color: timing.statusColor }]}>
                            {timing.endTime}
                          </Text>
                        </View>
                      </View>
                    );
                  })()}

                  {/* Containers List */}
                  <View style={styles.containersBox}>
                    {/* Multi/Dual Terminal Discharge Indicator */}
                    {(() => {
                      const termStr = getTripDischargeTerminal(trip);
                      const isDual = termStr.includes('&');
                      return (
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6,
                            backgroundColor: isDual ? 'rgba(0, 229, 255, 0.1)' : 'rgba(34, 239, 126, 0.08)',
                            borderWidth: 1,
                            borderColor: isDual ? 'rgba(0, 229, 255, 0.3)' : 'rgba(34, 239, 126, 0.25)',
                            borderRadius: 6,
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            marginBottom: 8,
                          }}
                        >
                          <Ionicons
                            name={isDual ? 'swap-horizontal' : 'checkmark-circle'}
                            size={12}
                            color={isDual ? '#00e5ff' : '#22ef7e'}
                          />
                          <Text style={{ fontSize: 10, fontWeight: '700', color: isDual ? '#00e5ff' : '#22ef7e', flex: 1 }}>
                            {isDual ? `DUAL DISCHARGE TERMINALS: ${termStr}` : `DISCHARGE TERMINAL: ${termStr}`}
                          </Text>
                        </View>
                      );
                    })()}

                    {(trip.containers || []).map((c: any, cIdx: number) => {
                      const sel = unloadSelections[c.id] || c.unloadedTerminal || c.destTerminal || trip.destTerminal;
                      const cDest = c.destTerminal || getTripDischargeTerminal(trip);
                      return (
                        <View key={c.id || cIdx} style={styles.containerItem}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Ionicons name="cube" size={14} color={colors.primaryContainer} />
                              <Text style={styles.containerNumText}>{c.containerNumber || 'MSKU-88219-0'}</Text>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Text style={styles.isoType}>{c.size || c.isoType || '20FT'}</Text>
                              <View style={{ backgroundColor: 'rgba(0, 229, 255, 0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: 'rgba(0, 229, 255, 0.3)' }}>
                                <Text style={{ color: '#00e5ff', fontSize: 10, fontWeight: '800' }}>
                                  ➔ {cDest}
                                </Text>
                              </View>
                            </View>
                          </View>

                          {/* Unload Terminal Selector if in progress and arrived */}
                          {isProgress && arrivedTrips.has(trip.id) && (
                            <View style={styles.unloadRow}>
                              <Text style={styles.unloadLabel}>UNLOAD BAY / BERTH:</Text>
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

                  {/* ─── State 1: PENDING APPROVAL ─── */}
                  {isPending && (
                    <View style={{ gap: 8 }}>
                      <View style={styles.pendingNoticeBox}>
                        <Ionicons name="time-outline" size={16} color="#feb300" />
                        <Text style={styles.pendingNoticeText}>
                          Cargo discharged at {getTripDischargeTerminal(trip)}. Submitted to Port Operations Supervisor for delivery verification & sign-off.
                        </Text>
                      </View>

                      {/* Discharge Manifest Summary */}
                      <View style={{
                        backgroundColor: '#080e17',
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: 'rgba(254, 179, 0, 0.35)',
                        padding: 10,
                        gap: 8,
                      }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.06)' }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                            <Ionicons name="shield-checkmark" size={13} color="#00e5ff" />
                            <Text style={{ fontSize: 9.5, fontWeight: '900', color: '#00e5ff', letterSpacing: 0.4 }}>
                              SLPA PORT CLEARANCE MANIFEST
                            </Text>
                          </View>
                          <View style={{
                            backgroundColor: 'rgba(34, 239, 126, 0.12)',
                            paddingHorizontal: 5,
                            paddingVertical: 1.5,
                            borderRadius: 4,
                            borderWidth: 1,
                            borderColor: 'rgba(34, 239, 126, 0.3)',
                          }}>
                            <Text style={{ fontSize: 8, fontWeight: '800', color: '#22ef7e' }}>LOGGED</Text>
                          </View>
                        </View>

                        <View style={{ flexDirection: 'row', gap: 6 }}>
                          <View style={{ flex: 1, backgroundColor: '#0d1625', borderRadius: 6, borderWidth: 1, borderColor: '#242a34', padding: 6 }}>
                            <Text style={{ fontSize: 8, fontWeight: '800', color: '#849396' }}>BAY / SLOT</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                              <Ionicons name="location" size={11} color="#feb300" />
                              <Text style={{ fontSize: 9.5, fontWeight: '800', color: '#00e5ff' }} numberOfLines={1}>
                                {trip.destTerminal} · {trip.dischargeBay || 'Bay 04, Crane 02'}
                              </Text>
                            </View>
                          </View>

                          <View style={{
                            flex: 1,
                            backgroundColor: '#0d1625',
                            borderRadius: 6,
                            borderWidth: 1,
                            borderColor: trip.sealStatus?.includes('DAMAGED') ? 'rgba(255, 82, 82, 0.35)' : 'rgba(34, 239, 126, 0.35)',
                            padding: 6,
                          }}>
                            <Text style={{ fontSize: 8, fontWeight: '800', color: '#849396' }}>SEAL STATUS</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                              <Ionicons
                                name={trip.sealStatus?.includes('DAMAGED') ? 'warning' : 'shield-checkmark'}
                                size={11}
                                color={trip.sealStatus?.includes('DAMAGED') ? '#ff5252' : '#22ef7e'}
                              />
                              <Text style={{ fontSize: 9.5, fontWeight: '800', color: trip.sealStatus?.includes('DAMAGED') ? '#ff5252' : '#22ef7e' }} numberOfLines={1}>
                                {trip.sealStatus || 'INTACT (VERIFIED)'}
                              </Text>
                            </View>
                          </View>

                          <View style={{
                            flex: 1,
                            backgroundColor: '#0d1625',
                            borderRadius: 6,
                            borderWidth: 1,
                            borderColor: trip.damageStatus === 'DAMAGED' ? 'rgba(255, 82, 82, 0.35)' : 'rgba(34, 239, 126, 0.35)',
                            padding: 6,
                          }}>
                            <Text style={{ fontSize: 8, fontWeight: '800', color: '#849396' }}>CARGO</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                              <Ionicons
                                name={trip.damageStatus === 'DAMAGED' ? 'alert-circle' : 'checkmark-circle'}
                                size={11}
                                color={trip.damageStatus === 'DAMAGED' ? '#ff5252' : '#22ef7e'}
                              />
                              <Text style={{ fontSize: 9.5, fontWeight: '800', color: trip.damageStatus === 'DAMAGED' ? '#ff5252' : '#22ef7e' }} numberOfLines={1}>
                                {trip.damageStatus === 'DAMAGED' ? 'DAMAGED' : 'SOUND'}
                              </Text>
                            </View>
                          </View>
                        </View>

                        {/* Full width remarks */}
                        <View style={{
                          backgroundColor: '#0c1421',
                          borderRadius: 6,
                          borderLeftWidth: 3,
                          borderLeftColor: '#00e5ff',
                          paddingHorizontal: 8,
                          paddingVertical: 6,
                        }}>
                          <Text style={{ fontSize: 7.5, fontWeight: '900', color: '#00e5ff', letterSpacing: 0.4, marginBottom: 2 }}>
                            DRIVER COMPLETION NOTES
                          </Text>
                          <Text style={{ fontSize: 9.5, color: '#dde2f0', fontStyle: 'italic', lineHeight: 13 }}>
                            "{trip.driverCompletionNotes || 'Containers discharged safely at destination terminal berth. Seals inspected and verified intact.'}"
                          </Text>
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingTop: 2 }}>
                          <Ionicons name="lock-closed" size={10} color="#849396" />
                          <Text style={{ fontSize: 8.5, color: '#849396' }}>
                            SLPA Digital Handover Audit • Transmitted to Port Supervisor
                          </Text>
                        </View>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', paddingVertical: 4 }}>
                        <ActivityIndicator size="small" color="#feb300" />
                        <Text style={{ fontSize: 10, fontWeight: '700', color: '#feb300' }}>
                          Awaiting supervisor approval to credit container quota (+1)...
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* ─── State 2: GATE PASS APPROVED -> START TRIP ─── */}
                  {isApproved && (
                    <View style={{ gap: 8 }}>
                      <View style={styles.approvedNoticeBox}>
                        <Ionicons name="shield-checkmark" size={16} color="#00e5ff" />
                        <Text style={styles.approvedNoticeText}>
                          Gate Pass Cleared. You are authorized to depart {trip.sourceTerminal || 'Origin'}.
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.completeBtn, { backgroundColor: '#00e5ff' }]}
                        onPress={() => handleStartTrip(trip.id)}
                        disabled={updatingId === trip.id}
                      >
                        {updatingId === trip.id ? (
                          <ActivityIndicator size="small" color="#00363d" />
                        ) : (
                          <>
                            <Ionicons name="navigate" size={18} color="#00363d" />
                            <Text style={styles.completeBtnText}>START TRIP / DEPART TERMINAL</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* ─── State 3: IN PROGRESS -> ARRIVED AT DESTINATION ─── */}
                  {isProgress && !arrivedTrips.has(trip.id) && (
                    <TouchableOpacity
                      style={[styles.completeBtn, { backgroundColor: '#feb300' }]}
                      onPress={() => {
                        const next = new Set(arrivedTrips);
                        next.add(trip.id);
                        setArrivedTrips(next);
                      }}
                    >
                      <Ionicons name="location" size={18} color="#00363d" />
                      <Text style={styles.completeBtnText}>ARRIVED AT DESTINATION TERMINAL ({getTripDischargeTerminal(trip)})</Text>
                    </TouchableOpacity>
                  )}

                  {/* ─── State 4: ARRIVED -> DISCHARGE & SUBMIT FOR SUPERVISOR APPROVAL ─── */}
                  {isProgress && arrivedTrips.has(trip.id) && (
                    <View style={{ gap: 8 }}>
                      <View style={styles.arrivedNoticeBox}>
                        <Ionicons name="pin" size={16} color="#22ef7e" />
                        <Text style={styles.arrivedNoticeText}>
                          Arrived at {getTripDischargeTerminal(trip)}. Confirm discharge bay and submit mission for supervisor approval.
                        </Text>
                      </View>

                      <TouchableOpacity
                        style={[styles.completeBtn, { backgroundColor: '#00e5ff' }]}
                        onPress={() => handleCompleteTrip(trip.id)}
                        disabled={updatingId === trip.id}
                      >
                        {updatingId === trip.id ? (
                          <ActivityIndicator size="small" color="#00363d" />
                        ) : (
                          <>
                            <Ionicons name="paper-plane" size={16} color="#00363d" />
                            <Text style={[styles.completeBtnText, { color: '#00363d' }]}>
                              DISCHARGE & SUBMIT FOR SUPERVISOR APPROVAL
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* ─── State 5: COMPLETED -> STORED IN MY TRIPS ─── */}
                  {isDone && (
                    <View style={styles.completedNoticeBox}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="checkmark-circle" size={16} color="#22ef7e" />
                        <Text style={styles.completedNoticeText}>STORED IN MY TRIPS ARCHIVE</Text>
                      </View>
                      <Text style={styles.completedNoticeSub}>
                        Containers successfully discharged at {getTripDischargeTerminal(trip)}. Trip record archived.
                      </Text>
                    </View>
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
      },
  isoType: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffd799',
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
  pendingNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(254, 179, 0, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(254, 179, 0, 0.3)',
    borderRadius: radius.sm,
    padding: 10,
    marginTop: 4,
  },
  pendingNoticeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#feb300',
    flex: 1,
  },
  approvedNoticeBox: {
    flexDirection: 'column',
    gap: 4,
    backgroundColor: 'rgba(0, 229, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.3)',
    borderRadius: radius.sm,
    padding: 10,
  },
  approvedNoticeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#00e5ff',
  },
  approvedNoticeSub: {
    fontSize: 11,
    fontWeight: '500',
    color: '#849396',
  },
  arrivedNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(34, 239, 126, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(34, 239, 126, 0.3)',
    borderRadius: radius.sm,
    padding: 10,
  },
  arrivedNoticeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#22ef7e',
    flex: 1,
  },
  completedNoticeBox: {
    flexDirection: 'column',
    gap: 4,
    backgroundColor: 'rgba(34, 239, 126, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(34, 239, 126, 0.3)',
    borderRadius: radius.sm,
    padding: 10,
    marginTop: 4,
  },
  completedNoticeText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#22ef7e',
    letterSpacing: 0.5,
  },
  completedNoticeSub: {
    fontSize: 11,
    fontWeight: '600',
    color: '#849396',
  },

  // ─── TRIP TIMING DETAILS STYLES ───
  timingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#070c14',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 8,
    marginBottom: 8,
    gap: 8,
  },
  timingCol: {
    flex: 1,
    gap: 2,
  },
  timingColHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 2,
  },
  timingColLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#00e5ff',
    letterSpacing: 0.5,
  },
  timingDateVal: {
    fontSize: 12,
    fontWeight: '800',
    color: '#dde2f0',
  },
  timingTimeVal: {
    fontSize: 13,
    fontWeight: '900',
    color: '#00e5ff',
    letterSpacing: 0.3,
  },
  timingDividerCol: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 2,
  },
  durationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(34, 239, 126, 0.12)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(34, 239, 126, 0.3)',
  },
  durationPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#22ef7e',
  },
});
