import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { adminService } from '../../src/services/adminService';
import { securityAuditService } from '../../src/services/securityAuditService';
import { useResponsive } from '../../src/hooks/useResponsive';

type FilterType = 'ALL' | 'LOGINS' | 'DRIVER' | 'SUPERVISOR' | 'ADMIN' | 'SECURITY' | 'TRIP' | 'VEHICLE';

export default function AdminAuditScreen() {
  const router = useRouter();
  const { topInset, bottomInset, containerPaddingHorizontal } = useResponsive();

  const [allLogs, setAllLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchAuditLogs = useCallback(async () => {
    try {
      // 1. Fetch on-device mobile security & login audit logs
      const mobileLogs = await securityAuditService.getRecentEvents();
      const mappedMobile = mobileLogs.map((m) => {
        const role = (m.role || (m.metadata?.role) || (m.description.includes('DRIVER') ? 'DRIVER' : m.description.includes('SUPERVISOR') ? 'SUPERVISOR' : m.description.includes('ADMIN') ? 'ADMIN' : 'SYSTEM')).toUpperCase();
        return {
          id: m.id,
          action: m.type,
          entityType: role,
          actorRole: role,
          performedBy: m.username || 'SYSTEM',
          description: m.description,
          createdAt: m.timestamp,
          severity: m.severity,
          metadata: m.metadata,
        };
      });

      // 2. Fetch server-side database audit logs
      let serverLogs: any[] = [];
      try {
        const data = await adminService.getAuditLogs(0, 100);
        const serverRaw = data?.content || (Array.isArray(data) ? data : []);
        serverLogs = serverRaw.map((s: any) => ({
          id: s.id?.toString() || `srv-${Math.random()}`,
          action: s.action || 'ACTION',
          entityType: (s.entityType || s.actorRole || 'SYSTEM').toUpperCase(),
          actorRole: (s.actorRole || 'SYSTEM').toUpperCase(),
          performedBy: s.actorRole || 'USER',
          description: s.description || 'System action executed',
          createdAt: s.createdAt,
          entityId: s.entityId,
          oldValue: s.oldValue,
          newValue: s.newValue,
          ipAddress: s.ipAddress,
        }));
      } catch {
        serverLogs = [];
      }

      // Merge and sort newest first
      const combined = [...mappedMobile, ...serverLogs].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      // Deduplicate by ID if any overlap
      const seen = new Set<string>();
      const deduplicated = combined.filter((item) => {
        if (!item.id || seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      });

      setAllLogs(deduplicated);
    } catch {
      setAllLogs([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAuditLogs();
  };

  // Metrics KPI calculations
  const totalLogsCount = allLogs.length;
  const loginLogsCount = useMemo(
    () => allLogs.filter((l) => (l.action || '').toUpperCase().includes('LOGIN')).length,
    [allLogs]
  );
  const driverEventsCount = useMemo(
    () =>
      allLogs.filter(
        (l) =>
          (l.actorRole || '').toUpperCase() === 'DRIVER' ||
          (l.entityType || '').toUpperCase() === 'DRIVER' ||
          (l.description || '').toUpperCase().includes('DRIVER')
      ).length,
    [allLogs]
  );
  const supervisorEventsCount = useMemo(
    () =>
      allLogs.filter(
        (l) =>
          (l.actorRole || '').toUpperCase() === 'SUPERVISOR' ||
          (l.entityType || '').toUpperCase() === 'SUPERVISOR' ||
          (l.description || '').toUpperCase().includes('SUPERVISOR')
      ).length,
    [allLogs]
  );
  const adminEventsCount = useMemo(
    () =>
      allLogs.filter(
        (l) =>
          (l.actorRole || '').toUpperCase() === 'ADMIN' ||
          (l.entityType || '').toUpperCase() === 'ADMIN' ||
          (l.description || '').toUpperCase().includes('ADMIN')
      ).length,
    [allLogs]
  );
  const tripOperationsCount = useMemo(
    () =>
      allLogs.filter(
        (l) =>
          (l.action || '').toUpperCase().includes('TRIP') ||
          (l.entityType || '').toUpperCase() === 'TRIP' ||
          (l.description || '').toUpperCase().includes('TRIP')
      ).length,
    [allLogs]
  );

  // Filtered logs computation
  const filteredLogs = useMemo(() => {
    return allLogs.filter((log) => {
      const act = (log.action || '').toUpperCase();
      const role = (log.actorRole || '').toUpperCase();
      const entity = (log.entityType || '').toUpperCase();
      const desc = (log.description || '').toUpperCase();

      // 1. Category Filter
      if (activeFilter === 'LOGINS') {
        if (!act.includes('LOGIN')) return false;
      } else if (activeFilter === 'DRIVER') {
        if (role !== 'DRIVER' && entity !== 'DRIVER' && !desc.includes('DRIVER')) return false;
      } else if (activeFilter === 'SUPERVISOR') {
        if (role !== 'SUPERVISOR' && entity !== 'SUPERVISOR' && !desc.includes('SUPERVISOR')) return false;
      } else if (activeFilter === 'ADMIN') {
        if (role !== 'ADMIN' && entity !== 'ADMIN' && !desc.includes('ADMIN')) return false;
      } else if (activeFilter === 'SECURITY') {
        if (
          !act.includes('LOCKOUT') &&
          !act.includes('PASSWORD') &&
          !act.includes('SECURITY') &&
          !act.includes('POLICY') &&
          entity !== 'MOBILE_SECURITY'
        ) {
          return false;
        }
      } else if (activeFilter === 'TRIP') {
        if (entity !== 'TRIP' && !act.includes('TRIP') && !desc.includes('TRIP')) return false;
      } else if (activeFilter === 'VEHICLE') {
        if (entity !== 'VEHICLE' && !act.includes('VEHICLE') && !desc.includes('VEHICLE')) return false;
      }

      // 2. Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toUpperCase();
        const user = (log.performedBy || '').toUpperCase();
        const refId = (log.entityId || '').toUpperCase();
        const combinedText = `${act} ${role} ${entity} ${desc} ${user} ${refId}`;
        if (!combinedText.includes(q)) return false;
      }

      return true;
    });
  }, [allLogs, activeFilter, searchQuery]);

  const formatTimestamp = (iso: string) => {
    if (!iso) return 'Just now';
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'DRIVER':
        return { bg: 'rgba(0, 229, 255, 0.12)', border: 'rgba(0, 229, 255, 0.35)', color: '#00e5ff', icon: 'car-sport-outline' as const };
      case 'SUPERVISOR':
        return { bg: 'rgba(254, 179, 0, 0.12)', border: 'rgba(254, 179, 0, 0.35)', color: '#feb300', icon: 'shield-outline' as const };
      case 'ADMIN':
        return { bg: 'rgba(179, 136, 255, 0.15)', border: 'rgba(179, 136, 255, 0.4)', color: '#b388ff', icon: 'key-outline' as const };
      default:
        return { bg: 'rgba(144, 202, 249, 0.12)', border: 'rgba(144, 202, 249, 0.3)', color: '#90caf9', icon: 'hardware-chip-outline' as const };
    }
  };

  const getActionBadgeStyle = (action: string) => {
    const act = (action || '').toUpperCase();
    if (act === 'LOGIN_SUCCESS') {
      return { bg: 'rgba(34, 239, 126, 0.1)', border: 'rgba(34, 239, 126, 0.35)', color: '#22ef7e', label: 'LOGIN SUCCESS', icon: 'checkmark-circle' as const };
    }
    if (act === 'LOGIN_FAILED') {
      return { bg: 'rgba(255, 82, 82, 0.12)', border: 'rgba(255, 82, 82, 0.35)', color: '#ff5252', label: 'LOGIN FAILED', icon: 'close-circle' as const };
    }
    if (act === 'LOGIN_BLOCKED_SUSPENDED' || act.includes('SUSPEND')) {
      return { bg: 'rgba(255, 82, 82, 0.15)', border: 'rgba(255, 82, 82, 0.45)', color: '#ff5252', label: 'LOGIN BLOCKED (SUSPENDED)', icon: 'ban' as const };
    }
    if (act === 'LOCKOUT_TRIGGERED') {
      return { bg: 'rgba(255, 145, 0, 0.12)', border: 'rgba(255, 145, 0, 0.4)', color: '#ff9100', label: 'LOCKOUT TRIGGERED', icon: 'lock-closed' as const };
    }
    if (act === 'PASSWORD_CHANGED' || act === 'RESET_DRIVER_PASSWORD') {
      return { bg: 'rgba(254, 179, 0, 0.12)', border: 'rgba(254, 179, 0, 0.4)', color: '#feb300', label: 'PASSWORD RESET', icon: 'key' as const };
    }
    if (act === 'SESSION_AUTO_LOCKED' || act === 'LOGOUT') {
      return { bg: 'rgba(144, 202, 249, 0.1)', border: 'rgba(144, 202, 249, 0.3)', color: '#90caf9', label: 'SESSION LOGOUT', icon: 'log-out-outline' as const };
    }
    if (act === 'DRIVER_REGISTERED') {
      return { bg: 'rgba(0, 229, 255, 0.14)', border: 'rgba(0, 229, 255, 0.45)', color: '#00e5ff', label: 'DRIVER REGISTERED', icon: 'person-add' as const };
    }
    if (act === 'SUPERVISOR_REGISTERED') {
      return { bg: 'rgba(254, 179, 0, 0.15)', border: 'rgba(254, 179, 0, 0.45)', color: '#feb300', label: 'SUPERVISOR REGISTERED', icon: 'shield-checkmark' as const };
    }
    if (act === 'TRIP_STARTED') {
      return { bg: 'rgba(33, 150, 243, 0.15)', border: 'rgba(33, 150, 243, 0.45)', color: '#29b6f6', label: 'TRIP STARTED', icon: 'navigate' as const };
    }
    if (act === 'TRIP_COMPLETED') {
      return { bg: 'rgba(0, 200, 160, 0.15)', border: 'rgba(0, 200, 160, 0.45)', color: '#26a69a', label: 'TRIP COMPLETED', icon: 'flag' as const };
    }
    if (act === 'TRIP_APPROVED') {
      return { bg: 'rgba(34, 239, 126, 0.15)', border: 'rgba(34, 239, 126, 0.45)', color: '#22ef7e', label: 'TRIP APPROVED', icon: 'checkmark-done-circle' as const };
    }
    if (act === 'TRIP_REJECTED') {
      return { bg: 'rgba(255, 82, 82, 0.16)', border: 'rgba(255, 82, 82, 0.5)', color: '#ff5252', label: 'TRIP REJECTED', icon: 'close-circle' as const };
    }
    if (act === 'DRIVER_STATUS_UPDATED' || act === 'SUPERVISOR_STATUS_UPDATED') {
      return { bg: 'rgba(255, 179, 0, 0.15)', border: 'rgba(255, 179, 0, 0.45)', color: '#ffb300', label: act.replace(/_/g, ' '), icon: 'swap-horizontal' as const };
    }
    return { bg: 'rgba(0, 229, 255, 0.08)', border: 'rgba(0, 229, 255, 0.25)', color: '#00e5ff', label: action.replace(/_/g, ' '), icon: 'ellipse' as const };
  };

  return (
    <View style={styles.root}>
      {/* ─── HEADER ─── */}
      <View style={[styles.header, { paddingTop: Math.max(topInset, 16) }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={20} color="#00e5ff" />
          </TouchableOpacity>
          <View style={{ marginLeft: 10 }}>
            <Text style={styles.headerTitle}>System Audit Trail</Text>
            <Text style={styles.headerSubtitle}>Complete Driver & Supervisor Operations & Login Audit Trail</Text>
          </View>
        </View>

        <View style={styles.lockBadge}>
          <Ionicons name="shield-checkmark" size={13} color="#22ef7e" style={{ marginRight: 4 }} />
          <Text style={styles.lockBadgeText}>SECURE LEDGER</Text>
        </View>
      </View>

      {/* ─── OPERATIONS TELEMETRY KPI SUMMARY BAR ─── */}
      <View style={styles.kpiRow}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>TOTAL EVENTS</Text>
          <Text style={[styles.kpiValue, { color: '#00e5ff' }]}>{totalLogsCount}</Text>
          <Text style={styles.kpiSub}>System Ledger</Text>
        </View>

        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>DRIVER OPS</Text>
          <Text style={[styles.kpiValue, { color: '#00e5ff' }]}>{driverEventsCount}</Text>
          <Text style={styles.kpiSub}>Trips & Regs</Text>
        </View>

        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>SUPERVISORS</Text>
          <Text style={[styles.kpiValue, { color: '#feb300' }]}>{supervisorEventsCount}</Text>
          <Text style={styles.kpiSub}>Approvals & Regs</Text>
        </View>

        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>LOGINS</Text>
          <Text style={[styles.kpiValue, { color: '#b388ff' }]}>{loginLogsCount}</Text>
          <Text style={styles.kpiSub}>Auth Events</Text>
        </View>
      </View>

      {/* ─── SEARCH BAR ─── */}
      <View style={styles.searchBarWrap}>
        <Ionicons name="search" size={16} color="#849396" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by User, Driver Code (DRV-00001), SUP, Action..."
          placeholderTextColor="#546e7a"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close-circle" size={16} color="#849396" />
          </TouchableOpacity>
        )}
      </View>

      {/* ─── FILTER TABS ─── */}
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, gap: 6 }}>
          {(['ALL', 'DRIVER', 'SUPERVISOR', 'TRIP', 'LOGINS', 'ADMIN', 'SECURITY', 'VEHICLE'] as FilterType[]).map((f) => {
            const isActive = activeFilter === f;
            const filterLabels: Record<FilterType, string> = {
              ALL: `ALL (${totalLogsCount})`,
              DRIVER: `DRIVERS (${driverEventsCount})`,
              SUPERVISOR: `SUPERVISORS (${supervisorEventsCount})`,
              TRIP: `TRIPS (${tripOperationsCount})`,
              LOGINS: `LOGINS (${loginLogsCount})`,
              ADMIN: `ADMIN (${adminEventsCount})`,
              SECURITY: 'SECURITY',
              VEHICLE: 'FLEET',
            };
            return (
              <TouchableOpacity
                key={f}
                style={[styles.filterPill, isActive && styles.filterPillActive]}
                onPress={() => setActiveFilter(f)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>
                  {filterLabels[f]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ─── LOGS LIST CONTENT ─── */}
      {loading && !refreshing ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#00e5ff" />
          <Text style={styles.loadingText}>Loading system audit logs...</Text>
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
          {filteredLogs.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="shield-outline" size={38} color="#546e7a" />
              <Text style={styles.emptyCardTitle}>No Audit Records Found</Text>
              <Text style={styles.emptyCardText}>
                No audit events match the current filter or search criteria.
              </Text>
            </View>
          ) : (
            filteredLogs.map((log: any, idx: number) => {
              const roleBadge = getRoleBadgeStyle(log.actorRole || log.entityType);
              const actionBadge = getActionBadgeStyle(log.action);
              const timeDisplay = formatTimestamp(log.createdAt);

              return (
                <View key={log.id || idx} style={styles.logCard}>
                  {/* Top Badges Row */}
                  <View style={styles.cardHeaderRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      {/* Role Pill */}
                      <View style={[styles.rolePill, { backgroundColor: roleBadge.bg, borderColor: roleBadge.border }]}>
                        <Ionicons name={roleBadge.icon} size={11} color={roleBadge.color} style={{ marginRight: 4 }} />
                        <Text style={[styles.rolePillText, { color: roleBadge.color }]}>
                          {log.actorRole || log.entityType || 'SYSTEM'}
                        </Text>
                      </View>

                      {/* Action Pill */}
                      <View style={[styles.actionPill, { backgroundColor: actionBadge.bg, borderColor: actionBadge.border }]}>
                        <Ionicons name={actionBadge.icon} size={11} color={actionBadge.color} style={{ marginRight: 4 }} />
                        <Text style={[styles.actionPillText, { color: actionBadge.color }]}>
                          {actionBadge.label}
                        </Text>
                      </View>
                    </View>

                    {/* Timestamp */}
                    <Text style={styles.timeText}>{timeDisplay}</Text>
                  </View>

                  {/* Description Box */}
                  <Text style={styles.descText}>{log.description || 'System event recorded'}</Text>

                  {/* Bottom Metadata Footer */}
                  <View style={styles.cardFooterRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <Ionicons name="person-circle-outline" size={13} color="#849396" />
                      <Text style={styles.actorText}>
                        User:{' '}
                        <Text style={{ color: '#dde2f0', fontWeight: '700' }}>
                          {log.performedBy || log.actorRole || 'System'}
                        </Text>
                      </Text>
                    </View>

                    {log.entityId ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Ionicons name="link-outline" size={12} color="#546e7a" />
                        <Text style={styles.entityIdText}>
                          Ref: {log.entityId.length > 16 ? `${log.entityId.slice(0, 14)}...` : log.entityId}
                        </Text>
                      </View>
                    ) : (
                      <Text style={styles.entityIdText}>Immutable Audit Entry</Text>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}
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
    paddingBottom: 14,
    backgroundColor: '#0c1524',
    borderBottomWidth: 1,
    borderBottomColor: '#1d2e47',
  },
  backBtn: {
    padding: 7,
    backgroundColor: 'rgba(0, 229, 255, 0.08)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.25)',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#dde2f0',
    letterSpacing: 0.4,
  },
  headerSubtitle: {
    fontSize: 10.5,
    color: '#849396',
    marginTop: 2,
    fontWeight: '600',
  },
  lockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 239, 126, 0.1)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(34, 239, 126, 0.3)',
  },
  lockBadgeText: {
    color: '#22ef7e',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  // KPI Summary Bar
  kpiRow: {
    flexDirection: 'row',
    backgroundColor: '#0c1524',
    borderBottomWidth: 1,
    borderBottomColor: '#1d2e47',
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#070c14',
    borderWidth: 1,
    borderColor: '#192b45',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  kpiLabel: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#849396',
    letterSpacing: 0.5,
  },
  kpiValue: {
    fontSize: 16,
    fontWeight: '900',
    marginVertical: 2,
  },
  kpiSub: {
    fontSize: 8,
    color: '#546e7a',
    fontWeight: '600',
  },

  // Search Bar
  searchBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0c1524',
    borderBottomWidth: 1,
    borderBottomColor: '#192b45',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    color: '#dde2f0',
    fontSize: 12,
    height: 34,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  } as any,

  // Filter Bar
  filterBar: {
    backgroundColor: '#0a121e',
    borderBottomWidth: 1,
    borderBottomColor: '#1d2e47',
    paddingVertical: 8,
  },
  filterPill: {
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderRadius: 6,
    backgroundColor: '#122033',
    borderWidth: 1,
    borderColor: '#1f3452',
  },
  filterPillActive: {
    backgroundColor: '#00e5ff',
    borderColor: '#00e5ff',
  },
  filterPillText: {
    color: '#849396',
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  filterPillTextActive: {
    color: '#070c14',
    fontWeight: '900',
  },

  // Loading & Scroll Content
  centerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  loadingText: {
    color: '#00e5ff',
    fontSize: 12,
    marginTop: 12,
    fontWeight: '700',
  },
  scrollContent: {
    paddingTop: 10,
    gap: 8,
  },
  emptyCard: {
    backgroundColor: '#0c1524',
    borderRadius: 12,
    padding: 36,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#192b45',
    marginTop: 30,
  },
  emptyCardTitle: {
    color: '#dde2f0',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 10,
  },
  emptyCardText: {
    color: '#849396',
    fontSize: 11.5,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 16,
  },

  // Log Card
  logCard: {
    backgroundColor: '#0c1524',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#192b45',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  rolePillText: {
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  actionPillText: {
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  timeText: {
    fontSize: 10,
    color: '#849396',
    fontWeight: '600',
  },
  descText: {
    fontSize: 12,
    color: '#dde2f0',
    lineHeight: 17,
    fontWeight: '500',
    marginVertical: 4,
  },
  cardFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#122033',
  },
  actorText: {
    fontSize: 10.5,
    color: '#849396',
  },
  entityIdText: {
    fontSize: 10,
    color: '#546e7a',
    fontWeight: '600',
  },
});
