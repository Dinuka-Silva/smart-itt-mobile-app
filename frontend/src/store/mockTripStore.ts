import { create } from 'zustand';
import { resolveCheNumber, resolveOperator } from '../config/fleet';

export interface MockContainer {
  id: string;
  containerNumber: string;
  size?: '20FT' | '40FT' | '40HC' | string;
  isoType?: string;
  destTerminal?: string;
  status?: 'LOCKED' | 'IN_TRANSIT' | 'DISCHARGED';
  unloadedAt?: string;
  unloadedTerminal?: string;
  damageStatus?: 'NONE' | 'DAMAGED' | string;
  isReturn?: boolean;
  cargoType?: string;
}

export interface MockTrip {
  id: string;
  tripNumber: string;
  driverId: string;
  driverCode?: string;
  driverName: string;
  vehicleNumber: string;
  chassisNumber?: string;
  chaiNumber?: string;
  operator?: string;
  vesselName: string;
  voyageNumber?: string;
  operationDate?: string;
  operationTime?: string;
  dispatchTime?: string;
  isReturn?: boolean;
  sourceTerminal?: string;
  destTerminal: string;
  notes?: string;
  status: 'PENDING_APPROVAL' | 'IN_PROGRESS' | 'ARRIVED' | 'COMPLETED' | 'REJECTED' | 'APPROVED';
  containers: MockContainer[];
  startTime: string;
  endTime?: string;
  createdAt?: string;
  dischargedAt?: string;
}

interface MockTripState {
  mockTrips: MockTrip[];
  addTrip: (trip: MockTrip) => void;
  updateTripStatus: (id: string, status: MockTrip['status']) => void;
  getTripsForDriver: (driverId: string) => MockTrip[];
  getPendingTrips: () => MockTrip[];
  unloadContainer: (tripId: string, containerId: string, unloadedAt?: string, destTerminal?: string) => void;
  dischargeAndCompleteTrip: (tripId: string, supervisorId?: string) => void;
  addManualContainerToTrip: (tripId: string | undefined, container: any) => void;
}

const now = new Date();
const todayISO = now.toISOString();

const todayTrip1Start = new Date(now.getTime() - 45 * 60 * 1000).toISOString();
const todayTrip2Start = new Date(now.getTime() - 95 * 60 * 1000).toISOString();
const todayTrip2Discharged = new Date(now.getTime() - 35 * 60 * 1000).toISOString();
const todayTrip4Start = new Date(now.getTime() - 150 * 60 * 1000).toISOString();
const todayTrip4End = new Date(now.getTime() - 105 * 60 * 1000).toISOString();

const yesterday = new Date(now);
yesterday.setDate(yesterday.getDate() - 1);
const yesterdayStart1 = new Date(new Date(yesterday).setHours(10, 15, 0, 0)).toISOString();
const yesterdayEnd1 = new Date(new Date(yesterday).setHours(11, 0, 0, 0)).toISOString();
const yesterdayStart2 = new Date(new Date(yesterday).setHours(14, 30, 0, 0)).toISOString();
const yesterdayEnd2 = new Date(new Date(yesterday).setHours(15, 12, 0, 0)).toISOString();
const yesterdayISO = yesterdayStart1;

const threeDaysAgo = new Date(now);
threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
const threeDaysAgoStart = new Date(new Date(threeDaysAgo).setHours(9, 20, 0, 0)).toISOString();
const threeDaysAgoEnd = new Date(new Date(threeDaysAgo).setHours(10, 5, 0, 0)).toISOString();
const threeDaysAgoISO = threeDaysAgoStart;

const tenDaysAgo = new Date(now);
tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
const tenDaysAgoISO = tenDaysAgo.toISOString();

