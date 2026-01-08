import { useEffect, useCallback, useRef } from 'react';
import { getCacheSize, deleteOldestCacheEntries } from '@/lib/indexedDB';
import { toast } from 'sonner';

export const CACHE_LIMIT_KEY = 'cache_size_limit_mb';
export const AUTO_CLEANUP_KEY = 'cache_auto_cleanup_enabled';
const DEFAULT_CACHE_LIMIT_MB = 50;
const CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes
const NOTIFICATION_COOLDOWN = 24 * 60 * 60 * 1000; // Show notification once per day
const LAST_NOTIFICATION_KEY = 'cache_size_notification_last';
const CLEANUP_THRESHOLD = 0.9; // Start cleanup at 90% of limit

export const getCacheLimitBytes = (): number => {
  const savedLimit = localStorage.getItem(CACHE_LIMIT_KEY);
  const limitMb = savedLimit ? parseInt(savedLimit) : DEFAULT_CACHE_LIMIT_MB;
  return limitMb * 1024 * 1024;
};

export const setCacheLimitMb = (limitMb: number): void => {
  localStorage.setItem(CACHE_LIMIT_KEY, limitMb.toString());
};

export const getCacheLimitMb = (): number => {
  const savedLimit = localStorage.getItem(CACHE_LIMIT_KEY);
  return savedLimit ? parseInt(savedLimit) : DEFAULT_CACHE_LIMIT_MB;
};

export const isAutoCleanupEnabled = (): boolean => {
  const saved = localStorage.getItem(AUTO_CLEANUP_KEY);
  return saved !== 'false'; // Default to true
};

export const setAutoCleanupEnabled = (enabled: boolean): void => {
  localStorage.setItem(AUTO_CLEANUP_KEY, enabled.toString());
};

export const useCacheSizeMonitor = () => {
  const hasCheckedRef = useRef(false);
  const isCleaningRef = useRef(false);

  const formatBytes = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }, []);

  const performAutoCleanup = useCallback(async (currentSize: number, limit: number): Promise<boolean> => {
    if (isCleaningRef.current) return false;
    
    isCleaningRef.current = true;
    try {
      // Free 30% of the limit to avoid frequent cleanups
      const targetSize = limit * 0.7;
      const bytesToFree = currentSize - targetSize;
      
      if (bytesToFree > 0) {
        const deletedCount = await deleteOldestCacheEntries(bytesToFree);
        
        if (deletedCount > 0) {
          console.log(`[CacheMonitor] Auto-cleanup completed: removed ${deletedCount} old entries`);
          toast.info('Limpeza automática de cache', {
            description: `${deletedCount} itens antigos foram removidos para liberar espaço.`,
            duration: 5000,
          });
          return true;
        }
      }
      return false;
    } finally {
      isCleaningRef.current = false;
    }
  }, []);

  const checkCacheSize = useCallback(async () => {
    try {
      const size = await getCacheSize();
      const limit = getCacheLimitBytes();
      const threshold = limit * CLEANUP_THRESHOLD;
      
      // Auto cleanup if enabled and size exceeds threshold
      if (isAutoCleanupEnabled() && size > threshold) {
        const cleaned = await performAutoCleanup(size, limit);
        if (cleaned) return; // Don't show warning if we just cleaned
      }
      
      // Show warning if still over limit
      if (size > limit) {
        const lastNotification = localStorage.getItem(LAST_NOTIFICATION_KEY);
        const now = Date.now();
        
        if (!lastNotification || (now - parseInt(lastNotification)) > NOTIFICATION_COOLDOWN) {
          localStorage.setItem(LAST_NOTIFICATION_KEY, now.toString());
          
          toast.warning('Cache offline está grande', {
            description: `O cache está usando ${formatBytes(size)} (limite: ${formatBytes(limit)}). Considere limpar manualmente.`,
            duration: 10000,
            action: {
              label: 'Ver configurações',
              onClick: () => {
                window.location.href = '/client/profile';
              }
            }
          });
        }
      }
    } catch (error) {
      console.warn('Error checking cache size:', error);
    }
  }, [formatBytes, performAutoCleanup]);

  useEffect(() => {
    if (!hasCheckedRef.current) {
      hasCheckedRef.current = true;
      const initialTimer = setTimeout(checkCacheSize, 10000);
      const intervalId = setInterval(checkCacheSize, CHECK_INTERVAL);
      
      return () => {
        clearTimeout(initialTimer);
        clearInterval(intervalId);
      };
    }
  }, [checkCacheSize]);

  return { checkCacheSize, performAutoCleanup };
};
