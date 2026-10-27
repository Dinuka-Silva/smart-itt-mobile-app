import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';
export const API_KEY = import.meta.env.VITE_API_KEY || 'smart-itt-sec-key-prod-2026';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-API-KEY': API_KEY,
  },
  timeout: 12000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('smart_itt_admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response && err.response.status === 401) {
      localStorage.removeItem('smart_itt_admin_token');
      localStorage.removeItem('smart_itt_admin_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '#/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
