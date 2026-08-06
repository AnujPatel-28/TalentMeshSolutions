import { useState, useEffect, useCallback } from 'react';
import { insforge } from '../insforge';
import { broadcastSessionEvent, initSessionSync } from '../sessionSync';

export interface SidebarPreferencePayload {
  version: number;
  collapsed: boolean;
  width: number;
}

// Module-level global state
let cachedPreference: SidebarPreferencePayload | null = null;
let currentUserId: string | null = null;
const listeners = new Set<(pref: SidebarPreferencePayload) => void>();

// Generate a random tab ID for session isolation to prevent sync-loop storms
const tabId = typeof window !== 'undefined' ? Math.random().toString(36).substring(7) : 'ssr';

let debounceTimer: NodeJS.Timeout | null = null;

// Determine default responsive state based on viewport width
export function getResponsiveDefault(): SidebarPreferencePayload {
  if (typeof window === 'undefined') {
    return { version: 1, collapsed: false, width: 280 };
  }
  const isMobile = window.innerWidth <= 768;
  const isTablet = window.innerWidth > 768 && window.innerWidth <= 1024;
  
  if (isMobile) {
    // Mobile uses overlay, width is 280, collapsed state governs visibility
    return { version: 1, collapsed: true, width: 280 };
  } else if (isTablet) {
    // Tablet default is collapsed (68px)
    return { version: 1, collapsed: true, width: 68 };
  } else {
    // Desktop default is expanded (280px)
    return { version: 1, collapsed: false, width: 280 };
  }
}

// Notify all local React listeners
function notifyListeners(pref: SidebarPreferencePayload) {
  cachedPreference = pref;
  listeners.forEach((listener) => listener(pref));
}

// Debounced DB Upsert write
function syncToDatabase(userId: string, pref: SidebarPreferencePayload) {
  if (debounceTimer) clearTimeout(debounceTimer);
  
  debounceTimer = setTimeout(async () => {
    try {
      const { error } = await insforge.database
        .from('user_preferences')
        .upsert({
          user_id: userId,
          sidebar_preferences: pref,
          updated_at: new Date().toISOString()
        });
      if (error) {
        console.warn('[SidebarPreference] DB Upsert error:', error.message);
      } else {
        console.log('[SidebarPreference] DB Upsert sync success.');
      }
    } catch (err) {
      console.warn('[SidebarPreference] Recovery mode: DB sync failed due to network error.', err);
    }
  }, 5000);
}

/**
 * Custom hook for consuming and updating sidebar preferences.
 * Includes Recovery Mode, UPSERT DB writes, and Tab Syncing.
 */
export function useSidebarPreference(userId?: string) {
  const [preference, setPreference] = useState<SidebarPreferencePayload>(() => {
    if (cachedPreference) return cachedPreference;
    return getResponsiveDefault();
  });

  // Update current user context
  useEffect(() => {
    if (userId) {
      currentUserId = userId;
    }
  }, [userId]);

  // Subscribe to local memory store updates
  useEffect(() => {
    const handleUpdate = (nextPref: SidebarPreferencePayload) => {
      setPreference(nextPref);
    };
    listeners.add(handleUpdate);
    return () => {
      listeners.delete(handleUpdate);
    };
  }, []);

  // Fetch initial preferences from DB -> LocalStorage -> Viewport default
  useEffect(() => {
    if (!userId) return;

    let active = true;

    async function loadPreference() {
      const fallbackPref = getResponsiveDefault();
      const localKey = `sidebar_preferences_${userId}`;

      // 1. Try DB Load
      try {
        const { data, error } = await insforge.database
          .from('user_preferences')
          .select('sidebar_preferences')
          .eq('user_id', userId);

        const record = Array.isArray(data) && data.length > 0 ? data[0] : null;

        if (!error && record?.sidebar_preferences) {
          const dbPref = record.sidebar_preferences as SidebarPreferencePayload;
          if (dbPref.version && typeof dbPref.collapsed === 'boolean') {
            if (active) {
              console.log('[SidebarPreference] Loaded from DB successfully.');
              localStorage.setItem(localKey, JSON.stringify(dbPref));
              notifyListeners(dbPref);
              return;
            }
          }
        } else if (error) {
          console.warn('[SidebarPreference] DB query failed, seeking localStorage fallback:', error.message);
        }
      } catch (err) {
        console.warn('[SidebarPreference] DB offline, seeking localStorage fallback:', err);
      }

      // 2. Try localStorage Fallback
      try {
        const local = localStorage.getItem(localKey);
        if (local) {
          const parsed = JSON.parse(local) as SidebarPreferencePayload;
          if (parsed.version && typeof parsed.collapsed === 'boolean') {
            if (active) {
              console.log('[SidebarPreference] Loaded from LocalStorage successfully.');
              notifyListeners(parsed);
              return;
            }
          }
        }
      } catch (e) {
        console.warn('[SidebarPreference] LocalStorage read error:', e);
      }

      // 3. Viewport Responsive Width Default Fallback
      if (active) {
        console.log('[SidebarPreference] Loaded from Viewport defaults.');
        notifyListeners(fallbackPref);
      }
    }

    loadPreference();

    return () => {
      active = false;
    };
  }, [userId]);

  // Tab Syncing Listener via BroadcastChannel
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const cleanup = initSessionSync((type, payload: any) => {
      if (type === 'SIDEBAR_STATE' && payload) {
        const { targetUserId, collapsed: newCollapsed, width: newWidth, initiator } = payload;
        if (targetUserId === userId && initiator !== tabId) {
          console.log('[SidebarPreference] Broadcast received. Syncing follower state.');
          const updated: SidebarPreferencePayload = {
            version: 1,
            collapsed: newCollapsed,
            width: newWidth
          };
          
          // Follower updates local state + localStorage but DOES NOT write back to DB
          const localKey = `sidebar_preferences_${userId}`;
          try {
            localStorage.setItem(localKey, JSON.stringify(updated));
          } catch (e) {}
          notifyListeners(updated);
        }
      }
    });

    return cleanup;
  }, [userId]);

  // Toggle Action Handler
  const toggle = useCallback(() => {
    if (!userId) return;

    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
    const isTablet = typeof window !== 'undefined' && window.innerWidth > 768 && window.innerWidth <= 1024;
    
    const nextCollapsed = !preference.collapsed;
    let nextWidth = 280;

    if (isMobile) {
      nextWidth = 280; // Mobile remains 280, collapsed governs overlay slide
    } else if (isTablet) {
      nextWidth = nextCollapsed ? 68 : 280;
    } else {
      nextWidth = nextCollapsed ? 68 : 280;
    }

    const updated: SidebarPreferencePayload = {
      version: 1,
      collapsed: nextCollapsed,
      width: nextWidth
    };

    // 1. Update memory + state immediately
    notifyListeners(updated);

    // 2. Persist to localStorage
    const localKey = `sidebar_preferences_${userId}`;
    try {
      localStorage.setItem(localKey, JSON.stringify(updated));
    } catch (e) {}

    // 3. Persist to DB debounced (Only Desktop/Tablet widths are persisted. Mobile toggling is local)
    if (!isMobile) {
      syncToDatabase(userId, updated);
      // 4. Broadcast to other tabs as the initiator
      broadcastSessionEvent('SIDEBAR_STATE', {
        targetUserId: userId,
        collapsed: nextCollapsed,
        width: nextWidth,
        initiator: tabId
      });
    }
  }, [userId, preference]);

  return {
    collapsed: preference.collapsed,
    width: preference.width,
    toggle
  };
}
