/**
 * SMART ITT — Biometric Authentication Service
 * Hardware-backed Face ID, Touch ID & Fingerprint Verification
 */

import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';
import { storage } from './storage';

export interface BiometricStatus {
  hasHardware: boolean;
  isEnrolled: boolean;
  biometricType: 'FACE_ID' | 'FINGERPRINT' | 'IRIS' | 'NONE';
  label: string;
}

const BIOMETRIC_KEY_PREFIX = 'itt_bio_pref_';

export const biometricService = {
  /**
   * Inspects device biometric capabilities
   */
  async getStatus(): Promise<BiometricStatus> {
    if (Platform.OS === 'web') {
      return {
        hasHardware: false,
        isEnrolled: false,
        biometricType: 'NONE',
        label: 'Biometrics Unsupported on Web',
      };
    }

    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) {
        return {
          hasHardware: false,
          isEnrolled: false,
          biometricType: 'NONE',
          label: 'No Biometric Hardware',
        };
      }

      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();

      let biometricType: BiometricStatus['biometricType'] = 'NONE';
      let label = 'Biometric Authentication';

      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        biometricType = 'FACE_ID';
        label = Platform.OS === 'ios' ? 'Face ID' : 'Facial Recognition';
      } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        biometricType = 'FINGERPRINT';
        label = Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint';
      } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
        biometricType = 'IRIS';
        label = 'Iris Recognition';
      }

      return {
        hasHardware,
        isEnrolled,
        biometricType,
        label,
      };
    } catch (e) {
      console.warn('[BiometricService] Check error:', e);
      return {
        hasHardware: false,
        isEnrolled: false,
        biometricType: 'NONE',
        label: 'Biometrics Unavailable',
      };
    }
  },

  /**
   * Checks whether biometric login is enabled for the specified user on this device
   */
  async isUserBiometricEnabled(rawUsername: string): Promise<boolean> {
    if (!rawUsername) return false;
    const clean = rawUsername.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    try {
      const val = await storage.getItem(`${BIOMETRIC_KEY_PREFIX}${clean}`);
      return val === 'true';
    } catch {
      return false;
    }
  },

  /**
   * Enables or disables biometric login for a user
   */
  async setUserBiometricEnabled(rawUsername: string, enabled: boolean): Promise<void> {
    if (!rawUsername) return;
    const clean = rawUsername.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    await storage.setItem(`${BIOMETRIC_KEY_PREFIX}${clean}`, enabled ? 'true' : 'false');
  },

  /**
   * Prompts the native biometric authentication dialog
   */
  async authenticate(promptMessage: string = 'Verify your identity for SMART ITT'): Promise<{
    success: boolean;
    error?: string;
  }> {
    if (Platform.OS === 'web') {
      return { success: true };
    }

    try {
      const status = await this.getStatus();
      if (!status.hasHardware || !status.isEnrolled) {
        return {
          success: false,
          error: 'Biometric hardware is not configured or no biometrics are enrolled on this device.',
        };
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage,
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
        fallbackLabel: 'Use Device PIN / Password',
      });

      if (result.success) {
        return { success: true };
      }

      return {
        success: false,
        error: result.error === 'user_cancel' ? 'Authentication cancelled.' : 'Biometric verification failed.',
      };
    } catch (e: any) {
      return {
        success: false,
        error: e?.message || 'Biometric sensor error.',
      };
    }
  },
};
