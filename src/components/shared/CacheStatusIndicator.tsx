import React, { useState, useEffect, useCallback } from 'react';
import { Database, Cloud, CloudOff, Trash2, RefreshCw, Check, AlertCircle, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { getCacheSize, clearAllCaches } from '@/lib/indexedDB';
import { useEnhancedOfflineSync } from '@/hooks/useEnhancedOfflineSync';
import { getCacheLimitMb, setCacheLimitMb, getCacheLimitBytes, isAutoCleanupEnabled, setAutoCleanupEnabled } from '@/hooks/useCacheSizeMonitor';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface CacheStatusIndicatorProps {
  compact?: boolean;
  showActions?: boolean;
  className?: string;
}

const CACHE_LIMIT_OPTIONS = [
  { value: '25', label: '25 MB' },
  { value: '50', label: '50 MB' },
  { value: '100', label: '100 MB' },
  { value: '200', label: '200 MB' },
];

const CacheStatusIndicator: React.FC<CacheStatusIndicatorProps> = ({
  compact = false,
  showActions = true,
  className
}) => {
  const { isOnline, isSyncing, pendingCount, syncProgress, triggerSync, clearPendingOperations } = useEnhancedOfflineSync();
  const [cacheSize, setCacheSize] = useState<number>(0);
  const [isClearing, setIsClearing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [cacheLimit, setCacheLimit] = useState<number>(getCacheLimitMb());
  const [showSettings, setShowSettings] = useState(false);
  const [autoCleanup, setAutoCleanup] = useState<boolean>(isAutoCleanupEnabled());

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

  const handleCacheLimitChange = (value: string) => {
    const newLimit = parseInt(value);
    setCacheLimit(newLimit);
    setCacheLimitMb(newLimit);
    toast.success(`Limite de cache alterado para ${value} MB`);
  };

  const handleAutoCleanupChange = (enabled: boolean) => {
    setAutoCleanup(enabled);
    setAutoCleanupEnabled(enabled);
    toast.success(enabled ? 'Limpeza automática ativada' : 'Limpeza automática desativada');
  };

  const formatCacheSize = (items: number) => {
    if (items === 0) return '0 itens';
    if (items === 1) return '1 item';
    return `${items} itens`;
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const getCacheSizePercentage = (): number => {
    const limitBytes = getCacheLimitBytes();
    return Math.min((cacheSize / limitBytes) * 100, 100);
  };

  const getCacheSizeColor = (): string => {
    const percentage = getCacheSizePercentage();
    if (percentage >= 90) return 'text-red-400';
    if (percentage >= 70) return 'text-orange-400';
    return 'text-blue-400';
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
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-1 rounded hover:bg-muted transition-colors"
            title="Configurações"
          >
            <Settings size={14} className="text-muted-foreground" />
          </button>
          <div className={cn(
            'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium',
            isOnline ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
          )}>
            {isOnline ? <Cloud size={12} /> : <CloudOff size={12} />}
            <span>{isOnline ? 'Online' : 'Offline'}</span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {/* Cache size with progress bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Uso do cache:</span>
            <span className={cn('font-medium', getCacheSizeColor())}>
              {formatBytes(cacheSize)} / {cacheLimit} MB
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              className={cn(
                'h-full rounded-full',
                getCacheSizePercentage() >= 90 ? 'bg-red-500' :
                getCacheSizePercentage() >= 70 ? 'bg-orange-500' : 'bg-blue-500'
              )}
              initial={{ width: '0%' }}
              animate={{ width: `${getCacheSizePercentage()}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        {/* Cache limit settings */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2 pt-2 border-t border-border"
            >
              <Label className="text-xs text-muted-foreground">Limite máximo de cache</Label>
              <Select value={cacheLimit.toString()} onValueChange={handleCacheLimitChange}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CACHE_LIMIT_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex items-center justify-between pt-2">
                <div className="space-y-0.5">
                  <Label className="text-xs">Limpeza automática</Label>
                  <p className="text-[10px] text-muted-foreground">
                    Remove itens antigos ao atingir 90% do limite
                  </p>
                </div>
                <Switch
                  checked={autoCleanup}
                  onCheckedChange={handleAutoCleanupChange}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
