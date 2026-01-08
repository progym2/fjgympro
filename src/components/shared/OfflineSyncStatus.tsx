import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, Cloud, CloudOff, Loader2, Check } from 'lucide-react';
import { useEnhancedOfflineSync } from '@/hooks/useEnhancedOfflineSync';
import { cn } from '@/lib/utils';

interface OfflineSyncStatusProps {
  compact?: boolean;
  className?: string;
}

const OfflineSyncStatus: React.FC<OfflineSyncStatusProps> = ({ compact = false, className }) => {
  const { isOnline, isSyncing, pendingCount, syncProgress } = useEnhancedOfflineSync();

  if (compact) {
    return (
      <AnimatePresence mode="wait">
        {!isOnline && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/20 text-amber-500 text-xs",
              className
            )}
          >
            <WifiOff className="w-3 h-3" />
            <span>Offline</span>
            {pendingCount > 0 && (
              <span className="bg-amber-500 text-amber-950 rounded-full px-1.5 text-[10px] font-bold">
                {pendingCount}
              </span>
            )}
          </motion.div>
        )}
        {isOnline && isSyncing && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-full bg-blue-500/20 text-blue-500 text-xs",
              className
            )}
          >
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>{syncProgress}%</span>
          </motion.div>
        )}
        {isOnline && !isSyncing && pendingCount > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/20 text-amber-500 text-xs",
              className
            )}
          >
            <Cloud className="w-3 h-3" />
            <span>{pendingCount}</span>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border",
        isOnline 
          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500"
          : "bg-amber-500/10 border-amber-500/30 text-amber-500",
        className
      )}
    >
      <div className="flex items-center gap-2">
        {isOnline ? (
          <>
            {isSyncing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Wifi className="w-5 h-5" />
            )}
          </>
        ) : (
          <WifiOff className="w-5 h-5" />
        )}
        
        <div>
          <p className="text-sm font-medium">
            {isOnline ? (isSyncing ? 'Sincronizando...' : 'Online') : 'Modo Offline'}
          </p>
          {pendingCount > 0 && (
            <p className="text-xs opacity-80">
              {pendingCount} {pendingCount === 1 ? 'alteração pendente' : 'alterações pendentes'}
            </p>
          )}
        </div>
      </div>

      {isSyncing && (
        <div className="ml-auto flex items-center gap-2">
          <div className="w-20 h-1.5 bg-white/20 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-current rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${syncProgress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <span className="text-xs font-mono">{syncProgress}%</span>
        </div>
      )}

      {isOnline && !isSyncing && pendingCount === 0 && (
        <Check className="w-5 h-5 ml-auto" />
      )}
    </motion.div>
  );
};

export default OfflineSyncStatus;