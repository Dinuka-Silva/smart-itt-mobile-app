import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../../src/store/authStore';
import { tripService } from '../../../src/services/tripService';
import {
  containerService,
  normalizeContainerNumber,
  isValidIsoFormat,
  computeCheckDigit,
  ValidateContainerResult,
} from '../../../src/services/containerService';
import { dashboardService, DriverDashboardStats } from '../../../src/services/dashboardService';
import { colors, radius, spacing } from '../../../src/theme';
import { useMockTripStore } from '../../../src/store/mockTripStore';

const TERMINALS = ['CICT', 'CWIT', 'ECT', 'JCT', 'UCT', 'SAGT'] as const;
type TerminalCode = (typeof TERMINALS)[number];

export default function DriverHomeDashboard() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();

  // Trips & Dashboard State
  const [trips, setTrips] = useState<any[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DriverDashboardStats>({
    activeTrips: 0,
    completedTripsToday: 0,
    containersTransportedToday: 0,
    tripsPendingApproval: 0,
    approvedAllowance: 0,
    pendingAllowance: 0,
    activeTrip: null,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  // Modals state
  const [addContainerModalVisible, setAddContainerModalVisible] = useState(false);
  const [notificationsModalVisible, setNotificationsModalVisible] = useState(false);
  const [allowanceModalVisible, setAllowanceModalVisible] = useState(false);
  const [damageReportModalVisible, setDamageReportModalVisible] = useState(false);
  const [supervisorModalVisible, setSupervisorModalVisible] = useState(false);

  // Add Container Form State
  const [inputContainerNumber, setInputContainerNumber] = useState('');
  const [inputContainerSize, setInputContainerSize] = useState<'20FT' | '40FT'>('40FT');
  const [inputMainTerminal, setInputMainTerminal] = useState<TerminalCode>('CICT');
  const [inputVesselName, setInputVesselName] = useState('');
  const [inputChaiNo, setInputChaiNo] = useState('');
  const [validationResult, setValidationResult] = useState<ValidateContainerResult | null>(null);
  const [validating, setValidating] = useState(false);
  const [submittingContainer, setSubmittingContainer] = useState(false);
  const [containerFormError, setContainerFormError] = useState<string | null>(null);
  const [containerSuccessMsg, setContainerSuccessMsg] = useState<string | null>(null);

  // Damage Report Form State
  const [damageContainerNumber, setDamageContainerNumber] = useState('');
  const [damageDescription, setDamageDescription] = useState('');
  const [damageSuccessMsg, setDamageSuccessMsg] = useState<string | null>(null);

  const mockTrips = useMockTripStore((s) => s.mockTrips);

  // Fetch live dashboard & trips
  const loadData = useCallback(async () => {
    const driverId = user?.driverId || user?.id || 'demo-driver';
    const demoTrips = useMockTripStore.getState().getTripsForDriver(driverId);

    try {
      // 1. Fetch live trips from backend
      const apiTrips = await tripService.getTrips(user?.driverId);
      const list = Array.isArray(apiTrips) ? apiTrips : [];
      const byId = new Map<string, any>();
      list.forEach((t) => byId.set(t.id, t));
      demoTrips.forEach((t) => { if (!byId.has(t.id)) byId.set(t.id, t); });
      const merged = Array.from(byId.values());
      setTrips(merged);

      // 2. Fetch live dashboard metrics
      const stats = await dashboardService.getDriverDashboard(driverId);
      setDashboardStats(stats);
      setIsOnline(true);
    } catch {
      setTrips(demoTrips);
      setIsOnline(false);
      // Fallback calculations from local store
      const activeCount = demoTrips.filter((t) => t.status === 'IN_PROGRESS').length;
      const completedCount = demoTrips.filter((t) => t.status === 'COMPLETED' || t.status === 'APPROVED').length;
      const pendingCount = demoTrips.filter((t) => t.status === 'PENDING_APPROVAL').length;
      let containersCount = 0;
      demoTrips.forEach((t) => { containersCount += (t.containers?.length || 0); });

      setDashboardStats({
        activeTrips: activeCount,
        completedTripsToday: completedCount,
        containersTransportedToday: containersCount,
        tripsPendingApproval: pendingCount,
        approvedAllowance: completedCount * 2500,
        pendingAllowance: pendingCount * 2500,
        activeTrip: demoTrips.find((t) => t.status === 'IN_PROGRESS') || null,
      });
    } finally {
      setRefreshing(false);
    }
  }, [user, mockTrips]);

  useEffect(() => { loadData(); }, [loadData]);
  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  // Active Trip resolution
  const activeTrip = useMemo(() => {
    return trips.find((t) => t.status === 'IN_PROGRESS') ||
      trips.find((t) => t.status === 'DRAFT') ||
      (trips.length > 0 ? trips[0] : null);
  }, [trips]);

  const driverName = user?.name || user?.fullName || 'Kamal Perera';
  const driverCode = user?.driverCode || user?.username || 'DRV-00001';
  const vehicleNumber = user?.vehicleNumber || activeTrip?.vehicleNumber || 'WP-BA-1234';
  const initials = driverName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

  // Container counts for active trip
  const count20Ft = (activeTrip?.containers || []).filter((c: any) => c.size === '20FT' || c.size === 'FT_20').length;
  const count40Ft = (activeTrip?.containers || []).filter((c: any) => c.size === '40FT' || c.size === 'FT_40').length;

  // Real-time validation handler for Container Number
  const handleContainerNumberChange = async (text: string) => {
    const normalized = normalizeContainerNumber(text);
    setInputContainerNumber(normalized);
    setContainerFormError(null);
    setContainerSuccessMsg(null);

    if (normalized.length >= 4) {
      setValidating(true);
      try {
        const result = await containerService.validateContainer(normalized, activeTrip?.id);
        setValidationResult(result);
      } catch {
        // Fallback client-side validation
        const formatValid = isValidIsoFormat(normalized);
        const expected = computeCheckDigit(normalized);
        const actual = normalized.length >= 11 ? parseInt(normalized[10], 10) : -1;
        setValidationResult({
          valid: formatValid && expected === actual,
          isoFormatValid: formatValid,
          checkDigitValid: formatValid && expected === actual,
          expectedCheckDigit: expected,
          actualCheckDigit: actual,
          duplicate: false,
          message: formatValid && expected === actual
            ? `Container ${normalized} ISO 6346 verified.`
            : `ISO Check Digit: ${expected >= 0 ? expected : 'calc...'}`,
          normalizedNumber: normalized,
        });
      } finally {
        setValidating(false);
      }
    } else {
      setValidationResult(null);
    }
  };

  const handleFixCheckDigit = () => {
    if (!validationResult || validationResult.expectedCheckDigit < 0) return;
    const base = inputContainerNumber.slice(0, 10);
    const corrected = `${base}${validationResult.expectedCheckDigit}`;
    handleContainerNumberChange(corrected);
  };

  const handleOpenAddContainerModal = () => {
    setInputContainerNumber('');
    setInputContainerSize('40FT');
    setInputMainTerminal(activeTrip?.sourceTerminal || 'CICT');
    setInputVesselName(activeTrip?.vesselName || 'MV Colombo Star');
    setInputChaiNo(activeTrip?.chassisNumber || 'CHAI-102');
    setValidationResult(null);
    setContainerFormError(null);
    setContainerSuccessMsg(null);
    setAddContainerModalVisible(true);
  };

  const handleSaveContainer = async () => {
    const clean = normalizeContainerNumber(inputContainerNumber);
    if (!clean) {
      setContainerFormError('Please enter a container number.');
      return;
    }
    if (!isValidIsoFormat(clean)) {
      setContainerFormError('Format error: Must be 4 uppercase letters and 7 digits (e.g. MSCU1234567).');
      return;
    }

    setSubmittingContainer(true);
    setContainerFormError(null);

    try {
      // 1. Authoritative backend validation
      const valRes = await containerService.validateContainer(clean, activeTrip?.id);
      if (!valRes.valid) {
        setContainerFormError(valRes.message);
        setSubmittingContainer(false);
        return;
      }

      // 2. Add container through backend API
      const updated = await containerService.addManualContainer({
        tripId: activeTrip?.id,
        containerNumber: clean,
        size: inputContainerSize,
        mainTerminal: inputMainTerminal,
        vesselName: inputVesselName.trim() || activeTrip?.vesselName || 'MV Colombo Star',
        chaiNo: inputChaiNo.trim() || activeTrip?.chassisNumber || 'CHAI-101',
      });

      setContainerSuccessMsg(`Container ${clean} saved and linked to mission!`);
      // Update local trips
      useMockTripStore.getState().addManualContainerToTrip(activeTrip?.id, {
        containerNumber: clean,
        size: inputContainerSize,
        mainTerminal: inputMainTerminal,
      });

      await loadData();
      setTimeout(() => {
        setAddContainerModalVisible(false);
      }, 1200);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to save container.';
      setContainerFormError(msg);
    } finally {
      setSubmittingContainer(false);
    }
  };

  // Stage transition triggers for progress tracker
  const handleTransitionTripStage = async (nextStatus: string, actionLabel: string) => {
    if (!activeTrip) return;
    try {
      await tripService.updateTripStatus(activeTrip.id, nextStatus as any);
      useMockTripStore.getState().updateTripStatus(activeTrip.id, nextStatus as any);
      await loadData();
      Alert.alert('Status Updated', `Trip status advanced: ${actionLabel}`);
    } catch {
      useMockTripStore.getState().updateTripStatus(activeTrip.id, nextStatus as any);
      await loadData();
      Alert.alert('Status Updated (Local)', `Trip status advanced: ${actionLabel}`);
    }
  };

  const handleReportDamage = () => {
    if (!damageDescription.trim()) {
      Alert.alert('Missing Field', 'Please provide a damage description.');
      return;
    }
    setDamageSuccessMsg('Damage report registered with Central Port Safety.');
    setTimeout(() => {
      setDamageReportModalVisible(false);
      setDamageDescription('');
      setDamageContainerNumber('');
      setDamageSuccessMsg(null);
    }, 1500);
  };

  // Progress tracker stage index (1 to 8)
  const currentStageIndex = useMemo(() => {
    if (!activeTrip) return 1;
    const s = activeTrip.status;
    if (s === 'DRAFT') return (activeTrip.containers?.length || 0) > 0 ? 2 : 1;
    if (s === 'IN_PROGRESS') return 3;
    if (s === 'ARRIVED') return 4;
    if (s === 'HANDOVER_CONFIRMED') return 5;
    if (s === 'PENDING_APPROVAL') return 6;
    if (s === 'APPROVED') return 7;
    if (s === 'COMPLETED') return 8;
    return 3;
  }, [activeTrip]);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor="#00e5ff" />}
        keyboardShouldPersistTaps="handled"
      >
        {/* ─── A. DRIVER HEADER ─── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.avatarWrap}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View>
              <Text style={styles.driverNameText}>{driverName}</Text>
              <View style={styles.codeRow}>
                <Text style={styles.driverCodeBadge}>{driverCode}</Text>
                <View style={styles.vehiclePill}>
                  <Ionicons name="bus" size={11} color="#feb300" />
                  <Text style={styles.vehiclePillText}>{vehicleNumber}</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.headerRight}>
            {/* Online / Offline status toggle */}
            <TouchableOpacity
              style={[styles.statusToggle, isOnline ? styles.statusOnline : styles.statusOffline]}
              onPress={() => setIsOnline(!isOnline)}
            >
              <View style={[styles.statusDot, { backgroundColor: isOnline ? '#22ef7e' : '#ff5252' }]} />
              <Text style={styles.statusToggleText}>{isOnline ? 'ONLINE' : 'OFFLINE'}</Text>
            </TouchableOpacity>

            {/* Notification button with badge */}
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={() => setNotificationsModalVisible(true)}
            >
              <Ionicons name="notifications" size={18} color="#00e5ff" />
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>3</Text>
              </View>
            </TouchableOpacity>

            {/* Logout button */}
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

        {/* ─── B. DRIVER SUMMARY CARDS (LIVE BACKEND METRICS) ─── */}
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <View style={styles.summaryCardHeader}>
              <Text style={styles.summaryCardTitle}>ACTIVE TRIPS</Text>
              <Ionicons name="navigate" size={16} color="#00e5ff" />
            </View>
            <Text style={[styles.summaryCardValue, { color: '#00e5ff' }]}>
              {dashboardStats.activeTrips}
            </Text>
            <Text style={styles.summaryCardSub}>Live on route</Text>
          </View>

          <View style={styles.summaryCard}>
            <View style={styles.summaryCardHeader}>
              <Text style={styles.summaryCardTitle}>COMPLETED TODAY</Text>
              <Ionicons name="checkmark-done-circle" size={16} color="#22ef7e" />
            </View>
            <Text style={[styles.summaryCardValue, { color: '#22ef7e' }]}>
              {dashboardStats.completedTripsToday}
            </Text>
            <Text style={styles.summaryCardSub}>Shift total</Text>
          </View>

          <View style={styles.summaryCard}>
            <View style={styles.summaryCardHeader}>
              <Text style={styles.summaryCardTitle}>CONTAINERS</Text>
              <Ionicons name="cube" size={16} color="#feb300" />
            </View>
            <Text style={[styles.summaryCardValue, { color: '#feb300' }]}>
              {dashboardStats.containersTransportedToday}
            </Text>
            <Text style={styles.summaryCardSub}>Transported TEU</Text>
          </View>

          <View style={styles.summaryCard}>
            <View style={styles.summaryCardHeader}>
              <Text style={styles.summaryCardTitle}>PENDING APPROVAL</Text>
              <Ionicons name="time" size={16} color="#ff9800" />
            </View>
            <Text style={[styles.summaryCardValue, { color: '#ff9800' }]}>
              {dashboardStats.tripsPendingApproval}
            </Text>
            <Text style={styles.summaryCardSub}>Awaiting Gate Pass</Text>
          </View>
        </View>

        {/* ─── C. ACTIVE TRIP CARD ─── */}
        {activeTrip ? (
          <View style={styles.activeTripCard}>
            <View style={styles.activeTripHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={styles.pulseLive} />
                <Text style={styles.activeTripIdText}>
                  {activeTrip.tripNumber || `ITT-${activeTrip.id?.slice(0, 6)}`}
                </Text>
              </View>
              <View style={styles.tripStatusPill}>
                <Text style={styles.tripStatusPillText}>{activeTrip.status}</Text>
              </View>
            </View>

            {/* Route row */}
            <View style={styles.routeRow}>
              <View style={styles.terminalBox}>
                <Text style={styles.terminalLabel}>ORIGIN</Text>
                <Text style={styles.terminalCode}>{activeTrip.sourceTerminal || 'CICT'}</Text>
              </View>

              <View style={styles.routeArrowBox}>
                <Ionicons name="arrow-forward" size={18} color="#00e5ff" />
                <Text style={styles.routeDistText}>INTER-TERMINAL</Text>
              </View>

              <View style={styles.terminalBox}>
                <Text style={styles.terminalLabel}>DESTINATION</Text>
                <Text style={styles.terminalCode}>{activeTrip.destTerminal || 'JCT'}</Text>
              </View>
            </View>

            {/* Trip Specs */}
            <View style={styles.specsGrid}>
              <View style={styles.specItem}>
                <Text style={styles.specLabel}>VESSEL</Text>
                <Text style={styles.specValue}>{activeTrip.vesselName || 'MV Colombo Star'}</Text>
              </View>
              <View style={styles.specItem}>
                <Text style={styles.specLabel}>CHAI NO.</Text>
                <Text style={styles.specValueMono}>{activeTrip.chassisNumber || 'CHAI-102'}</Text>
              </View>
              <View style={styles.specItem}>
                <Text style={styles.specLabel}>CONTAINERS</Text>
                <Text style={styles.specValue}>
                  {count20Ft}×20FT · {count40Ft}×40FT
                </Text>
              </View>
              <View style={styles.specItem}>
                <Text style={styles.specLabel}>START TIME</Text>
                <Text style={styles.specValueMono}>
                  {activeTrip.startTime ? new Date(activeTrip.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '08:30 AM'}
                </Text>
              </View>
            </View>

            {/* Containers List inside Active Trip */}
            {activeTrip.containers && activeTrip.containers.length > 0 && (
              <View style={styles.loadedContainersSection}>
                <Text style={styles.loadedTitle}>LOADED MANIFEST ({activeTrip.containers.length})</Text>
                {activeTrip.containers.map((c: any, idx: number) => (
                  <View key={c.id || idx} style={styles.loadedContainerRow}>
                    <Ionicons name="cube-outline" size={14} color="#00e5ff" />
                    <Text style={styles.loadedCode}>{c.containerNumber}</Text>
                    <Text style={styles.loadedSize}>{c.size}</Text>
                    <Text style={styles.loadedStatus}>{c.status}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Action Buttons for Active Trip */}
            <View style={styles.activeTripActions}>
              <TouchableOpacity
                style={styles.continueTripBtn}
                onPress={() => router.push('/(driver)/(tabs)/trips')}
              >
                <Ionicons name="navigate" size={16} color="#00363d" />
                <Text style={styles.continueTripBtnText}>CONTINUE MISSION HUD</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.addContBtnSmall}
                onPress={handleOpenAddContainerModal}
              >
                <Ionicons name="add" size={16} color="#00e5ff" />
                <Text style={styles.addContBtnSmallText}>ADD CONTAINER</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.noActiveCard}>
            <Ionicons name="hourglass-outline" size={32} color="#849396" />
            <Text style={styles.noActiveTitle}>NO ACTIVE MISSION</Text>
            <Text style={styles.noActiveSub}>
              You currently have no mission in progress. Tap below to manually load a container or check the dispatcher queue.
            </Text>
            <TouchableOpacity style={styles.startManualBtn} onPress={handleOpenAddContainerModal}>
              <Ionicons name="add-circle" size={18} color="#00363d" />
              <Text style={styles.startManualBtnText}>MANUALLY ENTER CONTAINER</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ─── D. PROMINENT ADD CONTAINER BUTTON ─── */}
        <TouchableOpacity
          style={styles.prominentAddContainerBtn}
          onPress={handleOpenAddContainerModal}
          activeOpacity={0.88}
        >
          <View style={styles.prominentAddIconCircle}>
            <Ionicons name="cube" size={20} color="#00363d" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.prominentAddTitle}>MANUAL CONTAINER MANAGEMENT</Text>
            <Text style={styles.prominentAddSub}>
              Enter container number with instant ISO 6346 check digit validation &amp; duplicate check
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#00e5ff" />
        </TouchableOpacity>

        {/* ─── E. 8-STAGE WORKFLOW PROGRESS TRACKER ─── */}
        <View style={styles.progressTrackerCard}>
          <View style={styles.trackerHeader}>
            <Ionicons name="git-commit" size={16} color="#00e5ff" />
            <Text style={styles.trackerTitle}>8-STAGE INTER-TERMINAL WORKFLOW</Text>
          </View>

          <View style={styles.stagesList}>
            {[
              { id: 1, title: '1. Trip Assigned', done: currentStageIndex >= 1 },
              { id: 2, title: '2. Containers Added', done: currentStageIndex >= 2 },
              { id: 3, title: '3. Trip Started', done: currentStageIndex >= 3 },
              { id: 4, title: '4. Arrived at Destination', done: currentStageIndex >= 4 },
              { id: 5, title: '5. Handover Confirmed', done: currentStageIndex >= 5 },
              { id: 6, title: '6. Trip Submitted', done: currentStageIndex >= 6 },
              { id: 7, title: '7. Supervisor Approved', done: currentStageIndex >= 7 },
              { id: 8, title: '8. Trip Completed', done: currentStageIndex >= 8 },
            ].map((stage) => (
              <View key={stage.id} style={styles.stageItem}>
                <View
                  style={[
                    styles.stageCircle,
                    stage.done && styles.stageCircleDone,
                    stage.id === currentStageIndex && styles.stageCircleActive,
                  ]}
                >
                  <Ionicons
                    name={stage.done ? 'checkmark' : 'ellipse'}
                    size={10}
                    color={stage.done ? '#00363d' : '#849396'}
                  />
                </View>
                <Text
                  style={[
                    styles.stageItemText,
                    stage.done && styles.stageItemTextDone,
                    stage.id === currentStageIndex && styles.stageItemTextActive,
                  ]}
                >
                  {stage.title}
                </Text>
              </View>
            ))}
          </View>

          {/* Quick Stage Progression Buttons */}
          {activeTrip && (
            <View style={styles.stageButtonsRow}>
              {currentStageIndex < 3 && (
                <TouchableOpacity
                  style={styles.stageActionBtn}
                  onPress={() => handleTransitionTripStage('IN_PROGRESS', 'Trip Started')}
                >
                  <Ionicons name="play" size={14} color="#00363d" />
                  <Text style={styles.stageActionBtnText}>START TRIP</Text>
                </TouchableOpacity>
              )}
              {currentStageIndex === 3 && (
                <TouchableOpacity
                  style={styles.stageActionBtn}
                  onPress={() => handleTransitionTripStage('ARRIVED', 'Arrived at Destination')}
                >
                  <Ionicons name="flag" size={14} color="#00363d" />
                  <Text style={styles.stageActionBtnText}>MARK ARRIVAL</Text>
                </TouchableOpacity>
              )}
              {currentStageIndex === 4 && (
                <TouchableOpacity
                  style={styles.stageActionBtn}
                  onPress={() => handleTransitionTripStage('HANDOVER_CONFIRMED', 'Handover Confirmed')}
                >
                  <Ionicons name="checkmark-done" size={14} color="#00363d" />
                  <Text style={styles.stageActionBtnText}>CONFIRM HANDOVER</Text>
                </TouchableOpacity>
              )}
              {currentStageIndex === 5 && (
                <TouchableOpacity
                  style={styles.stageActionBtn}
                  onPress={() => handleTransitionTripStage('PENDING_APPROVAL', 'Submitted for Approval')}
                >
                  <Ionicons name="send" size={14} color="#00363d" />
                  <Text style={styles.stageActionBtnText}>SUBMIT FOR APPROVAL</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* ─── F. DRIVER QUICK ACTIONS ─── */}
        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionHeaderTitle}>DRIVER QUICK ACTIONS</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity style={styles.quickActionTile} onPress={handleOpenAddContainerModal}>
              <View style={[styles.tileIconCircle, { backgroundColor: 'rgba(0, 229, 255, 0.15)' }]}>
                <Ionicons name="add-circle" size={20} color="#00e5ff" />
              </View>
              <Text style={styles.tileTitle}>Add Container</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickActionTile} onPress={() => router.push('/(driver)/(tabs)/trips')}>
              <View style={[styles.tileIconCircle, { backgroundColor: 'rgba(34, 239, 126, 0.15)' }]}>
                <Ionicons name="layers" size={20} color="#22ef7e" />
              </View>
              <Text style={styles.tileTitle}>My Trips</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickActionTile} onPress={() => router.push('/(driver)/(tabs)/trips')}>
              <View style={[styles.tileIconCircle, { backgroundColor: 'rgba(254, 179, 0, 0.15)' }]}>
                <Ionicons name="time" size={20} color="#feb300" />
              </View>
              <Text style={styles.tileTitle}>Trip History</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickActionTile} onPress={() => setNotificationsModalVisible(true)}>
              <View style={[styles.tileIconCircle, { backgroundColor: 'rgba(0, 229, 255, 0.15)' }]}>
                <Ionicons name="notifications" size={20} color="#00e5ff" />
              </View>
              <Text style={styles.tileTitle}>Notifications</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickActionTile} onPress={() => setAllowanceModalVisible(true)}>
              <View style={[styles.tileIconCircle, { backgroundColor: 'rgba(34, 239, 126, 0.15)' }]}>
                <Ionicons name="cash" size={20} color="#22ef7e" />
              </View>
              <Text style={styles.tileTitle}>My Allowance</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickActionTile} onPress={() => setDamageReportModalVisible(true)}>
              <View style={[styles.tileIconCircle, { backgroundColor: 'rgba(255, 82, 82, 0.15)' }]}>
                <Ionicons name="warning" size={20} color="#ff5252" />
              </View>
              <Text style={styles.tileTitle}>Report Damage</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickActionTile} onPress={() => setSupervisorModalVisible(true)}>
              <View style={[styles.tileIconCircle, { backgroundColor: 'rgba(0, 229, 255, 0.15)' }]}>
                <Ionicons name="chatbubbles" size={20} color="#00e5ff" />
              </View>
              <Text style={styles.tileTitle}>Supervisor</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickActionTile} onPress={() => router.push('/(driver)/(tabs)/profile')}>
              <View style={[styles.tileIconCircle, { backgroundColor: 'rgba(254, 179, 0, 0.15)' }]}>
                <Ionicons name="person-circle" size={20} color="#feb300" />
              </View>
              <Text style={styles.tileTitle}>Cab Specs</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ─── MODAL 1: MANUAL CONTAINER ENTRY WITH ISO 6346 VALIDATION ─── */}
      <Modal visible={addContainerModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScroll}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="cube" size={20} color="#00e5ff" />
                  <Text style={styles.modalTitle}>MANUAL CONTAINER ENTRY</Text>
                </View>
                <TouchableOpacity onPress={() => setAddContainerModalVisible(false)}>
                  <Ionicons name="close" size={22} color="#849396" />
                </TouchableOpacity>
              </View>

              {/* Form Input 1: Container Number */}
              <View style={styles.modalFieldGroup}>
                <Text style={styles.modalLabel}>CONTAINER NUMBER (MANUAL ENTRY) *</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="barcode-outline" size={18} color="#00e5ff" style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.modalInput}
                    placeholder="e.g. MSCU1234566"
                    placeholderTextColor="#849396"
                    value={inputContainerNumber}
                    onChangeText={handleContainerNumberChange}
                    autoCapitalize="characters"
                    autoCorrect={false}
                  />
                  {validating && <ActivityIndicator size="small" color="#00e5ff" />}
                </View>

                {/* ISO 6346 Real-time Feedback Pill */}
                {validationResult && (
                  <View
                    style={[
                      styles.validationPill,
                      validationResult.valid ? styles.pillValid : styles.pillInvalid,
                    ]}
                  >
                    <Ionicons
                      name={validationResult.valid ? 'checkmark-circle' : 'alert-circle'}
                      size={14}
                      color={validationResult.valid ? '#22ef7e' : '#ff5252'}
                    />
                    <Text
                      style={[
                        styles.validationPillText,
                        { color: validationResult.valid ? '#22ef7e' : '#ff5252' },
                      ]}
                    >
                      {validationResult.message}
                    </Text>

                    {/* Auto-fix check digit button */}
                    {!validationResult.checkDigitValid && validationResult.expectedCheckDigit >= 0 && (
                      <TouchableOpacity style={styles.fixDigitBtn} onPress={handleFixCheckDigit}>
                        <Text style={styles.fixDigitBtnText}>
                          FIX TO {validationResult.expectedCheckDigit}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>

              {/* Form Input 2: Container Size */}
              <View style={styles.modalFieldGroup}>
                <Text style={styles.modalLabel}>CONTAINER SIZE *</Text>
                <View style={styles.sizeToggleRow}>
                  <TouchableOpacity
                    style={[styles.sizeBtn, inputContainerSize === '20FT' && styles.sizeBtnActive]}
                    onPress={() => setInputContainerSize('20FT')}
                  >
                    <Text style={[styles.sizeBtnText, inputContainerSize === '20FT' && styles.sizeBtnTextActive]}>
                      20 FT STANDARD
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.sizeBtn, inputContainerSize === '40FT' && styles.sizeBtnActive]}
                    onPress={() => setInputContainerSize('40FT')}
                  >
                    <Text style={[styles.sizeBtnText, inputContainerSize === '40FT' && styles.sizeBtnTextActive]}>
                      40 FT HIGH CUBE
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Form Input 3: Main Terminal */}
              <View style={styles.modalFieldGroup}>
                <Text style={styles.modalLabel}>MAIN TERMINAL CLEARANCE *</Text>
                <View style={styles.terminalChipsWrap}>
                  {TERMINALS.map((t) => (
                    <TouchableOpacity
                      key={t}
                      style={[styles.terminalChip, inputMainTerminal === t && styles.terminalChipActive]}
                      onPress={() => setInputMainTerminal(t)}
                    >
                      <Text
                        style={[
                          styles.terminalChipText,
                          inputMainTerminal === t && styles.terminalChipTextActive,
                        ]}
                      >
                        {t}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Form Input 4: Vessel Name */}
              <View style={styles.modalFieldGroup}>
                <Text style={styles.modalLabel}>VESSEL NAME</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="boat-outline" size={18} color="#849396" style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.modalInput}
                    placeholder="e.g. MV Colombo Star"
                    placeholderTextColor="#849396"
                    value={inputVesselName}
                    onChangeText={setInputVesselName}
                  />
                </View>
              </View>

              {/* Form Input 5: Chai No. */}
              <View style={styles.modalFieldGroup}>
                <Text style={styles.modalLabel}>CHAI NO. / CHASSIS NUMBER</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="construct-outline" size={18} color="#849396" style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.modalInput}
                    placeholder="e.g. CHAI-102"
                    placeholderTextColor="#849396"
                    value={inputChaiNo}
                    onChangeText={setInputChaiNo}
                  />
                </View>
              </View>

              {/* Error / Success message */}
              {containerFormError && (
                <View style={styles.errorBox}>
                  <Ionicons name="close-circle" size={16} color="#ff5252" />
                  <Text style={styles.errorBoxText}>{containerFormError}</Text>
                </View>
              )}
              {containerSuccessMsg && (
                <View style={styles.successBox}>
                  <Ionicons name="checkmark-circle" size={16} color="#22ef7e" />
                  <Text style={styles.successBoxText}>{containerSuccessMsg}</Text>
                </View>
              )}

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.modalSubmitBtn, submittingContainer && { opacity: 0.6 }]}
                onPress={handleSaveContainer}
                disabled={submittingContainer}
              >
                {submittingContainer ? (
                  <ActivityIndicator color="#00363d" />
                ) : (
                  <>
                    <Ionicons name="checkmark-done" size={18} color="#00363d" />
                    <Text style={styles.modalSubmitBtnText}>VALIDATE &amp; ADD CONTAINER</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* ─── MODAL 2: ALLOWANCE / SALARY SUMMARY ─── */}
      <Modal visible={allowanceModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="cash" size={20} color="#22ef7e" />
                <Text style={styles.modalTitle}>OPERATOR ALLOWANCE SUMMARY</Text>
              </View>
              <TouchableOpacity onPress={() => setAllowanceModalVisible(false)}>
                <Ionicons name="close" size={22} color="#849396" />
              </TouchableOpacity>
            </View>

            <View style={styles.allowanceCard}>
              <Text style={styles.allowanceLabel}>APPROVED SALARY / ALLOWANCE</Text>
              <Text style={styles.allowanceValueApproved}>
                LKR {dashboardStats.approvedAllowance.toLocaleString()}.00
              </Text>
              <Text style={styles.allowanceSub}>
                Calculated from {dashboardStats.completedTripsToday} approved inter-terminal trips (LKR 2,500/trip)
              </Text>
            </View>

            <View style={[styles.allowanceCard, { borderColor: '#feb300' }]}>
              <Text style={[styles.allowanceLabel, { color: '#feb300' }]}>PENDING APPROVAL ALLOWANCE</Text>
              <Text style={styles.allowanceValuePending}>
                LKR {dashboardStats.pendingAllowance.toLocaleString()}.00
              </Text>
              <Text style={styles.allowanceSub}>
                From {dashboardStats.tripsPendingApproval} trips awaiting supervisor gate approval
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.modalSubmitBtn, { backgroundColor: '#22ef7e' }]}
              onPress={() => setAllowanceModalVisible(false)}
            >
              <Text style={[styles.modalSubmitBtnText, { color: '#003918' }]}>CLOSE SUMMARY</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── MODAL 3: REPORT DAMAGE ─── */}
      <Modal visible={damageReportModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="warning" size={20} color="#ff5252" />
                <Text style={styles.modalTitle}>REPORT CONTAINER DAMAGE</Text>
              </View>
              <TouchableOpacity onPress={() => setDamageReportModalVisible(false)}>
                <Ionicons name="close" size={22} color="#849396" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalFieldGroup}>
              <Text style={styles.modalLabel}>CONTAINER NUMBER</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. MSCU1234566"
                  placeholderTextColor="#849396"
                  value={damageContainerNumber}
                  onChangeText={setDamageContainerNumber}
                  autoCapitalize="characters"
                />
              </View>
            </View>

            <View style={styles.modalFieldGroup}>
              <Text style={styles.modalLabel}>DAMAGE DETAILS &amp; LOCATION</Text>
              <View style={[styles.inputWrap, { height: 90, alignItems: 'flex-start', paddingTop: 8 }]}>
                <TextInput
                  style={[styles.modalInput, { height: 74 }]}
                  placeholder="Describe dent, seal breach, lock malfunction..."
                  placeholderTextColor="#849396"
                  multiline
                  value={damageDescription}
                  onChangeText={setDamageDescription}
                />
              </View>
            </View>

            {damageSuccessMsg && (
              <View style={styles.successBox}>
                <Ionicons name="checkmark-circle" size={16} color="#22ef7e" />
                <Text style={styles.successBoxText}>{damageSuccessMsg}</Text>
              </View>
            )}

            <TouchableOpacity style={[styles.modalSubmitBtn, { backgroundColor: '#ff5252' }]} onPress={handleReportDamage}>
              <Ionicons name="shield-outline" size={18} color="#fff" />
              <Text style={[styles.modalSubmitBtnText, { color: '#fff' }]}>SUBMIT DAMAGE INCIDENT</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── MODAL 4: NOTIFICATIONS ─── */}
      <Modal visible={notificationsModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="notifications" size={20} color="#00e5ff" />
                <Text style={styles.modalTitle}>DISPATCH NOTIFICATIONS</Text>
              </View>
              <TouchableOpacity onPress={() => setNotificationsModalVisible(false)}>
                <Ionicons name="close" size={22} color="#849396" />
              </TouchableOpacity>
            </View>

            <View style={{ gap: 10 }}>
              <View style={styles.notifItem}>
                <Ionicons name="checkmark-circle" size={18} color="#22ef7e" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.notifTitle}>Trip ITT-00001 Approved</Text>
                  <Text style={styles.notifSub}>Gate pass confirmed by Supervisor Nimal Silva.</Text>
                </View>
              </View>
              <View style={styles.notifItem}>
                <Ionicons name="information-circle" size={18} color="#00e5ff" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.notifTitle}>New ITT Job Assigned</Text>
                  <Text style={styles.notifSub}>Transfer from CICT Bay-7 to JCT Bay-3.</Text>
                </View>
              </View>
              <View style={styles.notifItem}>
                <Ionicons name="cash" size={18} color="#feb300" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.notifTitle}>Allowance Credited</Text>
                  <Text style={styles.notifSub}>LKR 2,500 credited for completed mission.</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity style={styles.modalSubmitBtn} onPress={() => setNotificationsModalVisible(false)}>
              <Text style={styles.modalSubmitBtnText}>DISMISS NOTIFICATIONS</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── MODAL 5: CONTACT SUPERVISOR ─── */}
      <Modal visible={supervisorModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="chatbubbles" size={20} color="#00e5ff" />
                <Text style={styles.modalTitle}>PORT SUPERVISOR DISPATCH</Text>
              </View>
              <TouchableOpacity onPress={() => setSupervisorModalVisible(false)}>
                <Ionicons name="close" size={22} color="#849396" />
              </TouchableOpacity>
            </View>

            <View style={styles.notifItem}>
              <Ionicons name="person-circle" size={28} color="#00e5ff" />
              <View style={{ flex: 1 }}>
                <Text style={styles.notifTitle}>Nimal Silva (Duty Supervisor)</Text>
                <Text style={styles.notifSub}>Terminal Control Tower · Extension 402</Text>
                <Text style={styles.notifSub}>Direct Comms: 011-2456789</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.modalSubmitBtn} onPress={() => setSupervisorModalVisible(false)}>
              <Text style={styles.modalSubmitBtnText}>RETURN TO DASHBOARD</Text>
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
  avatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#00e5ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#00363d',
    fontWeight: '900',
    fontSize: 16,
  },
  driverNameText: {
    color: '#dde2f0',
    fontWeight: '800',
    fontSize: 14,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  driverCodeBadge: {
    backgroundColor: '#080e17',
    borderColor: '#00e5ff',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
    color: '#00e5ff',
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: '800',
  },
  vehiclePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(254, 179, 0, 0.12)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
    gap: 4,
  },
  vehiclePillText: {
    color: '#feb300',
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: '700',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    gap: 5,
  },
  statusOnline: {
    backgroundColor: 'rgba(34, 239, 126, 0.12)',
    borderColor: '#22ef7e',
  },
  statusOffline: {
    backgroundColor: 'rgba(255, 82, 82, 0.12)',
    borderColor: '#ff5252',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusToggleText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#dde2f0',
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
  unreadBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: '#ff5252',
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '900',
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

  // ─── SUMMARY CARDS GRID ───
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  summaryCard: {
    width: '48%',
    backgroundColor: '#161c25',
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: '#242a34',
    padding: 12,
    gap: 4,
  },
  summaryCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryCardTitle: {
    color: '#849396',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  summaryCardValue: {
    fontSize: 22,
    fontWeight: '900',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  summaryCardSub: {
    color: '#849396',
    fontSize: 9,
  },

  // ─── ACTIVE TRIP CARD ───
  activeTripCard: {
    backgroundColor: '#161c25',
    borderRadius: radius.DEFAULT,
    borderWidth: 1.5,
    borderColor: '#00e5ff',
    padding: 14,
    gap: 12,
  },
  activeTripHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#242a34',
  },
  pulseLive: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00e5ff',
  },
  activeTripIdText: {
    color: '#00e5ff',
    fontWeight: '900',
    fontSize: 14,
    fontFamily: 'monospace',
  },
  tripStatusPill: {
    backgroundColor: 'rgba(0, 229, 255, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#00e5ff',
  },
  tripStatusPillText: {
    color: '#00e5ff',
    fontSize: 9,
    fontWeight: '800',
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#080e17',
    borderRadius: radius.DEFAULT,
    padding: 10,
    borderWidth: 1,
    borderColor: '#242a34',
  },
  terminalBox: {
    alignItems: 'center',
  },
  terminalLabel: {
    color: '#849396',
    fontSize: 8,
    fontWeight: '800',
  },
  terminalCode: {
    color: '#00e5ff',
    fontSize: 16,
    fontWeight: '900',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  routeArrowBox: {
    alignItems: 'center',
    gap: 2,
  },
  routeDistText: {
    color: '#849396',
    fontSize: 7,
    fontFamily: 'monospace',
    letterSpacing: 0.8,
  },
  specsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  specItem: {
    width: '48%',
    backgroundColor: '#080e17',
    borderRadius: radius.sm,
    padding: 8,
    gap: 2,
  },
  specLabel: {
    color: '#849396',
    fontSize: 8,
    fontWeight: '800',
  },
  specValue: {
    color: '#dde2f0',
    fontSize: 11,
    fontWeight: '700',
  },
  specValueMono: {
    color: '#feb300',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  loadedContainersSection: {
    backgroundColor: '#080e17',
    borderRadius: radius.sm,
    padding: 10,
    gap: 6,
  },
  loadedTitle: {
    color: '#849396',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  loadedContainerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadedCode: {
    color: '#dde2f0',
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
  },
  loadedSize: {
    color: '#00e5ff',
    fontFamily: 'monospace',
    fontSize: 10,
  },
  loadedStatus: {
    color: '#22ef7e',
    fontSize: 9,
    fontWeight: '700',
  },
  activeTripActions: {
    flexDirection: 'row',
    gap: 10,
  },
  continueTripBtn: {
    flex: 1,
    height: 44,
    backgroundColor: '#00e5ff',
    borderRadius: radius.DEFAULT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  continueTripBtnText: {
    color: '#00363d',
    fontWeight: '900',
    fontSize: 11,
    letterSpacing: 0.6,
  },
  addContBtnSmall: {
    paddingHorizontal: 14,
    height: 44,
    backgroundColor: '#1a2029',
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: '#00e5ff',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addContBtnSmallText: {
    color: '#00e5ff',
    fontSize: 10,
    fontWeight: '800',
  },

  // ─── NO ACTIVE TRIP CARD ───
  noActiveCard: {
    backgroundColor: '#161c25',
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: '#242a34',
    padding: 20,
    alignItems: 'center',
    gap: 8,
    textAlign: 'center',
  },
  noActiveTitle: {
    color: '#849396',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  noActiveSub: {
    color: '#849396',
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 15,
  },
  startManualBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#00e5ff',
    borderRadius: radius.DEFAULT,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 4,
  },
  startManualBtnText: {
    color: '#00363d',
    fontWeight: '900',
    fontSize: 11,
  },

  // ─── PROMINENT ADD CONTAINER ACTION ───
  prominentAddContainerBtn: {
    backgroundColor: '#161c25',
    borderRadius: radius.DEFAULT,
    borderWidth: 1.5,
    borderColor: '#00e5ff',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  prominentAddIconCircle: {
    width: 44,
    height: 44,
    borderRadius: radius.DEFAULT,
    backgroundColor: '#00e5ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  prominentAddTitle: {
    color: '#00e5ff',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 0.6,
  },
  prominentAddSub: {
    color: '#849396',
    fontSize: 9,
    lineHeight: 13,
    marginTop: 2,
  },

  // ─── 8-STAGE WORKFLOW TRACKER ───
  progressTrackerCard: {
    backgroundColor: '#161c25',
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: '#242a34',
    padding: 14,
    gap: 10,
  },
  trackerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#242a34',
  },
  trackerTitle: {
    color: '#dde2f0',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  stagesList: {
    gap: 6,
  },
  stageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stageCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#080e17',
    borderWidth: 1,
    borderColor: '#242a34',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageCircleDone: {
    backgroundColor: '#22ef7e',
    borderColor: '#22ef7e',
  },
  stageCircleActive: {
    borderColor: '#00e5ff',
    borderWidth: 2,
  },
  stageItemText: {
    fontSize: 11,
    color: '#849396',
  },
  stageItemTextDone: {
    color: '#dde2f0',
    fontWeight: '600',
  },
  stageItemTextActive: {
    color: '#00e5ff',
    fontWeight: '800',
  },
  stageButtonsRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#242a34',
  },
  stageActionBtn: {
    height: 40,
    backgroundColor: '#00e5ff',
    borderRadius: radius.DEFAULT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  stageActionBtnText: {
    color: '#00363d',
    fontWeight: '900',
    fontSize: 11,
    letterSpacing: 0.8,
  },

  // ─── QUICK ACTIONS GRID ───
  quickActionsSection: {
    gap: 10,
  },
  sectionHeaderTitle: {
    color: '#849396',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickActionTile: {
    width: '22%',
    backgroundColor: '#161c25',
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: '#242a34',
    padding: 10,
    alignItems: 'center',
    gap: 6,
  },
  tileIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileTitle: {
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
  },
  modalScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 16,
    paddingVertical: 30,
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
    fontSize: 12,
    letterSpacing: 0.8,
  },
  modalFieldGroup: {
    gap: 6,
  },
  modalLabel: {
    color: '#849396',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#080e17',
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: '#242a34',
    paddingHorizontal: 12,
    height: 46,
  },
  modalInput: {
    flex: 1,
    color: '#dde2f0',
    fontFamily: 'monospace',
    fontSize: 13,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  } as any,

  // ISO Pill
  validationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },
  pillValid: {
    backgroundColor: 'rgba(34, 239, 126, 0.12)',
    borderWidth: 1,
    borderColor: '#22ef7e',
  },
  pillInvalid: {
    backgroundColor: 'rgba(255, 82, 82, 0.12)',
    borderWidth: 1,
    borderColor: '#ff5252',
  },
  validationPillText: {
    flex: 1,
    fontSize: 10,
    fontWeight: '700',
  },
  fixDigitBtn: {
    backgroundColor: '#00e5ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  fixDigitBtnText: {
    color: '#00363d',
    fontSize: 9,
    fontWeight: '900',
  },

  // Size buttons
  sizeToggleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  sizeBtn: {
    flex: 1,
    height: 42,
    borderRadius: radius.DEFAULT,
    backgroundColor: '#080e17',
    borderWidth: 1,
    borderColor: '#242a34',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sizeBtnActive: {
    backgroundColor: 'rgba(0, 229, 255, 0.15)',
    borderColor: '#00e5ff',
  },
  sizeBtnText: {
    color: '#849396',
    fontSize: 10,
    fontWeight: '800',
  },
  sizeBtnTextActive: {
    color: '#00e5ff',
  },

  // Terminal Chips
  terminalChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  terminalChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.sm,
    backgroundColor: '#080e17',
    borderWidth: 1,
    borderColor: '#242a34',
  },
  terminalChipActive: {
    backgroundColor: 'rgba(0, 229, 255, 0.15)',
    borderColor: '#00e5ff',
  },
  terminalChipText: {
    color: '#849396',
    fontSize: 10,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  terminalChipTextActive: {
    color: '#00e5ff',
  },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 82, 82, 0.12)',
    borderColor: '#ff5252',
    borderWidth: 1,
    borderRadius: radius.sm,
    padding: 10,
    gap: 8,
  },
  errorBoxText: {
    color: '#ff8a80',
    fontSize: 10,
    fontWeight: '700',
    flex: 1,
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 239, 126, 0.12)',
    borderColor: '#22ef7e',
    borderWidth: 1,
    borderRadius: radius.sm,
    padding: 10,
    gap: 8,
  },
  successBoxText: {
    color: '#22ef7e',
    fontSize: 10,
    fontWeight: '700',
    flex: 1,
  },
  modalSubmitBtn: {
    height: 48,
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
    letterSpacing: 0.8,
  },

  // Allowance Card
  allowanceCard: {
    backgroundColor: '#080e17',
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: '#22ef7e',
    padding: 14,
    gap: 4,
  },
  allowanceLabel: {
    color: '#22ef7e',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  allowanceValueApproved: {
    color: '#22ef7e',
    fontSize: 22,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  allowanceValuePending: {
    color: '#feb300',
    fontSize: 22,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  allowanceSub: {
    color: '#849396',
    fontSize: 9,
    lineHeight: 13,
  },

  // Notif item
  notifItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#080e17',
    borderRadius: radius.sm,
    padding: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: '#242a34',
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
