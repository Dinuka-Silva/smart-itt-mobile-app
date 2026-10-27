import { storage } from './storage';

export interface UserCredentialRecord {
  username: string;
  currentPassword: string;
  previousPasswords: string[];
  updatedAt: string;
  hasChangedPassword: boolean;
}

const STORAGE_PREFIX = 'itt_user_cred_';

function normalizeIdentifier(raw: string): string {
  return (raw || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export const credentialStore = {
  /**
   * Retrieves the credential record stored locally for a given username/code.
   */
  async getRecord(rawUsername: string): Promise<UserCredentialRecord | null> {
    const id = normalizeIdentifier(rawUsername);
    if (!id) return null;
    try {
      const data = await storage.getItem(`${STORAGE_PREFIX}${id}`);
      if (data) {
        return JSON.parse(data) as UserCredentialRecord;
      }
    } catch (e) {
      console.warn('[credentialStore] getRecord error:', e);
    }
    return null;
  },

  /**
   * Records a newly updated password for the given user, archiving all old passwords.
   */
  async recordPasswordChange(
    rawUsername: string,
    newPassword: string,
    oldPasswordGiven?: string
  ): Promise<void> {
    const id = normalizeIdentifier(rawUsername);
    if (!id || !newPassword) return;

    const existing = await this.getRecord(rawUsername);
    const prevPasswords = new Set<string>(existing?.previousPasswords || []);

    // Archive standard default passwords for the role
    if (id.startsWith('DRV') || id.includes('DRIVER')) {
      prevPasswords.add('driver');
      prevPasswords.add('password');
      prevPasswords.add('Password@123');
      prevPasswords.add('123456');
    } else if (id.startsWith('SUP') || id.includes('SUPERVISOR')) {
      prevPasswords.add('supervisor');
      prevPasswords.add('password');
      prevPasswords.add('Password@123');
      prevPasswords.add('123456');
    }

    if (existing?.currentPassword) {
      prevPasswords.add(existing.currentPassword);
    }
    if (oldPasswordGiven) {
      prevPasswords.add(oldPasswordGiven);
    }

    // Ensure the new password is never marked as an old password
    prevPasswords.delete(newPassword);

    const record: UserCredentialRecord = {
      username: rawUsername.trim(),
      currentPassword: newPassword,
      previousPasswords: Array.from(prevPasswords),
      updatedAt: new Date().toISOString(),
      hasChangedPassword: true,
    };

    const recordJson = JSON.stringify(record);

    // Save under normalized alphanumeric key (e.g. "DRV00001")
    await storage.setItem(`${STORAGE_PREFIX}${id}`, recordJson);

    // Also save under raw trimmed uppercase (e.g. "DRV-00001")
    const rawUpper = rawUsername.trim().toUpperCase();
    if (rawUpper !== id) {
      await storage.setItem(`${STORAGE_PREFIX}${rawUpper}`, recordJson);
    }

    console.info(`[credentialStore] Password updated for ${rawUsername}. ${prevPasswords.size} previous passwords archived.`);
  },

  /**
   * Checks whether the user has previously changed their password.
   */
  async hasUpdatedPassword(rawUsername: string): Promise<boolean> {
    const record = await this.getRecord(rawUsername);
    return !!record?.hasChangedPassword;
  },

  /**
   * Checks whether the entered password is an OLD password for this user.
   */
  async isOldPassword(rawUsername: string, testPassword: string): Promise<boolean> {
    const record = await this.getRecord(rawUsername);
    if (!record || !record.hasChangedPassword) {
      return false;
    }
    const cleanPass = (testPassword || '').trim();
    if (!cleanPass) return false;

    // If it matches the new password, it is NOT old
    if (cleanPass === record.currentPassword) {
      return false;
    }

    // Check if it matches any archived previous/default password
    return record.previousPasswords.some(
      (prev) => prev.toLowerCase() === cleanPass.toLowerCase() || prev === cleanPass
    );
  },

  /**
   * Gets the active newly updated password.
   */
  async getUpdatedPassword(rawUsername: string): Promise<string | null> {
    const record = await this.getRecord(rawUsername);
    return record?.hasChangedPassword ? record.currentPassword : null;
  },

  /**
   * Offline verification helper. Returns whether credentials are valid or if an old password was entered.
   */
  async verifyOffline(
    rawUsername: string,
    testPassword: string,
    role: 'DRIVER' | 'SUPERVISOR'
  ): Promise<{
    valid: boolean;
    isOldPassword?: boolean;
    errorMessage?: string;
  }> {
    const cleanPass = (testPassword || '').trim();
    const record = await this.getRecord(rawUsername);

    if (record && record.hasChangedPassword) {
      if (cleanPass === record.currentPassword) {
        return { valid: true };
      }

      const isOld = record.previousPasswords.some(
        (prev) => prev.toLowerCase() === cleanPass.toLowerCase() || prev === cleanPass
      );

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
        errorMessage: 'Incorrect username or password. Please try again.',
      };
    }

    // User has not changed password yet: accept initial default demo passwords
    const defaults =
      role === 'SUPERVISOR'
        ? ['supervisor', 'password', 'Password@123', '123456']
        : ['driver', 'password', 'Password@123', '123456'];

    if (defaults.includes(cleanPass)) {
      return { valid: true };
    }

    return {
      valid: false,
      errorMessage: 'Incorrect username or password. Please try again.',
    };
  },
};
