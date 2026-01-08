import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { setCacheItem, getCacheItem, clearExpiredCache, getCacheStats } from '@/lib/indexedDB';

interface PendingOperation {
  id: string;
  table: string;
  operation: 'insert' | 'update' | 'delete';
  data: Record<string, unknown>;
  timestamp: number;
  retryCount: number;
  priority: number;
}

interface CachedData<T> {
  data: T;
  timestamp: number;
  version: number;
}

const PENDING_OPS_KEY = 'francgympro_pending_ops_v2';
const MAX_RETRIES = 5;
const SYNC_DEBOUNCE_MS = 1500;
const CACHE_VERSION = 1;

// Priority levels for sync operations
const PRIORITY = {
  HIGH: 1,    // User data, payments
  MEDIUM: 2,  // Workouts, progress
  LOW: 3      // Preferences, logs
};

const TABLE_PRIORITY: Record<string, number> = {
  'payments': PRIORITY.HIGH,
  'profiles': PRIORITY.HIGH,
  'weight_records': PRIORITY.MEDIUM,
  'hydration_records': PRIORITY.MEDIUM,
  'workout_logs': PRIORITY.MEDIUM,
  'workout_exercise_logs': PRIORITY.MEDIUM,
  'notifications': PRIORITY.LOW,
  'user_theme_preferences': PRIORITY.LOW,
};

