import { useCallback, useEffect, useState, useRef } from 'react';

interface OfflineData<T> {
  data: T;
  timestamp: number;
  key: string;
}

const CACHE_PREFIX = 'francgympro_offline_';
const DEFAULT_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days

export function useOfflineStorage<T>(key: string, expiryMs: number = DEFAULT_EXPIRY) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const syncCallbackRef = useRef<(() => Promise<void>) | null>(null);

  // Register a sync callback that will be called when connection is restored
  const registerSyncCallback = useCallback((callback: () => Promise<void>) => {
    syncCallbackRef.current = callback;
  }, []);

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      // Trigger sync callback when connection is restored
      if (syncCallbackRef.current) {
        try {
          await syncCallbackRef.current();
          setLastSyncTime(Date.now());
        } catch (error) {
          console.warn('Sync callback failed:', error);
        }
      }
    };
    
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const saveToCache = useCallback((data: T) => {
    try {
      const cacheData: OfflineData<T> = {
        data,
        timestamp: Date.now(),
        key,
      };
      localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Failed to save to offline cache:', error);
    }
  }, [key]);

  const loadFromCache = useCallback((): T | null => {
    try {
      const cached = localStorage.getItem(`${CACHE_PREFIX}${key}`);
      if (!cached) return null;

      const cacheData: OfflineData<T> = JSON.parse(cached);
      
      // Check if expired
      if (Date.now() - cacheData.timestamp > expiryMs) {
        localStorage.removeItem(`${CACHE_PREFIX}${key}`);
        return null;
      }

      return cacheData.data;
    } catch (error) {
      console.warn('Failed to load from offline cache:', error);
      return null;
    }
  }, [key, expiryMs]);

  const clearCache = useCallback(() => {
    localStorage.removeItem(`${CACHE_PREFIX}${key}`);
  }, [key]);

  const getCacheAge = useCallback((): number | null => {
    try {
      const cached = localStorage.getItem(`${CACHE_PREFIX}${key}`);
      if (!cached) return null;

      const cacheData: OfflineData<T> = JSON.parse(cached);
      return Date.now() - cacheData.timestamp;
    } catch {
      return null;
    }
  }, [key]);

  return {
    isOnline,
    saveToCache,
    loadFromCache,
    clearCache,
    getCacheAge,
    lastSyncTime,
    registerSyncCallback,
  };
}

// Clear all expired cache entries
export function clearExpiredCache() {
  try {
    const keys = Object.keys(localStorage);
    const now = Date.now();

    keys.forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        try {
          const cached = localStorage.getItem(key);
          if (cached) {
            const data = JSON.parse(cached);
            if (now - data.timestamp > DEFAULT_EXPIRY) {
              localStorage.removeItem(key);
            }
          }
        } catch {
          localStorage.removeItem(key);
        }
      }
    });
  } catch (error) {
    console.warn('Failed to clear expired cache:', error);
  }
}

// Get total offline storage size
export function getOfflineStorageSize(): number {
  let totalSize = 0;
  const keys = Object.keys(localStorage);

  keys.forEach(key => {
    if (key.startsWith(CACHE_PREFIX)) {
      const value = localStorage.getItem(key);
      if (value) {
        totalSize += value.length * 2; // UTF-16 characters
      }
    }
  });

  return totalSize;
}