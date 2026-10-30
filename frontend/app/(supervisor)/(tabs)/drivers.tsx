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
import { adminFleetStore } from '../../../src/store/adminFleetStore';
import { radius, spacing } from '../../../src/theme';
import { SCK_FLEET, resolveCheNumber, resolveOperator, findFleetVehicle } from '../../../src/config/fleet';
import { useResponsive } from '../../../src/hooks/useResponsive';

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

  // Edit Driver Details State (Supervisor)
  const [editDriverModalVisible, setEditDriverModalVisible] = useState(false);
  const [editingDriver, setEditingDriver] = useState<any | null>(null);
  const [savingDriverEdit, setSavingDriverEdit] = useState(false);
  const [editFullName, setEditFullName] = useState('');
  const [editMobile, setEditMobile] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editNic, setEditNic] = useState('');
  const [editEmpId, setEditEmpId] = useState('');
  const [editLicense, setEditLicense] = useState('');
  const [editLicenseExpiry, setEditLicenseExpiry] = useState('');
  const [editDriverPortPass, setEditDriverPortPass] = useState('');
  const [editVehiclePortPass, setEditVehiclePortPass] = useState('');
  const [editVehicleNo, setEditVehicleNo] = useState('');
  const [editCheNo, setEditCheNo] = useState('');
  const [editDob, setEditDob] = useState('');
  const [editEmergencyName, setEditEmergencyName] = useState('');
  const [editEmergencyPhone, setEditEmergencyPhone] = useState('');

  const handleOpenEditDriverModal = (drv: any) => {
    setEditingDriver(drv);
    setEditFullName(drv.fullName || '');
    setEditMobile(drv.mobileNumber || '');
    setEditEmail(drv.email || '');
    setEditAddress(drv.address || '');
    setEditNic(drv.nic || '');
    setEditEmpId(drv.employeeId || '');
    setEditLicense(drv.licenseNumber || '');
    setEditLicenseExpiry(drv.licenseExpiryDate || '2028-09-15');
    setEditDriverPortPass(drv.driverPortPassExpiryDate || '2026-11-15');
    setEditVehiclePortPass(drv.vehiclePortPassExpiryDate || '2026-11-20');
    setEditVehicleNo(drv.vehicleNumber || 'LY-6439');
    setEditCheNo(drv.chassisNumber || drv.cheNumber || 'CHE 100');
    setEditDob(drv.dateOfBirth || '1988-06-14');
    setEditEmergencyName(drv.emergencyContactName || '');
    setEditEmergencyPhone(drv.emergencyContactNumber || '');
    setEditDriverModalVisible(true);
  };

  const handleSaveDriverEdit = async () => {
    if (!editFullName.trim()) {
      if (Platform.OS === 'web') window.alert('Driver full name is required');
      else Alert.alert('Required', 'Driver full name is required');
      return;
    }
    setSavingDriverEdit(true);
    const drvId = editingDriver.id || editingDriver.driverCode || 'DRV-00001';
    const payload = {
      fullName: editFullName.trim(),
      mobileNumber: editMobile.trim(),
      email: editEmail.trim(),
      address: editAddress.trim(),
      nic: editNic.trim(),
      employeeId: editEmpId.trim(),
      licenseNumber: editLicense.trim(),
      licenseExpiryDate: editLicenseExpiry.trim(),
      driverPortPassExpiryDate: editDriverPortPass.trim(),
      vehiclePortPassExpiryDate: editVehiclePortPass.trim(),
      vehicleNumber: editVehicleNo.trim().toUpperCase(),
      chassisNumber: editCheNo.trim().toUpperCase(),
      cheNumber: editCheNo.trim().toUpperCase(),
      dateOfBirth: editDob.trim(),
      emergencyContactName: editEmergencyName.trim(),
      emergencyContactNumber: editEmergencyPhone.trim(),
    };

    try {
      await axios.put(`${API_BASE_URL}/drivers/${drvId}`, payload);
      await adminFleetStore.updateDriverDetails(drvId, payload);
      setDrivers((prev) =>
        prev.map((d) => (d.id === drvId || d.driverCode === drvId ? { ...d, ...payload } : d))
      );
      if (selectedDriver && (selectedDriver.id === drvId || selectedDriver.driverCode === drvId)) {
        setSelectedDriver({ ...selectedDriver, ...payload });
      }
      setEditDriverModalVisible(false);
      if (Platform.OS === 'web') window.alert('Driver dossier updated successfully!');
      else Alert.alert('Success', 'Driver dossier updated successfully!');
    } catch {
      await adminFleetStore.updateDriverDetails(drvId, payload);
      setDrivers((prev) =>
        prev.map((d) => (d.id === drvId || d.driverCode === drvId ? { ...d, ...payload } : d))
      );
      if (selectedDriver && (selectedDriver.id === drvId || selectedDriver.driverCode === drvId)) {
        setSelectedDriver({ ...selectedDriver, ...payload });
      }
      setEditDriverModalVisible(false);
      if (Platform.OS === 'web') window.alert('Driver dossier updated locally!');
      else Alert.alert('Saved', 'Driver dossier updated locally!');
    } finally {
      setSavingDriverEdit(false);
    }
  };

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
      monthlyTarget: 300,
      monthlyContainers: 50 + ((idx * 4) % 65),
      totalTrips: 50 + ((idx * 4) % 65),
      createdAt: '2024-02-15T08:30:00',
      profilePhoto: DRIVER_PHOTO_POOL[idx % DRIVER_PHOTO_POOL.length],
      coverImage: DRIVER_COVER_POOL[idx % DRIVER_COVER_POOL.length],
    }));
  };

  const fetchDrivers = useCallback(async () => {
    try {
      // 1. Fetch authoritative drivers from adminFleetStore (persisted registered drivers + fleet drivers)
      const storeDrivers = await adminFleetStore.getDrivers();

      // 2. Attempt remote sync with backend API if online (with 2000ms fast timeout)
      try {
        const res = await axios.get(`${API_BASE_URL}/drivers`, { timeout: 2000 });
        const list = Array.isArray(res.data) ? res.data : [];
        if (list.length > 0) {
          const remoteCodes = new Set(list.map((d: any) => (d.driverCode || d.empId || '').toUpperCase()));
          const localOnly = storeDrivers.filter(
            (sd) => !remoteCodes.has((sd.driverCode || '').toUpperCase()) &&
                    !remoteCodes.has((sd.employeeId || '').toUpperCase())
          );
          const mergedRemote = list.map((remoteDriver: any, i: number) => {
            const matchedStore = storeDrivers.find(
              (sd) =>
                (sd.driverCode && sd.driverCode.toUpperCase() === (remoteDriver.driverCode || '').toUpperCase()) ||
                (sd.employeeId && sd.employeeId.toUpperCase() === (remoteDriver.employeeId || remoteDriver.empId || '').toUpperCase())
            );
            return {
              ...matchedStore,
              ...remoteDriver,
              id: remoteDriver.id || matchedStore?.id || `d-${remoteDriver.driverCode || i}`,
              fullName: remoteDriver.fullName || remoteDriver.name || matchedStore?.fullName || `Driver ${i + 1}`,
              driverCode: remoteDriver.driverCode || remoteDriver.empId || matchedStore?.driverCode || `DRV-${String(i + 1).padStart(5, '0')}`,
              employeeId: remoteDriver.employeeId || remoteDriver.empId || matchedStore?.employeeId || `SCK-EMP-${1001 + i}`,
              nic: remoteDriver.nic || matchedStore?.nic || `1985${String(1000000 + i * 837).slice(1)}V`,
              mobileNumber: remoteDriver.mobileNumber || matchedStore?.mobileNumber || '+94 77 123 4567',
              vehicleNumber: remoteDriver.vehicleNumber || matchedStore?.vehicleNumber || 'LY-6439',
              chassisNumber: remoteDriver.chassisNumber || remoteDriver.cheNumber || matchedStore?.chassisNumber || 'SCK 100',
              cheNumber: remoteDriver.cheNumber || remoteDriver.chassisNumber || matchedStore?.cheNumber || 'SCK 100',
              operator: remoteDriver.operator || matchedStore?.operator || 'SCK Logistics',
              trailerSize: remoteDriver.trailerSize || matchedStore?.trailerSize || '40FT',
              licenseNumber: remoteDriver.licenseNumber || remoteDriver.drivingLicenceNumber || matchedStore?.licenseNumber || 'LIC-000000',
              licenseExpiryDate: remoteDriver.licenseExpiryDate || matchedStore?.licenseExpiryDate || '2030-12-31',
              dateOfBirth: remoteDriver.dateOfBirth || matchedStore?.dateOfBirth || '1992-06-15',
              driverPortPassExpiryDate: remoteDriver.driverPortPassExpiryDate || matchedStore?.driverPortPassExpiryDate || '2026-11-15',
              vehiclePortPassExpiryDate: remoteDriver.vehiclePortPassExpiryDate || matchedStore?.vehiclePortPassExpiryDate || '2026-11-20',
              address: remoteDriver.address || matchedStore?.address || 'Port Access Road, Colombo',
              email: remoteDriver.email || matchedStore?.email || `${(remoteDriver.employeeId || 'drv').toLowerCase()}@smartitt.lk`,
              emergencyContactName: remoteDriver.emergencyContactName || matchedStore?.emergencyContactName || 'Port Dispatch Control',
              emergencyContactNumber: remoteDriver.emergencyContactNumber || matchedStore?.emergencyContactNumber || '0112456789',
              status: remoteDriver.status || matchedStore?.status || 'ACTIVE',
              monthlyTarget: remoteDriver.monthlyTarget || matchedStore?.monthlyTarget || 300,
              monthlyContainers: remoteDriver.monthlyContainers || matchedStore?.monthlyContainers || (50 + ((i * 4) % 65)),
              totalTrips: remoteDriver.totalTrips ?? matchedStore?.totalTrips ?? (50 + ((i * 4) % 65)),
              profilePhoto: remoteDriver.profilePhoto || matchedStore?.profilePhoto || DRIVER_PHOTO_POOL[i % DRIVER_PHOTO_POOL.length],
              coverImage: remoteDriver.coverImage || matchedStore?.coverImage || DRIVER_COVER_POOL[i % DRIVER_COVER_POOL.length],
            };
          });
          setDrivers([...localOnly, ...mergedRemote]);
          return;
        }
      } catch (apiErr) {
        // Backend offline / mock fallback: use storeDrivers
      }

      setDrivers(storeDrivers);
    } catch {
      const fallback = adminFleetStore.getAllDriversList();
      setDrivers(fallback.length > 0 ? fallback : getFallbackDrivers());
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
      await adminFleetStore.updateDriverStatus(drv.id || drv.driverCode, newStatus);
      setDrivers((prev) =>
        prev.map((d) => (d.id === drv.id || d.driverCode === drv.driverCode ? { ...d, status: newStatus } : d))
      );
      if (selectedDriver && (selectedDriver.id === drv.id || selectedDriver.driverCode === drv.id)) {
        setSelectedDriver({ ...selectedDriver, status: newStatus });
      }
    } catch {
      await adminFleetStore.updateDriverStatus(drv.id || drv.driverCode, newStatus);
      // Local state toggle if offline or demo
      setDrivers((prev) =>
        prev.map((d) => (d.id === drv.id || d.driverCode === drv.driverCode ? { ...d, status: newStatus } : d))
      );
      if (selectedDriver && (selectedDriver.id === drv.id || selectedDriver.driverCode === drv.id)) {
        setSelectedDriver({ ...selectedDriver, status: newStatus });
      }
    } finally {
      setUpdatingStatus(false);
    }
  };

  const filteredDrivers = drivers.map((d, idx) => {
    const vMatch = findFleetVehicle(d.vehicleNumber) || SCK_FLEET.find(
      (f) => f.vehicleNumber === d.vehicleNumber || f.cheNumber === d.chassisNumber || f.assignedDriver?.driverCode === d.driverCode
    );
    const resolvedVeh = d.vehicleNumber || vMatch?.vehicleNumber || 'LY-6439';
    const resolvedChe = d.chassisNumber || d.cheNumber || resolveCheNumber(resolvedVeh, vMatch?.cheNumber);
    const resolvedOp = d.operator || resolveOperator(resolvedVeh, vMatch?.operator);

    return {
      ...d,
      fullName: d.fullName || d.name || `Driver ${idx + 1}`,
      driverCode: d.driverCode || d.empId || `DRV-${String(idx + 1).padStart(5, '0')}`,
      username: d.username || d.driverCode || d.empId || `DRV-${String(idx + 1).padStart(5, '0')}`,
      employeeId: d.employeeId || `SCK-EMP-${String(1001 + idx)}`,
      nic: d.nic || `198${(5 + idx) % 15}${String(1000000 + idx * 837).slice(1)}V`,
      mobileNumber: d.mobileNumber || vMatch?.assignedDriver?.mobile || `+94 77 ${String(2345678 + idx * 1357).slice(0, 7)}`,
      email: d.email || `${(d.fullName || d.name || `driver${idx + 1}`).toLowerCase().replace(/\s+/g, '.')}@scklogistics.lk`,
      address: d.address || `No. ${14 + idx * 2}, Port Access Road, Colombo 15, Sri Lanka`,
      licenseNumber: d.licenseNumber || d.drivingLicenceNumber || `B${String(8765400 + idx * 12)}`,
      licenseExpiryDate: d.licenseExpiryDate || `2028-09-${String(10 + (idx % 18)).padStart(2, '0')}`,
      dateOfBirth: d.dateOfBirth || `198${(5 + idx) % 10}-0${1 + (idx % 9)}-${String(12 + (idx % 15)).padStart(2, '0')}`,
      emergencyContactName: d.emergencyContactName || (idx % 2 === 0 ? 'Nimali Perera (Spouse)' : 'Bandara Silva (Brother)'),
      emergencyContactNumber: d.emergencyContactNumber || `+94 71 ${String(5123456 + idx * 987).slice(0, 7)}`,
      vehicleNumber: resolvedVeh,
      chassisNumber: resolvedChe,
      cheNumber: resolvedChe,
      operator: resolvedOp,
      status: d.status || 'ACTIVE',
      totalTrips: d.totalTrips ?? (20 + ((idx * 7) % 35)),
      createdAt: d.createdAt || '2024-02-15T08:30:00',
      driverPortPassExpiryDate: d.driverPortPassExpiryDate || '2026-11-15',
      vehiclePortPassExpiryDate: d.vehiclePortPassExpiryDate || '2026-11-20',
      profilePhoto: d.profilePhoto || DRIVER_PHOTO_POOL[idx % DRIVER_PHOTO_POOL.length],
      coverImage: d.coverImage || DRIVER_COVER_POOL[idx % DRIVER_COVER_POOL.length],
    };
  }).filter((d) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      (d.fullName || '').toLowerCase().includes(q) ||
      (d.driverCode || '').toLowerCase().includes(q) ||
      (d.username || '').toLowerCase().includes(q) ||
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
  const { width, topInset, bottomInset, contentMaxWidth, containerPaddingHorizontal, isSmallMobile } = useResponsive();

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
                                : { backgroundColor: 'rgba(0, 229, 255, 0.15)', borderColor: '#00e5ff' },
                            ]}
                          >
                            <Text
                              style={[
                                styles.operatorBadgeText,
                                isSdr ? { color: '#feb300' } : { color: '#00e5ff' },
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
                        {/* LOGIN USERNAME pill */}
                        <View style={styles.usernamePill}>
                          <Ionicons name="key" size={10} color="#00e5ff" />
                          <Text style={styles.usernamePillLabel}>LOGIN USERNAME:</Text>
                          <Text style={styles.usernamePillValue}>{drv.username || code}</Text>
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
                        <Text style={styles.specValHighlight}>{drv.vehicleNumber || 'LY-6439'}</Text>
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

                    {/* Port Pass Status Row */}
                    {(() => {
                      const dPass = drv.driverPortPassExpiryDate || '2026-11-15';
                      const vPass = drv.vehiclePortPassExpiryDate || '2026-11-20';
                      const dDays = Math.round((new Date(dPass).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                      const vDays = Math.round((new Date(vPass).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                      const isDue = dDays <= 30 || vDays <= 30;

                      return (
                        <View style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          backgroundColor: isDue ? 'rgba(254, 179, 0, 0.08)' : 'rgba(0, 229, 255, 0.05)',
                          borderWidth: 1,
                          borderColor: isDue ? 'rgba(254, 179, 0, 0.3)' : 'rgba(0, 229, 255, 0.15)',
                          borderRadius: radius.md,
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          marginBottom: 8,
                          flexWrap: 'wrap',
                          gap: 6,
                        }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Ionicons name="card" size={12} color={isDue ? '#feb300' : '#00e5ff'} />
                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#dde2f0' }}>
                              Driver Pass: <Text style={{ color: dDays <= 30 ? '#feb300' : '#00e5ff' }}>{dPass}</Text> ({dDays <= 0 ? 'EXPIRED' : `${dDays}d`})
                            </Text>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Ionicons name="bus" size={12} color={vDays <= 30 ? '#feb300' : '#22ef7e'} />
                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#dde2f0' }}>
                              Truck Pass: <Text style={{ color: vDays <= 30 ? '#feb300' : '#22ef7e' }}>{vPass}</Text> ({vDays <= 0 ? 'EXPIRED' : `${vDays}d`})
                            </Text>
                          </View>
                          {isDue && (
                            <View style={{ backgroundColor: 'rgba(254, 179, 0, 0.2)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                              <Text style={{ fontSize: 9, fontWeight: '800', color: '#feb300' }}>⚠️ RENEWAL DUE</Text>
                            </View>
                          )}
                        </View>
                      );
                    })()}

                    {/* Monthly Mission Target Bar (300 Containers Target) */}
                    <View style={styles.monthlyMissionCard}>
                      <View style={styles.monthlyMissionTop}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                          <Ionicons name="flag" size={12} color="#feb300" />
                          <Text style={styles.monthlyMissionTitle}>MISSION (THIS MONTH TARGET)</Text>
                        </View>
                        <Text style={styles.monthlyMissionStat}>
                          <Text style={styles.monthlyMissionHighlight}>{drv.monthlyContainers || 50}</Text> / {drv.monthlyTarget || 300} Containers
                        </Text>
                      </View>
                      <View style={styles.progressBarTrack}>
                        <View
                          style={[
                            styles.progressBarFill,
                            {
                              width: `${Math.min(100, Math.round(((drv.monthlyContainers || 50) / (drv.monthlyTarget || 300)) * 100))}%`,
                            },
                          ]}
                        />
                      </View>
                      <View style={styles.monthlyMissionBottom}>
                        <Text style={styles.monthlyMissionPct}>
                          {Math.round(((drv.monthlyContainers || 50) / (drv.monthlyTarget || 300)) * 100)}% of 300 Containers Target Completed
                        </Text>
                        {(drv.monthlyContainers || 50) >= 50 && (
                          <View style={styles.milestonePill}>
                            <Ionicons name="trophy" size={10} color="#00363d" />
                            <Text style={styles.milestonePillText}>50+ CONTAINERS MILESTONE</Text>
                          </View>
                        )}
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
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                    <Ionicons name="document-text" size={18} color="#00e5ff" />
                    <View>
                      <Text style={styles.modalHeaderTitle}>DRIVER SIGN-UP DOSSIER</Text>
                      <Text style={styles.modalHeaderSubtitle}>Official Port Logistics Registration Record</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <TouchableOpacity
                      style={styles.headerEditBtn}
                      onPress={() => handleOpenEditDriverModal(selectedDriver)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="create-outline" size={13} color="#00e5ff" />
                      <Text style={styles.headerEditBtnText}>EDIT</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.modalCloseBtn}
                      onPress={() => setSelectedDriver(null)}
                    >
                      <Ionicons name="close" size={20} color="#dde2f0" />
                    </TouchableOpacity>
                  </View>
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
                        <Text style={styles.dossierItemLabel}>MISSION (THIS MONTH TARGET)</Text>
                        <Text style={[styles.dossierItemVal, { color: '#feb300', fontWeight: '900' }]}>
                          {selectedDriver.monthlyContainers || 50} / {selectedDriver.monthlyTarget || 300} Containers
                        </Text>
                        <Text style={{ fontSize: 10, color: '#22ef7e', fontWeight: '700', marginTop: 2 }}>
                          {Math.round(((selectedDriver.monthlyContainers || 50) / (selectedDriver.monthlyTarget || 300)) * 100)}% of 300 Containers Target
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

                  {/* 4. SLPA SECURITY PORT PASS PERMITS (DRIVER & VEHICLE) */}
                  <View style={[styles.dossierSection, { borderColor: '#feb300' }]}>
                    <View style={styles.dossierSectionHeader}>
                      <Ionicons name="shield-checkmark" size={15} color="#feb300" />
                      <Text style={[styles.dossierSectionTitle, { color: '#feb300' }]}>SLPA SECURITY PORT PASS PERMITS</Text>
                    </View>
                    <View style={styles.dossierGrid}>
                      <View style={styles.dossierItemHalf}>
                        <Text style={styles.dossierItemLabel}>DRIVER PORT PASS EXPIRE</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                          <Text style={[styles.dossierItemValMono, { color: '#00e5ff', fontWeight: '800' }]}>
                            {selectedDriver.driverPortPassExpiryDate || '2026-11-15'}
                          </Text>
                          <View style={{ backgroundColor: 'rgba(254, 179, 0, 0.2)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                            <Text style={{ fontSize: 9, fontWeight: '800', color: '#feb300' }}>
                              {Math.round((new Date(selectedDriver.driverPortPassExpiryDate || '2026-11-15').getTime() - Date.now()) / (1000 * 60 * 60 * 24))}d left
                            </Text>
                          </View>
                        </View>
                      </View>
                      <View style={styles.dossierItemHalf}>
                        <Text style={styles.dossierItemLabel}>VEHICLE PORT PASS EXPIRE</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                          <Text style={[styles.dossierItemValMono, { color: '#feb300', fontWeight: '800' }]}>
                            {selectedDriver.vehiclePortPassExpiryDate || '2026-11-20'}
                          </Text>
                          <View style={{ backgroundColor: 'rgba(254, 179, 0, 0.2)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                            <Text style={{ fontSize: 9, fontWeight: '800', color: '#feb300' }}>
                              {Math.round((new Date(selectedDriver.vehiclePortPassExpiryDate || '2026-11-20').getTime() - Date.now()) / (1000 * 60 * 60 * 24))}d left
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* 5. CONTACT & RESIDENTIAL ADDRESS */}
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

                  {/* 6. SYSTEM LOGIN CREDENTIALS */}
                  <View style={[styles.dossierSection, { borderColor: 'rgba(0,229,255,0.4)' }]}>
                    <View style={styles.dossierSectionHeader}>
                      <Ionicons name="key" size={15} color="#00e5ff" />
                      <Text style={[styles.dossierSectionTitle, { color: '#00e5ff' }]}>SYSTEM LOGIN CREDENTIALS</Text>
                    </View>
                    {/* Big Username Highlight */}
                    <View style={{
                      backgroundColor: 'rgba(0,229,255,0.08)',
                      borderWidth: 1,
                      borderColor: 'rgba(0,229,255,0.35)',
                      borderRadius: 10,
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      marginBottom: 10,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                    }}>
                      <View style={{
                        width: 36, height: 36,
                        backgroundColor: 'rgba(0,229,255,0.15)',
                        borderRadius: 18,
                        alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Ionicons name="person-circle" size={20} color="#00e5ff" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: '#849396', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>
                          App Login Username
                        </Text>
                        <Text style={{ fontSize: 18, fontWeight: '900', color: '#00e5ff', letterSpacing: 1.5, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}>
                          {selectedDriver.username || selectedDriver.driverCode}
                        </Text>
                      </View>
                      <View style={{ backgroundColor: 'rgba(34,239,126,0.15)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(34,239,126,0.4)' }}>
                        <Text style={{ fontSize: 9, fontWeight: '800', color: '#22ef7e' }}>PORTAL ACCESS</Text>
                      </View>
                    </View>
                    <View style={styles.dossierGrid}>
                      <View style={styles.dossierItemHalf}>
                        <Text style={styles.dossierItemLabel}>DRIVER CODE (ID)</Text>
                        <Text style={[styles.dossierItemValMono, { color: '#00e5ff', fontWeight: '800' }]}>
                          {selectedDriver.driverCode}
                        </Text>
                      </View>
                      <View style={styles.dossierItemHalf}>
                        <Text style={styles.dossierItemLabel}>EMPLOYEE ID</Text>
                        <Text style={[styles.dossierItemValMono, { color: '#bac9cc' }]}>
                          {selectedDriver.employeeId || '—'}
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
                      style={[styles.actionBtn, { backgroundColor: 'rgba(0, 229, 255, 0.15)', borderColor: '#00e5ff' }]}
                      onPress={() => handleOpenEditDriverModal(selectedDriver)}
                    >
                      <Ionicons name="create-outline" size={16} color="#00e5ff" />
                      <Text style={[styles.actionBtnText, { color: '#00e5ff', fontWeight: '800' }]}>
                        EDIT DRIVER
                      </Text>
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
                        CALL
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

      {/* ─── SUPERVISOR EDIT DRIVER DOSSIER MODAL ─── */}
      <Modal
        visible={editDriverModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditDriverModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="create-outline" size={18} color="#00e5ff" />
                <View>
                  <Text style={styles.modalHeaderTitle}>EDIT DRIVER DOSSIER</Text>
                  <Text style={styles.modalHeaderSubtitle}>Modify driver, vehicle & license credentials</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setEditDriverModalVisible(false)}
              >
                <Ionicons name="close" size={20} color="#dde2f0" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 16 }} showsVerticalScrollIndicator={false}>
              <Text style={styles.editFieldLabel}>DRIVER FULL NAME *</Text>
              <TextInput
                style={styles.editTextInput}
                value={editFullName}
                onChangeText={setEditFullName}
                placeholder="Full Name"
                placeholderTextColor="#849396"
              />

              <View style={{ flexDirection: (isSmallMobile || width < 420) ? 'column' : 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.editFieldLabel}>MOBILE NUMBER *</Text>
                  <TextInput
                    style={styles.editTextInput}
                    value={editMobile}
                    onChangeText={setEditMobile}
                    placeholder="+94 77 XXXXXXX"
                    placeholderTextColor="#849396"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.editFieldLabel}>EMAIL ADDRESS</Text>
                  <TextInput
                    style={styles.editTextInput}
                    value={editEmail}
                    onChangeText={setEditEmail}
                    placeholder="driver@scklogistics.lk"
                    placeholderTextColor="#849396"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <View style={{ flexDirection: (isSmallMobile || width < 420) ? 'column' : 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.editFieldLabel}>NIC NUMBER</Text>
                  <TextInput
                    style={styles.editTextInput}
                    value={editNic}
                    onChangeText={setEditNic}
                    placeholder="1985XXXXXXV"
                    placeholderTextColor="#849396"
                    autoCapitalize="characters"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.editFieldLabel}>EMPLOYEE ID</Text>
                  <TextInput
                    style={styles.editTextInput}
                    value={editEmpId}
                    onChangeText={setEditEmpId}
                    placeholder="SCK-EMP-1001"
                    placeholderTextColor="#849396"
                    autoCapitalize="characters"
                  />
                </View>
              </View>

              <Text style={styles.editFieldLabel}>RESIDENTIAL ADDRESS</Text>
              <TextInput
                style={styles.editTextInput}
                value={editAddress}
                onChangeText={setEditAddress}
                placeholder="Residential Address"
                placeholderTextColor="#849396"
              />

              <View style={{ flexDirection: (isSmallMobile || width < 420) ? 'column' : 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.editFieldLabel}>HEAVY DRIVING LICENSE</Text>
                  <TextInput
                    style={styles.editTextInput}
                    value={editLicense}
                    onChangeText={setEditLicense}
                    placeholder="B8765400"
                    placeholderTextColor="#849396"
                    autoCapitalize="characters"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.editFieldLabel}>LICENSE EXPIRY DATE</Text>
                  <TextInput
                    style={styles.editTextInput}
                    value={editLicenseExpiry}
                    onChangeText={setEditLicenseExpiry}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#849396"
                  />
                </View>
              </View>

              <View style={{ flexDirection: (isSmallMobile || width < 420) ? 'column' : 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.editFieldLabel}>DRIVER PORT PASS EXPIRY</Text>
                  <TextInput
                    style={styles.editTextInput}
                    value={editDriverPortPass}
                    onChangeText={setEditDriverPortPass}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#849396"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.editFieldLabel}>VEHICLE PORT PASS EXPIRY</Text>
                  <TextInput
                    style={styles.editTextInput}
                    value={editVehiclePortPass}
                    onChangeText={setEditVehiclePortPass}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#849396"
                  />
                </View>
              </View>

              <View style={{ flexDirection: (isSmallMobile || width < 420) ? 'column' : 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.editFieldLabel}>ASSIGNED VEHICLE NO</Text>
                  <TextInput
                    style={styles.editTextInput}
                    value={editVehicleNo}
                    onChangeText={setEditVehicleNo}
                    placeholder="LY-6439"
                    placeholderTextColor="#849396"
                    autoCapitalize="characters"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.editFieldLabel}>CHE / CHASSIS NO</Text>
                  <TextInput
                    style={styles.editTextInput}
                    value={editCheNo}
                    onChangeText={setEditCheNo}
                    placeholder="SCK 100"
                    placeholderTextColor="#849396"
                    autoCapitalize="characters"
                  />
                </View>
              </View>

              <Text style={styles.editFieldLabel}>DATE OF BIRTH</Text>
              <TextInput
                style={styles.editTextInput}
                value={editDob}
                onChangeText={setEditDob}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#849396"
              />

              <View style={{ flexDirection: (isSmallMobile || width < 420) ? 'column' : 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.editFieldLabel}>EMERGENCY CONTACT NAME</Text>
                  <TextInput
                    style={styles.editTextInput}
                    value={editEmergencyName}
                    onChangeText={setEditEmergencyName}
                    placeholder="Contact Name"
                    placeholderTextColor="#849396"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.editFieldLabel}>EMERGENCY CONTACT PHONE</Text>
                  <TextInput
                    style={styles.editTextInput}
                    value={editEmergencyPhone}
                    onChangeText={setEditEmergencyPhone}
                    placeholder="+94 71 XXXXXXX"
                    placeholderTextColor="#849396"
                  />
                </View>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16, marginBottom: 24 }}>
                <TouchableOpacity
                  style={styles.editCancelBtn}
                  onPress={() => setEditDriverModalVisible(false)}
                  disabled={savingDriverEdit}
                >
                  <Text style={styles.editCancelBtnText}>CANCEL</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.editSaveBtn}
                  onPress={handleSaveDriverEdit}
                  disabled={savingDriverEdit}
                  activeOpacity={0.88}
                >
                  {savingDriverEdit ? (
                    <ActivityIndicator size="small" color="#00363d" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-done" size={16} color="#00363d" />
                      <Text style={styles.editSaveBtnText}>SAVE DOSSIER</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
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
    flexGrow: 1,
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
  // ─── MONTHLY MISSION PROGRESS BAR ───
  monthlyMissionCard: {
    backgroundColor: '#101621',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1d2736',
    padding: 8,
    gap: 6,
  },
  monthlyMissionTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthlyMissionTitle: {
    color: '#849396',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  monthlyMissionStat: {
    color: '#dde2f0',
    fontSize: 10,
    fontWeight: '700',
  },
  monthlyMissionHighlight: {
    color: '#feb300',
    fontWeight: '900',
    fontSize: 11,
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#18202d',
    overflow: 'hidden',
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#feb300',
  },
  monthlyMissionBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthlyMissionPct: {
    color: '#849396',
    fontSize: 9,
    fontWeight: '600',
  },
  milestonePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#feb300',
    borderRadius: 3,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  milestonePillText: {
    color: '#00363d',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.3,
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
    width: '95%',
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
    minWidth: 140,
    flexGrow: 1,
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
  headerEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 229, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.4)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  headerEditBtnText: {
    color: '#00e5ff',
    fontSize: 11,
    fontWeight: '800',
  },
  editFieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#849396',
    marginBottom: 4,
    marginTop: 8,
    textTransform: 'uppercase',
  },
  editTextInput: {
    backgroundColor: '#080e17',
    borderWidth: 1,
    borderColor: '#242a34',
    borderRadius: radius.DEFAULT,
    color: '#dde2f0',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
    ...(Platform.OS === 'web' && { outlineStyle: 'none', cursor: 'text' } as any),
  },
  editCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: radius.DEFAULT,
    backgroundColor: '#1d2633',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editCancelBtnText: {
    color: '#849396',
    fontSize: 12,
    fontWeight: '700',
  },
  editSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: radius.DEFAULT,
    backgroundColor: '#00e5ff',
    justifyContent: 'center',
  },
  editSaveBtnText: {
    color: '#00363d',
    fontSize: 12,
    fontWeight: '800',
  },
  usernamePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.35)',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  usernamePillLabel: {
    color: '#00e5ff',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  usernamePillValue: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
