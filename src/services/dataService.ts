import {
  TerminalInfo,
  FleetVehicle,
  DriverRecord,
  IttTrip,
  BroadcastAlert,
  DashboardStats,
  AccountStatus,
  SupervisorRecord,
  DriverShiftStatus,
} from '../types';
import {
  INITIAL_TERMINALS,
  INITIAL_VEHICLES,
  INITIAL_DRIVERS,
  INITIAL_TRIPS,
  INITIAL_ALERTS,
  INITIAL_SUPERVISORS,
} from '../data/initialData';

const BACKEND_URL = 'http://localhost:8080/api/v1';
const API_KEY = 'smart-itt-sec-key-prod-2026';

const STORAGE_KEYS = {
  VEHICLES: 'smart_itt_admin_vehicles_v1',
  DRIVERS: 'smart_itt_admin_drivers_v1',
  TRIPS: 'smart_itt_admin_trips_v1',
  ALERTS: 'smart_itt_admin_alerts_v1',
  TERMINALS: 'smart_itt_admin_terminals_v1',
  SUPERVISORS: 'smart_itt_admin_supervisors_v1',
};

function loadStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function saveStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to save to local storage', err);
  }
}

class AdminDataService {
  private terminals: TerminalInfo[] = loadStorage(STORAGE_KEYS.TERMINALS, INITIAL_TERMINALS);
  private vehicles: FleetVehicle[] = loadStorage(STORAGE_KEYS.VEHICLES, INITIAL_VEHICLES);
  private drivers: DriverRecord[] = loadStorage(STORAGE_KEYS.DRIVERS, INITIAL_DRIVERS);
  private trips: IttTrip[] = loadStorage(STORAGE_KEYS.TRIPS, INITIAL_TRIPS);
  private alerts: BroadcastAlert[] = loadStorage(STORAGE_KEYS.ALERTS, INITIAL_ALERTS);
  private supervisors: SupervisorRecord[] = loadStorage(STORAGE_KEYS.SUPERVISORS, INITIAL_SUPERVISORS);
  private backendOnline: boolean = false;
  private listeners: (() => void)[] = [];

