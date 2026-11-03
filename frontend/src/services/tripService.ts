import apiClient from './api';

export interface TripFilterParams {
  driverId?: string;
  status?: string;
  vehicleNumber?: string;
  terminal?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  photoStatus?: string;
  unverifiedOnly?: boolean | string;
}

export interface Container {
  id: string;
  containerNumber: string;
  size?: string;
  sourceTerminal: string;
  destinationTerminal?: string;
  destTerminal?: string;
  status?: string;
  unloadedAt?: string;
  damageStatus?: string;
  cargoType?: string;
  sealNumber?: string;
  isVerified?: boolean;
  verifiedBy?: string;
  verifiedAt?: string;
  photoStatus?: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'NONE';
  photoUrl?: string;
}

export interface CreateTripRequest {
  driverId: string;
  sourceTerminal: string;
  destTerminal?: string;
  vehicleNumber?: string;
  chassisNumber?: string;
  vesselName?: string;
  notes?: string;
  containers: Omit<Container, 'id' | 'unloadedAt'>[];
}

export interface TripResponse {
  id: string;
  tripNumber?: string;
  driverId: string;
  driverName?: string;
  driverCode?: string;
  vehicleNumber?: string;
  chassisNumber?: string;
  vesselName?: string;
  sourceTerminal: string;
  destTerminal?: string;
  status: string;
  notes?: string;
  startTime?: string;
  endTime?: string;
  durationMinutes?: number;
  createdAt: string;
  updatedAt: string;
  containers: Container[];
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
}

export interface ApproveTripRequest {
  status: 'APPROVED' | 'REJECTED';
  supervisorId: string;
  reason?: string;
}

export const tripService = {
  async createTrip(request: CreateTripRequest): Promise<TripResponse> {
    const response = await apiClient.post<TripResponse>('/trips', request);
    return response.data;
  },

  async getTrips(
    filterOrDriverId?: TripFilterParams | string,
    status?: string
  ): Promise<TripResponse[]> {
    let params: Record<string, string> = {};
    if (filterOrDriverId && typeof filterOrDriverId === 'object') {
      params = { ...(filterOrDriverId as Record<string, string>) };
    } else {
      if (filterOrDriverId) params.driverId = filterOrDriverId;
      if (status) params.status = status;
    }
    
    const response = await apiClient.get<TripResponse[]>('/trips', { params });
    return response.data;
  },

  async getTripById(id: string): Promise<TripResponse> {
    const response = await apiClient.get<TripResponse>(`/trips/${id}`);
    return response.data;
  },

  async approveTrip(id: string, requestOrSupervisorId: ApproveTripRequest | string, reason?: string): Promise<TripResponse> {
    const payload: ApproveTripRequest = typeof requestOrSupervisorId === 'string'
      ? { status: 'APPROVED', supervisorId: requestOrSupervisorId, reason }
      : requestOrSupervisorId;
    const response = await apiClient.post<TripResponse>(`/trips/${id}/approve`, payload);
    return response.data;
  },

  async rejectTrip(id: string, supervisorId: string, reason: string): Promise<TripResponse> {
    const response = await apiClient.post<TripResponse>(`/trips/${id}/approve`, {
      status: 'REJECTED',
      supervisorId,
      reason,
    });
    return response.data;
  },

  async updateTripStatus(id: string, status: string): Promise<TripResponse> {
    return this.updateStatus(id, status);
  },

  async submitForApproval(id: string): Promise<TripResponse> {
    const response = await apiClient.post<TripResponse>(`/trips/${id}/submit`);
    return response.data;
  },

  async unloadContainer(tripId: string, containerId: string, unloadedAt: string): Promise<TripResponse> {
    const response = await apiClient.patch<TripResponse>(`/trips/${tripId}/containers/${containerId}/unload`, { unloadedAt });
    return response.data;
  },

  async verifyContainer(containerId: string, supervisorId?: string): Promise<any> {
    const response = await apiClient.patch(`/containers/${containerId}/verify`, null, {
      params: { verifiedBy: supervisorId },
    });
    return response.data;
  },

  async updateStatus(id: string, status: string): Promise<TripResponse> {
    const response = await apiClient.patch<TripResponse>(`/trips/${id}/status`, { status });
    return response.data;
  },
};
