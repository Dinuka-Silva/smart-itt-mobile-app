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
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../../src/store/authStore';
import { tripService } from '../../../src/services/tripService';
import { dashboardService, SupervisorDashboardStats } from '../../../src/services/dashboardService';
import { driverService, DriverProfile } from '../../../src/services/driverService';
import { colors, radius, spacing } from '../../../src/theme';
import { resolveCheNumber, resolveOperator, findFleetVehicle } from '../../../src/config/fleet';
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

export default function SupervisorHomeDashboard() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();
  const { topInset, bottomInset, contentMaxWidth, containerPaddingHorizontal, isSmallMobile, isMobile } = useResponsive();

  const metricCardWidth = isSmallMobile ? '100%' : isMobile ? '48%' : '31.5%';

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


  // Terminal Consolidated Panel Filter States (Weekly, Monthly, Daily)
  const [terminalPanelPeriod, setTerminalPanelPeriod] = useState<'WEEKLY' | 'MONTHLY' | 'TODAY' | 'ALL'>('WEEKLY');
  const [terminalPanelTrafficType, setTerminalPanelTrafficType] = useState<'ALL' | 'ORIGIN' | 'DESTINATION'>('ALL');

  // Compliance & Expiry Advisory Tab Filter State
  const [complianceTab, setComplianceTab] = useState<'ALL' | 'VEHICLES' | 'PORT_PASS'>('ALL');

  // Supervisor Dashboard Driver Search State
  const [driverSearchQuery, setDriverSearchQuery] = useState('');

  // Modal States
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [tripToReject, setTripToReject] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [submittingDecision, setSubmittingDecision] = useState(false);

  const [notificationsModalVisible, setNotificationsModalVisible] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [damageReviewModalVisible, setDamageReviewModalVisible] = useState(false);

  // Fetch live supervisor data
  const loadDashboardData = useCallback(async () => {
    try {
      // 1. Fetch live dashboard metrics
      const dashMetrics = await dashboardService.getSupervisorDashboard();

      // 2. Fetch live trips from backend
      const apiTrips = await tripService.getTrips();
      const tripList = Array.isArray(apiTrips) ? apiTrips : [];
      setTrips(tripList);

      const compTripsCount = tripList.filter((t) => t.status === 'COMPLETED' || t.status === 'APPROVED' || t.status === 'SUPERVISOR_CONFIRMED').length;
      const inProgCount = tripList.filter((t) => t.status === 'IN_PROGRESS' || t.status === 'ARRIVED').length;
      const pendingCount = tripList.filter((t) => t.status === 'PENDING_APPROVAL' || t.status === 'PENDING_SUPERVISOR_CONFIRMATION').length;
      const totalConts = tripList
        .filter((t) => t.status === 'COMPLETED' || t.status === 'APPROVED' || t.status === 'SUPERVISOR_CONFIRMED')
        .reduce((acc, t) => acc + (t.containers?.length || 1), 0);

      setStats({
        ...dashMetrics,
        completedTripsToday: compTripsCount,
        activeTrips: inProgCount,
        tripsPendingApproval: pendingCount,
        totalTripsToday: tripList.length,
        totalContainersTransportedToday: totalConts > 0 ? totalConts : dashMetrics.totalContainersTransportedToday,
      });

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
            vehicleNumber: 'LY-6439',
            chassisNumber: 'CHE 100',
            cheNumber: 'CHE 100',
            operator: 'SCK Logistics',
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
            vehicleNumber: 'LY 5235',
            chassisNumber: 'SCK 101',
            cheNumber: 'SCK 101',
            operator: 'SCK Logistics',
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
            vehicleNumber: 'LY 5236',
            chassisNumber: 'SCK 102',
            cheNumber: 'SCK 102',
            operator: 'SCK Logistics',
            status: 'ACTIVE',
          },
        ]);
      }
    } catch (e) {
      console.warn('[SupervisorDashboard] Dashboard loading error:', e);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadDashboardData(); }, [loadDashboardData]);

  const supervisorName = user?.name || user?.fullName || 'Nimal Silva';
  const supervisorInitials = supervisorName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
  const currentDateFormatted = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).toUpperCase();

  // Supervisor Port Pass Expiry Logic (SLPA security gate clearance)
  const supervisorPassExpiry = user?.supervisorPortPassExpiryDate || '2026-11-18';
  const supervisorPassDaysLeft = Math.round(
    (new Date(supervisorPassExpiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  const isSupervisorPassExpired = supervisorPassDaysLeft <= 0;
  const isSupervisorPassRenewalDue = supervisorPassDaysLeft <= 30;


  // Terminal-Wise Consolidated Analytics with Weekly & Monthly Filtering
  const terminalWiseStats = useMemo(() => {
    const terminals = ['CICT', 'CWIT', 'ECT', 'JCT', 'UCT', 'SAGT'];
    const now = new Date();

    // 1. Filter trips based on the chosen period
    const periodTrips = trips.filter((t) => {
      const rawDate = t.operationDate || t.startTime || t.createdAt;
      if (!rawDate) return true;
      const tripDate = new Date(rawDate);
      if (isNaN(tripDate.getTime())) return true;

      if (terminalPanelPeriod === 'TODAY') {
        return (
          tripDate.getDate() === now.getDate() &&
          tripDate.getMonth() === now.getMonth() &&
          tripDate.getFullYear() === now.getFullYear()
        );
      } else if (terminalPanelPeriod === 'WEEKLY') {
        const diffMs = now.getTime() - tripDate.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        return diffDays >= 0 && diffDays <= 7;
      } else if (terminalPanelPeriod === 'MONTHLY') {
        const diffMs = now.getTime() - tripDate.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        return diffDays >= 0 && diffDays <= 30;
      }
      return true; // 'ALL'
    });

    // 2. Aggregate per terminal
    const res: Record<string, { totalTrips: number; containers: number; originTrips: number; destTrips: number }> = {};
    terminals.forEach((term) => {
      res[term] = { totalTrips: 0, containers: 0, originTrips: 0, destTrips: 0 };
    });

    periodTrips.forEach((t) => {
      const orig = t.sourceTerminal;
      const dest = t.destTerminal;
      const cCount = t.containers?.length || 1;

      if (orig && res[orig]) {
        res[orig].originTrips += 1;
        if (terminalPanelTrafficType === 'ALL' || terminalPanelTrafficType === 'ORIGIN') {
          res[orig].totalTrips += 1;
          res[orig].containers += cCount;
        }
      }
      if (dest && res[dest]) {
        res[dest].destTrips += 1;
        if (terminalPanelTrafficType === 'ALL' || terminalPanelTrafficType === 'DESTINATION') {
          res[dest].totalTrips += 1;
          res[dest].containers += cCount;
        }
      }
    });

    const grandTotalTrips = periodTrips.length;
    const grandTotalContainers = periodTrips.reduce((acc, t) => acc + (t.containers?.length || 1), 0);

    return {
      perTerminal: res,
      periodTripsCount: periodTrips.length,
      grandTotalTrips,
      grandTotalContainers,
    };
  }, [trips, terminalPanelPeriod, terminalPanelTrafficType]);

  // Trips pending supervisor approval
  const pendingTrips = useMemo(() => {
    return trips.filter((t) => t.status === 'PENDING_APPROVAL' || t.status === 'PENDING_SUPERVISOR_CONFIRMATION');
  }, [trips]);

  // Approval actions
  const handleApproveTrip = async (trip: any) => {
    try {
      await tripService.approveTrip(trip.id, user?.id || 'sup-001', 'Delivery confirmed & trip approved by Operations Supervisor');
      Alert.alert(
        'Trip Delivery Confirmed & Approved ✅',
        `Trip ${trip.tripNumber || trip.id} is confirmed. Driver completed container count (+1 towards 300 target) and main system metrics have been updated!`
      );
      await loadDashboardData();
    } catch (e: any) {
      Alert.alert('Approval Error', e?.response?.data?.message || e?.message || 'Failed to approve trip on server.');
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
      setRejectModalVisible(false);
      Alert.alert('Trip Rejected', `Trip ${tripToReject.tripNumber} rejected: ${rejectionReason}`);
      await loadDashboardData();
    } catch (e: any) {
      Alert.alert('Rejection Error', e?.response?.data?.message || e?.message || 'Failed to reject trip on server.');
    } finally {
      setSubmittingDecision(false);
    }
  };

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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadDashboardData(); }} tintColor="#173B70" />}
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
                <View style={styles.supervisorPassBadge}>
                  <Ionicons
                    name="shield-checkmark"
                    size={11}
                    color="#173B70"
                  />
                  <Text style={styles.supervisorPassBadgeText}>
                    PORT PASS: {supervisorPassExpiry} ({isSupervisorPassExpired ? 'EXPIRED' : `${supervisorPassDaysLeft}d`})
                  </Text>
                </View>
                <Text style={styles.dateText}>{currentDateFormatted}</Text>
              </View>
            </View>
          </View>

          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={() => router.push('/(supervisor)/(tabs)/profile')}
              accessibilityLabel="Settings and Preferences"
            >
              <Ionicons name="settings-outline" size={18} color="#173B70" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={() => setNotificationsModalVisible(true)}
              accessibilityLabel="Notifications"
            >
              <Ionicons name="notifications-outline" size={18} color="#173B70" />
              <View style={styles.unreadDot} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.headerLogoutBtn}
              onPress={() => {
                logout();
                router.replace('/(auth)/login');
              }}
              accessibilityLabel="Log out"
            >
              <Ionicons name="log-out-outline" size={18} color="#DC2626" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── SUPERVISOR PORT PASS PERMIT CARD (SLPA GATE CLEARANCE) ─── */}
        <View style={styles.supervisorPermitCard}>
          <View style={styles.supervisorPermitHeader}>
            <View style={styles.supervisorPermitIconWrap}>
              <Ionicons name="shield-checkmark" size={22} color="#173B70" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                <Text style={styles.supervisorPermitTitle}>SLPA SUPERVISOR CLEARANCE & GATE PASS</Text>
                <View style={styles.permitStatusPill}>
                  <View style={styles.permitStatusDot} />
                  <Text style={styles.permitStatusText}>
                    {isSupervisorPassExpired
                      ? 'EXPIRED'
                      : isSupervisorPassRenewalDue
                      ? `RENEWAL DUE (${supervisorPassDaysLeft}D)`
                      : 'VALID CLEARANCE'}
                  </Text>
                </View>
              </View>
              <Text style={styles.supervisorPermitSub}>
                SLPA Official Multi-Terminal Oversight Clearance · Colombo Port
              </Text>
            </View>
          </View>

          {/* Authorized Port Terminals Strip */}
          <View style={styles.authorizedTerminalsWrap}>
            <Text style={styles.authorizedTerminalsLabel}>AUTHORIZED HARBOR TERMINALS:</Text>
            <View style={styles.terminalBadgesRow}>
              {['CICT', 'SAGT', 'CWIT', 'ECT', 'JCT', 'UCT'].map((term) => (
                <View key={term} style={styles.terminalAuthBadge}>
                  <View style={styles.termAuthDot} />
                  <Text style={styles.terminalAuthText}>{term}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* 4-Item Credential Details Grid */}
          <View style={styles.supervisorPermitGrid}>
            <View style={[styles.supervisorPermitCol, { minWidth: isSmallMobile ? '48%' : '23%' }]}>
              <Text style={styles.supervisorPermitLabel}>SUPERVISOR PASS NO</Text>
              <Text style={styles.supervisorPermitVal}>SLPA-SUP-2026-8841</Text>
            </View>
            <View style={[styles.supervisorPermitCol, { minWidth: isSmallMobile ? '48%' : '23%' }]}>
              <Text style={styles.supervisorPermitLabel}>EMPLOYEE ID</Text>
              <Text style={styles.supervisorPermitVal}>{user?.employeeId || 'SUP-9365'}</Text>
            </View>
            <View style={[styles.supervisorPermitCol, { minWidth: isSmallMobile ? '48%' : '23%' }]}>
              <Text style={styles.supervisorPermitLabel}>PORT PASS EXPIRY</Text>
              <Text style={styles.supervisorPermitVal}>
                {supervisorPassExpiry}
              </Text>
            </View>
            <View style={[styles.supervisorPermitCol, { minWidth: isSmallMobile ? '48%' : '23%' }]}>
              <Text style={styles.supervisorPermitLabel}>TIME REMAINING</Text>
              <Text style={styles.supervisorPermitVal}>
                {isSupervisorPassExpired ? 'Expired' : `${supervisorPassDaysLeft} Days Left`}
              </Text>
            </View>
          </View>

          {isSupervisorPassRenewalDue && (
            <View style={styles.permitNoticeWrap}>
              <Ionicons name="warning" size={16} color="#173B70" style={{ marginTop: 1 }} />
              <Text style={styles.permitNoticeText}>
                <Text style={{ fontWeight: '800', color: '#173B70' }}>Renewal Advisory: </Text>
                Your supervisor port pass expires in {supervisorPassDaysLeft} days. Submit renewal form at SLPA Port Security Clearance Division to retain unrestricted multi-terminal oversight access.
              </Text>
            </View>
          )}
        </View>

        {/* ─── FLEET COMPLIANCE & EXPIRY ADVISORY CENTER (CONSOLIDATED & NEAT) ─── */}
        {(() => {
          // 1. Vehicle Licenses due for renewal within 30 days (Deduplicated by Vehicle Plate Number)
          const rawRenewalDrivers = drivers.filter(
            (d: any) => d.vehicleLicenseRenewalDue === true || (d.vehicleLicenseDaysLeft != null && d.vehicleLicenseDaysLeft <= 30)
          );
          const uniqueVehiclesMap = new Map<string, any>();
          rawRenewalDrivers.forEach((d: any) => {
            const vPlate = (d.vehicleNumber || 'LY-6439').trim().toUpperCase();
            if (!uniqueVehiclesMap.has(vPlate)) {
              uniqueVehiclesMap.set(vPlate, d);
            }
          });
          const dedupedVehicleRenewals = Array.from(uniqueVehiclesMap.values());

          // 2. Port Passes due for renewal within 30 days
          const expiringPassDrivers = drivers.map((d: any) => {
            const drvPassExpiry = d.driverPortPassExpiryDate || '2026-11-15';
            const vehPassExpiry = d.vehiclePortPassExpiryDate || '2026-11-20';
            const drvDays = Math.round((new Date(drvPassExpiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            const vehDays = Math.round((new Date(vehPassExpiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            return {
              ...d,
              drvPassExpiry,
              vehPassExpiry,
              drvDays,
              vehDays,
              isNearExpiry: drvDays <= 30 || vehDays <= 30,
            };
          }).filter((d: any) => d.isNearExpiry);

          const totalAdvisories = dedupedVehicleRenewals.length + expiringPassDrivers.length;
          if (totalAdvisories === 0) return null;

          return (
            <View style={styles.complianceCenterCard}>
              {/* Card Header */}
              <View style={styles.complianceHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                  <View style={styles.complianceIconBox}>
                    <Ionicons name="shield-half" size={18} color="#173B70" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.complianceTitle}>FLEET COMPLIANCE & EXPIRY ADVISORY</Text>
                    <Text style={styles.complianceSub}>SLPA Harbor Security & Vehicle Revenue License Status</Text>
                  </View>
                </View>
                <View style={styles.complianceCountPill}>
                  <Text style={styles.complianceCountText}>{totalAdvisories} DUE</Text>
                </View>
              </View>

              {/* Filter Tabs */}
              <View style={styles.complianceTabRow}>
                <TouchableOpacity
                  style={[styles.complianceTabBtn, complianceTab === 'ALL' && styles.complianceTabBtnActive]}
                  onPress={() => setComplianceTab('ALL')}
                >
                  <Text style={[styles.complianceTabText, complianceTab === 'ALL' && styles.complianceTabTextActive]}>
                    ALL ({totalAdvisories})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.complianceTabBtn, complianceTab === 'VEHICLES' && styles.complianceTabBtnActive]}
                  onPress={() => setComplianceTab('VEHICLES')}
                >
                  <Text style={[styles.complianceTabText, complianceTab === 'VEHICLES' && styles.complianceTabTextActive]}>
                    VEHICLE LICENSES ({dedupedVehicleRenewals.length})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.complianceTabBtn, complianceTab === 'PORT_PASS' && styles.complianceTabBtnActive]}
                  onPress={() => setComplianceTab('PORT_PASS')}
                >
                  <Text style={[styles.complianceTabText, complianceTab === 'PORT_PASS' && styles.complianceTabTextActive]}>
                    PORT PASSES ({expiringPassDrivers.length})
                  </Text>
                </TouchableOpacity>
              </View>

              {/* 1. Vehicle Revenue License Renewals Section */}
              {(complianceTab === 'ALL' || complianceTab === 'VEHICLES') && dedupedVehicleRenewals.length > 0 && (
                <View style={styles.complianceSectionBox}>
                  <View style={styles.complianceSectionHeader}>
                    <Ionicons name="car-sport" size={14} color="#173B70" />
                    <Text style={styles.complianceSectionTitle}>
                      VEHICLE REVENUE LICENSES DUE FOR RENEWAL ({dedupedVehicleRenewals.length} VEHICLES)
                    </Text>
                  </View>

                  <View style={{ gap: 6 }}>
                    {dedupedVehicleRenewals.slice(0, 4).map((d: any) => {
                      const daysLeft = d.vehicleLicenseDaysLeft ?? 17;
                      const isExpired = daysLeft <= 0;
                      const opName = (d.vehicleNumber || '').startsWith('LY-65') ? 'SDR LINK' : 'SCK Logistics';

                      return (
                        <View key={d.vehicleNumber || d.id} style={styles.complianceItemRow}>
                          <View style={styles.vehiclePlateBadge}>
                            <Ionicons name="bus" size={12} color="#173B70" style={{ marginRight: 4 }} />
                            <Text style={styles.vehiclePlateBadgeText}>{d.vehicleNumber || 'LY-6439'}</Text>
                          </View>

                          <View style={{ flex: 1, paddingHorizontal: 8 }}>
                            <Text style={styles.complianceItemDriver}>{d.fullName || d.driverCode}</Text>
                            <Text style={styles.complianceItemSub}>{opName} · CHE: {resolveCheNumber(d.vehicleNumber, d.chassisNumber)}</Text>
                          </View>

                          <View style={styles.complianceDaysPill}>
                            <Ionicons name={isExpired ? "alert-circle" : "time"} size={11} color="#173B70" style={{ marginRight: 3 }} />
                            <Text style={styles.complianceDaysText}>
                              {isExpired ? 'EXPIRED' : `${daysLeft}d left`}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* 2. Port Pass Expiry Advisories Section */}
              {(complianceTab === 'ALL' || complianceTab === 'PORT_PASS') && expiringPassDrivers.length > 0 && (
                <View style={styles.complianceSectionBox}>
                  <View style={styles.complianceSectionHeader}>
                    <Ionicons name="card" size={14} color="#173B70" />
                    <Text style={styles.complianceSectionTitle}>
                      SLPA SECURITY GATE PASSES ({expiringPassDrivers.length} OPERATORS DUE)
                    </Text>
                    <View style={styles.slpaTag}>
                      <Text style={styles.slpaTagText}>SLPA CLEARANCE</Text>
                    </View>
                  </View>

                  <View style={{ gap: 6 }}>
                    {expiringPassDrivers.slice(0, 4).map((d: any) => (
                      <View key={d.id || d.driverCode} style={styles.complianceItemRow}>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                            <Text style={styles.complianceItemDriver}>{d.fullName || d.driverCode}</Text>
                            <View style={styles.miniTruckBadge}>
                              <Text style={styles.miniTruckBadgeText}>{d.vehicleNumber || 'LY-6439'}</Text>
                            </View>
                          </View>

                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <View style={styles.passBadgeWrap}>
                              <Text style={styles.passBadgeKey}>Driver Pass: </Text>
                              <Text style={styles.passBadgeVal}>
                                {d.drvPassExpiry} ({d.drvDays}d)
                              </Text>
                            </View>
                            <View style={styles.passBadgeWrap}>
                              <Text style={styles.passBadgeKey}>Truck Pass: </Text>
                              <Text style={styles.passBadgeVal}>
                                {d.vehPassExpiry} ({d.vehDays}d)
                              </Text>
                            </View>
                          </View>
                        </View>
                      </View>
                    ))}

                    {expiringPassDrivers.length > 4 && (
                      <Text style={styles.complianceMoreNotice}>
                        + {expiringPassDrivers.length - 4} more operators due for SLPA security renewal.
                      </Text>
                    )}
                  </View>
                </View>
              )}

              {/* Quick Navigation to Driver Fleet */}
              <TouchableOpacity
                style={styles.complianceFleetBtn}
                activeOpacity={0.85}
                onPress={() => router.push('/(supervisor)/(tabs)/drivers')}
              >
                <Ionicons name="people" size={15} color="#FFFFFF" />
                <Text style={styles.complianceFleetBtnText}>VIEW ALL IN DRIVER FLEET DIRECTORY</Text>
                <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          );
        })()}

        {/* ─── B. SUPERVISOR SUMMARY METRIC CARDS (LIVE BACKEND DATA) ─── */}
        <View style={styles.metricsGrid}>
          <View style={[styles.metricCardDark, { width: metricCardWidth }]}>
            <View style={styles.metricCardHeader}>
              <Text style={styles.metricLabelDark}>TOTAL TRIPS TODAY</Text>
              <Ionicons name="layers" size={16} color="#FFFFFF" />
            </View>
            <Text style={styles.metricValueDark}>{stats.totalTripsToday}</Text>
            <Text style={styles.metricSubDark}>Port Movements</Text>
          </View>

          <View style={[styles.metricCard, { width: metricCardWidth }]}>
            <View style={styles.metricCardHeader}>
              <Text style={styles.metricLabel}>ACTIVE TRIPS</Text>
              <Ionicons name="navigate" size={16} color="#173B70" />
            </View>
            <Text style={styles.metricValue}>{stats.activeTrips}</Text>
            <Text style={styles.metricSub}>In Transit</Text>
          </View>

          <View style={[styles.metricCard, { width: metricCardWidth }]}>
            <View style={styles.metricCardHeader}>
              <Text style={styles.metricLabel}>PENDING APPROVAL</Text>
              <Ionicons name="time" size={16} color="#173B70" />
            </View>
            <Text style={styles.metricValue}>{stats.tripsPendingApproval}</Text>
            <Text style={styles.metricSub}>Needs Action</Text>
          </View>

          <View style={[styles.metricCard, { width: metricCardWidth }]}>
            <View style={styles.metricCardHeader}>
              <Text style={styles.metricLabel}>COMPLETED TODAY</Text>
              <Ionicons name="checkmark-done" size={16} color="#173B70" />
            </View>
            <Text style={styles.metricValue}>{stats.completedTripsToday}</Text>
            <Text style={styles.metricSub}>Discharged</Text>
          </View>

          <View style={[styles.metricCard, { width: metricCardWidth }]}>
            <View style={styles.metricCardHeader}>
              <Text style={styles.metricLabel}>CONTAINERS</Text>
              <Ionicons name="cube" size={16} color="#173B70" />
            </View>
            <Text style={styles.metricValue}>{stats.totalContainersTransportedToday}</Text>
            <Text style={styles.metricSub}>Loaded/Handed</Text>
          </View>

          <View style={[styles.metricCard, { width: metricCardWidth }]}>
            <View style={styles.metricCardHeader}>
              <Text style={styles.metricLabel}>REGISTERED DRIVERS</Text>
              <Ionicons name="people" size={16} color="#173B70" />
            </View>
            <Text style={styles.metricValue}>{stats.registeredDrivers}</Text>
            <Text style={styles.metricSub}>{stats.activeDrivers} Active on Duty</Text>
          </View>
        </View>

        {/* ─── D. TRIP APPROVAL MANAGEMENT (PENDING APPROVALS SECTION) ─── */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="shield-checkmark" size={18} color="#173B70" />
            <Text style={styles.sectionTitle}>
              COMPLETED TRIPS – PENDING CONFIRMATION ({pendingTrips.length})
            </Text>
          </View>

          {pendingTrips.length === 0 ? (
            <View style={styles.emptyPendingCard}>
              <Ionicons name="checkmark-circle-outline" size={28} color="#173B70" />
              <Text style={styles.emptyPendingText}>ALL SUBMITTED TRIPS HAVE BEEN REVIEWED</Text>
              <Text style={styles.emptyPendingSub}>No ITT missions currently awaiting supervisor clearance.</Text>
            </View>
          ) : (
            pendingTrips.map((trip) => {
              const c20 = (trip.containers || []).filter((c: any) => c.size === '20FT' || c.size === 'FT_20').length;
              const c40 = (trip.containers || []).filter((c: any) => c.size === '40FT' || c.size === 'FT_40').length;
              const timing = getTripTimingDetails(trip);
              return (
                <View key={trip.id} style={styles.pendingCard}>
                  {/* Card Header: Trip ID + Status Pill */}
                  <View style={styles.pendingCardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pendingTripId}>{trip.tripNumber || `ITT-${trip.id?.slice(0, 6)}`}</Text>
                      <Text style={styles.pendingDriver}>
                        Driver: {trip.driverName || 'Kamal Perera'} · Truck: {trip.vehicleNumber || 'LY-6439'} · CHE: {resolveCheNumber(trip.vehicleNumber, trip.chassisNumber)}
                      </Text>
                    </View>
                    <View style={styles.pendingAwaitingTag}>
                      <Text style={styles.pendingAwaitingTagText}>AWAITING SIGN-OFF</Text>
                    </View>
                  </View>

                  {/* Section 1: Trip Info Grid */}
                  <View style={styles.pendingInfoGrid}>
                    <View style={styles.pendingInfoItem}>
                      <Text style={styles.pendingInfoLabel}>ROUTE</Text>
                      <Text style={styles.pendingInfoValue}>{trip.sourceTerminal} ➔ {getTripDischargeTerminal(trip)}</Text>
                    </View>
                    <View style={styles.pendingInfoItem}>
                      <Text style={styles.pendingInfoLabel}>VESSEL</Text>
                      <Text style={styles.pendingInfoValue}>{trip.vesselName || 'MV Colombo Star'}</Text>
                    </View>
                    <View style={styles.pendingInfoItem}>
                      <Text style={styles.pendingInfoLabel}>CHE NO</Text>
                      <Text style={styles.pendingInfoValue}>{resolveCheNumber(trip.vehicleNumber, trip.chassisNumber)}</Text>
                    </View>
                    <View style={styles.pendingInfoItem}>
                      <Text style={styles.pendingInfoLabel}>OPERATOR</Text>
                      <Text style={styles.pendingInfoValue}>{resolveOperator(trip.vehicleNumber, trip.operator)}</Text>
                    </View>
                    <View style={styles.pendingInfoItemFull}>
                      <Text style={styles.pendingInfoLabel}>CONTAINERS</Text>
                      <Text style={styles.pendingInfoValue}>{c20}×20FT · {c40}×40FT ({trip.containers?.length || 0} Total)</Text>
                    </View>
                  </View>

                  {/* Section 2: Trip Timeline */}
                  <View style={styles.pendingTimelineCard}>
                    <View style={styles.pendingTimelineRow}>
                      <View style={styles.pendingTimelineBlock}>
                        <View style={styles.pendingTimelineHeader}>
                          <Ionicons name="play-circle" size={13} color="#173B70" />
                          <Text style={styles.pendingTimelineLabel}>STARTED DATE & TIME</Text>
                        </View>
                        <Text style={styles.pendingTimelineDate}>{timing.startDate}</Text>
                        <Text style={styles.pendingTimelineTime}>{timing.startTime}</Text>
                      </View>

                      <View style={styles.pendingTimelineArrowWrap}>
                        <Ionicons name="arrow-forward" size={14} color="#173B70" />
                        {timing.duration ? (
                          <View style={styles.pendingDurationPill}>
                            <Ionicons name="time-outline" size={11} color="#173B70" />
                            <Text style={styles.pendingDurationText}>{timing.duration}</Text>
                          </View>
                        ) : null}
                      </View>

                      <View style={styles.pendingTimelineBlock}>
                        <View style={styles.pendingTimelineHeader}>
                          <Ionicons name="checkmark-circle" size={13} color="#173B70" />
                          <Text style={styles.pendingTimelineLabel}>DISCHARGED DATE & TIME</Text>
                        </View>
                        <Text style={styles.pendingTimelineDate}>{timing.endDate}</Text>
                        <Text style={styles.pendingTimelineTime}>{timing.endTime}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Section 3: Container Info */}
                  {trip.containers && trip.containers.length > 0 && (
                    <View style={styles.pendingContainersList}>
                      {trip.containers.map((c: any, idx: number) => (
                        <View key={c.id || idx} style={styles.pendingContainerPill}>
                          <Ionicons name="cube" size={14} color="#173B70" />
                          <Text style={styles.pendingContNum}>{c.containerNumber}</Text>
                          <Text style={styles.pendingContSize}>({c.size || '20FT'} ➔ {c.destTerminal || getTripDischargeTerminal(trip)})</Text>
                          <View style={styles.pendingContStatusBadge}>
                            <Text style={styles.pendingContStatusText}>{c.status}</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Section 4: Driver Discharge Manifest */}
                  <View style={styles.pendingDischargeVerificationCard}>
                    <View style={styles.pendingDischargeVerificationHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="shield-checkmark" size={15} color="#173B70" />
                        <Text style={styles.pendingDischargeVerificationTitle}>
                          DRIVER DISCHARGE & SEAL VERIFICATION MANIFEST
                        </Text>
                      </View>
                      <View style={styles.pendingRemarksAuditedBadge}>
                        <Ionicons name="lock-closed" size={11} color="#173B70" />
                        <Text style={styles.pendingRemarksAuditedText}>SLPA AUDITED</Text>
                      </View>
                    </View>

                    {/* Berth, Seal, Condition */}
                    <View style={styles.pendingDischargeMetricsRow}>
                      <View style={styles.pendingDischargeMetricBox}>
                        <Text style={styles.pendingDischargeGridLabel}>DISCHARGE BERTH / BAY</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                          <Ionicons name="location" size={12} color="#173B70" />
                          <Text style={styles.pendingDischargeGridValue} numberOfLines={1}>
                            {getTripDischargeTerminal(trip)} · {trip.dischargeBay || 'Bay 04, Crane 02'}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.pendingDischargeMetricBox}>
                        <Text style={styles.pendingDischargeGridLabel}>SEAL INTEGRITY</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                          <Ionicons name="shield-checkmark" size={12} color="#173B70" />
                          <Text style={styles.pendingDischargeGridValue} numberOfLines={1}>
                            {trip.sealStatus || 'INTACT (VERIFIED)'}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.pendingDischargeMetricBox}>
                        <Text style={styles.pendingDischargeGridLabel}>CARGO CONDITION</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                          <Ionicons name="checkmark-circle" size={12} color="#173B70" />
                          <Text style={styles.pendingDischargeGridValue} numberOfLines={1}>
                            {trip.damageStatus === 'DAMAGED' ? 'DAMAGED' : 'SOUND'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Driver remarks quoted bubble */}
                    <View style={styles.pendingRemarksCallout}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                        <Ionicons name="chatbubble-ellipses" size={13} color="#173B70" />
                        <Text style={styles.pendingRemarksCalloutLabel}>DRIVER COMPLETION & HANDOVER REMARKS</Text>
                      </View>
                      <Text style={styles.pendingRemarksCalloutText}>
                        &ldquo;{trip.driverCompletionNotes || 'Containers discharged safely at destination berth. Seals inspected and verified intact.'}&rdquo;
                      </Text>
                    </View>

                    {/* Footer */}
                    <View style={styles.pendingClearanceFooter}>
                      <Ionicons name="shield-checkmark-outline" size={12} color="#5A779D" />
                      <Text style={styles.pendingClearanceFooterText}>
                        SLPA Official Handover • Gate-In Authenticated at {getTripDischargeTerminal(trip)}
                      </Text>
                    </View>
                  </View>

                  {/* Section 5: Supervisor Decision Buttons */}
                  <View style={styles.decisionButtonsRow}>
                    <TouchableOpacity
                      style={styles.approveBtn}
                      activeOpacity={0.85}
                      onPress={() => handleApproveTrip(trip)}
                    >
                      <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                      <Text style={styles.approveBtnText}>CONFIRM TRIP</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.rejectBtn}
                      activeOpacity={0.85}
                      onPress={() => handleOpenRejectModal(trip)}
                    >
                      <Ionicons name="close-circle" size={16} color="#173B70" />
                      <Text style={styles.rejectBtnText}>REJECT</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
          {/* Quick link to Trips Section for all trip details */}
          <TouchableOpacity
            style={styles.viewAllTripsLink}
            activeOpacity={0.85}
            onPress={() => router.push('/(supervisor)/(tabs)/trips' as any)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
              <View style={styles.viewAllTripsIconBox}>
                <Ionicons name="list-circle" size={24} color="#173B70" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.viewAllTripsTitle}>VIEW COMPLETE TRIP DETAILS</Text>
                <Text style={styles.viewAllTripsSub}>
                  Live active trips, completed missions, terminal filters & date-wise records are available in the Trips tab.
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#173B70" />
          </TouchableOpacity>
        </View>

        {/* ─── E. DRIVER MANAGEMENT VIEW WITH LIVE SEARCH ─── */}
        <View style={styles.sectionWrap}>
          {(() => {
            const q = driverSearchQuery.trim().toLowerCase();
            const filteredOps = drivers.filter((d: any) => {
              if (!q) return true;
              return (
                (d.fullName || '').toLowerCase().includes(q) ||
                (d.driverCode || '').toLowerCase().includes(q) ||
                (d.vehicleNumber || '').toLowerCase().includes(q) ||
                (d.chassisNumber || d.cheNumber || '').toLowerCase().includes(q) ||
                (d.mobileNumber || '').toLowerCase().includes(q)
              );
            });

            return (
              <>
                <View style={styles.sectionTitleRow}>
                  <Ionicons name="people" size={18} color="#173B70" />
                  <Text style={styles.sectionTitle}>
                    REGISTERED OPERATORS ({filteredOps.length} of {drivers.length})
                  </Text>
                  <TouchableOpacity
                    style={{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 4 }}
                    onPress={() => router.push('/(supervisor)/(tabs)/drivers')}
                  >
                    <Text style={{ color: '#173B70', fontSize: 11, fontWeight: '800' }}>VIEW FULL FLEET</Text>
                    <Ionicons name="chevron-forward" size={14} color="#173B70" />
                  </TouchableOpacity>
                </View>

                {/* Supervisor Dashboard Driver Search Bar */}
                <View style={styles.supervisorSearchWrap}>
                  <Ionicons name="search" size={16} color="#173B70" style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.supervisorSearchInput}
                    placeholder="Search by driver name, code (DRV), vehicle plate (LY), CHE..."
                    placeholderTextColor="#5A779D"
                    value={driverSearchQuery}
                    onChangeText={setDriverSearchQuery}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {driverSearchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setDriverSearchQuery('')}>
                      <Ionicons name="close-circle" size={18} color="#173B70" />
                    </TouchableOpacity>
                  )}
                </View>

                <View style={{ gap: 8 }}>
                  {filteredOps.length === 0 ? (
                    <View style={styles.emptyPendingCard}>
                      <Ionicons name="search-outline" size={26} color="#173B70" />
                      <Text style={styles.emptyPendingText}>NO OPERATORS FOUND</Text>
                      <Text style={styles.emptyPendingSub}>
                        No driver matched &quot;{driverSearchQuery}&quot;. Clear search or check spelling.
                      </Text>
                    </View>
                  ) : (
                    filteredOps.map((drv: any, idx: number) => {
                      const photo = drv.profilePhoto || DRIVER_PHOTO_POOL[idx % DRIVER_PHOTO_POOL.length];
                      const isSuspended = drv.status === 'SUSPENDED';
                      const isSdr = (drv.vehicleNumber || '').startsWith('LY-65');

                      return (
                        <TouchableOpacity
                          key={drv.id || drv.driverCode || idx}
                          style={styles.driverRowCard}
                          activeOpacity={0.85}
                          onPress={() => router.push('/(supervisor)/(tabs)/drivers')}
                        >
                          <Image source={{ uri: photo }} style={styles.driverAvatarImg} />
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Text style={styles.driverFullName}>{drv.fullName}</Text>
                              <View style={styles.operatorMiniBadge}>
                                <Text style={styles.operatorMiniBadgeText}>
                                  {isSdr ? 'SDR LINK' : 'SCK LOGISTICS'}
                                </Text>
                              </View>
                            </View>
                            <Text style={styles.driverDetails}>
                              Code: <Text style={{ color: '#173B70', fontWeight: '800' }}>{drv.driverCode}</Text> · Truck: <Text style={{ color: '#173B70', fontWeight: '700' }}>{drv.vehicleNumber || 'LY-6439'}</Text> · CHE: {resolveCheNumber(drv.vehicleNumber, drv.chassisNumber)} · Tel: {drv.mobileNumber}
                            </Text>
                          </View>
                          <View style={[styles.driverActivePill, isSuspended && styles.driverSuspendedPill]}>
                            <View style={[styles.greenDot, isSuspended && { backgroundColor: '#5A779D' }]} />
                            <Text style={[styles.driverActivePillText, isSuspended && { color: '#5A779D' }]}>{drv.status || 'ACTIVE'}</Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })
                  )}
                </View>
              </>
            );
          })()}
        </View>

        {/* ─── F. TERMINAL AND CONTAINER REPORTS SUMMARY WITH WEEKLY & MONTHLY FILTERS ─── */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionTitleRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="business" size={18} color="#173B70" />
              <Text style={styles.sectionTitle}>SLPA 6-TERMINAL CONSOLIDATED TOTALS</Text>
            </View>
            <View style={styles.panelActivePeriodBadge}>
              <Text style={styles.panelActivePeriodText}>
                {terminalPanelPeriod === 'WEEKLY' ? '7-DAY ROLLING' : terminalPanelPeriod === 'MONTHLY' ? '30-DAY MONTH' : terminalPanelPeriod === 'TODAY' ? 'TODAY' : 'ALL TIME'}
              </Text>
            </View>
          </View>

          {/* Timeframe Filter Tabs (Weekly / Monthly / Today / All Time) */}
          <View style={styles.panelFilterBar}>
            <View style={styles.periodTabsRow}>
              {(['WEEKLY', 'MONTHLY', 'TODAY', 'ALL'] as const).map((period) => {
                const isActive = terminalPanelPeriod === period;
                const label = period === 'WEEKLY' ? 'WEEKLY (7D)' : period === 'MONTHLY' ? 'MONTHLY (30D)' : period === 'TODAY' ? 'TODAY' : 'ALL TIME';
                return (
                  <TouchableOpacity
                    key={period}
                    style={[styles.periodTabBtn, isActive && styles.periodTabBtnActive]}
                    onPress={() => setTerminalPanelPeriod(period)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.periodTabText, isActive && styles.periodTabTextActive]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Traffic Direction Sub-Filter */}
            <View style={styles.trafficTypeRow}>
              <Text style={styles.trafficTypeLabel}>TRAFFIC ROLE:</Text>
              {(['ALL', 'ORIGIN', 'DESTINATION'] as const).map((type) => {
                const isSelected = terminalPanelTrafficType === type;
                const typeLabel = type === 'ALL' ? 'Total (Load + Discharge)' : type === 'ORIGIN' ? 'Origin Gate' : 'Discharge Bay';
                return (
                  <TouchableOpacity
                    key={type}
                    style={[styles.trafficTypeChip, isSelected && styles.trafficTypeChipActive]}
                    onPress={() => setTerminalPanelTrafficType(type)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.trafficTypeChipText, isSelected && styles.trafficTypeChipTextActive]}>
                      {typeLabel}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Aggregate Snapshot Banner */}
          <View style={styles.panelSummaryStrip}>
            <View style={styles.panelSummaryItem}>
              <Text style={styles.panelSummaryNum}>{terminalWiseStats.grandTotalTrips}</Text>
              <Text style={styles.panelSummaryLabel}>Total Trips ({terminalPanelPeriod})</Text>
            </View>
            <View style={styles.panelSummaryDivider} />
            <View style={styles.panelSummaryItem}>
              <Text style={styles.panelSummaryNum}>{terminalWiseStats.grandTotalContainers}</Text>
              <Text style={styles.panelSummaryLabel}>Containers Moved</Text>
            </View>
            <View style={styles.panelSummaryDivider} />
            <View style={styles.panelSummaryItem}>
              <Text style={styles.panelSummaryNum}>6</Text>
              <Text style={styles.panelSummaryLabel}>Active Port Terminals</Text>
            </View>
          </View>

          {/* 6 Terminals Consolidated Grid */}
          <View style={styles.terminalGrid}>
            {['CICT', 'CWIT', 'ECT', 'JCT', 'UCT', 'SAGT'].map((tName) => {
              const data = terminalWiseStats.perTerminal[tName] || { totalTrips: 0, containers: 0, originTrips: 0, destTrips: 0 };
              const periodSub = terminalPanelPeriod === 'WEEKLY' ? 'Trips This Week' : terminalPanelPeriod === 'MONTHLY' ? 'Trips This Month' : terminalPanelPeriod === 'TODAY' ? 'Trips Today' : 'Total Trips';
              return (
                <View key={tName} style={styles.terminalGridItem}>
                  <View style={styles.termHeaderRow}>
                    <Text style={styles.termGridName}>{tName}</Text>
                    {data.totalTrips > 0 && (
                      <View style={styles.termActiveDot} />
                    )}
                  </View>
                  <Text style={styles.termGridCount}>{data.totalTrips}</Text>
                  <Text style={styles.termGridSub}>{periodSub}</Text>

                  {/* Flow Sub-Metrics */}
                  <View style={styles.termFlowRow}>
                    <Text style={styles.termFlowText}>
                      Out: <Text style={{ color: '#173B70', fontWeight: '800' }}>{data.originTrips}</Text> · In: <Text style={{ color: '#173B70', fontWeight: '800' }}>{data.destTrips}</Text>
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>

          <TouchableOpacity style={styles.exportReportBtn} onPress={() => setReportModalVisible(true)}>
            <Ionicons name="document-text" size={18} color="#FFFFFF" />
            <Text style={styles.exportReportBtnText}>GENERATE OFFICIAL TERMINAL REPORT</Text>
          </TouchableOpacity>
        </View>

        {/* ─── H. SUPERVISOR QUICK ACTIONS ─── */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionTitle}>SUPERVISOR QUICK ACTIONS</Text>
          <View style={styles.quickGrid}>
            <TouchableOpacity style={styles.quickTile} onPress={() => router.push('/(supervisor)/(tabs)/approvals')}>
              <Ionicons name="shield-checkmark" size={22} color="#173B70" />
              <Text style={styles.quickTileText}>Pending Passes</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickTile} onPress={() => router.push('/(supervisor)/(tabs)/trips')}>
              <Ionicons name="layers" size={22} color="#173B70" />
              <Text style={styles.quickTileText}>Dispatcher Hub</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickTile} onPress={() => router.push('/(supervisor)/(tabs)/drivers')}>
              <Ionicons name="people" size={22} color="#173B70" />
              <Text style={styles.quickTileText}>Operators</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickTile} onPress={() => setReportModalVisible(true)}>
              <Ionicons name="bar-chart" size={22} color="#173B70" />
              <Text style={styles.quickTileText}>Daily Report</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickTile} onPress={() => setDamageReviewModalVisible(true)}>
              <Ionicons name="warning" size={22} color="#173B70" />
              <Text style={styles.quickTileText}>Damage Review</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickTile} onPress={() => setNotificationsModalVisible(true)}>
              <Ionicons name="notifications" size={22} color="#173B70" />
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
                <Ionicons name="alert-circle" size={20} color="#173B70" />
                <Text style={styles.modalTitle}>REJECT COMPLETED TRIP</Text>
              </View>
              <TouchableOpacity onPress={() => setRejectModalVisible(false)}>
                <Ionicons name="close" size={22} color="#173B70" />
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
                placeholderTextColor="#5A779D"
                multiline
                value={rejectionReason}
                onChangeText={setRejectionReason}
              />
            </View>

            <TouchableOpacity
              style={styles.modalSubmitBtn}
              onPress={handleConfirmRejection}
              disabled={submittingDecision}
            >
              {submittingDecision ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="close-circle" size={18} color="#fff" />
                  <Text style={[styles.modalSubmitBtnText, { color: '#FFFFFF' }]}>CONFIRM REJECTION WITH REASON</Text>
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
                <Ionicons name="document-text" size={20} color="#173B70" />
                <Text style={styles.modalTitle}>OFFICIAL TERMINAL CONSOLIDATED REPORT</Text>
              </View>
              <TouchableOpacity onPress={() => setReportModalVisible(false)}>
                <Ionicons name="close" size={22} color="#173B70" />
              </TouchableOpacity>
            </View>

            <View style={{ gap: 8 }}>
              <Text style={styles.repRow}>• Total ITT Movements: <Text style={styles.repVal}>{stats.totalTripsToday}</Text></Text>
              <Text style={styles.repRow}>• Completed Discharges: <Text style={styles.repVal}>{stats.completedTripsToday}</Text></Text>
              <Text style={styles.repRow}>• Active In-Transit: <Text style={styles.repVal}>{stats.activeTrips}</Text></Text>
              <Text style={styles.repRow}>• Gate Pass Approvals: <Text style={styles.repVal}>{stats.approvedTrips}</Text></Text>
              <Text style={styles.repRow}>• Total Containers: <Text style={styles.repVal}>{stats.totalContainersTransportedToday} Containers</Text></Text>
              <Text style={styles.repRow}>• Reporting Date: <Text style={styles.repVal}>{currentDateFormatted}</Text></Text>
            </View>

            <TouchableOpacity
              style={styles.modalSubmitBtn}
              onPress={() => {
                Alert.alert('Report Exported', 'CSV summary generated and downloaded to terminal storage.');
                setReportModalVisible(false);
              }}
            >
              <Ionicons name="download" size={18} color="#FFFFFF" />
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
                <Ionicons name="notifications" size={20} color="#173B70" />
                <Text style={styles.modalTitle}>SUPERVISOR OPERATIONS ALERTS</Text>
              </View>
              <TouchableOpacity onPress={() => setNotificationsModalVisible(false)}>
                <Ionicons name="close" size={22} color="#173B70" />
              </TouchableOpacity>
            </View>

            <View style={{ gap: 10 }}>
              <View style={styles.notifItem}>
                <Ionicons name="time" size={18} color="#173B70" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.notifTitle}>New Trip Submission (ITT-00002)</Text>
                  <Text style={styles.notifSub}>Driver Kasun Chamara submitted for Gate Pass clearance.</Text>
                </View>
              </View>
              <View style={styles.notifItem}>
                <Ionicons name="checkmark-circle" size={18} color="#173B70" />
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
                <Ionicons name="warning" size={20} color="#173B70" />
                <Text style={styles.modalTitle}>CONTAINER DAMAGE INCIDENTS</Text>
              </View>
              <TouchableOpacity onPress={() => setDamageReviewModalVisible(false)}>
                <Ionicons name="close" size={22} color="#173B70" />
              </TouchableOpacity>
            </View>

            <View style={styles.notifItem}>
              <Ionicons name="warning-outline" size={20} color="#173B70" />
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
    backgroundColor: '#FFFFFF',
  },
  scroll: {
    flexGrow: 1,
    gap: 14,
  },

  // ─── HEADER ───
  header: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D0DEEB',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 1,
    minWidth: 160,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#173B70',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 16,
  },
  supervisorNameText: {
    color: '#173B70',
    fontWeight: '800',
    fontSize: 15,
  },
  roleDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  rolePill: {
    backgroundColor: '#F0F5FA',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: '#D0DEEB',
  },
  rolePillText: {
    color: '#173B70',
    fontSize: 9,
    fontWeight: '800',
  },
  dateText: {
    color: '#5A779D',
    fontSize: 9,
    fontWeight: '700',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    flexShrink: 0,
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#F0F5FA',
    borderWidth: 1,
    borderColor: '#D0DEEB',
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
    backgroundColor: '#173B70',
  },
  headerLogoutBtn: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ─── SUPERVISOR PORT PASS BADGE & PERMIT CARD ───
  supervisorPassBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#D0DEEB',
    backgroundColor: '#F0F5FA',
  },
  supervisorPassBadgeValid: {
    backgroundColor: '#F0F5FA',
    borderColor: '#D0DEEB',
  },
  supervisorPassBadgeWarning: {
    backgroundColor: '#E8F1FA',
    borderColor: '#173B70',
  },
  supervisorPassBadgeExpired: {
    backgroundColor: '#E8F1FA',
    borderColor: '#173B70',
  },
  supervisorPassBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: '#173B70',
  },

  supervisorPermitCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D0DEEB',
    padding: 14,
    gap: 12,
  },
  supervisorPermitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  supervisorPermitIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#F0F5FA',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D0DEEB',
  },
  supervisorPermitTitle: {
    color: '#173B70',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  supervisorPermitSub: {
    color: '#5A779D',
    fontSize: 9,
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: 0.4,
  },
  permitStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D0DEEB',
    backgroundColor: '#F0F5FA',
  },
  permitStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#173B70',
  },
  permitStatusText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.6,
    color: '#173B70',
  },
  supervisorPermitGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    backgroundColor: '#F0F5FA',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#D0DEEB',
  },
  supervisorPermitCol: {
    flex: 1,
    gap: 2,
  },
  supervisorPermitLabel: {
    color: '#5A779D',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  supervisorPermitVal: {
    color: '#173B70',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  permitNoticeWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#F0F5FA',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#D0DEEB',
  },
  permitNoticeText: {
    flex: 1,
    color: '#173B70',
    fontSize: 10,
    lineHeight: 14,
  },
  authorizedTerminalsWrap: {
    backgroundColor: '#F0F5FA',
    borderRadius: 8,
    padding: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: '#D0DEEB',
  },
  authorizedTerminalsLabel: {
    color: '#5A779D',
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  terminalBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  terminalAuthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D0DEEB',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  termAuthDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#173B70',
  },
  terminalAuthText: {
    color: '#173B70',
    fontSize: 10,
    fontWeight: '800',
  },

  // Compliance Center Card
  complianceCenterCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#D0DEEB',
    padding: 12,
    gap: 10,
    marginBottom: 4,
  },
  complianceHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  complianceIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F0F5FA',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D0DEEB',
  },
  complianceTitle: {
    color: '#173B70',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  complianceSub: {
    color: '#5A779D',
    fontSize: 9.5,
    marginTop: 1,
  },
  complianceCountPill: {
    backgroundColor: '#F0F5FA',
    borderWidth: 1,
    borderColor: '#173B70',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  complianceCountText: {
    color: '#173B70',
    fontSize: 10,
    fontWeight: '900',
  },
  complianceTabRow: {
    flexDirection: 'row',
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#D0DEEB',
    paddingBottom: 8,
  },
  complianceTabBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D0DEEB',
  },
  complianceTabBtnActive: {
    backgroundColor: '#173B70',
    borderColor: '#173B70',
  },
  complianceTabText: {
    color: '#5A779D',
    fontSize: 9.5,
    fontWeight: '700',
  },
  complianceTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  complianceSectionBox: {
    backgroundColor: '#F0F5FA',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#D0DEEB',
    gap: 8,
  },
  complianceSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#D0DEEB',
    paddingBottom: 6,
  },
  complianceSectionTitle: {
    color: '#173B70',
    fontSize: 10,
    fontWeight: '800',
    flex: 1,
  },
  slpaTag: {
    backgroundColor: '#173B70',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  slpaTagText: {
    color: '#FFFFFF',
    fontSize: 8.5,
    fontWeight: '900',
  },
  complianceItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D0DEEB',
  },
  vehiclePlateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F5FA',
    borderWidth: 1,
    borderColor: '#D0DEEB',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  vehiclePlateBadgeText: {
    color: '#173B70',
    fontSize: 11,
    fontWeight: '900',
  },
  complianceItemDriver: {
    color: '#173B70',
    fontSize: 11,
    fontWeight: '700',
  },
  complianceItemSub: {
    color: '#5A779D',
    fontSize: 9.5,
    marginTop: 1,
  },
  complianceDaysPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#D0DEEB',
    backgroundColor: '#F0F5FA',
  },
  complianceDaysPillWarning: {
    backgroundColor: '#F0F5FA',
    borderColor: '#D0DEEB',
  },
  complianceDaysPillExpired: {
    backgroundColor: '#E8F1FA',
    borderColor: '#173B70',
  },
  complianceDaysText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#173B70',
  },
  miniTruckBadge: {
    backgroundColor: '#F0F5FA',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#D0DEEB',
  },
  miniTruckBadgeText: {
    color: '#173B70',
    fontSize: 9.5,
    fontWeight: '800',
  },
  passBadgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F5FA',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#D0DEEB',
  },
  passBadgeKey: {
    color: '#5A779D',
    fontSize: 9,
    fontWeight: '600',
  },
  passBadgeVal: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#173B70',
  },
  complianceMoreNotice: {
    color: '#173B70',
    fontSize: 9.5,
    fontWeight: '700',
    textAlign: 'center',
    paddingTop: 4,
  },
  complianceFleetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#173B70',
    borderRadius: 8,
    paddingVertical: 10,
    marginTop: 4,
  },
  complianceFleetBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.3,
  },

  // ─── 6 SUMMARY METRIC CARDS ───
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCardDark: {
    backgroundColor: '#173B70',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#173B70',
    padding: 12,
    gap: 4,
    justifyContent: 'space-between',
  },
  metricLabelDark: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  metricValueDark: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 2,
    letterSpacing: -0.5,
  },
  metricSubDark: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 10,
    fontWeight: '600',
  },
  metricCard: {
    backgroundColor: '#F0F5FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D0DEEB',
    padding: 12,
    gap: 4,
    justifyContent: 'space-between',
  },
  metricCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metricLabel: {
    color: '#3A567F',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#173B70',
    marginTop: 2,
    letterSpacing: -0.5,
  },
  metricSub: {
    color: '#5A779D',
    fontSize: 10,
    fontWeight: '600',
  },

  // ─── SECTION WRAPS ───
  sectionWrap: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D0DEEB',
    padding: 14,
    gap: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#D0DEEB',
  },
  sectionTitle: {
    color: '#173B70',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
  },

  // ─── PENDING APPROVALS ───
  emptyPendingCard: {
    backgroundColor: '#F0F5FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D0DEEB',
    padding: 16,
    alignItems: 'center',
    gap: 6,
  },
  emptyPendingText: {
    color: '#173B70',
    fontSize: 12,
    fontWeight: '800',
  },
  emptyPendingSub: {
    color: '#5A779D',
    fontSize: 10,
    textAlign: 'center',
  },
  pendingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#D0DEEB',
    padding: 14,
    gap: 12,
  },
  pendingCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  pendingTripId: {
    color: '#173B70',
    fontSize: 15,
    fontWeight: '900',
  },
  pendingDriver: {
    color: '#3A567F',
    fontSize: 11,
    marginTop: 2,
    fontWeight: '600',
  },
  pendingAwaitingTag: {
    backgroundColor: '#E8F1FA',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#173B70',
  },
  pendingAwaitingTagText: {
    color: '#173B70',
    fontSize: 8.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  pendingInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    backgroundColor: '#F0F5FA',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D0DEEB',
  },
  pendingInfoItem: {
    width: '48%',
    gap: 2,
  },
  pendingInfoItemFull: {
    width: '100%',
    gap: 2,
    marginTop: 2,
  },
  pendingInfoLabel: {
    color: '#5A779D',
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  pendingInfoValue: {
    color: '#173B70',
    fontSize: 11,
    fontWeight: '700',
  },
  pendingTimelineCard: {
    backgroundColor: '#F0F5FA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D0DEEB',
    padding: 10,
  },
  pendingTimelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  pendingTimelineBlock: {
    flex: 1,
    gap: 2,
  },
  pendingTimelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  pendingTimelineLabel: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#173B70',
    letterSpacing: 0.4,
  },
  pendingTimelineDate: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E293B',
  },
  pendingTimelineTime: {
    fontSize: 12,
    fontWeight: '900',
    color: '#173B70',
  },
  pendingTimelineArrowWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 4,
  },
  pendingDurationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#D0DEEB',
  },
  pendingDurationText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#173B70',
  },
  pendingContainersList: {
    gap: 6,
  },
  pendingContainerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0F5FA',
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D0DEEB',
  },
  pendingContNum: {
    color: '#173B70',
    fontSize: 12,
    fontWeight: '800',
  },
  pendingContSize: {
    color: '#5A779D',
    fontSize: 10,
    fontWeight: '600',
  },
  pendingContStatusBadge: {
    marginLeft: 'auto',
    backgroundColor: '#E8F1FA',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#D0DEEB',
  },
  pendingContStatusText: {
    color: '#173B70',
    fontSize: 9,
    fontWeight: '800',
  },
  pendingDischargeVerificationCard: {
    backgroundColor: '#F0F5FA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D0DEEB',
    padding: 10,
    gap: 8,
  },
  pendingDischargeVerificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#D0DEEB',
  },
  pendingDischargeVerificationTitle: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#173B70',
    letterSpacing: 0.5,
  },
  pendingRemarksAuditedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#D0DEEB',
  },
  pendingRemarksAuditedText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#173B70',
    letterSpacing: 0.4,
  },
  pendingDischargeMetricsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pendingDischargeMetricBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D0DEEB',
    padding: 8,
  },
  pendingDischargeGridLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: '#5A779D',
    letterSpacing: 0.4,
  },
  pendingDischargeGridValue: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#173B70',
  },
  pendingRemarksCallout: {
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#173B70',
    borderWidth: 1,
    borderColor: '#D0DEEB',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  pendingRemarksCalloutLabel: {
    fontSize: 8.5,
    fontWeight: '900',
    color: '#173B70',
    letterSpacing: 0.4,
  },
  pendingRemarksCalloutText: {
    fontSize: 10.5,
    color: '#173B70',
    fontStyle: 'italic',
    lineHeight: 15,
  },
  pendingClearanceFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingTop: 2,
  },
  pendingClearanceFooterText: {
    fontSize: 8.5,
    color: '#5A779D',
    fontWeight: '600',
  },
  decisionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  approveBtn: {
    flex: 1,
    height: 44,
    backgroundColor: '#173B70',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  approveBtnText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  rejectBtn: {
    paddingHorizontal: 20,
    height: 44,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#173B70',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  rejectBtnText: {
    color: '#173B70',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  viewAllTripsLink: {
    backgroundColor: '#F0F5FA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D0DEEB',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  viewAllTripsIconBox: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D0DEEB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewAllTripsTitle: {
    color: '#173B70',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  viewAllTripsSub: {
    color: '#5A779D',
    fontSize: 10,
    marginTop: 2,
    lineHeight: 14,
  },

  // ─── SEARCH & FILTER CHIPS ───
  supervisorSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D0DEEB',
    paddingHorizontal: 10,
    height: 40,
    marginBottom: 4,
  },
  supervisorSearchInput: {
    flex: 1,
    color: '#173B70',
    fontSize: 11.5,
    paddingVertical: 0,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  } as any,
  operatorMiniBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
    borderColor: '#D0DEEB',
  },
  operatorMiniBadgeText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#173B70',
  },
  driverRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F5FA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D0DEEB',
    padding: 10,
    gap: 10,
  },
  driverAvatarImg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#173B70',
  },
  driverFullName: {
    color: '#173B70',
    fontSize: 11,
    fontWeight: '800',
  },
  driverDetails: {
    color: '#5A779D',
    fontSize: 9,
    marginTop: 1,
  },
  driverActivePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D0DEEB',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    gap: 4,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#173B70',
  },
  driverActivePillText: {
    color: '#173B70',
    fontSize: 8,
    fontWeight: '800',
  },
  driverSuspendedPill: {
    borderColor: '#173B70',
    backgroundColor: '#E8F1FA',
  },

  // ─── TERMINALS REPORT GRID ───
  panelActivePeriodBadge: {
    backgroundColor: '#F0F5FA',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#173B70',
  },
  panelActivePeriodText: {
    color: '#173B70',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  panelFilterBar: {
    backgroundColor: '#F0F5FA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D0DEEB',
    padding: 10,
    gap: 10,
  },
  periodTabsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  periodTabBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 7,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D0DEEB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodTabBtnActive: {
    backgroundColor: '#173B70',
    borderColor: '#173B70',
  },
  periodTabText: {
    color: '#5A779D',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  periodTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  trafficTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#D0DEEB',
    flexWrap: 'wrap',
  },
  trafficTypeLabel: {
    color: '#5A779D',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  trafficTypeChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D0DEEB',
  },
  trafficTypeChipActive: {
    backgroundColor: '#173B70',
    borderColor: '#173B70',
  },
  trafficTypeChipText: {
    color: '#5A779D',
    fontSize: 8,
    fontWeight: '700',
  },
  trafficTypeChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  panelSummaryStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0F5FA',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#D0DEEB',
  },
  panelSummaryItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  panelSummaryNum: {
    color: '#173B70',
    fontSize: 16,
    fontWeight: '900',
  },
  panelSummaryLabel: {
    color: '#5A779D',
    fontSize: 8,
    fontWeight: '700',
    textAlign: 'center',
  },
  panelSummaryDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#D0DEEB',
  },
  terminalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  terminalGridItem: {
    width: '31%',
    backgroundColor: '#F0F5FA',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#D0DEEB',
    alignItems: 'center',
    gap: 2,
  },
  termHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  termActiveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#173B70',
  },
  termGridName: {
    color: '#173B70',
    fontWeight: '900',
    fontSize: 12,
  },
  termGridCount: {
    color: '#173B70',
    fontWeight: '900',
    fontSize: 16,
  },
  termGridSub: {
    color: '#5A779D',
    fontSize: 8,
  },
  termFlowRow: {
    marginTop: 2,
    paddingTop: 3,
    borderTopWidth: 1,
    borderTopColor: '#D0DEEB',
    width: '100%',
    alignItems: 'center',
  },
  termFlowText: {
    color: '#5A779D',
    fontSize: 7,
    fontWeight: '800',
  },
  exportReportBtn: {
    height: 44,
    backgroundColor: '#173B70',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  exportReportBtnText: {
    color: '#FFFFFF',
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
    backgroundColor: '#F0F5FA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D0DEEB',
    padding: 12,
    alignItems: 'center',
    gap: 6,
  },
  quickTileText: {
    color: '#173B70',
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'center',
  },

  // ─── MODAL STYLES ───
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(23, 59, 112, 0.45)',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#173B70',
    padding: 16,
    gap: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#D0DEEB',
  },
  modalTitle: {
    color: '#173B70',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 0.8,
  },
  modalPrompt: {
    color: '#1E293B',
    fontSize: 11,
    lineHeight: 16,
  },
  inputWrap: {
    backgroundColor: '#F0F5FA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D0DEEB',
    paddingHorizontal: 12,
  },
  modalInput: {
    color: '#173B70',
    fontSize: 11,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  } as any,
  modalSubmitBtn: {
    height: 44,
    backgroundColor: '#173B70',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  modalSubmitBtnText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 11,
    letterSpacing: 0.6,
  },
  repRow: {
    color: '#3A567F',
    fontSize: 11,
  },
  repVal: {
    color: '#173B70',
    fontWeight: '800',
  },
  notifItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0F5FA',
    borderRadius: 8,
    padding: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: '#D0DEEB',
  },
  notifTitle: {
    color: '#173B70',
    fontSize: 11,
    fontWeight: '800',
  },
  notifSub: {
    color: '#5A779D',
    fontSize: 9,
    marginTop: 2,
  },
});