const initialTrips: MockTrip[] = [
  // Today's trips
  {
    id: 'TRP-1001',
    tripNumber: 'ITT-2026-0891',
    driverId: 'demo-driver',
    driverCode: 'DRV-00001',
    driverName: 'Kamal Perera',
    vehicleNumber: 'LY-6439',
    chassisNumber: 'CHE 100',
    operator: 'SCK Logistics',
    vesselName: 'MV Colombo Express',
    sourceTerminal: 'CICT',
    destTerminal: 'JCT',
    status: 'IN_PROGRESS',
    startTime: todayTrip1Start,
    createdAt: todayTrip1Start,
    operationTime: '08:15',
    dispatchTime: '08:35',
    containers: [
      { id: 'c-101', containerNumber: 'MSKU8821902', size: '20FT', isoType: '20GP', status: 'IN_TRANSIT', destTerminal: 'JCT', damageStatus: 'NONE', isReturn: false, cargoType: 'STANDARD' },
      { id: 'c-102', containerNumber: 'TGHU3301290', size: '20FT', isoType: '20GP', status: 'IN_TRANSIT', destTerminal: 'JCT', damageStatus: 'DAMAGED', isReturn: true, cargoType: 'RETURN' },
    ],
  },
  {
    id: 'TRP-1002',
    tripNumber: 'ITT-2026-0892',
    driverId: 'demo-driver',
    driverCode: 'DRV-00001',
    driverName: 'Kamal Perera',
    vehicleNumber: 'LY-6439',
    chassisNumber: 'CHE 100',
    operator: 'SCK Logistics',
    vesselName: 'MV Maersk Seletar',
    sourceTerminal: 'ECT',
    destTerminal: 'UCT',
    status: 'PENDING_APPROVAL',
    startTime: todayTrip2Start,
    createdAt: todayTrip2Start,
    operationTime: '09:00',
    dispatchTime: '09:20',
    isReturn: true,
    dischargedAt: todayTrip2Discharged,
    containers: [
      { id: 'c-103', containerNumber: 'CMAU9012347', size: '40FT', isoType: '40HC', status: 'DISCHARGED', unloadedAt: todayTrip2Discharged, destTerminal: 'UCT', damageStatus: 'NONE', isReturn: true, cargoType: 'RETURN' },
    ],
  },
  {
    id: 'TRP-1003',
    tripNumber: 'ITT-2026-0893',
    driverId: 'drv-002',
    driverCode: 'DRV-00002',
    driverName: 'Saman Silva',
    vehicleNumber: 'LY 5235',
    chassisNumber: 'SCK 101',
    operator: 'SCK Logistics',
    vesselName: 'MSC Katie',
    sourceTerminal: 'SAGT',
    destTerminal: 'CICT',
    status: 'PENDING_APPROVAL',
    startTime: todayTrip2Start,
    createdAt: todayTrip2Start,
    dischargedAt: todayTrip2Discharged,
    containers: [
      { id: 'c-104', containerNumber: 'MSCU4491022', size: '40FT', isoType: '40HC', status: 'IN_TRANSIT', destTerminal: 'CICT', damageStatus: 'DAMAGED' },
    ],
  },
  {
    id: 'TRP-1004',
    tripNumber: 'ITT-2026-0894',
    driverId: 'drv-003',
    driverCode: 'DRV-00003',
    driverName: 'Ruwan Fernando',
    vehicleNumber: 'LY 5236',
    chassisNumber: 'SCK 102',
    operator: 'SCK Logistics',
    vesselName: 'Ever Given',
    sourceTerminal: 'CWIT',
    destTerminal: 'ECT',
    status: 'COMPLETED',
    startTime: todayTrip4Start,
    endTime: todayTrip4End,
    createdAt: todayTrip4Start,
    dischargedAt: todayTrip4End,
    containers: [
      { id: 'c-105', containerNumber: 'EGLV7712300', size: '20FT', isoType: '20GP', status: 'DISCHARGED', unloadedAt: todayTrip4End, destTerminal: 'ECT', damageStatus: 'NONE' },
    ],
  },
  // Yesterday's trips
  {
    id: 'TRP-1005',
    tripNumber: 'ITT-2026-0880',
    driverId: 'demo-driver',
    driverCode: 'DRV-00001',
    driverName: 'Kamal Perera',
    vehicleNumber: 'LY-6439',
    chassisNumber: 'CHE 100',
    operator: 'SCK Logistics',
    vesselName: 'COSCO Shipping',
    sourceTerminal: 'JCT',
    destTerminal: 'CICT',
    status: 'COMPLETED',
    startTime: yesterdayStart1,
    endTime: yesterdayEnd1,
    createdAt: yesterdayStart1,
    dischargedAt: yesterdayEnd1,
    containers: [
      { id: 'c-106', containerNumber: 'COSU1238993', size: '40FT', status: 'DISCHARGED', unloadedAt: yesterdayEnd1, destTerminal: 'CICT', damageStatus: 'NONE' },
    ],
  },
  {
    id: 'TRP-1006',
    tripNumber: 'ITT-2026-0881',
    driverId: 'drv-011',
    driverCode: 'DRV-00011',
    driverName: 'Roshan Mahanama',
    vehicleNumber: 'LY-6528',
    chassisNumber: 'CHE 115',
    operator: 'SDR LINK',
    vesselName: 'ONE Continuity',
    sourceTerminal: 'UCT',
    destTerminal: 'SAGT',
    status: 'COMPLETED',
    startTime: yesterdayStart2,
    endTime: yesterdayEnd2,
    createdAt: yesterdayStart2,
    dischargedAt: yesterdayEnd2,
    containers: [
      { id: 'c-107a', containerNumber: 'ONEU5541215', size: '20FT', status: 'DISCHARGED', unloadedAt: yesterdayISO, destTerminal: 'SAGT', damageStatus: 'NONE' },
      { id: 'c-107b', containerNumber: 'ONEU5541370', size: '20FT', status: 'DISCHARGED', unloadedAt: yesterdayISO, destTerminal: 'SAGT', damageStatus: 'NONE' },
    ],
  },
  // Weekly / Monthly Trips
  {
    id: 'TRP-1007',
    tripNumber: 'ITT-2026-0850',
    driverId: 'drv-017',
    driverCode: 'DRV-00017',
    driverName: 'Kumar Sangakkara',
    vehicleNumber: 'LY-6530',
    chassisNumber: 'CHE 119',
    chaiNumber: 'CHE 119',
    operator: 'SDR LINK',
    vesselName: 'Hapag-Lloyd Express',
    sourceTerminal: 'CICT',
    destTerminal: 'ECT',
    status: 'COMPLETED',
    startTime: threeDaysAgoISO,
    endTime: threeDaysAgoISO,
    createdAt: threeDaysAgoISO,
    dischargedAt: threeDaysAgoISO,
    containers: [
      { id: 'c-108a', containerNumber: 'HLXU9901233', size: '20FT', status: 'DISCHARGED', unloadedAt: threeDaysAgoISO, destTerminal: 'ECT', damageStatus: 'NONE' },
      { id: 'c-108b', containerNumber: 'HLXU9901399', size: '20FT', status: 'DISCHARGED', unloadedAt: threeDaysAgoISO, destTerminal: 'ECT', damageStatus: 'DAMAGED' },
    ],
  },
  {
    id: 'TRP-1008',
    tripNumber: 'ITT-2026-0800',
    driverId: 'demo-driver',
    driverCode: 'DRV-00001',
    driverName: 'Kamal Perera',
    vehicleNumber: 'LY-6439',
    chassisNumber: 'CHE 100',
    operator: 'SCK Logistics',
    vesselName: 'Yang Ming Target',
    sourceTerminal: 'ECT',
    destTerminal: 'CWIT',
    status: 'COMPLETED',
    startTime: tenDaysAgoISO,
    endTime: tenDaysAgoISO,
    createdAt: tenDaysAgoISO,
    dischargedAt: tenDaysAgoISO,
    containers: [
      { id: 'c-109', containerNumber: 'YMLU7761258', size: '40FT', status: 'DISCHARGED', unloadedAt: tenDaysAgoISO, destTerminal: 'CWIT', damageStatus: 'NONE' },
    ],
  },
];

