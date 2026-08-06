import { broadcastSessionEvent, initSessionSync } from '../sessionSync';

export interface CacheEntry<T> {
  data: T;
  timestamp: number; // MS when cached
  lastAccessed: number; // MS for LRU eviction
}

const MAX_KEYS = 20;
const MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes

// In-memory cache store
const cacheStore = new Map<string, CacheEntry<any>>();

// Evict keys exceeding maximum size or age limits
export function pruneCache() {
  const now = Date.now();
  
  // 1. Evict expired keys
  for (const [key, entry] of cacheStore.entries()) {
    if (now - entry.timestamp > MAX_AGE_MS) {
      cacheStore.delete(key);
      console.log(`[MetricCache] Evicted expired key: ${key}`);
    }
  }

  // 2. LRU Eviction if size still exceeds MAX_KEYS
  if (cacheStore.size > MAX_KEYS) {
    const sorted = Array.from(cacheStore.entries())
      .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
    
    const toRemoveCount = cacheStore.size - MAX_KEYS;
    for (let i = 0; i < toRemoveCount; i++) {
      const keyToEvict = sorted[i][0];
      cacheStore.delete(keyToEvict);
      console.log(`[MetricCache] Evicted LRU key: ${keyToEvict}`);
    }
  }
}

/**
 * SWR Cache retrieve and background revalidate function.
 * @param key unique cache key
 * @param fetchFn async data fetcher
 * @param onUpdate callback to receive cached/revalidated data
 * @param options configuration options (e.g. TTL, abort signal)
 */
export async function getOrRefresh<T>(
  key: string,
  fetchFn: (signal?: AbortSignal) => Promise<T>,
  onUpdate: (data: T) => void,
  options?: { signal?: AbortSignal; ttlMs?: number }
): Promise<T | null> {
  const now = Date.now();
  const ttlMs = options?.ttlMs ?? 60_000; // Default TTL is 60 seconds
  
  // Prune cache before operations
  pruneCache();

  const entry = cacheStore.get(key) as CacheEntry<T> | undefined;

  if (entry) {
    // Update LRU access tracker
    entry.lastAccessed = now;
    
    // Call immediate cached data update (avoid blank screen flashing)
    onUpdate(entry.data);

    // If cache is fresh, do not fetch again
    if (now - entry.timestamp <= ttlMs) {
      console.log(`[MetricCache] Cache hit (fresh) for key: ${key}`);
      return entry.data;
    }

    // Cache is stale. Trigger background fetch revalidation
    console.log(`[MetricCache] Cache hit (stale) for key: ${key}. Triggering background fetch...`);
    
    // Fire background fetch asynchronously without blocking the promise return
    fetchFn(options?.signal)
      .then((freshData) => {
        // Double check abort state if signal provided
        if (options?.signal?.aborted) return;
        
        cacheStore.set(key, {
          data: freshData,
          timestamp: Date.now(),
          lastAccessed: Date.now()
        });
        onUpdate(freshData);
        console.log(`[MetricCache] Background cache refresh success for key: ${key}`);
      })
      .catch((err) => {
        // Silently capture background fetch errors — stale data is already rendered
        const isAbort = err?.name === 'AbortError' || err?.message?.includes('aborted') || err?.message?.includes('abort');
        if (!isAbort) {
          console.warn(`[MetricCache] Background cache refresh failed for key: ${key}`, err);
        }
      });

    return entry.data;
  }

  // Cache Miss: Perform foreground fetch
  console.log(`[MetricCache] Cache miss for key: ${key}. Initiating fetch...`);
  try {
    const freshData = await fetchFn(options?.signal);
    if (!options?.signal?.aborted) {
      cacheStore.set(key, {
        data: freshData,
        timestamp: Date.now(),
        lastAccessed: Date.now()
      });
      onUpdate(freshData);
    }
    return freshData;
  } catch (error: any) {
    const isAbort = error?.name === 'AbortError' || error?.message?.includes('aborted') || error?.message?.includes('abort');
    if (!isAbort) {
      console.error(`[MetricCache] Cache miss fetch error for key: ${key}`, error);
    }
    throw error;
  }
}

/**
 * Invalidates specific cache key locally and broadcasts invalidation to other tabs
 */
export function invalidateCacheKey(key: string, broadcast = true) {
  if (cacheStore.has(key)) {
    cacheStore.delete(key);
    console.log(`[MetricCache] Invalidated cache key: ${key}`);
  }
  if (broadcast) {
    broadcastSessionEvent('CACHE_INVALIDATED', { key });
  }
}

/**
 * Invalidates all dashboard metrics cache keys
 */
export function invalidateDashboardCache(broadcast = true) {
  for (const key of cacheStore.keys()) {
    if (key.startsWith('dashboard_')) {
      cacheStore.delete(key);
    }
  }
  console.log('[MetricCache] Invalidated all dashboard cache keys.');
  if (broadcast) {
    broadcastSessionEvent('CACHE_INVALIDATED', { key: 'dashboard_all' });
  }
}

/**
 * Clear the entire memory cache
 */
export function clearAllCache() {
  cacheStore.clear();
  console.log('[MetricCache] Cleared entire cache store.');
}

// Subscribe to global BroadcastChannel invalidation events
if (typeof window !== 'undefined') {
  initSessionSync((type, payload: any) => {
    if (type === 'CACHE_INVALIDATED' && payload) {
      const { key } = payload;
      if (key === 'dashboard_all') {
        invalidateDashboardCache(false);
      } else if (key) {
        invalidateCacheKey(key, false);
      }
    } else if (type === 'LOGOUT') {
      clearAllCache();
    }
  });
}
