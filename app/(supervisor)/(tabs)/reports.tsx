import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import { useAuthStore } from '../../../src/store/authStore';
import { useMockTripStore } from '../../../src/store/mockTripStore';
import { tripService } from '../../../src/services/tripService';
import { driverService } from '../../../src/services/driverService';
import { radius, spacing } from '../../../src/theme';
import { SCK_FLEET } from '../../../src/config/fleet';

const ALL_TERMINALS = ['ALL', 'CWIT', 'JCT', 'ECT', 'UCT', 'SAGT', 'CICT'] as const;

export interface ExcelExportRow {
  date: string;
  time: string;
  driverIdentifier: string;
  driverName: string;
  vehicleNo: string;
  cheNo: string;
  container: string;
  sizeOfContainer: string;
  damageOrNot: string;
  loadTerminal: string;
  dischargeTerminal: string;
  tripNumber: string;
  status: string;
}

export default function SupervisorReports() {
  const user = useAuthStore((s) => s.user);

  const [refreshing, setRefreshing] = useState(false);
  const [backendTrips, setBackendTrips] = useState<any[]>([]);

  // ─── Filter States ───
  // 1. Date: specific date string "YYYY-MM-DD" or null for all
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [calendarModalVisible, setCalendarModalVisible] = useState(false);

  // 2. Terminal: 'ALL' or specific terminal code ('JCT', 'CICT', etc.)
  const [selectedTerminal, setSelectedTerminal] = useState<string>('ALL');

  // 3. Driver: 'ALL' or specific driver identifier (e.g., 'DRV-00001', 'demo-driver')
  const [selectedDriver, setSelectedDriver] = useState<string>('ALL');
  const [driverOptions, setDriverOptions] = useState<{ id: string; label: string; code: string }[]>([
    { id: 'ALL', label: 'ALL DRIVERS', code: 'ALL' },
    { id: 'DRV-00001', label: 'Kamal Perera (DRV-00001)', code: 'DRV-00001' },
    { id: 'DRV-00002', label: 'Saman Kumara (DRV-00002)', code: 'DRV-00002' },
    { id: 'DRV-00003', label: 'Nimal Fernando (DRV-00003)', code: 'DRV-00003' },
    { id: 'DRV-00004', label: 'Sunil Silva (DRV-00004)', code: 'DRV-00004' },
  ]);

  // View Mode: 'EXCEL' (spreadsheet table) or 'CARDS'
  const [viewMode, setViewMode] = useState<'EXCEL' | 'CARDS'>('EXCEL');

  const mockTrips = useMockTripStore((s) => s.mockTrips);

  // Fetch registered drivers and backend trips on load
  const loadData = useCallback(async () => {
    try {
      const [driversData, tripsData] = await Promise.allSettled([
        driverService.getAllDrivers(),
        tripService.getTrips(),
      ]);

      if (driversData.status === 'fulfilled' && Array.isArray(driversData.value)) {
        const mapped = [
          { id: 'ALL', label: 'ALL DRIVERS', code: 'ALL' },
          ...driversData.value.map((d: any) => ({
            id: d.driverCode || d.id,
            label: `${d.fullName || d.username} (${d.driverCode || d.id})`,
            code: d.driverCode || d.id,
          })),
        ];
        const unique = mapped.filter((v, idx, a) => a.findIndex((t) => t.id === v.id) === idx);
        setDriverOptions(unique);
      }

      if (tripsData.status === 'fulfilled' && Array.isArray(tripsData.value)) {
        setBackendTrips(tripsData.value);
      }
    } catch {
      // fallback to mock store
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setTimeout(() => setRefreshing(false), 400);
  };

  // Combine Mock Trips & Backend Trips
  const allRawTrips = useMemo(() => {
    const combined = [...mockTrips];
    backendTrips.forEach((bt) => {
      if (!combined.some((mt) => mt.id === bt.id || mt.tripNumber === bt.id)) {
        combined.push({
          id: bt.id,
          tripNumber: `ITT-${bt.id.slice(0, 8)}`,
          driverId: bt.driverId,
          driverCode: bt.driverCode || bt.driverId,
          driverName: bt.driverName || `Driver ${bt.driverId.slice(0, 8)}`,
          vehicleNumber: bt.vehicleNumber || 'WP-NA-0000',
          chassisNumber: bt.chassisNumber || 'CHAI-101',
          vesselName: bt.vesselName || 'Port Vessel',
          sourceTerminal: bt.sourceTerminal || 'CICT',
          destTerminal: bt.destTerminal || 'JCT',
          status: bt.status || 'IN_PROGRESS',
          startTime: bt.createdAt || new Date().toISOString(),
          createdAt: bt.createdAt || new Date().toISOString(),
          containers: (bt.containers || []).map((c: any, idx: number) => ({
            id: c.id || `bc-${idx}`,
            containerNumber: c.containerNumber || 'CONT-0000',
            size: c.size || '40FT',
            destTerminal: c.destinationTerminal || bt.destTerminal || 'JCT',
            status: c.unloadedAt ? 'DISCHARGED' : 'IN_TRANSIT',
            damageStatus: c.damageStatus || 'NONE',
          })),
        } as any);
      }
    });
    return combined;
  }, [mockTrips, backendTrips]);

  // ─── Filter Logic: Date + Terminal + Driver ───
  const filteredTrips = useMemo(() => {
    return allRawTrips.filter((trip) => {
      // 1. Date Filter (using selectedDate string YYYY-MM-DD)
      if (selectedDate) {
        const rawDate = trip.createdAt || trip.startTime || trip.operationDate;
        if (rawDate) {
          const tripDatePart = new Date(rawDate).toISOString().split('T')[0];
          if (tripDatePart !== selectedDate) return false;
        }
      }

      // 2. Terminal Filter (matched against Load Terminal or Discharge Terminal)
      if (selectedTerminal !== 'ALL') {
        const sourceMatch = (trip.sourceTerminal || '').toUpperCase() === selectedTerminal.toUpperCase();
        const destMatch = (trip.destTerminal || '').toUpperCase() === selectedTerminal.toUpperCase();
        const containerDestMatch = (trip.containers || []).some(
          (c: any) => (c.destTerminal || '').toUpperCase() === selectedTerminal.toUpperCase()
        );
        if (!sourceMatch && !destMatch && !containerDestMatch) return false;
      }

      // 3. Driver Filter (matched against driverId, driverCode, or driverName)
      if (selectedDriver !== 'ALL') {
        const dId = (trip.driverId || '').toLowerCase();
        const dCode = (trip.driverCode || '').toLowerCase();
        const target = selectedDriver.toLowerCase();
        if (dId !== target && dCode !== target && !dId.includes(target) && !dCode.includes(target)) {
          return false;
        }
      }

      return true;
    });
  }, [allRawTrips, selectedDate, selectedTerminal, selectedDriver]);

  // ─── Flatten into Excel Rows ───
  // Columns: Date, Time, Driver Identifier, Driver Name, Vehicle No, CHE No, Container, Size of Container, Damage or Not, Load Terminal, Discharge Terminal
  // Special Rule: When container size is 20FT, pair two 20FT containers into one consolidated row (showing both container numbers),
  // while allowing single 20FT container rows when only one exists.
  const excelDataRows: ExcelExportRow[] = useMemo(() => {
    const rows: ExcelExportRow[] = [];

    filteredTrips.forEach((t) => {
      const dObj = new Date(t.createdAt || t.startTime || new Date());
      const dateFormatted = isNaN(dObj.getTime())
        ? 'TODAY'
        : dObj.toISOString().split('T')[0];
      const timeFormatted = isNaN(dObj.getTime())
        ? '00:00'
        : dObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

      const driverIdentifier = t.driverCode || t.driverId || 'DRV-00001';
      const driverName = t.driverName || 'Kamal Perera';
      const fleetMatch = SCK_FLEET.find(
        (f) => f.vehicleNumber === t.vehicleNumber || f.cheNumber === t.chassisNumber || f.assignedDriver?.driverCode === t.driverCode
      );
      const vehicleNo = t.vehicleNumber || fleetMatch?.vehicleNumber || 'LY 5234';
      const cheNo = t.chassisNumber || t.chaiNumber || fleetMatch?.cheNumber || 'SCK 100';
      const loadTerminal = t.sourceTerminal || 'CICT';

      const containers = t.containers || [];
      if (containers.length === 0) {
        rows.push({
          date: dateFormatted,
          time: timeFormatted,
          driverIdentifier,
          driverName,
          vehicleNo,
          cheNo,
          container: 'N/A',
          sizeOfContainer: '—',
          damageOrNot: 'NO DAMAGE',
          loadTerminal,
          dischargeTerminal: t.destTerminal || 'JCT',
          tripNumber: t.tripNumber || t.id,
          status: t.status,
        });
        return;
      }

      // Separate 20FT and non-20FT containers
      const twentyFtContainers: any[] = [];
      const otherContainers: any[] = [];

      containers.forEach((c: any) => {
        const sizeStr = (c.size || '').toUpperCase();
        if (sizeStr.includes('20')) {
          twentyFtContainers.push(c);
        } else {
          otherContainers.push(c);
        }
      });

      // 1. Process 20FT containers: Pair them into 2x 20FT rows when possible
      for (let i = 0; i < twentyFtContainers.length; i += 2) {
        const c1 = twentyFtContainers[i];
        const c2 = twentyFtContainers[i + 1];

        if (c2) {
          // Pair of two 20FT containers
          const isC1Damaged =
            c1.damageStatus === 'DAMAGED' ||
            (c1.remarks && /damage/i.test(c1.remarks));
          const isC2Damaged =
            c2.damageStatus === 'DAMAGED' ||
            (c2.remarks && /damage/i.test(c2.remarks));

          const damageOrNot = isC1Damaged || isC2Damaged ? 'DAMAGED' : 'NO DAMAGE';
          const containerStr = `${c1.containerNumber || 'N/A'} / ${c2.containerNumber || 'N/A'}`;
          const destStr =
            c1.destTerminal && c2.destTerminal && c1.destTerminal !== c2.destTerminal
              ? `${c1.destTerminal}, ${c2.destTerminal}`
              : c1.destTerminal || t.destTerminal || 'JCT';

          rows.push({
            date: dateFormatted,
            time: timeFormatted,
            driverIdentifier,
            driverName,
            vehicleNo,
            cheNo,
            container: containerStr,
            sizeOfContainer: '2x 20FT',
            damageOrNot,
            loadTerminal,
            dischargeTerminal: destStr,
            tripNumber: t.tripNumber || t.id,
            status: t.status,
          });
        } else {
          // Single 20FT container
          const isDamaged =
            c1.damageStatus === 'DAMAGED' ||
            (c1.remarks && /damage/i.test(c1.remarks)) ||
            (t.notes && /damage/i.test(t.notes));

          rows.push({
            date: dateFormatted,
            time: timeFormatted,
            driverIdentifier,
            driverName,
            vehicleNo,
            cheNo,
            container: c1.containerNumber || 'N/A',
            sizeOfContainer: '20FT',
            damageOrNot: isDamaged ? 'DAMAGED' : 'NO DAMAGE',
            loadTerminal,
            dischargeTerminal: c1.destTerminal || t.destTerminal || 'JCT',
            tripNumber: t.tripNumber || t.id,
            status: t.status,
          });
        }
      }

      // 2. Process other containers (40FT, 40HC, etc.)
      otherContainers.forEach((c: any) => {
        const isDamaged =
          c.damageStatus === 'DAMAGED' ||
          (c.remarks && /damage/i.test(c.remarks)) ||
          (t.notes && /damage/i.test(t.notes));

        rows.push({
          date: dateFormatted,
          time: timeFormatted,
          driverIdentifier,
          driverName,
          vehicleNo,
          cheNo,
          container: c.containerNumber || 'N/A',
          sizeOfContainer: c.size || '40FT',
          damageOrNot: isDamaged ? 'DAMAGED' : 'NO DAMAGE',
          loadTerminal,
          dischargeTerminal: c.destTerminal || t.destTerminal || 'JCT',
          tripNumber: t.tripNumber || t.id,
          status: t.status,
        });
      });
    });

    return rows;
  }, [filteredTrips]);

  // Metrics
  const totalContainers = excelDataRows.length;
  const damagedCount = excelDataRows.filter((r) => r.damageOrNot === 'DAMAGED').length;
  const completedTripsCount = filteredTrips.filter(
    (t) => t.status === 'COMPLETED' || t.status === 'APPROVED'
  ).length;

  // ─── Export to Excel/CSV function ───
  const handleExportExcel = () => {
    if (excelDataRows.length === 0) {
      Alert.alert('Empty Report', 'There are no rows matching your selected filters to export.');
      return;
    }

    const headers = [
      'Date',
      'Time',
      'Driver Identifier',
      'Driver Name',
      'Vehicle No',
      'CHE No',
      'Container(s)',
      'Size of Container',
      'Damage or Not',
      'Load Terminal',
      'Discharge Terminal',
      'Trip Number',
      'Status',
    ];

    const csvRows = [
      headers.join(','),
      ...excelDataRows.map((r) =>
        [
          `"${r.date}"`,
          `"${r.time}"`,
          `"${r.driverIdentifier}"`,
          `"${r.driverName}"`,
          `"${r.vehicleNo}"`,
          `"${r.cheNo}"`,
          `"${r.container}"`,
          `"${r.sizeOfContainer}"`,
          `"${r.damageOrNot}"`,
          `"${r.loadTerminal}"`,
          `"${r.dischargeTerminal}"`,
          `"${r.tripNumber}"`,
          `"${r.status}"`,
        ].join(',')
      ),
    ];

    const csvContent = csvRows.join('\n');
    const fileName = `SCK_ITT_Report_${selectedDate || 'ALL_DATES'}_${selectedTerminal}_${selectedDriver}.csv`;

    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof document !== 'undefined') {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      Alert.alert('Export Complete', `Excel/CSV downloaded as "${fileName}". Contains ${excelDataRows.length} container records.`);
    } else {
      Alert.alert(
        'Excel Export Generated',
        `Successfully generated "${fileName}" with ${excelDataRows.length} rows.\n\nDate: ${selectedDate || 'All'}\nTerminal: ${selectedTerminal}\nDriver: ${selectedDriver}`
      );
    }
  };

  const supervisorName = user?.name || user?.fullName || 'Nimal Silva';
  const supervisorInitials = supervisorName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00e5ff" />}
        keyboardShouldPersistTaps="handled"
      >
        {/* ─── 1. SUPERVISOR HEADER ─── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{supervisorInitials}</Text>
            </View>
            <View>
              <Text style={styles.supervisorNameText}>{supervisorName}</Text>
              <View style={styles.roleDateRow}>
                <View style={styles.rolePill}>
                  <Text style={styles.rolePillText}>PORT OPERATIONS SUPERVISOR</Text>
                </View>
                <Text style={styles.dateText}>SCK ITT DISPATCH AUDIT</Text>
              </View>
            </View>
          </View>

          <View style={styles.badgeWrap}>
            <Ionicons name="shield-checkmark" size={13} color="#00e5ff" />
            <Text style={styles.badgeText}>AUDIT ENGINE</Text>
          </View>
        </View>

        {/* ─── 2. SUPERVISOR FILTERS PANEL ─── */}
        <View style={styles.filterCard}>
          <View style={styles.filterCardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="filter" size={16} color="#00e5ff" />
              <Text style={styles.filterCardTitle}>SUPERVISOR AUDIT FILTERS</Text>
            </View>
            {(selectedDate || selectedTerminal !== 'ALL' || selectedDriver !== 'ALL') && (
              <TouchableOpacity
                style={styles.resetBtn}
                onPress={() => {
                  setSelectedDate(null);
                  setSelectedTerminal('ALL');
                  setSelectedDriver('ALL');
                }}
              >
                <Ionicons name="reload" size={12} color="#feb300" />
                <Text style={styles.resetBtnText}>RESET FILTERS</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ── A. CALENDAR DATE SELECTOR ── */}
          <View style={styles.filterBlock}>
            <View style={styles.filterLabelRow}>
              <Ionicons name="calendar" size={14} color="#00e5ff" />
              <Text style={styles.filterLabel}>SELECT DATE (CALENDAR)</Text>
              {selectedDate && (
                <View style={styles.activeFilterPill}>
                  <Text style={styles.activeFilterPillText}>{selectedDate}</Text>
                </View>
              )}
            </View>

            <View style={styles.dateControlRow}>
              <TouchableOpacity
                style={[styles.calendarPickerBtn, selectedDate ? styles.calendarPickerBtnActive : null]}
                onPress={() => setCalendarModalVisible(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="calendar-outline" size={18} color={selectedDate ? '#00363d' : '#00e5ff'} />
                <Text style={[styles.calendarPickerBtnText, selectedDate ? styles.calendarPickerBtnTextActive : null]}>
                  {selectedDate ? `Selected: ${selectedDate}` : 'Open Calendar To Pick Date'}
                </Text>
                <Ionicons name="chevron-down" size={16} color={selectedDate ? '#00363d' : '#849396'} />
              </TouchableOpacity>

              {selectedDate && (
                <TouchableOpacity style={styles.clearDateBtn} onPress={() => setSelectedDate(null)}>
                  <Ionicons name="close-circle" size={18} color="#ff5252" />
                  <Text style={styles.clearDateText}>ALL DATES</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* ── B. TERMINAL SELECTOR ── */}
          <View style={styles.filterBlock}>
            <View style={styles.filterLabelRow}>
              <Ionicons name="business" size={14} color="#00e5ff" />
              <Text style={styles.filterLabel}>SELECT TERMINAL (LOAD / DISCHARGE)</Text>
              {selectedTerminal !== 'ALL' && (
                <View style={styles.activeFilterPill}>
                  <Text style={styles.activeFilterPillText}>{selectedTerminal}</Text>
                </View>
              )}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
              {ALL_TERMINALS.map((term) => {
                const isActive = selectedTerminal === term;
                return (
                  <TouchableOpacity
                    key={term}
                    style={[styles.terminalChip, isActive && styles.terminalChipActive]}
                    onPress={() => setSelectedTerminal(term)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={term === 'ALL' ? 'layers' : 'boat'}
                      size={13}
                      color={isActive ? '#00363d' : '#849396'}
                    />
                    <Text style={[styles.terminalChipText, isActive && styles.terminalChipTextActive]}>
                      {term === 'ALL' ? 'ALL TERMINALS' : term}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* ── C. DRIVER SELECTOR ── */}
          <View style={styles.filterBlock}>
            <View style={styles.filterLabelRow}>
              <Ionicons name="person" size={14} color="#00e5ff" />
              <Text style={styles.filterLabel}>SELECT DRIVER (OPERATOR CODE)</Text>
              {selectedDriver !== 'ALL' && (
                <View style={styles.activeFilterPill}>
                  <Text style={styles.activeFilterPillText}>{selectedDriver}</Text>
                </View>
              )}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
              {driverOptions.map((drv) => {
                const isActive = selectedDriver === drv.id;
                return (
                  <TouchableOpacity
                    key={drv.id}
                    style={[styles.driverChip, isActive && styles.driverChipActive]}
                    onPress={() => setSelectedDriver(drv.id)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="person-circle"
                      size={14}
                      color={isActive ? '#432c00' : '#849396'}
                    />
                    <Text style={[styles.driverChipText, isActive && styles.driverChipTextActive]}>
                      {drv.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>

        {/* ─── 3. METRICS SUMMARY BAR ─── */}
        <View style={styles.summaryBar}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>{filteredTrips.length}</Text>
            <Text style={styles.summaryLabel}>TRIPS</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNumber, { color: '#00e5ff' }]}>{totalContainers}</Text>
            <Text style={styles.summaryLabel}>DISPATCH ROWS</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNumber, { color: '#22ef7e' }]}>{completedTripsCount}</Text>
            <Text style={styles.summaryLabel}>COMPLETED</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNumber, { color: damagedCount > 0 ? '#ff5252' : '#849396' }]}>
              {damagedCount}
            </Text>
            <Text style={styles.summaryLabel}>DAMAGED</Text>
          </View>
        </View>

        {/* ─── 4. EXCEL REPORT TABLE HEADER & ACTIONS ─── */}
        <View style={styles.tableHeaderSection}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={styles.excelIconBox}>
              <Ionicons name="grid" size={16} color="#22ef7e" />
            </View>
            <View>
              <Text style={styles.tableMainTitle}>EXCEL AUDIT DISPATCH SHEET</Text>
              <Text style={styles.tableSubTitle}>
                {excelDataRows.length} Dispatch Records · Showing Vehicle No, CHE No & 20FT Dual Pairs
              </Text>
            </View>
          </View>

          <View style={styles.viewToggleRow}>
            <TouchableOpacity
              style={[styles.toggleBtn, viewMode === 'EXCEL' && styles.toggleBtnActive]}
              onPress={() => setViewMode('EXCEL')}
            >
              <Ionicons name="grid-outline" size={14} color={viewMode === 'EXCEL' ? '#00363d' : '#849396'} />
              <Text style={[styles.toggleBtnText, viewMode === 'EXCEL' && styles.toggleBtnTextActive]}>
                EXCEL
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.toggleBtn, viewMode === 'CARDS' && styles.toggleBtnActive]}
              onPress={() => setViewMode('CARDS')}
            >
              <Ionicons name="albums-outline" size={14} color={viewMode === 'CARDS' ? '#00363d' : '#849396'} />
              <Text style={[styles.toggleBtnText, viewMode === 'CARDS' && styles.toggleBtnTextActive]}>
                CARDS
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── 5. EXCEL SPREADSHEET TABLE ─── */}
        {viewMode === 'EXCEL' ? (
          <View style={styles.excelSheetCard}>
            {excelDataRows.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Ionicons name="file-tray-outline" size={36} color="#849396" />
                <Text style={styles.emptyTitle}>NO RECORDS MATCH YOUR FILTERS</Text>
                <Text style={styles.emptySubtitle}>
                  Try selecting a different date from the calendar or choose "ALL" for terminals / drivers.
                </Text>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={true} nestedScrollEnabled={true}>
                <View>
                  {/* Table Header Row */}
                  <View style={styles.tableRowHeader}>
                    <Text style={[styles.thCell, { width: 44, textAlign: 'center' }]}>#</Text>
                    <Text style={[styles.thCell, { width: 95 }]}>DATE</Text>
                    <Text style={[styles.thCell, { width: 85 }]}>TIME</Text>
                    <Text style={[styles.thCell, { width: 120 }]}>DRIVER ID</Text>
                    <Text style={[styles.thCell, { width: 135 }]}>DRIVER NAME</Text>
                    <Text style={[styles.thCell, { width: 115 }]}>VEHICLE NO</Text>
                    <Text style={[styles.thCell, { width: 105 }]}>CHE NO</Text>
                    <Text style={[styles.thCell, { width: 220 }]}>CONTAINER(S)</Text>
                    <Text style={[styles.thCell, { width: 125 }]}>SIZE OF CONTAINER</Text>
                    <Text style={[styles.thCell, { width: 120 }]}>DAMAGE OR NOT</Text>
                    <Text style={[styles.thCell, { width: 110 }]}>LOAD TERMINAL</Text>
                    <Text style={[styles.thCell, { width: 130 }]}>DISCHARGE TERMINAL</Text>
                    <Text style={[styles.thCell, { width: 105 }]}>TRIP NUMBER</Text>
                  </View>

                  {/* Table Body Rows */}
                  {excelDataRows.map((row, idx) => {
                    const isDamaged = row.damageOrNot === 'DAMAGED';
                    const isEven = idx % 2 === 0;
                    const isDual20 = row.sizeOfContainer.includes('2x');

                    return (
                      <View
                        key={`${row.tripNumber}-${row.container}-${idx}`}
                        style={[styles.tableRow, isEven ? styles.tableRowEven : styles.tableRowOdd]}
                      >
                        <Text style={[styles.tdCell, { width: 44, textAlign: 'center', color: '#849396' }]}>
                          {idx + 1}
                        </Text>
                        <Text style={[styles.tdCell, { width: 95, fontWeight: '700', color: '#00e5ff' }]}>
                          {row.date}
                        </Text>
                        <Text style={[styles.tdCell, { width: 85, color: '#bac9cc' }]}>
                          {row.time}
                        </Text>
                        <View style={[styles.tdCellWrap, { width: 120 }]}>
                          <View style={styles.driverCodeBadge}>
                            <Text style={styles.driverCodeBadgeText}>{row.driverIdentifier}</Text>
                          </View>
                        </View>
                        <Text style={[styles.tdCell, { width: 135, fontWeight: '700', color: '#dde2f0' }]}>
                          {row.driverName}
                        </Text>
                        <View style={[styles.tdCellWrap, { width: 115 }]}>
                          <View style={styles.vehicleBadge}>
                            <Ionicons name="bus" size={11} color="#feb300" />
                            <Text style={styles.vehicleBadgeText}>{row.vehicleNo}</Text>
                          </View>
                        </View>
                        <View style={[styles.tdCellWrap, { width: 105 }]}>
                          <View style={styles.cheBadge}>
                            <Ionicons name="hardware-chip" size={10} color="#00e5ff" />
                            <Text style={styles.cheBadgeText}>{row.cheNo}</Text>
                          </View>
                        </View>
                        <View style={[styles.tdCellWrap, { width: 220 }]}>
                          <Text style={[styles.containerText, isDual20 ? styles.dualContainerText : null]}>
                            {row.container}
                          </Text>
                          {isDual20 && (
                            <View style={styles.dualBadgePill}>
                              <Text style={styles.dualBadgePillText}>2 x 20FT DUAL CARRIED</Text>
                            </View>
                          )}
                        </View>
                        <View style={[styles.tdCellWrap, { width: 125 }]}>
                          <View style={[styles.sizePill, isDual20 ? styles.sizePillDual : null]}>
                            <Text style={[styles.sizePillText, isDual20 ? styles.sizePillTextDual : null]}>
                              {row.sizeOfContainer}
                            </Text>
                          </View>
                        </View>
                        <View style={[styles.tdCellWrap, { width: 120 }]}>
                          <View style={[styles.damageBadge, isDamaged ? styles.damageBadgeRed : styles.damageBadgeGreen]}>
                            <Ionicons
                              name={isDamaged ? 'warning' : 'checkmark-circle'}
                              size={11}
                              color={isDamaged ? '#ff5252' : '#22ef7e'}
                            />
                            <Text style={[styles.damageBadgeText, isDamaged ? styles.damageTextRed : styles.damageTextGreen]}>
                              {row.damageOrNot}
                            </Text>
                          </View>
                        </View>
                        <Text style={[styles.tdCell, { width: 110, fontWeight: '800', color: '#feb300' }]}>
                          {row.loadTerminal}
                        </Text>
                        <Text style={[styles.tdCell, { width: 130, fontWeight: '800', color: '#22ef7e' }]}>
                          {row.dischargeTerminal}
                        </Text>
                        <Text style={[styles.tdCell, { width: 105, fontSize: 10, color: '#849396' }]}>
                          {row.tripNumber}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            )}
          </View>
        ) : (
          /* ─── CARDS VIEW ─── */
          <View style={{ gap: 10 }}>
            {excelDataRows.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Ionicons name="file-tray-outline" size={36} color="#849396" />
                <Text style={styles.emptyTitle}>NO TRIPS MATCH YOUR SELECTION</Text>
              </View>
            ) : (
              excelDataRows.map((r, i) => (
                <View key={`${r.tripNumber}-${i}`} style={styles.cardItem}>
                  <View style={styles.cardItemTop}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <View style={styles.driverCodeBadge}>
                        <Text style={styles.driverCodeBadgeText}>{r.driverIdentifier}</Text>
                      </View>
                      <Text style={styles.cardDriverName}>{r.driverName}</Text>
                    </View>
                    <View style={[styles.damageBadge, r.damageOrNot === 'DAMAGED' ? styles.damageBadgeRed : styles.damageBadgeGreen]}>
                      <Text style={[styles.damageBadgeText, r.damageOrNot === 'DAMAGED' ? styles.damageTextRed : styles.damageTextGreen]}>
                        {r.damageOrNot}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.specBadgesRow}>
                    <View style={styles.vehicleBadge}>
                      <Ionicons name="bus" size={11} color="#feb300" />
                      <Text style={styles.vehicleBadgeText}>Vehicle: {r.vehicleNo}</Text>
                    </View>
                    <View style={styles.cheBadge}>
                      <Ionicons name="hardware-chip" size={10} color="#00e5ff" />
                      <Text style={styles.cheBadgeText}>CHE: {r.cheNo}</Text>
                    </View>
                  </View>

                  <View style={styles.cardRow}>
                    <Text style={styles.cardLabel}>CONTAINER(S):</Text>
                    <Text style={styles.cardValCyan}>{r.container} ({r.sizeOfContainer})</Text>
                  </View>

                  <View style={styles.cardRow}>
                    <Text style={styles.cardLabel}>TERMINAL ROUTE:</Text>
                    <Text style={styles.cardValRoute}>
                      {r.loadTerminal} <Ionicons name="arrow-forward" size={10} color="#00e5ff" /> {r.dischargeTerminal}
                    </Text>
                  </View>

                  <View style={styles.cardRow}>
                    <Text style={styles.cardLabel}>TIMESTAMP / TRIP:</Text>
                    <Text style={styles.cardValWhite}>{r.date} {r.time} · {r.tripNumber}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* ─── 6. EXCEL EXPORT BUTTON ─── */}
        <View style={styles.exportSection}>
          <TouchableOpacity style={styles.exportExcelBtn} onPress={handleExportExcel} activeOpacity={0.88}>
            <Ionicons name="download" size={18} color="#00363d" />
            <Text style={styles.exportExcelBtnText}>DOWNLOAD EXCEL SPREADSHEET (.CSV)</Text>
          </TouchableOpacity>
          <Text style={styles.exportHelpText}>
            Export includes: Date · Time · Driver ID · Driver Name · Vehicle No · CHE No · Container(s) · Size · Damage · Load Terminal · Discharge Terminal
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ─── 7. CALENDAR MODAL ─── */}
      <Modal
        visible={calendarModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setCalendarModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="calendar" size={18} color="#00e5ff" />
                <Text style={styles.modalTitle}>SELECT OPERATION DATE</Text>
              </View>
              <TouchableOpacity onPress={() => setCalendarModalVisible(false)} style={styles.closeModalBtn}>
                <Ionicons name="close" size={20} color="#dde2f0" />
              </TouchableOpacity>
            </View>

            <Calendar
              current={selectedDate || new Date().toISOString().split('T')[0]}
              onDayPress={(day: { dateString: string }) => {
                setSelectedDate(day.dateString);
                setCalendarModalVisible(false);
              }}
              markedDates={
                selectedDate
                  ? {
                      [selectedDate]: {
                        selected: true,
                        selectedColor: '#00e5ff',
                        selectedTextColor: '#00363d',
                      },
                    }
                  : {}
              }
              theme={{
                backgroundColor: '#161c25',
                calendarBackground: '#161c25',
                textSectionTitleColor: '#00e5ff',
                selectedDayBackgroundColor: '#00e5ff',
                selectedDayTextColor: '#00363d',
                todayTextColor: '#feb300',
                dayTextColor: '#dde2f0',
                textDisabledColor: '#3b494c',
                arrowColor: '#00e5ff',
                monthTextColor: '#00e5ff',
                indicatorColor: '#00e5ff',
                textDayFontWeight: '700',
                textMonthFontWeight: '900',
                textDayHeaderFontWeight: '800',
                textDayFontSize: 13,
                textMonthFontSize: 14,
                textDayHeaderFontSize: 11,
              }}
              style={styles.calendarStyle}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalTodayBtn}
                onPress={() => {
                  setSelectedDate(new Date().toISOString().split('T')[0]);
                  setCalendarModalVisible(false);
                }}
              >
                <Text style={styles.modalTodayBtnText}>TODAY</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalAllDatesBtn}
                onPress={() => {
                  setSelectedDate(null);
                  setCalendarModalVisible(false);
                }}
              >
                <Text style={styles.modalAllDatesBtnText}>SHOW ALL DATES</Text>
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
    flex: 1,
    backgroundColor: '#0e141d',
  },
  scroll: {
    padding: spacing.margin,
    paddingBottom: 40,
    gap: 16,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#00e5ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#00363d',
    fontWeight: '900',
    fontSize: 16,
  },
  supervisorNameText: {
    color: '#dde2f0',
    fontSize: 15,
    fontWeight: '800',
  },
  roleDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  rolePill: {
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  rolePillText: {
    color: '#00e5ff',
    fontSize: 8,
    fontWeight: '800',
  },
  dateText: {
    color: '#849396',
    fontSize: 9,
    fontWeight: '700',
  },
  badgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#161c25',
    borderWidth: 1,
    borderColor: '#242a34',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.DEFAULT,
  },
  badgeText: {
    color: '#00e5ff',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },

  // Filter Card
  filterCard: {
    backgroundColor: '#161c25',
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: '#242a34',
    padding: 14,
    gap: 14,
  },
  filterCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#242a34',
    paddingBottom: 8,
  },
  filterCardTitle: {
    color: '#00e5ff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1a2029',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#feb300',
  },
  resetBtnText: {
    color: '#feb300',
    fontSize: 9,
    fontWeight: '800',
  },
  filterBlock: {
    gap: 6,
  },
  filterLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filterLabel: {
    color: '#849396',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  activeFilterPill: {
    backgroundColor: 'rgba(0, 229, 255, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 3,
  },
  activeFilterPillText: {
    color: '#00e5ff',
    fontSize: 9,
    fontWeight: '800',
  },

  // Date controls
  dateControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  calendarPickerBtn: {
    flex: 1,
    height: 40,
    backgroundColor: '#080e17',
    borderWidth: 1,
    borderColor: '#242a34',
    borderRadius: radius.DEFAULT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  calendarPickerBtnActive: {
    backgroundColor: '#00e5ff',
    borderColor: '#00e5ff',
  },
  calendarPickerBtnText: {
    color: '#849396',
    fontSize: 11,
    fontWeight: '700',
  },
  calendarPickerBtnTextActive: {
    color: '#00363d',
    fontWeight: '900',
  },
  clearDateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 82, 82, 0.1)',
    borderWidth: 1,
    borderColor: '#ff5252',
    height: 40,
    paddingHorizontal: 10,
    borderRadius: radius.DEFAULT,
  },
  clearDateText: {
    color: '#ff5252',
    fontSize: 9,
    fontWeight: '800',
  },

  // Chips Scroll
  chipsScroll: {
    gap: 6,
    paddingVertical: 2,
  },
  terminalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#080e17',
    borderWidth: 1,
    borderColor: '#242a34',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.DEFAULT,
  },
  terminalChipActive: {
    backgroundColor: '#00e5ff',
    borderColor: '#00e5ff',
  },
  terminalChipText: {
    color: '#849396',
    fontSize: 10,
    fontWeight: '800',
  },
  terminalChipTextActive: {
    color: '#00363d',
    fontWeight: '900',
  },
  driverChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#080e17',
    borderWidth: 1,
    borderColor: '#242a34',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.DEFAULT,
  },
  driverChipActive: {
    backgroundColor: '#feb300',
    borderColor: '#feb300',
  },
  driverChipText: {
    color: '#849396',
    fontSize: 10,
    fontWeight: '800',
  },
  driverChipTextActive: {
    color: '#432c00',
    fontWeight: '900',
  },

  // Summary Metrics Bar
  summaryBar: {
    flexDirection: 'row',
    backgroundColor: '#161c25',
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: '#242a34',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 18,
    fontWeight: '900',
    color: '#dde2f0',
  },
  summaryLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: '#849396',
    marginTop: 2,
    letterSpacing: 0.6,
  },
  summaryDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#242a34',
  },

  // Table Header Section
  tableHeaderSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  excelIconBox: {
    width: 30,
    height: 30,
    borderRadius: 6,
    backgroundColor: 'rgba(34, 239, 126, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(34, 239, 126, 0.3)',
  },
  tableMainTitle: {
    color: '#22ef7e',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  tableSubTitle: {
    color: '#849396',
    fontSize: 9,
    fontWeight: '700',
  },
  viewToggleRow: {
    flexDirection: 'row',
    backgroundColor: '#161c25',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#242a34',
    padding: 2,
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  toggleBtnActive: {
    backgroundColor: '#00e5ff',
  },
  toggleBtnText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#849396',
  },
  toggleBtnTextActive: {
    color: '#00363d',
  },

  // Excel Sheet Card
  excelSheetCard: {
    backgroundColor: '#161c25',
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: '#242a34',
    overflow: 'hidden',
  },
  tableRowHeader: {
    flexDirection: 'row',
    backgroundColor: '#080e17',
    borderBottomWidth: 2,
    borderBottomColor: '#00e5ff',
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  thCell: {
    color: '#00e5ff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.6,
    paddingHorizontal: 6,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#242a34',
  },
  tableRowEven: {
    backgroundColor: '#161c25',
  },
  tableRowOdd: {
    backgroundColor: '#111721',
  },
  tdCell: {
    fontSize: 11,
    color: '#dde2f0',
    paddingHorizontal: 6,
  },
  tdCellWrap: {
    paddingHorizontal: 6,
    justifyContent: 'center',
  },
  driverCodeBadge: {
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.3)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  driverCodeBadgeText: {
    color: '#00e5ff',
    fontSize: 9,
    fontWeight: '800',
  },
  vehicleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(254, 179, 0, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(254, 179, 0, 0.3)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  vehicleBadgeText: {
    color: '#feb300',
    fontSize: 9,
    fontWeight: '800',
  },
  cheBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.3)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  cheBadgeText: {
    color: '#00e5ff',
    fontSize: 9,
    fontWeight: '800',
  },
  containerText: {
    color: '#c3f5ff',
    fontSize: 11,
    fontWeight: '800',
  },
  dualContainerText: {
    color: '#00e5ff',
    fontWeight: '900',
  },
  dualBadgePill: {
    backgroundColor: 'rgba(0, 229, 255, 0.15)',
    borderRadius: 3,
    paddingHorizontal: 4,
    paddingVertical: 1,
    marginTop: 2,
    alignSelf: 'flex-start',
  },
  dualBadgePillText: {
    color: '#00e5ff',
    fontSize: 7.5,
    fontWeight: '900',
  },
  sizePill: {
    backgroundColor: '#242a34',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  sizePillDual: {
    backgroundColor: 'rgba(0, 229, 255, 0.2)',
    borderWidth: 1,
    borderColor: '#00e5ff',
  },
  sizePillText: {
    color: '#dde2f0',
    fontSize: 9,
    fontWeight: '800',
  },
  sizePillTextDual: {
    color: '#00e5ff',
    fontWeight: '900',
  },
  damageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  damageBadgeGreen: {
    backgroundColor: 'rgba(34, 239, 126, 0.1)',
    borderColor: '#22ef7e',
  },
  damageBadgeRed: {
    backgroundColor: 'rgba(255, 82, 82, 0.12)',
    borderColor: '#ff5252',
  },
  damageBadgeText: {
    fontSize: 8,
    fontWeight: '900',
  },
  damageTextGreen: { color: '#22ef7e' },
  damageTextRed: { color: '#ff5252' },

  // Empty State
  emptyWrap: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyTitle: {
    color: '#dde2f0',
    fontSize: 12,
    fontWeight: '800',
  },
  emptySubtitle: {
    color: '#849396',
    fontSize: 10,
    textAlign: 'center',
    maxWidth: 320,
  },

  // Card View Mode
  cardItem: {
    backgroundColor: '#161c25',
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: '#242a34',
    padding: 12,
    gap: 8,
  },
  cardItemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#242a34',
    paddingBottom: 6,
  },
  cardDriverName: {
    color: '#dde2f0',
    fontSize: 12,
    fontWeight: '800',
  },
  specBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLabel: {
    color: '#849396',
    fontSize: 10,
    fontWeight: '700',
  },
  cardValCyan: {
    color: '#00e5ff',
    fontSize: 11,
    fontWeight: '800',
  },
  cardValRoute: {
    color: '#feb300',
    fontSize: 11,
    fontWeight: '800',
  },
  cardValWhite: {
    color: '#dde2f0',
    fontSize: 10,
    fontWeight: '600',
  },

  // Export Section
  exportSection: {
    gap: 6,
    alignItems: 'center',
  },
  exportExcelBtn: {
    backgroundColor: '#22ef7e',
    width: '100%',
    height: 48,
    borderRadius: radius.DEFAULT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 4,
  },
  exportExcelBtnText: {
    color: '#00363d',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  exportHelpText: {
    color: '#849396',
    fontSize: 9,
    textAlign: 'center',
    lineHeight: 14,
  },

  // Calendar Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#161c25',
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: '#00e5ff',
    padding: 16,
    gap: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#242a34',
    paddingBottom: 10,
  },
  modalTitle: {
    color: '#00e5ff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  closeModalBtn: {
    padding: 4,
  },
  calendarStyle: {
    borderRadius: 8,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  modalTodayBtn: {
    flex: 1,
    height: 38,
    backgroundColor: '#00e5ff',
    borderRadius: radius.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTodayBtnText: {
    color: '#00363d',
    fontWeight: '900',
    fontSize: 11,
  },
  modalAllDatesBtn: {
    flex: 1,
    height: 38,
    backgroundColor: '#1a2029',
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: '#242a34',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalAllDatesBtnText: {
    color: '#dde2f0',
    fontWeight: '800',
    fontSize: 11,
  },
});
