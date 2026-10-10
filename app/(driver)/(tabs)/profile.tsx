import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../../src/store/authStore';
import { driverService, DriverProfile } from '../../../src/services/driverService';
import { colors, radius, spacing, shadow } from '../../../src/theme';

export default function DriverProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();

  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      const data = await driverService.getProfile();
      setProfile(data);
      if (data) {
        updateUser({
          name: data.fullName,
          driverCode: data.driverCode,
          employeeId: data.employeeId,
          vehicleNumber: data.vehicleNumber,
          nic: data.nic,
          mobileNumber: data.mobileNumber,
          email: data.email,
          address: data.address,
          licenseNumber: data.licenseNumber,
          licenseExpiryDate: data.licenseExpiryDate,
          dateOfBirth: data.dateOfBirth,
          emergencyContactName: data.emergencyContactName,
          emergencyContactNumber: data.emergencyContactNumber,
          status: data.status,
        });
      }
    } catch (err) {
      console.warn('Profile API fallback to cached state:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [updateUser]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const handleCopyCode = async (code: string) => {
    try {
      if (Platform.OS === 'web' && navigator?.clipboard) {
        await navigator.clipboard.writeText(code);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Sign out of Smart ITT?')) { logout(); router.replace('/(auth)/login'); }
    } else {
      Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: () => { logout(); router.replace('/(auth)/login'); } },
      ]);
    }
  };

  const driverCode = profile?.driverCode || user?.driverCode || user?.username || '—';
  const fullName = profile?.fullName || user?.name || '—';
  const employeeId = profile?.employeeId || user?.employeeId || '—';
  const nic = profile?.nic || user?.nic || '—';
  const mobileNumber = profile?.mobileNumber || user?.mobileNumber || '—';
  const address = profile?.address || user?.address || '—';
  const licenseNumber = profile?.licenseNumber || user?.licenseNumber || '—';
  const licenseExpiryDate = profile?.licenseExpiryDate || user?.licenseExpiryDate || '—';
  const dateOfBirth = profile?.dateOfBirth || user?.dateOfBirth || '—';
  const emergencyContactName = profile?.emergencyContactName || user?.emergencyContactName || '—';
  const emergencyContactNumber = profile?.emergencyContactNumber || user?.emergencyContactNumber || '—';
  const vehicleNumber = profile?.vehicleNumber || user?.vehicleNumber || '—';
  const email = profile?.email || user?.email || '—';
  const status = profile?.status || user?.status || 'ACTIVE';
  const isActive = status === 'ACTIVE';
  const initials = fullName !== '—' ? fullName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() : 'DR';

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); fetchProfile(); }}
          tintColor={colors.primaryContainer}
        />
      }
    >
      {/* ─── Header ─── */}
      <View style={styles.header}>
        <View style={styles.headerTopAccent} />

        <View style={styles.avatarRow}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={[styles.statusDot, { backgroundColor: isActive ? colors.primaryContainer : colors.error }]} />
          </View>
        </View>

        <Text style={styles.driverName}>{fullName}</Text>
        <Text style={styles.driverRole}>Commercial ITT Heavy Vehicle Driver</Text>

        <TouchableOpacity
          style={styles.driverCodePill}
          onPress={() => handleCopyCode(driverCode)}
          activeOpacity={0.8}
        >
          <Ionicons name="id-card-outline" size={14} color={colors.primaryFixedDim} />
          <Text style={styles.driverCodeLabel}>DRIVER CODE</Text>
          <Text style={styles.driverCodeValue}>{driverCode}</Text>
          <Ionicons
            name={copied ? 'checkmark-circle' : 'copy-outline'}
            size={15}
            color={copied ? colors.primaryContainer : colors.primaryFixedDim}
          />
        </TouchableOpacity>
      </View>

      {loading && !profile ? (
        <ActivityIndicator size="large" color={colors.primaryContainer} style={{ marginTop: 40 }} />
      ) : (
        <View style={styles.content}>

          {/* ─── Profile Card ─── */}
          <View style={styles.card}>
            <View style={styles.cardHead}>
              <Ionicons name="card-outline" size={18} color={colors.secondaryContainer} />
              <Text style={styles.cardTitle}>DRIVER PROFILE</Text>
              <View style={[styles.statusBadge, { backgroundColor: isActive ? 'rgba(0,229,255,0.1)' : 'rgba(255,75,75,0.1)' }]}>
                <View style={[styles.statusDotSmall, { backgroundColor: isActive ? colors.primaryContainer : colors.error }]} />
                <Text style={[styles.statusText, { color: isActive ? colors.primaryContainer : colors.error }]}>{status}</Text>
              </View>
            </View>

            {[
              { key: 'Driver Code', val: driverCode, icon: 'id-card-outline', highlight: true },
              { key: 'Full Name', val: fullName, icon: 'person-outline' },
              { key: 'Employee ID', val: employeeId, icon: 'business-outline', mono: true },
              { key: 'NIC Number', val: nic, icon: 'card-outline', mono: true },
              { key: 'Mobile', val: mobileNumber, icon: 'call-outline', mono: true },
              { key: 'Email', val: email, icon: 'mail-outline', mono: true },
              { key: 'Address', val: address, icon: 'location-outline' },
              { key: 'Driving License', val: licenseNumber, icon: 'car-outline', mono: true, highlight: true },
              { key: 'License Expiry', val: licenseExpiryDate, icon: 'time-outline', mono: true },
              { key: 'Date of Birth', val: dateOfBirth, icon: 'calendar-outline', mono: true },
              { key: 'Assigned Vehicle', val: vehicleNumber, icon: 'bus-outline', mono: true, vehicleColor: true },
              { key: 'Emergency Contact', val: emergencyContactName, icon: 'medkit-outline' },
              { key: 'Emergency Phone', val: emergencyContactNumber, icon: 'call-outline', mono: true, warning: true },
            ].map(({ key, val, icon, mono, highlight, vehicleColor, warning }, i, arr) => (
              <View key={key} style={[styles.infoRow, i === arr.length - 1 && { borderBottomWidth: 0 }]}>
                <View style={styles.infoKeyRow}>
                  <Ionicons name={icon as any} size={13} color={colors.onSurfaceVariant} />
                  <Text style={styles.infoKey}>{key}</Text>
                </View>
                <Text style={[
                  styles.infoVal,
                  mono && styles.monoText,
                  highlight && { color: colors.secondaryContainer, fontWeight: '800' },
                  vehicleColor && { color: colors.tertiaryContainer },
                  warning && { color: colors.warning },
                ]}>
                  {val}
                </Text>
              </View>
            ))}
          </View>

          {/* ─── Sign Out ─── */}
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.88}>
            <Ionicons name="log-out-outline" size={20} color={colors.white} />
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    backgroundColor: colors.surfaceContainer,
    paddingTop: 54, paddingBottom: spacing.xl, paddingHorizontal: spacing.lg,
    alignItems: 'center',
    borderBottomLeftRadius: radius.xl, borderBottomRightRadius: radius.xl,
    borderWidth: 1, borderTopWidth: 0, borderColor: colors.outlineVariant,
    overflow: 'hidden',
  },
  headerTopAccent: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: colors.secondaryContainer },

  avatarRow: { marginBottom: spacing.sm },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.primaryContainer, alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: colors.primaryContainer, ...shadow.glow,
  },
  avatarText: { color: colors.onPrimaryContainer, fontSize: 30, fontWeight: '900' },
  statusDot: {
    position: 'absolute', bottom: 2, right: 2,
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 2, borderColor: colors.surfaceContainer,
  },

  driverName: { fontSize: 22, fontWeight: '800', color: colors.onSurface, textAlign: 'center', marginTop: spacing.xs },
  driverRole: { fontSize: 12, color: colors.onSurfaceVariant, textAlign: 'center', marginTop: 2 },

  driverCodePill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: radius.DEFAULT, marginTop: spacing.md,
    borderWidth: 1, borderColor: colors.outline,
  },
  driverCodeLabel: { fontSize: 9, fontWeight: '800', color: colors.primaryFixedDim, letterSpacing: 1 },
  driverCodeValue: { fontSize: 16, fontWeight: '900', color: colors.onSurface,  },

  content: { padding: spacing.md },

  card: {
    backgroundColor: colors.surfaceContainer, borderRadius: radius.xl,
    padding: spacing.lg, borderWidth: 1, borderColor: colors.outlineVariant, marginBottom: spacing.md,
  },
  cardHead: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.outlineVariant, marginBottom: spacing.sm,
  },
  cardTitle: { fontSize: 13, fontWeight: '800', color: colors.onSurface, letterSpacing: 0.8, flex: 1 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusDotSmall: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },

  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.surfaceContainerLow, gap: spacing.md,
  },
  infoKeyRow: { flexDirection: 'row', alignItems: 'center', gap: 5, width: '40%' },
  infoKey: { fontSize: 12, color: colors.onSurfaceVariant, fontWeight: '600' },
  infoVal: { fontSize: 13, color: colors.onSurface, fontWeight: '600', flex: 1, textAlign: 'right' },
  monoText: {  },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: colors.errorContainer, borderRadius: radius.DEFAULT, height: 52,
  },
  logoutText: { color: colors.white, fontSize: 15, fontWeight: '800' },
});
