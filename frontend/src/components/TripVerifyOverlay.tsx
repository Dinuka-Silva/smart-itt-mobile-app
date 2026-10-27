import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, shadow } from '../theme';

export type OverlayContainer = {
  containerNumber: string;
  size: string;
  destTerminal: string;
  isReturn?: boolean;
};

type VerifyProps = {
  mode: 'verify';
  vesselName: string;
  sourceTerminal: string;
  destTerminals: string;
  vehicleNumber?: string;
  driverName?: string;
  containers: OverlayContainer[];
  notes?: string;
  submitting?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

type SentProps = {
  mode: 'sent';
  tripNumber: string;
  vesselName: string;
  containerCount: number;
  onDone: () => void;
};

type Props = VerifyProps | SentProps;

export function TripVerifyOverlay(props: Props) {
  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {props.mode === 'verify' ? <VerifyBody {...props} /> : <SentBody {...props} />}
        </View>
      </View>
    </Modal>
  );
}

function VerifyBody(props: VerifyProps) {
  return (
    <>
      <View style={styles.iconWrap}>
        <Ionicons name="play-circle" size={38} color={colors.accent} />
      </View>
      <Text style={styles.title}>Confirm Load & Start Trip</Text>
      <Text style={styles.subtitle}>
        Review your loaded container(s) before departure. The trip will begin immediately in IN PROGRESS status. After delivery at destination, you will submit the completed trip for supervisor sign-off.
      </Text>

      <ScrollView style={styles.details} showsVerticalScrollIndicator={false}>
        <Row label="Driver" value={props.driverName || '—'} />
        <Row label="Vehicle" value={props.vehicleNumber || '—'} />
        <Row label="Vessel" value={props.vesselName} />
        <Row label="Loading terminal" value={props.sourceTerminal} />
        <Row label="Destination(s)" value={props.destTerminals} />
        <Row
          label="Chassis load"
          value={
            props.containers.length === 1 && props.containers[0].size === '40FT'
              ? '1 × 40FT (Standard 40FT Container)'
              : props.containers.length === 1
              ? '1 × 20FT (Single 20FT Container)'
              : '2 × 20FT (Twin 20FT Containers)'
          }
        />
        {props.containers.map((c, i) => (
          <View key={`${c.containerNumber}-${i}`} style={styles.containerRow}>
            <Ionicons name={c.isReturn ? "return-down-back" : "cube-outline"} size={16} color={c.isReturn ? "#feb300" : colors.accent} />
            <Text style={[styles.containerText, c.isReturn && { color: '#feb300' }]}>
              {c.containerNumber} · {c.size} · {c.destTerminal} {c.isReturn ? ' (🔄 RETURN CONTAINER)' : ''}
            </Text>
          </View>
        ))}
        {!!props.notes && <Row label="Notes" value={props.notes} />}
      </ScrollView>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.ghostBtn} onPress={props.onCancel} disabled={props.submitting}>
          <Text style={styles.ghostText}>Edit details</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.primaryBtn, props.submitting && { opacity: 0.7 }]}
          onPress={props.onConfirm}
          disabled={props.submitting}
        >
          {props.submitting ? (
            <ActivityIndicator color="#00363d" />
          ) : (
            <Text style={styles.primaryText}>Start Trip & Begin Transport</Text>
          )}
        </TouchableOpacity>
      </View>
    </>
  );
}

function SentBody(props: SentProps) {
  return (
    <>
      <View style={[styles.iconWrap, styles.iconSuccess]}>
        <Ionicons name="navigate-circle" size={38} color={colors.accent} />
      </View>
      <Text style={styles.title}>Trip Started & In Progress! 🚀</Text>
      <Text style={styles.subtitle}>
        Trip {props.tripNumber} with {props.containerCount} container(s) on {props.vesselName} is now active. Proceed safely to destination terminal.
      </Text>
      <View style={[styles.pendingChip, { backgroundColor: 'rgba(0, 229, 255, 0.15)', borderColor: '#00e5ff' }]}>
        <View style={[styles.pendingDot, { backgroundColor: '#00e5ff' }]} />
        <Text style={[styles.pendingChipText, { color: '#00e5ff' }]}>IN PROGRESS · LIVE TRANSIT</Text>
      </View>
      <Text style={styles.hint}>
        When you arrive and discharge at the destination, tap "Complete & Send to Supervisor" to update your completed trip count and earnings!
      </Text>
      <TouchableOpacity style={styles.primaryBtn} onPress={props.onDone}>
        <Text style={styles.primaryText}>Go to Active Mission</Text>
      </TouchableOpacity>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(10, 16, 32, 0.62)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.background,
    borderRadius: radius.xl,
    padding: spacing.lg,
    maxHeight: '88%',
    ...shadow.glow,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${colors.accent}18`,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  iconSuccess: { backgroundColor: `${colors.success}18` },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  details: { maxHeight: 280, marginBottom: spacing.md },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  rowLabel: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  rowValue: { fontSize: 13, color: colors.text, fontWeight: '700', flex: 1, textAlign: 'right' },
  containerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  containerText: { fontSize: 13, fontWeight: '600', color: colors.text, flex: 1 },
  actions: { gap: 10 },
  ghostBtn: {
    paddingVertical: 14,
    borderRadius: radius.md,
    alignItems: 'center',
    backgroundColor: colors.surfaceContainer,
  },
  ghostText: { fontSize: 15, fontWeight: '700', color: colors.textSecondary },
  primaryBtn: {
    backgroundColor: colors.accent,
    paddingVertical: 16,
    borderRadius: radius.md,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  pendingChip: {
    flexDirection: 'row',
    alignSelf: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: `${colors.warning}18`,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    marginBottom: spacing.md,
  },
  pendingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.warning },
  pendingChipText: { fontSize: 11, fontWeight: '800', color: colors.warning, letterSpacing: 0.6 },
  hint: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
    lineHeight: 18,
  },
});
