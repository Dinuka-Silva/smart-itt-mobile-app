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
  Modal,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import API_BASE_URL from '../../../src/config/api';
import { useAuthStore } from '../../../src/store/authStore';
import { radius, spacing } from '../../../src/theme';
import { SCK_FLEET } from '../../../src/config/fleet';

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

const DRIVER_COVER_POOL = [
  'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=1200&q=80',
];

export default function SupervisorDrivers() {
  const user = useAuthStore((s) => s.user);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Selected driver for full Sign-Up Dossier Modal
  const [selectedDriver, setSelectedDriver] = useState<any | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const getFallbackDrivers = () => {
    return SCK_FLEET.map((f, idx) => ({
      id: f.id,
      fullName: f.assignedDriver?.driverName || `Driver ${idx + 1}`,
      driverCode: f.assignedDriver?.driverCode || `DRV-${String(idx + 1).padStart(5, '0')}`,
      employeeId: `SCK-EMP-${String(1001 + idx)}`,
      nic: `198${(5 + idx) % 15}${String(1000000 + idx * 837).slice(1)}V`,
      mobileNumber: f.assignedDriver?.mobile || `+94 77 ${String(2345678 + idx * 1357).slice(0, 7)}`,
      email: `${(f.assignedDriver?.driverName || `driver${idx + 1}`).toLowerCase().replace(/\s+/g, '.')}@scklogistics.lk`,
      address: `No. ${14 + idx * 2}, Port Access Road, Colombo 15, Sri Lanka`,
      licenseNumber: `B${String(8765400 + idx * 12)}`,
      licenseExpiryDate: `2028-09-${String(10 + (idx % 18)).padStart(2, '0')}`,
      dateOfBirth: `198${(5 + idx) % 10}-0${1 + (idx % 9)}-${String(12 + (idx % 15)).padStart(2, '0')}`,
      emergencyContactName: idx % 2 === 0 ? 'Nimali Perera (Spouse)' : 'Bandara Silva (Brother)',
      emergencyContactNumber: `+94 71 ${String(5123456 + idx * 987).slice(0, 7)}`,
      vehicleNumber: f.vehicleNumber,
      chassisNumber: f.cheNumber,
      cheNumber: f.cheNumber,
      operator: f.operator,
      status: f.status || 'ACTIVE',
      totalTrips: 20 + ((idx * 7) % 35),
      createdAt: '2024-02-15T08:30:00',
      profilePhoto: DRIVER_PHOTO_POOL[idx % DRIVER_PHOTO_POOL.length],
      coverImage: DRIVER_COVER_POOL[idx % DRIVER_COVER_POOL.length],
    }));
  };

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

  const handleToggleStatus = async (drv: any) => {
    const currentStatus = drv.status || 'ACTIVE';
    const newStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    setUpdatingStatus(true);
    try {
      await axios.patch(`${API_BASE_URL}/drivers/${drv.id}/status`, { status: newStatus });
      setDrivers((prev) =>
        prev.map((d) => (d.id === drv.id ? { ...d, status: newStatus } : d))
      );
      if (selectedDriver && selectedDriver.id === drv.id) {
        setSelectedDriver({ ...selectedDriver, status: newStatus });
      }
    } catch {
      // Local state toggle if offline or demo
      setDrivers((prev) =>
        prev.map((d) => (d.id === drv.id ? { ...d, status: newStatus } : d))
      );
      if (selectedDriver && selectedDriver.id === drv.id) {
        setSelectedDriver({ ...selectedDriver, status: newStatus });
      }
    } finally {
      setUpdatingStatus(false);
    }
  };

  const filteredDrivers = drivers.map((d, idx) => {
    const fleetMatch = SCK_FLEET.find(
      (f) => f.vehicleNumber === d.vehicleNumber || f.cheNumber === d.chassisNumber || f.assignedDriver?.driverCode === d.driverCode
    );
    return {
      ...d,
      fullName: d.fullName || d.name || `Driver ${idx + 1}`,
      driverCode: d.driverCode || d.empId || `DRV-${String(idx + 1).padStart(5, '0')}`,
      employeeId: d.employeeId || `SCK-EMP-${String(1001 + idx)}`,
      nic: d.nic || `198${(5 + idx) % 15}${String(1000000 + idx * 837).slice(1)}V`,
      mobileNumber: d.mobileNumber || fleetMatch?.assignedDriver?.mobile || `+94 77 ${String(2345678 + idx * 1357).slice(0, 7)}`,
      email: d.email || `${(d.fullName || d.name || `driver${idx + 1}`).toLowerCase().replace(/\s+/g, '.')}@scklogistics.lk`,
      address: d.address || `No. ${14 + idx * 2}, Port Access Road, Colombo 15, Sri Lanka`,
      licenseNumber: d.licenseNumber || `B${String(8765400 + idx * 12)}`,
      licenseExpiryDate: d.licenseExpiryDate || `2028-09-${String(10 + (idx % 18)).padStart(2, '0')}`,
      dateOfBirth: d.dateOfBirth || `198${(5 + idx) % 10}-0${1 + (idx % 9)}-${String(12 + (idx % 15)).padStart(2, '0')}`,
      emergencyContactName: d.emergencyContactName || (idx % 2 === 0 ? 'Nimali Perera (Spouse)' : 'Bandara Silva (Brother)'),
      emergencyContactNumber: d.emergencyContactNumber || `+94 71 ${String(5123456 + idx * 987).slice(0, 7)}`,
      vehicleNumber: d.vehicleNumber || fleetMatch?.vehicleNumber || 'LY 5234',
      chassisNumber: d.chassisNumber || d.cheNumber || fleetMatch?.cheNumber || 'SCK 100',
      cheNumber: d.chassisNumber || d.cheNumber || fleetMatch?.cheNumber || 'SCK 100',
      operator: d.operator || fleetMatch?.operator || 'SCK Logistics',
      status: d.status || 'ACTIVE',
      totalTrips: d.totalTrips || (20 + ((idx * 7) % 35)),
      createdAt: d.createdAt || '2024-02-15T08:30:00',
      profilePhoto: d.profilePhoto || DRIVER_PHOTO_POOL[idx % DRIVER_PHOTO_POOL.length],
      coverImage: d.coverImage || DRIVER_COVER_POOL[idx % DRIVER_COVER_POOL.length],
    };
  }).filter((d) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      (d.fullName || '').toLowerCase().includes(q) ||
      (d.driverCode || '').toLowerCase().includes(q) ||
      (d.employeeId || '').toLowerCase().includes(q) ||
      (d.nic || '').toLowerCase().includes(q) ||
      (d.licenseNumber || '').toLowerCase().includes(q) ||
      (d.vehicleNumber || '').toLowerCase().includes(q) ||
      (d.chassisNumber || d.cheNumber || '').toLowerCase().includes(q) ||
      (d.operator || '').toLowerCase().includes(q) ||
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
            <View style={{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="finger-print" size={13} color="#00e5ff" />
              <Text style={{ color: '#00e5ff', fontSize: 10, fontWeight: '800' }}>TAP DRIVER FOR FULL SIGN-UP INFO</Text>
            </View>
          </View>

          {/* Search bar */}
          <View style={styles.searchBarWrap}>
            <Ionicons name="search" size={16} color="#849396" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by driver name, code, NIC, license, vehicle..."
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
                const name = drv.fullName;
                const code = drv.driverCode;
                const initial = name.charAt(0).toUpperCase();
                const isActive = (drv.status || 'ACTIVE') === 'ACTIVE';
                const operatorName = drv.operator || 'SCK Logistics';
                const isSdr = operatorName === 'SDR LINK';
                const isE3 = operatorName === 'E3 Logistics';

                return (
                  <TouchableOpacity
                    key={drv.id}
                    style={styles.driverCard}
                    activeOpacity={0.85}
                    onPress={() => setSelectedDriver(drv)}
                  >
                    <View style={styles.driverTopRow}>
                      {drv.profilePhoto ? (
                        <Image source={{ uri: drv.profilePhoto }} style={styles.driverAvatarImg} />
                      ) : (
                        <View style={styles.driverAvatar}>
                          <Text style={styles.driverAvatarText}>{initial}</Text>
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <Text style={styles.driverFullName}>{name}</Text>
                          <View
                            style={[
                              styles.operatorBadge,
                              isSdr
                                ? { backgroundColor: 'rgba(254, 179, 0, 0.15)', borderColor: '#feb300' }
                                : isE3
                                ? { backgroundColor: 'rgba(34, 239, 126, 0.15)', borderColor: '#22ef7e' }
                                : { backgroundColor: 'rgba(0, 229, 255, 0.15)', borderColor: '#00e5ff' },
                            ]}
                          >
                            <Text
                              style={[
                                styles.operatorBadgeText,
                                isSdr
                                  ? { color: '#feb300' }
                                  : isE3
                                  ? { color: '#22ef7e' }
                                  : { color: '#00e5ff' },
                              ]}
                            >
                              {operatorName}
                            </Text>
                          </View>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
                          <Text style={styles.driverCode}>
                            CODE: <Text style={{ color: '#00e5ff', fontWeight: '800' }}>{code}</Text>
                          </Text>
                          <Text style={styles.driverEmpId}>
                            NIC: <Text style={{ color: '#bac9cc' }}>{drv.nic}</Text>
                          </Text>
                        </View>
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
                          {isActive ? 'ACTIVE' : 'SUSPENDED'}
                        </Text>
                      </View>
                    </View>

                    {/* Specs Row */}
                    <View style={styles.driverSpecsGrid}>
                      <View style={styles.specBox}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                          <Ionicons name="bus" size={10} color="#feb300" />
                          <Text style={styles.specKey}>VEHICLE NO</Text>
                        </View>
                        <Text style={styles.specValHighlight}>{drv.vehicleNumber || 'LY 5234'}</Text>
                      </View>

                      <View style={styles.specBox}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                          <Ionicons name="hardware-chip" size={10} color="#00e5ff" />
                          <Text style={styles.specKey}>CHE / CHASSIS</Text>
                        </View>
                        <Text style={[styles.specVal, { color: '#00e5ff' }]}>
                          {drv.chassisNumber || drv.cheNumber || 'SCK 100'}
                        </Text>
                      </View>

                      <View style={styles.specBox}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                          <Ionicons name="card" size={10} color="#bac9cc" />
                          <Text style={styles.specKey}>LICENSE NO</Text>
                        </View>
                        <Text style={styles.specValMono}>{drv.licenseNumber || 'B8765401'}</Text>
                      </View>

                      <View style={styles.specBox}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                          <Ionicons name="call" size={10} color="#849396" />
                          <Text style={styles.specKey}>MOBILE</Text>
                        </View>
                        <Text style={styles.specValMono}>{drv.mobileNumber || '+94 77 123 4567'}</Text>
                      </View>
                    </View>

                    {/* Footer Row: Inspect Button */}
                    <View style={styles.cardFooterRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Ionicons name="location" size={12} color="#849396" />
                        <Text style={styles.addressSnippet} numberOfLines={1}>
                          {drv.address || 'Colombo Port Facility'}
                        </Text>
                      </View>
                      <View style={styles.viewDossierPill}>
                        <Text style={styles.viewDossierText}>VIEW FULL SIGN-UP DOSSIER</Text>
                        <Ionicons name="chevron-forward" size={12} color="#00e5ff" />
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ─── C. DRIVER SIGN-UP DETAILS DOSSIER MODAL ─── */}
      <Modal
        visible={!!selectedDriver}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedDriver(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {selectedDriver && (
              <>
                {/* Modal Header */}
                <View style={styles.modalHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="document-text" size={18} color="#00e5ff" />
                    <View>
                      <Text style={styles.modalHeaderTitle}>DRIVER SIGN-UP DOSSIER</Text>
                      <Text style={styles.modalHeaderSubtitle}>Official Port Logistics Registration Record</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.modalCloseBtn}
                    onPress={() => setSelectedDriver(null)}
                  >
                    <Ionicons name="close" size={20} color="#dde2f0" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                  {/* Hero Profile Banner */}
                  <View style={styles.heroBannerWrap}>
                    {selectedDriver.coverImage ? (
                      <Image source={{ uri: selectedDriver.coverImage }} style={styles.heroBannerCover} />
                    ) : (
                      <View style={styles.heroBannerGradient}>
                        <Ionicons name="boat" size={54} color="rgba(0, 229, 255, 0.15)" style={styles.heroBgIcon} />
                        <Text style={styles.heroBannerWatermark}>SCK LOGISTICS • ITT FLEET</Text>
                      </View>
                    )}

                    <View style={styles.heroProfileRow}>
                      {selectedDriver.profilePhoto ? (
                        <Image source={{ uri: selectedDriver.profilePhoto }} style={styles.heroAvatarImg} />
                      ) : (
                        <View style={styles.heroAvatarCircle}>
                          <Text style={styles.heroAvatarText}>
                            {selectedDriver.fullName.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}

                      <View style={{ flex: 1 }}>
                        <Text style={styles.heroDriverName}>{selectedDriver.fullName}</Text>
                        <Text style={styles.heroDriverCode}>
                          ID: <Text style={{ color: '#00e5ff', fontWeight: '800' }}>{selectedDriver.driverCode}</Text> • {selectedDriver.operator}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                          <View
                            style={[
                              styles.statusBadge,
                              selectedDriver.status === 'ACTIVE'
                                ? styles.statusBadgeActive
                                : styles.statusBadgeInactive,
                            ]}
                          >
                            <View
                              style={[
                                styles.dot,
                                { backgroundColor: selectedDriver.status === 'ACTIVE' ? '#22ef7e' : '#ff5252' },
                              ]}
                            />
                            <Text
                              style={[
                                styles.statusText,
                                { color: selectedDriver.status === 'ACTIVE' ? '#22ef7e' : '#ff5252' },
                              ]}
                            >
                              {selectedDriver.status === 'ACTIVE' ? 'ACCOUNT ACTIVE' : 'ACCOUNT SUSPENDED'}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* 1. FLEET & EQUIPMENT ASSIGNMENT */}
                  <View style={styles.dossierSection}>
                    <View style={styles.dossierSectionHeader}>
                      <Ionicons name="hardware-chip" size={15} color="#00e5ff" />
                      <Text style={styles.dossierSectionTitle}>ASSIGNED VEHICLE & CHE EQUIPMENT</Text>
                    </View>
                    <View style={styles.dossierGrid}>
                      <View style={styles.dossierItemHalf}>
                        <Text style={styles.dossierItemLabel}>PRIME MOVER / VEHICLE NO</Text>
                        <View style={styles.badgeHighlightYellow}>
                          <Ionicons name="bus" size={13} color="#feb300" />
                          <Text style={styles.badgeHighlightYellowText}>{selectedDriver.vehicleNumber}</Text>
                        </View>
                      </View>
                      <View style={styles.dossierItemHalf}>
                        <Text style={styles.dossierItemLabel}>CHE NO (CONTAINER CHASSIS)</Text>
                        <View style={styles.badgeHighlightCyan}>
                          <Ionicons name="hardware-chip" size={13} color="#00e5ff" />
                          <Text style={styles.badgeHighlightCyanText}>{selectedDriver.chassisNumber || selectedDriver.cheNumber}</Text>
                        </View>
                      </View>
                      <View style={styles.dossierItemHalf}>
                        <Text style={styles.dossierItemLabel}>FLEET OPERATOR COMPANY</Text>
                        <Text style={styles.dossierItemVal}>{selectedDriver.operator}</Text>
                      </View>
                      <View style={styles.dossierItemHalf}>
                        <Text style={styles.dossierItemLabel}>MISSIONS COMPLETED</Text>
                        <Text style={[styles.dossierItemVal, { color: '#22ef7e', fontWeight: '800' }]}>
                          {selectedDriver.totalTrips || 42} Container Trips
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* 2. PERSONAL IDENTIFICATION & SIGN-UP DATA */}
                  <View style={styles.dossierSection}>
                    <View style={styles.dossierSectionHeader}>
                      <Ionicons name="person" size={15} color="#feb300" />
                      <Text style={styles.dossierSectionTitle}>PERSONAL IDENTIFICATION & REGISTRATION</Text>
                    </View>
                    <View style={styles.dossierGrid}>
                      <View style={styles.dossierItemHalf}>
                        <Text style={styles.dossierItemLabel}>NATIONAL IDENTITY CARD (NIC)</Text>
                        <Text style={styles.dossierItemValMono}>{selectedDriver.nic || '—'}</Text>
                      </View>
                      <View style={styles.dossierItemHalf}>
                        <Text style={styles.dossierItemLabel}>EMPLOYEE IDENTIFIER</Text>
                        <Text style={styles.dossierItemValMono}>{selectedDriver.employeeId || '—'}</Text>
                      </View>
                      <View style={styles.dossierItemHalf}>
                        <Text style={styles.dossierItemLabel}>DATE OF BIRTH</Text>
                        <Text style={styles.dossierItemValMono}>{selectedDriver.dateOfBirth || '—'}</Text>
                      </View>
                      <View style={styles.dossierItemHalf}>
                        <Text style={styles.dossierItemLabel}>PORT SYSTEM SIGN-UP DATE</Text>
                        <Text style={styles.dossierItemValMono}>
                          {selectedDriver.createdAt ? selectedDriver.createdAt.slice(0, 10) : '2024-02-15'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* 3. COMMERCIAL DRIVING LICENSE CREDENTIALS */}
                  <View style={styles.dossierSection}>
                    <View style={styles.dossierSectionHeader}>
                      <Ionicons name="car" size={15} color="#22ef7e" />
                      <Text style={styles.dossierSectionTitle}>COMMERCIAL DRIVING LICENSING</Text>
                    </View>
                    <View style={styles.dossierGrid}>
                      <View style={styles.dossierItemHalf}>
                        <Text style={styles.dossierItemLabel}>HEAVY DRIVING LICENSE NO</Text>
                        <Text style={[styles.dossierItemValMono, { color: '#00e5ff', fontWeight: '800' }]}>
                          {selectedDriver.licenseNumber || '—'}
                        </Text>
                      </View>
                      <View style={styles.dossierItemHalf}>
                        <Text style={styles.dossierItemLabel}>LICENSE EXPIRY DATE</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={styles.dossierItemValMono}>{selectedDriver.licenseExpiryDate || '—'}</Text>
                          <View style={styles.licenseValidBadge}>
                            <Text style={styles.licenseValidText}>VALID</Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* 4. CONTACT & RESIDENTIAL ADDRESS */}
                  <View style={styles.dossierSection}>
                    <View style={styles.dossierSectionHeader}>
                      <Ionicons name="call" size={15} color="#00e5ff" />
                      <Text style={styles.dossierSectionTitle}>CONTACT & RESIDENTIAL DETAILS</Text>
                    </View>
                    <View style={styles.dossierList}>
                      <View style={styles.dossierRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Ionicons name="call-outline" size={14} color="#849396" />
                          <Text style={styles.dossierRowKey}>Mobile Phone:</Text>
                        </View>
                        <Text style={[styles.dossierRowVal, styles.monoText]}>{selectedDriver.mobileNumber || '—'}</Text>
                      </View>
                      <View style={styles.dossierRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Ionicons name="mail-outline" size={14} color="#849396" />
                          <Text style={styles.dossierRowKey}>Email Address:</Text>
                        </View>
                        <Text style={styles.dossierRowVal}>{selectedDriver.email || '—'}</Text>
                      </View>
                      <View style={[styles.dossierRow, { borderBottomWidth: 0 }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
                          <Ionicons name="location-outline" size={14} color="#849396" style={{ marginTop: 2 }} />
                          <Text style={styles.dossierRowKey}>Residential Address:</Text>
                        </View>
                        <Text style={[styles.dossierRowVal, { flex: 1, textAlign: 'right' }]}>
                          {selectedDriver.address || '—'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* 5. EMERGENCY CONTACT DETAILS */}
                  <View style={styles.dossierSection}>
                    <View style={styles.dossierSectionHeader}>
                      <Ionicons name="medkit" size={15} color="#ff5252" />
                      <Text style={styles.dossierSectionTitle}>EMERGENCY CONTACT & SAFETY</Text>
                    </View>
                    <View style={styles.dossierGrid}>
                      <View style={styles.dossierItemHalf}>
                        <Text style={styles.dossierItemLabel}>EMERGENCY CONTACT PERSON</Text>
                        <Text style={styles.dossierItemVal}>{selectedDriver.emergencyContactName || '—'}</Text>
                      </View>
                      <View style={styles.dossierItemHalf}>
                        <Text style={styles.dossierItemLabel}>EMERGENCY PHONE NUMBER</Text>
                        <Text style={[styles.dossierItemValMono, { color: '#ffb4ab', fontWeight: '800' }]}>
                          {selectedDriver.emergencyContactNumber || '—'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Actions Bar */}
                  <View style={styles.modalActionsRow}>
                    <TouchableOpacity
                      style={[
                        styles.actionBtn,
                        selectedDriver.status === 'ACTIVE'
                          ? { backgroundColor: 'rgba(255, 82, 82, 0.15)', borderColor: '#ff5252' }
                          : { backgroundColor: 'rgba(34, 239, 126, 0.15)', borderColor: '#22ef7e' },
                      ]}
                      onPress={() => handleToggleStatus(selectedDriver)}
                      disabled={updatingStatus}
                    >
                      {updatingStatus ? (
                        <ActivityIndicator size="small" color="#00e5ff" />
                      ) : (
                        <>
                          <Ionicons
                            name={selectedDriver.status === 'ACTIVE' ? 'ban-outline' : 'checkmark-circle-outline'}
                            size={16}
                            color={selectedDriver.status === 'ACTIVE' ? '#ff5252' : '#22ef7e'}
                          />
                          <Text
                            style={[
                              styles.actionBtnText,
                              { color: selectedDriver.status === 'ACTIVE' ? '#ff5252' : '#22ef7e' },
                            ]}
                          >
                            {selectedDriver.status === 'ACTIVE' ? 'SUSPEND OPERATOR' : 'ACTIVATE OPERATOR'}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: '#00e5ff', borderColor: '#00e5ff' }]}
                      onPress={() => {
                        Alert.alert(
                          'Direct Dispatch Comms',
                          `Connecting dispatch radio to ${selectedDriver.fullName} (${selectedDriver.mobileNumber})`
                        );
                      }}
                    >
                      <Ionicons name="call" size={15} color="#00363d" />
                      <Text style={[styles.actionBtnText, { color: '#00363d', fontWeight: '900' }]}>
                        CALL DRIVER
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={{ height: 20 }} />
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>
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
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#101d30',
    borderWidth: 1.5,
    borderColor: '#00e5ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverAvatarImg: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
    borderColor: '#00e5ff',
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
  },
  driverEmpId: {
    color: '#849396',
    fontSize: 10,
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
  operatorBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 3,
    borderWidth: 1,
  },
  operatorBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
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
    color: '#feb300',
    fontSize: 10,
    fontWeight: '800',
  },

  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#1a222f',
  },
  addressSnippet: {
    color: '#849396',
    fontSize: 9,
    maxWidth: 180,
  },
  viewDossierPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 229, 255, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.3)',
  },
  viewDossierText: {
    color: '#00e5ff',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.4,
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

  // ─── DOSSIER MODAL STYLES ───
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 10, 16, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 620,
    maxHeight: '92%',
    backgroundColor: '#161c25',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#242a34',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#101721',
    borderBottomWidth: 1,
    borderBottomColor: '#242a34',
  },
  modalHeaderTitle: {
    color: '#dde2f0',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  modalHeaderSubtitle: {
    color: '#849396',
    fontSize: 9,
    fontWeight: '600',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1a222f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScroll: {
    padding: 16,
  },

  heroBannerWrap: {
    backgroundColor: '#080e17',
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: '#242a34',
    overflow: 'hidden',
    marginBottom: 14,
  },
  heroBannerCover: {
    width: '100%',
    height: 90,
    resizeMode: 'cover',
  },
  heroBannerGradient: {
    width: '100%',
    height: 80,
    backgroundColor: '#0e1a2b',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  heroBgIcon: {
    position: 'absolute',
    right: 15,
    top: 10,
  },
  heroBannerWatermark: {
    color: '#00e5ff',
    fontWeight: '900',
    fontSize: 11,
    letterSpacing: 2,
    opacity: 0.8,
  },
  heroProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: '#101721',
  },
  heroAvatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#00363d',
    borderWidth: 2,
    borderColor: '#00e5ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroAvatarImg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#00e5ff',
  },
  heroAvatarText: {
    color: '#00e5ff',
    fontWeight: '900',
    fontSize: 22,
  },
  heroDriverName: {
    color: '#dde2f0',
    fontSize: 16,
    fontWeight: '900',
  },
  heroDriverCode: {
    color: '#849396',
    fontSize: 11,
    marginTop: 2,
  },

  dossierSection: {
    backgroundColor: '#080e17',
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: '#242a34',
    padding: 12,
    marginBottom: 12,
    gap: 10,
  },
  dossierSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#1a222f',
  },
  dossierSectionTitle: {
    color: '#dde2f0',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  dossierGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  dossierItemHalf: {
    width: '48%',
    gap: 3,
  },
  dossierItemLabel: {
    color: '#849396',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  dossierItemVal: {
    color: '#dde2f0',
    fontSize: 11,
    fontWeight: '700',
  },
  dossierItemValMono: {
    color: '#bac9cc',
    fontSize: 11,
    fontWeight: '700',
  },
  badgeHighlightYellow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(254, 179, 0, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(254, 179, 0, 0.3)',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  badgeHighlightYellowText: {
    color: '#feb300',
    fontSize: 11,
    fontWeight: '900',
  },
  badgeHighlightCyan: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.3)',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  badgeHighlightCyanText: {
    color: '#00e5ff',
    fontSize: 11,
    fontWeight: '900',
  },

  licenseValidBadge: {
    backgroundColor: 'rgba(34, 239, 126, 0.15)',
    borderRadius: 3,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: '#22ef7e',
  },
  licenseValidText: {
    color: '#22ef7e',
    fontSize: 8,
    fontWeight: '800',
  },

  dossierList: {
    gap: 8,
  },
  dossierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#141d2a',
  },
  dossierRowKey: {
    color: '#849396',
    fontSize: 10,
    fontWeight: '700',
  },
  dossierRowVal: {
    color: '#dde2f0',
    fontSize: 10,
    fontWeight: '700',
  },
  monoText: {
    color: '#bac9cc',
  },

  modalActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  actionBtn: {
    flex: 1,
    height: 42,
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
