import { create } from 'zustand';
import { storage } from '../services/storage';
import apiClient, { registerUnauthorizedHandler } from '../services/api';
import { biometricService } from '../services/biometricService';
import { securityAuditService } from '../services/securityAuditService';

export type UserRole = 'DRIVER' | 'SUPERVISOR' | 'ADMIN';

export interface User {
  id: string;
  username: string;
  role: UserRole;
  name: string;
  fullName?: string;
  token: string;
  driverId?: string;
  driverCode?: string;
  supervisorId?: string;
  vehicleNumber?: string;
  employeeId?: string;
  nic?: string;
  mobileNumber?: string;
  email?: string;
  address?: string;
  licenseNumber?: string;
  licenseExpiryDate?: string;
  dateOfBirth?: string;
  emergencyContactName?: string;
  emergencyContactNumber?: string;
  status?: string;
  chaiNumber?: string;
  chassisNumber?: string;
  cheNumber?: string;
  operator?: string;
  profilePhoto?: string;
  coverImage?: string;
  vehicleStatus?: 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE';
  vehicleLicenseIssuedDate?: string;
  vehicleLicenseExpiryDate?: string;
  vehicleLicenseDaysLeft?: number;
  vehicleLicenseRenewalDue?: boolean;
  vehicleLicenseStatus?: 'VALID' | 'RENEWAL_DUE' | 'EXPIRED';
  driverPortPassExpiryDate?: string;
  vehiclePortPassExpiryDate?: string;
  supervisorPortPassExpiryDate?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isSessionLocked: boolean;
  sessionTimeoutMinutes: number;
  lastActiveTimestamp: number;
  isBiometricEnabled: boolean;
  login: (user: User) => Promise<void>;
  updateUser: (partialUser: Partial<User>) => void;
  setVehicleStatus: (status: 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE') => Promise<void>;
  logout: () => Promise<void>;
  lockSession: () => void;
  unlockSession: () => void;
  touchActivity: () => void;
  setSessionTimeout: (minutes: number) => void;
  setBiometricEnabled: (enabled: boolean) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => {
  // Register 401 unauth handler
  registerUnauthorizedHandler(() => {
    get().logout();
  });

  return {
    user: null,
    isAuthenticated: false,
    isSessionLocked: false,
    sessionTimeoutMinutes: 5, // Default 5 minutes auto-lock
    lastActiveTimestamp: Date.now(),
    isBiometricEnabled: false,

    login: async (user: User) => {
      try {
        await storage.setItem('authToken', user.token);
        const bioEnabled = await biometricService.isUserBiometricEnabled(user.username || user.driverCode || '');

        set({
          user: { ...user, vehicleStatus: user.vehicleStatus || 'ACTIVE' },
          isAuthenticated: true,
          isSessionLocked: false,
          lastActiveTimestamp: Date.now(),
          isBiometricEnabled: bioEnabled,
        });

        await securityAuditService.logEvent(
          'LOGIN_SUCCESS',
          user.username || user.name,
          `Successful login with role ${user.role}.`,
          'INFO',
          user.role
        );

        // If user is a driver with assigned vehicle, ensure backend knows it is ACTIVE
        if (user.role === 'DRIVER' && user.vehicleNumber) {
          apiClient
            .patch(`/vehicles/by-number/${encodeURIComponent(user.vehicleNumber)}/status`, {
              status: 'ACTIVE',
            })
            .catch((err: any) => console.warn('[AuthStore] Status update on login failed:', err?.message || err));
        }
      } catch (error) {
        console.error('Error saving token:', error);
        set({ user, isAuthenticated: true, isSessionLocked: false, lastActiveTimestamp: Date.now() });
      }
    },

    updateUser: (partialUser: Partial<User>) => {
      set((state) => ({
        user: state.user ? { ...state.user, ...partialUser } : null,
      }));
    },

    setVehicleStatus: async (status: 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE') => {
      const currentUser = get().user;
      if (!currentUser?.vehicleNumber) return;

      // Optimistically update store
      set((state) => ({
        user: state.user ? { ...state.user, vehicleStatus: status } : null,
      }));

      try {
        await apiClient.patch(`/vehicles/by-number/${encodeURIComponent(currentUser.vehicleNumber)}/status`, {
          status,
        });
      } catch (err) {
        console.warn('[AuthStore] setVehicleStatus failed:', err);
      }
    },

    logout: async () => {
      const currentUser = get().user;
      if (currentUser?.role === 'DRIVER' && currentUser.vehicleNumber) {
        try {
          await apiClient.patch(`/vehicles/by-number/${encodeURIComponent(currentUser.vehicleNumber)}/status`, {
            status: 'INACTIVE',
          });
        } catch (err) {
          console.warn('[AuthStore] Status update on logout failed:', err);
        }
        try {
          await apiClient.post('/auth/logout', {
            identifier: currentUser.driverCode || currentUser.username,
            vehicleNumber: currentUser.vehicleNumber,
          });
        } catch {}
      }

      try {
        await storage.removeItem('authToken');
      } catch (error) {
        console.error('Error deleting token:', error);
      }
      set({
        user: null,
        isAuthenticated: false,
        isSessionLocked: false,
        lastActiveTimestamp: Date.now(),
      });
    },

    lockSession: () => {
      const state = get();
      if (state.isAuthenticated && !state.isSessionLocked) {
        set({ isSessionLocked: true });
        securityAuditService.logEvent(
          'SESSION_AUTO_LOCKED',
          state.user?.username || 'USER',
          'Session automatically locked due to inactivity or background policy.',
          'INFO',
          state.user?.role
        );
      }
    },

    unlockSession: () => {
      const state = get();
      set({ isSessionLocked: false, lastActiveTimestamp: Date.now() });
      securityAuditService.logEvent(
        'SESSION_UNLOCKED',
        state.user?.username || 'USER',
        'Session successfully unlocked by operator.',
        'INFO',
        state.user?.role
      );
    },

    touchActivity: () => {
      set({ lastActiveTimestamp: Date.now() });
    },

    setSessionTimeout: (minutes: number) => {
      set({ sessionTimeoutMinutes: Math.max(1, minutes) });
    },

    setBiometricEnabled: async (enabled: boolean) => {
      const state = get();
      const identifier = state.user?.username || state.user?.driverCode || '';
      if (identifier) {
        await biometricService.setUserBiometricEnabled(identifier, enabled);
      }
      set({ isBiometricEnabled: enabled });
    },
  };
});
