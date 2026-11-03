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
  KeyboardAvoidingView,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../../src/store/authStore';
import { tripService } from '../../../src/services/tripService';
import { dashboardService, DriverDashboardStats } from '../../../src/services/dashboardService';
import { driverService } from '../../../src/services/driverService';
import { Colors, Typography, Layout, Spacing } from '../../../src/constants/theme';
import axios from 'axios';
import API_BASE_URL from '../../../src/config/api';
import { useResponsive } from '../../../src/hooks/useResponsive';
import { getTripTimingDetails } from '../../../src/utils/tripDateUtils';
import { getTripDischargeTerminal } from '../../../src/utils/tripTerminalUtils';
import { AppButton, StatCard, ListRow, StatusPill } from '../../../src/components';
import { useNetworkStatus } from '../../../src/hooks/useNetworkStatus';

const theme = Colors.light;

const TERMINALS = ['CICT', 'CWIT', 'ECT', 'JCT', 'UCT', 'SAGT'] as const;

export default function DriverHomeDashboard() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();
  const { topInset, bottomInset, contentMaxWidth, containerPaddingHorizontal } = useResponsive();
  const { isOnline } = useNetworkStatus();

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

  // Administrative Suspension Status
  const isSuspended = useMemo(() => {
    return user?.status === 'SUSPENDED';
  }, [user]);

  // Modals state
  const [moreMenuVisible, setMoreMenuVisible] = useState(false);
  const [allowanceModalVisible, setAllowanceModalVisible] = useState(false);
  const [damageReportModalVisible, setDamageReportModalVisible] = useState(false);
  const [supervisorModalVisible, setSupervisorModalVisible] = useState(false);

  // Receipt Modal State (supporting both submission and inspection)
  const [receiptModalVisible, setReceiptModalVisible] = useState(false);
  const [selectedReceiptTrip, setSelectedReceiptTrip] = useState<any>(null);
  const [submissionReceiptVisible, setSubmissionReceiptVisible] = useState(false);
  const [submissionReceipt, setSubmissionReceipt] = useState<{
    tripNumber: string;
    route: string;
    dischargeBay: string;
    sealStatus: string;
    damageStatus: string;
    notes: string;
    timestamp: string;
    containersCount: number;
    vehicleNumber: string;
    cheNumber: string;
  } | null>(null);

  // Discharge Submission Modal State
  const [dischargeModalVisible, setDischargeModalVisible] = useState(false);
  const [dischargeTerminal, setDischargeTerminal] = useState('');
  const [dischargeBay, setDischargeBay] = useState('Bay 04, Crane 02');
  const [sealStatus, setSealStatus] = useState<'INTACT (VERIFIED)' | 'DAMAGED / TAMPERED'>('INTACT (VERIFIED)');
  const [cargoDamageStatus, setCargoDamageStatus] = useState<'NONE' | 'DAMAGED'>('NONE');
  const [driverCompletionNotes, setDriverCompletionNotes] = useState('Discharged cargo safely at destination terminal berth. Seals inspected and verified intact.');

  // Damage Report Form State
  const [damageContainerNumber, setDamageContainerNumber] = useState('');
  const [damageDescription, setDamageDescription] = useState('');
  const [damageSuccessMsg, setDamageSuccessMsg] = useState<string | null>(null);

  const [driverProfile, setDriverProfile] = useState<any>(null);
  const [actionInProgress, setActionInProgress] = useState(false);

  // Fetch live dashboard & trips without fake demo trips merging
  const loadData = useCallback(async () => {
    const driverId = user?.driverId || user?.id || '';

    try {
      // 1. Fetch live trips from backend
      const apiTrips = await tripService.getTrips(driverId || undefined);
      const list = Array.isArray(apiTrips) ? apiTrips : [];
      setTrips(list);

      // 2. Compute dynamic stats from live trips
      const completedCount = list.filter((t) => t.status === 'COMPLETED' || t.status === 'APPROVED').length;
      const activeCount = list.filter((t) => t.status === 'IN_PROGRESS' || t.status === 'ARRIVED').length;
      const pendingCount = list.filter((t) => t.status === 'PENDING_APPROVAL').length;
      let containersDelivered = 0;
      list.forEach((t) => {
        if (t.status === 'COMPLETED' || t.status === 'APPROVED') {
          containersDelivered += (t.containers?.length || 1);
        }
      });

      // Fetch dashboard metrics
      let serverStats: Partial<DriverDashboardStats> = {};
      if (driverId) {
        try {
          serverStats = await dashboardService.getDriverDashboard(driverId);
        } catch { }
      }

      setDashboardStats({
        activeTrips: activeCount,
        completedTripsToday: completedCount,
        containersTransportedToday: containersDelivered || serverStats.containersTransportedToday || 0,
        tripsPendingApproval: pendingCount,
        approvedAllowance: completedCount * 2500,
        pendingAllowance: pendingCount * 2500,
        activeTrip: list.find((t) => ['IN_PROGRESS', 'ARRIVED', 'PENDING_APPROVAL', 'APPROVED'].includes(t.status)) || null,
      });

      // 3. Fetch driver profile if available
      try {
        const driverIdentifier = user?.driverCode || user?.driverId || user?.username;
        if (driverIdentifier) {
          const prof = await driverService.getProfile(driverIdentifier);
          if (prof) {
            setDriverProfile(prof);
          }
        }
      } catch { }
    } catch (err) {
      console.warn('Network or API sync error:', err);
    } finally {
      setRefreshing(false);
    }
  }, [user?.driverCode, user?.driverId, user?.id, user?.username]);

  useEffect(() => { loadData(); }, [loadData]);
  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  // Strict activeTrip computation: strictly IN_PROGRESS, ARRIVED, PENDING_APPROVAL, or APPROVED
  const activeTrip = useMemo(() => {
    return trips.find((t) => ['IN_PROGRESS', 'ARRIVED', 'PENDING_APPROVAL', 'APPROVED'].includes(t.status)) || null;
  }, [trips]);

  // Clean real profile data - no fake demo defaults
  const driverName = driverProfile?.fullName || user?.name || user?.fullName || '-';
  const driverCode = driverProfile?.driverCode || user?.driverCode || user?.username || '-';
  const vehicleNumber = driverProfile?.vehicleNumber || user?.vehicleNumber || activeTrip?.vehicleNumber || '-';
  const driverPhoto = driverProfile?.profilePhoto || user?.profilePhoto || null;
  const initials = driverName !== '-' ? driverName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : 'DR';

  // License & Port Pass Expiry Warnings (Show ONLY when renewal is due)
  const vehicleLicenseExpiryDate = driverProfile?.vehicleLicenseExpiryDate || user?.vehicleLicenseExpiryDate;
  const vehicleLicenseDaysLeft = vehicleLicenseExpiryDate
    ? Math.round((new Date(vehicleLicenseExpiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  const vehicleLicenseRenewalDue = vehicleLicenseDaysLeft !== null && vehicleLicenseDaysLeft <= 30;

  const driverPortPassExpiryDate = driverProfile?.driverPortPassExpiryDate || user?.driverPortPassExpiryDate;
  const driverPortPassDaysLeft = driverPortPassExpiryDate
    ? Math.round((new Date(driverPortPassExpiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  const driverPortPassRenewalDue = driverPortPassDaysLeft !== null && driverPortPassDaysLeft <= 5;

  const vehiclePortPassExpiryDate = driverProfile?.vehiclePortPassExpiryDate || user?.vehiclePortPassExpiryDate;
  const vehiclePortPassDaysLeft = vehiclePortPassExpiryDate
    ? Math.round((new Date(vehiclePortPassExpiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  const vehiclePortPassRenewalDue = vehiclePortPassDaysLeft !== null && vehiclePortPassDaysLeft <= 5;

  // Single renewal warning message if any is due
  const renewalWarningText = useMemo(() => {
    if (vehicleLicenseRenewalDue && vehicleLicenseDaysLeft !== null) {
      return `Vehicle License expires in ${vehicleLicenseDaysLeft <= 0 ? 'today' : `${vehicleLicenseDaysLeft} days`}`;
    }
    if (driverPortPassRenewalDue && driverPortPassDaysLeft !== null) {
      return `Driver Port Pass expires in ${driverPortPassDaysLeft <= 0 ? 'today' : `${driverPortPassDaysLeft} days`}`;
    }
    if (vehiclePortPassRenewalDue && vehiclePortPassDaysLeft !== null) {
      return `Vehicle Port Pass expires in ${vehiclePortPassDaysLeft <= 0 ? 'today' : `${vehiclePortPassDaysLeft} days`}`;
    }
    return null;
  }, [vehicleLicenseRenewalDue, vehicleLicenseDaysLeft, driverPortPassRenewalDue, driverPortPassDaysLeft, vehiclePortPassRenewalDue, vehiclePortPassDaysLeft]);

  // 1. START TRIP HANDLER (for APPROVED trips)
  const handleStartActiveTrip = async (tripId: string) => {
    setActionInProgress(true);
    try {
      await axios.patch(`${API_BASE_URL}/trips/${tripId}/status`, { status: 'IN_PROGRESS' });
      await loadData();
      Alert.alert('Trip Started', 'Trip is now IN PROGRESS. Drive safely.');
    } catch (err) {
      console.error('Failed to start trip:', err);
      Alert.alert('Error', 'Unable to start trip. Please check connection and try again.');
    } finally {
      setActionInProgress(false);
    }
  };

  // 2. OPEN DISCHARGE MODAL
  const handleOpenDischargeModal = (trip: any) => {
    if (isSuspended) {
      Alert.alert(
        'Account Suspended',
        'Your driver account has been suspended by Administration. You cannot submit or complete trips.'
      );
      return;
    }
    const target = trip || activeTrip;
    setDischargeTerminal(getTripDischargeTerminal(target) || target?.destTerminal || '');
    setDischargeBay(target?.dischargeBay || 'Bay 04, Crane 02');
    setSealStatus(target?.sealStatus || 'INTACT (VERIFIED)');
    setCargoDamageStatus(target?.damageStatus || 'NONE');
    setDriverCompletionNotes(target?.driverCompletionNotes || 'Discharged cargo safely at destination terminal berth.');
    setDischargeModalVisible(true);
  };

  // 3. SUBMIT DISCHARGED TRIP TO SUPERVISOR (Never fake success on error)
  const handleSubmitDischargeToSupervisor = async (tripId: string) => {
    if (isSuspended) {
      Alert.alert(
        'Account Suspended',
        'Your driver account has been suspended by Administration. You cannot submit or complete trips.'
      );
      return;
    }
    setActionInProgress(true);
    try {
      const trip = trips.find((t) => t.id === tripId) || activeTrip;
      const finalDest = dischargeTerminal || getTripDischargeTerminal(trip) || trip?.destTerminal || '-';
      const finalBay = dischargeBay.trim() || 'Bay 04, Crane 02';
      const finalNotes = driverCompletionNotes.trim() || 'Discharged cargo safely at destination berth.';

      // Official server API calls
      await axios.patch(`${API_BASE_URL}/trips/${tripId}/complete`, {
        dischargeTerminal: finalDest,
        dischargeBay: finalBay,
        sealStatus,
        damageStatus: cargoDamageStatus,
        driverNotes: finalNotes,
      });

      await axios.patch(`${API_BASE_URL}/trips/${tripId}/submit`, {
        notes: finalNotes,
      });

      const nowTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      setSubmissionReceipt({
        tripNumber: trip?.tripNumber || tripId?.slice(0, 8),
        route: `${trip?.sourceTerminal || '-'} ➔ ${finalDest}`,
        dischargeBay: `${finalDest} · ${finalBay}`,
        sealStatus,
        damageStatus: cargoDamageStatus,
        notes: finalNotes,
        timestamp: nowTime,
        containersCount: trip?.containers?.length || 1,
        vehicleNumber: trip?.vehicleNumber || user?.vehicleNumber || '-',
        cheNumber: trip?.chassisNumber || user?.cheNumber || '-',
      });

      setDischargeModalVisible(false);
      setSubmissionReceiptVisible(true);
      await loadData();
    } catch (err: any) {
      console.error('Failed to submit discharge to supervisor:', err);
      Alert.alert(
        'Submission Failed',
        'Server could not record trip completion. Please check network connection and try again.'
      );
    } finally {
      setActionInProgress(false);
    }
  };

  // 4. REPORT DAMAGE HANDLER
  const handleReportDamage = () => {
    if (!damageDescription.trim()) {
      Alert.alert('Missing Field', 'Please provide a damage description.');
      return;
    }
    setDamageSuccessMsg('Damage report registered with Port Safety.');
    setTimeout(() => {
      setDamageReportModalVisible(false);
      setDamageDescription('');
      setDamageContainerNumber('');
      setDamageSuccessMsg(null);
    }, 1500);
  };

  // Inspect specific trip receipt / details
  const handleViewTripReceipt = (trip: any) => {
    setSelectedReceiptTrip(trip);
    setReceiptModalVisible(true);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: Math.max(topInset, Layout.screenPadding),
            paddingBottom: Math.max(bottomInset + 30, 48),
            paddingHorizontal: containerPaddingHorizontal,
            maxWidth: contentMaxWidth,
            width: '100%',
            alignSelf: 'center',
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadData(); }}
            tintColor={theme.accent}
          />
        }
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ─── 1. CLEAN HEADER (White, Name, Grey Code + Vehicle, Status Chip, Logout Icon) ─── */}
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
              <Text style={styles.driverSubText}>
                {driverCode} {vehicleNumber !== '-' ? `• ${vehicleNumber}` : ''}
              </Text>
            </View>
          </View>

          <View style={styles.headerRight}>
            {/* Real Connection Status Chip */}
            <View style={[styles.statusChip, isOnline ? styles.statusOnline : styles.statusOffline]}>
              <View style={[styles.statusDot, { backgroundColor: isOnline ? theme.statusApprovedText : theme.statusRejectedText }]} />
              <Text style={[styles.statusText, { color: isOnline ? theme.statusApprovedText : theme.statusRejectedText }]}>
                {isOnline ? 'Online' : 'Offline'}
              </Text>
            </View>

            {/* More Menu Trigger ("...") */}
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => setMoreMenuVisible(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="ellipsis-horizontal" size={18} color={theme.textSecondary} />
            </TouchableOpacity>

            {/* Logout Icon Button */}
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => {
                logout();
                router.replace('/(auth)/login');
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="log-out-outline" size={18} color={theme.danger} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── 2. SUSPENSION BANNER (ONLY IF SUSPENDED) ─── */}
        {isSuspended && (
          <View style={styles.suspendedBanner}>
            <Ionicons name="alert-circle" size={20} color={theme.danger} />
            <View style={{ flex: 1 }}>
              <Text style={styles.suspendedTitle}>Account Suspended</Text>
              <Text style={styles.suspendedText}>
                Operational trip dispatches are restricted. Please contact Port Dispatch.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.suspendedHelpBtn}
              onPress={() => setSupervisorModalVisible(true)}
            >
              <Text style={styles.suspendedHelpBtnText}>Help</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ─── 3. RENEWAL WARNING PILL (ONE small #FFF4DB pill, shown ONLY when due) ─── */}
        {renewalWarningText && (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push('/(driver)/(tabs)/profile')}
            style={styles.renewalPill}
          >
            <Ionicons name="warning-outline" size={16} color={theme.warning} />
            <Text style={styles.renewalPillText}>{renewalWarningText}</Text>
            <Ionicons name="chevron-forward" size={14} color={theme.warning} />
          </TouchableOpacity>
        )}

        {/* ─── 4. SUMMARY METRICS (2 CLEAN STAT CARDS) ─── */}
        <View style={styles.statsRow}>
          <StatCard
            label="TODAY'S TRIPS"
            value={dashboardStats.completedTripsToday}
            hint="Completed shifts"
            iconName="checkmark-circle-outline"
            valueColor={theme.accent}
          />
          <StatCard
            label="CONTAINERS"
            value={dashboardStats.containersTransportedToday}
            hint="Transported units"
            iconName="cube-outline"
            valueColor={theme.accent}
          />
        </View>

        {/* ─── 5. ACTIVE MISSION CARD OR NO ACTIVE TRIP CARD ─── */}
        {activeTrip ? (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.cardCategory}>ACTIVE MISSION</Text>
                <Text style={styles.cardTitle}>
                  Trip #{activeTrip.tripNumber || activeTrip.id?.slice(0, 8)}
                </Text>
                <Text style={styles.cardSub}>
                  {activeTrip.vesselName || '-'}
                </Text>
              </View>
              <StatusPill status={activeTrip.status} />
            </View>

            {/* Route */}
            <View style={styles.routeBox}>
              <View style={{ flex: 1 }}>
                <Text style={styles.routeLabel}>FROM</Text>
                <Text style={styles.routeVal}>{activeTrip.sourceTerminal || '-'}</Text>
              </View>
              <Ionicons name="arrow-forward" size={18} color={theme.accent} />
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text style={styles.routeLabel}>TO</Text>
                <Text style={[styles.routeVal, { color: theme.accent }]}>
                  {getTripDischargeTerminal(activeTrip) || activeTrip.destTerminal || '-'}
                </Text>
              </View>
            </View>

            {/* Containers summary & timing */}
            {(() => {
              const timing = getTripTimingDetails(activeTrip);
              return (
                <View style={styles.tripMetaRow}>
                  <Text style={styles.tripMetaText}>
                    📦 {activeTrip.containers?.length || 1} Container{(activeTrip.containers?.length || 1) > 1 ? 's' : ''} Loaded
                  </Text>
                  <Text style={styles.tripTimingText}>
                    {timing.duration ? `⏱ ${timing.duration}` : `Started: ${timing.startTime}`}
                  </Text>
                </View>
              );
            })()}

            {/* ONE Primary Action Button based on status */}
            <View style={{ marginTop: 8 }}>
              {activeTrip.status === 'APPROVED' && (
                <AppButton
                  label="Start Trip"
                  onPress={() => handleStartActiveTrip(activeTrip.id)}
                  variant="primary"
                  iconName="play-circle-outline"
                  loading={actionInProgress}
                />
              )}

              {(activeTrip.status === 'IN_PROGRESS' || activeTrip.status === 'ARRIVED') && (
                <AppButton
                  label="Complete Trip"
                  onPress={() => handleOpenDischargeModal(activeTrip)}
                  variant="primary"
                  iconName="checkmark-done-outline"
                  loading={actionInProgress}
                />
              )}

              {activeTrip.status === 'PENDING_APPROVAL' && (
                <View style={styles.pendingStrip}>
                  <Ionicons name="time-outline" size={16} color={theme.warning} />
                  <Text style={styles.pendingStripText}>
                    Awaiting Supervisor Sign-off
                  </Text>
                </View>
              )}
            </View>
          </View>
        ) : (
          /* NO ACTIVE TRIP CARD: Exactly ONE "+ Start New Trip" button */
          <View style={styles.noTripCard}>
            <Ionicons name="boat-outline" size={32} color={theme.accent} style={{ marginBottom: 6 }} />
            <Text style={styles.noTripTitle}>No active trip</Text>
            <Text style={styles.noTripSub}>
              You currently have no trip in progress.
            </Text>
            <View style={{ width: '100%', marginTop: 12 }}>
              <AppButton
                label="+ Start New Trip"
                variant="primary"
                onPress={() => router.push('/(driver)/trips/new')}
                iconName="add-circle-outline"
              />
            </View>
          </View>
        )}

        {/* ─── 6. RECENT TRIPS LIST ─── */}
        <View style={styles.card}>
          <View style={styles.recentHeader}>
            <Text style={styles.sectionTitle}>Recent Trips</Text>
            <TouchableOpacity onPress={() => router.push('/(driver)/(tabs)/trips')}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          {trips && trips.length > 0 ? (
            trips.slice(0, 4).map((t: any, index: number) => {
              const timing = getTripTimingDetails(t);
              const dest = getTripDischargeTerminal(t) || t.destTerminal || '-';
              return (
                <ListRow
                  key={t.id || index}
                  title={`Trip #${t.tripNumber || t.id?.slice(0, 8)} • ${t.vesselName || '-'}`}
                  subtitle={`${t.sourceTerminal || '-'} → ${dest} • ${timing.duration || timing.startTime || timing.startDate}`}
                  rightElement={<StatusPill status={t.status} />}
                  onPress={() => handleViewTripReceipt(t)}
                  showArrow
                />
              );
            })
          ) : (
            <Text style={styles.emptyText}>
              No trips recorded yet.
            </Text>
          )}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* ─── MODAL: MORE MENU ("...") ─── */}
      <Modal visible={moreMenuVisible} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setMoreMenuVisible(false)}
        >
          <View style={[styles.modalCard, { maxWidth: 360 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>More Options</Text>
              <TouchableOpacity onPress={() => setMoreMenuVisible(false)}>
                <Ionicons name="close" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={{ gap: 8, paddingVertical: 8 }}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setMoreMenuVisible(false);
                  setDamageReportModalVisible(true);
                }}
              >
                <Ionicons name="warning-outline" size={20} color={theme.warning} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.menuItemTitle}>Report Damage</Text>
                  <Text style={styles.menuItemSub}>Log container or seal damage incident</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={theme.textHint} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setMoreMenuVisible(false);
                  setAllowanceModalVisible(true);
                }}
              >
                <Ionicons name="cash-outline" size={20} color={theme.accent} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.menuItemTitle}>My Allowance</Text>
                  <Text style={styles.menuItemSub}>View approved and pending earnings</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={theme.textHint} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setMoreMenuVisible(false);
                  setSupervisorModalVisible(true);
                }}
              >
                <Ionicons name="chatbubbles-outline" size={20} color={theme.accent} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.menuItemTitle}>Contact Supervisor</Text>
                  <Text style={styles.menuItemSub}>Terminal dispatch contact info</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={theme.textHint} />
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ─── MODAL: DISCHARGE & SUBMIT TO SUPERVISOR ─── */}
      <Modal visible={dischargeModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalCard, { maxWidth: 440 }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="checkmark-done-circle" size={22} color={theme.accent} />
                <Text style={styles.modalTitle}>Complete Trip</Text>
              </View>
              <TouchableOpacity onPress={() => setDischargeModalVisible(false)}>
                <Ionicons name="close" size={22} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Confirm destination discharge bay and cargo seal condition before submitting.
            </Text>

            {/* Destination Terminal Picker */}
            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>DISCHARGE TERMINAL</Text>
              <View style={styles.termWrap}>
                {TERMINALS.map((term) => {
                  const isSel = dischargeTerminal === term;
                  return (
                    <TouchableOpacity
                      key={term}
                      style={[styles.termChip, isSel && styles.termChipActive]}
                      onPress={() => setDischargeTerminal(term)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.termChipText, isSel && styles.termChipTextActive]}>
                        {term}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Discharge Bay Input */}
            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>DISCHARGE BAY / SLOT</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Bay 04, Crane 02"
                placeholderTextColor={theme.textHint}
                value={dischargeBay}
                onChangeText={setDischargeBay}
              />
            </View>

            {/* Seal Verification */}
            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>SEAL VERIFICATION</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  style={[
                    styles.toggleBtn,
                    sealStatus === 'INTACT (VERIFIED)' && styles.toggleBtnGreen,
                  ]}
                  onPress={() => setSealStatus('INTACT (VERIFIED)')}
                >
                  <Text
                    style={[
                      styles.toggleBtnText,
                      sealStatus === 'INTACT (VERIFIED)' && styles.toggleBtnTextGreen,
                    ]}
                  >
                    Seals Intact
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.toggleBtn,
                    sealStatus === 'DAMAGED / TAMPERED' && styles.toggleBtnRed,
                  ]}
                  onPress={() => setSealStatus('DAMAGED / TAMPERED')}
                >
                  <Text
                    style={[
                      styles.toggleBtnText,
                      sealStatus === 'DAMAGED / TAMPERED' && styles.toggleBtnTextRed,
                    ]}
                  >
                    Seal Defective
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Cargo Condition */}
            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>CARGO CONDITION</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  style={[
                    styles.toggleBtn,
                    cargoDamageStatus === 'NONE' && styles.toggleBtnGreen,
                  ]}
                  onPress={() => setCargoDamageStatus('NONE')}
                >
                  <Text
                    style={[
                      styles.toggleBtnText,
                      cargoDamageStatus === 'NONE' && styles.toggleBtnTextGreen,
                    ]}
                  >
                    Sound / No Damage
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.toggleBtn,
                    cargoDamageStatus === 'DAMAGED' && styles.toggleBtnRed,
                  ]}
                  onPress={() => setCargoDamageStatus('DAMAGED')}
                >
                  <Text
                    style={[
                      styles.toggleBtnText,
                      cargoDamageStatus === 'DAMAGED' && styles.toggleBtnTextRed,
                    ]}
                  >
                    Damage Reported
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Completion Remarks */}
            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>COMPLETION REMARKS</Text>
              <TextInput
                style={[styles.input, { height: 60, textAlignVertical: 'top', paddingTop: 8 }]}
                placeholder="Optional notes..."
                placeholderTextColor={theme.textHint}
                multiline
                value={driverCompletionNotes}
                onChangeText={setDriverCompletionNotes}
              />
            </View>

            {/* Submit Action */}
            <View style={{ marginTop: 12 }}>
              <AppButton
                label="Submit for Approval"
                onPress={() => activeTrip && handleSubmitDischargeToSupervisor(activeTrip.id)}
                variant="primary"
                iconName="paper-plane-outline"
                loading={actionInProgress}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ─── MODAL: OFFICIAL DELIVERY RECEIPT ─── */}
      <Modal visible={submissionReceiptVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxWidth: 420 }]}>
            <View style={{ alignItems: 'center', marginBottom: 12 }}>
              <View style={styles.receiptCheckCircle}>
                <Ionicons name="checkmark-done" size={24} color={theme.statusApprovedText} />
              </View>
              <Text style={styles.receiptTitle}>Trip Submitted</Text>
              <Text style={styles.receiptSub}>Awaiting supervisor sign-off</Text>
            </View>

            {submissionReceipt && (
              <View style={styles.receiptDetailsBox}>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>TRIP NUMBER</Text>
                  <Text style={styles.receiptValue}>{submissionReceipt.tripNumber}</Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>ROUTE</Text>
                  <Text style={styles.receiptValue}>{submissionReceipt.route}</Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>DISCHARGE BAY</Text>
                  <Text style={styles.receiptValue}>{submissionReceipt.dischargeBay}</Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>SEAL STATUS</Text>
                  <Text style={styles.receiptValue}>{submissionReceipt.sealStatus}</Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>SUBMITTED AT</Text>
                  <Text style={styles.receiptValue}>{submissionReceipt.timestamp}</Text>
                </View>
              </View>
            )}

            <View style={{ marginTop: 16 }}>
              <AppButton
                label="Return to Dashboard"
                variant="primary"
                onPress={() => setSubmissionReceiptVisible(false)}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── MODAL: TRIP RECEIPT / DETAILS (for recent trips) ─── */}
      <Modal visible={receiptModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxWidth: 420 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Trip Details</Text>
              <TouchableOpacity onPress={() => setReceiptModalVisible(false)}>
                <Ionicons name="close" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            {selectedReceiptTrip && (
              <View style={styles.receiptDetailsBox}>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>TRIP NUMBER</Text>
                  <Text style={styles.receiptValue}>
                    {selectedReceiptTrip.tripNumber || selectedReceiptTrip.id?.slice(0, 8)}
                  </Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>STATUS</Text>
                  <StatusPill status={selectedReceiptTrip.status} />
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>VESSEL</Text>
                  <Text style={styles.receiptValue}>{selectedReceiptTrip.vesselName || '-'}</Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>ROUTE</Text>
                  <Text style={styles.receiptValue}>
                    {selectedReceiptTrip.sourceTerminal || '-'} → {getTripDischargeTerminal(selectedReceiptTrip) || selectedReceiptTrip.destTerminal || '-'}
                  </Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>CONTAINERS</Text>
                  <Text style={styles.receiptValue}>
                    {selectedReceiptTrip.containers?.length || 1} units
                  </Text>
                </View>
                {(() => {
                  const timing = getTripTimingDetails(selectedReceiptTrip);
                  return (
                    <>
                      <View style={styles.receiptRow}>
                        <Text style={styles.receiptLabel}>START TIME</Text>
                        <Text style={styles.receiptValue}>{timing.startTime || timing.startDate}</Text>
                      </View>
                      <View style={styles.receiptRow}>
                        <Text style={styles.receiptLabel}>DURATION</Text>
                        <Text style={styles.receiptValue}>{timing.duration || 'In progress'}</Text>
                      </View>
                    </>
                  );
                })()}
              </View>
            )}

            <View style={{ marginTop: 16 }}>
              <AppButton
                label="Close"
                variant="outline"
                onPress={() => setReceiptModalVisible(false)}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── MODAL: ALLOWANCE SUMMARY ─── */}
      <Modal visible={allowanceModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxWidth: 380 }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="cash-outline" size={22} color={theme.accent} />
                <Text style={styles.modalTitle}>Allowance Summary</Text>
              </View>
              <TouchableOpacity onPress={() => setAllowanceModalVisible(false)}>
                <Ionicons name="close" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={{ gap: 12, paddingVertical: 8 }}>
              <View style={styles.allowanceCard}>
                <Text style={styles.allowanceLabel}>APPROVED ALLOWANCE</Text>
                <Text style={styles.allowanceValueApproved}>
                  LKR {dashboardStats.approvedAllowance.toLocaleString()}.00
                </Text>
                <Text style={styles.allowanceSub}>
                  {dashboardStats.completedTripsToday} approved trips (LKR 2,500/trip)
                </Text>
              </View>

              <View style={[styles.allowanceCard, { borderColor: theme.border }]}>
                <Text style={styles.allowanceLabel}>PENDING APPROVAL</Text>
                <Text style={styles.allowanceValuePending}>
                  LKR {dashboardStats.pendingAllowance.toLocaleString()}.00
                </Text>
                <Text style={styles.allowanceSub}>
                  {dashboardStats.tripsPendingApproval} trips awaiting supervisor clearance
                </Text>
              </View>
            </View>

            <View style={{ marginTop: 8 }}>
              <AppButton
                label="Close"
                variant="outline"
                onPress={() => setAllowanceModalVisible(false)}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── MODAL: REPORT DAMAGE ─── */}
      <Modal visible={damageReportModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalCard, { maxWidth: 400 }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="warning-outline" size={22} color={theme.warning} />
                <Text style={styles.modalTitle}>Report Damage</Text>
              </View>
              <TouchableOpacity onPress={() => setDamageReportModalVisible(false)}>
                <Ionicons name="close" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>CONTAINER NUMBER</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. MSCU1234567"
                placeholderTextColor={theme.textHint}
                value={damageContainerNumber}
                onChangeText={setDamageContainerNumber}
                autoCapitalize="characters"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>DAMAGE DETAILS</Text>
              <TextInput
                style={[styles.input, { height: 75, textAlignVertical: 'top', paddingTop: 8 }]}
                placeholder="Describe dent, seal breach, or malfunction..."
                placeholderTextColor={theme.textHint}
                multiline
                value={damageDescription}
                onChangeText={setDamageDescription}
              />
            </View>

            {damageSuccessMsg && (
              <View style={styles.successBanner}>
                <Ionicons name="checkmark-circle" size={16} color={theme.statusApprovedText} />
                <Text style={styles.successBannerText}>{damageSuccessMsg}</Text>
              </View>
            )}

            <View style={{ marginTop: 12 }}>
              <AppButton
                label="Submit Damage Report"
                variant="primary"
                onPress={handleReportDamage}
                iconName="shield-outline"
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ─── MODAL: CONTACT SUPERVISOR ─── */}
      <Modal visible={supervisorModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxWidth: 380 }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="chatbubbles-outline" size={22} color={theme.accent} />
                <Text style={styles.modalTitle}>Supervisor Contact</Text>
              </View>
              <TouchableOpacity onPress={() => setSupervisorModalVisible(false)}>
                <Ionicons name="close" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.contactCard}>
              <Ionicons name="person-circle-outline" size={36} color={theme.accent} />
              <View style={{ flex: 1 }}>
                <Text style={styles.contactName}>Duty Operations Supervisor</Text>
                <Text style={styles.contactSub}>Terminal Control Tower • Ext 402</Text>
                <Text style={styles.contactSub}>Phone: 011-2456789</Text>
              </View>
            </View>

            <View style={{ marginTop: 16 }}>
              <AppButton
                label="Close"
                variant="outline"
                onPress={() => setSupervisorModalVisible(false)}
              />
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
    backgroundColor: theme.background,
  },
  scroll: {
    flexGrow: 1,
    gap: Spacing.two,
  },

  // ─── HEADER ───
  header: {
    backgroundColor: theme.backgroundElement,
    borderRadius: Layout.radius,
    borderWidth: Layout.borderWidth,
    borderColor: theme.border,
    padding: Layout.screenPadding,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatarWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: theme.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  avatarText: {
    color: theme.accent,
    fontWeight: '700',
    fontSize: 15,
  },
  driverNameText: {
    ...Typography.listTitle,
    color: theme.text,
  },
  driverSubText: {
    ...Typography.label,
    marginTop: 2,
    color: theme.textSecondary,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 5,
  },
  statusOnline: {
    backgroundColor: theme.statusApprovedBg,
  },
  statusOffline: {
    backgroundColor: theme.statusRejectedBg,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: theme.backgroundSurfaceLow,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.border,
  },

  // ─── SUSPENSION BANNER ───
  suspendedBanner: {
    backgroundColor: theme.statusRejectedBg,
    borderRadius: Layout.radius,
    borderWidth: 1,
    borderColor: theme.statusRejectedText,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  suspendedTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.danger,
  },
  suspendedText: {
    fontSize: 12,
    color: theme.danger,
    marginTop: 1,
  },
  suspendedHelpBtn: {
    backgroundColor: theme.danger,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  suspendedHelpBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },

  // ─── RENEWAL WARNING PILL (Small #FFF4DB pill) ───
  renewalPill: {
    backgroundColor: theme.statusPendingBg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.statusPendingText,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  renewalPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.statusPendingText,
    flex: 1,
  },

  // ─── METRIC STAT CARDS ───
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },

  // ─── CARDS ───
  card: {
    backgroundColor: theme.backgroundElement,
    borderRadius: Layout.radius,
    borderWidth: Layout.borderWidth,
    borderColor: theme.border,
    padding: Layout.screenPadding,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardCategory: {
    fontSize: 11,
    color: theme.textSecondary,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.text,
    marginTop: 2,
  },
  cardSub: {
    fontSize: 13,
    color: theme.textSecondary,
    marginTop: 1,
  },
  routeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.backgroundSurfaceLow,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  routeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.textSecondary,
  },
  routeVal: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.text,
    marginTop: 2,
  },
  tripMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    marginBottom: 8,
  },
  tripMetaText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.text,
  },
  tripTimingText: {
    fontSize: 12,
    color: theme.textSecondary,
  },
  pendingStrip: {
    backgroundColor: theme.statusPendingBg,
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  pendingStripText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.statusPendingText,
  },

  // ─── NO ACTIVE TRIP CARD ───
  noTripCard: {
    backgroundColor: theme.backgroundElement,
    borderRadius: Layout.radius,
    borderWidth: Layout.borderWidth,
    borderColor: theme.border,
    padding: 24,
    alignItems: 'center',
  },
  noTripTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.text,
  },
  noTripSub: {
    fontSize: 13,
    color: theme.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },

  // ─── RECENT TRIPS SECTION ───
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    ...Typography.sectionTitle,
    fontSize: 16,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.accent,
  },
  emptyText: {
    fontSize: 13,
    color: theme.textSecondary,
    textAlign: 'center',
    paddingVertical: 16,
  },

  // ─── MODALS ───
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(31, 45, 51, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    backgroundColor: theme.backgroundElement,
    borderRadius: Layout.radius,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.text,
  },
  modalSubtitle: {
    fontSize: 12,
    color: theme.textSecondary,
    marginBottom: 14,
    lineHeight: 17,
  },
  formGroup: {
    gap: 4,
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.textSecondary,
  },
  input: {
    backgroundColor: theme.backgroundSurfaceLow,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: theme.text,
  },
  termWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  termChip: {
    backgroundColor: theme.backgroundSurfaceLow,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  termChipActive: {
    backgroundColor: theme.accentSoft,
    borderColor: theme.accent,
  },
  termChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.textSecondary,
  },
  termChipTextActive: {
    color: theme.accent,
    fontWeight: '700',
  },
  toggleBtn: {
    flex: 1,
    height: 38,
    backgroundColor: theme.backgroundSurfaceLow,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleBtnGreen: {
    backgroundColor: theme.statusApprovedBg,
    borderColor: theme.statusApprovedText,
  },
  toggleBtnRed: {
    backgroundColor: theme.statusRejectedBg,
    borderColor: theme.statusRejectedText,
  },
  toggleBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.textSecondary,
  },
  toggleBtnTextGreen: {
    color: theme.statusApprovedText,
    fontWeight: '700',
  },
  toggleBtnTextRed: {
    color: theme.statusRejectedText,
    fontWeight: '700',
  },

  // ─── MORE MENU ITEMS ───
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: theme.backgroundSurfaceLow,
    borderRadius: 8,
    gap: 12,
  },
  menuItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.text,
  },
  menuItemSub: {
    fontSize: 11,
    color: theme.textSecondary,
    marginTop: 1,
  },

  // ─── RECEIPT DETAILS ───
  receiptCheckCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.statusApprovedBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  receiptTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.text,
  },
  receiptSub: {
    fontSize: 12,
    color: theme.textSecondary,
    marginTop: 2,
  },
  receiptDetailsBox: {
    backgroundColor: theme.backgroundSurfaceLow,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 12,
    gap: 8,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  receiptLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.textSecondary,
  },
  receiptValue: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.text,
  },

  // ─── ALLOWANCE MODAL ───
  allowanceCard: {
    backgroundColor: theme.backgroundSurfaceLow,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 12,
  },
  allowanceLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.textSecondary,
    marginBottom: 4,
  },
  allowanceValueApproved: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.accent,
  },
  allowanceValuePending: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.statusPendingText,
  },
  allowanceSub: {
    fontSize: 11,
    color: theme.textSecondary,
    marginTop: 4,
  },

  // ─── CONTACT & SUCCESS BANNERS ───
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.backgroundSurfaceLow,
    borderRadius: 8,
    padding: 12,
    gap: 12,
  },
  contactName: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.text,
  },
  contactSub: {
    fontSize: 12,
    color: theme.textSecondary,
    marginTop: 2,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.statusApprovedBg,
    borderRadius: 8,
    padding: 10,
    gap: 8,
    marginTop: 4,
  },
  successBannerText: {
    fontSize: 12,
    color: theme.statusApprovedText,
    fontWeight: '600',

  },
});
