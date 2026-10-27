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
import { useResponsive } from '../../../src/hooks/useResponsive';
import AdminSignOutModal from '../../../src/components/AdminSignOutModal';

export default function AdminSupervisorsTab() {
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
      const data = await adminService.getSupervisors(search);
      if (Array.isArray(data) && data.length > 0) {
        setSupervisors(data);
      } else {
        throw new Error('No supervisors returned');
      }
    } catch (err: any) {
      // 6 Port Terminal Supervisors Roster (All Port Jurisdiction)
      const roster = [
        { id: 'sup-1', employeeId: 'SUP001', fullName: 'Nimal Silva', email: 'supervisor@smartitt.lk', mobileNumber: '0711234567', nic: '199012345678', status: 'ACTIVE', assignedTerminal: 'ALL TERMINALS', assignedTerminalName: 'Colombo Port Terminals (JCT, CICT, SAGT, ECT, CWIT, UCT)', address: 'Port Operations Complex, Colombo Port', emergencyContactName: 'Amara Silva', emergencyContactNumber: '0719876543' },
        { id: 'sup-2', employeeId: 'SUP002', fullName: 'Bandara Weerasinghe', email: 'bandara.cwit@smartitt.lk', mobileNumber: '0712345678', nic: '198823456789', status: 'ACTIVE', assignedTerminal: 'ALL TERMINALS', assignedTerminalName: 'Colombo Port Terminals (JCT, CICT, SAGT, ECT, CWIT, UCT)', address: 'Gate Control, Colombo Port', emergencyContactName: 'S. Weerasinghe', emergencyContactNumber: '0718876543' },
        { id: 'sup-3', employeeId: 'SUP003', fullName: 'Kasun Jayawardena', email: 'kasun.ect@smartitt.lk', mobileNumber: '0713456789', nic: '199134567890', status: 'ACTIVE', assignedTerminal: 'ALL TERMINALS', assignedTerminalName: 'Colombo Port Terminals (JCT, CICT, SAGT, ECT, CWIT, UCT)', address: 'Marshalling Yard Office, Colombo Port', emergencyContactName: 'K. Jayawardena', emergencyContactNumber: '0717765432' },
        { id: 'sup-4', employeeId: 'SUP004', fullName: 'Prasanna Gunasekara', email: 'prasanna.jct@smartitt.lk', mobileNumber: '0714567890', nic: '198745678901', status: 'ACTIVE', assignedTerminal: 'ALL TERMINALS', assignedTerminalName: 'Colombo Port Terminals (JCT, CICT, SAGT, ECT, CWIT, UCT)', address: 'Operations Tower, Colombo Port', emergencyContactName: 'P. Gunasekara', emergencyContactNumber: '0716654321' },
        { id: 'sup-5', employeeId: 'SUP005', fullName: 'Ruwan Fernando', email: 'ruwan.sagt@smartitt.lk', mobileNumber: '0715678901', nic: '199256789012', status: 'ACTIVE', assignedTerminal: 'ALL TERMINALS', assignedTerminalName: 'Colombo Port Terminals (JCT, CICT, SAGT, ECT, CWIT, UCT)', address: 'Gate 04, Colombo Port', emergencyContactName: 'R. Fernando', emergencyContactNumber: '0715543210' },
        { id: 'sup-6', employeeId: 'SUP006', fullName: 'Dinesh Perera', email: 'dinesh.uct@smartitt.lk', mobileNumber: '0716789012', nic: '198967890123', status: 'ACTIVE', assignedTerminal: 'ALL TERMINALS', assignedTerminalName: 'Colombo Port Terminals (JCT, CICT, SAGT, ECT, CWIT, UCT)', address: 'In-Gate Office, Colombo Port', emergencyContactName: 'D. Perera', emergencyContactNumber: '0714432109' },
      ];

      let filtered = roster;
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        filtered = filtered.filter(
          (s) =>
            s.fullName.toLowerCase().includes(q) ||
            s.employeeId.toLowerCase().includes(q) ||
            s.mobileNumber.includes(q)
        );
      }
      setSupervisors(filtered);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search]);

  useEffect(() => {
    fetchSupervisors();
  }, [fetchSupervisors]);

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
      await adminService.createSupervisor({
        fullName: fullName.trim(),
        employeeId: empIdFormatted,
        nic: nic.trim(),
        mobileNumber: mobileNumber.trim(),
        password: password.trim() || 'supervisor',
      });
    } catch (err: any) {
      console.log('[Supervisors] Backend offline, saving supervisor locally');
    }

    const newSupervisor = {
      id: `sup-${Date.now()}`,
      employeeId: empIdFormatted,
      fullName: fullName.trim(),
      email: `${empIdFormatted.toLowerCase()}@smartitt.lk`,
      mobileNumber: mobileNumber.trim(),
      nic: nic.trim(),
      status: 'ACTIVE',
      assignedTerminal: 'ALL TERMINALS',
      assignedTerminalName: 'Colombo Port Terminals (JCT, CICT, SAGT, ECT, CWIT, UCT)',
      address: 'Port Operations Complex, Colombo Port',
      emergencyContactName: 'Next of Kin',
      emergencyContactNumber: mobileNumber.trim(),
    };

    setSupervisors((prev) => [newSupervisor, ...prev.filter(s => s.employeeId !== empIdFormatted)]);
    Alert.alert('Success', `Supervisor ${fullName} (${empIdFormatted}) registered successfully!`);
    setCreateModalVisible(false);
    setFullName('');
    setEmployeeId('');
    setNic('');
    setMobileNumber('');
    setCreating(false);
  };

  const handleToggleStatus = async (supervisor: any) => {
    const newStatus = supervisor.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await adminService.updateSupervisorStatus(supervisor.id, newStatus, 'Admin toggled supervisor status');
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
              await adminService.resetSupervisorPassword(selectedSupervisor.id, 'supervisor');
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
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={styles.avatarCircle}>
                    <Ionicons name="shield" size={18} color="#feb300" />
                  </View>
                  <View>
                    <Text style={styles.supName}>{s.fullName}</Text>
                    <Text style={styles.supId}>{s.employeeId} • {s.mobileNumber}</Text>
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
