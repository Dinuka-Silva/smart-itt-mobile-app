import apiClient from './api';

export interface Container {
  id: string;
  containerNumber: string;
  sourceTerminal: string;
  destinationTerminal: string;
  unloadedAt?: string;
}

export interface CreateTripRequest {
  driverId: string;
  sourceTerminal: string;
  containers: Omit<Container, 'id' | 'unloadedAt'>[];
}

export interface TripResponse {
  id: string;
  driverId: string;
  sourceTerminal: string;
  status: string;
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

  async getTrips(driverId?: string, status?: string): Promise<TripResponse[]> {
    const params: Record<string, string> = {};
    if (driverId) params.driverId = driverId;
    if (status) params.status = status;
    
    const response = await apiClient.get<TripResponse[]>('/trips', { params });
    return response.data;
  },

  async getTripById(id: string): Promise<TripResponse> {
    const response = await apiClient.get<TripResponse>(`/trips/${id}`);
    return response.data;
  },

  async approveTrip(id: string, request: ApproveTripRequest): Promise<TripResponse> {
    const response = await apiClient.post<TripResponse>(`/trips/${id}/approve`, request);
    return response.data;
  },

  async submitForApproval(id: string): Promise<TripResponse> {
    const response = await apiClient.post<TripResponse>(`/trips/${id}/submit`);
    return response.data;
  },

  async unloadContainer(tripId: string, containerId: string, unloadedAt: string): Promise<TripResponse> {
    const response = await apiClient.patch<TripResponse>(`/trips/${tripId}/containers/${containerId}/unload`, { unloadedAt });
    return response.data;
  },

  async updateStatus(id: string, status: string): Promise<TripResponse> {
    const response = await apiClient.patch<TripResponse>(`/trips/${id}/status`, { status });
    return response.data;
  },
};
