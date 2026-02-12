/**
 * usePresence Hook
 * Manages automatic presence heartbeat for the current user
 */

import { useEffect, useRef } from 'react';
import { updatePresence, PRESENCE_CONFIG } from '@/lib/presenceService';
import { useAuth } from '@/app/providers/AuthProvider';

/**
 * Hook to automatically update user presence via heartbeat
 * - Sends initial heartbeat on mount
 * - Sends periodic heartbeat every 2 minutes
 * - Stops heartbeat when component unmounts or user logs out
 */
export function usePresence() {
  const { user } = useAuth();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Only run if user is authenticated
    if (!user) {
      return;
    }

    // Send initial heartbeat immediately
    updatePresence();

    // Set up periodic heartbeat
    intervalRef.current = setInterval(() => {
      updatePresence();
    }, PRESENCE_CONFIG.HEARTBEAT_INTERVAL);

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [user]);

  // Also update presence on user activity (optional enhancement)
  useEffect(() => {
    if (!user) return;

    const handleActivity = () => {
      updatePresence();
    };

    // Listen to various user activity events
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];

    // Throttle activity updates to avoid excessive API calls
    let activityTimeout: NodeJS.Timeout | null = null;
    const throttledActivity = () => {
      if (activityTimeout) return;

      activityTimeout = setTimeout(() => {
        handleActivity();
        activityTimeout = null;
      }, 30000); // Update at most once every 30 seconds on activity
    };

    events.forEach((event) => {
      window.addEventListener(event, throttledActivity, { passive: true });
    });

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, throttledActivity);
      });
      if (activityTimeout) {
        clearTimeout(activityTimeout);
      }
    };
  }, [user]);
}
