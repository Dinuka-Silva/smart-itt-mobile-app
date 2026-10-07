import React, { useState } from 'react';
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
import axios from 'axios';
import { useAuthStore } from '../../../src/store/authStore';
import API_BASE_URL from '../../../src/config/api';

// All 6 terminals
const TERMINALS = ['CWIT', 'JCT', 'ECT', 'UCT', 'SAGT', 'CICT'];
const POPULAR_VESSELS = ['MSC Aurora', 'Maersk Line', 'CMA CGM', 'Evergreen', 'COSCO'];

// One container entry in the form
interface ContainerEntry {
  containerNumber: string;
  size: '20FT' | '40FT';
  destTerminal: string;
}

function emptyContainer(defaultDest: string): ContainerEntry {
  return { containerNumber: '', size: '40FT', destTerminal: defaultDest };
}

// ────────────────────────────────────────────────────────────────
// Sub-component: terminal grid selector
// ────────────────────────────────────────────────────────────────
function TerminalPicker({
  label,
  selected,
  onSelect,
  accentColor,
}: {
  label: string;
  selected: string;
  onSelect: (t: string) => void;
  accentColor: string;
}) {
  return (
    <View style={tp.wrapper}>
      <Text style={tp.label}>{label}</Text>
      <View style={tp.grid}>
        {TERMINALS.map((t) => (
          <TouchableOpacity
            key={t}
            style={[tp.btn, selected === t && { backgroundColor: accentColor, borderColor: accentColor }]}
            onPress={() => onSelect(t)}
          >
            <Text style={[tp.btnText, selected === t && tp.btnTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const tp = StyleSheet.create({
  wrapper: { marginBottom: 6 },
  label: { fontSize: 12, fontWeight: '700', color: '#4A5568', marginBottom: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  btn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#EDF2F7',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  btnText: { fontSize: 12, fontWeight: '700', color: '#4A5568' },
  btnTextActive: { color: '#fff' },
});

// ────────────────────────────────────────────────────────────────
// Sub-component: single container card
// ────────────────────────────────────────────────────────────────
function ContainerCard({
  index,
  entry,
  onChange,
  onRemove,
  canRemove,
}: {
  index: number;
  entry: ContainerEntry;
  onChange: (field: keyof ContainerEntry, value: string) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  return (
    <View style={cc.card}>
      {/* Card header */}
      <View style={cc.header}>
        <View style={cc.indexBadge}>
          <Text style={cc.indexText}>📦 Container {index + 1}</Text>
        </View>
        {canRemove && (
          <TouchableOpacity style={cc.removeBtn} onPress={onRemove}>
            <Text style={cc.removeTxt}>Remove</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Container number */}
      <Text style={cc.fieldLabel}>Container Number *</Text>
      <TextInput
        style={cc.input}
        placeholder="e.g. MSCU 7721892"
        placeholderTextColor="#9AA5B1"
        autoCapitalize="characters"
        value={entry.containerNumber}
        onChangeText={(v) => onChange('containerNumber', v)}
      />

      {/* Size row */}
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

      {/* Destination Terminal for this container */}
      <TerminalPicker
        label="Destination Terminal *"
        selected={entry.destTerminal}
        onSelect={(t) => onChange('destTerminal', t)}
        accentColor="#FB8C00"
      />
    </View>
  );
}

const cc = StyleSheet.create({
  card: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  indexBadge: { backgroundColor: '#EBF8FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  indexText: { fontSize: 13, fontWeight: '700', color: '#2B6CB0' },
  removeBtn: { backgroundColor: '#FEEBEE', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  removeTxt: { fontSize: 12, fontWeight: '700', color: '#E53935' },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#4A5568', marginBottom: 5 },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: '#1A202C',
    marginBottom: 10,
  },
  sizeRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  sizeBtn: {
    flex: 1,
    backgroundColor: '#EDF2F7',
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sizeBtnActive: { backgroundColor: '#0A1628', borderColor: '#0A1628' },
  sizeTxt: { fontSize: 13, fontWeight: '700', color: '#4A5568' },
  sizeTxtActive: { color: '#fff' },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
});

// ────────────────────────────────────────────────────────────────
// Main Screen
// ────────────────────────────────────────────────────────────────
export default function NewTripScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [vesselName, setVesselName] = useState('MSC Aurora');
  const [sourceTerminal, setSourceTerminal] = useState('ECT');
  const [chassisNumber, setChassisNumber] = useState('CH-8821');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  // Multiple containers — each has its own destTerminal
  const [containers, setContainers] = useState<ContainerEntry[]>([emptyContainer('JCT')]);

  const updateContainer = (idx: number, field: keyof ContainerEntry, value: string) => {
    setContainers((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const addContainer = () => {
    setContainers((prev) => [
      ...prev,
      emptyContainer(prev[prev.length - 1]?.destTerminal || 'JCT'),
    ]);
  };

  const removeContainer = (idx: number) => {
    setContainers((prev) => prev.filter((_, i) => i !== idx));
  };

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') window.alert(`${title}: ${message}`);
    else Alert.alert(title, message);
  };

  const handleStartTrip = async () => {
    // Validations
    if (!vesselName.trim()) { showAlert('Required', 'Please enter a vessel name.'); return; }
    for (let i = 0; i < containers.length; i++) {
      if (!containers[i].containerNumber.trim()) {
        showAlert('Required', `Please enter Container ${i + 1} number.`); return;
      }
      if (containers[i].destTerminal === sourceTerminal) {
        showAlert('Invalid Route', `Container ${i + 1}: Destination terminal cannot be the same as the Origin terminal.`); return;
      }
    }

    setLoading(true);
    try {
      // Build payload — one trip with multiple containers, each with own destTerminal
      // We use the first container's destTerminal as the trip-level destTerminal
      const tripDestTerminal = containers[0].destTerminal;

      const payload = {
        driverId: user?.driverId || user?.id,
        vesselName: vesselName.trim(),
        vehicleNumber: user?.vehicleNumber || 'WP-DA-4521',
        chassisNumber: chassisNumber.trim() || undefined,
        sourceTerminal,
        destTerminal: tripDestTerminal,
        notes: notes.trim() || undefined,
        containers: containers.map((c) => ({
          containerNumber: c.containerNumber.trim().toUpperCase(),
          size: c.size,
          destTerminal: c.destTerminal,
        })),
      };

      const res = await axios.post(`${API_BASE_URL}/trips`, payload);
      const createdTrip = res.data;
      const successMsg =
        `Trip ${createdTrip.tripNumber} confirmed!\n` +
        `${containers.length} container(s) loaded.\n` +
        `Waiting for supervisor confirmation.`;

      if (Platform.OS === 'web') {
        window.alert(successMsg);
        router.replace('/(driver)/(tabs)/trips');
      } else {
        Alert.alert('Trip Confirmed', successMsg, [
          { text: 'OK', onPress: () => router.replace('/(driver)/(tabs)/trips') },
        ]);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to start trip. Check connection.';
      showAlert('Error', msg);
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
          <View style={styles.infoRow}>
            <View>
              <Text style={styles.infoLabel}>Assigned Driver</Text>
              <Text style={styles.infoValue}>{user?.name || 'Kamal Perera'}</Text>
              <Text style={styles.infoSub}>Employee: {user?.employeeId || 'DRV-1001'}</Text>
            </View>
            <View style={styles.truckBadge}>
              <Text style={styles.truckLabel}>TRUCK</Text>
              <Text style={styles.truckValue}>{user?.vehicleNumber || 'WP-DA-4521'}</Text>
            </View>
          </View>
        </View>

        {/* Vessel */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🚢 Vessel Name</Text>
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
        </View>

        {/* Origin Terminal (trip-level) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📍 Origin Terminal</Text>
          <Text style={styles.sectionSub}>Where this truck is departing from</Text>
          <TerminalPicker
            label="Select Origin"
            selected={sourceTerminal}
            onSelect={setSourceTerminal}
            accentColor="#1E88E5"
          />
        </View>

        {/* Containers Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>📦 Containers</Text>
              <Text style={styles.sectionSub}>Each container has its own destination terminal</Text>
            </View>
            <TouchableOpacity style={styles.addContainerBtn} onPress={addContainer}>
              <Text style={styles.addContainerBtnText}>+ Add</Text>
            </TouchableOpacity>
          </View>

          {containers.map((entry, idx) => (
            <ContainerCard
              key={idx}
              index={idx}
              entry={entry}
              onChange={(field, value) => updateContainer(idx, field, value)}
              onRemove={() => removeContainer(idx)}
              canRemove={containers.length > 1}
            />
          ))}
        </View>

        {/* Chassis & Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🚛 Chassis & Notes</Text>
          <Text style={styles.fieldLabel}>Chassis Number</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. CH-8821"
            placeholderTextColor="#9AA5B1"
            value={chassisNumber}
            onChangeText={setChassisNumber}
          />
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
          <Text style={styles.summaryTitle}>Trip Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryKey}>Origin</Text>
            <Text style={styles.summaryVal}>{sourceTerminal}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryKey}>Containers</Text>
            <Text style={styles.summaryVal}>{containers.length}</Text>
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
        </View>

        {/* Start Button */}
        <TouchableOpacity
          style={[styles.startBtn, loading && styles.startBtnDisabled]}
          onPress={handleStartTrip}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.startBtnText}>Confirm Trip — Await Supervisor</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F9' },
  header: {
    backgroundColor: '#0A1628',
    padding: 24, paddingTop: 54, paddingBottom: 24,
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
  },
  backBtn: { paddingVertical: 4, marginBottom: 8, alignSelf: 'flex-start' },
  backText: { color: '#64B5F6', fontSize: 15, fontWeight: '600' },
  headerTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '700' },
  headerSub: { color: '#8E99A4', fontSize: 13, marginTop: 4 },

  content: { padding: 16, paddingBottom: 50 },

  infoCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16,
    marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0',
  },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoLabel: { fontSize: 11, color: '#718096' },
  infoValue: { fontSize: 16, fontWeight: '700', color: '#1A202C', marginTop: 2 },
  infoSub: { fontSize: 11, color: '#A0AEC0', marginTop: 2 },
  truckBadge: {
    backgroundColor: '#EBF8FF', paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#BEE3F8',
  },
  truckLabel: { fontSize: 9, fontWeight: '800', color: '#2B6CB0' },
  truckValue: { fontSize: 13, fontWeight: '700', color: '#2B6CB0', marginTop: 2 },

  section: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16,
    marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0',
  },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1A202C', marginBottom: 2 },
  sectionSub: { fontSize: 12, color: '#718096', marginBottom: 10 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#4A5568', marginBottom: 5 },

  input: {
    backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E0',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 15, color: '#1A202C', marginBottom: 10,
  },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 2 },
  chip: {
    backgroundColor: '#EDF2F7', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 16,
  },
  chipActive: { backgroundColor: '#1E88E5' },
  chipText: { fontSize: 12, color: '#4A5568', fontWeight: '500' },
  chipTextActive: { color: '#FFFFFF', fontWeight: '700' },

  addContainerBtn: {
    backgroundColor: '#1E88E5', paddingHorizontal: 14,
    paddingVertical: 7, borderRadius: 20,
  },
  addContainerBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  summaryBox: {
    backgroundColor: '#0A1628', borderRadius: 14, padding: 18, marginBottom: 16,
  },
  summaryTitle: { color: '#fff', fontSize: 14, fontWeight: '800', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  summaryKey: { color: '#8E99A4', fontSize: 13 },
  summaryVal: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },

  startBtn: {
    backgroundColor: '#1E88E5', paddingVertical: 16, borderRadius: 12,
    alignItems: 'center', elevation: 3,
    shadowColor: '#1E88E5', shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 }, shadowRadius: 8,
  },
  startBtnDisabled: { opacity: 0.7 },
  startBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
