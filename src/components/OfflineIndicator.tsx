import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowBanner(true);
      setTimeout(() => setShowBanner(false), 2000);
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      setShowBanner(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Não mostrar nada se online e sem banner
  if (isOnline && !showBanner) return null;

  return (
    <>
      {/* Banner de status */}
      {showBanner && (
        <div
          className={`fixed top-0 left-0 right-0 z-[9999] py-2 px-4 text-center text-sm font-medium flex items-center justify-center gap-2 ${
            isOnline 
              ? 'bg-green-500 text-white' 
              : 'bg-yellow-500 text-black'
          }`}
        >
          {isOnline ? (
            <>
              <Wifi size={16} />
              Conexão restaurada
            </>
          ) : (
            <>
              <WifiOff size={16} />
              Sem internet - modo offline
            </>
          )}
        </div>
      )}

      {/* Indicador persistente quando offline */}
      {!isOnline && !showBanner && (
        <div className="fixed top-2 right-2 z-[9999] p-2 rounded-full bg-yellow-500 shadow-lg">
          <WifiOff size={14} className="text-black" />
        </div>
      )}
    </>
  );
};

export default OfflineIndicator;
