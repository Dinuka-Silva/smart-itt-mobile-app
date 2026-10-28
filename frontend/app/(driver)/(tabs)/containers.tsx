import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
} from 'react-native';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import API_BASE_URL from '../../../src/config/api';
import { useAuthStore } from '../../../src/store/authStore';
import { colors } from '../../../src/theme';
import { useMockTripStore } from '../../../src/store/mockTripStore';
import { useFocusEffect } from 'expo-router';
import { useResponsive } from '../../../src/hooks/useResponsive';

const ALL_TERMINALS = ['All', 'CICT', 'CWIT', 'ECT', 'JCT', 'SAGT', 'UCT'] as const;

export default function DriverContainers() {
  const user = useAuthStore((s) => s.user);
  const { topInset, bottomInset, contentMaxWidth, containerPaddingHorizontal, isSmallMobile } = useResponsive();
  const [containers, setContainers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('All');
  const [selectedTerminal, setSelectedTerminal] = useState<string>('All');

  const fetchContainers = useCallback(async () => {
    try {
      const driverId = user?.driverId || user?.id || 'demo-driver';
      const demoTrips = useMockTripStore.getState().getTripsForDriver(driverId);

      const driverParam = user?.driverId ? `?driverId=${user.driverId}` : '';
      const res = await axios.get(`${API_BASE_URL}/trips${driverParam}`);
      const apiTrips = Array.isArray(res.data) ? res.data : [];

      const byId = new Map<string, any>();
      apiTrips.forEach((t) => byId.set(t.id, t));
      demoTrips.forEach((t) => { if (!byId.has(t.id)) byId.set(t.id, t); });
      const mergedTrips = Array.from(byId.values());

      // Flatten all containers from all trips, enriched with trip info
      const allContainers: any[] = [];
      for (const trip of mergedTrips) {
        for (const c of trip.containers || []) {
          allContainers.push({
            ...c,
            tripNumber: trip.tripNumber,
            vesselName: trip.vesselName,
            sourceTerminal: trip.sourceTerminal,
            destTerminal: c.destTerminal || trip.destTerminal,
            tripStatus: trip.status,
            tripDate: trip.operationDate || trip.createdAt || trip.startTime || new Date().toISOString(),
          });
        }
      }

      if (allContainers.length > 0) {
        setContainers(allContainers);
      } else {
        setContainers(getFallbackContainers());
      }
    } catch {
      const driverId = user?.driverId || user?.id || 'demo-driver';
      const demoTrips = useMockTripStore.getState().getTripsForDriver(driverId);
      const allContainers: any[] = [];
      for (const trip of demoTrips) {
        for (const c of trip.containers || []) {
          allContainers.push({
            ...c,
            tripNumber: trip.tripNumber,
            vesselName: trip.vesselName,
            sourceTerminal: trip.sourceTerminal,
            destTerminal: c.destTerminal || trip.destTerminal,
            tripStatus: trip.status,
            tripDate: trip.operationDate || trip.createdAt || trip.startTime || new Date().toISOString(),
          });
        }
      }
      if (allContainers.length > 0) {
        setContainers(allContainers);
      } else {
        setContainers(getFallbackContainers());
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => { fetchContainers(); }, [fetchContainers]);
  useFocusEffect(useCallback(() => { fetchContainers(); }, [fetchContainers]));

  const onRefresh = () => { setRefreshing(true); fetchContainers(); };

  const filteredContainers = useMemo(() => {
    return containers
      .filter((c) => {
        if (selectedDate !== 'All' && !c.tripDate?.startsWith(selectedDate)) return false;
        if (selectedTerminal !== 'All') {
          const dest = (c.destTerminal || '').toUpperCase();
          if (dest !== selectedTerminal.toUpperCase()) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const termCmp = (a.destTerminal || '').localeCompare(b.destTerminal || '');
        if (termCmp !== 0) return termCmp;
        return (b.tripDate || '').localeCompare(a.tripDate || '');
      });
  }, [containers, selectedDate, selectedTerminal]);

  const ft20 = filteredContainers.filter((c: any) => (c.size || '').includes('20')).length;
  const ft40 = filteredContainers.filter((c: any) => (c.size || '').includes('40')).length;

  const getStatusLabel = (containerStatus: string, tripStatus: string) => {
    if (tripStatus === 'COMPLETED' || tripStatus === 'APPROVED') return 'DELIVERED';
    if (containerStatus === 'IN_TRANSIT') return 'IN TRANSIT';
    if (containerStatus === 'DISCHARGED') return 'DISCHARGED';
    return 'LOADED';
  };

  const getStatusColor = (label: string) => {
    if (label === 'DELIVERED') return { bg: 'rgba(34, 239, 126, 0.15)', text: '#22ef7e' };
    if (label === 'IN TRANSIT') return { bg: 'rgba(0, 229, 255, 0.15)', text: '#00e5ff' };
    if (label === 'DISCHARGED') return { bg: 'rgba(254, 179, 0, 0.15)', text: '#feb300' };
    return { bg: 'rgba(254, 179, 0, 0.15)', text: '#feb300' };
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{
        maxWidth: contentMaxWidth,
        width: '100%',
        alignSelf: 'center',
        paddingBottom: Math.max(bottomInset + 24, 40),
      }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00e5ff" />}
    >
      <View
        style={[
          styles.header,
          {
            paddingTop: Math.max(topInset, 16),
            paddingHorizontal: containerPaddingHorizontal,
          },
        ]}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <View>
            <Text style={styles.headerTitle}>CONTAINERS</Text>
            <Text style={styles.headerSub}>
              {loading ? 'Loading...' : `${filteredContainers.length} total containers`}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.dateFilterBtn}
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons name="calendar" size={16} color="#00e5ff" />
            <Text style={styles.dateFilterText}>
              {selectedDate === 'All' ? 'ALL DATES' : selectedDate}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Summary Cards */}
      {!loading && (
        <View style={[styles.summaryRow, { paddingHorizontal: containerPaddingHorizontal }]}>
          <View style={[styles.summaryCard, { borderLeftColor: '#00e5ff' }]}>
            <Text style={[styles.summaryValue, { color: '#00e5ff', fontSize: isSmallMobile ? 20 : 26 }]}>{ft20}</Text>
            <Text style={styles.summaryLabel}>20FT</Text>
          </View>
          <View style={[styles.summaryCard, { borderLeftColor: '#feb300' }]}>
            <Text style={[styles.summaryValue, { color: '#feb300', fontSize: isSmallMobile ? 20 : 26 }]}>{ft40}</Text>
            <Text style={styles.summaryLabel}>40FT</Text>
          </View>
          <View style={[styles.summaryCard, { borderLeftColor: '#22ef7e' }]}>
            <Text style={[styles.summaryValue, { color: '#22ef7e', fontSize: isSmallMobile ? 20 : 26 }]}>{filteredContainers.length}</Text>
            <Text style={styles.summaryLabel}>TOTAL</Text>
          </View>
        </View>
      )}

      {/* ITT Haulage Capacity Rule Banner */}
      {!loading && (
        <View style={[styles.policyNoticeBox, { marginHorizontal: containerPaddingHorizontal }]}>
          <Ionicons name="information-circle" size={15} color="#00e5ff" />
          <Text style={styles.policyNoticeText}>
            ITT Haulage Rule: 1 Trip can transport only 1 × 40FT container OR up to 2 × 20FT containers.
          </Text>
        </View>
      )}

      {/* Discharge Terminal Filter & Terminalwise Sorting Carousel */}
      {!loading && (
        <View style={{ marginHorizontal: containerPaddingHorizontal, marginTop: 10, marginBottom: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, flexWrap: 'wrap', gap: 6 }}>
            <Text style={{ fontSize: 10, fontWeight: '800', color: '#849396', letterSpacing: 0.6 }}>
              DISCHARGE TERMINAL FILTER & SORT
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="swap-vertical" size={11} color="#00e5ff" />
              <Text style={{ fontSize: 9, fontWeight: '800', color: '#00e5ff' }}>SORTED: DISCHARGE TERMINAL</Text>
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
            {ALL_TERMINALS.map((term) => {
              const isActive = selectedTerminal === term;
              return (
                <TouchableOpacity
                  key={term}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 6,
                    backgroundColor: isActive ? '#00e5ff' : '#161c25',
                    borderWidth: 1,
                    borderColor: isActive ? '#00e5ff' : '#242a34',
                  }}
                  onPress={() => setSelectedTerminal(term)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={term === 'All' ? 'layers' : 'boat'}
                    size={12}
                    color={isActive ? '#00363d' : '#849396'}
                  />
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '800',
                      color: isActive ? '#00363d' : '#dde2f0',
                    }}
                  >
                    {term === 'All' ? 'ALL TERMINALS' : term}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" color="#00e5ff" style={{ marginTop: 30 }} />
      ) : filteredContainers.length === 0 ? (
        <View style={[styles.emptyBox, { marginHorizontal: containerPaddingHorizontal }]}>
          <Ionicons name="cube-outline" size={42} color="#849396" style={{ marginBottom: 12 }} />
          <Text style={styles.emptyTitle}>NO CONTAINERS</Text>
          <Text style={styles.emptySubtitle}>No containers match the selected date</Text>
        </View>
      ) : (
        filteredContainers.map((c: any, idx: number) => {
          const statusLabel = getStatusLabel(c.status || '', c.tripStatus || '');
          const { bg, text } = getStatusColor(statusLabel);
          const sizeLabel = (c.size || 'FT_40').replace('FT_', '') + 'FT';

          return (
            <View
              key={c.id || idx}
              style={[
                styles.card,
                {
                  marginHorizontal: containerPaddingHorizontal,
                  padding: isSmallMobile ? 12 : 16,
                },
              ]}
            >
              {/* Container Number + Size */}
              <View style={[styles.cardHeader, { flexWrap: 'wrap', gap: 8 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}>
                  <Ionicons name="cube" size={16} color="#00e5ff" />
                  <Text style={[styles.containerNum, { fontSize: isSmallMobile ? 14 : 16 }]}>
                    {(c.containerNumber || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase()}
                  </Text>
                </View>
                <View style={[
                  styles.sizeBadge,
                  { backgroundColor: sizeLabel.startsWith('20') ? 'rgba(0, 229, 255, 0.15)' : 'rgba(254, 179, 0, 0.15)' }
                ]}>
                  <Text style={[
                    styles.sizeText,
                    { color: sizeLabel.startsWith('20') ? '#00e5ff' : '#feb300' }
                  ]}>
                    {sizeLabel}
                  </Text>
                </View>
              </View>

              {/* Trip Info */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <Ionicons name="boat" size={13} color="#feb300" style={{ marginRight: 6 }} />
                <Text style={styles.tripName}>
                  {c.vesselName || 'Vessel'} — {c.tripNumber || 'Trip'}
                </Text>
              </View>

              {/* Route */}
              <View style={styles.routeRow}>
                <View style={styles.termBox}>
                  <Text style={styles.termLabel}>ORIGIN</Text>
                  <Text style={styles.termValue}>{c.sourceTerminal || 'ECT'}</Text>
                </View>
                <Ionicons name="arrow-forward" size={16} color="#00e5ff" />
                <View style={styles.termBox}>
                  <Text style={styles.termLabel}>DESTINATION</Text>
                  <Text style={styles.termValue}>{c.destTerminal || 'JCT'}</Text>
                </View>
              </View>

              {/* Status */}
              <View style={[styles.statusBadge, { backgroundColor: bg }]}>
                <Text style={[styles.statusText, { color: text }]}>{statusLabel}</Text>
              </View>

              {/* Weight if available */}
              {c.weight && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                  <Ionicons name="scale-outline" size={13} color="#849396" style={{ marginRight: 4 }} />
                  <Text style={styles.weightText}>Weight: {c.weight}T</Text>
                </View>
              )}
            </View>
          );
        })
      )}

      <Modal
        visible={showDatePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Date Filter</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              <TouchableOpacity
                style={[styles.dateOption, selectedDate === 'All' && styles.dateOptionActive]}
                onPress={() => {
                  setSelectedDate('All');
                  setShowDatePicker(false);
                }}
              >
                <Text style={[styles.dateOptionText, selectedDate === 'All' && styles.dateOptionTextActive]}>
                  All Dates
                </Text>
              </TouchableOpacity>
              {Array.from({ length: 15 }).map((_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const dStr = d.toISOString().split('T')[0];
                const displayStr = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                const isSelected = selectedDate === dStr;
                return (
                  <TouchableOpacity
                    key={dStr}
                    style={[styles.dateOption, isSelected && styles.dateOptionActive]}
                    onPress={() => {
                      setSelectedDate(dStr);
                      setShowDatePicker(false);
                    }}
                  >
                    <Text style={[styles.dateOptionText, isSelected && styles.dateOptionTextActive]}>
                      {displayStr} {i === 0 ? '(Today)' : ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowDatePicker(false)}>
              <Text style={styles.modalCloseText}>CLOSE</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function getFallbackContainers() {
  return [
    {
      id: 'fb-1',
      containerNumber: 'MSCU7721892',
      size: 'FT_40',
      tripNumber: 'TRP-1001',
      vesselName: 'MSC Aurora',
      sourceTerminal: 'ECT',
      destTerminal: 'JCT',
      status: 'IN_TRANSIT',
      tripStatus: 'IN_PROGRESS',
    },
    {
      id: 'fb-2',
      containerNumber: 'MSKU4412091',
      size: 'FT_20',
      tripNumber: 'TRP-1002',
      vesselName: 'Maersk Line',
      sourceTerminal: 'JCT',
      destTerminal: 'UCT',
      status: 'LOADED',
      tripStatus: 'COMPLETED',
    },
  ];
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0e141d' },
  header: {
    paddingBottom: 12,
    backgroundColor: 'rgba(14, 20, 29, 0.96)', borderBottomWidth: 1, borderBottomColor: '#1a2029',
  },
  headerTitle: { fontSize: 18, fontWeight: '900', color: '#dde2f0', letterSpacing: 0.8 },
  headerSub: { color: '#849396', fontSize: 13, marginTop: 4 },
  summaryRow: { flexDirection: 'row', marginTop: 14, gap: 8 },
  summaryCard: {
    flex: 1, backgroundColor: '#161c25', borderRadius: 8, padding: 10,
    borderLeftWidth: 4, borderWidth: 1, borderColor: '#242a34',
  },
  summaryValue: { fontSize: 24, fontWeight: '900' },
  summaryLabel: { fontSize: 11, color: '#849396', marginTop: 4, fontWeight: '800' },
  policyNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0, 229, 255, 0.08)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.25)',
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  policyNoticeText: {
    color: '#00e5ff',
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
  },
  emptyBox: {
    alignItems: 'center', justifyContent: 'center', padding: 36,
    backgroundColor: '#161c25', borderRadius: 8, margin: 16, borderWidth: 1, borderColor: '#242a34',
  },
  emptyIcon: { fontSize: 36, marginBottom: 12 },
  emptyTitle: { fontSize: 14, fontWeight: '800', color: '#dde2f0', letterSpacing: 0.8 },
  emptySubtitle: { fontSize: 11, color: '#849396', textAlign: 'center', marginTop: 6 },
  card: {
    backgroundColor: '#161c25', marginHorizontal: 16, borderRadius: 8,
    padding: 16, marginBottom: 12, marginTop: 12, borderWidth: 1, borderColor: '#242a34',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  containerNum: { fontSize: 16, fontWeight: '900', color: '#00e5ff', letterSpacing: 0.5 },
  sizeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 },
  sizeText: { fontSize: 11, fontWeight: '800' },
  tripName: { fontSize: 13, color: '#dde2f0', marginTop: 8, fontWeight: '800' },
  routeRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#080e17', padding: 10, borderRadius: 6, marginTop: 10,
  },
  termBox: { alignItems: 'center', flex: 1 },
  termLabel: { fontSize: 8, color: '#849396', fontWeight: '700', letterSpacing: 0.5 },
  termValue: { fontSize: 14, fontWeight: '900', color: '#dde2f0', marginTop: 2 },
  arrow: { fontSize: 18, color: '#00e5ff', fontWeight: '900' },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 4, marginTop: 10 },
  statusText: { fontSize: 11, fontWeight: '900', letterSpacing: 0.6 },
  weightText: { fontSize: 12, color: '#849396', marginTop: 8, fontWeight: '700' },

  dateFilterBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#161c25', paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 8, borderWidth: 1, borderColor: '#242a34',
  },
  dateFilterText: { color: '#00e5ff', fontSize: 11, fontWeight: '800' },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(8, 14, 23, 0.8)',
    justifyContent: 'center', alignItems: 'center', padding: 20,
  },
  modalContent: {
    backgroundColor: '#161c25', borderRadius: 12, padding: 16,
    width: '92%', maxWidth: 360, borderWidth: 1, borderColor: '#242a34',
  },
  modalTitle: { color: '#dde2f0', fontSize: 16, fontWeight: '900', marginBottom: 16, textAlign: 'center' },
  dateOption: {
    paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8,
    marginBottom: 8, backgroundColor: '#080e17', borderWidth: 1, borderColor: '#242a34',
  },
  dateOptionActive: { backgroundColor: 'rgba(0, 229, 255, 0.15)', borderColor: '#00e5ff' },
  dateOptionText: { color: '#849396', fontSize: 14, fontWeight: '700', textAlign: 'center' },
  dateOptionTextActive: { color: '#00e5ff' },
  modalCloseBtn: {
    marginTop: 16, backgroundColor: '#242a34', paddingVertical: 12,
    borderRadius: 8, alignItems: 'center',
  },
  modalCloseText: { color: '#dde2f0', fontSize: 13, fontWeight: '900' },
});
