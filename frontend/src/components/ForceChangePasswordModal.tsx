import React, { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Layout, Spacing } from '../constants/theme';
import { authService } from '../services/authService';
import { securityValidator } from '../utils/securityValidator';

interface ForceChangePasswordModalProps {
  visible: boolean;
  username: string;
  initialCurrentPassword?: string;
  onSuccess: (newPassword: string) => void;
}

export const ForceChangePasswordModal: React.FC<ForceChangePasswordModalProps> = ({
  visible,
  username,
  initialCurrentPassword = '',
  onSuccess,
}) => {
  const [currentPassword, setCurrentPassword] = useState(initialCurrentPassword);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const theme = Colors.light;

  const strength = useMemo(() => {
    return securityValidator.evaluatePasswordStrength(newPassword);
  }, [newPassword]);

  const handleSubmit = async () => {
    setError(null);
    if (!currentPassword.trim()) {
      setError('Please enter your current temporary password.');
      return;
    }
    if (!newPassword.trim()) {
      setError('Please enter a new password.');
      return;
    }
    if (newPassword.trim() !== confirmPassword.trim()) {
      setError('Passwords do not match.');
      return;
    }
    if (newPassword.trim() === currentPassword.trim()) {
      setError('New password cannot be the same as your temporary password.');
      return;
    }
    if (!strength.isValid) {
      setError(strength.feedback[0] || 'Password does not meet the security policy.');
      return;
    }

    setLoading(true);
    try {
      await authService.changePassword({
        username,
        currentPassword: currentPassword.trim(),
        newPassword: newPassword.trim(),
        confirmPassword: confirmPassword.trim(),
      });
      onSuccess(newPassword.trim());
    } catch (err: any) {
      setError(err?.message || 'Failed to change password. Please check your current password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={() => {}}
    >
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              <View style={[styles.iconCircle, { backgroundColor: theme.statusPendingBg }]}>
                <Ionicons name="shield-checkmark" size={26} color={theme.warning} />
              </View>
              <Text style={[styles.title, Typography.sectionTitle]}>Change Password Required</Text>
              <Text style={[styles.subtitle, Typography.label]}>
                For your account security, you must set a new personal password on first login.
              </Text>
            </View>

            {error ? (
              <View style={[styles.errorBox, { backgroundColor: theme.statusRejectedBg, borderColor: theme.danger }]}>
                <Ionicons name="alert-circle" size={16} color={theme.danger} />
                <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text>
              </View>
            ) : null}

            {/* Current Temporary Password */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, Typography.label]}>CURRENT TEMPORARY PASSWORD</Text>
              <View style={[styles.inputContainer, { backgroundColor: theme.backgroundSurfaceLow, borderColor: theme.border }]}>
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  secureTextEntry={!showCurrent}
                  value={currentPassword}
                  onChangeText={(val) => {
                    setCurrentPassword(val);
                    setError(null);
                  }}
                  placeholder="Enter temporary password"
                  placeholderTextColor={theme.textHint}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)} style={styles.eyeBtn}>
                  <Ionicons name={showCurrent ? 'eye-off-outline' : 'eye-outline'} size={18} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* New Password */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, Typography.label]}>NEW PASSWORD</Text>
              <View style={[styles.inputContainer, { backgroundColor: theme.backgroundSurfaceLow, borderColor: theme.border }]}>
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  secureTextEntry={!showNew}
                  value={newPassword}
                  onChangeText={(val) => {
                    setNewPassword(val);
                    setError(null);
                  }}
                  placeholder="Minimum 8 characters"
                  placeholderTextColor={theme.textHint}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowNew(!showNew)} style={styles.eyeBtn}>
                  <Ionicons name={showNew ? 'eye-off-outline' : 'eye-outline'} size={18} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Strength Meter Bar */}
            {newPassword.length > 0 && (
              <View style={styles.strengthContainer}>
                <View style={styles.strengthBarBackground}>
                  <View
                    style={[
                      styles.strengthBarFill,
                      {
                        width: `${strength.score}%`,
                        backgroundColor: strength.color,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.strengthLevelText, { color: strength.color }]}>
                  Strength: {strength.level.replace('_', ' ')}
                </Text>
              </View>
            )}

            {/* Policy Rules */}
            <View style={[styles.rulesContainer, { backgroundColor: theme.backgroundSurfaceLow, borderColor: theme.border }]}>
              {strength.rules.map((rule) => (
                <View key={rule.id} style={styles.ruleRow}>
                  <Ionicons
                    name={rule.passed ? 'checkmark-circle' : 'ellipse-outline'}
                    size={14}
                    color={rule.passed ? theme.statusApprovedText : theme.textHint}
                  />
                  <Text
                    style={[
                      styles.ruleText,
                      { color: rule.passed ? theme.statusApprovedText : theme.textSecondary },
                    ]}
                  >
                    {rule.label}
                  </Text>
                </View>
              ))}
            </View>

            {/* Confirm Password */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, Typography.label]}>CONFIRM NEW PASSWORD</Text>
              <View style={[styles.inputContainer, { backgroundColor: theme.backgroundSurfaceLow, borderColor: theme.border }]}>
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  secureTextEntry={!showConfirm}
                  value={confirmPassword}
                  onChangeText={(val) => {
                    setConfirmPassword(val);
                    setError(null);
                  }}
                  placeholder="Re-enter new password"
                  placeholderTextColor={theme.textHint}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} style={styles.eyeBtn}>
                  <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={18} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                { backgroundColor: theme.accent, opacity: loading ? 0.7 : 1 },
              ]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>Save & Proceed to App</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.two,
  },
  card: {
    width: '100%',
    maxWidth: 460,
    maxHeight: '90%',
    borderRadius: Layout.radius,
    borderWidth: Layout.borderWidth,
    padding: Spacing.three,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.one,
  },
  title: {
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    textAlign: 'center',
    lineHeight: 18,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: Spacing.two,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
  },
  inputGroup: {
    marginBottom: Spacing.two,
  },
  inputLabel: {
    fontSize: 11,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: Layout.minTapTarget,
  },
  input: {
    flex: 1,
    fontSize: 15,
  },
  eyeBtn: {
    padding: 6,
  },
  strengthContainer: {
    marginBottom: Spacing.two,
  },
  strengthBarBackground: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5EAEC',
    overflow: 'hidden',
  },
  strengthBarFill: {
    height: '100%',
  },
  strengthLevelText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'right',
  },
  rulesContainer: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
    marginBottom: Spacing.two,
    gap: 4,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ruleText: {
    fontSize: 12,
  },
  submitButton: {
    height: Layout.minTapTarget,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.one,
    marginBottom: Spacing.two,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});

