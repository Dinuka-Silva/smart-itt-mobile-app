import { Platform } from 'react-native';
import apiClient from './api';
import { getBaseUrl } from '../config/api';
import { useAuthStore } from '../store/authStore';

export interface PhotoUploadResponse {
  id: string;
  tripId: string;
  containerId?: string;
  containerNumber?: string;
  originalFilename?: string;
  contentType?: string;
  sizeBytes?: number;
  sha256Hash?: string;
  uploadedBy?: string;
  uploadedAt?: string;
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  verifiedBy?: string;
  verifiedAt?: string;
  verificationNote?: string;
  photoUrl: string;
  viewUrl?: string;
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
  /**
   * Constructs an absolute, authenticated image URL.
   * If a JWT token is available, it is appended as `?token=...` so that
   * standard <img> tags and React Native <Image> can authenticate cleanly.
   */
  getPhotoUrl(photoIdOrPath: string | undefined | null, explicitToken?: string): string {
    if (!photoIdOrPath) return '';

    const token = explicitToken || useAuthStore.getState().user?.token || '';
    const cleanPath = photoIdOrPath.trim();

    let fullUrl = '';
    if (cleanPath.startsWith('http://') || cleanPath.startsWith('https://')) {
      fullUrl = cleanPath;
    } else {
      const base = getBaseUrl().replace(/\/api\/v1\/?$/, '');
      if (cleanPath.startsWith('/')) {
        fullUrl = `${base}${cleanPath}`;
      } else {
        fullUrl = `${base}/api/v1/container-photos/${cleanPath}`;
      }
    }

    if (token && !fullUrl.includes('token=')) {
      const separator = fullUrl.includes('?') ? '&' : '?';
      return `${fullUrl}${separator}token=${encodeURIComponent(token)}`;
    }
    return fullUrl;
  },

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

    if (Platform.OS === 'web') {
      try {
        const response = await fetch(params.uri);
        const blob = await response.blob();
        formData.append('file', blob, filename);
      } catch {
        // Fallback if fetch fails
        formData.append('file', { uri: params.uri, name: filename, type } as unknown as Blob);
      }
    } else {
      // React Native native FormData format
      formData.append('file', {
        uri: params.uri,
        name: filename,
        type,
      } as unknown as Blob);
    }

    // On web, do not specify Content-Type so browser sets boundary.
    // On native, set multipart/form-data.
    const headers: Record<string, string> = {};
    if (Platform.OS !== 'web') {
      headers['Content-Type'] = 'multipart/form-data';
    }

    const response = await apiClient.post<PhotoUploadResponse>('/container-photos/upload', formData, {
      headers,
      transformRequest: Platform.OS === 'web' ? [(data) => data] : undefined,
    });

    const resData = response.data;
    if (!resData.viewUrl && resData.photoUrl) {
      resData.viewUrl = this.getPhotoUrl(resData.photoUrl);
    }
    return resData;
  },

  async getPhotosByTrip(tripId: string): Promise<PhotoUploadResponse[]> {
    const response = await apiClient.get<PhotoUploadResponse[]>(`/container-photos/trip/${tripId}`);
    return (response.data || []).map((p) => ({
      ...p,
      viewUrl: this.getPhotoUrl(p.photoUrl || p.id),
    }));
  },

  async getPhotoByContainer(tripId: string, containerNumber: string): Promise<PhotoUploadResponse | null> {
    try {
      const response = await apiClient.get<PhotoUploadResponse>(
        `/container-photos/trip/${tripId}/container/${encodeURIComponent(containerNumber)}`
      );
      if (response.data) {
        return {
          ...response.data,
          viewUrl: this.getPhotoUrl(response.data.photoUrl || response.data.id),
        };
      }
      return null;
    } catch {
      return null;
    }
  },

  async verifyPhoto(id: string, request: PhotoVerifyRequest): Promise<PhotoUploadResponse> {
    const response = await apiClient.patch<PhotoUploadResponse>(`/container-photos/${id}/verify`, request);
    const resData = response.data;
    if (!resData.viewUrl && resData.photoUrl) {
      resData.viewUrl = this.getPhotoUrl(resData.photoUrl);
    }
    return resData;
  },

  async softDeletePhoto(id: string): Promise<void> {
    await apiClient.delete(`/container-photos/${id}`);
  },

  async getStorageStats(): Promise<StorageStatsResponse> {
    const response = await apiClient.get<StorageStatsResponse>('/container-photos/storage/stats');
    return response.data;
  },
};
