/**
 * AdminDataService — connects the SMART ITT Web Admin Panel to the
 * Spring Boot backend at /api/v1/* (proxied via Vite in dev).
 *
 * Strategy:
 *  • On construction: probe the backend and load from localStorage fallback
 *  • When backend is reachable: fetch live data and push mutations via REST
 *  • When backend is offline: use localStorage mock data (full CRUD still works)
 *  • Listeners are notified after every mutation so React re-renders reactively
 */
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

// ─── Config ────────────────────────────────────────────────────────────────
const API_BASE = '/api/v1';
const API_KEY = 'smart-itt-sec-key-prod-2026';
const FETCH_TIMEOUT_MS = 4000;

const STORAGE_KEYS = {
  VEHICLES: 'smart_itt_admin_vehicles_v1',
  DRIVERS: 'smart_itt_admin_drivers_v1',
  TRIPS: 'smart_itt_admin_trips_v1',
  ALERTS: 'smart_itt_admin_alerts_v1',
  TERMINALS: 'smart_itt_admin_terminals_v1',
  SUPERVISORS: 'smart_itt_admin_supervisors_v1',
  AUTH_TOKEN: 'smart_itt_web_token',
};

// ─── Storage helpers ────────────────────────────────────────────────────────
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

// ─── Fetch helper with auth header ─────────────────────────────────────────
async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-API-KEY': API_KEY,
    ...(init.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
}

// ─── Type mappers: backend → web types ──────────────────────────────────────
function mapBackendTrip(t: any): IttTrip {
  return {
    id: t.id,
    tripNumber: t.tripNumber || `TRP-${t.id?.slice(0, 8)}`,
    driverId: t.driverId || '',
    driverName: t.driverName || t.driver?.fullName || 'Unknown Driver',
    driverCode: t.driverCode || t.driver?.driverCode || '',
    driverPhone: t.driverPhone || t.driver?.mobileNumber || '',
    vehicleNumber: t.vehicleNumber || t.vehicle?.vehicleNumber || '',
    cheNumber: t.cheNumber || t.vehicle?.cheNumber || '',
    operator: t.operator || t.vehicle?.operator || 'SCK Logistics',
    sourceTerminal: t.sourceTerminal,
    destinationTerminal: t.destinationTerminal || t.containers?.[0]?.destinationTerminal || 'JCT',
    status: t.status,
    containers: (t.containers || []).map((c: any) => ({
      id: c.id,
      containerNumber: c.containerNumber,
      size: c.size || '20FT',
      cargoType: c.cargoType || 'DRY',
      vesselName: c.vesselName,
      voyageNo: c.voyageNo,
      weightTonnes: c.weightTonnes,
      sealNumber: c.sealNumber,
      checkDigitValid: c.checkDigitValid ?? true,
      unloadedAt: c.unloadedAt,
      baySlot: c.baySlot,
    })),
    createdAt: t.createdAt || new Date().toISOString(),
    gateOutTime: t.gateOutTime,
    arrivedTime: t.arrivedTime,
    gateInTime: t.gateInTime,
    approvedBy: t.approvedBy,
    approvedAt: t.approvedAt,
    rejectionReason: t.rejectionReason,
    notes: t.notes,
  };
}

function mapBackendDriver(d: any): DriverRecord {
  return {
    id: d.id,
    driverCode: d.driverCode || '',
    fullName: d.fullName || d.name || '',
    employeeId: d.employeeId || '',
    nic: d.nic || '',
    mobileNumber: d.mobileNumber || '',
    email: d.email || '',
    address: d.address || '',
    licenseNumber: d.licenseNumber || d.drivingLicenceNumber || '',
    licenseExpiryDate: d.licenseExpiryDate || '',
    dateOfBirth: d.dateOfBirth,
    emergencyContactName: d.emergencyContactName || '',
    emergencyContactNumber: d.emergencyContactNumber || '',
    vehicleNumber: d.vehicleNumber || d.vehicle?.vehicleNumber || '',
    cheNumber: d.cheNumber || d.vehicle?.cheNumber || '',
    operator: d.operator || d.vehicle?.operator || 'SCK Logistics',
    status: d.status || 'ACTIVE',
    shiftStatus: d.shiftStatus,
    currentLocation: d.currentLocation,
    speedKmh: d.speedKmh,
    dailyTarget: d.dailyTarget,
    todayTrips: d.todayTrips,
    medicalCleared: d.medicalCleared,
    portPassValid: d.portPassValid,
    profilePhoto: d.profilePhoto,
    tripsCompleted: d.tripsCompleted || 0,
    activeTrips: d.activeTrips || 0,
    rating: d.rating || 5.0,
    totalEarnedAllowance: d.totalEarnedAllowance || 0,
    joinedDate: d.joinedDate || new Date().toISOString().split('T')[0],
  };
}

