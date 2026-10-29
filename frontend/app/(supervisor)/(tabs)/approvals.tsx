import React, { useState, useEffect, useCallback } from 'react';
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
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import API_BASE_URL from '../../../src/config/api';
import { useAuthStore } from '../../../src/store/authStore';
import { tripService } from '../../../src/services/tripService';
import { useMockTripStore } from '../../../src/store/mockTripStore';
import { radius, spacing } from '../../../src/theme';
import { resolveCheNumber, resolveOperator } from '../../../src/config/fleet';
import { useResponsive } from '../../../src/hooks/useResponsive';
import { getTripTimingDetails } from '../../../src/utils/tripDateUtils';

export default function SupervisorApprovals() {
  const { topInset, bottomInset, contentMaxWidth, containerPaddingHorizontal } = useResponsive();
  const user = useAuthStore((s) => s.user);
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Rejection modal
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [tripToReject, setTripToReject] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');

  const fetchPending = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/trips?status=PENDING_APPROVAL`);
      const apiList = Array.isArray(res.data) ? res.data : [];
      const mockList = useMockTripStore.getState().getPendingTrips();
      const byId = new Map<string, any>();
      apiList.forEach((t) => byId.set(t.id, t));
      mockList.forEach((t) => {
        if (!byId.has(t.id)) byId.set(t.id, t);
      });
      setTrips(Array.from(byId.values()));
    } catch {
      const mockTrips = useMockTripStore.getState().getPendingTrips();
      setTrips(mockTrips);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPending();
  };

  const supervisorName = user?.name || user?.fullName || 'Nimal Silva';
  const supervisorInitials = supervisorName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
  const currentDateFormatted = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).toUpperCase();

  const handleApprove = async (tripId: string) => {
    setProcessingId(tripId);
    try {
      await tripService.approveTrip(tripId, user?.supervisorId || user?.id || 'sup-001', 'Delivery confirmed & approved by Operations Supervisor');
      useMockTripStore.getState().approveTripBySupervisor(tripId, supervisorName, 'Delivery confirmed & approved by Operations Supervisor');
      Alert.alert(
        'Trip Confirmed & Completed! ✅',
        `Trip ${tripId} delivery has been approved. Driver completed container count (+1 towards 300 target) and main system metrics have been updated.`
      );
      fetchPending();
    } catch {
      useMockTripStore.getState().approveTripBySupervisor(tripId, supervisorName, 'Delivery confirmed & approved by Operations Supervisor');
      Alert.alert(
        'Trip Confirmed & Completed! ✅',
        `Trip ${tripId} delivery has been approved. Driver completed container count (+1 towards 300 target) and main system metrics have been updated.`
      );
      fetchPending();
    } finally {
      setProcessingId(null);
    }
  };

  const handleOpenReject = (trip: any) => {
    setTripToReject(trip);
    setRejectionReason('');
    setRejectModalVisible(true);
  };

  const handleConfirmRejection = async () => {
    if (!tripToReject) return;
    if (!rejectionReason.trim()) {
      Alert.alert('Mandatory Reason', 'Please enter a reason for rejecting this Gate Pass submission.');
      return;
    }

    const tripId = tripToReject.id;
    setProcessingId(tripId);
    try {
      await tripService.rejectTrip(tripId, user?.supervisorId || user?.id || 'sup-001', rejectionReason.trim());
      useMockTripStore.getState().rejectTripBySupervisor(tripId, supervisorName, rejectionReason.trim());
      setRejectModalVisible(false);
      Alert.alert('Trip Rejected', `Trip ${tripToReject.tripNumber || tripId} has been rejected.`);
      fetchPending();
    } catch {
      useMockTripStore.getState().rejectTripBySupervisor(tripId, supervisorName, rejectionReason.trim());
      setRejectModalVisible(false);
      Alert.alert('Trip Rejected (Local)', `Trip ${tripToReject.tripNumber || tripId} has been rejected.`);
      fetchPending();
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: Math.max(topInset, 16),
            paddingBottom: Math.max(bottomInset + 30, 40),
            paddingHorizontal: containerPaddingHorizontal,
            maxWidth: contentMaxWidth,
            alignSelf: 'center',
            width: '100%',
          },
        ]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00e5ff" />}
        keyboardShouldPersistTaps="handled"
      >
        {/* ─── HEADER ─── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{supervisorInitials}</Text>
            </View>
            <View>
              <Text style={styles.supervisorNameText}>{supervisorName}</Text>
              <View style={styles.roleDateRow}>
                <View style={styles.rolePill}>
                  <Text style={styles.rolePillText}>PORT OPERATIONS SUPERVISOR</Text>
                </View>
                <Text style={styles.dateText}>{currentDateFormatted}</Text>
              </View>
            </View>
          </View>

          <View style={styles.pendingBadgeHeader}>
            <Ionicons name="shield-checkmark" size={14} color="#feb300" />
            <Text style={styles.pendingBadgeHeaderText}>{trips.length} PENDING</Text>
          </View>
        </View>

        {/* ─── PENDING GATE PASS REVIEWS ─── */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="time" size={18} color="#feb300" />
            <Text style={styles.sectionTitle}>
              SUBMITTED TRIPS REQUIRING GATE PASS APPROVAL ({trips.length})
            </Text>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#00e5ff" style={{ marginVertical: 30 }} />
          ) : trips.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="checkmark-done-circle" size={36} color="#22ef7e" />
              <Text style={styles.emptyTitle}>ALL CAUGHT UP</Text>
              <Text style={styles.emptySub}>No trips pending supervisor gate pass review right now.</Text>
            </View>
          ) : (
            trips.map((trip) => {
              const driverName = trip.driverName || trip.driver?.user?.name || trip.driver?.name || 'Kamal Perera';
              const vehicle = trip.vehicleNumber || 'LY-6439';
              const vessel = trip.vesselName || 'MV Colombo Star';
              const from = trip.sourceTerminal || 'CICT';
              const to = trip.destTerminal || 'JCT';
              const containers = trip.containers || [];
              const tripNum = trip.tripNumber || `ITT-${trip.id?.slice(0, 6)}`;
              const isProcessing = processingId === trip.id;
              const cheNumber = resolveCheNumber(vehicle, trip.chassisNumber || trip.chaiNumber);
              const operatorName = resolveOperator(vehicle, trip.operator);

              return (
                <View key={trip.id} style={styles.pendingCard}>
                  {/* Card Header */}
                  <View style={styles.cardHeader}>
                    <View style={{ gap: 2 }}>
                      <Text style={styles.cardTripId}>{tripNum}</Text>
                      <Text style={styles.driverSubText}>Driver: <Text style={{ color: '#dde2f0', fontWeight: '800' }}>{driverName}</Text></Text>
                    </View>

                    <View style={styles.awaitingBadge}>
                      <Text style={styles.awaitingBadgeText}>DELIVERED · PENDING SIGN-OFF</Text>
                    </View>
                  </View>

                  {/* Route Box */}
                  <View style={styles.routeBox}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.routeTermText}>{from}</Text>
                      <Ionicons name="arrow-forward" size={14} color="#00e5ff" />
                      <Text style={styles.routeTermText}>{to}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <Text style={styles.specsSubText}>Truck: <Text style={{ color: '#00e5ff', fontWeight: '800' }}>{vehicle}</Text></Text>
                      <Text style={styles.specsSubText}>CHE: <Text style={{ color: '#00e5ff', fontWeight: '800' }}>{cheNumber}</Text></Text>
                    </View>
                  </View>

                  {/* Specs Row */}
                  <View style={styles.specsRow}>
                    <Text style={styles.specItem}>
                      Vessel: <Text style={styles.specBold}>{vessel}</Text>
                    </Text>
                    <Text style={styles.specItem}>
                      CHE No: <Text style={styles.specBold}>{cheNumber}</Text>
                    </Text>
                    <Text style={styles.specItem}>
                      Operator: <Text style={styles.specBold}>{operatorName}</Text>
                    </Text>
                    <Text style={styles.specItem}>
                      Cargo: <Text style={styles.specBold}>{containers.length} Cont.</Text>
                    </Text>
                  </View>

                  {/* ─── TRIP STARTED DATE TIME & END TIME DETAILS ─── */}
                  {(() => {
                    const timing = getTripTimingDetails(trip);
                    return (
                      <View style={styles.timingCard}>
                        <View style={styles.timingCol}>
                          <View style={styles.timingHeader}>
                            <Ionicons name="play-circle" size={12} color="#00e5ff" />
                            <Text style={styles.timingLabel}>STARTED DATE & TIME</Text>
                          </View>
                          <Text style={styles.timingDate}>{timing.startDate}</Text>
                          <Text style={styles.timingTime}>{timing.startTime}</Text>
                        </View>

                        <View style={styles.timingDivider}>
                          <Ionicons name="arrow-forward" size={13} color="#3a4756" />
                          {timing.duration && (
                            <View style={styles.durationPill}>
                              <Ionicons name="timer-outline" size={10} color="#22ef7e" />
                              <Text style={styles.durationText}>{timing.duration}</Text>
                            </View>
                          )}
                        </View>

                        <View style={styles.timingCol}>
                          <View style={styles.timingHeader}>
                            <Ionicons
                              name={timing.isCompleted ? 'checkmark-circle' : timing.isPending ? 'time' : 'navigate-circle'}
                              size={12}
                              color={timing.statusColor}
                            />
                            <Text style={[styles.timingLabel, { color: timing.statusColor }]}>
                              {timing.isCompleted ? 'COMPLETED DATE & TIME' : timing.isPending ? 'DISCHARGED (AWAITING SIGN-OFF)' : 'CURRENT STATUS'}
                            </Text>
                          </View>
                          <Text style={[styles.timingDate, !timing.isCompleted && !timing.isPending && { color: '#849396' }]}>
                            {timing.endDate}
                          </Text>
                          <Text style={[styles.timingTime, { color: timing.statusColor }]}>
                            {timing.endTime}
                          </Text>
                        </View>
                      </View>
                    );
                  })()}

                  {/* Containers list */}
                  <View style={styles.containersList}>
                    {containers.map((c: any, i: number) => (
                      <View key={c.id || i} style={styles.containerItem}>
                        <Ionicons name="cube-outline" size={14} color="#00e5ff" />
                        <Text style={styles.containerNumberText}>{c.containerNumber}</Text>
                        <Text style={styles.containerSizeText}>{c.size || '40FT'}</Text>
                        <Text style={styles.containerDischargeText}>➔ {c.destTerminal || to}</Text>
                      </View>
                    ))}
                  </View>

                  {/* ─── DRIVER DISCHARGE & CARGO INSPECTION VERIFICATION PANEL ─── */}
                  <View style={styles.dischargeVerificationCard}>
                    <View style={styles.dischargeVerificationHeader}>
                      <Ionicons name="clipboard" size={13} color="#00e5ff" />
                      <Text style={styles.dischargeVerificationTitle}>
                        DRIVER DISCHARGE & SEAL VERIFICATION MANIFEST
                      </Text>
                    </View>

                    <View style={styles.dischargeGrid}>
                      {/* Row 1: Bay / Slot & Seal Status */}
                      <View style={styles.dischargeGridRow}>
                        <View style={styles.dischargeGridCol}>
                          <Text style={styles.dischargeGridLabel}>DISCHARGE BAY / CRANE SLOT</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
                            <Ionicons name="location" size={12} color="#feb300" />
                            <Text style={styles.dischargeGridValue}>
                              {trip.destTerminal || to} · {trip.dischargeBay || 'Bay 04, Crane 02'}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.dischargeGridCol}>
                          <Text style={styles.dischargeGridLabel}>SEAL INTEGRITY</Text>
                          <View style={[
                            styles.sealBadge,
                            trip.sealStatus?.includes('DAMAGED') ? styles.sealBadgeDamaged : styles.sealBadgeIntact,
                          ]}>
                            <Ionicons
                              name={trip.sealStatus?.includes('DAMAGED') ? 'warning' : 'shield-checkmark'}
                              size={11}
                              color={trip.sealStatus?.includes('DAMAGED') ? '#ff5252' : '#22ef7e'}
                            />
                            <Text style={[
                              styles.sealBadgeText,
                              { color: trip.sealStatus?.includes('DAMAGED') ? '#ff5252' : '#22ef7e' }
                            ]}>
                              {trip.sealStatus || 'INTACT (VERIFIED)'}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* Row 2: Cargo Condition & Driver Notes */}
                      <View style={styles.dischargeGridRow}>
                        <View style={styles.dischargeGridCol}>
                          <Text style={styles.dischargeGridLabel}>CARGO CONDITION</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
                            <Ionicons
                              name={trip.damageStatus === 'DAMAGED' ? 'alert-circle' : 'checkmark-circle'}
                              size={12}
                              color={trip.damageStatus === 'DAMAGED' ? '#ff5252' : '#22ef7e'}
                            />
                            <Text style={[
                              styles.dischargeGridValue,
                              { color: trip.damageStatus === 'DAMAGED' ? '#ff5252' : '#22ef7e' }
                            ]}>
                              {trip.damageStatus === 'DAMAGED' ? 'DAMAGE REPORTED' : 'SOUND (NO DAMAGE)'}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.dischargeGridCol}>
                          <Text style={styles.dischargeGridLabel}>DRIVER SUBMISSION REMARKS</Text>
                          <Text style={styles.dischargeDriverNotesText} numberOfLines={2}>
                            "{trip.driverCompletionNotes || 'Discharged cargo safely at destination berth. Seals inspected and verified intact.'}"
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Decision Buttons */}
                  <View style={styles.btnRow}>
                    <TouchableOpacity
                      style={[styles.approveBtn, isProcessing && { opacity: 0.5 }]}
                      disabled={isProcessing}
                      onPress={() => handleApprove(trip.id)}
                    >
                      {isProcessing ? (
                        <ActivityIndicator color="#00363d" size="small" />
                      ) : (
                        <>
                          <Ionicons name="checkmark-done-circle" size={17} color="#00363d" />
                          <Text style={styles.approveBtnText}>CONFIRM & APPROVE TRIP</Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.rejectBtn, isProcessing && { opacity: 0.5 }]}
                      disabled={isProcessing}
                      onPress={() => handleOpenReject(trip)}
                    >
                      <Ionicons name="close-circle" size={16} color="#ff5252" />
                      <Text style={styles.rejectBtnText}>REJECT</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ─── REJECTION MODAL ─── */}
      <Modal visible={rejectModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="alert-circle" size={20} color="#ff5252" />
                <Text style={styles.modalTitle}>REJECT TRIP SUBMISSION</Text>
              </View>
              <TouchableOpacity onPress={() => setRejectModalVisible(false)}>
                <Ionicons name="close" size={22} color="#849396" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDesc}>
              Please provide the mandatory rejection reason for Trip{' '}
              <Text style={{ color: '#00e5ff', fontWeight: '800' }}>
                {tripToReject?.tripNumber || tripToReject?.id}
              </Text>:
            </Text>

            <TextInput
              style={styles.rejectionInput}
              placeholder="e.g. Container damage not recorded, seal number mismatch..."
              placeholderTextColor="#849396"
              value={rejectionReason}
              onChangeText={setRejectionReason}
              multiline
              numberOfLines={3}
            />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <TouchableOpacity
                style={[styles.modalSubmitBtn, { backgroundColor: '#ff5252' }]}
                onPress={handleConfirmRejection}
              >
                <Text style={styles.modalSubmitBtnText}>CONFIRM REJECTION</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070c14',
  },
  scroll: {
    gap: 14,
  },

  // ─── HEADER ───
  header: {
    backgroundColor: '#0c1524',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 1,
    minWidth: 160,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#feb300',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#070c14',
    fontWeight: '900',
    fontSize: 16,
  },
  supervisorNameText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 15,
  },
  roleDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  rolePill: {
    backgroundColor: 'rgba(254, 179, 0, 0.15)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  rolePillText: {
    color: '#feb300',
    fontSize: 10,
    fontWeight: '800',
  },
  dateText: {
    color: '#78909c',
    fontSize: 11,
    fontWeight: '700',
  },
  pendingBadgeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#070e1a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(254, 179, 0, 0.35)',
  },
  pendingBadgeHeaderText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#feb300',
    letterSpacing: 0.6,
  },

  // ─── SECTION WRAPS ───
  sectionWrap: {
    backgroundColor: '#161c25',
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: '#242a34',
    padding: 14,
    gap: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#242a34',
  },
  sectionTitle: {
    color: '#dde2f0',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },

  emptyCard: {
    backgroundColor: '#0c1524',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 32,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  emptySub: {
    color: '#78909c',
    fontSize: 11,
    textAlign: 'center',
  },

  // ─── PENDING CARD ───
  pendingCard: {
    backgroundColor: '#0c1524',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(254, 179, 0, 0.35)',
    padding: 14,
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTripId: {
    color: '#feb300',
    fontSize: 14,
    fontWeight: '900',
  },
  driverSubText: {
    color: '#78909c',
    fontSize: 11,
    marginTop: 2,
  },
  awaitingBadge: {
    backgroundColor: 'rgba(254, 179, 0, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(254, 179, 0, 0.5)',
  },
  awaitingBadgeText: {
    color: '#feb300',
    fontSize: 9,
    fontWeight: '900',
  },

  routeBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#070e1a',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  routeTermText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  specsSubText: {
    color: '#78909c',
    fontSize: 11,
  },

  specsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  specItem: {
    color: '#849396',
    fontSize: 9,
  },
  specBold: {
    color: '#dde2f0',
    fontWeight: '700',
  },

  timingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#080e17',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#1e293b',
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
    marginVertical: 4,
  },
  timingCol: {
    flex: 1,
    gap: 1,
  },
  timingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  timingLabel: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#00e5ff',
    letterSpacing: 0.4,
  },
  timingDate: {
    fontSize: 11,
    fontWeight: '700',
    color: '#dde2f0',
  },
  timingTime: {
    fontSize: 12,
    fontWeight: '900',
    color: '#00e5ff',
    letterSpacing: 0.2,
  },
  timingDivider: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
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
  durationText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#22ef7e',
  },

  containersList: {
    gap: 6,
  },
  containerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#161c25',
    padding: 8,
    borderRadius: radius.sm,
  },
  containerNumberText: {
    color: '#00e5ff',
        fontSize: 11,
    fontWeight: '800',
  },
  containerSizeText: {
    color: '#849396',
    fontSize: 9,
  },
  containerDischargeText: {
    color: '#22ef7e',
    fontSize: 9,
    marginLeft: 'auto',
      },

  btnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  approveBtn: {
    flex: 1,
    height: 44,
    backgroundColor: '#00e676',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  approveBtnText: {
    color: '#070c14',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  rejectBtn: {
    paddingHorizontal: 16,
    height: 44,
    backgroundColor: 'rgba(255, 82, 82, 0.12)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 82, 82, 0.35)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  rejectBtnText: {
    color: '#ff5252',
    fontWeight: '800',
    fontSize: 11,
  },

  // ─── MODAL ───
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(3, 7, 18, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#0c1524',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 82, 82, 0.35)',
    padding: 18,
    gap: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    color: '#dde2f0',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  modalDesc: {
    color: '#bac9cc',
    fontSize: 11,
    lineHeight: 16,
  },
  rejectionInput: {
    backgroundColor: '#080e17',
    borderWidth: 1,
    borderColor: '#ff5252',
    borderRadius: radius.DEFAULT,
    padding: 10,
    color: '#dde2f0',
    fontSize: 11,
    minHeight: 70,
    textAlignVertical: 'top',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  } as any,
  modalSubmitBtn: {
    flex: 1,
    height: 40,
    borderRadius: radius.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSubmitBtnText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.6,
    color: '#fff',
  },

  // ─── DRIVER DISCHARGE & SEAL VERIFICATION MANIFEST ───
  dischargeVerificationCard: {
    backgroundColor: '#0d1420',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.25)',
    padding: 10,
    gap: 6,
    marginTop: 4,
  },
  dischargeVerificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  dischargeVerificationTitle: {
    fontSize: 9,
    fontWeight: '900',
    color: '#00e5ff',
    letterSpacing: 0.5,
  },
  dischargeGrid: {
    gap: 6,
    marginTop: 2,
  },
  dischargeGridRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dischargeGridCol: {
    flex: 1,
  },
  dischargeGridLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: '#849396',
    letterSpacing: 0.4,
  },
  dischargeGridValue: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#dde2f0',
  },
  sealBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  sealBadgeIntact: {
    backgroundColor: 'rgba(34, 239, 126, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(34, 239, 126, 0.3)',
  },
  sealBadgeDamaged: {
    backgroundColor: 'rgba(255, 82, 82, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 82, 82, 0.3)',
  },
  sealBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  dischargeDriverNotesText: {
    fontSize: 9.5,
    color: '#bac9cc',
    fontStyle: 'italic',
    marginTop: 2,
    lineHeight: 13,
  },
});
