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
import apiClient from '../../../src/services/api';
import { useAuthStore } from '../../../src/store/authStore';
import { driverService } from '../../../src/services/driverService';
import API_BASE_URL from '../../../src/config/api';
import { colors, radius, spacing, shadow } from '../../../src/theme';
import { useResponsive } from '../../../src/hooks/useResponsive';
import { useMockTripStore } from '../../../src/store/mockTripStore';
import { resolveCheNumber, resolveOperator } from '../../../src/config/fleet';
import { TripVerifyOverlay } from '../../../src/components/TripVerifyOverlay';
import {
  containerService,
  normalizeContainerNumber,
  isValidIsoFormat,
  computeCheckDigit,
  validateIsoClientSide,
  hasSymbols,
  ValidateContainerResult,
} from '../../../src/services/containerService';

// All 6 terminals
const TERMINALS = ['CWIT', 'JCT', 'ECT', 'UCT', 'SAGT', 'CICT'];
const POPULAR_VESSELS = ['MSC Aurora', 'Maersk Line', 'CMA CGM', 'Evergreen', 'COSCO'];

interface ContainerEntry {
  containerNumber: string;
  containerNumber2?: string; // used when dual 20FT
  size: '20FT' | '40FT';
  loadType?: '1x20FT' | '2x20FT' | '40FT';
  destTerminal: string;
  destTerminal2?: string; // used for container #2 when dual 20FT
  sealNumber?: string;
  damageStatus?: string;
  remarks?: string;
  isReturnContainer?: boolean;
}

