import { useEffect, useRef } from 'react';
import { refreshAccessToken, invokeFunction } from '@/lib/insforge';

/**
 * Periodically refreshes user sessions to prevent surprise logouts while active,
 * and sends active-event-driven throttled heartbeats to the backend.
 * Timeout intervals scale based on roles:
 * - Admin / Super Admin: 5 minutes
 * - Recruiter: 10 minutes
 * - Candidate / Default: 15 minutes
 */
export function useSessionRefresh(role?: string) {
  const activeRef = useRef<boolean>(false);

  useEffect(() => {
    if (!role) return;

    // 1. Activity listeners to capture real user engagement
    const handleActivity = () => {
      activeRef.current = true;
    };

    const handleVisibilityChange = async () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        const lastRefresh = parseInt(localStorage.getItem('tm_last_refresh_time') || '0');
        const now = Date.now();
        // If last refresh was more than 3 minutes ago, proactively renew session immediately on return
        if (now - lastRefresh > 3 * 60 * 1000) {
          localStorage.setItem('tm_last_refresh_time', now.toString());
          console.log('[SessionRefresh] Tab became visible. Proactively renewing backgrounded session.');
          try {
            await refreshAccessToken();
          } catch (err) {
            console.warn('[SessionRefresh] Visibility token refresh failed:', err);
          }
        }
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('mousedown', handleActivity);
      window.addEventListener('keydown', handleActivity);
      window.addEventListener('scroll', handleActivity);
      window.addEventListener('click', handleActivity);
      window.addEventListener('touchstart', handleActivity);
    }

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    let intervalMs = 15 * 60 * 1000; // Default candidate / fallback rate: 15m
    if (role === 'admin' || role === 'super_admin') {
      intervalMs = 5 * 60 * 1000; // Admin rate: 5m
    } else if (role === 'recruiter') {
      intervalMs = 10 * 60 * 1000; // Recruiter rate: 10m
    } else if (role === 'candidate') {
      intervalMs = 15 * 60 * 1000; // Candidate rate: 15m
    }

    // Add a randomized jitter (up to 10 seconds) to prevent simultaneous intervals
    const jitter = Math.random() * 10000;
    const finalInterval = intervalMs + jitter;

    // Timer for proactive token rotation
    const rotationIntervalId = setInterval(async () => {
      // Avoid rotating tokens in inactive tabs to lower backend workloads
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        const lastRefresh = parseInt(localStorage.getItem('tm_last_refresh_time') || '0');
        const now = Date.now();
        
        // Coordinated lock: if another tab refreshed within the last 45 seconds, skip this cycle
        if (now - lastRefresh < 45 * 1000) {
          console.log('[SessionRefresh] Token rotation skipped: another tab refreshed recently.');
          return;
        }

        // Lock refresh timestamp before calling API to prevent race conditions
        localStorage.setItem('tm_last_refresh_time', now.toString());

        console.log(`[SessionRefresh] Rotating token proactively for role: ${role}`);
        try {
          await refreshAccessToken();
        } catch (err) {
          console.warn('[SessionRefresh] Proactive token rotation failed:', err);
        }
      }
    }, finalInterval);

    // Timer for active event-driven heartbeats (check every 10s)
    const heartbeatIntervalId = setInterval(async () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        const now = Date.now();
        const lastHeartbeat = parseInt(localStorage.getItem('tm_last_heartbeat_time') || '0');
        
        // Send heartbeat ONLY if there is active interaction AND at least 60s has elapsed
        if (activeRef.current && (now - lastHeartbeat >= 60000)) {
          // Reset activity flag immediately
          activeRef.current = false;
          localStorage.setItem('tm_last_heartbeat_time', now.toString());

          try {
            await invokeFunction('auth-session', {
              method: 'GET',
              queries: { heartbeat: 'true' }
            });
            console.log('[SessionRefresh] Throttled heartbeat sent.');
          } catch (err) {
            console.warn('[SessionRefresh] Heartbeat failed:', err);
          }
        }
      }
    }, 10000);

    return () => {
      clearInterval(rotationIntervalId);
      clearInterval(heartbeatIntervalId);
      if (typeof window !== 'undefined') {
        window.removeEventListener('mousedown', handleActivity);
        window.removeEventListener('keydown', handleActivity);
        window.removeEventListener('scroll', handleActivity);
        window.removeEventListener('click', handleActivity);
        window.removeEventListener('touchstart', handleActivity);
      }
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
  }, [role]);
}
