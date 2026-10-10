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
import { useMockTripStore } from '../../../src/store/mockTripStore';
import { tripService } from '../../../src/services/tripService';
import { radius, spacing } from '../../../src/theme';

export default function SupervisorApprovals() {
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

  const handleApprove = async (tripId: string) => {
    setProcessingId(tripId);
    try {
      await tripService.approveTrip(tripId, user?.supervisorId || user?.id || 'sup-001', 'Approved by Operations Supervisor');
      useMockTripStore.getState().updateTripStatus(tripId, 'APPROVED');
      Alert.alert('Gate Pass Approved', `Trip ${tripId} has been approved.`);
      fetchPending();
    } catch {
      useMockTripStore.getState().updateTripStatus(tripId, 'APPROVED');
      Alert.alert('Gate Pass Approved (Local)', `Trip ${tripId} has been approved.`);
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
      useMockTripStore.getState().updateTripStatus(tripId, 'REJECTED');
      setRejectModalVisible(false);
      Alert.alert('Trip Rejected', `Trip ${tripToReject.tripNumber || tripId} has been rejected.`);
      fetchPending();
    } catch {
      useMockTripStore.getState().updateTripStatus(tripId, 'REJECTED');
      setRejectModalVisible(false);
      Alert.alert('Trip Rejected (Local)', `Trip ${tripToReject.tripNumber || tripId} has been rejected.`);
      fetchPending();
    } finally {
      setProcessingId(null);
    }
  };

  const supervisorName = user?.name || user?.fullName || 'Nimal Silva';
  const supervisorInitials = supervisorName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
  const currentDateFormatted = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).toUpperCase();

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
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
              const vehicle = trip.vehicleNumber || 'WP-BA-1234';
              const vessel = trip.vesselName || 'MV Colombo Star';
              const from = trip.sourceTerminal || 'CICT';
              const to = trip.destTerminal || 'JCT';
              const containers = trip.containers || [];
              const tripNum = trip.tripNumber || `ITT-${trip.id?.slice(0, 6)}`;
              const isProcessing = processingId === trip.id;

              return (
                <View key={trip.id} style={styles.pendingCard}>
                  {/* Card Header */}
                  <View style={styles.cardHeader}>
                    <View style={{ gap: 2 }}>
                      <Text style={styles.cardTripId}>{tripNum}</Text>
                      <Text style={styles.driverSubText}>Driver: <Text style={{ color: '#dde2f0', fontWeight: '800' }}>{driverName}</Text></Text>
                    </View>

                    <View style={styles.awaitingBadge}>
                      <Text style={styles.awaitingBadgeText}>AWAITING REVIEW</Text>
                    </View>
                  </View>

                  {/* Route Box */}
                  <View style={styles.routeBox}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.routeTermText}>{from}</Text>
                      <Ionicons name="arrow-forward" size={14} color="#00e5ff" />
                      <Text style={styles.routeTermText}>{to}</Text>
                    </View>
                    <Text style={styles.specsSubText}>Truck: <Text style={{ color: '#dde2f0' }}>{vehicle}</Text></Text>
                  </View>

                  {/* Specs Row */}
                  <View style={styles.specsRow}>
                    <Text style={styles.specItem}>
                      Vessel: <Text style={styles.specBold}>{vessel}</Text>
                    </Text>
                    <Text style={styles.specItem}>
                      Chai: <Text style={styles.specBold}>{trip.chassisNumber || trip.chaiNumber || 'CHAI-102'}</Text>
                    </Text>
                    <Text style={styles.specItem}>
                      Cargo: <Text style={styles.specBold}>{containers.length} Container{containers.length !== 1 ? 's' : ''}</Text>
                    </Text>
                  </View>

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
                          <Ionicons name="shield-checkmark" size={16} color="#00363d" />
                          <Text style={styles.approveBtnText}>APPROVE GATE PASS</Text>
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
    backgroundColor: '#0e141d',
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 40,
    gap: 14,
  },

  // ─── HEADER ───
  header: {
    backgroundColor: '#161c25',
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: '#242a34',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
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
    color: '#00363d',
    fontWeight: '900',
    fontSize: 16,
  },
  supervisorNameText: {
    color: '#dde2f0',
    fontWeight: '800',
    fontSize: 14,
  },
  roleDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
    fontSize: 9,
    fontWeight: '800',
  },
  dateText: {
    color: '#849396',
    fontSize: 9,
        fontWeight: '700',
  },
  pendingBadgeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#080e17',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#feb300',
  },
  pendingBadgeHeaderText: {
    fontSize: 9,
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
    backgroundColor: '#080e17',
    borderRadius: radius.DEFAULT,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    color: '#dde2f0',
    fontSize: 12,
    fontWeight: '800',
  },
  emptySub: {
    color: '#849396',
    fontSize: 10,
    textAlign: 'center',
  },

  // ─── PENDING CARD ───
  pendingCard: {
    backgroundColor: '#080e17',
    borderRadius: radius.DEFAULT,
    borderWidth: 1.5,
    borderColor: '#feb300',
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
    fontSize: 13,
    fontWeight: '900',
      },
  driverSubText: {
    color: '#849396',
    fontSize: 10,
    marginTop: 2,
  },
  awaitingBadge: {
    backgroundColor: 'rgba(254, 179, 0, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#feb300',
  },
  awaitingBadgeText: {
    color: '#feb300',
    fontSize: 8,
    fontWeight: '900',
  },

  routeBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#161c25',
    padding: 8,
    borderRadius: radius.sm,
  },
  routeTermText: {
    color: '#dde2f0',
    fontSize: 12,
    fontWeight: '800',
  },
  specsSubText: {
    color: '#849396',
    fontSize: 10,
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
    height: 40,
    backgroundColor: '#00e5ff',
    borderRadius: radius.DEFAULT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  approveBtnText: {
    color: '#00363d',
    fontWeight: '900',
    fontSize: 11,
  },
  rejectBtn: {
    paddingHorizontal: 16,
    height: 40,
    backgroundColor: '#1a2029',
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: '#ff5252',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  rejectBtnText: {
    color: '#ff5252',
    fontWeight: '800',
    fontSize: 10,
  },

  // ─── MODAL ───
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#161c25',
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: '#242a34',
    padding: 16,
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
});
