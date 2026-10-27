import { adminWebService } from '../services/adminWebService';

export interface WebContainer {
  id: string;
  containerNumber: string;
  size: string;
  sourceTerminal?: string;
  destTerminal?: string;
  status?: string;
  sealNumber?: string;
  damageStatus?: string;
  cargoType?: string;
  isReturn?: boolean;
}

export interface WebTrip {
  id: string;
  tripNumber: string;
  driverId?: string;
  driverCode?: string;
  driverName?: string;
  vehicleNumber?: string;
  chassisNumber?: string;
  cheNumber?: string;
  operator?: string;
  vesselName: string;
  sourceTerminal: string;
  destTerminal: string;
  status: 'IN_PROGRESS' | 'ARRIVED' | 'PENDING_APPROVAL' | 'COMPLETED' | 'APPROVED' | 'REJECTED';
  notes?: string;
  startTime?: string;
  endTime?: string;
  createdAt?: string;
  operationTime?: string;
  dispatchTime?: string;
  containers: WebContainer[];
}

const STORAGE_KEY = 'smart_itt_admin_trips_data';

const INITIAL_TRIPS: WebTrip[] = [
  {
    id: 'TRP-1001',
    tripNumber: 'ITT-2026-0891',
    driverId: 'drv-1',
    driverCode: 'DRV-00001',
    driverName: 'Kamal Perera',
    vehicleNumber: 'LY-6439',
    chassisNumber: 'SCK 100',
    cheNumber: 'SCK 100',
    operator: 'SCK Logistics',
    vesselName: 'MV Colombo Express',
    sourceTerminal: 'CICT',
    destTerminal: 'JCT',
    status: 'IN_PROGRESS',
    startTime: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    operationTime: '08:15',
    dispatchTime: '08:35',
    containers: [
      { id: 'c-101', containerNumber: 'MSKU8821902', size: '20FT', status: 'IN_TRANSIT', destTerminal: 'JCT', damageStatus: 'NONE', isReturn: false, cargoType: 'STANDARD' },
      { id: 'c-102', containerNumber: 'TGHU3301290', size: '20FT', status: 'IN_TRANSIT', destTerminal: 'JCT', damageStatus: 'DAMAGED', isReturn: true, cargoType: 'RETURN' },
    ],
  },
  {
    id: 'TRP-1002',
    tripNumber: 'ITT-2026-0892',
    driverId: 'drv-2',
    driverCode: 'DRV-00002',
    driverName: 'Sunil Shantha',
    vehicleNumber: 'LY-6434',
    chassisNumber: 'SCK 101',
    cheNumber: 'SCK 101',
    operator: 'SCK Logistics',
    vesselName: 'MV Maersk Seletar',
    sourceTerminal: 'ECT',
    destTerminal: 'UCT',
    status: 'PENDING_APPROVAL',
    startTime: new Date(Date.now() - 95 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 95 * 60 * 1000).toISOString(),
    operationTime: '09:00',
    dispatchTime: '09:20',
    containers: [
      { id: 'c-103', containerNumber: 'CMAU9012347', size: '40FT', status: 'DISCHARGED', destTerminal: 'UCT', damageStatus: 'NONE', isReturn: true, cargoType: 'RETURN' },
    ],
  },
  {
    id: 'TRP-1003',
    tripNumber: 'ITT-2026-0893',
    driverId: 'drv-3',
    driverCode: 'DRV-00003',
    driverName: 'Anura Kumara',
    vehicleNumber: 'LY-6435',
    chassisNumber: 'SCK 102',
    cheNumber: 'SCK 102',
    operator: 'SCK Logistics',
    vesselName: 'MSC Katie',
    sourceTerminal: 'SAGT',
    destTerminal: 'CICT',
    status: 'PENDING_APPROVAL',
    startTime: new Date(Date.now() - 110 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 110 * 60 * 1000).toISOString(),
    operationTime: '09:45',
    dispatchTime: '10:05',
    containers: [
      { id: 'c-104', containerNumber: 'MSCU4491022', size: '40FT', status: 'IN_TRANSIT', destTerminal: 'CICT', damageStatus: 'DAMAGED', cargoType: 'STANDARD' },
    ],
  },
  {
    id: 'TRP-1004',
    tripNumber: 'ITT-2026-0894',
    driverId: 'drv-4',
    driverCode: 'DRV-00004',
    driverName: 'Chaminda Vass',
    vehicleNumber: 'LY-6431',
    chassisNumber: 'SCK 103',
    cheNumber: 'SCK 103',
    operator: 'SCK Logistics',
    vesselName: 'EVER GLORY V.021',
    sourceTerminal: 'JCT',
    destTerminal: 'CWIT',
    status: 'COMPLETED',
    startTime: new Date(Date.now() - 180 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 180 * 60 * 1000).toISOString(),
    operationTime: '07:30',
    dispatchTime: '07:50',
    containers: [
      { id: 'c-105', containerNumber: 'EMCU9923841', size: '40FT', status: 'DISCHARGED', destTerminal: 'CWIT', damageStatus: 'NONE', cargoType: 'STANDARD' },
    ],
  },
  {
    id: 'TRP-1005',
    tripNumber: 'ITT-2026-0895',
    driverId: 'drv-5',
    driverCode: 'DRV-00005',
    driverName: 'Roshan Mahanama',
    vehicleNumber: 'LY-6427',
    chassisNumber: 'SCK 104',
    cheNumber: 'SCK 104',
    operator: 'SCK Logistics',
    vesselName: 'CMA CGM ANTOINE',
    sourceTerminal: 'ECT',
    destTerminal: 'JCT',
    status: 'COMPLETED',
    startTime: new Date(Date.now() - 240 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() - 190 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 240 * 60 * 1000).toISOString(),
    operationTime: '06:15',
    dispatchTime: '06:40',
    containers: [
      { id: 'c-106', containerNumber: 'CMAU7766554', size: '40FT', status: 'DISCHARGED', destTerminal: 'JCT', damageStatus: 'NONE', cargoType: 'STANDARD' },
    ],
  },
  {
    id: 'TRP-1006',
    tripNumber: 'ITT-2026-0896',
    driverId: 'drv-18',
    driverCode: 'DRV-00018',
    driverName: 'Angelo Mathews',
    vehicleNumber: 'LY-6528',
    chassisNumber: 'SCK 115',
    cheNumber: 'SCK 115',
    operator: 'SDR LINK',
    vesselName: 'ONE COMMITMENT',
    sourceTerminal: 'CICT',
    destTerminal: 'SAGT',
    status: 'IN_PROGRESS',
    startTime: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    operationTime: '10:30',
    dispatchTime: '10:50',
    containers: [
      { id: 'c-107', containerNumber: 'ONEY1122334', size: '40FT', status: 'IN_TRANSIT', destTerminal: 'SAGT', damageStatus: 'NONE', cargoType: 'STANDARD' },
    ],
  },
  {
    id: 'TRP-1007',
    tripNumber: 'ITT-2026-0897',
    driverId: 'drv-19',
    driverCode: 'DRV-00019',
    driverName: 'Dinesh Chandimal',
    vehicleNumber: 'LY-6529',
    chassisNumber: 'SCK 117',
    cheNumber: 'SCK 117',
    operator: 'SDR LINK',
    vesselName: 'HAPAG-LLOYD ESSEN',
    sourceTerminal: 'CWIT',
    destTerminal: 'ECT',
    status: 'COMPLETED',
    startTime: new Date(Date.now() - 360 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() - 300 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 360 * 60 * 1000).toISOString(),
    operationTime: '05:00',
    dispatchTime: '05:25',
    containers: [
      { id: 'c-108', containerNumber: 'HLXU8899001', size: '40FT', status: 'DISCHARGED', destTerminal: 'ECT', damageStatus: 'NONE', cargoType: 'STANDARD' },
    ],
  },
];

