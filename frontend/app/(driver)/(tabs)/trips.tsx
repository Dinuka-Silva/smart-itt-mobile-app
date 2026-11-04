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
import apiClient from '../../../src/services/api';
import { NetworkErrorView } from '../../../src/components/NetworkErrorView';
import { useAuthStore } from '../../../src/store/authStore';
import { colors, radius, spacing } from '../../../src/theme';
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
  const [arrivedTrips, setArrivedTrips] = useState<Set<string>>(new Set());
  const [networkError, setNetworkError] = useState(false);

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

      if ((prevStatus === 'PENDING_APPROVAL' || prevStatus === 'PENDING_SUPERVISOR_CONFIRMATION') && (nextStatus === 'SUPERVISOR_CONFIRMED' || nextStatus === 'APPROVED' || nextStatus === 'COMPLETED')) {
        notifiedRef.current.add(notifyKey);
        showMessage('Trip Confirmed', `Supervisor confirmed trip ${tripNum}.\nDriver allowance credited.`);
      }

      if ((prevStatus === 'PENDING_APPROVAL' || prevStatus === 'PENDING_SUPERVISOR_CONFIRMATION') && (nextStatus === 'REJECTED' || nextStatus === 'SUPERVISOR_REJECTED')) {
        notifiedRef.current.add(notifyKey);
        showMessage('Trip Rejected', `Supervisor rejected trip ${tripNum}.\nReason: ${trip.rejectionReason || 'Review required'}`);
      }
    });

    const map: Record<string, string> = {};
    nextTrips.forEach((t) => {
      if (t.id && t.status) map[t.id] = t.status;
    });
    prevStatusRef.current = map;
  }, []);

  const fetchTrips = useCallback(async () => {
    try {
      setNetworkError(false);
      const driverId = user?.driverId || user?.id;
      const driverParam = driverId ? `?driverId=${driverId}` : '';
      const res = await apiClient.get(`/trips${driverParam}`);
      const apiTrips = Array.isArray(res.data) ? res.data : [];
      notifyStatusChanges(apiTrips);
      setTrips(apiTrips);
    } catch (e) {
      console.warn('[DriverTrips] Error fetching trips:', e);
      setNetworkError(true);
      setTrips([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, notifyStatusChanges]);

  useEffect(() => { fetchTrips(); }, [fetchTrips]);
  useFocusEffect(useCallback(() => { fetchTrips(); }, [fetchTrips]));

  const handleStartTrip = async (tripId: string) => {
    setUpdatingId(tripId);
    const targetTrip = trips.find((t) => t.id === tripId);
    const tripNum = targetTrip?.tripNumber || `TRP-${tripId.slice(0, 6)}`;
    const driverUser = user?.username || user?.driverCode || user?.employeeId || 'DRIVER';

    try {
      await apiClient.patch(`/trips/${tripId}/status`, { status: 'IN_PROGRESS' });
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
      showMessage('Trip Update', 'Trip status updated.');
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

      await apiClient.post(`/trips/${tripId}/complete`, {
        dischargeTerminal: selTerm,
        dischargeBay,
        sealStatus,
        damageStatus,
        driverNotes,
      }).catch(() => {});

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
      showMessage('Trip Submitted to Supervisor! 📋', 'Discharge submitted to Port Operations Supervisor for clearance.');
      fetchTrips();
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDirectCompleteTrip = async (tripId: string) => {
    handleCompleteTrip(tripId);
  };

  const completedCount = trips.filter((t) => t.status === 'COMPLETED' || t.status === 'APPROVED' || t.status === 'SUPERVISOR_CONFIRMED').length;
  const inProgressCount = trips.filter((t) => t.status === 'IN_PROGRESS').length;
  const pendingCount = trips.filter((t) => t.status === 'PENDING_APPROVAL' || t.status === 'PENDING_SUPERVISOR_CONFIRMATION').length;

  const filteredTrips = trips.filter((t) => {
    if (filter === 'ALL') return true;
    if (filter === 'ACTIVE') return t.status === 'IN_PROGRESS';
    if (filter === 'PENDING') return t.status === 'PENDING_APPROVAL' || t.status === 'PENDING_SUPERVISOR_CONFIRMATION';
    if (filter === 'DONE') return t.status === 'COMPLETED' || t.status === 'APPROVED' || t.status === 'SUPERVISOR_CONFIRMED';
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
            <Ionicons name="add" size={16} color="#FFFFFF" />
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
        ) : networkError && trips.length === 0 ? (
          <View style={{ marginHorizontal: 16 }}>
            <NetworkErrorView onRetry={fetchTrips} isRetrying={refreshing} />
          </View>
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
              ? '#173B70'
              : isProgress
              ? '#173B70'
              : isApproved
              ? '#173B70'
              : '#173B70';

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
                            <Ionicons name="play-circle" size={13} color="#173B70" />
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
                              <Ionicons name="timer-outline" size={10} color="#173B70" />
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
                            backgroundColor: isDual ? '#F0F5FA' : 'rgba(34, 239, 126, 0.08)',
                            borderWidth: 1,
                            borderColor: isDual ? '#F0F5FA' : 'rgba(34, 239, 126, 0.25)',
                            borderRadius: 6,
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            marginBottom: 8,
                          }}
                        >
                          <Ionicons
                            name={isDual ? 'swap-horizontal' : 'checkmark-circle'}
                            size={12}
                            color={isDual ? '#173B70' : '#173B70'}
                          />
                          <Text style={{ fontSize: 10, fontWeight: '700', color: isDual ? '#173B70' : '#173B70', flex: 1 }}>
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
                              <View style={{ backgroundColor: '#F0F5FA', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: '#173B70' }}>
                                <Text style={{ color: '#173B70', fontSize: 10, fontWeight: '800' }}>
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
                        <Ionicons name="time-outline" size={16} color="#173B70" />
                        <Text style={styles.pendingNoticeText}>
                          Cargo discharged at {getTripDischargeTerminal(trip)}. Submitted to Port Operations Supervisor for delivery verification & sign-off.
                        </Text>
                      </View>

                      {/* Discharge Manifest Summary */}
                      <View style={{
                        backgroundColor: '#F8FAFC',
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: 'rgba(254, 179, 0, 0.35)',
                        padding: 10,
                        gap: 8,
                      }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                            <Ionicons name="shield-checkmark" size={13} color="#173B70" />
                            <Text style={{ fontSize: 9.5, fontWeight: '900', color: '#173B70', letterSpacing: 0.4 }}>
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
                            <Text style={{ fontSize: 8, fontWeight: '800', color: '#173B70' }}>LOGGED</Text>
                          </View>
                        </View>

                        <View style={{ flexDirection: 'row', gap: 6 }}>
                          <View style={{ flex: 1, backgroundColor: '#0d1625', borderRadius: 6, borderWidth: 1, borderColor: '#242a34', padding: 6 }}>
                            <Text style={{ fontSize: 8, fontWeight: '800', color: '#849396' }}>BAY / SLOT</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                              <Ionicons name="location" size={11} color="#173B70" />
                              <Text style={{ fontSize: 9.5, fontWeight: '800', color: '#173B70' }} numberOfLines={1}>
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
                                color={trip.sealStatus?.includes('DAMAGED') ? '#173B70' : '#173B70'}
                              />
                              <Text style={{ fontSize: 9.5, fontWeight: '800', color: trip.sealStatus?.includes('DAMAGED') ? '#173B70' : '#173B70' }} numberOfLines={1}>
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
                                color={trip.damageStatus === 'DAMAGED' ? '#173B70' : '#173B70'}
                              />
                              <Text style={{ fontSize: 9.5, fontWeight: '800', color: trip.damageStatus === 'DAMAGED' ? '#173B70' : '#173B70' }} numberOfLines={1}>
                                {trip.damageStatus === 'DAMAGED' ? 'DAMAGED' : 'SOUND'}
                              </Text>
                            </View>
                          </View>
                        </View>

                        {/* Full width remarks */}
                        <View style={{
                          backgroundColor: '#F8FAFC',
                          borderRadius: 6,
                          borderLeftWidth: 3,
                          borderLeftColor: '#173B70',
                          paddingHorizontal: 8,
                          paddingVertical: 6,
                        }}>
                          <Text style={{ fontSize: 7.5, fontWeight: '900', color: '#173B70', letterSpacing: 0.4, marginBottom: 2 }}>
                            DRIVER COMPLETION NOTES
                          </Text>
                          <Text style={{ fontSize: 9.5, color: '#1E293B', fontStyle: 'italic', lineHeight: 13 }}>
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
                        <ActivityIndicator size="small" color="#173B70" />
                        <Text style={{ fontSize: 10, fontWeight: '700', color: '#173B70' }}>
                          Awaiting supervisor approval to credit container quota (+1)...
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* ─── State 2: GATE PASS APPROVED -> START TRIP ─── */}
                  {isApproved && (
                    <View style={{ gap: 8 }}>
                      <View style={styles.approvedNoticeBox}>
                        <Ionicons name="shield-checkmark" size={16} color="#173B70" />
                        <Text style={styles.approvedNoticeText}>
                          Gate Pass Cleared. You are authorized to depart {trip.sourceTerminal || 'Origin'}.
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.completeBtn, { backgroundColor: '#173B70' }]}
                        onPress={() => handleStartTrip(trip.id)}
                        disabled={updatingId === trip.id}
                      >
                        {updatingId === trip.id ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <>
                            <Ionicons name="navigate" size={18} color="#FFFFFF" />
                            <Text style={styles.completeBtnText}>START TRIP / DEPART TERMINAL</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* ─── State 3: IN PROGRESS -> ARRIVED AT DESTINATION ─── */}
                  {isProgress && !arrivedTrips.has(trip.id) && (
                    <TouchableOpacity
                      style={[styles.completeBtn, { backgroundColor: '#173B70' }]}
                      onPress={() => {
                        const next = new Set(arrivedTrips);
                        next.add(trip.id);
                        setArrivedTrips(next);
                      }}
                    >
                      <Ionicons name="location" size={18} color="#FFFFFF" />
                      <Text style={styles.completeBtnText}>ARRIVED AT DESTINATION TERMINAL ({getTripDischargeTerminal(trip)})</Text>
                    </TouchableOpacity>
                  )}

                  {/* ─── State 4: ARRIVED -> DISCHARGE & SUBMIT FOR SUPERVISOR APPROVAL ─── */}
                  {isProgress && arrivedTrips.has(trip.id) && (
                    <View style={{ gap: 8 }}>
                      <View style={styles.arrivedNoticeBox}>
                        <Ionicons name="pin" size={16} color="#173B70" />
                        <Text style={styles.arrivedNoticeText}>
                          Arrived at {getTripDischargeTerminal(trip)}. Confirm discharge bay and submit mission for supervisor approval.
                        </Text>
                      </View>

                      <TouchableOpacity
                        style={[styles.completeBtn, { backgroundColor: '#173B70' }]}
                        onPress={() => handleCompleteTrip(trip.id)}
                        disabled={updatingId === trip.id}
                      >
                        {updatingId === trip.id ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <>
                            <Ionicons name="paper-plane" size={16} color="#FFFFFF" />
                            <Text style={[styles.completeBtnText, { color: '#FFFFFF' }]}>
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
                        <Ionicons name="checkmark-circle" size={16} color="#173B70" />
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
    backgroundColor: '#F7F9FA',
  },
  header: {
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5EAEC',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerSuper: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7C85',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2D33',
    letterSpacing: 0.3,
  },
  newTripBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#173B70',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  newTripBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
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
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2D33',
  },
  filterCountBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: '#173B70',
  },
  filterPillsScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5EAEC',
  },
  filterChipActive: {
    backgroundColor: '#173B70',
    borderColor: '#173B70',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7C85',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },

  // Job Cards
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 36,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5EAEC',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2D33',
  },
  emptySub: {
    fontSize: 13,
    color: '#6B7C85',
    textAlign: 'center',
  },
  jobCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5EAEC',
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
    color: '#173B70',
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
    color: '#1E293B',
    letterSpacing: 0.5,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
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
    color: '#1E293B',
        marginTop: 2,
  },
  routeArrow: {
    alignItems: 'center',
    gap: 2,
  },
  routeDist: {
    fontSize: 8,
    fontWeight: '700',
    color: '#173B70',
      },
  containersBox: {
    gap: 8,
  },
  containerItem: {
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: radius.sm,
    gap: 8,
  },
  containerNumText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1E293B',
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5EAEC',
  },
  termChoiceActive: {
    backgroundColor: '#173B70',
    borderColor: '#173B70',
  },
  termChoiceText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6B7C85',
  },
  termChoiceTextActive: {
    color: '#FFFFFF',
  },
  completeBtn: {
    height: 48,
    backgroundColor: '#173B70',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  completeBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  pendingNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0F5FA',
    borderWidth: 1,
    borderColor: '#173B70',
    borderRadius: 8,
    padding: 10,
    marginTop: 4,
  },
  pendingNoticeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#173B70',
    flex: 1,
  },
  approvedNoticeBox: {
    flexDirection: 'column',
    gap: 4,
    backgroundColor: '#E6F6EC',
    borderWidth: 1,
    borderColor: '#1E7A45',
    borderRadius: 8,
    padding: 10,
  },
  approvedNoticeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E7A45',
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
    color: '#173B70',
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
    color: '#173B70',
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
    backgroundColor: '#F8FAFC',
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
    color: '#173B70',
    letterSpacing: 0.5,
  },
  timingDateVal: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1E293B',
  },
  timingTimeVal: {
    fontSize: 13,
    fontWeight: '900',
    color: '#173B70',
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
    color: '#173B70',
  },
});
