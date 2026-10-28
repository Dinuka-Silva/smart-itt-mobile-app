/**
 * SMART ITT — Session Inactivity Watcher Hook
 * Automatically locks the mobile app session after configured period of inactivity.
 */

import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { useAuthStore } from '../store/authStore';

export function useSessionActivity() {
  const {
    isAuthenticated,
    isSessionLocked,
    sessionTimeoutMinutes,
    lastActiveTimestamp,
    lockSession,
    touchActivity,
  } = useAuthStore();

  const backgroundTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    // Periodic check for inactivity
    const interval = setInterval(() => {
      const now = Date.now();
      const timeoutMs = sessionTimeoutMinutes * 60 * 1000;
      if (!isSessionLocked && now - lastActiveTimestamp > timeoutMs) {
        lockSession();
      }
    }, 15000); // Check every 15 seconds

    return () => clearInterval(interval);
  }, [isAuthenticated, isSessionLocked, sessionTimeoutMinutes, lastActiveTimestamp, lockSession]);

  useEffect(() => {
    if (!isAuthenticated || Platform.OS === 'web') return;

    const handleAppStateChange = (nextState: AppStateStatus) => {
      const now = Date.now();
      if (nextState === 'background' || nextState === 'inactive') {
        backgroundTimeRef.current = now;
      } else if (nextState === 'active') {
        if (backgroundTimeRef.current) {
          const elapsed = now - backgroundTimeRef.current;
          const timeoutMs = sessionTimeoutMinutes * 60 * 1000;
          if (elapsed > timeoutMs) {
            lockSession();
          } else {
            touchActivity();
          }
          backgroundTimeRef.current = null;
        }
      }
    };

    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub.remove();
  }, [isAuthenticated, sessionTimeoutMinutes, lockSession, touchActivity]);
}
