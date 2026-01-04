import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PendingOperation {
  id: string;
  table: string;
  operation: 'insert' | 'update' | 'delete';
  data: Record<string, unknown>;
  timestamp: number;
  retryCount: number;
}

const PENDING_OPS_KEY = 'francgympro_pending_operations';
const MAX_RETRIES = 3;
const SYNC_DEBOUNCE_MS = 2000;

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load pending operations from localStorage
  const getPendingOperations = useCallback((): PendingOperation[] => {
    try {
      const stored = localStorage.getItem(PENDING_OPS_KEY);
      return stored ? JSON.parse(stored) : [];
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
      console.warn('Failed to save pending operations:', error);
    }
  }, []);

  // Add a new operation to the queue
  const queueOperation = useCallback((
    table: string,
    operation: 'insert' | 'update' | 'delete',
    data: Record<string, unknown>
  ) => {
    const pending = getPendingOperations();
    const newOp: PendingOperation = {
      id: crypto.randomUUID(),
      table,
      operation,
      data,
      timestamp: Date.now(),
      retryCount: 0
    };
    
    pending.push(newOp);
    savePendingOperations(pending);
    
    console.log(`[OfflineSync] Queued ${operation} on ${table}`);
    return newOp.id;
  }, [getPendingOperations, savePendingOperations]);

  // Execute a single operation
  const executeOperation = async (op: PendingOperation): Promise<boolean> => {
    try {
      let result;
      const tableName = op.table as keyof typeof supabase extends never ? string : string;
      
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
        console.error(`[OfflineSync] Error executing ${op.operation} on ${op.table}:`, result.error);
        return false;
      }

      console.log(`[OfflineSync] Successfully executed ${op.operation} on ${op.table}`);
      return true;
    } catch (error) {
      console.error(`[OfflineSync] Failed to execute operation:`, error);
      return false;
    }
  };

  // Sync all pending operations
  const syncPendingOperations = useCallback(async () => {
    if (!navigator.onLine || isSyncing) return;

    const pending = getPendingOperations();
    if (pending.length === 0) return;

    setIsSyncing(true);
    console.log(`[OfflineSync] Starting sync of ${pending.length} pending operations`);

    const remainingOps: PendingOperation[] = [];
    let successCount = 0;
    let failCount = 0;

    for (const op of pending) {
      const success = await executeOperation(op);
      
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

    if (successCount > 0) {
      toast.success(`${successCount} ${successCount === 1 ? 'operação sincronizada' : 'operações sincronizadas'}`);
    }
    
    if (failCount > 0) {
      toast.error(`${failCount} ${failCount === 1 ? 'operação falhou' : 'operações falharam'} após várias tentativas`);
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

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => {
      console.log('[OfflineSync] Connection restored');
      setIsOnline(true);
      toast.info('Conexão restaurada. Sincronizando dados...');
      triggerSync();
    };

    const handleOffline = () => {
      console.log('[OfflineSync] Connection lost');
      setIsOnline(false);
      toast.warning('Sem conexão. Alterações serão salvas localmente.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Load initial pending count
    setPendingCount(getPendingOperations().length);

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

  return {
    isOnline,
    isSyncing,
    pendingCount,
    queueOperation,
    syncPendingOperations,
    clearPendingOperations,
    getPendingOperations
  };
}
