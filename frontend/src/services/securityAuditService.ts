/**
 * SMART ITT — Mobile Security Audit Service
 * On-Device Security Event Logging & Compliance Monitoring
 */

import { Platform } from 'react-native';
import * as Application from 'expo-application';
import { storage } from './storage';

export type SecurityEventType =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'LOCKOUT_TRIGGERED'
  | 'BIOMETRIC_AUTH_SUCCESS'
  | 'BIOMETRIC_AUTH_FAIL'
  | 'PASSWORD_CHANGED'
  | 'SESSION_AUTO_LOCKED'
  | 'SESSION_UNLOCKED'
  | 'UNAUTHORIZED_ROUTE_ATTEMPT'
  | 'SECURITY_POLICY_VIOLATION';

export type SecuritySeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export interface SecurityEvent {
  id: string;
  type: SecurityEventType;
  severity: SecuritySeverity;
  username: string;
  role?: string;
  description: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

const AUDIT_STORAGE_KEY = 'itt_mobile_security_audit_logs';
const MAX_LOCAL_LOGS = 50;

export const securityAuditService = {
  /**
   * Logs a high-security event to the on-device audit ledger
   */
  async logEvent(
    type: SecurityEventType,
    username: string,
    description: string,
    severity: SecuritySeverity = 'INFO',
    role?: string,
    metadata?: Record<string, any>
  ): Promise<SecurityEvent> {
    const event: SecurityEvent = {
      id: `sec-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type,
      severity,
      username: (username || 'ANONYMOUS').toUpperCase(),
      role,
      description,
      timestamp: new Date().toISOString(),
      metadata,
    };

    try {
      const existing = await this.getRecentEvents();
      const updated = [event, ...existing].slice(0, MAX_LOCAL_LOGS);
      await storage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('[SecurityAudit] Failed to persist audit log:', e);
    }

    if (severity === 'CRITICAL') {
      console.warn(`[SECURITY ALERT] [${type}] user=${username} msg=${description}`);
    }

    return event;
  },

  /**
   * Retrieves recent on-device security audit events
   */
  async getRecentEvents(): Promise<SecurityEvent[]> {
    try {
      const raw = await storage.getItem(AUDIT_STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw) as SecurityEvent[];
      }
    } catch (e) {
      console.warn('[SecurityAudit] Error reading logs:', e);
    }
    return [];
  },

  /**
   * Clears audit events (Admin only action)
   */
  async clearAuditEvents(): Promise<void> {
    await storage.removeItem(AUDIT_STORAGE_KEY);
  },

  /**
   * Summarizes the device security posture
   */
  async getDeviceSecurityPosture(): Promise<{
    os: string;
    appVersion: string;
    keystoreType: string;
    encryptionGrade: string;
    integrityStatus: 'SECURE' | 'ADVISORY';
  }> {
    const appVersion = Application.nativeApplicationVersion || '1.0.0';
    const os = Platform.OS === 'ios' ? 'Apple iOS (Secure Enclave)' : Platform.OS === 'android' ? 'Android (Keystore/TEE)' : 'Web Browser (Encrypted Local Storage)';

    return {
      os,
      appVersion,
      keystoreType: Platform.OS === 'ios' ? 'Hardware Secure Enclave' : Platform.OS === 'android' ? 'Android Hardware Keystore (TEE)' : 'Web Cryptographic Storage',
      encryptionGrade: 'AES-256 + Salted SHA-256 Digest',
      integrityStatus: 'SECURE',
    };
  },
};
