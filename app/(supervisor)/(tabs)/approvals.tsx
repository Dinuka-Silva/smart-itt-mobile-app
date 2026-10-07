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
} from 'react-native';
import axios from 'axios';
import API_BASE_URL from '../../../src/config/api';
import { useAuthStore } from '../../../src/store/authStore';

export default function SupervisorApprovals() {
  const user = useAuthStore((s) => s.user);
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);

  const fetchPending = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/trips?status=PENDING_APPROVAL`);
      setTrips(Array.isArray(res.data) ? res.data : []);
    } catch {
      setTrips([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchPending(); }, [fetchPending]);

  const onRefresh = () => { setRefreshing(true); fetchPending(); };

  const handleApprove = async (tripId: string) => {
    setProcessingId(tripId);
    try {
      await axios.post(`${API_BASE_URL}/trips/${tripId}/approve`, {
        supervisorId: user?.supervisorId || user?.id,
        status: 'APPROVED',
      });
      const msg = 'Trip has been approved and completed successfully.';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('✓ Trip Approved', msg);
      fetchPending();
    } catch (e: any) {
      const msg = e?.response?.data?.message || 'Failed to approve trip';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Error', msg);
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectTarget) return;
    setProcessingId(rejectTarget);
    setRejectTarget(null);
    try {
      await axios.post(`${API_BASE_URL}/trips/${rejectTarget}/approve`, {
        supervisorId: user?.supervisorId || user?.id,
        status: 'REJECTED',
        reason: rejectReason.trim() || 'Rejected by supervisor',
      });
      const msg = 'Trip has been rejected.';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('✕ Trip Rejected', msg);
      setRejectReason('');
      fetchPending();
    } catch (e: any) {
      const msg = e?.response?.data?.message || 'Failed to reject trip';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Error', msg);
    } finally {
      setProcessingId(null);
    }
  };

  const openReject = (tripId: string) => {
    if (Platform.OS === 'web') {
      const reason = window.prompt('Enter rejection reason (optional):') || 'Rejected by supervisor';
      setRejectReason(reason);
      setRejectTarget(tripId);
      // Submit directly for web
      setTimeout(async () => {
        setProcessingId(tripId);
        try {
          await axios.post(`${API_BASE_URL}/trips/${tripId}/approve`, {
            supervisorId: user?.supervisorId || user?.id,
            status: 'REJECTED',
            reason,
          });
          window.alert('Trip rejected.');
          fetchPending();
        } finally {
          setProcessingId(null);
        }
      }, 0);
    } else {
      setRejectTarget(tripId);
      setRejectReason('');
    }
  };

  const formatTime = (dt?: string) => {
    if (!dt) return '--';
    return new Date(dt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (start?: string, end?: string) => {
    if (!start || !end) return '--';
    const diff = Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 60000);
    return `${Math.floor(diff / 60)}h ${diff % 60}m`;
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Reject Modal */}
      {rejectTarget && Platform.OS !== 'web' && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Reject Trip</Text>
            <Text style={styles.modalSubtitle}>Enter reason for rejection (optional):</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Incorrect container number..."
              placeholderTextColor="#9AA5B1"
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
            />
            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setRejectTarget(null)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalRejectBtn} onPress={handleRejectSubmit}>
                <Text style={styles.modalRejectText}>Reject Trip</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Pending Approvals</Text>
        <Text style={styles.headerSub}>
          {loading ? 'Loading...' : `${trips.length} trip${trips.length !== 1 ? 's' : ''} awaiting review`}
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#FB8C00" style={{ marginTop: 40 }} />
      ) : trips.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyIcon}>✅</Text>
          <Text style={styles.emptyTitle}>All caught up!</Text>
          <Text style={styles.emptySubtitle}>No trips pending approval right now.</Text>
        </View>
      ) : (
        trips.map((trip) => {
          const driverName = trip.driverName || trip.driver?.user?.name || trip.driver?.name || 'Unknown Driver';
          const vehicle = trip.vehicleNumber || 'N/A';
          const vessel = trip.vesselName || 'Vessel';
          const from = trip.sourceTerminal || 'ECT';
          const to = trip.destTerminal || 'JCT';
          const containers = trip.containers || [];
          const tripNum = trip.tripNumber || `TRP-${trip.id?.slice(0, 6)}`;
          const isProcessing = processingId === trip.id;

          return (
            <View key={trip.id} style={styles.card}>
              {/* Trip Number Badge */}
              <View style={styles.tripNumRow}>
                <Text style={styles.tripNumText}>{tripNum}</Text>
                <View style={styles.pendingBadge}>
                  <Text style={styles.pendingBadgeText}>PENDING APPROVAL</Text>
                </View>
              </View>

              {/* Driver Info */}
              <View style={styles.cardSection}>
                <Text style={styles.sectionLabel}>Driver</Text>
                <Text style={styles.driverName}>{driverName}</Text>
                <Text style={styles.detailText}>🚛 Vehicle: {vehicle}</Text>
              </View>

              <View style={styles.divider} />

              {/* Trip Details */}
              <View style={styles.cardSection}>
                <Text style={styles.sectionLabel}>Trip Details</Text>
                <Text style={styles.detailText}>🚢 Vessel: {vessel}</Text>
                <View style={styles.routeRow}>
                  <View style={styles.terminalBox}>
                    <Text style={styles.termLabel}>Origin</Text>
                    <Text style={styles.termValue}>{from}</Text>
                  </View>
                  <Text style={styles.arrow}>→</Text>
                  <View style={styles.terminalBox}>
                    <Text style={styles.termLabel}>Destination</Text>
                    <Text style={styles.termValue}>{to}</Text>
                  </View>
                </View>
                <View style={styles.timeRow}>
                  <Text style={styles.metaText}>🕐 Start: {formatTime(trip.startTime)}</Text>
                  <Text style={styles.metaText}>⏱ Duration: {formatDuration(trip.startTime, trip.endTime)}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              {/* Containers */}
              <View style={styles.cardSection}>
                <Text style={styles.sectionLabel}>Containers ({containers.length})</Text>
                {containers.map((c: any, i: number) => (
                  <View key={c.id} style={styles.containerRow}>
                    <Text style={styles.containerNum}>{i + 1}. {c.containerNumber}</Text>
                    <View style={[styles.sizeBadge, { backgroundColor: c.size === '20FT' ? '#EBF8FF' : '#FFF3E0' }]}>
                      <Text style={[styles.sizeText, { color: c.size === '20FT' ? '#2B6CB0' : '#E65100' }]}>
                        {c.size || 'FT_40'}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>

              {/* Action Buttons */}
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.approveBtn, isProcessing && styles.btnDisabled]}
                  disabled={isProcessing}
                  onPress={() => handleApprove(trip.id)}
                >
                  {isProcessing ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.approveBtnText}>✓ Approve</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.rejectBtn, isProcessing && styles.btnDisabled]}
                  disabled={isProcessing}
                  onPress={() => openReject(trip.id)}
                >
                  <Text style={styles.rejectBtnText}>✕ Reject</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  header: {
    backgroundColor: '#0A1628',
    padding: 24, paddingTop: 54, paddingBottom: 24,
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
  },
  headerTitle: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  headerSub: { color: '#8E99A4', fontSize: 13, marginTop: 4 },
  emptyBox: { alignItems: 'center', marginTop: 60, paddingHorizontal: 30 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#2D3748' },
  emptySubtitle: { fontSize: 14, color: '#718096', marginTop: 6, textAlign: 'center' },
  card: {
    backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 14,
    padding: 18, marginTop: 16, elevation: 3, borderWidth: 1, borderColor: '#E2E8F0',
  },
  tripNumRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  tripNumText: { fontSize: 13, fontWeight: '800', color: '#1E88E5' },
  pendingBadge: { backgroundColor: '#FFF3E0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  pendingBadgeText: { fontSize: 10, fontWeight: '700', color: '#E65100' },
  cardSection: { marginBottom: 4 },
  sectionLabel: {
    fontSize: 10, fontWeight: '700', color: '#8E99A4',
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6,
  },
  driverName: { fontSize: 18, fontWeight: '700', color: '#0A1628' },
  detailText: { fontSize: 14, color: '#5A6570', marginTop: 4 },
  divider: { height: 1, backgroundColor: '#F0F2F5', marginVertical: 12 },
  routeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 10 },
  terminalBox: { backgroundColor: '#F5F7FA', borderRadius: 10, padding: 10, flex: 1 },
  termLabel: { fontSize: 10, color: '#8E99A4' },
  termValue: { fontSize: 16, fontWeight: '700', color: '#0A1628', marginTop: 2 },
  arrow: { fontSize: 20, color: '#8E99A4' },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  metaText: { fontSize: 12, color: '#8E99A4' },
  containerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  containerNum: { fontSize: 14, fontWeight: '600', color: '#2D3748' },
  sizeBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  sizeText: { fontSize: 11, fontWeight: '700' },
  buttonRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  approveBtn: {
    flex: 1, backgroundColor: '#43A047', borderRadius: 12,
    padding: 14, alignItems: 'center',
  },
  approveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  rejectBtn: {
    flex: 1, backgroundColor: '#FEEBEE', borderRadius: 12,
    padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#E53935',
  },
  rejectBtnText: { color: '#E53935', fontSize: 15, fontWeight: '700' },
  btnDisabled: { opacity: 0.6 },
  // Modal styles
  modalOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100,
    justifyContent: 'center', alignItems: 'center',
  },
  modalCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 24,
    marginHorizontal: 24, width: '90%',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#0A1628', marginBottom: 6 },
  modalSubtitle: { fontSize: 14, color: '#718096', marginBottom: 12 },
  modalInput: {
    backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E0',
    borderRadius: 10, padding: 12, fontSize: 14, color: '#2D3748',
    minHeight: 70, textAlignVertical: 'top',
  },
  modalBtnRow: { flexDirection: 'row', gap: 12, marginTop: 14 },
  modalCancelBtn: {
    flex: 1, padding: 12, borderRadius: 10, borderWidth: 1,
    borderColor: '#CBD5E0', alignItems: 'center',
  },
  modalCancelText: { color: '#718096', fontWeight: '600' },
  modalRejectBtn: {
    flex: 1, padding: 12, borderRadius: 10,
    backgroundColor: '#E53935', alignItems: 'center',
  },
  modalRejectText: { color: '#fff', fontWeight: '700' },
});
