import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../../src/store/authStore';
import { tripService, TripResponse } from '../../../src/services/tripService';
import { adminService } from '../../../src/services/adminService';
import { colors, radius, spacing } from '../../../src/theme';
import { useResponsive } from '../../../src/hooks/useResponsive';
import {
  FilterBar,
  FilterState,
  FilterOptionItem,
} from '../../../src/components/FilterBar';
import { StatusPill } from '../../../src/components/StatusPill';
import {
  formatDateColombo,
  formatTimeColombo,
  formatDateTimeColombo,
  formatDurationText,
} from '../../../src/utils/tripDateUtils';

export type GroupByOption = 'NONE' | 'DRIVER' | 'VEHICLE' | 'DATE';

export default function SharedReportsScreen() {
  const { topInset, bottomInset, contentMaxWidth, containerPaddingHorizontal } = useResponsive();
  const user = useAuthStore((s) => s.user);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [trips, setTrips] = useState<TripResponse[]>([]);

  // Filter options loaded from backend
  const [driverOptions, setDriverOptions] = useState<FilterOptionItem[]>([]);
  const [vehicleOptions, setVehicleOptions] = useState<FilterOptionItem[]>([]);

  // Active filters
  const [filters, setFilters] = useState<FilterState>({
    date: 'ALL',
    status: 'ALL',
  });

  // Grouping
  const [groupBy, setGroupBy] = useState<GroupByOption>('NONE');

  // Load driver & vehicle options from backend
  const loadFilterOptions = useCallback(async () => {
    try {
      const [drivers, vehicles] = await Promise.all([
        adminService.getDrivers().catch(() => []),
        adminService.getVehicles().catch(() => []),
      ]);

      if (Array.isArray(drivers)) {
        const sortedDrivers = [...drivers].sort((a, b) =>
          (a.fullName || '').localeCompare(b.fullName || '')
        );
        setDriverOptions(
          sortedDrivers.map((d: any) => ({
            id: d.id || d.driverCode || d.username,
            label: d.fullName || d.name || 'Driver',
            subLabel: `${d.driverCode || d.employeeId || ''}${d.vehicleNumber ? ' · ' + d.vehicleNumber : ''}`,
          }))
        );
      }

      if (Array.isArray(vehicles)) {
        const sortedVehicles = [...vehicles].sort((a, b) =>
          (a.vehicleNumber || '').localeCompare(b.vehicleNumber || '')
        );
        setVehicleOptions(
          sortedVehicles.map((v: any) => ({
            id: v.vehicleNumber,
            label: v.vehicleNumber,
            subLabel: v.driverName ? v.driverName : 'Unassigned',
          }))
        );
      }
    } catch (e) {
      console.warn('[Reports] Failed to load filter options:', e);
    }
  }, []);

  // Compute date range for backend query
  const getDateRangeParams = useCallback(() => {
    const today = new Date();
    const toISO = (d: Date) => d.toISOString().split('T')[0];

    if (filters.date === 'TODAY') {
      const t = toISO(today);
      return { startDate: t, endDate: t };
    }
    if (filters.date === 'YESTERDAY') {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      const yStr = toISO(y);
      return { startDate: yStr, endDate: yStr };
    }
    if (filters.date === 'THIS_WEEK') {
      const w = new Date(today);
      w.setDate(w.getDate() - 7);
      return { startDate: toISO(w), endDate: toISO(today) };
    }
    if (filters.date === 'THIS_MONTH') {
      const m = new Date(today);
      m.setDate(m.getDate() - 30);
      return { startDate: toISO(m), endDate: toISO(today) };
    }
    if (filters.date === 'CUSTOM') {
      return {
        startDate: filters.customStartDate,
        endDate: filters.customEndDate,
      };
    }
    return { startDate: undefined, endDate: undefined };
  }, [filters.date, filters.customStartDate, filters.customEndDate]);

  // Fetch trips from backend query
  const fetchTrips = useCallback(async () => {
    try {
      const { startDate, endDate } = getDateRangeParams();
      const queryParams: any = {
        status: filters.status !== 'ALL' ? filters.status : undefined,
        driverId: filters.driverId || undefined,
        vehicleNumber: filters.vehicleNumber || undefined,
        terminal: filters.terminal && filters.terminal !== 'ALL' ? filters.terminal : undefined,
        startDate,
        endDate,
        search: filters.search || undefined,
      };

      const data = await tripService.getTrips(queryParams);
      setTrips(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('[Reports] Error fetching trips:', err);
      // Fallback empty if network error
      setTrips([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters, getDateRangeParams]);

  useEffect(() => {
    loadFilterOptions();
  }, [loadFilterOptions]);

  useEffect(() => {
    setLoading(true);
    fetchTrips();
  }, [fetchTrips]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTrips();
  }, [fetchTrips]);

  // Summary Strip Calculations
  const summary = useMemo(() => {
    const totalTrips = trips.length;
    let count20 = 0;
    let count40 = 0;
    let totalMinutes = 0;
    let tripsWithDuration = 0;

    for (const t of trips) {
      if (t.containers && Array.isArray(t.containers)) {
        for (const c of t.containers) {
          const sz = (c.size || '').toUpperCase();
          if (sz.includes('20')) {
            count20++;
          } else {
            count40++;
          }
        }
      }

      const dur = t.durationMinutes;
      if (dur != null && dur >= 0) {
        totalMinutes += dur;
        tripsWithDuration++;
      } else if (t.startTime && t.endTime) {
        const s = new Date(t.startTime).getTime();
        const e = new Date(t.endTime).getTime();
        if (e >= s) {
          const diff = Math.round((e - s) / (1000 * 60));
          totalMinutes += diff;
          tripsWithDuration++;
        }
      }
    }

    const avgMinutes = tripsWithDuration > 0 ? Math.round(totalMinutes / tripsWithDuration) : 0;

    return {
      totalTrips,
      count20,
      count40,
      totalDurationFormatted: formatDurationText(totalMinutes),
      avgDurationFormatted: tripsWithDuration > 0 ? formatDurationText(avgMinutes) : '-',
    };
  }, [trips]);

  // Grouped Trips
  const groupedTrips = useMemo(() => {
    if (groupBy === 'NONE') {
      return [{ key: 'ALL', title: 'All Filtered Trips', items: trips }];
    }

    const map = new Map<string, TripResponse[]>();

    for (const t of trips) {
      let groupKey = 'Other';
      if (groupBy === 'DRIVER') {
        groupKey = t.driverName || t.driverCode || 'Unassigned Driver';
      } else if (groupBy === 'VEHICLE') {
        groupKey = t.vehicleNumber || 'Unassigned Vehicle';
      } else if (groupBy === 'DATE') {
        groupKey = formatDateColombo(t.startTime || t.createdAt);
      }

      if (!map.has(groupKey)) {
        map.set(groupKey, []);
      }
      map.get(groupKey)!.push(t);
    }

    const groups: { key: string; title: string; items: TripResponse[] }[] = [];
    map.forEach((items, key) => {
      groups.push({ key, title: key, items });
    });

    return groups;
  }, [trips, groupBy]);

  // Export as Excel Spreadsheet (.xls XML format)
  const handleExportExcel = () => {
    if (trips.length === 0) {
      Alert.alert('Empty Report', 'There are no rows matching your selected filters to export.');
      return;
    }

    const xmlRows = trips
      .map((t, idx) => {
        const containersStr = (t.containers || []).map((c) => c.containerNumber).join(', ') || '-';
        const sizesStr = (t.containers || []).map((c) => c.size || '40FT').join(', ') || '-';
        const dateStr = formatDateColombo(t.startTime || t.createdAt);
        const startStr = formatTimeColombo(t.startTime || t.createdAt);
        const endStr = formatTimeColombo(t.endTime);
        const durationStr = formatDurationText(t.durationMinutes, t.startTime, t.endTime);

        return `
      <Row>
        <Cell><Data ss:Type="Number">${idx + 1}</Data></Cell>
        <Cell><Data ss:Type="String">${t.tripNumber || '-'}</Data></Cell>
        <Cell><Data ss:Type="String">${dateStr}</Data></Cell>
        <Cell><Data ss:Type="String">${t.driverName || t.driverCode || '-'}</Data></Cell>
        <Cell><Data ss:Type="String">${t.vehicleNumber || '-'}</Data></Cell>
        <Cell><Data ss:Type="String">${t.chassisNumber || '-'}</Data></Cell>
        <Cell><Data ss:Type="String">${containersStr}</Data></Cell>
        <Cell><Data ss:Type="String">${sizesStr}</Data></Cell>
        <Cell><Data ss:Type="String">${t.sourceTerminal || '-'}</Data></Cell>
        <Cell><Data ss:Type="String">${t.destTerminal || '-'}</Data></Cell>
        <Cell><Data ss:Type="String">${startStr}</Data></Cell>
        <Cell><Data ss:Type="String">${endStr}</Data></Cell>
        <Cell><Data ss:Type="String">${durationStr}</Data></Cell>
        <Cell><Data ss:Type="String">${t.status}</Data></Cell>
      </Row>`;
      })
      .join('');

    const excelXML = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="Header">
   <Font ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#0F766E" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="ITT Trips Report">
  <Table>
   <Row ss:StyleID="Header">
    <Cell><Data ss:Type="String">#</Data></Cell>
    <Cell><Data ss:Type="String">Trip No</Data></Cell>
    <Cell><Data ss:Type="String">Date</Data></Cell>
    <Cell><Data ss:Type="String">Driver</Data></Cell>
    <Cell><Data ss:Type="String">Vehicle No</Data></Cell>
    <Cell><Data ss:Type="String">Chassis/CHE</Data></Cell>
    <Cell><Data ss:Type="String">Container No</Data></Cell>
    <Cell><Data ss:Type="String">Size</Data></Cell>
    <Cell><Data ss:Type="String">Origin</Data></Cell>
    <Cell><Data ss:Type="String">Destination</Data></Cell>
    <Cell><Data ss:Type="String">Start Time</Data></Cell>
    <Cell><Data ss:Type="String">End Time</Data></Cell>
    <Cell><Data ss:Type="String">Duration</Data></Cell>
    <Cell><Data ss:Type="String">Status</Data></Cell>
   </Row>
   ${xmlRows}
  </Table>
 </Worksheet>
</Workbook>`;

    const fileName = `SMART_ITT_Report_${new Date().toISOString().slice(0, 10)}.xls`;

    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof document !== 'undefined') {
      const blob = new Blob([excelXML], { type: 'application/vnd.ms-excel;charset=utf-8' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      Alert.alert('Excel Export Complete', `Report downloaded as "${fileName}". Contains ${trips.length} records.`);
    } else {
      Alert.alert('Excel Export Generated', `Generated "${fileName}" with ${trips.length} rows.`);
    }
  };

  // Export as CSV File
  const handleExportCsv = () => {
    if (trips.length === 0) {
      Alert.alert('Empty Report', 'There are no rows matching your selected filters to export.');
      return;
    }

    const headers = [
      '#',
      'Trip No',
      'Date',
      'Driver',
      'Vehicle No',
      'Chassis/CHE',
      'Container No',
      'Size',
      'Origin',
      'Destination',
      'Start Time',
      'End Time',
      'Duration',
      'Status',
    ];

    const escapeCsv = (val: string) => `"${(val || '').replace(/"/g, '""')}"`;

    const csvRows = trips.map((t, idx) => {
      const containersStr = (t.containers || []).map((c) => c.containerNumber).join('; ') || '-';
      const sizesStr = (t.containers || []).map((c) => c.size || '40FT').join('; ') || '-';
      const dateStr = formatDateColombo(t.startTime || t.createdAt);
      const startStr = formatTimeColombo(t.startTime || t.createdAt);
      const endStr = formatTimeColombo(t.endTime);
      const durationStr = formatDurationText(t.durationMinutes, t.startTime, t.endTime);

      return [
        idx + 1,
        escapeCsv(t.tripNumber || '-'),
        escapeCsv(dateStr),
        escapeCsv(t.driverName || t.driverCode || '-'),
        escapeCsv(t.vehicleNumber || '-'),
        escapeCsv(t.chassisNumber || '-'),
        escapeCsv(containersStr),
        escapeCsv(sizesStr),
        escapeCsv(t.sourceTerminal || '-'),
        escapeCsv(t.destTerminal || '-'),
        escapeCsv(startStr),
        escapeCsv(endStr),
        escapeCsv(durationStr),
        escapeCsv(t.status),
      ].join(',');
    });

    const csvContent = [headers.join(','), ...csvRows].join('\r\n');
    const fileName = `SMART_ITT_Report_${new Date().toISOString().slice(0, 10)}.csv`;

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
      Alert.alert('CSV Export Complete', `Report downloaded as "${fileName}". Contains ${trips.length} records.`);
    } else {
      Alert.alert('CSV Export Generated', `Generated "${fileName}" with ${trips.length} rows.`);
    }
  };

  // Export as Printable PDF / HTML Report
  const handleExportPdf = () => {
    if (trips.length === 0) {
      Alert.alert('Empty Report', 'There are no rows matching your selected filters to export.');
      return;
    }

    const tableRows = trips
      .map((t, i) => {
        const containersStr = (t.containers || []).map((c) => c.containerNumber).join(', ') || '-';
        const sizesStr = (t.containers || []).map((c) => c.size || '40FT').join(', ') || '-';
        const dateStr = formatDateColombo(t.startTime || t.createdAt);
        const startStr = formatTimeColombo(t.startTime || t.createdAt);
        const endStr = formatTimeColombo(t.endTime);
        const durationStr = formatDurationText(t.durationMinutes, t.startTime, t.endTime);

        return `
      <tr style="background-color: ${i % 2 === 0 ? '#f7f9fa' : '#ffffff'};">
        <td style="padding: 6px 8px; font-weight: bold; text-align: center;">${i + 1}</td>
        <td style="padding: 6px 8px; font-weight: 600; color: #0F766E;">${t.tripNumber || '-'}</td>
        <td style="padding: 6px 8px;">${dateStr}</td>
        <td style="padding: 6px 8px;">${t.driverName || t.driverCode || '-'}</td>
        <td style="padding: 6px 8px; font-weight: 600;">${t.vehicleNumber || '-'}</td>
        <td style="padding: 6px 8px; font-family: monospace;">${containersStr}</td>
        <td style="padding: 6px 8px; text-align: center;">${sizesStr}</td>
        <td style="padding: 6px 8px;">${t.sourceTerminal || '-'} ➔ ${t.destTerminal || '-'}</td>
        <td style="padding: 6px 8px;">${startStr}</td>
        <td style="padding: 6px 8px;">${endStr}</td>
        <td style="padding: 6px 8px; font-weight: 600;">${durationStr}</td>
        <td style="padding: 6px 8px; text-align: center;">${t.status}</td>
      </tr>`;
      })
      .join('');

    const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>SMART ITT — Operations & Dispatch Report</title>
  <style>
    @media print {
      @page { size: landscape; margin: 10mm; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 15px; color: #1F2D33; font-size: 11px; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0F766E; padding-bottom: 8px; margin-bottom: 12px; }
    .title { font-size: 18px; font-weight: 700; color: #0F766E; }
    .meta { font-size: 10px; color: #6B7C85; }
    .kpi-row { display: flex; gap: 12px; margin-bottom: 12px; }
    .kpi-card { border: 1px solid #E5EAEC; background: #F7F9FA; padding: 6px 12px; border-radius: 6px; }
    .kpi-val { font-size: 14px; font-weight: bold; color: #0F766E; }
    .kpi-lbl { font-size: 9px; color: #6B7C85; text-transform: uppercase; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th { background: #0F766E; color: #ffffff; text-align: left; padding: 6px 8px; font-size: 10px; font-weight: 600; }
    td { border-bottom: 1px solid #E5EAEC; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="title">SMART ITT — Inter-Terminal Transportation Dispatch Report</div>
      <div class="meta">Generated: ${new Date().toLocaleString()} · Timezone: Asia/Colombo</div>
    </div>
  </div>
  <div class="kpi-row">
    <div class="kpi-card"><div class="kpi-val">${summary.totalTrips}</div><div class="kpi-lbl">Total Trips</div></div>
    <div class="kpi-card"><div class="kpi-val">20FT: ${summary.count20} | 40FT: ${summary.count40}</div><div class="kpi-lbl">Containers</div></div>
    <div class="kpi-card"><div class="kpi-val">${summary.totalDurationFormatted}</div><div class="kpi-lbl">Total Duration</div></div>
    <div class="kpi-card"><div class="kpi-val">${summary.avgDurationFormatted}</div><div class="kpi-lbl">Average Duration</div></div>
  </div>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Trip No</th>
        <th>Date</th>
        <th>Driver</th>
        <th>Vehicle No</th>
        <th>Container(s)</th>
        <th>Size</th>
        <th>Route</th>
        <th>Start</th>
        <th>End</th>
        <th>Duration</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
  </table>
  <script>
    window.onload = function() { window.print(); };
  </script>
</body>
</html>`;

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const printWin = window.open('', '_blank');
      if (printWin) {
        printWin.document.write(htmlContent);
        printWin.document.close();
      }
    } else {
      Alert.alert(
        'Printable PDF Prepared',
        `PDF layout prepared with ${trips.length} rows. Please use browser print on Web.`
      );
    }
  };

  return (
    <View style={[styles.screen, { paddingTop: topInset, paddingBottom: bottomInset }]}>
      {/* 1. Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Operations & Reports</Text>
          <Text style={styles.headerSub}>
            Live Port ITT dispatch records · Timezone Asia/Colombo
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.exportBtn}
            onPress={handleExportCsv}
            activeOpacity={0.88}
          >
            <Ionicons name="document-text-outline" size={14} color={colors.primary} />
            <Text style={styles.exportBtnText}>CSV</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.exportBtn}
            onPress={handleExportExcel}
            activeOpacity={0.88}
          >
            <Ionicons name="grid-outline" size={14} color={colors.primary} />
            <Text style={styles.exportBtnText}>Excel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.exportBtn, styles.exportBtnPdf]}
            onPress={handleExportPdf}
            activeOpacity={0.88}
          >
            <Ionicons name="print-outline" size={14} color="#FFFFFF" />
            <Text style={styles.exportBtnPdfText}>PDF</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. Shared Combinable FilterBar */}
      <FilterBar
        filters={filters}
        onChange={setFilters}
        driverOptions={driverOptions}
        vehicleOptions={vehicleOptions}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { maxWidth: contentMaxWidth, paddingHorizontal: containerPaddingHorizontal },
        ]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* 3. Summary Strip */}
        <View style={styles.summaryStrip}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Trips</Text>
            <Text style={styles.summaryValue}>{summary.totalTrips}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Containers</Text>
            <Text style={styles.summaryValue}>
              20FT: <Text style={styles.summaryHighlight}>{summary.count20}</Text> · 40FT:{' '}
              <Text style={styles.summaryHighlight}>{summary.count40}</Text>
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Duration</Text>
            <Text style={styles.summaryValue}>{summary.totalDurationFormatted}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Avg Duration</Text>
            <Text style={styles.summaryValue}>{summary.avgDurationFormatted}</Text>
          </View>
        </View>

        {/* 4. Group By Toggle */}
        <View style={styles.groupByRow}>
          <Text style={styles.groupByLabel}>Group By:</Text>
          {(['NONE', 'DRIVER', 'VEHICLE', 'DATE'] as GroupByOption[]).map((opt) => {
            const active = groupBy === opt;
            return (
              <TouchableOpacity
                key={opt}
                style={[styles.groupByBtn, active && styles.groupByBtnActive]}
                onPress={() => setGroupBy(opt)}
                activeOpacity={0.7}
              >
                <Text style={[styles.groupByBtnText, active && styles.groupByBtnTextActive]}>
                  {opt === 'NONE' ? 'None' : opt.charAt(0) + opt.slice(1).toLowerCase()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 5. Results List */}
        {loading && !refreshing ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.loadingText}>Fetching dispatch reports from server...</Text>
          </View>
        ) : trips.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="document-text-outline" size={36} color={colors.textMuted} />
            <Text style={styles.emptyText}>
              No operations or dispatch trips match your selected filters.
            </Text>
          </View>
        ) : (
          <View style={styles.groupsContainer}>
            {groupedTrips.map((group) => {
              const groupTripsCount = group.items.length;
              let groupDuration = 0;
              for (const i of group.items) {
                if (i.durationMinutes) groupDuration += i.durationMinutes;
              }

              return (
                <View key={group.key} style={styles.groupCard}>
                  {groupBy !== 'NONE' && (
                    <View style={styles.groupHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.groupTitle}>{group.title}</Text>
                        <Text style={styles.groupMeta}>
                          {groupTripsCount} trip{groupTripsCount !== 1 ? 's' : ''}
                          {groupDuration > 0
                            ? ` · Total Duration: ${formatDurationText(groupDuration)}`
                            : ''}
                        </Text>
                      </View>
                      <View style={styles.groupCountBadge}>
                        <Text style={styles.groupCountText}>{groupTripsCount}</Text>
                      </View>
                    </View>
                  )}

                  {group.items.map((trip) => {
                    const dateStr = formatDateColombo(trip.startTime || trip.createdAt);
                    const startStr = formatTimeColombo(trip.startTime || trip.createdAt);
                    const endStr = formatTimeColombo(trip.endTime);
                    const durationStr = formatDurationText(
                      trip.durationMinutes,
                      trip.startTime,
                      trip.endTime
                    );

                    return (
                      <View key={trip.id} style={styles.tripRow}>
                        {/* Top: Trip No + Date + Status */}
                        <View style={styles.rowTop}>
                          <View style={styles.tripNoWrap}>
                            <Ionicons name="git-commit-outline" size={14} color={colors.primary} />
                            <Text style={styles.tripNo}>{trip.tripNumber || 'ITT-TRIP'}</Text>
                            <Text style={styles.tripDate}>{dateStr}</Text>
                          </View>
                          <StatusPill status={trip.status} size="sm" />
                        </View>

                        {/* Mid Details: Driver & Vehicle */}
                        <View style={styles.rowMid}>
                          <View style={styles.midCol}>
                            <Text style={styles.fieldLabel}>Driver</Text>
                            <Text style={styles.fieldVal} numberOfLines={1}>
                              {trip.driverName || trip.driverCode || '-'}
                            </Text>
                          </View>

                          <View style={styles.midCol}>
                            <Text style={styles.fieldLabel}>Vehicle / Chassis</Text>
                            <Text style={styles.fieldVal} numberOfLines={1}>
                              {trip.vehicleNumber || '-'}
                              {trip.chassisNumber ? ` (${trip.chassisNumber})` : ''}
                            </Text>
                          </View>

                          <View style={styles.midCol}>
                            <Text style={styles.fieldLabel}>Route</Text>
                            <Text style={styles.fieldVal} numberOfLines={1}>
                              {trip.sourceTerminal || '-'} ➔ {trip.destTerminal || '-'}
                            </Text>
                          </View>
                        </View>

                        {/* Containers */}
                        {trip.containers && trip.containers.length > 0 && (
                          <View style={styles.containersWrap}>
                            {trip.containers.map((c, cIdx) => (
                              <View key={c.id || cIdx} style={styles.containerBadge}>
                                <Ionicons name="cube-outline" size={12} color={colors.primary} />
                                <Text style={styles.containerNumber}>{c.containerNumber}</Text>
                                <Text style={styles.containerSize}>{c.size || '40FT'}</Text>
                                {c.damageStatus === 'DAMAGED' && (
                                  <Text style={styles.damageTag}>DAMAGED</Text>
                                )}
                              </View>
                            ))}
                          </View>
                        )}

                        {/* Bottom Timing: Start, End, Duration */}
                        <View style={styles.timingRow}>
                          <View style={styles.timingItem}>
                            <Text style={styles.timingLabel}>Start</Text>
                            <Text style={styles.timingVal}>{startStr}</Text>
                          </View>
                          <View style={styles.timingItem}>
                            <Text style={styles.timingLabel}>End</Text>
                            <Text style={styles.timingVal}>{endStr}</Text>
                          </View>
                          <View style={styles.timingItem}>
                            <Text style={styles.timingLabel}>Duration</Text>
                            <Text
                              style={[
                                styles.timingVal,
                                durationStr === 'In progress' && styles.inProgressText,
                              ]}
                            >
                              {durationStr}
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: '#FFFFFF',
  },
  exportBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  exportBtnPdf: {
    backgroundColor: colors.primary,
  },
  exportBtnPdfText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    alignSelf: 'center',
    width: '100%',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  summaryStrip: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.border,
  },
  summaryLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    color: colors.textMuted,
    fontWeight: '600',
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 2,
  },
  summaryHighlight: {
    color: colors.primary,
    fontWeight: '700',
  },
  groupByRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
  },
  groupByLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  groupByBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#FFFFFF',
  },
  groupByBtnActive: {
    backgroundColor: colors.surfaceTeal,
    borderColor: colors.primary,
  },
  groupByBtnText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  groupByBtnTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  loadingBox: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  emptyBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  groupsContainer: {
    gap: spacing.md,
  },
  groupCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  groupTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  groupMeta: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  groupCountBadge: {
    backgroundColor: colors.surfaceTeal,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  groupCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  tripRow: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 8,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tripNoWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tripNo: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  tripDate: {
    fontSize: 11,
    color: colors.textMuted,
    marginLeft: 4,
  },
  rowMid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  midCol: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 10,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  fieldVal: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 1,
  },
  containersWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingTop: 4,
  },
  containerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceTeal,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  containerNumber: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: colors.primary,
  },
  containerSize: {
    fontSize: 10,
    color: colors.textSecondary,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 4,
    borderRadius: 3,
  },
  damageTag: {
    fontSize: 9,
    color: colors.danger,
    fontWeight: '700',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 4,
    borderRadius: 3,
  },
  timingRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    paddingVertical: 6,
    paddingHorizontal: 10,
    justifyContent: 'space-between',
    marginTop: 2,
  },
  timingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timingLabel: {
    fontSize: 10,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  timingVal: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  inProgressText: {
    color: colors.warning,
  },
});
