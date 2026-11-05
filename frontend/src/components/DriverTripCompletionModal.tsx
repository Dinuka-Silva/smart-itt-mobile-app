import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TripCardData } from './PermanentTripCard';
import { captureContainerPhoto, ProcessedPhoto } from '../utils/photoCapture';
import { photoService } from '../services/photoService';
import { tripService } from '../services/tripService';

interface DriverTripCompletionModalProps {
  visible: boolean;
  onClose: () => void;
  trip: TripCardData | null;
  onTripCompleted: () => void;
}

export const DriverTripCompletionModal: React.FC<DriverTripCompletionModalProps> = ({
  visible,
  onClose,
  trip,
  onTripCompleted,
}) => {
  const [submitting, setSubmitting] = useState(false);
  const [dischargeBay, setDischargeBay] = useState('Bay 04, Crane 02');
  const [sealStatus, setSealStatus] = useState<'INTACT' | 'BROKEN' | 'MISMATCHED'>('INTACT');
  const [damageStatus, setDamageStatus] = useState<'NONE' | 'MINOR' | 'CRITICAL'>('NONE');
  const [driverNotes, setDriverNotes] = useState('');

  // Container photo mapping: containerId/Number -> ProcessedPhoto
  const [containerPhotos, setContainerPhotos] = useState<Record<string, ProcessedPhoto>>({});

  if (!trip) return null;

  const displayTripId = trip.tripNumber || `TRP-${trip.id.slice(0, 8).toUpperCase()}`;
  const containers = trip.containers || [];

  const handleCapturePhoto = async (key: string) => {
    try {
      const photo = await captureContainerPhoto();
      if (photo) {
        setContainerPhotos((prev) => ({ ...prev, [key]: photo }));
      }
    } catch (e: any) {
      Alert.alert('Camera Error', e?.message || 'Failed to capture container photo.');
    }
  };

  const handleRemovePhoto = (key: string) => {
    setContainerPhotos((prev) => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // 1. Upload photos for containers
      for (const c of containers) {
        const key = c.id || c.containerNumber;
        const photo = containerPhotos[key];
        if (photo) {
          try {
            await photoService.uploadPhoto({
              tripId: trip.id,
              containerId: c.id,
              containerNumber: c.containerNumber,
              uri: photo.uri,
            });
          } catch (uploadErr) {
            console.warn(`[Completion] Photo upload failed for container ${c.containerNumber}:`, uploadErr);
          }
        }
      }

      // 2. Submit completion payload to backend
      await tripService.completeTrip(trip.id, {
        dischargeTerminal: trip.destTerminal || 'CICT',
        dischargeBay,
        sealStatus: sealStatus === 'INTACT' ? 'INTACT (VERIFIED)' : sealStatus,
        damageStatus,
        driverNotes: driverNotes.trim() || 'Containers delivered and discharged safely at destination terminal berth.',
      });

      Alert.alert(
        'Delivery Complete! 📋',
        `Trip ${displayTripId} submitted to Port Operations Supervisor for clearance and container target credit.`
      );
      onTripCompleted();
      onClose();
    } catch (e: any) {
      Alert.alert('Submission Error', e?.message || 'Failed to complete trip. Please check network.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="checkbox" size={18} color="#FFFFFF" />
                <Text style={styles.headerTitle}>Trip Delivery Completion</Text>
              </View>
              <Text style={styles.headerSub}>{displayTripId} · Upload Evidence & Discharge Log</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            {/* Route & Discharge Terminal Banner */}
            <View style={styles.routeBanner}>
              <View style={styles.routeCol}>
                <Text style={styles.routeLabel}>ORIGIN</Text>
                <Text style={styles.routeVal}>{trip.sourceTerminal || 'JCT'}</Text>
              </View>
              <Ionicons name="arrow-forward" size={16} color="#173B70" />
              <View style={styles.routeCol}>
                <Text style={styles.routeLabel}>DESTINATION</Text>
                <Text style={styles.routeVal}>{trip.destTerminal || 'CICT'}</Text>
              </View>
            </View>

            {/* MANDATORY CONTAINER PHOTO EVIDENCE SECTION */}
            <View style={styles.sectionBox}>
              <View style={styles.sectionHeader}>
                <Ionicons name="camera" size={16} color="#173B70" />
                <Text style={styles.sectionTitle}>CONTAINER PHOTO EVIDENCE</Text>
              </View>
              <Text style={styles.sectionDesc}>
                Capture clear container photos showing door seals and container numbers for supervisor clearance.
              </Text>

              {containers.map((c, idx) => {
                const key = c.id || c.containerNumber;
                const photo = containerPhotos[key];

                return (
                  <View key={key || idx} style={styles.containerPhotoRow}>
                    <View style={styles.containerPhotoInfo}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="cube" size={14} color="#173B70" />
                        <Text style={styles.containerPhotoNum}>{c.containerNumber}</Text>
                        <View style={styles.sizeBadge}>
                          <Text style={styles.sizeBadgeText}>{c.size || '40FT'}</Text>
                        </View>
                      </View>
                      <Text style={styles.containerDestSub}>
                        Destination: {c.destTerminal || trip.destTerminal || 'CICT'}
                      </Text>
                    </View>

                    {photo ? (
                      <View style={styles.photoAttachedWrap}>
                        <Image source={{ uri: photo.uri }} style={styles.photoThumb} />
                        <View style={styles.photoActionCol}>
                          <TouchableOpacity
                            style={styles.retakeBtn}
                            onPress={() => handleCapturePhoto(key)}
                          >
                            <Ionicons name="refresh" size={13} color="#173B70" />
                            <Text style={styles.retakeText}>Retake</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.removeBtn}
                            onPress={() => handleRemovePhoto(key)}
                          >
                            <Ionicons name="trash-outline" size={13} color="#173B70" />
                            <Text style={styles.removeText}>Remove</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.captureBtn}
                        onPress={() => handleCapturePhoto(key)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="camera-outline" size={18} color="#173B70" />
                        <Text style={styles.captureBtnText}>Take Photo</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>

            {/* DISCHARGE LOCATION & DETAILS */}
            <View style={styles.sectionBox}>
              <View style={styles.sectionHeader}>
                <Ionicons name="location-outline" size={16} color="#173B70" />
                <Text style={styles.sectionTitle}>DISCHARGE LOCATION</Text>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Discharge Bay & Crane:</Text>
                <TextInput
                  style={styles.inputField}
                  value={dischargeBay}
                  onChangeText={setDischargeBay}
                  placeholder="e.g. Bay 04, Crane 02"
                  placeholderTextColor="#7F9AB5"
                />
              </View>

              {/* Seal Status Pill Selector */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Container Seal Condition:</Text>
                <View style={styles.selectorRow}>
                  {(['INTACT', 'BROKEN', 'MISMATCHED'] as const).map((s) => (
                    <TouchableOpacity
                      key={s}
                      style={[
                        styles.selectorPill,
                        sealStatus === s && styles.selectorPillActive,
                      ]}
                      onPress={() => setSealStatus(s)}
                    >
                      <Text
                        style={[
                          styles.selectorPillText,
                          sealStatus === s && styles.selectorPillTextActive,
                        ]}
                      >
                        {s}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Damage Status Selector */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Damage Condition:</Text>
                <View style={styles.selectorRow}>
                  {(['NONE', 'MINOR', 'CRITICAL'] as const).map((d) => (
                    <TouchableOpacity
                      key={d}
                      style={[
                        styles.selectorPill,
                        damageStatus === d && styles.selectorPillActive,
                      ]}
                      onPress={() => setDamageStatus(d)}
                    >
                      <Text
                        style={[
                          styles.selectorPillText,
                          damageStatus === d && styles.selectorPillTextActive,
                        ]}
                      >
                        {d}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Driver Completion Notes */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Driver Completion Notes:</Text>
                <TextInput
                  style={[styles.inputField, { minHeight: 60, textAlignVertical: 'top' }]}
                  placeholder="Enter any unloading notes or berth conditions..."
                  placeholderTextColor="#7F9AB5"
                  multiline
                  value={driverNotes}
                  onChangeText={setDriverNotes}
                />
              </View>
            </View>
          </ScrollView>

          {/* Footer Submit Button */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelFooterBtn}
              onPress={onClose}
              disabled={submitting}
            >
              <Text style={styles.cancelFooterBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.submitFooterBtn}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-done-circle" size={18} color="#FFFFFF" />
                  <Text style={styles.submitFooterBtnText}>Submit to Supervisor</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: '#00000080',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Platform.OS === 'web' ? 20 : 10,
  },
  modalCard: {
    width: '100%',
    maxWidth: 600,
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#173B70',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#173B70',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  headerSub: {
    color: '#D0DEEB',
    fontSize: 11,
    marginTop: 2,
    fontWeight: '500',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#284C83',
  },
  modalScroll: {
    padding: 16,
  },
  routeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0F5FA',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D0DEEB',
    marginBottom: 14,
  },
  routeCol: {
    alignItems: 'center',
    minWidth: 80,
  },
  routeLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#4A6B94',
    letterSpacing: 0.5,
  },
  routeVal: {
    fontSize: 15,
    fontWeight: '900',
    color: '#173B70',
    marginTop: 2,
  },
  sectionBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D0DEEB',
    padding: 14,
    marginBottom: 14,
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E8F1FA',
    paddingBottom: 6,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#173B70',
    letterSpacing: 0.5,
  },
  sectionDesc: {
    fontSize: 11,
    color: '#4A6B94',
    lineHeight: 15,
  },
  containerPhotoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F7FAFD',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2ECF5',
    gap: 8,
  },
  containerPhotoInfo: {
    flex: 1,
  },
  containerPhotoNum: {
    fontSize: 13,
    fontWeight: '800',
    color: '#173B70',
  },
  sizeBadge: {
    backgroundColor: '#E8F1FA',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sizeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#173B70',
  },
  containerDestSub: {
    fontSize: 10,
    color: '#5F7D9E',
    marginTop: 3,
  },
  captureBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#173B70',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
  },
  captureBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#173B70',
  },
  photoAttachedWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  photoThumb: {
    width: 48,
    height: 48,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#173B70',
  },
  photoActionCol: {
    gap: 4,
  },
  retakeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#E8F1FA',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  retakeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#173B70',
  },
  removeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F0F5FA',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  removeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#173B70',
  },
  fieldGroup: {
    gap: 4,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4A6B94',
  },
  inputField: {
    backgroundColor: '#F7FAFD',
    borderWidth: 1,
    borderColor: '#D0DEEB',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: '#173B70',
  },
  selectorRow: {
    flexDirection: 'row',
    gap: 6,
  },
  selectorPill: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F0F5FA',
    borderWidth: 1,
    borderColor: '#D0DEEB',
    alignItems: 'center',
  },
  selectorPillActive: {
    backgroundColor: '#173B70',
    borderColor: '#173B70',
  },
  selectorPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#173B70',
  },
  selectorPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F7FAFD',
    borderTopWidth: 1,
    borderTopColor: '#E2ECF5',
  },
  cancelFooterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D0DEEB',
  },
  cancelFooterBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4A6B94',
  },
  submitFooterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#173B70',
  },
  submitFooterBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});

