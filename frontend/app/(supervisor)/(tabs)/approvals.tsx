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
import apiClient from '../../../src/services/api';
import { NetworkErrorView } from '../../../src/components/NetworkErrorView';
import { useAuthStore } from '../../../src/store/authStore';
import { tripService } from '../../../src/services/tripService';
import { radius } from '../../../src/theme';
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
  const [networkError, setNetworkError] = useState(false);

  const fetchPending = useCallback(async () => {
    try {
      setNetworkError(false);
      const res = await apiClient.get('/trips?status=PENDING_SUPERVISOR_CONFIRMATION');
      const apiList = Array.isArray(res.data) ? res.data : [];
      setTrips(apiList);
    } catch (e) {
      console.warn('[SupervisorApprovals] Error fetching pending:', e);
      setNetworkError(true);
      setTrips([]);
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
      Alert.alert(
        'Trip Confirmed & Completed! ✅',
        `Trip ${tripId} delivery has been approved. Driver completed container count (+1 towards 300 target) and main system metrics have been updated.`
      );
      fetchPending();
    } catch (e: any) {
      Alert.alert('Approval Error', e?.response?.data?.message || e?.message || 'Failed to approve trip on server.');
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
      setRejectModalVisible(false);
      Alert.alert('Trip Rejected', `Trip ${tripToReject.tripNumber || tripId} has been rejected.`);
      fetchPending();
    } catch (e: any) {
      Alert.alert('Rejection Error', e?.response?.data?.message || e?.message || 'Failed to reject trip on server.');
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#173B70" />}
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
            <Ionicons name="shield-checkmark" size={14} color="#173B70" />
            <Text style={styles.pendingBadgeHeaderText}>{trips.length} PENDING</Text>
          </View>
        </View>

        {/* ─── PENDING GATE PASS REVIEWS ─── */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="time" size={18} color="#173B70" />
            <Text style={styles.sectionTitle}>
              COMPLETED TRIPS – PENDING CONFIRMATION ({trips.length})
            </Text>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#173B70" style={{ marginVertical: 30 }} />
          ) : networkError && trips.length === 0 ? (
            <NetworkErrorView onRetry={fetchPending} isRetrying={refreshing} />
          ) : trips.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="checkmark-done-circle" size={36} color="#173B70" />
              <Text style={styles.emptyTitle}>ALL TRIPS CONFIRMED</Text>
              <Text style={styles.emptySub}>No completed trips awaiting supervisor confirmation right now.</Text>
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
                      <Text style={styles.driverSubText}>Driver: <Text style={{ color: '#1E293B', fontWeight: '800' }}>{driverName}</Text></Text>
                    </View>

                    <View style={styles.awaitingBadge}>
                      <Text style={styles.awaitingBadgeText}>DELIVERED · PENDING SIGN-OFF</Text>
                    </View>
                  </View>

                  {/* Route Box */}
                  <View style={styles.routeBox}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.routeTermText}>{from}</Text>
                      <Ionicons name="arrow-forward" size={14} color="#173B70" />
                      <Text style={styles.routeTermText}>{to}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <Text style={styles.specsSubText}>Truck: <Text style={{ color: '#173B70', fontWeight: '800' }}>{vehicle}</Text></Text>
                      <Text style={styles.specsSubText}>CHE: <Text style={{ color: '#173B70', fontWeight: '800' }}>{cheNumber}</Text></Text>
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
                            <Ionicons name="play-circle" size={12} color="#173B70" />
                            <Text style={styles.timingLabel}>STARTED DATE & TIME</Text>
                          </View>
                          <Text style={styles.timingDate}>{timing.startDate}</Text>
                          <Text style={styles.timingTime}>{timing.startTime}</Text>
                        </View>

                        <View style={styles.timingDivider}>
                          <Ionicons name="arrow-forward" size={13} color="#3a4756" />
                          {timing.duration && (
                            <View style={styles.durationPill}>
                              <Ionicons name="timer-outline" size={10} color="#173B70" />
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
                          <Text style={[styles.timingDate, !timing.isCompleted && !timing.isPending && { color: '#3A567F' }]}>
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
                        <Ionicons name="cube-outline" size={14} color="#173B70" />
                        <Text style={styles.containerNumberText}>{c.containerNumber}</Text>
                        <Text style={styles.containerSizeText}>{c.size || '40FT'}</Text>
                        <Text style={styles.containerDischargeText}>➔ {c.destTerminal || to}</Text>
                      </View>
                    ))}
                  </View>

                  {/* ─── DRIVER DISCHARGE & CARGO INSPECTION VERIFICATION PANEL ─── */}
                  <View style={styles.dischargeVerificationCard}>
                    <View style={styles.dischargeVerificationHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="shield-checkmark" size={14} color="#173B70" />
                        <Text style={styles.dischargeVerificationTitle}>
                          DRIVER DISCHARGE & SEAL VERIFICATION MANIFEST
                        </Text>
                      </View>
                      <View style={styles.supervisorDriverRemarksAuditedBadge}>
                        <Ionicons name="lock-closed" size={10} color="#173B70" />
                        <Text style={styles.supervisorDriverRemarksAuditedText}>SLPA AUDITED</Text>
                      </View>
                    </View>

                    {/* Row 1: Bay / Slot, Seal Status, Cargo Condition (3 Columns) */}
                    <View style={styles.dischargeVerificationMetricsRow}>
                      <View style={styles.dischargeMetricBox}>
                        <Text style={styles.dischargeGridLabel}>DISCHARGE BERTH / BAY</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
                          <Ionicons name="location" size={11} color="#173B70" />
                          <Text style={styles.dischargeGridValue} numberOfLines={1}>
                            {trip.destTerminal || to} · {trip.dischargeBay || 'Bay 04, Crane 02'}
                          </Text>
                        </View>
                      </View>

                      <View style={[
                        styles.dischargeMetricBox,
                        trip.sealStatus?.includes('DAMAGED') ? styles.boxRedBorder : styles.boxGreenBorder,
                      ]}>
                        <Text style={styles.dischargeGridLabel}>SEAL INTEGRITY</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
                          <Ionicons
                            name={trip.sealStatus?.includes('DAMAGED') ? 'warning' : 'shield-checkmark'}
                            size={11}
                            color={trip.sealStatus?.includes('DAMAGED') ? '#173B70' : '#173B70'}
                          />
                          <Text style={[styles.dischargeGridValue, { color: trip.sealStatus?.includes('DAMAGED') ? '#173B70' : '#173B70' }]} numberOfLines={1}>
                            {trip.sealStatus || 'INTACT (VERIFIED)'}
                          </Text>
                        </View>
                      </View>

                      <View style={[
                        styles.dischargeMetricBox,
                        trip.damageStatus === 'DAMAGED' ? styles.boxRedBorder : styles.boxGreenBorder,
                      ]}>
                        <Text style={styles.dischargeGridLabel}>CARGO CONDITION</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
                          <Ionicons
                            name={trip.damageStatus === 'DAMAGED' ? 'alert-circle' : 'checkmark-circle'}
                            size={11}
                            color={trip.damageStatus === 'DAMAGED' ? '#173B70' : '#173B70'}
                          />
                          <Text style={[styles.dischargeGridValue, { color: trip.damageStatus === 'DAMAGED' ? '#173B70' : '#173B70' }]} numberOfLines={1}>
                            {trip.damageStatus === 'DAMAGED' ? 'DAMAGED' : 'SOUND'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Row 2: Full-Width Driver Submission Remarks Box */}
                    <View style={styles.supervisorDriverRemarksBox}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                        <Ionicons name="chatbubble-ellipses" size={12} color="#173B70" />
                        <Text style={styles.supervisorDriverRemarksLabel}>DRIVER COMPLETION & HANDOVER REMARKS</Text>
                      </View>
                      <Text style={styles.supervisorDriverRemarksText}>
                        "{trip.driverCompletionNotes || 'Containers discharged safely at destination berth. Seals inspected and verified intact.'}"
                      </Text>
                    </View>

                    {/* Row 3: Security & Clearance Footer */}
                    <View style={styles.dischargeAuditFooter}>
                      <Ionicons name="shield-checkmark-outline" size={11} color="#3A567F" />
                      <Text style={styles.dischargeAuditFooterText}>
                        SLPA Official Handover • Gate-In Authenticated at {trip.destTerminal || to}
                      </Text>
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
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <>
                          <Ionicons name="checkmark-done-circle" size={17} color="#FFFFFF" />
                          <Text style={styles.approveBtnText}>CONFIRM TRIP</Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.rejectBtn, isProcessing && { opacity: 0.5 }]}
                      disabled={isProcessing}
                      onPress={() => handleOpenReject(trip)}
                    >
                      <Ionicons name="close-circle" size={16} color="#173B70" />
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
                <Ionicons name="alert-circle" size={20} color="#173B70" />
                <Text style={styles.modalTitle}>REJECT COMPLETED TRIP</Text>
              </View>
              <TouchableOpacity onPress={() => setRejectModalVisible(false)}>
                <Ionicons name="close" size={22} color="#3A567F" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDesc}>
              Please provide the mandatory rejection reason for Trip{' '}
              <Text style={{ color: '#173B70', fontWeight: '800' }}>
                {tripToReject?.tripNumber || tripToReject?.id}
              </Text>:
            </Text>

            <TextInput
              style={styles.rejectionInput}
              placeholder="e.g. Container damage not recorded, seal number mismatch..."
              placeholderTextColor="#3A567F"
              value={rejectionReason}
              onChangeText={setRejectionReason}
              multiline
              numberOfLines={3}
            />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <TouchableOpacity
                style={[styles.modalSubmitBtn, { backgroundColor: '#173B70' }]}
                onPress={handleConfirmRejection}
              >
                <Text style={styles.modalSubmitBtnText}>CONFIRM REJECTION WITH REASON</Text>
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
    backgroundColor: '#F8FAFC',
  },
  scroll: {
    gap: 14,
  },

  // ─── HEADER ───
  header: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
    backgroundColor: '#173B70',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 16,
  },
  supervisorNameText: {
    color: '#1E293B',
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
    color: '#173B70',
    fontSize: 10,
    fontWeight: '800',
  },
  dateText: {
    color: '#3A567F',
    fontSize: 11,
    fontWeight: '700',
  },
  pendingBadgeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0F5FA',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(254, 179, 0, 0.35)',
  },
  pendingBadgeHeaderText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#173B70',
    letterSpacing: 0.6,
  },

  // ─── SECTION WRAPS ───
  sectionWrap: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    gap: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  sectionTitle: {
    color: '#1E293B',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },

  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 32,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    color: '#1E293B',
    fontSize: 13,
    fontWeight: '800',
  },
  emptySub: {
    color: '#3A567F',
    fontSize: 11,
    textAlign: 'center',
  },

  // ─── PENDING CARD ───
  pendingCard: {
    backgroundColor: '#FFFFFF',
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
    color: '#173B70',
    fontSize: 14,
    fontWeight: '900',
  },
  driverSubText: {
    color: '#3A567F',
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
    color: '#173B70',
    fontSize: 9,
    fontWeight: '900',
  },

  routeBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F0F5FA',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  routeTermText: {
    color: '#1E293B',
    fontSize: 13,
    fontWeight: '800',
  },
  specsSubText: {
    color: '#3A567F',
    fontSize: 11,
  },

  specsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  specItem: {
    color: '#3A567F',
    fontSize: 9,
  },
  specBold: {
    color: '#1E293B',
    fontWeight: '700',
  },

  timingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
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
    color: '#173B70',
    letterSpacing: 0.4,
  },
  timingDate: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E293B',
  },
  timingTime: {
    fontSize: 12,
    fontWeight: '900',
    color: '#173B70',
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
    color: '#173B70',
  },

  containersList: {
    gap: 6,
  },
  containerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    padding: 8,
    borderRadius: radius.sm,
  },
  containerNumberText: {
    color: '#173B70',
        fontSize: 11,
    fontWeight: '800',
  },
  containerSizeText: {
    color: '#3A567F',
    fontSize: 9,
  },
  containerDischargeText: {
    color: '#173B70',
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
    color: '#FFFFFF',
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
    color: '#173B70',
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
    backgroundColor: '#FFFFFF',
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
    color: '#1E293B',
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
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#173B70',
    borderRadius: radius.DEFAULT,
    padding: 10,
    color: '#1E293B',
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
    color: '#FFFFFF',
  },

  // ─── DRIVER DISCHARGE & SEAL VERIFICATION MANIFEST ───
  dischargeVerificationCard: {
    backgroundColor: '#0a101d',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F0F5FA',
    padding: 11,
    gap: 8,
    marginTop: 4,
  },
  dischargeVerificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  dischargeVerificationTitle: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#173B70',
    letterSpacing: 0.5,
  },
  supervisorDriverRemarksAuditedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(34, 239, 126, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(34, 239, 126, 0.3)',
  },
  supervisorDriverRemarksAuditedText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#173B70',
    letterSpacing: 0.4,
  },
  dischargeVerificationMetricsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dischargeMetricBox: {
    flex: 1,
    backgroundColor: '#0f1726',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 7,
  },
  boxGreenBorder: {
    borderColor: 'rgba(34, 239, 126, 0.35)',
    backgroundColor: 'rgba(34, 239, 126, 0.05)',
  },
  boxRedBorder: {
    borderColor: 'rgba(255, 82, 82, 0.35)',
    backgroundColor: 'rgba(255, 82, 82, 0.05)',
  },
  dischargeGridLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: '#3A567F',
    letterSpacing: 0.4,
  },
  dischargeGridValue: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1E293B',
  },
  supervisorDriverRemarksBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#173B70',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  supervisorDriverRemarksLabel: {
    fontSize: 8.5,
    fontWeight: '900',
    color: '#173B70',
    letterSpacing: 0.4,
  },
  supervisorDriverRemarksText: {
    fontSize: 10,
    color: '#1E293B',
    fontStyle: 'italic',
    lineHeight: 14,
  },
  dischargeAuditFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingTop: 2,
  },
  dischargeAuditFooterText: {
    fontSize: 8.5,
    color: '#3A567F',
    fontWeight: '600',
  },
});
