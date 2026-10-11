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
  Image,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../../src/store/authStore';
import { tripService } from '../../../src/services/tripService';
import { dashboardService, DriverDashboardStats } from '../../../src/services/dashboardService';
import { driverService } from '../../../src/services/driverService';
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
  const [notificationsModalVisible, setNotificationsModalVisible] = useState(false);
  const [allowanceModalVisible, setAllowanceModalVisible] = useState(false);
  const [damageReportModalVisible, setDamageReportModalVisible] = useState(false);
  const [supervisorModalVisible, setSupervisorModalVisible] = useState(false);

  // Damage Report Form State
  const [damageContainerNumber, setDamageContainerNumber] = useState('');
  const [damageDescription, setDamageDescription] = useState('');
  const [damageSuccessMsg, setDamageSuccessMsg] = useState<string | null>(null);

  // HUD Interactive Controls State
  const [bayArrived, setBayArrived] = useState(false);
  const [hookConfirmed, setHookConfirmed] = useState(false);
  const [towerAck, setTowerAck] = useState(false);

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

      // Fetch driver profile photos if not yet loaded in store
      if (!user?.profilePhoto) {
        try {
          const prof = await driverService.getProfile();
          if (prof?.profilePhoto) {
            useAuthStore.getState().updateUser({ profilePhoto: prof.profilePhoto, coverImage: prof.coverImage });
          }
        } catch {}
      }
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
  const driverPhoto = user?.profilePhoto || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80';

  // Container counts for active trip
  const count20Ft = (activeTrip?.containers || []).filter((c: any) => c.size === '20FT' || c.size === 'FT_20').length;
  const count40Ft = (activeTrip?.containers || []).filter((c: any) => c.size === '40FT' || c.size === 'FT_40').length;



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
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.push('/(driver)/(tabs)/profile')}
            >
              {driverPhoto ? (
                <Image source={{ uri: driverPhoto }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarWrap}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </View>
              )}
            </TouchableOpacity>
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

        {/* ─── C. STITCH ACTIVE MISSION & TACTICAL HUD ─── */}
        {activeTrip ? (
          <View style={styles.stitchHudContainer}>
            {/* 1. Container Telematics Banner */}
            <View style={styles.hudTelematicsBanner}>
              <View style={styles.hudBannerTop}>
                <View style={styles.hudMissionBadge}>
                  <Text style={styles.hudMissionBadgeText}>MISSION ACTIVE</Text>
                </View>
                <Text style={styles.hudMissionIdText}>
                  #{activeTrip.tripNumber || `MSN-${activeTrip.id?.slice(0, 6)}`}
                </Text>
                <View style={styles.hudTransmittingBadge}>
                  <View style={styles.pingDot} />
                  <Text style={styles.hudTransmittingText}>TRANSMITTING</Text>
                </View>
              </View>

              <View style={styles.hudContainerTitleRow}>
                <Text style={styles.hudContainerId}>
                  {activeTrip.containers?.[0]?.containerNumber || 'MSKU-982412-0'}
                </Text>
                <Text style={styles.hudContainerSize}>
                  {activeTrip.containers?.[0]?.size || '40FT HC'}
                </Text>
              </View>

              <View style={styles.hudSpecChipsGrid}>
                <View style={styles.hudSpecChip}>
                  <Text style={styles.hudSpecLabel}>PAYLOAD TYPE</Text>
                  <Text style={styles.hudSpecValCyan}>REEFER ISO</Text>
                </View>
                <View style={styles.hudSpecChip}>
                  <Text style={styles.hudSpecLabel}>CORE TEMP</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name="snow" size={12} color="#22ef7e" />
                    <Text style={styles.hudSpecValLime}>-18.2°C</Text>
                  </View>
                </View>
                <View style={styles.hudSpecChip}>
                  <Text style={styles.hudSpecLabel}>STABILITY</Text>
                  <Text style={styles.hudSpecValLime}>LOCKED</Text>
                </View>
              </View>
            </View>

            {/* 2. Turn-by-Turn Guidance Banner */}
            <View style={styles.hudTurnGuidanceBanner}>
              <View style={styles.hudTurnIconBox}>
                <Ionicons name="arrow-redo" size={22} color="#00363d" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.hudDistLabel}>IN 120 METRES</Text>
                  <View style={styles.routeCodeTag}>
                    <Text style={styles.routeCodeTagText}>RTE-04</Text>
                  </View>
                </View>
                <Text style={styles.hudTurnInstruction}>
                  TURN RIGHT ONTO TERMINAL SPINE AVE
                </Text>
              </View>
            </View>

            {/* 3. Tactical Yard Radar / Route Display */}
            <View style={styles.hudYardRadarCard}>
              <View style={styles.radarSimulationBox}>
                {/* Yard Bay Overlay Labels */}
                <View style={styles.radarBayLabel1}>
                  <Text style={styles.radarBayText}>BAY B-02</Text>
                </View>
                <View style={styles.radarBayLabel2}>
                  <Text style={styles.radarBayTextActive}>BAY B-03 (ACTIVE)</Text>
                </View>
                <View style={styles.radarBayLabel3}>
                  <Text style={styles.radarBayText}>BAY B-04</Text>
                </View>

                {/* Active Tractor Beacon */}
                <View style={styles.tractorBeaconWrap}>
                  <View style={styles.tractorBeaconPulse}>
                    <Ionicons name="navigate" size={18} color="#00363d" />
                  </View>
                  <Text style={styles.tractorBeaconTag}>TR-104</Text>
                </View>

                {/* Radar Corner Telemetry Badges */}
                <View style={styles.radarCornerTopLeft}>
                  <View style={styles.radarBadgePill}>
                    <Ionicons name="location" size={11} color="#00e5ff" />
                    <Text style={styles.radarBadgeText}>RTLS ACC: ±0.2M</Text>
                  </View>
                  <View style={styles.radarBadgePill}>
                    <Ionicons name="compass" size={11} color="#feb300" />
                    <Text style={styles.radarBadgeText}>HDG 084° E</Text>
                  </View>
                </View>

                {/* Live Speed HUD Badge */}
                <View style={styles.radarSpeedHud}>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
                    <Text style={styles.speedValueText}>18</Text>
                    <Text style={styles.speedUnitText}>KM/H</Text>
                  </View>
                  <Text style={styles.speedLimitText}>LIMIT 25 KM/H</Text>
                </View>

                {/* Destination Target Tag */}
                <View style={styles.radarDestTargetBar}>
                  <Ionicons name="flag" size={16} color="#feb300" />
                  <View style={{ flex: 1, marginHorizontal: 6 }}>
                    <Text style={styles.radarDestSubLabel}>ASSIGNED DESTINATION</Text>
                    <Text style={styles.radarDestTitle}>
                      {activeTrip.destTerminal || 'JCT'} · SLOT C-12 (CRANE QC-07)
                    </Text>
                  </View>
                  <Text style={styles.radarDestDist}>340m</Text>
                </View>
              </View>
            </View>

            {/* 4. Waypoint Progress Pipeline */}
            <View style={styles.hudWaypointsCard}>
              <View style={styles.hudWaypointsHeader}>
                <Text style={styles.hudWaypointsTitle}>MISSION WAYPOINTS</Text>
                <Text style={styles.hudWaypointsStep}>STEP 2 OF 3</Text>
              </View>

              <View style={styles.waypointsList}>
                {/* Step 1 */}
                <View style={styles.waypointRowDone}>
                  <View style={styles.wpIconDone}>
                    <Ionicons name="checkmark" size={14} color="#00363d" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.wpTitleDone}>1. GATE-IN CLEARANCE</Text>
                    <Text style={styles.wpSub}>Auth Station Alpha · Verified</Text>
                  </View>
                  <Text style={styles.wpTimeDone}>08:14</Text>
                </View>

                {/* Step 2 (Active) */}
                <View style={styles.waypointRowActive}>
                  <View style={styles.wpIconActive}>
                    <Text style={styles.wpIconActiveText}>2</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.wpTitleActive}>
                        TRANSFER BAY {activeTrip.destTerminal || 'B-03'}
                      </Text>
                      <View style={styles.activeTagMini}>
                        <Text style={styles.activeTagMiniText}>ACTIVE</Text>
                      </View>
                    </View>
                    <Text style={styles.wpSubActive}>Align chassis under hoist guide</Text>
                  </View>
                  <Text style={styles.wpTimeActive}>CURRENT</Text>
                </View>

                {/* Step 3 */}
                <View style={styles.waypointRowUpcoming}>
                  <View style={styles.wpIconUpcoming}>
                    <Text style={styles.wpIconUpcomingText}>3</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.wpTitleUpcoming}>3. VESSEL BERTHING BAY 2</Text>
                    <Text style={styles.wpSub}>Crane QC-07 · Slot C-12</Text>
                  </View>
                  <Text style={styles.wpTimeUpcoming}>ETA 08:35</Text>
                </View>
              </View>
            </View>

            {/* 5. Tractor Telemetry Strip */}
            <View style={styles.hudTelemetryStripGrid}>
              <View style={styles.hudTelemBox}>
                <Text style={styles.hudTelemLabel}>5TH-WHEEL PIN</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#22ef7e' }} />
                  <Text style={styles.hudTelemValLime}>SECURED</Text>
                </View>
                <Text style={styles.hudTelemSub}>Lock Force 32kN</Text>
              </View>

              <View style={styles.hudTelemBox}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={styles.hudTelemLabel}>TRACTOR EV</Text>
                  <Text style={styles.hudTelemValCyan}>78%</Text>
                </View>
                <View style={styles.batteryProgressBar}>
                  <View style={[styles.batteryProgressFill, { width: '78%' }]} />
                </View>
                <Text style={styles.hudTelemSub}>5.4h Shift Rem.</Text>
              </View>

              <View style={styles.hudTelemBox}>
                <Text style={styles.hudTelemLabel}>PNEUMATICS</Text>
                <Text style={styles.hudTelemValWhite}>8.4 <Text style={{ fontSize: 9, color: '#849396' }}>BAR</Text></Text>
                <Text style={styles.hudTelemSubLime}>NORMAL PRESS</Text>
              </View>
            </View>

            {/* 6. Glove-Optimized Mission Critical Large Controls (56px) */}
            <View style={{ gap: 8 }}>
              {/* Primary Confirmation Button */}
              <TouchableOpacity
                style={[styles.glovePrimaryBtn, bayArrived && { backgroundColor: '#22ef7e' }]}
                onPress={() => setBayArrived(!bayArrived)}
                activeOpacity={0.88}
              >
                <Ionicons name="checkmark-done-circle" size={24} color="#00363d" />
                <Text style={styles.glovePrimaryBtnText}>
                  {bayArrived ? 'BAY POSITION CONFIRMED' : `ARRIVED AT BAY ${activeTrip.destTerminal || 'B-03'}`}
                </Text>
              </TouchableOpacity>

              {/* Secondary & Safety Row */}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  style={[styles.gloveSecondaryBtn, hookConfirmed && { backgroundColor: '#22ef7e' }]}
                  onPress={() => setHookConfirmed(!hookConfirmed)}
                  activeOpacity={0.88}
                >
                  <Ionicons name="link" size={20} color={hookConfirmed ? '#00363d' : '#feb300'} />
                  <Text style={[styles.gloveSecondaryBtnText, hookConfirmed && { color: '#00363d' }]}>
                    {hookConfirmed ? 'HOOK LOCKED & ENGAGED' : 'CONFIRM HOOKED'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.gloveHazardBtn}
                  onPress={() => Alert.alert('SAFETY DISPATCH', 'Hazard alert broadcasted to Tower Bay-7 console.')}
                  activeOpacity={0.88}
                >
                  <Ionicons name="warning" size={20} color="#ff5252" />
                  <Text style={styles.gloveHazardBtnText}>ALERT</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 7. Yard Marshal Tower Comms Toast */}
            <View style={styles.hudTowerCommsToast}>
              <Ionicons name="headset" size={18} color="#00e5ff" />
              <View style={{ flex: 1, marginHorizontal: 6 }}>
                <Text style={styles.towerCommsLabel}>YARD MARSHAL TOWER:</Text>
                <Text style={styles.towerCommsMsg}>"TR-104 prioritize Reefer drop off"</Text>
              </View>
              <TouchableOpacity
                style={[styles.ackBtn, towerAck && { backgroundColor: '#22ef7e' }]}
                onPress={() => setTowerAck(!towerAck)}
              >
                <Text style={[styles.ackBtnText, towerAck && { color: '#00363d' }]}>
                  {towerAck ? 'ACKED' : 'ACK'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.noActiveCard}>
            <Ionicons name="hourglass-outline" size={32} color="#849396" />
            <Text style={styles.noActiveTitle}>NO ACTIVE MISSION</Text>
            <Text style={styles.noActiveSub}>
              You currently have no mission in progress. Tap below to enter trip details and container numbers to begin.
            </Text>
            <TouchableOpacity style={styles.startManualBtn} onPress={() => router.push('/(driver)/trips/new')}>
              <Ionicons name="add-circle" size={18} color="#00363d" />
              <Text style={styles.startManualBtnText}>CREATE NEW TRIP</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ─── D. CREATE NEW TRIP ACTION ─── */}
        <TouchableOpacity
          style={styles.prominentAddContainerBtn}
          onPress={() => router.push('/(driver)/trips/new')}
          activeOpacity={0.88}
        >
          <View style={styles.prominentAddIconCircle}>
            <Ionicons name="trail-sign" size={20} color="#00363d" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.prominentAddTitle}>CREATE NEW TRIP</Text>
            <Text style={styles.prominentAddSub}>
              Enter vessel, origin, destination and container numbers with ISO 6346 verification
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
            <TouchableOpacity style={styles.quickActionTile} onPress={() => router.push('/(driver)/trips/new')}>
              <View style={[styles.tileIconCircle, { backgroundColor: 'rgba(0, 229, 255, 0.15)' }]}>
                <Ionicons name="add-circle" size={20} color="#00e5ff" />
              </View>
              <Text style={styles.tileTitle}>New Trip</Text>
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
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#00e5ff',
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
        marginTop: 2,
  },
  routeArrowBox: {
    alignItems: 'center',
    gap: 2,
  },
  routeDistText: {
    color: '#849396',
    fontSize: 7,
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
        fontSize: 11,
    fontWeight: '700',
    flex: 1,
  },
  loadedSize: {
    color: '#00e5ff',
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
      },
  allowanceValuePending: {
    color: '#feb300',
    fontSize: 22,
    fontWeight: '900',
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

  // ─── STITCH HUD STYLES ───
  stitchHudContainer: {
    gap: 12,
  },
  hudTelematicsBanner: {
    backgroundColor: '#161c25',
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: '#242a34',
    padding: 14,
    gap: 10,
    overflow: 'hidden',
  },
  hudBannerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  hudMissionBadge: {
    backgroundColor: '#00e5ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  hudMissionBadgeText: {
    color: '#00363d',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  hudMissionIdText: {
    color: '#00e5ff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  hudTransmittingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#080e17',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#242a34',
  },
  pingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22ef7e',
  },
  hudTransmittingText: {
    color: '#22ef7e',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  hudContainerTitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  hudContainerId: {
    color: '#dde2f0',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  hudContainerSize: {
    color: '#feb300',
    fontSize: 13,
    fontWeight: '900',
  },
  hudSpecChipsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  hudSpecChip: {
    flex: 1,
    backgroundColor: '#080e17',
    padding: 8,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#1a2029',
  },
  hudSpecLabel: {
    color: '#849396',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  hudSpecValCyan: {
    color: '#00e5ff',
    fontSize: 11,
    fontWeight: '900',
    marginTop: 2,
  },
  hudSpecValLime: {
    color: '#22ef7e',
    fontSize: 11,
    fontWeight: '900',
    marginTop: 2,
  },

  // Turn Guidance Banner
  hudTurnGuidanceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00e5ff',
    borderRadius: radius.DEFAULT,
    padding: 12,
    gap: 12,
  },
  hudTurnIconBox: {
    width: 42,
    height: 42,
    borderRadius: radius.sm,
    backgroundColor: '#080e17',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hudDistLabel: {
    color: '#00363d',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  routeCodeTag: {
    backgroundColor: 'rgba(0, 54, 61, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  routeCodeTagText: {
    color: '#00363d',
    fontSize: 8,
    fontWeight: '900',
  },
  hudTurnInstruction: {
    color: '#00363d',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginTop: 2,
  },

  // Yard Radar Card
  hudYardRadarCard: {
    backgroundColor: '#161c25',
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: '#242a34',
    overflow: 'hidden',
  },
  radarSimulationBox: {
    height: 180,
    backgroundColor: '#080e17',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radarBayLabel1: {
    position: 'absolute',
    left: 20,
    top: 20,
    backgroundColor: '#161c25',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  radarBayLabel2: {
    position: 'absolute',
    left: 20,
    top: 70,
    backgroundColor: 'rgba(0, 229, 255, 0.15)',
    borderWidth: 1,
    borderColor: '#00e5ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  radarBayLabel3: {
    position: 'absolute',
    left: 20,
    top: 120,
    backgroundColor: '#161c25',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  radarBayText: {
    color: '#849396',
    fontSize: 9,
    fontWeight: '700',
  },
  radarBayTextActive: {
    color: '#00e5ff',
    fontSize: 9,
    fontWeight: '900',
  },
  tractorBeaconWrap: {
    position: 'absolute',
    right: 70,
    top: 50,
    alignItems: 'center',
  },
  tractorBeaconPulse: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#00e5ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tractorBeaconTag: {
    color: '#00e5ff',
    fontSize: 9,
    fontWeight: '900',
    marginTop: 2,
    backgroundColor: '#080e17',
    paddingHorizontal: 4,
    borderRadius: 2,
  },
  radarCornerTopLeft: {
    position: 'absolute',
    top: 8,
    left: 8,
    gap: 4,
  },
  radarBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(8, 14, 23, 0.9)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  radarBadgeText: {
    color: '#dde2f0',
    fontSize: 8,
    fontWeight: '800',
  },
  radarSpeedHud: {
    position: 'absolute',
    top: 8,
    right: 8,
    alignItems: 'flex-end',
    backgroundColor: 'rgba(8, 14, 23, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  speedValueText: {
    color: '#00e5ff',
    fontSize: 20,
    fontWeight: '900',
  },
  speedUnitText: {
    color: '#849396',
    fontSize: 8,
    fontWeight: '800',
  },
  speedLimitText: {
    color: '#feb300',
    fontSize: 7,
    fontWeight: '900',
  },
  radarDestTargetBar: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(8, 14, 23, 0.95)',
    padding: 8,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#242a34',
  },
  radarDestSubLabel: {
    color: '#849396',
    fontSize: 7,
    fontWeight: '800',
  },
  radarDestTitle: {
    color: '#dde2f0',
    fontSize: 10,
    fontWeight: '900',
  },
  radarDestDist: {
    color: '#00e5ff',
    fontSize: 12,
    fontWeight: '900',
  },

  // Waypoints Pipeline
  hudWaypointsCard: {
    backgroundColor: '#161c25',
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: '#242a34',
    padding: 12,
    gap: 10,
  },
  hudWaypointsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hudWaypointsTitle: {
    color: '#dde2f0',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  hudWaypointsStep: {
    color: '#22ef7e',
    fontSize: 9,
    fontWeight: '900',
  },
  waypointsList: {
    gap: 6,
  },
  waypointRowDone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#080e17',
    padding: 8,
    borderRadius: radius.sm,
  },
  wpIconDone: {
    width: 24,
    height: 24,
    borderRadius: 4,
    backgroundColor: '#22ef7e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wpTitleDone: {
    color: '#dde2f0',
    fontSize: 10,
    fontWeight: '800',
  },
  wpSub: {
    color: '#849396',
    fontSize: 9,
  },
  wpTimeDone: {
    color: '#22ef7e',
    fontSize: 9,
    fontWeight: '800',
  },
  waypointRowActive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1f2733',
    borderWidth: 1,
    borderColor: '#00e5ff',
    padding: 8,
    borderRadius: radius.sm,
  },
  wpIconActive: {
    width: 24,
    height: 24,
    borderRadius: 4,
    backgroundColor: '#00e5ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wpIconActiveText: {
    color: '#00363d',
    fontSize: 11,
    fontWeight: '900',
  },
  wpTitleActive: {
    color: '#00e5ff',
    fontSize: 10,
    fontWeight: '900',
  },
  wpSubActive: {
    color: '#dde2f0',
    fontSize: 9,
  },
  wpTimeActive: {
    color: '#00e5ff',
    fontSize: 9,
    fontWeight: '900',
  },
  activeTagMini: {
    backgroundColor: 'rgba(0, 229, 255, 0.2)',
    paddingHorizontal: 4,
    borderRadius: 2,
  },
  activeTagMiniText: {
    color: '#00e5ff',
    fontSize: 7,
    fontWeight: '900',
  },
  waypointRowUpcoming: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#080e17',
    padding: 8,
    borderRadius: radius.sm,
    opacity: 0.7,
  },
  wpIconUpcoming: {
    width: 24,
    height: 24,
    borderRadius: 4,
    backgroundColor: '#242a34',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wpIconUpcomingText: {
    color: '#849396',
    fontSize: 11,
    fontWeight: '900',
  },
  wpTitleUpcoming: {
    color: '#bac9cc',
    fontSize: 10,
    fontWeight: '700',
  },
  wpTimeUpcoming: {
    color: '#feb300',
    fontSize: 9,
    fontWeight: '800',
  },

  // Telemetry Strip Grid
  hudTelemetryStripGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  hudTelemBox: {
    flex: 1,
    backgroundColor: '#161c25',
    padding: 10,
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: '#242a34',
    gap: 2,
  },
  hudTelemLabel: {
    color: '#849396',
    fontSize: 7,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  hudTelemValLime: {
    color: '#22ef7e',
    fontSize: 11,
    fontWeight: '900',
  },
  hudTelemValCyan: {
    color: '#00e5ff',
    fontSize: 11,
    fontWeight: '900',
  },
  hudTelemValWhite: {
    color: '#dde2f0',
    fontSize: 12,
    fontWeight: '900',
  },
  hudTelemSub: {
    color: '#849396',
    fontSize: 8,
  },
  hudTelemSubLime: {
    color: '#22ef7e',
    fontSize: 8,
    fontWeight: '800',
  },
  batteryProgressBar: {
    height: 4,
    backgroundColor: '#080e17',
    borderRadius: 2,
    marginVertical: 3,
    overflow: 'hidden',
  },
  batteryProgressFill: {
    height: '100%',
    backgroundColor: '#00e5ff',
  },

  // Glove-Optimized Controls
  glovePrimaryBtn: {
    height: 56,
    backgroundColor: '#00e5ff',
    borderRadius: radius.DEFAULT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 3,
  },
  glovePrimaryBtnText: {
    color: '#00363d',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  gloveSecondaryBtn: {
    flex: 4,
    height: 52,
    backgroundColor: '#161c25',
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: '#feb300',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  gloveSecondaryBtnText: {
    color: '#feb300',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  gloveHazardBtn: {
    flex: 1,
    height: 52,
    backgroundColor: 'rgba(255, 82, 82, 0.15)',
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: '#ff5252',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gloveHazardBtnText: {
    color: '#ff5252',
    fontSize: 8,
    fontWeight: '900',
  },

  // Tower Comms Toast
  hudTowerCommsToast: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161c25',
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: '#242a34',
    padding: 10,
  },
  towerCommsLabel: {
    color: '#849396',
    fontSize: 8,
    fontWeight: '800',
  },
  towerCommsMsg: {
    color: '#dde2f0',
    fontSize: 10,
    fontWeight: '700',
  },
  ackBtn: {
    backgroundColor: '#080e17',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#00e5ff',
  },
  ackBtnText: {
    color: '#00e5ff',
    fontSize: 9,
    fontWeight: '900',
  },
});
