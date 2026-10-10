import React, { useState, useEffect } from 'react';
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
import axios from 'axios';
import { useAuthStore } from '../../../src/store/authStore';
import API_BASE_URL from '../../../src/config/api';
import { colors, radius, spacing, shadow } from '../../../src/theme';
import { useMockTripStore } from '../../../src/store/mockTripStore';
import { TripVerifyOverlay } from '../../../src/components/TripVerifyOverlay';
import {
  containerService,
  normalizeContainerNumber,
  isValidIsoFormat,
  computeCheckDigit,
  validateIsoClientSide,
  ValidateContainerResult,
} from '../../../src/services/containerService';

// All 6 terminals
const TERMINALS = ['CWIT', 'JCT', 'ECT', 'UCT', 'SAGT', 'CICT'];
const POPULAR_VESSELS = ['MSC Aurora', 'Maersk Line', 'CMA CGM', 'Evergreen', 'COSCO'];

interface ContainerEntry {
  containerNumber: string;
  containerNumber2?: string; // only used when size is 20FT
  size: '20FT' | '40FT';
  destTerminal: string;
  sealNumber?: string;
  damageStatus?: string;
  remarks?: string;
}

function emptyContainer(defaultDest: string): ContainerEntry {
  return { containerNumber: '', containerNumber2: '', size: '40FT', destTerminal: defaultDest };
}

