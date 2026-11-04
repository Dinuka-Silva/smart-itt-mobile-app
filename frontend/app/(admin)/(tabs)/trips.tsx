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
import {
  getTripDischargeTerminal,
  getTripTimingInfo,
  getContainerTimingInfo,
  formatTripTime,
} from '../../../src/utils/tripTerminalUtils';

export default function AdminTripsScreen() {
  const { topInset, bottomInset, containerPaddingHorizontal } = useResponsive();

  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [terminalFilter, setTerminalFilter] = useState<string>('ALL');
  const [vehicleFilter, setVehicleFilter] = useState<string>('ALL');

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
      let list = Array.isArray(data) ? data : [];
      if (statusFilter !== 'ALL') {
        list = list.filter((t) => t.status === statusFilter);
      }
      if (terminalFilter !== 'ALL') {
        list = list.filter((t) =>
          t.sourceTerminal === terminalFilter ||
          getTripDischargeTerminal(t).includes(terminalFilter) ||
          (t.containers || []).some((c: any) => c.destTerminal === terminalFilter)
        );
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
      if (vehicleFilter !== 'ALL') {
        const targetV = vehicleFilter.toUpperCase().replace(/[\s-]/g, '');
        list = list.filter((t) => {
          const v = (t.vehicleNumber || '').toUpperCase().replace(/[\s-]/g, '');
          return v === targetV;
        });
      }
      setTrips(list);
    } catch (e) {
      console.warn('[AdminTrips] Error fetching trips:', e);
      setTrips([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, statusFilter, terminalFilter, vehicleFilter]);

  const vehicleOptions = React.useMemo(() => {
    const plates = new Set<string>();
    trips.forEach((t) => {
      if (t.vehicleNumber && t.vehicleNumber !== 'UNASSIGNED') {
        plates.add(t.vehicleNumber.toUpperCase().trim());
      }
    });
    return ['ALL', ...Array.from(plates).sort()];
  }, [trips]);

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
      await adminService.actionTrip(selectedTrip.id, status, actionReason.trim() || undefined);
      Alert.alert('Action Applied', `Trip ${selectedTrip.tripNumber || selectedTrip.id} marked as ${status}`);
      setModalVisible(false);
      setActionReason('');
      fetchTrips();
    } catch (e: any) {
      Alert.alert('Action Failed', e?.response?.data?.message || e?.message || 'Failed to update trip on server.');
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

        {/* Vehicle Filter Scroll */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.filterScroll, { marginTop: 6 }]}>
          {vehicleOptions.map((veh) => (
            <TouchableOpacity
              key={veh}
              style={[styles.termPill, vehicleFilter === veh && styles.termPillActive]}
              onPress={() => setVehicleFilter(veh)}
              activeOpacity={0.7}
            >
              <Text style={[styles.termPillText, vehicleFilter === veh && styles.termPillTextActive]}>
                {veh === 'ALL' ? 'ALL VEHICLES' : veh}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Trips List */}
      {loading && !refreshing ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#173B70" />
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
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#173B70" />
          }
          showsVerticalScrollIndicator={false}
        >
          {trips.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="swap-horizontal-outline" size={32} color="#607d8b" />
              <Text style={styles.emptyCardText}>No ITT trips match your current filters.</Text>
            </View>
          ) : (
            trips.map((trip) => {
              const timing = getTripTimingInfo(trip);
              return (
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
                    <Ionicons name="arrow-forward" size={16} color="#173B70" style={{ marginHorizontal: 8 }} />
                    <View style={styles.terminalBox}>
                      <Text style={styles.terminalBoxText}>{getTripDischargeTerminal(trip)}</Text>
                    </View>
                    <Text style={styles.vehicleFleetText}>
                      • {trip.vehicleNumber} ({trip.chassisNumber || 'CHE'})
                    </Text>
                  </View>

                  {/* Driver & Dispatch Info */}
                  <View style={styles.driverBar}>
                    <Text style={styles.driverText}>
                      👤 {trip.driverName || 'Kamal Perera'} {trip.driverCode ? `(${trip.driverCode})` : ''}
                    </Text>
                    <Text style={styles.driverGateText}>
                      Gate: {trip.dispatchTime ? `Dispatched ${formatTripTime(trip.dispatchTime)}` : 'Logged'}
                    </Text>
                  </View>

                  {/* ⏱️ OPERATIONAL TIMING & DURATION BREAKDOWN */}
                  <View style={styles.timingCard}>
                    <View style={styles.timingCol}>
                      <View style={styles.timingLabelRow}>
                        <Ionicons name="arrow-down-circle" size={11} color="#173B70" />
                        <Text style={styles.timingLabel}>LOADED</Text>
                      </View>
                      <Text style={styles.timingTime}>{timing.loadTime}</Text>
                      <Text style={styles.timingTerminal}>{trip.sourceTerminal || 'CICT'}</Text>
                    </View>

                    <View style={styles.timingDivider} />

                    <View style={styles.timingCol}>
                      <View style={styles.timingLabelRow}>
                        <Ionicons name="flag" size={11} color={timing.isDischarged ? "#173B70" : "#173B70"} />
                        <Text style={styles.timingLabel}>DISCHARGED</Text>
                      </View>
                      <Text style={[styles.timingTime, { color: timing.isDischarged ? '#173B70' : '#173B70' }]}>
                        {timing.dischargeTime}
                      </Text>
                      <Text style={styles.timingTerminal}>{getTripDischargeTerminal(trip)}</Text>
                    </View>

                    <View style={styles.timingDivider} />

                    <View style={styles.timingCol}>
                      <View style={styles.timingLabelRow}>
                        <Ionicons name="time" size={11} color="#ffd54f" />
                        <Text style={styles.timingLabel}>TIME SPENT</Text>
                      </View>
                      <Text style={[styles.timingTime, { color: '#ffd54f' }]}>{timing.timeSpent}</Text>
                      <Text style={styles.timingTerminal}>
                        {timing.isCompleted ? 'Turnaround' : 'In Transit'}
                      </Text>
                    </View>
                  </View>

                  {/* Containers Preview with per-container timing */}
                  {trip.containers && trip.containers.length > 0 ? (
                    <View style={styles.containersWrap}>
                      {trip.containers.map((c: any, idx: number) => {
                        const cTiming = getContainerTimingInfo(c, trip, idx);
                        return (
                          <View key={idx} style={styles.containerTagEnhanced}>
                            <View style={styles.cTopRow}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Ionicons name="cube" size={12} color="#173B70" />
                                <Text style={styles.cNumText}>{cTiming.containerNumber}</Text>
                                <View style={styles.cSizeBadge}>
                                  <Text style={styles.cSizeText}>{cTiming.size}</Text>
                                </View>
                              </View>
                              <View
                                style={[
                                  styles.cStatusPill,
                                  cTiming.isDischarged ? styles.cStatusDischarged : styles.cStatusTransit,
                                ]}
                              >
                                <Text style={styles.cStatusText}>
                                  {cTiming.isDischarged ? 'DISCHARGED' : 'IN TRANSIT'}
                                </Text>
                              </View>
                            </View>

                            <View style={styles.cTimingDetailsRow}>
                              <Text style={styles.cTimeText}>
                                📥 Load: <Text style={styles.cTimeHighlight}>{cTiming.loadTime}</Text>
                              </Text>
                              <Text style={styles.cTimeArrow}>➔</Text>
                              <Text style={styles.cTimeText}>
                                📤 Disch:{' '}
                                <Text style={[styles.cTimeHighlight, { color: cTiming.isDischarged ? '#173B70' : '#173B70' }]}>
                                  {cTiming.dischargeTime} ({cTiming.destTerminal})
                                </Text>
                              </Text>
                              <Text style={styles.cSpentBadge}>⏱️ {cTiming.timeSpent}</Text>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  ) : null}
                </TouchableOpacity>
              );
            })
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

            {selectedTrip && (() => {
              const selTiming = getTripTimingInfo(selectedTrip);
              return (
                <ScrollView style={{ maxHeight: 440 }} showsVerticalScrollIndicator={false}>
                  {/* ⏱️ Top Operational Timing & Turnaround Report Banner */}
                  <View style={styles.modalTimingBox}>
                    <View style={styles.modalTimingHeader}>
                      <Ionicons name="timer-outline" size={15} color="#173B70" />
                      <Text style={styles.modalTimingTitle}>ITT OPERATIONAL TIMING & DISCHARGE REPORT</Text>
                    </View>

                    <View style={styles.modalTimingGrid}>
                      <View style={styles.modalTimingStat}>
                        <Text style={styles.modalStatLabel}>DRIVER LOAD TIME</Text>
                        <Text style={styles.modalStatVal}>{selTiming.loadTime}</Text>
                        <Text style={styles.modalStatSub}>{selectedTrip.sourceTerminal} Terminal</Text>
                      </View>

                      <View style={styles.modalTimingStat}>
                        <Text style={styles.modalStatLabel}>DISCHARGE TIME</Text>
                        <Text style={[styles.modalStatVal, { color: selTiming.isDischarged ? '#173B70' : '#173B70' }]}>
                          {selTiming.dischargeTime}
                        </Text>
                        <Text style={styles.modalStatSub}>{getTripDischargeTerminal(selectedTrip)}</Text>
                      </View>

                      <View style={styles.modalTimingStat}>
                        <Text style={styles.modalStatLabel}>TIME SPENT</Text>
                        <Text style={[styles.modalStatVal, { color: '#ffd54f' }]}>{selTiming.timeSpent}</Text>
                        <Text style={styles.modalStatSub}>Turnaround Duration</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Current Status:</Text>
                    <Text style={[styles.infoVal, { color: '#173B70', fontWeight: '800' }]}>
                      {selectedTrip?.status}
                    </Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Origin Terminal:</Text>
                    <Text style={styles.infoVal}>{selectedTrip?.sourceTerminal}</Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Discharge Terminal(s):</Text>
                    <Text style={styles.infoVal}>{getTripDischargeTerminal(selectedTrip)}</Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Assigned Vehicle:</Text>
                    <Text style={styles.infoVal}>
                      {selectedTrip?.vehicleNumber} ({selectedTrip?.chassisNumber})
                    </Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Driver in Charge:</Text>
                    <Text style={styles.infoVal}>
                      {selectedTrip?.driverName || 'Kamal Perera'} {selectedTrip?.driverCode ? `(${selectedTrip.driverCode})` : ''}
                    </Text>
                  </View>

                  {/* Containers List with Individual Load & Discharge Log */}
                  <Text style={[styles.infoLabel, { marginTop: 14, marginBottom: 8, color: '#173B70' }]}>
                    CONTAINER DISCHARGE & TURNAROUND LOG ({selectedTrip?.containers?.length || 0}):
                  </Text>
                  {selectedTrip?.containers?.map((c: any, i: number) => {
                    const cInfo = getContainerTimingInfo(c, selectedTrip, i);
                    return (
                      <View key={i} style={styles.modalContainerCard}>
                        <View style={styles.modalContHeader}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Ionicons name="cube" size={14} color="#173B70" />
                            <Text style={styles.containerDetailNum}>{cInfo.containerNumber}</Text>
                            <View style={styles.cSizeBadge}>
                              <Text style={styles.cSizeText}>{cInfo.size}</Text>
                            </View>
                          </View>
                          <View
                            style={[
                              styles.cStatusPill,
                              cInfo.isDischarged ? styles.cStatusDischarged : styles.cStatusTransit,
                            ]}
                          >
                            <Text style={styles.cStatusText}>
                              {cInfo.isDischarged ? 'DISCHARGED' : 'IN TRANSIT'}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.modalContGrid}>
                          <View style={styles.modalContMetric}>
                            <Text style={styles.modalContMetricLabel}>Loaded At:</Text>
                            <Text style={styles.modalContMetricVal}>
                              {cInfo.loadTime} ({cInfo.sourceTerminal})
                            </Text>
                          </View>
                          <View style={styles.modalContMetric}>
                            <Text style={styles.modalContMetricLabel}>Discharged At:</Text>
                            <Text style={[styles.modalContMetricVal, { color: cInfo.isDischarged ? '#173B70' : '#173B70' }]}>
                              {cInfo.dischargeTime} ({cInfo.destTerminal})
                            </Text>
                          </View>
                          <View style={styles.modalContMetric}>
                            <Text style={styles.modalContMetricLabel}>Time Spent:</Text>
                            <Text style={[styles.modalContMetricVal, { color: '#ffd54f' }]}>
                              {cInfo.timeSpent}
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}

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
              );
            })()}

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
                style={[styles.actionBtn, { backgroundColor: '#173B70' }]}
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
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: '#0a1628',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#90caf9',
    marginTop: 2,
    fontWeight: '600',
  },
  filterBar: {
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 40,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    color: '#1E293B',
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
    backgroundColor: '#173B70',
  },
  pillText: {
    color: '#90caf9',
    fontSize: 11,
    fontWeight: '700',
  },
  pillTextActive: {
    color: '#FFFFFF',
  },
  termPill: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#F0F5FA',
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#F0F5FA',
  },
  termPillActive: {
    backgroundColor: '#173B70',
  },
  termPillText: {
    color: '#173B70',
    fontSize: 10,
    fontWeight: '800',
  },
  termPillTextActive: {
    color: '#FFFFFF',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 20,
  },
  emptyCardText: {
    color: '#78909c',
    fontSize: 13,
    marginTop: 8,
  },
  tripCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
    color: '#1E293B',
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
    backgroundColor: '#F0F5FA',
  },
  statusBadgeText: {
    color: '#1E293B',
    fontSize: 10,
    fontWeight: '800',
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  terminalBox: {
    backgroundColor: '#F0F5FA',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  terminalBoxText: {
    color: '#173B70',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#F0F5FA',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F0F5FA',
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
    color: '#1E293B',
  },
  modalSub: {
    color: '#173B70',
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
    color: '#1E293B',
    fontSize: 12,
    fontWeight: '700',
  },
  containerDetailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 8,
    borderRadius: 6,
    marginBottom: 4,
  },
  containerDetailNum: {
    color: '#1E293B',
    fontSize: 12,
    fontWeight: '700',
  },
  containerDetailSize: {
    color: '#173B70',
    fontSize: 11,
    fontWeight: '800',
  },
  containerDetailStatus: {
    color: '#4caf50',
    fontSize: 11,
    fontWeight: '700',
  },
  reasonInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 40,
    color: '#1E293B',
    fontSize: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
    color: '#1E293B',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  driverBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 6,
  },
  driverText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#90caf9',
  },
  driverGateText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#78909c',
  },
  timingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(7, 15, 30, 0.95)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F0F5FA',
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginTop: 4,
    marginBottom: 4,
  },
  timingCol: {
    flex: 1,
    alignItems: 'center',
  },
  timingLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 2,
  },
  timingLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#78909c',
    letterSpacing: 0.4,
  },
  timingTime: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1E293B',
  },
  timingTerminal: {
    fontSize: 10,
    fontWeight: '600',
    color: '#90caf9',
    marginTop: 1,
  },
  timingDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 4,
  },
  containerTagEnhanced: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#F0F5FA',
    marginBottom: 4,
  },
  cTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cNumText: {
    color: '#1E293B',
    fontSize: 12,
    fontWeight: '800',
  },
  cSizeBadge: {
    backgroundColor: '#F0F5FA',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  cSizeText: {
    color: '#173B70',
    fontSize: 10,
    fontWeight: '800',
  },
  cStatusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  cStatusDischarged: {
    backgroundColor: 'rgba(34, 239, 126, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(34, 239, 126, 0.3)',
  },
  cStatusTransit: {
    backgroundColor: 'rgba(254, 179, 0, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(254, 179, 0, 0.3)',
  },
  cStatusText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#1E293B',
  },
  cTimingDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  cTimeText: {
    fontSize: 10,
    color: '#90a4ae',
    fontWeight: '600',
  },
  cTimeHighlight: {
    color: '#1E293B',
    fontWeight: '800',
  },
  cTimeArrow: {
    fontSize: 10,
    color: '#546e7a',
  },
  cSpentBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffd54f',
    marginLeft: 'auto',
  },
  modalTimingBox: {
    backgroundColor: '#F0F5FA',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F0F5FA',
    padding: 12,
    marginBottom: 12,
  },
  modalTimingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  modalTimingTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#173B70',
    letterSpacing: 0.6,
  },
  modalTimingGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalTimingStat: {
    flex: 1,
    alignItems: 'center',
  },
  modalStatLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#78909c',
    marginBottom: 2,
    textAlign: 'center',
  },
  modalStatVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
    textAlign: 'center',
  },
  modalStatSub: {
    fontSize: 10,
    fontWeight: '600',
    color: '#90caf9',
    marginTop: 1,
    textAlign: 'center',
  },
  modalContainerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    marginBottom: 8,
  },
  modalContHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalContGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  modalContMetric: {
    flex: 1,
  },
  modalContMetricLabel: {
    fontSize: 9,
    color: '#78909c',
    fontWeight: '600',
  },
  modalContMetricVal: {
    fontSize: 11,
    color: '#1E293B',
    fontWeight: '700',
    marginTop: 2,
  },
});
