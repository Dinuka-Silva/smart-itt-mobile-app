import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  FlatList,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../constants/theme';

export type DateFilterOption = 'TODAY' | 'YESTERDAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'CUSTOM' | 'ALL';
export type StatusFilterOption = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';

export interface FilterState {
  date: DateFilterOption;
  customStartDate?: string;
  customEndDate?: string;
  driverId?: string;
  driverName?: string;
  vehicleNumber?: string;
  terminal?: string;
  status: StatusFilterOption;
  search?: string;
}

export interface FilterOptionItem {
  id: string;
  label: string;
  subLabel?: string;
}

interface FilterBarProps {
  filters: FilterState;
  onChange: (newFilters: FilterState) => void;
  driverOptions?: FilterOptionItem[];
  vehicleOptions?: FilterOptionItem[];
  terminalOptions?: string[];
  showDriverFilter?: boolean;
  showVehicleFilter?: boolean;
  showTerminalFilter?: boolean;
  showStatusFilter?: boolean;
}

const DATE_CHIPS: { id: DateFilterOption; label: string }[] = [
  { id: 'ALL', label: 'All Dates' },
  { id: 'TODAY', label: 'Today' },
  { id: 'YESTERDAY', label: 'Yesterday' },
  { id: 'THIS_WEEK', label: 'This Week' },
  { id: 'THIS_MONTH', label: 'This Month' },
  { id: 'CUSTOM', label: 'Custom Range' },
];

const STATUS_CHIPS: { id: StatusFilterOption; label: string }[] = [
  { id: 'ALL', label: 'All Status' },
  { id: 'PENDING', label: 'Pending' },
  { id: 'APPROVED', label: 'Approved' },
  { id: 'COMPLETED', label: 'Completed' },
  { id: 'REJECTED', label: 'Rejected' },
];

const DEFAULT_TERMINALS = ['ALL', 'CICT', 'CWIT', 'ECT', 'JCT', 'UCT', 'SAGT'];

function normalizePlate(raw: string): string {
  return (raw || '').replace(/[^A-Za-z0-9]/g, '').toLowerCase();
}

