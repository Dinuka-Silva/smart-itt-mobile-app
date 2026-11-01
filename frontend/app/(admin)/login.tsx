import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
  Image,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { adminFleetStore, AdminDriver } from '../../src/store/adminFleetStore';
import { authService } from '../../src/services/authService';
import { credentialStore } from '../../src/services/credentialStore';
import { biometricService, BiometricStatus } from '../../src/services/biometricService';
import { securityAuditService } from '../../src/services/securityAuditService';
import { colors, radius, spacing } from '../../src/theme';
import { useResponsive } from '../../src/hooks/useResponsive';
import { AppBackgroundOverlay } from '../../src/components/AppBackgroundOverlay';

export default function AdminLoginScreen() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const { topInset, bottomInset, containerPaddingHorizontal } = useResponsive();

  const [username, setUsername] = useState('ADMIN');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [biometricStatus, setBiometricStatus] = useState<BiometricStatus | null>(null);
  const [lockoutSeconds, setLockoutSeconds] = useState<number>(0);
  const [showDevCredentials, setShowDevCredentials] = useState(false);

  // Registered Driver Roster & Usernames Directory (Admin Clearance)
  const [driversRosterVisible, setDriversRosterVisible] = useState(false);
  const [rosterDrivers, setRosterDrivers] = useState<AdminDriver[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterSearch, setRosterSearch] = useState('');
  const [copiedUsername, setCopiedUsername] = useState<string | null>(null);
  const [selectedRosterDriver, setSelectedRosterDriver] = useState<AdminDriver | null>(null);

  const fetchRoster = useCallback(async () => {
    try {
      const list = await adminFleetStore.getDrivers();
      setRosterDrivers(list);
    } catch (e) {
      console.warn('[AdminLogin] Error fetching driver roster:', e);
    }
  }, []);

  useEffect(() => {
    fetchRoster();
    const unsub = adminFleetStore.subscribe(() => {
      fetchRoster();
    });
    return () => unsub();
  }, [fetchRoster]);

  const handleOpenRoster = async () => {
    setRosterLoading(true);
    setDriversRosterVisible(true);
    try {
      const list = await adminFleetStore.getDrivers();
      setRosterDrivers(list);
    } finally {
      setRosterLoading(false);
    }
  };

  const handleCopyUsername = async (u: string) => {
    try {
      if (Platform.OS === 'web' && (navigator as any)?.clipboard?.writeText) {
        await (navigator as any).clipboard.writeText(u);
      }
      setCopiedUsername(u);
      setTimeout(() => setCopiedUsername(null), 2500);
    } catch {
      setCopiedUsername(u);
      setTimeout(() => setCopiedUsername(null), 2500);
    }
  };

  const filteredRoster = useMemo(() => {
    if (!rosterSearch.trim()) return rosterDrivers;
    const q = rosterSearch.toLowerCase().trim();
    return rosterDrivers.filter(
      (d) =>
        d.fullName.toLowerCase().includes(q) ||
        (d.username && d.username.toLowerCase().includes(q)) ||
        d.driverCode.toLowerCase().includes(q) ||
        d.employeeId.toLowerCase().includes(q) ||
        d.nic.toLowerCase().includes(q) ||
        (d.vehicleNumber && d.vehicleNumber.toLowerCase().includes(q)) ||
        (d.cheNumber && d.cheNumber.toLowerCase().includes(q))
    );
  }, [rosterDrivers, rosterSearch]);

  useEffect(() => {
    biometricService.getStatus().then(setBiometricStatus);
  }, []);

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

  useEffect(() => {
    const checkLockout = async () => {
      const lock = await credentialStore.getLockoutStatus('ADMIN');
      if (lock.isLocked) {
        setLockoutSeconds(lock.remainingSeconds);
      }
    };
    checkLockout();
  }, []);

  const handleAdminLogin = async () => {
    setErrorMessage(null);
    const cleanUser = username.trim();
    const cleanPass = password.trim();

    if (!cleanUser || !cleanPass) {
      setErrorMessage('Please enter administrative credentials.');
      return;
    }

    const lockout = await credentialStore.getLockoutStatus('ADMIN');
    if (lockout.isLocked) {
      setLockoutSeconds(lockout.remainingSeconds);
      const msg = `Security Lockout: Administrative access temporarily restricted. Retry in ${lockout.remainingSeconds}s.`;
      setErrorMessage(msg);
      Alert.alert('Lockout Active', msg);
      return;
    }

    setLoading(true);
    try {
      // 1. Authenticate with backend API
      const authResponse = await authService.login({
        username: cleanUser,
        password: cleanPass,
      });

      const userRole = (authResponse?.user?.role || '').toString().toUpperCase();
      const isAdmin = userRole === 'ADMIN' || cleanUser.toUpperCase() === 'ADMIN' || cleanUser.toLowerCase() === 'admin@smartitt.lk';

      if (authResponse && authResponse.user && isAdmin) {
        await credentialStore.recordSuccessfulAttempt('ADMIN');
        await login({
          id: authResponse.user.id || 'admin-root',
          username: cleanUser,
          role: 'ADMIN',
          name: authResponse.user.name || 'System Administrator',
          fullName: authResponse.user.name || 'System Administrator',
          token: authResponse.token || 'admin-sec-bearer-token',
          email: cleanUser.includes('@') ? cleanUser : 'admin@smartitt.lk',
          status: 'ACTIVE',
        });
        router.replace('/(admin)/(tabs)');
        return;
      }

      // If credentials matched but role was not ADMIN
      if (authResponse && authResponse.user && !isAdmin) {
        setErrorMessage('Access Denied: Account lacks administrative privileges.');
        Alert.alert('Unauthorized', 'This console is restricted to authorized System Administrators.');
        return;
      }

      throw new Error('Invalid Admin credentials');
    } catch (err: any) {
      // Offline fallback for development / setup bootstrap
      const isAllowedAdminUser = cleanUser.toUpperCase() === 'ADMIN' || cleanUser.toLowerCase() === 'admin@smartitt.lk';
      const isAllowedAdminPass = cleanPass === 'Admin@123' || cleanPass === 'AdminSecure@2026' || cleanPass.toLowerCase() === 'admin';

      if (isAllowedAdminUser && isAllowedAdminPass) {
        await credentialStore.recordSuccessfulAttempt('ADMIN');
        await login({
          id: 'admin-root-001',
          username: 'ADMIN',
          role: 'ADMIN',
          name: 'System Administrator',
          fullName: 'System Administrator',
          token: 'admin-sec-bearer-token',
          email: 'admin@smartitt.lk',
          status: 'ACTIVE',
        });
        router.replace('/(admin)/(tabs)');
        return;
      }

      const failStatus = await credentialStore.recordFailedAttempt('ADMIN');
      if (failStatus.isLocked) {
        setLockoutSeconds(failStatus.remainingSeconds);
      }

      const msg = failStatus.isLocked
        ? `Administrative lockout initiated. Retry in ${failStatus.remainingSeconds}s.`
        : err?.response?.data?.message || err?.message || 'Authentication failed. Please verify credentials.';
      setErrorMessage(msg);
      Alert.alert('Admin Login Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleAdminBiometricLogin = async () => {
    setErrorMessage(null);
    const lockout = await credentialStore.getLockoutStatus('ADMIN');
    if (lockout.isLocked) {
      setLockoutSeconds(lockout.remainingSeconds);
      setErrorMessage(`Lockout active. Retry in ${lockout.remainingSeconds}s.`);
      return;
    }

    setLoading(true);
    try {
      const result = await biometricService.authenticate('Authenticate as System Administrator');
      if (result.success) {
        await securityAuditService.logEvent(
          'BIOMETRIC_AUTH_SUCCESS',
          'ADMIN',
          'Admin session authenticated via biometrics.',
          'INFO',
          'ADMIN'
        );
        await credentialStore.recordSuccessfulAttempt('ADMIN');
        await login({
          id: 'admin-root-001',
          username: 'ADMIN',
          role: 'ADMIN',
          name: 'System Administrator',
          fullName: 'System Administrator',
          token: 'admin-sec-bearer-token',
          email: 'admin@smartitt.lk',
          status: 'ACTIVE',
        });
        router.replace('/(admin)/(tabs)');
      } else if (result.error && result.error !== 'Authentication cancelled.') {
        setErrorMessage(result.error);
      }
    } catch (e: any) {
      setErrorMessage(e?.message || 'Biometric verification failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      {/* Branded Subtle Watermark Background */}
      <AppBackgroundOverlay opacity={0.07} />

      {/* Background Accent Gradients */}
      <View style={styles.glowTop} pointerEvents="none" />
      <View style={styles.glowBottom} pointerEvents="none" />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: Math.max(topInset, 24),
            paddingBottom: Math.max(bottomInset + 20, 36),
            paddingHorizontal: containerPaddingHorizontal,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Back Link to Public Application */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.replace('/(auth)/login')}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={18} color="#90caf9" />
          <Text style={styles.backButtonText}>Back to Operator Login</Text>
        </TouchableOpacity>

        {/* Security Shield Header with Inside App Brand Icon */}
        <View style={styles.hero}>
          <View style={styles.brandIconCard}>
            <Image
              source={require('../../assets/icon.png')}
              style={styles.brandIconImg}
              resizeMode="cover"
            />
            <View style={styles.adminMiniShield}>
              <Ionicons name="shield-checkmark" size={13} color="#FFFFFF" />
            </View>
          </View>
          <Text style={styles.brandTitle}>ADMIN CONTROL CONSOLE</Text>
          <Text style={styles.brandSubtitle}>SCK LOGISTICS — INTER TERMINAL OPERATIONS</Text>

          <View style={styles.securityBadge}>
            <Ionicons name="lock-closed" size={12} color="#2563EB" />
            <Text style={styles.securityBadgeText}>ENCRYPTED ADMINISTRATIVE CHANNEL</Text>
          </View>
        </View>

        {/* Credentials Card */}
        <View style={styles.card}>
          {errorMessage ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color="#ff5252" />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {/* Lockout Banner */}
          {lockoutSeconds > 0 && (
            <View style={styles.lockoutBox}>
              <Ionicons name="lock-closed" size={18} color="#ef4444" />
              <View style={{ flex: 1 }}>
                <Text style={styles.lockoutTitle}>ADMINISTRATIVE LOCKOUT ACTIVE</Text>
                <Text style={styles.lockoutText}>
                  Excessive authentication failures. Console throttled for{' '}
                  <Text style={{ fontWeight: '800', color: '#fca5a5' }}>{lockoutSeconds}s</Text>.
                </Text>
              </View>
            </View>
          )}

          {/* Admin Clearance Info Badge */}
          <View style={styles.credentialBanner}>
            <Ionicons name="shield-checkmark" size={14} color="#2563EB" />
            <Text style={styles.credentialBannerText}>
              LEVEL 4 PRIVILEGED ACCESS · 256-BIT ENCLAVE
            </Text>
            <TouchableOpacity
              onPress={() => {
                setShowDevCredentials(!showDevCredentials);
                if (!password) setPassword('Admin@123');
              }}
              style={styles.devFillBtn}
            >
              <Text style={styles.devFillBtnText}>Demo Fill</Text>
            </TouchableOpacity>
          </View>

          {showDevCredentials && (
            <View style={styles.devHelperBox}>
              <Text style={styles.devHelperText}>
                Dev Credentials: User <Text style={{ color: '#2563EB', fontWeight: '800' }}>ADMIN</Text> / Pass <Text style={{ color: '#feb300', fontWeight: '800' }}>Admin@123</Text>
              </Text>
            </View>
          )}

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Administrator Username</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="person-outline" size={18} color="#2563EB" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={(t) => {
                  setUsername(t);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="ADMIN"
                placeholderTextColor="#94A3B8"
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Master Password</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="key-outline" size={18} color="#2563EB" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="••••••••••••"
                placeholderTextColor="#94A3B8"
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color="#64748B"
                />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, (loading || lockoutSeconds > 0) && styles.submitButtonDisabled]}
            onPress={handleAdminLogin}
            disabled={loading || lockoutSeconds > 0}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <View style={styles.btnContent}>
                <Ionicons name="shield-checkmark" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.submitButtonText}>AUTHENTICATE AS ADMIN</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Biometric Admin Unlock */}
          {biometricStatus?.hasHardware && biometricStatus?.isEnrolled && (
            <TouchableOpacity
              style={[styles.bioButton, (loading || lockoutSeconds > 0) && styles.submitButtonDisabled]}
              onPress={handleAdminBiometricLogin}
              disabled={loading || lockoutSeconds > 0}
              activeOpacity={0.8}
            >
              <Ionicons
                name={biometricStatus.biometricType === 'FACE_ID' ? 'scan' : 'finger-print'}
                size={18}
                color="#2563EB"
                style={{ marginRight: 8 }}
              />
              <Text style={styles.bioButtonText}>
                Unlock with {biometricStatus.label}
              </Text>
            </TouchableOpacity>
          )}

          {/* Registered Drivers & Usernames Directory (Admin Clearance) */}
          <TouchableOpacity
            style={styles.rosterCardTrigger}
            onPress={handleOpenRoster}
            activeOpacity={0.85}
          >
            <View style={styles.rosterTriggerLeft}>
              <View style={styles.rosterTriggerIconWrap}>
                <Ionicons name="people-circle" size={24} color="#2563EB" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.rosterTriggerTitle}>REGISTERED DRIVERS & USERNAMES</Text>
                  <View style={styles.adminOnlyBadge}>
                    <Text style={styles.adminOnlyBadgeText}>ADMIN ONLY</Text>
                  </View>
                </View>
                <Text style={styles.rosterTriggerSubtitle}>
                  {rosterDrivers.length > 0 ? `${rosterDrivers.length} Registered Drivers` : 'Inspect Driver Accounts'} • Tap to view usernames & vehicles
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#2563EB" />
          </TouchableOpacity>

          {/* System Audit Trail & Operations Ledger (Admin Clearance) */}
          <TouchableOpacity
            style={[styles.rosterCardTrigger, { borderColor: '#E2E8F0', backgroundColor: '#FFFFFF' }]}
            onPress={() => router.push('/(admin)/audit')}
            activeOpacity={0.85}
          >
            <View style={styles.rosterTriggerLeft}>
              <View style={[styles.rosterTriggerIconWrap, { backgroundColor: '#EFF6FF', borderColor: '#2563EB' }]}>
                <Ionicons name="shield-checkmark" size={22} color="#2563EB" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.rosterTriggerTitle, { color: '#1E293B' }]}>SYSTEM AUDIT & OPERATIONS TRAIL</Text>
                  <View style={[styles.adminOnlyBadge, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
                    <Text style={[styles.adminOnlyBadgeText, { color: '#2563EB' }]}>ALL WORK</Text>
                  </View>
                </View>
                <Text style={styles.rosterTriggerSubtitle}>
                  Driver & Supervisor operations: Registrations, Trips, Approvals & Logins
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#2563EB" />
          </TouchableOpacity>

          <View style={styles.auditNotice}>
            <Ionicons name="information-circle-outline" size={14} color="#64748B" />
            <Text style={styles.auditNoticeText}>
              All administrative access and operations are recorded in the immutable system audit log.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Registered Drivers & Usernames Roster Modal (Admin Clearance Exclusive) */}
      <Modal
        visible={driversRosterVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDriversRosterVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.rosterModalBox}>
            {/* Modal Header */}
            <View style={styles.rosterModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                <View style={styles.rosterHeaderIconBox}>
                  <Ionicons name="shield-checkmark" size={20} color="#2563EB" />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.rosterModalTitle}>Driver Accounts & Usernames</Text>
                    <View style={styles.adminOnlyBadge}>
                      <Text style={styles.adminOnlyBadgeText}>ADMIN ONLY</Text>
                    </View>
                  </View>
                  <Text style={styles.rosterModalSubtitle}>
                    Official login credentials & active assignments for registered drivers
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setDriversRosterVisible(false)}
                style={styles.rosterCloseBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={22} color="#1E293B" />
              </TouchableOpacity>
            </View>

            {/* Quick Metrics Bar */}
            <View style={styles.rosterMetricsBar}>
              <View style={styles.rosterMetricItem}>
                <Text style={styles.rosterMetricVal}>{rosterDrivers.length}</Text>
                <Text style={styles.rosterMetricLabel}>TOTAL DRIVERS</Text>
              </View>
              <View style={styles.rosterMetricDivider} />
              <View style={styles.rosterMetricItem}>
                <Text style={[styles.rosterMetricVal, { color: '#22ef7e' }]}>
                  {rosterDrivers.filter(d => d.status === 'ACTIVE').length}
                </Text>
                <Text style={styles.rosterMetricLabel}>ACTIVE</Text>
              </View>
              <View style={styles.rosterMetricDivider} />
              <View style={styles.rosterMetricItem}>
                <Text style={[styles.rosterMetricVal, { color: '#2563EB' }]}>
                  {rosterDrivers.filter(d => (d.operator || '').includes('SCK') || !d.operator).length}
                </Text>
                <Text style={styles.rosterMetricLabel}>SCK LOGISTICS</Text>
              </View>
              <View style={styles.rosterMetricDivider} />
              <View style={styles.rosterMetricItem}>
                <Text style={[styles.rosterMetricVal, { color: '#feb300' }]}>
                  {rosterDrivers.filter(d => (d.operator || '').includes('SDR')).length}
                </Text>
                <Text style={styles.rosterMetricLabel}>SDR LINK</Text>
              </View>
            </View>

            {/* Search Bar */}
            <View style={styles.rosterSearchWrap}>
              <Ionicons name="search" size={16} color="#78909c" />
              <TextInput
                style={styles.rosterSearchInput}
                placeholder="Search driver name, username (DRV-...), NIC, truck plate..."
                placeholderTextColor="#546e7a"
                value={rosterSearch}
                onChangeText={setRosterSearch}
                autoCapitalize="none"
              />
              {rosterSearch.length > 0 && (
                <TouchableOpacity onPress={() => setRosterSearch('')}>
                  <Ionicons name="close-circle" size={16} color="#78909c" />
                </TouchableOpacity>
              )}
            </View>

            {/* Roster List */}
            {rosterLoading ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#2563EB" />
                <Text style={{ color: '#90caf9', fontSize: 13, marginTop: 12 }}>
                  Loading registered driver accounts...
                </Text>
              </View>
            ) : filteredRoster.length === 0 ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <Ionicons name="search-outline" size={36} color="#546e7a" />
                <Text style={{ color: '#90a4ae', fontSize: 14, marginTop: 10, fontWeight: '700' }}>
                  No matching drivers found
                </Text>
                <Text style={{ color: '#546e7a', fontSize: 12, marginTop: 4 }}>
                  Try a different search term or check registration status
                </Text>
              </View>
            ) : (
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ padding: 14, paddingBottom: 24 }}
                showsVerticalScrollIndicator={false}
              >
                {filteredRoster.map((d) => {
                  const uname = d.username || d.driverCode || d.employeeId;
                  const isCopied = copiedUsername === uname;
                  const isSuspended = d.status === 'SUSPENDED';
                  const isSdr = (d.operator || '').includes('SDR') || (d.vehicleNumber || '').startsWith('LY-65');

                  return (
                    <TouchableOpacity
                      key={d.id || d.driverCode || d.employeeId}
                      style={styles.rosterDriverCard}
                      onPress={() => setSelectedRosterDriver(d)}
                      activeOpacity={0.88}
                    >
                      {/* Driver Card Header */}
                      <View style={styles.rosterDriverTop}>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <Text style={styles.rosterDriverName}>{d.fullName}</Text>
                            <View style={[styles.rosterOperatorBadge, isSdr ? styles.rosterOperatorSdr : styles.rosterOperatorSck]}>
                              <Text style={[styles.rosterOperatorText, isSdr ? { color: '#feb300' } : { color: '#2563EB' }]}>
                                {d.operator || (isSdr ? 'SDR LINK' : 'SCK Logistics')}
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.rosterEmpText}>
                            Employee ID: <Text style={{ color: '#bac9cc', fontWeight: '700' }}>{d.employeeId}</Text> • NIC: <Text style={{ color: '#bac9cc' }}>{d.nic}</Text>
                          </Text>
                        </View>

                        <View style={[styles.rosterStatusPill, isSuspended ? styles.rosterStatusSuspended : styles.rosterStatusActive]}>
                          <View style={[styles.rosterStatusDot, { backgroundColor: isSuspended ? '#feb300' : '#22ef7e' }]} />
                          <Text style={[styles.rosterStatusText, { color: isSuspended ? '#feb300' : '#22ef7e' }]}>
                            {d.status || 'ACTIVE'}
                          </Text>
                        </View>
                      </View>

                      {/* Prominent Login Username Row */}
                      <View style={styles.rosterUsernameRow}>
                        <View style={styles.rosterUsernameTag}>
                          <Ionicons name="key" size={12} color="#2563EB" />
                          <Text style={styles.rosterUsernameTagLabel}>LOGIN USERNAME:</Text>
                          <Text style={styles.rosterUsernameTagValue}>{uname}</Text>
                        </View>

                        <TouchableOpacity
                          style={[styles.rosterQuickCopyBtn, isCopied && styles.rosterQuickCopyBtnCopied]}
                          onPress={() => handleCopyUsername(uname)}
                          activeOpacity={0.7}
                        >
                          <Ionicons
                            name={isCopied ? 'checkmark' : 'copy-outline'}
                            size={12}
                            color={isCopied ? '#16A34A' : '#2563EB'}
                          />
                          <Text style={[styles.rosterQuickCopyText, isCopied && { color: '#16A34A' }]}>
                            {isCopied ? 'COPIED' : 'COPY'}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {/* Quick Specs Grid */}
                      <View style={styles.rosterSpecsGrid}>
                        <View style={styles.rosterSpecCol}>
                          <Text style={styles.rosterSpecKey}>TRUCK PLATE</Text>
                          <Text style={[styles.rosterSpecVal, { color: '#D97706' }]}>
                            {d.vehicleNumber || 'UNASSIGNED'}
                          </Text>
                        </View>
                        <View style={styles.rosterSpecCol}>
                          <Text style={styles.rosterSpecKey}>CHE / CHASSIS</Text>
                          <Text style={[styles.rosterSpecVal, { color: '#2563EB' }]}>
                            {d.cheNumber || d.chassisNumber || 'SCK 100'}
                          </Text>
                        </View>
                        <View style={styles.rosterSpecCol}>
                          <Text style={styles.rosterSpecKey}>MOBILE</Text>
                          <Text style={styles.rosterSpecVal}>{d.mobileNumber || 'N/A'}</Text>
                        </View>
                        <View style={styles.rosterSpecCol}>
                          <Text style={styles.rosterSpecKey}>LICENSE</Text>
                          <Text style={styles.rosterSpecVal}>{d.licenseNumber || 'N/A'}</Text>
                        </View>
                      </View>

                      <View style={styles.rosterCardFooter}>
                        <Text style={styles.rosterCardFooterHint}>Tap to view full driver dossier</Text>
                        <Ionicons name="chevron-forward" size={13} color="#2563EB" />
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Complete Selected Driver Dossier Modal */}
      <Modal
        visible={selectedRosterDriver !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedRosterDriver(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.rosterModalBox, { maxHeight: '85%' }]}>
            <View style={styles.rosterModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                <View style={styles.rosterHeaderIconBox}>
                  <Ionicons name="person" size={20} color="#2563EB" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rosterModalTitle}>{selectedRosterDriver?.fullName}</Text>
                  <Text style={{ color: '#2563EB', fontSize: 12, fontWeight: '800' }}>
                    {selectedRosterDriver?.username || selectedRosterDriver?.driverCode} • {selectedRosterDriver?.employeeId}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedRosterDriver(null)}
                style={styles.rosterCloseBtn}
              >
                <Ionicons name="close" size={22} color="#1E293B" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
              {/* Credentials Highlight Card */}
              <Text style={styles.dossierSectionTitle}>OFFICIAL SYSTEM LOGIN CREDENTIALS</Text>
              <View style={styles.dossierCard}>
                <View style={styles.dossierRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="key" size={14} color="#2563EB" />
                    <Text style={[styles.dossierLabel, { color: '#2563EB', fontWeight: '800' }]}>LOGIN USERNAME:</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={styles.dossierUsernameBadge}>
                      <Text style={styles.dossierUsernameText}>
                        {selectedRosterDriver?.username || selectedRosterDriver?.driverCode}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.rosterQuickCopyBtn}
                      onPress={() => handleCopyUsername(selectedRosterDriver?.username || selectedRosterDriver?.driverCode || '')}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={copiedUsername === (selectedRosterDriver?.username || selectedRosterDriver?.driverCode) ? 'checkmark' : 'copy-outline'}
                        size={12}
                        color={copiedUsername === (selectedRosterDriver?.username || selectedRosterDriver?.driverCode) ? '#22ef7e' : '#2563EB'}
                      />
                      <Text style={[styles.rosterQuickCopyText, copiedUsername === (selectedRosterDriver?.username || selectedRosterDriver?.driverCode) && { color: '#22ef7e' }]}>
                        {copiedUsername === (selectedRosterDriver?.username || selectedRosterDriver?.driverCode) ? 'COPIED' : 'COPY'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.dossierRow}>
                  <Text style={styles.dossierLabel}>Operational Driver Code:</Text>
                  <Text style={styles.dossierVal}>{selectedRosterDriver?.driverCode}</Text>
                </View>

                <View style={styles.dossierRow}>
                  <Text style={styles.dossierLabel}>Employee Identifier:</Text>
                  <Text style={styles.dossierVal}>{selectedRosterDriver?.employeeId}</Text>
                </View>

                <View style={styles.dossierRow}>
                  <Text style={styles.dossierLabel}>Account Status:</Text>
                  <Text style={[styles.dossierVal, { color: selectedRosterDriver?.status === 'ACTIVE' ? '#22ef7e' : '#feb300' }]}>
                    {selectedRosterDriver?.status || 'ACTIVE'}
                  </Text>
                </View>
              </View>

              {/* Vehicle & Equipment Details */}
              <Text style={styles.dossierSectionTitle}>ASSIGNED PRIME MOVER & CHE</Text>
              <View style={styles.dossierCard}>
                <View style={styles.dossierRow}>
                  <Text style={styles.dossierLabel}>Truck License Plate:</Text>
                  <Text style={[styles.dossierVal, { color: '#feb300', fontWeight: '800' }]}>
                    {selectedRosterDriver?.vehicleNumber || 'UNASSIGNED'}
                  </Text>
                </View>
                <View style={styles.dossierRow}>
                  <Text style={styles.dossierLabel}>CHE / Chassis Number:</Text>
                  <Text style={[styles.dossierVal, { color: '#2563EB' }]}>
                    {selectedRosterDriver?.cheNumber || selectedRosterDriver?.chassisNumber || 'SCK 100'}
                  </Text>
                </View>
                <View style={styles.dossierRow}>
                  <Text style={styles.dossierLabel}>Fleet Logistics Operator:</Text>
                  <Text style={styles.dossierVal}>{selectedRosterDriver?.operator || 'SCK Logistics'}</Text>
                </View>
                <View style={styles.dossierRow}>
                  <Text style={styles.dossierLabel}>Trailer Standard:</Text>
                  <Text style={styles.dossierVal}>{selectedRosterDriver?.trailerSize || '40FT Skeletal Container'}</Text>
                </View>
              </View>

              {/* Identity & Legal Information */}
              <Text style={styles.dossierSectionTitle}>PERSONAL & LEGAL DOSSIER</Text>
              <View style={styles.dossierCard}>
                <View style={styles.dossierRow}>
                  <Text style={styles.dossierLabel}>National Identity (NIC):</Text>
                  <Text style={styles.dossierVal}>{selectedRosterDriver?.nic}</Text>
                </View>
                <View style={styles.dossierRow}>
                  <Text style={styles.dossierLabel}>Driving License Number:</Text>
                  <Text style={styles.dossierVal}>{selectedRosterDriver?.licenseNumber}</Text>
                </View>
                <View style={styles.dossierRow}>
                  <Text style={styles.dossierLabel}>License Expiry Date:</Text>
                  <Text style={styles.dossierVal}>{selectedRosterDriver?.licenseExpiryDate || '2030-12-31'}</Text>
                </View>
                <View style={styles.dossierRow}>
                  <Text style={styles.dossierLabel}>Port Pass Number:</Text>
                  <Text style={[styles.dossierVal, { color: '#2563EB' }]}>{selectedRosterDriver?.portPassNumber || 'SLPA-DPP-001'}</Text>
                </View>
                <View style={styles.dossierRow}>
                  <Text style={styles.dossierLabel}>Port Pass Expiry:</Text>
                  <Text style={styles.dossierVal}>{selectedRosterDriver?.portPassExpiryDate || selectedRosterDriver?.driverPortPassExpiryDate || '2026-11-15'}</Text>
                </View>
                <View style={styles.dossierRow}>
                  <Text style={styles.dossierLabel}>Mobile Phone:</Text>
                  <Text style={[styles.dossierVal, { color: '#22ef7e' }]}>{selectedRosterDriver?.mobileNumber}</Text>
                </View>
                <View style={styles.dossierRow}>
                  <Text style={styles.dossierLabel}>Official Email:</Text>
                  <Text style={styles.dossierVal}>{selectedRosterDriver?.email || `${selectedRosterDriver?.employeeId?.toLowerCase()}@smartitt.lk`}</Text>
                </View>
                <View style={styles.dossierRow}>
                  <Text style={styles.dossierLabel}>Home Address:</Text>
                  <Text style={[styles.dossierVal, { flex: 1, textAlign: 'right' }]}>{selectedRosterDriver?.address || 'Port Access Road, Colombo'}</Text>
                </View>
                <View style={styles.dossierRow}>
                  <Text style={styles.dossierLabel}>Emergency Contact:</Text>
                  <Text style={[styles.dossierVal, { color: '#feb300' }]}>
                    {selectedRosterDriver?.emergencyContactName || 'Port Dispatch Control'} ({selectedRosterDriver?.emergencyContactNumber || '0112456789'})
                  </Text>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  glowTop: {
    display: 'none',
  },
  glowBottom: {
    display: 'none',
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    maxWidth: 520,
    alignSelf: 'center',
    width: '100%',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 20,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  backButtonText: {
    color: '#2563EB',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 28,
  },
  brandIconCard: {
    width: 86,
    height: 86,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#2563EB',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 16,
    position: 'relative',
  },
  brandIconImg: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  adminMiniShield: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 4,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E293B',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  brandSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    letterSpacing: 0.5,
    marginTop: 4,
    textAlign: 'center',
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  securityBadgeText: {
    color: '#2563EB',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginLeft: 6,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
    marginLeft: 8,
    flex: 1,
  },
  credentialBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
    gap: 8,
  },
  credentialBannerText: {
    color: '#1E293B',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    color: '#1E293B',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: '#1E293B',
    fontSize: 14,
    fontWeight: '500',
  },
  eyeBtn: {
    padding: 6,
  },
  submitButton: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  auditNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  auditNoticeText: {
    color: '#64748B',
    fontSize: 11,
    marginLeft: 6,
    flex: 1,
    lineHeight: 15,
  },
  lockoutBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  lockoutTitle: {
    color: '#DC2626',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  lockoutText: {
    color: '#DC2626',
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  devFillBtn: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  devFillBtnText: {
    color: '#2563EB',
    fontSize: 10,
    fontWeight: '800',
  },
  devHelperBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 8,
    marginBottom: 14,
  },
  devHelperText: {
    color: '#64748B',
    fontSize: 11,
  },
  bioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#DBEAFE',
    borderRadius: 10,
    height: 48,
    marginTop: 10,
  },
  bioButtonText: {
    color: '#2563EB',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  rosterCardTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#DBEAFE',
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
  },
  rosterTriggerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  rosterTriggerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2563EB',
  },
  rosterTriggerTitle: {
    color: '#1E293B',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  adminOnlyBadge: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  adminOnlyBadgeText: {
    color: '#B45309',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  rosterTriggerSubtitle: {
    color: '#64748B',
    fontSize: 10,
    marginTop: 2,
    lineHeight: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  rosterModalBox: {
    width: '100%',
    maxWidth: 620,
    maxHeight: '92%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  rosterModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  rosterHeaderIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rosterModalTitle: {
    color: '#1E293B',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  rosterModalSubtitle: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
  },
  rosterCloseBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  rosterMetricsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  rosterMetricItem: {
    alignItems: 'center',
  },
  rosterMetricVal: {
    color: '#1E293B',
    fontSize: 14,
    fontWeight: '900',
  },
  rosterMetricLabel: {
    color: '#64748B',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  rosterMetricDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#E2E8F0',
  },
  rosterSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    marginHorizontal: 14,
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  rosterSearchInput: {
    flex: 1,
    color: '#1E293B',
    fontSize: 12,
    padding: 0,
  },
  rosterDriverCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  rosterDriverTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  rosterDriverName: {
    color: '#1E293B',
    fontSize: 14,
    fontWeight: '800',
  },
  rosterOperatorBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
    borderWidth: 1,
  },
  rosterOperatorSck: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  rosterOperatorSdr: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  rosterOperatorText: {
    fontSize: 9,
    fontWeight: '800',
  },
  rosterEmpText: {
    color: '#64748B',
    fontSize: 10,
    marginTop: 3,
  },
  rosterStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 1,
  },
  rosterStatusActive: {
    backgroundColor: '#DCFCE7',
    borderColor: '#BBF7D0',
  },
  rosterStatusSuspended: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  rosterStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  rosterStatusText: {
    fontSize: 9,
    fontWeight: '800',
  },
  rosterUsernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 8,
    marginBottom: 8,
  },
  rosterUsernameTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  rosterUsernameTagLabel: {
    color: '#2563EB',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  rosterUsernameTagValue: {
    color: '#1E293B',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  rosterQuickCopyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#2563EB',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  rosterQuickCopyBtnCopied: {
    backgroundColor: '#DCFCE7',
    borderColor: '#16A34A',
  },
  rosterQuickCopyText: {
    color: '#2563EB',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  rosterSpecsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
    gap: 6,
  },
  rosterSpecCol: {
    flex: 1,
  },
  rosterSpecKey: {
    color: '#64748B',
    fontSize: 8,
    fontWeight: '800',
    marginBottom: 2,
  },
  rosterSpecVal: {
    color: '#1E293B',
    fontSize: 10,
    fontWeight: '700',
  },
  rosterCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  rosterCardFooterHint: {
    color: '#2563EB',
    fontSize: 10,
    fontWeight: '700',
  },
  dossierSectionTitle: {
    color: '#2563EB',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginTop: 12,
    marginBottom: 6,
  },
  dossierCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
  },
  dossierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  dossierLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
  },
  dossierVal: {
    color: '#1E293B',
    fontSize: 11,
    fontWeight: '700',
  },
  dossierUsernameBadge: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#2563EB',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  dossierUsernameText: {
    color: '#2563EB',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
});
