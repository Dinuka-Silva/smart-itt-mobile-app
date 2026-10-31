import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../../src/store/authStore';
import { adminService, AdminDashboardStats } from '../../../src/services/adminService';
import { adminFleetStore, AdminVehicle, AdminDriver } from '../../../src/store/adminFleetStore';
import { useResponsive } from '../../../src/hooks/useResponsive';
import { AdminSignOutModal } from '../../../src/components/AdminSignOutModal';
import { useMockTripStore } from '../../../src/store/mockTripStore';
import {
  getTripDischargeTerminal,
  getTripTimingInfo,
  getContainerTimingInfo,
  formatTripTime,
} from '../../../src/utils/tripTerminalUtils';

type DashboardSection = 'OVERVIEW' | 'TRIPS' | 'FLEET' | 'SUPERVISORS';

export default function AdminDashboardScreen() {
  const router = useRouter();
  const { topInset, bottomInset, containerPaddingHorizontal } = useResponsive();
  const { user, lockSession } = useAuthStore();
  const mockTrips = useMockTripStore((s) => s.mockTrips);

  const [activeSection, setActiveSection] = useState<DashboardSection>('OVERVIEW');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [vehicles, setVehicles] = useState<AdminVehicle[]>([]);
  const [drivers, setDrivers] = useState<AdminDriver[]>([]);
  const [trips, setTrips] = useState<any[]>([]);
  const [signOutModalVisible, setSignOutModalVisible] = useState(false);

  const [supervisorsRoster, setSupervisorsRoster] = useState<any[]>([]);

  const fetchDashboardData = useCallback(async () => {
    try {
      // 1. Load active fleet, driver & supervisor state
      const vList = await adminFleetStore.getVehicles();
      const dList = await adminFleetStore.getDrivers();
      const sList = await adminFleetStore.getSupervisors();
      setVehicles(vList);
      setDrivers(dList);

      const mappedSupervisors = sList.map((s, idx) => ({
        id: s.id,
        code: s.employeeId,
        username: s.username || s.employeeId,
        name: s.fullName,
        phone: s.mobileNumber,
        email: s.email,
        shift: idx % 2 === 0 ? 'Day Shift (06:00 - 18:00)' : 'Night Shift (18:00 - 06:00)',
        role: idx === 0 ? 'Senior Yard Controller' : idx === 1 ? 'Gate Operations Lead' : 'Terminal Operations Supervisor',
        status: s.status === 'ACTIVE' ? 'ACTIVE DUTY' : 'SUSPENDED',
      }));
      setSupervisorsRoster(mappedSupervisors);

      const sckCount = vList.filter((v) => v.operator === 'SCK Logistics').length;
      const sdrCount = vList.filter((v) => v.operator === 'SDR LINK').length;
      const activeVehicles = vList.filter((v) => v.status === 'ACTIVE').length;
      const maintVehicles = vList.filter((v) => v.status === 'MAINTENANCE').length;
      const activeDrivers = dList.filter((d) => d.status === 'ACTIVE').length;
      const activeSupervisors = sList.filter((s) => s.status === 'ACTIVE').length;

      // Real-time trip metrics from mockTripStore
      const currentTrips = useMockTripStore.getState().mockTrips;
      const inProg = currentTrips.filter((t) => t.status === 'IN_PROGRESS' || t.status === 'ARRIVED').length;
      const pend = currentTrips.filter((t) => t.status === 'PENDING_APPROVAL').length;
      const comp = currentTrips.filter((t) => t.status === 'COMPLETED' || t.status === 'APPROVED').length;
      const rej = currentTrips.filter((t) => t.status === 'REJECTED').length;
      let totCont = 0;
      let c20 = 0;
      let c40 = 0;
      const termMap: Record<string, number> = { CICT: 0, CWIT: 0, ECT: 0, JCT: 0, UCT: 0, SAGT: 0 };
      currentTrips.forEach((t) => {
        if (t.sourceTerminal && termMap[t.sourceTerminal] !== undefined) termMap[t.sourceTerminal]++;
        (t.containers || []).forEach((c) => {
          totCont++;
          if (c.size === '20FT') c20++;
          else c40++;
        });
      });

      // 2. Fetch remote stats or provide complete baseline
      try {
        const data = await adminService.getDashboardStats();
        setStats({
          ...data,
          totalVehicles: vList.length,
          sckVehicles: sckCount,
          sdrVehicles: sdrCount,
          activeVehicles,
          maintenanceVehicles: maintVehicles,
          totalDrivers: dList.length,
          activeDrivers,
          todayTrips: Math.max(data.todayTrips || 0, currentTrips.length),
          tripsInProgress: Math.max(data.tripsInProgress || 0, inProg),
          tripsPendingApproval: Math.max(data.tripsPendingApproval || 0, pend),
          tripsCompleted: Math.max(data.tripsCompleted || 0, comp),
          tripsApproved: Math.max(data.tripsApproved || 0, comp),
          tripsRejected: Math.max(data.tripsRejected || 0, rej),
        });
        if (data.recentTrips && data.recentTrips.length > 0) {
          const byId = new Map<string, any>();
          data.recentTrips.forEach((t: any) => byId.set(t.id || t.tripNumber, t));
          currentTrips.forEach((t) => {
            const k = t.id || t.tripNumber;
            if (!byId.has(k)) byId.set(k, t);
          });
          setTrips(Array.from(byId.values()).slice(0, 10));
        } else {
          setTrips(currentTrips.slice(0, 10));
        }
      } catch {
        setStats({
          totalDrivers: dList.length,
          activeDrivers,
          suspendedDrivers: 0,
          deactivatedDrivers: 0,
          totalSupervisors: sList.length,
          activeSupervisors,
          totalVehicles: vList.length,
          activeVehicles,
          maintenanceVehicles: maintVehicles,
          assignedVehicles: dList.length,
          sckVehicles: sckCount,
          sdrVehicles: sdrCount,
          todayTrips: currentTrips.length,
          tripsInProgress: inProg,
          tripsPendingApproval: pend,
          tripsCompleted: comp,
          tripsApproved: comp,
          tripsRejected: rej,
          totalTripsAllTime: 140 + currentTrips.length,
          totalContainers: 280 + totCont,
          twentyFtContainers: 110 + c20,
          fortyFtContainers: 170 + c40,
          terminalWiseTrips: termMap,
          recentTrips: currentTrips.slice(0, 10),
          recentAuditLogs: [],
        });
        setTrips(currentTrips.slice(0, 10));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [mockTrips]);

  function getInitialMockTrips() {
    return [
      {
        id: 't-101',
        tripNumber: 'TRIP-2026-0041',
        sourceTerminal: 'JCT',
        destTerminal: 'CICT',
        vesselName: 'EVER GIVEN V.042',
        vehicleNumber: 'LY-2345',
        chassisNumber: 'SCK 101',
        driverName: 'Sunil Shantha',
        containers: ['MSKU9876543'],
        containerSize: '40FT',
        status: 'COMPLETED',
        time: '10:14 AM',
      },
      {
        id: 't-102',
        tripNumber: 'TRIP-2026-0042',
        sourceTerminal: 'CICT',
        destTerminal: 'ECT',
        vesselName: 'MAERSK MC-KINNEY',
        vehicleNumber: 'LY-3456',
        chassisNumber: 'SCK 102',
        driverName: 'Kamal Perera',
        containers: ['CMAU1122334', 'CMAU1122335'],
        containerSize: '20FT x2',
        status: 'PENDING_APPROVAL',
        time: '11:20 AM',
      },
      {
        id: 't-103',
        tripNumber: 'TRIP-2026-0043',
        sourceTerminal: 'SAGT',
        destTerminal: 'CWIT',
        vesselName: 'MSC OSCAR V.812',
        vehicleNumber: 'LY-4567',
        chassisNumber: 'SCK 103',
        driverName: 'Nuwan Jayasinghe',
        containers: ['TGHU5544332'],
        containerSize: '40FT',
        status: 'IN_PROGRESS',
        time: '11:45 AM',
      },
      {
        id: 't-104',
        tripNumber: 'TRIP-2026-0044',
        sourceTerminal: 'ECT',
        destTerminal: 'JCT',
        vesselName: 'CMA CGM ANTOINE',
        vehicleNumber: 'LY-5678',
        chassisNumber: 'SCK 104',
        driverName: 'Pradeep Kumara',
        containers: ['MEDU7788990'],
        containerSize: '40FT',
        status: 'PENDING_APPROVAL',
        time: '12:05 PM',
      },
    ];
  }

  useEffect(() => {
    fetchDashboardData();
    const unsub = adminFleetStore.subscribe(() => {
      fetchDashboardData();
    });
    return unsub;
  }, [fetchDashboardData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const handleTripAction = (tripId: string, status: 'APPROVED' | 'REJECTED') => {
    Alert.alert(
      `${status === 'APPROVED' ? 'Approve' : 'Reject'} ITT Movement`,
      `Are you sure you want to mark trip as ${status}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => {
            setTrips((prev) =>
              prev.map((t) => (t.id === tripId ? { ...t, status } : t))
            );
            Alert.alert('Action Logged', `Trip marked as ${status} by Administrator`);
          },
        },
      ]
    );
  };

  return (
    <View style={styles.root}>
      {/* Top Header */}
      <View style={[styles.header, { paddingTop: Math.max(topInset, 16) }]}>
        <View style={styles.headerLeft}>
          <View style={styles.badgePill}>
            <Ionicons name="shield-checkmark" size={12} color="#00e5ff" />
            <Text style={styles.badgePillText}>ADMIN CONSOLE</Text>
          </View>
          <Text style={styles.headerTitle}>System Overview</Text>
          <Text style={styles.headerSubtitle}>{user?.name || user?.fullName || 'Administrator'}</Text>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.actionIconBtn}
            onPress={() => router.push('/(admin)/audit')}
            activeOpacity={0.7}
          >
            <Ionicons name="receipt-outline" size={18} color="#90caf9" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionIconBtn}
            onPress={() => router.push('/(admin)/supervisors')}
            activeOpacity={0.7}
          >
            <Ionicons name="person-circle-outline" size={19} color="#90caf9" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionIconBtn, { borderColor: 'rgba(255, 179, 0, 0.35)', backgroundColor: 'rgba(255, 179, 0, 0.1)' }]}
            onPress={() => lockSession()}
            activeOpacity={0.7}
            accessibilityLabel="Lock Admin Session"
          >
            <Ionicons name="lock-closed-outline" size={17} color="#feb300" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionIconBtn, styles.logoutBtn]}
            onPress={() => setSignOutModalVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={18} color="#ff8a80" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Segmented Section Switcher */}
      <View style={styles.sectionSwitcher}>
        {(['OVERVIEW', 'TRIPS', 'FLEET', 'SUPERVISORS'] as DashboardSection[]).map((tab) => {
          const isActive = activeSection === tab;
          const labels: Record<DashboardSection, string> = {
            OVERVIEW: 'Executive Overview',
            TRIPS: 'Live ITT Trips',
            FLEET: 'Fleet & Drivers',
            SUPERVISORS: 'Supervisors Roster',
          };
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.switcherTab, isActive && styles.switcherTabActive]}
              onPress={() => setActiveSection(tab)}
              activeOpacity={0.8}
            >
              <Text style={[styles.switcherTabText, isActive && styles.switcherTabTextActive]}>
                {labels[tab]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading && !refreshing ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#00e5ff" />
          <Text style={styles.loadingText}>Loading comprehensive telemetry...</Text>
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
          {/* Quick Action Buttons Row */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => router.push('/(admin)/(tabs)/vehicles')}
              activeOpacity={0.8}
            >
              <Ionicons name="car-sport" size={16} color="#00e5ff" />
              <Text style={styles.actionBtnText}>+ Add Vehicle</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => router.push('/(admin)/(tabs)/drivers')}
              activeOpacity={0.8}
            >
              <Ionicons name="person-add" size={16} color="#4caf50" />
              <Text style={styles.actionBtnText}>+ New Driver</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => router.push('/(admin)/audit')}
              activeOpacity={0.8}
            >
              <Ionicons name="finger-print" size={16} color="#feb300" />
              <Text style={styles.actionBtnText}>Audit Trail</Text>
            </TouchableOpacity>
          </View>

          {/* ═════════════════════════════════════════════════════════════ */}
          {/* 1. OVERVIEW SECTION                                          */}
          {/* ═════════════════════════════════════════════════════════════ */}
          {activeSection === 'OVERVIEW' && (
            <>
              {/* ITT Operations KPI Grid */}
              <Text style={styles.sectionHeader}>TODAY'S ITT OPERATIONS</Text>
              <View style={styles.kpiGrid}>
                <View style={[styles.kpiCard, { borderColor: 'rgba(0, 229, 255, 0.3)' }]}>
                  <View style={styles.kpiHeaderRow}>
                    <Text style={styles.kpiLabel}>TODAY'S TRIPS</Text>
                    <Ionicons name="swap-horizontal" size={16} color="#00e5ff" />
                  </View>
                  <Text style={styles.kpiValue}>{stats?.todayTrips || 18}</Text>
                  <Text style={styles.kpiSub}>Active: {stats?.tripsInProgress || 4} in progress</Text>
                </View>

                <View style={[styles.kpiCard, { borderColor: 'rgba(254, 179, 0, 0.3)' }]}>
                  <View style={styles.kpiHeaderRow}>
                    <Text style={styles.kpiLabel}>PENDING APPROVAL</Text>
                    <Ionicons name="time" size={16} color="#feb300" />
                  </View>
                  <Text style={[styles.kpiValue, { color: '#feb300' }]}>{stats?.tripsPendingApproval || 3}</Text>
                  <Text style={styles.kpiSub}>Awaiting verification</Text>
                </View>

                <View style={[styles.kpiCard, { borderColor: 'rgba(76, 175, 80, 0.3)' }]}>
                  <View style={styles.kpiHeaderRow}>
                    <Text style={styles.kpiLabel}>COMPLETED / APPR.</Text>
                    <Ionicons name="checkmark-done-circle" size={16} color="#4caf50" />
                  </View>
                  <Text style={[styles.kpiValue, { color: '#4caf50' }]}>{(stats?.tripsCompleted || 11) + (stats?.tripsApproved || 0)}</Text>
                  <Text style={styles.kpiSub}>Total all-time: {stats?.totalTripsAllTime || 142}</Text>
                </View>

                <View style={[styles.kpiCard, { borderColor: 'rgba(33, 150, 243, 0.3)' }]}>
                  <View style={styles.kpiHeaderRow}>
                    <Text style={styles.kpiLabel}>CONTAINERS</Text>
                    <Ionicons name="cube" size={16} color="#2196f3" />
                  </View>
                  <Text style={[styles.kpiValue, { color: '#2196f3' }]}>{stats?.totalContainers || 284}</Text>
                  <Text style={styles.kpiSub}>20FT: {stats?.twentyFtContainers || 112} | 40FT: {stats?.fortyFtContainers || 172}</Text>
                </View>
              </View>

              {/* Fleet & Personnel Summary Card */}
              <Text style={styles.sectionHeader}>FLEET & DRIVER CAPACITY</Text>
              <View style={styles.fleetSummaryCard}>
                <View style={styles.fleetStatRow}>
                  <TouchableOpacity
                    style={styles.fleetStatItem}
                    onPress={() => setActiveSection('FLEET')}
                  >
                    <Text style={styles.fleetStatNum}>{vehicles.length}</Text>
                    <Text style={styles.fleetStatLabel}>Total Fleet Units</Text>
                    <Text style={styles.fleetStatSub}>
                      SCK: {stats?.sckVehicles || 18} | SDR: {stats?.sdrVehicles || 5}
                    </Text>
                  </TouchableOpacity>

                  <View style={styles.dividerVertical} />

                  <View style={styles.fleetStatItem}>
                    <Text style={[styles.fleetStatNum, { color: '#4caf50' }]}>
                      {vehicles.filter((v) => v.status === 'ACTIVE').length}
                    </Text>
                    <Text style={styles.fleetStatLabel}>Active Vehicles</Text>
                    <Text style={styles.fleetStatSub}>
                      Maint: {vehicles.filter((v) => v.status === 'MAINTENANCE').length}
                    </Text>
                  </View>

                  <View style={styles.dividerVertical} />

                  <TouchableOpacity
                    style={styles.fleetStatItem}
                    onPress={() => setActiveSection('FLEET')}
                  >
                    <Text style={[styles.fleetStatNum, { color: '#00e5ff' }]}>
                      {drivers.filter((d) => d.status === 'ACTIVE').length}
                    </Text>
                    <Text style={styles.fleetStatLabel}>Active Drivers</Text>
                    <Text style={styles.fleetStatSub}>Total: {drivers.length}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Terminal Movements Visualizer */}
              <Text style={styles.sectionHeader}>PORT TERMINAL MOVEMENTS</Text>
              <View style={styles.terminalCard}>
                {['CICT', 'CWIT', 'ECT', 'JCT', 'UCT', 'SAGT'].map((t) => {
                  const count = stats?.terminalWiseTrips?.[t] || 0;
                  return (
                    <View key={t} style={styles.terminalRow}>
                      <View style={styles.terminalBadge}>
                        <Text style={styles.terminalBadgeText}>{t}</Text>
                      </View>
                      <View style={styles.terminalBarWrap}>
                        <View
                          style={[
                            styles.terminalBarFill,
                            { width: `${Math.min(Math.max(count * 2.2, 8), 100)}%` },
                          ]}
                        />
                      </View>
                      <Text style={styles.terminalCountText}>{count} trips</Text>
                    </View>
                  );
                })}
              </View>

              {/* Recent ITT Movements Preview */}
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeader}>RECENT ITT MOVEMENTS</Text>
                <TouchableOpacity onPress={() => setActiveSection('TRIPS')}>
                  <Text style={styles.seeAllText}>View All ({trips.length}) →</Text>
                </TouchableOpacity>
              </View>

              {trips.slice(0, 3).map((trip) => {
                const tTiming = getTripTimingInfo(trip);
                return (
                  <View key={trip.id || trip.tripNumber} style={styles.tripItemCard}>
                    <View style={styles.tripItemHeader}>
                      <Text style={styles.tripItemNumber}>{trip.tripNumber}</Text>
                      <View
                        style={[
                          styles.statusPill,
                          trip.status === 'COMPLETED' || trip.status === 'APPROVED'
                            ? styles.statusPillGreen
                            : trip.status === 'PENDING_APPROVAL'
                            ? styles.statusPillAmber
                            : styles.statusPillCyan,
                        ]}
                      >
                        <Text style={styles.statusPillText}>{trip.status}</Text>
                      </View>
                    </View>

                    <View style={styles.tripRouteRow}>
                      <Text style={styles.tripRouteTerm}>{trip.sourceTerminal}</Text>
                      <Ionicons name="arrow-forward" size={14} color="#78909c" />
                      <Text style={styles.tripRouteTerm}>{getTripDischargeTerminal(trip)}</Text>
                      <Text style={styles.tripVesselText}>• {trip.vesselName || 'ITT Harbor Transfer'}</Text>
                    </View>

                    {/* Operational Timing & Turnaround Metric */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginVertical: 4 }}>
                      <Text style={{ fontSize: 11, color: '#22ef7e', fontWeight: '700' }}>
                        📥 Load: {tTiming.loadTime}
                      </Text>
                      <Text style={{ fontSize: 11, color: tTiming.isDischarged ? '#00e5ff' : '#feb300', fontWeight: '700' }}>
                        📤 Disch: {tTiming.dischargeTime}
                      </Text>
                      <Text style={{ fontSize: 11, color: '#ffd54f', fontWeight: '800' }}>
                        ⏱️ Spent: {tTiming.timeSpent}
                      </Text>
                    </View>

                    <Text style={styles.tripVehicleText}>
                      Prime Mover: {trip.vehicleNumber} ({trip.chassisNumber}) • Driver: {trip.driverName || 'Authorized Driver'}
                    </Text>
                  </View>
                );
              })}
            </>
          )}

          {/* ═════════════════════════════════════════════════════════════ */}
          {/* 2. TRIPS & APPROVALS SECTION                                 */}
          {/* ═════════════════════════════════════════════════════════════ */}
          {activeSection === 'TRIPS' && (
            <>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeader}>LIVE ITT MOVEMENTS & DISPATCH</Text>
                <TouchableOpacity onPress={() => router.push('/(admin)/(tabs)/trips')}>
                  <Text style={styles.seeAllText}>Advanced Search →</Text>
                </TouchableOpacity>
              </View>

              {trips.map((trip) => {
                const isPending = trip.status === 'PENDING_APPROVAL';
                const tTiming = getTripTimingInfo(trip);
                return (
                  <View key={trip.id || trip.tripNumber} style={styles.fullTripCard}>
                    <View style={styles.tripItemHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Ionicons name="swap-horizontal" size={18} color="#00e5ff" />
                        <Text style={styles.tripItemNumber}>{trip.tripNumber}</Text>
                      </View>
                      <View
                        style={[
                          styles.statusPill,
                          trip.status === 'COMPLETED' || trip.status === 'APPROVED'
                            ? styles.statusPillGreen
                            : trip.status === 'PENDING_APPROVAL'
                            ? styles.statusPillAmber
                            : styles.statusPillCyan,
                        ]}
                      >
                        <Text style={styles.statusPillText}>{trip.status}</Text>
                      </View>
                    </View>

                    <View style={styles.tripRouteBox}>
                      <View style={styles.terminalPoint}>
                        <Text style={styles.terminalPointLabel}>ORIGIN</Text>
                        <Text style={styles.terminalPointVal}>{trip.sourceTerminal}</Text>
                      </View>
                      <Ionicons name="arrow-forward-circle" size={24} color="#00e5ff" />
                      <View style={styles.terminalPoint}>
                        <Text style={styles.terminalPointLabel}>DISCHARGE</Text>
                        <Text style={styles.terminalPointVal}>{getTripDischargeTerminal(trip)}</Text>
                      </View>
                    </View>

                    {/* Operational Timing & Turnaround Duration Box */}
                    <View
                      style={{
                        flexDirection: 'row',
                        backgroundColor: 'rgba(7, 15, 30, 0.95)',
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: 'rgba(0, 229, 255, 0.2)',
                        paddingVertical: 8,
                        paddingHorizontal: 10,
                        marginVertical: 6,
                      }}
                    >
                      <View style={{ flex: 1, alignItems: 'center' }}>
                        <Text style={{ fontSize: 9, fontWeight: '800', color: '#78909c' }}>LOADED</Text>
                        <Text style={{ fontSize: 12, fontWeight: '800', color: '#ffffff', marginTop: 2 }}>
                          {tTiming.loadTime}
                        </Text>
                        <Text style={{ fontSize: 10, fontWeight: '600', color: '#90caf9' }}>
                          {trip.sourceTerminal || 'CICT'}
                        </Text>
                      </View>
                      <View style={{ width: 1, height: 26, backgroundColor: 'rgba(255, 255, 255, 0.1)', marginHorizontal: 4 }} />
                      <View style={{ flex: 1, alignItems: 'center' }}>
                        <Text style={{ fontSize: 9, fontWeight: '800', color: '#78909c' }}>DISCHARGED</Text>
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: '800',
                            color: tTiming.isDischarged ? '#00e5ff' : '#feb300',
                            marginTop: 2,
                          }}
                        >
                          {tTiming.dischargeTime}
                        </Text>
                        <Text style={{ fontSize: 10, fontWeight: '600', color: '#90caf9' }}>
                          {getTripDischargeTerminal(trip)}
                        </Text>
                      </View>
                      <View style={{ width: 1, height: 26, backgroundColor: 'rgba(255, 255, 255, 0.1)', marginHorizontal: 4 }} />
                      <View style={{ flex: 1, alignItems: 'center' }}>
                        <Text style={{ fontSize: 9, fontWeight: '800', color: '#78909c' }}>TIME SPENT</Text>
                        <Text style={{ fontSize: 12, fontWeight: '800', color: '#ffd54f', marginTop: 2 }}>
                          {tTiming.timeSpent}
                        </Text>
                        <Text style={{ fontSize: 10, fontWeight: '600', color: '#90caf9' }}>
                          {tTiming.isCompleted ? 'Turnaround' : 'Transit'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.tripDetailsGrid}>
                      <View style={styles.tripDetailItem}>
                        <Text style={styles.tripDetailLabel}>Prime Mover:</Text>
                        <Text style={styles.tripDetailVal}>{trip.vehicleNumber} ({trip.chassisNumber})</Text>
                      </View>
                      <View style={styles.tripDetailItem}>
                        <Text style={styles.tripDetailLabel}>Driver:</Text>
                        <Text style={styles.tripDetailVal}>{trip.driverName || 'Assigned Driver'}</Text>
                      </View>
                      <View style={styles.tripDetailItem}>
                        <Text style={styles.tripDetailLabel}>Vessel:</Text>
                        <Text style={styles.tripDetailVal}>{trip.vesselName || 'Port Liner'}</Text>
                      </View>
                      <View style={styles.tripDetailItem}>
                        <Text style={styles.tripDetailLabel}>Containers:</Text>
                        <Text style={styles.tripDetailVal}>
                          {Array.isArray(trip.containers)
                            ? trip.containers
                                .map((c: any) =>
                                  typeof c === 'string'
                                    ? c
                                    : `${c.containerNumber || 'Cont'} (${c.size || '20FT'}${c.destTerminal ? ` ➔ ${c.destTerminal}` : ''})`
                                )
                                .join(', ')
                            : '1 unit'}{' '}
                          ({trip.containerSize || '40FT'})
                        </Text>
                      </View>
                    </View>

                    {isPending && (
                      <View style={styles.tripActionRow}>
                        <TouchableOpacity
                          style={styles.approveBtn}
                          onPress={() => handleTripAction(trip.id, 'APPROVED')}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="checkmark-circle" size={16} color="#ffffff" />
                          <Text style={styles.btnTextWhite}>Approve Trip</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.rejectBtn}
                          onPress={() => handleTripAction(trip.id, 'REJECTED')}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="close-circle" size={16} color="#ff5252" />
                          <Text style={styles.btnTextRed}>Reject</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })}
            </>
          )}

          {/* ═════════════════════════════════════════════════════════════ */}
          {/* 3. FLEET & DRIVERS SECTION                                   */}
          {/* ═════════════════════════════════════════════════════════════ */}
          {activeSection === 'FLEET' && (
            <>
              {/* Compliance & Port Pass Renewal Alerts */}
              <Text style={styles.sectionHeader}>PORT PASS & COMPLIANCE WATCH</Text>
              <View style={styles.complianceCard}>
                <View style={styles.complianceTop}>
                  <Ionicons name="warning" size={18} color="#feb300" />
                  <Text style={styles.complianceTitle}>Upcoming Port Pass Renewals</Text>
                </View>
                {vehicles.slice(0, 4).map((v) => (
                  <View key={v.id} style={styles.complianceItem}>
                    <View>
                      <Text style={styles.compliancePlate}>{v.vehicleNumber} • {v.chassisNumber}</Text>
                      <Text style={styles.compliancePass}>Pass: {v.portPassNumber || 'SLPA-VPP-000'}</Text>
                    </View>
                    <View style={styles.complianceRight}>
                      <Text style={styles.complianceDate}>{v.portPassExpiryDate || '2026-11-10'}</Text>
                      <View style={[styles.statusPill, styles.statusPillAmber]}>
                        <Text style={styles.statusPillText}>RENEWAL DUE</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>

              {/* Authorized Prime Movers Roster */}
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeader}>AUTHORIZED PRIME MOVERS ({vehicles.length})</Text>
                <TouchableOpacity onPress={() => router.push('/(admin)/(tabs)/vehicles')}>
                  <Text style={styles.seeAllText}>Manage Fleet →</Text>
                </TouchableOpacity>
              </View>

              {vehicles.slice(0, 6).map((v) => (
                <View key={v.id} style={styles.vehicleRosterCard}>
                  <View style={styles.rosterCardTop}>
                    <View style={styles.vehicleIdWrap}>
                      <Text style={styles.rosterPlate}>{v.vehicleNumber}</Text>
                      <Text style={styles.rosterChassis}>{v.chassisNumber}</Text>
                    </View>
                    <View style={styles.badgeWrap}>
                      <View style={[styles.statusPill, v.operator === 'SCK Logistics' ? styles.statusPillCyan : styles.statusPillAmber]}>
                        <Text style={styles.statusPillText}>{v.operator}</Text>
                      </View>
                      <View style={[styles.statusPill, v.status === 'ACTIVE' ? styles.statusPillGreen : styles.statusPillRed]}>
                        <Text style={styles.statusPillText}>{v.status}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.rosterDetailRow}>
                    <Text style={styles.rosterDetailText}>Trailer: {v.trailerSize} Skeletal</Text>
                    <Text style={styles.rosterDetailText}>
                      Driver: {v.driverName ? `${v.driverName} (${v.driverCode || 'DRV'})` : 'Standby / Unassigned'}
                    </Text>
                  </View>
                </View>
              ))}

              {/* Registered Drivers Summary */}
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeader}>REGISTERED DRIVERS ROSTER ({drivers.length})</Text>
                <TouchableOpacity onPress={() => router.push('/(admin)/(tabs)/drivers')}>
                  <Text style={styles.seeAllText}>Manage Drivers →</Text>
                </TouchableOpacity>
              </View>

              {drivers.slice(0, 5).map((d) => (
                <View key={d.id} style={styles.driverRosterCard}>
                  <View style={styles.driverCardTop}>
                    <View>
                      <Text style={styles.driverName}>{d.fullName}</Text>
                      <Text style={styles.driverCode}>{d.driverCode} • NIC: {d.nic}</Text>
                    </View>
                    <View style={[styles.statusPill, styles.statusPillGreen]}>
                      <Text style={styles.statusPillText}>{d.status}</Text>
                    </View>
                  </View>
                  <View style={styles.driverMetaRow}>
                    <Text style={styles.driverMetaText}>Mobile: {d.mobileNumber}</Text>
                    <Text style={styles.driverMetaText}>
                      Vehicle: {d.vehicleNumber && d.vehicleNumber !== 'UNASSIGNED' ? `${d.vehicleNumber} (${d.chassisNumber || 'CHE'})` : 'Standby Driver'}
                    </Text>
                  </View>
                </View>
              ))}
            </>
          )}

          {/* ═════════════════════════════════════════════════════════════ */}
          {/* 4. SUPERVISORS SECTION                                       */}
          {/* ═════════════════════════════════════════════════════════════ */}
          {activeSection === 'SUPERVISORS' && (
            <>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeader}>PORT SUPERVISORS FIELD ROSTER ({supervisorsRoster.length})</Text>
                <TouchableOpacity onPress={() => router.push('/(admin)/supervisors')}>
                  <Text style={styles.seeAllText}>Full Directory →</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.jurisdictionNotice}>
                <Ionicons name="information-circle" size={18} color="#00e5ff" />
                <Text style={styles.jurisdictionNoticeText}>
                  Port-Wide Jurisdiction: Authorized across all 6 terminals (JCT, CICT, SAGT, ECT, CWIT, UCT).
                </Text>
              </View>

              {supervisorsRoster.map((sup) => (
                <View key={sup.id} style={styles.supervisorCard}>
                  <View style={styles.supervisorHeader}>
                    <View style={styles.supervisorAvatar}>
                      <Text style={styles.supervisorAvatarText}>{sup.name[0]}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.supervisorName}>{sup.name}</Text>
                      <Text style={styles.supervisorCode}>{sup.code} • {sup.role}</Text>
                    </View>
                    <View style={[styles.statusPill, styles.statusPillGreen]}>
                      <Text style={styles.statusPillText}>{sup.status}</Text>
                    </View>
                  </View>

                  <View style={styles.supervisorDetailBox}>
                    <View style={styles.supervisorDetailRow}>
                      <Ionicons name="call-outline" size={14} color="#00e5ff" />
                      <Text style={styles.supervisorDetailText}>{sup.phone}</Text>
                    </View>
                    <View style={styles.supervisorDetailRow}>
                      <Ionicons name="mail-outline" size={14} color="#90caf9" />
                      <Text style={styles.supervisorDetailText}>{sup.email}</Text>
                    </View>
                    <View style={styles.supervisorDetailRow}>
                      <Ionicons name="time-outline" size={14} color="#feb300" />
                      <Text style={styles.supervisorDetailText}>{sup.shift}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </>
          )}

          {/* ─── Admin Session & Sign Out ─── */}
          <View style={styles.signOutCard}>
            <View style={styles.signOutCardLeft}>
              <View style={styles.signOutIconWrap}>
                <Ionicons name="shield-outline" size={20} color="#00e5ff" />
              </View>
              <View>
                <Text style={styles.signOutCardTitle}>Admin Session Active</Text>
                <Text style={styles.signOutCardSub}>{user?.email || 'admin@smartitt.lk'} • Administrator</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.signOutCardBtn}
              onPress={() => setSignOutModalVisible(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="log-out-outline" size={16} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.signOutCardBtnText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* Interactive Sign Out Confirmation Modal */}
      <AdminSignOutModal
        visible={signOutModalVisible}
        onClose={() => setSignOutModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#070c14',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#0a1019',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerLeft: {
    flex: 1,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.25)',
  },
  badgePillText: {
    color: '#00e5ff',
    fontSize: 10,
    fontWeight: '800',
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    color: '#90caf9',
    fontSize: 12,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  logoutBtn: {
    backgroundColor: 'rgba(255, 82, 82, 0.15)',
    borderColor: 'rgba(255, 82, 82, 0.3)',
  },
  sectionSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#0a1019',
    padding: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  switcherTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  switcherTabActive: {
    backgroundColor: 'rgba(0, 229, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.3)',
  },
  switcherTabText: {
    color: '#78909c',
    fontSize: 11,
    fontWeight: '700',
  },
  switcherTabTextActive: {
    color: '#00e5ff',
    fontWeight: '800',
  },
  scrollContent: {
    paddingTop: 16,
  },
  centerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingText: {
    color: '#00e5ff',
    marginTop: 12,
    fontSize: 13,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#0c1524',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    paddingVertical: 10,
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 6,
  },
  sectionHeader: {
    color: '#78909c',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 4,
  },
  seeAllText: {
    color: '#00e5ff',
    fontSize: 11,
    fontWeight: '700',
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  kpiCard: {
    width: '48%',
    backgroundColor: '#0c1524',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
  },
  kpiHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  kpiLabel: {
    color: '#78909c',
    fontSize: 10,
    fontWeight: '800',
  },
  kpiValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
    marginVertical: 4,
  },
  kpiSub: {
    fontSize: 10,
    color: '#90caf9',
    fontWeight: '500',
  },
  fleetSummaryCard: {
    backgroundColor: '#0c1524',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 16,
  },
  fleetStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fleetStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  fleetStatNum: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
  },
  fleetStatLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#b0bec5',
    marginTop: 2,
  },
  fleetStatSub: {
    fontSize: 9,
    color: '#78909c',
    marginTop: 2,
  },
  dividerVertical: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  terminalCard: {
    backgroundColor: '#0c1524',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 16,
  },
  terminalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 5,
  },
  terminalBadge: {
    width: 48,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
    alignItems: 'center',
  },
  terminalBadgeText: {
    color: '#00e5ff',
    fontSize: 10,
    fontWeight: '800',
  },
  terminalBarWrap: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 3,
    marginHorizontal: 10,
    overflow: 'hidden',
  },
  terminalBarFill: {
    height: '100%',
    backgroundColor: '#00e5ff',
    borderRadius: 3,
  },
  terminalCountText: {
    color: '#cfd8dc',
    fontSize: 11,
    fontWeight: '600',
    width: 48,
    textAlign: 'right',
  },
  tripItemCard: {
    backgroundColor: '#0c1524',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  fullTripCard: {
    backgroundColor: '#0c1524',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  tripItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tripItemNumber: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusPillGreen: {
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
  },
  statusPillAmber: {
    backgroundColor: 'rgba(254, 179, 0, 0.15)',
  },
  statusPillCyan: {
    backgroundColor: 'rgba(0, 229, 255, 0.15)',
  },
  statusPillRed: {
    backgroundColor: 'rgba(255, 82, 82, 0.15)',
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ffffff',
  },
  tripRouteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  tripRouteTerm: {
    color: '#00e5ff',
    fontSize: 12,
    fontWeight: '700',
    marginRight: 6,
  },
  tripVesselText: {
    color: '#78909c',
    fontSize: 11,
    marginLeft: 6,
  },
  tripVehicleText: {
    color: '#90caf9',
    fontSize: 11,
  },
  tripRouteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#070f1e',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.15)',
  },
  terminalPoint: {
    alignItems: 'center',
  },
  terminalPointLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#78909c',
  },
  terminalPointVal: {
    fontSize: 15,
    fontWeight: '800',
    color: '#00e5ff',
    marginTop: 2,
  },
  tripDetailsGrid: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    padding: 10,
    borderRadius: 8,
    gap: 4,
  },
  tripDetailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tripDetailLabel: {
    fontSize: 11,
    color: '#78909c',
    fontWeight: '600',
  },
  tripDetailVal: {
    fontSize: 11,
    color: '#ffffff',
    fontWeight: '700',
  },
  tripActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  approveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#4caf50',
    paddingVertical: 8,
    borderRadius: 8,
  },
  rejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 82, 82, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 82, 82, 0.3)',
    paddingVertical: 8,
    borderRadius: 8,
  },
  btnTextWhite: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  btnTextRed: {
    color: '#ff5252',
    fontSize: 12,
    fontWeight: '700',
  },
  complianceCard: {
    backgroundColor: '#0c1524',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(254, 179, 0, 0.25)',
    marginBottom: 16,
  },
  complianceTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  complianceTitle: {
    color: '#feb300',
    fontSize: 13,
    fontWeight: '800',
  },
  complianceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  compliancePlate: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  compliancePass: {
    color: '#78909c',
    fontSize: 11,
    marginTop: 2,
  },
  complianceRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  complianceDate: {
    color: '#90caf9',
    fontSize: 11,
    fontWeight: '600',
  },
  vehicleRosterCard: {
    backgroundColor: '#0c1524',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  rosterCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  vehicleIdWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  rosterPlate: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  rosterChassis: {
    color: '#00e5ff',
    fontSize: 12,
    fontWeight: '700',
  },
  badgeWrap: {
    flexDirection: 'row',
    gap: 6,
  },
  rosterDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  rosterDetailText: {
    color: '#90caf9',
    fontSize: 11,
    fontWeight: '500',
  },
  driverRosterCard: {
    backgroundColor: '#0c1b30',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  driverCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  driverName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  driverCode: {
    color: '#78909c',
    fontSize: 11,
    marginTop: 2,
  },
  driverMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  driverMetaText: {
    color: '#90caf9',
    fontSize: 11,
  },
  jurisdictionNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0, 229, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.25)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  jurisdictionNoticeText: {
    color: '#00e5ff',
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  supervisorCard: {
    backgroundColor: '#0c1b30',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  supervisorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  supervisorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 229, 255, 0.15)',
    borderWidth: 1,
    borderColor: '#00e5ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  supervisorAvatarText: {
    color: '#00e5ff',
    fontSize: 16,
    fontWeight: '800',
  },
  supervisorName: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  supervisorCode: {
    color: '#78909c',
    fontSize: 11,
    marginTop: 2,
  },
  supervisorDetailBox: {
    backgroundColor: '#070f1e',
    borderRadius: 8,
    padding: 10,
    gap: 6,
  },
  supervisorDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  supervisorDetailText: {
    color: '#cfd8dc',
    fontSize: 11,
    fontWeight: '500',
  },
  signOutCard: {
    marginTop: 20,
    marginBottom: 10,
    backgroundColor: '#0c1b30',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 82, 82, 0.25)',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  signOutCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  signOutIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  signOutCardTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  signOutCardSub: {
    color: '#78909c',
    fontSize: 10,
    marginTop: 2,
  },
  signOutCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff5252',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  signOutCardBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
});
