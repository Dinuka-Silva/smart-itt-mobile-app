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
import { useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { adminService } from '../../../src/services/adminService';
import { adminFleetStore } from '../../../src/store/adminFleetStore';
import { securityAuditService } from '../../../src/services/securityAuditService';
import { useResponsive } from '../../../src/hooks/useResponsive';
import AdminSignOutModal from '../../../src/components/AdminSignOutModal';

export default function AdminSupervisorsTab() {
  const navigation = useNavigation();
  const { topInset, bottomInset, containerPaddingHorizontal } = useResponsive();

  const [supervisors, setSupervisors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [signOutModalVisible, setSignOutModalVisible] = useState(false);

  // Details Modal
  const [selectedSupervisor, setSelectedSupervisor] = useState<any | null>(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);

  // Create Modal
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [creating, setCreating] = useState(false);
  const [fullName, setFullName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [nic, setNic] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [password, setPassword] = useState('supervisor');

  const fetchSupervisors = useCallback(async () => {
    try {
      const data = await adminFleetStore.getSupervisors(search);
      setSupervisors(data);
    } catch (err: any) {
      console.warn('[AdminSupervisors] Fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search]);

  useEffect(() => {
    fetchSupervisors();
    const unsubscribe = adminFleetStore.subscribe(() => {
      fetchSupervisors();
    });
    return unsubscribe;
  }, [fetchSupervisors]);

  useEffect(() => {
    const unsubFocus = navigation.addListener('focus', () => {
      fetchSupervisors();
    });
    return unsubFocus;
  }, [navigation, fetchSupervisors]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchSupervisors();
  };

  const handleCreateSupervisor = async () => {
    if (!fullName.trim() || !employeeId.trim() || !nic.trim() || !mobileNumber.trim()) {
      Alert.alert('Required Fields', 'Please fill in Name, Employee ID, NIC, and Mobile number.');
      return;
    }

    setCreating(true);
    const empIdFormatted = employeeId.trim().toUpperCase();
    try {
      const newSupervisor = await adminFleetStore.registerNewSupervisorAccount({
        fullName: fullName.trim(),
        employeeId: empIdFormatted,
        username: empIdFormatted,
        nic: nic.trim(),
        mobileNumber: mobileNumber.trim(),
        password: password.trim() || 'supervisor',
        status: 'ACTIVE',
      });

      await securityAuditService.logEvent(
        'SUPERVISOR_REGISTERED',
        empIdFormatted,
        `Administrator registered new Supervisor: ${fullName.trim()} (${empIdFormatted}) · Scope: All Port Terminals · Tel: ${mobileNumber.trim()}`,
        'INFO',
        'ADMIN',
        { role: 'SUPERVISOR', employeeId: empIdFormatted, createdBy: 'ADMIN', fullName: fullName.trim() }
      );

      Alert.alert('Success', `Supervisor ${fullName} (${empIdFormatted}) registered successfully!`);
      setCreateModalVisible(false);
      setFullName('');
      setEmployeeId('');
      setNic('');
      setMobileNumber('');
      fetchSupervisors();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to register supervisor');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleStatus = async (supervisor: any) => {
    const newStatus = supervisor.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await adminFleetStore.updateSupervisorStatus(supervisor.id, newStatus, 'Admin toggled supervisor status');
      await securityAuditService.logEvent(
        'SUPERVISOR_STATUS_UPDATED',
        supervisor.username || supervisor.employeeId,
        `Administrator changed Supervisor status for ${supervisor.fullName} (${supervisor.employeeId}) to ${newStatus}`,
        newStatus === 'ACTIVE' ? 'INFO' : 'WARNING',
        'ADMIN',
        { role: 'SUPERVISOR', supervisorId: supervisor.id, employeeId: supervisor.employeeId, newStatus }
      );
      Alert.alert('Status Updated', `${supervisor.fullName} is now ${newStatus}`);
      if (selectedSupervisor && selectedSupervisor.id === supervisor.id) {
        setSelectedSupervisor({ ...selectedSupervisor, status: newStatus });
      }
      fetchSupervisors();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to update status');
    }
  };

  const handleResetPassword = async () => {
    if (!selectedSupervisor) return;
    Alert.alert(
      'Reset Password',
      `Reset password for ${selectedSupervisor.fullName} (${selectedSupervisor.employeeId}) to default 'supervisor'?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await adminFleetStore.resetSupervisorPassword(selectedSupervisor.id, 'supervisor');
              await securityAuditService.logEvent(
                'PASSWORD_CHANGED',
                selectedSupervisor.username || selectedSupervisor.employeeId,
                `Administrator reset password for Supervisor ${selectedSupervisor.fullName} (${selectedSupervisor.employeeId}) to default ('supervisor')`,
                'INFO',
                'ADMIN',
                { role: 'SUPERVISOR', supervisorId: selectedSupervisor.id, resetBy: 'ADMIN' }
              );
              Alert.alert('Success', 'Password has been reset to: supervisor');
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
          <Text style={styles.headerTitle}>Supervisor Management</Text>
          <Text style={styles.headerSubtitle}>{supervisors.length} terminal supervisors registered</Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setCreateModalVisible(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="person-add" size={15} color="#001529" style={{ marginRight: 4 }} />
            <Text style={styles.addBtnText}>ADD</Text>
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

      {/* Search Bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={16} color="#78909c" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search name, employee ID, terminal..."
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

      {/* Supervisors List */}
      {loading && !refreshing ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#00e5ff" />
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
          {supervisors.map((s) => (
            <TouchableOpacity
              key={s.id || s.employeeId}
              style={styles.supCard}
              onPress={() => {
                setSelectedSupervisor(s);
                setDetailsModalVisible(true);
              }}
              activeOpacity={0.85}
            >
              <View style={styles.cardTop}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, flex: 1 }}>
                  <View style={styles.avatarCircle}>
                    <Ionicons name="shield" size={18} color="#feb300" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.supName}>{s.fullName}</Text>
                    <Text style={styles.supId}>{s.employeeId} • {s.mobileNumber}</Text>
                    <View style={styles.usernamePill}>
                      <Ionicons name="key" size={11} color="#00e5ff" style={{ marginRight: 4 }} />
                      <Text style={styles.usernamePillLabel}>LOGIN USERNAME: </Text>
                      <Text style={styles.usernamePillValue}>{s.username || s.employeeId}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.terminalBadge}>
                  <Text style={styles.terminalBadgeText}>ALL TERMINALS</Text>
                </View>
              </View>

              <View style={styles.cardDivider} />

              <View style={styles.cardBottom}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={[styles.statusDot, { backgroundColor: s.status === 'ACTIVE' ? '#4caf50' : '#feb300' }]} />
                  <Text style={[styles.statusPillText, { color: s.status === 'ACTIVE' ? '#4caf50' : '#feb300' }]}>
                    {s.status || 'ACTIVE'}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.toggleBtn, s.status === 'ACTIVE' ? styles.toggleBtnActive : styles.toggleBtnSuspended]}
                  onPress={() => {
                    handleToggleStatus(s);
                  }}
                >
                  <Text style={styles.toggleBtnText}>
                    {s.status === 'ACTIVE' ? 'SUSPEND' : 'ACTIVATE'}
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Complete Supervisor Details Modal */}
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
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(254, 179, 0, 0.15)', borderWidth: 1, borderColor: '#feb300', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="shield-checkmark" size={22} color="#feb300" />
                </View>
                <View>
                  <Text style={styles.modalTitle}>{selectedSupervisor?.fullName}</Text>
                  <Text style={{ color: '#feb300', fontSize: 13, fontWeight: '800' }}>
                    {selectedSupervisor?.employeeId} • Port-Wide Supervisor
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
                <Text style={{ color: '#90caf9', fontSize: 12, fontWeight: '700' }}>ACCOUNT STATUS</Text>
                <View style={[styles.statusPill, selectedSupervisor?.status === 'ACTIVE' ? styles.statusPillActive : styles.statusPillSuspended]}>
                  <Text style={styles.statusPillText}>{selectedSupervisor?.status || 'ACTIVE'}</Text>
                </View>
              </View>

              {/* Portal Login Credentials */}
              <Text style={styles.modalSectionLabel}>PORTAL LOGIN CREDENTIALS</Text>
              <View style={[styles.detailCardBox, { borderColor: 'rgba(0, 229, 255, 0.35)', backgroundColor: 'rgba(0, 229, 255, 0.05)' }]}>
                <View style={styles.detailRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="key" size={14} color="#00e5ff" />
                    <Text style={[styles.detailRowLabel, { color: '#00e5ff', fontWeight: '800' }]}>System Login Username:</Text>
                  </View>
                  <View style={{ backgroundColor: 'rgba(0, 229, 255, 0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#00e5ff' }}>
                    <Text style={{ color: '#00e5ff', fontSize: 13, fontWeight: '900', letterSpacing: 0.8 }}>
                      {selectedSupervisor?.username || selectedSupervisor?.employeeId}
                    </Text>
                  </View>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailRowLabel}>Employee ID Code:</Text>
                  <Text style={styles.detailRowValue}>{selectedSupervisor?.employeeId}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailRowLabel}>Login Role Clearance:</Text>
                  <Text style={[styles.detailRowValue, { color: '#feb300', fontWeight: '800' }]}>PORT OPERATIONS SUPERVISOR</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailRowLabel}>Terminal Control Scope:</Text>
                  <Text style={[styles.detailRowValue, { color: '#22ef7e', fontWeight: '700' }]}>ALL 6 GATES (PORT-WIDE)</Text>
                </View>
              </View>

              {/* 1. Terminal Jurisdiction */}
              <Text style={styles.modalSectionLabel}>PORT JURISDICTION & AUTHORITY</Text>
              <View style={styles.detailCardBox}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailRowLabel}>Jurisdiction Scope:</Text>
                  <Text style={[styles.detailRowValue, { color: '#00e5ff', fontWeight: '800' }]}>ALL TERMINALS (PORT-WIDE)</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailRowLabel}>Terminal Gates:</Text>
                  <Text style={[styles.detailRowValue, { flex: 1, textAlign: 'right' }]}>JCT, CICT, SAGT, ECT, CWIT, UCT</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailRowLabel}>ITT Authorization:</Text>
                  <Text style={[styles.detailRowValue, { color: '#4caf50', fontWeight: '800' }]}>FULL OPERATIONAL ACCESS</Text>
                </View>
              </View>

              {/* 2. Personal & Contact Details */}
              <Text style={styles.modalSectionLabel}>SUPERVISOR PROFILE & CONTACT</Text>
              <View style={styles.detailCardBox}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailRowLabel}>Employee ID:</Text>
                  <Text style={styles.detailRowValue}>{selectedSupervisor?.employeeId}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailRowLabel}>National Identity (NIC):</Text>
                  <Text style={styles.detailRowValue}>{selectedSupervisor?.nic || '199012345678'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailRowLabel}>Mobile Phone:</Text>
                  <Text style={[styles.detailRowValue, { color: '#4caf50' }]}>{selectedSupervisor?.mobileNumber}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailRowLabel}>Work Email:</Text>
                  <Text style={styles.detailRowValue}>{selectedSupervisor?.email || `${selectedSupervisor?.employeeId?.toLowerCase()}@smartitt.lk`}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailRowLabel}>Emergency Contact:</Text>
                  <Text style={[styles.detailRowValue, { color: '#ffb74d' }]}>
                    {selectedSupervisor?.emergencyContactName || 'Port Operations Office'} ({selectedSupervisor?.emergencyContactNumber || '0112456789'})
                  </Text>
                </View>
              </View>

              {/* 3. Operational Permissions */}
              <Text style={styles.modalSectionLabel}>OPERATIONAL AUTHORITIES</Text>
              <View style={styles.detailCardBox}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailRowLabel}>System Role:</Text>
                  <Text style={[styles.detailRowValue, { color: '#feb300', fontWeight: '800' }]}>ROLE_SUPERVISOR</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailRowLabel}>Trip Verification Authority:</Text>
                  <Text style={[styles.detailRowValue, { color: '#4caf50' }]}>AUTHORIZED</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailRowLabel}>Gate Movement Logging:</Text>
                  <Text style={[styles.detailRowValue, { color: '#4caf50' }]}>AUTHORIZED</Text>
                </View>
              </View>

              {/* 4. Actions */}
              <Text style={styles.modalSectionLabel}>ADMIN ACTIONS</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: selectedSupervisor?.status === 'ACTIVE' ? '#ff5252' : '#4caf50', paddingVertical: 12, borderRadius: 8, alignItems: 'center' }}
                  onPress={() => handleToggleStatus(selectedSupervisor)}
                  activeOpacity={0.8}
                >
                  <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 13 }}>
                    {selectedSupervisor?.status === 'ACTIVE' ? 'SUSPEND ACCOUNT' : 'ACTIVATE ACCOUNT'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: 'rgba(0, 229, 255, 0.15)', borderWidth: 1, borderColor: '#00e5ff', paddingVertical: 12, borderRadius: 8, alignItems: 'center' }}
                  onPress={handleResetPassword}
                  activeOpacity={0.8}
                >
                  <Text style={{ color: '#00e5ff', fontWeight: '800', fontSize: 13 }}>RESET PASSWORD</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Create Modal */}
      <Modal
        visible={createModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Supervisor Account</Text>
              <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                <Ionicons name="close" size={22} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Full Name *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Nimal Silva"
                placeholderTextColor="#546e7a"
                value={fullName}
                onChangeText={setFullName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Employee ID *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. SUP002"
                placeholderTextColor="#546e7a"
                value={employeeId}
                onChangeText={setEmployeeId}
                autoCapitalize="characters"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>NIC *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. 199012345678"
                placeholderTextColor="#546e7a"
                value={nic}
                onChangeText={setNic}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Mobile Number *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. 0711234567"
                placeholderTextColor="#546e7a"
                keyboardType="phone-pad"
                value={mobileNumber}
                onChangeText={setMobileNumber}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Jurisdiction Authority</Text>
              <View style={[styles.modalInput, { justifyContent: 'center', backgroundColor: 'rgba(0, 229, 255, 0.08)', borderColor: 'rgba(0, 229, 255, 0.25)' }]}>
                <Text style={{ color: '#00e5ff', fontSize: 13, fontWeight: '700' }}>
                  ALL TERMINALS (PORT-WIDE JURISDICTION)
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, creating && { opacity: 0.6 }]}
              onPress={handleCreateSupervisor}
              disabled={creating}
            >
              {creating ? (
                <ActivityIndicator color="#001529" size="small" />
              ) : (
                <Text style={styles.saveBtnText}>CREATE SUPERVISOR</Text>
              )}
            </TouchableOpacity>
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
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#feb300',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addBtnText: {
    color: '#001529',
    fontSize: 11,
    fontWeight: '800',
  },
  headerLogoutBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 82, 82, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 82, 82, 0.25)',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0c1b30',
    margin: 16,
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 13,
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 40,
    gap: 12,
  },
  supCard: {
    backgroundColor: '#0c1b30',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 14,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(254, 179, 0, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  supName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
  supId: {
    fontSize: 11,
    color: '#78909c',
    marginTop: 2,
  },
  usernamePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0, 229, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.35)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 6,
  },
  usernamePillLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#00e5ff',
    letterSpacing: 0.5,
  },
  usernamePillValue: {
    fontSize: 11,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  terminalBadge: {
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
    borderColor: '#00e5ff',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  terminalBadgeText: {
    color: '#00e5ff',
    fontSize: 11,
    fontWeight: '800',
  },
  cardDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginVertical: 10,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusPillActive: {
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
  },
  statusPillSuspended: {
    backgroundColor: 'rgba(254, 179, 0, 0.15)',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  toggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  toggleBtnActive: {
    borderColor: 'rgba(254, 179, 0, 0.4)',
    backgroundColor: 'rgba(254, 179, 0, 0.08)',
  },
  toggleBtnSuspended: {
    borderColor: 'rgba(76, 175, 80, 0.4)',
    backgroundColor: 'rgba(76, 175, 80, 0.08)',
  },
  toggleBtnText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
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
    borderColor: 'rgba(254, 179, 0, 0.25)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  modalSectionLabel: {
    color: '#feb300',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 10,
  },
  detailCardBox: {
    backgroundColor: '#0a172a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 12,
    marginBottom: 12,
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
  terminalPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  termPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#070f1e',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  termPillActive: {
    backgroundColor: '#feb300',
    borderColor: '#feb300',
  },
  termPillText: {
    color: '#90caf9',
    fontSize: 11,
    fontWeight: '700',
  },
  termPillTextActive: {
    color: '#001529',
    fontWeight: '900',
  },
  saveBtn: {
    backgroundColor: '#feb300',
    borderRadius: 8,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  saveBtnText: {
    color: '#001529',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
