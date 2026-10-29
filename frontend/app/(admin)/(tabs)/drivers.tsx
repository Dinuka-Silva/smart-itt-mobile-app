import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Alert,
  Image,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { adminService } from '../../../src/services/adminService';
import { credentialStore } from '../../../src/services/credentialStore';
import { adminFleetStore, AdminVehicle } from '../../../src/store/adminFleetStore';
import { useResponsive } from '../../../src/hooks/useResponsive';
import { AdminSignOutModal } from '../../../src/components/AdminSignOutModal';

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

export default function AdminDriversScreen() {
  const { topInset, bottomInset, containerPaddingHorizontal } = useResponsive();

  const [drivers, setDrivers] = useState<any[]>([]);
  const [fleetVehicles, setFleetVehicles] = useState<AdminVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED'>('ALL');

  const totalDriversCount = drivers.length;
  const activeDriversCount = useMemo(() => drivers.filter((d) => (d.status || 'ACTIVE') === 'ACTIVE').length, [drivers]);
  const suspendedDriversCount = useMemo(() => drivers.filter((d) => d.status === 'SUSPENDED').length, [drivers]);
  const assignedVehiclesCount = useMemo(() => drivers.filter((d) => d.vehicleNumber && d.vehicleNumber !== 'UNASSIGNED').length, [drivers]);

  // Create Driver Modal
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [creating, setCreating] = useState(false);
  const [fullName, setFullName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [nic, setNic] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [drivingLicenceNumber, setDrivingLicenceNumber] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [chassisNumber, setChassisNumber] = useState('');
  const [selectedVehicleObj, setSelectedVehicleObj] = useState<AdminVehicle | null>(null);
  const [vehiclePickerModalVisible, setVehiclePickerModalVisible] = useState(false);
  const [vehiclePickerSearch, setVehiclePickerSearch] = useState('');
  const [driverPassword, setDriverPassword] = useState('driver');

  // Edit / Action Modal
  const [selectedDriver, setSelectedDriver] = useState<any | null>(null);
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [signOutModalVisible, setSignOutModalVisible] = useState(false);

  // Dedicated Password Reset Modal State
  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [driverToReset, setDriverToReset] = useState<any | null>(null);
  const [newTempPassword, setNewTempPassword] = useState('driver');
  const [resettingPassword, setResettingPassword] = useState(false);

  const openResetPasswordModal = (driver: any) => {
    setDriverToReset(driver);
    setNewTempPassword('driver');
    setResetModalVisible(true);
  };

  const handleConfirmResetPassword = async () => {
    if (!driverToReset) return;
    const pwd = newTempPassword.trim() || 'driver';
    setResettingPassword(true);
    try {
      await adminFleetStore.resetDriverPassword(driverToReset.id || driverToReset.driverCode, pwd);
      if (driverToReset.driverCode) {
        await credentialStore.resetPasswordByAdmin(driverToReset.driverCode, pwd);
      }
      if (driverToReset.employeeId) {
        await credentialStore.resetPasswordByAdmin(driverToReset.employeeId, pwd);
      }

      if (Platform.OS === 'web') {
        window.alert(`Password for ${driverToReset.fullName} (${driverToReset.driverCode}) has been reset to default: ${pwd}`);
      } else {
        Alert.alert(
          'Password Reset Successful',
          `The password for ${driverToReset.fullName} (${driverToReset.driverCode}) has been reset to default:\n\n${pwd}\n\nPlease share this credential with the driver. Account lockouts have been cleared.`
        );
      }
      setResetModalVisible(false);
      if (actionModalVisible) setActionModalVisible(false);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to reset password');
    } finally {
      setResettingPassword(false);
    }
  };

  const handleQuickToggleStatus = async (driver: any) => {
    const nextStatus = driver.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await adminFleetStore.updateDriverStatus(driver.id || driver.driverCode, nextStatus, `Admin quick-toggled status to ${nextStatus}`);
      setDrivers(prev => prev.map(d => (d.id === driver.id || d.driverCode === driver.driverCode) ? { ...d, status: nextStatus } : d));
      if (selectedDriver && (selectedDriver.id === driver.id || selectedDriver.driverCode === driver.driverCode)) {
        setSelectedDriver({ ...selectedDriver, status: nextStatus });
      }
      if (Platform.OS === 'web') {
        window.alert(`Driver ${driver.fullName} status updated to: ${nextStatus}`);
      } else {
        Alert.alert('Status Updated', `${driver.fullName} is now ${nextStatus}`);
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to update status');
    }
  };

  // Edit Driver Modal State
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingDriverId, setEditingDriverId] = useState('');
  const [editFullName, setEditFullName] = useState('');
  const [editEmployeeId, setEditEmployeeId] = useState('');
  const [editMobileNumber, setEditMobileNumber] = useState('');
  const [editNic, setEditNic] = useState('');
  const [editDrivingLicenceNumber, setEditDrivingLicenceNumber] = useState('');
  const [editLicenseExpiryDate, setEditLicenseExpiryDate] = useState('');
  const [editPortPassNumber, setEditPortPassNumber] = useState('');
  const [editPortPassExpiryDate, setEditPortPassExpiryDate] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editEmergencyContactName, setEditEmergencyContactName] = useState('');
  const [editEmergencyContactNumber, setEditEmergencyContactNumber] = useState('');
  const [editVehicleNumber, setEditVehicleNumber] = useState('');
  const [editStatus, setEditStatus] = useState<'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED'>('ACTIVE');
  const [savingEditDriver, setSavingEditDriver] = useState(false);

  const openEditDriver = (driver: any) => {
    setEditingDriverId(driver.id || driver.driverCode);
    setEditFullName(driver.fullName || '');
    setEditEmployeeId(driver.employeeId || '');
    setEditMobileNumber(driver.mobileNumber || '');
    setEditNic(driver.nic || '');
    setEditDrivingLicenceNumber(driver.licenseNumber || driver.drivingLicenceNumber || '');
    setEditLicenseExpiryDate(driver.licenseExpiryDate || '2028-12-31');
    setEditPortPassNumber(driver.portPassNumber || '');
    setEditPortPassExpiryDate(driver.portPassExpiryDate || '2027-06-30');
    setEditAddress(driver.address || '');
    setEditEmail(driver.email || '');
    setEditEmergencyContactName(driver.emergencyContactName || '');
    setEditEmergencyContactNumber(driver.emergencyContactNumber || '');
    setEditVehicleNumber(driver.vehicleNumber || 'UNASSIGNED');
    setEditStatus(driver.status || 'ACTIVE');
    setEditModalVisible(true);
  };

  const handleSaveDriverEdit = async () => {
    if (!editFullName.trim() || !editEmployeeId.trim() || !editMobileNumber.trim() || !editNic.trim()) {
      Alert.alert('Required Fields', 'Full Name, Employee ID, Mobile Number, and NIC are required.');
      return;
    }

    setSavingEditDriver(true);
    try {
      const updated = await adminFleetStore.updateDriverDetails(editingDriverId, {
        fullName: editFullName.trim(),
        employeeId: editEmployeeId.trim().toUpperCase(),
        mobileNumber: editMobileNumber.trim(),
        nic: editNic.trim(),
        licenseNumber: editDrivingLicenceNumber.trim().toUpperCase(),
        licenseExpiryDate: editLicenseExpiryDate.trim() || undefined,
        portPassNumber: editPortPassNumber.trim() || undefined,
        portPassExpiryDate: editPortPassExpiryDate.trim() || undefined,
        address: editAddress.trim() || undefined,
        email: editEmail.trim() || undefined,
        emergencyContactName: editEmergencyContactName.trim() || undefined,
        emergencyContactNumber: editEmergencyContactNumber.trim() || undefined,
        vehicleNumber: editVehicleNumber.trim() || 'UNASSIGNED',
        status: editStatus,
      });

      if (updated && selectedDriver && (selectedDriver.id === editingDriverId || selectedDriver.driverCode === editingDriverId)) {
        setSelectedDriver(updated);
      }

      Alert.alert('Driver Updated', `Driver ${editFullName.trim()} (${editEmployeeId.trim().toUpperCase()}) details updated successfully!`);
      setEditModalVisible(false);
      fetchDrivers();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to update driver details');
    } finally {
      setSavingEditDriver(false);
    }
  };

  const fetchDrivers = useCallback(async () => {
    try {
      const data = await adminFleetStore.getDrivers(search, statusFilter === 'ALL' ? undefined : statusFilter);
      setDrivers(data);
      const vehicles = adminFleetStore.getAllVehiclesList();
      setFleetVehicles(vehicles);
    } catch (err: any) {
      console.log('[AdminDrivers] Error fetching drivers:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchDrivers();
  }, [fetchDrivers]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDrivers();
  };

  const handleCreateDriver = async () => {
    if (!fullName.trim() || !employeeId.trim() || !nic.trim() || !mobileNumber.trim() || !drivingLicenceNumber.trim()) {
      Alert.alert('Required Fields', 'Please fill in Name, Employee ID, NIC, Mobile, and Driving License Number.');
      return;
    }

    setCreating(true);
    try {
      const newDriver = await adminFleetStore.addDriver({
        fullName: fullName.trim(),
        employeeId: employeeId.trim().toUpperCase(),
        nic: nic.trim(),
        mobileNumber: mobileNumber.trim(),
        drivingLicenceNumber: drivingLicenceNumber.trim().toUpperCase(),
        vehicleNumber: vehicleNumber ? vehicleNumber.trim().toUpperCase() : 'UNASSIGNED',
        chassisNumber: chassisNumber ? chassisNumber.trim().toUpperCase() : 'UNASSIGNED',
        password: driverPassword.trim() || 'driver',
      });

      Alert.alert('Driver Registered Successfully', `Driver ${newDriver.fullName} (${newDriver.driverCode}) has been registered and assigned!`);
      setCreateModalVisible(false);
      // Reset form
      setFullName('');
      setEmployeeId('');
      setNic('');
      setMobileNumber('');
      setDrivingLicenceNumber('');
      setVehicleNumber('');
      setChassisNumber('');
      setSelectedVehicleObj(null);
      fetchDrivers();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to create driver';
      Alert.alert('Error', msg);
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateStatus = async (status: string) => {
    if (!selectedDriver) return;
    try {
      await adminFleetStore.updateDriverStatus(selectedDriver.id || selectedDriver.driverCode, status, `Admin updated status to ${status}`);
      setDrivers(prev => prev.map(d => (d.id === selectedDriver.id || d.driverCode === selectedDriver.driverCode) ? { ...d, status } : d));
      setSelectedDriver({ ...selectedDriver, status });
      const msg = status === 'SUSPENDED'
        ? `Driver ${selectedDriver.fullName} (${selectedDriver.driverCode}) has been SUSPENDED. They will be blocked from logging into the mobile app and will see the suspension message.`
        : `Driver ${selectedDriver.fullName} status updated to ${status}.`;
      Alert.alert('Status Updated', msg);
      setActionModalVisible(false);
      fetchDrivers();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to update status');
    }
  };

  const handleResetPassword = async () => {
    if (!selectedDriver) return;
    Alert.alert(
      'Reset Password',
      `Reset password for ${selectedDriver.fullName} (${selectedDriver.driverCode}) to default 'driver'?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await adminService.resetDriverPassword(selectedDriver.id, 'driver');
              Alert.alert('Success', 'Password has been reset to: driver');
              setActionModalVisible(false);
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to reset password');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.root}>
      {/* Top Header */}
      <View style={[styles.header, { paddingTop: Math.max(topInset, 16) }]}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={styles.headerDot} />
            <Text style={styles.headerTitle}>Driver Fleet Operations</Text>
          </View>
          <Text style={styles.headerSubtitle}>
            {totalDriversCount} Personnel Enrolled • {activeDriversCount} Certified Active
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity
            style={styles.createBtn}
            onPress={() => setCreateModalVisible(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="person-add" size={14} color="#070c14" style={{ marginRight: 4 }} />
            <Text style={styles.createBtnText}>NEW DRIVER</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerLogoutBtn}
            onPress={() => setSignOutModalVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={18} color="#ff8a80" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Driver Analytics HUD Strip */}
      <View style={styles.hudContainer}>
        <View style={[styles.hudCard, styles.hudCardTotal]}>
          <View style={styles.hudIconRow}>
            <Ionicons name="people" size={13} color="#00e5ff" />
            <Text style={styles.hudLabel}>TOTAL DRIVERS</Text>
          </View>
          <Text style={[styles.hudValue, { color: '#00e5ff' }]}>{totalDriversCount}</Text>
        </View>

        <View style={[styles.hudCard, styles.hudCardActive]}>
          <View style={styles.hudIconRow}>
            <Ionicons name="checkmark-circle" size={13} color="#00e676" />
            <Text style={styles.hudLabel}>ON DUTY</Text>
          </View>
          <Text style={[styles.hudValue, { color: '#00e676' }]}>{activeDriversCount}</Text>
        </View>

        <View style={[styles.hudCard, styles.hudCardSuspended]}>
          <View style={styles.hudIconRow}>
            <Ionicons name="pause-circle" size={13} color="#ffab00" />
            <Text style={styles.hudLabel}>SUSPENDED</Text>
          </View>
          <Text style={[styles.hudValue, { color: '#ffab00' }]}>{suspendedDriversCount}</Text>
        </View>

        <View style={[styles.hudCard, styles.hudCardAssigned]}>
          <View style={styles.hudIconRow}>
            <Ionicons name="bus" size={13} color="#29b6f6" />
            <Text style={styles.hudLabel}>ASSIGNED</Text>
          </View>
          <Text style={[styles.hudValue, { color: '#29b6f6' }]}>{assignedVehiclesCount}</Text>
        </View>
      </View>

      {/* Search & Status Filter Bar */}
      <View style={styles.filterBar}>
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={16} color="#78909c" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search code, name, phone, vehicle..."
            placeholderTextColor="#546e7a"
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color="#78909c" />
            </TouchableOpacity>
          ) : null}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterPillsRow}>
          {[
            { key: 'ALL', label: `ALL (${totalDriversCount})` },
            { key: 'ACTIVE', label: `ACTIVE (${activeDriversCount})` },
            { key: 'SUSPENDED', label: `SUSPENDED (${suspendedDriversCount})` },
            { key: 'DEACTIVATED', label: 'DEACTIVATED' },
          ].map((st) => (
            <TouchableOpacity
              key={st.key}
              style={[
                styles.filterPill,
                statusFilter === st.key && styles.filterPillActive,
              ]}
              onPress={() => setStatusFilter(st.key as any)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterPillText,
                  statusFilter === st.key && styles.filterPillTextActive,
                ]}
              >
                {st.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Driver Cards List */}
      {loading && !refreshing ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#00e5ff" />
          <Text style={styles.loadingText}>Fetching driver records...</Text>
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
          {drivers.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="people-outline" size={32} color="#607d8b" />
              <Text style={styles.emptyCardText}>No drivers found matching your filter.</Text>
            </View>
          ) : (
            drivers.map((d, idx) => {
              const photo = d.profilePhoto || DRIVER_PHOTO_POOL[idx % DRIVER_PHOTO_POOL.length];
              const isSdr = (d.vehicleNumber || '').startsWith('LY-65');
              const opName = isSdr ? 'SDR LINK' : 'SCK Logistics';
              const isActive = (d.status || 'ACTIVE') === 'ACTIVE';
              const isSuspended = d.status === 'SUSPENDED';
              const initial = (d.fullName || 'D').charAt(0).toUpperCase();

              return (
                <TouchableOpacity
                  key={d.id || d.driverCode || idx}
                  style={styles.driverCard}
                  onPress={() => {
                    setSelectedDriver(d);
                    setActionModalVisible(true);
                  }}
                  activeOpacity={0.88}
                >
                  {/* Top Row: Avatar + Name + Operator Badge + Status */}
                  <View style={styles.driverTopRow}>
                    {photo ? (
                      <Image source={{ uri: photo }} style={styles.driverAvatarImg} />
                    ) : (
                      <View style={styles.driverAvatar}>
                        <Text style={styles.driverAvatarText}>{initial}</Text>
                      </View>
                    )}

                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <Text style={styles.driverFullName}>{d.fullName}</Text>
                        <View style={[styles.operatorBadge, isSdr ? styles.operatorBadgeAmber : styles.operatorBadgeCyan]}>
                          <Text style={[styles.operatorBadgeText, isSdr ? { color: '#feb300' } : { color: '#00e5ff' }]}>
                            {opName}
                          </Text>
                        </View>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
                        <Text style={styles.driverCode}>
                          CODE: <Text style={{ color: '#00e5ff', fontWeight: '800' }}>{d.driverCode || d.employeeId}</Text>
                        </Text>
                        <Text style={styles.driverEmpId}>
                          NIC: <Text style={{ color: '#bac9cc' }}>{d.nic}</Text>
                        </Text>
                      </View>
                    </View>

                    <View
                      style={[
                        styles.statusBadge,
                        isActive ? styles.statusBadgeActive : isSuspended ? styles.statusBadgeSuspended : styles.statusBadgeInactive,
                      ]}
                    >
                      <View style={[styles.dot, { backgroundColor: isActive ? '#22ef7e' : isSuspended ? '#feb300' : '#ff5252' }]} />
                      <Text
                        style={[
                          styles.statusText,
                          { color: isActive ? '#22ef7e' : isSuspended ? '#feb300' : '#ff5252' },
                        ]}
                      >
                        {d.status || 'ACTIVE'}
                      </Text>
                    </View>
                  </View>

                  {/* 4 Specs Grid */}
                  <View style={styles.driverSpecsGrid}>
                    <View style={styles.specBox}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                        <Ionicons name="bus" size={10} color="#feb300" />
                        <Text style={styles.specKey}>VEHICLE NO</Text>
                      </View>
                      <Text style={styles.specValHighlight}>{d.vehicleNumber || 'UNASSIGNED'}</Text>
                    </View>

                    <View style={styles.specBox}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                        <Ionicons name="hardware-chip" size={10} color="#00e5ff" />
                        <Text style={styles.specKey}>CHE / CHASSIS</Text>
                      </View>
                      <Text style={[styles.specVal, { color: '#00e5ff' }]}>
                        {d.cheNumber || d.chassisNumber || 'SCK 100'}
                      </Text>
                    </View>

                    <View style={styles.specBox}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                        <Ionicons name="card" size={10} color="#bac9cc" />
                        <Text style={styles.specKey}>LICENSE NO</Text>
                      </View>
                      <Text style={styles.specValMono}>{d.licenseNumber || d.drivingLicenceNumber || 'LIC-001234'}</Text>
                    </View>

                    <View style={styles.specBox}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                        <Ionicons name="call" size={10} color="#849396" />
                        <Text style={styles.specKey}>MOBILE</Text>
                      </View>
                      <Text style={styles.specValMono}>{d.mobileNumber || '0779876543'}</Text>
                    </View>
                  </View>

                  {/* Port Pass Status Row */}
                  <View style={styles.portPassRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons
                        name="boat-outline"
                        size={13}
                        color={d.portPassStatus === 'RENEWAL_DUE' ? '#ffab00' : '#00e5ff'}
                      />
                      <Text style={styles.portPassLabel}>
                        Port Pass: <Text style={[styles.portPassDate, d.portPassStatus === 'RENEWAL_DUE' && { color: '#ffab00' }]}>{d.portPassExpiryDate || '2026-12-31'}</Text>
                      </Text>
                    </View>
                    {d.portPassStatus === 'RENEWAL_DUE' ? (
                      <View style={styles.renewalTag}>
                        <Text style={styles.renewalTagText}>RENEWAL DUE ({d.portPassDaysLeft ?? 10}d)</Text>
                      </View>
                    ) : (
                      <Text style={styles.passNumTag}>{d.portPassNumber || 'SLPA-DPP'}</Text>
                    )}
                  </View>

                  {/* Quick Action Button Strip (EDIT, SUSPEND/ACTIVATE, RESET PWD) */}
                  <View style={styles.cardActionRow}>
                    <TouchableOpacity
                      style={styles.cardEditActionBtn}
                      onPress={(e) => {
                        e.stopPropagation?.();
                        openEditDriver(d);
                      }}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="create-outline" size={13} color="#00e5ff" />
                      <Text style={styles.cardEditActionText}>EDIT</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.cardStatusActionBtn,
                        isActive
                          ? { backgroundColor: 'rgba(254, 179, 0, 0.15)', borderColor: '#feb300' }
                          : { backgroundColor: 'rgba(34, 239, 126, 0.15)', borderColor: '#22ef7e' }
                      ]}
                      onPress={(e) => {
                        e.stopPropagation?.();
                        handleQuickToggleStatus(d);
                      }}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={isActive ? "pause-circle-outline" : "play-circle-outline"}
                        size={13}
                        color={isActive ? "#feb300" : "#22ef7e"}
                      />
                      <Text style={[styles.cardStatusActionText, { color: isActive ? '#feb300' : '#22ef7e' }]}>
                        {isActive ? 'SUSPEND' : 'ACTIVATE'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.cardResetPwdBtn}
                      onPress={(e) => {
                        e.stopPropagation?.();
                        openResetPasswordModal(d);
                      }}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="key-outline" size={13} color="#90caf9" />
                      <Text style={styles.cardResetPwdText}>RESET PWD</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Complete Driver Details & Profile Modal */}
      <Modal
        visible={actionModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setActionModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0, 229, 255, 0.15)', borderWidth: 1, borderColor: '#00e5ff', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="person" size={22} color="#00e5ff" />
                </View>
                <View>
                  <Text style={styles.modalTitle}>{selectedDriver?.fullName}</Text>
                  <Text style={{ color: '#00e5ff', fontSize: 13, fontWeight: '800' }}>
                    {selectedDriver?.driverCode} • {selectedDriver?.employeeId}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setActionModalVisible(false)}>
                <Ionicons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              {/* Status Badge */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#0f1d33', padding: 12, borderRadius: 8, marginVertical: 12, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)' }}>
                <Text style={{ color: '#90caf9', fontSize: 12, fontWeight: '700' }}>OPERATIONAL STATUS</Text>
                <View style={[styles.statusBadge, selectedDriver?.status === 'ACTIVE' ? styles.statusActive : selectedDriver?.status === 'SUSPENDED' ? styles.statusSuspended : styles.statusDeactivated]}>
                  <Text style={styles.statusBadgeText}>{selectedDriver?.status || 'ACTIVE'}</Text>
                </View>
              </View>

              {/* 1. Fleet & Vehicle Details */}
              <Text style={styles.modalSectionLabel}>ASSIGNED VEHICLE & CHE SPECIFICATIONS</Text>
              <View style={styles.detailCardBox}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailRowLabel}>Assigned Truck Plate:</Text>
                  <Text style={styles.detailRowValue}>{selectedDriver?.vehicleNumber || 'Unassigned'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailRowLabel}>Chassis / CHE Number:</Text>
                  <Text style={[styles.detailRowValue, { color: '#00e5ff' }]}>{selectedDriver?.cheNumber || selectedDriver?.chassisNumber || 'CHE 100'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailRowLabel}>Fleet Operator:</Text>
                  <Text style={styles.detailRowValue}>
                    {selectedDriver?.vehicleNumber?.startsWith('LY-65') ? 'SDR LINK' : 'SCK Logistics'}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailRowLabel}>Trailer Standard:</Text>
                  <Text style={styles.detailRowValue}>40FT Skeletal Container Trailer</Text>
                </View>
              </View>

              {/* 2. Personal & Contact Details */}
              <Text style={styles.modalSectionLabel}>PERSONAL & EMPLOYMENT DETAILS</Text>
              <View style={styles.detailCardBox}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailRowLabel}>Employee ID:</Text>
                  <Text style={styles.detailRowValue}>{selectedDriver?.employeeId || 'DRV001'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailRowLabel}>National Identity (NIC):</Text>
                  <Text style={styles.detailRowValue}>{selectedDriver?.nic || '198512345678'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailRowLabel}>Mobile Phone:</Text>
                  <Text style={[styles.detailRowValue, { color: '#4caf50' }]}>{selectedDriver?.mobileNumber || '0779876543'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailRowLabel}>Email Address:</Text>
                  <Text style={styles.detailRowValue}>{selectedDriver?.email || `${selectedDriver?.driverCode?.toLowerCase()}@smartitt.lk`}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailRowLabel}>Home Address:</Text>
                  <Text style={[styles.detailRowValue, { flex: 1, textAlign: 'right' }]}>{selectedDriver?.address || 'Port Access Road, Colombo'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailRowLabel}>Emergency Contact:</Text>
                  <Text style={[styles.detailRowValue, { color: '#ffb74d' }]}>
                    {selectedDriver?.emergencyContactName || 'Fleet Dispatch Operations'} ({selectedDriver?.emergencyContactNumber || '0112456789'})
                  </Text>
                </View>
              </View>

              {/* 3. License & Compliance */}
              <Text style={styles.modalSectionLabel}>DRIVING LICENSE & COMPLIANCE</Text>
              <View style={styles.detailCardBox}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailRowLabel}>Heavy Vehicle License:</Text>
                  <Text style={styles.detailRowValue}>{selectedDriver?.licenseNumber || selectedDriver?.drivingLicenceNumber || 'LIC-001234'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailRowLabel}>License Expiry Date:</Text>
                  <Text style={[styles.detailRowValue, { color: '#4caf50' }]}>{selectedDriver?.licenseExpiryDate || '2028-12-31'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailRowLabel}>Compliance Status:</Text>
                  <Text style={[styles.detailRowValue, { color: '#4caf50', fontWeight: '800' }]}>VALID & VERIFIED</Text>
                </View>
              </View>

              {/* 4. SLPA Port Entry Pass & Clearance */}
              <Text style={styles.modalSectionLabel}>PORT ENTRY PASS & CLEARANCE (SLPA)</Text>
              <View style={styles.detailCardBox}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailRowLabel}>SLPA Port Pass Number:</Text>
                  <Text style={[styles.detailRowValue, { color: '#00e5ff', fontWeight: '800' }]}>
                    {selectedDriver?.portPassNumber || 'SLPA-DPP-001'}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailRowLabel}>Port Pass Renewal Date:</Text>
                  <Text
                    style={[
                      styles.detailRowValue,
                      {
                        color: selectedDriver?.portPassStatus === 'RENEWAL_DUE' ? '#ffab00' : '#4caf50',
                        fontWeight: '800',
                      },
                    ]}
                  >
                    {selectedDriver?.portPassExpiryDate || '2026-12-31'}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailRowLabel}>Renewal Status:</Text>
                  <Text
                    style={[
                      styles.detailRowValue,
                      {
                        color: selectedDriver?.portPassStatus === 'RENEWAL_DUE' ? '#ffab00' : '#4caf50',
                        fontWeight: '800',
                      },
                    ]}
                  >
                    {selectedDriver?.portPassStatus === 'RENEWAL_DUE'
                      ? '⚠️ RENEWAL DUE (< 30 DAYS)'
                      : '✅ ACTIVE CLEARANCE'}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailRowLabel}>Harbor Gate Clearance:</Text>
                  <Text style={styles.detailRowValue}>JCT Gate 1 / CICT Gate 2 / SAGT Gate</Text>
                </View>
              </View>

              {/* Edit Driver Details Action */}
              <TouchableOpacity
                style={{
                  backgroundColor: 'rgba(0, 229, 255, 0.15)',
                  borderWidth: 1,
                  borderColor: '#00e5ff',
                  paddingVertical: 12,
                  borderRadius: 8,
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 8,
                  marginBottom: 16,
                  marginTop: 6,
                }}
                onPress={() => openEditDriver(selectedDriver)}
                activeOpacity={0.8}
              >
                <Ionicons name="create-outline" size={18} color="#00e5ff" />
                <Text style={{ color: '#00e5ff', fontWeight: '800', fontSize: 13 }}>
                  EDIT DRIVER DETAILS & FLEET ASSIGNMENT
                </Text>
              </TouchableOpacity>

              {/* 5. Admin Management Controls */}
              <Text style={styles.modalSectionLabel}>CHANGE ACCOUNT STATUS</Text>
              <View style={styles.statusRowBtns}>
                <TouchableOpacity
                  style={[styles.statusBtn, { backgroundColor: '#4caf50' }]}
                  onPress={() => handleUpdateStatus('ACTIVE')}
                >
                  <Text style={styles.statusBtnText}>ACTIVE</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.statusBtn, { backgroundColor: '#feb300' }]}
                  onPress={() => handleUpdateStatus('SUSPENDED')}
                >
                  <Text style={[styles.statusBtnText, { color: '#000000' }]}>SUSPEND</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.statusBtn, { backgroundColor: '#ff5252' }]}
                  onPress={() => handleUpdateStatus('DEACTIVATED')}
                >
                  <Text style={styles.statusBtnText}>DEACTIVATE</Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.modalSectionLabel, { marginTop: 16 }]}>SECURITY & ACCOUNT CREDENTIALS</Text>
              <TouchableOpacity
                style={styles.resetPasswordBtn}
                onPress={() => openResetPasswordModal(selectedDriver)}
                activeOpacity={0.8}
              >
                <Ionicons name="key-outline" size={16} color="#00e5ff" style={{ marginRight: 8 }} />
                <Text style={styles.resetPasswordBtnText}>RESET DRIVER PASSWORD (CUSTOM OR DEFAULT)</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Dedicated Driver Password Reset Modal */}
      <Modal
        visible={resetModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setResetModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.createModalBox, { maxWidth: 440, width: '92%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0, 229, 255, 0.15)', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="key" size={18} color="#00e5ff" />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Reset Driver Password</Text>
                  <Text style={{ fontSize: 11, color: '#90caf9' }}>Security Clearance & Portal Access</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setResetModalVisible(false)}>
                <Ionicons name="close" size={22} color="#ffffff" />
              </TouchableOpacity>
            </View>

            {/* Target Driver Information Box */}
            <View style={{ backgroundColor: '#070f1e', padding: 12, borderRadius: 8, marginVertical: 12, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)' }}>
              <Text style={{ color: '#ffffff', fontSize: 13, fontWeight: '800' }}>{driverToReset?.fullName}</Text>
              <Text style={{ color: '#00e5ff', fontSize: 11, fontWeight: '700', marginTop: 2 }}>
                Code: {driverToReset?.driverCode} · NIC: {driverToReset?.nic}
              </Text>
              <Text style={{ color: '#849396', fontSize: 10, marginTop: 2 }}>
                Assigned Truck: {driverToReset?.vehicleNumber || 'UNASSIGNED'} ({driverToReset?.cheNumber || driverToReset?.chassisNumber || 'No CHE'})
              </Text>
            </View>

            {/* Password input & Quick Choices */}
            <Text style={styles.createInputLabel}>NEW TEMPORARY PASSWORD *</Text>
            <TextInput
              style={styles.createInput}
              placeholder="e.g. driver or Driver@123"
              placeholderTextColor="#546e7a"
              value={newTempPassword}
              onChangeText={setNewTempPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 14 }}>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 6, backgroundColor: 'rgba(0, 229, 255, 0.1)', borderRadius: 6, borderWidth: 1, borderColor: 'rgba(0, 229, 255, 0.3)', alignItems: 'center' }}
                onPress={() => setNewTempPassword('driver')}
              >
                <Text style={{ fontSize: 10.5, color: '#00e5ff', fontWeight: '800' }}>Default: &apos;driver&apos;</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 6, backgroundColor: 'rgba(254, 179, 0, 0.1)', borderRadius: 6, borderWidth: 1, borderColor: 'rgba(254, 179, 0, 0.3)', alignItems: 'center' }}
                onPress={() => setNewTempPassword('Driver@123')}
              >
                <Text style={{ fontSize: 10.5, color: '#feb300', fontWeight: '800' }}>&apos;Driver@123&apos;</Text>
              </TouchableOpacity>
            </View>

            {/* Action Buttons */}
            <View style={{ gap: 8, marginTop: 4 }}>
              <TouchableOpacity
                style={[styles.createSubmitBtn, resettingPassword && { opacity: 0.6 }]}
                onPress={handleConfirmResetPassword}
                disabled={resettingPassword}
                activeOpacity={0.8}
              >
                {resettingPassword ? (
                  <ActivityIndicator size="small" color="#001529" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={16} color="#001529" style={{ marginRight: 6 }} />
                    <Text style={styles.createSubmitBtnText}>CONFIRM & RESET PASSWORD</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.createCancelBtn}
                onPress={() => setResetModalVisible(false)}
              >
                <Text style={styles.createCancelBtnText}>CANCEL</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Create Driver Modal */}
      <Modal
        visible={createModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.createScrollWrap}>
            <View style={styles.createModalBox}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Register New Driver</Text>
                <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                  <Ionicons name="close" size={22} color="#ffffff" />
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Full Name *</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. Kamal Perera"
                  placeholderTextColor="#546e7a"
                  value={fullName}
                  onChangeText={setFullName}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Employee ID *</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. DRV002"
                  placeholderTextColor="#546e7a"
                  value={employeeId}
                  onChangeText={setEmployeeId}
                  autoCapitalize="characters"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>National Identity Card (NIC) *</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. 198512345678"
                  placeholderTextColor="#546e7a"
                  value={nic}
                  onChangeText={setNic}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Mobile Number *</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. 0771234567"
                  placeholderTextColor="#546e7a"
                  keyboardType="phone-pad"
                  value={mobileNumber}
                  onChangeText={setMobileNumber}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Driving License Number *</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. LIC-987654"
                  placeholderTextColor="#546e7a"
                  value={drivingLicenceNumber}
                  onChangeText={setDrivingLicenceNumber}
                  autoCapitalize="characters"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>ASSIGN FLEET VEHICLE *</Text>
                <TouchableOpacity
                  style={styles.vehiclePickerTrigger}
                  onPress={() => {
                    setFleetVehicles(adminFleetStore.getAllVehiclesList());
                    setVehiclePickerModalVisible(true);
                  }}
                  activeOpacity={0.8}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 }}>
                    <Ionicons
                      name={selectedVehicleObj ? "car-sport" : "car-sport-outline"}
                      size={20}
                      color={selectedVehicleObj ? "#00e5ff" : "#78909c"}
                    />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.vehiclePickerTriggerText,
                          selectedVehicleObj ? { color: '#ffffff' } : { color: '#78909c' },
                        ]}
                        numberOfLines={1}
                      >
                        {selectedVehicleObj
                          ? `${selectedVehicleObj.cheNumber} — ${selectedVehicleObj.vehicleNumber} (${selectedVehicleObj.operator})`
                          : vehicleNumber && vehicleNumber !== 'UNASSIGNED'
                          ? `${chassisNumber || 'CHE'} — ${vehicleNumber}`
                          : 'Select Vehicle (or Standby Driver)'}
                      </Text>
                      {selectedVehicleObj ? (
                        <Text style={styles.vehiclePickerTriggerSub}>
                          {selectedVehicleObj.trailerSize} • {selectedVehicleObj.operator} • Status: {selectedVehicleObj.status}
                        </Text>
                      ) : (
                        <Text style={styles.vehiclePickerTriggerSub}>
                          Tap to select from {fleetVehicles.length} registered fleet units
                        </Text>
                      )}
                    </View>
                  </View>
                  <Ionicons name="chevron-down" size={18} color="#00e5ff" />
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Initial Password</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="default: driver"
                  placeholderTextColor="#546e7a"
                  value={driverPassword}
                  onChangeText={setDriverPassword}
                />
              </View>

              <TouchableOpacity
                style={[styles.saveDriverBtn, creating && { opacity: 0.6 }]}
                onPress={handleCreateDriver}
                disabled={creating}
                activeOpacity={0.8}
              >
                {creating ? (
                  <ActivityIndicator color="#001529" size="small" />
                ) : (
                  <Text style={styles.saveDriverBtnText}>REGISTER DRIVER</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Vehicle Selection Modal for Driver Registration */}
      <Modal
        visible={vehiclePickerModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setVehiclePickerModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Select Vehicle for Driver</Text>
                <Text style={styles.modalSub}>{fleetVehicles.length} fleet vehicles registered</Text>
              </View>
              <TouchableOpacity onPress={() => setVehiclePickerModalVisible(false)}>
                <Ionicons name="close" size={22} color="#ffffff" />
              </TouchableOpacity>
            </View>

            {/* Search inside picker */}
            <View style={styles.pickerSearchWrap}>
              <Ionicons name="search" size={16} color="#78909c" />
              <TextInput
                style={styles.pickerSearchInput}
                placeholder="Search LY No, SCK No, Operator..."
                placeholderTextColor="#546e7a"
                value={vehiclePickerSearch}
                onChangeText={setVehiclePickerSearch}
              />
              {vehiclePickerSearch ? (
                <TouchableOpacity onPress={() => setVehiclePickerSearch('')}>
                  <Ionicons name="close-circle" size={16} color="#78909c" />
                </TouchableOpacity>
              ) : null}
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
              {/* Option: Standby / Unassigned */}
              <TouchableOpacity
                style={[
                  styles.vehicleSelectItem,
                  !selectedVehicleObj && styles.vehicleSelectItemActive,
                ]}
                onPress={() => {
                  setSelectedVehicleObj(null);
                  setVehicleNumber('UNASSIGNED');
                  setChassisNumber('UNASSIGNED');
                  setVehiclePickerModalVisible(false);
                }}
              >
                <Ionicons name="person-outline" size={20} color="#feb300" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.vehicleSelectPlate, { color: '#feb300' }]}>
                    Standby Driver (No Vehicle Assigned)
                  </Text>
                  <Text style={styles.vehicleSelectChe}>Available as relief / replacement driver</Text>
                </View>
                {!selectedVehicleObj && (
                  <Ionicons name="checkmark-circle" size={18} color="#feb300" />
                )}
              </TouchableOpacity>

              {/* Fleet vehicles */}
              {fleetVehicles
                .filter((v) => {
                  if (!vehiclePickerSearch.trim()) return true;
                  const q = vehiclePickerSearch.toLowerCase().trim();
                  return (
                    v.vehicleNumber.toLowerCase().includes(q) ||
                    v.chassisNumber.toLowerCase().includes(q) ||
                    v.cheNumber.toLowerCase().includes(q) ||
                    v.operator.toLowerCase().includes(q)
                  );
                })
                .map((v) => {
                  const isSelected = selectedVehicleObj?.id === v.id || vehicleNumber === v.vehicleNumber;
                  const hasDriver = !!v.driverName;
                  return (
                    <TouchableOpacity
                      key={v.id || v.vehicleNumber}
                      style={[
                        styles.vehicleSelectItem,
                        isSelected && styles.vehicleSelectItemActive,
                      ]}
                      onPress={() => {
                        setSelectedVehicleObj(v);
                        setVehicleNumber(v.vehicleNumber);
                        setChassisNumber(v.chassisNumber || v.cheNumber);
                        setVehiclePickerModalVisible(false);
                      }}
                    >
                      <Ionicons
                        name="bus"
                        size={20}
                        color={v.operator === 'SDR LINK' ? '#ff9100' : '#00e5ff'}
                      />
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={styles.vehicleSelectPlate}>{v.vehicleNumber}</Text>
                          <View style={styles.vehicleSelectCheBadge}>
                            <Text style={styles.vehicleSelectCheBadgeText}>
                              {v.chassisNumber || v.cheNumber}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.vehicleSelectChe}>
                          {v.operator} • {v.trailerSize} • {hasDriver ? `Current: ${v.driverName}` : 'Available'}
                        </Text>
                      </View>
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={20} color="#00e5ff" />
                      )}
                    </TouchableOpacity>
                  );
                })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Driver Details Modal */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.createScrollWrap}>
            <View style={styles.createModalBox}>
              <View style={styles.modalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0, 229, 255, 0.15)', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="create" size={18} color="#00e5ff" />
                  </View>
                  <View>
                    <Text style={styles.modalTitle}>Edit Driver Profile</Text>
                    <Text style={{ fontSize: 11, color: '#90caf9' }}>Update Employment & License Records</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                  <Ionicons name="close" size={22} color="#ffffff" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
                {/* Full Name */}
                <Text style={styles.createInputLabel}>FULL NAME *</Text>
                <TextInput
                  style={styles.createInput}
                  placeholder="e.g. Kamal Perera"
                  placeholderTextColor="#546e7a"
                  value={editFullName}
                  onChangeText={setEditFullName}
                />

                {/* Employee ID */}
                <Text style={styles.createInputLabel}>EMPLOYEE ID *</Text>
                <TextInput
                  style={styles.createInput}
                  placeholder="e.g. DRV001"
                  placeholderTextColor="#546e7a"
                  value={editEmployeeId}
                  onChangeText={setEditEmployeeId}
                  autoCapitalize="characters"
                />

                {/* NIC Number */}
                <Text style={styles.createInputLabel}>NATIONAL IDENTITY NUMBER (NIC) *</Text>
                <TextInput
                  style={styles.createInput}
                  placeholder="e.g. 198512345678"
                  placeholderTextColor="#546e7a"
                  value={editNic}
                  onChangeText={setEditNic}
                />

                {/* Mobile Phone */}
                <Text style={styles.createInputLabel}>MOBILE CONTACT NUMBER *</Text>
                <TextInput
                  style={styles.createInput}
                  placeholder="e.g. 0779876543"
                  placeholderTextColor="#546e7a"
                  value={editMobileNumber}
                  onChangeText={setEditMobileNumber}
                  keyboardType="phone-pad"
                />

                {/* Email Address */}
                <Text style={styles.createInputLabel}>EMAIL ADDRESS</Text>
                <TextInput
                  style={styles.createInput}
                  placeholder="e.g. driver@smartitt.lk"
                  placeholderTextColor="#546e7a"
                  value={editEmail}
                  onChangeText={setEditEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />

                {/* Home Address */}
                <Text style={styles.createInputLabel}>HOME ADDRESS</Text>
                <TextInput
                  style={styles.createInput}
                  placeholder="e.g. No. 45, Harbour View Road, Colombo 15"
                  placeholderTextColor="#546e7a"
                  value={editAddress}
                  onChangeText={setEditAddress}
                />

                {/* Heavy Driving License */}
                <Text style={styles.createInputLabel}>DRIVING LICENSE NUMBER *</Text>
                <TextInput
                  style={styles.createInput}
                  placeholder="e.g. LIC-001234"
                  placeholderTextColor="#546e7a"
                  value={editDrivingLicenceNumber}
                  onChangeText={setEditDrivingLicenceNumber}
                  autoCapitalize="characters"
                />

                {/* License Expiry Date */}
                <Text style={styles.createInputLabel}>LICENSE EXPIRY DATE</Text>
                <TextInput
                  style={styles.createInput}
                  placeholder="YYYY-MM-DD (e.g. 2028-12-31)"
                  placeholderTextColor="#546e7a"
                  value={editLicenseExpiryDate}
                  onChangeText={setEditLicenseExpiryDate}
                />

                {/* Port Pass Number */}
                <Text style={styles.createInputLabel}>SLPA PORT ENTRY PASS NUMBER</Text>
                <TextInput
                  style={styles.createInput}
                  placeholder="e.g. SLPA-DPP-001"
                  placeholderTextColor="#546e7a"
                  value={editPortPassNumber}
                  onChangeText={setEditPortPassNumber}
                  autoCapitalize="characters"
                />

                {/* Port Pass Expiry Date */}
                <Text style={styles.createInputLabel}>PORT PASS EXPIRY / RENEWAL DATE</Text>
                <TextInput
                  style={styles.createInput}
                  placeholder="YYYY-MM-DD (e.g. 2027-06-30)"
                  placeholderTextColor="#546e7a"
                  value={editPortPassExpiryDate}
                  onChangeText={setEditPortPassExpiryDate}
                />

                {/* Assigned Vehicle */}
                <Text style={styles.createInputLabel}>ASSIGNED TRUCK (VEHICLE PLATE)</Text>
                <TextInput
                  style={styles.createInput}
                  placeholder="e.g. LY-6439 or UNASSIGNED"
                  placeholderTextColor="#546e7a"
                  value={editVehicleNumber}
                  onChangeText={setEditVehicleNumber}
                  autoCapitalize="characters"
                />

                {/* Emergency Contact Name */}
                <Text style={styles.createInputLabel}>EMERGENCY CONTACT PERSON</Text>
                <TextInput
                  style={styles.createInput}
                  placeholder="e.g. Sunil Perera (Brother)"
                  placeholderTextColor="#546e7a"
                  value={editEmergencyContactName}
                  onChangeText={setEditEmergencyContactName}
                />

                {/* Emergency Contact Phone */}
                <Text style={styles.createInputLabel}>EMERGENCY CONTACT PHONE</Text>
                <TextInput
                  style={styles.createInput}
                  placeholder="e.g. 0771122334"
                  placeholderTextColor="#546e7a"
                  value={editEmergencyContactNumber}
                  onChangeText={setEditEmergencyContactNumber}
                  keyboardType="phone-pad"
                />

                {/* Operating Status */}
                <Text style={styles.createInputLabel}>ACCOUNT OPERATING STATUS</Text>
                <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
                  {(['ACTIVE', 'SUSPENDED', 'DEACTIVATED'] as const).map((st) => (
                    <TouchableOpacity
                      key={st}
                      style={[
                        { flex: 1, paddingVertical: 8, borderRadius: 6, alignItems: 'center', borderWidth: 1 },
                        editStatus === st
                          ? { backgroundColor: st === 'ACTIVE' ? '#4caf50' : st === 'SUSPENDED' ? '#feb300' : '#ff5252', borderColor: 'transparent' }
                          : { backgroundColor: '#070f1e', borderColor: 'rgba(255, 255, 255, 0.1)' },
                      ]}
                      onPress={() => setEditStatus(st)}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '800', color: editStatus === st && st === 'SUSPENDED' ? '#000000' : '#ffffff' }}>
                        {st}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Action Buttons */}
                <View style={{ marginTop: 14, gap: 8 }}>
                  <TouchableOpacity
                    style={[styles.createSubmitBtn, savingEditDriver && { opacity: 0.6 }]}
                    onPress={handleSaveDriverEdit}
                    disabled={savingEditDriver}
                    activeOpacity={0.8}
                  >
                    {savingEditDriver ? (
                      <ActivityIndicator size="small" color="#001529" />
                    ) : (
                      <>
                        <Ionicons name="save-outline" size={16} color="#001529" style={{ marginRight: 6 }} />
                        <Text style={styles.createSubmitBtnText}>SAVE DRIVER CHANGES</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.createCancelBtn}
                    onPress={() => setEditModalVisible(false)}
                  >
                    <Text style={styles.createCancelBtnText}>CANCEL</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Admin Sign Out Confirmation Modal */}
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
    backgroundColor: '#070f1e',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: '#0a1019',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00e5ff',
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
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00e5ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createBtnText: {
    color: '#070c14',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  headerLogoutBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 82, 82, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 82, 82, 0.25)',
  },
  hudContainer: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#070c14',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  hudCard: {
    flex: 1,
    backgroundColor: '#0c1524',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  hudCardTotal: {
    borderColor: 'rgba(0, 229, 255, 0.3)',
  },
  hudCardActive: {
    borderColor: 'rgba(0, 230, 118, 0.3)',
  },
  hudCardSuspended: {
    borderColor: 'rgba(255, 171, 0, 0.3)',
  },
  hudCardAssigned: {
    borderColor: 'rgba(41, 182, 246, 0.3)',
  },
  hudIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  hudLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#78909c',
    letterSpacing: 0.4,
  },
  hudValue: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  portPassRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  portPassLabel: {
    color: '#90caf9',
    fontSize: 11,
    fontWeight: '600',
  },
  portPassDate: {
    color: '#00e5ff',
    fontWeight: '700',
  },
  renewalTag: {
    backgroundColor: 'rgba(255, 171, 0, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ffab00',
  },
  renewalTagText: {
    color: '#ffab00',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  passNumTag: {
    color: '#546e7a',
    fontSize: 10,
    fontWeight: '600',
  },
  filterBar: {
    padding: 14,
    backgroundColor: '#0a1019',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#070c14',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 40,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 13,
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
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
  driverCard: {
    backgroundColor: '#0c1524',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  driverCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  codeWrap: {
    flex: 1,
  },
  driverCodeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#00e5ff',
    letterSpacing: 0.5,
  },
  driverNameText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 2,
  },
  cardEditBtn: {
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.4)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardEditBtnText: {
    color: '#00e5ff',
    fontSize: 10,
    fontWeight: '800',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusActive: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
  },
  statusSuspended: {
    backgroundColor: 'rgba(254, 179, 0, 0.2)',
  },
  statusDeactivated: {
    backgroundColor: 'rgba(255, 82, 82, 0.2)',
  },
  statusBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginVertical: 10,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  detailItem: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    color: '#b0bec5',
    fontSize: 11,
    marginLeft: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    padding: 20,
  },
  modalBox: {
    backgroundColor: '#0c1524',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.25)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
  },
  modalSub: {
    color: '#00e5ff',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 16,
  },
  modalBtnGroup: {
    marginTop: 10,
  },
  modalSectionLabel: {
    color: '#78909c',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  statusRowBtns: {
    flexDirection: 'row',
    gap: 8,
  },
  statusBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  statusBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  resetPasswordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 229, 255, 0.08)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.3)',
    paddingVertical: 12,
  },
  resetPasswordBtnText: {
    color: '#00e5ff',
    fontSize: 12,
    fontWeight: '700',
  },
  createScrollWrap: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  createModalBox: {
    backgroundColor: '#0c1b30',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.25)',
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    color: '#90caf9',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },
  modalInput: {
    backgroundColor: '#070f1e',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    color: '#ffffff',
    paddingHorizontal: 12,
    height: 42,
    fontSize: 13,
  },
  saveDriverBtn: {
    backgroundColor: '#00e5ff',
    borderRadius: 8,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  saveDriverBtnText: {
    color: '#001529',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  detailCardBox: {
    backgroundColor: '#0a172a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  detailRowLabel: {
    color: '#90caf9',
    fontSize: 12,
    fontWeight: '600',
  },
  detailRowValue: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  vehiclePickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#070f1e',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.35)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'space-between',
  },
  vehiclePickerTriggerText: {
    fontSize: 13,
    fontWeight: '700',
  },
  vehiclePickerTriggerSub: {
    fontSize: 10,
    color: '#90caf9',
    marginTop: 2,
    fontWeight: '600',
  },
  pickerSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#070f1e',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  pickerSearchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 13,
    marginLeft: 8,
  },
  vehicleSelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#070f1e',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  vehicleSelectItemActive: {
    borderColor: '#00e5ff',
    backgroundColor: 'rgba(0, 229, 255, 0.06)',
  },
  vehicleSelectPlate: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  vehicleSelectCheBadge: {
    backgroundColor: 'rgba(0, 229, 255, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  vehicleSelectCheBadgeText: {
    color: '#00e5ff',
    fontSize: 10,
    fontWeight: '800',
  },
  vehicleSelectChe: {
    fontSize: 11,
    color: '#78909c',
    marginTop: 3,
  },
  createInputLabel: {
    color: '#90caf9',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
    marginTop: 4,
  },
  createInput: {
    backgroundColor: '#070f1e',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    color: '#ffffff',
    paddingHorizontal: 12,
    height: 42,
    fontSize: 13,
    marginBottom: 10,
  },
  createSubmitBtn: {
    backgroundColor: '#00e5ff',
    borderRadius: 8,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  createSubmitBtnText: {
    color: '#001529',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  createCancelBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  createCancelBtnText: {
    color: '#90caf9',
    fontSize: 12,
    fontWeight: '700',
  },

  // Supervisor-style rich driver card styles
  driverTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  driverAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 229, 255, 0.15)',
    borderWidth: 1.5,
    borderColor: '#00e5ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverAvatarText: {
    color: '#00e5ff',
    fontSize: 18,
    fontWeight: '900',
  },
  driverAvatarImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#00e5ff',
  },
  driverFullName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  operatorBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
    borderWidth: 1,
  },
  operatorBadgeCyan: {
    backgroundColor: 'rgba(0, 229, 255, 0.12)',
    borderColor: 'rgba(0, 229, 255, 0.4)',
  },
  operatorBadgeAmber: {
    backgroundColor: 'rgba(254, 179, 0, 0.12)',
    borderColor: 'rgba(254, 179, 0, 0.4)',
  },
  operatorBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  driverCode: {
    color: '#78909c',
    fontSize: 10,
    fontWeight: '600',
  },
  driverEmpId: {
    color: '#78909c',
    fontSize: 10,
    fontWeight: '600',
  },
  statusBadgeActive: {
    backgroundColor: 'rgba(34, 239, 126, 0.12)',
    borderColor: 'rgba(34, 239, 126, 0.3)',
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusBadgeSuspended: {
    backgroundColor: 'rgba(254, 179, 0, 0.12)',
    borderColor: 'rgba(254, 179, 0, 0.3)',
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusBadgeInactive: {
    backgroundColor: 'rgba(255, 82, 82, 0.12)',
    borderColor: 'rgba(255, 82, 82, 0.3)',
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
    flexWrap: 'wrap',
    gap: 6,
    backgroundColor: '#070f1e',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  specBox: {
    width: '48%',
    gap: 2,
  },
  specKey: {
    color: '#78909c',
    fontSize: 8.5,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  specVal: {
    fontSize: 11,
    fontWeight: '700',
    color: '#dde2f0',
  },
  specValHighlight: {
    fontSize: 11,
    fontWeight: '800',
    color: '#feb300',
  },
  specValMono: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#dde2f0',
  },
  cardActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  cardEditActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.4)',
    borderRadius: 6,
    paddingVertical: 7,
  },
  cardEditActionText: {
    color: '#00e5ff',
    fontSize: 10.5,
    fontWeight: '800',
  },
  cardStatusActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 7,
  },
  cardStatusActionText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  cardResetPwdBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: 'rgba(144, 202, 249, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(144, 202, 249, 0.35)',
    borderRadius: 6,
    paddingVertical: 7,
  },
  cardResetPwdText: {
    color: '#90caf9',
    fontSize: 10.5,
    fontWeight: '800',
  },
});
