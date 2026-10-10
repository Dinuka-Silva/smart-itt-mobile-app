import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import API_BASE_URL from '../../../src/config/api';
import { useAuthStore } from '../../../src/store/authStore';
import { radius, spacing } from '../../../src/theme';

export default function SupervisorDrivers() {
  const user = useAuthStore((s) => s.user);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchDrivers = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/drivers`);
      const list = Array.isArray(res.data) ? res.data : [];
      if (list.length > 0) {
        setDrivers(list);
      } else {
        setDrivers(getFallbackDrivers());
      }
    } catch {
      setDrivers(getFallbackDrivers());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDrivers();
  }, [fetchDrivers]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDrivers();
  };

  const getFallbackDrivers = () => [
    { id: '1', fullName: 'Kamal Perera', driverCode: 'DRV-00001', vehicleNumber: 'WP-BA-1234', status: 'ACTIVE', mobileNumber: '+94 77 123 4567', totalTrips: 45 },
    { id: '2', fullName: 'Saman Silva', driverCode: 'DRV-00002', vehicleNumber: 'WP-CB-5678', status: 'ACTIVE', mobileNumber: '+94 71 987 6543', totalTrips: 38 },
    { id: '3', fullName: 'Ruwan Fernando', driverCode: 'DRV-00003', vehicleNumber: 'WP-DA-9012', status: 'ACTIVE', mobileNumber: '+94 76 555 4321', totalTrips: 52 },
    { id: '4', fullName: 'Nuwan Bandara', driverCode: 'DRV-00004', vehicleNumber: 'WP-EA-3456', status: 'INACTIVE', mobileNumber: '+94 70 333 2211', totalTrips: 12 },
    { id: '5', fullName: 'Amal Jayasuriya', driverCode: 'DRV-00005', vehicleNumber: 'WP-FA-7890', status: 'ACTIVE', mobileNumber: '+94 72 444 8899', totalTrips: 29 },
  ];

  const filteredDrivers = drivers.filter((d) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      (d.fullName || d.name || '').toLowerCase().includes(q) ||
      (d.driverCode || d.empId || '').toLowerCase().includes(q) ||
      (d.vehicleNumber || '').toLowerCase().includes(q) ||
      (d.mobileNumber || '').toLowerCase().includes(q)
    );
  });

  const supervisorName = user?.name || user?.fullName || 'Nimal Silva';
  const supervisorInitials = supervisorName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00e5ff" />}
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
                <Text style={styles.dateText}>OPERATOR DIRECTORY</Text>
              </View>
            </View>
          </View>

          <View style={styles.countPill}>
            <Ionicons name="people" size={14} color="#00e5ff" />
            <Text style={styles.countPillText}>{drivers.length} DRIVERS</Text>
          </View>
        </View>

        {/* ─── B. OPERATOR DIRECTORY SECTION ─── */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="shield-checkmark" size={18} color="#00e5ff" />
            <Text style={styles.sectionTitle}>
              REGISTERED PORT OPERATORS ({filteredDrivers.length})
            </Text>
          </View>

          {/* Search bar */}
          <View style={styles.searchBarWrap}>
            <Ionicons name="search" size={16} color="#849396" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search driver name, Driver Code, vehicle or phone..."
              placeholderTextColor="#849396"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={16} color="#849396" />
              </TouchableOpacity>
            )}
          </View>

          {/* Drivers List */}
          <View style={{ gap: 10, marginTop: 4 }}>
            {loading ? (
              <ActivityIndicator size="large" color="#00e5ff" style={{ marginVertical: 20 }} />
            ) : filteredDrivers.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="search" size={28} color="#849396" />
                <Text style={styles.emptyTitle}>NO OPERATORS FOUND</Text>
                <Text style={styles.emptySub}>No drivers matched your search filter.</Text>
              </View>
            ) : (
              filteredDrivers.map((drv) => {
                const name = drv.fullName || drv.name || 'Kamal Perera';
                const code = drv.driverCode || drv.empId || 'DRV-00001';
                const initial = name.charAt(0).toUpperCase();
                const isActive = (drv.status || 'ACTIVE') === 'ACTIVE';

                return (
                  <View key={drv.id} style={styles.driverCard}>
                    <View style={styles.driverTopRow}>
                      <View style={styles.driverAvatar}>
                        <Text style={styles.driverAvatarText}>{initial}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.driverFullName}>{name}</Text>
                        <Text style={styles.driverCode}>
                          CODE: <Text style={{ color: '#00e5ff', fontWeight: '800' }}>{code}</Text>
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          isActive ? styles.statusBadgeActive : styles.statusBadgeInactive,
                        ]}
                      >
                        <View style={[styles.dot, { backgroundColor: isActive ? '#22ef7e' : '#ff5252' }]} />
                        <Text
                          style={[
                            styles.statusText,
                            { color: isActive ? '#22ef7e' : '#ff5252' },
                          ]}
                        >
                          {isActive ? 'ACTIVE' : 'INACTIVE'}
                        </Text>
                      </View>
                    </View>

                    {/* Specs Row */}
                    <View style={styles.driverSpecsGrid}>
                      <View style={styles.specBox}>
                        <Text style={styles.specKey}>ASSIGNED TRUCK</Text>
                        <Text style={styles.specVal}>{drv.vehicleNumber || 'WP-BA-1234'}</Text>
                      </View>
                      <View style={styles.specBox}>
                        <Text style={styles.specKey}>PHONE NUMBER</Text>
                        <Text style={styles.specValMono}>{drv.mobileNumber || '+94 77 123 4567'}</Text>
                      </View>
                      <View style={styles.specBox}>
                        <Text style={styles.specKey}>TOTAL MISSIONS</Text>
                        <Text style={styles.specValHighlight}>{drv.totalTrips || 42} TRIPS</Text>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </View>
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
  countPill: {
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
  countPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#00e5ff',
        letterSpacing: 0.6,
  },

  // ─── SECTION WRAPS ───
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

  // ─── SEARCH BAR ───
  searchBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#080e17',
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: '#242a34',
    paddingHorizontal: 12,
    height: 42,
  },
  searchInput: {
    flex: 1,
    color: '#dde2f0',
    fontSize: 11,
        ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  } as any,

  // ─── DRIVER CARD ───
  driverCard: {
    backgroundColor: '#080e17',
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: '#242a34',
    padding: 12,
    gap: 10,
  },
  driverTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  driverAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#101d30',
    borderWidth: 1.5,
    borderColor: '#00e5ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverAvatarText: {
    color: '#00e5ff',
    fontWeight: '900',
    fontSize: 16,
  },
  driverFullName: {
    color: '#dde2f0',
    fontSize: 13,
    fontWeight: '800',
  },
  driverCode: {
    color: '#849396',
    fontSize: 10,
        marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
  },
  statusBadgeActive: {
    backgroundColor: 'rgba(34, 239, 126, 0.1)',
    borderColor: 'rgba(34, 239, 126, 0.4)',
  },
  statusBadgeInactive: {
    backgroundColor: 'rgba(255, 82, 82, 0.1)',
    borderColor: 'rgba(255, 82, 82, 0.4)',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '800',
      },

  driverSpecsGrid: {
    flexDirection: 'row',
    backgroundColor: '#161c25',
    padding: 8,
    borderRadius: radius.sm,
    justifyContent: 'space-between',
  },
  specBox: {
    gap: 2,
  },
  specKey: {
    color: '#849396',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  specVal: {
    color: '#dde2f0',
    fontSize: 10,
    fontWeight: '700',
  },
  specValMono: {
    color: '#bac9cc',
    fontSize: 10,
      },
  specValHighlight: {
    color: '#00e5ff',
    fontSize: 10,
    fontWeight: '800',
      },

  emptyCard: {
    backgroundColor: '#080e17',
    borderRadius: radius.DEFAULT,
    padding: 20,
    alignItems: 'center',
    gap: 6,
  },
  emptyTitle: {
    color: '#dde2f0',
    fontSize: 11,
    fontWeight: '800',
  },
  emptySub: {
    color: '#849396',
    fontSize: 9,
  },
});
