import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
  Platform,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../../src/store/authStore';
import { tripService } from '../../../src/services/tripService';
import { useMockTripStore } from '../../../src/store/mockTripStore';
import { colors, radius, spacing } from '../../../src/theme';

const DRIVER_PHOTO_POOL = [
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1528892952291-009c663ce843?auto=format&fit=crop&w=300&q=80',
];

const TERMINALS = ['ALL', 'CICT', 'CWIT', 'ECT', 'JCT', 'UCT', 'SAGT'] as const;
const PERIOD_OPTIONS = [
  { id: 'DAILY', label: 'DAILY (TODAY)' },
  { id: 'WEEKLY', label: 'WEEKLY' },
  { id: 'MONTHLY', label: 'MONTHLY' },
  { id: 'YEARLY', label: 'YEARLY' },
  { id: 'ALL', label: 'ALL TIME' },
] as const;

const DRIVER_OPTIONS = [
  { id: 'ALL', label: 'ALL DRIVERS' },
  { id: 'demo-driver', label: 'Kamal Perera' },
  { id: 'drv-002', label: 'Saman Kumara' },
  { id: 'drv-003', label: 'Nimal Fernando' },
  { id: 'drv-004', label: 'Sunil Silva' },
] as const;

const STATUS_OPTIONS = [
  { id: 'ALL', label: 'ALL TRIPS' },
  { id: 'IN_PROGRESS', label: 'IN PROGRESS' },
  { id: 'PENDING_APPROVAL', label: 'PENDING APPROVAL' },
  { id: 'COMPLETED', label: 'COMPLETED' },
  { id: 'REJECTED', label: 'REJECTED' },
] as const;

