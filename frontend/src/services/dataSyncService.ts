import { storage } from './storage';
import { adminService } from './adminService';
import apiClient from './api';

export interface DryRunAccountUpload {
  type: 'DRIVER' | 'SUPERVISOR';
  identifier: string; // Driver code or Employee ID
  name: string;
  email?: string;
  mobile?: string;
  temporaryPassword: string;
  data: any;
}

export interface DryRunVehicleUpload {
  plateNumber: string;
  chassisNumber?: string;
  operator?: string;
  data: any;
}

export interface DryRunTripUpload {
  tripNumber?: string;
  driverCode?: string;
  vehicleNumber?: string;
  data: any;
}

export interface DryRunReport {
  timestamp: string;
  backendConnected: boolean;
  serverCounts: {
    drivers: number;
    supervisors: number;
    vehicles: number;
    trips: number;
  };
  localCustomCounts: {
    drivers: number;
    supervisors: number;
    vehicles: number;
    trips: number;
  };
  pendingUploads: {
    drivers: DryRunAccountUpload[];
    supervisors: DryRunAccountUpload[];
    vehicles: DryRunVehicleUpload[];
    trips: DryRunTripUpload[];
  };
  alreadyExistsOnServer: {
    drivers: string[];
    supervisors: string[];
    vehicles: string[];
    trips: string[];
  };
}

const STORAGE_KEY_CUSTOM_DRIVERS = 'itt_admin_fleet_custom_drivers';
const STORAGE_KEY_CUSTOM_VEHICLES = 'itt_admin_fleet_custom_vehicles';
const STORAGE_KEY_CUSTOM_SUPERVISORS = 'itt_admin_fleet_custom_supervisors';
const STORAGE_KEY_OFFLINE_TRIPS = 'itt_offline_pending_trips';

function generateTemporaryPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$';
  let pass = 'Temp@';
  for (let i = 0; i < 6; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
}

