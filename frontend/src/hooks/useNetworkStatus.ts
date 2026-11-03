import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import axios from 'axios';
import API_BASE_URL, { API_KEY } from '../config/api';
import { dataSyncService } from '../services/dataSyncService';

const PING_TIMEOUT_MS = 4000;
const CHECK_INTERVAL_MS = 15000;

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const isMounted = useRef(true);
  const prevOnlineRef = useRef<boolean>(true);

  const checkConnection = useCallback(async (): Promise<boolean> => {
    // Immediate browser navigator check if completely disconnected
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && 'onLine' in navigator && !navigator.onLine) {
      if (isMounted.current) {
        setIsOnline(false);
        prevOnlineRef.current = false;
      }
      return false;
    }

    try {
      if (isMounted.current) setIsChecking(true);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);

      const res = await axios.get(`${API_BASE_URL}/terminals`, {
        signal: controller.signal,
        headers: {
          'X-API-KEY': API_KEY,
        },
        validateStatus: (status) => status >= 200 && status < 500,
      });

      clearTimeout(timer);
      const reachable = res.status >= 200 && res.status < 500;
      if (isMounted.current) {
        // Automatic reconnection detection: sync pending local data
        if (!prevOnlineRef.current && reachable) {
          console.log('[Network] Internet restored. Triggering automatic background sync...');
          dataSyncService.performDryRun().then((report) => {
            if (report.pendingUploads.trips.length > 0) {
              dataSyncService.executeApprovedSync(report).catch(() => {});
            }
          }).catch(() => {});
        }
        prevOnlineRef.current = reachable;
        setIsOnline(reachable);
      }
      return reachable;
    } catch {
      if (isMounted.current) {
        prevOnlineRef.current = false;
        setIsOnline(false);
      }
      return false;
    } finally {
      if (isMounted.current) {
        setIsChecking(false);
      }
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    checkConnection();

    const interval = setInterval(checkConnection, CHECK_INTERVAL_MS);

    // Web online/offline event listeners
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleOnline = () => checkConnection();
      const handleOffline = () => {
        if (isMounted.current) {
          prevOnlineRef.current = false;
          setIsOnline(false);
        }
      };
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        isMounted.current = false;
        clearInterval(interval);
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }

    return () => {
      isMounted.current = false;
      clearInterval(interval);
    };
  }, [checkConnection]);

  return { isOnline, isChecking, checkConnection };
}
