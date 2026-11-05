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
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../../../src/services/api';
import { NetworkErrorView } from '../../../src/components/NetworkErrorView';
import { useAuthStore } from '../../../src/store/authStore';
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
  const [networkError, setNetworkError] = useState(false);

  const fetchContainers = useCallback(async () => {
    try {
      setNetworkError(false);
      const driverId = user?.driverId || user?.id;
      const driverParam = driverId ? `?driverId=${driverId}` : '';
      const res = await apiClient.get(`/trips${driverParam}`);
      const apiTrips = Array.isArray(res.data) ? res.data : [];

      // Flatten all containers from all trips, enriched with trip info
      const allContainers: any[] = [];
      for (const trip of apiTrips) {
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

      setContainers(allContainers);
    } catch (e) {
      console.warn('[DriverContainers] Failed to load live containers:', e);
      setNetworkError(true);
      setContainers([]);
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
    if (label === 'DELIVERED') return { bg: '#E6F6EC', text: '#1E7A45' };
    if (label === 'IN TRANSIT') return { bg: '#F0F5FA', text: '#173B70' };
    if (label === 'DISCHARGED') return { bg: '#F0F5FA', text: '#173B70' };
    return { bg: '#F0F5FA', text: '#173B70' };
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
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#173B70" />}
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
            <Ionicons name="calendar-outline" size={16} color="#173B70" />
            <Text style={styles.dateFilterText}>
              {selectedDate === 'All' ? 'ALL DATES' : selectedDate}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Summary Cards */}
      {!loading && (
        <View style={[styles.summaryRow, { paddingHorizontal: containerPaddingHorizontal }]}>
          <View style={[styles.summaryCard, { borderTopColor: '#173B70' }]}>
            <Text style={[styles.summaryValue, { color: '#173B70', fontSize: isSmallMobile ? 20 : 24 }]}>{ft20}</Text>
            <Text style={styles.summaryLabel}>20FT</Text>
          </View>
          <View style={[styles.summaryCard, { borderTopColor: '#173B70' }]}>
            <Text style={[styles.summaryValue, { color: '#173B70', fontSize: isSmallMobile ? 20 : 24 }]}>{ft40}</Text>
            <Text style={styles.summaryLabel}>40FT</Text>
          </View>
          <View style={[styles.summaryCard, { borderTopColor: '#173B70' }]}>
            <Text style={[styles.summaryValue, { color: '#173B70', fontSize: isSmallMobile ? 20 : 24 }]}>{filteredContainers.length}</Text>
            <Text style={styles.summaryLabel}>TOTAL</Text>
          </View>
        </View>
      )}

      {/* ITT Haulage Capacity Rule Banner */}
      {!loading && (
        <View style={[styles.policyNoticeBox, { marginHorizontal: containerPaddingHorizontal }]}>
          <Ionicons name="information-circle-outline" size={16} color="#173B70" />
          <Text style={styles.policyNoticeText}>
            ITT Haulage Rule: 1 Trip can transport only 1 × 40FT container OR up to 2 × 20FT containers.
          </Text>
        </View>
      )}

      {/* Discharge Terminal Filter & Terminalwise Sorting Carousel */}
      {!loading && (
        <View style={{ marginHorizontal: containerPaddingHorizontal, marginTop: 12, marginBottom: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#1F2D33' }}>
              DISCHARGE TERMINAL
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="funnel-outline" size={12} color="#173B70" />
              <Text style={{ fontSize: 11, fontWeight: '600', color: '#173B70' }}>FILTER</Text>
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
                    paddingVertical: 7,
                    borderRadius: 8,
                    backgroundColor: isActive ? '#173B70' : '#FFFFFF',
                    borderWidth: 1,
                    borderColor: isActive ? '#173B70' : '#E5EAEC',
                  }}
                  onPress={() => setSelectedTerminal(term)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={term === 'All' ? 'layers-outline' : 'boat-outline'}
                    size={13}
                    color={isActive ? '#FFFFFF' : '#6B7C85'}
                  />
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '600',
                      color: isActive ? '#FFFFFF' : '#6B7C85',
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
        <ActivityIndicator size="large" color="#173B70" style={{ marginTop: 30 }} />
      ) : networkError && containers.length === 0 ? (
        <View style={{ marginHorizontal: containerPaddingHorizontal }}>
          <NetworkErrorView onRetry={fetchContainers} isRetrying={refreshing} />
        </View>
      ) : filteredContainers.length === 0 ? (
        <View style={[styles.emptyBox, { marginHorizontal: containerPaddingHorizontal }]}>
          <Ionicons name="cube-outline" size={42} color="#A3B1B8" style={{ marginBottom: 12 }} />
          <Text style={styles.emptyTitle}>NO CONTAINERS</Text>
          <Text style={styles.emptySubtitle}>No containers match the selected filter</Text>
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
                  <Ionicons name="cube-outline" size={18} color="#173B70" />
                  <Text style={[styles.containerNum, { fontSize: isSmallMobile ? 15 : 17 }]}>
                    {(c.containerNumber || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase()}
                  </Text>
                </View>
                <View style={[
                  styles.sizeBadge,
                  { backgroundColor: '#F0F5FA' }
                ]}>
                  <Text style={[
                    styles.sizeText,
                    { color: '#173B70' }
                  ]}>
                    {sizeLabel}
                  </Text>
                </View>
              </View>

              {/* Trip Info */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, marginBottom: 10 }}>
                <Ionicons name="boat-outline" size={14} color="#6B7C85" style={{ marginRight: 6 }} />
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
                <Ionicons name="arrow-forward" size={16} color="#173B70" />
                <View style={styles.termBox}>
                  <Text style={styles.termLabel}>DESTINATION</Text>
                  <Text style={[styles.termValue, { color: '#173B70' }]}>{c.destTerminal || 'JCT'}</Text>
                </View>
              </View>

              {/* Status */}
              <View style={[styles.statusBadge, { backgroundColor: bg }]}>
                <Text style={[styles.statusText, { color: text }]}>{statusLabel}</Text>
              </View>

              {/* Weight if available */}
              {c.weight && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                  <Ionicons name="scale-outline" size={13} color="#6B7C85" style={{ marginRight: 4 }} />
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F9FA' },
  header: {
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5EAEC',
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#1F2D33', letterSpacing: 0.3 },
  headerSub: { color: '#6B7C85', fontSize: 13, marginTop: 2 },
  summaryRow: { flexDirection: 'row', marginTop: 14, gap: 10 },
  summaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderTopWidth: 3,
    borderWidth: 1,
    borderColor: '#E5EAEC',
  },
  summaryValue: { fontSize: 22, fontWeight: '700', color: '#173B70' },
  summaryLabel: { fontSize: 12, color: '#6B7C85', marginTop: 4, fontWeight: '600' },
  policyNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0F5FA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#173B70',
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  policyNoticeText: {
    color: '#173B70',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 36,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    margin: 16,
    borderWidth: 1,
    borderColor: '#E5EAEC',
  },
  emptyIcon: { fontSize: 36, marginBottom: 12 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: '#1F2D33' },
  emptySubtitle: { fontSize: 13, color: '#6B7C85', textAlign: 'center', marginTop: 4 },
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#E5EAEC',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  containerNum: { fontSize: 16, fontWeight: '700', color: '#1F2D33', letterSpacing: 0.5 },
  sizeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  sizeText: { fontSize: 12, fontWeight: '700' },
  tripName: { fontSize: 13, color: '#6B7C85', fontWeight: '500' },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F7F9FA',
    padding: 12,
    borderRadius: 8,
    marginTop: 6,
  },
  termBox: { alignItems: 'center', flex: 1 },
  termLabel: { fontSize: 10, color: '#6B7C85', fontWeight: '700', letterSpacing: 0.5 },
  termValue: { fontSize: 15, fontWeight: '700', color: '#1F2D33', marginTop: 2 },
  arrow: { fontSize: 18, color: '#173B70', fontWeight: '700' },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginTop: 10 },
  statusText: { fontSize: 12, fontWeight: '600', letterSpacing: 0.3 },
  weightText: { fontSize: 12, color: '#6B7C85', marginTop: 8, fontWeight: '600' },

  dateFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5EAEC',
  },
  dateFilterText: { color: '#173B70', fontSize: 12, fontWeight: '700' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    width: '92%',
    maxWidth: 360,
    borderWidth: 1,
    borderColor: '#E5EAEC',
  },
  modalTitle: { color: '#1F2D33', fontSize: 16, fontWeight: '700', marginBottom: 16, textAlign: 'center' },
  dateOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#F7F9FA',
    borderWidth: 1,
    borderColor: '#E5EAEC',
  },
  dateOptionActive: { backgroundColor: '#F0F5FA', borderColor: '#173B70' },
  dateOptionText: { color: '#6B7C85', fontSize: 14, fontWeight: '600', textAlign: 'center' },
  dateOptionTextActive: { color: '#173B70', fontWeight: '700' },
  modalCloseBtn: {
    marginTop: 16,
    backgroundColor: '#173B70',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCloseText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});
