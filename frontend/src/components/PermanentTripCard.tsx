import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { resolveCheNumber } from '../config/fleet';
import { photoService } from '../services/photoService';
import { formatTripTime } from '../utils/tripTerminalUtils';

export interface TripCardData {
  id: string;
  tripNumber?: string;
  driverId?: string;
  driverName?: string;
  driverCode?: string;
  vehicleNumber?: string;
  chassisNumber?: string;
  vesselName?: string;
  sourceTerminal: string;
  destTerminal?: string;
  status: string;
  notes?: string;
  startTime?: string;
  endTime?: string;
  durationMinutes?: number;
  dischargeBay?: string;
  sealStatus?: string;
  damageStatus?: string;
  driverCompletionNotes?: string;
  supervisorId?: string;
  supervisorName?: string;
  confirmedAt?: string;
  createdAt?: string;
  rejectionReason?: string;
  verifiedBy?: string;
  verifiedByRole?: string;
  verifiedAt?: string;
  rejectReason?: string;
  verificationStatus?: string;
  evidenceVerified?: boolean;
  containers?: Array<{
    id?: string;
    containerNumber: string;
    size?: string;
    sourceTerminal?: string;
    destTerminal?: string;
    status?: string;
    unloadedAt?: string;
    isVerified?: boolean;
    verifiedBy?: string;
    verifiedAt?: string;
    photoId?: string;
    photoStatus?: string;
    photoUrl?: string;
    thumbnailUrl?: string;
  }>;
}

interface PermanentTripCardProps {
  trip: TripCardData;
  role: 'DRIVER' | 'SUPERVISOR' | 'ADMIN';
  onPressDetails: (trip: TripCardData) => void;
  onPressAction?: (trip: TripCardData) => void; // e.g. "Complete Trip" for driver, "View & Verify" for supervisor
  onPressStart?: (trip: TripCardData) => void; // e.g. "Start Trip" for driver
  onPressPhoto?: (photoUrl: string, containerNumber: string, trip: TripCardData) => void;
  updating?: boolean;
}

