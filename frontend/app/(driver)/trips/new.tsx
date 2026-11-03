import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../../src/store/authStore';
import { driverService } from '../../../src/services/driverService';
import apiClient from '../../../src/services/api';
import { Colors, Typography, Layout, Spacing } from '../../../src/constants/theme';
import { useResponsive } from '../../../src/hooks/useResponsive';
import { resolveCheNumber, resolveOperator } from '../../../src/config/fleet';
import {
  validateContainerNumber,
  normalize,
  suggestValidContainerNumber,
  getRecentContainerNumbers,
  saveRecentContainerNumber,
  ContainerValidationResult,
} from '../../../src/utils/containerValidator';
import { captureContainerPhoto, ProcessedPhoto } from '../../../src/utils/photoCapture';
import { photoService } from '../../../src/services/photoService';
import { AppButton } from '../../../src/components';

const theme = Colors.light;

const TERMINALS = ['CICT', 'CWIT', 'ECT', 'JCT', 'UCT', 'SAGT'] as const;
type TerminalCode = (typeof TERMINALS)[number];
const POPULAR_VESSELS = ['MSC Aurora', 'Maersk Line', 'CMA CGM', 'Evergreen', 'COSCO'] as const;

type LoadConfig = '1x20FT' | '2x20FT' | '1x40FT';

