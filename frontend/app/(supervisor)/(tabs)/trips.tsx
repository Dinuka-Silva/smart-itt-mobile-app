import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
  Platform,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import { useAuthStore } from '../../../src/store/authStore';
import { tripService } from '../../../src/services/tripService';
import { vehicleService, Vehicle } from '../../../src/services/vehicleService';
import { driverService, DriverProfile } from '../../../src/services/driverService';
import { photoService, PhotoUploadResponse } from '../../../src/services/photoService';
import { adminService } from '../../../src/services/adminService';
import { securityAuditService } from '../../../src/services/securityAuditService';
import { colors, radius, spacing } from '../../../src/theme';
import { resolveCheNumber, resolveOperator, SCK_FLEET } from '../../../src/config/fleet';
import { useResponsive } from '../../../src/hooks/useResponsive';
import { getTripTimingDetails } from '../../../src/utils/tripDateUtils';
import { getTripDischargeTerminal } from '../../../src/utils/tripTerminalUtils';

const DRIVER_PHOTO_POOL = [
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1528892952291-009c663ce843?auto=format&fit=crop&w=300&q=80',
];

const TERMINALS = ['ALL', 'CICT', 'CWIT', 'ECT', 'JCT', 'UCT', 'SAGT'] as const;
const PERIOD_OPTIONS = [
  { id: 'DAILY', label: 'TODAY' },
  { id: 'YESTERDAY', label: 'YESTERDAY' },
  { id: 'WEEKLY', label: 'WEEK (7D)' },
  { id: 'MONTHLY', label: 'MONTH (30D)' },
  { id: 'RANGE', label: 'CUSTOM RANGE 📅' },
  { id: 'ALL', label: 'ALL TIME' },
] as const;

const DRIVER_OPTIONS = [
  { id: 'ALL', label: 'ALL DRIVERS' },
  { id: 'demo-driver', label: 'Kamal Perera' },
  { id: 'drv-002', label: 'Saman Kumara' },
  { id: 'drv-003', label: 'Nimal Fernando' },
  { id: 'drv-004', label: 'Sunil Silva' },
] as const;

const STATUS_OPTIONS = [
  { id: 'ALL', label: 'ALL TRIPS' },
  { id: 'IN_PROGRESS', label: 'IN PROGRESS' },
  { id: 'PENDING_APPROVAL', label: 'PENDING APPROVAL' },
  { id: 'COMPLETED', label: 'COMPLETED' },
  { id: 'REJECTED', label: 'REJECTED' },
] as const;