export const PermanentTripCard: React.FC<PermanentTripCardProps> = ({
  trip,
  role,
  onPressDetails,
  onPressAction,
  onPressStart,
  onPressPhoto,
  updating,
}) => {
  const [copied, setCopied] = useState(false);

  const displayTripId = trip.tripNumber || `TRP-${trip.id.slice(0, 8).toUpperCase()}`;
  const cheNum = trip.chassisNumber || resolveCheNumber(trip.vehicleNumber) || 'CHE-PORT-01';
  const containers = trip.containers || [];
  const containerCount = containers.length;

  const isPending =
    trip.status === 'PENDING_APPROVAL' || trip.status === 'PENDING_SUPERVISOR_CONFIRMATION';
  const isConfirmed =
    trip.status === 'SUPERVISOR_CONFIRMED' || trip.status === 'APPROVED' || trip.status === 'COMPLETED';
  const isRejected = trip.status === 'SUPERVISOR_REJECTED' || trip.status === 'REJECTED';
  const isInProgress = trip.status === 'IN_PROGRESS';
  const isUnstarted =
    trip.status === 'DRAFT' ||
    trip.status === 'SCHEDULED' ||
    trip.status === 'ASSIGNED' ||
    trip.status === 'PENDING_START' ||
    trip.status === 'CREATED' ||
    trip.status === 'READY';

  const copyTripId = async () => {
    try {
      await Clipboard.setStringAsync(displayTripId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const getStatusBadge = () => {
    if (isPending) {
      return {
        label: role === 'DRIVER' ? 'WAITING FOR VERIFICATION' : 'PENDING VERIFICATION',
        icon: 'time-outline' as const,
        badgeBg: '#173B70',
        textColor: '#FFFFFF',
      };
    }
    if (isConfirmed) {
      const verifier = trip.verifiedByRole ? `VERIFIED BY ${trip.verifiedByRole}` : 'CONFIRMED';
      return {
        label: verifier,
        icon: 'checkmark-circle' as const,
        badgeBg: '#E8F1FA',
        textColor: '#173B70',
      };
    }
    if (isRejected) {
      return {
        label: 'REJECTED · RESUBMIT',
        icon: 'alert-circle' as const,
        badgeBg: '#F0F5FA',
        textColor: '#173B70',
      };
    }
    if (isUnstarted) {
      return {
        label: 'READY TO START',
        icon: 'play-outline' as const,
        badgeBg: '#173B70',
        textColor: '#FFFFFF',
      };
    }
    return {
      label: 'IN PROGRESS',
      icon: 'navigate-outline' as const,
      badgeBg: '#F0F5FA',
      textColor: '#173B70',
    };
  };

  const statusBadge = getStatusBadge();


  return (
    <View style={styles.cardContainer}>
      {/* Card Header: Trip ID, Copy Pill, Status Badge */}
      <View style={styles.cardHeader}>
        <View style={styles.tripIdWrap}>
          <Ionicons name="document-text" size={16} color="#173B70" />
          <Text style={styles.tripIdText}>{displayTripId}</Text>
          <TouchableOpacity
            style={styles.copyBtn}
            onPress={copyTripId}
            activeOpacity={0.6}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={copied ? 'checkmark' : 'copy-outline'}
              size={13}
              color={copied ? '#173B70' : '#4A6B94'}
            />
            {copied && <Text style={styles.copiedText}>Copied</Text>}
          </TouchableOpacity>
        </View>

        <View style={[styles.statusBadge, { backgroundColor: statusBadge.badgeBg }]}>
          <Ionicons name={statusBadge.icon} size={12} color={statusBadge.textColor} />
          <Text style={[styles.statusBadgeText, { color: statusBadge.textColor }]}>
            {statusBadge.label}
          </Text>
        </View>
      </View>

      {/* Rejection Note Alert if rejected */}
      {isRejected && trip.rejectionReason && (
        <View style={styles.rejectionBanner}>
          <Ionicons name="alert-circle" size={14} color="#173B70" />
          <Text style={styles.rejectionBannerText}>
            Rejection Reason: {trip.rejectionReason}
          </Text>
        </View>
      )}

      {/* Main Info Grid */}
      <TouchableOpacity
        style={styles.cardBody}
        onPress={() => onPressDetails(trip)}
        activeOpacity={0.85}
      >
        {/* Route Row: Origin -> Destination */}
        <View style={styles.routeRow}>
          <View style={styles.terminalBox}>
            <Text style={styles.terminalSub}>ORIGIN</Text>
            <Text style={styles.terminalCode}>{trip.sourceTerminal || 'JCT'}</Text>
          </View>
          <View style={styles.routeDivider}>
            <View style={styles.routeLine} />
            <Ionicons name="arrow-forward" size={16} color="#173B70" />
            <View style={styles.routeLine} />
          </View>
          <View style={styles.terminalBox}>
            <Text style={styles.terminalSub}>DESTINATION</Text>
            <Text style={styles.terminalCode}>{trip.destTerminal || 'CICT'}</Text>
          </View>
        </View>

        {/* Fleet & Vessel Specs */}
        <View style={styles.specsRow}>
          <View style={styles.specItem}>
            <Ionicons name="bus-outline" size={14} color="#173B70" />
            <Text style={styles.specLabel}>Truck:</Text>
            <Text style={styles.specValue}>{trip.vehicleNumber || 'LY-6439'}</Text>
          </View>
          <View style={styles.specItem}>
            <Ionicons name="build-outline" size={14} color="#173B70" />
            <Text style={styles.specLabel}>CHE:</Text>
            <Text style={styles.specValue}>{cheNum}</Text>
          </View>
          <View style={styles.specItem}>
            <Ionicons name="boat-outline" size={14} color="#173B70" />
            <Text style={styles.specLabel}>Vessel:</Text>
            <Text style={styles.specValue} numberOfLines={1}>
              {trip.vesselName || 'EVER GIVEN'}
            </Text>
          </View>
        </View>

        {/* Driver in Charge */}
        <View style={styles.driverRow}>
          <View style={styles.driverAvatar}>
            <Ionicons name="person" size={13} color="#FFFFFF" />
          </View>
          <Text style={styles.driverName}>
            {trip.driverName || 'Kamal Perera'}
            {trip.driverCode ? ` (${trip.driverCode})` : ''}
          </Text>
        </View>

        {/* Container Summary & Photo Evidence Previews */}
        <View style={styles.containerSection}>
          <View style={styles.containerSecHeader}>
            <Text style={styles.containerSecTitle}>
              CONTAINERS ({containerCount || 1}):
            </Text>
            <Text style={styles.containerSummaryText}>
              {containerCount === 1
                ? `${containers[0]?.size || '40FT'} Single`
                : `${containerCount} Units`}
            </Text>
          </View>

          <View style={styles.containersList}>
            {containers.map((c, idx) => {
              const fullUrl = c.photoUrl || c.photoId ? photoService.getPhotoUrl(c.photoUrl || c.photoId) : null;
              const thumbUrl = c.thumbnailUrl
                ? photoService.getThumbnailUrl(c.thumbnailUrl)
                : fullUrl;
              return (
                <View key={c.id || idx} style={styles.containerChip}>
                  <View style={styles.containerInfoWrap}>
                    <Ionicons name="cube-outline" size={13} color="#173B70" />
                    <Text style={styles.containerNumberText}>{c.containerNumber}</Text>
                    <View style={styles.sizeBadge}>
                      <Text style={styles.sizeBadgeText}>{c.size || '40FT'}</Text>
                    </View>
                  </View>

                  {/* Photo Evidence Thumbnail or Indicator */}
                  {thumbUrl ? (
                    <TouchableOpacity
                      style={styles.photoThumbTouch}
                      onPress={() => onPressPhoto && onPressPhoto(fullUrl || thumbUrl, c.containerNumber, trip)}
                      activeOpacity={0.8}
                    >
                      <Image source={{ uri: thumbUrl }} style={styles.photoThumbImg} />
                      <View style={styles.photoIndicator}>
                        <Ionicons name="expand" size={10} color="#FFFFFF" />
                      </View>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.noPhotoTag}>
                      <Ionicons name="camera-outline" size={11} color="#5F7D9E" />
                      <Text style={styles.noPhotoText}>No Photo</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* Timestamps Section */}
        <View style={styles.timestampsGrid}>
          <View style={styles.timestampCol}>
            <Text style={styles.timeLabel}>STARTED</Text>
            <Text style={styles.timeValue}>{formatTripTime(trip.startTime || trip.createdAt)}</Text>
          </View>
          <View style={styles.timestampCol}>
            <Text style={styles.timeLabel}>COMPLETED</Text>
            <Text style={styles.timeValue}>
              {trip.endTime ? formatTripTime(trip.endTime) : isInProgress ? 'In Transit' : '-'}
            </Text>
          </View>
          <View style={styles.timestampCol}>
            <Text style={styles.timeLabel}>CONFIRMED</Text>
            <Text style={styles.timeValue}>
              {trip.confirmedAt ? formatTripTime(trip.confirmedAt) : isPending ? 'Awaiting' : '-'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Card Action Footer */}
      <View style={styles.cardFooter}>
        <TouchableOpacity
          style={styles.viewDetailsBtn}
          onPress={() => onPressDetails(trip)}
          activeOpacity={0.7}
        >
          <Ionicons name="eye-outline" size={15} color="#173B70" />
          <Text style={styles.viewDetailsBtnText}>View Details</Text>
        </TouchableOpacity>

        {/* Role-Specific Context Action */}
        {role === 'DRIVER' && isUnstarted && (onPressStart || onPressAction) && (
          <TouchableOpacity
            style={styles.primaryActionBtn}
            onPress={() => (onPressStart ? onPressStart(trip) : onPressAction!(trip))}
            disabled={updating}
            activeOpacity={0.8}
          >
            <Ionicons name="play" size={15} color="#FFFFFF" />
            <Text style={styles.primaryActionBtnText}>Start Trip</Text>
          </TouchableOpacity>
        )}

        {role === 'DRIVER' && isInProgress && onPressAction && (
          <TouchableOpacity
            style={styles.primaryActionBtn}
            onPress={() => onPressAction(trip)}
            disabled={updating}
            activeOpacity={0.8}
          >
            <Ionicons name="checkmark-done" size={15} color="#FFFFFF" />
            <Text style={styles.primaryActionBtnText}>Complete Trip</Text>
          </TouchableOpacity>
        )}

        {(role === 'SUPERVISOR' || role === 'ADMIN') && isPending && onPressAction && (
          <TouchableOpacity
            style={styles.primaryActionBtn}
            onPress={() => onPressAction(trip)}
            disabled={updating}
            activeOpacity={0.8}
          >
            <Ionicons name="shield-checkmark" size={15} color="#FFFFFF" />
            <Text style={styles.primaryActionBtnText}>View & Verify</Text>
          </TouchableOpacity>
        )}

        {role === 'DRIVER' && isRejected && onPressAction && (
          <TouchableOpacity
            style={styles.primaryActionBtn}
            onPress={() => onPressAction(trip)}
            disabled={updating}
            activeOpacity={0.8}
          >
            <Ionicons name="create-outline" size={15} color="#FFFFFF" />
            <Text style={styles.primaryActionBtnText}>Edit & Resubmit</Text>
          </TouchableOpacity>
        )}

        {role === 'ADMIN' && !isPending && (
          <TouchableOpacity
            style={styles.secondaryActionBtn}
            onPress={() => onPressDetails(trip)}
            activeOpacity={0.7}
          >
            <Ionicons name="analytics-outline" size={14} color="#173B70" />
            <Text style={styles.secondaryActionBtnText}>Audit Trail</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D0DEEB',
    marginBottom: 14,
    shadowColor: '#173B70',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#F7FAFD',
    borderBottomWidth: 1,
    borderBottomColor: '#E2ECF5',
  },
  tripIdWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tripIdText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#173B70',
    letterSpacing: 0.3,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#E8F1FA',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  copiedText: {
    fontSize: 10,
    color: '#173B70',
    fontWeight: '700',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D0DEEB',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  rejectionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0F5FA',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#D0DEEB',
  },
  rejectionBannerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#173B70',
    flex: 1,
  },
  cardBody: {
    padding: 14,
    gap: 12,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0F5FA',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D0DEEB',
  },
  terminalBox: {
    alignItems: 'center',
    minWidth: 70,
  },
  terminalSub: {
    fontSize: 9,
    fontWeight: '800',
    color: '#4A6B94',
    letterSpacing: 0.5,
  },
  terminalCode: {
    fontSize: 16,
    fontWeight: '900',
    color: '#173B70',
    marginTop: 2,
  },
  routeDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 10,
  },
  routeLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#D0DEEB',
  },
  specsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  specItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  specLabel: {
    fontSize: 11,
    color: '#4A6B94',
    fontWeight: '600',
  },
  specValue: {
    fontSize: 12,
    color: '#173B70',
    fontWeight: '800',
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
  },
  driverAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#173B70',
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#173B70',
  },
  containerSection: {
    backgroundColor: '#F7FAFD',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2ECF5',
    gap: 8,
  },
  containerSecHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  containerSecTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#173B70',
    letterSpacing: 0.5,
  },
  containerSummaryText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4A6B94',
  },
  containersList: {
    gap: 6,
  },
  containerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D0DEEB',
  },
  containerInfoWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  containerNumberText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#173B70',
    letterSpacing: 0.3,
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
  photoThumbTouch: {
    position: 'relative',
    width: 36,
    height: 36,
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#173B70',
  },
  photoThumbImg: {
    width: '100%',
    height: '100%',
  },
  photoIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#173B70AA',
    padding: 2,
    borderTopLeftRadius: 3,
  },
  noPhotoTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F0F5FA',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  noPhotoText: {
    fontSize: 10,
    color: '#5F7D9E',
    fontWeight: '600',
  },
  timestampsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E8F1FA',
  },
  timestampCol: {
    alignItems: 'center',
    flex: 1,
  },
  timeLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#5F7D9E',
    letterSpacing: 0.5,
  },
  timeValue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#173B70',
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#F7FAFD',
    borderTopWidth: 1,
    borderTopColor: '#E2ECF5',
  },
  viewDetailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D0DEEB',
  },
  viewDetailsBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#173B70',
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 6,
    backgroundColor: '#173B70',
  },
  primaryActionBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  secondaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 6,
    backgroundColor: '#E8F1FA',
    borderWidth: 1,
    borderColor: '#D0DEEB',
  },
  secondaryActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#173B70',
  },
});

