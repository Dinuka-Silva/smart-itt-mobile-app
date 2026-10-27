import api from '../api';

export interface AdminStats {
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

export const adminWebService = {
  // Authentication
  login: async (credentials: { username: string; password: string }) => {
    const res = await api.post('/auth/login', credentials);
    if (res.data?.token) {
      localStorage.setItem('smart_itt_admin_token', res.data.token);
      localStorage.setItem('smart_itt_admin_user', JSON.stringify(res.data.user || res.data));
    }
    return res.data;
  },

  logout: () => {
    localStorage.removeItem('smart_itt_admin_token');
    localStorage.removeItem('smart_itt_admin_user');
  },

  getCurrentUser: () => {
    try {
      const u = localStorage.getItem('smart_itt_admin_user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  },

  // Dashboard
  getStats: async (): Promise<AdminStats> => {
    const res = await api.get<AdminStats>('/admin/dashboard');
    return res.data;
  },

  // Drivers
  getDrivers: async (search?: string, status?: string) => {
    const params: Record<string, string> = {};
    if (search) params.search = search;
    if (status) params.status = status;
    const res = await api.get<any[]>('/admin/drivers', { params });
    return res.data;
  },

  createDriver: async (data: any) => {
    const res = await api.post('/admin/drivers', data);
    return res.data;
  },

  updateDriver: async (id: string, data: any) => {
    const res = await api.put(`/admin/drivers/${id}`, data);
    return res.data;
  },

  updateDriverStatus: async (id: string, status: string, reason?: string) => {
    const res = await api.patch(`/admin/drivers/${id}/status`, { status, reason });
    return res.data;
  },

  resetDriverPassword: async (id: string, newPassword?: string) => {
    const res = await api.post(`/admin/drivers/${id}/reset-password`, { newPassword: newPassword || 'driver' });
    return res.data;
  },

  // Supervisors
  getSupervisors: async (search?: string, status?: string) => {
    const params: Record<string, string> = {};
    if (search) params.search = search;
    if (status) params.status = status;
    const res = await api.get<any[]>('/admin/supervisors', { params });
    return res.data;
  },

  createSupervisor: async (data: any) => {
    const res = await api.post('/admin/supervisors', data);
    return res.data;
  },

  updateSupervisor: async (id: string, data: any) => {
    const res = await api.put(`/admin/supervisors/${id}`, data);
    return res.data;
  },

  updateSupervisorStatus: async (id: string, status: string, reason?: string) => {
    const res = await api.patch(`/admin/supervisors/${id}/status`, { status, reason });
    return res.data;
  },

  resetSupervisorPassword: async (id: string, newPassword?: string) => {
    const res = await api.post(`/admin/supervisors/${id}/reset-password`, { newPassword: newPassword || 'supervisor' });
    return res.data;
  },

  // Vehicles
  getVehicles: async (search?: string, operator?: string, status?: string) => {
    const params: Record<string, string> = {};
    if (search) params.search = search;
    if (operator) params.operator = operator;
    if (status) params.status = status;
    const res = await api.get<any[]>('/admin/vehicles', { params });
    return res.data;
  },

  createVehicle: async (data: any) => {
    const res = await api.post('/admin/vehicles', data);
    return res.data;
  },

  updateVehicle: async (id: string, data: any) => {
    const res = await api.put(`/admin/vehicles/${id}`, data);
    return res.data;
  },

  // Trips
  getTrips: async (search?: string, status?: string, terminal?: string, startDate?: string, endDate?: string) => {
    const params: Record<string, string> = {};
    if (search) params.search = search;
    if (status) params.status = status;
    if (terminal) params.terminal = terminal;
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    const res = await api.get<any[]>('/admin/trips', { params });
    return res.data;
  },

  getTripById: async (id: string) => {
    const res = await api.get<any>(`/admin/trips/${id}`);
    return res.data;
  },

  actionTrip: async (id: string, status: string, reason?: string) => {
    const res = await api.post<any>(`/admin/trips/${id}/action`, { status, reason });
    return res.data;
  },

  // Containers
  searchContainers: async (containerNumber?: string, size?: string, terminal?: string) => {
    const params: Record<string, string> = {};
    if (containerNumber) params.containerNumber = containerNumber;
    if (size) params.size = size;
    if (terminal) params.terminal = terminal;
    const res = await api.get<any[]>('/admin/containers', { params });
    return res.data;
  },

  // Audit Logs
  getAuditLogs: async (page = 0, size = 50, entityType?: string, action?: string) => {
    const params: Record<string, any> = { page, size };
    if (entityType) params.entityType = entityType;
    if (action) params.action = action;
    const res = await api.get<any>('/admin/audit-logs', { params });
    return res.data;
  },

  // Terminals
  getTerminals: async () => {
    const res = await api.get<any[]>('/terminals');
    return res.data;
  },
};
