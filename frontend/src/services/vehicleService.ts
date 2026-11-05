import apiClient from './api';

export interface Vehicle {
  id: string;
  vehicleNumber: string;
  chassisNumber?: string;
  cheNumber?: string;
  operator?: string;
  trailerSize?: string;
  status: string; // 'ACTIVE', 'MAINTENANCE', 'INACTIVE', 'IN_TRANSIT', etc.
  assignedDriverId?: string;
  driverCode?: string;
  driverName?: string;
  driverMobile?: string;
  licenseIssuedDate?: string;
  licenseExpiryDate?: string;
  daysUntilExpiry?: number;
  renewalDue?: boolean;
  licenseStatus?: string;
  portPassNumber?: string;
  portPassIssuedDate?: string;
  portPassExpiryDate?: string;
  portPassDaysUntilExpiry?: number;
  portPassRenewalDue?: boolean;
  portPassStatus?: string;
}

export const vehicleService = {
  /**
   * Fetch all registered fleet vehicles from the Spring Boot backend.
   * Dynamically supports status, operator, and search filters.
   * Accessible to Supervisor, Driver, and Admin roles.
   */
  async getAllVehicles(status?: string, operator?: string, search?: string): Promise<Vehicle[]> {
    const params: Record<string, string> = {};
    if (status && status !== 'ALL') params.status = status;
    if (operator && operator !== 'ALL') params.operator = operator;
    if (search && search.trim()) params.search = search.trim();

    try {
      const response = await apiClient.get<Vehicle[]>('/vehicles', { params });
      return Array.isArray(response.data) ? response.data : [];
    } catch (err) {
      console.warn('[vehicleService] Failed to load vehicles from /vehicles:', err);
      return [];
    }
  },

  /**
   * Fetch single vehicle by UUID.
   */
  async getVehicleById(id: string): Promise<Vehicle | null> {
    try {
      const response = await apiClient.get<Vehicle>(`/vehicles/${id}`);
      return response.data;
    } catch (err) {
      console.warn(`[vehicleService] Failed to load vehicle by id ${id}:`, err);
      return null;
    }
  },

  /**
   * Fetch single vehicle by license plate number (e.g. LY-6439).
   */
  async getVehicleByNumber(vehicleNumber: string): Promise<Vehicle | null> {
    try {
      const response = await apiClient.get<Vehicle>(`/vehicles/by-number/${encodeURIComponent(vehicleNumber)}`);
      return response.data;
    } catch (err) {
      console.warn(`[vehicleService] Failed to load vehicle by number ${vehicleNumber}:`, err);
      return null;
    }
  },
};

