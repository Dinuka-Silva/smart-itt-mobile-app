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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { adminService } from '../../../src/services/adminService';
import { adminFleetStore } from '../../../src/store/adminFleetStore';
import { useResponsive } from '../../../src/hooks/useResponsive';
import { AdminSignOutModal } from '../../../src/components/AdminSignOutModal';
import { StatusPill } from '../../../src/components/StatusPill';

export default function AdminVehiclesScreen() {
  const { topInset, bottomInset, containerPaddingHorizontal } = useResponsive();

  const [vehicles, setVehicles] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [operatorFilter, setOperatorFilter] = useState<'ALL' | 'SCK Logistics' | 'SDR LINK'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'MAINTENANCE'>('ALL');

  const totalFleetCount = vehicles.length;
  const activeCount = useMemo(() => vehicles.filter((v) => v.status === 'ACTIVE').length, [vehicles]);
  const maintCount = useMemo(() => vehicles.filter((v) => v.status === 'MAINTENANCE').length, [vehicles]);
  const assignedCount = useMemo(() => vehicles.filter((v) => !!v.driverName).length, [vehicles]);
  const sckCount = useMemo(() => vehicles.filter((v) => v.operator !== 'SDR LINK').length, [vehicles]);
  const sdrCount = useMemo(() => vehicles.filter((v) => v.operator === 'SDR LINK').length, [vehicles]);

  // Add Vehicle Modal State
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newVehicleNumber, setNewVehicleNumber] = useState('');
  const [newChassisNumber, setNewChassisNumber] = useState('');
  const [newOperator, setNewOperator] = useState<'SCK Logistics' | 'SDR LINK'>('SCK Logistics');
  const [newTrailerSize, setNewTrailerSize] = useState<'40FT' | '20FT' | '45FT'>('40FT');
  const [newPortPassNumber, setNewPortPassNumber] = useState('');
  const [newPortPassExpiryDate, setNewPortPassExpiryDate] = useState('2027-10-31');
  const [newStatus, setNewStatus] = useState<'ACTIVE' | 'MAINTENANCE'>('ACTIVE');
  const [submittingVehicle, setSubmittingVehicle] = useState(false);

  // Edit / Assign Modal
  const [selectedVehicle, setSelectedVehicle] = useState<any | null>(null);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [signOutModalVisible, setSignOutModalVisible] = useState(false);

  // Edit Vehicle Modal State
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState('');
  const [editVehicleNumber, setEditVehicleNumber] = useState('');
  const [editChassisNumber, setEditChassisNumber] = useState('');
  const [editOperator, setEditOperator] = useState<'SCK Logistics' | 'SDR LINK'>('SCK Logistics');
  const [editTrailerSize, setEditTrailerSize] = useState<'40FT' | '20FT' | '45FT'>('40FT');
  const [editStatus, setEditStatus] = useState<'ACTIVE' | 'MAINTENANCE'>('ACTIVE');
  const [editPortPassNumber, setEditPortPassNumber] = useState('');
  const [editPortPassExpiryDate, setEditPortPassExpiryDate] = useState('');
  const [editLicenseIssuedDate, setEditLicenseIssuedDate] = useState('');
  const [editLicenseExpiryDate, setEditLicenseExpiryDate] = useState('');
  const [savingEditVehicle, setSavingEditVehicle] = useState(false);

  const openEditVehicle = (vehicle: any) => {
    setEditingVehicleId(vehicle.id || vehicle.vehicleNumber);
    setEditVehicleNumber(vehicle.vehicleNumber || '');
    setEditChassisNumber(vehicle.chassisNumber || vehicle.cheNumber || '');
    setEditOperator(vehicle.operator === 'SDR LINK' ? 'SDR LINK' : 'SCK Logistics');
    setEditTrailerSize(vehicle.trailerSize || '40FT');
    setEditStatus(vehicle.status === 'MAINTENANCE' ? 'MAINTENANCE' : 'ACTIVE');
    setEditPortPassNumber(vehicle.portPassNumber || '');
    setEditPortPassExpiryDate(vehicle.portPassExpiryDate || '2027-10-31');
    setEditLicenseIssuedDate(vehicle.licenseIssuedDate || '2025-11-15');
    setEditLicenseExpiryDate(vehicle.licenseExpiryDate || '2026-11-15');
    setEditModalVisible(true);
  };

  const handleSaveVehicleEdit = async () => {
    if (!editVehicleNumber.trim() || !editChassisNumber.trim()) {
      Alert.alert('Required Fields', 'Vehicle Number and Chassis Number are required.');
      return;
    }

    setSavingEditVehicle(true);
    try {
      const updated = await adminFleetStore.updateVehicleDetails(editingVehicleId, {
        vehicleNumber: editVehicleNumber.trim().toUpperCase(),
        chassisNumber: editChassisNumber.trim().toUpperCase(),
        cheNumber: editChassisNumber.trim().toUpperCase(),
        operator: editOperator,
        trailerSize: editTrailerSize,
        status: editStatus,
        portPassNumber: editPortPassNumber.trim() || undefined,
        portPassExpiryDate: editPortPassExpiryDate.trim() || undefined,
        licenseIssuedDate: editLicenseIssuedDate.trim() || undefined,
        licenseExpiryDate: editLicenseExpiryDate.trim() || undefined,
      });

      if (updated && selectedVehicle && (selectedVehicle.id === editingVehicleId || selectedVehicle.vehicleNumber === editingVehicleId)) {
        setSelectedVehicle(updated);
      }

      Alert.alert('Vehicle Updated', `Vehicle ${editVehicleNumber.trim().toUpperCase()} details updated successfully!`);
      setEditModalVisible(false);
      fetchVehicles();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to update vehicle details');
    } finally {
      setSavingEditVehicle(false);
    }
  };

  const fetchVehicles = useCallback(async () => {
    try {
      const vList = await adminFleetStore.getVehicles(
        search,
        operatorFilter === 'ALL' ? undefined : operatorFilter,
        statusFilter === 'ALL' ? undefined : statusFilter
      );
      setVehicles(vList);

      try {
        const dData = await adminService.getDrivers();
        if (Array.isArray(dData) && dData.length > 0) {
          setDrivers(dData);
        }
      } catch (e) {
        // use local drivers
      }
    } catch (err: any) {
      console.log('Error fetching vehicles:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, operatorFilter, statusFilter]);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchVehicles();
  };

  const handleRegisterVehicle = async () => {
    if (!newVehicleNumber.trim() || !newChassisNumber.trim()) {
      Alert.alert('Required Fields', 'Please enter Vehicle Number (e.g. LY-5660) and Chassis/CHE Number (e.g. SCK 128).');
      return;
    }

    setSubmittingVehicle(true);
    try {
      await adminFleetStore.addVehicle({
        vehicleNumber: newVehicleNumber.trim().toUpperCase(),
        chassisNumber: newChassisNumber.trim().toUpperCase(),
        operator: newOperator,
        trailerSize: newTrailerSize,
        portPassNumber: newPortPassNumber.trim() || undefined,
        portPassExpiryDate: newPortPassExpiryDate || undefined,
        status: newStatus,
      });

      Alert.alert(
        'Vehicle Added Successfully',
        `Vehicle ${newVehicleNumber.trim().toUpperCase()} (${newChassisNumber.trim().toUpperCase()}) has been registered and is now available across the fleet and driver registration!`
      );
      setCreateModalVisible(false);
      setNewVehicleNumber('');
      setNewChassisNumber('');
      setNewPortPassNumber('');
      fetchVehicles();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to add vehicle');
    } finally {
      setSubmittingVehicle(false);
    }
  };

  const handleToggleStatus = async (vehicle: any, newStatus: string) => {
    try {
      await adminFleetStore.updateVehicleStatus(vehicle.id || vehicle.vehicleNumber, newStatus as any);
      Alert.alert('Vehicle Updated', `${vehicle.vehicleNumber} status set to ${newStatus}`);
      if (selectedVehicle && (selectedVehicle.id === vehicle.id || selectedVehicle.vehicleNumber === vehicle.vehicleNumber)) {
        setSelectedVehicle({ ...selectedVehicle, status: newStatus });
      }
      fetchVehicles();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to update vehicle');
    }
  };

  const handleAssignDriver = async (driverId: string | null) => {
    if (!selectedVehicle) return;
    try {
      await adminFleetStore.assignDriverToVehicle(selectedVehicle.id || selectedVehicle.vehicleNumber, driverId);
      Alert.alert('Assigned', 'Driver assignment updated successfully');
      setAssignModalVisible(false);
      fetchVehicles();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to assign driver');
    }
  };

  return (
    <View style={styles.root}>
      {/* Top Header */}
      <View style={[styles.header, { paddingTop: Math.max(topInset, 16) }]}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={styles.headerDot} />
            <Text style={styles.headerTitle}>Fleet & Prime Movers</Text>
          </View>
          <Text style={styles.headerSubtitle}>
            {totalFleetCount} Registered Units • {activeCount} Operational
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity
            style={styles.addVehicleBtn}
            onPress={() => setCreateModalVisible(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={16} color="#070c14" />
            <Text style={styles.addVehicleBtnText}>ADD UNIT</Text>
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

      {/* Fleet Analytics HUD Strip */}
      <View style={styles.hudContainer}>
        <View style={[styles.hudCard, styles.hudCardTotal]}>
          <View style={styles.hudIconRow}>
            <Ionicons name="car-sport" size={13} color="#00e5ff" />
            <Text style={styles.hudLabel}>TOTAL FLEET</Text>
          </View>
          <Text style={[styles.hudValue, { color: '#00e5ff' }]}>{totalFleetCount}</Text>
        </View>

        <View style={[styles.hudCard, styles.hudCardActive]}>
          <View style={styles.hudIconRow}>
            <Ionicons name="checkmark-circle" size={13} color="#00e676" />
            <Text style={styles.hudLabel}>ACTIVE</Text>
          </View>
          <Text style={[styles.hudValue, { color: '#00e676' }]}>{activeCount}</Text>
        </View>

        <View style={[styles.hudCard, styles.hudCardMaint]}>
          <View style={styles.hudIconRow}>
            <Ionicons name="construct" size={13} color="#ffab00" />
            <Text style={styles.hudLabel}>MAINT</Text>
          </View>
          <Text style={[styles.hudValue, { color: '#ffab00' }]}>{maintCount}</Text>
        </View>

        <View style={[styles.hudCard, styles.hudCardAssigned]}>
          <View style={styles.hudIconRow}>
            <Ionicons name="person" size={13} color="#29b6f6" />
            <Text style={styles.hudLabel}>ASSIGNED</Text>
          </View>
          <Text style={[styles.hudValue, { color: '#29b6f6' }]}>{assignedCount}</Text>
        </View>
      </View>

      {/* Filter Bar with Dual Segmented Controls */}
      <View style={styles.filterBar}>
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={16} color="#78909c" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search LY-No, CHE No, Operator..."
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

        {/* Operator Filter Tabs */}
        <View style={styles.tabsRow}>
          {([
            { key: 'ALL', label: `ALL (${totalFleetCount})` },
            { key: 'SCK Logistics', label: `SCK (${sckCount})` },
            { key: 'SDR LINK', label: `SDR (${sdrCount})` },
          ] as const).map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.opTab, operatorFilter === tab.key && styles.opTabActive]}
              onPress={() => setOperatorFilter(tab.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.opTabText, operatorFilter === tab.key && styles.opTabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Status Filter Tabs */}
        <View style={[styles.tabsRow, { marginTop: 8 }]}>
          {([
            { key: 'ALL', label: 'ALL STATUS' },
            { key: 'ACTIVE', label: `ACTIVE (${activeCount})` },
            { key: 'MAINTENANCE', label: `IN MAINT (${maintCount})` },
          ] as const).map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.statusFilterTab, statusFilter === tab.key && styles.statusFilterTabActive]}
              onPress={() => setStatusFilter(tab.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.statusFilterTabText, statusFilter === tab.key && styles.statusFilterTabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Vehicle List */}
      {loading && !refreshing ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#00e5ff" />
          <Text style={styles.loadingText}>Fetching authoritative vehicle fleet...</Text>
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
          {vehicles.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="car-sport-outline" size={36} color="#607d8b" />
              <Text style={styles.emptyCardText}>No vehicles match the selected criteria.</Text>
            </View>
          ) : (
            vehicles.map((v) => (
              <TouchableOpacity
                key={v.id || v.vehicleNumber}
                style={styles.vehicleCard}
                onPress={() => {
                  setSelectedVehicle(v);
                  setDetailsModalVisible(true);
                }}
                activeOpacity={0.85}
              >
                <View style={styles.cardTopRow}>
                  <View style={styles.vehicleNumberWrap}>
                    <View style={styles.plateBadge}>
                      <Ionicons name="car-outline" size={14} color="#00e5ff" style={{ marginRight: 6 }} />
                      <Text style={styles.vehicleNumberText}>{v.vehicleNumber}</Text>
                    </View>
                    <View style={styles.cheBadge}>
                      <Text style={styles.cheBadgeText}>{v.chassisNumber || v.cheNumber || 'CHE'}</Text>
                    </View>
                  </View>

                  <View style={styles.cardTopActions}>
                    <View
                      style={[
                        styles.opPill,
                        v.operator === 'SDR LINK' ? styles.opPillSdr : styles.opPillSck,
                      ]}
                    >
                      <Text style={styles.opPillText}>{v.operator || 'SCK Logistics'}</Text>
                    </View>

                    <StatusPill status={v.status || 'ACTIVE'} size="sm" />
                  </View>
                </View>

                {/* License Alert if due */}
                {v.renewalDue || v.licenseStatus === 'RENEWAL_DUE' ? (
                  <View style={styles.renewalAlert}>
                    <Ionicons name="warning-outline" size={14} color="#feb300" />
                    <Text style={styles.renewalAlertText}>
                      Revenue license due for renewal ({v.daysUntilExpiry ?? 18} days left)
                    </Text>
                  </View>
                ) : null}

                {/* Port Pass Alert if due */}
                {v.portPassRenewalDue || v.portPassStatus === 'RENEWAL_DUE' || (v.portPassDaysUntilExpiry && v.portPassDaysUntilExpiry <= 30) ? (
                  <View style={[styles.renewalAlert, { backgroundColor: 'rgba(255, 112, 67, 0.12)', borderColor: 'rgba(255, 112, 67, 0.35)', marginTop: 4 }]}>
                    <Ionicons name="shield-outline" size={14} color="#ff7043" />
                    <Text style={[styles.renewalAlertText, { color: '#ff8a65' }]}>
                      Port Pass Renewal Due ({v.portPassDaysUntilExpiry ?? 14} days left) • {v.portPassNumber || 'SLPA-VPP'}
                    </Text>
                  </View>
                ) : null}

                <View style={styles.divider} />

                {/* Driver Assignment & Tactile Actions */}
                <View style={styles.cardBottomRow}>
                  <View style={styles.driverInfoCol}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <Ionicons
                        name="person-circle-outline"
                        size={15}
                        color={v.driverName ? '#90caf9' : '#ffab00'}
                      />
                      <Text style={styles.driverLabel}>ASSIGNED OPERATOR</Text>
                    </View>
                    <Text style={[styles.driverNameVal, !v.driverName && { color: '#ffab00', fontStyle: 'italic' }]}>
                      {v.driverName ? `${v.driverName} (${v.driverCode})` : 'Unassigned (Tap Assign)'}
                    </Text>
                  </View>

                  <View style={styles.actionBtnsCol}>
                    <TouchableOpacity
                      style={styles.editBtn}
                      onPress={() => openEditVehicle(v)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="create-outline" size={13} color="#00e5ff" style={{ marginRight: 3 }} />
                      <Text style={styles.editBtnText}>EDIT</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.assignBtn}
                      onPress={() => {
                        setSelectedVehicle(v);
                        setAssignModalVisible(true);
                      }}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="person-add-outline" size={13} color="#00e5ff" style={{ marginRight: 3 }} />
                      <Text style={styles.assignBtnText}>ASSIGN</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.toggleStatusBtn,
                        v.status === 'ACTIVE' ? styles.toggleStatusBtnMaint : styles.toggleStatusBtnActive,
                      ]}
                      onPress={() => {
                        handleToggleStatus(v, v.status === 'ACTIVE' ? 'MAINTENANCE' : 'ACTIVE');
                      }}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={v.status === 'ACTIVE' ? 'construct-outline' : 'checkmark-circle-outline'}
                        size={13}
                        color="#ffffff"
                        style={{ marginRight: 3 }}
                      />
                      <Text style={styles.toggleStatusBtnText}>
                        {v.status === 'ACTIVE' ? 'MAINT' : 'ACTIVATE'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}

      {/* Complete Vehicle Details & Profile Modal */}
      <Modal
        visible={detailsModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDetailsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0, 229, 255, 0.15)', borderWidth: 1, borderColor: '#00e5ff', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="car-sport" size={22} color="#00e5ff" />
                </View>
                <View>
                  <Text style={styles.modalTitle}>{selectedVehicle?.vehicleNumber}</Text>
                  <Text style={{ color: '#00e5ff', fontSize: 13, fontWeight: '800' }}>
                    {selectedVehicle?.chassisNumber || selectedVehicle?.cheNumber} • {selectedVehicle?.operator}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setDetailsModalVisible(false)}>
                <Ionicons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              {/* Status Header */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#0f1d33', padding: 12, borderRadius: 8, marginVertical: 12, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)' }}>
                <Text style={{ color: '#90caf9', fontSize: 12, fontWeight: '700' }}>FLEET STATUS</Text>
                <View style={[styles.statusBadge, selectedVehicle?.status === 'ACTIVE' ? styles.statusActive : styles.statusMaint]}>
                  <Text style={styles.statusBadgeText}>{selectedVehicle?.status || 'ACTIVE'}</Text>
                </View>
              </View>

              {/* 1. Vehicle Specifications */}
              <Text style={{ color: '#00e5ff', fontSize: 11, fontWeight: '900', letterSpacing: 1, marginBottom: 8 }}>
                SPECIFICATIONS & FLEET OPERATOR
              </Text>
              <View style={styles.detailCardBox}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailRowLabel}>Registration Number:</Text>
                  <Text style={[styles.detailRowValue, { color: '#00e5ff' }]}>{selectedVehicle?.vehicleNumber}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailRowLabel}>Chassis / CHE Number:</Text>
                  <Text style={styles.detailRowValue}>{selectedVehicle?.chassisNumber || selectedVehicle?.cheNumber}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailRowLabel}>Fleet Operator:</Text>
                  <Text style={styles.detailRowValue}>{selectedVehicle?.operator || 'SCK Logistics'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailRowLabel}>Trailer Standard:</Text>
                  <Text style={styles.detailRowValue}>{selectedVehicle?.trailerSize || '40FT'} Skeletal Prime Mover</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailRowLabel}>Vehicle Class:</Text>
                  <Text style={styles.detailRowValue}>Port Inter-Terminal Prime Mover</Text>
                </View>
              </View>

              {/* 2. Driver Assignment */}
              <Text style={{ color: '#00e5ff', fontSize: 11, fontWeight: '900', letterSpacing: 1, marginBottom: 8 }}>
                ASSIGNED OPERATOR & DRIVER
              </Text>
              <View style={styles.detailCardBox}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailRowLabel}>Driver Name:</Text>
                  <Text style={[styles.detailRowValue, { color: selectedVehicle?.driverName ? '#4caf50' : '#ffb74d' }]}>
                    {selectedVehicle?.driverName || 'No Driver Assigned'}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailRowLabel}>Driver Code:</Text>
                  <Text style={styles.detailRowValue}>{selectedVehicle?.driverCode || 'N/A'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailRowLabel}>Contact Number:</Text>
                  <Text style={styles.detailRowValue}>{selectedVehicle?.driverMobile || 'N/A'}</Text>
                </View>
              </View>

              {/* 3. Revenue License & Compliance */}
              <Text style={{ color: '#00e5ff', fontSize: 11, fontWeight: '900', letterSpacing: 1, marginBottom: 8 }}>
                REVENUE LICENSE & COMPLIANCE
              </Text>
              <View style={styles.detailCardBox}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailRowLabel}>License Issued Date:</Text>
                  <Text style={styles.detailRowValue}>{selectedVehicle?.licenseIssuedDate || '2025-11-15'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailRowLabel}>License Expiry Date:</Text>
                  <Text style={[styles.detailRowValue, { color: selectedVehicle?.daysUntilExpiry && selectedVehicle.daysUntilExpiry <= 30 ? '#feb300' : '#4caf50' }]}>
                    {selectedVehicle?.licenseExpiryDate || '2026-11-15'}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailRowLabel}>Renewal Status:</Text>
                  <Text style={[styles.detailRowValue, { color: selectedVehicle?.daysUntilExpiry && selectedVehicle.daysUntilExpiry <= 30 ? '#feb300' : '#4caf50', fontWeight: '800' }]}>
                    {selectedVehicle?.daysUntilExpiry && selectedVehicle.daysUntilExpiry <= 30
                      ? `RENEWAL DUE (${selectedVehicle.daysUntilExpiry} days)`
                      : 'VALID & COMPLIANT'}
                  </Text>
                </View>
              </View>

              {/* 3.1 Port Entry Permit & Pass Renewal */}
              <Text style={{ color: '#00e5ff', fontSize: 11, fontWeight: '900', letterSpacing: 1, marginBottom: 8 }}>
                PORT ENTRY PASS & TERMINAL CLEARANCE (SLPA)
              </Text>
              <View style={styles.detailCardBox}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailRowLabel}>Port Pass Number:</Text>
                  <Text style={[styles.detailRowValue, { color: '#00e5ff', fontWeight: '800' }]}>
                    {selectedVehicle?.portPassNumber || 'SLPA-VPP-' + (selectedVehicle?.chassisNumber || '').replace(/[^0-9]/g, '')}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailRowLabel}>Port Pass Renewal Date:</Text>
                  <Text style={[styles.detailRowValue, { color: selectedVehicle?.portPassStatus === 'RENEWAL_DUE' ? '#ff7043' : '#4caf50' }]}>
                    {selectedVehicle?.portPassExpiryDate || '2026-11-10'}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailRowLabel}>Pass Renewal Status:</Text>
                  <Text style={[styles.detailRowValue, { color: selectedVehicle?.portPassStatus === 'RENEWAL_DUE' ? '#ff7043' : '#4caf50', fontWeight: '800' }]}>
                    {selectedVehicle?.portPassStatus === 'RENEWAL_DUE'
                      ? `RENEWAL DUE (${selectedVehicle?.portPassDaysUntilExpiry ?? 14} days left)`
                      : 'VALID & COMPLIANT PERMIT'}
                  </Text>
                </View>
              </View>

              {/* 4. Actions */}
              <Text style={{ color: '#00e5ff', fontSize: 11, fontWeight: '900', letterSpacing: 1, marginBottom: 8 }}>
                OPERATIONAL ACTIONS & EDITING
              </Text>
              <View style={{ gap: 8, marginTop: 4 }}>
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
                    gap: 6,
                  }}
                  onPress={() => {
                    openEditVehicle(selectedVehicle);
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="create-outline" size={16} color="#00e5ff" />
                  <Text style={{ color: '#00e5ff', fontWeight: '800', fontSize: 13 }}>EDIT VEHICLE DETAILS</Text>
                </TouchableOpacity>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity
                    style={{ flex: 1, backgroundColor: '#00e5ff', paddingVertical: 12, borderRadius: 8, alignItems: 'center' }}
                    onPress={() => {
                      setDetailsModalVisible(false);
                      setAssignModalVisible(true);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={{ color: '#001529', fontWeight: '800', fontSize: 13 }}>REASSIGN DRIVER</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{ flex: 1, backgroundColor: selectedVehicle?.status === 'ACTIVE' ? '#feb300' : '#4caf50', paddingVertical: 12, borderRadius: 8, alignItems: 'center' }}
                    onPress={() => {
                      handleToggleStatus(selectedVehicle, selectedVehicle?.status === 'ACTIVE' ? 'MAINTENANCE' : 'ACTIVE');
                      setDetailsModalVisible(false);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={{ color: '#000000', fontWeight: '800', fontSize: 13 }}>
                      {selectedVehicle?.status === 'ACTIVE' ? 'SET MAINTENANCE' : 'ACTIVATE TRUCK'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Driver Assignment Modal */}
      <Modal
        visible={assignModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAssignModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assign Driver to {selectedVehicle?.vehicleNumber}</Text>
              <TouchableOpacity onPress={() => setAssignModalVisible(false)}>
                <Ionicons name="close" size={22} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>
              {selectedVehicle?.chassisNumber} • {selectedVehicle?.operator}
            </Text>

            <ScrollView style={{ maxHeight: 320 }}>
              <TouchableOpacity
                style={[styles.driverSelectItem, { borderColor: '#ff5252' }]}
                onPress={() => handleAssignDriver(null)}
              >
                <Ionicons name="remove-circle-outline" size={18} color="#ff5252" />
                <Text style={[styles.driverSelectName, { color: '#ff8a80' }]}>Unassign Current Driver</Text>
              </TouchableOpacity>

              {drivers.map((d) => (
                <TouchableOpacity
                  key={d.id}
                  style={styles.driverSelectItem}
                  onPress={() => handleAssignDriver(d.id)}
                >
                  <Ionicons name="person-circle-outline" size={20} color="#00e5ff" />
                  <View style={{ marginLeft: 10 }}>
                    <Text style={styles.driverSelectName}>{d.fullName}</Text>
                    <Text style={styles.driverSelectCode}>{d.driverCode} • {d.mobileNumber}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Add New Vehicle Modal */}
      <Modal
        visible={createModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { maxHeight: '85%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={styles.modalHeaderIconWrap}>
                  <Ionicons name="car-sport" size={20} color="#00e5ff" />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Add New Fleet Vehicle</Text>
                  <Text style={styles.modalSub}>Register Prime Mover & Port Chassis</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                <Ionicons name="close" size={22} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              {/* Vehicle Number (LY Plate) */}
              <Text style={styles.formLabel}>VEHICLE PLATE NUMBER (LY NO) *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. LY-5660"
                placeholderTextColor="#546e7a"
                value={newVehicleNumber}
                onChangeText={setNewVehicleNumber}
                autoCapitalize="characters"
              />

              {/* Chassis / CHE Number */}
              <Text style={styles.formLabel}>CHASSIS / CHE NUMBER (SCK NO) *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. SCK 128 or SDR 205"
                placeholderTextColor="#546e7a"
                value={newChassisNumber}
                onChangeText={(val) => {
                  setNewChassisNumber(val);
                  if (!newPortPassNumber || newPortPassNumber.startsWith('SLPA-VPP-')) {
                    setNewPortPassNumber(`SLPA-VPP-${val.replace(/[^A-Za-z0-9]/g, '')}`);
                  }
                }}
                autoCapitalize="characters"
              />

              {/* Operator */}
              <Text style={styles.formLabel}>FLEET OPERATOR</Text>
              <View style={styles.formSegmentWrap}>
                <TouchableOpacity
                  style={[
                    styles.formSegmentBtn,
                    newOperator === 'SCK Logistics' && styles.formSegmentBtnActive,
                  ]}
                  onPress={() => setNewOperator('SCK Logistics')}
                >
                  <Text
                    style={[
                      styles.formSegmentText,
                      newOperator === 'SCK Logistics' && styles.formSegmentTextActive,
                    ]}
                  >
                    SCK Logistics
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.formSegmentBtn,
                    newOperator === 'SDR LINK' && styles.formSegmentBtnActive,
                  ]}
                  onPress={() => setNewOperator('SDR LINK')}
                >
                  <Text
                    style={[
                      styles.formSegmentText,
                      newOperator === 'SDR LINK' && styles.formSegmentTextActive,
                    ]}
                  >
                    SDR LINK
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Trailer Chassis Size */}
              <Text style={styles.formLabel}>TRAILER CHASSIS SIZE</Text>
              <View style={styles.formSegmentWrap}>
                {(['40FT', '20FT', '45FT'] as const).map((sz) => (
                  <TouchableOpacity
                    key={sz}
                    style={[
                      styles.formSegmentBtn,
                      newTrailerSize === sz && styles.formSegmentBtnActive,
                    ]}
                    onPress={() => setNewTrailerSize(sz)}
                  >
                    <Text
                      style={[
                        styles.formSegmentText,
                        newTrailerSize === sz && styles.formSegmentTextActive,
                      ]}
                    >
                      {sz}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Port Pass Number */}
              <Text style={styles.formLabel}>SLPA VEHICLE PORT PASS NO</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. SLPA-VPP-128"
                placeholderTextColor="#546e7a"
                value={newPortPassNumber}
                onChangeText={setNewPortPassNumber}
                autoCapitalize="characters"
              />

              {/* Port Pass Expiry Date */}
              <Text style={styles.formLabel}>PORT PASS EXPIRY / RENEWAL DATE</Text>
              <TextInput
                style={styles.formInput}
                placeholder="YYYY-MM-DD (e.g. 2027-10-31)"
                placeholderTextColor="#546e7a"
                value={newPortPassExpiryDate}
                onChangeText={setNewPortPassExpiryDate}
              />

              {/* Initial Status */}
              <Text style={styles.formLabel}>INITIAL OPERATING STATUS</Text>
              <View style={styles.formSegmentWrap}>
                <TouchableOpacity
                  style={[
                    styles.formSegmentBtn,
                    newStatus === 'ACTIVE' && styles.formSegmentBtnActive,
                  ]}
                  onPress={() => setNewStatus('ACTIVE')}
                >
                  <Text
                    style={[
                      styles.formSegmentText,
                      newStatus === 'ACTIVE' && styles.formSegmentTextActive,
                    ]}
                  >
                    ACTIVE (Available)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.formSegmentBtn,
                    newStatus === 'MAINTENANCE' && styles.formSegmentBtnActive,
                  ]}
                  onPress={() => setNewStatus('MAINTENANCE')}
                >
                  <Text
                    style={[
                      styles.formSegmentText,
                      newStatus === 'MAINTENANCE' && styles.formSegmentTextActive,
                    ]}
                  >
                    MAINTENANCE
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Actions */}
              <View style={{ marginTop: 20, gap: 10 }}>
                <TouchableOpacity
                  style={[styles.submitBtn, submittingVehicle && { opacity: 0.6 }]}
                  onPress={handleRegisterVehicle}
                  disabled={submittingVehicle}
                  activeOpacity={0.8}
                >
                  {submittingVehicle ? (
                    <ActivityIndicator size="small" color="#070f1e" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={18} color="#070f1e" />
                      <Text style={styles.submitBtnText}>REGISTER NEW VEHICLE</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setCreateModalVisible(false)}
                >
                  <Text style={styles.cancelBtnText}>CANCEL</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Vehicle Details Modal */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { maxHeight: '88%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={styles.modalHeaderIconWrap}>
                  <Ionicons name="create" size={20} color="#00e5ff" />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Edit Vehicle Details</Text>
                  <Text style={styles.modalSub}>Update Prime Mover & Compliance Records</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={22} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              {/* Vehicle Number (LY Plate) */}
              <Text style={styles.formLabel}>VEHICLE PLATE NUMBER (LY NO) *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. LY-6439"
                placeholderTextColor="#546e7a"
                value={editVehicleNumber}
                onChangeText={setEditVehicleNumber}
                autoCapitalize="characters"
              />

              {/* Chassis / CHE Number */}
              <Text style={styles.formLabel}>CHASSIS / CHE NUMBER (SCK NO) *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. SCK 100 or SDR 115"
                placeholderTextColor="#546e7a"
                value={editChassisNumber}
                onChangeText={setEditChassisNumber}
                autoCapitalize="characters"
              />

              {/* Operator */}
              <Text style={styles.formLabel}>FLEET OPERATOR</Text>
              <View style={styles.formSegmentWrap}>
                <TouchableOpacity
                  style={[
                    styles.formSegmentBtn,
                    editOperator === 'SCK Logistics' && styles.formSegmentBtnActive,
                  ]}
                  onPress={() => setEditOperator('SCK Logistics')}
                >
                  <Text
                    style={[
                      styles.formSegmentText,
                      editOperator === 'SCK Logistics' && styles.formSegmentTextActive,
                    ]}
                  >
                    SCK Logistics
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.formSegmentBtn,
                    editOperator === 'SDR LINK' && styles.formSegmentBtnActive,
                  ]}
                  onPress={() => setEditOperator('SDR LINK')}
                >
                  <Text
                    style={[
                      styles.formSegmentText,
                      editOperator === 'SDR LINK' && styles.formSegmentTextActive,
                    ]}
                  >
                    SDR LINK
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Trailer Chassis Size */}
              <Text style={styles.formLabel}>TRAILER CHASSIS SIZE</Text>
              <View style={styles.formSegmentWrap}>
                {(['40FT', '20FT', '45FT'] as const).map((sz) => (
                  <TouchableOpacity
                    key={sz}
                    style={[
                      styles.formSegmentBtn,
                      editTrailerSize === sz && styles.formSegmentBtnActive,
                    ]}
                    onPress={() => setEditTrailerSize(sz)}
                  >
                    <Text
                      style={[
                        styles.formSegmentText,
                        editTrailerSize === sz && styles.formSegmentTextActive,
                      ]}
                    >
                      {sz}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Operating Status */}
              <Text style={styles.formLabel}>OPERATING STATUS</Text>
              <View style={styles.formSegmentWrap}>
                <TouchableOpacity
                  style={[
                    styles.formSegmentBtn,
                    editStatus === 'ACTIVE' && styles.formSegmentBtnActive,
                  ]}
                  onPress={() => setEditStatus('ACTIVE')}
                >
                  <Text
                    style={[
                      styles.formSegmentText,
                      editStatus === 'ACTIVE' && styles.formSegmentTextActive,
                    ]}
                  >
                    ACTIVE (Available)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.formSegmentBtn,
                    editStatus === 'MAINTENANCE' && styles.formSegmentBtnActive,
                  ]}
                  onPress={() => setEditStatus('MAINTENANCE')}
                >
                  <Text
                    style={[
                      styles.formSegmentText,
                      editStatus === 'MAINTENANCE' && styles.formSegmentTextActive,
                    ]}
                  >
                    MAINTENANCE
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Port Pass Number */}
              <Text style={styles.formLabel}>SLPA VEHICLE PORT PASS NO</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. SLPA-VPP-100"
                placeholderTextColor="#546e7a"
                value={editPortPassNumber}
                onChangeText={setEditPortPassNumber}
                autoCapitalize="characters"
              />

              {/* Port Pass Expiry Date */}
              <Text style={styles.formLabel}>PORT PASS EXPIRY / RENEWAL DATE</Text>
              <TextInput
                style={styles.formInput}
                placeholder="YYYY-MM-DD (e.g. 2027-10-31)"
                placeholderTextColor="#546e7a"
                value={editPortPassExpiryDate}
                onChangeText={setEditPortPassExpiryDate}
              />

              {/* Revenue License Issued Date */}
              <Text style={styles.formLabel}>REVENUE LICENSE ISSUED DATE</Text>
              <TextInput
                style={styles.formInput}
                placeholder="YYYY-MM-DD (e.g. 2025-11-15)"
                placeholderTextColor="#546e7a"
                value={editLicenseIssuedDate}
                onChangeText={setEditLicenseIssuedDate}
              />

              {/* Revenue License Expiry Date */}
              <Text style={styles.formLabel}>REVENUE LICENSE EXPIRY DATE</Text>
              <TextInput
                style={styles.formInput}
                placeholder="YYYY-MM-DD (e.g. 2026-11-15)"
                placeholderTextColor="#546e7a"
                value={editLicenseExpiryDate}
                onChangeText={setEditLicenseExpiryDate}
              />

              {/* Action Buttons */}
              <View style={{ marginTop: 20, gap: 10 }}>
                <TouchableOpacity
                  style={[styles.submitBtn, savingEditVehicle && { opacity: 0.6 }]}
                  onPress={handleSaveVehicleEdit}
                  disabled={savingEditVehicle}
                  activeOpacity={0.8}
                >
                  {savingEditVehicle ? (
                    <ActivityIndicator size="small" color="#070f1e" />
                  ) : (
                    <>
                      <Ionicons name="save-outline" size={18} color="#070f1e" />
                      <Text style={styles.submitBtnText}>SAVE VEHICLE CHANGES</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setEditModalVisible(false)}
                >
                  <Text style={styles.cancelBtnText}>CANCEL</Text>
                </TouchableOpacity>
              </View>
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
  headerLogoutBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 82, 82, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 82, 82, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
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
  fleetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.3)',
  },
  fleetBadgeText: {
    color: '#00e5ff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
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
  hudCardMaint: {
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
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  opTab: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  opTabActive: {
    backgroundColor: '#00e5ff',
  },
  opTabText: {
    color: '#90caf9',
    fontSize: 11,
    fontWeight: '700',
  },
  opTabTextActive: {
    color: '#001529',
  },
  statusFilterTab: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  statusFilterTabActive: {
    backgroundColor: 'rgba(0, 229, 255, 0.15)',
    borderColor: '#00e5ff',
  },
  statusFilterTabText: {
    color: '#78909c',
    fontSize: 10,
    fontWeight: '700',
  },
  statusFilterTabTextActive: {
    color: '#00e5ff',
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
    backgroundColor: '#0c1524',
    borderRadius: 14,
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
  vehicleCard: {
    backgroundColor: '#0c1524',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vehicleNumberWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  plateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#070c14',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.35)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  vehicleNumberText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  cheBadge: {
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.3)',
  },
  cheBadgeText: {
    color: '#00e5ff',
    fontSize: 10,
    fontWeight: '800',
  },
  cardTopActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  opPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  opPillSck: {
    backgroundColor: 'rgba(33, 150, 243, 0.15)',
  },
  opPillSdr: {
    backgroundColor: 'rgba(156, 39, 176, 0.15)',
  },
  opPillText: {
    color: '#ffffff',
    fontSize: 9,
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
  statusMaint: {
    backgroundColor: 'rgba(255, 82, 82, 0.2)',
  },
  statusBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
  },
  renewalAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(254, 179, 0, 0.1)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(254, 179, 0, 0.25)',
  },
  renewalAlertText: {
    color: '#feb300',
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 6,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginVertical: 10,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  driverInfoCol: {
    flex: 1,
  },
  driverLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#78909c',
    letterSpacing: 0.5,
  },
  driverNameVal: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
    marginTop: 2,
  },
  actionBtnsCol: {
    flexDirection: 'row',
    gap: 8,
  },
  editBtn: {
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.35)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  editBtnText: {
    color: '#00e5ff',
    fontSize: 10,
    fontWeight: '800',
  },
  assignBtn: {
    backgroundColor: 'rgba(41, 182, 246, 0.12)',
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(41, 182, 246, 0.35)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  assignBtnText: {
    color: '#29b6f6',
    fontSize: 10,
    fontWeight: '800',
  },
  toggleStatusBtn: {
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleStatusBtnMaint: {
    backgroundColor: 'rgba(255, 171, 0, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 171, 0, 0.35)',
  },
  toggleStatusBtnActive: {
    backgroundColor: 'rgba(0, 230, 118, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.35)',
  },
  toggleStatusBtnText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(3, 7, 18, 0.85)',
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
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  modalSub: {
    color: '#00e5ff',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 14,
  },
  driverSelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#070f1e',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  driverSelectName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  driverSelectCode: {
    fontSize: 11,
    color: '#78909c',
    marginTop: 2,
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
  addVehicleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00e5ff',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 4,
  },
  addVehicleBtnText: {
    color: '#070f1e',
    fontSize: 11,
    fontWeight: '800',
  },
  modalHeaderIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 229, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formLabel: {
    color: '#90caf9',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginTop: 12,
    marginBottom: 6,
  },
  formInput: {
    backgroundColor: '#070f1e',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  formSegmentWrap: {
    flexDirection: 'row',
    backgroundColor: '#070f1e',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    padding: 3,
    gap: 4,
  },
  formSegmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  formSegmentBtnActive: {
    backgroundColor: '#00e5ff',
  },
  formSegmentText: {
    color: '#78909c',
    fontSize: 11,
    fontWeight: '700',
  },
  formSegmentTextActive: {
    color: '#070f1e',
    fontWeight: '800',
  },
  submitBtn: {
    backgroundColor: '#00e5ff',
    borderRadius: 10,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#00e5ff',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  submitBtnText: {
    color: '#070f1e',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  cancelBtn: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#78909c',
    fontSize: 12,
    fontWeight: '700',
  },
});