function mapBackendVehicle(v: any): FleetVehicle {
  // Try finding driver from initial seeds if backend didn't provide driver
  const initial = INITIAL_VEHICLES.find(
    (iv) => iv.vehicleNumber === v.vehicleNumber || iv.cheNumber === (v.cheNumber || v.chassisNumber)
  );

  const issuedDate = v.licenseIssuedDate || initial?.licenseIssuedDate || '2026-08-15';
  const expiryDate = v.licenseExpiryDate || initial?.licenseExpiryDate || '2027-08-15';

  let daysUntilExpiry = v.daysUntilExpiry;
  if (daysUntilExpiry === undefined || daysUntilExpiry === null) {
    const now = new Date();
    const exp = new Date(expiryDate);
    daysUntilExpiry = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }

  const renewalDue = v.renewalDue !== undefined ? v.renewalDue : daysUntilExpiry <= 30;
  const licenseStatus = v.licenseStatus || (daysUntilExpiry < 0 ? 'EXPIRED' : daysUntilExpiry <= 30 ? 'RENEWAL_DUE' : 'VALID');

  return {
    id: v.id,
    cheNumber: v.cheNumber || v.chassisNumber || initial?.cheNumber || '',
    vehicleNumber: v.vehicleNumber || initial?.vehicleNumber || '',
    operator: v.operator || initial?.operator || 'SCK Logistics',
    trailerSize: v.trailerSize || initial?.trailerSize || '40FT',
    status: (v.status || initial?.status || 'ACTIVE') as FleetVehicle['status'],
    driverCode: v.driverCode || initial?.driverCode,
    driverName: v.driverName || initial?.driverName,
    driverMobile: v.driverMobile || initial?.driverMobile,
    mileageKm: v.mileageKm || initial?.mileageKm,
    lastServiceDate: v.lastServiceDate || initial?.lastServiceDate,
    engineStatus: v.engineStatus || initial?.engineStatus,
    hitchStatus: v.hitchStatus || initial?.hitchStatus,
    currentLocation: v.currentLocation || initial?.currentLocation,
    tyreWearScore: v.tyreWearScore || initial?.tyreWearScore,
    licenseIssuedDate: issuedDate,
    licenseExpiryDate: expiryDate,
    daysUntilExpiry,
    renewalDue,
    licenseStatus,
  };
}

// ─── Main Service Class ─────────────────────────────────────────────────────
class AdminDataService {
  private terminals: TerminalInfo[] = loadStorage(STORAGE_KEYS.TERMINALS, INITIAL_TERMINALS);
  private vehicles: FleetVehicle[] = loadStorage(STORAGE_KEYS.VEHICLES, INITIAL_VEHICLES);
  private drivers: DriverRecord[] = loadStorage(STORAGE_KEYS.DRIVERS, INITIAL_DRIVERS);
  private trips: IttTrip[] = loadStorage(STORAGE_KEYS.TRIPS, INITIAL_TRIPS);
  private alerts: BroadcastAlert[] = loadStorage(STORAGE_KEYS.ALERTS, INITIAL_ALERTS);
  private supervisors: SupervisorRecord[] = loadStorage(STORAGE_KEYS.SUPERVISORS, INITIAL_SUPERVISORS);
  private backendOnline: boolean = false;
  private listeners: (() => void)[] = [];
  private lastRefresh: number = 0;

  constructor() {
    this.init();
    // Refresh live data every 15 seconds when backend is online
    setInterval(() => this.refreshLiveData(), 15_000);
  }

  private async init() {
    const online = await this.probeBackend();
    if (online) {
      await this.refreshLiveData();
    }
  }

