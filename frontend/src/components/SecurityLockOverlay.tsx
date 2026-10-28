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
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import { biometricService, BiometricStatus } from '../services/biometricService';
import { credentialStore } from '../services/credentialStore';
import { securityAuditService } from '../services/securityAuditService';

export function SecurityLockOverlay() {
  const { user, isSessionLocked, unlockSession, logout } = useAuthStore();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [biometricStatus, setBiometricStatus] = useState<BiometricStatus | null>(null);

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

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out and terminate this session?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => logout(),
        },
      ]
    );
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
            disabled={loading}
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
            editable={!loading}
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
          disabled={loading || !password.trim()}
        >
          {loading ? (
            <ActivityIndicator color="#070c14" />
          ) : (
            <Text style={styles.unlockButtonText}>Resume Session</Text>
          )}
        </TouchableOpacity>

        {/* Sign Out Option */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut} disabled={loading}>
          <Ionicons name="log-out-outline" size={16} color="#94a3b8" />
          <Text style={styles.signOutText}>Switch Account or Sign Out</Text>
        </TouchableOpacity>
      </View>
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
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  signOutText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
});
