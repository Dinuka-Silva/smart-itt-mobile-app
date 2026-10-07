import apiClient from './api';

export interface DashboardStats {
  totalDrivers: number;
  activeDrivers: number;
  totalTripsToday: number;
  tripsInProgress: number;
  completedTrips: number;
  pendingApprovals: number;
  approvedTrips: number;
  rejectedTrips: number;
  terminalWiseTrips: {
    CICT: number;
    CWIT: number;
    ECT: number;
    JCT: number;
    UCT: number;
    SAGT: number;
  };
}

export const dashboardService = {
  async getDashboard(): Promise<DashboardStats> {
    const response = await apiClient.get<DashboardStats>('/dashboard');
    return response.data;
  },
};
