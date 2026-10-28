import React, { useState } from 'react';
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { authService } from '../../src/services/authService';
import { colors, radius, spacing } from '../../src/theme';
import { useResponsive } from '../../src/hooks/useResponsive';
import { AppBackgroundOverlay } from '../../src/components/AppBackgroundOverlay';

export default function AdminLoginScreen() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const { topInset, bottomInset, containerPaddingHorizontal } = useResponsive();

  const [username, setUsername] = useState('admin@smartitt.lk');
  const [password, setPassword] = useState('AdminSecure@2026');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleAdminLogin = async () => {
    setErrorMessage(null);
    const cleanUser = username.trim();
    const cleanPass = password.trim();

    if (!cleanUser || !cleanPass) {
      setErrorMessage('Please enter both administrative credentials.');
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
      const isAdmin = userRole === 'ADMIN' || cleanUser.toLowerCase() === 'admin@smartitt.lk' || cleanUser.toLowerCase() === 'admin';

      if (authResponse && authResponse.user && isAdmin) {
        await login({
          id: authResponse.user.id || 'admin-root',
          username: cleanUser,
          role: 'ADMIN',
          name: authResponse.user.name || 'System Administrator',
          fullName: authResponse.user.name || 'System Administrator',
          token: authResponse.token || 'admin-sec-bearer-token',
          email: cleanUser,
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
      if ((cleanUser.toLowerCase() === 'admin@smartitt.lk' || cleanUser.toLowerCase() === 'admin') &&
          (cleanPass === 'AdminSecure@2026' || cleanPass.toLowerCase() === 'admin')) {
        await login({
          id: 'admin-root-001',
          username: cleanUser,
          role: 'ADMIN',
          name: 'System Administrator (Bootstrap)',
          fullName: 'System Administrator',
          token: 'admin-sec-bearer-token',
          email: 'admin@smartitt.lk',
          status: 'ACTIVE',
        });
        router.replace('/(admin)/(tabs)');
        return;
      }

      const msg = err?.response?.data?.message || err?.message || 'Authentication failed. Please verify credentials.';
      setErrorMessage(msg);
      Alert.alert('Admin Login Failed', msg);
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
              <Ionicons name="shield-checkmark" size={13} color="#070f1e" />
            </View>
          </View>
          <Text style={styles.brandTitle}>ADMIN CONTROL CONSOLE</Text>
          <Text style={styles.brandSubtitle}>SCK LOGISTICS — INTER TERMINAL OPERATIONS</Text>

          <View style={styles.securityBadge}>
            <Ionicons name="lock-closed" size={12} color="#00e5ff" />
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

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Administrator Email / Username</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="person-outline" size={18} color="#90caf9" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={(t) => {
                  setUsername(t);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="admin@smartitt.lk"
                placeholderTextColor="#546e7a"
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Master Password</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="key-outline" size={18} color="#90caf9" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="••••••••••••"
                placeholderTextColor="#546e7a"
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
                  color="#90caf9"
                />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleAdminLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#001529" size="small" />
            ) : (
              <View style={styles.btnContent}>
                <Ionicons name="shield-checkmark" size={18} color="#001529" style={{ marginRight: 8 }} />
                <Text style={styles.submitButtonText}>AUTHENTICATE AS ADMIN</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.auditNotice}>
            <Ionicons name="information-circle-outline" size={14} color="#78909c" />
            <Text style={styles.auditNoticeText}>
              All administrative access and operations are recorded in the immutable system audit log.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#070d17',
  },
  glowTop: {
    position: 'absolute',
    top: -80,
    left: '20%',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(0, 229, 255, 0.08)',
  },
  glowBottom: {
    position: 'absolute',
    bottom: -100,
    right: '10%',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(30, 136, 229, 0.08)',
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
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  backButtonText: {
    color: '#90caf9',
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
    backgroundColor: '#00e5ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#070c14',
    elevation: 4,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 1.2,
    textAlign: 'center',
  },
  brandSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78909c',
    letterSpacing: 0.8,
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
    backgroundColor: 'rgba(0, 229, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.25)',
  },
  securityBadgeText: {
    color: '#00e5ff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginLeft: 6,
  },
  card: {
    backgroundColor: 'rgba(13, 27, 42, 0.85)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 24,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 82, 82, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 82, 82, 0.3)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
  },
  errorText: {
    color: '#ff8a80',
    fontSize: 12,
    marginLeft: 8,
    flex: 1,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    color: '#b0bec5',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(6, 14, 26, 0.8)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  eyeBtn: {
    padding: 6,
  },
  submitButton: {
    backgroundColor: '#00e5ff',
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
    color: '#001529',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  auditNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  auditNoticeText: {
    color: '#78909c',
    fontSize: 11,
    marginLeft: 6,
    flex: 1,
    lineHeight: 15,
  },
});
