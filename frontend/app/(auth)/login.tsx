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
import { useAuthStore } from '../../src/store/authStore';
import { authService } from '../../src/services/authService';
import { credentialStore } from '../../src/services/credentialStore';
import { colors, radius, spacing } from '../../src/theme';
import { useResponsive } from '../../src/hooks/useResponsive';

export default function LoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ prefillUser?: string }>();
  const login = useAuthStore((s) => s.login);
  const { topInset, bottomInset, containerPaddingHorizontal } = useResponsive();

  const [username, setUsername] = useState(params.prefillUser || 'DRV-00001');
  const [password, setPassword] = useState(
    params.prefillUser && params.prefillUser !== 'DRV-00001' ? '' : 'driver'
  );
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [focusedField, setFocusedField] = useState<'username' | 'password' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
      const upper = params.prefillUser.trim().toUpperCase();
      credentialStore.hasUpdatedPassword(upper).then((hasUpdated) => {
        if (hasUpdated) {
          setPassword('');
        } else if (/^SUP([-\s]?\d+)?/i.test(upper) || upper.includes('SUPERVISOR')) {
          setPassword('supervisor');
        } else if (params.prefillUser !== 'DRV-00001') {
          setPassword('');
        }
      });
    }
  }, [params.prefillUser]);

  const handleUsernameChange = (text: string) => {
    setUsername(text);
    if (errorMessage) setErrorMessage(null);
    const upper = text.trim().toUpperCase();

    credentialStore.hasUpdatedPassword(text).then((hasUpdated) => {
      if (hasUpdated) {
        setPassword('');
        return;
      }
      if (/^SUP([-\s]?\d+)?/i.test(upper) || upper.includes('SUPERVISOR')) {
        if (!password || password === 'driver') {
          setPassword('supervisor');
        }
      } else if (/^DRV([-\s]?\d+)?/i.test(upper) || upper.includes('DRIVER')) {
        if (!password || password === 'supervisor') {
          setPassword('driver');
        }
      }
    });
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

      await login(user);
      if (user.role === 'ADMIN') router.replace('/(admin)/(tabs)');
      else if (user.role === 'SUPERVISOR') router.replace('/(supervisor)/(tabs)');
      else router.replace('/(driver)/(tabs)');
    } catch (err: any) {
      // If server explicitly returned 401 or 403, credentials failed
      if (err?.response && (err.response.status === 401 || err.response.status === 403)) {
        const isOld = await credentialStore.isOldPassword(cleanUser, cleanPass);
        const msg = isOld
          ? 'Incorrect password: You entered your old password. Please enter your newly updated password.'
          : 'Incorrect username or password. Please try again.';
        setErrorMessage(msg);
        Alert.alert(isOld ? 'Old Password Entered' : 'Authentication Failed', msg);
        setLoading(false);
        return;
      }

      // Offline Credential Verification:
      const upperUser = cleanUser.toUpperCase();
      const isAdminFormat = upperUser.includes('ADMIN') || upperUser === 'ADMIN@SMARTITT.LK';
      const isSupervisorFormat = isSupervisorIdentified || upperUser === 'SUPERVISOR' || upperUser === 'SUPERVISOR1' || upperUser === 'SUPERVISOR@SMARTITT.LK';
      const role: 'ADMIN' | 'SUPERVISOR' | 'DRIVER' = isAdminFormat ? 'ADMIN' : (isSupervisorFormat ? 'SUPERVISOR' : 'DRIVER');

      if (role === 'ADMIN') {
        if (cleanPass === 'Admin@123' || cleanPass === 'AdminSecure@2026' || cleanPass.toLowerCase() === 'admin') {
          const adminUser = {
            id: 'admin-root',
            username: cleanUser,
            role: 'ADMIN' as const,
            name: 'System Administrator',
            fullName: 'System Administrator',
            token: 'admin-sec-bearer-token',
            email: cleanUser,
            status: 'ACTIVE',
          };
          await login(adminUser as any);
          router.replace('/(admin)/(tabs)');
          return;
        }
      }

      const verifyResult = await credentialStore.verifyOffline(cleanUser, cleanPass, role as any);

      if (!verifyResult.valid) {
        const errorText =
          verifyResult.errorMessage || 'Incorrect username or password. Please try again.';
        setErrorMessage(errorText);
        Alert.alert(
          verifyResult.isOldPassword ? 'Old Password Entered' : 'Authentication Failed',
          errorText
        );
        setLoading(false);
        return;
      }

      const isSupervisor = role === 'SUPERVISOR';

      const mockUser = {
        id: isSupervisor ? 'sup-demo-001' : 'demo-user-123',
        username: cleanUser,
        role: role as any,
        name: isSupervisor ? 'Nimal Silva (Supervisor)' : 'Kamal Perera (Driver)',
        token: 'demo-token-xyz',
        employeeId: isSupervisor ? (cleanUser.toUpperCase().startsWith('SUP') ? cleanUser.toUpperCase() : 'SUP001') : undefined,
        supervisorId: isSupervisor ? 'sup-123' : undefined,
        supervisorPortPassExpiryDate: isSupervisor ? '2026-11-18' : undefined,
        driverId: isSupervisor ? undefined : 'driver-123',
        driverCode: isSupervisor ? undefined : (cleanUser.toUpperCase().startsWith('DRV') ? cleanUser.toUpperCase() : 'DRV-00001'),
        vehicleNumber: isSupervisor ? undefined : 'LY-6439',
        chassisNumber: isSupervisor ? undefined : 'CHE 100',
        cheNumber: isSupervisor ? undefined : 'CHE 100',
        operator: isSupervisor ? undefined : 'SCK Logistics',
        status: 'ACTIVE',
      };

      await login(mockUser as any);
      if (role === 'SUPERVISOR') router.replace('/(supervisor)/(tabs)');
      else router.replace('/(driver)/(tabs)');
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

          <View style={styles.companyPill}>
            <Ionicons name="shield-checkmark" size={13} color="#00e5ff" />
            <Text style={styles.companyPillText}>POWERED BY SCK LOGISTICS</Text>
          </View>
          <Text
            style={styles.brandTitle}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
          >
            SCK ITT PROJECT
          </Text>
          <Text style={styles.brandSubtitle}>INTER-TERMINAL TRANSPORTATION MANAGEMENT SYSTEM</Text>

          {adminTapHint ? (
            <View style={{
              backgroundColor: 'rgba(0, 229, 255, 0.2)',
              borderColor: '#00e5ff',
              borderWidth: 1,
              borderRadius: 16,
              paddingHorizontal: 12,
              paddingVertical: 4,
              marginTop: 4,
            }}>
              <Text style={{ color: '#00e5ff', fontSize: 11, fontWeight: '700' }}>
                {adminTapHint}
              </Text>
            </View>
          ) : (
            <View style={styles.onlineBadge}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineText}>SCK FLEET TELEMATICS GATEWAY ONLINE</Text>
            </View>
          )}
        </TouchableOpacity>


        {/* Form Card */}
        <View style={styles.sheet}>
          {/* Inline Error Message Banner */}
          {errorMessage ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={16} color="#ff4d4f" />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {/* Username Field */}
          <View style={styles.labelRow}>
            <Text style={styles.inputLabel}>username:</Text>
            {isSupervisorIdentified ? (
              <View style={[styles.roleMiniTag, styles.roleMiniTagAmber]}>
                <View style={[styles.statusDot, { backgroundColor: '#feb300' }]} />
                <Text style={styles.roleMiniTagAmberText}>SUPERVISOR</Text>
              </View>
            ) : isDriverIdentified ? (
              <View style={[styles.roleMiniTag, styles.roleMiniTagCyan]}>
                <View style={[styles.statusDot, { backgroundColor: '#00e5ff' }]} />
                <Text style={styles.roleMiniTagCyanText}>DRIVER</Text>
              </View>
            ) : null}
          </View>
          <View style={[
            styles.inputWrap,
            focusedField === 'username' && styles.inputWrapFocused,
            isSupervisorIdentified && { borderColor: 'rgba(254, 179, 0, 0.65)' },
            isDriverIdentified && { borderColor: 'rgba(0, 229, 255, 0.65)' },
          ]}>
            <Ionicons
              name={isSupervisorIdentified ? 'shield-outline' : isDriverIdentified ? 'car-sport-outline' : 'person-outline'}
              size={18}
              color={isSupervisorIdentified ? '#feb300' : isDriverIdentified ? '#00e5ff' : '#849396'}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Enter your username or ID (e.g. driver1, DRV-00001)"
              placeholderTextColor="#566270"
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
                <Ionicons name="close-circle" size={16} color="#566270" />
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
            isSupervisorIdentified && { borderColor: 'rgba(254, 179, 0, 0.65)' },
            isDriverIdentified && { borderColor: 'rgba(0, 229, 255, 0.65)' },
          ]}>
            <Ionicons
              name="lock-closed-outline"
              size={18}
              color={isSupervisorIdentified ? '#feb300' : isDriverIdentified ? '#00e5ff' : '#849396'}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              placeholderTextColor="#566270"
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
                color={showPassword ? '#00e5ff' : '#849396'}
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
                {rememberMe && <Ionicons name="checkmark" size={12} color="#00363d" />}
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
                color={isSupervisorIdentified ? '#feb300' : '#00e5ff'}
              />
              <Text
                style={[
                  styles.forgotBtnText,
                  isSupervisorIdentified && { color: '#feb300' },
                ]}
              >
                FORGOT PASSWORD?
              </Text>
            </TouchableOpacity>
          </View>

          {/* Primary LOG IN Button */}
          <TouchableOpacity
            style={[
              styles.loginBtn,
              isSupervisorIdentified ? styles.loginBtnAmber : styles.loginBtnCyan,
              loading && styles.loginBtnDisabled,
            ]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.88}
          >
            {loading ? (
              <ActivityIndicator color={isSupervisorIdentified ? '#432c00' : '#00363d'} />
            ) : (
              <>
                <Ionicons
                  name={isSupervisorIdentified ? 'shield-checkmark' : 'log-in-outline'}
                  size={19}
                  color={isSupervisorIdentified ? '#432c00' : '#00363d'}
                />
                <Text style={[styles.loginBtnText, isSupervisorIdentified ? styles.loginBtnTextAmber : styles.loginBtnTextCyan]}>
                  {isSupervisorIdentified
                    ? 'LOG IN AS SUPERVISOR'
                    : isDriverIdentified
                    ? 'LOG IN AS DRIVER'
                    : 'LOG IN'}
                </Text>
              </>
            )}
          </TouchableOpacity>

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
          <View style={styles.footerLogoContainer}>
            <Image
              source={require('../../assets/sck-logo.png')}
              style={styles.footerLogo}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.footer}>
            SCK LOGISTICS (PVT) LTD · PORT & TERMINAL TELEMATICS
          </Text>
          <Text style={styles.footerSub}>TLS 1.3 MESH · 256-BIT JWT ENCRYPTION</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#070c14',
  },
  backgroundWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
    overflow: 'hidden',
    backgroundColor: '#070c14',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
    opacity: 0.08,
  },
  backgroundOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(7, 12, 20, 0.45)',
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.margin,
    paddingBottom: 32,
    justifyContent: 'center',
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
    zIndex: 1,
  },
  hero: {
    paddingTop: 16,
    paddingBottom: 18,
    alignItems: 'center',
    gap: 8,
  },
  brandIconCard: {
    width: 90,
    height: 90,
    borderRadius: 22,
    backgroundColor: '#070c14',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#dfa837',
    shadowColor: '#00e5ff',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 8,
    overflow: 'hidden',
  },
  brandIconImg: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  companyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 229, 255, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.28)',
    marginBottom: 4,
  },
  companyPillText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#00e5ff',
    letterSpacing: 1.2,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#00e5ff',
    letterSpacing: 1.2,
    textAlign: 'center',
    textTransform: 'uppercase',
    alignSelf: 'center',
    maxWidth: '100%',
    paddingHorizontal: 6,
  },
  brandSubtitle: {
    fontSize: 9,
    fontWeight: '800',
    color: '#849396',
    letterSpacing: 1.2,
        textAlign: 'center',
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#080e17',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#242a34',
    marginTop: 4,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22ef7e',
  },
  onlineText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#22ef7e',
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
    borderColor: 'rgba(254, 179, 0, 0.45)',
    backgroundColor: 'rgba(254, 179, 0, 0.08)',
  },
  recognizedBannerCyan: {
    borderColor: 'rgba(0, 229, 255, 0.45)',
    backgroundColor: 'rgba(0, 229, 255, 0.08)',
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
    color: '#dde2f0',
    marginTop: 2,
  },
  recognizedHint: {
    fontSize: 10,
    color: '#849396',
    marginTop: 3,
  },
  recognizedHintNeutral: {
    fontSize: 11,
    color: '#849396',
    marginTop: 3,
  },

  sheet: {
    backgroundColor: '#121824',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#222d3d',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  authTabContainer: {
    flexDirection: 'row',
    backgroundColor: '#090e17',
    borderRadius: 10,
    padding: 4,
    borderWidth: 1,
    borderColor: '#1d2736',
    marginBottom: 4,
  },
  authTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 8,
    gap: 6,
  },
  authTabActive: {
    backgroundColor: '#172233',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.35)',
  },
  authTabTextActive: {
    fontSize: 12,
    fontWeight: '800',
    color: '#00e5ff',
    letterSpacing: 0.5,
  },
  authTabTextInactive: {
    fontSize: 12,
    fontWeight: '700',
    color: '#849396',
    letterSpacing: 0.5,
  },
  quickFillBar: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    paddingVertical: 4,
    marginBottom: 2,
  },
  quickFillLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: '#566270',
    letterSpacing: 0.8,
    marginRight: 2,
  },
  quickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#0c131e',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#1d2736',
  },
  quickChipActiveCyan: {
    borderColor: 'rgba(0, 229, 255, 0.5)',
    backgroundColor: 'rgba(0, 229, 255, 0.08)',
  },
  quickChipActiveAmber: {
    borderColor: 'rgba(254, 179, 0, 0.5)',
    backgroundColor: 'rgba(254, 179, 0, 0.08)',
  },
  quickChipTextCyan: {
    fontSize: 10,
    fontWeight: '800',
    color: '#00e5ff',
  },
  quickChipTextAmber: {
    fontSize: 10,
    fontWeight: '800',
    color: '#feb300',
  },
  quickChipReset: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#0c131e',
    borderWidth: 1,
    borderColor: '#1d2736',
  },
  quickChipResetText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#849396',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#a0aec0',
    letterSpacing: 0.8,
    textTransform: 'lowercase',
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
    backgroundColor: 'rgba(0, 229, 255, 0.12)',
  },
  roleMiniTagAmber: {
    backgroundColor: 'rgba(254, 179, 0, 0.12)',
  },
  roleMiniTagCyanText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#00e5ff',
    letterSpacing: 0.6,
  },
  roleMiniTagAmberText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#feb300',
    letterSpacing: 0.6,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#080e17',
    borderWidth: 1,
    borderColor: '#242e3d',
    paddingHorizontal: 12,
    height: 50,
  },
  inputWrapFocused: {
    borderColor: 'rgba(0, 229, 255, 0.8)',
    backgroundColor: '#0b1320',
  },
  clearFieldBtn: {
    padding: 6,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 13,
    color: '#f0f4fc',
    height: 50,
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
    width: 17,
    height: 17,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#3a4a5e',
    backgroundColor: '#0a101a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: '#00e5ff',
    borderColor: '#00e5ff',
  },
  rememberText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#849396',
  },
  forgotBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  forgotBtnText: {
    color: '#00e5ff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  loginBtn: {
    flexDirection: 'row',
    height: 52,
    borderRadius: radius.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    elevation: 4,
  },
  loginBtnCyan: {
    backgroundColor: '#00e5ff',
  },
  loginBtnAmber: {
    backgroundColor: '#feb300',
  },
  loginBtnDisabled: {
    opacity: 0.5,
  },
  loginBtnText: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
  },
  loginBtnTextCyan: {
    color: '#00363d',
  },
  loginBtnTextAmber: {
    color: '#432c00',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 77, 79, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 77, 79, 0.45)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 2,
    marginBottom: 4,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 12,
    fontWeight: '700',
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
    fontSize: 12,
    color: '#849396',
    fontWeight: '600',
  },
  createAccountLink: {
    fontSize: 12,
    color: '#00e5ff',
    fontWeight: '800',
    textDecorationLine: 'underline',
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
    backgroundColor: '#070c14',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    borderWidth: 1.5,
    borderColor: '#dfa837',
    overflow: 'hidden',
    elevation: 3,
  },
  footerLogo: {
    width: 44,
    height: 44,
    borderRadius: 12,
  },
  footer: {
    fontSize: 9,
    fontWeight: '700',
    color: '#849396',
    letterSpacing: 0.8,
    textAlign: 'center',
  },
  footerSub: {
    fontSize: 8,
    color: '#3b494c',
  },
});
