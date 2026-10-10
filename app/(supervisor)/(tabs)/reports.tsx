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
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../../src/store/authStore';
import { useMockTripStore, MockTrip } from '../../../src/store/mockTripStore';
import { tripService } from '../../../src/services/tripService';
import { radius, spacing } from '../../../src/theme';

const PERIOD_FILTERS = [
  { id: 'DAILY', label: 'DAILY (TODAY)' },
  { id: 'WEEKLY', label: 'WEEKLY (7 DAYS)' },
  { id: 'MONTHLY', label: 'MONTHLY (30 DAYS)' },
  { id: 'YEARLY', label: 'YEARLY (2026)' },
  { id: 'ALL', label: 'ALL TIME' },
] as const;

const DRIVER_OPTIONS = [
  { id: 'ALL', label: 'ALL DRIVERS' },
  { id: 'demo-driver', label: 'Kamal Perera (WP-BA-1234)' },
  { id: 'drv-002', label: 'Saman Kumara (WP-DA-5567)' },
  { id: 'drv-003', label: 'Nimal Fernando (WP-GA-9912)' },
  { id: 'drv-004', label: 'Sunil Silva (WP-LA-3344)' },
] as const;

export default function SupervisorReports() {
  const user = useAuthStore((s) => s.user);

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<string>('ALL');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('DAILY');
  const [actionProcessingId, setActionProcessingId] = useState<string | null>(null);

  const mockTrips = useMockTripStore((s) => s.mockTrips);
  const dischargeAndCompleteTrip = useMockTripStore((s) => s.dischargeAndCompleteTrip);
  const updateTripStatus = useMockTripStore((s) => s.updateTripStatus);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 500);
  };

  // 1. Date Filtering Helper
  const filterByPeriod = useCallback((tripDateStr?: string, period?: string) => {
    if (!tripDateStr || period === 'ALL') return true;
    const tripDate = new Date(tripDateStr);
    const now = new Date();

    if (isNaN(tripDate.getTime())) return true;

    if (period === 'DAILY') {
      return (
        tripDate.getDate() === now.getDate() &&
        tripDate.getMonth() === now.getMonth() &&
        tripDate.getFullYear() === now.getFullYear()
      );
    }
    if (period === 'WEEKLY') {
      const diffTime = Math.abs(now.getTime() - tripDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 7;
    }
    if (period === 'MONTHLY') {
      const diffTime = Math.abs(now.getTime() - tripDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 30;
    }
    if (period === 'YEARLY') {
      return tripDate.getFullYear() === now.getFullYear();
    }
    return true;
  }, []);

  // 2. Filtered Trips based on Driver & Date Period
  const filteredTrips = useMemo(() => {
    return mockTrips.filter((t) => {
      // Driver Filter
      if (selectedDriver !== 'ALL' && t.driverId !== selectedDriver) {
        return false;
      }
      // Period Filter
      const tripDate = t.createdAt || t.startTime || t.operationDate;
      return filterByPeriod(tripDate, selectedPeriod);
    });
  }, [mockTrips, selectedDriver, selectedPeriod, filterByPeriod]);

  // 3. Computed Status Categorization
  const completedTrips = useMemo(
    () => filteredTrips.filter((t) => t.status === 'COMPLETED' || t.status === 'APPROVED'),
    [filteredTrips]
  );
  const ongoingTrips = useMemo(
    () => filteredTrips.filter((t) => t.status === 'IN_PROGRESS'),
    [filteredTrips]
  );
  const pendingTrips = useMemo(
    () => filteredTrips.filter((t) => t.status === 'PENDING_APPROVAL'),
    [filteredTrips]
  );

  const totalContainersHandled = useMemo(() => {
    return filteredTrips.reduce((acc, t) => acc + (t.containers?.length || 0), 0);
  }, [filteredTrips]);

  // 4. Group Trips Day-Wise for Storage View
  const dayWiseGroupedTrips = useMemo(() => {
    const map = new Map<string, MockTrip[]>();

    filteredTrips.forEach((t) => {
      const dateStr = t.createdAt || t.startTime || t.operationDate || new Date().toISOString();
      const d = new Date(dateStr);
      const key = isNaN(d.getTime())
        ? 'TODAY'
        : d.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          });

      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(t);
    });

    return Array.from(map.entries()).map(([dayLabel, tripsInDay]) => {
      const completed = tripsInDay.filter((t) => t.status === 'COMPLETED' || t.status === 'APPROVED').length;
      const ongoing = tripsInDay.filter((t) => t.status === 'IN_PROGRESS').length;
      const pending = tripsInDay.filter((t) => t.status === 'PENDING_APPROVAL').length;
      return {
        dayLabel,
        tripsInDay,
        completed,
        ongoing,
        pending,
      };
    });
  }, [filteredTrips]);

  // Handler: Confirm Discharge and Complete Trip
  const handleSupervisorDischargeAndComplete = async (tripId: string) => {
    setActionProcessingId(tripId);
    try {
      await tripService.approveTrip(tripId, user?.id || 'sup-001', 'Container discharged and gate pass approved');
      dischargeAndCompleteTrip(tripId, user?.id || 'sup-001');
      Alert.alert('Container Discharged & Trip Completed', `Trip ${tripId} has been confirmed, discharged, and stored as completed.`);
    } catch {
      dischargeAndCompleteTrip(tripId, user?.id || 'sup-001');
      Alert.alert('Container Discharged & Trip Completed (Local)', `Trip ${tripId} confirmed and completed.`);
    } finally {
      setActionProcessingId(null);
    }
  };

  const supervisorName = user?.name || user?.fullName || 'Nimal Silva';
  const supervisorInitials = supervisorName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

  const handleExport = (type: string) => {
    Alert.alert(`Export ${type}`, `Generated SLPA Audit Report (${selectedPeriod} - ${selectedDriver === 'ALL' ? 'All Drivers' : selectedDriver}) downloaded to device.`);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00e5ff" />}
      >
        {/* ─── HEADER ─── */}
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
                <Text style={styles.dateText}>ANALYTICS & DISCHARGE REPORT</Text>
              </View>
            </View>
          </View>

          <View style={styles.reportPill}>
            <Ionicons name="funnel" size={13} color="#00e5ff" />
            <Text style={styles.reportPillText}>AUDIT ENGINE</Text>
          </View>
        </View>

        {/* ─── A. SELECTION FILTERS: DRIVER-WISE & DATE-WISE ─── */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="options" size={16} color="#00e5ff" />
            <Text style={styles.sectionTitle}>AUDIT SELECTION FILTERS</Text>
          </View>

          {/* 1. Date Period Selection Filter */}
          <View>
            <Text style={styles.filterSubLabel}>TIME PERIOD FILTER (DATE WISE / PERIOD)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
              {PERIOD_FILTERS.map((p) => {
                const active = selectedPeriod === p.id;
                return (
                  <TouchableOpacity
                    key={p.id}
                    style={[styles.filterChip, active && styles.filterChipActiveCyan]}
                    onPress={() => setSelectedPeriod(p.id)}
                  >
                    <Text style={[styles.filterChipText, active && styles.filterChipTextActiveCyan]}>
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* 2. Driver Selection Filter */}
          <View>
            <Text style={styles.filterSubLabel}>DRIVER WISE SELECTION FILTER</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
              {DRIVER_OPTIONS.map((d) => {
                const active = selectedDriver === d.id;
                return (
                  <TouchableOpacity
                    key={d.id}
                    style={[styles.filterChip, active && styles.filterChipActiveAmber]}
                    onPress={() => setSelectedDriver(d.id)}
                  >
                    <Text style={[styles.filterChipText, active && styles.filterChipTextActiveAmber]}>
                      {d.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>

        {/* ─── B. CATEGORIZED SUMMARY METRICS CARDS ─── */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <View style={styles.metricCardHeader}>
              <Text style={styles.metricLabel}>TOTAL TRIPS</Text>
              <Ionicons name="swap-horizontal" size={14} color="#00e5ff" />
            </View>
            <Text style={[styles.metricValue, { color: '#00e5ff' }]}>{filteredTrips.length}</Text>
            <Text style={styles.metricSub}>All Selected Moves</Text>
          </View>

          <View style={styles.metricCard}>
            <View style={styles.metricCardHeader}>
              <Text style={styles.metricLabel}>COMPLETED ONES</Text>
              <Ionicons name="checkmark-done-circle" size={14} color="#22ef7e" />
            </View>
            <Text style={[styles.metricValue, { color: '#22ef7e' }]}>{completedTrips.length}</Text>
            <Text style={styles.metricSub}>Discharged & Approved</Text>
          </View>

          <View style={styles.metricCard}>
            <View style={styles.metricCardHeader}>
              <Text style={styles.metricLabel}>ONGOING ONES</Text>
              <Ionicons name="navigate-circle" size={14} color="#00e5ff" />
            </View>
            <Text style={[styles.metricValue, { color: '#00e5ff' }]}>{ongoingTrips.length}</Text>
            <Text style={styles.metricSub}>In Transit Right Now</Text>
          </View>

          <View style={styles.metricCard}>
            <View style={styles.metricCardHeader}>
              <Text style={styles.metricLabel}>PENDING APPROVAL</Text>
              <Ionicons name="time" size={14} color="#feb300" />
            </View>
            <Text style={[styles.metricValue, { color: '#feb300' }]}>{pendingTrips.length}</Text>
            <Text style={styles.metricSub}>Discharged / Gate Pass</Text>
          </View>
        </View>

        {/* ─── C. DAY-WISE DRIVER TRIPS BREAKDOWN & STORAGE VIEW ─── */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="calendar-outline" size={18} color="#00e5ff" />
            <Text style={styles.sectionTitle}>
              DAY-WISE STORED TRIPS BREAKDOWN ({dayWiseGroupedTrips.length} DAYS RECORDED)
            </Text>
          </View>

          {dayWiseGroupedTrips.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="folder-open-outline" size={32} color="#849396" />
              <Text style={styles.emptyTitle}>NO STORED TRIPS FOR SELECTION</Text>
              <Text style={styles.emptySub}>No trips matched the selected Driver and Date Period filter.</Text>
            </View>
          ) : (
            dayWiseGroupedTrips.map((group, gIdx) => (
              <View key={group.dayLabel || gIdx} style={styles.dayGroupCard}>
                {/* Day Header */}
                <View style={styles.dayHeaderRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="today-outline" size={15} color="#00e5ff" />
                    <Text style={styles.dayTitleText}>{group.dayLabel}</Text>
                  </View>

                  <View style={styles.dayStatsBadges}>
                    <View style={styles.dayStatPillGreen}>
                      <Text style={styles.dayStatPillGreenText}>{group.completed} COMPLETED</Text>
                    </View>
                    <View style={styles.dayStatPillAmber}>
                      <Text style={styles.dayStatPillAmberText}>{group.pending} PENDING</Text>
                    </View>
                    {group.ongoing > 0 && (
                      <View style={styles.dayStatPillCyan}>
                        <Text style={styles.dayStatPillCyanText}>{group.ongoing} ONGOING</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Individual Trips for this Day */}
                <View style={{ gap: 8, marginTop: 8 }}>
                  {group.tripsInDay.map((t) => {
                    const isCompleted = t.status === 'COMPLETED' || t.status === 'APPROVED';
                    const isPending = t.status === 'PENDING_APPROVAL';
                    const isOngoing = t.status === 'IN_PROGRESS';
                    const isProcessing = actionProcessingId === t.id;

                    return (
                      <View key={t.id} style={styles.tripItemBox}>
                        <View style={styles.tripItemHeader}>
                          <View style={{ gap: 2 }}>
                            <Text style={styles.tripItemNumber}>
                              {t.tripNumber || `ITT-${t.id?.slice(0, 6)}`}
                            </Text>
                            <Text style={styles.driverMetaText}>
                              Driver: <Text style={{ color: '#dde2f0', fontWeight: '800' }}>{t.driverName}</Text> ({t.vehicleNumber})
                            </Text>
                          </View>

                          <View
                            style={[
                              styles.statusTag,
                              isCompleted && styles.tagGreen,
                              isPending && styles.tagAmber,
                              isOngoing && styles.tagCyan,
                            ]}
                          >
                            <Text
                              style={[
                                styles.statusTagText,
                                isCompleted && { color: '#22ef7e' },
                                isPending && { color: '#feb300' },
                                isOngoing && { color: '#00e5ff' },
                              ]}
                            >
                              {t.status?.replace(/_/g, ' ')}
                            </Text>
                          </View>
                        </View>

                        {/* Route & Vessel */}
                        <View style={styles.routeStrip}>
                          <Text style={styles.routeText}>{t.sourceTerminal || 'CICT'}</Text>
                          <Ionicons name="arrow-forward" size={12} color="#00e5ff" />
                          <Text style={styles.routeText}>{t.destTerminal}</Text>
                          <Text style={styles.vesselText}>· {t.vesselName}</Text>
                        </View>

                        {/* Container discharge status list */}
                        <View style={styles.containerListStrip}>
                          {(t.containers || []).map((c: any, cIdx: number) => {
                            const isDischarged = c.status === 'DISCHARGED' || isCompleted;
                            return (
                              <View key={c.id || cIdx} style={styles.containerChip}>
                                <Ionicons
                                  name={isDischarged ? 'checkmark-circle' : 'cube-outline'}
                                  size={13}
                                  color={isDischarged ? '#22ef7e' : '#feb300'}
                                />
                                <Text style={styles.containerChipNum}>{c.containerNumber}</Text>
                                <Text
                                  style={[
                                    styles.containerDischargeBadge,
                                    { color: isDischarged ? '#22ef7e' : '#feb300' },
                                  ]}
                                >
                                  {isDischarged ? 'DISCHARGED' : 'IN TRANSIT'}
                                </Text>
                              </View>
                            );
                          })}
                        </View>

                        {/* Supervisor Action Button if Pending or Ongoing */}
                        {(isPending || isOngoing) && (
                          <TouchableOpacity
                            style={[styles.supervisorConfirmBtn, isProcessing && { opacity: 0.5 }]}
                            disabled={isProcessing}
                            onPress={() => handleSupervisorDischargeAndComplete(t.id)}
                          >
                            {isProcessing ? (
                              <ActivityIndicator size="small" color="#00363d" />
                            ) : (
                              <>
                                <Ionicons name="shield-checkmark" size={15} color="#00363d" />
                                <Text style={styles.supervisorConfirmBtnText}>
                                  DISCHARGE CONTAINER & CONFIRM GATE PASS
                                </Text>
                              </>
                            )}
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>
            ))
          )}
        </View>

        {/* ─── D. AUDIT EXPORT ACTIONS ─── */}
        <View style={styles.exportRow}>
          <TouchableOpacity style={[styles.exportBtn, { backgroundColor: '#162844', borderColor: '#00e5ff' }]} onPress={() => handleExport('PDF')}>
            <Ionicons name="document-text-outline" size={18} color="#00e5ff" />
            <Text style={[styles.exportBtnText, { color: '#00e5ff' }]}>EXPORT AUDIT PDF</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.exportBtn, { backgroundColor: '#00e5ff', borderColor: '#00e5ff' }]} onPress={() => handleExport('Excel')}>
            <Ionicons name="download-outline" size={18} color="#00363d" />
            <Text style={[styles.exportBtnText, { color: '#00363d' }]}>EXPORT EXCEL / CSV</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
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

  // Header
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
  reportPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#080e17',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#242a34',
  },
  reportPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#00e5ff',
    letterSpacing: 0.6,
  },

  // Selection Filters
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
  filterSubLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#849396',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  chipsScroll: {
    gap: 6,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.sm,
    backgroundColor: '#080e17',
    borderWidth: 1,
    borderColor: '#242a34',
  },
  filterChipActiveCyan: {
    backgroundColor: 'rgba(0, 229, 255, 0.15)',
    borderColor: '#00e5ff',
  },
  filterChipActiveAmber: {
    backgroundColor: 'rgba(254, 179, 0, 0.15)',
    borderColor: '#feb300',
  },
  filterChipText: {
    color: '#849396',
    fontSize: 9,
    fontWeight: '800',
  },
  filterChipTextActiveCyan: {
    color: '#00e5ff',
  },
  filterChipTextActiveAmber: {
    color: '#feb300',
  },

  // Metrics Grid
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

  // Day Group Storage Card
  emptyCard: {
    backgroundColor: '#080e17',
    borderRadius: radius.DEFAULT,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    color: '#dde2f0',
    fontSize: 12,
    fontWeight: '800',
  },
  emptySub: {
    color: '#849396',
    fontSize: 10,
    textAlign: 'center',
  },

  dayGroupCard: {
    backgroundColor: '#080e17',
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: '#242a34',
    padding: 12,
    gap: 8,
  },
  dayHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#161c25',
  },
  dayTitleText: {
    color: '#00e5ff',
    fontSize: 12,
    fontWeight: '900',
  },
  dayStatsBadges: {
    flexDirection: 'row',
    gap: 6,
  },
  dayStatPillGreen: {
    backgroundColor: 'rgba(34, 239, 126, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  dayStatPillGreenText: {
    color: '#22ef7e',
    fontSize: 8,
    fontWeight: '800',
  },
  dayStatPillAmber: {
    backgroundColor: 'rgba(254, 179, 0, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  dayStatPillAmberText: {
    color: '#feb300',
    fontSize: 8,
    fontWeight: '800',
  },
  dayStatPillCyan: {
    backgroundColor: 'rgba(0, 229, 255, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  dayStatPillCyanText: {
    color: '#00e5ff',
    fontSize: 8,
    fontWeight: '800',
  },

  // Trip Item Box
  tripItemBox: {
    backgroundColor: '#161c25',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#242a34',
    padding: 10,
    gap: 6,
  },
  tripItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  tripItemNumber: {
    color: '#00e5ff',
    fontSize: 12,
    fontWeight: '900',
  },
  driverMetaText: {
    color: '#849396',
    fontSize: 10,
  },
  statusTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagGreen: { backgroundColor: 'rgba(34, 239, 126, 0.15)' },
  tagAmber: { backgroundColor: 'rgba(254, 179, 0, 0.15)' },
  tagCyan: { backgroundColor: 'rgba(0, 229, 255, 0.15)' },
  statusTagText: {
    fontSize: 8,
    fontWeight: '900',
  },

  routeStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  routeText: {
    color: '#dde2f0',
    fontSize: 11,
    fontWeight: '800',
  },
  vesselText: {
    color: '#849396',
    fontSize: 10,
  },

  containerListStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  containerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#080e17',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#242a34',
  },
  containerChipNum: {
    color: '#dde2f0',
    fontSize: 10,
    fontWeight: '800',
  },
  containerDischargeBadge: {
    fontSize: 8,
    fontWeight: '900',
    marginLeft: 2,
  },

  supervisorConfirmBtn: {
    backgroundColor: '#00e5ff',
    height: 36,
    borderRadius: radius.DEFAULT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 4,
  },
  supervisorConfirmBtnText: {
    color: '#00363d',
    fontWeight: '900',
    fontSize: 10,
    letterSpacing: 0.6,
  },

  exportRow: {
    flexDirection: 'row',
    gap: 10,
  },
  exportBtn: {
    flex: 1,
    height: 44,
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  exportBtnText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
});