export const dataSyncService = {
  /**
   * Generates a temporary one-time password
   */
  generateTempPassword(): string {
    return generateTemporaryPassword();
  },

  /**
   * Performs a DRY RUN audit of local custom user data vs Spring Boot backend database.
   * Does NOT alter or delete any data.
   */
  async performDryRun(): Promise<DryRunReport> {
    const report: DryRunReport = {
      timestamp: new Date().toISOString(),
      backendConnected: false,
      serverCounts: { drivers: 0, supervisors: 0, vehicles: 0, trips: 0 },
      localCustomCounts: { drivers: 0, supervisors: 0, vehicles: 0, trips: 0 },
      pendingUploads: { drivers: [], supervisors: [], vehicles: [], trips: [] },
      alreadyExistsOnServer: { drivers: [], supervisors: [], vehicles: [], trips: [] },
    };

    // 1. Fetch remote records from Spring Boot
    let remoteDrivers: any[] = [];
    let remoteSupervisors: any[] = [];
    let remoteVehicles: any[] = [];
    let remoteTrips: any[] = [];

    try {
      const [drvRes, supRes, vehRes, trpRes] = await Promise.all([
        adminService.getDrivers().catch(() => []),
        adminService.getSupervisors().catch(() => []),
        adminService.getVehicles().catch(() => []),
        adminService.getTrips().catch(() => []),
      ]);

      remoteDrivers = Array.isArray(drvRes) ? drvRes : [];
      remoteSupervisors = Array.isArray(supRes) ? supRes : [];
      remoteVehicles = Array.isArray(vehRes) ? vehRes : [];
      remoteTrips = Array.isArray(trpRes) ? trpRes : [];
      report.backendConnected = true;
    } catch (e) {
      console.warn('[dataSyncService] Could not reach backend:', e);
      report.backendConnected = false;
    }

    report.serverCounts = {
      drivers: remoteDrivers.length,
      supervisors: remoteSupervisors.length,
      vehicles: remoteVehicles.length,
      trips: remoteTrips.length,
    };

    const serverDriverCodes = new Set(
      remoteDrivers.map((d: any) => (d.driverCode || d.username || d.employeeId || '').toUpperCase())
    );
    const serverSupervisorIds = new Set(
      remoteSupervisors.map((s: any) => (s.employeeId || s.username || s.id || '').toUpperCase())
    );
    const serverVehiclePlates = new Set(
      remoteVehicles.map((v: any) => (v.vehicleNumber || '').toUpperCase().replace(/\s+/g, ''))
    );
    const serverTripNumbers = new Set(
      remoteTrips.map((t: any) => (t.tripNumber || t.id || '').toUpperCase())
    );

    // 2. Read local custom drivers
    try {
      const rawDrivers = await storage.getItem(STORAGE_KEY_CUSTOM_DRIVERS);
      if (rawDrivers) {
        const localDrivers = JSON.parse(rawDrivers);
        if (Array.isArray(localDrivers)) {
          report.localCustomCounts.drivers = localDrivers.length;
          for (const d of localDrivers) {
            const code = (d.driverCode || d.employeeId || '').toUpperCase();
            if (serverDriverCodes.has(code)) {
              report.alreadyExistsOnServer.drivers.push(code);
            } else {
              report.pendingUploads.drivers.push({
                type: 'DRIVER',
                identifier: d.driverCode || d.employeeId || 'CUSTOM-DRV',
                name: d.fullName || 'Driver',
                email: d.email,
                mobile: d.mobileNumber,
                temporaryPassword: generateTemporaryPassword(),
                data: d,
              });
            }
          }
        }
      }
    } catch (e) {
      console.warn('[dataSyncService] Error inspecting local drivers:', e);
    }

    // 3. Read local custom supervisors
    try {
      const rawSup = await storage.getItem(STORAGE_KEY_CUSTOM_SUPERVISORS);
      if (rawSup) {
        const localSupervisors = JSON.parse(rawSup);
        if (Array.isArray(localSupervisors)) {
          report.localCustomCounts.supervisors = localSupervisors.length;
          for (const s of localSupervisors) {
            const empId = (s.employeeId || s.username || '').toUpperCase();
            if (serverSupervisorIds.has(empId)) {
              report.alreadyExistsOnServer.supervisors.push(empId);
            } else {
              report.pendingUploads.supervisors.push({
                type: 'SUPERVISOR',
                identifier: s.employeeId || s.username || 'CUSTOM-SUP',
                name: s.fullName || 'Supervisor',
                email: s.email,
                mobile: s.mobileNumber,
                temporaryPassword: generateTemporaryPassword(),
                data: s,
              });
            }
          }
        }
      }
    } catch (e) {
      console.warn('[dataSyncService] Error inspecting local supervisors:', e);
    }

    // 4. Read local custom vehicles
    try {
      const rawVehicles = await storage.getItem(STORAGE_KEY_CUSTOM_VEHICLES);
      if (rawVehicles) {
        const localVehicles = JSON.parse(rawVehicles);
        if (Array.isArray(localVehicles)) {
          report.localCustomCounts.vehicles = localVehicles.length;
          for (const v of localVehicles) {
            const plateClean = (v.vehicleNumber || '').toUpperCase().replace(/\s+/g, '');
            if (serverVehiclePlates.has(plateClean)) {
              report.alreadyExistsOnServer.vehicles.push(v.vehicleNumber);
            } else {
              report.pendingUploads.vehicles.push({
                plateNumber: v.vehicleNumber,
                chassisNumber: v.chassisNumber,
                operator: v.operator,
                data: v,
              });
            }
          }
        }
      }
    } catch (e) {
      console.warn('[dataSyncService] Error inspecting local vehicles:', e);
    }

    // 5. Read local pending trips
    try {
      const rawTrips = await storage.getItem(STORAGE_KEY_OFFLINE_TRIPS);
      if (rawTrips) {
        const localTrips = JSON.parse(rawTrips);
        if (Array.isArray(localTrips)) {
          report.localCustomCounts.trips = localTrips.length;
          for (const t of localTrips) {
            const num = (t.tripNumber || t.id || '').toUpperCase();
            if (serverTripNumbers.has(num)) {
              report.alreadyExistsOnServer.trips.push(num);
            } else {
              report.pendingUploads.trips.push({
                tripNumber: t.tripNumber,
                driverCode: t.driverCode,
                vehicleNumber: t.vehicleNumber,
                data: t,
              });
            }
          }
        }
      }
    } catch (e) {
      console.warn('[dataSyncService] Error inspecting local offline trips:', e);
    }

    return report;
  },

  /**
   * Executes sync upload for approved records ONLY after user confirmation.
   * Never deletes local data until server returns HTTP 201/200 OK.
   */
  async executeApprovedSync(approvedReport: DryRunReport): Promise<{
    success: boolean;
    uploadedCount: number;
    failedCount: number;
    errors: string[];
    temporaryCredentialsGiven: Array<{ identifier: string; name: string; tempPass: string }>;
  }> {
    const temporaryCredentialsGiven: Array<{ identifier: string; name: string; tempPass: string }> = [];
    const errors: string[] = [];
    let uploadedCount = 0;
    let failedCount = 0;

    // 1. Upload Vehicles
    for (const v of approvedReport.pendingUploads.vehicles) {
      try {
        await adminService.createVehicle(v.data);
        uploadedCount++;
      } catch (err: any) {
        failedCount++;
        errors.push(`Vehicle ${v.plateNumber}: ${err.message || 'Upload failed'}`);
      }
    }

    // 2. Upload Drivers
    for (const d of approvedReport.pendingUploads.drivers) {
      try {
        const payload = {
          ...d.data,
          password: d.temporaryPassword,
        };
        await adminService.createDriver(payload);
        temporaryCredentialsGiven.push({
          identifier: d.identifier,
          name: d.name,
          tempPass: d.temporaryPassword,
        });
        uploadedCount++;
      } catch (err: any) {
        failedCount++;
        errors.push(`Driver ${d.identifier}: ${err.message || 'Upload failed'}`);
      }
    }

    // 3. Upload Supervisors
    for (const s of approvedReport.pendingUploads.supervisors) {
      try {
        const payload = {
          ...s.data,
          password: s.temporaryPassword,
        };
        await adminService.createSupervisor(payload);
        temporaryCredentialsGiven.push({
          identifier: s.identifier,
          name: s.name,
          tempPass: s.temporaryPassword,
        });
        uploadedCount++;
      } catch (err: any) {
        failedCount++;
        errors.push(`Supervisor ${s.identifier}: ${err.message || 'Upload failed'}`);
      }
    }

    // 4. Upload Trips
    for (const t of approvedReport.pendingUploads.trips) {
      try {
        await apiClient.post('/trips', t.data);
        uploadedCount++;
      } catch (err: any) {
        failedCount++;
        errors.push(`Trip ${t.tripNumber}: ${err.message || 'Upload failed'}`);
      }
    }

    return {
      success: failedCount === 0,
      uploadedCount,
      failedCount,
      errors,
      temporaryCredentialsGiven,
    };
  },
};

