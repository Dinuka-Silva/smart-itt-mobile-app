import axios, { AxiosError } from 'axios';
import { storage } from './storage';
import API_BASE_URL, { API_KEY } from '../config/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-API-KEY': API_KEY,
  },
  timeout: 20000,
});

// Listener for 401 unauthorized session expiry
type UnauthorizedHandler = () => void;
let unauthorizedHandler: UnauthorizedHandler | null = null;

export function registerUnauthorizedHandler(handler: UnauthorizedHandler) {
  unauthorizedHandler = handler;
}

/**
 * Extracts a clean, user-friendly error message from an API or network error.
 */
export function getApiErrorMessage(
  error: any,
  fallback = 'Unable to connect to server. Please check your network connection.'
): string {
  if (!error) return fallback;

  // Network connection failures (offline, backend down, unreachable IP, timeout)
  if (
    !error.response ||
    error.isNetworkError ||
    error.message === 'Network Error' ||
    error.code === 'ERR_NETWORK' ||
    error.code === 'ECONNABORTED' ||
    error.code === 'ETIMEDOUT'
  ) {
    return 'Unable to connect to server. Please check your network connection.';
  }

  // Server returned an error response
  if (error.response?.data) {
    const data = error.response.data;
    if (typeof data === 'string' && data.length < 200) return data;
    if (data.message && typeof data.message === 'string') return data.message;
    if (data.error && typeof data.error === 'string') return data.error;
  }

  if (error.message && typeof error.message === 'string' && !error.message.includes('object Object')) {
    return error.message;
  }

  return fallback;
}

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await storage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // Avoid verbose logging of internal token reads
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling and session termination
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response) {
      const status = error.response.status;

      // Session expiration or revoked credentials
      if (status === 401) {
        console.warn('[Security] Session expired or unauthorized (401). Triggering session cleanup.');
        if (unauthorizedHandler) {
          unauthorizedHandler();
        }
      } else if (status === 403) {
        console.warn('[Security] Access forbidden (403): Insufficient role privileges.');
      } else if (status >= 500) {
        console.warn(`[API] Server responded with error status ${status}`);
      }
    } else if (error.request) {
      // Request made but offline / timeout / connection refused
      console.warn(`[Network] Connection failed to ${error.config?.baseURL || ''}${error.config?.url || ''}:`, error.message);
      (error as any).isNetworkError = true;
      (error as any).userFriendlyMessage =
        'Unable to connect to server. Please check your network connection.';
    } else {
      console.warn('[Network] Request configuration error:', error.message);
      (error as any).userFriendlyMessage =
        'Unable to connect to server. Please check your network connection.';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
