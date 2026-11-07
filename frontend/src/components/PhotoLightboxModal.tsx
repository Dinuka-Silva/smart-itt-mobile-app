import React, { useState, useEffect, useRef } from 'react';
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
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import * as Clipboard from 'expo-clipboard';
import { photoService, PhotoUploadResponse } from '../services/photoService';

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
  const [rotation, setRotation] = useState<0 | 90 | 180 | 270>(0);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activePhotoUrl, setActivePhotoUrl] = useState(photoUrl);
  const [historyPhotos, setHistoryPhotos] = useState<PhotoUploadResponse[]>([]);
  const [activeHistoryIndex, setActiveHistoryIndex] = useState<number>(0);
  const [retryNonce, setRetryNonce] = useState(0);

  const lastTapRef = useRef<number>(0);

  // Sync photoUrl changes and load photo history
  useEffect(() => {
    if (visible) {
      setScale(1);
      setRotation(0);
      setLoading(true);
      setHasError(false);
      setCopied(false);
      setActivePhotoUrl(photoUrl);

      if (tripId && containerNumber) {
        photoService
          .getPhotoHistory(tripId, containerNumber)
          .then((history) => {
            if (history && history.length > 0) {
              setHistoryPhotos(history);
              setActiveHistoryIndex(0);
              const latest = history[0];
              if (latest.viewUrl) {
                setActivePhotoUrl(latest.viewUrl);
              }
            } else {
              setHistoryPhotos([]);
            }
          })
          .catch(() => setHistoryPhotos([]));
      } else {
        setHistoryPhotos([]);
      }
    }
  }, [visible, photoUrl, tripId, containerNumber]);

  const zoomIn = () => setScale((s) => Math.min(Number((s + 0.5).toFixed(2)), 3.5));
  const zoomOut = () => setScale((s) => Math.max(Number((s - 0.5).toFixed(2)), 0.6));
  const resetZoom = () => {
    setScale(1);
    setRotation(0);
  };

  const handleDoubleTap = () => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      // Toggle between 1x and 2.5x
      setScale((prev) => (prev > 1.2 ? 1 : 2.5));
    }
    lastTapRef.current = now;
  };

  const rotate90 = () => {
    setRotation((prev) => {
      if (prev === 0) return 90;
      if (prev === 90) return 180;
      if (prev === 180) return 270;
      return 0;
    });
  };

  const handleCopyContainer = async () => {
    if (!containerNumber) return;
    try {
      await Clipboard.setStringAsync(containerNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      Alert.alert('Copy failed', 'Unable to copy container number to clipboard.');
    }
  };

  const handleRetry = () => {
    setHasError(false);
    setLoading(true);
    setRetryNonce((n) => n + 1);
  };

  const handleDownload = async () => {
    const url = activePhotoUrl || photoUrl;
    if (!url) return;
    try {
      if (Platform.OS === 'web') {
        const a = document.createElement('a');
        a.href = url;
        a.download = `container-${containerNumber || 'photo'}-${Date.now()}.jpg`;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        await Linking.openURL(url);
      }
    } catch (e: any) {
      Alert.alert('Download Error', e?.message || 'Could not download container photo.');
    }
  };

  const effectivePhotoUri = `${activePhotoUrl || photoUrl}${
    retryNonce > 0 ? (activePhotoUrl.includes('?') ? '&' : '?') + `nonce=${retryNonce}` : ''
  }`;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        {/* Top Header */}
        <View style={styles.topBar}>
          <View style={styles.titleWrap}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="camera" size={16} color="#FFFFFF" />
              <Text style={styles.headerTitle}>Container Photo Evidence</Text>
            </View>
            {tripId ? <Text style={styles.headerSub}>Trip ID: {tripId}</Text> : null}
          </View>

          <View style={styles.topActions}>
            <TouchableOpacity style={styles.actionBtn} onPress={handleDownload} activeOpacity={0.7}>
              <Ionicons name="download-outline" size={16} color="#FFFFFF" />
              <Text style={styles.actionBtnText}>Save</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Prominent Container Number Bar for Direct Comparison */}
        {containerNumber ? (
          <View style={styles.containerCompareBar}>
            <View style={styles.containerInfoLeft}>
              <Text style={styles.containerLabel}>DRIVER ENTERED CONTAINER #</Text>
              <Text style={styles.containerNumberText}>{containerNumber}</Text>
            </View>

            <TouchableOpacity
              style={[styles.copyBtn, copied && styles.copyBtnSuccess]}
              onPress={handleCopyContainer}
              activeOpacity={0.8}
            >
              <Ionicons
                name={copied ? 'checkmark-circle' : 'copy-outline'}
                size={16}
                color={copied ? '#2ECC71' : '#FFFFFF'}
              />
              <Text style={[styles.copyBtnText, copied && styles.copyBtnTextSuccess]}>
                {copied ? 'Copied!' : 'Copy #'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Verification Status Banner */}
        {verificationStatus && (
          <View style={styles.statusBanner}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons
                name={
                  verificationStatus === 'VERIFIED' || verificationStatus === 'CONFIRMED'
                    ? 'checkmark-circle'
                    : verificationStatus === 'REJECTED'
                    ? 'alert-circle'
                    : 'time-outline'
                }
                size={16}
                color={
                  verificationStatus === 'VERIFIED' || verificationStatus === 'CONFIRMED'
                    ? '#2ECC71'
                    : verificationStatus === 'REJECTED'
                    ? '#FF6B6B'
                    : '#F1C40F'
                }
              />
              <Text style={styles.statusText}>
                STATUS: {verificationStatus}
                {verifiedBy ? ` · Reviewer: ${verifiedBy}` : ''}
                {verifiedAt ? ` on ${verifiedAt}` : ''}
              </Text>
            </View>
            {rejectionNote ? (
              <Text style={styles.rejectionText}>Reason: {rejectionNote}</Text>
            ) : null}
          </View>
        )}

        {/* Photo Upload History / Carousel (If multiple uploads exist) */}
        {historyPhotos.length > 1 && (
          <View style={styles.historyBar}>
            <Text style={styles.historyLabel}>Upload History ({historyPhotos.length} versions):</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.historyScroll}>
              {historyPhotos.map((p, idx) => {
                const isSelected = activeHistoryIndex === idx;
                return (
                  <TouchableOpacity
                    key={p.id || idx}
                    style={[styles.historyPill, isSelected && styles.historyPillActive]}
                    onPress={() => {
                      setActiveHistoryIndex(idx);
                      if (p.viewUrl) {
                        setActivePhotoUrl(p.viewUrl);
                        setLoading(true);
                        setHasError(false);
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                      size={12}
                      color={isSelected ? '#173B70' : '#D0DEEB'}
                    />
                    <Text style={[styles.historyPillText, isSelected && styles.historyPillTextActive]}>
                      {idx === 0 ? 'Latest (Current)' : `Attempt ${historyPhotos.length - idx}`}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Photo Canvas Area */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={handleDoubleTap}
          style={styles.canvas}
        >
          {loading && !hasError && (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color="#FFFFFF" />
              <Text style={styles.loadingText}>Loading Container Photo...</Text>
            </View>
          )}

          {hasError ? (
            <View style={styles.errorWrap}>
              <Ionicons name="image-outline" size={48} color="#FF6B6B" />
              <Text style={styles.errorText}>Photo failed to load</Text>
              <Text style={styles.errorSub}>The photo may be inaccessible or network failed.</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={handleRetry} activeOpacity={0.8}>
                <Ionicons name="refresh" size={16} color="#FFFFFF" />
                <Text style={styles.retryBtnText}>Retry Loading</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Image
              source={{ uri: effectivePhotoUri }}
              style={[
                styles.image,
                {
                  transform: [{ scale }, { rotate: `${rotation}deg` }],
                },
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
        </TouchableOpacity>

        {/* Floating Tool Controls: Zoom In, Reset, Zoom Out, Rotate 90 */}
        <View style={styles.floatingControls}>
          <TouchableOpacity style={styles.toolBtn} onPress={zoomOut} activeOpacity={0.8}>
            <Ionicons name="remove" size={18} color="#173B70" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.toolResetBtn} onPress={resetZoom} activeOpacity={0.8}>
            <Text style={styles.toolResetText}>{Math.round(scale * 100)}%</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.toolBtn} onPress={zoomIn} activeOpacity={0.8}>
            <Ionicons name="add" size={18} color="#173B70" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.rotateBtn} onPress={rotate90} activeOpacity={0.8}>
            <Ionicons name="refresh" size={16} color="#173B70" />
            <Text style={styles.rotateBtnText}>{rotation}°</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#071526FA',
    justifyContent: 'space-between',
  },
  topBar: {
    paddingTop: Platform.OS === 'ios' ? 52 : 24,
    paddingHorizontal: 16,
    paddingBottom: 12,
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
    fontSize: 11,
    marginTop: 2,
    fontWeight: '500',
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  containerCompareBar: {
    backgroundColor: '#0F2648',
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#284C83',
  },
  containerInfoLeft: {
    flex: 1,
  },
  containerLabel: {
    color: '#8BA6C9',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  containerNumberText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginTop: 2,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#173B70',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#3D619A',
  },
  copyBtnSuccess: {
    backgroundColor: '#0E3B28',
    borderColor: '#2ECC71',
  },
  copyBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  copyBtnTextSuccess: {
    color: '#2ECC71',
  },
  statusBanner: {
    backgroundColor: '#132C52',
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
  historyBar: {
    backgroundColor: '#0A1C35',
    paddingHorizontal: 16,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#173B70',
  },
  historyLabel: {
    color: '#8BA6C9',
    fontSize: 11,
    fontWeight: '700',
  },
  historyScroll: {
    gap: 6,
    paddingRight: 10,
  },
  historyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: '#173B70',
    borderWidth: 1,
    borderColor: '#284C83',
  },
  historyPillActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  historyPillText: {
    color: '#D0DEEB',
    fontSize: 10,
    fontWeight: '600',
  },
  historyPillTextActive: {
    color: '#173B70',
    fontWeight: '800',
  },
  canvas: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '95%',
    height: '95%',
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
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    backgroundColor: '#173B70',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3D619A',
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  floatingControls: {
    flexDirection: 'row',
    alignSelf: 'center',
    marginBottom: Platform.OS === 'ios' ? 36 : 18,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  toolBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F0F5FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  toolResetBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  toolResetText: {
    color: '#173B70',
    fontSize: 12,
    fontWeight: '800',
  },
  divider: {
    width: 1,
    height: 20,
    backgroundColor: '#D0DEEB',
    marginHorizontal: 2,
  },
  rotateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F0F5FA',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 14,
  },
  rotateBtnText: {
    color: '#173B70',
    fontSize: 12,
    fontWeight: '800',
  },
});
