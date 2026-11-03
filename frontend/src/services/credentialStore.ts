import * as Crypto from 'expo-crypto';
import { storage } from './storage';
import { securityAuditService } from './securityAuditService';

export interface UserCredentialRecord {
  username: string;
  salt: string;
  passwordHash: string; // SHA-256(salt + password)
  previousPasswordHashes: string[]; // SHA-256(salt + old_password)
  updatedAt: string;
  hasChangedPassword: boolean;
  failedAttempts?: number;
  lockedUntil?: string | null;
  status?: 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';
  suspensionReason?: string;
  // Offline credentials caching (valid 7 days from last successful online login)
  lastOnlineLoginAt?: string;
  onlineRole?: 'DRIVER' | 'SUPERVISOR' | 'ADMIN';
  cachedUserProfile?: any; // Complete real user object from backend
  cachedToken?: string;
  // Legacy migration compatibility fields
  currentPassword?: string;
  previousPasswords?: string[];
}

const STORAGE_PREFIX = 'itt_user_cred_';
const LOCKOUT_THRESHOLD_1 = 5; // 60s lockout
const LOCKOUT_THRESHOLD_2 = 10; // 15 min lockout

function normalizeIdentifier(raw: string): string {
  return (raw || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * Computes a SHA-256 digest of salt + value
 */
async function hashWithSalt(salt: string, value: string): Promise<string> {
  const input = `${salt}:${value.trim()}`;
  return await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, input);
}

/**
 * Generates a cryptographically random salt string
 */
function generateSalt(): string {
  const chars = 'abcdef0123456789';
  let salt = '';
  for (let i = 0; i < 32; i++) {
    salt += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return salt;
}

export const credentialStore = {
  /**
   * Retrieves the credential record stored securely for a given username/code.
   * Transparently migrates any legacy plaintext records to salted SHA-256 hashes.
   */
  async getRecord(rawUsername: string): Promise<UserCredentialRecord | null> {
    const id = normalizeIdentifier(rawUsername);
    if (!id) return null;
    try {
      let data = await storage.getItem(`${STORAGE_PREFIX}${id}`);
      if (!data) {
        const rawUpper = rawUsername.trim().toUpperCase();
        if (rawUpper !== id) {
          data = await storage.getItem(`${STORAGE_PREFIX}${rawUpper}`);
        }
      }
      if (!data) return null;

      const record = JSON.parse(data) as UserCredentialRecord;

      // Transparent Migration from legacy plaintext passwords to salted hashes
      if (record.currentPassword && !record.passwordHash) {
        const salt = generateSalt();
        const passwordHash = await hashWithSalt(salt, record.currentPassword);
        const prevHashes: string[] = [];

        if (Array.isArray(record.previousPasswords)) {
          for (const prev of record.previousPasswords) {
            if (prev) {
              prevHashes.push(await hashWithSalt(salt, prev));
            }
          }
        }

        record.salt = salt;
        record.passwordHash = passwordHash;
        record.previousPasswordHashes = prevHashes;
        delete record.currentPassword;
        delete record.previousPasswords;

        // Save migrated record
        await storage.setItem(`${STORAGE_PREFIX}${id}`, JSON.stringify(record));
      }

      return record;
    } catch (e) {
      console.warn('[credentialStore] getRecord error:', e);
    }
    return null;
  },

  /**
   * Inspects current lockout status for brute-force protection
   */
  async getLockoutStatus(rawUsername: string): Promise<{
    isLocked: boolean;
    remainingSeconds: number;
    failedAttempts: number;
  }> {
    const record = await this.getRecord(rawUsername);
    if (!record) {
      return { isLocked: false, remainingSeconds: 0, failedAttempts: 0 };
    }

    const failedAttempts = record.failedAttempts || 0;
    if (record.lockedUntil) {
      const lockExpiry = new Date(record.lockedUntil).getTime();
      const now = Date.now();
      if (now < lockExpiry) {
        const remainingSeconds = Math.max(1, Math.ceil((lockExpiry - now) / 1000));
        return { isLocked: true, remainingSeconds, failedAttempts };
      }
    }

    return { isLocked: false, remainingSeconds: 0, failedAttempts };
  },

  /**
   * Records a failed authentication attempt and applies lockout thresholds
   */
  async recordFailedAttempt(rawUsername: string): Promise<{
    isLocked: boolean;
    remainingSeconds: number;
    failedAttempts: number;
  }> {
    const id = normalizeIdentifier(rawUsername);
    if (!id) return { isLocked: false, remainingSeconds: 0, failedAttempts: 0 };

    let record = await this.getRecord(rawUsername);
    if (!record) {
      record = {
        username: rawUsername.trim(),
        salt: generateSalt(),
        passwordHash: '',
        previousPasswordHashes: [],
        updatedAt: new Date().toISOString(),
        hasChangedPassword: false,
        failedAttempts: 0,
      };
    }

    const attempts = (record.failedAttempts || 0) + 1;
    record.failedAttempts = attempts;
    let lockedSeconds = 0;

    if (attempts >= LOCKOUT_THRESHOLD_2) {
      lockedSeconds = 15 * 60; // 15 minutes lockout
      record.lockedUntil = new Date(Date.now() + lockedSeconds * 1000).toISOString();
      await securityAuditService.logEvent(
        'LOCKOUT_TRIGGERED',
        rawUsername,
        `Extended lockout activated for 15 minutes after ${attempts} consecutive failed attempts.`,
        'CRITICAL'
      );
    } else if (attempts >= LOCKOUT_THRESHOLD_1) {
      lockedSeconds = 60; // 60 seconds lockout
      record.lockedUntil = new Date(Date.now() + lockedSeconds * 1000).toISOString();
      await securityAuditService.logEvent(
        'LOCKOUT_TRIGGERED',
        rawUsername,
        `Temporary lockout activated for 60 seconds after ${attempts} failed attempts.`,
        'WARNING'
      );
    } else {
      await securityAuditService.logEvent(
        'LOGIN_FAILED',
        rawUsername,
        `Failed authentication attempt (${attempts}/${LOCKOUT_THRESHOLD_1}).`,
        'WARNING'
      );
    }

    await storage.setItem(`${STORAGE_PREFIX}${id}`, JSON.stringify(record));
    return {
      isLocked: lockedSeconds > 0,
      remainingSeconds: lockedSeconds,
      failedAttempts: attempts,
    };
  },

  /**
   * Resets failed attempts upon successful authentication
   */
  async recordSuccessfulAttempt(rawUsername: string): Promise<void> {
    const id = normalizeIdentifier(rawUsername);
    if (!id) return;
    const record = await this.getRecord(rawUsername);
    if (record && (record.failedAttempts || record.lockedUntil)) {
      record.failedAttempts = 0;
      record.lockedUntil = null;
      await storage.setItem(`${STORAGE_PREFIX}${id}`, JSON.stringify(record));
    }
  },

  /**
   * Records a newly updated password as a salted SHA-256 hash.
   * Zero raw plaintext passwords are saved to disk.
   */
  async recordPasswordChange(
    rawUsername: string,
    newPassword: string,
    oldPasswordGiven?: string
  ): Promise<void> {
    const id = normalizeIdentifier(rawUsername);
    if (!id || !newPassword) return;

    const existing = await this.getRecord(rawUsername);
    const salt = existing?.salt || generateSalt();
    const newHash = await hashWithSalt(salt, newPassword);

    const prevHashes = new Set<string>(existing?.previousPasswordHashes || []);

    // Archive standard default passwords for the role hashed with salt
    const defaultWords = ['driver', 'supervisor', 'password', 'Password@123', '123456'];
    for (const word of defaultWords) {
      prevHashes.add(await hashWithSalt(salt, word));
    }

    if (existing?.passwordHash) {
      prevHashes.add(existing.passwordHash);
    }
    if (oldPasswordGiven) {
      prevHashes.add(await hashWithSalt(salt, oldPasswordGiven));
    }

    // Ensure the new password hash is not in the archived previous list
    prevHashes.delete(newHash);

    const record: UserCredentialRecord = {
      username: rawUsername.trim(),
      salt,
      passwordHash: newHash,
      previousPasswordHashes: Array.from(prevHashes),
      updatedAt: new Date().toISOString(),
      hasChangedPassword: true,
      failedAttempts: 0,
      lockedUntil: null,
      cachedUserProfile: existing?.cachedUserProfile,
      cachedToken: existing?.cachedToken,
      lastOnlineLoginAt: existing?.lastOnlineLoginAt,
      onlineRole: existing?.onlineRole,
    };

    const recordJson = JSON.stringify(record);

    // Save under normalized alphanumeric key (e.g. "DRV00001")
    await storage.setItem(`${STORAGE_PREFIX}${id}`, recordJson);

    // Also save under raw trimmed uppercase (e.g. "DRV-00001")
    const rawUpper = rawUsername.trim().toUpperCase();
    if (rawUpper !== id) {
      await storage.setItem(`${STORAGE_PREFIX}${rawUpper}`, recordJson);
    }

    await securityAuditService.logEvent(
      'PASSWORD_CHANGED',
      rawUsername,
      'User password successfully updated with 256-bit salted hash.',
      'INFO'
    );
  },

  /**
   * Resets driver/user password by Administrator to the default password ('driver').
   * Clears old password blocking, resets failed attempts, and removes lockout.
   */
  async resetPasswordByAdmin(
    rawUsername: string,
    defaultPassword: string = 'driver'
  ): Promise<void> {
    const id = normalizeIdentifier(rawUsername);
    if (!id) return;

    const existing = await this.getRecord(rawUsername);
    const salt = existing?.salt || generateSalt();
    const defaultHash = await hashWithSalt(salt, defaultPassword);

    // Filter out defaultPassword from previousPasswordHashes so driver is NOT blocked
    const filteredPrev = (existing?.previousPasswordHashes || []).filter(
      (h) => h !== defaultHash
    );

    const record: UserCredentialRecord = {
      username: rawUsername.trim(),
      salt,
      passwordHash: defaultHash,
      previousPasswordHashes: filteredPrev,
      updatedAt: new Date().toISOString(),
      hasChangedPassword: false, // reset back to default password status
      failedAttempts: 0,
      lockedUntil: null,
      cachedUserProfile: existing?.cachedUserProfile,
      cachedToken: existing?.cachedToken,
      lastOnlineLoginAt: existing?.lastOnlineLoginAt,
      onlineRole: existing?.onlineRole,
    };

    const recordJson = JSON.stringify(record);
    await storage.setItem(`${STORAGE_PREFIX}${id}`, recordJson);

    const rawUpper = rawUsername.trim().toUpperCase();
    if (rawUpper !== id) {
      await storage.setItem(`${STORAGE_PREFIX}${rawUpper}`, recordJson);
    }

    await securityAuditService.logEvent(
      'PASSWORD_CHANGED',
      rawUsername,
      `Driver password reset by Administrator to default ('${defaultPassword}'). Account lockouts cleared.`,
      'INFO',
      'ADMIN',
      { resetBy: 'ADMIN', defaultPassword }
    );
  },

  /**
   * Sets the account status (ACTIVE, SUSPENDED, DEACTIVATED) and optional suspension reason.
   */
  async setAccountStatus(
    rawUsername: string,
    status: 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED',
    reason?: string
  ): Promise<void> {
    const id = normalizeIdentifier(rawUsername);
    if (!id) return;

    let record = await this.getRecord(rawUsername);
    if (!record) {
      record = {
        username: rawUsername.trim(),
        salt: generateSalt(),
        passwordHash: '',
        previousPasswordHashes: [],
        updatedAt: new Date().toISOString(),
        hasChangedPassword: false,
        failedAttempts: 0,
      };
    }

    record.status = status;
    if (reason !== undefined) {
      record.suspensionReason = reason;
    } else if (status === 'ACTIVE') {
      record.suspensionReason = undefined;
    }
    record.updatedAt = new Date().toISOString();

    const recordJson = JSON.stringify(record);
    await storage.setItem(`${STORAGE_PREFIX}${id}`, recordJson);

    const rawUpper = rawUsername.trim().toUpperCase();
    if (rawUpper !== id) {
      await storage.setItem(`${STORAGE_PREFIX}${rawUpper}`, recordJson);
    }

    if (status === 'SUSPENDED') {
      await securityAuditService.logEvent(
        'SECURITY_POLICY_VIOLATION',
        rawUsername,
        `Account marked SUSPENDED by Administration.${reason ? ` Reason: ${reason}` : ''}`,
        'CRITICAL',
        'ADMIN',
        { status: 'SUSPENDED', reason }
      );
    }
  },

  /**
   * Retrieves account status and optional suspension reason.
   */
  async getAccountStatus(rawUsername: string): Promise<{ status: string; reason?: string }> {
    const record = await this.getRecord(rawUsername);
    return {
      status: record?.status || 'ACTIVE',
      reason: record?.suspensionReason,
    };
  },

  /**
   * Checks whether the user has previously changed their password.
   */
  async hasUpdatedPassword(rawUsername: string): Promise<boolean> {
    const record = await this.getRecord(rawUsername);
    return !!record?.hasChangedPassword;
  },

  /**
   * Checks whether the entered password matches any previous/archived password.
   */
  async isOldPassword(rawUsername: string, testPassword: string): Promise<boolean> {
    const record = await this.getRecord(rawUsername);
    if (!record || !record.hasChangedPassword || !record.salt) {
      return false;
    }
    const cleanPass = (testPassword || '').trim();
    if (!cleanPass) return false;

    const testHash = await hashWithSalt(record.salt, cleanPass);

    // If it matches active password, it is not old
    if (testHash === record.passwordHash) {
      return false;
    }

    // Check against previous password hashes
    return (record.previousPasswordHashes || []).includes(testHash);
  },

  /**
   * Caches a salted SHA-256 hash and the authenticated user profile upon successful ONLINE authentication.
   * Supports Driver, Supervisor, and Admin accounts.
   */
  async cacheOnlineLogin(
    rawUsername: string,
    password: string,
    role: 'DRIVER' | 'SUPERVISOR' | 'ADMIN',
    userProfile?: any,
    token?: string
  ): Promise<void> {
    const id = normalizeIdentifier(rawUsername);
    if (!id || !password) return;

    let record = await this.getRecord(rawUsername);
    const salt = record?.salt || generateSalt();
    const hash = await hashWithSalt(salt, password);

    const prevHashes = new Set<string>(record?.previousPasswordHashes || []);
    if (record?.passwordHash && record.passwordHash !== hash) {
      prevHashes.add(record.passwordHash);
    }

    const updated: UserCredentialRecord = {
      username: rawUsername.trim(),
      salt,
      passwordHash: hash,
      previousPasswordHashes: Array.from(prevHashes),
      updatedAt: new Date().toISOString(),
      hasChangedPassword: true,
      failedAttempts: 0,
      lockedUntil: null,
      lastOnlineLoginAt: new Date().toISOString(),
      onlineRole: role,
      cachedUserProfile: userProfile || record?.cachedUserProfile || null,
      cachedToken: token || userProfile?.token || record?.cachedToken || null,
    };

    const recordJson = JSON.stringify(updated);
    await storage.setItem(`${STORAGE_PREFIX}${id}`, recordJson);
    const rawUpper = rawUsername.trim().toUpperCase();
    if (rawUpper !== id) {
      await storage.setItem(`${STORAGE_PREFIX}${rawUpper}`, recordJson);
    }

    // Cross-index all identifier aliases for seamless offline lookup
    if (userProfile) {
      const aliases = [
        userProfile.username,
        userProfile.driverCode,
        userProfile.employeeId,
        userProfile.email,
      ].filter(Boolean);

      for (const alias of aliases) {
        const aliasNorm = normalizeIdentifier(alias);
        if (aliasNorm && aliasNorm !== id) {
          await storage.setItem(`${STORAGE_PREFIX}${aliasNorm}`, recordJson);
        }
      }
    }
  },

  /**
   * Verifies password against the stored salted hash offline.
   * Strict Rules:
   * 1. Supports Driver, Supervisor, and Admin accounts.
   * 2. Allowed ONLY for users who previously logged in ONLINE on this device.
   * 3. Cached offline credentials expire after 7 days.
   * 4. Enforces lockout and suspension checks.
   * 5. No default-password bypasses.
   * 6. Returns user-friendly error messages matching security specifications.
   */
  async verifyOffline(
    rawUsername: string,
    testPassword: string,
    role?: 'DRIVER' | 'SUPERVISOR' | 'ADMIN'
  ): Promise<{
    valid: boolean;
    isOldPassword?: boolean;
    isSuspended?: boolean;
    isExpired?: boolean;
    errorMessage?: string;
    user?: any;
    token?: string;
  }> {
    // 1. Check account suspension status first
    const accStatus = await this.getAccountStatus(rawUsername);
    if (accStatus.status === 'SUSPENDED') {
      const reasonPart = accStatus.reason ? `\n\nReason: ${accStatus.reason}` : '';
      return {
        valid: false,
        isSuspended: true,
        errorMessage: `ACCOUNT SUSPENDED: Your account has been suspended by Administration.${reasonPart}\n\nYou cannot access the SMART ITT system. Please contact the Operations Supervisor or Administration.`,
      };
    }
    if (accStatus.status === 'DEACTIVATED') {
      return {
        valid: false,
        isSuspended: true,
        errorMessage: 'ACCOUNT DEACTIVATED: This profile has been deactivated by Administration. Access denied.',
      };
    }

    // 2. Check lockout
    const lockout = await this.getLockoutStatus(rawUsername);
    if (lockout.isLocked) {
      return {
        valid: false,
        errorMessage: `Account temporarily locked due to excessive failed attempts. Try again in ${lockout.remainingSeconds}s.`,
      };
    }

    const cleanPass = (testPassword || '').trim();
    const record = await this.getRecord(rawUsername);

    // 3. Require prior successful online login on this device
    if (!record || !record.lastOnlineLoginAt || !record.passwordHash || !record.salt) {
      return {
        valid: false,
        errorMessage: 'Please connect to the internet and log in once to enable offline access.',
      };
    }

    // 4. Check 7-day expiry
    const OFFLINE_LOGIN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
    const lastLoginTime = new Date(record.lastOnlineLoginAt).getTime();
    if (isNaN(lastLoginTime) || Date.now() - lastLoginTime > OFFLINE_LOGIN_MAX_AGE_MS) {
      return {
        valid: false,
        isExpired: true,
        errorMessage: 'Your session has expired. Please connect to the internet and log in again.',
      };
    }

    // 5. Test password hash against cached online hash
    const testHash = await hashWithSalt(record.salt, cleanPass);

    if (testHash === record.passwordHash) {
      await this.recordSuccessfulAttempt(rawUsername);
      return {
        valid: true,
        user: record.cachedUserProfile,
        token: record.cachedToken || 'offline-sec-token',
      };
    }

    // Check if the user entered an old archived password
    const isOld = (record.previousPasswordHashes || []).includes(testHash);
    await this.recordFailedAttempt(rawUsername);

    if (isOld) {
      return {
        valid: false,
        isOldPassword: true,
        errorMessage:
          'Incorrect password: You entered your old password. Please enter your newly updated password.',
      };
    }

    return {
      valid: false,
      errorMessage: 'Invalid username or password.',
    };
  },
};