// ────────────────────────────────────────────────────────────────
// Sub-component: terminal grid selector
// ────────────────────────────────────────────────────────────────
function TerminalPicker({
  label,
  selected,
  onSelect,
  accentColor,
  exclude,
}: {
  label: string;
  selected: string;
  onSelect: (t: string) => void;
  accentColor: string;
  exclude?: string;
}) {
  return (
    <View style={tp.wrapper}>
      <Text style={tp.label}>{label}</Text>
      <View style={tp.grid}>
        {TERMINALS.map((t) => {
          const isExcluded = exclude != null && t === exclude;
          const isActive = selected === t && !isExcluded;
          return (
            <TouchableOpacity
              key={t}
              disabled={isExcluded}
              style={[
                tp.btn,
                isActive && { backgroundColor: accentColor, borderColor: accentColor },
                isExcluded && tp.btnDisabled,
              ]}
              onPress={() => onSelect(t)}
            >
              <Text
                style={[
                  tp.btnText,
                  isActive && tp.btnTextActive,
                  isExcluded && tp.btnTextDisabled,
                ]}
              >
                {t}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const tp = StyleSheet.create({
  wrapper: { marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  btn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceContainerHighest,
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnText: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
  btnTextActive: { color: colors.navy },
  btnDisabled: { opacity: 0.4 },
  btnTextDisabled: { color: colors.textMuted },
});

// ────────────────────────────────────────────────────────────────
// Sub-component: live container ISO 6346 validation feedback
// ────────────────────────────────────────────────────────────────
function ContainerValidationPill({
  containerNumber,
  onFixCheckDigit,
}: {
  containerNumber: string;
  onFixCheckDigit: (corrected: string) => void;
}) {
  const [valResult, setValResult] = useState<ValidateContainerResult | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const clean = normalizeContainerNumber(containerNumber);
    if (!clean || clean.length < 4) {
      setValResult(null);
      return;
    }

    // 1. Instant client-side validation
    const clientRes = validateIsoClientSide(clean);
    setValResult(clientRes);

    // 2. Authoritative backend duplicate check if format valid
    if (clientRes.isoFormatValid) {
      let cancelled = false;
      setChecking(true);
      containerService.validateContainer(clean)
        .then((res) => {
          if (!cancelled) setValResult(res);
        })
        .catch(() => {})
        .finally(() => {
          if (!cancelled) setChecking(false);
        });

      return () => {
        cancelled = true;
      };
    }
  }, [containerNumber]);

  if (!containerNumber || containerNumber.trim().length === 0) {
    return (
      <View style={vp.hintWrap}>
        <Ionicons name="information-circle-outline" size={13} color="#849396" />
        <Text style={vp.hintText}>ISO 6346: 4 letters + 6 digits + 1 check digit (e.g. MSCU7721892)</Text>
      </View>
    );
  }

  if (!valResult) return null;

  return (
    <View style={[vp.wrap, valResult.valid ? vp.wrapValid : vp.wrapInvalid]}>
      <Ionicons
        name={valResult.valid ? 'checkmark-circle' : 'alert-circle'}
        size={14}
        color={valResult.valid ? '#22ef7e' : '#ff5252'}
      />
      <Text style={[vp.msg, { color: valResult.valid ? '#22ef7e' : '#ff5252' }]}>
        {valResult.message}
      </Text>
      {checking && <ActivityIndicator size="small" color="#00e5ff" style={{ marginLeft: 4 }} />}

      {!valResult.checkDigitValid && valResult.expectedCheckDigit >= 0 && (
        <TouchableOpacity
          style={vp.fixBtn}
          onPress={() => {
            const base = normalizeContainerNumber(containerNumber).slice(0, 10);
            onFixCheckDigit(`${base}${valResult.expectedCheckDigit}`);
          }}
        >
          <Text style={vp.fixBtnText}>FIX TO {valResult.expectedCheckDigit}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const vp = StyleSheet.create({
  hintWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: -4,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  hintText: {
    fontSize: 11,
    color: '#849396',
    fontWeight: '500',
  },
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: -4,
    marginBottom: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  wrapValid: {
    backgroundColor: 'rgba(34, 239, 126, 0.08)',
    borderColor: 'rgba(34, 239, 126, 0.3)',
  },
  wrapInvalid: {
    backgroundColor: 'rgba(255, 82, 82, 0.08)',
    borderColor: 'rgba(255, 82, 82, 0.3)',
  },
  msg: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  fixBtn: {
    backgroundColor: '#00e5ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  fixBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#00363d',
  },
});

// ────────────────────────────────────────────────────────────────
// Sub-component: single container card
// ────────────────────────────────────────────────────────────────
function ContainerCard({
  entry,
  onChange,
  loadingTerminal,
}: {
  entry: ContainerEntry;
  onChange: (field: keyof ContainerEntry, value: string) => void;
  loadingTerminal: string;
}) {
  const is20FT = entry.size === '20FT';
  return (
    <View style={cc.card}>
      {/* Size selection — first, so inputs react immediately */}
      <Text style={cc.fieldLabel}>Container Size</Text>
      <View style={cc.sizeRow}>
        {(['20FT', '40FT'] as const).map((s) => (
          <TouchableOpacity
            key={s}
            style={[cc.sizeBtn, entry.size === s && cc.sizeBtnActive]}
            onPress={() => onChange('size', s)}
          >
            <Text style={[cc.sizeTxt, entry.size === s && cc.sizeTxtActive]}>{s}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Container numbers — 2 inputs for 20FT, 1 for 40FT */}
      {is20FT ? (
        <>
          <Text style={cc.fieldLabel}>Container No. 1 * (Manual Entry)</Text>
          <TextInput
            style={cc.input}
            placeholder="e.g. MSCU7721892"
            placeholderTextColor="#9AA5B1"
            autoCapitalize="characters"
            value={entry.containerNumber}
            onChangeText={(v) => onChange('containerNumber', normalizeContainerNumber(v))}
          />
          <ContainerValidationPill
            containerNumber={entry.containerNumber}
            onFixCheckDigit={(corrected) => onChange('containerNumber', corrected)}
          />

          <Text style={cc.fieldLabel}>Container No. 2 * (Manual Entry)</Text>
          <TextInput
            style={cc.input}
            placeholder="e.g. TCKU3456789"
            placeholderTextColor="#9AA5B1"
            autoCapitalize="characters"
            value={entry.containerNumber2}
            onChangeText={(v) => onChange('containerNumber2', normalizeContainerNumber(v))}
          />
          <ContainerValidationPill
            containerNumber={entry.containerNumber2 || ''}
            onFixCheckDigit={(corrected) => onChange('containerNumber2', corrected)}
          />
        </>
      ) : (
        <>
          <Text style={cc.fieldLabel}>Container Number * (Manual Entry)</Text>
          <TextInput
            style={cc.input}
            placeholder="e.g. MSCU7721892"
            placeholderTextColor="#9AA5B1"
            autoCapitalize="characters"
            value={entry.containerNumber}
            onChangeText={(v) => onChange('containerNumber', normalizeContainerNumber(v))}
          />
          <ContainerValidationPill
            containerNumber={entry.containerNumber}
            onFixCheckDigit={(corrected) => onChange('containerNumber', corrected)}
          />
        </>
      )}

      {/* Destination Terminal */}
      <TerminalPicker
        label="Destination Terminal *"
        selected={entry.destTerminal}
        onSelect={(t) => onChange('destTerminal', t)}
        accentColor={colors.primaryContainer}
        exclude={loadingTerminal}
      />
    </View>
  );
}

const cc = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 },
  input: {
    backgroundColor: colors.surfaceContainerHighest,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
    marginBottom: 12,
    ...(Platform.OS === 'web' && { outlineStyle: 'none', cursor: 'text' } as any),
  },
  sizeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  sizeBtn: {
    flex: 1,
    backgroundColor: colors.surfaceContainerHighest,
    paddingVertical: 12,
    borderRadius: radius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  sizeBtnActive: { backgroundColor: colors.primaryContainer, borderColor: colors.primaryContainer },
  sizeTxt: { fontSize: 14, fontWeight: '700', color: colors.textSecondary },
  sizeTxtActive: { color: colors.navy },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
});

// ────────────────────────────────────────────────────────────────
// Main Screen
// ────────────────────────────────────────────────────────────────
export default function NewTripScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [vesselName, setVesselName] = useState('MSC Aurora');
  const [sourceTerminal, setSourceTerminal] = useState('CICT');
  const [operationDate, setOperationDate] = useState(new Date().toISOString().split('T')[0]);
  const [operationTime, setOperationTime] = useState('08:00');


  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [showVerify, setShowVerify] = useState(false);
  const [sentTripNumber, setSentTripNumber] = useState<string | null>(null);

  // Single container detail entry (20FT can still capture two numbers)
  const [containers, setContainers] = useState<ContainerEntry[]>([emptyContainer('JCT')]);

  const updateContainer = (idx: number, field: keyof ContainerEntry, value: string) => {
    setContainers((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') window.alert(`${title}: ${message}`);
    else Alert.alert(title, message);
  };

  const handleStartTrip = async () => {
    // 1. Mission Info Validations
    if (!vesselName.trim()) {
      showAlert('Required', 'Please enter a vessel name.');
      return;
    }
    if (!sourceTerminal) {
      showAlert('Required', 'Please select a loading terminal.');
      return;
    }

    // 2. Comprehensive Container Validations (ISO 6346 & Duplicate Check)
    const seenContainers = new Set<string>();

    for (let i = 0; i < containers.length; i++) {
      const entry = containers[i];
      const numbersToValidate = [entry.containerNumber];
      if (entry.size === '20FT' && entry.containerNumber2 && entry.containerNumber2.trim()) {
        numbersToValidate.push(entry.containerNumber2);
      }

      for (let j = 0; j < numbersToValidate.length; j++) {
        const raw = numbersToValidate[j];
        const cNum = normalizeContainerNumber(raw);
        const contLabel = numbersToValidate.length > 1 ? `Container ${i + 1} (#${j + 1})` : `Container ${i + 1}`;

        if (!cNum) {
          showAlert('Required', `Please manually enter ${contLabel} number.`);
          return;
        }

        // A. Format validation: 4 letters + 7 numbers
        if (!isValidIsoFormat(cNum)) {
          showAlert(
            'Invalid Format',
            `${contLabel} (${cNum}) must follow ISO standard: 4 uppercase letters followed by 7 numbers (e.g. MSCU7721892).`
          );
          return;
        }

        // B. ISO 6346 Check Digit Validation
        const expectedDigit = computeCheckDigit(cNum);
        const actualDigit = parseInt(cNum[10], 10);
        if (expectedDigit !== actualDigit) {
          showAlert(
            'Check Digit Mismatch',
            `${contLabel} (${cNum}) failed ISO 6346 check digit validation.\n\nEntered Check Digit: ${actualDigit}\nExpected Check Digit: ${expectedDigit}\n\nPlease correct the container number before proceeding.`
          );
          return;
        }

        // C. Check for duplicate within the current trip
        if (seenContainers.has(cNum)) {
          showAlert('Duplicate Entry', `Container ${cNum} is entered more than once in this trip.`);
          return;
        }
        seenContainers.add(cNum);

        // D. Authoritative backend duplicate check against database
        try {
          const valRes = await containerService.validateContainer(cNum);
          if (valRes.duplicate || !valRes.valid) {
            showAlert(
              'Duplicate Container in Database',
              valRes.message || `Container ${cNum} already exists in database or active terminal records. Duplicate entry is not allowed.`
            );
            return;
          }
        } catch (err) {
          console.warn('Backend container duplicate check warning:', err);
        }
      }

      // 3. Terminal validation
      if (!entry.destTerminal) {
        showAlert('Required', `Please select a destination terminal for Container ${i + 1}.`);
        return;
      }
      if (entry.destTerminal === sourceTerminal) {
        showAlert(
          'Invalid Route',
          `Container ${i + 1} destination terminal cannot be the same as the loading terminal (${sourceTerminal}).`
        );
        return;
      }
    }

    setShowVerify(true);
  };

  const goHomeAfterSend = () => {
    setSentTripNumber(null);
    router.replace('/(driver)/(tabs)');
  };

  const submitTrip = async () => {
    setLoading(true);
    const allTripContainers: any[] = [];
    containers.forEach((c, i) => {
      allTripContainers.push({
        id: `CONT-${Date.now()}-${i}-1`,
        containerNumber: c.containerNumber.trim().toUpperCase(),
        size: c.size,
        destTerminal: c.destTerminal,
        sealNumber: c.sealNumber,
        damageStatus: c.damageStatus,
        remarks: c.remarks,
      });
      if (c.size === '20FT' && c.containerNumber2 && c.containerNumber2.trim()) {
        allTripContainers.push({
          id: `CONT-${Date.now()}-${i}-2`,
          containerNumber: c.containerNumber2.trim().toUpperCase(),
          size: '20FT',
          destTerminal: c.destTerminal,
          sealNumber: c.sealNumber,
          damageStatus: c.damageStatus,
          remarks: c.remarks,
        });
      }
    });

    try {
      // Build payload — one trip with multiple containers, each with own destTerminal
      // We use the first container's destTerminal as the trip-level destTerminal
      const tripDestTerminal = containers[0].destTerminal;

      const payload = {
        driverId: user?.driverId || user?.id,
        vesselName: vesselName.trim(),
        operationDate,
        operationTime,
        vehicleNumber: user?.vehicleNumber || 'WP-DA-4521',
        chaiNumber: user?.chaiNumber || undefined,
        sourceTerminal,
        destTerminal: tripDestTerminal,
        notes: notes.trim() || undefined,
        containers: allTripContainers.map((c) => ({
          containerNumber: c.containerNumber,
          size: c.size,
          destTerminal: c.destTerminal,
          sealNumber: c.sealNumber,
          damageStatus: c.damageStatus,
          remarks: c.remarks,
        })),
      };

      const res = await axios.post(`${API_BASE_URL}/trips`, payload);
      const createdTrip = res.data;
      setShowVerify(false);
      setSentTripNumber(createdTrip.tripNumber || createdTrip.id);
    } catch (err: any) {
      console.warn('Backend unavailable — simulating successful trip creation for demo mode.');
      
      const newTripId = `ITT-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
      useMockTripStore.getState().addTrip({
        id: newTripId,
        tripNumber: newTripId,
        driverId: user?.driverId || user?.id || 'demo-driver',
        driverName: user?.name || 'Demo Driver',
        vehicleNumber: user?.vehicleNumber || 'WP-DA-4521',
        chaiNumber: user?.chaiNumber || undefined,
        vesselName: vesselName.trim(),
        operationDate,
        operationTime,
        sourceTerminal,
        destTerminal: containers[0].destTerminal,
        notes,
        status: 'PENDING_APPROVAL',
        containers: allTripContainers,
        startTime: new Date().toISOString(),
      });

      setShowVerify(false);
      setSentTripNumber(newTripId);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Confirm New Trip</Text>
        <Text style={styles.headerSub}>Load containers, then wait for supervisor confirmation</Text>
      </View>

      <View style={styles.content}>
        {/* Driver info card */}
        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>1. Driver Details</Text>
          <View style={styles.infoRow}>
            <View>
              <Text style={styles.infoLabel}>Driver Name</Text>
              <Text style={styles.infoValue}>{user?.name || 'Kamal Perera'}</Text>
              <Text style={styles.infoSub}>Driver Code: {user?.driverCode || user?.employeeId || 'DRV-1001'}</Text>
              <Text style={styles.infoSub}>Contact: {user?.mobileNumber || '+94 77 123 4567'}</Text>
            </View>
            <View style={styles.truckBadge}>
              <Text style={styles.truckLabel}>TRUCK</Text>
              <Text style={styles.truckValue}>{user?.vehicleNumber || 'WP-DA-4521'}</Text>
            </View>
          </View>
        </View>

        {/* Vessel */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Vessel Details</Text>
          <Text style={styles.fieldLabel}>Vessel Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. MSC Aurora"
            placeholderTextColor="#9AA5B1"
            value={vesselName}
            onChangeText={setVesselName}
          />
          <View style={styles.chipsRow}>
            {POPULAR_VESSELS.map((v) => (
              <TouchableOpacity
                key={v}
                style={[styles.chip, vesselName === v && styles.chipActive]}
                onPress={() => setVesselName(v)}
              >
                <Text style={[styles.chipText, vesselName === v && styles.chipTextActive]}>{v}</Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <TerminalPicker
            label="Loading Terminal *"
            selected={sourceTerminal}
            onSelect={(t) => {
              setSourceTerminal(t);
              setContainers((prev) =>
                prev.map((c) => (c.destTerminal === t ? { ...c, destTerminal: '' } : c))
              );
            }}
            accentColor={colors.primaryContainer}
          />

          <Text style={styles.fieldLabel}>Operation Date</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#9AA5B1"
            value={operationDate}
            onChangeText={setOperationDate}
          />
          
          <Text style={styles.fieldLabel}>Operation Time</Text>
          <TextInput
            style={styles.input}
            placeholder="HH:MM"
            placeholderTextColor="#9AA5B1"
            value={operationTime}
            onChangeText={setOperationTime}
          />
        </View>


        {/* Containers Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📦 Container Details</Text>
          <Text style={styles.sectionSub}>Enter size, number(s), and destination terminal</Text>

          {containers.map((entry, idx) => (
            <ContainerCard
              key={idx}
              entry={entry}
              onChange={(field, value) => updateContainer(idx, field, value)}
              loadingTerminal={sourceTerminal}
            />
          ))}
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Notes</Text>
          <Text style={styles.fieldLabel}>Notes (Optional)</Text>
          <TextInput
            style={[styles.input, { height: 70, textAlignVertical: 'top' }]}
            placeholder="Special instructions, gate lane, cargo notes..."
            placeholderTextColor="#9AA5B1"
            multiline
            value={notes}
            onChangeText={setNotes}
          />
        </View>

        {/* Summary row */}
        <View style={styles.summaryBox}>
          <Text style={styles.summaryTitle}>5. Trip Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryKey}>Containers</Text>
            <Text style={styles.summaryVal}>{containers.length}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryKey}>Loading terminal</Text>
            <Text style={styles.summaryVal}>{sourceTerminal || '—'}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryKey}>Destinations</Text>
            <Text style={styles.summaryVal}>
              {[...new Set(containers.map((c) => c.destTerminal))].join(', ') || '—'}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryKey}>Vessel</Text>
            <Text style={styles.summaryVal}>{vesselName || '—'}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryKey}>Vehicle / Chai</Text>
            <Text style={styles.summaryVal}>{user?.vehicleNumber || 'WP-DA-4521'} / {user?.chaiNumber || '—'}</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
          <TouchableOpacity style={[styles.startBtn, { flex: 1, backgroundColor: colors.surfaceContainerHighest }]} onPress={() => router.back()}>
            <Text style={[styles.startBtnText, { color: colors.textSecondary }]}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.startBtn, { flex: 1, backgroundColor: colors.secondaryContainer }]}>
            <Text style={[styles.startBtnText, { color: colors.onSecondaryContainer }]}>Save Draft</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.startBtn, loading && styles.startBtnDisabled]}
          onPress={handleStartTrip}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.startBtnText}>Verify & send to supervisor</Text>
          )}
        </TouchableOpacity>
      </View>

      {showVerify && (
        <TripVerifyOverlay
          mode="verify"
          vesselName={vesselName}
          sourceTerminal={sourceTerminal}
          destTerminals={[...new Set(containers.map((c) => c.destTerminal))].join(', ')}
          vehicleNumber={user?.vehicleNumber}
          driverName={user?.name}
          containers={containers.map((c) => ({
            containerNumber: c.containerNumber.trim().toUpperCase(),
            size: c.size,
            destTerminal: c.destTerminal,
          }))}
          notes={notes.trim() || undefined}
          submitting={loading}
          onCancel={() => setShowVerify(false)}
          onConfirm={submitTrip}
        />
      )}

      {sentTripNumber && (
        <TripVerifyOverlay
          mode="sent"
          tripNumber={sentTripNumber}
          vesselName={vesselName}
          containerCount={containers.length}
          onDone={goHomeAfterSend}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.surfaceContainerLowest,
    padding: spacing.lg, paddingTop: 60, paddingBottom: spacing.lg,
    borderBottomLeftRadius: radius.xl, borderBottomRightRadius: radius.xl,
    ...shadow.card,
  },
  backBtn: { paddingVertical: 4, marginBottom: spacing.sm, alignSelf: 'flex-start' },
  backText: { color: colors.primaryContainer, fontSize: 15, fontWeight: '700' },
  headerTitle: { color: colors.text, fontSize: 24, fontWeight: '800' },
  headerSub: { color: colors.textSecondary, fontSize: 13, marginTop: 4 },

  content: { padding: spacing.md, paddingBottom: 50 },

  infoCard: {
    backgroundColor: colors.surfaceContainer, borderRadius: radius.lg, padding: spacing.md,
    marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border,
    ...shadow.card,
  },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoLabel: { fontSize: 11, color: colors.textSecondary },
  infoValue: { fontSize: 17, fontWeight: '800', color: colors.text, marginTop: 2 },
  infoSub: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  truckBadge: {
    backgroundColor: colors.surfaceContainerHighest, paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: radius.md, alignItems: 'center', borderWidth: 1, borderColor: colors.borderLight,
  },
  truckLabel: { fontSize: 10, fontWeight: '800', color: colors.primaryContainer },
  truckValue: { fontSize: 14, fontWeight: '700', color: colors.text, marginTop: 2 },

  section: {
    backgroundColor: colors.surfaceContainer, borderRadius: radius.lg, padding: spacing.md,
    marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border,
    ...shadow.card,
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 2 },
  sectionSub: { fontSize: 13, color: colors.textSecondary, marginBottom: 12 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 },

  input: {
    backgroundColor: colors.surfaceContainerHighest, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: colors.text, marginBottom: 12,
    ...(Platform.OS === 'web' && { outlineStyle: 'none', cursor: 'text' } as any),
  },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip: {
    backgroundColor: colors.surfaceContainerHighest, paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primaryContainer, borderColor: colors.primaryContainer },
  chipText: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },
  chipTextActive: { color: colors.navy, fontWeight: '800' },

  summaryBox: {
    backgroundColor: colors.surfaceContainerLowest, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  summaryTitle: { color: colors.text, fontSize: 15, fontWeight: '800', marginBottom: 14, textTransform: 'uppercase', letterSpacing: 1 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryKey: { color: colors.textSecondary, fontSize: 14 },
  summaryVal: { color: colors.primary, fontSize: 14, fontWeight: '700' },

  startBtn: {
    backgroundColor: colors.primaryContainer, paddingVertical: 18, borderRadius: radius.lg,
    alignItems: 'center', marginTop: spacing.sm,
    ...shadow.glow,
  },
  startBtnDisabled: { opacity: 0.5 },
  startBtnText: { color: colors.navy, fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
});