export default function SupervisorMissionDispatcher() {
  const user = useAuthStore((s) => s.user);

  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTerminal, setSelectedTerminal] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedDriverFilter, setSelectedDriverFilter] = useState<string>('ALL');
  const [selectedPeriodFilter, setSelectedPeriodFilter] = useState<string>('DAILY');

  // Rejection modal
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [tripToReject, setTripToReject] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [submittingDecision, setSubmittingDecision] = useState(false);

  const mockTrips = useMockTripStore((s) => s.mockTrips);

  const loadTrips = useCallback(async () => {
    try {
      const apiTrips = await tripService.getTrips();
      const list = Array.isArray(apiTrips) ? apiTrips : [];
      const byId = new Map<string, any>();
      list.forEach((t) => byId.set(t.id, t));
      mockTrips.forEach((t) => {
        if (!byId.has(t.id)) byId.set(t.id, t);
      });
      setTrips(Array.from(byId.values()));
    } catch {
      setTrips(mockTrips);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [mockTrips]);

  useEffect(() => {
    loadTrips();
  }, [loadTrips]);

  const onRefresh = () => {
    setRefreshing(true);
    loadTrips();
  };

  // Metrics calculated from loaded trips
  const countTotal = trips.length;
  const countInProgress = trips.filter((t) => t.status === 'IN_PROGRESS').length;
  const countPending = trips.filter((t) => t.status === 'PENDING_APPROVAL').length;
  const countCompleted = trips.filter((t) => t.status === 'COMPLETED' || t.status === 'APPROVED').length;

  // Filtered trips
  const filteredTrips = useMemo(() => {
    return trips.filter((t) => {
      // 0. Driver Filter
      if (selectedDriverFilter !== 'ALL') {
        if (t.driverId !== selectedDriverFilter) return false;
      }

      // 0.1 Date Period Filter
      if (selectedPeriodFilter !== 'ALL') {
        const dateStr = t.createdAt || t.startTime || t.operationDate;
        if (dateStr) {
          const tripDate = new Date(dateStr);
          const now = new Date();
          if (!isNaN(tripDate.getTime())) {
            if (selectedPeriodFilter === 'DAILY') {
              const isToday =
                tripDate.getDate() === now.getDate() &&
                tripDate.getMonth() === now.getMonth() &&
                tripDate.getFullYear() === now.getFullYear();
              if (!isToday) return false;
            } else if (selectedPeriodFilter === 'WEEKLY') {
              const diffDays = Math.ceil(Math.abs(now.getTime() - tripDate.getTime()) / (1000 * 60 * 60 * 24));
              if (diffDays > 7) return false;
            } else if (selectedPeriodFilter === 'MONTHLY') {
              const diffDays = Math.ceil(Math.abs(now.getTime() - tripDate.getTime()) / (1000 * 60 * 60 * 24));
              if (diffDays > 30) return false;
            } else if (selectedPeriodFilter === 'YEARLY') {
              if (tripDate.getFullYear() !== now.getFullYear()) return false;
            }
          }
        }
      }

      // 1. Terminal Filter
      if (selectedTerminal !== 'ALL') {
        const matchesOrigin = t.sourceTerminal === selectedTerminal;
        const matchesDest = t.destTerminal === selectedTerminal;
        if (!matchesOrigin && !matchesDest) return false;
      }

      // 2. Status Filter
      if (selectedStatus !== 'ALL') {
        if (selectedStatus === 'COMPLETED') {
          if (t.status !== 'COMPLETED' && t.status !== 'APPROVED') return false;
        } else if (t.status !== selectedStatus) {
          return false;
        }
      }

      // 3. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const tripNum = (t.tripNumber || t.id || '').toLowerCase();
        const vessel = (t.vesselName || '').toLowerCase();
        const veh = (t.vehicleNumber || '').toLowerCase();
        const driver = (t.driverName || '').toLowerCase();
        const chai = (t.chassisNumber || t.chaiNumber || '').toLowerCase();
        const contMatches = (t.containers || []).some((c: any) =>
          (c.containerNumber || '').toLowerCase().includes(q)
        );

        if (!tripNum.includes(q) && !vessel.includes(q) && !veh.includes(q) && !driver.includes(q) && !chai.includes(q) && !contMatches) {
          return false;
        }
      }

      return true;
    });
  }, [trips, selectedTerminal, selectedStatus, selectedDriverFilter, selectedPeriodFilter, searchQuery]);

  // Date-wise grouped trips
  const tripsByDate = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = yesterdayDate.toISOString().slice(0, 10);

    const groups: {
      [key: string]: {
        dateKey: string;
        displayDate: string;
        isToday: boolean;
        isYesterday: boolean;
        trips: any[];
        totalContainers: number;
      };
    } = {};

    filteredTrips.forEach((t) => {
      const rawDate = t.operationDate || t.startTime || t.createdAt || new Date().toISOString();
      const dateKey = rawDate.slice(0, 10);

      if (!groups[dateKey]) {
        const isToday = dateKey === todayStr;
        const isYesterday = dateKey === yesterdayStr;
        let displayDate = dateKey;
        try {
          const dObj = new Date(dateKey + 'T00:00:00');
          displayDate = dObj.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          });
        } catch {}

        groups[dateKey] = {
          dateKey,
          displayDate,
          isToday,
          isYesterday,
          trips: [],
          totalContainers: 0,
        };
      }

      const driverIndex = Math.abs((t.driverName || 'Kamal').charCodeAt(0) + (t.id || '1').charCodeAt(0)) % DRIVER_PHOTO_POOL.length;
      const driverPhoto = t.driverPhoto || DRIVER_PHOTO_POOL[driverIndex];

      groups[dateKey].trips.push({ ...t, driverPhoto });
      groups[dateKey].totalContainers += (t.containers?.length || 1);
    });

    return Object.values(groups).sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  }, [filteredTrips]);

  const handleDischargeAndComplete = async (trip: any) => {
    try {
      await tripService.approveTrip(trip.id, user?.id || 'sup-001', 'Container discharged and trip approved');
      useMockTripStore.getState().dischargeAndCompleteTrip(trip.id, user?.id || 'sup-001');
      Alert.alert('Container Discharged & Gate Pass Approved', `Trip ${trip.tripNumber || trip.id} is discharged and completed.`);
      await loadTrips();
    } catch {
      useMockTripStore.getState().dischargeAndCompleteTrip(trip.id, user?.id || 'sup-001');
      Alert.alert('Container Discharged & Gate Pass Approved (Local)', `Trip ${trip.tripNumber || trip.id} is discharged and completed.`);
      await loadTrips();
    }
  };

  // Approval actions
  const handleApproveTrip = async (trip: any) => {
    try {
      await tripService.approveTrip(trip.id, user?.id || 'sup-001', 'Approved by Operations Supervisor');
      useMockTripStore.getState().updateTripStatus(trip.id, 'APPROVED');
      Alert.alert('Gate Pass Approved', `Trip ${trip.tripNumber || trip.id} is approved.`);
      await loadTrips();
    } catch {
      useMockTripStore.getState().updateTripStatus(trip.id, 'APPROVED');
      Alert.alert('Gate Pass Approved (Local)', `Trip ${trip.tripNumber || trip.id} is approved.`);
      await loadTrips();
    }
  };

  const handleOpenRejectModal = (trip: any) => {
    setTripToReject(trip);
    setRejectionReason('');
    setRejectModalVisible(true);
  };

  const handleConfirmRejection = async () => {
    if (!rejectionReason.trim()) {
      Alert.alert('Mandatory Reason', 'Please provide a reason for rejecting this trip submission.');
      return;
    }

    setSubmittingDecision(true);
    try {
      await tripService.rejectTrip(tripToReject.id, user?.id || 'sup-001', rejectionReason.trim());
      useMockTripStore.getState().updateTripStatus(tripToReject.id, 'REJECTED');
      setRejectModalVisible(false);
      Alert.alert('Trip Rejected', `Trip ${tripToReject.tripNumber || tripToReject.id} rejected.`);
      await loadTrips();
    } catch {
      useMockTripStore.getState().updateTripStatus(tripToReject.id, 'REJECTED');
      setRejectModalVisible(false);
      Alert.alert('Trip Rejected (Local)', `Trip ${tripToReject.tripNumber || tripToReject.id} rejected.`);
      await loadTrips();
    } finally {
      setSubmittingDecision(false);
    }
  };

  const supervisorName = user?.name || user?.fullName || 'Nimal Silva';
  const supervisorInitials = supervisorName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00e5ff" />}
        keyboardShouldPersistTaps="handled"
      >
        {/* ─── A. SUPERVISOR HEADER ─── */}
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
                <Text style={styles.dateText}>DISPATCH FLEET</Text>
              </View>
            </View>
          </View>

          <View style={styles.onlinePill}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineText}>LIVE FEED</Text>
          </View>
        </View>

        {/* ─── B. LIVE METRICS SUMMARY ROW ─── */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <View style={styles.metricCardHeader}>
              <Text style={styles.metricLabel}>TOTAL TRIPS</Text>
              <Ionicons name="swap-horizontal" size={14} color="#00e5ff" />
            </View>
            <Text style={[styles.metricValue, { color: '#00e5ff' }]}>{countTotal}</Text>
            <Text style={styles.metricSub}>Port ITT Records</Text>
          </View>

          <View style={styles.metricCard}>
            <View style={styles.metricCardHeader}>
              <Text style={styles.metricLabel}>ACTIVE</Text>
              <Ionicons name="navigate" size={14} color="#22ef7e" />
            </View>
            <Text style={[styles.metricValue, { color: '#22ef7e' }]}>{countInProgress}</Text>
            <Text style={styles.metricSub}>In Transit</Text>
          </View>

          <View style={styles.metricCard}>
            <View style={styles.metricCardHeader}>
              <Text style={styles.metricLabel}>PENDING PASS</Text>
              <Ionicons name="time" size={14} color="#feb300" />
            </View>
            <Text style={[styles.metricValue, { color: '#feb300' }]}>{countPending}</Text>
            <Text style={styles.metricSub}>Awaiting Action</Text>
          </View>

          <View style={styles.metricCard}>
            <View style={styles.metricCardHeader}>
              <Text style={styles.metricLabel}>COMPLETED</Text>
              <Ionicons name="checkmark-done" size={14} color="#bac9cc" />
            </View>
            <Text style={[styles.metricValue, { color: '#dde2f0' }]}>{countCompleted}</Text>
            <Text style={styles.metricSub}>Delivered</Text>
          </View>
        </View>

        {/* ─── C. TRIP MONITORING WITH SEARCH & FILTERS ─── */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="pulse" size={18} color="#00e5ff" />
            <Text style={styles.sectionTitle}>
              INTER-TERMINAL TRIP MONITORING ({filteredTrips.length})
            </Text>
          </View>

          {/* Search bar */}
          <View style={styles.searchBarWrap}>
            <Ionicons name="search" size={16} color="#849396" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search Trip ID, Container, Vessel, Truck, Driver..."
              placeholderTextColor="#849396"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={16} color="#849396" />
              </TouchableOpacity>
            )}
          </View>

          {/* Date Period Filter */}
          <View>
            <Text style={styles.filterGroupLabel}>DATE PERIOD FILTER (SELECTION)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipsScroll}>
              {PERIOD_OPTIONS.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[
                    styles.filterChip,
                    selectedPeriodFilter === p.id && styles.filterChipActiveCyan,
                  ]}
                  onPress={() => setSelectedPeriodFilter(p.id)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      selectedPeriodFilter === p.id && styles.filterChipTextActiveCyan,
                    ]}
                  >
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Driver Selection Filter */}
          <View>
            <Text style={styles.filterGroupLabel}>DRIVER SELECTION FILTER</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipsScroll}>
              {DRIVER_OPTIONS.map((d) => (
                <TouchableOpacity
                  key={d.id}
                  style={[
                    styles.filterChip,
                    selectedDriverFilter === d.id && styles.filterChipActive,
                  ]}
                  onPress={() => setSelectedDriverFilter(d.id)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      selectedDriverFilter === d.id && styles.filterChipTextActive,
                    ]}
                  >
                    {d.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Terminal Filters */}
          <View>
            <Text style={styles.filterGroupLabel}>TERMINAL CLEARANCE FILTER</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipsScroll}>
              {TERMINALS.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.filterChip,
                    selectedTerminal === t && styles.filterChipActiveCyan,
                  ]}
                  onPress={() => setSelectedTerminal(t)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      selectedTerminal === t && styles.filterChipTextActiveCyan,
                    ]}
                  >
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Status Filters */}
          <View>
            <Text style={styles.filterGroupLabel}>STATUS FILTER</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipsScroll}>
              {STATUS_OPTIONS.map((st) => (
                <TouchableOpacity
                  key={st.id}
                  style={[
                    styles.filterChip,
                    selectedStatus === st.id && styles.filterChipActive,
                  ]}
                  onPress={() => setSelectedStatus(st.id)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      selectedStatus === st.id && styles.filterChipTextActive,
                    ]}
                  >
                    {st.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* List of Trip Monitoring Cards Grouped Date-Wise */}
          <View style={{ gap: 14, marginTop: 4 }}>
            {loading ? (
              <ActivityIndicator size="large" color="#00e5ff" style={{ marginVertical: 20 }} />
            ) : tripsByDate.length === 0 ? (
              <View style={styles.emptyPendingCard}>
                <Ionicons name="file-tray-outline" size={28} color="#849396" />
                <Text style={styles.emptyPendingText}>NO MATCHING TRIPS</Text>
                <Text style={styles.emptyPendingSub}>
                  No active or completed inter-terminal moves found for this filter criteria.
                </Text>
              </View>
            ) : (
              tripsByDate.map((group) => (
                <View key={group.dateKey} style={styles.dateGroupWrap}>
                  {/* Date Section Header */}
                  <View style={styles.dateGroupHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="calendar" size={14} color="#00e5ff" />
                      <Text style={styles.dateGroupTitle}>{group.displayDate.toUpperCase()}</Text>
                      {group.isToday && (
                        <View style={styles.todayPill}>
                          <Text style={styles.todayPillText}>TODAY</Text>
                        </View>
                      )}
                      {group.isYesterday && (
                        <View style={styles.yesterdayPill}>
                          <Text style={styles.yesterdayPillText}>YESTERDAY</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.dateGroupCountBadge}>
                      <Text style={styles.dateGroupCountText}>
                        {group.trips.length} TRIPS • {group.totalContainers} CONTAINERS
                      </Text>
                    </View>
                  </View>

                  {/* Trips List for this Date */}
                  <View style={{ gap: 10, marginTop: 8 }}>
                    {group.trips.map((t) => {
                      const count20 = (t.containers || []).filter((c: any) => (c.size || '').includes('20')).length;
                      const count40 = (t.containers || []).filter((c: any) => (c.size || '').includes('40')).length;
                      const isPending = t.status === 'PENDING_APPROVAL';

                      return (
                        <View key={t.id} style={styles.monitoringCard}>
                          {/* Header with Driver Photo */}
                          <View style={styles.monHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                              {t.driverPhoto ? (
                                <Image source={{ uri: t.driverPhoto }} style={styles.monDriverThumb} />
                              ) : (
                                <View style={styles.monDriverThumbFallback}>
                                  <Text style={styles.monDriverThumbText}>{(t.driverName || 'K')[0]}</Text>
                                </View>
                              )}
                              <View>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                  {t.status === 'IN_PROGRESS' && <View style={styles.greenPulseDot} />}
                                  <Text style={styles.monTripId}>
                                    {t.tripNumber || `ITT-${t.id?.slice(0, 6)}`}
                                  </Text>
                                </View>
                                <Text style={styles.monDriverNameSmall}>
                                  {t.driverName || 'Kamal Perera'} {t.driverCode ? `(${t.driverCode})` : ''}
                                </Text>
                              </View>
                            </View>

                            <View
                              style={[
                                styles.monStatusBadge,
                                t.status === 'IN_PROGRESS' && styles.badgeGreen,
                                t.status === 'PENDING_APPROVAL' && styles.badgeAmber,
                                t.status === 'APPROVED' && styles.badgeCyan,
                                t.status === 'COMPLETED' && styles.badgeCyan,
                                t.status === 'REJECTED' && styles.badgeRed,
                              ]}
                            >
                              <Text style={styles.monStatusText}>{t.status?.replace(/_/g, ' ')}</Text>
                            </View>
                          </View>

                          {/* Route Row */}
                          <View style={styles.monRouteBox}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Ionicons name="boat" size={13} color="#00e5ff" />
                              <Text style={styles.monRouteText}>
                                {t.sourceTerminal || 'CICT'}
                              </Text>
                              <Ionicons name="arrow-forward" size={13} color="#00e5ff" />
                              <Text style={styles.monRouteText}>
                                {t.destTerminal || 'JCT'}
                              </Text>
                            </View>

                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                              <Ionicons name="time-outline" size={12} color="#feb300" />
                              <Text style={styles.monTime}>
                                {t.operationTime ||
                                  (t.startTime
                                    ? new Date(t.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                    : t.createdAt
                                    ? new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                    : '08:30 AM')}
                              </Text>
                            </View>
                          </View>

                          {/* Specs Row */}
                          <View style={styles.monSpecsRow}>
                            <Text style={styles.monSpecItem}>
                              Truck: <Text style={styles.monSpecBoldHighlight}>{t.vehicleNumber || 'LY 5234'}</Text>
                            </Text>
                            <Text style={styles.monSpecItem}>
                              CHE: <Text style={styles.monSpecBoldCyan}>{t.chassisNumber || t.chaiNumber || 'SCK 100'}</Text>
                            </Text>
                            <Text style={styles.monSpecItem}>
                              Vessel: <Text style={styles.monSpecBold}>{t.vesselName || 'MV Colombo Star'}</Text>
                            </Text>
                            <Text style={styles.monSpecItem}>
                              Cargo: <Text style={styles.monSpecBoldGreen}>{count20 > 0 ? `${count20}×20FT ` : ''}{count40 > 0 ? `${count40}×40FT` : ''}</Text>
                            </Text>
                          </View>

                          {/* Container Manifest Chips */}
                          {t.containers && t.containers.length > 0 && (
                            <View style={styles.monContainersRow}>
                              <Ionicons name="cube" size={13} color="#00e5ff" />
                              <Text style={styles.monContainersText}>
                                {t.containers.map((c: any) => `${c.containerNumber} (${c.size || '40FT'})`).join('  •  ')}
                              </Text>
                            </View>
                          )}

                          {/* Decision Action Buttons if Pending Approval or In Progress */}
                          {(isPending || t.status === 'IN_PROGRESS') && (
                            <View style={styles.decisionButtonsRow}>
                              <TouchableOpacity
                                style={styles.approveBtn}
                                onPress={() => handleDischargeAndComplete(t)}
                              >
                                <Ionicons name="shield-checkmark" size={14} color="#00363d" />
                                <Text style={styles.approveBtnText}>
                                  {isPending ? 'APPROVE & DISCHARGE GATE PASS' : 'DISCHARGE & COMPLETE TRIP'}
                                </Text>
                              </TouchableOpacity>

                              {isPending && (
                                <TouchableOpacity
                                  style={styles.rejectBtn}
                                  onPress={() => handleOpenRejectModal(t)}
                                >
                                  <Ionicons name="close-circle" size={14} color="#ff5252" />
                                  <Text style={styles.rejectBtnText}>REJECT</Text>
                                </TouchableOpacity>
                              )}
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>
                </View>
              ))
            )}
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ─── MODAL: REJECT TRIP WITH MANDATORY REASON ─── */}
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
              Please specify the mandatory reason for rejecting Gate Pass for Trip{' '}
              <Text style={{ color: '#00e5ff', fontWeight: '800' }}>
                {tripToReject?.tripNumber || tripToReject?.id}
              </Text>.
            </Text>

            <TextInput
              style={styles.rejectionInput}
              placeholder="e.g. Container seal mismatch, incorrect destination terminal..."
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
                disabled={submittingDecision}
              >
                {submittingDecision ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={[styles.modalSubmitBtnText, { color: '#fff' }]}>
                    CONFIRM REJECTION
                  </Text>
                )}
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
  onlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#080e17',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#242a34',
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00e5ff',
  },
  onlineText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#00e5ff',
        letterSpacing: 0.6,
  },

  // ─── 4 SUMMARY METRIC CARDS ───
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCard: {
    width: '48%',
    backgroundColor: '#161c25',
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: '#242a34',
    padding: 12,
    gap: 4,
  },
  metricCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metricLabel: {
    color: '#849396',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '900',
        marginTop: 2,
  },
  metricSub: {
    color: '#849396',
    fontSize: 8,
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

  // ─── SEARCH & FILTER CHIPS ───
  searchBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#080e17',
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: '#242a34',
    paddingHorizontal: 12,
    height: 42,
  },
  searchInput: {
    flex: 1,
    color: '#dde2f0',
    fontSize: 11,
        ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  } as any,
  filterGroupLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#849396',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  filterChipsScroll: {
    gap: 6,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.sm,
    backgroundColor: '#080e17',
    borderWidth: 1,
    borderColor: '#242a34',
  },
  filterChipActive: {
    backgroundColor: 'rgba(254, 179, 0, 0.15)',
    borderColor: '#feb300',
  },
  filterChipActiveCyan: {
    backgroundColor: 'rgba(0, 229, 255, 0.15)',
    borderColor: '#00e5ff',
  },
  filterChipText: {
    color: '#849396',
    fontSize: 9,
    fontWeight: '800',
      },
  filterChipTextActive: {
    color: '#feb300',
  },
  filterChipTextActiveCyan: {
    color: '#00e5ff',
  },

  // ─── DATE-WISE GROUP STYLES ───
  dateGroupWrap: {
    gap: 4,
  },
  dateGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#101721',
    borderWidth: 1,
    borderColor: '#242a34',
    borderRadius: radius.DEFAULT,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dateGroupTitle: {
    color: '#dde2f0',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  todayPill: {
    backgroundColor: '#00e5ff',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
  },
  todayPillText: {
    color: '#00363d',
    fontSize: 8,
    fontWeight: '900',
  },
  yesterdayPill: {
    backgroundColor: 'rgba(254, 179, 0, 0.2)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#feb300',
  },
  yesterdayPillText: {
    color: '#feb300',
    fontSize: 8,
    fontWeight: '800',
  },
  dateGroupCountBadge: {
    backgroundColor: '#080e17',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#242a34',
  },
  dateGroupCountText: {
    color: '#00e5ff',
    fontSize: 9,
    fontWeight: '800',
  },
  monDriverThumb: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#00e5ff',
  },
  monDriverThumbFallback: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#101d30',
    borderWidth: 1.5,
    borderColor: '#00e5ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monDriverThumbText: {
    color: '#00e5ff',
    fontWeight: '900',
    fontSize: 12,
  },
  monDriverNameSmall: {
    color: '#dde2f0',
    fontSize: 10,
    fontWeight: '700',
  },
  monSpecBoldHighlight: {
    color: '#feb300',
    fontWeight: '800',
  },
  monSpecBoldCyan: {
    color: '#00e5ff',
    fontWeight: '800',
  },
  monSpecBoldGreen: {
    color: '#22ef7e',
    fontWeight: '800',
  },

  // ─── MONITORING CARDS ───
  monitoringCard: {
    backgroundColor: '#080e17',
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: '#242a34',
    padding: 12,
    gap: 8,
  },
  monHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  greenPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22ef7e',
  },
  monTripId: {
    color: '#00e5ff',
        fontSize: 12,
    fontWeight: '900',
  },
  monStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeGreen: { backgroundColor: 'rgba(34, 239, 126, 0.15)' },
  badgeCyan: { backgroundColor: 'rgba(0, 229, 255, 0.15)' },
  badgeAmber: { backgroundColor: 'rgba(254, 179, 0, 0.15)' },
  badgeRed: { backgroundColor: 'rgba(255, 82, 82, 0.15)' },
  monStatusText: {
    color: '#dde2f0',
    fontSize: 8,
    fontWeight: '800',
  },
  monRouteBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  monRouteText: {
    color: '#dde2f0',
    fontSize: 12,
    fontWeight: '800',
  },
  monTime: {
    color: '#849396',
    fontSize: 9,
      },
  monSpecsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  monSpecItem: {
    color: '#849396',
    fontSize: 9,
  },
  monSpecBold: {
    color: '#dde2f0',
    fontWeight: '600',
  },
  monContainersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#161c25',
  },
  monContainersText: {
    color: '#00e5ff',
    fontSize: 9,
      },
  emptyPendingCard: {
    backgroundColor: '#080e17',
    borderRadius: radius.DEFAULT,
    padding: 20,
    alignItems: 'center',
    gap: 6,
  },
  emptyPendingText: {
    color: '#dde2f0',
    fontSize: 11,
    fontWeight: '800',
  },
  emptyPendingSub: {
    color: '#849396',
    fontSize: 9,
    textAlign: 'center',
  },

  // ─── DECISION ACTION BUTTONS ───
  decisionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#161c25',
  },
  approveBtn: {
    flex: 1,
    height: 38,
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
    height: 38,
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
  },
});
