import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authService } from '../../src/services/authService';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ prefillUser?: string }>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  // State
  const [username, setUsername] = useState(params.prefillUser || '');
  const [idNumber, setIdNumber] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [verifiedName, setVerifiedName] = useState('');
  const [verifiedRole, setVerifiedRole] = useState<'DRIVER' | 'SUPERVISOR'>('DRIVER');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successModalVisible, setSuccessModalVisible] = useState(false);

  // Determine role style dynamically from username
  const isSupervisor = username.trim().toUpperCase().startsWith('SUP');
  const roleColor = isSupervisor ? '#feb300' : '#00e5ff';

  const containerPadding = width > 768 ? 40 : 18;
  const contentMaxWidth = width > 768 ? 540 : '100%';

  const handleVerifyIdentity = async () => {
    setErrorMessage(null);
    if (!username.trim()) {
      setErrorMessage('Please enter your Username or Operator Code (e.g. DRV-00001 or SUP-00001).');
      return;
    }
    if (!idNumber.trim()) {
      setErrorMessage('Please enter the National Identity Card (NIC) or Registration ID used in sign up.');
      return;
    }

    setLoading(true);
    try {
      const response = await authService.verifyIdentityForPasswordReset({
        username: username.trim(),
        idNumber: idNumber.trim(),
      });

      setIsVerified(true);
      setVerifiedName(response.fullName || (isSupervisor ? 'Port Supervisor' : 'SCK Fleet Driver'));
      setVerifiedRole(response.role === 'SUPERVISOR' || isSupervisor ? 'SUPERVISOR' : 'DRIVER');
    } catch (err: any) {
      setErrorMessage(err.message || 'Identity verification failed. Please check your username and registration ID.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setErrorMessage(null);

    if (!newPassword) {
      setErrorMessage('Please enter a new password.');
      return;
    }
    if (newPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('New passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);
    try {
      await authService.resetPassword({
        username: username.trim(),
        idNumber: idNumber.trim(),
        newPassword: newPassword.trim(),
        confirmPassword: confirmPassword.trim(),
      });

      setSuccessModalVisible(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAutofill = (role: 'DRIVER' | 'SUPERVISOR') => {
    if (role === 'DRIVER') {
      setUsername('DRV-00001');
      setIdNumber('199411223344');
    } else {
      setUsername('SUP-00001');
      setIdNumber('199012345678');
    }
    setIsVerified(false);
    setNewPassword('Password@123');
    setConfirmPassword('Password@123');
    setErrorMessage(null);
  };

  const navigateBackToLogin = () => {
    setSuccessModalVisible(false);
    router.replace({
      pathname: '/(auth)/login',
      params: { prefillUser: username.trim() },
    });
  };

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: Math.max(insets.top, 20),
            paddingBottom: Math.max(insets.bottom + 24, 40),
            paddingHorizontal: containerPadding,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: '100%', maxWidth: contentMaxWidth, alignSelf: 'center' }}>
          {/* Top Bar with Back Button */}
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.replace('/(auth)/login')}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={18} color="#00e5ff" />
            <Text style={styles.backBtnText}>BACK TO LOGIN TERMINAL</Text>
          </TouchableOpacity>

          {/* Hero Header */}
          <View style={styles.hero}>
            <View style={[styles.heroIconBadge, { borderColor: roleColor }]}>
              <Ionicons name="key" size={26} color={roleColor} />
            </View>
            <Text style={styles.heroTitle}>RESET PORT ACCESS PASSWORD</Text>
            <Text style={styles.heroSubtitle}>
              SCK ITT IDENTITY VERIFICATION & CREDENTIAL RECOVERY
            </Text>
          </View>

          {/* Quick Demo Autofill Bar */}
          <View style={styles.quickBar}>
            <Text style={styles.quickBarLabel}>QUICK TEST AUTOFILL:</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                style={[styles.quickChip, { borderColor: 'rgba(0, 229, 255, 0.4)' }]}
                onPress={() => handleQuickAutofill('DRIVER')}
              >
                <Ionicons name="car-sport" size={12} color="#00e5ff" />
                <Text style={[styles.quickChipText, { color: '#00e5ff' }]}>DRIVER (DRV-00001)</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quickChip, { borderColor: 'rgba(254, 179, 0, 0.4)' }]}
                onPress={() => handleQuickAutofill('SUPERVISOR')}
              >
                <Ionicons name="shield-checkmark" size={12} color="#feb300" />
                <Text style={[styles.quickChipText, { color: '#feb300' }]}>SUPERVISOR (SUP-00001)</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Error Banner */}
          {errorMessage && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color="#ff5252" />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {/* Form Card */}
          <View style={styles.card}>
            {/* ─── STEP 1: IDENTITY CHECK ─── */}
            <View style={styles.sectionHeader}>
              <Ionicons
                name={isVerified ? 'checkmark-circle' : 'finger-print'}
                size={18}
                color={isVerified ? '#22ef7e' : roleColor}
              />
              <Text style={[styles.sectionHeaderText, isVerified && { color: '#22ef7e' }]}>
                1. USERNAME & REGISTRATION ID VERIFICATION
              </Text>
            </View>

            {/* Field 1: Username / Code */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>OPERATOR CODE / USERNAME (DRV or SUP) *</Text>
              <View style={[styles.inputWrap, isVerified && styles.inputWrapLocked]}>
                <Ionicons
                  name={isSupervisor ? 'shield-outline' : 'car-sport-outline'}
                  size={16}
                  color={roleColor}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, isVerified && { color: '#849396' }]}
                  placeholder="e.g. DRV-00001 or SUP-00001"
                  placeholderTextColor="#62757f"
                  value={username}
                  onChangeText={(val) => {
                    setUsername(val);
                    if (isVerified) setIsVerified(false);
                  }}
                  autoCapitalize="characters"
                  editable={!isVerified}
                />
              </View>
            </View>

            {/* Field 2: Registration ID / NIC */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>REGISTRATION ID / NATIONAL ID (NIC) NO *</Text>
              <View style={[styles.inputWrap, isVerified && styles.inputWrapLocked]}>
                <Ionicons name="card-outline" size={16} color="#849396" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, isVerified && { color: '#849396' }]}
                  placeholder="e.g. 199411223344 or 851234567V"
                  placeholderTextColor="#62757f"
                  value={idNumber}
                  onChangeText={(val) => {
                    setIdNumber(val);
                    if (isVerified) setIsVerified(false);
                  }}
                  autoCapitalize="characters"
                  editable={!isVerified}
                />
              </View>
              <Text style={styles.inputHelp}>
                Enter the National Identity Card (NIC) or Registration ID you entered when registering your account.
              </Text>
            </View>

            {/* Verify Button (if not verified yet) */}
            {!isVerified && (
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  isSupervisor ? styles.actionBtnAmber : styles.actionBtnCyan,
                  loading && styles.btnDisabled,
                ]}
                onPress={handleVerifyIdentity}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color={isSupervisor ? '#432c00' : '#00363d'} />
                ) : (
                  <>
                    <Ionicons
                      name="shield-checkmark-outline"
                      size={18}
                      color={isSupervisor ? '#432c00' : '#00363d'}
                    />
                    <Text
                      style={[
                        styles.actionBtnText,
                        isSupervisor ? styles.actionBtnTextAmber : styles.actionBtnTextCyan,
                      ]}
                    >
                      VERIFY REGISTRATION IDENTITY
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {/* ─── STEP 2: PASSWORD RESET (Unlocked when verified) ─── */}
            {isVerified && (
              <View style={styles.verifiedSection}>
                <View style={styles.verifiedBanner}>
                  <Ionicons name="checkmark-circle" size={20} color="#22ef7e" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.verifiedTitle}>IDENTITY VERIFIED SUCCESSFULLY</Text>
                    <Text style={styles.verifiedSub}>
                      {verifiedName} · {verifiedRole === 'SUPERVISOR' ? 'Port Supervisor' : 'SCK Driver Operator'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setIsVerified(false)}
                    style={styles.changeIdBtn}
                  >
                    <Text style={styles.changeIdBtnText}>CHANGE</Text>
                  </TouchableOpacity>
                </View>

                <View style={[styles.sectionHeader, { marginTop: 18 }]}>
                  <Ionicons name="lock-closed" size={18} color="#00e5ff" />
                  <Text style={styles.sectionHeaderText}>2. ENTER NEW COCKPIT PASSWORD</Text>
                </View>

                {/* New Password */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>NEW PASSWORD *</Text>
                  <View style={styles.inputWrap}>
                    <Ionicons name="key-outline" size={16} color="#00e5ff" style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      placeholder="Minimum 6 characters"
                      placeholderTextColor="#62757f"
                      secureTextEntry={!showPassword}
                      value={newPassword}
                      onChangeText={setNewPassword}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      style={{ padding: 6 }}
                    >
                      <Ionicons
                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={18}
                        color="#849396"
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Confirm Password */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>CONFIRM NEW PASSWORD *</Text>
                  <View style={styles.inputWrap}>
                    <Ionicons name="key-outline" size={16} color="#00e5ff" style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      placeholder="Re-type new password"
                      placeholderTextColor="#62757f"
                      secureTextEntry={!showPassword}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                    />
                  </View>
                </View>

                {/* Password Requirement Chips */}
                <View style={styles.rulesRow}>
                  <View style={[styles.ruleChip, newPassword.length >= 6 && styles.ruleChipPassed]}>
                    <Ionicons
                      name={newPassword.length >= 6 ? 'checkmark' : 'ellipse-outline'}
                      size={11}
                      color={newPassword.length >= 6 ? '#22ef7e' : '#849396'}
                    />
                    <Text
                      style={[
                        styles.ruleChipText,
                        newPassword.length >= 6 && styles.ruleChipTextPassed,
                      ]}
                    >
                      At least 6 chars
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.ruleChip,
                      newPassword.length > 0 &&
                        newPassword === confirmPassword &&
                        styles.ruleChipPassed,
                    ]}
                  >
                    <Ionicons
                      name={
                        newPassword.length > 0 && newPassword === confirmPassword
                          ? 'checkmark'
                          : 'ellipse-outline'
                      }
                      size={11}
                      color={
                        newPassword.length > 0 && newPassword === confirmPassword
                          ? '#22ef7e'
                          : '#849396'
                      }
                    />
                    <Text
                      style={[
                        styles.ruleChipText,
                        newPassword.length > 0 &&
                          newPassword === confirmPassword &&
                          styles.ruleChipTextPassed,
                      ]}
                    >
                      Passwords match
                    </Text>
                  </View>
                </View>

                {/* Submit Reset Button */}
                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    styles.actionBtnSuccess,
                    loading && styles.btnDisabled,
                  ]}
                  onPress={handleResetPassword}
                  disabled={loading}
                  activeOpacity={0.88}
                >
                  {loading ? (
                    <ActivityIndicator color="#032b18" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-done-circle" size={20} color="#032b18" />
                      <Text style={styles.actionBtnTextSuccess}>
                        CONFIRM & RESET PASSWORD
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Success Modal */}
      <Modal
        visible={successModalVisible}
        transparent
        animationType="fade"
        onRequestClose={navigateBackToLogin}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconCircle}>
              <Ionicons name="shield-checkmark" size={36} color="#22ef7e" />
            </View>
            <Text style={styles.modalTitle}>PASSWORD RESET SUCCESSFUL</Text>
            <Text style={styles.modalDesc}>
              Your credentials for operator <Text style={{ color: '#00e5ff', fontWeight: '800' }}>{username}</Text> have been updated.
              You must now sign in using your newly updated password. Your previous old password is no longer valid.
            </Text>

            <TouchableOpacity
              style={styles.modalBtn}
              onPress={navigateBackToLogin}
              activeOpacity={0.88}
            >
              <Ionicons name="log-in-outline" size={18} color="#00363d" />
              <Text style={styles.modalBtnText}>RETURN TO LOGIN TERMINAL</Text>
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
    backgroundColor: '#080e17',
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  backBtnText: {
    color: '#00e5ff',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 20,
  },
  heroIconBadge: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(15, 23, 34, 0.9)',
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 1.2,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#849396',
    letterSpacing: 0.8,
    marginTop: 4,
    textAlign: 'center',
  },
  quickBar: {
    backgroundColor: 'rgba(15, 23, 34, 0.7)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 10,
    marginBottom: 16,
    alignItems: 'center',
    gap: 6,
  },
  quickBarLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#849396',
    letterSpacing: 0.8,
  },
  quickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  quickChipText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 82, 82, 0.12)',
    borderWidth: 1,
    borderColor: '#ff5252',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    color: '#ff8a80',
    fontSize: 12,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#0f1722',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  sectionHeaderText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.8,
  },
  fieldGroup: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#849396',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0a0f16',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 12,
    height: 46,
  },
  inputWrapLocked: {
    backgroundColor: 'rgba(15, 23, 34, 0.5)',
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  inputHelp: {
    fontSize: 9,
    color: '#849396',
    marginTop: 4,
    lineHeight: 13,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 8,
    marginTop: 6,
  },
  actionBtnCyan: {
    backgroundColor: '#00e5ff',
  },
  actionBtnAmber: {
    backgroundColor: '#feb300',
  },
  actionBtnSuccess: {
    backgroundColor: '#22ef7e',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  actionBtnTextCyan: {
    color: '#00363d',
  },
  actionBtnTextAmber: {
    color: '#432c00',
  },
  actionBtnTextSuccess: {
    color: '#032b18',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  verifiedSection: {
    marginTop: 10,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  verifiedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(34, 239, 126, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(34, 239, 126, 0.3)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  verifiedTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#22ef7e',
    letterSpacing: 0.8,
  },
  verifiedSub: {
    fontSize: 10,
    fontWeight: '600',
    color: '#b9f6ca',
    marginTop: 2,
  },
  changeIdBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  changeIdBtnText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#849396',
    letterSpacing: 0.5,
  },
  rulesRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  ruleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0a0f16',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  ruleChipPassed: {
    borderColor: 'rgba(34, 239, 126, 0.4)',
    backgroundColor: 'rgba(34, 239, 126, 0.08)',
  },
  ruleChipText: {
    fontSize: 10,
    color: '#849396',
    fontWeight: '600',
  },
  ruleChipTextPassed: {
    color: '#22ef7e',
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#0f1722',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(34, 239, 126, 0.3)',
    padding: 24,
    alignItems: 'center',
  },
  modalIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(34, 239, 126, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 8,
  },
  modalDesc: {
    fontSize: 12,
    color: '#849396',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  modalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    height: 48,
    borderRadius: 8,
    backgroundColor: '#00e5ff',
  },
  modalBtnText: {
    color: '#00363d',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
