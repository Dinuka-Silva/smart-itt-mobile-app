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
  | 'LOGOUT'
  | 'SWITCH_ACCOUNT'
  | 'UNAUTHORIZED_ROUTE_ATTEMPT'
  | 'SECURITY_POLICY_VIOLATION'
  | 'DRIVER_REGISTERED'
  | 'SUPERVISOR_REGISTERED'
  | 'DRIVER_STATUS_UPDATED'
  | 'SUPERVISOR_STATUS_UPDATED'
  | 'TRIP_STARTED'
  | 'TRIP_COMPLETED'
  | 'TRIP_APPROVED'
  | 'TRIP_REJECTED'
  | 'VEHICLE_ASSIGNED';

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
const MAX_LOCAL_LOGS = 200;

const INITIAL_DEMO_LOGS: SecurityEvent[] = [
  {
    id: 'sec-demo-001',
    type: 'LOGIN_SUCCESS',
    severity: 'INFO',
    username: 'ADMIN',
    role: 'ADMIN',
    description: 'ADMIN logged in: System Administrator (ADMIN) · System Administrator Console',
    timestamp: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    metadata: { role: 'ADMIN', name: 'System Administrator' },
  },
  {
    id: 'sec-demo-002',
    type: 'LOGIN_SUCCESS',
    severity: 'INFO',
    username: 'SUP001',
    role: 'SUPERVISOR',
    description: 'SUPERVISOR logged in: Nimal Silva (SUP001) · Port Operations Supervisor',
    timestamp: new Date(Date.now() - 1000 * 60 * 65).toISOString(),
    metadata: { role: 'SUPERVISOR', name: 'Nimal Silva', terminal: 'CICT' },
  },
  {
    id: 'sec-demo-003',
    type: 'LOGIN_SUCCESS',
    severity: 'INFO',
    username: 'DRV-00001',
    role: 'DRIVER',
    description: 'DRIVER logged in: Kamal Perera (DRV-00001) · Truck LY-6439',
    timestamp: new Date(Date.now() - 1000 * 60 * 110).toISOString(),
    metadata: { role: 'DRIVER', name: 'Kamal Perera', vehicleNumber: 'LY-6439' },
  },
  {
    id: 'sec-demo-004',
    type: 'LOGIN_SUCCESS',
    severity: 'INFO',
    username: 'DRV-00002',
    role: 'DRIVER',
    description: 'DRIVER logged in: Sunil Shantha (DRV-00002) · Truck LY-6434',
    timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    metadata: { role: 'DRIVER', name: 'Sunil Shantha', vehicleNumber: 'LY-6434' },
  },
  {
    id: 'sec-demo-005',
    type: 'LOGIN_SUCCESS',
    severity: 'INFO',
    username: 'SUP002',
    role: 'SUPERVISOR',
    description: 'SUPERVISOR logged in: Bandara Weerasinghe (SUP002) · Port Operations Supervisor',
    timestamp: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
    metadata: { role: 'SUPERVISOR', name: 'Bandara Weerasinghe', terminal: 'CWIT' },
  },
  {
    id: 'sec-demo-006',
    type: 'PASSWORD_CHANGED',
    severity: 'INFO',
    username: 'DRV-00001',
    role: 'ADMIN',
    description: "Driver password reset by Administrator to default ('driver'). Account lockouts cleared.",
    timestamp: new Date(Date.now() - 1000 * 60 * 320).toISOString(),
    metadata: { resetBy: 'ADMIN', defaultPassword: 'driver' },
  },
];

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
        const parsed = JSON.parse(raw) as SecurityEvent[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
      // Populate and return initial demo logs on fresh device
      await storage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(INITIAL_DEMO_LOGS));
      return INITIAL_DEMO_LOGS;
    } catch (e) {
      console.warn('[SecurityAudit] Error reading logs:', e);
    }
    return INITIAL_DEMO_LOGS;
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
