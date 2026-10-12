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
import { SCK_FLEET, resolveCheNumber, resolveOperator, findFleetVehicle } from '../../../src/config/fleet';
import { useResponsive } from '../../../src/hooks/useResponsive';

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
  const { topInset, bottomInset, contentMaxWidth, containerPaddingHorizontal } = useResponsive();
  const user = useAuthStore((s) => s.user);

  const [refreshing, setRefreshing] = useState(false);
  const [backendTrips, setBackendTrips] = useState<any[]>([]);

  // ─── Filter States ───
  // 1. Date Filter Mode: 'SINGLE' | 'WEEK' | 'MONTH' | 'RANGE'
  const [dateFilterMode, setDateFilterMode] = useState<'SINGLE' | 'WEEK' | 'MONTH' | 'RANGE'>('SINGLE');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dateRangeStart, setDateRangeStart] = useState<string | null>(null);
  const [dateRangeEnd, setDateRangeEnd] = useState<string | null>(null);
  const [calendarModalVisible, setCalendarModalVisible] = useState(false);

  // 2. Terminal: 'ALL' or specific terminal code ('JCT', 'CICT', etc.)
  const [selectedTerminal, setSelectedTerminal] = useState<string>('ALL');

  // Helper date formatting functions
  const formatDateISO = (d: Date) => d.toISOString().split('T')[0];
  const formatFriendlyDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr + 'T00:00:00');
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return isoStr;
    }
  };

  // Preset Date Range Handlers
  const handleSelectSingleDay = (dateStr: string) => {
    setSelectedDate(dateStr);
    setDateRangeStart(null);
    setDateRangeEnd(null);
    setCalendarModalVisible(false);
  };

  const handleSelectWeekPreset = (daysBack: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - daysBack);
    const startISO = formatDateISO(start);
    const endISO = formatDateISO(end);
    setDateRangeStart(startISO);
    setDateRangeEnd(endISO);
    setSelectedDate(null);
  };

  const handleSelectMonthPreset = (monthsBack: number) => {
    const end = new Date();
    const start = new Date();
    start.setMonth(end.getMonth() - monthsBack);
    const startISO = formatDateISO(start);
    const endISO = formatDateISO(end);
    setDateRangeStart(startISO);
    setDateRangeEnd(endISO);
    setSelectedDate(null);
  };

  // Specific Calendar Month / Window Selector (e.g. Sept 20 to Oct 20)
  const handleSelectCustomRange = (startISO: string, endISO: string) => {
    setDateRangeStart(startISO);
    setDateRangeEnd(endISO);
    setSelectedDate(null);
    setCalendarModalVisible(false);
  };

  const handleClearAllDates = () => {
    setSelectedDate(null);
    setDateRangeStart(null);
    setDateRangeEnd(null);
  };

  // Compute Active Date Filter Display Label
  const activeDateFilterLabel = useMemo(() => {
    if (dateRangeStart && dateRangeEnd) {
      return `${formatFriendlyDate(dateRangeStart)}  ➔  ${formatFriendlyDate(dateRangeEnd)}`;
    }
    if (dateRangeStart && !dateRangeEnd) {
      return `From: ${formatFriendlyDate(dateRangeStart)} (Pick End Date)`;
    }
    if (selectedDate) {
      return `Date: ${formatFriendlyDate(selectedDate)}`;
    }
    return null;
  }, [dateRangeStart, dateRangeEnd, selectedDate]);

  // Marked dates computation for calendar (highlighting range or single day)
  const calendarMarkedDates = useMemo(() => {
    const marks: Record<string, any> = {};

    if (dateFilterMode === 'SINGLE') {
      if (selectedDate) {
        marks[selectedDate] = {
          selected: true,
          selectedColor: '#00e5ff',
          selectedTextColor: '#00363d',
        };
      }
      return marks;
    }

    // Range / Week / Month mode
    if (dateRangeStart && dateRangeEnd) {
      const cur = new Date(dateRangeStart + 'T00:00:00');
      const end = new Date(dateRangeEnd + 'T00:00:00');
      
      while (cur <= end) {
        const iso = formatDateISO(cur);
        const isStart = iso === dateRangeStart;
        const isEnd = iso === dateRangeEnd;

        marks[iso] = {
          selected: true,
          startingDay: isStart,
          endingDay: isEnd,
          color: isStart || isEnd ? '#00e5ff' : 'rgba(0, 229, 255, 0.22)',
          textColor: isStart || isEnd ? '#00363d' : '#00e5ff',
        };
        cur.setDate(cur.getDate() + 1);
      }
    } else if (dateRangeStart) {
      marks[dateRangeStart] = {
        selected: true,
        startingDay: true,
        endingDay: true,
        color: '#feb300',
        textColor: '#00363d',
      };
    }

    return marks;
  }, [dateFilterMode, selectedDate, dateRangeStart, dateRangeEnd]);

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
          vehicleNumber: bt.vehicleNumber || 'LY 5234',
          chassisNumber: resolveCheNumber(bt.vehicleNumber, bt.chassisNumber),
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
      // 1. Date Filter (supports Single Date or Date Range Start-End)
      const rawDate = trip.createdAt || trip.startTime || trip.operationDate;
      const tripDatePart = rawDate ? new Date(rawDate).toISOString().split('T')[0] : null;

      if (dateRangeStart && dateRangeEnd) {
        if (!tripDatePart) return false;
        if (tripDatePart < dateRangeStart || tripDatePart > dateRangeEnd) {
          return false;
        }
      } else if (dateRangeStart && !dateRangeEnd) {
        if (!tripDatePart || tripDatePart !== dateRangeStart) return false;
      } else if (selectedDate) {
        if (!tripDatePart || tripDatePart !== selectedDate) return false;
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
  }, [allRawTrips, selectedDate, dateRangeStart, dateRangeEnd, selectedTerminal, selectedDriver]);

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
      const vMatch = findFleetVehicle(t.vehicleNumber);
      const vehicleNo = t.vehicleNumber || vMatch?.vehicleNumber || 'LY 5234';
      const cheNo = resolveCheNumber(vehicleNo, t.chassisNumber || t.chaiNumber);
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

  // ─── Export to Excel (.XLS / CSV) function ───
  const handleExportExcel = () => {
    if (excelDataRows.length === 0) {
      Alert.alert('Empty Report', 'There are no rows matching your selected filters to export.');
      return;
    }

    // Generate XML-based Microsoft Excel Spreadsheet (Native .xls format with styled formatting)
    const xmlRows = excelDataRows.map((r, idx) => `
      <Row>
        <Cell><Data ss:Type="Number">${idx + 1}</Data></Cell>
        <Cell><Data ss:Type="String">${r.date}</Data></Cell>
        <Cell><Data ss:Type="String">${r.time}</Data></Cell>
        <Cell><Data ss:Type="String">${r.tripNumber}</Data></Cell>
        <Cell><Data ss:Type="String">${r.driverIdentifier}</Data></Cell>
        <Cell><Data ss:Type="String">${r.driverName}</Data></Cell>
        <Cell><Data ss:Type="String">${r.vehicleNo}</Data></Cell>
        <Cell><Data ss:Type="String">${r.cheNo}</Data></Cell>
        <Cell><Data ss:Type="String">${r.container}</Data></Cell>
        <Cell><Data ss:Type="String">${r.sizeOfContainer}</Data></Cell>
        <Cell><Data ss:Type="String">${r.damageOrNot}</Data></Cell>
        <Cell><Data ss:Type="String">${r.loadTerminal}</Data></Cell>
        <Cell><Data ss:Type="String">${r.dischargeTerminal}</Data></Cell>
        <Cell><Data ss:Type="String">${r.status}</Data></Cell>
      </Row>`).join('');

    const excelXML = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="Header">
   <Font ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#0A3641" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="ITT Dispatch Report">
  <Table>
   <Row ss:StyleID="Header">
    <Cell><Data ss:Type="String">#</Data></Cell>
    <Cell><Data ss:Type="String">Date</Data></Cell>
    <Cell><Data ss:Type="String">Time</Data></Cell>
    <Cell><Data ss:Type="String">Trip Number</Data></Cell>
    <Cell><Data ss:Type="String">Driver ID</Data></Cell>
    <Cell><Data ss:Type="String">Driver Name</Data></Cell>
    <Cell><Data ss:Type="String">Vehicle No</Data></Cell>
    <Cell><Data ss:Type="String">CHE / SCK No</Data></Cell>
    <Cell><Data ss:Type="String">Container Number</Data></Cell>
    <Cell><Data ss:Type="String">Size</Data></Cell>
    <Cell><Data ss:Type="String">Damage Status</Data></Cell>
    <Cell><Data ss:Type="String">Load Terminal</Data></Cell>
    <Cell><Data ss:Type="String">Discharge Terminal</Data></Cell>
    <Cell><Data ss:Type="String">Status</Data></Cell>
   </Row>
   ${xmlRows}
  </Table>
 </Worksheet>
</Workbook>`;

    const fileName = `SMART_ITT_Dispatch_Report_${selectedDate || 'ALL_DATES'}_${selectedTerminal}_${selectedDriver}.xls`;

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
      Alert.alert('Excel Export Complete', `Report downloaded as "${fileName}". Contains ${excelDataRows.length} container records.`);
    } else {
      Alert.alert(
        'Excel Export Generated',
        `Successfully generated "${fileName}" with ${excelDataRows.length} rows.`
      );
    }
  };

  // ─── Export as Printable PDF Report function ───
  const handleExportPdf = () => {
    if (excelDataRows.length === 0) {
      Alert.alert('Empty Report', 'There are no rows matching your selected filters to export.');
      return;
    }

    const reportTitle = `SMART ITT — Official Dispatch & Terminal Operations Report`;
    const genDate = new Date().toLocaleString();
    const filterSummary = `Date: ${selectedDate || 'All Recorded Dates'} | Terminal: ${selectedTerminal} | Driver: ${selectedDriver}`;

    const tableRows = excelDataRows.map((r, i) => `
      <tr style="background-color: ${i % 2 === 0 ? '#f8fafd' : '#ffffff'};">
        <td style="text-align: center; font-weight: bold; padding: 6px 8px;">${i + 1}</td>
        <td style="padding: 6px 8px;">${r.date}<br/><small style="color: #666;">${r.time}</small></td>
        <td style="padding: 6px 8px; font-weight: 600; color: #005662;">${r.tripNumber}</td>
        <td style="padding: 6px 8px;">${r.driverName}<br/><small style="color: #666;">ID: ${r.driverIdentifier}</small></td>
        <td style="padding: 6px 8px;"><b>${r.vehicleNo}</b></td>
        <td style="padding: 6px 8px; font-weight: bold; color: #00838f;">${r.cheNo}</td>
        <td style="padding: 6px 8px; font-family: monospace; font-weight: bold;">${r.container}</td>
        <td style="padding: 6px 8px; text-align: center;"><span style="background: #e0f2f1; padding: 2px 6px; border-radius: 4px; font-size: 11px;">${r.sizeOfContainer}</span></td>
        <td style="padding: 6px 8px; text-align: center; color: ${r.damageOrNot === 'DAMAGED' ? '#d32f2f' : '#2e7d32'}; font-weight: bold;">${r.damageOrNot}</td>
        <td style="padding: 6px 8px;">${r.loadTerminal} ➔ ${r.dischargeTerminal}</td>
        <td style="padding: 6px 8px; text-align: center;"><span style="background: #e8f5e9; color: #1b5e20; padding: 2px 8px; border-radius: 4px; font-weight: bold; font-size: 11px;">${r.status}</span></td>
      </tr>
    `).join('');

    const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>${reportTitle}</title>
  <style>
    @media print {
      @page { size: landscape; margin: 12mm; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      margin: 20px;
      color: #1a202c;
      font-size: 12px;
    }
    .header-bar {
      border-bottom: 3px solid #00838f;
      padding-bottom: 12px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .title {
      font-size: 20px;
      font-weight: 800;
      color: #004d40;
      letter-spacing: -0.5px;
      margin: 0;
    }
    .subtitle {
      font-size: 12px;
      color: #546e7a;
      margin-top: 4px;
    }
    .meta-box {
      background: #eceff1;
      border-radius: 6px;
      padding: 10px 14px;
      margin-bottom: 16px;
      font-size: 11px;
      display: flex;
      justify-content: space-between;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
    }
    th {
      background-color: #004d40;
      color: #ffffff;
      padding: 8px;
      text-align: left;
      font-weight: bold;
      border: 1px solid #00332c;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    td {
      border: 1px solid #cfd8dc;
    }
    .footer {
      margin-top: 24px;
      padding-top: 10px;
      border-top: 1px solid #cfd8dc;
      font-size: 10px;
      color: #78909c;
      display: flex;
      justify-content: space-between;
    }
    .print-btn {
      background: #00838f;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      font-weight: bold;
      cursor: pointer;
      margin-bottom: 15px;
    }
    @media print {
      .print-btn { display: none; }
    }
  </style>
</head>
<body>
  <button class="print-btn" onclick="window.print()">🖨️ PRINT / SAVE AS PDF</button>
  <div class="header-bar">
    <div>
      <h1 class="title">🚛 SMART ITT — INTER-TERMINAL LOGISTICS REPORT</h1>
      <div class="subtitle">Port Container Handling Equipment & Vehicle Telematics Dispatch Summary</div>
    </div>
    <div style="text-align: right; font-size: 11px; color: #546e7a;">
      <b>PORT TELEMATICS AUTHORITY</b><br/>
      Generated by: <b>${supervisorName}</b>
    </div>
  </div>

  <div class="meta-box">
    <div><b>Filters Applied:</b> ${filterSummary}</div>
    <div><b>Total Container Records:</b> ${excelDataRows.length} | <b>Damaged:</b> ${damagedCount} | <b>Generated:</b> ${genDate}</div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 30px; text-align: center;">#</th>
        <th>Date & Time</th>
        <th>Trip #</th>
        <th>Driver Info</th>
        <th>Vehicle No</th>
        <th>CHE / SCK No</th>
        <th>Container No</th>
        <th style="text-align: center;">Size</th>
        <th style="text-align: center;">Condition</th>
        <th>Terminal Route</th>
        <th style="text-align: center;">Status</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
  </table>

  <div class="footer">
    <div>SMART ITT SYSTEM — Confidential Port Logistics Operations Document</div>
    <div>Page 1 of 1 · Verified Telematics Dispatch Data</div>
  </div>

  <script>
    // Automatically trigger print dialog when opened
    window.addEventListener('load', () => {
      setTimeout(() => { window.print(); }, 400);
    });
  </script>
</body>
</html>`;

    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof document !== 'undefined') {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(htmlContent);
        printWindow.document.close();
      } else {
        // Fallback to downloadable HTML that opens directly in browser print
        const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `SMART_ITT_Report_${selectedDate || 'ALL'}.html`;
        link.click();
      }
    } else {
      Alert.alert(
        'PDF Export Generated',
        `Report with ${excelDataRows.length} container records compiled.\nUse the web portal or browser print preview to save as PDF.`
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
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: Math.max(topInset, 16),
            paddingBottom: Math.max(bottomInset + 30, 48),
            paddingHorizontal: containerPaddingHorizontal,
            maxWidth: contentMaxWidth,
            width: '100%',
            alignSelf: 'center',
          },
        ]}
        showsVerticalScrollIndicator={false}
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
            {(selectedDate || dateRangeStart || selectedTerminal !== 'ALL' || selectedDriver !== 'ALL') && (
              <TouchableOpacity
                style={styles.resetBtn}
                onPress={() => {
                  handleClearAllDates();
                  setSelectedTerminal('ALL');
                  setSelectedDriver('ALL');
                }}
              >
                <Ionicons name="reload" size={12} color="#feb300" />
                <Text style={styles.resetBtnText}>RESET FILTERS</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ── A. CALENDAR DATE, WEEK & MONTH SELECTOR ── */}
          <View style={styles.filterBlock}>
            <View style={styles.filterLabelRow}>
              <Ionicons name="calendar" size={14} color="#00e5ff" />
              <Text style={styles.filterLabel}>SELECT DATE / WEEK / MONTH (CALENDAR)</Text>
              {activeDateFilterLabel && (
                <View style={styles.activeFilterPill}>
                  <Text style={styles.activeFilterPillText}>{activeDateFilterLabel}</Text>
                </View>
              )}
            </View>

            {/* Mode selection tabs: SINGLE DAY | WEEKLY | MONTHLY | CUSTOM RANGE */}
            <View style={styles.dateModeTabRow}>
              <TouchableOpacity
                style={[styles.dateModeTab, dateFilterMode === 'SINGLE' && styles.dateModeTabActive]}
                onPress={() => setDateFilterMode('SINGLE')}
                activeOpacity={0.8}
              >
                <Ionicons name="today" size={12} color={dateFilterMode === 'SINGLE' ? '#00363d' : '#849396'} />
                <Text style={[styles.dateModeTabText, dateFilterMode === 'SINGLE' && styles.dateModeTabTextActive]}>
                  DAY
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.dateModeTab, dateFilterMode === 'WEEK' && styles.dateModeTabActive]}
                onPress={() => setDateFilterMode('WEEK')}
                activeOpacity={0.8}
              >
                <Ionicons name="time" size={12} color={dateFilterMode === 'WEEK' ? '#00363d' : '#849396'} />
                <Text style={[styles.dateModeTabText, dateFilterMode === 'WEEK' && styles.dateModeTabTextActive]}>
                  WEEK
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.dateModeTab, dateFilterMode === 'MONTH' && styles.dateModeTabActive]}
                onPress={() => setDateFilterMode('MONTH')}
                activeOpacity={0.8}
              >
                <Ionicons name="calendar-number" size={12} color={dateFilterMode === 'MONTH' ? '#00363d' : '#849396'} />
                <Text style={[styles.dateModeTabText, dateFilterMode === 'MONTH' && styles.dateModeTabTextActive]}>
                  MONTH
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.dateModeTab, dateFilterMode === 'RANGE' && styles.dateModeTabActive]}
                onPress={() => setDateFilterMode('RANGE')}
                activeOpacity={0.8}
              >
                <Ionicons name="git-commit" size={12} color={dateFilterMode === 'RANGE' ? '#00363d' : '#849396'} />
                <Text style={[styles.dateModeTabText, dateFilterMode === 'RANGE' && styles.dateModeTabTextActive]}>
                  CUSTOM RANGE
                </Text>
              </TouchableOpacity>
            </View>

            {/* Quick Presets Carousel depending on Mode */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetsScroll}>
              <TouchableOpacity
                style={[
                  styles.presetChip,
                  selectedDate === formatDateISO(new Date()) && !dateRangeStart && styles.presetChipActive,
                ]}
                onPress={() => handleSelectSingleDay(formatDateISO(new Date()))}
                activeOpacity={0.8}
              >
                <Text style={[
                  styles.presetChipText,
                  selectedDate === formatDateISO(new Date()) && !dateRangeStart && styles.presetChipTextActive,
                ]}>
                  TODAY
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.presetChip,
                  dateRangeStart &&
                  dateRangeEnd === formatDateISO(new Date()) &&
                  Math.round((new Date(dateRangeEnd).getTime() - new Date(dateRangeStart).getTime()) / (1000 * 3600 * 24)) === 7 &&
                  styles.presetChipActive,
                ]}
                onPress={() => handleSelectWeekPreset(7)}
                activeOpacity={0.8}
              >
                <Text style={[
                  styles.presetChipText,
                  dateRangeStart &&
                  dateRangeEnd === formatDateISO(new Date()) &&
                  Math.round((new Date(dateRangeEnd).getTime() - new Date(dateRangeStart).getTime()) / (1000 * 3600 * 24)) === 7 &&
                  styles.presetChipTextActive,
                ]}>
                  LAST 7 DAYS (WEEK)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.presetChip,
                  dateRangeStart &&
                  dateRangeEnd === formatDateISO(new Date()) &&
                  Math.round((new Date(dateRangeEnd).getTime() - new Date(dateRangeStart).getTime()) / (1000 * 3600 * 24)) === 14 &&
                  styles.presetChipActive,
                ]}
                onPress={() => handleSelectWeekPreset(14)}
                activeOpacity={0.8}
              >
                <Text style={[
                  styles.presetChipText,
                  dateRangeStart &&
                  dateRangeEnd === formatDateISO(new Date()) &&
                  Math.round((new Date(dateRangeEnd).getTime() - new Date(dateRangeStart).getTime()) / (1000 * 3600 * 24)) === 14 &&
                  styles.presetChipTextActive,
                ]}>
                  LAST 14 DAYS (2 WEEKS)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.presetChip,
                  dateRangeStart &&
                  dateRangeEnd === formatDateISO(new Date()) &&
                  Math.round((new Date(dateRangeEnd).getTime() - new Date(dateRangeStart).getTime()) / (1000 * 3600 * 24)) >= 28 &&
                  Math.round((new Date(dateRangeEnd).getTime() - new Date(dateRangeStart).getTime()) / (1000 * 3600 * 24)) <= 31 &&
                  styles.presetChipActive,
                ]}
                onPress={() => handleSelectMonthPreset(1)}
                activeOpacity={0.8}
              >
                <Text style={[
                  styles.presetChipText,
                  dateRangeStart &&
                  dateRangeEnd === formatDateISO(new Date()) &&
                  Math.round((new Date(dateRangeEnd).getTime() - new Date(dateRangeStart).getTime()) / (1000 * 3600 * 24)) >= 28 &&
                  Math.round((new Date(dateRangeEnd).getTime() - new Date(dateRangeStart).getTime()) / (1000 * 3600 * 24)) <= 31 &&
                  styles.presetChipTextActive,
                ]}>
                  LAST 30 DAYS (MONTH)
                </Text>
              </TouchableOpacity>

              {/* September 20 to October 20 Window as explicitly requested by user */}
              <TouchableOpacity
                style={[
                  styles.presetChip,
                  dateRangeStart === '2026-09-20' && dateRangeEnd === '2026-10-20' && styles.presetChipActive,
                ]}
                onPress={() => handleSelectCustomRange('2026-09-20', '2026-10-20')}
                activeOpacity={0.8}
              >
                <Text style={[
                  styles.presetChipText,
                  dateRangeStart === '2026-09-20' && dateRangeEnd === '2026-10-20' && styles.presetChipTextActive,
                ]}>
                  SEP 20 ➔ OCT 20 (MONTH WINDOW)
                </Text>
              </TouchableOpacity>

              {/* October Month Full */}
              <TouchableOpacity
                style={[
                  styles.presetChip,
                  dateRangeStart === '2026-10-01' && dateRangeEnd === '2026-10-31' && styles.presetChipActive,
                ]}
                onPress={() => handleSelectCustomRange('2026-10-01', '2026-10-31')}
                activeOpacity={0.8}
              >
                <Text style={[
                  styles.presetChipText,
                  dateRangeStart === '2026-10-01' && dateRangeEnd === '2026-10-31' && styles.presetChipTextActive,
                ]}>
                  OCTOBER 2026
                </Text>
              </TouchableOpacity>

              {/* September Month Full */}
              <TouchableOpacity
                style={[
                  styles.presetChip,
                  dateRangeStart === '2026-09-01' && dateRangeEnd === '2026-09-30' && styles.presetChipActive,
                ]}
                onPress={() => handleSelectCustomRange('2026-09-01', '2026-09-30')}
                activeOpacity={0.8}
              >
                <Text style={[
                  styles.presetChipText,
                  dateRangeStart === '2026-09-01' && dateRangeEnd === '2026-09-30' && styles.presetChipTextActive,
                ]}>
                  SEPTEMBER 2026
                </Text>
              </TouchableOpacity>
            </ScrollView>

            {/* Calendar trigger button showing the selected date or range */}
            <View style={styles.dateControlRow}>
              <TouchableOpacity
                style={[styles.calendarPickerBtn, (selectedDate || dateRangeStart) ? styles.calendarPickerBtnActive : null]}
                onPress={() => setCalendarModalVisible(true)}
                activeOpacity={0.8}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                  <Ionicons
                    name="calendar-outline"
                    size={18}
                    color={(selectedDate || dateRangeStart) ? '#00363d' : '#00e5ff'}
                  />
                  <Text
                    style={[styles.calendarPickerBtnText, (selectedDate || dateRangeStart) ? styles.calendarPickerBtnTextActive : null]}
                    numberOfLines={1}
                  >
                    {activeDateFilterLabel || 'Open Interactive Calendar (Pick Day / Week / Month)'}
                  </Text>
                </View>
                <Ionicons name="chevron-down" size={16} color={(selectedDate || dateRangeStart) ? '#00363d' : '#849396'} />
              </TouchableOpacity>

              {(selectedDate || dateRangeStart) && (
                <TouchableOpacity style={styles.clearDateBtn} onPress={handleClearAllDates}>
                  <Ionicons name="close-circle" size={18} color="#ff5252" />
                  <Text style={styles.clearDateText}>CLEAR DATES</Text>
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

        {/* ─── 6. EXPORT ACTION BUTTONS (PDF & EXCEL) ─── */}
        <View style={styles.exportSection}>
          <View style={styles.exportButtonsRow}>
            {/* EXCEL SPREADSHEET BUTTON */}
            <TouchableOpacity style={styles.exportExcelBtn} onPress={handleExportExcel} activeOpacity={0.88}>
              <Ionicons name="document-text" size={18} color="#00363d" />
              <Text style={styles.exportExcelBtnText}>EXPORT AS EXCEL (.XLS)</Text>
            </TouchableOpacity>

            {/* PDF DOCUMENT BUTTON */}
            <TouchableOpacity style={styles.exportPdfBtn} onPress={handleExportPdf} activeOpacity={0.88}>
              <Ionicons name="print" size={18} color="#ffffff" />
              <Text style={styles.exportPdfBtnText}>EXPORT AS PDF</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.exportHelpText}>
            Export includes: Date · Time · Driver ID · Driver Name · Vehicle No · CHE No · Container(s) · Size · Damage · Load Terminal · Discharge Terminal · Status
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ─── 7. INTERACTIVE CALENDAR MODAL (DAY / WEEK / MONTH / RANGE) ─── */}
      <Modal
        visible={calendarModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setCalendarModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="calendar" size={18} color="#00e5ff" />
                <Text style={styles.modalTitle}>
                  {dateFilterMode === 'SINGLE' && 'SELECT SINGLE DATE'}
                  {dateFilterMode === 'WEEK' && 'SELECT 7-DAY WEEK PERIOD'}
                  {dateFilterMode === 'MONTH' && 'SELECT MONTHLY WINDOW'}
                  {dateFilterMode === 'RANGE' && 'SELECT CUSTOM DATE RANGE'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setCalendarModalVisible(false)} style={styles.closeModalBtn}>
                <Ionicons name="close" size={20} color="#dde2f0" />
              </TouchableOpacity>
            </View>

            {/* Mode Selector Tabs inside Modal */}
            <View style={styles.modalModeToggleRow}>
              {(['SINGLE', 'WEEK', 'MONTH', 'RANGE'] as const).map((m) => {
                const isActive = dateFilterMode === m;
                const label = m === 'SINGLE' ? 'DAY' : m;
                return (
                  <TouchableOpacity
                    key={m}
                    style={[styles.modalModeTab, isActive && styles.modalModeTabActive]}
                    onPress={() => setDateFilterMode(m)}
                  >
                    <Text style={[styles.modalModeTabText, isActive && styles.modalModeTabTextActive]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Instruction prompt for the active mode */}
            <View style={styles.modalInstructionBanner}>
              <Ionicons name="information-circle" size={14} color="#00e5ff" />
              <Text style={styles.modalInstructionText}>
                {dateFilterMode === 'SINGLE' && 'Tap any date to audit trips on that exact day.'}
                {dateFilterMode === 'WEEK' && 'Tap start date; 7 days will be automatically selected.'}
                {dateFilterMode === 'MONTH' && 'Tap start date; 30 days window will be automatically selected.'}
                {dateFilterMode === 'RANGE' && (!dateRangeStart
                  ? 'Tap the START date of your custom range.'
                  : !dateRangeEnd
                  ? `Start: ${dateRangeStart}. Now tap the END date.`
                  : `Selected: ${dateRangeStart} ➔ ${dateRangeEnd}. Tap another day to reset.`)}
              </Text>
            </View>

            {/* Calendar component */}
            <Calendar
              current={dateRangeStart || selectedDate || new Date().toISOString().split('T')[0]}
              onDayPress={(day: { dateString: string }) => {
                const clickedDate = day.dateString;

                if (dateFilterMode === 'SINGLE') {
                  handleSelectSingleDay(clickedDate);
                } else if (dateFilterMode === 'WEEK') {
                  // Select 7 days from clickedDate
                  const startD = new Date(clickedDate + 'T00:00:00');
                  const endD = new Date(startD);
                  endD.setDate(startD.getDate() + 6);
                  handleSelectCustomRange(clickedDate, formatDateISO(endD));
                } else if (dateFilterMode === 'MONTH') {
                  // Select 30 days window from clickedDate (e.g. Sept 20 to Oct 20)
                  const startD = new Date(clickedDate + 'T00:00:00');
                  const endD = new Date(startD);
                  endD.setDate(startD.getDate() + 30);
                  handleSelectCustomRange(clickedDate, formatDateISO(endD));
                } else if (dateFilterMode === 'RANGE') {
                  // 2-step custom range picker
                  if (!dateRangeStart || (dateRangeStart && dateRangeEnd)) {
                    setDateRangeStart(clickedDate);
                    setDateRangeEnd(null);
                    setSelectedDate(null);
                  } else {
                    if (clickedDate < dateRangeStart) {
                      setDateRangeStart(clickedDate);
                      setDateRangeEnd(dateRangeStart);
                    } else {
                      setDateRangeEnd(clickedDate);
                    }
                    setSelectedDate(null);
                  }
                }
              }}
              markingType={'period'}
              markedDates={calendarMarkedDates}
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

            {/* Selected Range Display Bar inside Modal */}
            {(dateRangeStart || selectedDate) && (
              <View style={styles.modalRangeInfoBox}>
                <Ionicons name="time" size={14} color="#feb300" />
                <Text style={styles.modalRangeInfoText}>
                  {activeDateFilterLabel}
                </Text>
              </View>
            )}

            {/* Modal Bottom Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalPresetBtn}
                onPress={() => handleSelectCustomRange('2026-09-20', '2026-10-20')}
              >
                <Text style={styles.modalPresetBtnText}>SEP 20 - OCT 20</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalTodayBtn}
                onPress={() => {
                  if (dateFilterMode === 'WEEK') {
                    handleSelectWeekPreset(7);
                    setCalendarModalVisible(false);
                  } else if (dateFilterMode === 'MONTH') {
                    handleSelectMonthPreset(1);
                    setCalendarModalVisible(false);
                  } else {
                    handleSelectSingleDay(formatDateISO(new Date()));
                  }
                }}
              >
                <Text style={styles.modalTodayBtnText}>
                  {dateFilterMode === 'WEEK' ? 'LAST 7 DAYS' : dateFilterMode === 'MONTH' ? 'LAST 30 DAYS' : 'TODAY'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalAllDatesBtn}
                onPress={() => {
                  handleClearAllDates();
                  setCalendarModalVisible(false);
                }}
              >
                <Text style={styles.modalAllDatesBtnText}>ALL DATES</Text>
              </TouchableOpacity>
            </View>

            {/* Apply & Close button when range is picked */}
            {dateFilterMode === 'RANGE' && dateRangeStart && dateRangeEnd && (
              <TouchableOpacity
                style={styles.modalApplyBtn}
                onPress={() => setCalendarModalVisible(false)}
              >
                <Ionicons name="checkmark-circle" size={16} color="#00363d" />
                <Text style={styles.modalApplyBtnText}>APPLY SELECTED RANGE</Text>
              </TouchableOpacity>
            )}
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
    flexGrow: 1,
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
    gap: 8,
    alignItems: 'center',
    width: '100%',
  },
  exportButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
  },
  exportExcelBtn: {
    flex: 1,
    backgroundColor: '#22ef7e',
    height: 48,
    borderRadius: radius.DEFAULT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 4,
    shadowColor: '#22ef7e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  exportExcelBtnText: {
    color: '#00363d',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  exportPdfBtn: {
    flex: 1,
    backgroundColor: '#00838f',
    height: 48,
    borderRadius: radius.DEFAULT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 4,
    shadowColor: '#00e5ff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  exportPdfBtnText: {
    color: '#ffffff',
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

  // ─── DATE MODE TABS & PRESETS ───
  dateModeTabRow: {
    flexDirection: 'row',
    backgroundColor: '#080e17',
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: '#242a34',
    padding: 3,
    gap: 4,
  },
  dateModeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 7,
    borderRadius: 6,
  },
  dateModeTabActive: {
    backgroundColor: '#00e5ff',
  },
  dateModeTabText: {
    color: '#849396',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  dateModeTabTextActive: {
    color: '#00363d',
    fontWeight: '900',
  },
  presetsScroll: {
    gap: 6,
    paddingVertical: 2,
  },
  presetChip: {
    backgroundColor: '#080e17',
    borderWidth: 1,
    borderColor: '#242a34',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.DEFAULT,
  },
  presetChipActive: {
    backgroundColor: 'rgba(0, 229, 255, 0.2)',
    borderColor: '#00e5ff',
  },
  presetChipText: {
    color: '#849396',
    fontSize: 10,
    fontWeight: '800',
  },
  presetChipTextActive: {
    color: '#00e5ff',
    fontWeight: '900',
  },

  // ─── MODAL EXTENSIONS ───
  modalModeToggleRow: {
    flexDirection: 'row',
    backgroundColor: '#080e17',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#242a34',
    padding: 2,
    gap: 4,
  },
  modalModeTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 4,
  },
  modalModeTabActive: {
    backgroundColor: '#00e5ff',
  },
  modalModeTabText: {
    color: '#849396',
    fontSize: 10,
    fontWeight: '800',
  },
  modalModeTabTextActive: {
    color: '#00363d',
    fontWeight: '900',
  },
  modalInstructionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 229, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  modalInstructionText: {
    color: '#c3f5ff',
    fontSize: 10,
    fontWeight: '700',
    flex: 1,
  },
  modalRangeInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(254, 179, 0, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(254, 179, 0, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  modalRangeInfoText: {
    color: '#feb300',
    fontSize: 10,
    fontWeight: '900',
  },
  modalPresetBtn: {
    flex: 1.2,
    height: 38,
    backgroundColor: 'rgba(254, 179, 0, 0.15)',
    borderWidth: 1,
    borderColor: '#feb300',
    borderRadius: radius.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalPresetBtnText: {
    color: '#feb300',
    fontWeight: '900',
    fontSize: 10,
  },
  modalApplyBtn: {
    height: 42,
    backgroundColor: '#00e5ff',
    borderRadius: radius.DEFAULT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  modalApplyBtnText: {
    color: '#00363d',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 0.6,
  },
});
