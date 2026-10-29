import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/authStore';

interface AdminSignOutModalProps {
  visible: boolean;
  onClose: () => void;
}

export const AdminSignOutModal: React.FC<AdminSignOutModalProps> = ({ visible, onClose }) => {
  const router = useRouter();
  const { logout, user } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const handleAction = async (target: '/(auth)/login' | '/(admin)/login') => {
    setLoading(true);
    try {
      await logout(target);
      onClose();
      router.replace(target);
    } catch (e) {
      console.warn('Logout error:', e);
      onClose();
      router.replace(target);
    } finally {
      setLoading(false);
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
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Ionicons name="shield-outline" size={30} color="#00e5ff" />
          </View>
          <Text style={styles.title}>Admin Session Actions</Text>
          <Text style={styles.message}>
            Currently authenticated as {user?.name || user?.fullName || 'Administrator'}. Choose an action below:
          </Text>

          <View style={styles.actionColumn}>
            {/* Switch Account */}
            <TouchableOpacity
              style={styles.switchAccountBtn}
              onPress={() => handleAction('/(auth)/login')}
              disabled={loading}
              activeOpacity={0.8}
            >
              <View style={styles.btnIconWrapCyan}>
                <Ionicons name="swap-horizontal" size={18} color="#00e5ff" />
              </View>
              <View style={styles.btnTextWrap}>
                <Text style={styles.switchAccountTitle}>Switch Account</Text>
                <Text style={styles.switchAccountSubtitle}>Go to Operator Login (Drivers / Supervisors)</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#00e5ff" />
            </TouchableOpacity>

            {/* Sign Out to Admin Login */}
            <TouchableOpacity
              style={styles.signOutBtn}
              onPress={() => handleAction('/(admin)/login')}
              disabled={loading}
              activeOpacity={0.8}
            >
              <View style={styles.btnIconWrapRed}>
                <Ionicons name="log-out-outline" size={18} color="#f43f5e" />
              </View>
              <View style={styles.btnTextWrap}>
                <Text style={styles.signOutTitle}>Sign Out</Text>
                <Text style={styles.signOutSubtitle}>End session & return to Admin Login</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#f43f5e" />
            </TouchableOpacity>

            {/* Cancel Button */}
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              disabled={loading}
              activeOpacity={0.7}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#90caf9" />
              ) : (
                <Text style={styles.cancelText}>Cancel</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 17, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#0c192c',
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 12,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 229, 255, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 229, 255, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  message: {
    fontSize: 13,
    color: '#90a4ae',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  actionColumn: {
    width: '100%',
    gap: 10,
  },
  switchAccountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 229, 255, 0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 229, 255, 0.35)',
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(244, 63, 94, 0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(244, 63, 94, 0.35)',
  },
  btnIconWrapCyan: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0, 229, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  btnIconWrapRed: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(244, 63, 94, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  btnTextWrap: {
    flex: 1,
  },
  switchAccountTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  switchAccountSubtitle: {
    color: '#80deea',
    fontSize: 11,
    marginTop: 2,
  },
  signOutTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  signOutSubtitle: {
    color: '#fda4af',
    fontSize: 11,
    marginTop: 2,
  },
  cancelBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  cancelText: {
    color: '#b0bec5',
    fontWeight: '700',
    fontSize: 13,
  },
});

export default AdminSignOutModal;
