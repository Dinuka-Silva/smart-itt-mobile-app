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
import { Calendar } from 'react-native-calendars';
import { useAuthStore } from '../../../src/store/authStore';
import { tripService } from '../../../src/services/tripService';
import { useMockTripStore } from '../../../src/store/mockTripStore';
import { colors, radius, spacing } from '../../../src/theme';
import { resolveCheNumber, resolveOperator } from '../../../src/config/fleet';
import { useResponsive } from '../../../src/hooks/useResponsive';
import { getTripTimingDetails } from '../../../src/utils/tripDateUtils';
import { getTripDischargeTerminal } from '../../../src/utils/tripTerminalUtils';

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
  { id: 'DAILY', label: 'TODAY' },
  { id: 'YESTERDAY', label: 'YESTERDAY' },
  { id: 'WEEKLY', label: 'WEEK (7D)' },
  { id: 'MONTHLY', label: 'MONTH (30D)' },
  { id: 'RANGE', label: 'CUSTOM RANGE 📅' },
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
  const [dateRangeStart, setDateRangeStart] = useState<string | null>(null);
  const [dateRangeEnd, setDateRangeEnd] = useState<string | null>(null);
  const [dateRangeModalVisible, setDateRangeModalVisible] = useState(false);

  // Helper date formatters
  const formatFriendlyDate = (iso: string | null) => {
    if (!iso) return '';
    try {
      const d = new Date(iso + 'T00:00:00');
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return iso;
    }
  };

  const activePeriodLabel = useMemo(() => {
    if (selectedPeriodFilter === 'DAILY') return 'TODAY';
    if (selectedPeriodFilter === 'YESTERDAY') return 'YESTERDAY';
    if (selectedPeriodFilter === 'WEEKLY') return 'WEEK (7D)';
    if (selectedPeriodFilter === 'MONTHLY') return 'MONTH (30D)';
    if (selectedPeriodFilter === 'YEARLY') return 'YEAR';
    if (selectedPeriodFilter === 'RANGE') {
      if (dateRangeStart && dateRangeEnd) {
        return `${formatFriendlyDate(dateRangeStart)} ➔ ${formatFriendlyDate(dateRangeEnd)}`;
      }
      if (dateRangeStart) return `From ${formatFriendlyDate(dateRangeStart)}`;
      return 'CUSTOM RANGE';
    }
    return 'ALL TIME';
  }, [selectedPeriodFilter, dateRangeStart, dateRangeEnd]);

  // Marked dates computation for calendar (highlighting range)
  const calendarMarkedDates = useMemo(() => {
    const marks: Record<string, any> = {};
    if (dateRangeStart && dateRangeEnd) {
      const [y, m, d] = dateRangeStart.split('-').map(Number);
      const [endY, endM, endD] = dateRangeEnd.split('-').map(Number);
      const curDate = new Date(y, m - 1, d);
      const targetEndDate = new Date(endY, endM - 1, endD);

      while (curDate <= targetEndDate) {
        const year = curDate.getFullYear();
        const month = String(curDate.getMonth() + 1).padStart(2, '0');
        const day = String(curDate.getDate()).padStart(2, '0');
        const iso = `${year}-${month}-${day}`;
        const isStart = iso === dateRangeStart;
        const isEnd = iso === dateRangeEnd;

        marks[iso] = {
          selected: true,
          startingDay: isStart,
          endingDay: isEnd,
          color: isStart || isEnd ? '#00e5ff' : 'rgba(0, 229, 255, 0.22)',
          textColor: isStart || isEnd ? '#070c14' : '#00e5ff',
        };
        curDate.setDate(curDate.getDate() + 1);
      }
    } else if (dateRangeStart) {
      marks[dateRangeStart] = {
        selected: true,
        startingDay: true,
        endingDay: true,
        color: '#00e5ff',
        textColor: '#070c14',
      };
    }
    return marks;
  }, [dateRangeStart, dateRangeEnd]);

  // Handle day press on calendar for custom range selection
  const handleDayPress = (dateStr: string) => {
    if (!dateRangeStart || (dateRangeStart && dateRangeEnd)) {
      // Start a new range selection
      setDateRangeStart(dateStr);
      setDateRangeEnd(null);
    } else if (dateRangeStart && !dateRangeEnd) {
      if (dateStr < dateRangeStart) {
        // Tapped earlier date: make this the new start
        setDateRangeStart(dateStr);
      } else {
        // Complete the range
        setDateRangeEnd(dateStr);
      }
    }
  };

  // Quick Presets inside Calendar modal
  const handleApplyPreset = (preset: { label: string; days?: number; type?: string }) => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    if (preset.type === 'month') {
      const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      setDateRangeStart(monthStart);
      setDateRangeEnd(todayStr);
    } else if (preset.days === 0) {
      setDateRangeStart(todayStr);
      setDateRangeEnd(todayStr);
    } else if (preset.days === -1) {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const yStr = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`;
      setDateRangeStart(yStr);
      setDateRangeEnd(yStr);
    } else if (preset.days) {
      const past = new Date(now);
      past.setDate(past.getDate() - preset.days);
      const pastStr = `${past.getFullYear()}-${String(past.getMonth() + 1).padStart(2, '0')}-${String(past.getDate()).padStart(2, '0')}`;
      setDateRangeStart(pastStr);
      setDateRangeEnd(todayStr);
    }
  };

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

  // Trips filtered by Date Filter & Driver Filter (POWERS THE TRIP SUMMARY METRICS!)
  const dateFilteredTrips = useMemo(() => {
    return trips.filter((t) => {
      // 0. Driver Filter
      if (selectedDriverFilter !== 'ALL') {
        if (t.driverId !== selectedDriverFilter) return false;
      }

      // 0.1 Date Period / Range Filter
      if (selectedPeriodFilter !== 'ALL') {
        const rawDate = t.operationDate || t.startTime || t.createdAt;
        if (!rawDate) return false;
        const tripDateStr = rawDate.slice(0, 10);
        const now = new Date();
        const todayStr = now.toISOString().slice(0, 10);

        if (selectedPeriodFilter === 'DAILY') {
          if (tripDateStr !== todayStr) return false;
        } else if (selectedPeriodFilter === 'YESTERDAY') {
          const y = new Date();
          y.setDate(y.getDate() - 1);
          if (tripDateStr !== y.toISOString().slice(0, 10)) return false;
        } else if (selectedPeriodFilter === 'WEEKLY') {
          const tDate = new Date(rawDate);
          const diffDays = (now.getTime() - tDate.getTime()) / (1000 * 60 * 60 * 24);
          if (diffDays < 0 || diffDays > 7) return false;
        } else if (selectedPeriodFilter === 'MONTHLY') {
          const tDate = new Date(rawDate);
          const diffDays = (now.getTime() - tDate.getTime()) / (1000 * 60 * 60 * 24);
          if (diffDays < 0 || diffDays > 30) return false;
        } else if (selectedPeriodFilter === 'YEARLY') {
          const tDate = new Date(rawDate);
          if (tDate.getFullYear() !== now.getFullYear()) return false;
        } else if (selectedPeriodFilter === 'RANGE') {
          const effectiveStart = dateRangeStart;
          const effectiveEnd = dateRangeEnd || dateRangeStart;
          if (effectiveStart && tripDateStr < effectiveStart) return false;
          if (effectiveEnd && tripDateStr > effectiveEnd) return false;
        }
      }

      return true;
    });
  }, [trips, selectedDriverFilter, selectedPeriodFilter, dateRangeStart, dateRangeEnd]);

  // Trip Summary Metrics calculated from dateFilteredTrips
  const countTotal = dateFilteredTrips.length;
  const countInProgress = dateFilteredTrips.filter((t) => t.status === 'IN_PROGRESS').length;
  const countPending = dateFilteredTrips.filter((t) => t.status === 'PENDING_APPROVAL').length;
  const countCompleted = dateFilteredTrips.filter((t) => t.status === 'COMPLETED' || t.status === 'APPROVED').length;
  const totalContainersDispatched = dateFilteredTrips.reduce((acc, t) => acc + (t.containers?.length || 1), 0);

  // Filtered trips for list view (includes Terminal, Status, Search)
  const filteredTrips = useMemo(() => {
    return dateFilteredTrips.filter((t) => {
      // 1. Discharge Terminal Filter
      if (selectedTerminal !== 'ALL') {
        const tripDest = getTripDischargeTerminal(t).toUpperCase();
        const matchesDest = tripDest.includes(selectedTerminal.toUpperCase());
        const matchesContainerDest = (t.containers || []).some(
          (c: any) => (c.destTerminal || '').toUpperCase() === selectedTerminal.toUpperCase()
        );
        if (!matchesDest && !matchesContainerDest) return false;
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
        const chai = resolveCheNumber(t.vehicleNumber, t.chassisNumber || t.chaiNumber).toLowerCase();
        const contMatches = (t.containers || []).some((c: any) =>
          (c.containerNumber || '').toLowerCase().includes(q)
        );

        if (!tripNum.includes(q) && !vessel.includes(q) && !veh.includes(q) && !driver.includes(q) && !chai.includes(q) && !contMatches) {
          return false;
        }
      }

      return true;
    });
  }, [dateFilteredTrips, selectedTerminal, selectedStatus, searchQuery]);

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
        } catch { }

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

    // Terminal-wise Sorting by Discharge Terminal within each date group
    Object.values(groups).forEach((g) => {
      g.trips.sort((a, b) => (a.destTerminal || '').localeCompare(b.destTerminal || ''));
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
  const { topInset, bottomInset, contentMaxWidth, containerPaddingHorizontal } = useResponsive();

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: Math.max(topInset, 16),
            paddingBottom: Math.max(bottomInset + 30, 48),
            paddingHorizontal: containerPaddingHorizontal,
            maxWidth: contentMaxWidth,
            width: '100%',
            alignSelf: 'center',
          },
        ]}
        showsVerticalScrollIndicator={false}
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
        <View style={styles.summaryHeaderRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="bar-chart" size={15} color="#00e5ff" />
            <Text style={styles.summaryHeaderTitle}>TRIP SUMMARY METRICS</Text>
          </View>
          <TouchableOpacity
            style={styles.summaryDateBadge}
            onPress={() => setDateRangeModalVisible(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="calendar-outline" size={12} color="#00e5ff" />
            <Text style={styles.summaryDateBadgeText} numberOfLines={1}>{activePeriodLabel}</Text>
            <Ionicons name="chevron-down" size={12} color="#00e5ff" />
          </TouchableOpacity>
        </View>

        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <View style={styles.metricCardHeader}>
              <Text style={styles.metricLabel}>TOTAL TRIPS</Text>
              <Ionicons name="swap-horizontal" size={14} color="#00e5ff" />
            </View>
            <Text style={[styles.metricValue, { color: '#00e5ff' }]}>{countTotal}</Text>
            <Text style={styles.metricSub}>{totalContainersDispatched} Containers Dispatched</Text>
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

          {/* Date Period & Range Filter */}
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={styles.filterGroupLabel}>DATE PERIOD & RANGE FILTER</Text>
              {selectedPeriodFilter === 'RANGE' && dateRangeStart && (
                <TouchableOpacity
                  onPress={() => {
                    setSelectedPeriodFilter('DAILY');
                    setDateRangeStart(null);
                    setDateRangeEnd(null);
                  }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}
                >
                  <Ionicons name="close-circle" size={13} color="#ff5252" />
                  <Text style={{ fontSize: 9, color: '#ff5252', fontWeight: '800' }}>RESET</Text>
                </TouchableOpacity>
              )}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipsScroll}>
              {PERIOD_OPTIONS.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[
                    styles.filterChip,
                    selectedPeriodFilter === p.id && styles.filterChipActiveCyan,
                  ]}
                  onPress={() => {
                    if (p.id === 'RANGE') {
                      setSelectedPeriodFilter('RANGE');
                      setDateRangeModalVisible(true);
                    } else {
                      setSelectedPeriodFilter(p.id);
                      setDateRangeStart(null);
                      setDateRangeEnd(null);
                    }
                  }}
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

            {/* Active Custom Range Banner */}
            {selectedPeriodFilter === 'RANGE' && (
              <TouchableOpacity
                style={styles.activeRangeBanner}
                onPress={() => setDateRangeModalVisible(true)}
                activeOpacity={0.85}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                  <Ionicons name="calendar" size={14} color="#00e5ff" />
                  <Text style={styles.activeRangeBannerText}>
                    {dateRangeStart && dateRangeEnd
                      ? `Range: ${formatFriendlyDate(dateRangeStart)}  ➔  ${formatFriendlyDate(dateRangeEnd)}`
                      : dateRangeStart
                        ? `From: ${formatFriendlyDate(dateRangeStart)} (Tap to pick end date)`
                        : 'Tap to choose custom date range on calendar'}
                  </Text>
                </View>
                <View style={styles.changeRangeBtn}>
                  <Text style={styles.changeRangeBtnText}>CHANGE</Text>
                </View>
              </TouchableOpacity>
            )}
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

          {/* Discharge Terminal Filters */}
          <View>
            <Text style={styles.filterGroupLabel}>DISCHARGE TERMINAL FILTER (DESTINATION)</Text>
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
                                {getTripDischargeTerminal(t)}
                              </Text>
                            </View>
                            <View style={styles.monRouteTag}>
                              <Text style={styles.monRouteTagText}>ITT CORRIDOR</Text>
                            </View>
                          </View>

                          {/* ─── TRIP STARTED DATE TIME & END TIME DETAILS ─── */}
                          {(() => {
                            const timing = getTripTimingDetails(t);
                            return (
                              <View style={styles.monTimingPanel}>
                                <View style={styles.monTimingCol}>
                                  <View style={styles.monTimingHeader}>
                                    <Ionicons name="play-circle" size={12} color="#00e5ff" />
                                    <Text style={styles.monTimingLabel}>STARTED DATE & TIME</Text>
                                  </View>
                                  <Text style={styles.monTimingDate}>{timing.startDate}</Text>
                                  <Text style={styles.monTimingTime}>{timing.startTime}</Text>
                                </View>

                                <View style={styles.monTimingDivider}>
                                  <Ionicons name="arrow-forward" size={13} color="#3a4756" />
                                  {timing.duration && (
                                    <View style={styles.monDurationPill}>
                                      <Ionicons name="timer-outline" size={10} color="#22ef7e" />
                                      <Text style={styles.monDurationText}>{timing.duration}</Text>
                                    </View>
                                  )}
                                </View>

                                <View style={styles.monTimingCol}>
                                  <View style={styles.monTimingHeader}>
                                    <Ionicons
                                      name={timing.isCompleted ? 'checkmark-circle' : timing.isPending ? 'time' : 'navigate-circle'}
                                      size={12}
                                      color={timing.statusColor}
                                    />
                                    <Text style={[styles.monTimingLabel, { color: timing.statusColor }]}>
                                      {timing.isCompleted ? 'COMPLETED DATE & TIME' : timing.isPending ? 'DISCHARGED' : 'CURRENT STATUS'}
                                    </Text>
                                  </View>
                                  <Text style={[styles.monTimingDate, !timing.isCompleted && !timing.isPending && { color: '#849396' }]}>
                                    {timing.endDate}
                                  </Text>
                                  <Text style={[styles.monTimingTime, { color: timing.statusColor }]}>
                                    {timing.endTime}
                                  </Text>
                                </View>
                              </View>
                            );
                          })()}

                          {/* Specs Row */}
                          <View style={styles.monSpecsRow}>
                            <Text style={styles.monSpecItem}>
                              Truck: <Text style={styles.monSpecBoldHighlight}>{t.vehicleNumber || 'LY-6439'}</Text>
                            </Text>
                            <Text style={styles.monSpecItem}>
                              CHE: <Text style={styles.monSpecBoldCyan}>{resolveCheNumber(t.vehicleNumber, t.chassisNumber || t.chaiNumber)}</Text>
                            </Text>
                            <Text style={styles.monSpecItem}>
                              Operator: <Text style={styles.monSpecBoldCyan}>{resolveOperator(t.vehicleNumber, t.operator)}</Text>
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
                                {t.containers.map((c: any) => `${c.containerNumber} (${c.size || '20FT'} ➔ ${c.destTerminal || getTripDischargeTerminal(t)})`).join('  •  ')}
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

      {/* ─── MODAL: CUSTOM DATE RANGE CALENDAR ─── */}
      <Modal visible={dateRangeModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.calendarModalCard}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="calendar" size={18} color="#00e5ff" />
                <Text style={styles.modalTitle}>FILTER BY DATE RANGE</Text>
              </View>
              <TouchableOpacity
                onPress={() => setDateRangeModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={22} color="#849396" />
              </TouchableOpacity>
            </View>

            {/* Quick Presets Row */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.calendarPresetsRow}>
              {[
                { label: 'Today', days: 0 },
                { label: 'Yesterday', days: -1 },
                { label: 'Last 7 Days', days: 7 },
                { label: 'Last 30 Days', days: 30 },
                { label: 'This Month', type: 'month' },
              ].map((p, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.calendarPresetChip}
                  onPress={() => handleApplyPreset(p)}
                >
                  <Text style={styles.calendarPresetText}>{p.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Selected Range Display Status */}
            <View style={styles.calendarRangeDisplay}>
              <View style={styles.rangeDateCol}>
                <Text style={styles.rangeDateLabel}>START DATE</Text>
                <Text style={styles.rangeDateVal}>
                  {dateRangeStart ? formatFriendlyDate(dateRangeStart) : 'Select Start'}
                </Text>
              </View>
              <Ionicons name="arrow-forward" size={16} color="#00e5ff" />
              <View style={styles.rangeDateCol}>
                <Text style={styles.rangeDateLabel}>END DATE</Text>
                <Text style={styles.rangeDateVal}>
                  {dateRangeEnd
                    ? formatFriendlyDate(dateRangeEnd)
                    : dateRangeStart
                      ? 'Tap End Date'
                      : '—'}
                </Text>
              </View>
            </View>

            {/* Calendar */}
            <View style={styles.calendarWrapper}>
              <Calendar
                markingType={'period'}
                markedDates={calendarMarkedDates}
                onDayPress={(day) => handleDayPress(day.dateString)}
                theme={{
                  backgroundColor: '#0c1524',
                  calendarBackground: '#0c1524',
                  textSectionTitleColor: '#849396',
                  selectedDayBackgroundColor: '#00e5ff',
                  selectedDayTextColor: '#070c14',
                  todayTextColor: '#00e5ff',
                  dayTextColor: '#dde2f0',
                  textDisabledColor: '#323f4b',
                  arrowColor: '#00e5ff',
                  monthTextColor: '#00e5ff',
                  indicatorColor: '#00e5ff',
                  textDayFontWeight: '600',
                  textMonthFontWeight: '800',
                  textDayHeaderFontWeight: '700',
                  textDayFontSize: 13,
                  textMonthFontSize: 14,
                  textDayHeaderFontSize: 11,
                }}
              />
            </View>

            {/* Action Buttons */}
            <View style={styles.calendarModalActions}>
              <TouchableOpacity
                style={styles.calendarResetBtn}
                onPress={() => {
                  setDateRangeStart(null);
                  setDateRangeEnd(null);
                }}
              >
                <Ionicons name="refresh" size={14} color="#849396" />
                <Text style={styles.calendarResetBtnText}>CLEAR DATES</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.calendarApplyBtn}
                onPress={() => {
                  if (dateRangeStart) {
                    setSelectedPeriodFilter('RANGE');
                  }
                  setDateRangeModalVisible(false);
                }}
              >
                <Ionicons name="checkmark-done" size={15} color="#002022" />
                <Text style={styles.calendarApplyBtnText}>APPLY FILTER</Text>
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
    flexGrow: 1,
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
  monRouteTag: {
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.25)',
  },
  monRouteTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#00e5ff',
    letterSpacing: 0.5,
  },
  monTimingPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#070c14',
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: '#1e293b',
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
    marginVertical: 4,
  },
  monTimingCol: {
    flex: 1,
    gap: 1,
  },
  monTimingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  monTimingLabel: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#00e5ff',
    letterSpacing: 0.4,
  },
  monTimingDate: {
    fontSize: 11,
    fontWeight: '700',
    color: '#dde2f0',
  },
  monTimingTime: {
    fontSize: 12,
    fontWeight: '900',
    color: '#00e5ff',
    letterSpacing: 0.2,
  },
  monTimingDivider: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingHorizontal: 2,
  },
  monDurationPill: {
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
  monDurationText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#22ef7e',
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
  summaryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryHeaderTitle: {
    color: '#00e5ff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  summaryDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0, 229, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  summaryDateBadgeText: {
    color: '#00e5ff',
    fontSize: 11,
    fontWeight: '700',
  },
  activeRangeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 229, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 8,
  },
  activeRangeBannerText: {
    color: '#dde2f0',
    fontSize: 11,
    fontWeight: '600',
  },
  changeRangeBtn: {
    backgroundColor: '#00e5ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  changeRangeBtnText: {
    color: '#002022',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  // ─── CALENDAR MODAL ───
  calendarModalCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#0c1524',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1d2e47',
    padding: 16,
    gap: 12,
  },
  calendarPresetsRow: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
  },
  calendarPresetChip: {
    backgroundColor: '#122033',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1f3452',
  },
  calendarPresetText: {
    color: '#00e5ff',
    fontSize: 11,
    fontWeight: '700',
  },
  calendarRangeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#070c14',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.25)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  rangeDateCol: {
    alignItems: 'center',
    gap: 2,
  },
  rangeDateLabel: {
    color: '#849396',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  rangeDateVal: {
    color: '#dde2f0',
    fontSize: 12,
    fontWeight: '700',
  },
  calendarWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#192b45',
  },
  calendarModalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  calendarResetBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#162233',
    borderWidth: 1,
    borderColor: '#233750',
  },
  calendarResetBtnText: {
    color: '#849396',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  calendarApplyBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#00e5ff',
  },
  calendarApplyBtnText: {
    color: '#002022',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
});
