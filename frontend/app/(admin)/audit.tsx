import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { adminService } from '../../src/services/adminService';
import { securityAuditService } from '../../src/services/securityAuditService';
import { useResponsive } from '../../src/hooks/useResponsive';

export default function AdminAuditScreen() {
  const router = useRouter();
  const { topInset, bottomInset, containerPaddingHorizontal } = useResponsive();

  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [entityFilter, setEntityFilter] = useState<string>('ALL');

  const fetchAuditLogs = useCallback(async () => {
    try {
      const mobileLogs = await securityAuditService.getRecentEvents();
      const mappedMobile = mobileLogs.map((m) => ({
        id: m.id,
        action: m.type,
        entityType: 'MOBILE_SECURITY',
        description: m.description,
        performedBy: m.username,
        createdAt: m.timestamp,
        severity: m.severity,
      }));

      let serverLogs: any[] = [];
      if (entityFilter !== 'MOBILE_SECURITY') {
        try {
          const data = await adminService.getAuditLogs(
            0,
            50,
            entityFilter === 'ALL' ? undefined : entityFilter
          );
          serverLogs = data?.content || data || [];
        } catch {
          serverLogs = [];
        }
      }

      if (entityFilter === 'MOBILE_SECURITY') {
        setLogs(mappedMobile);
      } else if (entityFilter === 'ALL') {
        setLogs(
          [...mappedMobile, ...serverLogs].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
        );
      } else {
        setLogs(serverLogs);
      }
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [entityFilter]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAuditLogs();
  };

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(topInset, 16) }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#90caf9" />
          </TouchableOpacity>
          <View style={{ marginLeft: 10 }}>
            <Text style={styles.headerTitle}>System Audit Trail</Text>
            <Text style={styles.headerSubtitle}>Immutable security & operations log</Text>
          </View>
        </View>

        <View style={styles.lockBadge}>
          <Ionicons name="lock-closed" size={12} color="#00e5ff" style={{ marginRight: 4 }} />
          <Text style={styles.lockBadgeText}>SECURE</Text>
        </View>
      </View>

      {/* Filter Pills */}
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {['ALL', 'MOBILE_SECURITY', 'DRIVER', 'VEHICLE', 'SUPERVISOR', 'TRIP'].map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterPill, entityFilter === f && styles.filterPillActive]}
              onPress={() => setEntityFilter(f)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterPillText,
                  entityFilter === f && styles.filterPillTextActive,
                ]}
              >
                {f.replace('_', ' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Logs List */}
      {loading && !refreshing ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#00e5ff" />
          <Text style={styles.loadingText}>Fetching audit logs...</Text>
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
        >
          {logs.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="document-text-outline" size={32} color="#607d8b" />
              <Text style={styles.emptyCardText}>No audit records found for this category.</Text>
            </View>
          ) : (
            logs.map((log: any, idx: number) => {
              const timeStr = log.createdAt
                ? new Date(log.createdAt).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'Just now';

              return (
                <View key={log.id || idx} style={styles.logCard}>
                  <View style={styles.logTopRow}>
                    <View style={styles.actionWrap}>
                      <Text style={styles.actionText}>{log.action}</Text>
                      <View style={styles.entityTag}>
                        <Text style={styles.entityTagText}>{log.entityType || 'SYSTEM'}</Text>
                      </View>
                    </View>
                    <Text style={styles.timeText}>{timeStr}</Text>
                  </View>

                  <Text style={styles.descText}>{log.description || 'Action executed'}</Text>

                  <View style={styles.logBottomRow}>
                    <Text style={styles.actorText}>
                      By: <Text style={{ color: '#00e5ff' }}>{log.actorRole || 'ADMIN'}</Text>
                    </Text>
                    {log.entityId ? (
                      <Text style={styles.entityIdText}>Ref: {log.entityId.slice(0, 8)}...</Text>
                    ) : null}
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
    backgroundColor: '#070f1e',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: '#0a1628',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  backBtn: {
    padding: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#90caf9',
    marginTop: 2,
    fontWeight: '600',
  },
  lockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.3)',
  },
  lockBadgeText: {
    color: '#00e5ff',
    fontSize: 9,
    fontWeight: '800',
  },
  filterBar: {
    padding: 12,
    backgroundColor: '#0c1b30',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  filterPill: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginRight: 8,
  },
  filterPillActive: {
    backgroundColor: '#00e5ff',
  },
  filterPillText: {
    color: '#90caf9',
    fontSize: 11,
    fontWeight: '700',
  },
  filterPillTextActive: {
    color: '#001529',
  },
  centerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#90caf9',
    fontSize: 13,
    marginTop: 10,
  },
  scrollContent: {
    paddingTop: 12,
  },
  emptyCard: {
    backgroundColor: '#0c1b30',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginTop: 20,
  },
  emptyCardText: {
    color: '#78909c',
    fontSize: 13,
    marginTop: 8,
  },
  logCard: {
    backgroundColor: '#0c1b30',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  logTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  actionWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  entityTag: {
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
  },
  entityTagText: {
    color: '#00e5ff',
    fontSize: 9,
    fontWeight: '800',
  },
  timeText: {
    fontSize: 10,
    color: '#78909c',
  },
  descText: {
    fontSize: 12,
    color: '#cfd8dc',
    lineHeight: 16,
    marginVertical: 4,
  },
  logBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.04)',
  },
  actorText: {
    fontSize: 10,
    color: '#78909c',
  },
  entityIdText: {
    fontSize: 10,
    color: '#546e7a',
  },
});
