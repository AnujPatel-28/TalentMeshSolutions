import { useState, useEffect } from 'react';
import { invokeFunction } from '@/lib/insforge';
import { toast } from 'react-hot-toast';

export type OfflineAction = {
  id: string;
  slug: string;
  options: unknown;
  timestamp: string;
};

/**
 * Hook to track network status and automatically synchronize cached offline actions.
 */
export function useNetworkState() {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return navigator.onLine;
    }
    return true;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Connection restored! Replaying offline actions...', { id: 'network-status' });
      console.log('[useNetworkState] Network connection restored. Processing offline queue...');
      replayOfflineQueue();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.error('You are offline. Settings changes will be queued and replayed when online.', { id: 'network-status', duration: Infinity });
      console.warn('[useNetworkState] Network connection lost. Mutations will be queued.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline };
}

/**
 * Enqueues an action to be executed when the network is restored.
 */
export function queueOfflineAction(slug: string, options: unknown) {
  if (typeof window === 'undefined') return;

  try {
    const queue: OfflineAction[] = JSON.parse(localStorage.getItem('tm_offline_mutations') || '[]');
    if (queue.length >= 50) {
      console.warn('[useNetworkState] Offline mutation queue limit reached (50). Rejecting action.');
      return;
    }
    const newAction: OfflineAction = {
      id: Math.random().toString(36).substring(2, 9),
      slug,
      options,
      timestamp: new Date().toISOString()
    };
    
    queue.push(newAction);
    localStorage.setItem('tm_offline_mutations', JSON.stringify(queue));
    console.log(`[useNetworkState] Action queued offline for function ${slug} (ID: ${newAction.id})`);
  } catch (err) {
    console.error('[useNetworkState] Failed to queue offline action:', err);
  }
}

/**
 * Replays all queued actions in order.
 */
async function replayOfflineQueue() {
  if (typeof window === 'undefined') return;

  try {
    const queue: OfflineAction[] = JSON.parse(localStorage.getItem('tm_offline_mutations') || '[]');
    if (queue.length === 0) return;

    console.log(`[useNetworkState] Found ${queue.length} actions in offline queue. Replaying...`);
    
    // Clear queue to prevent duplicate replays
    localStorage.setItem('tm_offline_mutations', '[]');

    for (const action of queue) {
      try {
        console.log(`[useNetworkState] Replaying action ${action.id} for function: ${action.slug}`);
        const { error } = await invokeFunction(action.slug, action.options as any);
        if (error) {
          console.warn(`[useNetworkState] Replay failed for action ${action.id}:`, error);
          // Optional: Re-queue failed critical actions or notify user
        } else {
          console.log(`[useNetworkState] Replay succeeded for action ${action.id}`);
        }
      } catch (err) {
        console.error(`[useNetworkState] Replay error for action ${action.id}:`, err);
      }
    }
  } catch (err) {
    console.error('[useNetworkState] Failed to replay offline queue:', err);
  }
}
