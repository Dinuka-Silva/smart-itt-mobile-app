import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { authService } from '../../src/services/authService';
import { colors, radius, spacing, shadow } from '../../src/theme';

export default function LoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ prefillUser?: string }>();
  const login = useAuthStore((s) => s.login);

  const [username, setUsername] = useState(params.prefillUser || '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (params.prefillUser) setUsername(params.prefillUser);
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
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || 'Invalid Driver Code or password.';
      Alert.alert('Login Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.glowOrb} />
          <View style={styles.logoRow}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoLetters}>ITT</Text>
            </View>
            <View>
              <Text style={styles.brandName}>SMART ITT</Text>
              <Text style={styles.brandSub}>Colombo Port · Inter-Terminal Transport</Text>
            </View>
          </View>
          <Text style={styles.heroTitle}>Driver Portal</Text>
          <Text style={styles.heroDesc}>
            Sign in with your Driver Code and password to access your workspace.
          </Text>
        </View>

        {/* Form Sheet */}
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>Sign In</Text>

          {/* Driver Code */}
          <Text style={styles.fieldLabel}>DRIVER CODE / USERNAME</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="id-card-outline" size={18} color={colors.onSurfaceVariant} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="e.g. DRV-00001"
              placeholderTextColor={colors.textMuted}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="characters"
              autoCorrect={false}
            />
          </View>

          {/* Password */}
          <Text style={styles.fieldLabel}>PASSWORD</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="lock-closed-outline" size={18} color={colors.onSurfaceVariant} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="••••••••"
              placeholderTextColor={colors.textMuted}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
              <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color={colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.88}
          >
            {loading ? (
              <ActivityIndicator color={colors.onPrimaryContainer} />
            ) : (
              <>
                <Ionicons name="log-in-outline" size={20} color={colors.onPrimaryContainer} />
                <Text style={styles.loginBtnText}>LOGIN</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divRow}>
            <View style={styles.divLine} />
            <Text style={styles.divText}>OR</Text>
            <View style={styles.divLine} />
          </View>

          {/* Register */}
          <TouchableOpacity
            style={styles.registerBtn}
            onPress={() => router.push('/(auth)/register')}
            activeOpacity={0.88}
          >
            <Ionicons name="person-add-outline" size={18} color={colors.primaryFixedDim} />
            <Text style={styles.registerBtnText}>CREATE DRIVER ACCOUNT</Text>
          </TouchableOpacity>

          {/* Demo Box */}
          <View style={styles.demoBox}>
            <View style={styles.demoTitleRow}>
              <Ionicons name="flask-outline" size={13} color={colors.primaryFixedDim} />
              <Text style={styles.demoTitle}>Demo Accounts</Text>
            </View>
            <TouchableOpacity onPress={() => { setUsername('DRV-00001'); setPassword('driver'); }}>
              <Text style={styles.demoLine}>
                Driver · <Text style={styles.demoBold}>DRV-00001</Text> / driver (tap to fill)
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setUsername('supervisor@smartitt.lk'); setPassword('supervisor'); }} style={{ marginTop: 4 }}>
              <Text style={styles.demoLine}>
                Supervisor · <Text style={styles.demoBold}>supervisor@smartitt.lk</Text> / supervisor
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.footer}>Smart ITT © 2026 · Colombo Port Authority</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, paddingBottom: 32 },

  hero: {
    paddingHorizontal: spacing.lg,
    paddingTop: 60,
    paddingBottom: spacing.xl,
    overflow: 'hidden',
    position: 'relative',
  },
  glowOrb: {
    position: 'absolute',
    top: -60,
    right: -80,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: colors.primaryContainer,
    opacity: 0.08,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  logoBadge: {
    width: 54,
    height: 54,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.glow,
  },
  logoLetters: { color: colors.onPrimaryContainer, fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  brandName: { color: colors.onBackground, fontSize: 26, fontWeight: '800', letterSpacing: 0.5 },
  brandSub: { color: colors.primaryFixedDim, fontSize: 11, fontWeight: '600', marginTop: 2 },
  heroTitle: { fontSize: 36, fontWeight: '900', color: colors.onBackground, letterSpacing: -0.5 },
  heroDesc: { color: colors.onSurfaceVariant, fontSize: 14, lineHeight: 22, marginTop: 8, maxWidth: 340 },

  sheet: {
    marginHorizontal: spacing.md,
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  sheetTitle: { fontSize: 22, fontWeight: '800', color: colors.onSurface, marginBottom: spacing.lg },

  fieldLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.onSurfaceVariant,
    letterSpacing: 1,
    marginBottom: 6,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: colors.outline,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.sm,
    height: 52,
  },
  inputIcon: { marginRight: 8 },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.onSurface,
    fontFamily: 'monospace',
    height: 52,
  },
  eyeBtn: { padding: 6 },

  loginBtn: {
    flexDirection: 'row',
    height: 54,
    backgroundColor: colors.primaryContainer,
    borderRadius: radius.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: spacing.sm,
    ...shadow.glow,
  },
  loginBtnDisabled: { opacity: 0.5 },
  loginBtnText: { color: colors.onPrimaryContainer, fontSize: 16, fontWeight: '900', letterSpacing: 1 },

  divRow: { flexDirection: 'row', alignItems: 'center', marginVertical: spacing.lg, gap: spacing.md },
  divLine: { flex: 1, height: 1, backgroundColor: colors.outlineVariant },
  divText: { fontSize: 12, fontWeight: '700', color: colors.onSurfaceVariant },

  registerBtn: {
    flexDirection: 'row',
    height: 50,
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: radius.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.primaryFixedDim,
  },
  registerBtnText: { color: colors.primaryFixedDim, fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },

  demoBox: {
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  demoTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  demoTitle: { fontSize: 11, fontWeight: '700', color: colors.primaryFixedDim },
  demoLine: { fontSize: 12, color: colors.onSurfaceVariant, lineHeight: 22, fontFamily: 'monospace' },
  demoBold: { fontWeight: '800', color: colors.primaryContainer },

  footer: { textAlign: 'center', fontSize: 11, color: colors.textMuted, marginTop: spacing.xl, paddingHorizontal: spacing.lg },
});
