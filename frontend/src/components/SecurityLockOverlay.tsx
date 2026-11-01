/**
 * SMART ITT — Enterprise Security Lock Screen
 * Locks inactive sessions and requires Biometric or Password/PIN verification to resume.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { biometricService, BiometricStatus } from '../services/biometricService';
import { credentialStore } from '../services/credentialStore';
import { securityAuditService } from '../services/securityAuditService';

export function SecurityLockOverlay() {
  const router = useRouter();
  const { user, isSessionLocked, unlockSession, logout } = useAuthStore();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [biometricStatus, setBiometricStatus] = useState<BiometricStatus | null>(null);
  const [confirmAction, setConfirmAction] = useState<'SWITCH' | 'SIGNOUT' | null>(null);

  useEffect(() => {
    if (isSessionLocked) {
      biometricService.getStatus().then(setBiometricStatus);
      // Auto-trigger biometric prompt if available and enabled
      if (Platform.OS !== 'web') {
        const checkAndPrompt = async () => {
          const userIdentifier = user?.username || user?.driverCode || '';
          const isBioEnabled = await biometricService.isUserBiometricEnabled(userIdentifier);
          if (isBioEnabled) {
            handleBiometricUnlock();
          }
        };
        checkAndPrompt();
      }
    }
  }, [isSessionLocked]);

  if (!isSessionLocked || !user) {
    return null;
  }

  const roleColor =
    user.role === 'ADMIN' ? '#DC2626' : user.role === 'SUPERVISOR' ? '#D97706' : '#2563EB';

  const handleBiometricUnlock = async () => {
    setErrorMessage(null);
    setLoading(true);
    try {
      const result = await biometricService.authenticate(
        `Verify identity to unlock ${user.role.toLowerCase()} session`
      );
      if (result.success) {
        await securityAuditService.logEvent(
          'BIOMETRIC_AUTH_SUCCESS',
          user.username || user.name,
          'Session successfully unlocked via biometrics.',
          'INFO',
          user.role
        );
        unlockSession();
      } else if (result.error && result.error !== 'Authentication cancelled.') {
        setErrorMessage(result.error);
        await securityAuditService.logEvent(
          'BIOMETRIC_AUTH_FAIL',
          user.username || user.name,
          `Biometric unlock failure: ${result.error}`,
          'WARNING',
          user.role
        );
      }
    } catch (e: any) {
      setErrorMessage(e?.message || 'Biometric verification error.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUnlock = async () => {
    setErrorMessage(null);
    const cleanPass = password.trim();
    if (!cleanPass) {
      setErrorMessage('Please enter your password to unlock.');
      return;
    }

    setLoading(true);
    try {
      const userIdentifier = user.username || user.driverCode || '';
      const verifyResult = await credentialStore.verifyOffline(
        userIdentifier,
        cleanPass,
        user.role as any
      );

      if (verifyResult.valid) {
        setPassword('');
        unlockSession();
      } else {
        const msg = verifyResult.errorMessage || 'Incorrect password.';
        setErrorMessage(msg);
      }
    } catch (e: any) {
      setErrorMessage(e?.message || 'Unlock failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAction = async (actionType: 'SWITCH' | 'SIGNOUT') => {
    setActionLoading(true);
    try {
      if (actionType === 'SWITCH') {
        const target = '/(auth)/login';
        await logout(target);
        setConfirmAction(null);
        router.replace(target);
      } else {
        const target = user.role === 'ADMIN' ? '/(admin)/login' : '/(auth)/login';
        await logout(target);
        setConfirmAction(null);
        router.replace(target);
      }
    } catch (err) {
      console.error('Session lock action failed:', err);
      setConfirmAction(null);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {/* Shield Header */}
        <View style={styles.header}>
          <View style={[styles.shieldIcon, { borderColor: `${roleColor}55` }]}>
            <Ionicons name="lock-closed" size={32} color={roleColor} />
          </View>
          <Text style={styles.title}>Session Locked</Text>
          <Text style={styles.subtitle}>Protected by SMART ITT Maritime Security</Text>
        </View>

        {/* User Badge */}
        <View style={styles.userBadge}>
          <View style={[styles.rolePill, { backgroundColor: `${roleColor}20`, borderColor: `${roleColor}60` }]}>
            <Text style={[styles.roleText, { color: roleColor }]}>{user.role}</Text>
          </View>
          <Text style={styles.userName}>{user.name || user.fullName || 'Authorized Operator'}</Text>
          <Text style={styles.userCode}>
            {user.driverCode || user.employeeId || user.username}
          </Text>
        </View>

        {/* Error Message */}
        {errorMessage ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={16} color="#ef4444" />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        {/* Biometric Quick Button */}
        {biometricStatus?.hasHardware && biometricStatus?.isEnrolled && (
          <TouchableOpacity
            style={[styles.bioButton, { borderColor: `${roleColor}60` }]}
            onPress={handleBiometricUnlock}
            disabled={loading || actionLoading}
          >
            <Ionicons
              name={biometricStatus.biometricType === 'FACE_ID' ? 'scan' : 'finger-print'}
              size={24}
              color={roleColor}
            />
            <Text style={[styles.bioButtonText, { color: roleColor }]}>
              Unlock with {biometricStatus.label}
            </Text>
          </TouchableOpacity>
        )}

        {/* Password / PIN Section */}
        <View style={styles.inputWrapper}>
          <Ionicons name="key-outline" size={18} color="#64748b" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Enter password to unlock"
            placeholderTextColor="#475569"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={(t) => {
              setPassword(t);
              if (errorMessage) setErrorMessage(null);
            }}
            editable={!loading && !actionLoading}
          />
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles.eyeIcon}
          >
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={18}
              color="#64748b"
            />
          </TouchableOpacity>
        </View>

        {/* Unlock Button */}
        <TouchableOpacity
          style={[styles.unlockButton, { backgroundColor: roleColor }]}
          onPress={handlePasswordUnlock}
          disabled={loading || actionLoading || !password.trim()}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.unlockButtonText}>Resume Session</Text>
          )}
        </TouchableOpacity>

        {/* Explicit Session Actions: Switch Account & Sign Out */}
        <View style={styles.sessionActionsRow}>
          <TouchableOpacity
            style={styles.actionPillBtn}
            onPress={() => setConfirmAction('SWITCH')}
            disabled={loading || actionLoading}
            activeOpacity={0.75}
          >
            <Ionicons name="swap-horizontal" size={15} color="#2563EB" style={{ marginRight: 6 }} />
            <Text style={[styles.actionPillText, { color: '#2563EB' }]}>Switch Account</Text>
          </TouchableOpacity>

          <View style={styles.actionPillDivider} />

          <TouchableOpacity
            style={styles.actionPillBtn}
            onPress={() => setConfirmAction('SIGNOUT')}
            disabled={loading || actionLoading}
            activeOpacity={0.75}
          >
            <Ionicons name="log-out-outline" size={15} color="#DC2626" style={{ marginRight: 6 }} />
            <Text style={[styles.actionPillText, { color: '#DC2626' }]}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Cross-Platform Confirmation Modal (iOS / Android / Web) */}
      <Modal
        visible={confirmAction !== null}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!actionLoading) setConfirmAction(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View
              style={[
                styles.modalIconCircle,
                confirmAction === 'SWITCH'
                  ? styles.modalIconCircleSwitch
                  : styles.modalIconCircleSignout,
              ]}
            >
              <Ionicons
                name={confirmAction === 'SWITCH' ? 'swap-horizontal' : 'log-out-outline'}
                size={28}
                color={confirmAction === 'SWITCH' ? '#2563EB' : '#DC2626'}
              />
            </View>

            <Text style={styles.modalTitle}>
              {confirmAction === 'SWITCH' ? 'Switch Account?' : 'Sign Out of Session?'}
            </Text>

            <Text style={styles.modalMessage}>
              {confirmAction === 'SWITCH'
                ? `You will end the locked session for ${user.name || user.fullName || 'User'} (${user.role}) and return to the Operator Login screen to sign in with another driver, supervisor, or staff account.`
                : `You will sign out of your ${user.role} session as ${user.name || user.fullName || 'User'}. You will return to the ${user.role === 'ADMIN' ? 'Admin Login' : 'Login'} portal.`}
            </Text>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setConfirmAction(null)}
                disabled={actionLoading}
                activeOpacity={0.75}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalConfirmBtn,
                  confirmAction === 'SWITCH'
                    ? styles.modalConfirmBtnSwitch
                    : styles.modalConfirmBtnSignout,
                ]}
                onPress={() => confirmAction && handleConfirmAction(confirmAction)}
                disabled={actionLoading}
                activeOpacity={0.8}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons
                      name={confirmAction === 'SWITCH' ? 'arrow-forward' : 'log-out-outline'}
                      size={15}
                      color="#ffffff"
                      style={{ marginRight: 6 }}
                    />
                    <Text style={styles.modalConfirmBtnText}>
                      {confirmAction === 'SWITCH' ? 'Switch Account' : 'Sign Out'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999998,
    padding: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 28,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  shieldIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    color: '#1E293B',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  subtitle: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 4,
  },
  userBadge: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    width: '100%',
    marginBottom: 16,
  },
  rolePill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 6,
  },
  roleText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  userName: {
    color: '#1E293B',
    fontSize: 15,
    fontWeight: '700',
  },
  userCode: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#DC2626',
    borderRadius: 10,
    padding: 10,
    width: '100%',
    marginBottom: 14,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
    flex: 1,
  },
  bioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 14,
    width: '100%',
    marginBottom: 14,
  },
  bioButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    width: '100%',
    height: 48,
    marginBottom: 14,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: '#1E293B',
    fontSize: 14,
    paddingVertical: 0,
  },
  eyeIcon: {
    padding: 4,
  },
  unlockButton: {
    borderRadius: 10,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  unlockButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  sessionActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  actionPillBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
  },
  actionPillText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  actionPillDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  modalIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
  },
  modalIconCircleSwitch: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  modalIconCircleSignout: {
    backgroundColor: '#FEE2E2',
    borderColor: '#DC2626',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  modalMessage: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 24,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelBtnText: {
    color: '#64748B',
    fontWeight: '700',
    fontSize: 13,
  },
  modalConfirmBtn: {
    flex: 1.3,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalConfirmBtnSwitch: {
    backgroundColor: '#2563EB',
  },
  modalConfirmBtnSignout: {
    backgroundColor: '#DC2626',
  },
  modalConfirmBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.3,
  },
});