function emptyContainer(defaultDest: string): ContainerEntry {
  return {
    containerNumber: '',
    containerNumber2: '',
    size: '20FT',
    loadType: '1x20FT',
    destTerminal: defaultDest,
    destTerminal2: defaultDest,
    isReturnContainer: false,
  };
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
  label: { fontSize: 13, fontWeight: '700', color: '#849396', marginBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  btn: {
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: radius.md,
    backgroundColor: '#080e17',
    borderWidth: 1,
    borderColor: '#242a34',
  },
  btnText: { fontSize: 13, fontWeight: '700', color: '#849396' },
  btnTextActive: { color: '#00363d' },
  btnDisabled: { opacity: 0.4 },
  btnTextDisabled: { color: '#849396' },
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

  const raw = (containerNumber || '').trim();
  const hasSyms = hasSymbols(raw);
  const clean = normalizeContainerNumber(raw);

  useEffect(() => {
    if (!raw) {
      setValResult(null);
      return;
    }

    // 1. Instant client-side check (4 uppercase letters + 7 numbers, rejects symbols)
    const clientRes = validateIsoClientSide(raw);
    setValResult(clientRes);

    // 2. Authoritative backend duplicate check if format valid and no symbols
    if (clientRes.valid && !hasSyms) {
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

  if (!raw) {
    return (
      <View style={vp.hintWrap}>
        <Ionicons name="information-circle-outline" size={13} color="#849396" />
        <Text style={vp.hintText}>
          Format: 4 Letters + 7 Numbers without symbols (e.g. MSCU7721892)
        </Text>
      </View>
    );
  }

  // Live breakdown
  const letters = clean.slice(0, 4);
  const suffix = clean.slice(4);
  const lettersValid = /^[A-Z]{4}$/.test(letters);
  const numbersValid = /^\d{7}$/.test(suffix);

  return (
    <View style={vp.container}>
      {/* Real-time three-stage progress chips */}
      <View style={vp.stepsRow}>
        <View style={[vp.stepChip, lettersValid ? vp.stepChipValid : vp.stepChipPending]}>
          <Ionicons
            name={lettersValid ? 'checkmark-circle' : 'ellipse-outline'}
            size={11}
            color={lettersValid ? '#22ef7e' : '#849396'}
          />
          <Text style={[vp.stepChipText, lettersValid && { color: '#22ef7e' }]}>
            4 Letters ({Math.min(clean.replace(/[^A-Z]/g, '').length, 4)}/4)
          </Text>
        </View>

        <View style={[vp.stepChip, numbersValid ? vp.stepChipValid : vp.stepChipPending]}>
          <Ionicons
            name={numbersValid ? 'checkmark-circle' : 'ellipse-outline'}
            size={11}
            color={numbersValid ? '#22ef7e' : '#849396'}
          />
          <Text style={[vp.stepChipText, numbersValid && { color: '#22ef7e' }]}>
            7 Numbers ({Math.min(suffix.replace(/\D/g, '').length, 7)}/7)
          </Text>
        </View>

        <View
          style={[
            vp.stepChip,
            valResult?.valid
              ? vp.stepChipValid
              : valResult?.isoFormatValid && !valResult?.checkDigitValid
              ? vp.stepChipError
              : hasSyms
              ? vp.stepChipError
              : vp.stepChipPending,
          ]}
        >
          <Ionicons
            name={
              valResult?.valid
                ? 'shield-checkmark'
                : valResult?.isoFormatValid && !valResult?.checkDigitValid
                ? 'alert-circle'
                : hasSyms
                ? 'alert-circle'
                : 'ellipse-outline'
            }
            size={11}
            color={
              valResult?.valid
                ? '#22ef7e'
                : valResult?.isoFormatValid && !valResult?.checkDigitValid
                ? '#ff5252'
                : hasSyms
                ? '#ff5252'
                : '#849396'
            }
          />
          <Text
            style={[
              vp.stepChipText,
              valResult?.valid && { color: '#22ef7e' },
              valResult?.isoFormatValid && !valResult?.checkDigitValid && { color: '#ff5252' },
              hasSyms && { color: '#ff5252' },
            ]}
          >
            {hasSyms
              ? 'Symbols Found'
              : valResult?.valid
              ? 'ISO Verified'
              : valResult?.isoFormatValid && !valResult?.checkDigitValid
              ? 'ISO Mismatch'
              : 'ISO Standard'}
          </Text>
        </View>
      </View>

      {/* Validation Message Box */}
      {valResult && (
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

          {hasSyms && (
            <TouchableOpacity
              style={vp.fixBtn}
              onPress={() => onFixCheckDigit(clean)}
              activeOpacity={0.8}
            >
              <Text style={vp.fixBtnText}>REMOVE SYMBOLS</Text>
            </TouchableOpacity>
          )}

          {!valResult.checkDigitValid && valResult.expectedCheckDigit >= 0 && valResult.isoFormatValid && !hasSyms && (
            <TouchableOpacity
              style={vp.fixBtn}
              onPress={() => {
                const base = clean.slice(0, 10);
                onFixCheckDigit(`${base}${valResult.expectedCheckDigit}`);
              }}
              activeOpacity={0.8}
            >
              <Text style={vp.fixBtnText}>FIX CHECK DIGIT TO {valResult.expectedCheckDigit}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const vp = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
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
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: -2,
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  stepChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
  },
  stepChipPending: {
    backgroundColor: '#0a101a',
    borderColor: '#1d2633',
  },
  stepChipValid: {
    backgroundColor: 'rgba(34, 239, 126, 0.08)',
    borderColor: 'rgba(34, 239, 126, 0.3)',
  },
  stepChipError: {
    backgroundColor: 'rgba(255, 82, 82, 0.08)',
    borderColor: 'rgba(255, 82, 82, 0.3)',
  },
  stepChipText: {
    fontSize: 10,
    color: '#849396',
    fontWeight: '700',
  },
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
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
    paddingVertical: 4,
    borderRadius: 4,
  },
  fixBtnText: {
    fontSize: 10,
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
  const currentLoadType = entry.loadType || (entry.size === '40FT' ? '40FT' : '1x20FT');
  const isTwin20 = currentLoadType === '2x20FT';
  const isSingle20 = currentLoadType === '1x20FT';
  const is40FT = currentLoadType === '40FT';

  return (
    <View style={cc.card}>
      {/* Load type selection: 1x20FT, 2x20FT, 40FT */}
      <Text style={cc.fieldLabel}>Container Load Configuration</Text>
      <View style={cc.sizeRow}>
        <TouchableOpacity
          style={[cc.sizeBtn, isSingle20 && cc.sizeBtnActive]}
          onPress={() => {
            onChange('loadType', '1x20FT');
            onChange('size', '20FT');
            onChange('containerNumber2', '');
            onChange('destTerminal2', entry.destTerminal);
          }}
        >
          <Text style={[cc.sizeTxt, isSingle20 && cc.sizeTxtActive]}>1 × 20FT</Text>
          <Text style={[cc.subSizeTxt, isSingle20 && cc.subSizeTxtActive]}>Single 20FT</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[cc.sizeBtn, isTwin20 && cc.sizeBtnActive]}
          onPress={() => {
            onChange('loadType', '2x20FT');
            onChange('size', '20FT');
            if (!entry.destTerminal2) {
              onChange('destTerminal2', entry.destTerminal);
            }
          }}
        >
          <Text style={[cc.sizeTxt, isTwin20 && cc.sizeTxtActive]}>2 × 20FT</Text>
          <Text style={[cc.subSizeTxt, isTwin20 && cc.subSizeTxtActive]}>Twin / Dual</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[cc.sizeBtn, is40FT && cc.sizeBtnActive]}
          onPress={() => {
            onChange('loadType', '40FT');
            onChange('size', '40FT');
            onChange('containerNumber2', '');
            onChange('destTerminal2', entry.destTerminal);
          }}
        >
          <Text style={[cc.sizeTxt, is40FT && cc.sizeTxtActive]}>1 × 40FT</Text>
          <Text style={[cc.subSizeTxt, is40FT && cc.subSizeTxtActive]}>Standard 40FT</Text>
        </TouchableOpacity>
      </View>

      {/* Chassis Capacity Guidance */}
      <View style={cc.capacityGuidanceBox}>
        <Ionicons name="information-circle" size={14} color="#00e5ff" />
        <Text style={cc.capacityGuidanceText}>
          {isSingle20
            ? '1 × 20FT Mode: Driver loaded 1 × 20ft container (1 TEU / ~14.0T).'
            : isTwin20
            ? '2 × 20FT Mode: Driver loaded 2 × 20ft twin containers on chassis (2 TEU / ~26.5T). Select discharge terminal for each container.'
            : '40FT Mode: Driver loaded 1 × 40ft container on chassis (2 TEU / ~26.5T).'}
        </Text>
      </View>

      {/* Container numbers and Destination Terminals */}
      {isTwin20 ? (
        <View style={{ gap: 12 }}>
          {/* Container No. 1 */}
          <View style={cc.containerSectionCard}>
            <View style={cc.containerSectionHeader}>
              <View style={cc.contBadge1}>
                <Ionicons name="cube" size={13} color="#00363d" />
                <Text style={cc.contBadgeText1}>CONTAINER #1 (20FT)</Text>
              </View>
              <Text style={cc.contSectionDestHint}>
                Discharge: <Text style={{ color: '#00e5ff', fontWeight: '800' }}>{entry.destTerminal || 'JCT'}</Text>
              </Text>
            </View>

            <Text style={cc.fieldLabel}>Container No. 1 Number * (Manual Entry)</Text>
            <TextInput
              style={cc.input}
              placeholder="e.g. MSCU7721892"
              placeholderTextColor="#849396"
              autoCapitalize="characters"
              maxLength={16}
              value={entry.containerNumber}
              onChangeText={(v) => onChange('containerNumber', v.toUpperCase())}
            />
            <ContainerValidationPill
              containerNumber={entry.containerNumber}
              onFixCheckDigit={(corrected) => onChange('containerNumber', corrected)}
            />

            <TerminalPicker
              label="Container #1 Discharge Terminal *"
              selected={entry.destTerminal}
              onSelect={(t) => onChange('destTerminal', t)}
              accentColor="#00e5ff"
              exclude={loadingTerminal}
            />
          </View>

          {/* Container No. 2 */}
          <View style={[cc.containerSectionCard, { borderColor: 'rgba(254, 179, 0, 0.45)' }]}>
            <View style={cc.containerSectionHeader}>
              <View style={cc.contBadge2}>
                <Ionicons name="cube" size={13} color="#432c00" />
                <Text style={cc.contBadgeText2}>CONTAINER #2 (20FT)</Text>
              </View>
              <Text style={cc.contSectionDestHint}>
                Discharge: <Text style={{ color: '#feb300', fontWeight: '800' }}>{entry.destTerminal2 || entry.destTerminal || 'JCT'}</Text>
              </Text>
            </View>

            <Text style={cc.fieldLabel}>Container No. 2 Number * (Manual Entry)</Text>
            <TextInput
              style={cc.input}
              placeholder="e.g. TCKU3456789"
              placeholderTextColor="#849396"
              autoCapitalize="characters"
              maxLength={16}
              value={entry.containerNumber2}
              onChangeText={(v) => onChange('containerNumber2', v.toUpperCase())}
            />
            <ContainerValidationPill
              containerNumber={entry.containerNumber2 || ''}
              onFixCheckDigit={(corrected) => onChange('containerNumber2', corrected)}
            />

            <TerminalPicker
              label="Container #2 Discharge Terminal *"
              selected={entry.destTerminal2 || entry.destTerminal}
              onSelect={(t) => onChange('destTerminal2', t)}
              accentColor="#feb300"
              exclude={loadingTerminal}
            />
          </View>

          {/* Single vs Dual Discharge Status Notification */}
          {entry.destTerminal === (entry.destTerminal2 || entry.destTerminal) ? (
            <View style={cc.singleDischargeBanner}>
              <Ionicons name="checkmark-circle" size={16} color="#22ef7e" />
              <View style={{ flex: 1 }}>
                <Text style={cc.singleDischargeTitle}>SINGLE TERMINAL DISCHARGE: {entry.destTerminal}</Text>
                <Text style={cc.singleDischargeSub}>
                  Both 20FT twin containers will be discharged at {entry.destTerminal}. Displays as one discharge terminal across all logins.
                </Text>
              </View>
            </View>
          ) : (
            <View style={cc.dualDischargeBanner}>
              <Ionicons name="swap-horizontal" size={16} color="#00e5ff" />
              <View style={{ flex: 1 }}>
                <Text style={cc.dualDischargeTitle}>
                  DUAL TERMINAL DISCHARGE: {entry.destTerminal} & {entry.destTerminal2 || entry.destTerminal}
                </Text>
                <Text style={cc.dualDischargeSub}>
                  Container #1 ➔ {entry.destTerminal} • Container #2 ➔ {entry.destTerminal2 || entry.destTerminal}. Both discharge terminals will appear in trip details across all logins.
                </Text>
              </View>
            </View>
          )}
        </View>
      ) : (
        <>
          <Text style={cc.fieldLabel}>
            {isSingle20 ? 'Container Number * (Single 20FT Manual Entry)' : 'Container Number * (40FT Manual Entry)'}
          </Text>
          <TextInput
            style={cc.input}
            placeholder="e.g. MSCU7721892"
            placeholderTextColor="#849396"
            autoCapitalize="characters"
            maxLength={16}
            value={entry.containerNumber}
            onChangeText={(v) => onChange('containerNumber', v.toUpperCase())}
          />
          <ContainerValidationPill
            containerNumber={entry.containerNumber}
            onFixCheckDigit={(corrected) => onChange('containerNumber', corrected)}
          />

          <TerminalPicker
            label="Destination Terminal *"
            selected={entry.destTerminal}
            onSelect={(t) => {
              onChange('destTerminal', t);
              onChange('destTerminal2', t);
            }}
            accentColor="#00e5ff"
            exclude={loadingTerminal}
          />
        </>
      )}

      {/* Damage Status */}
      <Text style={cc.fieldLabel}>Damage Status</Text>
      <View style={cc.damageRow}>
        {(['NONE', 'DAMAGED'] as const).map((ds) => {
          const isDamaged = ds === 'DAMAGED';
          const isActive = (entry.damageStatus || 'NONE') === ds;
          return (
            <TouchableOpacity
              key={ds}
              style={[
                cc.damageBtn,
                isActive && (isDamaged ? cc.damageBtnDamaged : cc.damageBtnNone),
              ]}
              onPress={() => onChange('damageStatus', ds)}
            >
              <Ionicons
                name={isDamaged ? 'warning' : 'checkmark-circle'}
                size={14}
                color={isActive ? (isDamaged ? '#ff5252' : '#22ef7e') : '#849396'}
              />
              <Text style={[cc.damageTxt, isActive && (isDamaged ? cc.damageTxtDamaged : cc.damageTxtNone)]}>
                {isDamaged ? '⚠ DAMAGED CONTAINER' : '✓ NO DAMAGE'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Damage alert strip */}
      {(entry.damageStatus === 'DAMAGED') && (
        <View style={cc.damageAlert}>
          <Ionicons name="alert-circle" size={15} color="#ff5252" />
          <Text style={cc.damageAlertText}>DAMAGE TANK — Supervisor will be notified of container damage</Text>
        </View>
      )}

      {/* Return Container Marking Function */}
      <Text style={[cc.fieldLabel, { marginTop: 8 }]}>Container Category / Return Container Function</Text>
      <View style={cc.damageRow}>
        <TouchableOpacity
          style={[
            cc.damageBtn,
            !entry.isReturnContainer && { backgroundColor: 'rgba(0, 229, 255, 0.12)', borderColor: '#00e5ff' },
          ]}
          onPress={() => onChange('isReturnContainer', 'false')}
        >
          <Ionicons
            name="cube-outline"
            size={14}
            color={!entry.isReturnContainer ? '#00e5ff' : '#849396'}
          />
          <Text style={[cc.damageTxt, !entry.isReturnContainer && { color: '#00e5ff' }]}>
            📦 STANDARD FREIGHT
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            cc.damageBtn,
            entry.isReturnContainer && { backgroundColor: 'rgba(254, 179, 0, 0.16)', borderColor: '#feb300' },
          ]}
          onPress={() => onChange('isReturnContainer', 'true')}
        >
          <Ionicons
            name="return-down-back"
            size={14}
            color={entry.isReturnContainer ? '#feb300' : '#849396'}
          />
          <Text style={[cc.damageTxt, entry.isReturnContainer && { color: '#feb300' }]}>
            🔄 RETURN CONTAINER
          </Text>
        </TouchableOpacity>
      </View>

      {entry.isReturnContainer && (
        <View style={[cc.damageAlert, { backgroundColor: 'rgba(254, 179, 0, 0.12)', borderColor: '#feb300' }]}>
          <Ionicons name="repeat" size={15} color="#feb300" />
          <Text style={[cc.damageAlertText, { color: '#feb300' }]}>
            RETURN CONTAINER MARKED — Tagged for empty repositioning / export return in supervisor reports.
          </Text>
        </View>
      )}
    </View>
  );
}

const cc = StyleSheet.create({
  card: {
    backgroundColor: '#161c25',
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#242a34',
  },
  containerSectionCard: {
    backgroundColor: '#0a101a',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.4)',
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 6,
  },
  containerSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  contBadge1: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#00e5ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  contBadgeText1: {
    fontSize: 10,
    fontWeight: '900',
    color: '#00363d',
    letterSpacing: 0.5,
  },
  contBadge2: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#feb300',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  contBadgeText2: {
    fontSize: 10,
    fontWeight: '900',
    color: '#432c00',
    letterSpacing: 0.5,
  },
  contSectionDestHint: {
    fontSize: 11,
    color: '#849396',
    fontWeight: '600',
  },
  singleDischargeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(34, 239, 126, 0.1)',
    borderWidth: 1,
    borderColor: '#22ef7e',
    borderRadius: radius.md,
    padding: 10,
    marginTop: 4,
  },
  singleDischargeTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#22ef7e',
    letterSpacing: 0.5,
  },
  singleDischargeSub: {
    fontSize: 10,
    color: '#bac9cc',
    marginTop: 2,
  },
  dualDischargeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
    borderWidth: 1,
    borderColor: '#00e5ff',
    borderRadius: radius.md,
    padding: 10,
    marginTop: 4,
  },
  dualDischargeTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#00e5ff',
    letterSpacing: 0.5,
  },
  dualDischargeSub: {
    fontSize: 10,
    color: '#bac9cc',
    marginTop: 2,
  },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#849396', marginBottom: 6 },
  input: {
    backgroundColor: '#080e17',
    borderWidth: 1,
    borderColor: '#242a34',
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#dde2f0',
    marginBottom: 12,
    ...(Platform.OS === 'web' && { outlineStyle: 'none', cursor: 'text' } as any),
  },
  sizeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  sizeBtn: {
    flex: 1,
    backgroundColor: '#080e17',
    paddingVertical: 12,
    borderRadius: radius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#242a34',
  },
  sizeBtnActive: { backgroundColor: 'rgba(0, 229, 255, 0.15)', borderColor: '#00e5ff' },
  sizeTxt: { fontSize: 13, fontWeight: '700', color: '#849396' },
  sizeTxtActive: { color: '#00e5ff' },
  subSizeTxt: { fontSize: 10, fontWeight: '600', color: '#687787', marginTop: 2 },
  subSizeTxtActive: { color: '#00e5ff' },
  row: { flexDirection: 'row', alignItems: 'flex-start' },

  // Damage status
  damageRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  damageBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: radius.md,
    backgroundColor: '#080e17', borderWidth: 1, borderColor: '#242a34',
  },
  damageBtnNone: { backgroundColor: 'rgba(34, 239, 126, 0.1)', borderColor: '#22ef7e' },
  damageBtnDamaged: { backgroundColor: 'rgba(255, 82, 82, 0.12)', borderColor: '#ff5252' },
  damageTxt: { fontSize: 12, fontWeight: '700', color: '#849396' },
  damageTxtNone: { color: '#22ef7e' },
  damageTxtDamaged: { color: '#ff5252' },
  damageAlert: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255, 82, 82, 0.12)', borderWidth: 1, borderColor: '#ff5252',
    borderRadius: radius.md, padding: 10, marginBottom: 4,
  },
  damageAlertText: { fontSize: 12, fontWeight: '700', color: '#ff5252', flex: 1 },
  capacityGuidanceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 229, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.25)',
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 12,
  },
  capacityGuidanceText: {
    color: '#00e5ff',
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
  },
});

