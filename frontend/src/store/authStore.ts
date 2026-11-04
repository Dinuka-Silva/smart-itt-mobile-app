import { create } from 'zustand';
import { storage } from '../services/storage';
import apiClient, { registerUnauthorizedHandler } from '../services/api';
import { biometricService } from '../services/biometricService';
import { securityAuditService } from '../services/securityAuditService';
import { credentialStore } from '../services/credentialStore';

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
  isInitializing: boolean;
  isOfflineSession: boolean;
  rememberMe: boolean;
  isSessionLocked: boolean;
  sessionTimeoutMinutes: number;
  lastActiveTimestamp: number;
  isBiometricEnabled: boolean;
  logoutTargetRoute: string | null;
  initializeSession: () => Promise<boolean>;
  login: (user: User, rememberMe?: boolean, isOffline?: boolean) => Promise<void>;
  updateUser: (partialUser: Partial<User>) => void;
  setVehicleStatus: (status: 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE') => Promise<void>;
  logout: (targetRoute?: string) => Promise<void>;
  lockSession: () => void;
  unlockSession: () => void;
  touchActivity: () => void;
  setSessionTimeout: (minutes: number) => void;
  setBiometricEnabled: (enabled: boolean) => Promise<void>;
}

let initSessionInFlight: Promise<boolean> | null = null;

