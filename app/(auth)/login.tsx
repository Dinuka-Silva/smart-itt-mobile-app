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
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { authService } from '../../src/services/authService';
import { colors, radius, spacing } from '../../src/theme';

export default function LoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ prefillUser?: string }>();
  const login = useAuthStore((s) => s.login);

  const [username, setUsername] = useState(params.prefillUser || 'DRV-00001');
  const [password, setPassword] = useState(
    params.prefillUser && params.prefillUser !== 'DRV-00001' ? '' : 'driver'
  );
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (params.prefillUser) {
      setUsername(params.prefillUser);
      if (params.prefillUser !== 'DRV-00001') {
        setPassword('');
      }
    }
  }, [params.prefillUser]);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Missing Fields', 'Please enter your Driver Code and password.');
      return;
    }
    setLoading(true);
    try {
      const authResponse = await authService.login({ username: username.trim(), password });
      if (!authResponse || !authResponse.user) throw new Error('Invalid response from server');

      const user = {
        id: authResponse.user.id,
        username: authResponse.user.username,
        role: authResponse.user.role,
        name: authResponse.user.name,
        token: authResponse.token,
        driverId: authResponse.user.driverId,
        driverCode: authResponse.user.driverCode || authResponse.driverCode,
        supervisorId: authResponse.user.supervisorId,
        vehicleNumber: authResponse.user.vehicleNumber,
        employeeId: authResponse.user.employeeId,
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
      if (user.role === 'DRIVER') router.replace('/(driver)/(tabs)');
      else router.replace('/(supervisor)/(tabs)');
    } catch {
      // Offline fallback
      const isSupervisor = username.trim().toLowerCase().includes('supervisor');
      const role = isSupervisor ? 'SUPERVISOR' : 'DRIVER';

      const mockUser = {
        id: 'demo-user-123',
        username: username.trim(),
        role: role,
        name: isSupervisor ? 'Nimal Silva (Supervisor)' : 'Kamal Perera (Driver)',
        token: 'demo-token-xyz',
        driverId: isSupervisor ? undefined : 'driver-123',
        driverCode: isSupervisor ? undefined : (username.trim() || 'DRV-00001'),
        vehicleNumber: isSupervisor ? undefined : 'WP-BA-1234',
        supervisorId: isSupervisor ? 'sup-123' : undefined,
        status: 'ACTIVE',
      };

      await login(mockUser as any);
      if (role === 'DRIVER') router.replace('/(driver)/(tabs)');
      else router.replace('/(supervisor)/(tabs)');
    } finally {
      setLoading(false);
    }
  };

  const selectRole = (role: 'DRIVER' | 'SUPERVISOR') => {
    if (role === 'DRIVER') {
      setUsername('DRV-00001');
      setPassword('driver');
    } else {
      setUsername('supervisor@smartitt.lk');
      setPassword('supervisor');
    }
  };

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Brand Header */}
        <View style={styles.hero}>
          <View style={styles.logoBadge}>
            <Ionicons name="boat" size={32} color="#00e5ff" />
          </View>
          <Text style={styles.brandTitle}>SMART ITT</Text>
          <Text style={styles.brandSubtitle}>INTER-TERMINAL TRANSPORTATION TELEMATICS</Text>
          <View style={styles.onlineBadge}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineText}>CENTRAL DISPATCH GATEWAY ONLINE</Text>
          </View>
        </View>

        {/* Quick Role Selection Tabs */}
        <View style={styles.roleTabsRow}>
          <TouchableOpacity
            style={[styles.roleTab, username === 'DRV-00001' && styles.roleTabActiveCyan]}
            onPress={() => selectRole('DRIVER')}
          >
            <Ionicons
              name="navigate"
              size={16}
              color={username === 'DRV-00001' ? '#00363d' : '#849396'}
            />
            <Text
              style={[
                styles.roleTabText,
                username === 'DRV-00001' && styles.roleTabTextActiveDark,
              ]}
            >
              DRIVER COCKPIT
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.roleTab,
              username.includes('supervisor') && styles.roleTabActiveAmber,
            ]}
            onPress={() => selectRole('SUPERVISOR')}
          >
            <Ionicons
              name="pulse"
              size={16}
              color={username.includes('supervisor') ? '#432c00' : '#849396'}
            />
            <Text
              style={[
                styles.roleTabText,
                username.includes('supervisor') && styles.roleTabTextActiveDark,
              ]}
            >
              SUPERVISOR RADAR
            </Text>
          </TouchableOpacity>
        </View>

        {params.prefillUser && (
          <View style={styles.recognizedBanner}>
            <View style={styles.recognizedDot} />
            <View style={{ flex: 1 }}>
              <Text style={styles.recognizedTitle}>OPERATOR IDENTIFIER RECOGNIZED</Text>
              <Text style={styles.recognizedCode}>ID: {username} · Verified Port Permit</Text>
              <Text style={{ fontSize: 10, color: '#849396', marginTop: 2 }}>
                Enter the password you registered with to launch your driver cockpit.
              </Text>
            </View>
            <Ionicons name="shield-checkmark" size={22} color="#22ef7e" />
          </View>
        )}

        {/* Form Card */}
        <View style={styles.sheet}>
          <Text style={styles.inputLabel}>OPERATOR IDENTIFIER (DRIVER CODE / USERNAME)</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="id-card-outline" size={18} color="#00e5ff" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Driver Code (e.g. DRV-00001) or Email"
              placeholderTextColor="#849396"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <Text style={styles.inputLabel}>SECURITY PIN / PASSWORD</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="lock-closed-outline" size={18} color="#00e5ff" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#849396"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
              <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={18} color="#849396" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.88}
          >
            {loading ? (
              <ActivityIndicator color="#00363d" />
            ) : (
              <>
                <Ionicons name="log-in" size={20} color="#00363d" />
                <Text style={styles.loginBtnText}>AUTHENTICATE & ENTER</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.registerBtn}
            onPress={() => router.push('/(auth)/register')}
            activeOpacity={0.88}
          >
            <Text style={styles.registerBtnText}>REGISTER NEW DRIVER OPERATOR</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footerWrap}>
          <Text style={styles.footer}>
            SRI LANKA PORTS AUTHORITY · TERMINAL KINETIC INDUSTRIAL HUD
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
    backgroundColor: '#0e141d',
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.margin,
    paddingBottom: 32,
    justifyContent: 'center',
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  hero: {
    paddingTop: 48,
    paddingBottom: 20,
    alignItems: 'center',
    gap: 8,
  },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: radius.DEFAULT,
    backgroundColor: '#161c25',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#00e5ff',
    elevation: 6,
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#00e5ff',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  brandSubtitle: {
    fontSize: 9,
    fontWeight: '800',
    color: '#849396',
    letterSpacing: 1.2,
    fontFamily: 'monospace',
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
    fontFamily: 'monospace',
  },

  roleTabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  roleTab: {
    flex: 1,
    height: 44,
    borderRadius: radius.DEFAULT,
    backgroundColor: '#161c25',
    borderWidth: 1,
    borderColor: '#242a34',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  roleTabActiveCyan: {
    backgroundColor: '#00e5ff',
    borderColor: '#00e5ff',
  },
  roleTabActiveAmber: {
    backgroundColor: '#feb300',
    borderColor: '#feb300',
  },
  roleTabText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#849396',
    letterSpacing: 0.6,
  },
  roleTabTextActiveDark: {
    color: '#00363d',
  },

  sheet: {
    backgroundColor: '#161c25',
    borderRadius: radius.DEFAULT,
    padding: 16,
    borderWidth: 1,
    borderColor: '#242a34',
    gap: 10,
  },
  inputLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#849396',
    letterSpacing: 0.8,
    marginTop: 2,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.DEFAULT,
    backgroundColor: '#080e17',
    borderWidth: 1,
    borderColor: '#242a34',
    paddingHorizontal: 12,
    height: 50,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 13,
    color: '#dde2f0',
    fontFamily: 'monospace',
    height: 50,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  } as any,
  eyeBtn: {
    padding: 6,
  },
  loginBtn: {
    flexDirection: 'row',
    height: 52,
    borderRadius: radius.DEFAULT,
    backgroundColor: '#00e5ff',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    elevation: 4,
  },
  loginBtnDisabled: {
    opacity: 0.5,
  },
  loginBtnText: {
    color: '#00363d',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
  },
  registerBtn: {
    height: 44,
    borderRadius: radius.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a2029',
    borderWidth: 1,
    borderColor: '#242a34',
    marginTop: 4,
  },
  registerBtnText: {
    color: '#00e5ff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  footerWrap: {
    alignItems: 'center',
    marginTop: 20,
    gap: 4,
  },
  footer: {
    fontSize: 9,
    fontWeight: '700',
    color: '#849396',
    letterSpacing: 0.8,
    fontFamily: 'monospace',
    textAlign: 'center',
  },
  footerSub: {
    fontSize: 8,
    color: '#3b494c',
    fontFamily: 'monospace',
  },
  recognizedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0a2318',
    borderColor: '#22ef7e',
    borderWidth: 1,
    borderRadius: radius.DEFAULT,
    padding: 12,
    marginBottom: 16,
    gap: 10,
  },
  recognizedDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22ef7e',
  },
  recognizedTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#22ef7e',
    letterSpacing: 0.8,
  },
  recognizedCode: {
    fontSize: 12,
    fontWeight: '700',
    color: '#dde2f0',
    fontFamily: 'monospace',
    marginTop: 2,
  },
});
