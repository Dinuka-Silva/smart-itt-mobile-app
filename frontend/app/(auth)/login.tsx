import React, { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  ScrollView,
  Text,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore, User } from '../../src/store/authStore';
import { authService } from '../../src/services/authService';
import { credentialStore } from '../../src/services/credentialStore';
import { storage } from '../../src/services/storage';
import { biometricService, BiometricStatus } from '../../src/services/biometricService';
import { securityAuditService } from '../../src/services/securityAuditService';
import { ForceChangePasswordModal } from '../../src/components/ForceChangePasswordModal';
import { colors, radius, spacing } from '../../src/theme';
import { useResponsive } from '../../src/hooks/useResponsive';

export default function LoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ prefillUser?: string }>();
  const login = useAuthStore((s) => s.login);
  const { topInset, bottomInset, containerPaddingHorizontal } = useResponsive();

  const [username, setUsername] = useState(params.prefillUser || '');
  const [password, setPassword] = useState(
    ''
  );
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [focusedField, setFocusedField] = useState<'username' | 'password' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [biometricStatus, setBiometricStatus] = useState<BiometricStatus | null>(null);
  const [lockoutSeconds, setLockoutSeconds] = useState<number>(0);
  const [isBioEnabledForUser, setIsBioEnabledForUser] = useState(false);
  const [forceChangePasswordVisible, setForceChangePasswordVisible] = useState(false);
  const [pendingUserSession, setPendingUserSession] = useState<{ user: any; passwordEntered: string } | null>(null);

  // Check device biometric status
  useEffect(() => {
    biometricService.getStatus().then(setBiometricStatus);
  }, []);

  // Load remembered preferences
  useEffect(() => {
    const loadSavedPreferences = async () => {
      try {
        const savedRemember = await storage.getItem('itt_remember_me');
        if (savedRemember !== null) {
          setRememberMe(savedRemember !== 'false');
        }
        if (!params.prefillUser) {
          const rememberedUser = await storage.getItem('itt_remembered_username');
          if (rememberedUser) {
            setUsername(rememberedUser);
          }
        }
      } catch (e) {
        // ignore
      }
    };
    loadSavedPreferences();
  }, [params.prefillUser]);

  // Lockout countdown timer
  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const timer = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutSeconds]);

  // Check lockout status and biometric preference for current user
  useEffect(() => {
    const checkUserSecurityStatus = async () => {
      const clean = username.trim();
      if (!clean) return;
      const lockout = await credentialStore.getLockoutStatus(clean);
      if (lockout.isLocked) {
        setLockoutSeconds(lockout.remainingSeconds);
      }
      const bioEnabled = await biometricService.isUserBiometricEnabled(clean);
      setIsBioEnabledForUser(bioEnabled);
    };
    checkUserSecurityStatus();
  }, [username]);

  // ─── Hidden Admin Entry: 7 taps within 3.5s OR 2.5s Long Press opens Admin Login ───
  const tapTimesRef = React.useRef<number[]>([]);
  const [adminTapHint, setAdminTapHint] = useState<string | null>(null);

  const handleAdminSecretTap = () => {
    const now = Date.now();
    const windowMs = 3500;
    const recent = [...tapTimesRef.current.filter((t) => now - t <= windowMs), now];
    tapTimesRef.current = recent;
    const count = recent.length;

    if (count >= 7) {
      tapTimesRef.current = [];
      setAdminTapHint(null);
      router.push('/(admin)/login');
    } else if (count >= 3) {
      setAdminTapHint(`Admin unlock: ${7 - count} more tap${7 - count > 1 ? 's' : ''}`);
      setTimeout(() => setAdminTapHint(null), 2000);
    }
  };

  const handleAdminLongPress = () => {
    setAdminTapHint('Admin Portal Unlocked!');
    setTimeout(() => {
      setAdminTapHint(null);
      router.push('/(admin)/login');
    }, 400);
  };

  // Automatic Role Recognition based on Operator Code:
  // Starts with "DRV" (with number, e.g. DRV-00001, DRV00001, DRV100) -> DRIVER
  // Starts with "SUP" (with number, e.g. SUP-00001, SUP001, SUP100) or contains "supervisor" -> SUPERVISOR
  const normalizedUser = username.trim().toUpperCase();
  const isDriverIdentified = /^DRV([-\s]?\d+)?/i.test(normalizedUser) || normalizedUser.includes('DRIVER');
  const isSupervisorIdentified = /^SUP([-\s]?\d+)?/i.test(normalizedUser) || normalizedUser.includes('SUPERVISOR');

  // Check if username has updated their password (e.g. from forgot-password or profile)
  useEffect(() => {
    let active = true;
    const inspectUserPasswordStatus = async () => {
      const targetUser = (params.prefillUser || username).trim();
      const hasUpdated = await credentialStore.hasUpdatedPassword(targetUser);
      if (active && hasUpdated) {
        setPassword('');
      }
    };
    inspectUserPasswordStatus();
    return () => {
      active = false;
    };
  }, [params.prefillUser, username]);

  useEffect(() => {
    if (params.prefillUser) {
      setUsername(params.prefillUser);
    }
  }, [params.prefillUser]);

  const handleUsernameChange = (text: string) => {
    setUsername(text);
    if (errorMessage) setErrorMessage(null);
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    if (errorMessage) setErrorMessage(null);
  };

  const handleLogin = async () => {
    setErrorMessage(null);
    const cleanUser = username.trim();
    const cleanPass = password.trim();

    if (!cleanUser) {
      const msg = 'Please enter your username.';
      setErrorMessage(msg);
      Alert.alert('Missing Username', msg);
      return;
    }

    if (!cleanPass) {
      const msg = 'Please enter your password.';
      setErrorMessage(msg);
      Alert.alert('Missing Password', msg);
      return;
    }

    // Check brute-force lockout status
    const lockout = await credentialStore.getLockoutStatus(cleanUser);
    if (lockout.isLocked) {
      setLockoutSeconds(lockout.remainingSeconds);
      const msg = `Security Lockout: Account is temporarily locked. Please wait ${lockout.remainingSeconds} seconds before retrying.`;
      setErrorMessage(msg);
      Alert.alert('Security Lockout Active', msg);
      return;
    }

    // Proactively check if the user entered an old / archived password
    const isOldPassword = await credentialStore.isOldPassword(cleanUser, cleanPass);
    if (isOldPassword) {
      const oldPassMsg =
        'Incorrect password: You entered your old password. Please enter your newly updated password.';
      setErrorMessage(oldPassMsg);
      Alert.alert(
        'Old Password Entered',
        'The password you entered is your previous old password. You must enter your newly updated password to log in.'
      );
      return;
    }

    setLoading(true);
    try {
      const authResponse = await authService.login({ username: cleanUser, password: cleanPass });
      if (!authResponse || !authResponse.user) throw new Error('Invalid response from server');

      await credentialStore.recordSuccessfulAttempt(cleanUser);

      const isSupervisor = authResponse.user.role === 'SUPERVISOR' || isSupervisorIdentified;
      const isAdmin = authResponse.user.role === 'ADMIN' || cleanUser.toLowerCase().includes('admin');
      const resolvedRole: 'ADMIN' | 'SUPERVISOR' | 'DRIVER' = isAdmin ? 'ADMIN' : (isSupervisor ? 'SUPERVISOR' : 'DRIVER');

      const user = {
        id: authResponse.user.id,
        username: authResponse.user.username || cleanUser,
        role: resolvedRole as any,
        name: authResponse.user.name,
        token: authResponse.token,
        driverId: authResponse.user.driverId,
        driverCode: authResponse.user.driverCode || authResponse.driverCode,
        supervisorId: authResponse.user.supervisorId,
        supervisorPortPassExpiryDate: authResponse.user.supervisorPortPassExpiryDate || (isSupervisor ? '2026-11-18' : undefined),
        vehicleNumber: authResponse.user.vehicleNumber,
        employeeId: authResponse.user.employeeId || cleanUser,
        nic: authResponse.user.nic,
        mobileNumber: authResponse.user.mobileNumber,
        email: authResponse.user.email,
        address: authResponse.user.address,
        licenseNumber: authResponse.user.licenseNumber,
        licenseExpiryDate: authResponse.user.licenseExpiryDate,
        dateOfBirth: authResponse.user.dateOfBirth,
        emergencyContactName: authResponse.user.emergencyContactName,
        emergencyContactNumber: authResponse.user.emergencyContactNumber,
        status: authResponse.user.status,
      };

      if (user.status === 'SUSPENDED') {
        const suspendMsg = 'Account Suspended: Your driver account has been suspended by Administration. You cannot log in to the SMART ITT system. Please contact the Operations Supervisor or Administration.';
        setErrorMessage(suspendMsg);
        Alert.alert('Account Suspended', suspendMsg);
        await securityAuditService.logEvent(
          'LOGIN_FAILED',
          cleanUser,
          `Suspended driver login blocked: ${cleanUser}`,
          'WARNING',
          'DRIVER'
        );
        setLoading(false);
        return;
      }

      // Prompt mandatory password change if flagged on account
      if (authResponse.mustChangePassword || (authResponse.user as any)?.mustChangePassword) {
        setPendingUserSession({ user, passwordEntered: cleanPass });
        setForceChangePasswordVisible(true);
        setLoading(false);
        return;
      }

      // Cache salted hash, profile and token for offline login (valid 7 days for all roles)
      await credentialStore.cacheOnlineLogin(cleanUser, cleanPass, resolvedRole, user, authResponse.token);

      await login(user, rememberMe, false);
      if (user.role === 'ADMIN') router.replace('/(admin)/(tabs)');
      else if (user.role === 'SUPERVISOR') router.replace('/(supervisor)/(tabs)');
      else router.replace('/(driver)/(tabs)');
    } catch (err: any) {
      const serverStatus = err?.response?.status;
      const serverMsg = (err?.response?.data?.message || err?.response?.data?.error || err?.message || '').toString();
      const isSuspendedError = serverStatus === 403 || serverMsg.toUpperCase().includes('SUSPEND');

      // 1. If account is suspended on server, show clear suspension message and block entry
      if (isSuspendedError) {
        const suspendMsg = serverMsg && serverMsg.toUpperCase().includes('SUSPEND')
          ? serverMsg
          : 'Account Suspended: Your driver account has been suspended by Administration. You cannot access the SMART ITT system. Please contact the Operations Supervisor or Port Administration.';
        setErrorMessage(suspendMsg);
        Alert.alert('Account Suspended', suspendMsg);
        await securityAuditService.logEvent(
          'LOGIN_FAILED',
          cleanUser,
          `Suspended driver login blocked: ${cleanUser}`,
          'WARNING',
          'DRIVER'
        );
        setLoading(false);
        return;
      }

      // 2. If server explicitly returned 401, credentials failed
      if (err?.response && err.response.status === 401) {
        const lockoutCheck = await credentialStore.recordFailedAttempt(cleanUser);
        if (lockoutCheck.isLocked) {
          setLockoutSeconds(lockoutCheck.remainingSeconds);
        }

        const isOld = await credentialStore.isOldPassword(cleanUser, cleanPass);
        const msg = isOld
          ? 'Incorrect password: You entered your old password. Please enter your newly updated password.'
          : lockoutCheck.isLocked
          ? `Account locked due to multiple failed attempts. Try again in ${lockoutCheck.remainingSeconds}s.`
          : 'Invalid username or password.';
        setErrorMessage(msg);
        Alert.alert(isOld ? 'Old Password Entered' : 'Authentication Failed', msg);
        setLoading(false);
        return;
      }

      // 3. Network error or server offline: Attempt secure offline authentication
      const upperUser = cleanUser.toUpperCase();
      const isAdminFormat = upperUser.includes('ADMIN') || upperUser === 'ADMIN@SMARTITT.LK';
      const isSupervisorFormat = isSupervisorIdentified || upperUser === 'SUPERVISOR' || upperUser === 'SUPERVISOR1' || upperUser === 'SUPERVISOR@SMARTITT.LK';
      const role: 'ADMIN' | 'SUPERVISOR' | 'DRIVER' = isAdminFormat ? 'ADMIN' : (isSupervisorFormat ? 'SUPERVISOR' : 'DRIVER');

      // Check if driver is marked suspended in local credential store
      const credStatus = await credentialStore.getAccountStatus(cleanUser);
      if (credStatus.status === 'SUSPENDED') {
        const reason = credStatus.reason || 'Administrative suspension';
        const suspendMsg = `Account Suspended: Your driver account has been suspended by Administration.${reason ? `\n\nNotice: ${reason}` : ''}\n\nYou cannot access the SMART ITT system. Please contact the Operations Supervisor or Port Administration.`;
        setErrorMessage(suspendMsg);
        Alert.alert('Account Suspended', suspendMsg);
        await securityAuditService.logEvent(
          'LOGIN_FAILED',
          cleanUser,
          `Suspended driver login blocked: ${cleanUser}`,
          'WARNING',
          role
        );
        setLoading(false);
        return;
      }

      const isNetworkError = !err?.response || err?.code === 'ERR_NETWORK' || err?.message === 'Network Error' || Boolean(err?.isNetworkError);

      const verifyResult = await credentialStore.verifyOffline(cleanUser, cleanPass, role);

      if (!verifyResult.valid) {
        if (verifyResult.isSuspended) {
          const suspendMsg = verifyResult.errorMessage || 'Account Suspended: Your driver account has been suspended by Administration.';
          setErrorMessage(suspendMsg);
          Alert.alert('Account Suspended', suspendMsg);
          await securityAuditService.logEvent(
            'LOGIN_FAILED',
            cleanUser,
            `Suspended driver login blocked: ${cleanUser}`,
            'WARNING',
            role
          );
          setLoading(false);
          return;
        }

        if (verifyResult.errorMessage === 'Invalid username or password.') {
          const lockStatus = await credentialStore.recordFailedAttempt(cleanUser);
          if (lockStatus.isLocked) {
            setLockoutSeconds(lockStatus.remainingSeconds);
            const lockMsg = `Account locked due to multiple failed attempts. Try again in ${lockStatus.remainingSeconds}s.`;
            setErrorMessage(lockMsg);
            Alert.alert('Authentication Failed', lockMsg);
            setLoading(false);
            return;
          }
        }

        const errorText = verifyResult.errorMessage || (isNetworkError ? 'Unable to connect to the server. Please try again.' : 'Invalid username or password.');
        setErrorMessage(errorText);
        Alert.alert(
          isNetworkError && !verifyResult.errorMessage ? 'Connection Error' : 'Authentication Failed',
          errorText,
          isNetworkError && !verifyResult.errorMessage
            ? [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Retry', onPress: () => handleLogin() }
              ]
            : [{ text: 'OK' }]
        );
        setLoading(false);
        return;
      }

      // Offline credentials verified successfully!
      await credentialStore.recordSuccessfulAttempt(cleanUser);

      const offlineUser: User = {
        ...(verifyResult.user || {}),
        id: verifyResult.user?.id || cleanUser,
        username: verifyResult.user?.username || cleanUser,
        role: (verifyResult.user?.role || role) as any,
        name: verifyResult.user?.name || verifyResult.user?.fullName || cleanUser,
        token: verifyResult.user?.token || 'offline-sec-token',
        status: verifyResult.user?.status || 'ACTIVE',
      } as User;

      if (offlineUser.status === 'SUSPENDED') {
        const suspendMsg = 'Account Suspended: Your driver account has been suspended by Administration. You cannot access the SMART ITT system. Please contact the Operations Supervisor or Administration.';
        setErrorMessage(suspendMsg);
        Alert.alert('Account Suspended', suspendMsg);
        setLoading(false);
        return;
      }

      await login(offlineUser, rememberMe, true);
      if (offlineUser.role === 'ADMIN') router.replace('/(admin)/(tabs)');
      else if (offlineUser.role === 'SUPERVISOR') router.replace('/(supervisor)/(tabs)');
      else router.replace('/(driver)/(tabs)');
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    setErrorMessage(null);
    const cleanUser = username.trim();
    if (!cleanUser) {
      setErrorMessage('Please enter your Operator Code or Username first to use Biometrics.');
      Alert.alert('Username Required', 'Please enter your Operator Code or Username first to authenticate with Biometrics.');
      return;
    }

    // Check if account is suspended before authenticating with biometrics
    const credStatus = await credentialStore.getAccountStatus(cleanUser);
    if (credStatus.status === 'SUSPENDED') {
      const suspendMsg = 'Account Suspended: Your driver account has been suspended by Administration. Biometric access denied. Please contact Port Administration.';
      setErrorMessage(suspendMsg);
      Alert.alert('Account Suspended', suspendMsg);
      await securityAuditService.logEvent(
        'LOGIN_FAILED',
        cleanUser,
        `Suspended driver biometric login blocked: ${cleanUser}`,
        'WARNING',
        'DRIVER'
      );
      return;
    }

    const lockout = await credentialStore.getLockoutStatus(cleanUser);
    if (lockout.isLocked) {
      setLockoutSeconds(lockout.remainingSeconds);
      setErrorMessage(`Account temporarily locked. Retry in ${lockout.remainingSeconds}s.`);
      return;
    }

    setLoading(true);
    try {
      const authResult = await biometricService.authenticate(`Sign in to SMART ITT as ${cleanUser}`);
      if (authResult.success) {
        await securityAuditService.logEvent(
          'BIOMETRIC_AUTH_SUCCESS',
          cleanUser,
          'User logged in via biometric authentication.',
          'INFO'
        );

        const credRecord = await credentialStore.getRecord(cleanUser);
        if (!credRecord || !credRecord.lastOnlineLoginAt || !credRecord.cachedUserProfile) {
          const msg = 'Please connect to the internet and log in once to enable offline access.';
          setErrorMessage(msg);
          Alert.alert('Online Sign-In Required', msg);
          return;
        }

        const OFFLINE_LOGIN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
        const lastLoginTime = new Date(credRecord.lastOnlineLoginAt).getTime();
        if (isNaN(lastLoginTime) || Date.now() - lastLoginTime > OFFLINE_LOGIN_MAX_AGE_MS) {
          const msg = 'Your session has expired. Please connect to the internet and log in again.';
          setErrorMessage(msg);
          Alert.alert('Session Expired', msg);
          return;
        }

        const userProfile = credRecord.cachedUserProfile;
        const restoredUser: User = {
          ...userProfile,
          id: userProfile.id || credRecord.username,
          username: credRecord.username,
          role: (credRecord.onlineRole || 'DRIVER') as any,
          name: userProfile.name || userProfile.fullName || credRecord.username,
          token: credRecord.cachedToken || 'bio-verified-secure-token',
          status: userProfile.status || 'ACTIVE',
        } as User;

        if (restoredUser.status === 'SUSPENDED') {
          const suspendMsg = 'Account Suspended: Your driver account has been suspended by Administration. Biometric access denied. Please contact Port Administration.';
          setErrorMessage(suspendMsg);
          Alert.alert('Account Suspended', suspendMsg);
          return;
        }

        await credentialStore.recordSuccessfulAttempt(cleanUser);
        await login(restoredUser, rememberMe, false);

        if (restoredUser.role === 'ADMIN') router.replace('/(admin)/(tabs)');
        else if (restoredUser.role === 'SUPERVISOR') router.replace('/(supervisor)/(tabs)');
        else router.replace('/(driver)/(tabs)');
      } else if (authResult.error && authResult.error !== 'Authentication cancelled.') {
        setErrorMessage(authResult.error);
        await securityAuditService.logEvent(
          'BIOMETRIC_AUTH_FAIL',
          cleanUser,
          `Biometric login failed: ${authResult.error}`,
          'WARNING'
        );
      }
    } catch (e: any) {
      setErrorMessage(e?.message || 'Biometric authentication error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      {/* Whole Icon Fullscreen Background with dark overlay */}
      <View style={styles.backgroundWrap} pointerEvents="none">
        <Image
          source={require('../../assets/icon.png')}
          style={styles.backgroundImage}
          resizeMode="cover"
        />
        <View style={styles.backgroundOverlay} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: Math.max(topInset, 20),
            paddingBottom: Math.max(bottomInset + 20, 36),
            paddingHorizontal: containerPaddingHorizontal,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Brand Header — Hidden Admin trigger: 7 taps or 2s Long Press */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={handleAdminSecretTap}
          onLongPress={handleAdminLongPress}
          delayLongPress={2000}
          style={styles.hero}
        >
          {/* Inside App Brand Icon */}
          <View style={styles.brandIconCard}>
            <Image
              source={require('../../assets/icon.png')}
              style={styles.brandIconImg}
              resizeMode="cover"
            />
          </View>

          <Text
            style={styles.brandTitle}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
          >
            SCK ITT PROJECT
          </Text>
          <Text style={styles.brandSubtitle}>Inter-Terminal Transportation Management System</Text>

          {adminTapHint && (
            <View style={{
              backgroundColor: '#F0F5FA',
              borderColor: '#173B70',
              borderWidth: 1,
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 4,
              marginTop: 6,
            }}>
              <Text style={{ color: '#173B70', fontSize: 11, fontWeight: '600' }}>
                {adminTapHint}
              </Text>
            </View>
          )}
        </TouchableOpacity>


        {/* Form Card */}
        <View style={styles.sheet}>
          {/* Inline Error Message Banner */}
          {errorMessage ? (
            <View style={styles.errorBanner}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 6 }}>
                <Ionicons name="alert-circle" size={16} color="#173B70" />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
              {errorMessage.includes('Unable to connect') && (
                <TouchableOpacity
                  onPress={() => handleLogin()}
                  style={{ backgroundColor: '#173B70', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 }}
                  activeOpacity={0.7}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>Retry</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : null}

          {/* Quick Demo Operator Accounts */}
          <View style={styles.quickFillBar}>
            <Text style={styles.quickFillLabel}>Demo Accounts:</Text>
            <TouchableOpacity
              style={[styles.quickChip, isDriverIdentified && styles.quickChipActiveCyan]}
              onPress={() => {
                setUsername('DRV-00001');
                setPassword('driver');
                setErrorMessage(null);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="car-sport" size={12} color="#173B70" />
              <Text style={styles.quickChipTextCyan}>Driver (DRV-00001)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickChip, isSupervisorIdentified && styles.quickChipActiveAmber]}
              onPress={() => {
                setUsername('SUP001');
                setPassword('supervisor');
                setErrorMessage(null);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="shield-checkmark" size={12} color="#173B70" />
              <Text style={styles.quickChipTextAmber}>Supervisor (SUP001)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickChip}
              onPress={() => {
                setUsername('admin@smartitt.lk');
                setPassword('Admin@123');
                setErrorMessage(null);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="key" size={12} color="#173B70" />
              <Text style={styles.quickChipTextAmber}>Admin</Text>
            </TouchableOpacity>
          </View>

          {/* Username Field */}
          <View style={styles.labelRow}>
            <Text style={styles.inputLabel}>username:</Text>
            {isSupervisorIdentified ? (
              <View style={[styles.roleMiniTag, styles.roleMiniTagAmber]}>
                <View style={[styles.statusDot, { backgroundColor: '#173B70' }]} />
                <Text style={styles.roleMiniTagAmberText}>SUPERVISOR</Text>
              </View>
            ) : isDriverIdentified ? (
              <View style={[styles.roleMiniTag, styles.roleMiniTagCyan]}>
                <View style={[styles.statusDot, { backgroundColor: '#173B70' }]} />
                <Text style={styles.roleMiniTagCyanText}>DRIVER</Text>
              </View>
            ) : null}
          </View>
          <View style={[
            styles.inputWrap,
            focusedField === 'username' && styles.inputWrapFocused,
            isSupervisorIdentified && { borderColor: '#173B70' },
            isDriverIdentified && { borderColor: '#173B70' },
          ]}>
            <Ionicons
              name={isSupervisorIdentified ? 'shield-outline' : isDriverIdentified ? 'car-sport-outline' : 'person-outline'}
              size={18}
              color={isSupervisorIdentified ? '#173B70' : isDriverIdentified ? '#173B70' : '#64748B'}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Enter your username or ID (e.g. driver1, DRV-00001)"
              placeholderTextColor="#94A3B8"
              value={username}
              onChangeText={handleUsernameChange}
              onFocus={() => setFocusedField('username')}
              onBlur={() => setFocusedField(null)}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {username.length > 0 && (
              <TouchableOpacity
                style={styles.clearFieldBtn}
                onPress={() => setUsername('')}
                activeOpacity={0.7}
              >
                <Ionicons name="close-circle" size={16} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>

          {/* Password Field */}
          <View style={styles.labelRow}>
            <Text style={styles.inputLabel}>password:</Text>
          </View>
          <View style={[
            styles.inputWrap,
            focusedField === 'password' && styles.inputWrapFocused,
            isSupervisorIdentified && { borderColor: '#173B70' },
            isDriverIdentified && { borderColor: '#173B70' },
          ]}>
            <Ionicons
              name="lock-closed-outline"
              size={18}
              color={isSupervisorIdentified ? '#173B70' : isDriverIdentified ? '#173B70' : '#64748B'}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              placeholderTextColor="#94A3B8"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={handlePasswordChange}
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowPassword(!showPassword)}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={18}
                color={showPassword ? '#173B70' : '#64748B'}
              />
            </TouchableOpacity>
          </View>

          {/* Utility Row: Remember Me & Forgot Password */}
          <View style={styles.utilityRow}>
            <TouchableOpacity
              style={styles.rememberRow}
              onPress={() => setRememberMe(!rememberMe)}
              activeOpacity={0.8}
            >
              <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>
                {rememberMe && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
              </View>
              <Text style={styles.rememberText}>Remember me</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.forgotBtn}
              onPress={() =>
                router.push({
                  pathname: '/(auth)/forgot-password',
                  params: { prefillUser: username.trim() },
                })
              }
              activeOpacity={0.7}
            >
              <Ionicons
                name="help-circle-outline"
                size={13}
                color="#173B70"
              />
              <Text
                style={styles.forgotBtnText}
              >
                FORGOT PASSWORD?
              </Text>
            </TouchableOpacity>
          </View>

          {/* Security Lockout Banner */}
          {lockoutSeconds > 0 && (
            <View style={styles.lockoutBox}>
              <Ionicons name="lock-closed" size={18} color="#DC2626" />
              <View style={{ flex: 1 }}>
                <Text style={styles.lockoutTitle}>SECURITY LOCKOUT ACTIVE</Text>
                <Text style={styles.lockoutText}>
                  Device authentication rate-limited. Retry enabled in{' '}
                  <Text style={{ fontWeight: '800', color: '#DC2626' }}>{lockoutSeconds}s</Text>.
                </Text>
              </View>
            </View>
          )}

          {/* Primary LOG IN Button */}
          <TouchableOpacity
            style={[
              styles.loginBtn,
              (loading || lockoutSeconds > 0) && styles.loginBtnDisabled,
            ]}
            onPress={handleLogin}
            disabled={loading || lockoutSeconds > 0}
            activeOpacity={0.88}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons
                  name={isSupervisorIdentified ? 'shield-checkmark' : 'log-in-outline'}
                  size={19}
                  color="#FFFFFF"
                />
                <Text style={styles.loginBtnText}>
                  {isSupervisorIdentified
                    ? 'LOG IN AS SUPERVISOR'
                    : isDriverIdentified
                    ? 'LOG IN AS DRIVER'
                    : 'LOG IN'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Biometric Quick Sign In Button */}
          {biometricStatus?.hasHardware && biometricStatus?.isEnrolled && (
            <TouchableOpacity
              style={[
                styles.biometricBtn,
                (loading || lockoutSeconds > 0) && styles.loginBtnDisabled,
              ]}
              onPress={handleBiometricLogin}
              disabled={loading || lockoutSeconds > 0}
              activeOpacity={0.85}
            >
              <Ionicons
                name={biometricStatus.biometricType === 'FACE_ID' ? 'scan' : 'finger-print'}
                size={19}
                color="#173B70"
              />
              <Text style={styles.biometricBtnText}>
                Sign In with {biometricStatus.label}
              </Text>
            </TouchableOpacity>
          )}

          {/* Create new Account text link */}
          <View style={styles.createAccountRow}>
            <Text style={styles.createAccountPrompt}>Don't have an account? </Text>
            <TouchableOpacity
              onPress={() => router.push('/(auth)/register')}
              activeOpacity={0.7}
            >
              <Text style={styles.createAccountLink}>Create new Account</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.footerWrap}>
          <Text style={styles.footer}>
            SCK Logistics (Pvt) Ltd · Port Logistics
          </Text>
        </View>
      </ScrollView>

      {forceChangePasswordVisible && pendingUserSession && (
        <ForceChangePasswordModal
          visible={forceChangePasswordVisible}
          username={pendingUserSession.user.username || username}
          initialCurrentPassword={pendingUserSession.passwordEntered}
          onSuccess={async (newPassword) => {
            const { user } = pendingUserSession;
            setForceChangePasswordVisible(false);
            setPendingUserSession(null);
            await credentialStore.cacheOnlineLogin(user.username, newPassword, user.role);
            await login(user);
            if (user.role === 'ADMIN') router.replace('/(admin)/(tabs)');
            else if (user.role === 'SUPERVISOR') router.replace('/(supervisor)/(tabs)');
            else router.replace('/(driver)/(tabs)');
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  backgroundWrap: {
    display: 'none',
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
  },
  backgroundOverlay: {
    display: 'none',
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 32,
    justifyContent: 'center',
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
    zIndex: 1,
  },
  hero: {
    paddingTop: 16,
    paddingBottom: 16,
    alignItems: 'center',
    gap: 6,
  },
  brandIconCard: {
    width: 76,
    height: 76,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D0DEEB',
    marginBottom: 6,
    overflow: 'hidden',
  },
  brandIconImg: {
    width: '100%',
    height: '100%',
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#173B70',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  brandSubtitle: {
    fontSize: 13,
    fontWeight: '400',
    color: '#3A567F',
    textAlign: 'center',
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginTop: 4,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#173B70',
  },
  onlineText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#173B70',
  },

  recognizedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
    gap: 12,
  },
  recognizedBannerAmber: {
    borderColor: '#FDE68A',
    backgroundColor: '#FEF3C7',
  },
  recognizedBannerCyan: {
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
  },
  recognizedBannerNeutral: {
    borderColor: '#242a34',
    backgroundColor: 'rgba(22, 28, 37, 0.65)',
  },
  roleBadgeCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prefixPill: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 3,
  },
  prefixPillText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  recognizedTitle: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  recognizedCode: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 2,
  },
  recognizedHint: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 3,
  },
  recognizedHintNeutral: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 3,
  },

  sheet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#D0DEEB',
    gap: 12,
  },
  authTabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 3,
    borderWidth: 1,
    borderColor: '#D0DEEB',
    marginBottom: 4,
  },
  authTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
  },
  authTabActive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#173B70',
  },
  authTabTextActive: {
    fontSize: 12,
    fontWeight: '600',
    color: '#173B70',
    letterSpacing: 0.2,
  },
  authTabTextInactive: {
    fontSize: 12,
    fontWeight: '500',
    color: '#3A567F',
    letterSpacing: 0.2,
  },
  quickFillBar: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    paddingVertical: 4,
    marginBottom: 10,
  },
  quickFillLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#3A567F',
    marginRight: 2,
  },
  quickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D0DEEB',
  },
  quickChipActiveCyan: {
    borderColor: '#173B70',
    backgroundColor: '#F0F5FA',
  },
  quickChipActiveAmber: {
    borderColor: '#173B70',
    backgroundColor: '#F0F5FA',
  },
  quickChipTextCyan: {
    fontSize: 11,
    fontWeight: '600',
    color: '#173B70',
  },
  quickChipTextAmber: {
    fontSize: 11,
    fontWeight: '600',
    color: '#173B70',
  },
  quickChipReset: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D0DEEB',
  },
  quickChipResetText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#3A567F',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#3A567F',
  },
  roleMiniTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  roleMiniTagCyan: {
    backgroundColor: '#F0F5FA',
  },
  roleMiniTagAmber: {
    backgroundColor: '#F0F5FA',
  },
  roleMiniTagCyanText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#173B70',
  },
  roleMiniTagAmberText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#173B70',
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D0DEEB',
    paddingHorizontal: 12,
    height: 48,
  },
  inputWrapFocused: {
    borderColor: '#173B70',
  },
  clearFieldBtn: {
    padding: 6,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#173B70',
    height: 48,
  },
  eyeBtn: {
    padding: 8,
  },
  utilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    marginBottom: 4,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 4,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#D0DEEB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: '#173B70',
    borderColor: '#173B70',
  },
  rememberText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#3A567F',
  },
  forgotBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  forgotBtnText: {
    color: '#173B70',
    fontSize: 12,
    fontWeight: '600',
  },
  loginBtn: {
    flexDirection: 'row',
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    backgroundColor: '#173B70',
  },
  loginBtnCyan: {
    backgroundColor: '#173B70',
  },
  loginBtnAmber: {
    backgroundColor: '#173B70',
  },
  loginBtnDisabled: {
    opacity: 0.5,
  },
  loginBtnText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
    color: '#FFFFFF',
  },
  loginBtnTextCyan: {
    color: '#FFFFFF',
  },
  loginBtnTextAmber: {
    color: '#FFFFFF',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0F5FA',
    borderWidth: 1,
    borderColor: '#D0DEEB',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 2,
    marginBottom: 4,
  },
  errorText: {
    color: '#173B70',
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  createAccountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    paddingVertical: 6,
  },
  createAccountPrompt: {
    fontSize: 13,
    color: '#3A567F',
    fontWeight: '400',
  },
  createAccountLink: {
    fontSize: 13,
    color: '#173B70',
    fontWeight: '600',
  },
  footerWrap: {
    alignItems: 'center',
    marginTop: 22,
    gap: 5,
  },
  footerLogoContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    elevation: 1,
  },
  footerLogo: {
    width: 44,
    height: 44,
    borderRadius: 12,
  },
  footer: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  footerSub: {
    fontSize: 9,
    color: '#94A3B8',
  },
  lockoutBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  lockoutTitle: {
    color: '#DC2626',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  lockoutText: {
    color: '#DC2626',
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  biometricBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: '#F0F5FA',
    borderColor: '#D0DEEB',
    marginTop: 8,
  },
  biometricBtnCyan: {
    borderColor: '#D0DEEB',
  },
  biometricBtnAmber: {
    borderColor: '#D0DEEB',
  },
  biometricBtnText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
    color: '#173B70',
  },
  securityBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  securityBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#173B70',
    letterSpacing: 0.5,
  },
});
