import { useEffect, useCallback, useRef } from 'react';
import { getCacheSize } from '@/lib/indexedDB';
import { toast } from 'sonner';

const CACHE_SIZE_LIMIT = 50 * 1024 * 1024; // 50MB in bytes
const CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes
const NOTIFICATION_COOLDOWN = 24 * 60 * 60 * 1000; // Show notification once per day

const LAST_NOTIFICATION_KEY = 'cache_size_notification_last';

export const useCacheSizeMonitor = () => {
  const hasCheckedRef = useRef(false);

  const formatBytes = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }, []);

  const checkCacheSize = useCallback(async () => {
    try {
      const size = await getCacheSize();
      
      if (size > CACHE_SIZE_LIMIT) {
        // Check if we already notified recently
        const lastNotification = localStorage.getItem(LAST_NOTIFICATION_KEY);
        const now = Date.now();
        
        if (!lastNotification || (now - parseInt(lastNotification)) > NOTIFICATION_COOLDOWN) {
          localStorage.setItem(LAST_NOTIFICATION_KEY, now.toString());
          
          toast.warning('Cache offline está grande', {
            description: `O cache está usando ${formatBytes(size)}. Considere limpar para liberar espaço.`,
            duration: 10000,
            action: {
              label: 'Ver configurações',
              onClick: () => {
                // Navigate to profile where cache settings are
                window.location.href = '/client/profile';
              }
            }
          });
        }
      }
    } catch (error) {
      console.warn('Error checking cache size:', error);
    }
  }, [formatBytes]);

  useEffect(() => {
    // Initial check after a short delay (don't block app startup)
    if (!hasCheckedRef.current) {
      hasCheckedRef.current = true;
      const initialTimer = setTimeout(checkCacheSize, 10000); // 10 seconds after mount
      
      // Periodic checks
      const intervalId = setInterval(checkCacheSize, CHECK_INTERVAL);
      
      return () => {
        clearTimeout(initialTimer);
        clearInterval(intervalId);
      };
    }
  }, [checkCacheSize]);

  return { checkCacheSize };
};