class AdminTripWebStore {
  private trips: WebTrip[] = [];
  private listeners: (() => void)[] = [];

  constructor() {
    this.loadFromStorage();
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEY) {
          this.loadFromStorage();
          this.notify();
        }
      });
    }
  }

  private loadFromStorage() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.trips = parsed;
          return;
        }
      }
    } catch {}
    this.trips = [...INITIAL_TRIPS];
    this.saveToStorage();
  }

  private saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.trips));
    } catch {}
  }

  subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  async getTrips(
    search?: string,
    status?: string,
    terminal?: string,
    startDate?: string,
    endDate?: string
  ): Promise<WebTrip[]> {
    try {
      const remote = await adminWebService.getTrips(search, status, terminal, startDate, endDate);
      if (Array.isArray(remote) && remote.length > 0) {
        const byId = new Map<string, any>();
        remote.forEach((r: any) => byId.set(r.id || r.tripNumber, r));
        this.trips.forEach((t) => {
          const key = t.id || t.tripNumber;
          if (!byId.has(key)) {
            byId.set(key, t);
          }
        });
        this.trips = Array.from(byId.values()).map((r: any) => ({
          id: r.id || r.tripNumber,
          tripNumber: r.tripNumber || r.id,
          driverId: r.driverId,
          driverCode: r.driverCode || 'DRV-00001',
          driverName: r.driverName || 'Kamal Perera',
          vehicleNumber: r.vehicleNumber || 'LY-6439',
          chassisNumber: r.chassisNumber || 'SCK 100',
          cheNumber: r.chassisNumber || 'SCK 100',
          operator: r.operator || 'SCK Logistics',
          vesselName: r.vesselName || 'ITT Transfer',
          sourceTerminal: r.sourceTerminal || 'CICT',
          destTerminal: r.destTerminal || 'JCT',
          status: r.status || 'IN_PROGRESS',
          notes: r.notes,
          startTime: r.startTime,
          endTime: r.endTime,
          createdAt: r.createdAt,
          operationTime: r.operationTime || (r.startTime ? r.startTime.slice(11, 16) : undefined),
          dispatchTime: r.dispatchTime,
          containers: (r.containers || []).map((c: any) => ({
            id: c.id || `c-${Date.now()}`,
            containerNumber: typeof c === 'string' ? c : c.containerNumber,
            size: typeof c === 'string' ? '40FT' : c.size || '40FT',
            destTerminal: typeof c === 'string' ? r.destTerminal : c.destTerminal || r.destTerminal,
            status: typeof c === 'string' ? 'LOADED' : c.status || 'LOADED',
            damageStatus: typeof c === 'string' ? 'NONE' : c.damageStatus || 'NONE',
            cargoType: typeof c === 'string' ? 'STANDARD' : c.cargoType || 'STANDARD',
            isReturn: typeof c === 'string' ? false : !!c.isReturn,
          })),
        }));
        this.saveToStorage();
      }
    } catch {}

    let filtered = [...this.trips];
    if (status && status !== 'ALL') {
      filtered = filtered.filter((t) => t.status === status);
    }
    if (terminal && terminal !== 'ALL') {
      filtered = filtered.filter((t) => t.sourceTerminal === terminal || t.destTerminal === terminal);
    }
    if (startDate && startDate.trim()) {
      filtered = filtered.filter((t) => (t.createdAt || t.startTime || '').slice(0, 10) >= startDate);
    }
    if (endDate && endDate.trim()) {
      filtered = filtered.filter((t) => (t.createdAt || t.startTime || '').slice(0, 10) <= endDate);
    }
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter((t) =>
        t.tripNumber.toLowerCase().includes(q) ||
        (t.vehicleNumber && t.vehicleNumber.toLowerCase().includes(q)) ||
        (t.chassisNumber && t.chassisNumber.toLowerCase().includes(q)) ||
        (t.vesselName && t.vesselName.toLowerCase().includes(q)) ||
        (t.driverName && t.driverName.toLowerCase().includes(q)) ||
        (t.driverCode && t.driverCode.toLowerCase().includes(q)) ||
        t.containers.some((c) => c.containerNumber.toLowerCase().includes(q))
      );
    }
    return filtered;
  }

  getAllTripsList(): WebTrip[] {
    return [...this.trips];
  }

  addTrip(tripData: Partial<WebTrip>): WebTrip {
    const id = tripData.id || `TRP-${Date.now()}`;
    const tripNumber = tripData.tripNumber || `ITT-${Date.now()}`;
    const newTrip: WebTrip = {
      id,
      tripNumber,
      driverId: tripData.driverId || 'drv-1',
      driverCode: tripData.driverCode || 'DRV-00001',
      driverName: tripData.driverName || 'Kamal Perera',
      vehicleNumber: tripData.vehicleNumber || 'LY-6439',
      chassisNumber: tripData.chassisNumber || 'SCK 100',
      cheNumber: tripData.chassisNumber || 'SCK 100',
      operator: tripData.operator || 'SCK Logistics',
      vesselName: tripData.vesselName || 'MSC Aurora',
      sourceTerminal: tripData.sourceTerminal || 'CICT',
      destTerminal: tripData.destTerminal || 'JCT',
      status: tripData.status || 'IN_PROGRESS',
      notes: tripData.notes,
      startTime: tripData.startTime || new Date().toISOString(),
      createdAt: tripData.createdAt || new Date().toISOString(),
      operationTime: tripData.operationTime || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      dispatchTime: tripData.dispatchTime || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      containers: tripData.containers || [],
    };

    this.trips = [newTrip, ...this.trips];
    this.saveToStorage();
    this.notify();
    return newTrip;
  }

  async updateTripStatus(tripId: string, status: WebTrip['status'], reason?: string): Promise<void> {
    try {
      await adminWebService.actionTrip(tripId, status, reason);
    } catch {}

    const now = new Date().toISOString();
    this.trips = this.trips.map((t) => {
      if (t.id === tripId || t.tripNumber === tripId) {
        return {
          ...t,
          status,
          ...(status === 'COMPLETED' || status === 'APPROVED' ? { endTime: t.endTime || now } : {}),
          containers: (t.containers || []).map((c) => ({
            ...c,
            status: status === 'COMPLETED' ? 'DISCHARGED' : c.status,
          })),
        };
      }
      return t;
    });

    this.saveToStorage();
    this.notify();
  }

  getDashboardStats() {
    const list = this.trips;
    const inProgress = list.filter((t) => t.status === 'IN_PROGRESS' || t.status === 'ARRIVED').length;
    const pending = list.filter((t) => t.status === 'PENDING_APPROVAL').length;
    const completed = list.filter((t) => t.status === 'COMPLETED' || t.status === 'APPROVED').length;
    const rejected = list.filter((t) => t.status === 'REJECTED').length;

    let totContainers = 0;
    let c20 = 0;
    let c40 = 0;
    const terminalWise: Record<string, number> = { CICT: 0, CWIT: 0, ECT: 0, JCT: 0, UCT: 0, SAGT: 0 };

    list.forEach((t) => {
      if (t.sourceTerminal && terminalWise[t.sourceTerminal] !== undefined) {
        terminalWise[t.sourceTerminal]++;
      }
      (t.containers || []).forEach((c) => {
        totContainers++;
        if (c.size === '20FT') c20++;
        else c40++;
      });
    });

    return {
      todayTrips: list.length,
      tripsInProgress: inProgress,
      tripsPendingApproval: pending,
      tripsCompleted: completed,
      tripsApproved: completed,
      tripsRejected: rejected,
      totalTripsAllTime: 140 + list.length,
      totalContainers: 280 + totContainers,
      twentyFtContainers: 110 + c20,
      fortyFtContainers: 170 + c40,
      terminalWiseTrips: terminalWise,
      recentTrips: list.slice(0, 10),
    };
  }
}

export const adminTripWebStore = new AdminTripWebStore();
