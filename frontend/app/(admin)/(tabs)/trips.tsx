import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { adminService } from '../../../src/services/adminService';
import { useResponsive } from '../../../src/hooks/useResponsive';
import { useMockTripStore } from '../../../src/store/mockTripStore';

export default function AdminTripsScreen() {
  const { topInset, bottomInset, containerPaddingHorizontal } = useResponsive();
  const mockTrips = useMockTripStore((s) => s.mockTrips);

  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [terminalFilter, setTerminalFilter] = useState<string>('ALL');

  // Action / Detail Modal
  const [selectedTrip, setSelectedTrip] = useState<any | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [actionReason, setActionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchTrips = useCallback(async () => {
    try {
      const data = await adminService.getTrips(
        search,
        statusFilter === 'ALL' ? undefined : statusFilter,
        terminalFilter === 'ALL' ? undefined : terminalFilter
      );
      const apiList = Array.isArray(data) ? data : [];
      const byId = new Map<string, any>();
      apiList.forEach((t) => byId.set(t.id || t.tripNumber, t));

      // Real-time synchronization: Merge with mockTripStore so trips added or updated by Driver appear instantly
      mockTrips.forEach((t) => {
        const key = t.id || t.tripNumber;
        if (!byId.has(key)) {
          byId.set(key, t);
        } else {
          // If local has more recent status update (e.g. COMPLETED or ARRIVED), prioritize it
          const remote = byId.get(key);
          if (t.status === 'COMPLETED' || t.status === 'ARRIVED' || t.status === 'PENDING_APPROVAL') {
            byId.set(key, { ...remote, ...t });
          }
        }
      });

      let list = Array.from(byId.values());
      if (statusFilter !== 'ALL') {
        list = list.filter((t) => t.status === statusFilter);
      }
      if (terminalFilter !== 'ALL') {
        list = list.filter((t) => t.sourceTerminal === terminalFilter || t.destTerminal === terminalFilter);
      }
      if (search && search.trim()) {
        const q = search.trim().toLowerCase();
        list = list.filter((t) =>
          (t.tripNumber && t.tripNumber.toLowerCase().includes(q)) ||
          (t.vehicleNumber && t.vehicleNumber.toLowerCase().includes(q)) ||
          (t.vesselName && t.vesselName.toLowerCase().includes(q)) ||
          (t.driverName && t.driverName.toLowerCase().includes(q)) ||
          (t.driverCode && t.driverCode.toLowerCase().includes(q)) ||
          (t.containers && t.containers.some((c: any) =>
            (typeof c === 'string' ? c : c.containerNumber || '').toLowerCase().includes(q)
          ))
        );
      }
      setTrips(list);
    } catch {
      let list = [...mockTrips];
      if (statusFilter !== 'ALL') {
        list = list.filter((t) => t.status === statusFilter);
      }
      if (terminalFilter !== 'ALL') {
        list = list.filter((t) => t.sourceTerminal === terminalFilter || t.destTerminal === terminalFilter);
      }
      if (search && search.trim()) {
        const q = search.trim().toLowerCase();
        list = list.filter((t) =>
          (t.tripNumber && t.tripNumber.toLowerCase().includes(q)) ||
          (t.vehicleNumber && t.vehicleNumber.toLowerCase().includes(q)) ||
          (t.vesselName && t.vesselName.toLowerCase().includes(q)) ||
          (t.driverName && t.driverName.toLowerCase().includes(q)) ||
          (t.driverCode && t.driverCode.toLowerCase().includes(q)) ||
          (t.containers && t.containers.some((c: any) =>
            (typeof c === 'string' ? c : c.containerNumber || '').toLowerCase().includes(q)
          ))
        );
      }
      setTrips(list);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, statusFilter, terminalFilter, mockTrips]);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTrips();
  };

  const handleTripAction = async (status: string) => {
    if (!selectedTrip) return;
    if (status === 'REJECTED' && !actionReason.trim()) {
      Alert.alert('Reason Required', 'Please provide an audit reason for rejecting this trip.');
      return;
    }

    setActionLoading(true);
    try {
      try {
        await adminService.actionTrip(selectedTrip.id, status, actionReason.trim() || undefined);
      } catch {}
      useMockTripStore.getState().updateTripStatus(selectedTrip.id, status as any);
      Alert.alert('Action Applied', `Trip ${selectedTrip.tripNumber || selectedTrip.id} marked as ${status}`);
      setModalVisible(false);
      setActionReason('');
      fetchTrips();
    } catch {
      useMockTripStore.getState().updateTripStatus(selectedTrip.id, status as any);
      Alert.alert('Action Applied (Local)', `Trip ${selectedTrip.tripNumber || selectedTrip.id} marked as ${status}`);
      setModalVisible(false);
      fetchTrips();
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      {/* Top Header */}
      <View style={[styles.header, { paddingTop: Math.max(topInset, 16) }]}>
        <View>
          <Text style={styles.headerTitle}>ITT Operations Management</Text>
          <Text style={styles.headerSubtitle}>{trips.length} active and historical movements</Text>
        </View>
      </View>

      {/* Filter Bar */}
      <View style={styles.filterBar}>
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={16} color="#78909c" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search Trip #, Container, Vehicle, Vessel..."
            placeholderTextColor="#546e7a"
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color="#78909c" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Status Filter Scroll */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {['ALL', 'PENDING_APPROVAL', 'IN_PROGRESS', 'APPROVED', 'COMPLETED', 'REJECTED'].map((st) => (
            <TouchableOpacity
              key={st}
              style={[styles.pill, statusFilter === st && styles.pillActive]}
              onPress={() => setStatusFilter(st)}
              activeOpacity={0.7}
            >
              <Text style={[styles.pillText, statusFilter === st && styles.pillTextActive]}>
                {st.replace('_', ' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Terminal Filter Scroll */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.filterScroll, { marginTop: 6 }]}>
          {['ALL', 'CICT', 'CWIT', 'ECT', 'JCT', 'UCT', 'SAGT'].map((term) => (
            <TouchableOpacity
              key={term}
              style={[styles.termPill, terminalFilter === term && styles.termPillActive]}
              onPress={() => setTerminalFilter(term)}
              activeOpacity={0.7}
            >
              <Text style={[styles.termPillText, terminalFilter === term && styles.termPillTextActive]}>
                {term}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Trips List */}
      {loading && !refreshing ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#00e5ff" />
          <Text style={styles.loadingText}>Fetching ITT trip operational data...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingHorizontal: containerPaddingHorizontal,
              paddingBottom: Math.max(bottomInset + 20, 36),
            },
          ]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00e5ff" />
          }
          showsVerticalScrollIndicator={false}
        >
          {trips.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="swap-horizontal-outline" size={32} color="#607d8b" />
              <Text style={styles.emptyCardText}>No ITT trips match your current filters.</Text>
            </View>
          ) : (
            trips.map((trip) => (
              <TouchableOpacity
                key={trip.id || trip.tripNumber}
                style={styles.tripCard}
                onPress={() => {
                  setSelectedTrip(trip);
                  setModalVisible(true);
                }}
                activeOpacity={0.8}
              >
                <View style={styles.tripTopRow}>
                  <View>
                    <Text style={styles.tripNumberText}>{trip.tripNumber}</Text>
                    <Text style={styles.vesselText}>{trip.vesselName || 'ITT Harbor Transfer'}</Text>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      trip.status === 'COMPLETED' || trip.status === 'APPROVED'
                        ? styles.statusApproved
                        : trip.status === 'PENDING_APPROVAL'
                        ? styles.statusPending
                        : trip.status === 'REJECTED'
                        ? styles.statusRejected
                        : styles.statusInProgress,
                    ]}
                  >
                    <Text style={styles.statusBadgeText}>{trip.status}</Text>
                  </View>
                </View>

                {/* Route */}
                <View style={styles.routeRow}>
                  <View style={styles.terminalBox}>
                    <Text style={styles.terminalBoxText}>{trip.sourceTerminal}</Text>
                  </View>
                  <Ionicons name="arrow-forward" size={16} color="#00e5ff" style={{ marginHorizontal: 8 }} />
                  <View style={styles.terminalBox}>
                    <Text style={styles.terminalBoxText}>{trip.destTerminal}</Text>
                  </View>
                  <Text style={styles.vehicleFleetText}>
                    • {trip.vehicleNumber} ({trip.chassisNumber || 'CHE'})
                  </Text>
                </View>

                {/* Driver & Timing info */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, marginBottom: 4 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#849396' }}>
                    👤 {trip.driverName || 'Kamal Perera'} {trip.driverCode ? `(${trip.driverCode})` : ''}
                  </Text>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: '#687787' }}>
                    🕒 {trip.operationTime || (trip.startTime ? trip.startTime.slice(11, 16) : 'TODAY')}
                  </Text>
                </View>

                {/* Containers Preview */}
                {trip.containers && trip.containers.length > 0 ? (
                  <View style={styles.containersWrap}>
                    {trip.containers.map((c: any, idx: number) => (
                      <View key={idx} style={styles.containerTag}>
                        <Ionicons name="cube-outline" size={12} color="#00e5ff" style={{ marginRight: 4 }} />
                        <Text style={styles.containerTagText}>
                          {c.containerNumber} ({c.size})
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}

      {/* Trip Detail & Action Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{selectedTrip?.tripNumber}</Text>
                <Text style={styles.modalSub}>{selectedTrip?.vesselName}</Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={22} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Current Status:</Text>
                <Text style={[styles.infoVal, { color: '#00e5ff', fontWeight: '800' }]}>
                  {selectedTrip?.status}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Origin Terminal:</Text>
                <Text style={styles.infoVal}>{selectedTrip?.sourceTerminal}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Discharge Terminal:</Text>
                <Text style={styles.infoVal}>{selectedTrip?.destTerminal}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Assigned Vehicle:</Text>
                <Text style={styles.infoVal}>
                  {selectedTrip?.vehicleNumber} ({selectedTrip?.chassisNumber})
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Containers Handled:</Text>
                <Text style={styles.infoVal}>{selectedTrip?.containers?.length || 0}</Text>
              </View>

              {/* Containers List */}
              <Text style={[styles.infoLabel, { marginTop: 12, marginBottom: 6 }]}>CONTAINER DETAILS:</Text>
              {selectedTrip?.containers?.map((c: any, i: number) => (
                <View key={i} style={styles.containerDetailItem}>
                  <Text style={styles.containerDetailNum}>{c.containerNumber}</Text>
                  <Text style={styles.containerDetailSize}>{c.size}</Text>
                  <Text style={styles.containerDetailStatus}>{c.status || 'LOADED'}</Text>
                </View>
              ))}

              {/* Reason Input */}
              <View style={{ marginTop: 14 }}>
                <Text style={styles.infoLabel}>Audit Reason / Notes (required for rejection):</Text>
                <TextInput
                  style={styles.reasonInput}
                  placeholder="Enter reason for audit record..."
                  placeholderTextColor="#546e7a"
                  value={actionReason}
                  onChangeText={setActionReason}
                />
              </View>
            </ScrollView>

            {/* Direct Admin Action Buttons */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#4caf50' }]}
                onPress={() => handleTripAction('APPROVED')}
                disabled={actionLoading}
              >
                <Text style={styles.actionBtnText}>APPROVE</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#ff5252' }]}
                onPress={() => handleTripAction('REJECTED')}
                disabled={actionLoading}
              >
                <Text style={styles.actionBtnText}>REJECT</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#2196f3' }]}
                onPress={() => handleTripAction('COMPLETED')}
                disabled={actionLoading}
              >
                <Text style={styles.actionBtnText}>COMPLETE</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#070f1e',
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: '#0a1628',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#90caf9',
    marginTop: 2,
    fontWeight: '600',
  },
  filterBar: {
    padding: 14,
    backgroundColor: '#0c1b30',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#070f1e',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 40,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 13,
  },
  filterScroll: {
    flexDirection: 'row',
  },
  pill: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginRight: 6,
  },
  pillActive: {
    backgroundColor: '#00e5ff',
  },
  pillText: {
    color: '#90caf9',
    fontSize: 11,
    fontWeight: '700',
  },
  pillTextActive: {
    color: '#001529',
  },
  termPill: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(0, 229, 255, 0.08)',
    marginRight: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.2)',
  },
  termPillActive: {
    backgroundColor: '#00e5ff',
  },
  termPillText: {
    color: '#00e5ff',
    fontSize: 10,
    fontWeight: '800',
  },
  termPillTextActive: {
    color: '#001529',
  },
  centerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#90caf9',
    fontSize: 13,
    marginTop: 10,
  },
  scrollContent: {
    paddingTop: 12,
  },
  emptyCard: {
    backgroundColor: '#0c1b30',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginTop: 20,
  },
  emptyCardText: {
    color: '#78909c',
    fontSize: 13,
    marginTop: 8,
  },
  tripCard: {
    backgroundColor: '#0c1b30',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  tripTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  tripNumberText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
  },
  vesselText: {
    fontSize: 11,
    color: '#78909c',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusApproved: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
  },
  statusPending: {
    backgroundColor: 'rgba(254, 179, 0, 0.2)',
  },
  statusRejected: {
    backgroundColor: 'rgba(255, 82, 82, 0.2)',
  },
  statusInProgress: {
    backgroundColor: 'rgba(0, 229, 255, 0.2)',
  },
  statusBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  terminalBox: {
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  terminalBoxText: {
    color: '#00e5ff',
    fontSize: 11,
    fontWeight: '800',
  },
  vehicleFleetText: {
    color: '#90caf9',
    fontSize: 11,
    marginLeft: 8,
  },
  containersWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  containerTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#070f1e',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.2)',
  },
  containerTagText: {
    color: '#cfd8dc',
    fontSize: 10,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    padding: 20,
  },
  modalBox: {
    backgroundColor: '#0c1b30',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.25)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
  },
  modalSub: {
    color: '#00e5ff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  infoLabel: {
    color: '#78909c',
    fontSize: 12,
    fontWeight: '600',
  },
  infoVal: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  containerDetailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#070f1e',
    padding: 8,
    borderRadius: 6,
    marginBottom: 4,
  },
  containerDetailNum: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  containerDetailSize: {
    color: '#00e5ff',
    fontSize: 11,
    fontWeight: '800',
  },
  containerDetailStatus: {
    color: '#4caf50',
    fontSize: 11,
    fontWeight: '700',
  },
  reasonInput: {
    backgroundColor: '#070f1e',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 40,
    color: '#ffffff',
    fontSize: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginTop: 4,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