export default function SupervisorMissionDispatcher() {
  const user = useAuthStore((s) => s.user);

  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Top Segments: Pending Approval | All Trips
  const [activeSegment, setActiveSegment] = useState<'PENDING' | 'ALL'>('PENDING');

  // Photo Inspection Modal
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [activePhoto, setActivePhoto] = useState<any | null>(null);
  const [loadingPhoto, setLoadingPhoto] = useState(false);
  const [photoRejectNote, setPhotoRejectNote] = useState('');
  const [showRejectNoteInput, setShowRejectNoteInput] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTerminal, setSelectedTerminal] = useState<string>('ALL');
  const [selectedVehicle, setSelectedVehicle] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedDriverFilter, setSelectedDriverFilter] = useState<string>('ALL');
  const [selectedPeriodFilter, setSelectedPeriodFilter] = useState<string>('DAILY');
  const [dateRangeStart, setDateRangeStart] = useState<string | null>(null);
  const [dateRangeEnd, setDateRangeEnd] = useState<string | null>(null);
  const [dateRangeModalVisible, setDateRangeModalVisible] = useState(false);

  // Dynamic Fleet & Driver States
  const [fleetVehicles, setFleetVehicles] = useState<Vehicle[]>([]);
  const [vehicleLoading, setVehicleLoading] = useState(false);
  const [vehicleModalVisible, setVehicleModalVisible] = useState(false);
  const [vehicleSearchText, setVehicleSearchText] = useState('');
  const [registeredDrivers, setRegisteredDrivers] = useState<DriverProfile[]>([]);

  // Helper date formatters
  const formatFriendlyDate = (iso: string | null) => {
    if (!iso) return '';
    try {
      const d = new Date(iso + 'T00:00:00');
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return iso;
    }
  };

  const activePeriodLabel = useMemo(() => {
    if (selectedPeriodFilter === 'DAILY') return 'TODAY';
    if (selectedPeriodFilter === 'YESTERDAY') return 'YESTERDAY';
    if (selectedPeriodFilter === 'WEEKLY') return 'WEEK (7D)';
    if (selectedPeriodFilter === 'MONTHLY') return 'MONTH (30D)';
    if (selectedPeriodFilter === 'YEARLY') return 'YEAR';
    if (selectedPeriodFilter === 'RANGE') {
      if (dateRangeStart && dateRangeEnd) {
        return `${formatFriendlyDate(dateRangeStart)} ➔ ${formatFriendlyDate(dateRangeEnd)}`;
      }
      if (dateRangeStart) return `From ${formatFriendlyDate(dateRangeStart)}`;
      return 'CUSTOM RANGE';
    }
    return 'ALL TIME';
  }, [selectedPeriodFilter, dateRangeStart, dateRangeEnd]);

  // Marked dates computation for calendar (highlighting range)
  const calendarMarkedDates = useMemo(() => {
    const marks: Record<string, any> = {};
    if (dateRangeStart && dateRangeEnd) {
      const [y, m, d] = dateRangeStart.split('-').map(Number);
      const [endY, endM, endD] = dateRangeEnd.split('-').map(Number);
      const curDate = new Date(y, m - 1, d);
      const targetEndDate = new Date(endY, endM - 1, endD);

      while (curDate <= targetEndDate) {
        const year = curDate.getFullYear();
        const month = String(curDate.getMonth() + 1).padStart(2, '0');
        const day = String(curDate.getDate()).padStart(2, '0');
        const iso = `${year}-${month}-${day}`;
        const isStart = iso === dateRangeStart;
        const isEnd = iso === dateRangeEnd;

        marks[iso] = {
          selected: true,
          startingDay: isStart,
          endingDay: isEnd,
          color: isStart || isEnd ? '#173B70' : '#F0F5FA',
          textColor: isStart || isEnd ? '#F8FAFC' : '#173B70',
        };
        curDate.setDate(curDate.getDate() + 1);
      }
    } else if (dateRangeStart) {
      marks[dateRangeStart] = {
        selected: true,
        startingDay: true,
        endingDay: true,
        color: '#173B70',
        textColor: '#F8FAFC',
      };
    }
    return marks;
  }, [dateRangeStart, dateRangeEnd]);

  // Handle day press on calendar for custom range selection
  const handleDayPress = (dateStr: string) => {
    if (!dateRangeStart || (dateRangeStart && dateRangeEnd)) {
      // Start a new range selection
      setDateRangeStart(dateStr);
      setDateRangeEnd(null);
    } else if (dateRangeStart && !dateRangeEnd) {
      if (dateStr < dateRangeStart) {
        // Tapped earlier date: make this the new start
        setDateRangeStart(dateStr);
      } else {
        // Complete the range
        setDateRangeEnd(dateStr);
      }
    }
  };

  // Quick Presets inside Calendar modal
  const handleApplyPreset = (preset: { label: string; days?: number; type?: string }) => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    if (preset.type === 'month') {
      const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      setDateRangeStart(monthStart);
      setDateRangeEnd(todayStr);
    } else if (preset.days === 0) {
      setDateRangeStart(todayStr);
      setDateRangeEnd(todayStr);
    } else if (preset.days === -1) {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const yStr = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`;
      setDateRangeStart(yStr);
      setDateRangeEnd(yStr);
    } else if (preset.days) {
      const past = new Date(now);
      past.setDate(past.getDate() - preset.days);
      const pastStr = `${past.getFullYear()}-${String(past.getMonth() + 1).padStart(2, '0')}-${String(past.getDate()).padStart(2, '0')}`;
      setDateRangeStart(pastStr);
      setDateRangeEnd(todayStr);
    }
  };

  // Rejection modal
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [tripToReject, setTripToReject] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [submittingDecision, setSubmittingDecision] = useState(false);

  const loadFleetVehicles = useCallback(async () => {
    try {
      setVehicleLoading(true);
      const list = await vehicleService.getAllVehicles();
      if (Array.isArray(list) && list.length > 0) {
        setFleetVehicles(list);
      }
    } catch (e) {
      console.warn('[SupervisorTrips] Failed to load vehicles:', e);
    } finally {
      setVehicleLoading(false);
    }
  }, []);

  const loadRegisteredDrivers = useCallback(async () => {
    try {
      const list = await driverService.getAllDrivers();
      if (Array.isArray(list) && list.length > 0) {
        setRegisteredDrivers(list);
      }
    } catch (e) {
      console.warn('[SupervisorTrips] Failed to load drivers:', e);
    }
  }, []);

  const loadTrips = useCallback(async () => {
    try {
      const apiTrips = await tripService.getTrips();
      const list = Array.isArray(apiTrips) ? apiTrips : [];
      setTrips(list);
    } catch (e) {
      console.warn('[SupervisorTrips] Error loading trips:', e);
      setTrips([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadTrips();
    loadFleetVehicles();
    loadRegisteredDrivers();
  }, [loadTrips, loadFleetVehicles, loadRegisteredDrivers]);

  const onRefresh = () => {
    setRefreshing(true);
    loadTrips();
    loadFleetVehicles();
    loadRegisteredDrivers();
  };

  // Dynamic Driver Options from registered drivers in backend
  const driverOptions = useMemo(() => {
    const opts: { id: string; label: string }[] = [{ id: 'ALL', label: 'ALL DRIVERS' }];
    if (registeredDrivers.length > 0) {
      registeredDrivers.forEach((d) => {
        const id = d.id || d.driverCode || d.username;
        const label = d.fullName || d.driverCode || 'Driver';
        opts.push({ id, label });
      });
    } else {
      opts.push(
        { id: 'demo-driver', label: 'Kamal Perera' },
        { id: 'drv-002', label: 'Saman Kumara' },
        { id: 'drv-003', label: 'Nimal Fernando' },
        { id: 'drv-004', label: 'Sunil Silva' }
      );
    }
    return opts;
  }, [registeredDrivers]);

  // Dynamic vehicle options from registered backend fleet + fallback + active trips
  const vehicleOptions = useMemo(() => {
    const plateMap = new Map<string, string>();

    // 1. All vehicles from backend fleet
    fleetVehicles.forEach((v) => {
      if (v.vehicleNumber && v.vehicleNumber.trim()) {
        const clean = v.vehicleNumber.trim().toUpperCase();
        const norm = clean.replace(/[^A-Z0-9]/g, '');
        if (!plateMap.has(norm)) {
          plateMap.set(norm, clean);
        }
      }
    });

    // 2. SCK_FLEET fallback if fleetVehicles is empty or has missing authoritative units
    if (fleetVehicles.length === 0) {
      SCK_FLEET.forEach((v) => {
        if (v.vehicleNumber && v.vehicleNumber.trim()) {
          const clean = v.vehicleNumber.trim().toUpperCase();
          const norm = clean.replace(/[^A-Z0-9]/g, '');
          if (!plateMap.has(norm)) {
            plateMap.set(norm, clean);
          }
        }
      });
    }

    // 3. Vehicles present on trips
    trips.forEach((t) => {
      if (t.vehicleNumber && t.vehicleNumber !== 'UNASSIGNED' && t.vehicleNumber.trim()) {
        const clean = t.vehicleNumber.trim().toUpperCase();
        const norm = clean.replace(/[^A-Z0-9]/g, '');
        if (!plateMap.has(norm)) {
          plateMap.set(norm, clean);
        }
      }
    });

    const sortedPlates = Array.from(plateMap.values()).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true })
    );

    return ['ALL', ...sortedPlates];
  }, [fleetVehicles, trips]);

  // Filtered vehicles for searchable modal
  const filteredFleetModalVehicles = useMemo(() => {
    const q = vehicleSearchText.trim().toLowerCase();
    const qNorm = q.replace(/[^a-z0-9]/g, '');

    const sourceList: any[] = fleetVehicles.length > 0 ? fleetVehicles : SCK_FLEET;

    if (!q) return sourceList;

    return sourceList.filter((v: any) => {
      const vNum = (v.vehicleNumber || '').toLowerCase();
      const vNorm = vNum.replace(/[^a-z0-9]/g, '');
      const chas = (v.chassisNumber || v.cheNumber || '').toLowerCase();
      const op = (v.operator || '').toLowerCase();
      const drv = (v.driverName || v.assignedDriver?.driverName || '').toLowerCase();

      return (
        vNum.includes(q) ||
        (qNorm.length > 0 && vNorm.includes(qNorm)) ||
        chas.includes(q) ||
        op.includes(q) ||
        drv.includes(q)
      );
    });
  }, [fleetVehicles, vehicleSearchText]);

  // Scoped trips applying: Date Period / Custom Range, Driver, Vehicle Fleet, and Discharge Terminal.
  // CRITICAL: POWERS THE TRIP SUMMARY METRICS IN REAL-TIME!
  const scopedTrips = useMemo(() => {
    return trips.filter((t) => {
      // 1. Driver Filter
      if (selectedDriverFilter !== 'ALL') {
        if (t.driverId !== selectedDriverFilter && t.driverCode !== selectedDriverFilter) return false;
      }

      // 2. Vehicle Filter (with plate normalization)
      if (selectedVehicle !== 'ALL') {
        const vNorm = (t.vehicleNumber || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
        const targetVNorm = selectedVehicle.toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (vNorm !== targetVNorm) return false;
      }

      // 3. Discharge Terminal Filter
      if (selectedTerminal !== 'ALL') {
        const tripDest = getTripDischargeTerminal(t).toUpperCase();
        const matchesDest = tripDest.includes(selectedTerminal.toUpperCase());
        const matchesContainerDest = (t.containers || []).some(
          (c: any) => (c.destTerminal || '').toUpperCase() === selectedTerminal.toUpperCase()
        );
        if (!matchesDest && !matchesContainerDest) return false;
      }

      // 4. Date Period / Range Filter
      if (selectedPeriodFilter !== 'ALL') {
        const rawDate = t.operationDate || t.startTime || t.createdAt;
        if (!rawDate) return false;
        const tripDateStr = rawDate.slice(0, 10);
        const now = new Date();
        const todayStr = now.toISOString().slice(0, 10);

        if (selectedPeriodFilter === 'DAILY') {
          if (tripDateStr !== todayStr) return false;
        } else if (selectedPeriodFilter === 'YESTERDAY') {
          const y = new Date();
          y.setDate(y.getDate() - 1);
          if (tripDateStr !== y.toISOString().slice(0, 10)) return false;
        } else if (selectedPeriodFilter === 'WEEKLY') {
          const tDate = new Date(rawDate);
          const diffDays = (now.getTime() - tDate.getTime()) / (1000 * 60 * 60 * 24);
          if (diffDays < 0 || diffDays > 7) return false;
        } else if (selectedPeriodFilter === 'MONTHLY') {
          const tDate = new Date(rawDate);
          const diffDays = (now.getTime() - tDate.getTime()) / (1000 * 60 * 60 * 24);
          if (diffDays < 0 || diffDays > 30) return false;
        } else if (selectedPeriodFilter === 'YEARLY') {
          const tDate = new Date(rawDate);
          if (tDate.getFullYear() !== now.getFullYear()) return false;
        } else if (selectedPeriodFilter === 'RANGE') {
          const effectiveStart = dateRangeStart;
          const effectiveEnd = dateRangeEnd || dateRangeStart;
          if (effectiveStart && tripDateStr < effectiveStart) return false;
          if (effectiveEnd && tripDateStr > effectiveEnd) return false;
        }
      }

      return true;
    });
  }, [trips, selectedDriverFilter, selectedVehicle, selectedTerminal, selectedPeriodFilter, dateRangeStart, dateRangeEnd]);

  // Trip Summary Metrics calculated from scopedTrips
  const countTotal = scopedTrips.length;
  const countInProgress = scopedTrips.filter((t) => t.status === 'IN_PROGRESS' || t.status === 'ARRIVED').length;
  const countPending = scopedTrips.filter((t) => t.status === 'PENDING_APPROVAL' || t.status === 'PENDING_SUPERVISOR_CONFIRMATION').length;
  const countCompleted = scopedTrips.filter((t) => t.status === 'COMPLETED' || t.status === 'APPROVED' || t.status === 'SUPERVISOR_CONFIRMED').length;
  const totalContainersDispatched = scopedTrips.reduce((acc, t) => acc + (t.containers?.length || 1), 0);

  // Filtered trips for list view (includes Segment, Status, and Search on top of scopedTrips)
  const filteredTrips = useMemo(() => {
    return scopedTrips.filter((t) => {
      // 0. Top segment filter
      if (activeSegment === 'PENDING') {
        if (t.status !== 'PENDING_APPROVAL' && t.status !== 'PENDING_SUPERVISOR_CONFIRMATION') return false;
      }

      // 1. Status Filter
      if (selectedStatus !== 'ALL') {
        if (selectedStatus === 'COMPLETED') {
          if (t.status !== 'COMPLETED' && t.status !== 'APPROVED' && t.status !== 'SUPERVISOR_CONFIRMED') return false;
        } else if (selectedStatus === 'PENDING_APPROVAL') {
          if (t.status !== 'PENDING_APPROVAL' && t.status !== 'PENDING_SUPERVISOR_CONFIRMATION') return false;
        } else if (t.status !== selectedStatus) {
          return false;
        }
      }

      // 2. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const tripNum = (t.tripNumber || t.id || '').toLowerCase();
        const vessel = (t.vesselName || '').toLowerCase();
        const veh = (t.vehicleNumber || '').toLowerCase();
        const driver = (t.driverName || '').toLowerCase();
        const chai = resolveCheNumber(t.vehicleNumber, t.chassisNumber || t.chaiNumber).toLowerCase();
        const contMatches = (t.containers || []).some((c: any) =>
          (c.containerNumber || '').toLowerCase().includes(q)
        );

        if (!tripNum.includes(q) && !vessel.includes(q) && !veh.includes(q) && !driver.includes(q) && !chai.includes(q) && !contMatches) {
          return false;
        }
      }

      return true;
    });
  }, [scopedTrips, activeSegment, selectedStatus, searchQuery]);

  // Check if any non-default filter is currently applied
  const hasActiveFilters =
    selectedVehicle !== 'ALL' ||
    selectedPeriodFilter !== 'DAILY' ||
    dateRangeStart !== null ||
    selectedDriverFilter !== 'ALL' ||
    selectedTerminal !== 'ALL' ||
    selectedStatus !== 'ALL' ||
    searchQuery.trim() !== '';

  const handleResetAllFilters = () => {
    setSelectedVehicle('ALL');
    setSelectedPeriodFilter('DAILY');
    setDateRangeStart(null);
    setDateRangeEnd(null);
    setSelectedDriverFilter('ALL');
    setSelectedTerminal('ALL');
    setSelectedStatus('ALL');
    setSearchQuery('');
  };

  // Date-wise grouped trips
  const tripsByDate = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = yesterdayDate.toISOString().slice(0, 10);

    const groups: {
      [key: string]: {
        dateKey: string;
        displayDate: string;
        isToday: boolean;
        isYesterday: boolean;
        trips: any[];
        totalContainers: number;
      };
    } = {};

    filteredTrips.forEach((t) => {
      const rawDate = t.operationDate || t.startTime || t.createdAt || new Date().toISOString();
      const dateKey = rawDate.slice(0, 10);

      if (!groups[dateKey]) {
        const isToday = dateKey === todayStr;
        const isYesterday = dateKey === yesterdayStr;
        let displayDate = dateKey;
        try {
          const dObj = new Date(dateKey + 'T00:00:00');
          displayDate = dObj.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          });
        } catch { }

        groups[dateKey] = {
          dateKey,
          displayDate,
          isToday,
          isYesterday,
          trips: [],
          totalContainers: 0,
        };
      }

      const driverIndex = Math.abs((t.driverName || 'Kamal').charCodeAt(0) + (t.id || '1').charCodeAt(0)) % DRIVER_PHOTO_POOL.length;
      const driverPhoto = t.driverPhoto || DRIVER_PHOTO_POOL[driverIndex];

      groups[dateKey].trips.push({ ...t, driverPhoto });
      groups[dateKey].totalContainers += (t.containers?.length || 1);
    });

    // Terminal-wise Sorting by Discharge Terminal within each date group
    Object.values(groups).forEach((g) => {
      g.trips.sort((a, b) => (a.destTerminal || '').localeCompare(b.destTerminal || ''));
    });

    return Object.values(groups).sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  }, [filteredTrips]);

  const pendingTripsCount = useMemo(() => {
    return trips.filter((t) => t.status === 'PENDING_APPROVAL').length;
  }, [trips]);

  const openPhotoModal = async (trip: any, container: any) => {
    setLoadingPhoto(true);
    setPhotoModalVisible(true);
    setShowRejectNoteInput(false);
    setPhotoRejectNote('');
    try {
      const p = await photoService.getPhotoByContainer(trip.id, container.containerNumber);
      if (p) {
        setActivePhoto(p);
      } else {
        setActivePhoto({
          id: container.id || 'photo-' + Date.now(),
          tripId: trip.id,
          containerNumber: container.containerNumber,
          verificationStatus: container.photoStatus || (container.isVerified ? 'VERIFIED' : 'PENDING'),
          uri: container.photoUrl || null,
        });
      }
    } catch {
      setActivePhoto({
        id: container.id || 'photo-' + Date.now(),
        tripId: trip.id,
        containerNumber: container.containerNumber,
        verificationStatus: container.photoStatus || (container.isVerified ? 'VERIFIED' : 'PENDING'),
        uri: container.photoUrl || null,
      });
    } finally {
      setLoadingPhoto(false);
    }
  };

  const checkPhotosAndProceed = (trip: any, actionFn: () => Promise<void>) => {
    const hasUnverified = (trip.containers || []).some(
      (c: any) => c.isVerified === false || (c.photoStatus && c.photoStatus !== 'VERIFIED')
    );
    if (hasUnverified) {
      Alert.alert(
        'Photo Verification Pending',
        'Container photo is unverified or has not been approved. Approve trip anyway?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Approve Anyway', style: 'destructive', onPress: () => { actionFn(); } },
        ]
      );
    } else {
      actionFn();
    }
  };

  const handleDischargeAndComplete = async (trip: any) => {
    const supName = user?.fullName || user?.name || 'Nimal Silva';
    const supUser = user?.username || user?.employeeId || 'SUP001';
    const tripNum = trip?.tripNumber || trip?.id || 'TRP';

    try {
      await tripService.approveTrip(trip.id, user?.id || 'sup-001', 'Container discharged and trip approved');

      await securityAuditService.logEvent(
        'TRIP_APPROVED',
        supUser,
        `Supervisor ${supName} (${supUser}) confirmed delivery & approved trip ${tripNum} (${trip?.driverName || trip?.driverId || 'Driver'}) · Discharge: ${trip?.destTerminal || 'ECT'}`,
        'INFO',
        'SUPERVISOR',
        { tripId: trip?.id, tripNumber: tripNum, role: 'SUPERVISOR', driver: trip?.driverName, status: 'APPROVED' }
      );

      Alert.alert('Delivery Confirmed & Approved ✅', `Trip ${trip.tripNumber || trip.id} is confirmed. Driver completed container count (+1 towards 300 target) and main system metrics have been updated.`);
      await loadTrips();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || e?.message || 'Failed to complete trip on server.');
    }
  };

  // Approval actions
  const handleApproveTrip = async (trip: any) => {
    const supName = user?.fullName || user?.name || 'Nimal Silva';
    const supUser = user?.username || user?.employeeId || 'SUP001';
    const tripNum = trip?.tripNumber || trip?.id || 'TRP';

    try {
      await tripService.approveTrip(trip.id, user?.id || 'sup-001', 'Approved by Operations Supervisor');

      await securityAuditService.logEvent(
        'TRIP_APPROVED',
        supUser,
        `Supervisor ${supName} (${supUser}) approved gate movement for trip ${tripNum} (${trip?.driverName || 'Driver'})`,
        'INFO',
        'SUPERVISOR',
        { tripId: trip?.id, tripNumber: tripNum, role: 'SUPERVISOR', driver: trip?.driverName, status: 'APPROVED' }
      );

      Alert.alert('Gate Pass Approved', `Trip ${trip.tripNumber || trip.id} is approved.`);
      await loadTrips();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || e?.message || 'Failed to approve trip on server.');
    }
  };

  const handleOpenRejectModal = (trip: any) => {
    setTripToReject(trip);
    setRejectionReason('');
    setRejectModalVisible(true);
  };

  const handleConfirmRejection = async () => {
    if (!rejectionReason.trim()) {
      Alert.alert('Mandatory Reason', 'Please provide a reason for rejecting this trip submission.');
      return;
    }

    setSubmittingDecision(true);
    const supName = user?.fullName || user?.name || 'Nimal Silva';
    const supUser = user?.username || user?.employeeId || 'SUP001';
    const tripNum = tripToReject?.tripNumber || tripToReject?.id || 'TRP';

    try {
      await tripService.rejectTrip(tripToReject.id, user?.id || 'sup-001', rejectionReason.trim());

      await securityAuditService.logEvent(
        'TRIP_REJECTED',
        supUser,
        `Supervisor ${supName} (${supUser}) rejected trip ${tripNum} (${tripToReject?.driverName || 'Driver'}). Reason: ${rejectionReason.trim()}`,
        'WARNING',
        'SUPERVISOR',
        { tripId: tripToReject?.id, tripNumber: tripNum, role: 'SUPERVISOR', reason: rejectionReason.trim(), status: 'REJECTED' }
      );

      setRejectModalVisible(false);
      Alert.alert('Trip Rejected', `Trip ${tripToReject.tripNumber || tripToReject.id} rejected.`);
      await loadTrips();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || e?.message || 'Failed to reject trip on server.');
    } finally {
      setSubmittingDecision(false);
    }
  };

  const supervisorName = user?.name || user?.fullName || 'Nimal Silva';
  const supervisorInitials = supervisorName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
  const { topInset, bottomInset, contentMaxWidth, containerPaddingHorizontal } = useResponsive();

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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#173B70" />}
        keyboardShouldPersistTaps="handled"
      >
        {/* ─── A. SUPERVISOR HEADER ─── */}
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
                <Text style={styles.dateText}>DISPATCH FLEET</Text>
              </View>
            </View>
          </View>

          <View style={styles.onlinePill}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineText}>LIVE FEED</Text>
          </View>
        </View>

        {/* ─── B. LIVE METRICS SUMMARY ROW ─── */}
        <View style={styles.summaryHeaderRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="bar-chart" size={15} color="#173B70" />
            <Text style={styles.summaryHeaderTitle}>TRIP SUMMARY METRICS</Text>
          </View>
          <TouchableOpacity
            style={styles.summaryDateBadge}
            onPress={() => setDateRangeModalVisible(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="calendar-outline" size={12} color="#173B70" />
            <Text style={styles.summaryDateBadgeText} numberOfLines={1}>{activePeriodLabel}</Text>
            <Ionicons name="chevron-down" size={12} color="#173B70" />
          </TouchableOpacity>
        </View>

        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <View style={styles.metricCardHeader}>
              <Text style={styles.metricLabel}>TOTAL TRIPS</Text>
              <Ionicons name="swap-horizontal" size={14} color="#173B70" />
            </View>
            <Text style={[styles.metricValue, { color: '#173B70' }]}>{countTotal}</Text>
            <Text style={styles.metricSub}>{totalContainersDispatched} Containers Dispatched</Text>
          </View>

          <View style={styles.metricCard}>
            <View style={styles.metricCardHeader}>
              <Text style={styles.metricLabel}>ACTIVE</Text>
              <Ionicons name="navigate" size={14} color="#173B70" />
            </View>
            <Text style={[styles.metricValue, { color: '#173B70' }]}>{countInProgress}</Text>
            <Text style={styles.metricSub}>In Transit</Text>
          </View>

          <View style={styles.metricCard}>
            <View style={styles.metricCardHeader}>
              <Text style={styles.metricLabel}>PENDING PASS</Text>
              <Ionicons name="time" size={14} color="#173B70" />
            </View>
            <Text style={[styles.metricValue, { color: '#173B70' }]}>{countPending}</Text>
            <Text style={styles.metricSub}>Awaiting Action</Text>
          </View>

          <View style={styles.metricCard}>
            <View style={styles.metricCardHeader}>
              <Text style={styles.metricLabel}>COMPLETED</Text>
              <Ionicons name="checkmark-done" size={14} color="#bac9cc" />
            </View>
            <Text style={[styles.metricValue, { color: '#1E293B' }]}>{countCompleted}</Text>
            <Text style={styles.metricSub}>Delivered</Text>
          </View>
        </View>

        {/* ─── C. TRIP MONITORING WITH SEARCH & FILTERS ─── */}
        <View style={styles.sectionWrap}>
          {/* Top Segments: Pending Approval (n) | All Trips */}
          <View style={styles.topSegmentRow}>
            <TouchableOpacity
              style={[
                styles.topSegmentBtn,
                activeSegment === 'PENDING' && styles.topSegmentBtnActive,
              ]}
              onPress={() => {
                setActiveSegment('PENDING');
                setSelectedStatus('PENDING_APPROVAL');
              }}
              activeOpacity={0.7}
            >
              <Ionicons
                name="time-outline"
                size={16}
                color={activeSegment === 'PENDING' ? '#173B70' : '#6B7C85'}
              />
              <Text
                style={[
                  styles.topSegmentBtnText,
                  activeSegment === 'PENDING' && styles.topSegmentBtnTextActive,
                ]}
              >
                Pending Approval ({pendingTripsCount})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.topSegmentBtn,
                activeSegment === 'ALL' && styles.topSegmentBtnActive,
              ]}
              onPress={() => {
                setActiveSegment('ALL');
                setSelectedStatus('ALL');
              }}
              activeOpacity={0.7}
            >
              <Ionicons
                name="list-outline"
                size={16}
                color={activeSegment === 'ALL' ? '#173B70' : '#6B7C85'}
              />
              <Text
                style={[
                  styles.topSegmentBtnText,
                  activeSegment === 'ALL' && styles.topSegmentBtnTextActive,
                ]}
              >
                All Trips ({scopedTrips.length})
              </Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.sectionTitleRow, { justifyContent: 'space-between' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="pulse" size={18} color="#173B70" />
              <Text style={styles.sectionTitle}>
                INTER-TERMINAL TRIP MONITORING ({filteredTrips.length})
              </Text>
            </View>
            {hasActiveFilters && (
              <TouchableOpacity
                onPress={handleResetAllFilters}
                style={styles.resetAllFiltersBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="refresh" size={11} color="#173B70" />
                <Text style={styles.resetAllFiltersText}>RESET FILTERS</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Search bar */}
          <View style={styles.searchBarWrap}>
            <Ionicons name="search" size={16} color="#3A567F" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search Trip ID, Container, Vessel, Truck, Driver..."
              placeholderTextColor="#3A567F"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={16} color="#3A567F" />
              </TouchableOpacity>
            )}
          </View>

          {/* Date Period & Range Filter */}
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={styles.filterGroupLabel}>DATE PERIOD & RANGE FILTER</Text>
              {selectedPeriodFilter === 'RANGE' && dateRangeStart && (
                <TouchableOpacity
                  onPress={() => {
                    setSelectedPeriodFilter('DAILY');
                    setDateRangeStart(null);
                    setDateRangeEnd(null);
                  }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}
                >
                  <Ionicons name="close-circle" size={13} color="#173B70" />
                  <Text style={{ fontSize: 9, color: '#173B70', fontWeight: '800' }}>RESET</Text>
                </TouchableOpacity>
              )}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipsScroll}>
              {PERIOD_OPTIONS.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[
                    styles.filterChip,
                    selectedPeriodFilter === p.id && styles.filterChipActiveCyan,
                  ]}
                  onPress={() => {
                    if (p.id === 'RANGE') {
                      setSelectedPeriodFilter('RANGE');
                      setDateRangeModalVisible(true);
                    } else {
                      setSelectedPeriodFilter(p.id);
                      setDateRangeStart(null);
                      setDateRangeEnd(null);
                    }
                  }}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      selectedPeriodFilter === p.id && styles.filterChipTextActiveCyan,
                    ]}
                  >
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Active Custom Range Banner */}
            {selectedPeriodFilter === 'RANGE' && (
              <TouchableOpacity
                style={styles.activeRangeBanner}
                onPress={() => setDateRangeModalVisible(true)}
                activeOpacity={0.85}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                  <Ionicons name="calendar" size={14} color="#173B70" />
                  <Text style={styles.activeRangeBannerText}>
                    {dateRangeStart && dateRangeEnd
                      ? `Range: ${formatFriendlyDate(dateRangeStart)}  ➔  ${formatFriendlyDate(dateRangeEnd)}`
                      : dateRangeStart
                        ? `From: ${formatFriendlyDate(dateRangeStart)} (Tap to pick end date)`
                        : 'Tap to choose custom date range on calendar'}
                  </Text>
                </View>
                <View style={styles.changeRangeBtn}>
                  <Text style={styles.changeRangeBtnText}>CHANGE</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>

          {/* Driver Selection Filter */}
          <View>
            <Text style={styles.filterGroupLabel}>DRIVER SELECTION FILTER</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipsScroll}>
              {driverOptions.map((d) => (
                <TouchableOpacity
                  key={d.id}
                  style={[
                    styles.filterChip,
                    selectedDriverFilter === d.id && styles.filterChipActive,
                  ]}
                  onPress={() => setSelectedDriverFilter(d.id)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      selectedDriverFilter === d.id && styles.filterChipTextActive,
                    ]}
                  >
                    {d.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Discharge Terminal Filters */}
          <View>
            <Text style={styles.filterGroupLabel}>DISCHARGE TERMINAL FILTER (DESTINATION)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipsScroll}>
              {TERMINALS.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.filterChip,
                    selectedTerminal === t && styles.filterChipActiveCyan,
                  ]}
                  onPress={() => setSelectedTerminal(t)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      selectedTerminal === t && styles.filterChipTextActiveCyan,
                    ]}
                  >
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Vehicle Fleet Filters */}
          <View>
            <View style={styles.filterGroupHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.filterGroupLabel}>VEHICLE FLEET FILTER</Text>
                <View style={styles.vehicleCountPill}>
                  <Text style={styles.vehicleCountPillText}>
                    {vehicleOptions.length > 1 ? `${vehicleOptions.length - 1} FLEET UNITS` : 'FLEET'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.vehicleDropdownBtn}
                onPress={() => {
                  setVehicleSearchText('');
                  setVehicleModalVisible(true);
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="search" size={11} color="#173B70" />
                <Text style={styles.vehicleDropdownBtnText}>
                  {selectedVehicle === 'ALL'
                    ? `SELECT UNIT (${vehicleOptions.length > 1 ? vehicleOptions.length - 1 : 0}) ▾`
                    : `${selectedVehicle} ▾`}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Active Vehicle Banner */}
            {selectedVehicle !== 'ALL' && (
              <View style={styles.selectedVehicleBanner}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                  <Ionicons name="car-sport" size={14} color="#173B70" />
                  <Text style={styles.selectedVehicleBannerText}>
                    Active Fleet Filter: <Text style={{ fontWeight: '900', color: '#173B70' }}>{selectedVehicle}</Text>
                    {(() => {
                      const vNorm = selectedVehicle.toUpperCase().replace(/[^A-Z0-9]/g, '');
                      const found = fleetVehicles.find(
                        (v) => (v.vehicleNumber || '').toUpperCase().replace(/[^A-Z0-9]/g, '') === vNorm
                      );
                      if (!found) return '';
                      return ` · ${found.chassisNumber || found.cheNumber || ''} (${found.operator || 'SCK'})`;
                    })()}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.clearVehicleBtn}
                  onPress={() => setSelectedVehicle('ALL')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close-circle" size={15} color="#173B70" />
                  <Text style={styles.clearVehicleBtnText}>ALL UNITS</Text>
                </TouchableOpacity>
              </View>
            )}

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipsScroll}>
              {vehicleOptions.map((veh) => {
                const isSelected = selectedVehicle === veh;
                return (
                  <TouchableOpacity
                    key={veh}
                    style={[
                      styles.filterChip,
                      isSelected && styles.filterChipActiveCyan,
                    ]}
                    onPress={() => setSelectedVehicle(veh)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={veh === 'ALL' ? 'grid' : 'car-sport'}
                      size={11}
                      color={isSelected ? '#FFFFFF' : '#173B70'}
                      style={{ marginRight: 4 }}
                    />
                    <Text
                      style={[
                        styles.filterChipText,
                        isSelected && styles.filterChipTextActiveCyan,
                      ]}
                    >
                      {veh === 'ALL' ? 'ALL VEHICLES' : veh}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Status Filters */}
          <View>
            <Text style={styles.filterGroupLabel}>STATUS FILTER</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipsScroll}>
              {STATUS_OPTIONS.map((st) => (
                <TouchableOpacity
                  key={st.id}
                  style={[
                    styles.filterChip,
                    selectedStatus === st.id && styles.filterChipActive,
                  ]}
                  onPress={() => setSelectedStatus(st.id)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      selectedStatus === st.id && styles.filterChipTextActive,
                    ]}
                  >
                    {st.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* List of Trip Monitoring Cards Grouped Date-Wise */}
          <View style={{ gap: 14, marginTop: 4 }}>
            {loading ? (
              <ActivityIndicator size="large" color="#173B70" style={{ marginVertical: 20 }} />
            ) : tripsByDate.length === 0 ? (
              <View style={styles.emptyPendingCard}>
                <Ionicons name="file-tray-outline" size={28} color="#3A567F" />
                <Text style={styles.emptyPendingText}>NO MATCHING TRIPS</Text>
                <Text style={styles.emptyPendingSub}>
                  No active or completed inter-terminal moves found for this filter criteria.
                </Text>
              </View>
            ) : (
              tripsByDate.map((group) => (
                <View key={group.dateKey} style={styles.dateGroupWrap}>
                  {/* Date Section Header */}
                  <View style={styles.dateGroupHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="calendar" size={14} color="#173B70" />
                      <Text style={styles.dateGroupTitle}>{group.displayDate.toUpperCase()}</Text>
                      {group.isToday && (
                        <View style={styles.todayPill}>
                          <Text style={styles.todayPillText}>TODAY</Text>
                        </View>
                      )}
                      {group.isYesterday && (
                        <View style={styles.yesterdayPill}>
                          <Text style={styles.yesterdayPillText}>YESTERDAY</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.dateGroupCountBadge}>
                      <Text style={styles.dateGroupCountText}>
                        {group.trips.length} TRIPS • {group.totalContainers} CONTAINERS
                      </Text>
                    </View>
                  </View>

                  {/* Trips List for this Date */}
                  <View style={{ gap: 10, marginTop: 8 }}>
                    {group.trips.map((t) => {
                      const count20 = (t.containers || []).filter((c: any) => (c.size || '').includes('20')).length;
                      const count40 = (t.containers || []).filter((c: any) => (c.size || '').includes('40')).length;
                      const isPending = t.status === 'PENDING_APPROVAL';

                      return (
                        <View key={t.id} style={styles.monitoringCard}>
                          {/* Header with Driver Photo */}
                          <View style={styles.monHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                              {t.driverPhoto ? (
                                <Image source={{ uri: t.driverPhoto }} style={styles.monDriverThumb} />
                              ) : (
                                <View style={styles.monDriverThumbFallback}>
                                  <Text style={styles.monDriverThumbText}>{(t.driverName || 'K')[0]}</Text>
                                </View>
                              )}
                              <View>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                  {t.status === 'IN_PROGRESS' && <View style={styles.greenPulseDot} />}
                                  <Text style={styles.monTripId}>
                                    {t.tripNumber || `ITT-${t.id?.slice(0, 6)}`}
                                  </Text>
                                </View>
                                <Text style={styles.monDriverNameSmall}>
                                  {t.driverName || 'Kamal Perera'} {t.driverCode ? `(${t.driverCode})` : ''}
                                </Text>
                              </View>
                            </View>

                            <View
                              style={[
                                styles.monStatusBadge,
                                t.status === 'IN_PROGRESS' && styles.badgeGreen,
                                t.status === 'PENDING_APPROVAL' && styles.badgeAmber,
                                t.status === 'APPROVED' && styles.badgeCyan,
                                t.status === 'COMPLETED' && styles.badgeCyan,
                                t.status === 'REJECTED' && styles.badgeRed,
                              ]}
                            >
                              <Text style={styles.monStatusText}>{t.status?.replace(/_/g, ' ')}</Text>
                            </View>
                          </View>

                          {/* Route Row */}
                          <View style={styles.monRouteBox}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Ionicons name="boat" size={13} color="#173B70" />
                              <Text style={styles.monRouteText}>
                                {t.sourceTerminal || 'CICT'}
                              </Text>
                              <Ionicons name="arrow-forward" size={13} color="#173B70" />
                              <Text style={styles.monRouteText}>
                                {getTripDischargeTerminal(t)}
                              </Text>
                            </View>
                            <View style={styles.monRouteTag}>
                              <Text style={styles.monRouteTagText}>ITT CORRIDOR</Text>
                            </View>
                          </View>

                          {/* ─── TRIP STARTED DATE TIME & END TIME DETAILS ─── */}
                          {(() => {
                            const timing = getTripTimingDetails(t);
                            return (
                              <View style={styles.monTimingPanel}>
                                <View style={styles.monTimingCol}>
                                  <View style={styles.monTimingHeader}>
                                    <Ionicons name="play-circle" size={12} color="#173B70" />
                                    <Text style={styles.monTimingLabel}>STARTED DATE & TIME</Text>
                                  </View>
                                  <Text style={styles.monTimingDate}>{timing.startDate}</Text>
                                  <Text style={styles.monTimingTime}>{timing.startTime}</Text>
                                </View>

                                <View style={styles.monTimingDivider}>
                                  <Ionicons name="arrow-forward" size={13} color="#3a4756" />
                                  {timing.duration && (
                                    <View style={styles.monDurationPill}>
                                      <Ionicons name="timer-outline" size={10} color="#173B70" />
                                      <Text style={styles.monDurationText}>{timing.duration}</Text>
                                    </View>
                                  )}
                                </View>

                                <View style={styles.monTimingCol}>
                                  <View style={styles.monTimingHeader}>
                                    <Ionicons
                                      name={timing.isCompleted ? 'checkmark-circle' : timing.isPending ? 'time' : 'navigate-circle'}
                                      size={12}
                                      color={timing.statusColor}
                                    />
                                    <Text style={[styles.monTimingLabel, { color: timing.statusColor }]}>
                                      {timing.isCompleted ? 'COMPLETED DATE & TIME' : timing.isPending ? 'DISCHARGED' : 'CURRENT STATUS'}
                                    </Text>
                                  </View>
                                  <Text style={[styles.monTimingDate, !timing.isCompleted && !timing.isPending && { color: '#3A567F' }]}>
                                    {timing.endDate}
                                  </Text>
                                  <Text style={[styles.monTimingTime, { color: timing.statusColor }]}>
                                    {timing.endTime}
                                  </Text>
                                </View>
                              </View>
                            );
                          })()}

                          {/* Specs Row */}
                          <View style={styles.monSpecsRow}>
                            <Text style={styles.monSpecItem}>
                              Truck: <Text style={styles.monSpecBoldHighlight}>{t.vehicleNumber || 'LY-6439'}</Text>
                            </Text>
                            <Text style={styles.monSpecItem}>
                              CHE: <Text style={styles.monSpecBoldCyan}>{resolveCheNumber(t.vehicleNumber, t.chassisNumber || t.chaiNumber)}</Text>
                            </Text>
                            <Text style={styles.monSpecItem}>
                              Operator: <Text style={styles.monSpecBoldCyan}>{resolveOperator(t.vehicleNumber, t.operator)}</Text>
                            </Text>
                            <Text style={styles.monSpecItem}>
                              Vessel: <Text style={styles.monSpecBold}>{t.vesselName || 'MV Colombo Star'}</Text>
                            </Text>
                            <Text style={styles.monSpecItem}>
                              Cargo: <Text style={styles.monSpecBoldGreen}>{count20 > 0 ? `${count20}×20FT ` : ''}{count40 > 0 ? `${count40}×40FT` : ''}</Text>
                            </Text>
                          </View>

                          {/* Container Manifest Chips */}
                          {t.containers && t.containers.length > 0 && (
                            <View style={{ gap: 6, marginTop: 4 }}>
                              {t.containers.map((c: any, cIdx: number) => (
                                <View key={c.id || cIdx} style={styles.monContainerCard}>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                                    <Ionicons name="cube-outline" size={14} color="#173B70" />
                                    <Text style={styles.monContainerNumber}>{c.containerNumber}</Text>
                                    <Text style={styles.monContainerSize}>{c.size || '20FT'}</Text>
                                    {c.isVerified === false && (
                                      <View style={styles.monUnverifiedBadge}>
                                        <Text style={styles.monUnverifiedText}>Unverified</Text>
                                      </View>
                                    )}
                                    {c.isVerified === true && (
                                      <View style={styles.monVerifiedBadge}>
                                        <Text style={styles.monVerifiedText}>Verified ✓</Text>
                                      </View>
                                    )}
                                  </View>

                                  <TouchableOpacity
                                    style={styles.inspectPhotoBtn}
                                    onPress={() => openPhotoModal(t, c)}
                                    activeOpacity={0.7}
                                  >
                                    <Ionicons name="camera-outline" size={13} color="#173B70" />
                                    <Text style={styles.inspectPhotoBtnText}>Inspect Photo</Text>
                                  </TouchableOpacity>
                                </View>
                              ))}
                            </View>
                          )}

                          {/* Driver Discharge Manifest if Pending Approval */}
                          {isPending && (
                            <View style={{
                              backgroundColor: '#0a101d',
                              borderRadius: 10,
                              borderWidth: 1,
                              borderColor: '#F0F5FA',
                              padding: 10,
                              gap: 8,
                              marginTop: 6,
                            }}>
                              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                  <Ionicons name="shield-checkmark" size={13} color="#173B70" />
                                  <Text style={{ fontSize: 9.5, fontWeight: '900', color: '#173B70', letterSpacing: 0.4 }}>
                                    DRIVER DISCHARGE & SEAL VERIFICATION
                                  </Text>
                                </View>
                                <View style={{
                                  backgroundColor: 'rgba(34, 239, 126, 0.12)',
                                  paddingHorizontal: 5,
                                  paddingVertical: 1.5,
                                  borderRadius: 4,
                                  borderWidth: 1,
                                  borderColor: 'rgba(34, 239, 126, 0.3)',
                                }}>
                                  <Text style={{ fontSize: 8, fontWeight: '800', color: '#173B70' }}>SLPA AUDITED</Text>
                                </View>
                              </View>

                              <View style={{ flexDirection: 'row', gap: 6 }}>
                                <View style={{ flex: 1, backgroundColor: '#0f1726', borderRadius: 6, borderWidth: 1, borderColor: '#E2E8F0', padding: 6 }}>
                                  <Text style={{ fontSize: 8, fontWeight: '800', color: '#3A567F' }}>BAY / BERTH</Text>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                    <Ionicons name="location" size={11} color="#173B70" />
                                    <Text style={{ fontSize: 9.5, fontWeight: '800', color: '#173B70' }} numberOfLines={1}>
                                      {getTripDischargeTerminal(t)} · {t.dischargeBay || 'Bay 04, Crane 02'}
                                    </Text>
                                  </View>
                                </View>

                                <View style={{
                                  flex: 1,
                                  backgroundColor: '#0f1726',
                                  borderRadius: 6,
                                  borderWidth: 1,
                                  borderColor: t.sealStatus?.includes('DAMAGED') ? 'rgba(255, 82, 82, 0.35)' : 'rgba(34, 239, 126, 0.35)',
                                  padding: 6,
                                }}>
                                  <Text style={{ fontSize: 8, fontWeight: '800', color: '#3A567F' }}>SEAL STATUS</Text>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                    <Ionicons
                                      name={t.sealStatus?.includes('DAMAGED') ? 'warning' : 'shield-checkmark'}
                                      size={11}
                                      color={t.sealStatus?.includes('DAMAGED') ? '#173B70' : '#173B70'}
                                    />
                                    <Text style={{ fontSize: 9.5, fontWeight: '800', color: t.sealStatus?.includes('DAMAGED') ? '#173B70' : '#173B70' }} numberOfLines={1}>
                                      {t.sealStatus || 'INTACT (VERIFIED)'}
                                    </Text>
                                  </View>
                                </View>

                                <View style={{
                                  flex: 1,
                                  backgroundColor: '#0f1726',
                                  borderRadius: 6,
                                  borderWidth: 1,
                                  borderColor: t.damageStatus === 'DAMAGED' ? 'rgba(255, 82, 82, 0.35)' : 'rgba(34, 239, 126, 0.35)',
                                  padding: 6,
                                }}>
                                  <Text style={{ fontSize: 8, fontWeight: '800', color: '#3A567F' }}>CARGO</Text>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                    <Ionicons
                                      name={t.damageStatus === 'DAMAGED' ? 'alert-circle' : 'checkmark-circle'}
                                      size={11}
                                      color={t.damageStatus === 'DAMAGED' ? '#173B70' : '#173B70'}
                                    />
                                    <Text style={{ fontSize: 9.5, fontWeight: '800', color: t.damageStatus === 'DAMAGED' ? '#173B70' : '#173B70' }} numberOfLines={1}>
                                      {t.damageStatus === 'DAMAGED' ? 'DAMAGED' : 'SOUND'}
                                    </Text>
                                  </View>
                                </View>
                              </View>

                              {/* Full width remarks */}
                              <View style={{
                                backgroundColor: '#F8FAFC',
                                borderRadius: 6,
                                borderLeftWidth: 3,
                                borderLeftColor: '#173B70',
                                paddingHorizontal: 8,
                                paddingVertical: 6,
                              }}>
                                <Text style={{ fontSize: 7.5, fontWeight: '900', color: '#173B70', letterSpacing: 0.4, marginBottom: 2 }}>
                                  DRIVER COMPLETION REMARKS
                                </Text>
                                <Text style={{ fontSize: 9.5, color: '#1E293B', fontStyle: 'italic', lineHeight: 13 }}>
                                  "{t.driverCompletionNotes || 'Containers discharged safely at destination berth. Seals inspected and verified intact.'}"
                                </Text>
                              </View>
                            </View>
                          )}

                          {/* Decision Action Buttons if Pending Approval or In Progress */}
                          {(isPending || t.status === 'IN_PROGRESS') && (
                            <View style={styles.decisionButtonsRow}>
                              <TouchableOpacity
                                style={styles.approveBtn}
                                onPress={() => checkPhotosAndProceed(t, () => handleDischargeAndComplete(t))}
                              >
                                <Ionicons name="shield-checkmark" size={14} color="#FFFFFF" />
                                <Text style={styles.approveBtnText}>
                                  {isPending ? 'APPROVE & DISCHARGE GATE PASS' : 'DISCHARGE & COMPLETE TRIP'}
                                </Text>
                              </TouchableOpacity>

                              {isPending && (
                                <TouchableOpacity
                                  style={styles.rejectBtn}
                                  onPress={() => handleOpenRejectModal(t)}
                                >
                                  <Ionicons name="close-circle" size={14} color="#173B70" />
                                  <Text style={styles.rejectBtnText}>REJECT</Text>
                                </TouchableOpacity>
                              )}
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>
                </View>
              ))
            )}
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ─── MODAL: REJECT TRIP WITH MANDATORY REASON ─── */}
      <Modal visible={rejectModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="alert-circle" size={20} color="#173B70" />
                <Text style={styles.modalTitle}>REJECT TRIP SUBMISSION</Text>
              </View>
              <TouchableOpacity onPress={() => setRejectModalVisible(false)}>
                <Ionicons name="close" size={22} color="#3A567F" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDesc}>
              Please specify the mandatory reason for rejecting Gate Pass for Trip{' '}
              <Text style={{ color: '#173B70', fontWeight: '800' }}>
                {tripToReject?.tripNumber || tripToReject?.id}
              </Text>.
            </Text>

            <TextInput
              style={styles.rejectionInput}
              placeholder="e.g. Container seal mismatch, incorrect destination terminal..."
              placeholderTextColor="#3A567F"
              value={rejectionReason}
              onChangeText={setRejectionReason}
              multiline
              numberOfLines={3}
            />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <TouchableOpacity
                style={[styles.modalSubmitBtn, { backgroundColor: '#173B70' }]}
                onPress={handleConfirmRejection}
                disabled={submittingDecision}
              >
                {submittingDecision ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={[styles.modalSubmitBtnText, { color: '#FFFFFF' }]}>
                    CONFIRM REJECTION
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── MODAL: CUSTOM DATE RANGE CALENDAR ─── */}
      <Modal visible={dateRangeModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.calendarModalCard}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="calendar" size={18} color="#173B70" />
                <Text style={styles.modalTitle}>FILTER BY DATE RANGE</Text>
              </View>
              <TouchableOpacity
                onPress={() => setDateRangeModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={22} color="#3A567F" />
              </TouchableOpacity>
            </View>

            {/* Quick Presets Row */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.calendarPresetsRow}>
              {[
                { label: 'Today', days: 0 },
                { label: 'Yesterday', days: -1 },
                { label: 'Last 7 Days', days: 7 },
                { label: 'Last 30 Days', days: 30 },
                { label: 'This Month', type: 'month' },
              ].map((p, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.calendarPresetChip}
                  onPress={() => handleApplyPreset(p)}
                >
                  <Text style={styles.calendarPresetText}>{p.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Selected Range Display Status */}
            <View style={styles.calendarRangeDisplay}>
              <View style={styles.rangeDateCol}>
                <Text style={styles.rangeDateLabel}>START DATE</Text>
                <Text style={styles.rangeDateVal}>
                  {dateRangeStart ? formatFriendlyDate(dateRangeStart) : 'Select Start'}
                </Text>
              </View>
              <Ionicons name="arrow-forward" size={16} color="#173B70" />
              <View style={styles.rangeDateCol}>
                <Text style={styles.rangeDateLabel}>END DATE</Text>
                <Text style={styles.rangeDateVal}>
                  {dateRangeEnd
                    ? formatFriendlyDate(dateRangeEnd)
                    : dateRangeStart
                      ? 'Tap End Date'
                      : '—'}
                </Text>
              </View>
            </View>

            {/* Calendar */}
            <View style={styles.calendarWrapper}>
              <Calendar
                markingType={'period'}
                markedDates={calendarMarkedDates}
                onDayPress={(day) => handleDayPress(day.dateString)}
                theme={{
                  backgroundColor: '#FFFFFF',
                  calendarBackground: '#FFFFFF',
                  textSectionTitleColor: '#3A567F',
                  selectedDayBackgroundColor: '#173B70',
                  selectedDayTextColor: '#F8FAFC',
                  todayTextColor: '#173B70',
                  dayTextColor: '#dde2f0',
                  textDisabledColor: '#323f4b',
                  arrowColor: '#173B70',
                  monthTextColor: '#173B70',
                  indicatorColor: '#173B70',
                  textDayFontWeight: '600',
                  textMonthFontWeight: '800',
                  textDayHeaderFontWeight: '700',
                  textDayFontSize: 13,
                  textMonthFontSize: 14,
                  textDayHeaderFontSize: 11,
                }}
              />
            </View>

            {/* Action Buttons */}
            <View style={styles.calendarModalActions}>
              <TouchableOpacity
                style={styles.calendarResetBtn}
                onPress={() => {
                  setDateRangeStart(null);
                  setDateRangeEnd(null);
                }}
              >
                <Ionicons name="refresh" size={14} color="#3A567F" />
                <Text style={styles.calendarResetBtnText}>CLEAR DATES</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.calendarApplyBtn}
                onPress={() => {
                  if (dateRangeStart) {
                    setSelectedPeriodFilter('RANGE');
                  }
                  setDateRangeModalVisible(false);
                }}
              >
                <Ionicons name="checkmark-done" size={15} color="#FFFFFF" />
                <Text style={styles.calendarApplyBtnText}>APPLY FILTER</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── MODAL: CONTAINER PHOTO INSPECTION & VERIFICATION ─── */}
      <Modal visible={photoModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxWidth: 480 }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="camera" size={20} color="#173B70" />
                <Text style={styles.modalTitle}>CONTAINER PHOTO VERIFICATION</Text>
              </View>
              <TouchableOpacity onPress={() => setPhotoModalVisible(false)}>
                <Ionicons name="close" size={22} color="#3A567F" />
              </TouchableOpacity>
            </View>

            {loadingPhoto ? (
              <ActivityIndicator size="large" color="#173B70" style={{ marginVertical: 30 }} />
            ) : activePhoto ? (
              <View style={{ gap: 12, marginTop: 10 }}>
                <View style={{ height: 260, backgroundColor: '#F7F9FA', borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#E5EAEC', alignItems: 'center', justifyContent: 'center' }}>
                  {activePhoto.viewUrl || activePhoto.uri ? (
                    <Image
                      source={{ uri: activePhoto.viewUrl || activePhoto.uri }}
                      style={{ width: '100%', height: '100%' }}
                      resizeMode="contain"
                    />
                  ) : (
                    <View style={{ alignItems: 'center', gap: 6 }}>
                      <Ionicons name="image-outline" size={36} color="#A3B1B8" />
                      <Text style={{ fontSize: 12, color: '#6B7C85' }}>No photo file available on server</Text>
                    </View>
                  )}
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#1F2D33' }}>
                    Container: {activePhoto.containerNumber || '-'}
                  </Text>
                  <View style={{
                    backgroundColor: activePhoto.verificationStatus === 'VERIFIED' ? '#E6F6EC' : activePhoto.verificationStatus === 'REJECTED' ? '#F0F5FA' : '#F0F5FA',
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 12,
                  }}>
                    <Text style={{
                      fontSize: 11,
                      fontWeight: '700',
                      color: activePhoto.verificationStatus === 'VERIFIED' ? '#1E7A45' : activePhoto.verificationStatus === 'REJECTED' ? '#173B70' : '#173B70',
                    }}>
                      {activePhoto.verificationStatus || 'PENDING'}
                    </Text>
                  </View>
                </View>

                {showRejectNoteInput && (
                  <TextInput
                    style={styles.rejectionInput}
                    placeholder="Enter rejection reason (e.g. illegible number, wrong container)..."
                    placeholderTextColor="#A3B1B8"
                    value={photoRejectNote}
                    onChangeText={setPhotoRejectNote}
                  />
                )}

                <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
                  <TouchableOpacity
                    style={[styles.modalSubmitBtn, { backgroundColor: '#1E7A45' }]}
                    onPress={async () => {
                      try {
                        await photoService.verifyPhoto(activePhoto.id, { status: 'VERIFIED' });
                        Alert.alert('Photo Verified', 'Container photo marked as Verified.');
                        setPhotoModalVisible(false);
                        await loadTrips();
                      } catch (e: any) {
                        Alert.alert('Error', e?.message || 'Failed to verify photo');
                      }
                    }}
                  >
                    <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                    <Text style={[styles.modalSubmitBtnText, { color: '#FFFFFF' }]}>Verify Photo</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalSubmitBtn, { backgroundColor: '#173B70' }]}
                    onPress={async () => {
                      if (!showRejectNoteInput) {
                        setShowRejectNoteInput(true);
                        return;
                      }
                      try {
                        await photoService.verifyPhoto(activePhoto.id, { status: 'REJECTED', note: photoRejectNote });
                        Alert.alert('Photo Rejected', 'Container photo rejected.');
                        setPhotoModalVisible(false);
                        setShowRejectNoteInput(false);
                        setPhotoRejectNote('');
                        await loadTrips();
                      } catch (e: any) {
                        Alert.alert('Error', e?.message || 'Failed to reject photo');
                      }
                    }}
                  >
                    <Ionicons name="close-circle" size={16} color="#FFFFFF" />
                    <Text style={[styles.modalSubmitBtnText, { color: '#FFFFFF' }]}>Reject Photo</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <Text style={{ marginVertical: 20, textAlign: 'center', color: '#6B7C85' }}>No photo available</Text>
            )}
          </View>
        </View>
      </Modal>

      {/* ─── MODAL: DYNAMIC VEHICLE FLEET SELECTOR (SEARCHABLE DROPDOWN) ─── */}
      <Modal visible={vehicleModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxWidth: 540, maxHeight: '85%' }]}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={styles.modalHeaderIconWrap}>
                  <Ionicons name="bus" size={18} color="#173B70" />
                </View>
                <View>
                  <Text style={styles.modalTitle}>SELECT FLEET VEHICLE</Text>
                  <Text style={styles.modalSubtitle}>
                    {fleetVehicles.length > 0
                      ? `${fleetVehicles.length} Registered Units in Fleet`
                      : 'Select Prime Mover / Trailer Unit'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setVehicleModalVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={22} color="#173B70" />
              </TouchableOpacity>
            </View>

            {/* Instant Search Box */}
            <View style={styles.modalSearchBox}>
              <Ionicons name="search" size={16} color="#3A567F" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search by Plate (LY-...), CHE, Operator, Driver..."
                placeholderTextColor="#5A779D"
                value={vehicleSearchText}
                onChangeText={setVehicleSearchText}
                autoCapitalize="characters"
                autoCorrect={false}
              />
              {vehicleSearchText.length > 0 && (
                <TouchableOpacity onPress={() => setVehicleSearchText('')}>
                  <Ionicons name="close-circle" size={16} color="#3A567F" />
                </TouchableOpacity>
              )}
            </View>

            {/* List of Vehicles */}
            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={true}>
              {/* Option: ALL FLEET VEHICLES */}
              <TouchableOpacity
                style={[
                  styles.vehicleModalRow,
                  selectedVehicle === 'ALL' && styles.vehicleModalRowActive,
                ]}
                onPress={() => {
                  setSelectedVehicle('ALL');
                  setVehicleModalVisible(false);
                }}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.vehicleModalPlateBox,
                    selectedVehicle === 'ALL' && styles.vehicleModalPlateBoxActive,
                  ]}
                >
                  <Ionicons
                    name="grid"
                    size={16}
                    color={selectedVehicle === 'ALL' ? '#FFFFFF' : '#173B70'}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.vehicleModalRowTitle,
                      selectedVehicle === 'ALL' && styles.vehicleModalRowTitleActive,
                    ]}
                  >
                    ALL FLEET VEHICLES
                  </Text>
                  <Text style={styles.vehicleModalRowSub}>
                    View and monitor inter-terminal moves across the entire fleet
                  </Text>
                </View>
                {selectedVehicle === 'ALL' && (
                  <Ionicons name="checkmark-circle" size={20} color="#173B70" />
                )}
              </TouchableOpacity>

              {/* Filtered Vehicles from authoritative fleet */}
              {filteredFleetModalVehicles.length === 0 ? (
                <View style={styles.emptyVehiclesBox}>
                  <Ionicons name="alert-circle-outline" size={28} color="#3A567F" />
                  <Text style={styles.emptyVehiclesText}>No vehicles match your search</Text>
                </View>
              ) : (
                filteredFleetModalVehicles.map((v: any) => {
                  const plate = v.vehicleNumber || '';
                  const isSelected =
                    selectedVehicle.toUpperCase().replace(/[^A-Z0-9]/g, '') ===
                    plate.toUpperCase().replace(/[^A-Z0-9]/g, '');
                  const che = v.chassisNumber || v.cheNumber || resolveCheNumber(plate, v.chassisNumber);
                  const op = v.operator || resolveOperator(plate, v.operator);
                  const drvName = v.driverName || v.assignedDriver?.driverName;

                  return (
                    <TouchableOpacity
                      key={v.id || plate}
                      style={[
                        styles.vehicleModalRow,
                        isSelected && styles.vehicleModalRowActive,
                      ]}
                      onPress={() => {
                        setSelectedVehicle(plate);
                        setVehicleModalVisible(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          styles.vehicleModalPlateBox,
                          isSelected && styles.vehicleModalPlateBoxActive,
                        ]}
                      >
                        <Ionicons
                          name="car-sport"
                          size={16}
                          color={isSelected ? '#FFFFFF' : '#173B70'}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text
                            style={[
                              styles.vehicleModalRowTitle,
                              isSelected && styles.vehicleModalRowTitleActive,
                            ]}
                          >
                            {plate}
                          </Text>
                          <View style={styles.vehicleModalStatusBadge}>
                            <Text style={styles.vehicleModalStatusText}>
                              {v.status || 'ACTIVE'}
                            </Text>
                          </View>
                          {v.trailerSize ? (
                            <View style={styles.vehicleModalSizeBadge}>
                              <Text style={styles.vehicleModalSizeText}>{v.trailerSize}</Text>
                            </View>
                          ) : null}
                        </View>
                        <Text style={styles.vehicleModalRowSub}>
                          CHE: <Text style={{ fontWeight: '700', color: '#173B70' }}>{che}</Text> · {op}
                          {drvName ? ` · Driver: ${drvName}` : ''}
                        </Text>
                      </View>
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={20} color="#173B70" />
                      )}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            {/* Modal Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setVehicleModalVisible(false)}
              >
                <Text style={styles.modalCancelBtnText}>CLOSE</Text>
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
    backgroundColor: '#F8FAFC',
  },
  scroll: {
    flexGrow: 1,
    gap: 14,
  },

  // ─── HEADER ───
  header: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#173B70',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 16,
  },
  supervisorNameText: {
    color: '#1E293B',
    fontWeight: '800',
    fontSize: 14,
  },
  roleDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  rolePill: {
    backgroundColor: 'rgba(254, 179, 0, 0.15)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  rolePillText: {
    color: '#173B70',
    fontSize: 9,
    fontWeight: '800',
  },
  dateText: {
    color: '#3A567F',
    fontSize: 9,
    fontWeight: '700',
  },
  onlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#173B70',
  },
  onlineText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#173B70',
    letterSpacing: 0.6,
  },

  // ─── 4 SUMMARY METRIC CARDS ───
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    gap: 4,
  },
  metricCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metricLabel: {
    color: '#3A567F',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '900',
    marginTop: 2,
  },
  metricSub: {
    color: '#3A567F',
    fontSize: 8,
  },

  // ─── SECTION WRAPS ───
  sectionWrap: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    gap: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  sectionTitle: {
    color: '#1E293B',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },

  // ─── SEARCH & FILTER CHIPS ───
  searchBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    height: 42,
  },
  searchInput: {
    flex: 1,
    color: '#1E293B',
    fontSize: 11,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  } as any,
  resetAllFiltersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E8F1FA',
    borderWidth: 1,
    borderColor: '#173B70',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  resetAllFiltersText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#173B70',
    letterSpacing: 0.3,
  },
  filterGroupHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  vehicleCountPill: {
    backgroundColor: '#E8F1FA',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  vehicleCountPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#173B70',
    letterSpacing: 0.3,
  },
  vehicleDropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0F5FA',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#D0DEEB',
  },
  vehicleDropdownBtnText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#173B70',
    letterSpacing: 0.2,
  },
  selectedVehicleBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#E8F1FA',
    borderWidth: 1,
    borderColor: '#173B70',
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 8,
  },
  selectedVehicleBannerText: {
    fontSize: 11,
    color: '#24436E',
    fontWeight: '500',
  },
  clearVehicleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#173B70',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  clearVehicleBtnText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#173B70',
  },
  filterGroupLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#3A567F',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  filterChipsScroll: {
    gap: 6,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.sm,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D0DEEB',
  },
  filterChipActive: {
    backgroundColor: '#173B70',
    borderColor: '#173B70',
  },
  filterChipActiveCyan: {
    backgroundColor: '#173B70',
    borderColor: '#173B70',
  },
  filterChipText: {
    color: '#3A567F',
    fontSize: 9,
    fontWeight: '800',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  filterChipTextActiveCyan: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  // ─── VEHICLE SELECTOR MODAL STYLES ───
  modalSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F5FA',
    borderWidth: 1,
    borderColor: '#D0DEEB',
    borderRadius: radius.DEFAULT,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 10,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 12,
    color: '#173B70',
    fontWeight: '600',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  } as any,
  vehicleModalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D0DEEB',
    borderRadius: radius.DEFAULT,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 6,
  },
  vehicleModalRowActive: {
    backgroundColor: '#E8F1FA',
    borderColor: '#173B70',
    borderWidth: 1.5,
  },
  vehicleModalPlateBox: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#F0F5FA',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D0DEEB',
  },
  vehicleModalPlateBoxActive: {
    backgroundColor: '#173B70',
    borderColor: '#173B70',
  },
  vehicleModalRowTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#173B70',
  },
  vehicleModalRowTitleActive: {
    color: '#173B70',
  },
  vehicleModalRowSub: {
    fontSize: 11,
    color: '#3A567F',
    marginTop: 2,
  },
  vehicleModalStatusBadge: {
    backgroundColor: '#F0F5FA',
    borderWidth: 1,
    borderColor: '#D0DEEB',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  vehicleModalStatusText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#173B70',
  },
  vehicleModalSizeBadge: {
    backgroundColor: '#173B70',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  vehicleModalSizeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  emptyVehiclesBox: {
    paddingVertical: 30,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  emptyVehiclesText: {
    fontSize: 12,
    color: '#3A567F',
    fontWeight: '600',
  },

  // ─── DATE-WISE GROUP STYLES ───
  dateGroupWrap: {
    gap: 4,
  },
  dateGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#101721',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: radius.DEFAULT,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dateGroupTitle: {
    color: '#1E293B',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  todayPill: {
    backgroundColor: '#173B70',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
  },
  todayPillText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '900',
  },
  yesterdayPill: {
    backgroundColor: 'rgba(254, 179, 0, 0.2)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#173B70',
  },
  yesterdayPillText: {
    color: '#173B70',
    fontSize: 8,
    fontWeight: '800',
  },
  dateGroupCountBadge: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dateGroupCountText: {
    color: '#173B70',
    fontSize: 9,
    fontWeight: '800',
  },
  monDriverThumb: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#173B70',
  },
  monDriverThumbFallback: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#101d30',
    borderWidth: 1.5,
    borderColor: '#173B70',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monDriverThumbText: {
    color: '#173B70',
    fontWeight: '900',
    fontSize: 12,
  },
  monDriverNameSmall: {
    color: '#1E293B',
    fontSize: 10,
    fontWeight: '700',
  },
  monSpecBoldHighlight: {
    color: '#173B70',
    fontWeight: '800',
  },
  monSpecBoldCyan: {
    color: '#173B70',
    fontWeight: '800',
  },
  monSpecBoldGreen: {
    color: '#173B70',
    fontWeight: '800',
  },

  // ─── MONITORING CARDS ───
  monitoringCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    gap: 8,
  },
  monHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  greenPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#173B70',
  },
  monTripId: {
    color: '#173B70',
    fontSize: 12,
    fontWeight: '900',
  },
  monStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeGreen: { backgroundColor: 'rgba(34, 239, 126, 0.15)' },
  badgeCyan: { backgroundColor: '#F0F5FA' },
  badgeAmber: { backgroundColor: 'rgba(254, 179, 0, 0.15)' },
  badgeRed: { backgroundColor: 'rgba(255, 82, 82, 0.15)' },
  monStatusText: {
    color: '#1E293B',
    fontSize: 8,
    fontWeight: '800',
  },
  monRouteBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  monRouteText: {
    color: '#1E293B',
    fontSize: 12,
    fontWeight: '800',
  },
  monRouteTag: {
    backgroundColor: '#F0F5FA',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#F0F5FA',
  },
  monRouteTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#173B70',
    letterSpacing: 0.5,
  },
  monTimingPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: '#1e293b',
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
    marginVertical: 4,
  },
  monTimingCol: {
    flex: 1,
    gap: 1,
  },
  monTimingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  monTimingLabel: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#173B70',
    letterSpacing: 0.4,
  },
  monTimingDate: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E293B',
  },
  monTimingTime: {
    fontSize: 12,
    fontWeight: '900',
    color: '#173B70',
    letterSpacing: 0.2,
  },
  monTimingDivider: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingHorizontal: 2,
  },
  monDurationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(34, 239, 126, 0.12)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(34, 239, 126, 0.3)',
  },
  monDurationText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#173B70',
  },
  monTime: {
    color: '#3A567F',
    fontSize: 9,
  },
  monSpecsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  monSpecItem: {
    color: '#3A567F',
    fontSize: 9,
  },
  monSpecBold: {
    color: '#1E293B',
    fontWeight: '600',
  },
  monContainersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#161c25',
  },
  monContainersText: {
    color: '#173B70',
    fontSize: 9,
  },
  emptyPendingCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: radius.DEFAULT,
    padding: 20,
    alignItems: 'center',
    gap: 6,
  },
  emptyPendingText: {
    color: '#1E293B',
    fontSize: 11,
    fontWeight: '800',
  },
  emptyPendingSub: {
    color: '#3A567F',
    fontSize: 9,
    textAlign: 'center',
  },

  // ─── DECISION ACTION BUTTONS ───
  decisionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#161c25',
  },
  approveBtn: {
    flex: 1,
    height: 38,
    backgroundColor: '#173B70',
    borderRadius: radius.DEFAULT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  approveBtnText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 11,
  },
  rejectBtn: {
    paddingHorizontal: 16,
    height: 38,
    backgroundColor: '#F0F5FA',
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: '#173B70',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  rejectBtnText: {
    color: '#173B70',
    fontWeight: '800',
    fontSize: 10,
  },

  // ─── MODAL ───
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    gap: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    color: '#1E293B',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  modalDesc: {
    color: '#bac9cc',
    fontSize: 11,
    lineHeight: 16,
  },
  modalHeaderIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#F0F5FA',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D0DEEB',
  },
  modalSubtitle: {
    color: '#3A567F',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#D0DEEB',
  },
  modalCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.sm,
    backgroundColor: '#F0F5FA',
    borderWidth: 1,
    borderColor: '#D0DEEB',
  },
  modalCancelBtnText: {
    color: '#173B70',
    fontSize: 11,
    fontWeight: '800',
  },
  rejectionInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#173B70',
    borderRadius: radius.DEFAULT,
    padding: 10,
    color: '#1E293B',
    fontSize: 11,
    minHeight: 70,
    textAlignVertical: 'top',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  } as any,
  modalSubmitBtn: {
    flex: 1,
    height: 40,
    borderRadius: radius.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSubmitBtnText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  summaryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryHeaderTitle: {
    color: '#173B70',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  summaryDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F0F5FA',
    borderWidth: 1,
    borderColor: '#F0F5FA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  summaryDateBadgeText: {
    color: '#173B70',
    fontSize: 11,
    fontWeight: '700',
  },
  activeRangeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0F5FA',
    borderWidth: 1,
    borderColor: '#173B70',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 8,
  },
  activeRangeBannerText: {
    color: '#1E293B',
    fontSize: 11,
    fontWeight: '600',
  },
  changeRangeBtn: {
    backgroundColor: '#173B70',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  changeRangeBtnText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  // ─── CALENDAR MODAL ───
  calendarModalCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1d2e47',
    padding: 16,
    gap: 12,
  },
  calendarPresetsRow: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
  },
  calendarPresetChip: {
    backgroundColor: '#122033',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1f3452',
  },
  calendarPresetText: {
    color: '#173B70',
    fontSize: 11,
    fontWeight: '700',
  },
  calendarRangeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F0F5FA',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  rangeDateCol: {
    alignItems: 'center',
    gap: 2,
  },
  rangeDateLabel: {
    color: '#3A567F',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  rangeDateVal: {
    color: '#1E293B',
    fontSize: 12,
    fontWeight: '700',
  },
  calendarWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#192b45',
  },
  calendarModalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  calendarResetBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#162233',
    borderWidth: 1,
    borderColor: '#233750',
  },
  calendarResetBtnText: {
    color: '#3A567F',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  calendarApplyBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#173B70',
  },
  calendarApplyBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.6,
  },

  // ─── TOP SEGMENTS ───
  topSegmentRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  topSegmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 42,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5EAEC',
  },
  topSegmentBtnActive: {
    backgroundColor: '#F0F5FA',
    borderColor: '#173B70',
  },
  topSegmentBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7C85',
  },
  topSegmentBtnTextActive: {
    color: '#173B70',
    fontWeight: '700',
  },

  // ─── CONTAINER CARDS ───
  monContainerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F7F9FA',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5EAEC',
  },
  monContainerNumber: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#173B70',
  },
  monContainerSize: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6B7C85',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
  },
  monUnverifiedBadge: {
    backgroundColor: '#F0F5FA',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  monUnverifiedText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#173B70',
  },
  monVerifiedBadge: {
    backgroundColor: '#E6F6EC',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  monVerifiedText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#1E7A45',
  },
  inspectPhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#173B70',
  },
  inspectPhotoBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#173B70',
  },
});
