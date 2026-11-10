import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Dynamically resolves the host IP address from Expo runtime metadata.
 * Works seamlessly across Expo Go, standalone development builds, physical mobile devices, and emulators.
 */
function resolveHostIp(): string | null {
  // 1. Primary Expo SDK 49+ host URI (e.g. "192.168.1.100:8081")
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
      return ip;
    }
  }

  // 2. Fallback to debuggerHost across various Expo manifest versions
  const debuggerHost =
    (Constants as any)?.expoGoConfig?.debuggerHost ||
    (Constants.expoConfig as any)?.debuggerHost ||
    (Constants.manifest as any)?.debuggerHost ||
    (Constants as any)?.manifest2?.extra?.expoGo?.debuggerHost ||
    (Constants as any)?.manifest2?.extra?.expoClient?.hostUri;
  if (typeof debuggerHost === 'string' && debuggerHost) {
    const ip = debuggerHost.split(':')[0];
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
      return ip;
    }
  }

  // 3. Fallback to linkingUri / experienceUrl (e.g. "exp://192.168.1.100:8081/--/...")
  const linkingUri = Constants.linkingUri || (Constants as any)?.experienceUrl;
  if (typeof linkingUri === 'string' && linkingUri) {
    const match = linkingUri.match(/^[a-zA-Z]+:\/\/([^:/]+)/);
    if (match && match[1] && match[1] !== 'localhost' && match[1] !== '127.0.0.1') {
      return match[1];
    }
  }

  return null;
}

export const getBaseUrl = (): string => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

  // If on Web
  if (Platform.OS === 'web') {
    // If opened from a remote browser on the local network (not localhost), use the browser's hostname
    if (typeof window !== 'undefined' && window.location?.hostname) {
      const hostname = window.location.hostname;
      if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1') {
        return `http://${hostname}:8080/api/v1`;
      }
    }
    return envUrl || 'http://localhost:8080/api/v1';
  }

  // If on Mobile (iOS / Android):
  // 1. If an explicit non-localhost IP / URL is configured in environment, use it
  if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
    return envUrl;
  }

  // 2. Resolve dynamically from Expo bundler host (works with physical devices on LAN)
  const hostIp = resolveHostIp();
  if (hostIp) {
    return `http://${hostIp}:8080/api/v1`;
  }

  // 3. Fallback to development machine LAN IP for physical devices or emulator
  return 'http://192.168.1.136:8080/api/v1';
};

const API_BASE_URL = getBaseUrl();
export const API_KEY = process.env.EXPO_PUBLIC_API_KEY || 'smart-itt-sec-key-prod-2026';

if (__DEV__) {
  console.log(`[Network Config] API Base URL resolved for ${Platform.OS}: ${API_BASE_URL}`);
}

export default API_BASE_URL;
