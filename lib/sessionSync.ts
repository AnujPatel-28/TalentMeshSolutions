"use client";

export type SessionSyncEvent = 
  | 'LOGOUT' 
  | 'NOTIFICATION_RECEIVED' 
  | 'CACHE_INVALIDATED' 
  | 'SIDEBAR_STATE'
  | 'SESSION_REFRESHED'
  | 'SESSION_WARNING'
  | 'SESSION_EXTENDED'
  | 'SESSION_LOGOUT';

interface SyncMessage {
  type: SessionSyncEvent;
  payload?: unknown;
}

let syncChannel: BroadcastChannel | null = null;

/**
 * Initializes the BroadcastChannel listener to synchronize session state across open browser tabs.
 */
export function initSessionSync(onMessage: (type: SessionSyncEvent, payload?: unknown) => void) {
  if (typeof window === 'undefined' || !('BroadcastChannel' in window)) {
    return () => {};
  }

  if (!syncChannel) {
    syncChannel = new BroadcastChannel('talentmesh_session_sync');
  }

  const handleMessage = (event: MessageEvent<SyncMessage>) => {
    const { type, payload } = event.data;
    onMessage(type, payload);
  };

  syncChannel.addEventListener('message', handleMessage);

  // Return a cleanup function
  return () => {
    if (syncChannel) {
      syncChannel.removeEventListener('message', handleMessage);
    }
  };
}

/**
 * Broadcasts a session event to all other open tabs in the same origin.
 */
export function broadcastSessionEvent(type: SessionSyncEvent, payload?: unknown) {
  if (typeof window === 'undefined' || !('BroadcastChannel' in window)) {
    return;
  }

  if (!syncChannel) {
    syncChannel = new BroadcastChannel('talentmesh_session_sync');
  }

  syncChannel.postMessage({ type, payload });
}