// ────────────────────────────────────────────────────────────────
// Main Screen
// ────────────────────────────────────────────────────────────────
export default function NewTripScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const { width, topInset, bottomInset, contentMaxWidth, containerPaddingHorizontal, isSmallMobile } = useResponsive();

  const getLiveTime = () =>
    new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

  // Editable Driver Details State
  const [isEditingDriver, setIsEditingDriver] = useState(false);
  const [driverName, setDriverName] = useState(user?.name || 'Kamal Perera');
  const [driverContact, setDriverContact] = useState(user?.mobileNumber || '+94 77 123 4567');
  const [driverTruck, setDriverTruck] = useState(user?.vehicleNumber || 'LY-6439');
  const [driverChe, setDriverChe] = useState(user?.chassisNumber || user?.cheNumber || 'CHE 100');
  const [savingDriver, setSavingDriver] = useState(false);

  useEffect(() => {
    if (user) {
      if (user.name) setDriverName(user.name);
      if (user.mobileNumber) setDriverContact(user.mobileNumber);
      if (user.vehicleNumber) setDriverTruck(user.vehicleNumber);
      if (user.chassisNumber || user.cheNumber) setDriverChe(user.chassisNumber || user.cheNumber || 'CHE 100');
    }
  }, [user]);

  const handleSaveDriverDetails = async () => {
    if (!driverName.trim()) {
      showAlert('Required', 'Please enter a valid driver name.');
      return;
    }
    setSavingDriver(true);
    try {
      const trimmedName = driverName.trim();
      const trimmedContact = driverContact.trim();
      const trimmedTruck = driverTruck.trim().toUpperCase();
      const trimmedChe = driverChe.trim().toUpperCase();

      updateUser({
        name: trimmedName,
        mobileNumber: trimmedContact,
        vehicleNumber: trimmedTruck,
        chassisNumber: trimmedChe,
        cheNumber: trimmedChe,
      });

      const driverIdentifier = user?.driverCode || user?.driverId || user?.username || 'DRV-00001';
      await driverService.updateDriver(driverIdentifier, {
        fullName: trimmedName,
        mobileNumber: trimmedContact,
        vehicleNumber: trimmedTruck,
        chassisNumber: trimmedChe,
      });
      setIsEditingDriver(false);
      showAlert('Saved', 'Driver & Vehicle details updated successfully.');
    } catch {
      setIsEditingDriver(false);
      showAlert('Saved Locally', 'Driver details updated for current mission.');
    } finally {
      setSavingDriver(false);
    }
  };

  const [vesselName, setVesselName] = useState('MSC Aurora');
  const [sourceTerminal, setSourceTerminal] = useState('CICT');

  const getLiveTimeWithSeconds = () =>
    new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const getLiveDate = () =>
    new Date().toISOString().split('T')[0];

  const [liveClock, setLiveClock] = useState(getLiveTimeWithSeconds);
  const [operationDate, setOperationDate] = useState(getLiveDate);
  const [operationTime, setOperationTime] = useState(getLiveTime);
  const [dispatchTime, setDispatchTime] = useState(getLiveTime);

  useEffect(() => {
    // Automatically count live time every second and keep operation date in sync
    const interval = setInterval(() => {
      const now = new Date();
      setLiveClock(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }));
      const hm = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
      setOperationTime(hm);
      setDispatchTime(hm);
      setOperationDate(now.toISOString().split('T')[0]);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [showVerify, setShowVerify] = useState(false);
  const [sentTripNumber, setSentTripNumber] = useState<string | null>(null);

  // Single container detail entry (20FT can still capture two numbers)
  const [containers, setContainers] = useState<ContainerEntry[]>([emptyContainer('JCT')]);

  const updateContainer = (idx: number, field: keyof ContainerEntry, value: string) => {
    setContainers((prev) => {
      const next = [...prev];
      const val = field === 'isReturnContainer' ? value === 'true' : value;
      next[idx] = { ...next[idx], [field]: val };
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
      const loadType = entry.loadType || (entry.size === '40FT' ? '40FT' : '1x20FT');
      const numbersToValidate = [entry.containerNumber];
      if (loadType === '2x20FT') {
        if (!entry.containerNumber2 || !entry.containerNumber2.trim()) {
          showAlert('Required', `Please enter Container ${i + 1} (#2) number for the 2 × 20FT twin configuration.`);
          return;
        }
        numbersToValidate.push(entry.containerNumber2);
      }

      for (let j = 0; j < numbersToValidate.length; j++) {
        const raw = (numbersToValidate[j] || '').trim();
        const contLabel = numbersToValidate.length > 1 ? `Container ${i + 1} (#${j + 1})` : `Container ${i + 1}`;

        if (!raw) {
          showAlert('Required', `Please manually enter ${contLabel} number.`);
          return;
        }

        // Check if symbols entered
        if (hasSymbols(raw)) {
          showAlert(
            'Symbols Not Allowed',
            `${contLabel} ("${raw}") contains symbols.\n\nSymbols are not allowed. Please enter 4 uppercase letters followed by 7 numbers without symbols (e.g. MSCU7721892).`
          );
          return;
        }

        const cNum = raw.toUpperCase();

        // STEP 1: Format Check — Must contain exactly 4 uppercase letters followed by 7 numbers without symbols
        if (!isValidIsoFormat(cNum)) {
          let reason = 'Must contain exactly 4 uppercase letters followed by 7 numbers without symbols (e.g. MSCU7721892).';
          if (cNum.length !== 11) {
            reason = `Entered ${cNum.length} characters. Exactly 11 characters required (4 uppercase letters + 7 numbers).`;
          } else {
            const prefix = cNum.slice(0, 4);
            const digits = cNum.slice(4);
            if (!/^[A-Z]{4}$/.test(prefix)) {
              reason = `Prefix "${prefix}" must contain 4 uppercase letters (A-Z).`;
            } else if (!/^\d{7}$/.test(digits)) {
              reason = `Suffix "${digits}" must contain 7 numeric digits (0-9 without symbols).`;
            }
          }

          showAlert(
            'Invalid Container Format',
            `${contLabel} (${cNum}) is invalid.\n\n${reason}\n\nPlease verify 4 uppercase letters + 7 numbers without symbols before proceeding.`
          );
          return;
        }

        // STEP 2: Verify ISO 6346 Standard Check Digit
        const expectedDigit = computeCheckDigit(cNum);
        const actualDigit = parseInt(cNum[10], 10);
        if (expectedDigit !== actualDigit) {
          showAlert(
            'ISO 6346 Standard Mismatch',
            `${contLabel} (${cNum}) has valid 4 letters + 7 numbers format, but check digit does not match ISO 6346 standard.\n\n` +
            `• Entered Check Digit: ${actualDigit}\n` +
            `• Required ISO Check Digit: ${expectedDigit}\n\n` +
            `Please correct the container number to: ${cNum.slice(0, 10)}${expectedDigit}`
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

      if (loadType === '2x20FT') {
        const d2 = entry.destTerminal2 || entry.destTerminal;
        if (!d2) {
          showAlert('Required', `Please select a destination terminal for Container ${i + 1} (#2).`);
          return;
        }
        if (d2 === sourceTerminal) {
          showAlert(
            'Invalid Route',
            `Container ${i + 1} (#2) destination terminal cannot be the same as the loading terminal (${sourceTerminal}).`
          );
          return;
        }
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
      const isRet = !!c.isReturnContainer;
      const loadType = c.loadType || (c.size === '40FT' ? '40FT' : '1x20FT');
      allTripContainers.push({
        id: `CONT-${Date.now()}-${i}-1`,
        containerNumber: c.containerNumber.trim().toUpperCase(),
        size: c.size,
        loadType: loadType,
        destTerminal: c.destTerminal,
        sealNumber: c.sealNumber,
        damageStatus: c.damageStatus,
        remarks: c.remarks,
        isReturn: isRet,
        cargoType: isRet ? 'RETURN' : 'STANDARD',
      });
      if (loadType === '2x20FT' && c.containerNumber2 && c.containerNumber2.trim()) {
        allTripContainers.push({
          id: `CONT-${Date.now()}-${i}-2`,
          containerNumber: c.containerNumber2.trim().toUpperCase(),
          size: '20FT',
          loadType: '2x20FT',
          destTerminal: c.destTerminal2 || c.destTerminal,
          sealNumber: c.sealNumber,
          damageStatus: c.damageStatus,
          remarks: c.remarks,
          isReturn: isRet,
          cargoType: isRet ? 'RETURN' : 'STANDARD',
        });
      }
    });

    const hasReturn = allTripContainers.some((c) => c.isReturn);

    try {
      // Build trip-level discharge terminal:
      // If driver selected the same discharge terminal for both containers -> shows as one terminal discharge
      // If driver selected 2 different discharge terminals -> shows both (e.g. CICT & SAGT)
      const allDests = allTripContainers.map((tc) => tc.destTerminal).filter(Boolean);
      const uniqueDests = Array.from(new Set(allDests));
      const tripDestTerminal = uniqueDests.join(' & ');

      const assignedVeh = driverTruck || user?.vehicleNumber || 'LY-6439';
      const assignedChe = resolveCheNumber(assignedVeh, driverChe || user?.chassisNumber || user?.cheNumber);
      const assignedOp = resolveOperator(assignedVeh, user?.operator);

      const payload = {
        driverId: user?.driverId || user?.id,
        vesselName: vesselName.trim(),
        operationDate,
        operationTime,
        dispatchTime,
        isReturn: hasReturn,
        vehicleNumber: assignedVeh,
        chassisNumber: assignedChe,
        chaiNumber: assignedChe,
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
          isReturn: c.isReturn,
          cargoType: c.cargoType,
        })),
      };

      const res = await apiClient.post('/trips', payload);
      const createdTrip = res.data;

      // Immediately sync with client mockTripStore so Driver, Supervisor and Admin tabs reflect this trip in real time
      useMockTripStore.getState().addTrip({
        id: createdTrip.id || `TRP-${Date.now()}`,
        tripNumber: createdTrip.tripNumber || createdTrip.id || `ITT-${Date.now()}`,
        driverId: user?.driverId || user?.id || 'demo-driver',
        driverCode: user?.driverCode || user?.driverId || 'DRV-00001',
        driverName: driverName || user?.name || user?.fullName || 'Kamal Perera',
        vehicleNumber: assignedVeh,
        chassisNumber: assignedChe,
        chaiNumber: assignedChe,
        operator: assignedOp,
        vesselName: vesselName.trim(),
        operationDate,
        operationTime,
        dispatchTime,
        isReturn: hasReturn,
        sourceTerminal,
        destTerminal: tripDestTerminal,
        notes,
        status: 'IN_PROGRESS',
        containers: allTripContainers.map((c) => ({ ...c, status: 'IN_TRANSIT' })),
        startTime: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });

      setShowVerify(false);
      setSentTripNumber(createdTrip.tripNumber || createdTrip.id);
    } catch (err: any) {
      console.warn('Backend warning — falling back to client-synchronized trip creation:', err);
      
      const fallbackVeh = driverTruck || user?.vehicleNumber || 'LY-6439';
      const fallbackChe = resolveCheNumber(fallbackVeh, driverChe || user?.chassisNumber || user?.cheNumber);
      const fallbackOp = resolveOperator(fallbackVeh, user?.operator);

      const newTripId = `ITT-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
      useMockTripStore.getState().addTrip({
        id: newTripId,
        tripNumber: newTripId,
        driverId: user?.driverId || user?.id || 'demo-driver',
        driverCode: user?.driverCode || user?.driverId || 'DRV-00001',
        driverName: driverName || user?.name || user?.fullName || 'Kamal Perera',
        vehicleNumber: fallbackVeh,
        chassisNumber: fallbackChe,
        chaiNumber: fallbackChe,
        operator: fallbackOp,
        vesselName: vesselName.trim(),
        operationDate,
        operationTime,
        dispatchTime,
        isReturn: hasReturn,
        sourceTerminal,
        destTerminal: containers[0].destTerminal,
        notes,
        status: 'IN_PROGRESS',
        containers: allTripContainers.map((c) => ({ ...c, status: 'IN_TRANSIT' })),
        startTime: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });

      setShowVerify(false);
      setSentTripNumber(newTripId);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{
        alignItems: 'center',
        paddingBottom: Math.max(bottomInset + 40, 60),
      }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ width: '100%', maxWidth: contentMaxWidth, alignSelf: 'center' }}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: Math.max(topInset + 12, 40) }]}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/(driver)/(tabs)');
              }
            }}
          >
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Confirm New Trip</Text>
          <Text style={styles.headerSub}>Load containers, then wait for supervisor confirmation</Text>
        </View>

        <View style={[styles.content, { paddingHorizontal: containerPaddingHorizontal }]}>
        {/* Driver info card */}
        <View style={styles.infoCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={styles.sectionTitle}>1. Driver Details</Text>
            <TouchableOpacity
              style={styles.editDriverBtn}
              onPress={() => {
                if (isEditingDriver) {
                  handleSaveDriverDetails();
                } else {
                  setIsEditingDriver(true);
                }
              }}
              activeOpacity={0.8}
            >
              <Ionicons name={isEditingDriver ? "checkmark-circle" : "create-outline"} size={14} color="#00e5ff" />
              <Text style={styles.editDriverBtnText}>
                {isEditingDriver ? (savingDriver ? "SAVING..." : "SAVE DETAILS") : "EDIT DETAILS"}
              </Text>
            </TouchableOpacity>
          </View>

          {isEditingDriver ? (
            <View style={styles.driverEditForm}>
              <Text style={styles.driverFieldLabel}>Driver Full Name *</Text>
              <TextInput
                style={styles.driverInput}
                value={driverName}
                onChangeText={setDriverName}
                placeholder="Enter driver name"
                placeholderTextColor="#849396"
              />

              <Text style={styles.driverFieldLabel}>Mobile Contact Number *</Text>
              <TextInput
                style={styles.driverInput}
                value={driverContact}
                onChangeText={setDriverContact}
                placeholder="+94 77 XXXXXXX"
                placeholderTextColor="#849396"
              />

              <View style={{ flexDirection: (isSmallMobile || width < 400) ? 'column' : 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.driverFieldLabel}>Truck / Vehicle No *</Text>
                  <TextInput
                    style={styles.driverInput}
                    value={driverTruck}
                    onChangeText={setDriverTruck}
                    placeholder="e.g. LY-6439"
                    placeholderTextColor="#849396"
                    autoCapitalize="characters"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.driverFieldLabel}>CHE / Chassis No *</Text>
                  <TextInput
                    style={styles.driverInput}
                    value={driverChe}
                    onChangeText={setDriverChe}
                    placeholder="e.g. CHE 100"
                    placeholderTextColor="#849396"
                    autoCapitalize="characters"
                  />
                </View>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
                <TouchableOpacity
                  style={styles.driverCancelBtn}
                  onPress={() => {
                    setDriverName(user?.name || 'Kamal Perera');
                    setDriverContact(user?.mobileNumber || '+94 77 123 4567');
                    setDriverTruck(user?.vehicleNumber || 'LY-6439');
                    setDriverChe(user?.chassisNumber || user?.cheNumber || 'CHE 100');
                    setIsEditingDriver(false);
                  }}
                >
                  <Text style={styles.driverCancelBtnText}>CANCEL</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.driverSaveBtn}
                  onPress={handleSaveDriverDetails}
                  disabled={savingDriver}
                >
                  {savingDriver ? (
                    <ActivityIndicator size="small" color="#00363d" />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={14} color="#00363d" />
                      <Text style={styles.driverSaveBtnText}>SAVE DETAILS</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={[styles.infoRow, { flexWrap: 'wrap', gap: 10 }]}>
              <View style={{ flex: 1, minWidth: 140 }}>
                <Text style={styles.infoLabel}>Driver Name</Text>
                <Text style={styles.infoValue}>{driverName}</Text>
                <Text style={styles.infoSub}>Driver Code: {user?.driverCode || user?.employeeId || 'DRV-1001'}</Text>
                <Text style={styles.infoSub}>Contact: {driverContact}</Text>
              </View>
              <View style={{ alignItems: isSmallMobile ? 'flex-start' : 'flex-end', gap: 6, flexShrink: 0 }}>
                <View style={styles.truckBadge}>
                  <Text style={styles.truckLabel}>TRUCK</Text>
                  <Text style={styles.truckValue}>{driverTruck}</Text>
                </View>
                <View style={[styles.truckBadge, { backgroundColor: 'rgba(0, 229, 255, 0.12)', borderColor: '#00e5ff' }]}>
                  <Text style={[styles.truckLabel, { color: '#00e5ff' }]}>CHE NO</Text>
                  <Text style={[styles.truckValue, { color: '#00e5ff' }]}>{driverChe}</Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Vessel */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Vessel Details</Text>
          <Text style={styles.fieldLabel}>Vessel Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. MSC Aurora"
            placeholderTextColor="#849396"
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
            accentColor="#00e5ff"
          />

          {/* Automatic Operation Date & Live Counting Time */}
          <View style={styles.autoTimingCard}>
            <View style={styles.autoTimingHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={styles.livePulseDotGreen} />
                <Text style={styles.autoTimingTitle}>AUTOMATIC OPERATION DATE & LIVE START TIME</Text>
              </View>
              <View style={styles.autoBadge}>
                <Ionicons name="sparkles" size={11} color="#00e5ff" />
                <Text style={styles.autoBadgeText}>AUTO LIVE</Text>
              </View>
            </View>

            <View style={[styles.autoTimingGrid, (isSmallMobile || width < 440) && { flexDirection: 'column' }]}>
              {/* Automatic Date Block */}
              <View style={styles.autoTimingCol}>
                <Text style={styles.autoTimingLabel}>OPERATION DATE (AUTOMATIC)</Text>
                <View style={styles.autoTimingBox}>
                  <Ionicons name="calendar" size={16} color="#feb300" />
                  <Text style={styles.autoDateText}>{operationDate}</Text>
                  <View style={styles.autoTodayTag}>
                    <Text style={styles.autoTodayTagText}>TODAY</Text>
                  </View>
                </View>
              </View>

              {/* Live Counting Time Block */}
              <View style={styles.autoTimingCol}>
                <Text style={styles.autoTimingLabel}>START TIME (COUNTING LIVE)</Text>
                <View style={styles.autoTimingBox}>
                  <Ionicons name="time" size={16} color="#00e5ff" />
                  <Text style={styles.autoClockText}>{liveClock}</Text>
                  <View style={styles.liveTag}>
                    <View style={styles.liveBlinkDot} />
                    <Text style={styles.liveTagText}>LIVE</Text>
                  </View>
                </View>
              </View>
            </View>

            <Text style={styles.autoTimingHelp}>
              The operation date is set automatically to today, and start time is continuously counting live for accurate ITT dispatch tracking.
            </Text>
          </View>
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
            placeholderTextColor="#849396"
            multiline
            value={notes}
            onChangeText={setNotes}
          />
          {/* Auto-detect damage keywords in notes */}
          {/damage/i.test(notes) && (
            <View style={styles.damageNoteAlert}>
              <Ionicons name="warning" size={16} color="#ff5252" />
              <Text style={styles.damageNoteAlertText}>
                ⚠ DAMAGE TANK DETECTED — This trip will be flagged as a damage report. Supervisor will receive a damage alert.
              </Text>
            </View>
          )}
        </View>

        {/* Summary row */}
        <View style={styles.summaryBox}>
          <Text style={styles.summaryTitle}>5. Trip Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryKey}>Chassis Cargo</Text>
            <Text style={[styles.summaryVal, { color: '#00e5ff', fontWeight: '800' }]}>
              {containers[0]?.loadType === '40FT' || containers[0]?.size === '40FT'
                ? '1 × 40FT Container'
                : containers[0]?.loadType === '1x20FT'
                ? '1 × 20FT Container (Single)'
                : '2 × 20FT Containers (Twin)'}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryKey}>Chassis Capacity</Text>
            <Text style={[styles.summaryVal, { color: '#22ef7e', fontWeight: '800' }]}>
              {containers[0]?.loadType === '40FT' || containers[0]?.size === '40FT'
                ? '1/1 (40FT Slot Full)'
                : containers[0]?.loadType === '1x20FT'
                ? '1/2 (Single 20FT Loaded)'
                : '2/2 (20FT Twin Slots Full)'}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryKey}>Total Containers</Text>
            <Text style={styles.summaryVal}>
              {containers[0]?.loadType === '40FT' || containers[0]?.size === '40FT'
                ? '1 Container'
                : containers[0]?.loadType === '1x20FT'
                ? '1 Container'
                : '2 Containers'}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryKey}>Loading terminal</Text>
            <Text style={styles.summaryVal}>{sourceTerminal || '—'}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryKey}>Discharge Terminal(s)</Text>
            <Text style={styles.summaryVal}>
              {(() => {
                const list = containers.flatMap((c) => {
                  const lt = c.loadType || (c.size === '40FT' ? '40FT' : '1x20FT');
                  const d = [c.destTerminal];
                  if (lt === '2x20FT' && c.containerNumber2) {
                    d.push(c.destTerminal2 || c.destTerminal);
                  }
                  return d;
                }).filter(Boolean);
                return Array.from(new Set(list)).join(' & ') || '—';
              })()}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryKey}>Vessel</Text>
            <Text style={styles.summaryVal}>{vesselName || '—'}</Text>
          </View>
          {/* Show damage summary if any container flagged or notes has damage */}
          {(containers.some((c) => c.damageStatus === 'DAMAGED') || /damage/i.test(notes)) && (
            <View style={styles.summaryDamageRow}>
              <Ionicons name="alert-circle" size={14} color="#ff5252" />
              <Text style={styles.summaryDamageText}>⚠ DAMAGE TANK — Supervisor alert will be raised</Text>
            </View>
          )}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryKey}>Vehicle / CHE</Text>
            <Text style={styles.summaryVal}>
              {driverTruck || user?.vehicleNumber || 'LY-6439'} / {driverChe || user?.chaiNumber || user?.chassisNumber || 'CHE 100'}
            </Text>
          </View>
          <View style={styles.chassisRulePill}>
            <Ionicons name="shield-checkmark" size={13} color="#22ef7e" />
            <Text style={styles.chassisRulePillText}>
              Chassis Policy: 1 Trip can carry 1 × 20FT (Single), 2 × 20FT (Twin), or 1 × 40FT.
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
          <TouchableOpacity
            style={[styles.startBtn, { flex: 1, backgroundColor: '#080e17', borderColor: '#242a34', borderWidth: 1 }]}
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/(driver)/(tabs)');
              }
            }}
          >
            <Text style={[styles.startBtnText, { color: '#849396' }]}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.startBtn, { flex: 1, backgroundColor: 'rgba(34, 239, 126, 0.15)', borderColor: '#22ef7e', borderWidth: 1 }]}>
            <Text style={[styles.startBtnText, { color: '#22ef7e' }]}>Save Draft</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.startBtn, loading && styles.startBtnDisabled]}
          onPress={handleStartTrip}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#00363d" />
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Ionicons name="play-circle" size={20} color="#00363d" />
              <Text style={styles.startBtnText}>Start Trip & Begin Transport</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {showVerify && (
        <TripVerifyOverlay
          mode="verify"
          vesselName={vesselName}
          sourceTerminal={sourceTerminal}
          destTerminals={(() => {
            const list = containers.flatMap((c) => {
              const lt = c.loadType || (c.size === '40FT' ? '40FT' : '1x20FT');
              const d = [c.destTerminal];
              if (lt === '2x20FT' && c.containerNumber2) {
                d.push(c.destTerminal2 || c.destTerminal);
              }
              return d;
            }).filter(Boolean);
            return Array.from(new Set(list)).join(' & ');
          })()}
          vehicleNumber={driverTruck || user?.vehicleNumber || 'LY-6439'}
          driverName={driverName || user?.name || 'Kamal Perera'}
          containers={containers.flatMap((c) => {
            const currentLoadType = c.loadType || (c.size === '40FT' ? '40FT' : '1x20FT');
            const list = [{
              containerNumber: c.containerNumber.trim().toUpperCase(),
              size: c.size,
              destTerminal: c.destTerminal,
              isReturn: c.isReturnContainer,
            }];
            if (currentLoadType === '2x20FT' && c.containerNumber2 && c.containerNumber2.trim()) {
              list.push({
                containerNumber: c.containerNumber2.trim().toUpperCase(),
                size: '20FT',
                destTerminal: c.destTerminal2 || c.destTerminal,
                isReturn: c.isReturnContainer,
              });
            }
            return list;
          })}
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
          containerCount={containers.reduce((acc, c) => {
            const currentLoadType = c.loadType || (c.size === '40FT' ? '40FT' : '1x20FT');
            return acc + (currentLoadType === '2x20FT' && c.containerNumber2 && c.containerNumber2.trim() ? 2 : 1);
          }, 0)}
          onDone={goHomeAfterSend}
        />
      )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0e141d' },
  header: {
    backgroundColor: '#161c25',
    padding: spacing.lg, paddingTop: 60, paddingBottom: spacing.lg,
    borderBottomLeftRadius: radius.xl, borderBottomRightRadius: radius.xl,
    borderWidth: 1, borderColor: '#242a34', borderTopWidth: 0,
  },
  backBtn: { paddingVertical: 4, marginBottom: spacing.sm, alignSelf: 'flex-start' },
  backText: { color: '#00e5ff', fontSize: 15, fontWeight: '700' },
  headerTitle: { color: '#dde2f0', fontSize: 24, fontWeight: '800' },
  headerSub: { color: '#849396', fontSize: 13, marginTop: 4 },

  content: { padding: spacing.md, paddingBottom: 50 },

  infoCard: {
    backgroundColor: '#161c25', borderRadius: radius.lg, padding: spacing.md,
    marginBottom: spacing.md, borderWidth: 1, borderColor: '#242a34',
  },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoLabel: { fontSize: 11, color: '#849396' },
  infoValue: { fontSize: 17, fontWeight: '800', color: '#dde2f0', marginTop: 2 },
  infoSub: { fontSize: 11, color: '#849396', marginTop: 2 },
  truckBadge: {
    backgroundColor: '#080e17', paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: radius.md, alignItems: 'center', borderWidth: 1, borderColor: '#242a34',
  },
  truckLabel: { fontSize: 10, fontWeight: '800', color: '#00e5ff' },
  truckValue: { fontSize: 14, fontWeight: '700', color: '#dde2f0', marginTop: 2 },

  section: {
    backgroundColor: '#161c25', borderRadius: radius.lg, padding: spacing.md,
    marginBottom: spacing.md, borderWidth: 1, borderColor: '#242a34',
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#dde2f0', marginBottom: 2 },
  sectionSub: { fontSize: 13, color: '#849396', marginBottom: 12 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#849396', marginBottom: 6 },

  input: {
    backgroundColor: '#080e17', borderWidth: 1, borderColor: '#242a34',
    borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: '#dde2f0', marginBottom: 12,
    ...(Platform.OS === 'web' && { outlineStyle: 'none', cursor: 'text' } as any),
  },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip: {
    backgroundColor: '#080e17', paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: radius.pill, borderWidth: 1, borderColor: '#242a34',
  },
  chipActive: { backgroundColor: 'rgba(0, 229, 255, 0.15)', borderColor: '#00e5ff' },
  chipText: { fontSize: 13, color: '#849396', fontWeight: '600' },
  chipTextActive: { color: '#00e5ff', fontWeight: '800' },

  damageNoteAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 82, 82, 0.15)',
    borderWidth: 1,
    borderColor: '#ff5252',
    borderRadius: radius.md,
    padding: spacing.sm,
    marginTop: spacing.sm,
    gap: 8,
  },
  damageNoteAlertText: {
    color: '#ff5252',
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  summaryDamageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 82, 82, 0.15)',
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: 8,
    gap: 8,
  },
  summaryDamageText: {
    color: '#ff5252',
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },

  summaryBox: {
    backgroundColor: '#161c25', borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md,
    borderWidth: 1, borderColor: '#00e5ff',
  },
  summaryTitle: { color: '#00e5ff', fontSize: 15, fontWeight: '800', marginBottom: 14, textTransform: 'uppercase', letterSpacing: 1 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryKey: { color: '#849396', fontSize: 14 },
  summaryVal: { color: '#dde2f0', fontSize: 14, fontWeight: '700' },

  startBtn: {
    backgroundColor: '#00e5ff', paddingVertical: 18, borderRadius: radius.lg,
    alignItems: 'center', marginTop: spacing.sm,
  },
  startBtnDisabled: { opacity: 0.5 },
  startBtnText: { color: '#00363d', fontSize: 16, fontWeight: '900', letterSpacing: 0.5 },
  chassisRulePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(34, 239, 126, 0.1)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(34, 239, 126, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginTop: 6,
  },
  chassisRulePillText: {
    color: '#22ef7e',
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
  },
  editDriverBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.4)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  editDriverBtnText: {
    color: '#00e5ff',
    fontSize: 11,
    fontWeight: '800',
  },
  driverEditForm: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#242a34',
  },
  driverFieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#849396',
    marginBottom: 4,
    marginTop: 6,
    textTransform: 'uppercase',
  },
  driverInput: {
    backgroundColor: '#080e17',
    borderWidth: 1,
    borderColor: '#242a34',
    borderRadius: radius.md,
    color: '#dde2f0',
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
    ...(Platform.OS === 'web' && { outlineStyle: 'none', cursor: 'text' } as any),
  },
  driverCancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    backgroundColor: '#1d2633',
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverCancelBtnText: {
    color: '#849396',
    fontSize: 11,
    fontWeight: '700',
  },
  driverSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    backgroundColor: '#00e5ff',
    justifyContent: 'center',
  },
  driverSaveBtnText: {
    color: '#00363d',
    fontSize: 11,
    fontWeight: '800',
  },
  autoTimingCard: {
    backgroundColor: '#080e17',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.3)',
    borderRadius: radius.md,
    padding: 12,
    marginTop: 8,
    marginBottom: 8,
  },
  autoTimingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  autoTimingTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#00e5ff',
    letterSpacing: 0.5,
  },
  autoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 229, 255, 0.12)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.3)',
  },
  autoBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#00e5ff',
  },
  autoTimingGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  autoTimingCol: {
    flex: 1,
  },
  autoTimingLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#849396',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  autoTimingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0f1622',
    borderWidth: 1,
    borderColor: '#242a34',
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexWrap: 'wrap',
    gap: 6,
  },
  autoDateText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#feb300',
    letterSpacing: 0.5,
  },
  autoClockText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#00e5ff',
    letterSpacing: 1,
  },
  autoTodayTag: {
    backgroundColor: 'rgba(254, 179, 0, 0.16)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  autoTodayTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#feb300',
  },
  liveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(34, 239, 126, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  liveBlinkDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22ef7e',
  },
  livePulseDotGreen: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22ef7e',
  },
  liveTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#22ef7e',
  },
  autoTimingHelp: {
    fontSize: 10,
    color: '#849396',
    lineHeight: 14,
    marginTop: 2,
  },
});
