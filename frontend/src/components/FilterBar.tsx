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
import { Layout } from '../constants/theme';

export type DateFilterOption = 'TODAY' | 'YESTERDAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'ALL';
export type StatusFilterOption = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';

export interface FilterState {
  date: DateFilterOption;
  driverId?: string;
  driverName?: string;
  vehicleNumber?: string;
  terminal?: string;
  status: StatusFilterOption;
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
];

const STATUS_CHIPS: { id: StatusFilterOption; label: string }[] = [
  { id: 'ALL', label: 'All' },
  { id: 'PENDING', label: 'Pending' },
  { id: 'APPROVED', label: 'Approved' },
  { id: 'COMPLETED', label: 'Completed' },
  { id: 'REJECTED', label: 'Rejected' },
];

const DEFAULT_TERMINALS = ['ALL', 'JCT', 'ECT', 'CICT', 'CWIT', 'SAGT', 'UCT'];

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
  // Modal Picker state
  const [modalType, setModalType] = useState<'DRIVER' | 'VEHICLE' | 'TERMINAL' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const hasActiveFilters =
    filters.date !== 'ALL' ||
    !!filters.driverId ||
    !!filters.vehicleNumber ||
    (filters.terminal && filters.terminal !== 'ALL') ||
    filters.status !== 'ALL';

  const handleClearFilters = () => {
    onChange({
      date: 'ALL',
      driverId: undefined,
      driverName: undefined,
      vehicleNumber: undefined,
      terminal: undefined,
      status: 'ALL',
    });
  };

  const getFilteredModalItems = (): FilterOptionItem[] => {
    const q = searchQuery.toLowerCase().trim();
    if (modalType === 'DRIVER') {
      const all: FilterOptionItem[] = [{ id: 'ALL', label: 'All Drivers' }, ...driverOptions];
      return q ? all.filter((i) => i.label.toLowerCase().includes(q) || (i.subLabel && i.subLabel.toLowerCase().includes(q))) : all;
    }
    if (modalType === 'VEHICLE') {
      const all: FilterOptionItem[] = [{ id: 'ALL', label: 'All Vehicles' }, ...vehicleOptions];
      return q ? all.filter((i) => i.label.toLowerCase().includes(q) || (i.subLabel && i.subLabel.toLowerCase().includes(q))) : all;
    }
    if (modalType === 'TERMINAL') {
      const all: FilterOptionItem[] = terminalOptions.map((t) => ({ id: t, label: t === 'ALL' ? 'All Terminals' : t }));
      return q ? all.filter((i) => i.label.toLowerCase().includes(q)) : all;
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
        vehicleNumber: item.id === 'ALL' ? undefined : item.label,
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

  return (
    <View style={styles.container}>
      {/* Date Pill Row */}
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
              onPress={() => onChange({ ...filters, date: chip.id })}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                {chip.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Dropdown Filters Row */}
      <View style={styles.dropdownRow}>
        {showDriverFilter && (
          <TouchableOpacity
            style={[styles.dropdownBtn, !!filters.driverId && styles.dropdownBtnActive]}
            onPress={() => setModalType('DRIVER')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="person-outline"
              size={13}
              color={filters.driverId ? '#0F766E' : '#6B7C85'}
            />
            <Text
              style={[styles.dropdownBtnText, !!filters.driverId && styles.dropdownBtnTextActive]}
              numberOfLines={1}
            >
              {filters.driverName || 'Driver'}
            </Text>
            <Ionicons name="chevron-down" size={12} color="#6B7C85" />
          </TouchableOpacity>
        )}

        {showVehicleFilter && (
          <TouchableOpacity
            style={[styles.dropdownBtn, !!filters.vehicleNumber && styles.dropdownBtnActive]}
            onPress={() => setModalType('VEHICLE')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="car-outline"
              size={13}
              color={filters.vehicleNumber ? '#0F766E' : '#6B7C85'}
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
            <Ionicons name="chevron-down" size={12} color="#6B7C85" />
          </TouchableOpacity>
        )}

        {showTerminalFilter && (
          <TouchableOpacity
            style={[styles.dropdownBtn, !!filters.terminal && styles.dropdownBtnActive]}
            onPress={() => setModalType('TERMINAL')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="business-outline"
              size={13}
              color={filters.terminal ? '#0F766E' : '#6B7C85'}
            />
            <Text
              style={[styles.dropdownBtnText, !!filters.terminal && styles.dropdownBtnTextActive]}
              numberOfLines={1}
            >
              {filters.terminal || 'Terminal'}
            </Text>
            <Ionicons name="chevron-down" size={12} color="#6B7C85" />
          </TouchableOpacity>
        )}

        {showStatusFilter && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
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
      </View>

      {/* Active Filter Summary line + Clear Button */}
      {hasActiveFilters && (
        <View style={styles.activeFiltersRow}>
          <Text style={styles.activeFiltersText} numberOfLines={1}>
            Filters active:{' '}
            {[
              filters.date !== 'ALL' ? filters.date.replace('_', ' ') : null,
              filters.driverName,
              filters.vehicleNumber,
              filters.terminal,
              filters.status !== 'ALL' ? filters.status : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </Text>
          <TouchableOpacity onPress={handleClearFilters} activeOpacity={0.7}>
            <Text style={styles.clearBtnText}>Clear Filters</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Selector Modal */}
      <Modal visible={modalType !== null} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select {modalType}</Text>
              <TouchableOpacity onPress={() => setModalType(null)} activeOpacity={0.7}>
                <Ionicons name="close" size={20} color="#1F2D33" />
              </TouchableOpacity>
            </View>

            {/* Search within picker */}
            <View style={styles.modalSearchWrap}>
              <Ionicons name="search" size={15} color="#A3B1B8" />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search..."
                placeholderTextColor="#A3B1B8"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={14} color="#A3B1B8" />
                </TouchableOpacity>
              )}
            </View>

            <FlatList
              data={getFilteredModalItems()}
              keyExtractor={(item) => item.id}
              style={{ maxHeight: 320 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItemRow}
                  onPress={() => handleSelectItem(item)}
                  activeOpacity={0.7}
                >
                  <View>
                    <Text style={styles.modalItemLabel}>{item.label}</Text>
                    {item.subLabel ? (
                      <Text style={styles.modalItemSubLabel}>{item.subLabel}</Text>
                    ) : null}
                  </View>
                  <Ionicons name="chevron-forward" size={14} color="#E5EAEC" />
                </TouchableOpacity>
              )}
            />
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
    borderBottomColor: '#E5EAEC',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  chipsScroll: {
    gap: 8,
    paddingBottom: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F7F9FA',
    borderWidth: 1,
    borderColor: '#E5EAEC',
  },
  chipActive: {
    backgroundColor: '#E3F4F1',
    borderColor: '#0F766E',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7C85',
  },
  chipTextActive: {
    color: '#0F766E',
    fontWeight: '600',
  },
  dropdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 4,
    flexWrap: 'wrap',
  },
  dropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5EAEC',
    maxWidth: 130,
  },
  dropdownBtnActive: {
    backgroundColor: '#E3F4F1',
    borderColor: '#0F766E',
  },
  dropdownBtnText: {
    fontSize: 12,
    color: '#1F2D33',
    flex: 1,
  },
  dropdownBtnTextActive: {
    color: '#0F766E',
    fontWeight: '600',
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 6,
    backgroundColor: '#F7F9FA',
  },
  statusChipActive: {
    backgroundColor: '#E3F4F1',
  },
  statusChipText: {
    fontSize: 12,
    color: '#6B7C85',
  },
  statusChipTextActive: {
    color: '#0F766E',
    fontWeight: '600',
  },
  activeFiltersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F7F9FA',
    marginTop: 8,
  },
  activeFiltersText: {
    fontSize: 12,
    color: '#6B7C85',
    flex: 1,
    marginRight: 8,
  },
  clearBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F766E',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Layout.radius,
    padding: 16,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5EAEC',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2D33',
  },
  modalSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F9FA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5EAEC',
    paddingHorizontal: 10,
    marginVertical: 10,
    height: 40,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 13,
    color: '#1F2D33',
    paddingVertical: 0,
    marginLeft: 6,
  },
  modalItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F7F9FA',
  },
  modalItemLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2D33',
  },
  modalItemSubLabel: {
    fontSize: 12,
    color: '#6B7C85',
    marginTop: 2,
  },
});

export default FilterBar;
