import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const memoryStore = new Map<string, string>();
const CHUNK_SIZE = 1800; // Strictly under Android KeyStore 2048-byte hardware threshold

export const storage = {
  async getItem(key: string): Promise<string | null> {
    if (memoryStore.has(key)) {
      return memoryStore.get(key) || null;
    }

    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          const val = window.localStorage.getItem(key);
          if (val !== null) memoryStore.set(key, val);
          return val;
        }
      } catch (e) {
        console.warn('LocalStorage getItem error:', e);
      }
      return null;
    }

    try {
      // Check if data was saved in chunks (for records > 2KB on native)
      const chunkCountStr = await SecureStore.getItemAsync(`${key}__chunks`);
      if (chunkCountStr) {
        const numChunks = parseInt(chunkCountStr, 10);
        let assembled = '';
        for (let i = 0; i < numChunks; i++) {
          const part = await SecureStore.getItemAsync(`${key}__c${i}`);
          if (part) assembled += part;
        }
        if (assembled) {
          memoryStore.set(key, assembled);
          return assembled;
        }
      }

      const val = await SecureStore.getItemAsync(key);
      if (val !== null) {
        memoryStore.set(key, val);
      }
      return val;
    } catch (e) {
      console.warn('SecureStore getItem error:', e);
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    memoryStore.set(key, value);

    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(key, value);
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
        await SecureStore.setItemAsync(`${key}__chunks`, String(numChunks));
        for (let i = 0; i < numChunks; i++) {
          const slice = value.substring(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
          await SecureStore.setItemAsync(`${key}__c${i}`, slice);
        }
        // Remove standard single-key record if previously existed
        try {
          await SecureStore.deleteItemAsync(key);
        } catch {}
      } else {
        // Clear any old chunk markers
        try {
          await SecureStore.deleteItemAsync(`${key}__chunks`);
        } catch {}
        await SecureStore.setItemAsync(key, value);
      }
    } catch (e) {
      console.warn('SecureStore setItem error:', e);
    }
  },

  async removeItem(key: string): Promise<void> {
    memoryStore.delete(key);

    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(key);
        }
      } catch (e) {
        console.warn('LocalStorage removeItem error:', e);
      }
      return;
    }

    try {
      const chunkCountStr = await SecureStore.getItemAsync(`${key}__chunks`);
      if (chunkCountStr) {
        const numChunks = parseInt(chunkCountStr, 10);
        for (let i = 0; i < numChunks; i++) {
          try {
            await SecureStore.deleteItemAsync(`${key}__c${i}`);
          } catch {}
        }
        await SecureStore.deleteItemAsync(`${key}__chunks`);
      }
      await SecureStore.deleteItemAsync(key);
    } catch (e) {
      console.warn('SecureStore removeItem error:', e);
    }
  },
};
