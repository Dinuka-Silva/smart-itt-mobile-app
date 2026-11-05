import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../../../src/services/api';
import { tripService } from '../../../src/services/tripService';
import { NetworkErrorView } from '../../../src/components/NetworkErrorView';
import { useAuthStore } from '../../../src/store/authStore';
import { colors, radius, spacing } from '../../../src/theme';
import { useResponsive } from '../../../src/hooks/useResponsive';
import {
  PermanentTripCard,
  CompleteTripDetailsModal,
  PhotoLightboxModal,
  DriverTripCompletionModal,
  TripCardData,
} from '../../../src/components';


function showMessage(title: string, message: string) {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
}

export default function DriverJobQueue() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { topInset, bottomInset, contentMaxWidth, containerPaddingHorizontal } = useResponsive();

  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('ALL');

  // Permanent Trip Details & Completion Modals
  const [selectedTripDetails, setSelectedTripDetails] = useState<TripCardData | null>(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [completionTrip, setCompletionTrip] = useState<TripCardData | null>(null);
  const [completionModalVisible, setCompletionModalVisible] = useState(false);
  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [lightboxPhotoUrl, setLightboxPhotoUrl] = useState('');
  const [lightboxContainerNum, setLightboxContainerNum] = useState('');
  const [networkError, setNetworkError] = useState(false);

  const prevStatusRef = useRef<Record<string, string>>({});
  const notifiedRef = useRef<Set<string>>(new Set());

  const notifyStatusChanges = useCallback((nextTrips: any[]) => {
    const prev = prevStatusRef.current;
    nextTrips.forEach((trip) => {
      const id = trip.id as string;
      const nextStatus = trip.status as string;
      const prevStatus = prev[id];
      const tripNum = trip.tripNumber || `TRP-${id?.slice(0, 6)}`;
      const notifyKey = `${id}:${nextStatus}`;

      if (!prevStatus || notifiedRef.current.has(notifyKey)) return;

      if ((prevStatus === 'PENDING_APPROVAL' || prevStatus === 'PENDING_SUPERVISOR_CONFIRMATION') && (nextStatus === 'SUPERVISOR_CONFIRMED' || nextStatus === 'APPROVED' || nextStatus === 'COMPLETED')) {
        notifiedRef.current.add(notifyKey);
        showMessage('Trip Confirmed', `Supervisor confirmed trip ${tripNum}.\nDriver allowance credited.`);
      }

      if ((prevStatus === 'PENDING_APPROVAL' || prevStatus === 'PENDING_SUPERVISOR_CONFIRMATION') && (nextStatus === 'REJECTED' || nextStatus === 'SUPERVISOR_REJECTED')) {
        notifiedRef.current.add(notifyKey);
        showMessage('Trip Rejected', `Supervisor rejected trip ${tripNum}.\nReason: ${trip.rejectionReason || 'Review required'}`);
      }
    });

    const map: Record<string, string> = {};
    nextTrips.forEach((t) => {
      if (t.id && t.status) map[t.id] = t.status;
    });
    prevStatusRef.current = map;
  }, []);

  const fetchTrips = useCallback(async () => {
    try {
      setNetworkError(false);
      const driverId = user?.driverId || user?.id;
      const driverParam = driverId ? `?driverId=${driverId}` : '';
      const res = await apiClient.get(`/trips${driverParam}`);
      const apiTrips = Array.isArray(res.data) ? res.data : [];
      notifyStatusChanges(apiTrips);
      setTrips(apiTrips);
    } catch (e) {
      console.warn('[DriverTrips] Error fetching trips:', e);
      setNetworkError(true);
      setTrips([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, notifyStatusChanges]);

  useEffect(() => { fetchTrips(); }, [fetchTrips]);
  useFocusEffect(useCallback(() => { fetchTrips(); }, [fetchTrips]));


  const handleStartTrip = async (tripId: string) => {
    try {
      await tripService.startTrip(tripId);
      showMessage('Trip Started', 'Mission is now active. Drive safely.');
      await fetchTrips();
    } catch (err: any) {
      console.error('Failed to start trip:', err);
      showMessage('Start Failed', err?.response?.data?.message || err?.message || 'Server could not start trip. Please try again.');
    }
  };

  const unstartedCount = trips.filter((t) => ['DRAFT', 'SCHEDULED', 'ASSIGNED', 'PENDING_START', 'CREATED', 'READY'].includes(t.status)).length;
  const completedCount = trips.filter((t) => t.status === 'COMPLETED' || t.status === 'APPROVED' || t.status === 'SUPERVISOR_CONFIRMED').length;
  const inProgressCount = trips.filter((t) => t.status === 'IN_PROGRESS').length;
  const pendingCount = trips.filter((t) => t.status === 'PENDING_APPROVAL' || t.status === 'PENDING_SUPERVISOR_CONFIRMATION').length;

  const filteredTrips = trips.filter((t) => {
    if (filter === 'ALL') return true;
    if (filter === 'TO_START') return ['DRAFT', 'SCHEDULED', 'ASSIGNED', 'PENDING_START', 'CREATED', 'READY'].includes(t.status);
    if (filter === 'ACTIVE') return t.status === 'IN_PROGRESS' || ['DRAFT', 'SCHEDULED', 'ASSIGNED', 'PENDING_START', 'CREATED', 'READY'].includes(t.status);
    if (filter === 'PENDING') return t.status === 'PENDING_APPROVAL' || t.status === 'PENDING_SUPERVISOR_CONFIRMATION';
    if (filter === 'DONE') return t.status === 'COMPLETED' || t.status === 'APPROVED' || t.status === 'SUPERVISOR_CONFIRMED';
    return true;
  });

  return (
    <View style={styles.container}>
      {/* ─── Header ─── */}
      <View
        style={[
          styles.header,
          {
            paddingTop: Math.max(topInset, 16),
            paddingHorizontal: containerPaddingHorizontal,
            maxWidth: contentMaxWidth,
            width: '100%',
            alignSelf: 'center',
          },
        ]}
      >
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerSuper}>{new Date().toLocaleDateString('en-LK', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}</Text>
            <Text style={styles.headerTitle}>TODAY'S TRIPS</Text>
          </View>
          <TouchableOpacity
            style={styles.newTripBtn}
            onPress={() => router.push('/(driver)/trips/new')}
          >
            <Ionicons name="add" size={16} color="#FFFFFF" />
            <Text style={styles.newTripBtnText}>DISPATCH</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={[
          styles.scrollInside,
          {
            paddingHorizontal: containerPaddingHorizontal,
            paddingBottom: Math.max(bottomInset + 24, 40),
            maxWidth: contentMaxWidth,
            width: '100%',
            alignSelf: 'center',
          },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchTrips(); }}
            tintColor={colors.primaryContainer}
          />
        }
      >
        {/* ─── Today's Trips Filters Bar ─── */}
        <View style={styles.filterSection}>
          <View style={styles.filterHeader}>
            <Text style={styles.filterTitle}>TODAY'S TRIPS</Text>
            <Text style={styles.filterCountBadge}>{filteredTrips.length} TOTAL</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterPillsScroll}>
            {[
              { id: 'ALL', label: `ALL (${trips.length})` },
              ...(unstartedCount > 0 ? [{ id: 'TO_START', label: `TO START (${unstartedCount})` }] : []),
              { id: 'ACTIVE', label: `ACTIVE (${inProgressCount})` },
              { id: 'PENDING', label: `PENDING (${pendingCount})` },
              { id: 'DONE', label: `DONE (${completedCount})` },
            ].map((f) => {
              const active = filter === f.id;
              return (
                <TouchableOpacity
                  key={f.id}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                  onPress={() => setFilter(f.id)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ─── 5. Job Queue List ─── */}
        {loading ? (
          <ActivityIndicator size="large" color={colors.primaryContainer} style={{ marginTop: 24 }} />
        ) : networkError && trips.length === 0 ? (
          <View style={{ marginHorizontal: 16 }}>
            <NetworkErrorView onRetry={fetchTrips} isRetrying={refreshing} />
          </View>
        ) : filteredTrips.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="cube-outline" size={36} color="#3b494c" />
            <Text style={styles.emptyTitle}>NO JOBS IN QUEUE</Text>
            <Text style={styles.emptySub}>All movements completed or awaiting dispatch from tower.</Text>
          </View>
        ) : (
          filteredTrips.map((trip) => (
            <PermanentTripCard
              key={trip.id}
              trip={trip}
              role="DRIVER"
              onPressDetails={(tripItem) => {
                setSelectedTripDetails(tripItem);
                setDetailsModalVisible(true);
              }}
              onPressStart={(tripItem) => {
                handleStartTrip(tripItem.id);
              }}
              onPressAction={(tripItem) => {
                if (['DRAFT', 'SCHEDULED', 'ASSIGNED', 'PENDING_START', 'CREATED', 'READY'].includes(tripItem.status)) {
                  handleStartTrip(tripItem.id);
                } else {
                  setCompletionTrip(tripItem);
                  setCompletionModalVisible(true);
                }
              }}
              onPressPhoto={(pUrl, cNum) => {
                setLightboxPhotoUrl(pUrl);
                setLightboxContainerNum(cNum);
                setLightboxVisible(true);
              }}
            />
          ))
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <CompleteTripDetailsModal
        visible={detailsModalVisible}
        onClose={() => setDetailsModalVisible(false)}
        trip={selectedTripDetails}
        role="DRIVER"
        onTripUpdated={fetchTrips}
        onOpenPhotoLightbox={(pUrl, cNum) => {
          setLightboxPhotoUrl(pUrl);
          setLightboxContainerNum(cNum);
          setLightboxVisible(true);
        }}
      />

      <DriverTripCompletionModal
        visible={completionModalVisible}
        onClose={() => setCompletionModalVisible(false)}
        trip={completionTrip}
        onTripCompleted={fetchTrips}
      />

      <PhotoLightboxModal
        visible={lightboxVisible}
        onClose={() => setLightboxVisible(false)}
        photoUrl={lightboxPhotoUrl}
        containerNumber={lightboxContainerNum}
        tripId={selectedTripDetails?.tripNumber || selectedTripDetails?.id}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FA',
  },
  header: {
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5EAEC',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerSuper: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7C85',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2D33',
    letterSpacing: 0.3,
  },
  newTripBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#173B70',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  newTripBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  scrollContent: {
    flex: 1,
  },
  scrollInside: {
    padding: spacing.margin,
    gap: 12,
  },

  // Filters Bar
  filterSection: {
    gap: 8,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  filterTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2D33',
  },
  filterCountBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: '#173B70',
  },
  filterPillsScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5EAEC',
  },
  filterChipActive: {
    backgroundColor: '#173B70',
    borderColor: '#173B70',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7C85',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },

  // Job Cards
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 36,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5EAEC',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2D33',
  },
  emptySub: {
    fontSize: 13,
    color: '#6B7C85',
    textAlign: 'center',
  },
  jobCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5EAEC',
    position: 'relative',
    overflow: 'hidden',
  },
  jobBorderIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: '#3b494c',
  },
  jobCardContent: {
    padding: 14,
    paddingLeft: 16,
    gap: 10,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  jobNumText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#173B70',
        letterSpacing: 0.5,
  },
  statusTag: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  statusTagText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  jobTimeText: {
    fontSize: 10,
    color: '#3A567F',
      },
  vesselText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
    letterSpacing: 0.5,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: radius.sm,
  },
  termBox: {
    alignItems: 'center',
  },
  termLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: '#3A567F',
    letterSpacing: 0.5,
  },
  termCode: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1E293B',
        marginTop: 2,
  },
  routeArrow: {
    alignItems: 'center',
    gap: 2,
  },
  routeDist: {
    fontSize: 8,
    fontWeight: '700',
    color: '#173B70',
      },
  containersBox: {
    gap: 8,
  },
  containerItem: {
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: radius.sm,
    gap: 8,
  },
  containerNumText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1E293B',
      },
  isoType: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffd799',
      },
  unloadRow: {
    gap: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#161c25',
  },
  unloadLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: '#3A567F',
    letterSpacing: 0.5,
  },
  termChoice: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5EAEC',
  },
  termChoiceActive: {
    backgroundColor: '#173B70',
    borderColor: '#173B70',
  },
  termChoiceText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6B7C85',
  },
  termChoiceTextActive: {
    color: '#FFFFFF',
  },
  completeBtn: {
    height: 48,
    backgroundColor: '#173B70',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  completeBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  pendingNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0F5FA',
    borderWidth: 1,
    borderColor: '#173B70',
    borderRadius: 8,
    padding: 10,
    marginTop: 4,
  },
  pendingNoticeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#173B70',
    flex: 1,
  },
  approvedNoticeBox: {
    flexDirection: 'column',
    gap: 4,
    backgroundColor: '#E6F6EC',
    borderWidth: 1,
    borderColor: '#1E7A45',
    borderRadius: 8,
    padding: 10,
  },
  approvedNoticeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E7A45',
  },
  approvedNoticeSub: {
    fontSize: 11,
    fontWeight: '500',
    color: '#3A567F',
  },
  arrivedNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(34, 239, 126, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(34, 239, 126, 0.3)',
    borderRadius: radius.sm,
    padding: 10,
  },
  arrivedNoticeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#173B70',
    flex: 1,
  },
  completedNoticeBox: {
    flexDirection: 'column',
    gap: 4,
    backgroundColor: 'rgba(34, 239, 126, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(34, 239, 126, 0.3)',
    borderRadius: radius.sm,
    padding: 10,
    marginTop: 4,
  },
  completedNoticeText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#173B70',
    letterSpacing: 0.5,
  },
  completedNoticeSub: {
    fontSize: 11,
    fontWeight: '600',
    color: '#3A567F',
  },

  // ─── TRIP TIMING DETAILS STYLES ───
  timingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 8,
    marginBottom: 8,
    gap: 8,
  },
  timingCol: {
    flex: 1,
    gap: 2,
  },
  timingColHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 2,
  },
  timingColLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#173B70',
    letterSpacing: 0.5,
  },
  timingDateVal: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1E293B',
  },
  timingTimeVal: {
    fontSize: 13,
    fontWeight: '900',
    color: '#173B70',
    letterSpacing: 0.3,
  },
  timingDividerCol: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 2,
  },
  durationPill: {
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
  durationPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#173B70',
  },
});
