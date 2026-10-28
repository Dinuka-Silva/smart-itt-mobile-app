import axios, { AxiosError } from 'axios';
import { storage } from './storage';
import API_BASE_URL, { API_KEY } from '../config/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-API-KEY': API_KEY,
  },
  timeout: 15000,
});

// Listener for 401 unauthorized session expiry
type UnauthorizedHandler = () => void;
let unauthorizedHandler: UnauthorizedHandler | null = null;

export function registerUnauthorizedHandler(handler: UnauthorizedHandler) {
  unauthorizedHandler = handler;
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
      // Request made but offline / timeout
      console.warn('[Network] Host unreachable or request timed out.');
    } else {
      console.warn('[Network] Request configuration error.');
    }
    return Promise.reject(error);
  }
);

export default apiClient;
