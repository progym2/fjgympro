import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, Cloud, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEnhancedOfflineSync } from '@/hooks/useEnhancedOfflineSync';

const OfflineIndicator: React.FC = () => {
  const { isOnline, isSyncing, pendingCount, syncProgress } = useEnhancedOfflineSync();
  const [showBanner, setShowBanner] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
      setShowBanner(true);
    } else if (wasOffline) {
      // Just came back online
      setShowBanner(true);
      const timer = setTimeout(() => {
        setShowBanner(false);
        setWasOffline(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  return (
    <>
      {/* Banner de status */}
      <AnimatePresence>
        {showBanner && (
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className={`fixed top-0 left-0 right-0 z-[9999] py-2 px-4 text-center text-sm font-medium flex items-center justify-center gap-2 ${
              isOnline 
                ? 'bg-emerald-500 text-white' 
                : 'bg-amber-500 text-black'
            }`}
          >
            {isOnline ? (
              <>
                {isSyncing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Sincronizando... {syncProgress}%
                  </>
                ) : (
                  <>
                    <Wifi size={16} />
                    Conexão restaurada
                    {pendingCount > 0 && ` • ${pendingCount} pendentes`}
                  </>
                )}
              </>
            ) : (
              <>
                <WifiOff size={16} />
                Modo offline - alterações serão sincronizadas quando conectar
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Indicador persistente */}
      <AnimatePresence>
        {(!isOnline || pendingCount > 0) && !showBanner && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className={`fixed top-2 right-2 z-[9999] flex items-center gap-1.5 px-2.5 py-1.5 rounded-full shadow-lg ${
              !isOnline 
                ? 'bg-amber-500 text-black' 
                : 'bg-blue-500 text-white'
            }`}
          >
            {!isOnline ? (
              <WifiOff size={14} />
            ) : isSyncing ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Cloud size={14} />
            )}
            {pendingCount > 0 && (
              <span className="text-xs font-bold">{pendingCount}</span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default OfflineIndicator;