export default function NewTripScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { topInset, bottomInset, contentMaxWidth, containerPaddingHorizontal } = useResponsive();

  // 1. Logged-in Driver & Vehicle context (Real data only, no fake defaults)
  const [driverProfile, setDriverProfile] = useState<any>(null);

  useEffect(() => {
    const ident = user?.driverCode || user?.driverId || user?.username;
    if (ident) {
      driverService.getProfile(ident).then((p) => {
        if (p) setDriverProfile(p);
      }).catch(() => {});
    }
  }, [user]);

  const driverName = user?.name || user?.fullName || driverProfile?.fullName || '-';
  const driverVehicle = user?.vehicleNumber || driverProfile?.vehicleNumber || '-';
  const driverChe = user?.chassisNumber || user?.cheNumber || driverProfile?.chassisNumber || resolveCheNumber(driverVehicle, undefined);

  // 2. Form state
  const [vesselName, setVesselName] = useState('MSC Aurora');
  const [sourceTerminal, setSourceTerminal] = useState<TerminalCode>('CICT');
  const [destTerminal, setDestTerminal] = useState<TerminalCode>('ECT');
  const [destTerminal2, setDestTerminal2] = useState<TerminalCode>('ECT');
  const [loadConfig, setLoadConfig] = useState<LoadConfig>('1x20FT');

  // Container numbers
  const [containerNumber1, setContainerNumber1] = useState('');
  const [containerNumber2, setContainerNumber2] = useState('');

  // Load recent container numbers for quick-pick
  const [recentContainers, setRecentContainers] = useState<string[]>([]);
  useEffect(() => {
    getRecentContainerNumbers().then(setRecentContainers).catch(() => {});
  }, []);

  // Container unverified overrides and photos
  const [c1ConfirmedUnverified, setC1ConfirmedUnverified] = useState(false);
  const [c2ConfirmedUnverified, setC2ConfirmedUnverified] = useState(false);
  const [c1Photo, setC1Photo] = useState<ProcessedPhoto | null>(null);
  const [c2Photo, setC2Photo] = useState<ProcessedPhoto | null>(null);

  // Optional notes
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState('');

  // Collapsed more options (damage & return status)
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [damageStatus, setDamageStatus] = useState<'NONE' | 'DAMAGED'>('NONE');
  const [isReturn, setIsReturn] = useState(false);

  // Form field errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // Live Asia/Colombo formatted start time
  const [colomboStartTime, setColomboStartTime] = useState('');
  useEffect(() => {
    const formatNow = () => {
      try {
        const d = new Date();
        const formatted = d.toLocaleString('en-GB', {
          timeZone: 'Asia/Colombo',
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });
        setColomboStartTime(formatted);
      } catch {
        setColomboStartTime(new Date().toLocaleString());
      }
    };
    formatNow();
    const interval = setInterval(formatNow, 30000);
    return () => clearInterval(interval);
  }, []);

  // Real-time validations using ISO 6346 containerValidator
  const c1Clean = normalize(containerNumber1);
  const c1Validation: ContainerValidationResult | null = useMemo(() => {
    if (!c1Clean) return null;
    return validateContainerNumber(containerNumber1);
  }, [c1Clean, containerNumber1]);

  const c2Clean = normalize(containerNumber2);
  const c2Validation: ContainerValidationResult | null = useMemo(() => {
    if (!c2Clean) return null;
    return validateContainerNumber(containerNumber2, c1Clean ? [c1Clean] : []);
  }, [c2Clean, containerNumber2, c1Clean]);

  // Trip summary text (e.g. "1 x 20FT • CICT → ECT")
  const summaryLine = useMemo(() => {
    const sizeLabel = loadConfig === '1x20FT' ? '1 x 20FT' : loadConfig === '2x20FT' ? '2 x 20FT' : '1 x 40FT';
    const destLabel = loadConfig === '2x20FT' && destTerminal !== destTerminal2
      ? `${destTerminal} & ${destTerminal2}`
      : destTerminal;
    return `${sizeLabel} • ${sourceTerminal} → ${destLabel}`;
  }, [loadConfig, sourceTerminal, destTerminal, destTerminal2]);

  // Validation before submission
  const validateForm = async (): Promise<boolean> => {
    const errs: Record<string, string> = {};

    if (!vesselName.trim()) {
      errs.vessel = 'Please enter or select a vessel name';
    }

    if (!sourceTerminal) {
      errs.sourceTerminal = 'Please select a loading terminal';
    }

    if (!destTerminal) {
      errs.destTerminal = 'Please select a destination terminal';
    } else if (destTerminal === sourceTerminal) {
      errs.destTerminal = `Destination cannot be identical to loading terminal (${sourceTerminal})`;
    }

    if (loadConfig === '2x20FT') {
      if (!destTerminal2) {
        errs.destTerminal2 = 'Please select destination terminal for container 2';
      } else if (destTerminal2 === sourceTerminal) {
        errs.destTerminal2 = `Destination cannot be identical to loading terminal (${sourceTerminal})`;
      }
    }

    // Validate Container 1
    if (!containerNumber1.trim()) {
      errs.c1 = 'Container number is required';
    } else if (c1Validation?.severity === 'error') {
      errs.c1 = c1Validation.message;
    } else if (c1Validation?.severity === 'warning') {
      if (!c1ConfirmedUnverified) {
        errs.c1 = 'Check digit mismatch. Tap suggestion or confirm as unverified.';
      } else if (!c1Photo) {
        errs.c1 = 'Photo required: unverified containers must have photo verification before starting trip.';
      }
    }

    // Validate Container 2 if 2x20FT
    if (loadConfig === '2x20FT') {
      if (!containerNumber2.trim()) {
        errs.c2 = 'Container #2 number is required for 2 x 20FT';
      } else if (c2Validation?.severity === 'error') {
        errs.c2 = c2Validation.message;
      } else if (c2Validation?.severity === 'warning') {
        if (!c2ConfirmedUnverified) {
          errs.c2 = 'Check digit mismatch. Tap suggestion or confirm as unverified.';
        } else if (!c2Photo) {
          errs.c2 = 'Photo required: unverified containers must have photo verification before starting trip.';
        }
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Submission handler
  const handleStartTrip = async () => {
    const isValid = await validateForm();
    if (!isValid) return;

    setLoading(true);

    const tripContainers: any[] = [];
    const size = loadConfig === '1x40FT' ? '40FT' : '20FT';
    const isC1Verified = c1Validation?.isCheckDigitValid ?? true;

    tripContainers.push({
      containerNumber: c1Clean,
      size,
      destTerminal,
      damageStatus,
      isReturn,
      remarks: notes.trim() || undefined,
      isVerified: isC1Verified,
    });

    if (loadConfig === '2x20FT') {
      const isC2Verified = c2Validation?.isCheckDigitValid ?? true;
      tripContainers.push({
        containerNumber: c2Clean,
        size: '20FT',
        destTerminal: destTerminal2 || destTerminal,
        damageStatus,
        isReturn,
        remarks: notes.trim() || undefined,
        isVerified: isC2Verified,
      });
    }

    const assignedVeh = driverVehicle !== '-' ? driverVehicle : (user?.vehicleNumber || 'LY-6439');
    const assignedChe = driverChe !== '-' ? driverChe : resolveCheNumber(assignedVeh, undefined);
    const assignedOp = resolveOperator(assignedVeh, user?.operator);

    const destString = loadConfig === '2x20FT' && destTerminal !== destTerminal2
      ? `${destTerminal} & ${destTerminal2}`
      : destTerminal;

    const payload = {
      driverId: user?.driverId || user?.id,
      vesselName: vesselName.trim(),
      sourceTerminal,
      destTerminal: destString,
      vehicleNumber: assignedVeh,
      chassisNumber: assignedChe,
      operator: assignedOp,
      notes: notes.trim() || undefined,
      containers: tripContainers,
      status: 'IN_PROGRESS',
    };

    try {
      // Real API Submission
      const res = await apiClient.post('/trips', payload);
      const created = res.data;

      // Save to recent quick-pick list
      saveRecentContainerNumber(c1Clean).catch(() => {});
      if (loadConfig === '2x20FT') saveRecentContainerNumber(c2Clean).catch(() => {});

      // Upload photos asynchronously if attached
      if (c1Photo && created?.id) {
        photoService.uploadPhoto({
          tripId: created.id,
          containerNumber: c1Clean,
          uri: c1Photo.uri,
        }).catch((e) => console.warn('C1 Photo upload error:', e));
      }
      if (c2Photo && created?.id && loadConfig === '2x20FT') {
        photoService.uploadPhoto({
          tripId: created.id,
          containerNumber: c2Clean,
          uri: c2Photo.uri,
        }).catch((e) => console.warn('C2 Photo upload error:', e));
      }

      Alert.alert('Trip Started', 'Mission registered on live server. Drive safely.', [
        { text: 'OK', onPress: () => router.replace('/(driver)/(tabs)') },
      ]);
    } catch (err: any) {
      console.warn('Backend error registering trip:', err);
      // Save to recent quick-pick list
      saveRecentContainerNumber(c1Clean).catch(() => {});
      if (loadConfig === '2x20FT') saveRecentContainerNumber(c2Clean).catch(() => {});

      Alert.alert(
        'Submission Failed',
        err?.response?.data?.message || err?.message || 'Could not reach server to register trip. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: Math.max(topInset, Layout.screenPadding),
            paddingBottom: Math.max(bottomInset + 30, 48),
            paddingHorizontal: containerPaddingHorizontal,
            maxWidth: contentMaxWidth,
            width: '100%',
            alignSelf: 'center',
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header Link */}
        <View style={styles.topNavRow}>
          <TouchableOpacity
            style={styles.backLink}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={18} color={theme.textSecondary} />
            <Text style={styles.backLinkText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.screenHeading}>Start New Trip</Text>
          <View style={{ width: 60 }} />
        </View>

        {/* 1. TOP: One small grey line with driver name + vehicle + CHE */}
        <View style={styles.driverContextLine}>
          <Text style={styles.driverContextText}>
            {driverName} • {driverVehicle} • CHE: {driverChe}
          </Text>
        </View>

        {/* Form Container */}
        <View style={styles.formBody}>
          {/* 2. Vessel Input + Recent Chips */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>VESSEL</Text>
            <TextInput
              style={[styles.input, errors.vessel && styles.inputError]}
              placeholder="e.g. MSC Aurora"
              placeholderTextColor={theme.textHint}
              value={vesselName}
              onChangeText={(t) => {
                setVesselName(t);
                if (errors.vessel) setErrors((e) => ({ ...e, vessel: '' }));
              }}
            />
            {errors.vessel && <Text style={styles.errorText}>{errors.vessel}</Text>}

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.vesselChips}>
              {POPULAR_VESSELS.map((v) => (
                <TouchableOpacity
                  key={v}
                  style={[styles.chip, vesselName === v && styles.chipActive]}
                  onPress={() => {
                    setVesselName(v);
                    if (errors.vessel) setErrors((e) => ({ ...e, vessel: '' }));
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.chipText, vesselName === v && styles.chipTextActive]}>
                    {v}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* 3. Loading Terminal */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>LOADING TERMINAL</Text>
            <View style={styles.terminalGrid}>
              {TERMINALS.map((t) => {
                const isSelected = sourceTerminal === t;
                return (
                  <TouchableOpacity
                    key={t}
                    style={[styles.termChip, isSelected && styles.termChipActive]}
                    onPress={() => setSourceTerminal(t)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.termChipText, isSelected && styles.termChipTextActive]}>
                      {t}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {errors.sourceTerminal && <Text style={styles.errorText}>{errors.sourceTerminal}</Text>}
          </View>

          {/* 4. Destination Terminal */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              DESTINATION TERMINAL {loadConfig === '2x20FT' ? '(CONTAINER 1)' : ''}
            </Text>
            <View style={styles.terminalGrid}>
              {TERMINALS.map((t) => {
                const isSelected = destTerminal === t;
                const isForbidden = sourceTerminal === t;
                return (
                  <TouchableOpacity
                    key={t}
                    disabled={isForbidden}
                    style={[
                      styles.termChip,
                      isSelected && styles.termChipActive,
                      isForbidden && styles.termChipDisabled,
                    ]}
                    onPress={() => {
                      setDestTerminal(t);
                      if (errors.destTerminal) setErrors((e) => ({ ...e, destTerminal: '' }));
                    }}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.termChipText,
                        isSelected && styles.termChipTextActive,
                        isForbidden && styles.termChipTextDisabled,
                      ]}
                    >
                      {t}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {errors.destTerminal && <Text style={styles.errorText}>{errors.destTerminal}</Text>}
          </View>

          {/* Destination Terminal for Container 2 if 2x20FT */}
          {loadConfig === '2x20FT' && (
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>DESTINATION TERMINAL (CONTAINER 2)</Text>
              <View style={styles.terminalGrid}>
                {TERMINALS.map((t) => {
                  const isSelected = destTerminal2 === t;
                  const isForbidden = sourceTerminal === t;
                  return (
                    <TouchableOpacity
                      key={t}
                      disabled={isForbidden}
                      style={[
                        styles.termChip,
                        isSelected && styles.termChipActive,
                        isForbidden && styles.termChipDisabled,
                      ]}
                      onPress={() => {
                        setDestTerminal2(t);
                        if (errors.destTerminal2) setErrors((e) => ({ ...e, destTerminal2: '' }));
                      }}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.termChipText,
                          isSelected && styles.termChipTextActive,
                          isForbidden && styles.termChipTextDisabled,
                        ]}
                      >
                        {t}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {errors.destTerminal2 && <Text style={styles.errorText}>{errors.destTerminal2}</Text>}
            </View>
          )}

          {/* 5. Container Load Segmented Control */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>CONTAINER LOAD CONFIGURATION</Text>
            <View style={styles.segmentedRow}>
              {(['1x20FT', '2x20FT', '1x40FT'] as LoadConfig[]).map((cfg) => {
                const isSelected = loadConfig === cfg;
                const label = cfg === '1x20FT' ? '1 x 20FT' : cfg === '2x20FT' ? '2 x 20FT' : '1 x 40FT';
                return (
                  <TouchableOpacity
                    key={cfg}
                    style={[styles.segmentBtn, isSelected && styles.segmentBtnActive]}
                    onPress={() => {
                      setLoadConfig(cfg);
                      if (cfg === '2x20FT' && !destTerminal2) {
                        setDestTerminal2(destTerminal);
                      }
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.segmentBtnText, isSelected && styles.segmentBtnTextActive]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* 6. Quick Pick Recent Containers */}
          {recentContainers.length > 0 && (
            <View style={{ marginBottom: 12 }}>
              <Text style={styles.recentTitle}>RECENT CONTAINERS</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingTop: 4 }}>
                {recentContainers.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={styles.recentChip}
                    onPress={() => {
                      if (!containerNumber1 || (loadConfig === '2x20FT' && containerNumber1 && !containerNumber2)) {
                        if (!containerNumber1) {
                          setContainerNumber1(c);
                          setC1ConfirmedUnverified(false);
                          if (errors.c1) setErrors((e) => ({ ...e, c1: '' }));
                        } else {
                          setContainerNumber2(c);
                          setC2ConfirmedUnverified(false);
                          if (errors.c2) setErrors((e) => ({ ...e, c2: '' }));
                        }
                      } else {
                        setContainerNumber1(c);
                        setC1ConfirmedUnverified(false);
                        if (errors.c1) setErrors((e) => ({ ...e, c1: '' }));
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="time-outline" size={12} color={theme.accent} />
                    <Text style={styles.recentChipText}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Container Number #1 */}
          <View style={styles.fieldGroup}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <Text style={styles.fieldLabel}>
                CONTAINER NUMBER {loadConfig === '2x20FT' ? '#1' : ''}
              </Text>
              {c1Clean.length === 11 && c1Validation?.isCheckDigitValid && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={13} color={theme.statusApprovedText} />
                  <Text style={styles.verifiedBadgeText}>Verified</Text>
                </View>
              )}
              {c1Clean.length === 11 && c1ConfirmedUnverified && !c1Validation?.isCheckDigitValid && (
                <View style={styles.unverifiedBadge}>
                  <Ionicons name="alert-circle" size={13} color={theme.statusPendingText} />
                  <Text style={styles.unverifiedBadgeText}>Unverified</Text>
                </View>
              )}
            </View>

            <View style={styles.inputWithIconWrap}>
              <TextInput
                style={[styles.input, { flex: 1 }, errors.c1 && styles.inputError]}
                placeholder="e.g. CSQU3054383"
                placeholderTextColor={theme.textHint}
                value={containerNumber1}
                onChangeText={(t) => {
                  setContainerNumber1(t.toUpperCase());
                  setC1ConfirmedUnverified(false);
                  if (errors.c1) setErrors((e) => ({ ...e, c1: '' }));
                }}
                autoCapitalize="characters"
                maxLength={11}
              />
              <TouchableOpacity
                style={[styles.photoTriggerBtn, c1Photo && styles.photoTriggerBtnActive]}
                onPress={async () => {
                  const captured = await captureContainerPhoto();
                  if (captured) setC1Photo(captured);
                }}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={c1Photo ? 'camera' : 'camera-outline'}
                  size={20}
                  color={c1Photo ? theme.accent : theme.textSecondary}
                />
              </TouchableOpacity>
            </View>

            {/* Photo preview thumbnail */}
            {c1Photo && (
              <View style={styles.photoPreviewRow}>
                <Image source={{ uri: c1Photo.uri }} style={styles.photoThumb} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.photoAttachedText}>Photo attached ✓</Text>
                  <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
                    <TouchableOpacity
                      onPress={async () => {
                        const captured = await captureContainerPhoto();
                        if (captured) setC1Photo(captured);
                      }}
                    >
                      <Text style={styles.photoActionText}>Retake</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setC1Photo(null)}>
                      <Text style={[styles.photoActionText, { color: theme.danger }]}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {/* Validation warning & suggestion */}
            {c1Validation?.severity === 'warning' && (
              <View style={styles.warningBox}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="warning-outline" size={16} color={theme.statusPendingText} />
                  <Text style={styles.warningTitle}>Check Digit Mismatch</Text>
                </View>
                <Text style={styles.warningMessage}>{c1Validation.message}</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                  {c1Validation.suggestedNumber && (
                    <TouchableOpacity
                      style={styles.suggestionBtn}
                      onPress={() => {
                        setContainerNumber1(c1Validation.suggestedNumber!);
                        setC1ConfirmedUnverified(false);
                        if (errors.c1) setErrors((e) => ({ ...e, c1: '' }));
                      }}
                    >
                      <Ionicons name="sparkles" size={14} color="#FFFFFF" />
                      <Text style={styles.suggestionBtnText}>Use {c1Validation.suggestedNumber}</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[
                      styles.confirmUnverifiedBtn,
                      c1ConfirmedUnverified && styles.confirmUnverifiedBtnActive,
                    ]}
                    onPress={() => setC1ConfirmedUnverified(!c1ConfirmedUnverified)}
                  >
                    <Text
                      style={[
                        styles.confirmUnverifiedBtnText,
                        c1ConfirmedUnverified && styles.confirmUnverifiedBtnTextActive,
                      ]}
                    >
                      {c1ConfirmedUnverified ? 'Confirmed Unverified ✓' : 'Confirm as Unverified'}
                    </Text>
                  </TouchableOpacity>
                </View>
                {c1ConfirmedUnverified && !c1Photo && (
                  <Text style={styles.photoRequiredNote}>
                    * Photo is required for unverified containers before starting trip. Tap the camera icon above.
                  </Text>
                )}
              </View>
            )}

            {errors.c1 && <Text style={styles.errorText}>{errors.c1}</Text>}
          </View>

          {/* Container Number #2 (if 2x20FT) */}
          {loadConfig === '2x20FT' && (
            <View style={styles.fieldGroup}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <Text style={styles.fieldLabel}>CONTAINER NUMBER #2</Text>
                {c2Clean.length === 11 && c2Validation?.isCheckDigitValid && (
                  <View style={styles.verifiedBadge}>
                    <Ionicons name="checkmark-circle" size={13} color={theme.statusApprovedText} />
                    <Text style={styles.verifiedBadgeText}>Verified</Text>
                  </View>
                )}
                {c2Clean.length === 11 && c2ConfirmedUnverified && !c2Validation?.isCheckDigitValid && (
                  <View style={styles.unverifiedBadge}>
                    <Ionicons name="alert-circle" size={13} color={theme.statusPendingText} />
                    <Text style={styles.unverifiedBadgeText}>Unverified</Text>
                  </View>
                )}
              </View>

              <View style={styles.inputWithIconWrap}>
                <TextInput
                  style={[styles.input, { flex: 1 }, errors.c2 && styles.inputError]}
                  placeholder="e.g. CSQU3054383"
                  placeholderTextColor={theme.textHint}
                  value={containerNumber2}
                  onChangeText={(t) => {
                    setContainerNumber2(t.toUpperCase());
                    setC2ConfirmedUnverified(false);
                    if (errors.c2) setErrors((e) => ({ ...e, c2: '' }));
                  }}
                  autoCapitalize="characters"
                  maxLength={11}
                />
                <TouchableOpacity
                  style={[styles.photoTriggerBtn, c2Photo && styles.photoTriggerBtnActive]}
                  onPress={async () => {
                    const captured = await captureContainerPhoto();
                    if (captured) setC2Photo(captured);
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={c2Photo ? 'camera' : 'camera-outline'}
                    size={20}
                    color={c2Photo ? theme.accent : theme.textSecondary}
                  />
                </TouchableOpacity>
              </View>

              {/* Photo preview thumbnail */}
              {c2Photo && (
                <View style={styles.photoPreviewRow}>
                  <Image source={{ uri: c2Photo.uri }} style={styles.photoThumb} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.photoAttachedText}>Photo attached ✓</Text>
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
                      <TouchableOpacity
                        onPress={async () => {
                          const captured = await captureContainerPhoto();
                          if (captured) setC2Photo(captured);
                        }}
                      >
                        <Text style={styles.photoActionText}>Retake</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => setC2Photo(null)}>
                        <Text style={[styles.photoActionText, { color: theme.danger }]}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}

              {/* Validation warning & suggestion */}
              {c2Validation?.severity === 'warning' && (
                <View style={styles.warningBox}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="warning-outline" size={16} color={theme.statusPendingText} />
                    <Text style={styles.warningTitle}>Check Digit Mismatch</Text>
                  </View>
                  <Text style={styles.warningMessage}>{c2Validation.message}</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                    {c2Validation.suggestedNumber && (
                      <TouchableOpacity
                        style={styles.suggestionBtn}
                        onPress={() => {
                          setContainerNumber2(c2Validation.suggestedNumber!);
                          setC2ConfirmedUnverified(false);
                          if (errors.c2) setErrors((e) => ({ ...e, c2: '' }));
                        }}
                      >
                        <Ionicons name="sparkles" size={14} color="#FFFFFF" />
                        <Text style={styles.suggestionBtnText}>Use {c2Validation.suggestedNumber}</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={[
                        styles.confirmUnverifiedBtn,
                        c2ConfirmedUnverified && styles.confirmUnverifiedBtnActive,
                      ]}
                      onPress={() => setC2ConfirmedUnverified(!c2ConfirmedUnverified)}
                    >
                      <Text
                        style={[
                          styles.confirmUnverifiedBtnText,
                          c2ConfirmedUnverified && styles.confirmUnverifiedBtnTextActive,
                        ]}
                      >
                        {c2ConfirmedUnverified ? 'Confirmed Unverified ✓' : 'Confirm as Unverified'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  {c2ConfirmedUnverified && !c2Photo && (
                    <Text style={styles.photoRequiredNote}>
                      * Photo is required for unverified containers before starting trip. Tap the camera icon above.
                    </Text>
                  )}
                </View>
              )}

              {errors.c2 && <Text style={styles.errorText}>{errors.c2}</Text>}
            </View>
          )}

          {/* 7. Notes (Collapsed by default: "+ Add note") */}
          <View style={styles.fieldGroup}>
            {!showNotes ? (
              <TouchableOpacity
                onPress={() => setShowNotes(true)}
                style={styles.addNoteBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={16} color={theme.accent} />
                <Text style={styles.addNoteBtnText}>Add note</Text>
              </TouchableOpacity>
            ) : (
              <View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <Text style={styles.fieldLabel}>OPERATIONAL NOTES</Text>
                  <TouchableOpacity onPress={() => setShowNotes(false)}>
                    <Text style={{ fontSize: 11, color: theme.textSecondary }}>Hide</Text>
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={[styles.input, { height: 60, textAlignVertical: 'top', paddingTop: 8 }]}
                  placeholder="Enter remarks (seal verification, gate shift, terminal notes)..."
                  placeholderTextColor={theme.textHint}
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                />
              </View>
            )}
          </View>

          {/* 8. More Options (Damage status & Return category collapsed) */}
          <View style={styles.fieldGroup}>
            <TouchableOpacity
              onPress={() => setShowMoreOptions(!showMoreOptions)}
              style={styles.moreOptionsToggle}
              activeOpacity={0.7}
            >
              <Text style={styles.moreOptionsToggleText}>
                {showMoreOptions ? '− Less options' : '+ More options (Damage, Cargo Category)'}
              </Text>
              <Ionicons
                name={showMoreOptions ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={theme.accent}
              />
            </TouchableOpacity>

            {showMoreOptions && (
              <View style={styles.moreOptionsContent}>
                {/* Damage Condition */}
                <View style={{ gap: 4, marginBottom: 12 }}>
                  <Text style={styles.fieldLabel}>CARGO SEAL / DAMAGE CONDITION</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                      style={[
                        styles.segmentBtn,
                        damageStatus === 'NONE' && styles.segmentBtnActive,
                      ]}
                      onPress={() => setDamageStatus('NONE')}
                    >
                      <Text style={[styles.segmentBtnText, damageStatus === 'NONE' && styles.segmentBtnTextActive]}>
                        Sound (No Damage)
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.segmentBtn,
                        damageStatus === 'DAMAGED' && styles.segmentBtnDangerActive,
                      ]}
                      onPress={() => setDamageStatus('DAMAGED')}
                    >
                      <Text style={[styles.segmentBtnText, damageStatus === 'DAMAGED' && styles.segmentBtnDangerText]}>
                        Damage Reported
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Return Category */}
                <View style={{ gap: 4 }}>
                  <Text style={styles.fieldLabel}>CARGO DISPATCH CATEGORY</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                      style={[
                        styles.segmentBtn,
                        !isReturn && styles.segmentBtnActive,
                      ]}
                      onPress={() => setIsReturn(false)}
                    >
                      <Text style={[styles.segmentBtnText, !isReturn && styles.segmentBtnTextActive]}>
                        Standard Haulage
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.segmentBtn,
                        isReturn && styles.segmentBtnActive,
                      ]}
                      onPress={() => setIsReturn(true)}
                    >
                      <Text style={[styles.segmentBtnText, isReturn && styles.segmentBtnTextActive]}>
                        Return Container
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* 9. Start time: ONE plain grey line (Asia/Colombo) */}
          <View style={styles.plainLineRow}>
            <Text style={styles.plainLineText}>
              Starts now: {colomboStartTime}
            </Text>
          </View>

          {/* 10. Trip Summary: ONE short grey line */}
          <View style={styles.plainLineRow}>
            <Text style={[styles.plainLineText, { color: theme.textSecondary, fontWeight: '600' }]}>
              {summaryLine}
            </Text>
          </View>

          {/* 11. Button: ONE solid #0F766E "Start Trip" at the bottom */}
          <View style={{ marginTop: 16 }}>
            <AppButton
              label="Start Trip"
              variant="primary"
              onPress={handleStartTrip}
              loading={loading}
              iconName="play-circle-outline"
            />
          </View>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  scroll: {
    flexGrow: 1,
    gap: Spacing.two,
  },
  topNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingRight: 8,
  },
  backLinkText: {
    ...Typography.body,
    fontSize: 14,
    color: theme.textSecondary,
  },
  screenHeading: {
    ...Typography.pageTitle,
    fontSize: 18,
    color: theme.text,
  },

  // ─── 1. TOP CONTEXT LINE ───
  driverContextLine: {
    paddingVertical: 4,
    marginBottom: 8,
  },
  driverContextText: {
    fontSize: 13,
    color: theme.textSecondary,
    fontWeight: '500',
  },

  // ─── FORM ───
  formBody: {
    gap: 16,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    ...Typography.label,
    fontSize: 12,
    fontWeight: '700',
    color: theme.textSecondary,
    letterSpacing: 0.3,
  },
  input: {
    height: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: Layout.radius,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 14,
    fontSize: 14,
    color: theme.text,
  },
  inputError: {
    borderColor: theme.danger,
  },
  errorText: {
    fontSize: 12,
    color: theme.danger,
    marginTop: 2,
  },
  inputWithIconWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  inputTrailingIcon: {
    position: 'absolute',
    right: 12,
  },

  // ─── CHIPS & PICKERS ───
  vesselChips: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  chip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipActive: {
    backgroundColor: theme.accentSoft,
    borderColor: theme.accent,
  },
  chipText: {
    fontSize: 12,
    color: theme.textSecondary,
    fontWeight: '600',
  },
  chipTextActive: {
    color: theme.accent,
    fontWeight: '700',
  },

  terminalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  termChip: {
    flex: 1,
    minWidth: 90,
    height: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  termChipActive: {
    backgroundColor: theme.accentSoft,
    borderColor: theme.accent,
  },
  termChipDisabled: {
    opacity: 0.35,
    backgroundColor: theme.backgroundSurfaceLow,
  },
  termChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.textSecondary,
  },
  termChipTextActive: {
    color: theme.accent,
  },
  termChipTextDisabled: {
    color: theme.textHint,
  },

  // ─── SEGMENTED LOAD CONTROL ───
  segmentedRow: {
    flexDirection: 'row',
    gap: 8,
  },
  segmentBtn: {
    flex: 1,
    height: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: Layout.radius,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentBtnActive: {
    backgroundColor: theme.accentSoft,
    borderColor: theme.accent,
  },
  segmentBtnDangerActive: {
    backgroundColor: theme.dangerContainer,
    borderColor: theme.danger,
  },
  segmentBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.textSecondary,
  },
  segmentBtnTextActive: {
    color: theme.accent,
    fontWeight: '700',
  },
  segmentBtnDangerText: {
    color: theme.danger,
    fontWeight: '700',
  },

  // ─── COLLAPSIBLES ───
  addNoteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  addNoteBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.accent,
  },
  moreOptionsToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    marginTop: 4,
  },
  moreOptionsToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.accent,
  },
  moreOptionsContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: Layout.radius,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 14,
    marginTop: 6,
  },

  // ─── PLAIN LINES ───
  plainLineRow: {
    paddingVertical: 2,
  },
  plainLineText: {
    fontSize: 13,
    color: theme.textSecondary,
  },

  // ─── RECENT & VERIFICATION CHIPS ───
  recentTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.textSecondary,
    letterSpacing: 0.5,
  },
  recentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: theme.accentSoft,
    borderWidth: 1,
    borderColor: theme.accent,
  },
  recentChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.accent,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.statusApprovedBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  verifiedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.statusApprovedText,
  },
  unverifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.statusPendingBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  unverifiedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.statusPendingText,
  },
  photoTriggerBtn: {
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderLeftWidth: 1,
    borderLeftColor: theme.border,
  },
  photoTriggerBtnActive: {
    backgroundColor: theme.accentSoft,
  },
  photoPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
    padding: 8,
    backgroundColor: theme.backgroundSurfaceLow,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.border,
  },
  photoThumb: {
    width: 48,
    height: 48,
    borderRadius: 6,
    backgroundColor: theme.border,
  },
  photoAttachedText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.statusApprovedText,
  },
  photoActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.accent,
  },
  warningBox: {
    marginTop: 8,
    padding: 10,
    backgroundColor: theme.statusPendingBg,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  warningTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.statusPendingText,
  },
  warningMessage: {
    fontSize: 12,
    color: theme.textSecondary,
    marginTop: 2,
  },
  suggestionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.accent,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  suggestionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  confirmUnverifiedBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: '#FFFFFF',
  },
  confirmUnverifiedBtnActive: {
    backgroundColor: theme.accentSoft,
    borderColor: theme.accent,
  },
  confirmUnverifiedBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.textSecondary,
  },
  confirmUnverifiedBtnTextActive: {
    color: theme.accent,
    fontWeight: '700',
  },
  photoRequiredNote: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.danger,
    marginTop: 6,
  },
});