export function FilterBar({
  filters,
  onChange,
  driverOptions = [],
  vehicleOptions = [],
  terminalOptions = DEFAULT_TERMINALS,
  showDriverFilter = true,
  showVehicleFilter = true,
  showTerminalFilter = true,
  showStatusFilter = true,
}: FilterBarProps) {
  const [modalType, setModalType] = useState<'DRIVER' | 'VEHICLE' | 'TERMINAL' | 'CUSTOM_DATE' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Custom date inputs
  const [tempStart, setTempStart] = useState(filters.customStartDate || '');
  const [tempEnd, setTempEnd] = useState(filters.customEndDate || '');

  const hasActiveFilters =
    filters.date !== 'ALL' ||
    !!filters.driverId ||
    !!filters.vehicleNumber ||
    (filters.terminal && filters.terminal !== 'ALL') ||
    filters.status !== 'ALL' ||
    !!filters.search;

  const handleClearFilters = () => {
    onChange({
      date: 'ALL',
      customStartDate: undefined,
      customEndDate: undefined,
      driverId: undefined,
      driverName: undefined,
      vehicleNumber: undefined,
      terminal: undefined,
      status: 'ALL',
      search: undefined,
    });
  };

  const getFilteredModalItems = (): FilterOptionItem[] => {
    const q = searchQuery.trim().toLowerCase();
    const qNorm = normalizePlate(searchQuery);

    if (modalType === 'DRIVER') {
      const all: FilterOptionItem[] = [{ id: 'ALL', label: 'All Drivers' }, ...driverOptions];
      if (!q) return all;
      return all.filter(
        (i) =>
          i.label.toLowerCase().includes(q) ||
          (i.subLabel && i.subLabel.toLowerCase().includes(q))
      );
    }

    if (modalType === 'VEHICLE') {
      const all: FilterOptionItem[] = [{ id: 'ALL', label: 'All Vehicles' }, ...vehicleOptions];
      if (!q) return all;
      return all.filter((i) => {
        const normLabel = normalizePlate(i.label);
        const normSub = i.subLabel ? normalizePlate(i.subLabel) : '';
        return (
          i.label.toLowerCase().includes(q) ||
          normLabel.includes(qNorm) ||
          (i.subLabel && i.subLabel.toLowerCase().includes(q)) ||
          normSub.includes(qNorm)
        );
      });
    }

    if (modalType === 'TERMINAL') {
      const all: FilterOptionItem[] = terminalOptions.map((t) => ({
        id: t,
        label: t === 'ALL' ? 'All Terminals' : t,
      }));
      if (!q) return all;
      return all.filter((i) => i.label.toLowerCase().includes(q));
    }

    return [];
  };

  const handleSelectItem = (item: FilterOptionItem) => {
    if (modalType === 'DRIVER') {
      onChange({
        ...filters,
        driverId: item.id === 'ALL' ? undefined : item.id,
        driverName: item.id === 'ALL' ? undefined : item.label,
      });
    } else if (modalType === 'VEHICLE') {
      onChange({
        ...filters,
        vehicleNumber: item.id === 'ALL' ? undefined : item.id,
      });
    } else if (modalType === 'TERMINAL') {
      onChange({
        ...filters,
        terminal: item.id === 'ALL' ? undefined : item.id,
      });
    }
    setModalType(null);
    setSearchQuery('');
  };

  const handleApplyCustomDate = () => {
    if (tempStart) {
      onChange({
        ...filters,
        date: 'CUSTOM',
        customStartDate: tempStart.trim(),
        customEndDate: tempEnd.trim() || tempStart.trim(),
      });
    }
    setModalType(null);
  };

  const renderActiveSummary = () => {
    const parts: string[] = [];
    if (filters.date !== 'ALL') {
      if (filters.date === 'CUSTOM' && filters.customStartDate) {
        parts.push(`Date: ${filters.customStartDate}${filters.customEndDate ? ' to ' + filters.customEndDate : ''}`);
      } else {
        parts.push(`Date: ${filters.date.replace('_', ' ')}`);
      }
    }
    if (filters.driverName) parts.push(`Driver: ${filters.driverName}`);
    if (filters.vehicleNumber) parts.push(`Vehicle: ${filters.vehicleNumber}`);
    if (filters.terminal && filters.terminal !== 'ALL') parts.push(`Terminal: ${filters.terminal}`);
    if (filters.status !== 'ALL') parts.push(`Status: ${filters.status}`);
    if (filters.search) parts.push(`Search: "${filters.search}"`);

    return parts.join(' · ');
  };

  return (
    <View style={styles.container}>
      {/* 1. Date Chips Row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsScroll}
      >
        {DATE_CHIPS.map((chip) => {
          const isActive = filters.date === chip.id;
          return (
            <TouchableOpacity
              key={chip.id}
              style={[styles.chip, isActive && styles.chipActive]}
              onPress={() => {
                if (chip.id === 'CUSTOM') {
                  setModalType('CUSTOM_DATE');
                } else {
                  onChange({
                    ...filters,
                    date: chip.id,
                    customStartDate: undefined,
                    customEndDate: undefined,
                  });
                }
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                {chip.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* 2. Dropdown Filter Buttons */}
      <View style={styles.dropdownRow}>
        {showDriverFilter && (
          <TouchableOpacity
            style={[styles.dropdownBtn, !!filters.driverId && styles.dropdownBtnActive]}
            onPress={() => {
              setSearchQuery('');
              setModalType('DRIVER');
            }}
            activeOpacity={0.7}
          >
            <Ionicons
              name="person-outline"
              size={13}
              color={filters.driverId ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[styles.dropdownBtnText, !!filters.driverId && styles.dropdownBtnTextActive]}
              numberOfLines={1}
            >
              {filters.driverName || 'Driver'}
            </Text>
            <Ionicons name="chevron-down" size={12} color={colors.textSecondary} />
          </TouchableOpacity>
        )}

        {showVehicleFilter && (
          <TouchableOpacity
            style={[styles.dropdownBtn, !!filters.vehicleNumber && styles.dropdownBtnActive]}
            onPress={() => {
              setSearchQuery('');
              setModalType('VEHICLE');
            }}
            activeOpacity={0.7}
          >
            <Ionicons
              name="car-outline"
              size={13}
              color={filters.vehicleNumber ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[
                styles.dropdownBtnText,
                !!filters.vehicleNumber && styles.dropdownBtnTextActive,
              ]}
              numberOfLines={1}
            >
              {filters.vehicleNumber || 'Vehicle'}
            </Text>
            <Ionicons name="chevron-down" size={12} color={colors.textSecondary} />
          </TouchableOpacity>
        )}

        {showTerminalFilter && (
          <TouchableOpacity
            style={[styles.dropdownBtn, !!filters.terminal && styles.dropdownBtnActive]}
            onPress={() => {
              setSearchQuery('');
              setModalType('TERMINAL');
            }}
            activeOpacity={0.7}
          >
            <Ionicons
              name="business-outline"
              size={13}
              color={filters.terminal ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[styles.dropdownBtnText, !!filters.terminal && styles.dropdownBtnTextActive]}
              numberOfLines={1}
            >
              {filters.terminal || 'Terminal'}
            </Text>
            <Ionicons name="chevron-down" size={12} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* 3. Selected Filter Chips with (X) Clear */}
      {(!!filters.vehicleNumber || !!filters.driverId || !!filters.terminal) && (
        <View style={styles.selectedPillsRow}>
          {!!filters.vehicleNumber && (
            <View style={styles.activePill}>
              <Ionicons name="car" size={12} color={colors.primary} />
              <Text style={styles.activePillText}>{filters.vehicleNumber}</Text>
              <TouchableOpacity
                onPress={() => onChange({ ...filters, vehicleNumber: undefined })}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close-circle" size={14} color={colors.primary} />
              </TouchableOpacity>
            </View>
          )}

          {!!filters.driverName && (
            <View style={styles.activePill}>
              <Ionicons name="person" size={12} color={colors.primary} />
              <Text style={styles.activePillText}>{filters.driverName}</Text>
              <TouchableOpacity
                onPress={() => onChange({ ...filters, driverId: undefined, driverName: undefined })}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close-circle" size={14} color={colors.primary} />
              </TouchableOpacity>
            </View>
          )}

          {!!filters.terminal && filters.terminal !== 'ALL' && (
            <View style={styles.activePill}>
              <Ionicons name="business" size={12} color={colors.primary} />
              <Text style={styles.activePillText}>{filters.terminal}</Text>
              <TouchableOpacity
                onPress={() => onChange({ ...filters, terminal: undefined })}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close-circle" size={14} color={colors.primary} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* 4. Status Chips Row */}
      {showStatusFilter && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statusChipsScroll}
        >
          {STATUS_CHIPS.map((st) => {
            const isActive = filters.status === st.id;
            return (
              <TouchableOpacity
                key={st.id}
                style={[styles.statusChip, isActive && styles.statusChipActive]}
                onPress={() => onChange({ ...filters, status: st.id })}
                activeOpacity={0.7}
              >
                <Text style={[styles.statusChipText, isActive && styles.statusChipTextActive]}>
                  {st.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* 5. Active Filter Line + [Clear Filters] button */}
      {hasActiveFilters && (
        <View style={styles.activeFiltersRow}>
          <Text style={styles.activeFiltersText} numberOfLines={1}>
            {renderActiveSummary()}
          </Text>
          <TouchableOpacity
            style={styles.clearBtn}
            onPress={handleClearFilters}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh" size={12} color={colors.danger} />
            <Text style={styles.clearBtnText}>Clear Filters</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Selection Modal (Driver / Vehicle / Terminal) */}
      <Modal visible={modalType !== null && modalType !== 'CUSTOM_DATE'} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select {modalType}</Text>
              <TouchableOpacity onPress={() => setModalType(null)} activeOpacity={0.7}>
                <Ionicons name="close" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Search Input with instant plate normalization */}
            <View style={styles.modalSearchWrap}>
              <Ionicons name="search" size={15} color={colors.textMuted} />
              <TextInput
                style={styles.modalSearchInput}
                placeholder={modalType === 'VEHICLE' ? 'Search vehicle (e.g. LY-6439 or 6439)...' : 'Search...'}
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCorrect={false}
                autoCapitalize="none"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={14} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            <FlatList
              data={getFilteredModalItems()}
              keyExtractor={(item) => item.id}
              style={{ maxHeight: 340 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItemRow}
                  onPress={() => handleSelectItem(item)}
                  activeOpacity={0.7}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalItemLabel}>{item.label}</Text>
                    {item.subLabel ? (
                      <Text style={styles.modalItemSubLabel}>{item.subLabel}</Text>
                    ) : null}
                  </View>
                  <Ionicons name="chevron-forward" size={14} color={colors.border} />
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Custom Date Range Modal */}
      <Modal visible={modalType === 'CUSTOM_DATE'} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Custom Date Range</Text>
              <TouchableOpacity onPress={() => setModalType(null)} activeOpacity={0.7}>
                <Ionicons name="close" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={{ padding: spacing.md, gap: spacing.md }}>
              <View>
                <Text style={styles.inputLabel}>Start Date (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.dateInput}
                  placeholder="2026-11-01"
                  placeholderTextColor={colors.textMuted}
                  value={tempStart}
                  onChangeText={setTempStart}
                />
              </View>
              <View>
                <Text style={styles.inputLabel}>End Date (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.dateInput}
                  placeholder="2026-11-03"
                  placeholderTextColor={colors.textMuted}
                  value={tempEnd}
                  onChangeText={setTempEnd}
                />
              </View>

              <TouchableOpacity
                style={styles.applyBtn}
                onPress={handleApplyCustomDate}
                activeOpacity={0.88}
              >
                <Text style={styles.applyBtnText}>Apply Date Range</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  chipsScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.surfaceTeal,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  chipTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  dropdownRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  dropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#FFFFFF',
  },
  dropdownBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceTeal,
  },
  dropdownBtnText: {
    fontSize: 12,
    color: colors.textSecondary,
    maxWidth: 130,
  },
  dropdownBtnTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  selectedPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceTeal,
    borderColor: colors.primary,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  activePillText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
  },
  statusChipsScroll: {
    gap: 6,
    marginTop: 8,
    paddingBottom: 2,
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusChipActive: {
    backgroundColor: colors.surfaceTeal,
    borderColor: colors.primary,
  },
  statusChipText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  statusChipTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  activeFiltersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  activeFiltersText: {
    fontSize: 11,
    color: colors.textMuted,
    flex: 1,
    marginRight: 8,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  clearBtnText: {
    fontSize: 11,
    color: colors.danger,
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modalSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.textPrimary,
    padding: 0,
  },
  modalItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalItemLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  modalItemSubLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  inputLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
    fontWeight: '600',
  },
  dateInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: colors.textPrimary,
  },
  applyBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  applyBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});
