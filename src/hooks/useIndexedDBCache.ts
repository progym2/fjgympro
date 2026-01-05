import { useCallback, useEffect, useState } from 'react';
import { 
  getCacheItem, 
  setCacheItem, 
  deleteCacheItem, 
  clearExpiredCache as clearExpired,
  getCacheStats 
} from '@/lib/indexedDB';

const DEFAULT_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

export function useIndexedDBCache<T>(key: string, ttlMs: number = DEFAULT_TTL) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const saveToCache = useCallback(async (data: T): Promise<void> => {
    setIsLoading(true);
    try {
      await setCacheItem(key, data, ttlMs);
    } finally {
      setIsLoading(false);
    }
  }, [key, ttlMs]);

  const loadFromCache = useCallback(async (): Promise<T | null> => {
    setIsLoading(true);
    try {
      return await getCacheItem<T>(key);
    } finally {
      setIsLoading(false);
    }
  }, [key]);

  const clearCache = useCallback(async (): Promise<void> => {
    await deleteCacheItem(key);
  }, [key]);

  return {
    isOnline,
    isLoading,
    saveToCache,
    loadFromCache,
    clearCache,
  };
}

// Hook for fetching with automatic cache
export function useCachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: {
    ttlMs?: number;
    enabled?: boolean;
    staleWhileRevalidate?: boolean;
  } = {}
) {
  const { ttlMs = DEFAULT_TTL, enabled = true, staleWhileRevalidate = true } = options;
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isStale, setIsStale] = useState(false);
  const { isOnline, saveToCache, loadFromCache } = useIndexedDBCache<T>(key, ttlMs);

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    try {
      // Try cache first
      const cached = await loadFromCache();
      if (cached !== null) {
        setData(cached);
        setIsLoading(false);
        
        if (staleWhileRevalidate && isOnline) {
          setIsStale(true);
        } else {
          return; // Use cache only if offline or not stale-while-revalidate
        }
      }

      // Fetch fresh data if online
      if (isOnline) {
        const freshData = await fetcher();
        setData(freshData);
        await saveToCache(freshData);
        setIsStale(false);
        setError(null);
      } else if (!cached) {
        setError(new Error('Offline and no cached data available'));
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Fetch failed'));
      // Keep showing cached data if available
    } finally {
      setIsLoading(false);
    }
  }, [enabled, isOnline, fetcher, loadFromCache, saveToCache, staleWhileRevalidate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refetch = useCallback(() => {
    setIsLoading(true);
    return fetchData();
  }, [fetchData]);

  return {
    data,
    isLoading,
    error,
    isStale,
    isOnline,
    refetch,
  };
}

// Clear expired cache on app start
export async function initializeCache(): Promise<void> {
  try {
    const deleted = await clearExpired();
    if (deleted > 0) {
      console.log(`Cleared ${deleted} expired cache entries`);
    }
  } catch (error) {
    console.warn('Failed to initialize cache:', error);
  }
}

// Get cache statistics
export async function getCacheStatistics() {
  return getCacheStats();
}
