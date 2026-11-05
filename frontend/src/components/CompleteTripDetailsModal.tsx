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
import * as Clipboard from 'expo-clipboard';
import { TripCardData } from './PermanentTripCard';
import { photoService } from '../services/photoService';
import { tripService } from '../services/tripService';
import { resolveCheNumber } from '../config/fleet';
import { formatTripTime } from '../utils/tripTerminalUtils';

interface CompleteTripDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  trip: TripCardData | null;
  role: 'DRIVER' | 'SUPERVISOR' | 'ADMIN';
  supervisorId?: string;
  onTripUpdated?: () => void;
  onOpenPhotoLightbox: (photoUrl: string, containerNumber: string) => void;
}

export const CompleteTripDetailsModal: React.FC<CompleteTripDetailsModalProps> = ({
  visible,
  onClose,
  trip,
  role,
  supervisorId,
  onTripUpdated,
  onOpenPhotoLightbox,
}) => {
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectionModalVisible, setRejectionModalVisible] = useState(false);
  const [tripRejectionReason, setTripRejectionReason] = useState('');

  // Per-photo rejection state
  const [rejectingPhotoId, setRejectingPhotoId] = useState<string | null>(null);
  const [photoRejectionNote, setPhotoRejectionNote] = useState('');

  const [copied, setCopied] = useState(false);

  if (!trip) return null;

  const displayTripId = trip.tripNumber || `TRP-${trip.id.slice(0, 8).toUpperCase()}`;
  const cheNum = trip.chassisNumber || resolveCheNumber(trip.vehicleNumber) || 'CHE-PORT-01';
  const containers = trip.containers || [];

  const isPending =
    trip.status === 'PENDING_APPROVAL' || trip.status === 'PENDING_SUPERVISOR_CONFIRMATION';
  const isConfirmed =
    trip.status === 'SUPERVISOR_CONFIRMED' || trip.status === 'APPROVED' || trip.status === 'COMPLETED';
  const isRejected = trip.status === 'SUPERVISOR_REJECTED' || trip.status === 'REJECTED';
  const isUnstarted =
    trip.status === 'DRAFT' ||
    trip.status === 'SCHEDULED' ||
    trip.status === 'ASSIGNED' ||
    trip.status === 'PENDING_START' ||
    trip.status === 'CREATED' ||
    trip.status === 'READY';

  const handleDriverStartTrip = async () => {
    setActionLoading(true);
    try {
      await tripService.startTrip(trip.id);
      Alert.alert('Trip Started', 'Mission is now active and in progress. Drive safely.');
      if (onTripUpdated) onTripUpdated();
      onClose();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to start trip.');
    } finally {
      setActionLoading(false);
    }
  };

  const copyTripId = async () => {
    try {
      await Clipboard.setStringAsync(displayTripId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  // Supervisor: Verify Container Evidence
  const handleVerifyEvidence = async (photoId: string, containerNumber: string) => {
    setActionLoading(true);
    try {
      await photoService.verifyPhoto(photoId, { status: 'VERIFIED' });
      Alert.alert('Evidence Verified', `Container ${containerNumber} photo approved.`);
      if (onTripUpdated) onTripUpdated();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to verify container evidence.');
    } finally {
      setActionLoading(false);
    }
  };

  // Supervisor: Reject Container Evidence
  const handleRejectEvidenceSubmit = async () => {
    if (!rejectingPhotoId) return;
    if (!photoRejectionNote.trim()) {
      Alert.alert('Required Note', 'Please provide a reason for rejecting the evidence.');
      return;
    }
    setActionLoading(true);
    try {
      await photoService.verifyPhoto(rejectingPhotoId, {
        status: 'REJECTED',
        note: photoRejectionNote.trim(),
      });
      Alert.alert('Evidence Rejected', 'Container photo rejected with notes.');
      setRejectingPhotoId(null);
      setPhotoRejectionNote('');
      if (onTripUpdated) onTripUpdated();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to reject evidence.');
    } finally {
      setActionLoading(false);
    }
  };

  // Supervisor: Confirm entire trip
  const handleConfirmTripCompletion = async () => {
    setActionLoading(true);
    try {
      await tripService.approveTrip(trip.id, supervisorId || 'SUPERVISOR');
      Alert.alert(
        'Trip Confirmed! 🚢',
        `Trip ${displayTripId} has been confirmed. Target containers credited.`
      );
      if (onTripUpdated) onTripUpdated();
      onClose();
    } catch (e: any) {
      Alert.alert('Confirmation Error', e?.message || 'Failed to confirm trip completion.');
    } finally {
      setActionLoading(false);
    }
  };

  // Supervisor: Reject entire trip
  const handleRejectTripSubmit = async () => {
    if (!tripRejectionReason.trim()) {
      Alert.alert('Rejection Reason Required', 'Please enter a clear reason for rejecting the trip.');
      return;
    }
    setActionLoading(true);
    try {
      await tripService.rejectTrip(
        trip.id,
        supervisorId || 'SUPERVISOR',
        tripRejectionReason.trim()
      );
      Alert.alert('Trip Rejected', `Trip ${displayTripId} has been marked as REJECTED.`);
      setRejectionModalVisible(false);
      setTripRejectionReason('');
      if (onTripUpdated) onTripUpdated();
      onClose();
    } catch (e: any) {
      Alert.alert('Rejection Error', e?.message || 'Failed to reject trip.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIdRow}>
                <Ionicons name="document-text" size={18} color="#FFFFFF" />
                <Text style={styles.headerTitle}>{displayTripId}</Text>
                <TouchableOpacity
                  style={styles.headerCopyBtn}
                  onPress={copyTripId}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={copied ? 'checkmark' : 'copy-outline'}
                    size={13}
                    color="#FFFFFF"
                  />
                  {copied && <Text style={styles.copiedText}>Copied</Text>}
                </TouchableOpacity>
              </View>
              <Text style={styles.headerSub}>Complete Inter-Terminal Mission Details</Text>
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Modal Content Scroll */}
          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            {/* Status Strip */}
            <View
              style={[
                styles.statusStrip,
                isPending && styles.statusStripPending,
                isConfirmed && styles.statusStripConfirmed,
                isRejected && styles.statusStripRejected,
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons
                  name={
                    isConfirmed
                      ? 'checkmark-circle'
                      : isPending
                      ? 'time-outline'
                      : isRejected
                      ? 'alert-circle'
                      : 'navigate-outline'
                  }
                  size={16}
                  color={isPending ? '#FFFFFF' : '#173B70'}
                />
                <Text
                  style={[
                    styles.statusStripText,
                    isPending && { color: '#FFFFFF' },
                  ]}
                >
                  STATUS: {trip.status}
                </Text>
              </View>
              {trip.confirmedAt ? (
                <Text
                  style={[
                    styles.statusStripSub,
                    isPending && { color: '#D0DEEB' },
                  ]}
                >
                  {formatTripTime(trip.confirmedAt)}
                </Text>
              ) : null}
            </View>

            {/* Rejection Note If Any */}
            {isRejected && trip.rejectionReason ? (
              <View style={styles.rejectionBox}>
                <Ionicons name="warning-outline" size={18} color="#173B70" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rejectionBoxTitle}>REJECTION RECORD</Text>
                  <Text style={styles.rejectionBoxBody}>{trip.rejectionReason}</Text>
                </View>
              </View>
            ) : null}

            {/* SECTION 1: TRIP OVERVIEW */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Ionicons name="map-outline" size={16} color="#173B70" />
                <Text style={styles.sectionTitle}>ROUTE & VESSEL OVERVIEW</Text>
              </View>

              <View style={styles.routeBox}>
                <View style={styles.terminalCol}>
                  <Text style={styles.terminalLabel}>ORIGIN TERMINAL</Text>
                  <Text style={styles.terminalValue}>{trip.sourceTerminal || 'JCT'}</Text>
                </View>
                <View style={styles.routeArrowCol}>
                  <View style={styles.routeDash} />
                  <Ionicons name="boat" size={18} color="#173B70" />
                  <View style={styles.routeDash} />
                </View>
                <View style={styles.terminalCol}>
                  <Text style={styles.terminalLabel}>DISCHARGE TERMINAL</Text>
                  <Text style={styles.terminalValue}>{trip.destTerminal || 'CICT'}</Text>
                </View>
              </View>

              <View style={styles.grid2}>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Assigned Truck</Text>
                  <Text style={styles.metaValue}>{trip.vehicleNumber || 'LY-6439'}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Container Handling (CHE)</Text>
                  <Text style={styles.metaValue}>{cheNum}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Vessel Name</Text>
                  <Text style={styles.metaValue}>{trip.vesselName || 'EVER GIVEN'}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Driver in Charge</Text>
                  <Text style={styles.metaValue}>{trip.driverName || 'Kamal Perera'}</Text>
                </View>
              </View>
            </View>

            {/* SECTION 2: CONTAINER INFO & EVIDENCE PHOTOS */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Ionicons name="cube-outline" size={16} color="#173B70" />
                <Text style={styles.sectionTitle}>
                  CONTAINER SPECIFICATIONS & EVIDENCE ({containers.length})
                </Text>
              </View>

              {containers.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyContainerText}>No container records attached.</Text>
                </View>
              ) : (
                containers.map((c, idx) => {
                  const pUrl = c.photoUrl || c.photoId ? photoService.getPhotoUrl(c.photoUrl || c.photoId) : null;
                  const photoStatus = c.photoStatus || 'PENDING';

                  return (
                    <View key={c.id || idx} style={styles.containerCard}>
                      {/* Container Header */}
                      <View style={styles.containerCardHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Ionicons name="cube" size={15} color="#173B70" />
                          <Text style={styles.containerCardNum}>{c.containerNumber}</Text>
                          <View style={styles.containerCardSizeBadge}>
                            <Text style={styles.containerCardSizeText}>{c.size || '40FT'}</Text>
                          </View>
                        </View>
                        <View
                          style={[
                            styles.evidenceBadge,
                            photoStatus === 'VERIFIED' && styles.evidenceBadgeVerified,
                            photoStatus === 'REJECTED' && styles.evidenceBadgeRejected,
                          ]}
                        >
                          <Ionicons
                            name={
                              photoStatus === 'VERIFIED'
                                ? 'checkmark-circle'
                                : photoStatus === 'REJECTED'
                                ? 'close-circle'
                                : 'time-outline'
                            }
                            size={12}
                            color={photoStatus === 'VERIFIED' ? '#173B70' : '#173B70'}
                          />
                          <Text style={styles.evidenceBadgeText}>{photoStatus}</Text>
                        </View>
                      </View>

                      {/* Photo Display / Lightbox trigger */}
                      {pUrl ? (
                        <View style={styles.evidencePhotoWrap}>
                          <TouchableOpacity
                            style={styles.evidencePhotoTouch}
                            onPress={() => onOpenPhotoLightbox(pUrl, c.containerNumber)}
                            activeOpacity={0.85}
                          >
                            <Image
                              source={{ uri: pUrl }}
                              style={styles.evidenceImage}
                              resizeMode="cover"
                            />
                            <View style={styles.photoOverlayBadge}>
                              <Ionicons name="expand" size={14} color="#FFFFFF" />
                              <Text style={styles.photoOverlayText}>Tap to View Full Screen</Text>
                            </View>
                          </TouchableOpacity>

                          {/* Verification Record Details */}
                          {c.verifiedBy && (
                            <View style={styles.verifiedMetaRow}>
                              <Ionicons name="shield-checkmark" size={13} color="#173B70" />
                              <Text style={styles.verifiedMetaText}>
                                Inspected by {c.verifiedBy}{' '}
                                {c.verifiedAt ? `· ${formatTripTime(c.verifiedAt)}` : ''}
                              </Text>
                            </View>
                          )}

                          {/* Supervisor Evidence Actions */}
                          {role === 'SUPERVISOR' && isPending && c.photoId && (
                            <View style={styles.evidenceActionRow}>
                              <TouchableOpacity
                                style={styles.verifyEvidenceBtn}
                                onPress={() => handleVerifyEvidence(c.photoId!, c.containerNumber)}
                                disabled={actionLoading}
                                activeOpacity={0.7}
                              >
                                <Ionicons name="checkmark-done" size={14} color="#FFFFFF" />
                                <Text style={styles.verifyEvidenceBtnText}>Verify Evidence</Text>
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={styles.rejectEvidenceBtn}
                                onPress={() => {
                                  setRejectingPhotoId(c.photoId!);
                                  setPhotoRejectionNote('');
                                }}
                                disabled={actionLoading}
                                activeOpacity={0.7}
                              >
                                <Ionicons name="close" size={14} color="#173B70" />
                                <Text style={styles.rejectEvidenceBtnText}>Reject Evidence</Text>
                              </TouchableOpacity>
                            </View>
                          )}
                        </View>
                      ) : (
                        <View style={styles.noPhotoPlaceholder}>
                          <Ionicons name="camera-outline" size={32} color="#8EA7C4" />
                          <Text style={styles.noPhotoPlaceholderText}>
                            No container photo uploaded yet
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                })
              )}
            </View>

            {/* SECTION 3: DISCHARGE & CARGO MANIFEST */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Ionicons name="clipboard-outline" size={16} color="#173B70" />
                <Text style={styles.sectionTitle}>DISCHARGE MANIFEST & VERIFICATION</Text>
              </View>

              <View style={styles.grid2}>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Discharge Bay</Text>
                  <Text style={styles.metaValue}>{trip.dischargeBay || 'Bay 04, Crane 02'}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Seal Status</Text>
                  <Text style={styles.metaValue}>{trip.sealStatus || 'INTACT (VERIFIED)'}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Damage Status</Text>
                  <Text style={styles.metaValue}>{trip.damageStatus || 'NONE'}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Discharge Bay Crane</Text>
                  <Text style={styles.metaValue}>Crane 02 · Discharged</Text>
                </View>
              </View>

              {trip.driverCompletionNotes ? (
                <View style={styles.driverNotesBox}>
                  <Text style={styles.driverNotesLabel}>Driver Discharge Notes:</Text>
                  <Text style={styles.driverNotesText}>{trip.driverCompletionNotes}</Text>
                </View>
              ) : null}
            </View>

            {/* SECTION 4: CONFIRMATION AUDIT TRAIL */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Ionicons name="time-outline" size={16} color="#173B70" />
                <Text style={styles.sectionTitle}>CONFIRMATION AUDIT TRAIL</Text>
              </View>

              <View style={styles.auditTimeline}>
                <View style={styles.auditRow}>
                  <View style={styles.auditDot} />
                  <View style={styles.auditContent}>
                    <Text style={styles.auditLabel}>Trip Created & Dispatched</Text>
                    <Text style={styles.auditTime}>
                      {formatTripTime(trip.startTime || trip.createdAt)}
                    </Text>
                  </View>
                </View>

                {trip.endTime && (
                  <View style={styles.auditRow}>
                    <View style={styles.auditDot} />
                    <View style={styles.auditContent}>
                      <Text style={styles.auditLabel}>Driver Delivery & Photo Submission</Text>
                      <Text style={styles.auditTime}>{formatTripTime(trip.endTime)}</Text>
                    </View>
                  </View>
                )}

                {trip.confirmedAt && (
                  <View style={styles.auditRow}>
                    <View style={[styles.auditDot, { backgroundColor: '#173B70' }]} />
                    <View style={styles.auditContent}>
                      <Text style={styles.auditLabel}>
                        Supervisor {isConfirmed ? 'Confirmation' : 'Rejection'}
                      </Text>
                      <Text style={styles.auditTime}>
                        {formatTripTime(trip.confirmedAt)} by {trip.supervisorName || 'Supervisor'}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </View>

            {/* Driver Start Trip Action */}
            {role === 'DRIVER' && isUnstarted && (
              <View style={styles.supervisorDecisionCard}>
                <Text style={styles.decisionTitle}>ITT MISSION READY TO START</Text>
                <Text style={styles.decisionSub}>
                  Containers are loaded on chassis. Begin transport movement.
                </Text>

                <TouchableOpacity
                  style={styles.confirmTripBtn}
                  onPress={handleDriverStartTrip}
                  disabled={actionLoading}
                  activeOpacity={0.8}
                >
                  {actionLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="play" size={18} color="#FFFFFF" />
                      <Text style={styles.confirmTripBtnText}>Start Trip Now</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Final Supervisor Decision Buttons (Only if pending) */}
            {role === 'SUPERVISOR' && isPending && (
              <View style={styles.supervisorDecisionCard}>
                <Text style={styles.decisionTitle}>SUPERVISOR FINAL CONFIRMATION</Text>
                <Text style={styles.decisionSub}>
                  Ensure all container evidence and seal conditions have been inspected.
                </Text>

                <View style={styles.decisionBtnRow}>
                  <TouchableOpacity
                    style={styles.confirmTripBtn}
                    onPress={handleConfirmTripCompletion}
                    disabled={actionLoading}
                    activeOpacity={0.8}
                  >
                    {actionLoading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-done-circle" size={18} color="#FFFFFF" />
                        <Text style={styles.confirmTripBtnText}>Confirm Trip Completion</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.rejectTripBtn}
                    onPress={() => setRejectionModalVisible(true)}
                    disabled={actionLoading}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="close-circle-outline" size={16} color="#173B70" />
                    <Text style={styles.rejectTripBtnText}>Reject Trip</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Modal Footer */}
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.closeFooterBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.closeFooterBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Sub-Modal: Trip Rejection Reason Dialog */}
      <Modal visible={rejectionModalVisible} transparent animationType="fade">
        <View style={styles.rejectionOverlay}>
          <View style={styles.rejectionCard}>
            <View style={styles.rejectionHeader}>
              <Ionicons name="alert-circle" size={20} color="#173B70" />
              <Text style={styles.rejectionTitle}>Reject ITT Mission</Text>
            </View>
            <Text style={styles.rejectionSub}>
              A mandatory rejection reason is required for security audit logging.
            </Text>

            <TextInput
              style={styles.rejectionInput}
              placeholder="e.g. Container seal broken, damaged container not reported..."
              placeholderTextColor="#7F9AB5"
              multiline
              numberOfLines={3}
              value={tripRejectionReason}
              onChangeText={setTripRejectionReason}
            />

            <View style={styles.rejectionBtnRow}>
              <TouchableOpacity
                style={styles.rejectionCancelBtn}
                onPress={() => setRejectionModalVisible(false)}
              >
                <Text style={styles.rejectionCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.rejectionSubmitBtn}
                onPress={handleRejectTripSubmit}
                disabled={actionLoading}
              >
                <Text style={styles.rejectionSubmitText}>Submit Rejection</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Sub-Modal: Photo Rejection Note Dialog */}
      <Modal visible={!!rejectingPhotoId} transparent animationType="fade">
        <View style={styles.rejectionOverlay}>
          <View style={styles.rejectionCard}>
            <View style={styles.rejectionHeader}>
              <Ionicons name="camera-outline" size={20} color="#173B70" />
              <Text style={styles.rejectionTitle}>Reject Container Evidence</Text>
            </View>
            <Text style={styles.rejectionSub}>
              Provide specific reason for photo rejection (e.g. Blurry photo, Wrong container number visible).
            </Text>

            <TextInput
              style={styles.rejectionInput}
              placeholder="Enter reason for rejecting evidence..."
              placeholderTextColor="#7F9AB5"
              multiline
              numberOfLines={3}
              value={photoRejectionNote}
              onChangeText={setPhotoRejectionNote}
            />

            <View style={styles.rejectionBtnRow}>
              <TouchableOpacity
                style={styles.rejectionCancelBtn}
                onPress={() => setRejectingPhotoId(null)}
              >
                <Text style={styles.rejectionCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.rejectionSubmitBtn}
                onPress={handleRejectEvidenceSubmit}
                disabled={actionLoading}
              >
                <Text style={styles.rejectionSubmitText}>Reject Photo</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    maxWidth: 680,
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
  headerLeft: {
    flex: 1,
  },
  headerIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  headerCopyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#284C83',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  copiedText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
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
  statusStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F0F5FA',
    borderWidth: 1,
    borderColor: '#D0DEEB',
    marginBottom: 14,
  },
  statusStripPending: {
    backgroundColor: '#173B70',
    borderColor: '#173B70',
  },
  statusStripConfirmed: {
    backgroundColor: '#E8F1FA',
    borderColor: '#D0DEEB',
  },
  statusStripRejected: {
    backgroundColor: '#F0F5FA',
    borderColor: '#D0DEEB',
  },
  statusStripText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#173B70',
    letterSpacing: 0.5,
  },
  statusStripSub: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4A6B94',
  },
  rejectionBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#F0F5FA',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D0DEEB',
    marginBottom: 14,
  },
  rejectionBoxTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#173B70',
  },
  rejectionBoxBody: {
    fontSize: 12,
    color: '#173B70',
    marginTop: 2,
    lineHeight: 16,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D0DEEB',
    padding: 14,
    marginBottom: 14,
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E8F1FA',
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#173B70',
    letterSpacing: 0.5,
  },
  routeBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F0F5FA',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D0DEEB',
  },
  terminalCol: {
    alignItems: 'center',
    minWidth: 80,
  },
  terminalLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#4A6B94',
    letterSpacing: 0.5,
  },
  terminalValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#173B70',
    marginTop: 2,
  },
  routeArrowCol: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 12,
  },
  routeDash: {
    flex: 1,
    height: 2,
    backgroundColor: '#D0DEEB',
  },
  grid2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metaItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F7FAFD',
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2ECF5',
  },
  metaLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4A6B94',
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#173B70',
    marginTop: 3,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyContainerText: {
    color: '#5F7D9E',
    fontSize: 12,
  },
  containerCard: {
    backgroundColor: '#F7FAFD',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2ECF5',
    gap: 10,
  },
  containerCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  containerCardNum: {
    fontSize: 14,
    fontWeight: '800',
    color: '#173B70',
  },
  containerCardSizeBadge: {
    backgroundColor: '#E8F1FA',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  containerCardSizeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#173B70',
  },
  evidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#F0F5FA',
    borderWidth: 1,
    borderColor: '#D0DEEB',
  },
  evidenceBadgeVerified: {
    backgroundColor: '#E8F1FA',
  },
  evidenceBadgeRejected: {
    backgroundColor: '#F0F5FA',
  },
  evidenceBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#173B70',
  },
  evidencePhotoWrap: {
    gap: 8,
  },
  evidencePhotoTouch: {
    position: 'relative',
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#D0DEEB',
    backgroundColor: '#F0F5FA',
  },
  evidenceImage: {
    width: '100%',
    height: '100%',
  },
  photoOverlayBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#173B70CC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  photoOverlayText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  verifiedMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  verifiedMetaText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#173B70',
  },
  evidenceActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  verifyEvidenceBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#173B70',
    paddingVertical: 8,
    borderRadius: 6,
  },
  verifyEvidenceBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  rejectEvidenceBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D0DEEB',
    paddingVertical: 8,
    borderRadius: 6,
  },
  rejectEvidenceBtnText: {
    color: '#173B70',
    fontSize: 12,
    fontWeight: '700',
  },
  noPhotoPlaceholder: {
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#D0DEEB',
    alignItems: 'center',
    gap: 6,
  },
  noPhotoPlaceholderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5F7D9E',
  },
  driverNotesBox: {
    backgroundColor: '#F7FAFD',
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2ECF5',
  },
  driverNotesLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4A6B94',
    marginBottom: 2,
  },
  driverNotesText: {
    fontSize: 12,
    color: '#173B70',
    lineHeight: 16,
  },
  auditTimeline: {
    gap: 12,
    paddingLeft: 6,
  },
  auditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  auditDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4A6B94',
  },
  auditContent: {
    flex: 1,
  },
  auditLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#173B70',
  },
  auditTime: {
    fontSize: 11,
    color: '#5F7D9E',
    marginTop: 1,
  },
  supervisorDecisionCard: {
    backgroundColor: '#F0F5FA',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D0DEEB',
    padding: 14,
    marginBottom: 14,
    gap: 8,
  },
  decisionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#173B70',
    letterSpacing: 0.5,
  },
  decisionSub: {
    fontSize: 11,
    color: '#4A6B94',
    lineHeight: 15,
  },
  decisionBtnRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  confirmTripBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#173B70',
    paddingVertical: 10,
    borderRadius: 8,
  },
  confirmTripBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  rejectTripBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D0DEEB',
    paddingVertical: 10,
    borderRadius: 8,
  },
  rejectTripBtnText: {
    color: '#173B70',
    fontSize: 12,
    fontWeight: '800',
  },
  modalFooter: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F7FAFD',
    borderTopWidth: 1,
    borderTopColor: '#E2ECF5',
    alignItems: 'flex-end',
  },
  closeFooterBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D0DEEB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  closeFooterBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#173B70',
  },
  rejectionOverlay: {
    flex: 1,
    backgroundColor: '#00000080',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  rejectionCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    gap: 10,
    shadowColor: '#173B70',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  rejectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rejectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#173B70',
  },
  rejectionSub: {
    fontSize: 12,
    color: '#4A6B94',
    lineHeight: 16,
  },
  rejectionInput: {
    backgroundColor: '#F7FAFD',
    borderWidth: 1,
    borderColor: '#D0DEEB',
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    color: '#173B70',
    textAlignVertical: 'top',
    minHeight: 70,
  },
  rejectionBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 4,
  },
  rejectionCancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#F0F5FA',
  },
  rejectionCancelText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4A6B94',
  },
  rejectionSubmitBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#173B70',
  },
  rejectionSubmitText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});

