import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../../src/store/authStore';
import { authService } from '../../../src/services/authService';
import { PasswordStrengthIndicator } from '../../../src/components/PasswordStrengthIndicator';
import { securityValidator } from '../../../src/utils/securityValidator';
import { biometricService } from '../../../src/services/biometricService';
import { useResponsive } from '../../../src/hooks/useResponsive';
import { Colors, Layout } from '../../../src/constants/theme';

const theme = Colors.light;

export default function SupervisorProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const isBiometricEnabled = useAuthStore((s) => s.isBiometricEnabled);
  const setBiometricEnabled = useAuthStore((s) => s.setBiometricEnabled);
  const { topInset, bottomInset, contentMaxWidth, containerPaddingHorizontal } = useResponsive();

  // Change Password Modal State
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Biometrics
  const handleToggleBiometrics = async () => {
    if (!isBiometricEnabled) {
      const status = await biometricService.getStatus();
      if (!status.hasHardware || !status.isEnrolled) {
        Alert.alert('Biometrics Unavailable', 'Biometric authentication is not supported or not enrolled on this device.');
        return;
      }
      const verified = await biometricService.authenticate('Authenticate to enable biometric login for SMART ITT');
      if (verified) {
        setBiometricEnabled(true);
        Alert.alert('Biometrics Enabled', 'You can now sign in with your fingerprint or face recognition.');
      }
    } else {
      setBiometricEnabled(false);
      Alert.alert('Biometrics Disabled', 'Biometric quick login has been turned off.');
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword) {
      Alert.alert('Validation Error', 'Please enter your current password.');
      return;
    }
    const val = securityValidator.evaluatePasswordStrength(newPassword);
    if (val.score < 2 || newPassword.length < 8) {
      const msg = Array.isArray(val.feedback) ? val.feedback.join('\n') : (val.feedback || 'Password must be at least 8 characters with a mix of letters and numbers.');
      Alert.alert('Weak Password', msg);
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Validation Error', 'New passwords do not match.');
      return;
    }

    setChangingPassword(true);
    try {
      await authService.changePassword({
        username: user?.username || '',
        currentPassword,
        newPassword,
        confirmPassword,
      });
      setPasswordModalVisible(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Password Changed', 'Your password has been successfully updated.');
    } catch (err: any) {
      Alert.alert('Change Failed', err?.response?.data?.message || err?.message || 'Could not change password.');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to log out of your supervisor session?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const supervisorName = user?.fullName || user?.name || 'Operations Supervisor';
  const supervisorCode = (user as any)?.employeeId || (user as any)?.supervisorId || user?.username || 'SUP001';
  const supervisorMobile = (user as any)?.mobile || (user as any)?.phoneNumber || '+94 77 123 4567';
  const supervisorEmail = user?.email || 'operations@scklogistics.com';
  const assignedTerminal = (user as any)?.terminal || 'ECT / CICT';

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(topInset + 10, 24),
            paddingBottom: Math.max(bottomInset + 20, 36),
            paddingHorizontal: containerPaddingHorizontal,
            maxWidth: contentMaxWidth,
            alignSelf: 'center',
            width: '100%',
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Profile Summary */}
        <View style={styles.profileCard}>
          <View style={styles.avatarWrap}>
            <Text style={styles.avatarText}>{supervisorName.charAt(0)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.supervisorName}>{supervisorName}</Text>
              <View style={styles.activePill}>
                <Text style={styles.activePillText}>ACTIVE</Text>
              </View>
            </View>
            <Text style={styles.supervisorRole}>Operations Supervisor · Port of Colombo</Text>
            <Text style={styles.supervisorId}>ID: {supervisorCode}</Text>
          </View>
        </View>

        {/* Operational Information */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>OPERATIONAL ASSIGNMENT</Text>
          <View style={styles.infoRow}>
            <View style={styles.infoIconWrap}>
              <Ionicons name="business-outline" size={16} color={theme.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>Terminal Assignment</Text>
              <Text style={styles.infoValue}>{assignedTerminal}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <View style={styles.infoIconWrap}>
              <Ionicons name="call-outline" size={16} color={theme.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>Mobile Number</Text>
              <Text style={styles.infoValue}>{supervisorMobile}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <View style={styles.infoIconWrap}>
              <Ionicons name="mail-outline" size={16} color={theme.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>Official Email</Text>
              <Text style={styles.infoValue}>{supervisorEmail}</Text>
            </View>
          </View>
        </View>

        {/* Security & Access */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>SECURITY & CREDENTIALS</Text>
          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => setPasswordModalVisible(true)}
            activeOpacity={0.7}
          >
            <View style={styles.infoIconWrap}>
              <Ionicons name="key-outline" size={16} color={theme.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionLabel}>Change Password</Text>
              <Text style={styles.actionSub}>Update your account login password</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.textHint} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.actionRow}
            onPress={handleToggleBiometrics}
            activeOpacity={0.7}
          >
            <View style={styles.infoIconWrap}>
              <Ionicons name="finger-print-outline" size={16} color={theme.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionLabel}>Biometric Sign-In</Text>
              <Text style={styles.actionSub}>
                {isBiometricEnabled ? 'Biometrics enabled for quick login' : 'Touch ID / Face ID disabled'}
              </Text>
            </View>
            <View
              style={[
                styles.togglePill,
                isBiometricEnabled ? styles.togglePillOn : styles.togglePillOff,
              ]}
            >
              <Text
                style={[
                  styles.togglePillText,
                  isBiometricEnabled ? styles.togglePillTextOn : styles.togglePillTextOff,
                ]}
              >
                {isBiometricEnabled ? 'ON' : 'OFF'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Logout Action */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={18} color={theme.danger} />
          <Text style={styles.logoutBtnText}>Sign Out of Supervisor Console</Text>
        </TouchableOpacity>

        <Text style={styles.footerVersion}>
          SMART ITT v2.0 · SCK Logistics Colombo Terminal Management
        </Text>
      </ScrollView>

      {/* Change Password Modal */}
      <Modal visible={passwordModalVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Password</Text>
              <TouchableOpacity onPress={() => setPasswordModalVisible(false)}>
                <Ionicons name="close" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={{ gap: 12, marginTop: 12 }}>
              <View>
                <Text style={styles.inputLabel}>CURRENT PASSWORD</Text>
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter current password"
                    placeholderTextColor={theme.textHint}
                    secureTextEntry={!showCurrentPassword}
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                  />
                  <TouchableOpacity
                    onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                    style={styles.eyeBtn}
                  >
                    <Ionicons
                      name={showCurrentPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={18}
                      color={theme.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View>
                <Text style={styles.inputLabel}>NEW PASSWORD</Text>
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter new strong password"
                    placeholderTextColor={theme.textHint}
                    secureTextEntry={!showNewPassword}
                    value={newPassword}
                    onChangeText={setNewPassword}
                  />
                  <TouchableOpacity
                    onPress={() => setShowNewPassword(!showNewPassword)}
                    style={styles.eyeBtn}
                  >
                    <Ionicons
                      name={showNewPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={18}
                      color={theme.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
                <PasswordStrengthIndicator password={newPassword} />
              </View>

              <View>
                <Text style={styles.inputLabel}>CONFIRM NEW PASSWORD</Text>
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.input}
                    placeholder="Re-enter new password"
                    placeholderTextColor={theme.textHint}
                    secureTextEntry={!showNewPassword}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                  />
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnCancel]}
                  onPress={() => setPasswordModalVisible(false)}
                >
                  <Text style={styles.modalBtnCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnSubmit]}
                  onPress={handleChangePassword}
                  disabled={changingPassword}
                >
                  <Text style={styles.modalBtnSubmitText}>
                    {changingPassword ? 'Updating...' : 'Update Password'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.background,
  },
  scrollContent: {
    gap: 14,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: Layout.radius,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 16,
  },
  avatarWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.accent,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.accent,
  },
  supervisorName: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.text,
  },
  activePill: {
    backgroundColor: theme.statusApprovedBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  activePillText: {
    fontSize: 9,
    fontWeight: '700',
    color: theme.statusApprovedText,
  },
  supervisorRole: {
    fontSize: 12,
    color: theme.textSecondary,
    marginTop: 2,
  },
  supervisorId: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: theme.textHint,
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Layout.radius,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
  },
  infoIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: theme.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoLabel: {
    fontSize: 11,
    color: theme.textSecondary,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.text,
    marginTop: 1,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.text,
  },
  actionSub: {
    fontSize: 11,
    color: theme.textSecondary,
    marginTop: 1,
  },
  divider: {
    height: 1,
    backgroundColor: theme.border,
    marginVertical: 8,
  },
  togglePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  togglePillOn: {
    backgroundColor: theme.statusApprovedBg,
  },
  togglePillOff: {
    backgroundColor: theme.border,
  },
  togglePillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  togglePillTextOn: {
    color: theme.statusApprovedText,
  },
  togglePillTextOff: {
    color: theme.textSecondary,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.dangerContainer,
    borderRadius: Layout.radius,
    borderWidth: 1,
    borderColor: theme.danger,
    paddingVertical: 14,
    marginTop: 6,
  },
  logoutBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.danger,
  },
  footerVersion: {
    fontSize: 11,
    color: theme.textHint,
    textAlign: 'center',
    marginTop: 6,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Layout.radius,
    padding: 20,
    width: '100%',
    maxWidth: 420,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.text,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.textSecondary,
    marginBottom: 4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: Layout.radius,
    backgroundColor: theme.background,
  },
  input: {
    flex: 1,
    height: 42,
    paddingHorizontal: 12,
    fontSize: 13,
    color: theme.text,
  },
  eyeBtn: {
    paddingHorizontal: 10,
  },
  modalBtn: {
    flex: 1,
    height: 42,
    borderRadius: Layout.radius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnCancel: {
    backgroundColor: theme.background,
    borderWidth: 1,
    borderColor: theme.border,
  },
  modalBtnCancelText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.textSecondary,
  },
  modalBtnSubmit: {
    backgroundColor: theme.accent,
  },
  modalBtnSubmitText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
