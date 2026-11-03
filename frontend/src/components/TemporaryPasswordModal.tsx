import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Colors, Typography, Layout, Spacing } from '../constants/theme';

interface TemporaryPasswordModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  username: string;
  temporaryPassword: string;
  roleName?: string;
}

export const TemporaryPasswordModal: React.FC<TemporaryPasswordModalProps> = ({
  visible,
  onClose,
  title = 'Temporary Credentials Generated',
  username,
  temporaryPassword,
  roleName,
}) => {
  const [copied, setCopied] = useState(false);
  const theme = Colors.light;

  const handleCopy = async () => {
    try {
      await Clipboard.setStringAsync(temporaryPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(temporaryPassword);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <View style={styles.headerRow}>
            <View style={[styles.iconCircle, { backgroundColor: theme.accentSoft }]}>
              <Ionicons name="key-outline" size={24} color={theme.accent} />
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.title, Typography.sectionTitle]}>{title}</Text>
          <Text style={[styles.subtitle, Typography.label]}>
            Share these temporary login details with the {roleName || 'user'}.
          </Text>

          <View style={[styles.infoBlock, { backgroundColor: theme.backgroundSurfaceLow, borderColor: theme.border }]}>
            <View style={styles.fieldRow}>
              <Text style={[styles.fieldLabel, Typography.label]}>USERNAME</Text>
              <Text style={[styles.fieldValue, { color: theme.text }]}>{username || '-'}</Text>
            </View>

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <View style={styles.fieldRow}>
              <Text style={[styles.fieldLabel, Typography.label]}>TEMPORARY PASSWORD</Text>
              <View style={styles.passwordContainer}>
                <Text style={[styles.passwordText, { color: theme.accent }]}>
                  {temporaryPassword || '-'}
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.copyButton,
              { backgroundColor: copied ? theme.statusApprovedBg : theme.accentSoft, borderColor: copied ? theme.statusApprovedText : theme.accent }
            ]}
            onPress={handleCopy}
            activeOpacity={0.8}
          >
            <Ionicons
              name={copied ? 'checkmark-circle' : 'copy-outline'}
              size={18}
              color={copied ? theme.statusApprovedText : theme.accent}
            />
            <Text
              style={[
                styles.copyButtonText,
                { color: copied ? theme.statusApprovedText : theme.accent }
              ]}
            >
              {copied ? 'Copied to Clipboard!' : 'Copy Password'}
            </Text>
          </TouchableOpacity>

          <View style={[styles.warningBox, { backgroundColor: theme.statusPendingBg, borderColor: theme.warning }]}>
            <Ionicons name="alert-circle-outline" size={18} color={theme.warning} style={{ marginTop: 1 }} />
            <Text style={[styles.warningText, { color: theme.warning }]}>
              The user must change this password on first login.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.doneButton, { backgroundColor: theme.accent }]}
            onPress={onClose}
            activeOpacity={0.85}
          >
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.two,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    borderRadius: Layout.radius,
    borderWidth: Layout.borderWidth,
    padding: Spacing.three,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtn: {
    padding: 4,
  },
  title: {
    marginBottom: Spacing.half,
  },
  subtitle: {
    marginBottom: Spacing.two,
  },
  infoBlock: {
    borderRadius: 8,
    borderWidth: 1,
    padding: Spacing.two,
    marginBottom: Spacing.two,
  },
  fieldRow: {
    marginVertical: 4,
  },
  fieldLabel: {
    fontSize: 11,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  fieldValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  passwordContainer: {
    paddingVertical: 4,
  },
  passwordText: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1.5,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  divider: {
    height: 1,
    marginVertical: 8,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: Spacing.two,
  },
  copyButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: Spacing.two,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: Spacing.three,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  doneButton: {
    alignItems: 'center',
    justifyContent: 'center',
    height: Layout.minTapTarget,
    borderRadius: 8,
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});

