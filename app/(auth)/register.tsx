import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, Platform, Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { authService, DriverRegisterRequest } from '../../src/services/authService';
import { colors, radius, spacing, shadow } from '../../src/theme';

export default function DriverRegisterScreen() {
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [nic, setNic] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [address, setAddress] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseExpiryDate, setLicenseExpiryDate] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactNumber, setEmergencyContactNumber] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [generatedDriverCode, setGeneratedDriverCode] = useState('');
  const [copied, setCopied] = useState(false);

  const hasMinLength = password.length >= 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const isPasswordValid = hasMinLength && hasUpperCase && hasLowerCase && hasNumber && hasSpecial;

  const handleCopyCode = async () => {
    try {
      if (Platform.OS === 'web' && navigator?.clipboard) {
        await navigator.clipboard.writeText(generatedDriverCode);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleRegister = async () => {
    if (!fullName.trim()) return Alert.alert('Required', 'Please enter your Full Name.');
    if (!nic.trim()) return Alert.alert('Required', 'Please enter your NIC Number.');
    if (!employeeId.trim()) return Alert.alert('Required', 'Please enter your Employee ID.');
    if (!mobileNumber.trim()) return Alert.alert('Required', 'Please enter your Mobile Number.');
    if (!address.trim()) return Alert.alert('Required', 'Please enter your Address.');
    if (!licenseNumber.trim()) return Alert.alert('Required', 'Please enter your Driving License Number.');
    if (!emergencyContactName.trim()) return Alert.alert('Required', 'Please enter Emergency Contact Name.');
    if (!emergencyContactNumber.trim()) return Alert.alert('Required', 'Please enter Emergency Contact Number.');
    if (!isPasswordValid) return Alert.alert('Weak Password', 'Password must be 8+ chars with uppercase, lowercase, number & special character.');
    if (password !== confirmPassword) return Alert.alert('Mismatch', 'Passwords do not match.');

    setLoading(true);
    try {
      const resolvedEmail = email.trim() || `${nic.trim().toLowerCase().replace(/[^a-z0-9]/g, '')}@smartitt.lk`;
      const resolvedVehicleNumber = vehicleNumber.trim() || 'N/A';

      const payload: DriverRegisterRequest = {
        fullName: fullName.trim(),
        nic: nic.trim(),
        employeeId: employeeId.trim(),
        mobileNumber: mobileNumber.trim(),
        address: address.trim(),
        drivingLicenceNumber: licenseNumber.trim().toUpperCase(),
        licenseExpiryDate: licenseExpiryDate.trim() || undefined,
        dateOfBirth: dateOfBirth.trim() || undefined,
        emergencyContactName: emergencyContactName.trim(),
        emergencyContactNumber: emergencyContactNumber.trim(),
        vehicleNumber: resolvedVehicleNumber,
        email: resolvedEmail,
        password,
        confirmPassword,
      };

      const response = await authService.registerDriver(payload);
      const code = response.driverCode || response.user?.driverCode || response.user?.username || 'DRV-00001';
      setGeneratedDriverCode(code);
      setSuccessModalVisible(true);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Registration failed. Please try again.';
      Alert.alert('Sign-Up Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleContinueToLogin = () => {
    setSuccessModalVisible(false);
    router.replace({ pathname: '/(auth)/login', params: { prefillUser: generatedDriverCode } });
  };

  const Field = ({ label, icon, children }: { label: string; icon: string; children: React.ReactNode }) => (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputWrap}>
        <Ionicons name={icon as any} size={16} color={colors.onSurfaceVariant} style={styles.inputIcon} />
        {children}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Top Header */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={colors.primaryFixedDim} />
            <Text style={styles.backBtnText}>Back to Login</Text>
          </TouchableOpacity>
        </View>

        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.logoRow}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoLetters}>ITT</Text>
            </View>
            <View>
              <Text style={styles.brandName}>SMART ITT</Text>
              <Text style={styles.brandSub}>Colombo Port · Inter-Terminal Transport</Text>
            </View>
          </View>
          <Text style={styles.heroTitle}>Driver Sign Up</Text>
          <Text style={styles.heroDesc}>
            Fill in your details below. A unique <Text style={{ color: colors.primaryContainer, fontWeight: '700' }}>Driver Code</Text> will be generated automatically — you'll use it to log in.
          </Text>
        </View>

        {/* ─── Personal Information ─── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="person-circle-outline" size={18} color={colors.primaryFixedDim} />
            <Text style={styles.cardHeaderText}>PERSONAL INFORMATION</Text>
          </View>

          <Field label="FULL NAME *" icon="person-outline">
            <TextInput style={styles.input} placeholder="e.g. G.D.W.V. Dissanayaka" placeholderTextColor={colors.textMuted} value={fullName} onChangeText={setFullName} />
          </Field>

          <Field label="NIC NUMBER *" icon="card-outline">
            <TextInput style={styles.input} placeholder="e.g. 199912345678 or 851234567V" placeholderTextColor={colors.textMuted} value={nic} onChangeText={setNic} autoCapitalize="characters" />
          </Field>

          <Field label="DATE OF BIRTH (YYYY-MM-DD)" icon="calendar-outline">
            <TextInput style={styles.input} placeholder="1999-10-20" placeholderTextColor={colors.textMuted} value={dateOfBirth} onChangeText={setDateOfBirth} />
          </Field>

          <Field label="ADDRESS *" icon="location-outline">
            <TextInput style={[styles.input, styles.multilineInput]} placeholder="No. 25, Colombo Road, Sri Lanka" placeholderTextColor={colors.textMuted} multiline value={address} onChangeText={setAddress} />
          </Field>
        </View>

        {/* ─── Employment & License ─── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="briefcase-outline" size={18} color={colors.secondaryContainer} />
            <Text style={[styles.cardHeaderText, { color: colors.secondaryContainer }]}>EMPLOYMENT &amp; LICENSE</Text>
          </View>

          <Field label="EMPLOYEE ID *" icon="business-outline">
            <TextInput style={styles.input} placeholder="e.g. EMP-125" placeholderTextColor={colors.textMuted} value={employeeId} onChangeText={setEmployeeId} autoCapitalize="characters" />
          </Field>

          <Field label="MOBILE NUMBER *" icon="call-outline">
            <TextInput style={styles.input} placeholder="e.g. 0771234567" placeholderTextColor={colors.textMuted} keyboardType="phone-pad" value={mobileNumber} onChangeText={setMobileNumber} />
          </Field>

          <Field label="DRIVING LICENSE NUMBER *" icon="car-outline">
            <TextInput style={styles.input} placeholder="e.g. B1234567" placeholderTextColor={colors.textMuted} value={licenseNumber} onChangeText={setLicenseNumber} autoCapitalize="characters" />
          </Field>

          <Field label="LICENSE EXPIRY DATE (YYYY-MM-DD)" icon="time-outline">
            <TextInput style={styles.input} placeholder="2028-05-10" placeholderTextColor={colors.textMuted} value={licenseExpiryDate} onChangeText={setLicenseExpiryDate} />
          </Field>

          <Field label="ASSIGNED TRUCK / VEHICLE (OPTIONAL)" icon="bus-outline">
            <TextInput style={styles.input} placeholder="e.g. WP-BA-1234" placeholderTextColor={colors.textMuted} value={vehicleNumber} onChangeText={setVehicleNumber} autoCapitalize="characters" />
          </Field>

          <Field label="EMAIL ADDRESS (OPTIONAL)" icon="mail-outline">
            <TextInput style={styles.input} placeholder="driver@smartitt.lk" placeholderTextColor={colors.textMuted} keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
          </Field>
        </View>

        {/* ─── Emergency Contact ─── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="medkit-outline" size={18} color={colors.warning} />
            <Text style={[styles.cardHeaderText, { color: colors.warning }]}>EMERGENCY CONTACT</Text>
          </View>

          <Field label="EMERGENCY CONTACT NAME *" icon="person-outline">
            <TextInput style={styles.input} placeholder="e.g. H.M. Silva" placeholderTextColor={colors.textMuted} value={emergencyContactName} onChangeText={setEmergencyContactName} />
          </Field>

          <Field label="EMERGENCY CONTACT PHONE *" icon="call-outline">
            <TextInput style={styles.input} placeholder="e.g. 0719876543" placeholderTextColor={colors.textMuted} keyboardType="phone-pad" value={emergencyContactNumber} onChangeText={setEmergencyContactNumber} />
          </Field>
        </View>

        {/* ─── Password ─── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="shield-checkmark-outline" size={18} color={colors.tertiaryContainer} />
            <Text style={[styles.cardHeaderText, { color: colors.tertiaryContainer }]}>ACCOUNT PASSWORD</Text>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>PASSWORD *</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="lock-closed-outline" size={16} color={colors.onSurfaceVariant} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="••••••••"
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(!showPassword)}>
                <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={18} color={colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>CONFIRM PASSWORD *</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="lock-closed-outline" size={16} color={colors.onSurfaceVariant} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="••••••••"
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!showPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
            </View>
          </View>

          {/* Password Checklist */}
          <View style={styles.checklist}>
            {[
              { ok: hasMinLength, label: 'At least 8 characters' },
              { ok: hasUpperCase, label: 'Uppercase letter (A-Z)' },
              { ok: hasLowerCase, label: 'Lowercase letter (a-z)' },
              { ok: hasNumber, label: 'Number (0-9)' },
              { ok: hasSpecial, label: 'Special character (!@#$%...)' },
            ].map(({ ok, label }) => (
              <View key={label} style={styles.checkRow}>
                <Ionicons
                  name={ok ? 'checkmark-circle' : 'ellipse-outline'}
                  size={14}
                  color={ok ? colors.primaryContainer : colors.outline}
                />
                <Text style={[styles.checkText, ok && styles.checkTextOk]}>{label}</Text>
              </View>
            ))}
            {confirmPassword.length > 0 && (
              <View style={styles.checkRow}>
                <Ionicons
                  name={passwordsMatch ? 'checkmark-circle' : 'close-circle'}
                  size={14}
                  color={passwordsMatch ? colors.primaryContainer : colors.error}
                />
                <Text style={[styles.checkText, { color: passwordsMatch ? colors.primaryContainer : colors.error }]}>
                  {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Auto-Code Notice */}
        <View style={styles.noticeBox}>
          <Ionicons name="information-circle-outline" size={18} color={colors.primaryFixedDim} />
          <Text style={styles.noticeText}>
            A unique <Text style={{ color: colors.primaryContainer, fontWeight: '800' }}>Driver Code</Text> (e.g. DRV-00125) will be automatically generated after sign-up. You'll use it to log in.
          </Text>
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
          onPress={handleRegister}
          disabled={loading}
          activeOpacity={0.9}
        >
          {loading ? (
            <ActivityIndicator color={colors.onPrimaryContainer} />
          ) : (
            <>
              <Ionicons name="person-add" size={20} color={colors.onPrimaryContainer} />
              <Text style={styles.submitBtnText}>CREATE DRIVER ACCOUNT</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.loginLink} onPress={() => router.push('/(auth)/login')}>
          <Text style={styles.loginLinkText}>
            Already have an account? <Text style={styles.loginLinkBold}>Sign In</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ─── SUCCESS MODAL ─── */}
      <Modal visible={successModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.successCard}>
            <View style={styles.successIconWrap}>
              <Ionicons name="checkmark-circle" size={56} color={colors.primaryContainer} />
            </View>

            <Text style={styles.successTitle}>Registration Successful!</Text>
            <Text style={styles.successSub}>Welcome to Smart ITT</Text>

            {/* Driver Code Box */}
            <View style={styles.driverCodeBox}>
              <Text style={styles.driverCodeLabel}>YOUR UNIQUE DRIVER CODE</Text>
              <Text style={styles.driverCodeValue}>{generatedDriverCode}</Text>
              <TouchableOpacity style={styles.copyBtn} onPress={handleCopyCode} activeOpacity={0.8}>
                <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={16} color={colors.onPrimaryContainer} />
                <Text style={styles.copyBtnText}>{copied ? 'Copied!' : 'Copy Driver Code'}</Text>
              </TouchableOpacity>
            </View>

            {/* Login Instructions */}
            <View style={styles.loginInstructions}>
              <Text style={styles.loginInstrTitle}>Login Instructions</Text>
              <View style={styles.loginInstrRow}>
                <Text style={styles.loginInstrKey}>Username:</Text>
                <Text style={styles.loginInstrVal}>{generatedDriverCode}</Text>
              </View>
              <View style={styles.loginInstrRow}>
                <Text style={styles.loginInstrKey}>Password:</Text>
                <Text style={styles.loginInstrVal}>Your registered password</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.continueBtn} onPress={handleContinueToLogin} activeOpacity={0.88}>
              <Text style={styles.continueBtnText}>CONTINUE TO LOGIN</Text>
              <Ionicons name="arrow-forward" size={18} color={colors.onPrimaryContainer} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, paddingBottom: 60 },

  topBar: { paddingHorizontal: spacing.md, paddingTop: 52, paddingBottom: spacing.sm },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  backBtnText: { color: colors.primaryFixedDim, fontSize: 13, fontWeight: '600' },

  hero: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  logoBadge: {
    width: 44, height: 44, borderRadius: radius.md,
    backgroundColor: colors.primaryContainer, alignItems: 'center', justifyContent: 'center',
    ...shadow.glow,
  },
  logoLetters: { color: colors.onPrimaryContainer, fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  brandName: { color: colors.onBackground, fontSize: 20, fontWeight: '800' },
  brandSub: { color: colors.primaryFixedDim, fontSize: 11, fontWeight: '600' },
  heroTitle: { fontSize: 28, fontWeight: '900', color: colors.onBackground },
  heroDesc: { color: colors.onSurfaceVariant, fontSize: 13, lineHeight: 20, marginTop: 6 },

  card: {
    marginHorizontal: spacing.md, marginBottom: spacing.md,
    backgroundColor: colors.surfaceContainer, borderRadius: radius.xl,
    padding: spacing.lg, borderWidth: 1, borderColor: colors.outlineVariant,
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.md,
    paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.outlineVariant,
  },
  cardHeaderText: { fontSize: 11, fontWeight: '800', color: colors.primaryFixedDim, letterSpacing: 1 },

  fieldGroup: { marginBottom: spacing.sm },
  fieldLabel: { fontSize: 10, fontWeight: '800', color: colors.onSurfaceVariant, letterSpacing: 0.8, marginBottom: 5 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow, borderRadius: radius.DEFAULT,
    borderWidth: 1, borderColor: colors.outline, paddingHorizontal: spacing.sm, minHeight: 46,
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 14, color: colors.onSurface, height: 46 },
  multilineInput: { height: 64, textAlignVertical: 'top', paddingTop: 10 },
  eyeBtn: { padding: 6 },

  checklist: {
    backgroundColor: colors.surfaceContainerLow, padding: spacing.md,
    borderRadius: radius.DEFAULT, borderWidth: 1, borderColor: colors.outlineVariant,
    marginTop: spacing.sm,
  },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  checkText: { fontSize: 12, color: colors.onSurfaceVariant },
  checkTextOk: { color: colors.primaryContainer, fontWeight: '600' },

  noticeBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    marginHorizontal: spacing.md, marginBottom: spacing.md,
    backgroundColor: 'rgba(0,229,255,0.07)', borderRadius: radius.DEFAULT,
    padding: spacing.md, borderWidth: 1, borderColor: 'rgba(0,229,255,0.2)',
  },
  noticeText: { flex: 1, fontSize: 13, color: colors.onSurfaceVariant, lineHeight: 20 },

  submitBtn: {
    flexDirection: 'row', height: 56, backgroundColor: colors.primaryContainer,
    marginHorizontal: spacing.md, borderRadius: radius.DEFAULT,
    alignItems: 'center', justifyContent: 'center', gap: 8, ...shadow.glow,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: colors.onPrimaryContainer, fontSize: 15, fontWeight: '900', letterSpacing: 0.5 },

  loginLink: { marginTop: spacing.md, alignItems: 'center', paddingVertical: 8 },
  loginLinkText: { color: colors.onSurfaceVariant, fontSize: 13 },
  loginLinkBold: { color: colors.primaryFixedDim, fontWeight: '700' },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center', alignItems: 'center', padding: spacing.lg,
  },
  successCard: {
    backgroundColor: colors.surfaceContainer, borderRadius: radius.xl,
    padding: spacing.xl, width: '100%', maxWidth: 420,
    borderWidth: 1, borderColor: colors.primaryContainer, alignItems: 'center',
    ...shadow.glow,
  },
  successIconWrap: { marginBottom: spacing.md },
  successTitle: { fontSize: 22, fontWeight: '900', color: colors.onSurface, textAlign: 'center' },
  successSub: { fontSize: 14, color: colors.onSurfaceVariant, marginTop: 4, textAlign: 'center', marginBottom: spacing.lg },

  driverCodeBox: {
    width: '100%', backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.lg, padding: spacing.lg, alignItems: 'center',
    borderWidth: 2, borderColor: colors.primaryContainer, marginBottom: spacing.md,
  },
  driverCodeLabel: { fontSize: 10, fontWeight: '800', color: colors.primaryFixedDim, letterSpacing: 1.5 },
  driverCodeValue: {
    fontSize: 36, fontWeight: '900', color: colors.onSurface,
    fontFamily: 'monospace', marginVertical: spacing.sm, letterSpacing: 2,
    ...shadow.glow,
  },
  copyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.primaryContainer, paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: radius.DEFAULT, marginTop: 4,
  },
  copyBtnText: { color: colors.onPrimaryContainer, fontSize: 12, fontWeight: '700' },

  loginInstructions: {
    width: '100%', backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.DEFAULT, padding: spacing.md, marginBottom: spacing.lg,
    borderWidth: 1, borderColor: colors.outlineVariant,
  },
  loginInstrTitle: { fontSize: 11, fontWeight: '800', color: colors.onSurface, marginBottom: 8, letterSpacing: 0.5 },
  loginInstrRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  loginInstrKey: { fontSize: 13, color: colors.onSurfaceVariant, fontWeight: '700', width: 80 },
  loginInstrVal: { fontSize: 13, color: colors.primaryContainer, fontFamily: 'monospace', fontWeight: '700', flex: 1 },

  continueBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: colors.primaryContainer, borderRadius: radius.DEFAULT,
    height: 52, width: '100%', ...shadow.glow,
  },
  continueBtnText: { color: colors.onPrimaryContainer, fontSize: 15, fontWeight: '900', letterSpacing: 0.5 },
});