export function useEnhancedOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [syncProgress, setSyncProgress] = useState(0);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const syncLockRef = useRef(false);

  // Load pending operations from localStorage
  const getPendingOperations = useCallback((): PendingOperation[] => {
    try {
      const stored = localStorage.getItem(PENDING_OPS_KEY);
      const ops = stored ? JSON.parse(stored) : [];
      // Sort by priority (lower number = higher priority)
      return ops.sort((a: PendingOperation, b: PendingOperation) => 
        (a.priority || PRIORITY.MEDIUM) - (b.priority || PRIORITY.MEDIUM)
      );
    } catch {
      return [];
    }
  }, []);

  // Save pending operations to localStorage
  const savePendingOperations = useCallback((operations: PendingOperation[]) => {
    try {
      localStorage.setItem(PENDING_OPS_KEY, JSON.stringify(operations));
      setPendingCount(operations.length);
    } catch (error) {
      console.warn('[OfflineSync] Failed to save pending operations:', error);
    }
  }, []);

  // Add a new operation to the queue with priority
  const queueOperation = useCallback((
    table: string,
    operation: 'insert' | 'update' | 'delete',
    data: Record<string, unknown>,
    customPriority?: number
  ) => {
    const pending = getPendingOperations();
    
    // Dedupe: If same id and table exists, replace with newer operation
    const existingIndex = pending.findIndex(op => 
      op.table === table && 
      'id' in op.data && 
      'id' in data && 
      op.data.id === data.id
    );
    
    const newOp: PendingOperation = {
      id: crypto.randomUUID(),
      table,
      operation,
      data,
      timestamp: Date.now(),
      retryCount: 0,
      priority: customPriority ?? TABLE_PRIORITY[table] ?? PRIORITY.MEDIUM
    };
    
    if (existingIndex >= 0) {
      // Replace existing operation
      pending[existingIndex] = newOp;
    } else {
      pending.push(newOp);
    }
    
    savePendingOperations(pending);
    console.log(`[OfflineSync] Queued ${operation} on ${table} (priority: ${newOp.priority})`);
    
    return newOp.id;
  }, [getPendingOperations, savePendingOperations]);

  // Execute a single operation with exponential backoff
  const executeOperation = async (op: PendingOperation): Promise<boolean> => {
    try {
      let result;
      const tableName = op.table;
      
      switch (op.operation) {
        case 'insert':
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          result = await (supabase.from(tableName as any) as any).insert(op.data);
          break;
        case 'update':
          if ('id' in op.data) {
            const { id, ...updateData } = op.data;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            result = await (supabase.from(tableName as any) as any).update(updateData).eq('id', id as string);
          } else {
            throw new Error('Update operation requires id field');
          }
          break;
        case 'delete':
          if ('id' in op.data) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            result = await (supabase.from(tableName as any) as any).delete().eq('id', op.data.id as string);
          } else {
            throw new Error('Delete operation requires id field');
          }
          break;
      }

      if (result?.error) {
        // Check if it's a conflict error (data already exists/changed)
        if (result.error.code === '23505' || result.error.code === '23503') {
          console.warn(`[OfflineSync] Conflict on ${op.operation} - ${op.table}, skipping`);
          return true; // Skip this operation, don't retry
        }
        console.error(`[OfflineSync] Error executing ${op.operation} on ${op.table}:`, result.error);
        return false;
      }

      return true;
    } catch (error) {
      console.error(`[OfflineSync] Failed to execute operation:`, error);
      return false;
    }
  };

  // Sync all pending operations with progress
  const syncPendingOperations = useCallback(async () => {
    if (!navigator.onLine || isSyncing || syncLockRef.current) return;

    const pending = getPendingOperations();
    if (pending.length === 0) return;

    syncLockRef.current = true;
    setIsSyncing(true);
    setSyncProgress(0);
    console.log(`[OfflineSync] Starting sync of ${pending.length} pending operations`);

    const remainingOps: PendingOperation[] = [];
    let successCount = 0;
    let failCount = 0;
    const total = pending.length;

    for (let i = 0; i < pending.length; i++) {
      const op = pending[i];
      
      // Calculate exponential backoff delay for retries
      if (op.retryCount > 0) {
        const delay = Math.min(1000 * Math.pow(2, op.retryCount), 30000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      const success = await executeOperation(op);
      setSyncProgress(Math.round(((i + 1) / total) * 100));
      
      if (success) {
        successCount++;
      } else {
        op.retryCount++;
        if (op.retryCount < MAX_RETRIES) {
          remainingOps.push(op);
        } else {
          failCount++;
          console.warn(`[OfflineSync] Operation exceeded max retries, discarding:`, op);
        }
      }
    }

    savePendingOperations(remainingOps);
    setIsSyncing(false);
    setSyncProgress(0);
    setLastSyncTime(Date.now());
    syncLockRef.current = false;

    if (successCount > 0) {
      toast.success(`${successCount} ${successCount === 1 ? 'alteração sincronizada' : 'alterações sincronizadas'}`);
    }
    
    if (failCount > 0) {
      toast.error(`${failCount} ${failCount === 1 ? 'operação falhou' : 'operações falharam'}`);
    }

    console.log(`[OfflineSync] Sync complete. Success: ${successCount}, Remaining: ${remainingOps.length}, Failed: ${failCount}`);
  }, [getPendingOperations, savePendingOperations, isSyncing]);

  // Debounced sync trigger
  const triggerSync = useCallback(() => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }
    
    syncTimeoutRef.current = setTimeout(() => {
      syncPendingOperations();
    }, SYNC_DEBOUNCE_MS);
  }, [syncPendingOperations]);

  // Cache data with versioning
  const cacheData = useCallback(async <T>(key: string, data: T, ttlMs?: number) => {
    const cached: CachedData<T> = {
      data,
      timestamp: Date.now(),
      version: CACHE_VERSION
    };
    await setCacheItem(key, cached, ttlMs);
  }, []);

  // Get cached data with version check
  const getCachedData = useCallback(async <T>(key: string): Promise<T | null> => {
    const cached = await getCacheItem<CachedData<T>>(key);
    if (cached && cached.version === CACHE_VERSION) {
      return cached.data;
    }
    return null;
  }, []);

  // Fetch with cache - returns cached data while fetching fresh
  const fetchWithCache = useCallback(async <T>(
    key: string,
    fetcher: () => Promise<T>,
    options: { ttlMs?: number; staleWhileRevalidate?: boolean } = {}
  ): Promise<{ data: T | null; isFromCache: boolean; isFresh: boolean }> => {
    const { ttlMs = 5 * 60 * 1000, staleWhileRevalidate = true } = options;
    
    // Try cache first
    const cached = await getCachedData<T>(key);
    
    if (!navigator.onLine) {
      return { data: cached, isFromCache: true, isFresh: false };
    }
    
    // If stale-while-revalidate and we have cache, return cache and fetch in background
    if (staleWhileRevalidate && cached) {
      // Fetch fresh data in background
      fetcher().then(freshData => {
        cacheData(key, freshData, ttlMs);
      }).catch(console.error);
      
      return { data: cached, isFromCache: true, isFresh: false };
    }
    
    // Fetch fresh data
    try {
      const freshData = await fetcher();
      await cacheData(key, freshData, ttlMs);
      return { data: freshData, isFromCache: false, isFresh: true };
    } catch (error) {
      console.error('[OfflineSync] Fetch error, returning cached:', error);
      return { data: cached, isFromCache: true, isFresh: false };
    }
  }, [cacheData, getCachedData]);

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => {
      console.log('[OfflineSync] Connection restored');
      setIsOnline(true);
      toast.info('Conexão restaurada. Sincronizando...', { duration: 2000 });
      triggerSync();
    };

    const handleOffline = () => {
      console.log('[OfflineSync] Connection lost');
      setIsOnline(false);
      toast.warning('Modo offline ativado', { duration: 3000 });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Load initial pending count
    setPendingCount(getPendingOperations().length);

    // Clean expired cache on mount
    clearExpiredCache().catch(console.error);

    // Try to sync on mount if online
    if (navigator.onLine) {
      triggerSync();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [triggerSync, getPendingOperations]);

  // Clear all pending operations
  const clearPendingOperations = useCallback(() => {
    localStorage.removeItem(PENDING_OPS_KEY);
    setPendingCount(0);
  }, []);

  // Get cache statistics
  const getCacheStatistics = useCallback(async () => {
    return getCacheStats();
  }, []);

  return {
    isOnline,
    isSyncing,
    pendingCount,
    lastSyncTime,
    syncProgress,
    queueOperation,
    syncPendingOperations,
    clearPendingOperations,
    getPendingOperations,
    cacheData,
    getCachedData,
    fetchWithCache,
    getCacheStatistics,
    triggerSync
  };
}