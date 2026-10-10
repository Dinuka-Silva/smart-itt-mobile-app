import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../../src/store/authStore';
import { tripService } from '../../../src/services/tripService';
import { dashboardService, SupervisorDashboardStats } from '../../../src/services/dashboardService';
import { driverService, DriverProfile } from '../../../src/services/driverService';
import { colors, radius, spacing } from '../../../src/theme';
import { useMockTripStore } from '../../../src/store/mockTripStore';

const TERMINALS = ['ALL', 'CICT', 'CWIT', 'ECT', 'JCT', 'UCT', 'SAGT'] as const;
const STATUS_FILTERS = ['ALL', 'PENDING_APPROVAL', 'IN_PROGRESS', 'COMPLETED', 'APPROVED'] as const;

export default function SupervisorHomeDashboard() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();

  // Data States
  const [stats, setStats] = useState<SupervisorDashboardStats>({
    totalTripsToday: 0,
    activeTrips: 0,
    tripsPendingApproval: 0,
    completedTripsToday: 0,
    approvedTrips: 0,
    rejectedTrips: 0,
    totalContainersTransportedToday: 0,
    registeredDrivers: 0,
    activeDrivers: 0,
    terminalWiseTrips: {
      CICT: 0,
      CWIT: 0,
      ECT: 0,
      JCT: 0,
      UCT: 0,
      SAGT: 0,
    },
  });
  const [trips, setTrips] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTerminal, setSelectedTerminal] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Modal States
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [tripToReject, setTripToReject] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [submittingDecision, setSubmittingDecision] = useState(false);

  const [notificationsModalVisible, setNotificationsModalVisible] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [damageReviewModalVisible, setDamageReviewModalVisible] = useState(false);

  const mockTrips = useMockTripStore((s) => s.mockTrips);

  // Fetch live supervisor data
  const loadDashboardData = useCallback(async () => {
    try {
      // 1. Fetch live dashboard metrics
      const dashMetrics = await dashboardService.getSupervisorDashboard();
      setStats(dashMetrics);

      // 2. Fetch live trips from backend
      const apiTrips = await tripService.getTrips();
      const tripList = Array.isArray(apiTrips) ? apiTrips : [];
      const byId = new Map<string, any>();
      tripList.forEach((t) => byId.set(t.id, t));
      mockTrips.forEach((t) => { if (!byId.has(t.id)) byId.set(t.id, t); });
      setTrips(Array.from(byId.values()));

      // 3. Fetch registered drivers
      try {
        const driversList = await driverService.getAllDrivers();
        setDrivers(Array.isArray(driversList) ? driversList : []);
      } catch {
        // Fallback demo drivers
        setDrivers([
          {
            id: 'drv-1',
            driverCode: 'DRV-00001',
            username: 'DRV-00001',
            fullName: 'Kamal Perera',
            employeeId: 'DRV001',
            nic: '198512345678',
            mobileNumber: '0779876543',
            vehicleNumber: 'WP-BA-1234',
            status: 'ACTIVE',
          },
          {
            id: 'drv-2',
            driverCode: 'DRV-00002',
            username: 'DRV-00002',
            fullName: 'Kasun Chamara Perera',
            employeeId: 'EMP-3273',
            nic: '19923273042V',
            mobileNumber: '077327321',
            vehicleNumber: 'WP-DA-3273',
            status: 'ACTIVE',
          },
          {
            id: 'drv-3',
            driverCode: 'DRV-00003',
            username: 'DRV-00003',
            fullName: 'Saman Kumara Wickramasinghe',
            employeeId: 'EMP-8227',
            nic: '19888227042V',
            mobileNumber: '077822712',
            vehicleNumber: 'WP-DA-8227',
            status: 'ACTIVE',
          },
        ]);
      }
    } catch (e) {
      console.warn('Dashboard loading fallback:', e);
      setTrips(mockTrips);
    } finally {
      setRefreshing(false);
    }
  }, [mockTrips]);

  useEffect(() => { loadDashboardData(); }, [loadDashboardData]);

  const supervisorName = user?.name || user?.fullName || 'Nimal Silva';
  const supervisorInitials = supervisorName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
  const currentDateFormatted = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).toUpperCase();

  // Filtered trips for Trip Monitoring
  const filteredTrips = useMemo(() => {
    return trips.filter((t) => {
      // 1. Terminal Filter
      if (selectedTerminal !== 'ALL') {
        const matchesOrigin = t.sourceTerminal === selectedTerminal;
        const matchesDest = t.destTerminal === selectedTerminal;
        if (!matchesOrigin && !matchesDest) return false;
      }

      // 2. Status Filter
      if (selectedStatus !== 'ALL') {
        if (t.status !== selectedStatus) return false;
      }

      // 3. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const tripNum = (t.tripNumber || '').toLowerCase();
        const vessel = (t.vesselName || '').toLowerCase();
        const veh = (t.vehicleNumber || '').toLowerCase();
        const driver = (t.driverName || '').toLowerCase();
        const contMatches = (t.containers || []).some((c: any) =>
          (c.containerNumber || '').toLowerCase().includes(q)
        );

        if (!tripNum.includes(q) && !vessel.includes(q) && !veh.includes(q) && !driver.includes(q) && !contMatches) {
          return false;
        }
      }

      return true;
    });
  }, [trips, selectedTerminal, selectedStatus, searchQuery]);

  // Trips pending supervisor approval
  const pendingTrips = useMemo(() => {
    return trips.filter((t) => t.status === 'PENDING_APPROVAL');
  }, [trips]);

  // Approval actions
  const handleApproveTrip = async (trip: any) => {
    try {
      await tripService.approveTrip(trip.id, user?.id || 'sup-001', 'Approved by Operations Supervisor');
      useMockTripStore.getState().updateTripStatus(trip.id, 'APPROVED');
      Alert.alert('Gate Pass Approved', `Trip ${trip.tripNumber || trip.id} is approved.`);
      await loadDashboardData();
    } catch {
      useMockTripStore.getState().updateTripStatus(trip.id, 'APPROVED');
      Alert.alert('Gate Pass Approved (Local)', `Trip ${trip.tripNumber || trip.id} is approved.`);
      await loadDashboardData();
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
      Alert.alert('Trip Rejected', `Trip ${tripToReject.tripNumber} rejected: ${rejectionReason}`);
      await loadDashboardData();
    } catch {
      useMockTripStore.getState().updateTripStatus(tripToReject.id, 'REJECTED');
      setRejectModalVisible(false);
      Alert.alert('Trip Rejected (Local)', `Trip ${tripToReject.tripNumber} rejected.`);
      await loadDashboardData();
    } finally {
      setSubmittingDecision(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadDashboardData(); }} tintColor="#00e5ff" />}
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
                <Text style={styles.dateText}>{currentDateFormatted}</Text>
              </View>
            </View>
          </View>

          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.headerIconBtn} onPress={() => setNotificationsModalVisible(true)}>
              <Ionicons name="notifications" size={18} color="#00e5ff" />
              <View style={styles.unreadDot} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.headerLogoutBtn}
              onPress={() => {
                logout();
                router.replace('/(auth)/login');
              }}
            >
              <Ionicons name="log-out-outline" size={18} color="#ff5252" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── B. SUPERVISOR SUMMARY METRIC CARDS (LIVE BACKEND DATA) ─── */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <View style={styles.metricCardHeader}>
              <Text style={styles.metricLabel}>TOTAL TRIPS TODAY</Text>
              <Ionicons name="layers" size={16} color="#00e5ff" />
            </View>
            <Text style={[styles.metricValue, { color: '#00e5ff' }]}>{stats.totalTripsToday}</Text>
            <Text style={styles.metricSub}>Port Movements</Text>
          </View>

          <View style={styles.metricCard}>
            <View style={styles.metricCardHeader}>
              <Text style={styles.metricLabel}>ACTIVE TRIPS</Text>
              <Ionicons name="navigate" size={16} color="#22ef7e" />
            </View>
            <Text style={[styles.metricValue, { color: '#22ef7e' }]}>{stats.activeTrips}</Text>
            <Text style={styles.metricSub}>In Transit</Text>
          </View>

          <View style={[styles.metricCard, { borderColor: '#feb300' }]}>
            <View style={styles.metricCardHeader}>
              <Text style={[styles.metricLabel, { color: '#feb300' }]}>PENDING APPROVAL</Text>
              <Ionicons name="time" size={16} color="#feb300" />
            </View>
            <Text style={[styles.metricValue, { color: '#feb300' }]}>{stats.tripsPendingApproval}</Text>
            <Text style={styles.metricSub}>Needs Action</Text>
          </View>

          <View style={styles.metricCard}>
            <View style={styles.metricCardHeader}>
              <Text style={styles.metricLabel}>COMPLETED TODAY</Text>
              <Ionicons name="checkmark-done" size={16} color="#22ef7e" />
            </View>
            <Text style={[styles.metricValue, { color: '#22ef7e' }]}>{stats.completedTripsToday}</Text>
            <Text style={styles.metricSub}>Discharged</Text>
          </View>

          <View style={styles.metricCard}>
            <View style={styles.metricCardHeader}>
              <Text style={styles.metricLabel}>CONTAINERS (TEU)</Text>
              <Ionicons name="cube" size={16} color="#00e5ff" />
            </View>
            <Text style={[styles.metricValue, { color: '#00e5ff' }]}>{stats.totalContainersTransportedToday}</Text>
            <Text style={styles.metricSub}>Loaded/Handed</Text>
          </View>

          <View style={styles.metricCard}>
            <View style={styles.metricCardHeader}>
              <Text style={styles.metricLabel}>REGISTERED DRIVERS</Text>
              <Ionicons name="people" size={16} color="#849396" />
            </View>
            <Text style={[styles.metricValue, { color: '#dde2f0' }]}>{stats.registeredDrivers}</Text>
            <Text style={styles.metricSub}>{stats.activeDrivers} Active on Duty</Text>
          </View>
        </View>

        {/* ─── D. TRIP APPROVAL MANAGEMENT (PENDING APPROVALS SECTION) ─── */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="shield-checkmark" size={18} color="#feb300" />
            <Text style={[styles.sectionTitle, { color: '#feb300' }]}>
              PENDING GATE PASS APPROVALS ({pendingTrips.length})
            </Text>
          </View>

          {pendingTrips.length === 0 ? (
            <View style={styles.emptyPendingCard}>
              <Ionicons name="checkmark-circle-outline" size={28} color="#22ef7e" />
              <Text style={styles.emptyPendingText}>ALL SUBMITTED TRIPS HAVE BEEN REVIEWED</Text>
              <Text style={styles.emptyPendingSub}>No ITT missions currently awaiting supervisor clearance.</Text>
            </View>
          ) : (
            pendingTrips.map((trip) => {
              const c20 = (trip.containers || []).filter((c: any) => c.size === '20FT' || c.size === 'FT_20').length;
              const c40 = (trip.containers || []).filter((c: any) => c.size === '40FT' || c.size === 'FT_40').length;
              return (
                <View key={trip.id} style={styles.pendingCard}>
                  <View style={styles.pendingCardHeader}>
                    <View>
                      <Text style={styles.pendingTripId}>{trip.tripNumber || `ITT-${trip.id?.slice(0, 6)}`}</Text>
                      <Text style={styles.pendingDriver}>
                        Operator: {trip.driverName || 'Kamal Perera'} · Truck: {trip.vehicleNumber || 'WP-BA-1234'}
                      </Text>
                    </View>
                    <View style={styles.pendingAwaitingTag}>
                      <Text style={styles.pendingAwaitingTagText}>AWAITING GATE PASS</Text>
                    </View>
                  </View>

                  {/* Route & Cargo details */}
                  <View style={styles.pendingSpecsRow}>
                    <Text style={styles.pendingSpec}>
                      Route: <Text style={styles.pendingSpecHighlight}>{trip.sourceTerminal} ➔ {trip.destTerminal}</Text>
                    </Text>
                    <Text style={styles.pendingSpec}>
                      Vessel: <Text style={styles.pendingSpecHighlight}>{trip.vesselName || 'MV Colombo Star'}</Text>
                    </Text>
                    <Text style={styles.pendingSpec}>
                      Chai No: <Text style={styles.pendingSpecHighlight}>{trip.chassisNumber || 'CHAI-101'}</Text>
                    </Text>
                    <Text style={styles.pendingSpec}>
                      Containers: <Text style={styles.pendingSpecHighlight}>{c20}×20FT · {c40}×40FT</Text>
                    </Text>
                  </View>

                  {/* Containers manifest list */}
                  {trip.containers && trip.containers.length > 0 && (
                    <View style={styles.pendingContainersList}>
                      {trip.containers.map((c: any, idx: number) => (
                        <View key={c.id || idx} style={styles.pendingContainerPill}>
                          <Ionicons name="cube" size={12} color="#00e5ff" />
                          <Text style={styles.pendingContNum}>{c.containerNumber}</Text>
                          <Text style={styles.pendingContSize}>({c.size})</Text>
                          <Text style={styles.pendingContStatus}>Status: {c.status}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Supervisor Decision Buttons */}
                  <View style={styles.decisionButtonsRow}>
                    <TouchableOpacity
                      style={styles.approveBtn}
                      onPress={() => handleApproveTrip(trip)}
                    >
                      <Ionicons name="checkmark-circle" size={16} color="#00363d" />
                      <Text style={styles.approveBtnText}>APPROVE GATE PASS</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.rejectBtn}
                      onPress={() => handleOpenRejectModal(trip)}
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

        {/* ─── C. LIVE TRIP MONITORING (NO GPS / LOCATION TRACKING) ─── */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="radio" size={18} color="#00e5ff" />
            <Text style={styles.sectionTitle}>LIVE TRIP MONITORING</Text>
          </View>

          {/* Search Bar */}
          <View style={styles.searchBarWrap}>
            <Ionicons name="search" size={16} color="#849396" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by Trip ID, Container, Vehicle, Vessel..."
              placeholderTextColor="#849396"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={16} color="#849396" />
              </TouchableOpacity>
            )}
          </View>

          {/* Terminal Filters Chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipsScroll}>
            {TERMINALS.map((term) => (
              <TouchableOpacity
                key={term}
                style={[styles.filterChip, selectedTerminal === term && styles.filterChipActive]}
                onPress={() => setSelectedTerminal(term)}
              >
                <Text style={[styles.filterChipText, selectedTerminal === term && styles.filterChipTextActive]}>
                  {term}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Status Filters Chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipsScroll}>
            {STATUS_FILTERS.map((st) => (
              <TouchableOpacity
                key={st}
                style={[styles.filterChip, selectedStatus === st && styles.filterChipActiveCyan]}
                onPress={() => setSelectedStatus(st)}
              >
                <Text style={[styles.filterChipText, selectedStatus === st && styles.filterChipTextActiveCyan]}>
                  {st}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Trips List */}
          <View style={{ gap: 10 }}>
            {filteredTrips.length === 0 ? (
              <View style={styles.emptyPendingCard}>
                <Text style={styles.emptyPendingText}>NO TRIPS MATCH CRITERIA</Text>
              </View>
            ) : (
              filteredTrips.map((t) => (
                <View key={t.id} style={styles.monitoringCard}>
                  <View style={styles.monHeader}>
                    <Text style={styles.monTripId}>{t.tripNumber || `ITT-${t.id?.slice(0, 6)}`}</Text>
                    <View
                      style={[
                        styles.monStatusBadge,
                        t.status === 'COMPLETED' ? styles.badgeGreen :
                        t.status === 'IN_PROGRESS' ? styles.badgeCyan :
                        t.status === 'PENDING_APPROVAL' ? styles.badgeAmber : styles.badgeDefault,
                      ]}
                    >
                      <Text style={styles.monStatusText}>{t.status}</Text>
                    </View>
                  </View>

                  <View style={styles.monRouteBox}>
                    <Text style={styles.monRouteText}>
                      {t.sourceTerminal} ➔ {t.destTerminal}
                    </Text>
                    <Text style={styles.monTime}>
                      {t.startTime ? new Date(t.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '09:00 AM'}
                    </Text>
                  </View>

                  <View style={styles.monSpecsRow}>
                    <Text style={styles.monSpecItem}>Driver: <Text style={styles.monSpecBold}>{t.driverName || 'Kamal Perera'}</Text></Text>
                    <Text style={styles.monSpecItem}>Truck: <Text style={styles.monSpecBold}>{t.vehicleNumber || 'WP-BA-1234'}</Text></Text>
                    <Text style={styles.monSpecItem}>Vessel: <Text style={styles.monSpecBold}>{t.vesselName || 'MV Colombo Star'}</Text></Text>
                    <Text style={styles.monSpecItem}>Chai No: <Text style={styles.monSpecBold}>{t.chassisNumber || 'CHAI-102'}</Text></Text>
                  </View>

                  {t.containers && t.containers.length > 0 && (
                    <View style={styles.monContainersRow}>
                      <Ionicons name="cube-outline" size={13} color="#00e5ff" />
                      <Text style={styles.monContainersText}>
                        {t.containers.map((c: any) => `${c.containerNumber} (${c.size})`).join(', ')}
                      </Text>
                    </View>
                  )}
                </View>
              ))
            )}
          </View>
        </View>

        {/* ─── E. DRIVER MANAGEMENT VIEW ─── */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="people" size={18} color="#00e5ff" />
            <Text style={styles.sectionTitle}>REGISTERED OPERATORS ({drivers.length})</Text>
          </View>

          <View style={{ gap: 8 }}>
            {drivers.map((drv) => (
              <View key={drv.id} style={styles.driverRowCard}>
                <View style={styles.driverAvatar}>
                  <Text style={styles.driverAvatarText}>{drv.fullName?.[0] || 'D'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.driverFullName}>{drv.fullName}</Text>
                  <Text style={styles.driverDetails}>
                    Code: {drv.driverCode} · Truck: {drv.vehicleNumber || 'WP-BA-1234'} · Tel: {drv.mobileNumber}
                  </Text>
                </View>
                <View style={styles.driverActivePill}>
                  <View style={styles.greenDot} />
                  <Text style={styles.driverActivePillText}>{drv.status || 'ACTIVE'}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* ─── F. TERMINAL AND CONTAINER REPORTS SUMMARY ─── */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="business" size={18} color="#00e5ff" />
            <Text style={styles.sectionTitle}>SLPA 6-TERMINAL CONSOLIDATED TOTALS</Text>
          </View>

          <View style={styles.terminalGrid}>
            {['CICT', 'CWIT', 'ECT', 'JCT', 'UCT', 'SAGT'].map((tName) => {
              const tripCount = stats.terminalWiseTrips?.[tName] || 0;
              return (
                <View key={tName} style={styles.terminalGridItem}>
                  <Text style={styles.termGridName}>{tName}</Text>
                  <Text style={styles.termGridCount}>{tripCount}</Text>
                  <Text style={styles.termGridSub}>Trips Today</Text>
                </View>
              );
            })}
          </View>

          <TouchableOpacity style={styles.exportReportBtn} onPress={() => setReportModalVisible(true)}>
            <Ionicons name="document-text" size={18} color="#00363d" />
            <Text style={styles.exportReportBtnText}>GENERATE OFFICIAL TERMINAL REPORT</Text>
          </TouchableOpacity>
        </View>

        {/* ─── H. SUPERVISOR QUICK ACTIONS ─── */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionTitle}>SUPERVISOR QUICK ACTIONS</Text>
          <View style={styles.quickGrid}>
            <TouchableOpacity style={styles.quickTile} onPress={() => router.push('/(supervisor)/(tabs)/approvals')}>
              <Ionicons name="shield-checkmark" size={22} color="#feb300" />
              <Text style={styles.quickTileText}>Pending Passes</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickTile} onPress={() => router.push('/(supervisor)/(tabs)/trips')}>
              <Ionicons name="layers" size={22} color="#00e5ff" />
              <Text style={styles.quickTileText}>Dispatcher Hub</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickTile} onPress={() => router.push('/(supervisor)/(tabs)/drivers')}>
              <Ionicons name="people" size={22} color="#22ef7e" />
              <Text style={styles.quickTileText}>Operators</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickTile} onPress={() => setReportModalVisible(true)}>
              <Ionicons name="bar-chart" size={22} color="#00e5ff" />
              <Text style={styles.quickTileText}>Daily Report</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickTile} onPress={() => setDamageReviewModalVisible(true)}>
              <Ionicons name="warning" size={22} color="#ff5252" />
              <Text style={styles.quickTileText}>Damage Review</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickTile} onPress={() => setNotificationsModalVisible(true)}>
              <Ionicons name="notifications" size={22} color="#feb300" />
              <Text style={styles.quickTileText}>Alerts</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ─── MODAL 1: MANDATORY REJECTION REASON ─── */}
      <Modal visible={rejectModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="alert-circle" size={20} color="#ff5252" />
                <Text style={[styles.modalTitle, { color: '#ff5252' }]}>REJECT TRIP SUBMISSION</Text>
              </View>
              <TouchableOpacity onPress={() => setRejectModalVisible(false)}>
                <Ionicons name="close" size={22} color="#849396" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalPrompt}>
              Please enter mandatory rejection reason for Trip {tripToReject?.tripNumber}.
              The driver will be notified to correct and re-submit.
            </Text>

            <View style={[styles.inputWrap, { height: 90, alignItems: 'flex-start', paddingTop: 8 }]}>
              <TextInput
                style={[styles.modalInput, { height: 74 }]}
                placeholder="e.g. Container seal mismatch, incorrect Chai No, incorrect destination terminal..."
                placeholderTextColor="#849396"
                multiline
                value={rejectionReason}
                onChangeText={setRejectionReason}
              />
            </View>

            <TouchableOpacity
              style={[styles.modalSubmitBtn, { backgroundColor: '#ff5252' }]}
              onPress={handleConfirmRejection}
              disabled={submittingDecision}
            >
              {submittingDecision ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="close-circle" size={18} color="#fff" />
                  <Text style={[styles.modalSubmitBtnText, { color: '#fff' }]}>CONFIRM REJECTION WITH REASON</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── MODAL 2: REPORT SUMMARY & EXPORT ─── */}
      <Modal visible={reportModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="document-text" size={20} color="#00e5ff" />
                <Text style={styles.modalTitle}>OFFICIAL TERMINAL CONSOLIDATED REPORT</Text>
              </View>
              <TouchableOpacity onPress={() => setReportModalVisible(false)}>
                <Ionicons name="close" size={22} color="#849396" />
              </TouchableOpacity>
            </View>

            <View style={{ gap: 8 }}>
              <Text style={styles.repRow}>• Total ITT Movements: <Text style={styles.repVal}>{stats.totalTripsToday}</Text></Text>
              <Text style={styles.repRow}>• Completed Discharges: <Text style={styles.repVal}>{stats.completedTripsToday}</Text></Text>
              <Text style={styles.repRow}>• Active In-Transit: <Text style={styles.repVal}>{stats.activeTrips}</Text></Text>
              <Text style={styles.repRow}>• Gate Pass Approvals: <Text style={styles.repVal}>{stats.approvedTrips}</Text></Text>
              <Text style={styles.repRow}>• Total Containers: <Text style={styles.repVal}>{stats.totalContainersTransportedToday} TEU</Text></Text>
              <Text style={styles.repRow}>• Reporting Date: <Text style={styles.repVal}>{currentDateFormatted}</Text></Text>
            </View>

            <TouchableOpacity
              style={styles.modalSubmitBtn}
              onPress={() => {
                Alert.alert('Report Exported', 'CSV summary generated and downloaded to terminal storage.');
                setReportModalVisible(false);
              }}
            >
              <Ionicons name="download" size={18} color="#00363d" />
              <Text style={styles.modalSubmitBtnText}>EXPORT CSV REPORT</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── MODAL 3: NOTIFICATIONS ─── */}
      <Modal visible={notificationsModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="notifications" size={20} color="#00e5ff" />
                <Text style={styles.modalTitle}>SUPERVISOR OPERATIONS ALERTS</Text>
              </View>
              <TouchableOpacity onPress={() => setNotificationsModalVisible(false)}>
                <Ionicons name="close" size={22} color="#849396" />
              </TouchableOpacity>
            </View>

            <View style={{ gap: 10 }}>
              <View style={styles.notifItem}>
                <Ionicons name="time" size={18} color="#feb300" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.notifTitle}>New Trip Submission (ITT-00002)</Text>
                  <Text style={styles.notifSub}>Driver Kasun Chamara submitted for Gate Pass clearance.</Text>
                </View>
              </View>
              <View style={styles.notifItem}>
                <Ionicons name="checkmark-circle" size={18} color="#22ef7e" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.notifTitle}>Handover Confirmed at ECT</Text>
                  <Text style={styles.notifSub}>Truck WP-BA-1234 completed container discharge.</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity style={styles.modalSubmitBtn} onPress={() => setNotificationsModalVisible(false)}>
              <Text style={styles.modalSubmitBtnText}>DISMISS ALERTS</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── MODAL 4: DAMAGE INCIDENTS ─── */}
      <Modal visible={damageReviewModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="warning" size={20} color="#ff5252" />
                <Text style={[styles.modalTitle, { color: '#ff5252' }]}>CONTAINER DAMAGE INCIDENTS</Text>
              </View>
              <TouchableOpacity onPress={() => setDamageReviewModalVisible(false)}>
                <Ionicons name="close" size={22} color="#849396" />
              </TouchableOpacity>
            </View>

            <View style={styles.notifItem}>
              <Ionicons name="warning-outline" size={20} color="#ff5252" />
              <View style={{ flex: 1 }}>
                <Text style={styles.notifTitle}>MSCU-884192 (Dent on Left Corner)</Text>
                <Text style={styles.notifSub}>Reported during transfer at CICT Bay 4. Inspected and approved for onward transit.</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.modalSubmitBtn} onPress={() => setDamageReviewModalVisible(false)}>
              <Text style={styles.modalSubmitBtnText}>CLOSE INCIDENTS</Text>
            </TouchableOpacity>
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.DEFAULT,
    backgroundColor: '#080e17',
    borderWidth: 1,
    borderColor: '#242a34',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  unreadDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00e5ff',
  },
  headerLogoutBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.DEFAULT,
    backgroundColor: 'rgba(255, 82, 82, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 82, 82, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ─── 6 SUMMARY METRIC CARDS ───
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCard: {
    width: '31%',
    backgroundColor: '#161c25',
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: '#242a34',
    padding: 10,
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
    fontSize: 20,
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

  // ─── PENDING APPROVALS ───
  emptyPendingCard: {
    backgroundColor: '#080e17',
    borderRadius: radius.DEFAULT,
    padding: 16,
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
  pendingCard: {
    backgroundColor: '#080e17',
    borderRadius: radius.DEFAULT,
    borderWidth: 1.5,
    borderColor: '#feb300',
    padding: 12,
    gap: 10,
  },
  pendingCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  pendingTripId: {
    color: '#feb300',
    fontSize: 13,
    fontWeight: '900',
      },
  pendingDriver: {
    color: '#dde2f0',
    fontSize: 10,
    marginTop: 2,
  },
  pendingAwaitingTag: {
    backgroundColor: 'rgba(254, 179, 0, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#feb300',
  },
  pendingAwaitingTagText: {
    color: '#feb300',
    fontSize: 8,
    fontWeight: '900',
  },
  pendingSpecsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    backgroundColor: '#161c25',
    padding: 8,
    borderRadius: radius.sm,
  },
  pendingSpec: {
    color: '#849396',
    fontSize: 9,
  },
  pendingSpecHighlight: {
    color: '#dde2f0',
    fontWeight: '700',
  },
  pendingContainersList: {
    gap: 4,
  },
  pendingContainerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#161c25',
    padding: 6,
    borderRadius: 4,
  },
  pendingContNum: {
    color: '#00e5ff',
        fontSize: 11,
    fontWeight: '700',
  },
  pendingContSize: {
    color: '#849396',
    fontSize: 9,
  },
  pendingContStatus: {
    color: '#22ef7e',
    fontSize: 9,
    marginLeft: 'auto',
  },
  decisionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 2,
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

  // ─── MONITORING CARDS ───
  monitoringCard: {
    backgroundColor: '#080e17',
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: '#242a34',
    padding: 10,
    gap: 6,
  },
  monHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  badgeDefault: { backgroundColor: '#1a2029' },
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
    fontSize: 11,
    fontWeight: '700',
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
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#161c25',
  },
  monContainersText: {
    color: '#00e5ff',
    fontSize: 9,
      },

  // ─── DRIVERS ROW ───
  driverRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#080e17',
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: '#242a34',
    padding: 10,
    gap: 10,
  },
  driverAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#00e5ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverAvatarText: {
    color: '#00363d',
    fontWeight: '900',
    fontSize: 13,
  },
  driverFullName: {
    color: '#dde2f0',
    fontSize: 11,
    fontWeight: '800',
  },
  driverDetails: {
    color: '#849396',
    fontSize: 9,
    marginTop: 1,
  },
  driverActivePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 239, 126, 0.1)',
    borderWidth: 1,
    borderColor: '#22ef7e',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    gap: 4,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22ef7e',
  },
  driverActivePillText: {
    color: '#22ef7e',
    fontSize: 8,
    fontWeight: '800',
  },

  // ─── TERMINALS REPORT GRID ───
  terminalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  terminalGridItem: {
    width: '31%',
    backgroundColor: '#080e17',
    borderRadius: radius.sm,
    padding: 10,
    borderWidth: 1,
    borderColor: '#242a34',
    alignItems: 'center',
    gap: 2,
  },
  termGridName: {
    color: '#00e5ff',
    fontWeight: '900',
    fontSize: 12,
      },
  termGridCount: {
    color: '#dde2f0',
    fontWeight: '900',
    fontSize: 16,
      },
  termGridSub: {
    color: '#849396',
    fontSize: 8,
  },
  exportReportBtn: {
    height: 44,
    backgroundColor: '#00e5ff',
    borderRadius: radius.DEFAULT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  exportReportBtnText: {
    color: '#00363d',
    fontWeight: '900',
    fontSize: 11,
    letterSpacing: 0.6,
  },

  // ─── QUICK ACTIONS GRID ───
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickTile: {
    width: '31%',
    backgroundColor: '#080e17',
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: '#242a34',
    padding: 12,
    alignItems: 'center',
    gap: 6,
  },
  quickTileText: {
    color: '#dde2f0',
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'center',
  },

  // ─── MODAL STYLES ───
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(8, 14, 23, 0.94)',
    justifyContent: 'center',
    ...(Platform.OS === 'web'
      ? {
          position: 'fixed' as any,
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 999999,
        }
      : {}),
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#161c25',
    borderRadius: radius.DEFAULT,
    borderWidth: 1.5,
    borderColor: '#00e5ff',
    padding: 16,
    gap: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#242a34',
  },
  modalTitle: {
    color: '#00e5ff',
    fontWeight: '900',
    fontSize: 11,
    letterSpacing: 0.8,
  },
  modalPrompt: {
    color: '#dde2f0',
    fontSize: 10,
    lineHeight: 15,
  },
  inputWrap: {
    backgroundColor: '#080e17',
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: '#242a34',
    paddingHorizontal: 12,
  },
  modalInput: {
    color: '#dde2f0',
    fontSize: 11,
        ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  } as any,
  modalSubmitBtn: {
    height: 44,
    backgroundColor: '#00e5ff',
    borderRadius: radius.DEFAULT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  modalSubmitBtnText: {
    color: '#00363d',
    fontWeight: '900',
    fontSize: 11,
    letterSpacing: 0.6,
  },
  repRow: {
    color: '#849396',
    fontSize: 11,
  },
  repVal: {
    color: '#00e5ff',
    fontWeight: '800',
      },
  notifItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#080e17',
    borderRadius: radius.sm,
    padding: 10,
    gap: 10,
  },
  notifTitle: {
    color: '#dde2f0',
    fontSize: 11,
    fontWeight: '800',
  },
  notifSub: {
    color: '#849396',
    fontSize: 9,
    marginTop: 2,
  },
});
