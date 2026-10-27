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
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { adminService } from '../../../src/services/adminService';
import { adminFleetStore, AdminVehicle } from '../../../src/store/adminFleetStore';
import { useResponsive } from '../../../src/hooks/useResponsive';
import { AdminSignOutModal } from '../../../src/components/AdminSignOutModal';

export default function AdminDriversScreen() {
  const { topInset, bottomInset, containerPaddingHorizontal } = useResponsive();

  const [drivers, setDrivers] = useState<any[]>([]);
  const [fleetVehicles, setFleetVehicles] = useState<AdminVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED'>('ALL');

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
      await adminService.updateDriverStatus(selectedDriver.id, status, `Admin updated status to ${status}`);
      Alert.alert('Status Updated', `Driver status set to ${status}`);
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
        <View>
          <Text style={styles.headerTitle}>Driver Fleet Management</Text>
          <Text style={styles.headerSubtitle}>{drivers.length} drivers on system</Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity
            style={styles.createBtn}
            onPress={() => setCreateModalVisible(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="person-add" size={15} color="#001529" style={{ marginRight: 4 }} />
            <Text style={styles.createBtnText}>NEW</Text>
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

        <View style={styles.filterPillsRow}>
          {(['ALL', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED'] as const).map((st) => (
            <TouchableOpacity
              key={st}
              style={[
                styles.filterPill,
                statusFilter === st && styles.filterPillActive,
              ]}
              onPress={() => setStatusFilter(st)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterPillText,
                  statusFilter === st && styles.filterPillTextActive,
                ]}
              >
                {st}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
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
            drivers.map((d) => (
              <TouchableOpacity
                key={d.id || d.driverCode}
                style={styles.driverCard}
                onPress={() => {
                  setSelectedDriver(d);
                  setActionModalVisible(true);
                }}
                activeOpacity={0.8}
              >
                <View style={styles.driverCardHeader}>
                  <View style={styles.codeWrap}>
                    <Text style={styles.driverCodeText}>{d.driverCode || d.employeeId}</Text>
                    <Text style={styles.driverNameText}>{d.fullName}</Text>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      d.status === 'ACTIVE'
                        ? styles.statusActive
                        : d.status === 'SUSPENDED'
                        ? styles.statusSuspended
                        : styles.statusDeactivated,
                    ]}
                  >
                    <Text style={styles.statusBadgeText}>{d.status || 'ACTIVE'}</Text>
                  </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.detailsGrid}>
                  <View style={styles.detailItem}>
                    <Ionicons name="car-outline" size={13} color="#90caf9" />
                    <Text style={styles.detailText}>
                      {d.vehicleNumber || 'Unassigned'} ({d.cheNumber || d.chassisNumber || 'No CHE'})
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Ionicons name="call-outline" size={13} color="#90caf9" />
                    <Text style={styles.detailText}>{d.mobileNumber || 'No Phone'}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Ionicons name="card-outline" size={13} color="#90caf9" />
                    <Text style={styles.detailText}>NIC: {d.nic}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Ionicons name="shield-checkmark-outline" size={13} color="#90caf9" />
                    <Text style={styles.detailText}>Lic: {d.licenseNumber || d.drivingLicenceNumber || 'N/A'}</Text>
                  </View>
                </View>

                {/* Port Pass Renewal Date */}
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
                      <Text style={styles.renewalTagText}>RENEWAL DUE</Text>
                    </View>
                  ) : (
                    <Text style={styles.passNumTag}>{d.portPassNumber || 'SLPA-DPP'}</Text>
                  )}
                </View>
              </TouchableOpacity>
            ))
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

              <Text style={[styles.modalSectionLabel, { marginTop: 16 }]}>SECURITY</Text>
              <TouchableOpacity
                style={styles.resetPasswordBtn}
                onPress={handleResetPassword}
                activeOpacity={0.8}
              >
                <Ionicons name="key-outline" size={16} color="#00e5ff" style={{ marginRight: 8 }} />
                <Text style={styles.resetPasswordBtnText}>Reset Password to Default ('driver')</Text>
              </TouchableOpacity>
            </ScrollView>
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
    backgroundColor: '#0a1628',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
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
    color: '#001529',
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
    backgroundColor: '#0c1b30',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#070f1e',
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
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
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
    backgroundColor: '#0c1b30',
    borderRadius: 12,
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
    backgroundColor: '#0c1b30',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.2)',
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
});