export const useMockTripStore = create<MockTripState>((set, get) => ({
  mockTrips: initialTrips,

  addTrip: (trip) => {
    const resolvedChe = resolveCheNumber(trip.vehicleNumber, trip.chassisNumber || trip.chaiNumber);
    const resolvedOp = resolveOperator(trip.vehicleNumber, trip.operator);
    const normalizedTrip: MockTrip = {
      ...trip,
      chassisNumber: resolvedChe,
      chaiNumber: resolvedChe,
      operator: resolvedOp,
    };
    set((state) => ({ mockTrips: [normalizedTrip, ...state.mockTrips] }));
  },

  updateTripStatus: (id, status) =>
    set((state) => ({
      mockTrips: state.mockTrips.map((t) =>
        t.id === id
          ? {
              ...t,
              status,
              ...(status === 'COMPLETED' || status === 'APPROVED'
                ? { endTime: t.endTime || new Date().toISOString(), dischargedAt: t.dischargedAt || new Date().toISOString() }
                : {}),
            }
          : t
      ),
    })),

  getTripsForDriver: (driverId) =>
    get().mockTrips.filter((t) => t.driverId === driverId || driverId === 'ALL'),

  getPendingTrips: () => get().mockTrips.filter((t) => t.status === 'PENDING_APPROVAL'),

  unloadContainer: (tripId, containerId, unloadedAt, destTerminal) =>
    set((state) => {
      const time = unloadedAt || new Date().toISOString();
      const newTrips = state.mockTrips.map((t) => {
        if (t.id !== tripId) return t;
        const newContainers = t.containers.map((c) =>
          c.id === containerId
            ? { ...c, status: 'DISCHARGED' as const, unloadedAt: time, unloadedTerminal: destTerminal || c.destTerminal || t.destTerminal }
            : c
        );
        // Automatically set status to PENDING_APPROVAL when discharged
        return {
          ...t,
          status: 'PENDING_APPROVAL' as const,
          dischargedAt: time,
          containers: newContainers,
        };
      });
      return { mockTrips: newTrips };
    }),

  dischargeAndCompleteTrip: (tripId, supervisorId) =>
    set((state) => {
      const time = new Date().toISOString();
      const newTrips = state.mockTrips.map((t) => {
        if (t.id !== tripId) return t;
        const newContainers = (t.containers || []).map((c) => ({
          ...c,
          status: 'DISCHARGED' as const,
          unloadedAt: c.unloadedAt || time,
          unloadedTerminal: c.unloadedTerminal || t.destTerminal,
        }));
        return {
          ...t,
          status: 'COMPLETED' as const,
          endTime: time,
          dischargedAt: t.dischargedAt || time,
          containers: newContainers,
        };
      });
      return { mockTrips: newTrips };
    }),

  addManualContainerToTrip: (tripId, container) =>
    set((state) => {
      if (!tripId) return state;
      const newTrips = state.mockTrips.map((t) => {
        if (t.id !== tripId) return t;
        return {
          ...t,
          containers: [...(t.containers || []), { id: `c-${Date.now()}`, ...container }],
        };
      });
      return { mockTrips: newTrips };
    }),
}));