  // ─── Subscription ─────────────────────────────────────────────────────────
  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(): void {
    this.listeners.forEach((fn) => fn());
  }

  // ─── Backend probe ─────────────────────────────────────────────────────────
  public async probeBackend(): Promise<boolean> {
    try {
      const res = await apiFetch('/dashboard');
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

  // ─── Live data refresh ─────────────────────────────────────────────────────
  public async refreshLiveData(): Promise<void> {
    if (!this.backendOnline) {
      const ok = await this.probeBackend();
      if (!ok) return;
    }

    const now = Date.now();
    if (now - this.lastRefresh < 3000) return; // debounce
    this.lastRefresh = now;

    try {
      // Fetch all in parallel
      const [tripsRes, driversRes, vehiclesRes] = await Promise.allSettled([
        apiFetch('/trips'),
        apiFetch('/drivers'),
        apiFetch('/vehicles'),
      ]);

      let changed = false;

      if (tripsRes.status === 'fulfilled' && tripsRes.value.ok) {
        const raw = await tripsRes.value.json();
        this.trips = (raw as any[]).map(mapBackendTrip);
        saveStorage(STORAGE_KEYS.TRIPS, this.trips);
        changed = true;
      }

      if (driversRes.status === 'fulfilled' && driversRes.value.ok) {
        const raw = await driversRes.value.json();
        this.drivers = (raw as any[]).map(mapBackendDriver);
        saveStorage(STORAGE_KEYS.DRIVERS, this.drivers);
        changed = true;
      }

      if (vehiclesRes.status === 'fulfilled' && vehiclesRes.value.ok) {
        const raw = await vehiclesRes.value.json();
        this.vehicles = (raw as any[]).map(mapBackendVehicle);
        saveStorage(STORAGE_KEYS.VEHICLES, this.vehicles);
        changed = true;
      }

      if (changed) this.notify();
    } catch (err) {
      console.warn('[AdminDataService] refreshLiveData failed:', err);
      this.backendOnline = false;
    }
  }

  // ─── Dashboard ────────────────────────────────────────────────────────────
  public async fetchDashboardStats(): Promise<DashboardStats | null> {
    try {
      const res = await apiFetch('/dashboard');
      if (!res.ok) return null;
      const raw = await res.json();
      return {
        totalTripsToday: raw.totalTripsToday ?? 0,
        activeTrips: raw.activeTrips ?? 0,
        tripsPendingApproval: raw.tripsPendingApproval ?? 0,
        completedTripsToday: raw.completedTripsToday ?? 0,
        approvedTrips: raw.approvedTrips ?? 0,
        rejectedTrips: raw.rejectedTrips ?? 0,
        totalContainersTransportedToday: raw.totalContainersTransportedToday ?? 0,
        totalTeuToday: raw.totalTeuToday ?? 0,
        registeredDrivers: raw.registeredDrivers ?? this.drivers.length,
        activeDrivers: raw.activeDrivers ?? 0,
        totalVehicles: this.vehicles.length,
        activeVehicles: this.vehicles.filter((v) => v.status === 'ACTIVE' || v.status === 'IN_TRANSIT').length,
        terminalWiseTrips: raw.terminalWiseTrips ?? {},
      };
    } catch {
      return null;
    }
  }

  public getDashboardStats(): DashboardStats {
    const activeTrips = this.trips.filter((t) => t.status === 'IN_PROGRESS').length;
    const tripsPendingApproval = this.trips.filter((t) => t.status === 'PENDING_APPROVAL').length;
    const completedTripsToday = this.trips.filter((t) => t.status === 'COMPLETED').length;
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

    const terminalCounts: Record<string, number> = { CICT: 0, CWIT: 0, ECT: 0, JCT: 0, UCT: 0, SAGT: 0 };
    this.trips.forEach((t) => {
      if (t.sourceTerminal in terminalCounts) terminalCounts[t.sourceTerminal]++;
    });

    return {
      totalTripsToday: this.trips.length,
      activeTrips,
      tripsPendingApproval,
      completedTripsToday,
      approvedTrips,
      rejectedTrips,
      totalContainersTransportedToday: totalContainers,
      totalTeuToday: totalTeu,
      registeredDrivers: this.drivers.length,
      activeDrivers,
      totalVehicles: this.vehicles.length,
      activeVehicles,
      terminalWiseTrips: terminalCounts,
    };
  }

  // ─── Terminals ────────────────────────────────────────────────────────────
  public getTerminals(): TerminalInfo[] {
    return [...this.terminals];
  }

  // ─── Vehicles ─────────────────────────────────────────────────────────────
  public getVehicles(): FleetVehicle[] {
    const now = new Date();
    return this.vehicles.map((v) => {
      const expiryDate = v.licenseExpiryDate || '2027-08-15';
      const exp = new Date(expiryDate);
      const daysUntilExpiry = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const renewalDue = daysUntilExpiry <= 30;
      const licenseStatus = daysUntilExpiry < 0 ? 'EXPIRED' : daysUntilExpiry <= 30 ? 'RENEWAL_DUE' : 'VALID';
      return {
        ...v,
        licenseIssuedDate: v.licenseIssuedDate || '2026-08-15',
        licenseExpiryDate: expiryDate,
        daysUntilExpiry,
        renewalDue,
        licenseStatus,
      };
    });
  }

  public getVehicleById(id: string): FleetVehicle | undefined {
    return this.vehicles.find((v) => v.id === id);
  }

  public updateVehicleStatus(id: string, status: FleetVehicle['status']): void {
    const vehicle = this.vehicles.find((v) => v.id === id);
    this.vehicles = this.vehicles.map((v) => (v.id === id ? { ...v, status } : v));
    saveStorage(STORAGE_KEYS.VEHICLES, this.vehicles);
    this.notify();

    if (this.backendOnline && vehicle) {
      const url = vehicle.vehicleNumber
        ? `/vehicles/by-number/${encodeURIComponent(vehicle.vehicleNumber)}/status`
        : `/vehicles/${id}/status`;
      apiFetch(url, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }).catch((err) => console.warn('[AdminDataService] updateVehicleStatus failed:', err));
    }
  }

  public addVehicle(data: Omit<FleetVehicle, 'id'>): FleetVehicle {
    const newVehicle: FleetVehicle = { ...data, id: `fl-${Date.now()}` };
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

  public updateVehicleDetails(id: string, updates: Partial<FleetVehicle>): void {
    this.vehicles = this.vehicles.map((v) => (v.id === id ? { ...v, ...updates } : v));
    saveStorage(STORAGE_KEYS.VEHICLES, this.vehicles);
    this.notify();
  }

  public async updateVehicleLicense(vehicleIdOrNumber: string, issuedDate?: string): Promise<FleetVehicle | null> {
    const today = issuedDate || new Date().toISOString().split('T')[0];
    const expDate = new Date(today);
    expDate.setFullYear(expDate.getFullYear() + 1);
    const expiryStr = expDate.toISOString().split('T')[0];

    const idx = this.vehicles.findIndex(
      (v) => v.id === vehicleIdOrNumber || v.vehicleNumber === vehicleIdOrNumber || v.cheNumber === vehicleIdOrNumber
    );

    if (idx === -1) return null;

    const v = this.vehicles[idx];
    const updated: FleetVehicle = {
      ...v,
      licenseIssuedDate: today,
      licenseExpiryDate: expiryStr,
      daysUntilExpiry: 365,
      renewalDue: false,
      licenseStatus: 'VALID',
    };

    this.vehicles[idx] = updated;
    saveStorage(STORAGE_KEYS.VEHICLES, this.vehicles);
    this.notify();

    // Sync to backend
    if (this.backendOnline) {
      const url = v.vehicleNumber
        ? `/vehicles/by-number/${encodeURIComponent(v.vehicleNumber)}/license`
        : `/vehicles/${v.id}/license`;
      apiFetch(url, {
        method: 'PUT',
        body: JSON.stringify({ issuedDate: today }),
      }).catch((err) => console.warn('[AdminDataService] updateVehicleLicense failed:', err));
    }

    return updated;
  }

  // ─── Drivers ──────────────────────────────────────────────────────────────
  public getDrivers(): DriverRecord[] {
    return [...this.drivers];
  }

  public getDriverById(id: string): DriverRecord | undefined {
    return this.drivers.find((d) => d.id === id);
  }

  public updateDriverStatus(id: string, status: AccountStatus): void {
    // Optimistic local update
    this.drivers = this.drivers.map((d) => (d.id === id ? { ...d, status } : d));
    saveStorage(STORAGE_KEYS.DRIVERS, this.drivers);
    this.notify();

    // Sync to backend
    if (this.backendOnline) {
      apiFetch(`/drivers/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }).catch((err) => console.warn('[AdminDataService] updateDriverStatus failed:', err));
    }
  }

  public updateDriverShiftStatus(id: string, shiftStatus: DriverShiftStatus): void {
    this.drivers = this.drivers.map((d) => (d.id === id ? { ...d, shiftStatus } : d));
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

  public reassignDriverVehicle(driverId: string, cheNumber: string): void {
    const targetVehicle = this.vehicles.find((v) => v.cheNumber === cheNumber);
    const vehicleNumber = targetVehicle ? targetVehicle.vehicleNumber : '';
    const driver = this.drivers.find((d) => d.id === driverId);

    this.drivers = this.drivers.map((d) => (d.id === driverId ? { ...d, cheNumber, vehicleNumber } : d));
    if (targetVehicle && driver) {
      this.vehicles = this.vehicles.map((v) =>
        v.cheNumber === cheNumber
          ? { ...v, driverCode: driver.driverCode, driverName: driver.fullName, driverMobile: driver.mobileNumber }
          : v
      );
      saveStorage(STORAGE_KEYS.VEHICLES, this.vehicles);
    }
    saveStorage(STORAGE_KEYS.DRIVERS, this.drivers);
    this.notify();
  }

  // ─── Trips ────────────────────────────────────────────────────────────────
  public getTrips(): IttTrip[] {
    return [...this.trips];
  }

  public getTripById(id: string): IttTrip | undefined {
    return this.trips.find((t) => t.id === id);
  }

  public approveTrip(tripId: string, supervisorName = 'Admin Dispatch Control (HQ)'): void {
    const now = new Date().toISOString().replace('T', ' ').slice(0, 16);
    // Optimistic update
    this.trips = this.trips.map((t) =>
      t.id === tripId ? { ...t, status: 'APPROVED', approvedBy: supervisorName, approvedAt: now } : t
    );
    this._updateSupervisorApprovalCount(supervisorName, 'approve');
    saveStorage(STORAGE_KEYS.TRIPS, this.trips);
    this.notify();

    // Backend sync
    if (this.backendOnline) {
      apiFetch(`/trips/${tripId}/approve`, {
        method: 'POST',
        body: JSON.stringify({ status: 'APPROVED', supervisorId: supervisorName }),
      })
        .then(async (res) => {
          if (res.ok) {
            const updated = await res.json();
            this.trips = this.trips.map((t) => (t.id === tripId ? mapBackendTrip(updated) : t));
            saveStorage(STORAGE_KEYS.TRIPS, this.trips);
            this.notify();
          }
        })
        .catch((err) => console.warn('[AdminDataService] approveTrip failed:', err));
    }
  }

  public rejectTrip(tripId: string, reason: string, supervisorName = 'Admin Dispatch Control (HQ)'): void {
    const now = new Date().toISOString().replace('T', ' ').slice(0, 16);
    this.trips = this.trips.map((t) =>
      t.id === tripId
        ? { ...t, status: 'REJECTED', rejectionReason: reason, approvedBy: supervisorName, approvedAt: now }
        : t
    );
    this._updateSupervisorApprovalCount(supervisorName, 'reject');
    saveStorage(STORAGE_KEYS.TRIPS, this.trips);
    this.notify();

    if (this.backendOnline) {
      apiFetch(`/trips/${tripId}/approve`, {
        method: 'POST',
        body: JSON.stringify({ status: 'REJECTED', supervisorId: supervisorName, reason }),
      })
        .then(async (res) => {
          if (res.ok) {
            const updated = await res.json();
            this.trips = this.trips.map((t) => (t.id === tripId ? mapBackendTrip(updated) : t));
            saveStorage(STORAGE_KEYS.TRIPS, this.trips);
            this.notify();
          }
        })
        .catch((err) => console.warn('[AdminDataService] rejectTrip failed:', err));
    }
  }

  public dispatchTrip(tripId: string): void {
    const now = new Date().toISOString().replace('T', ' ').slice(0, 16);
    this.trips = this.trips.map((t) =>
      t.id === tripId ? { ...t, status: 'IN_PROGRESS', gateOutTime: now } : t
    );
    saveStorage(STORAGE_KEYS.TRIPS, this.trips);
    this.notify();

    if (this.backendOnline) {
      apiFetch(`/trips/${tripId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'IN_PROGRESS' }),
      }).catch((err) => console.warn('[AdminDataService] dispatchTrip failed:', err));
    }
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

    if (this.backendOnline) {
      apiFetch(`/trips/${tripId}/complete`, { method: 'PATCH', body: '{}' })
        .catch((err) => console.warn('[AdminDataService] completeTrip failed:', err));
    }
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

    // Sync to backend
    if (this.backendOnline) {
      const driver = this.drivers.find((d) => d.id === newTrip.driverId || d.driverCode === newTrip.driverCode);
      apiFetch('/trips', {
        method: 'POST',
        body: JSON.stringify({
          driverId: driver?.id || newTrip.driverId,
          sourceTerminal: newTrip.sourceTerminal,
          containers: newTrip.containers.map((c) => ({
            containerNumber: c.containerNumber,
            sourceTerminal: newTrip.sourceTerminal,
            destinationTerminal: c.baySlot || newTrip.destinationTerminal,
          })),
        }),
      })
        .then(async (res) => {
          if (res.ok) {
            const serverTrip = await res.json();
            // Replace optimistic local trip with server trip
            this.trips = this.trips.map((t) => (t.id === newTrip.id ? mapBackendTrip(serverTrip) : t));
            saveStorage(STORAGE_KEYS.TRIPS, this.trips);
            this.notify();
          }
        })
        .catch((err) => console.warn('[AdminDataService] createTrip sync failed:', err));
    }

    return newTrip;
  }

