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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../../src/store/authStore';
import { driverService } from '../../../src/services/driverService';
import apiClient from '../../../src/services/api';
import { Colors, Typography, Layout, Spacing } from '../../../src/constants/theme';
import { useResponsive } from '../../../src/hooks/useResponsive';
import { useMockTripStore } from '../../../src/store/mockTripStore';
import { resolveCheNumber, resolveOperator } from '../../../src/config/fleet';
import {
  containerService,
  normalizeContainerNumber,
  isValidIsoFormat,
  computeCheckDigit,
  validateIsoClientSide,
  hasSymbols,
} from '../../../src/services/containerService';
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

  // Real-time ISO validations for Container 1
  const c1Clean = normalizeContainerNumber(containerNumber1);
  const c1Validation = useMemo(() => {
    if (!c1Clean) return null;
    return validateIsoClientSide(containerNumber1);
  }, [c1Clean, containerNumber1]);

  // Real-time ISO validations for Container 2
  const c2Clean = normalizeContainerNumber(containerNumber2);
  const c2Validation = useMemo(() => {
    if (!c2Clean) return null;
    return validateIsoClientSide(containerNumber2);
  }, [c2Clean, containerNumber2]);

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
    } else if (hasSymbols(containerNumber1)) {
      errs.c1 = 'Symbols not allowed. Enter 4 letters + 7 numbers (e.g. MSCU7721892)';
    } else if (!isValidIsoFormat(c1Clean)) {
      errs.c1 = 'Must be exactly 4 uppercase letters + 7 numbers (e.g. MSCU7721892)';
    } else {
      const exp1 = computeCheckDigit(c1Clean);
      const act1 = parseInt(c1Clean[10], 10);
      if (exp1 !== act1) {
        errs.c1 = `Check digit mismatch (Entered: ${act1}, ISO expects: ${exp1})`;
      }
    }

    // Validate Container 2 if 2x20FT
    if (loadConfig === '2x20FT') {
      if (!containerNumber2.trim()) {
        errs.c2 = 'Container #2 number is required for 2 x 20FT';
      } else if (hasSymbols(containerNumber2)) {
        errs.c2 = 'Symbols not allowed in Container #2';
      } else if (!isValidIsoFormat(c2Clean)) {
        errs.c2 = 'Must be exactly 4 uppercase letters + 7 numbers';
      } else if (c1Clean === c2Clean) {
        errs.c2 = 'Container 1 and Container 2 cannot have the same number';
      } else {
        const exp2 = computeCheckDigit(c2Clean);
        const act2 = parseInt(c2Clean[10], 10);
        if (exp2 !== act2) {
          errs.c2 = `Check digit mismatch (Entered: ${act2}, ISO expects: ${exp2})`;
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

    tripContainers.push({
      containerNumber: c1Clean,
      size,
      destTerminal,
      damageStatus,
      isReturn,
      remarks: notes.trim() || undefined,
    });

    if (loadConfig === '2x20FT') {
      tripContainers.push({
        containerNumber: c2Clean,
        size: '20FT',
        destTerminal: destTerminal2 || destTerminal,
        damageStatus,
        isReturn,
        remarks: notes.trim() || undefined,
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

      // Update local cache as verified confirmed
      useMockTripStore.getState().addTrip({
        id: created.id || `TRP-${Date.now()}`,
        tripNumber: created.tripNumber || created.id || `ITT-${Date.now()}`,
        driverId: user?.driverId || user?.id || 'driver',
        driverCode: user?.driverCode || user?.username || '-',
        driverName: driverName,
        vehicleNumber: assignedVeh,
        chassisNumber: assignedChe,
        operator: assignedOp,
        vesselName: vesselName.trim(),
        sourceTerminal,
        destTerminal: destString,
        notes: notes.trim() || undefined,
        status: 'IN_PROGRESS',
        containers: tripContainers.map((c) => ({ ...c, status: 'IN_TRANSIT' })),
        startTime: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });

      Alert.alert('Trip Started', 'Mission registered on live server. Drive safely.', [
        { text: 'OK', onPress: () => router.replace('/(driver)/(tabs)') },
      ]);
    } catch (err: any) {
      console.warn('Backend offline — queuing trip as PENDING_SYNC:', err);

      // Requirement 2: Do NOT show as confirmed. Mark as PENDING_SYNC for retry.
      const queuedId = `OFFLINE-${Date.now()}`;
      useMockTripStore.getState().addTrip({
        id: queuedId,
        tripNumber: queuedId,
        driverId: user?.driverId || user?.id || 'driver',
        driverCode: user?.driverCode || user?.username || '-',
        driverName: driverName,
        vehicleNumber: assignedVeh,
        chassisNumber: assignedChe,
        operator: assignedOp,
        vesselName: vesselName.trim(),
        sourceTerminal,
        destTerminal: destString,
        notes: notes.trim() || undefined,
        status: 'PENDING_APPROVAL', // Marked as pending sync/approval, not confirmed completed
        containers: tripContainers.map((c) => ({ ...c, status: 'PENDING_SYNC' })),
        startTime: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });

      Alert.alert(
        'Offline — Trip Queued',
        'Could not reach central server. Trip has been marked as "Pending Sync" and will automatically synchronize when connection is restored.',
        [{ text: 'OK', onPress: () => router.replace('/(driver)/(tabs)') }]
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

          {/* 6. Container Number(s) */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              CONTAINER NUMBER {loadConfig === '2x20FT' ? '#1' : ''}
            </Text>
            <View style={styles.inputWithIconWrap}>
              <TextInput
                style={[styles.input, { flex: 1 }, errors.c1 && styles.inputError]}
                placeholder="e.g. MSCU7721892"
                placeholderTextColor={theme.textHint}
                value={containerNumber1}
                onChangeText={(t) => {
                  setContainerNumber1(t.toUpperCase());
                  if (errors.c1) setErrors((e) => ({ ...e, c1: '' }));
                }}
                autoCapitalize="characters"
                maxLength={12}
              />
              {c1Validation?.valid && (
                <View style={styles.inputTrailingIcon}>
                  <Ionicons name="checkmark-circle" size={20} color={theme.statusApprovedText} />
                </View>
              )}
            </View>
            {errors.c1 && <Text style={styles.errorText}>{errors.c1}</Text>}
          </View>

          {loadConfig === '2x20FT' && (
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>CONTAINER NUMBER #2</Text>
              <View style={styles.inputWithIconWrap}>
                <TextInput
                  style={[styles.input, { flex: 1 }, errors.c2 && styles.inputError]}
                  placeholder="e.g. MSKU4412091"
                  placeholderTextColor={theme.textHint}
                  value={containerNumber2}
                  onChangeText={(t) => {
                    setContainerNumber2(t.toUpperCase());
                    if (errors.c2) setErrors((e) => ({ ...e, c2: '' }));
                  }}
                  autoCapitalize="characters"
                  maxLength={12}
                />
                {c2Validation?.valid && (
                  <View style={styles.inputTrailingIcon}>
                    <Ionicons name="checkmark-circle" size={20} color={theme.statusApprovedText} />
                  </View>
                )}
              </View>
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
});
