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
        <Ionicons name="shield-checkmark" size={36} color={colors.accent} />
      </View>
      <Text style={styles.title}>Verify trip details</Text>
      <Text style={styles.subtitle}>
        Review this load before sending it to your supervisor. They will confirm the trip next.
      </Text>

      <ScrollView style={styles.details} showsVerticalScrollIndicator={false}>
        <Row label="Driver" value={props.driverName || '—'} />
        <Row label="Vehicle" value={props.vehicleNumber || '—'} />
        <Row label="Vessel" value={props.vesselName} />
        <Row label="Loading terminal" value={props.sourceTerminal} />
        <Row label="Destination(s)" value={props.destTerminals} />
        {props.containers.map((c, i) => (
          <View key={`${c.containerNumber}-${i}`} style={styles.containerRow}>
            <Ionicons name="cube-outline" size={16} color={colors.accent} />
            <Text style={styles.containerText}>
              {c.containerNumber} · {c.size} · {c.destTerminal}
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
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryText}>Send to supervisor</Text>
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
        <Ionicons name="paper-plane" size={34} color={colors.success} />
      </View>
      <Text style={styles.title}>Sent for verification</Text>
      <Text style={styles.subtitle}>
        Trip {props.tripNumber} with {props.containerCount} container(s) on {props.vesselName} is now
        pending supervisor confirmation.
      </Text>
      <View style={styles.pendingChip}>
        <View style={styles.pendingDot} />
        <Text style={styles.pendingChipText}>PENDING APPROVAL</Text>
      </View>
      <Text style={styles.hint}>
        You will get a notification when the supervisor confirms or rejects this trip.
      </Text>
      <TouchableOpacity style={styles.primaryBtn} onPress={props.onDone}>
        <Text style={styles.primaryText}>View pending trips</Text>
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
