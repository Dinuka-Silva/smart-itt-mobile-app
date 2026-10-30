import apiClient from './api';
import { adminFleetStore } from '../store/adminFleetStore';

export interface DriverProfile {
  id: string;
  driverCode: string;
  username: string;
  employeeId: string;
  fullName: string;
  nic: string;
  mobileNumber: string;
  email?: string;
  address?: string;
  licenseNumber?: string;
  licenseExpiryDate?: string;
  dateOfBirth?: string;
  emergencyContactName?: string;
  emergencyContactNumber?: string;
  profilePhoto?: string;
  coverImage?: string;
  vehicleNumber?: string;
  chassisNumber?: string;
  cheNumber?: string;
  operator?: string;
  vehicleLicenseIssuedDate?: string;
  vehicleLicenseExpiryDate?: string;
  vehicleLicenseDaysLeft?: number;
  vehicleLicenseRenewalDue?: boolean;
  vehicleLicenseStatus?: 'VALID' | 'RENEWAL_DUE' | 'EXPIRED';
  driverPortPassExpiryDate?: string;
  vehiclePortPassExpiryDate?: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

export const driverService = {
  async getProfile(driverIdOrCode?: string): Promise<DriverProfile | null> {
    const fallbackId = driverIdOrCode || 'DRV-00001';
    try {
      const res = await Promise.race([
        apiClient.get<DriverProfile>('/drivers/me'),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000)),
      ]);
      return res.data;
    } catch {
      try {
        const res = await Promise.race([
          apiClient.get<DriverProfile>(`/drivers/${fallbackId}`),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000)),
        ]);
        return res.data;
      } catch {
        // Fallback to local adminFleetStore for instant display
        const local = adminFleetStore.getDriver(fallbackId);
        if (local) {
          return {
            id: local.id,
            driverCode: local.driverCode,
            username: local.username || local.driverCode,
            employeeId: local.employeeId,
            fullName: local.fullName,
            nic: local.nic,
            mobileNumber: local.mobileNumber,
            email: local.email,
            address: local.address,
            licenseNumber: local.licenseNumber,
            licenseExpiryDate: local.licenseExpiryDate,
            dateOfBirth: local.dateOfBirth,
            emergencyContactName: local.emergencyContactName,
            emergencyContactNumber: local.emergencyContactNumber,
            profilePhoto: local.profilePhoto,
            coverImage: local.coverImage,
            vehicleNumber: local.vehicleNumber,
            chassisNumber: local.chassisNumber,
            cheNumber: local.cheNumber,
            operator: local.operator,
            driverPortPassExpiryDate: local.driverPortPassExpiryDate,
            vehiclePortPassExpiryDate: local.vehiclePortPassExpiryDate,
            status: local.status,
            createdAt: local.createdAt,
          };
        }
        return null;
      }
    }
  },

  async getDriverById(id: string): Promise<DriverProfile> {
    try {
      const response = await Promise.race([
        apiClient.get<DriverProfile>(`/drivers/${id}`),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000)),
      ]);
      return response.data;
    } catch {
      const local = adminFleetStore.getDriver(id);
      if (local) {
        return {
          id: local.id,
          driverCode: local.driverCode,
          username: local.username || local.driverCode,
          employeeId: local.employeeId,
          fullName: local.fullName,
          nic: local.nic,
          mobileNumber: local.mobileNumber,
          email: local.email,
          address: local.address,
          licenseNumber: local.licenseNumber,
          licenseExpiryDate: local.licenseExpiryDate,
          dateOfBirth: local.dateOfBirth,
          emergencyContactName: local.emergencyContactName,
          emergencyContactNumber: local.emergencyContactNumber,
          profilePhoto: local.profilePhoto,
          coverImage: local.coverImage,
          vehicleNumber: local.vehicleNumber,
          chassisNumber: local.chassisNumber,
          cheNumber: local.cheNumber,
          operator: local.operator,
          driverPortPassExpiryDate: local.driverPortPassExpiryDate,
          vehiclePortPassExpiryDate: local.vehiclePortPassExpiryDate,
          status: local.status,
          createdAt: local.createdAt,
        };
      }
      throw new Error(`Driver ${id} not found`);
    }
  },

  async getAllDrivers(status?: string): Promise<DriverProfile[]> {
    const params = status ? { status } : {};
    const response = await apiClient.get<DriverProfile[]>('/drivers', { params });
    return response.data;
  },

  async updateStatus(id: string, status: string): Promise<DriverProfile> {
    const response = await apiClient.patch<DriverProfile>(`/drivers/${id}/status`, { status });
    return response.data;
  },

  async updatePhotos(id: string, profilePhoto?: string, coverImage?: string): Promise<DriverProfile> {
    const response = await apiClient.patch<DriverProfile>(`/drivers/${id}/photos`, {
      profilePhoto,
      coverImage,
    });
    return response.data;
  },

  async updateDriver(idOrCode: string, payload: Partial<DriverProfile>): Promise<DriverProfile> {
    const response = await apiClient.put<DriverProfile>(`/drivers/${idOrCode}`, payload);
    return response.data;
  },
};
