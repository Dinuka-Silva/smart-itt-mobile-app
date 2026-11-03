import apiClient from './api';

export interface PhotoUploadResponse {
  id: string;
  tripId: string;
  containerId?: string;
  containerNumber?: string;
  originalFilename: string;
  contentType: string;
  sizeBytes: number;
  sha256Hash: string;
  uploadedBy: string;
  uploadedAt: string;
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  verifiedBy?: string;
  verifiedAt?: string;
  verificationNote?: string;
  viewUrl: string;
}

export interface PhotoVerifyRequest {
  status: 'VERIFIED' | 'REJECTED';
  note?: string;
}

export interface StorageStatsResponse {
  totalPhotos?: number;
  totalFiles?: number;
  totalSizeBytes: number;
  totalSizeGb?: number;
  freeDiskSpaceBytes: number;
  freeDiskSpaceGb: number;
  totalDiskSpaceBytes?: number;
  totalDiskSpaceGb?: number;
  freeSpacePercentage?: number;
  lowDiskSpaceWarning?: boolean;
  storageDirectory?: string;
  retentionMonths?: number;
}

export const photoService = {
  async uploadPhoto(params: {
    tripId: string;
    containerId?: string;
    containerNumber?: string;
    uri: string;
    mimeType?: string;
    fileName?: string;
  }): Promise<PhotoUploadResponse> {
    const formData = new FormData();
    formData.append('tripId', params.tripId);
    if (params.containerId) formData.append('containerId', params.containerId);
    if (params.containerNumber) formData.append('containerNumber', params.containerNumber);

    const filename = params.fileName || `container_${Date.now()}.jpg`;
    const type = params.mimeType || 'image/jpeg';

    // React Native FormData format
    // @ts-ignore
    formData.append('file', {
      uri: params.uri,
      name: filename,
      type,
    });

    const response = await apiClient.post<PhotoUploadResponse>('/container-photos/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async getPhotosByTrip(tripId: string): Promise<PhotoUploadResponse[]> {
    const response = await apiClient.get<PhotoUploadResponse[]>(`/container-photos/trip/${tripId}`);
    return response.data;
  },

  async getPhotoByContainer(tripId: string, containerNumber: string): Promise<PhotoUploadResponse | null> {
    try {
      const response = await apiClient.get<PhotoUploadResponse>(`/container-photos/trip/${tripId}/container/${containerNumber}`);
      return response.data;
    } catch {
      return null;
    }
  },

  async verifyPhoto(id: string, request: PhotoVerifyRequest): Promise<PhotoUploadResponse> {
    const response = await apiClient.patch<PhotoUploadResponse>(`/container-photos/${id}/verify`, request);
    return response.data;
  },

  async softDeletePhoto(id: string): Promise<void> {
    await apiClient.delete(`/container-photos/${id}`);
  },

  async getStorageStats(): Promise<StorageStatsResponse> {
    const response = await apiClient.get<StorageStatsResponse>('/container-photos/storage/stats');
    return response.data;
  },
};

