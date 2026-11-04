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
            <Ionicons name="shield-outline" size={30} color="#173B70" />
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
              <View style={styles.btnIconWrapBlue}>
                <Ionicons name="swap-horizontal" size={18} color="#173B70" />
              </View>
              <View style={styles.btnTextWrap}>
                <Text style={styles.switchAccountTitle}>Switch Account</Text>
                <Text style={styles.switchAccountSubtitle}>Go to Operator Login (Drivers / Supervisors)</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#173B70" />
            </TouchableOpacity>

            {/* Sign Out to Admin Login */}
            <TouchableOpacity
              style={styles.signOutBtn}
              onPress={() => handleAction('/(admin)/login')}
              disabled={loading}
              activeOpacity={0.8}
            >
              <View style={styles.btnIconWrapRed}>
                <Ionicons name="log-out-outline" size={18} color="#DC2626" />
              </View>
              <View style={styles.btnTextWrap}>
                <Text style={styles.signOutTitle}>Sign Out</Text>
                <Text style={styles.signOutSubtitle}>End session & return to Admin Login</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#DC2626" />
            </TouchableOpacity>

            {/* Cancel Button */}
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              disabled={loading}
              activeOpacity={0.7}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#173B70" />
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
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F0F5FA',
    borderWidth: 1,
    borderColor: '#173B70',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  message: {
    fontSize: 13,
    color: '#3A567F',
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
    borderRadius: 10,
    backgroundColor: '#F0F5FA',
    borderWidth: 1,
    borderColor: '#173B70',
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#DC2626',
  },
  btnIconWrapBlue: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  btnIconWrapRed: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  btnTextWrap: {
    flex: 1,
  },
  switchAccountTitle: {
    color: '#173B70',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  switchAccountSubtitle: {
    color: '#3A567F',
    fontSize: 11,
    marginTop: 2,
  },
  signOutTitle: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  signOutSubtitle: {
    color: '#3A567F',
    fontSize: 11,
    marginTop: 2,
  },
  cancelBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F0F5FA', borderWidth: 1.5, borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  cancelText: {
    color: '#173B70',
    fontWeight: '700',
    fontSize: 13,
  },
});

export default AdminSignOutModal;
