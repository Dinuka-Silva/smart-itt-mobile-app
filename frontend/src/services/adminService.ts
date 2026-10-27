import apiClient from './api';

export interface AdminDashboardStats {
  totalDrivers: number;
  activeDrivers: number;
  suspendedDrivers: number;
  deactivatedDrivers: number;
  totalSupervisors: number;
  activeSupervisors: number;
  totalVehicles: number;
  activeVehicles: number;
  maintenanceVehicles: number;
  assignedVehicles: number;
  sckVehicles: number;
  sdrVehicles: number;
  todayTrips: number;
  tripsInProgress: number;
  tripsPendingApproval: number;
  tripsCompleted: number;
  tripsApproved: number;
  tripsRejected: number;
  totalTripsAllTime: number;
  totalContainers: number;
  twentyFtContainers: number;
  fortyFtContainers: number;
  terminalWiseTrips: Record<string, number>;
  recentTrips: any[];
  recentAuditLogs: any[];
}

export const adminService = {
  // Dashboard
  getDashboardStats: async (): Promise<AdminDashboardStats> => {
    const res = await apiClient.get<AdminDashboardStats>('/admin/dashboard');
    return res.data;
  },

  // Drivers
  getDrivers: async (search?: string, status?: string): Promise<any[]> => {
    const params: Record<string, string> = {};
    if (search) params.search = search;
    if (status) params.status = status;
    const res = await apiClient.get<any[]>('/admin/drivers', { params });
    return res.data;
  },

  getDriverById: async (id: string): Promise<any> => {
    const res = await apiClient.get<any>(`/admin/drivers/${id}`);
    return res.data;
  },

  createDriver: async (data: Record<string, any>): Promise<any> => {
    const res = await apiClient.post<any>('/admin/drivers', data);
    return res.data;
  },

  updateDriver: async (id: string, data: Record<string, any>): Promise<any> => {
    const res = await apiClient.put<any>(`/admin/drivers/${id}`, data);
    return res.data;
  },

  updateDriverStatus: async (id: string, status: string, reason?: string): Promise<any> => {
    const res = await apiClient.patch<any>(`/admin/drivers/${id}/status`, { status, reason });
    return res.data;
  },

  resetDriverPassword: async (id: string, newPassword?: string): Promise<any> => {
    const res = await apiClient.post<any>(`/admin/drivers/${id}/reset-password`, { newPassword: newPassword || 'driver' });
    return res.data;
  },

  // Supervisors
  getSupervisors: async (search?: string, status?: string): Promise<any[]> => {
    const params: Record<string, string> = {};
    if (search) params.search = search;
    if (status) params.status = status;
    const res = await apiClient.get<any[]>('/admin/supervisors', { params });
    return res.data;
  },

  createSupervisor: async (data: Record<string, any>): Promise<any> => {
    const res = await apiClient.post<any>('/admin/supervisors', data);
    return res.data;
  },

  updateSupervisor: async (id: string, data: Record<string, any>): Promise<any> => {
    const res = await apiClient.put<any>(`/admin/supervisors/${id}`, data);
    return res.data;
  },

  updateSupervisorStatus: async (id: string, status: string, reason?: string): Promise<any> => {
    const res = await apiClient.patch<any>(`/admin/supervisors/${id}/status`, { status, reason });
    return res.data;
  },

  resetSupervisorPassword: async (id: string, newPassword?: string): Promise<any> => {
    const res = await apiClient.post<any>(`/admin/supervisors/${id}/reset-password`, { newPassword: newPassword || 'supervisor' });
    return res.data;
  },

  // Vehicles
  getVehicles: async (search?: string, operator?: string, status?: string): Promise<any[]> => {
    const params: Record<string, string> = {};
    if (search) params.search = search;
    if (operator) params.operator = operator;
    if (status) params.status = status;
    const res = await apiClient.get<any[]>('/admin/vehicles', { params });
    return res.data;
  },

  createVehicle: async (data: Record<string, any>): Promise<any> => {
    const res = await apiClient.post<any>('/admin/vehicles', data);
    return res.data;
  },

  updateVehicle: async (id: string, data: Record<string, any>): Promise<any> => {
    const res = await apiClient.put<any>(`/admin/vehicles/${id}`, data);
    return res.data;
  },

  // Trips
  getTrips: async (search?: string, status?: string, terminal?: string, startDate?: string, endDate?: string): Promise<any[]> => {
    const params: Record<string, string> = {};
    if (search) params.search = search;
    if (status) params.status = status;
    if (terminal) params.terminal = terminal;
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    const res = await apiClient.get<any[]>('/admin/trips', { params });
    return res.data;
  },

  getTripById: async (id: string): Promise<any> => {
    const res = await apiClient.get<any>(`/admin/trips/${id}`);
    return res.data;
  },

  actionTrip: async (id: string, status: string, reason?: string): Promise<any> => {
    const res = await apiClient.post<any>(`/admin/trips/${id}/action`, { status, reason });
    return res.data;
  },

  // Containers
  searchContainers: async (containerNumber?: string, size?: string, terminal?: string): Promise<any[]> => {
    const params: Record<string, string> = {};
    if (containerNumber) params.containerNumber = containerNumber;
    if (size) params.size = size;
    if (terminal) params.terminal = terminal;
    const res = await apiClient.get<any[]>('/admin/containers', { params });
    return res.data;
  },

  // Audit Logs
  getAuditLogs: async (page = 0, size = 50, entityType?: string, action?: string): Promise<any> => {
    const params: Record<string, any> = { page, size };
    if (entityType) params.entityType = entityType;
    if (action) params.action = action;
    const res = await apiClient.get<any>('/admin/audit-logs', { params });
    return res.data;
  },

  // Terminals
  getTerminals: async (): Promise<any[]> => {
    const res = await apiClient.get<any[]>('/terminals');
    return res.data;
  },
};