  // ─── Supervisors ──────────────────────────────────────────────────────────
  public getSupervisors(): SupervisorRecord[] {
    return [...this.supervisors];
  }

  public updateSupervisorStatus(id: string, status: SupervisorRecord['status']): void {
    this.supervisors = this.supervisors.map((s) => (s.id === id ? { ...s, status } : s));
    saveStorage(STORAGE_KEYS.SUPERVISORS, this.supervisors);
    this.notify();
  }

  // ─── Alerts ───────────────────────────────────────────────────────────────
  public getAlerts(): BroadcastAlert[] {
    return [...this.alerts];
  }

  public broadcastAlert(alert: Omit<BroadcastAlert, 'id' | 'timestamp'>): BroadcastAlert {
    const now = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const newAlert: BroadcastAlert = { ...alert, id: `alt-${Date.now()}`, timestamp: now };
    this.alerts = [newAlert, ...this.alerts];
    saveStorage(STORAGE_KEYS.ALERTS, this.alerts);
    this.notify();
    return newAlert;
  }

  // ─── Reset ────────────────────────────────────────────────────────────────
  public resetToFactoryDefaults(): void {
    Object.values(STORAGE_KEYS).forEach((k) => localStorage.removeItem(k));
    this.terminals = [...INITIAL_TERMINALS];
    this.vehicles = [...INITIAL_VEHICLES];
    this.drivers = [...INITIAL_DRIVERS];
    this.trips = [...INITIAL_TRIPS];
    this.alerts = [...INITIAL_ALERTS];
    this.supervisors = [...INITIAL_SUPERVISORS];
    this.notify();
    // Re-init from backend
    this.init();
  }

  // ─── Private helpers ─────────────────────────────────────────────────────
  private _updateSupervisorApprovalCount(supervisorName: string, action: 'approve' | 'reject'): void {
    this.supervisors = this.supervisors.map((s) => {
      const match =
        s.fullName.toLowerCase().includes(supervisorName.toLowerCase()) ||
        supervisorName.toLowerCase().includes(s.fullName.toLowerCase());
      if (!match) return s;
      return action === 'approve'
        ? { ...s, approvalsToday: s.approvalsToday + 1 }
        : { ...s, rejectionsToday: s.rejectionsToday + 1 };
    });
    saveStorage(STORAGE_KEYS.SUPERVISORS, this.supervisors);
  }
}

export const adminDataService = new AdminDataService();
