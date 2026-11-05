import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { colors } from '../theme';

interface PhotoLightboxModalProps {
  visible: boolean;
  onClose: () => void;
  photoUrl: string;
  containerNumber?: string;
  tripId?: string;
  verificationStatus?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  rejectionNote?: string;
}

export const PhotoLightboxModal: React.FC<PhotoLightboxModalProps> = ({
  visible,
  onClose,
  photoUrl,
  containerNumber,
  tripId,
  verificationStatus,
  verifiedBy,
  verifiedAt,
  rejectionNote,
}) => {
  const [scale, setScale] = useState(1);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const zoomIn = () => setScale((s) => Math.min(s + 0.3, 3));
  const zoomOut = () => setScale((s) => Math.max(s - 0.3, 0.7));
  const resetZoom = () => setScale(1);

  const handleDownload = async () => {
    if (!photoUrl) return;
    try {
      if (Platform.OS === 'web') {
        const a = document.createElement('a');
        a.href = photoUrl;
        a.download = `container-${containerNumber || 'photo'}-${Date.now()}.jpg`;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        await Linking.openURL(photoUrl);
      }
    } catch (e: any) {
      Alert.alert('Download Error', e?.message || 'Could not download container photo.');
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
        {/* Top Navigation Bar */}
        <View style={styles.topBar}>
          <View style={styles.titleWrap}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="camera" size={16} color="#FFFFFF" />
              <Text style={styles.headerTitle}>
                {containerNumber ? `Container: ${containerNumber}` : 'Container Evidence'}
              </Text>
            </View>
            {tripId ? <Text style={styles.headerSub}>Trip ID: {tripId}</Text> : null}
          </View>

          <View style={styles.topActions}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={handleDownload}
              activeOpacity={0.7}
            >
              <Ionicons name="download-outline" size={18} color="#FFFFFF" />
              <Text style={styles.actionBtnText}>Save</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Verification Status Banner */}
        {verificationStatus && (
          <View style={styles.statusBanner}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons
                name={
                  verificationStatus === 'VERIFIED'
                    ? 'checkmark-circle'
                    : verificationStatus === 'REJECTED'
                    ? 'alert-circle'
                    : 'time-outline'
                }
                size={16}
                color={
                  verificationStatus === 'VERIFIED'
                    ? '#2ECC71'
                    : verificationStatus === 'REJECTED'
                    ? '#FF6B6B'
                    : '#F1C40F'
                }
              />
              <Text style={styles.statusText}>
                EVIDENCE STATUS: {verificationStatus}
                {verifiedBy ? ` · Inspected by ${verifiedBy}` : ''}
              </Text>
            </View>
            {rejectionNote ? (
              <Text style={styles.rejectionText}>Reason: {rejectionNote}</Text>
            ) : null}
          </View>
        )}

        {/* Image Canvas */}
        <View style={styles.canvas}>
          {loading && !hasError && (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color="#FFFFFF" />
              <Text style={styles.loadingText}>Loading Container Photo...</Text>
            </View>
          )}

          {hasError ? (
            <View style={styles.errorWrap}>
              <Ionicons name="image-outline" size={48} color="#FFFFFF" />
              <Text style={styles.errorText}>Photo could not be loaded</Text>
              <Text style={styles.errorSub}>The file may have been moved or unavailable.</Text>
            </View>
          ) : (
            <Image
              source={{ uri: photoUrl }}
              style={[
                styles.image,
                { transform: [{ scale }] },
              ]}
              resizeMode="contain"
              onLoadStart={() => setLoading(true)}
              onLoadEnd={() => setLoading(false)}
              onError={() => {
                setLoading(false);
                setHasError(true);
              }}
            />
          )}
        </View>

        {/* Floating Zoom Controls */}
        <View style={styles.zoomControls}>
          <TouchableOpacity style={styles.zoomBtn} onPress={zoomOut} activeOpacity={0.8}>
            <Ionicons name="remove" size={20} color="#173B70" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.zoomResetBtn} onPress={resetZoom} activeOpacity={0.8}>
            <Text style={styles.zoomResetText}>{Math.round(scale * 100)}%</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.zoomBtn} onPress={zoomIn} activeOpacity={0.8}>
            <Ionicons name="add" size={20} color="#173B70" />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#0B1A30EE',
    justifyContent: 'space-between',
  },
  topBar: {
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: '#173B70',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#284C83',
  },
  titleWrap: {
    flex: 1,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  headerSub: {
    color: '#D0DEEB',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#284C83',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#3D619A',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#284C83',
  },
  statusBanner: {
    backgroundColor: '#173B70',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#284C83',
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  rejectionText: {
    color: '#FFBABA',
    fontSize: 11,
    marginTop: 3,
    fontWeight: '600',
  },
  canvas: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  loadingWrap: {
    position: 'absolute',
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    color: '#D0DEEB',
    fontSize: 13,
    fontWeight: '600',
  },
  errorWrap: {
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 30,
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 6,
  },
  errorSub: {
    color: '#A0B4CC',
    fontSize: 12,
    textAlign: 'center',
  },
  zoomControls: {
    flexDirection: 'row',
    alignSelf: 'center',
    marginBottom: Platform.OS === 'ios' ? 40 : 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 8,
    paddingVertical: 6,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  zoomBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F0F5FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomResetBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  zoomResetText: {
    color: '#173B70',
    fontSize: 13,
    fontWeight: '800',
  },
});
