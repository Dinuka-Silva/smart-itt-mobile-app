import apiClient from './api';

export interface SupervisorDashboardStats {
  totalTripsToday: number;
  activeTrips: number;
  tripsPendingApproval: number;
  completedTripsToday: number;
  approvedTrips: number;
  rejectedTrips: number;
  totalContainersTransportedToday: number;
  registeredDrivers: number;
  activeDrivers: number;
  terminalWiseTrips?: Record<string, number>;
}

export interface DriverDashboardStats {
  activeTrips: number;
  completedTripsToday: number;
  containersTransportedToday: number;
  tripsPendingApproval: number;
  approvedAllowance: number;
  pendingAllowance: number;
  activeTrip: any | null;
}

export const dashboardService = {
  async getSupervisorDashboard(): Promise<SupervisorDashboardStats> {
    try {
      const res = await apiClient.get<SupervisorDashboardStats>('/dashboard');
      return res.data;
    } catch (e) {
      // Fallback sensible mock data
      return {
        totalTripsToday: 18,
        activeTrips: 6,
        tripsPendingApproval: 3,
        completedTripsToday: 9,
        approvedTrips: 9,
        rejectedTrips: 0,
        totalContainersTransportedToday: 24,
        registeredDrivers: 12,
        activeDrivers: 8,
        terminalWiseTrips: {
          CICT: 5,
          CWIT: 3,
          ECT: 4,
          JCT: 3,
          UCT: 1,
          SAGT: 2,
        },
      };
    }
  },

  async getDriverDashboard(driverId?: string): Promise<DriverDashboardStats> {
    try {
      const targetId = driverId || 'demo-driver';
      const res = await apiClient.get<DriverDashboardStats>(`/dashboard/driver/${targetId}`);
      return res.data;
    } catch (e) {
      return {
        activeTrips: 1,
        completedTripsToday: 3,
        containersTransportedToday: 5,
        tripsPendingApproval: 1,
        approvedAllowance: 7500,
        pendingAllowance: 2500,
        activeTrip: null,
      };
    }
  },
};
