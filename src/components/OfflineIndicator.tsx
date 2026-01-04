import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, RefreshCw, CloudOff, Cloud } from 'lucide-react';
import { useOfflineSync } from '@/hooks/useOfflineSync';

const OfflineIndicator: React.FC = () => {
  const { isOnline, isSyncing, pendingCount } = useOfflineSync();
  const [showNotification, setShowNotification] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);
  const [notificationType, setNotificationType] = useState<'offline' | 'online' | 'syncing'>('offline');

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
      setNotificationType('offline');
      setShowNotification(true);
    } else if (wasOffline && isOnline) {
      setNotificationType('syncing');
      setShowNotification(true);
      
      // Hide after sync or timeout
      const timer = setTimeout(() => setShowNotification(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  useEffect(() => {
    if (isSyncing) {
      setNotificationType('syncing');
      setShowNotification(true);
    } else if (notificationType === 'syncing' && !isSyncing && isOnline) {
      setNotificationType('online');
      const timer = setTimeout(() => {
        setShowNotification(false);
        setWasOffline(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isSyncing, notificationType, isOnline]);

  const getNotificationContent = () => {
    switch (notificationType) {
      case 'syncing':
        return (
          <>
            <RefreshCw size={16} className="animate-spin" />
            <span>Sincronizando {pendingCount > 0 ? `(${pendingCount})` : ''}...</span>
          </>
        );
      case 'online':
        return (
          <>
            <Cloud size={16} />
            <span>Dados sincronizados</span>
          </>
        );
      case 'offline':
      default:
        return (
          <>
            <CloudOff size={16} />
            <span>Modo offline - salvando localmente</span>
          </>
        );
    }
  };

  const getNotificationStyle = () => {
    switch (notificationType) {
      case 'syncing':
        return 'bg-blue-500/20 border-blue-500/50 text-blue-400';
      case 'online':
        return 'bg-green-500/20 border-green-500/50 text-green-400';
      case 'offline':
      default:
        return 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400';
    }
  };

  return (
    <AnimatePresence>
      {showNotification && (
        <motion.div
          initial={{ opacity: 0, y: -50, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: -50, x: '-50%' }}
          className={`
            fixed top-4 left-1/2 z-[100]
            px-4 py-2 rounded-full
            flex items-center gap-2
            text-sm font-medium
            shadow-lg backdrop-blur-md border
            ${getNotificationStyle()}
          `}
        >
          {getNotificationContent()}
        </motion.div>
      )}

      {/* Persistent offline indicator */}
      {!isOnline && !showNotification && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="fixed bottom-20 right-4 z-[100] p-2 rounded-full bg-yellow-500/20 border border-yellow-500/50 flex items-center gap-1"
        >
          <WifiOff size={16} className="text-yellow-500" />
          {pendingCount > 0 && (
            <span className="text-xs text-yellow-500 font-medium">{pendingCount}</span>
          )}
        </motion.div>
      )}

      {/* Syncing indicator when online */}
      {isOnline && isSyncing && !showNotification && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="fixed bottom-20 right-4 z-[100] p-2 rounded-full bg-blue-500/20 border border-blue-500/50"
        >
          <RefreshCw size={16} className="text-blue-400 animate-spin" />
        </motion.div>
      )}

      {/* Pending count indicator when online but has pending items */}
      {isOnline && !isSyncing && pendingCount > 0 && !showNotification && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="fixed bottom-20 right-4 z-[100] p-2 rounded-full bg-orange-500/20 border border-orange-500/50 flex items-center gap-1"
        >
          <Wifi size={16} className="text-orange-400" />
          <span className="text-xs text-orange-400 font-medium">{pendingCount}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OfflineIndicator;
