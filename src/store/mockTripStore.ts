import { create } from 'zustand';

export interface MockContainer {
  id: string;
  containerNumber: string;
  size?: '20FT' | '40FT' | '40HC' | string;
  isoType?: string;
  destTerminal?: string;
  status?: 'LOCKED' | 'IN_TRANSIT' | 'DISCHARGED';
  unloadedAt?: string;
  unloadedTerminal?: string;
}

export interface MockTrip {
  id: string;
  tripNumber: string;
  driverId: string;
  driverName: string;
  vehicleNumber: string;
  chassisNumber?: string;
  chaiNumber?: string;
  vesselName: string;
  voyageNumber?: string;
  operationDate?: string;
  operationTime?: string;
  sourceTerminal?: string;
  destTerminal: string;
  notes?: string;
  status: 'PENDING_APPROVAL' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED' | 'APPROVED';
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

const yesterday = new Date(now);
yesterday.setDate(yesterday.getDate() - 1);
const yesterdayISO = yesterday.toISOString();

const threeDaysAgo = new Date(now);
threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
const threeDaysAgoISO = threeDaysAgo.toISOString();

const tenDaysAgo = new Date(now);
tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
const tenDaysAgoISO = tenDaysAgo.toISOString();

const initialTrips: MockTrip[] = [
  // Today's trips
  {
    id: 'TRP-1001',
    tripNumber: 'ITT-2026-0891',
    driverId: 'demo-driver',
    driverName: 'Kamal Perera',
    vehicleNumber: 'WP-BA-1234',
    chassisNumber: 'CHAI-102',
    vesselName: 'MV Colombo Express',
    sourceTerminal: 'CICT',
    destTerminal: 'JCT',
    status: 'IN_PROGRESS',
    startTime: todayISO,
    createdAt: todayISO,
    containers: [
      { id: 'c-101', containerNumber: 'MSKU-88219-0', size: '40FT', isoType: '40HC', status: 'IN_TRANSIT', destTerminal: 'JCT' },
      { id: 'c-102', containerNumber: 'TGHU-33012-9', size: '20FT', isoType: '20GP', status: 'IN_TRANSIT', destTerminal: 'JCT' },
    ],
  },
  {
    id: 'TRP-1002',
    tripNumber: 'ITT-2026-0892',
    driverId: 'demo-driver',
    driverName: 'Kamal Perera',
    vehicleNumber: 'WP-BA-1234',
    chassisNumber: 'CHAI-102',
    vesselName: 'MV Maersk Seletar',
    sourceTerminal: 'ECT',
    destTerminal: 'UCT',
    status: 'PENDING_APPROVAL',
    startTime: todayISO,
    createdAt: todayISO,
    dischargedAt: todayISO,
    containers: [
      { id: 'c-103', containerNumber: 'CMAU-90123-4', size: '40FT', isoType: '40HC', status: 'DISCHARGED', unloadedAt: todayISO, destTerminal: 'UCT' },
    ],
  },
  {
    id: 'TRP-1003',
    tripNumber: 'ITT-2026-0893',
    driverId: 'drv-002',
    driverName: 'Saman Kumara',
    vehicleNumber: 'WP-DA-5567',
    chassisNumber: 'CHAI-405',
    vesselName: 'MSC Katie',
    sourceTerminal: 'SAGT',
    destTerminal: 'CICT',
    status: 'PENDING_APPROVAL',
    startTime: todayISO,
    createdAt: todayISO,
    containers: [
      { id: 'c-104', containerNumber: 'MSCU-44910-2', size: '40FT', isoType: '40HC', status: 'IN_TRANSIT', destTerminal: 'CICT' },
    ],
  },
  {
    id: 'TRP-1004',
    tripNumber: 'ITT-2026-0894',
    driverId: 'drv-003',
    driverName: 'Nimal Fernando',
    vehicleNumber: 'WP-GA-9912',
    chassisNumber: 'CHAI-208',
    vesselName: 'Ever Given',
    sourceTerminal: 'CWIT',
    destTerminal: 'ECT',
    status: 'COMPLETED',
    startTime: todayISO,
    endTime: todayISO,
    createdAt: todayISO,
    dischargedAt: todayISO,
    containers: [
      { id: 'c-105', containerNumber: 'EGLV-77123-0', size: '20FT', isoType: '20GP', status: 'DISCHARGED', unloadedAt: todayISO, destTerminal: 'ECT' },
    ],
  },
  // Yesterday's trips
  {
    id: 'TRP-1005',
    tripNumber: 'ITT-2026-0880',
    driverId: 'demo-driver',
    driverName: 'Kamal Perera',
    vehicleNumber: 'WP-BA-1234',
    chassisNumber: 'CHAI-102',
    vesselName: 'COSCO Shipping',
    sourceTerminal: 'JCT',
    destTerminal: 'CICT',
    status: 'COMPLETED',
    startTime: yesterdayISO,
    endTime: yesterdayISO,
    createdAt: yesterdayISO,
    dischargedAt: yesterdayISO,
    containers: [
      { id: 'c-106', containerNumber: 'COSU-12389-9', size: '40FT', status: 'DISCHARGED', unloadedAt: yesterdayISO, destTerminal: 'CICT' },
    ],
  },
  {
    id: 'TRP-1006',
    tripNumber: 'ITT-2026-0881',
    driverId: 'drv-002',
    driverName: 'Saman Kumara',
    vehicleNumber: 'WP-DA-5567',
    chassisNumber: 'CHAI-405',
    vesselName: 'ONE Continuity',
    sourceTerminal: 'UCT',
    destTerminal: 'SAGT',
    status: 'COMPLETED',
    startTime: yesterdayISO,
    endTime: yesterdayISO,
    createdAt: yesterdayISO,
    dischargedAt: yesterdayISO,
    containers: [
      { id: 'c-107', containerNumber: 'ONEU-55412-1', size: '40FT', status: 'DISCHARGED', unloadedAt: yesterdayISO, destTerminal: 'SAGT' },
    ],
  },
  // Weekly / Monthly Trips
  {
    id: 'TRP-1007',
    tripNumber: 'ITT-2026-0850',
    driverId: 'drv-004',
    driverName: 'Sunil Silva',
    vehicleNumber: 'WP-LA-3344',
    chassisNumber: 'CHAI-601',
    vesselName: 'Hapag-Lloyd Express',
    sourceTerminal: 'CICT',
    destTerminal: 'ECT',
    status: 'COMPLETED',
    startTime: threeDaysAgoISO,
    endTime: threeDaysAgoISO,
    createdAt: threeDaysAgoISO,
    dischargedAt: threeDaysAgoISO,
    containers: [
      { id: 'c-108', containerNumber: 'HLXU-99012-3', size: '20FT', status: 'DISCHARGED', unloadedAt: threeDaysAgoISO, destTerminal: 'ECT' },
    ],
  },
  {
    id: 'TRP-1008',
    tripNumber: 'ITT-2026-0800',
    driverId: 'demo-driver',
    driverName: 'Kamal Perera',
    vehicleNumber: 'WP-BA-1234',
    chassisNumber: 'CHAI-102',
    vesselName: 'Yang Ming Target',
    sourceTerminal: 'ECT',
    destTerminal: 'CWIT',
    status: 'COMPLETED',
    startTime: tenDaysAgoISO,
    endTime: tenDaysAgoISO,
    createdAt: tenDaysAgoISO,
    dischargedAt: tenDaysAgoISO,
    containers: [
      { id: 'c-109', containerNumber: 'YMLU-77612-5', size: '40FT', status: 'DISCHARGED', unloadedAt: tenDaysAgoISO, destTerminal: 'CWIT' },
    ],
  },
];

export const useMockTripStore = create<MockTripState>((set, get) => ({
  mockTrips: initialTrips,

  addTrip: (trip) => set((state) => ({ mockTrips: [trip, ...state.mockTrips] })),

  updateTripStatus: (id, status) =>
    set((state) => ({
      mockTrips: state.mockTrips.map((t) =>
        t.id === id
          ? {
              ...t,
              status,
              ...(status === 'COMPLETED' || status === 'APPROVED' ? { endTime: new Date().toISOString() } : {}),
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
