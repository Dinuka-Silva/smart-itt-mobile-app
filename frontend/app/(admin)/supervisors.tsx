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
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { adminService } from '../../src/services/adminService';
import { useResponsive } from '../../src/hooks/useResponsive';

export default function AdminSupervisorsScreen() {
  const router = useRouter();
  const { topInset, bottomInset, containerPaddingHorizontal } = useResponsive();

  const [supervisors, setSupervisors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  // Create Modal
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [creating, setCreating] = useState(false);
  const [fullName, setFullName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [nic, setNic] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [terminalCode, setTerminalCode] = useState('CICT');
  const [password, setPassword] = useState('supervisor');

  const fetchSupervisors = useCallback(async () => {
    try {
      const data = await adminService.getSupervisors(search);
      setSupervisors(data);
    } catch (err: any) {
      setSupervisors([
        {
          id: 'sup-1',
          fullName: 'Nimal Silva',
          employeeId: 'SUP001',
          nic: '199012345678',
          mobileNumber: '0711234567',
          email: 'supervisor@smartitt.lk',
          status: 'ACTIVE',
          assignedTerminal: 'CICT',
        },
      ]);
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
    try {
      await adminService.createSupervisor({
        fullName: fullName.trim(),
        employeeId: employeeId.trim().toUpperCase(),
        nic: nic.trim(),
        mobileNumber: mobileNumber.trim(),
        terminalCode: terminalCode.toUpperCase(),
        password: password.trim() || 'supervisor',
      });

      Alert.alert('Success', `Supervisor ${fullName} created!`);
      setCreateModalVisible(false);
      setFullName('');
      setEmployeeId('');
      setNic('');
      setMobileNumber('');
      fetchSupervisors();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || err?.message || 'Failed to create supervisor');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleStatus = async (sup: any) => {
    const newStatus = sup.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await adminService.updateSupervisorStatus(sup.id, newStatus, `Admin toggled status to ${newStatus}`);
      Alert.alert('Updated', `Supervisor status set to ${newStatus}`);
      fetchSupervisors();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to update status');
    }
  };

  return (
    <View style={styles.root}>
      {/* Top Header */}
      <View style={[styles.header, { paddingTop: Math.max(topInset, 16) }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#90caf9" />
          </TouchableOpacity>
          <View style={{ marginLeft: 10 }}>
            <Text style={styles.headerTitle}>Supervisor Personnel</Text>
            <Text style={styles.headerSubtitle}>{supervisors.length} active supervisors</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => setCreateModalVisible(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="person-add" size={14} color="#001529" style={{ marginRight: 4 }} />
          <Text style={styles.createBtnText}>ADD SUPERVISOR</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchBarWrap}>
        <Ionicons name="search" size={16} color="#78909c" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, ID, terminal, phone..."
          placeholderTextColor="#546e7a"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* List */}
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
            <View key={s.id || s.employeeId} style={styles.supCard}>
              <View style={styles.cardTop}>
                <View>
                  <Text style={styles.supName}>{s.fullName}</Text>
                  <Text style={styles.supId}>{s.employeeId} • {s.mobileNumber}</Text>
                </View>

                <View style={styles.terminalBadge}>
                  <Text style={styles.terminalBadgeText}>{s.assignedTerminal || 'PORT GENERAL'}</Text>
                </View>
              </View>

              <View style={styles.cardBottom}>
                <View
                  style={[
                    styles.statusPill,
                    s.status === 'ACTIVE' ? styles.statusPillActive : styles.statusPillSuspended,
                  ]}
                >
                  <Text style={styles.statusPillText}>{s.status || 'ACTIVE'}</Text>
                </View>

                <TouchableOpacity
                  style={styles.toggleBtn}
                  onPress={() => handleToggleStatus(s)}
                >
                  <Text style={styles.toggleBtnText}>
                    {s.status === 'ACTIVE' ? 'SUSPEND' : 'ACTIVATE'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

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
              <Text style={styles.inputLabel}>Assigned Terminal</Text>
              <View style={styles.terminalChoices}>
                {['CICT', 'CWIT', 'ECT', 'JCT', 'UCT', 'SAGT'].map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[
                      styles.choicePill,
                      terminalCode === t && styles.choicePillActive,
                    ]}
                    onPress={() => setTerminalCode(t)}
                  >
                    <Text
                      style={[
                        styles.choicePillText,
                        terminalCode === t && styles.choicePillTextActive,
                      ]}
                    >
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
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
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00e5ff',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  createBtnText: {
    color: '#001529',
    fontSize: 11,
    fontWeight: '800',
  },
  searchBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0c1b30',
    borderRadius: 8,
    margin: 14,
    paddingHorizontal: 10,
    height: 40,
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingTop: 6,
  },
  supCard: {
    backgroundColor: '#0c1b30',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  supName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  supId: {
    fontSize: 12,
    color: '#78909c',
    marginTop: 2,
  },
  terminalBadge: {
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.3)',
  },
  terminalBadgeText: {
    color: '#00e5ff',
    fontSize: 11,
    fontWeight: '800',
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusPillActive: {
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
  },
  statusPillSuspended: {
    backgroundColor: 'rgba(254, 179, 0, 0.15)',
  },
  statusPillText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  toggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  toggleBtnText: {
    color: '#90caf9',
    fontSize: 11,
    fontWeight: '700',
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
    borderColor: 'rgba(0, 229, 255, 0.25)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
  },
  inputGroup: {
    marginBottom: 10,
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
    height: 40,
    fontSize: 13,
  },
  terminalChoices: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  choicePill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#070f1e',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  choicePillActive: {
    backgroundColor: '#00e5ff',
    borderColor: '#00e5ff',
  },
  choicePillText: {
    color: '#90caf9',
    fontSize: 11,
    fontWeight: '700',
  },
  choicePillTextActive: {
    color: '#001529',
  },
  saveBtn: {
    backgroundColor: '#00e5ff',
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
  },
});
