import React, { useState, useEffect, useCallback } from 'react';
import { Database, Cloud, CloudOff, Trash2, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { getCacheSize, clearAllCaches } from '@/lib/indexedDB';
import { useEnhancedOfflineSync } from '@/hooks/useEnhancedOfflineSync';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface CacheStatusIndicatorProps {
  compact?: boolean;
  showActions?: boolean;
  className?: string;
}

const CacheStatusIndicator: React.FC<CacheStatusIndicatorProps> = ({
  compact = false,
  showActions = true,
  className
}) => {
  const { isOnline, isSyncing, pendingCount, syncProgress, triggerSync, clearPendingOperations } = useEnhancedOfflineSync();
  const [cacheSize, setCacheSize] = useState<number>(0);
  const [isClearing, setIsClearing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const loadCacheInfo = useCallback(async () => {
    try {
      const size = await getCacheSize();
      setCacheSize(size);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading cache info:', error);
    }
  }, []);

  useEffect(() => {
    loadCacheInfo();
    const interval = setInterval(loadCacheInfo, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, [loadCacheInfo]);

  const handleClearCache = async () => {
    setIsClearing(true);
    try {
      await clearAllCaches();
      await clearPendingOperations();
      toast.success('Cache limpo com sucesso!');
      await loadCacheInfo();
    } catch (error) {
      toast.error('Erro ao limpar cache');
      console.error('Error clearing cache:', error);
    } finally {
      setIsClearing(false);
    }
  };

  const handleForceSync = async () => {
    if (!isOnline) {
      toast.error('Sem conexão com a internet');
      return;
    }
    await triggerSync();
    toast.success('Sincronização iniciada');
  };

  const formatCacheSize = (items: number) => {
    if (items === 0) return '0 itens';
    if (items === 1) return '1 item';
    return `${items} itens`;
  };

  if (compact) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <div className={cn(
          'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs',
          isOnline ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
        )}>
          {isOnline ? <Cloud size={12} /> : <CloudOff size={12} />}
          <span>{isOnline ? 'Online' : 'Offline'}</span>
        </div>
        
        {cacheSize > 0 && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs">
            <Database size={12} />
            <span>{cacheSize}</span>
          </div>
        )}
        
        {pendingCount > 0 && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-orange-500/20 text-orange-400 text-xs">
            <AlertCircle size={12} />
            <span>{pendingCount} pendentes</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn('bg-card rounded-lg border border-border p-4', className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Database size={16} className="text-primary" />
          Cache & Sincronização
        </h3>
        <div className={cn(
          'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium',
          isOnline ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
        )}>
          {isOnline ? <Cloud size={12} /> : <CloudOff size={12} />}
          <span>{isOnline ? 'Online' : 'Offline'}</span>
        </div>
      </div>

      <div className="space-y-3">
        {/* Cache size */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Dados em cache:</span>
          <span className="font-medium text-blue-400">{formatCacheSize(cacheSize)}</span>
        </div>

        {/* Pending operations */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Operações pendentes:</span>
          <span className={cn(
            'font-medium',
            pendingCount > 0 ? 'text-orange-400' : 'text-emerald-400'
          )}>
            {pendingCount > 0 ? `${pendingCount} pendentes` : 'Sincronizado'}
          </span>
        </div>

        {/* Sync progress */}
        <AnimatePresence>
          {isSyncing && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-1"
            >
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Sincronizando...</span>
                <span>{syncProgress}%</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary"
                  initial={{ width: '0%' }}
                  animate={{ width: `${syncProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Last updated */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Última atualização:</span>
          <span>{lastUpdated.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>

        {/* Actions */}
        {showActions && (
          <div className="flex gap-2 pt-2 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              onClick={handleForceSync}
              disabled={!isOnline || isSyncing}
              className="flex-1 text-xs"
            >
              <RefreshCw size={14} className={cn('mr-1', isSyncing && 'animate-spin')} />
              Sincronizar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearCache}
              disabled={isClearing || cacheSize === 0}
              className="flex-1 text-xs text-destructive hover:text-destructive"
            >
              {isClearing ? (
                <RefreshCw size={14} className="mr-1 animate-spin" />
              ) : (
                <Trash2 size={14} className="mr-1" />
              )}
              Limpar Cache
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CacheStatusIndicator;
