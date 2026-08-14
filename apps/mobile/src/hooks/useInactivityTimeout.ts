import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { queryClient } from '../lib/queryClient';
import { INACTIVITY_TIMEOUT_MS, useAuthStore } from '../store/auth';

/**
 * Monitors user interactions (touch, mouse, keypress, scroll) and app state transitions
 * to terminate the user session after a period of inactivity (default 30 minutes).
 */
export function useInactivityTimeout(timeoutMs: number = INACTIVITY_TIMEOUT_MS) {
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s.hydrated);
  const recordActivity = useAuthStore((s) => s.recordActivity);
  const signOut = useAuthStore((s) => s.signOut);

  const checkExpiryAndLogout = useRef<() => void>(() => {});
  checkExpiryAndLogout.current = () => {
    const currentLastActivity = useAuthStore.getState().lastActivity;
    if (!currentLastActivity) return;
    if (Date.now() - currentLastActivity >= timeoutMs) {
      queryClient.clear();
      void signOut();
    }
  };

  useEffect(() => {
    if (!hydrated || !token) return;

    // Check immediately on mount or auth change
    checkExpiryAndLogout.current();

    // Throttle user activity events so we do not spam state/storage
    let lastHandled = Date.now();
    const handleActivity = () => {
      const now = Date.now();
      if (now - lastHandled > 5_000) {
        lastHandled = now;
        recordActivity();
      }
    };

    // Listen to DOM user interaction events on web / RNW
    const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'click'] as const;
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      events.forEach((event) => {
        window.addEventListener(event, handleActivity, { passive: true });
      });
    }

    // AppState listener for mobile foreground transitions & window focus
    const appStateSubscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        checkExpiryAndLogout.current();
        handleActivity();
      }
    });

    // Periodic check every 15 seconds to auto-logout when idle
    const interval = setInterval(() => {
      checkExpiryAndLogout.current();
    }, 15_000);

    return () => {
      if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
        events.forEach((event) => {
          window.removeEventListener(event, handleActivity);
        });
      }
      appStateSubscription?.remove();
      clearInterval(interval);
    };
  }, [hydrated, token, recordActivity, signOut, timeoutMs]);
}
