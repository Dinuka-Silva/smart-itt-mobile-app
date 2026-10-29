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
    user.role === 'ADMIN' ? '#f43f5e' : user.role === 'SUPERVISOR' ? '#feb300' : '#00e5ff';

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
            <ActivityIndicator color="#070c14" />
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
            <Ionicons name="swap-horizontal" size={15} color="#00e5ff" style={{ marginRight: 6 }} />
            <Text style={[styles.actionPillText, { color: '#00e5ff' }]}>Switch Account</Text>
          </TouchableOpacity>

          <View style={styles.actionPillDivider} />

          <TouchableOpacity
            style={styles.actionPillBtn}
            onPress={() => setConfirmAction('SIGNOUT')}
            disabled={loading || actionLoading}
            activeOpacity={0.75}
          >
            <Ionicons name="log-out-outline" size={15} color="#f43f5e" style={{ marginRight: 6 }} />
            <Text style={[styles.actionPillText, { color: '#f43f5e' }]}>Sign Out</Text>
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
                color={confirmAction === 'SWITCH' ? '#00e5ff' : '#f43f5e'}
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
    backgroundColor: 'rgba(7, 12, 20, 0.98)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999998,
    padding: 20,
  },
  card: {
    backgroundColor: '#0c1626',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 24,
    padding: 28,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  shieldIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  subtitle: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 4,
  },
  userBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
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
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '700',
  },
  userCode: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 10,
    padding: 10,
    width: '100%',
    marginBottom: 14,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 12,
    flex: 1,
  },
  bioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1.5,
    borderRadius: 12,
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
    backgroundColor: '#070c14',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 12,
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
    color: '#ffffff',
    fontSize: 14,
    paddingVertical: 0,
  },
  eyeIcon: {
    padding: 4,
  },
  unlockButton: {
    borderRadius: 12,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  unlockButtonText: {
    color: '#070c14',
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
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  actionPillBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  actionPillText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  actionPillDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 17, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#0c192c',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 12,
  },
  modalIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1.5,
  },
  modalIconCircleSwitch: {
    backgroundColor: 'rgba(0, 229, 255, 0.12)',
    borderColor: 'rgba(0, 229, 255, 0.35)',
  },
  modalIconCircleSignout: {
    backgroundColor: 'rgba(244, 63, 94, 0.12)',
    borderColor: 'rgba(244, 63, 94, 0.35)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  modalMessage: {
    fontSize: 13,
    color: '#94a3b8',
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
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelBtnText: {
    color: '#b0bec5',
    fontWeight: '700',
    fontSize: 13,
  },
  modalConfirmBtn: {
    flex: 1.3,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  modalConfirmBtnSwitch: {
    backgroundColor: '#0891b2',
    shadowColor: '#0891b2',
  },
  modalConfirmBtnSignout: {
    backgroundColor: '#e11d48',
    shadowColor: '#e11d48',
  },
  modalConfirmBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.3,
  },
});