  constructor() {
    this.probeBackend();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(): void {
    this.listeners.forEach((fn) => fn());
  }

  public async probeBackend(): Promise<boolean> {
    try {
      const res = await fetch(`${BACKEND_URL}/dashboard`, {
        headers: { 'X-API-KEY': API_KEY },
        signal: AbortSignal.timeout(2000),
      });
      this.backendOnline = res.ok;
      return res.ok;
    } catch {
      this.backendOnline = false;
      return false;
    }
  }

  public isBackendOnline(): boolean {
    return this.backendOnline;
  }

  public getDashboardStats(): DashboardStats {
    const totalTripsToday = this.trips.length + 10;
    const activeTrips = this.trips.filter((t) => t.status === 'IN_PROGRESS').length;
    const tripsPendingApproval = this.trips.filter((t) => t.status === 'PENDING_APPROVAL').length;
    const completedTripsToday = this.trips.filter((t) => t.status === 'COMPLETED').length + 8;
    const approvedTrips = this.trips.filter((t) => t.status === 'APPROVED' || t.status === 'IN_PROGRESS').length;
    const rejectedTrips = this.trips.filter((t) => t.status === 'REJECTED').length;

    let totalContainers = 0;
    let totalTeu = 0;
    this.trips.forEach((t) => {
      totalContainers += t.containers.length;
      t.containers.forEach((c) => {
        totalTeu += c.size === '40FT' ? 2 : 1;
      });
    });

    const activeDrivers = this.drivers.filter((d) => d.status === 'ACTIVE').length;
    const activeVehicles = this.vehicles.filter((v) => v.status === 'ACTIVE' || v.status === 'IN_TRANSIT').length;

    const terminalCounts: Record<string, number> = {
      CICT: 14,
      CWIT: 9,
      ECT: 11,
      JCT: 16,
      UCT: 6,
      SAGT: 12,
    };

    return {
      totalTripsToday,
      activeTrips,
      tripsPendingApproval,
      completedTripsToday,
      approvedTrips,
      rejectedTrips,
      totalContainersTransportedToday: totalContainers + 24,
      totalTeuToday: totalTeu + 38,
      registeredDrivers: this.drivers.length,
      activeDrivers,
      totalVehicles: this.vehicles.length,
      activeVehicles,
      terminalWiseTrips: terminalCounts,
    };
  }

  public getTerminals(): TerminalInfo[] {
    return [...this.terminals];
  }

  public getVehicles(): FleetVehicle[] {
    return [...this.vehicles];
  }

  public getVehicleById(id: string): FleetVehicle | undefined {
    return this.vehicles.find((v) => v.id === id);
  }

  public updateVehicleStatus(id: string, status: FleetVehicle['status']): void {
    this.vehicles = this.vehicles.map((v) => (v.id === id ? { ...v, status } : v));
    saveStorage(STORAGE_KEYS.VEHICLES, this.vehicles);
    this.notify();
  }

  public addVehicle(data: Omit<FleetVehicle, 'id'>): FleetVehicle {
    const newVehicle: FleetVehicle = {
      ...data,
      id: `fl-${Date.now()}`,
    };
    this.vehicles = [newVehicle, ...this.vehicles];
    saveStorage(STORAGE_KEYS.VEHICLES, this.vehicles);
    this.notify();
    return newVehicle;
  }

  public updateVehicle(updated: FleetVehicle): void {
    this.vehicles = this.vehicles.map((v) => (v.id === updated.id ? updated : v));
    saveStorage(STORAGE_KEYS.VEHICLES, this.vehicles);
    this.notify();
  }

  public getDrivers(): DriverRecord[] {
    return [...this.drivers];
  }

  public getDriverById(id: string): DriverRecord | undefined {
    return this.drivers.find((d) => d.id === id);
  }

  public updateDriverStatus(id: string, status: AccountStatus): void {
    this.drivers = this.drivers.map((d) => (d.id === id ? { ...d, status } : d));
    saveStorage(STORAGE_KEYS.DRIVERS, this.drivers);
    this.notify();
  }

  public addDriver(data: Omit<DriverRecord, 'id' | 'driverCode' | 'tripsCompleted' | 'activeTrips' | 'rating' | 'totalEarnedAllowance' | 'joinedDate'>): DriverRecord {
    const nextNum = this.drivers.length + 1;
    const driverCode = `DRV-${String(nextNum).padStart(5, '0')}`;
    const newDriver: DriverRecord = {
      ...data,
      id: `drv-${Date.now()}`,
      driverCode,
      tripsCompleted: 0,
      activeTrips: 0,
      rating: 5.0,
      totalEarnedAllowance: 0,
      joinedDate: new Date().toISOString().split('T')[0],
      profilePhoto: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80',
    };
    this.drivers = [newDriver, ...this.drivers];
    saveStorage(STORAGE_KEYS.DRIVERS, this.drivers);
    this.notify();
    return newDriver;
  }

  public getTrips(): IttTrip[] {
    return [...this.trips];
  }

  public getTripById(id: string): IttTrip | undefined {
    return this.trips.find((t) => t.id === id);
  }

  public approveTrip(tripId: string, supervisorName = 'Admin Dispatch Control (HQ)'): void {
    const now = new Date().toISOString().replace('T', ' ').slice(0, 16);
    this.trips = this.trips.map((t) =>
      t.id === tripId
        ? {
            ...t,
            status: 'APPROVED',
            approvedBy: supervisorName,
            approvedAt: now,
          }
        : t
    );
    // Update supervisor approval count
    this.supervisors = this.supervisors.map((s) =>
      s.fullName.toLowerCase().includes(supervisorName.toLowerCase()) || supervisorName.toLowerCase().includes(s.fullName.toLowerCase())
        ? { ...s, approvalsToday: s.approvalsToday + 1 }
        : s
    );
    saveStorage(STORAGE_KEYS.TRIPS, this.trips);
    saveStorage(STORAGE_KEYS.SUPERVISORS, this.supervisors);
    this.notify();
  }

  public rejectTrip(tripId: string, reason: string, supervisorName = 'Admin Dispatch Control (HQ)'): void {
    const now = new Date().toISOString().replace('T', ' ').slice(0, 16);
    this.trips = this.trips.map((t) =>
      t.id === tripId
        ? {
            ...t,
            status: 'REJECTED',
            rejectionReason: reason,
            approvedBy: supervisorName,
            approvedAt: now,
          }
        : t
    );
    // Update supervisor rejection count
    this.supervisors = this.supervisors.map((s) =>
      s.fullName.toLowerCase().includes(supervisorName.toLowerCase()) || supervisorName.toLowerCase().includes(s.fullName.toLowerCase())
        ? { ...s, rejectionsToday: s.rejectionsToday + 1 }
        : s
    );
    saveStorage(STORAGE_KEYS.TRIPS, this.trips);
    saveStorage(STORAGE_KEYS.SUPERVISORS, this.supervisors);
    this.notify();
  }

  // ─── SUPERVISOR OPERATIONS ───
  public getSupervisors(): SupervisorRecord[] {
    return [...this.supervisors];
  }

  public updateSupervisorStatus(id: string, status: SupervisorRecord['status']): void {
    this.supervisors = this.supervisors.map((s) => (s.id === id ? { ...s, status } : s));
    saveStorage(STORAGE_KEYS.SUPERVISORS, this.supervisors);
    this.notify();
  }

  public updateDriverShiftStatus(id: string, shiftStatus: DriverShiftStatus): void {
    this.drivers = this.drivers.map((d) => (d.id === id ? { ...d, shiftStatus } : d));
    saveStorage(STORAGE_KEYS.DRIVERS, this.drivers);
    this.notify();
  }

  public reassignDriverVehicle(driverId: string, cheNumber: string): void {
    const targetVehicle = this.vehicles.find((v) => v.cheNumber === cheNumber);
    const vehicleNumber = targetVehicle ? targetVehicle.vehicleNumber : '';
    const driver = this.drivers.find((d) => d.id === driverId);

    this.drivers = this.drivers.map((d) => (d.id === driverId ? { ...d, cheNumber, vehicleNumber } : d));
    if (targetVehicle && driver) {
      this.vehicles = this.vehicles.map((v) =>
        v.cheNumber === cheNumber
          ? {
              ...v,
              driverCode: driver.driverCode,
              driverName: driver.fullName,
              driverMobile: driver.mobileNumber,
            }
          : v
      );
      saveStorage(STORAGE_KEYS.VEHICLES, this.vehicles);
    }
    saveStorage(STORAGE_KEYS.DRIVERS, this.drivers);
    this.notify();
  }

  public updateVehicleDetails(id: string, updates: Partial<FleetVehicle>): void {
    this.vehicles = this.vehicles.map((v) => (v.id === id ? { ...v, ...updates } : v));
    saveStorage(STORAGE_KEYS.VEHICLES, this.vehicles);
    this.notify();
  }

  public dispatchTrip(tripId: string): void {
    const now = new Date().toISOString().replace('T', ' ').slice(0, 16);
    this.trips = this.trips.map((t) =>
      t.id === tripId
        ? {
            ...t,
            status: 'IN_PROGRESS',
            gateOutTime: now,
          }
        : t
    );
    saveStorage(STORAGE_KEYS.TRIPS, this.trips);
    this.notify();
  }

  public completeTrip(tripId: string, notes?: string): void {
    const now = new Date().toISOString().replace('T', ' ').slice(0, 16);
    this.trips = this.trips.map((t) =>
      t.id === tripId
        ? {
            ...t,
            status: 'COMPLETED',
            arrivedTime: now,
            gateInTime: now,
            notes: notes ? `${t.notes || ''} [Admin Complete: ${notes}]` : t.notes,
            containers: t.containers.map((c) => ({ ...c, unloadedAt: now })),
          }
        : t
    );
    saveStorage(STORAGE_KEYS.TRIPS, this.trips);
    this.notify();
  }

  public createTrip(tripData: Partial<IttTrip>): IttTrip {
    const now = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const newTrip: IttTrip = {
      id: `trp-${Date.now()}`,
      tripNumber: `TRP-2026-${String(Math.floor(100 + Math.random() * 900))}`,
      driverId: tripData.driverId || 'drv-01',
      driverName: tripData.driverName || 'Kamal Perera',
      driverCode: tripData.driverCode || 'DRV-00001',
      driverPhone: tripData.driverPhone || '+94 77 123 4567',
      vehicleNumber: tripData.vehicleNumber || 'LY 5234',
      cheNumber: tripData.cheNumber || 'SCK 100',
      operator: tripData.operator || 'SCK Logistics',
      sourceTerminal: tripData.sourceTerminal || 'CICT',
      destinationTerminal: tripData.destinationTerminal || 'JCT',
      status: tripData.status || 'PENDING_APPROVAL',
      containers: tripData.containers || [],
      createdAt: now,
      notes: tripData.notes || 'Created via Admin Command Portal',
    };
    this.trips = [newTrip, ...this.trips];
    saveStorage(STORAGE_KEYS.TRIPS, this.trips);
    this.notify();
    return newTrip;
  }

  public getAlerts(): BroadcastAlert[] {
    return [...this.alerts];
  }

  public broadcastAlert(alert: Omit<BroadcastAlert, 'id' | 'timestamp'>): BroadcastAlert {
    const now = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const newAlert: BroadcastAlert = {
      ...alert,
      id: `alt-${Date.now()}`,
      timestamp: now,
    };
    this.alerts = [newAlert, ...this.alerts];
    saveStorage(STORAGE_KEYS.ALERTS, this.alerts);
    this.notify();
    return newAlert;
  }

  public resetToFactoryDefaults(): void {
    localStorage.removeItem(STORAGE_KEYS.VEHICLES);
    localStorage.removeItem(STORAGE_KEYS.DRIVERS);
    localStorage.removeItem(STORAGE_KEYS.TRIPS);
    localStorage.removeItem(STORAGE_KEYS.ALERTS);
    localStorage.removeItem(STORAGE_KEYS.TERMINALS);
    localStorage.removeItem(STORAGE_KEYS.SUPERVISORS);
    this.terminals = [...INITIAL_TERMINALS];
    this.vehicles = [...INITIAL_VEHICLES];
    this.drivers = [...INITIAL_DRIVERS];
    this.trips = [...INITIAL_TRIPS];
    this.alerts = [...INITIAL_ALERTS];
    this.supervisors = [...INITIAL_SUPERVISORS];
    this.notify();
  }
}

export const adminDataService = new AdminDataService();
