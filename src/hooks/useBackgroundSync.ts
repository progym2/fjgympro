import { useEffect, useCallback, useRef } from 'react';

const SYNC_TAG = 'francgym-background-sync';
const PENDING_OPS_KEY = 'francgym_pending_operations';

interface PendingOperation {
  id: string;
  table: string;
  operation: 'insert' | 'update' | 'delete';
  data: Record<string, unknown>;
  timestamp: number;
  retryCount: number;
  priority: number;
}

export const useBackgroundSync = () => {
  const syncInProgress = useRef(false);

  const registerBackgroundSync = useCallback(async () => {
    if (!('serviceWorker' in navigator) || !('SyncManager' in window)) {
      return false;
    }
    try {
      const registration = await navigator.serviceWorker.ready;
      // @ts-ignore
      await registration.sync?.register(SYNC_TAG);
      return true;
    } catch {
      return false;
    }
  }, []);

  const executePendingOperations = useCallback(async () => {
    if (syncInProgress.current || !navigator.onLine) return;
    syncInProgress.current = true;

    try {
      const stored = localStorage.getItem(PENDING_OPS_KEY);
      if (!stored) return;

      const operations: PendingOperation[] = JSON.parse(stored);
      if (operations.length === 0) return;

      // Import supabase dynamically to avoid circular deps
      const { supabase } = await import('@/integrations/supabase/client');
      const successfulOps: string[] = [];

      for (const op of operations) {
        try {
          const table = op.table as 'profiles' | 'workout_logs' | 'hydration_records' | 'weight_records';
          
          if (op.operation === 'insert') {
            await supabase.from(table).insert(op.data as never);
          } else if (op.operation === 'update') {
            const { id, ...rest } = op.data;
            await supabase.from(table).update(rest as never).eq('id', id as string);
          } else if (op.operation === 'delete') {
            await supabase.from(table).delete().eq('id', op.data.id as string);
          }
          successfulOps.push(op.id);
        } catch (e) {
          console.error('Sync error:', e);
        }
      }

      const remaining = operations.filter(op => !successfulOps.includes(op.id));
      if (remaining.length > 0) {
        localStorage.setItem(PENDING_OPS_KEY, JSON.stringify(remaining));
      } else {
        localStorage.removeItem(PENDING_OPS_KEY);
      }
    } finally {
      syncInProgress.current = false;
    }
  }, []);

  const queueOperation = useCallback(async (
    table: string,
    operation: 'insert' | 'update' | 'delete',
    data: Record<string, unknown>,
    priority = 5
  ) => {
    const newOp: PendingOperation = {
      id: crypto.randomUUID(),
      table,
      operation,
      data,
      timestamp: Date.now(),
      retryCount: 0,
      priority,
    };

    const stored = localStorage.getItem(PENDING_OPS_KEY);
    const operations: PendingOperation[] = stored ? JSON.parse(stored) : [];
    operations.push(newOp);
    localStorage.setItem(PENDING_OPS_KEY, JSON.stringify(operations));

    await registerBackgroundSync();
    if (navigator.onLine) await executePendingOperations();

    return newOp.id;
  }, [registerBackgroundSync, executePendingOperations]);

  useEffect(() => {
    window.addEventListener('online', executePendingOperations);
    return () => window.removeEventListener('online', executePendingOperations);
  }, [executePendingOperations]);

  useEffect(() => {
    if (navigator.onLine) executePendingOperations();
  }, [executePendingOperations]);

  return { queueOperation, registerBackgroundSync, executePendingOperations };
};
