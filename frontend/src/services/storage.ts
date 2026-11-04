import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const memoryStore = new Map<string, string>();
const CHUNK_SIZE = 1800; // Strictly under Android KeyStore 2048-byte hardware threshold

/**
 * Sanitizes keys to adhere strictly to SecureStore key specification:
 * Keys must not be empty and contain only alphanumeric characters, '.', '-', and '_'.
 */
function sanitizeKey(rawKey: string): string {
  if (!rawKey) return '_default_key_';
  return rawKey.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export const storage = {
  async getItem(key: string): Promise<string | null> {
    const cleanKey = sanitizeKey(key);
    if (memoryStore.has(cleanKey)) {
      return memoryStore.get(cleanKey) || null;
    }

    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          const val = window.localStorage.getItem(cleanKey);
          if (val !== null) memoryStore.set(cleanKey, val);
          return val;
        }
      } catch (e) {
        console.warn('LocalStorage getItem error:', e);
      }
      return null;
    }

    try {
      // 1. Fast path: Direct read of key (standard single-item record).
      // Cuts native KeyStore bridge roundtrips by 50% for standard items.
      const val = await SecureStore.getItemAsync(cleanKey);
      if (val !== null) {
        memoryStore.set(cleanKey, val);
        return val;
      }

      // 2. Fallback path: Only check chunk markers if direct key was null
      const chunkCountStr = await SecureStore.getItemAsync(`${cleanKey}__chunks`);
      if (chunkCountStr) {
        const numChunks = parseInt(chunkCountStr, 10);
        if (!isNaN(numChunks) && numChunks > 0) {
          let assembled = '';
          for (let i = 0; i < numChunks; i++) {
            const part = await SecureStore.getItemAsync(`${cleanKey}__c${i}`);
            if (part) assembled += part;
          }
          if (assembled) {
            memoryStore.set(cleanKey, assembled);
            return assembled;
          }
        }
      }

      return null;
    } catch (e) {
      console.warn('SecureStore getItem error:', e);
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    const cleanKey = sanitizeKey(key);
    memoryStore.set(cleanKey, value);

    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(cleanKey, value);
        }
      } catch (e) {
        console.warn('LocalStorage setItem error:', e);
      }
      return;
    }

    try {
      // Chunking for values that exceed Android KeyStore limit
      if (value.length > CHUNK_SIZE) {
        const numChunks = Math.ceil(value.length / CHUNK_SIZE);
        await SecureStore.setItemAsync(`${cleanKey}__chunks`, String(numChunks));
        for (let i = 0; i < numChunks; i++) {
          const slice = value.substring(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
          await SecureStore.setItemAsync(`${cleanKey}__c${i}`, slice);
        }
        // Remove standard single-key record if previously existed
        try {
          await SecureStore.deleteItemAsync(cleanKey);
        } catch {}
      } else {
        // Clear any old chunk markers
        try {
          await SecureStore.deleteItemAsync(`${cleanKey}__chunks`);
        } catch {}
        await SecureStore.setItemAsync(cleanKey, value);
      }
    } catch (e) {
      console.warn('SecureStore setItem error:', e);
    }
  },

  async removeItem(key: string): Promise<void> {
    const cleanKey = sanitizeKey(key);
    memoryStore.delete(cleanKey);

    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(cleanKey);
        }
      } catch (e) {
        console.warn('LocalStorage removeItem error:', e);
      }
      return;
    }

    try {
      const chunkCountStr = await SecureStore.getItemAsync(`${cleanKey}__chunks`);
      if (chunkCountStr) {
        const numChunks = parseInt(chunkCountStr, 10);
        for (let i = 0; i < numChunks; i++) {
          try {
            await SecureStore.deleteItemAsync(`${cleanKey}__c${i}`);
          } catch {}
        }
        try {
          await SecureStore.deleteItemAsync(`${cleanKey}__chunks`);
        } catch {}
      }
      await SecureStore.deleteItemAsync(cleanKey);
    } catch (e) {
      console.warn('SecureStore removeItem error:', e);
    }
  },
};