export const useAuthStore = create<AuthState>((set, get) => {
  // Register 401 unauth handler
  registerUnauthorizedHandler(() => {
    get().logout();
  });

  return {
    user: null,
    isAuthenticated: false,
    isInitializing: true,
    isOfflineSession: false,
    rememberMe: true,
    isSessionLocked: false,
    sessionTimeoutMinutes: 5, // Default 5 minutes auto-lock
    lastActiveTimestamp: Date.now(),
    isBiometricEnabled: false,
    logoutTargetRoute: null,

    initializeSession: (): Promise<boolean> => {
      // Reuse in-flight promise to prevent duplicate concurrent initialization
      if (initSessionInFlight) {
        return initSessionInFlight;
      }

      initSessionInFlight = (async (): Promise<boolean> => {
        try {
          // Safety timeout safeguard: 3.5s maximum to guarantee the app never hangs indefinitely
          const timeoutPromise = new Promise<boolean>((_, reject) => {
            setTimeout(() => reject(new Error('Session init timeout')), 3500);
          });

          const sessionRestorePromise = (async (): Promise<boolean> => {
            // Parallelize disk/SecureStore lookups
            const [rememberMeVal, savedSessionJson, savedToken] = await Promise.all([
              storage.getItem('itt_remember_me'),
              storage.getItem('itt_user_session'),
              storage.getItem('authToken'),
            ]);

            const isRemembered = rememberMeVal !== 'false'; // Default to true if not explicitly false

            if (isRemembered && savedSessionJson && savedToken) {
              const userObj = JSON.parse(savedSessionJson) as User;
              if (userObj && userObj.role && (userObj.username || userObj.driverCode)) {
                const identifier = userObj.username || userObj.driverCode || '';

                // Parallelize account status & biometric checks
                const [statusInfo, bioEnabled] = await Promise.all([
                  credentialStore.getAccountStatus(identifier),
                  biometricService.isUserBiometricEnabled(identifier),
                ]);

                if (statusInfo.status !== 'SUSPENDED' && statusInfo.status !== 'DEACTIVATED') {
                  set({
                    user: { ...userObj, token: savedToken },
                    isAuthenticated: true,
                    isSessionLocked: false,
                    isInitializing: false,
                    rememberMe: true,
                    lastActiveTimestamp: Date.now(),
                    isBiometricEnabled: bioEnabled,
                  });
                  return true;
                }
              }
            }
            return false;
          })();

          const restored = await Promise.race([sessionRestorePromise, timeoutPromise]);
          if (restored) {
            return true;
          }
        } catch (err) {
          console.warn('[AuthStore] initializeSession handled error/timeout:', err);
        } finally {
          initSessionInFlight = null;
        }

        set({
          user: null,
          isAuthenticated: false,
          isSessionLocked: false,
          isInitializing: false,
        });
        return false;
      })();

      return initSessionInFlight;
    },

    login: async (user: User, rememberMe: boolean = true, isOffline: boolean = false) => {
      try {
        await storage.setItem('authToken', user.token || 'offline-sec-token');
        await storage.setItem('itt_remember_me', rememberMe ? 'true' : 'false');

        const identifier = user.username || user.driverCode || user.employeeId || '';
        const bioEnabled = await biometricService.isUserBiometricEnabled(identifier);

        if (rememberMe) {
          await storage.setItem('itt_user_session', JSON.stringify(user));
          if (identifier) {
            await storage.setItem('itt_remembered_username', identifier);
          }
        } else {
          await storage.removeItem('itt_user_session');
          await storage.removeItem('itt_remembered_username');
        }

        set({
          user: { ...user, vehicleStatus: user.vehicleStatus || 'ACTIVE' },
          isAuthenticated: true,
          isSessionLocked: false,
          isInitializing: false,
          isOfflineSession: isOffline,
          rememberMe,
          lastActiveTimestamp: Date.now(),
          isBiometricEnabled: bioEnabled,
        });

        const roleLabel = user.role || 'USER';
        const displayName = user.name || user.fullName || user.username || 'User';
        let description = `${roleLabel} logged in: ${displayName} (${identifier})${isOffline ? ' [OFFLINE]' : ''}`;
        if (user.role === 'DRIVER' && user.vehicleNumber) {
          description += ` · Truck ${user.vehicleNumber}`;
        } else if (user.role === 'SUPERVISOR') {
          description += ` · Port Operations Supervisor`;
        } else if (user.role === 'ADMIN') {
          description += ` · System Administrator Console`;
        }

        await securityAuditService.logEvent(
          'LOGIN_SUCCESS',
          identifier || displayName,
          description,
          'INFO',
          user.role,
          {
            role: user.role,
            name: displayName,
            driverCode: user.driverCode,
            employeeId: user.employeeId,
            vehicleNumber: user.vehicleNumber,
            isOffline,
          }
        );

        // If online and user is a driver with assigned vehicle, update backend vehicle status
        if (!isOffline && user.role === 'DRIVER' && user.vehicleNumber) {
          apiClient
            .patch(`/vehicles/by-number/${encodeURIComponent(user.vehicleNumber)}/status`, {
              status: 'ACTIVE',
            })
            .catch((err: any) => console.warn('[AuthStore] Status update on login failed:', err?.message || err));
        }
      } catch (error) {
        console.error('Error saving session:', error);
        set({ user, isAuthenticated: true, isSessionLocked: false, isInitializing: false, lastActiveTimestamp: Date.now() });
      }
    },

    updateUser: (partialUser: Partial<User>) => {
      set((state) => {
        const updated = state.user ? { ...state.user, ...partialUser } : null;
        if (updated && state.rememberMe) {
          storage.setItem('itt_user_session', JSON.stringify(updated)).catch(() => {});
        }
        return { user: updated };
      });
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

    logout: async (targetRoute?: string) => {
      const currentUser = get().user;
      const isOffline = get().isOfflineSession;

      if (!isOffline && currentUser?.role === 'DRIVER' && currentUser.vehicleNumber) {
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

      if (currentUser) {
        const uIdentifier = currentUser.driverCode || currentUser.employeeId || currentUser.username || 'USER';
        securityAuditService.logEvent(
          'LOGOUT',
          uIdentifier,
          `${currentUser.role || 'User'} logged out: ${currentUser.name || uIdentifier}${targetRoute ? ` (redirecting to: ${targetRoute})` : ''}`,
          'INFO',
          currentUser.role
        ).catch(() => {});
      }

      try {
        await storage.removeItem('authToken');
        await storage.removeItem('itt_user_session');
        const rememberMeVal = await storage.getItem('itt_remember_me');
        if (rememberMeVal !== 'true') {
          await storage.removeItem('itt_remembered_username');
        }
      } catch (error) {
        console.error('Error clearing session on logout:', error);
      }

      set({
        user: null,
        isAuthenticated: false,
        isSessionLocked: false,
        isOfflineSession: false,
        logoutTargetRoute: targetRoute || null,
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
