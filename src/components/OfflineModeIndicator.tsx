import React, { useState, useEffect } from 'react';
import { 
  Wifi, WifiOff, Cloud, CloudOff, Database, 
  User, Dumbbell, Scale, Droplets, Calendar, 
  Check, X, AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useEnhancedOfflineSync } from '@/hooks/useEnhancedOfflineSync';
import { getCacheSize } from '@/lib/indexedDB';

interface FeatureStatus {
  id: string;
  name: string;
  icon: React.ElementType;
  available: boolean;
  cached: boolean;
}

const OfflineModeIndicator: React.FC = () => {
  const { isOnline, pendingCount } = useEnhancedOfflineSync();
  const [showDetails, setShowDetails] = useState(false);
  const [features, setFeatures] = useState<FeatureStatus[]>([]);
  const [cacheSize, setCacheSize] = useState(0);

  useEffect(() => {
    const checkFeatures = async () => {
      const size = await getCacheSize();
      setCacheSize(size);

      // Check cached data availability
      const checkCache = async (key: string) => {
        try {
          const cached = localStorage.getItem(`offline_cache_${key}`);
          return !!cached || size > 0;
        } catch {
          return false;
        }
      };

      const featureList: FeatureStatus[] = [
        {
          id: 'profile',
          name: 'Perfil',
          icon: User,
          available: true,
          cached: await checkCache('profile'),
        },
        {
          id: 'workouts',
          name: 'Treinos',
          icon: Dumbbell,
          available: true,
          cached: await checkCache('workouts'),
        },
        {
          id: 'weight',
          name: 'Peso',
          icon: Scale,
          available: true,
          cached: await checkCache('weight'),
        },
        {
          id: 'hydration',
          name: 'Hidratação',
          icon: Droplets,
          available: true,
          cached: await checkCache('hydration'),
        },
        {
          id: 'schedule',
          name: 'Agenda',
          icon: Calendar,
          available: isOnline,
          cached: false,
        },
      ];

      setFeatures(featureList);
    };

    checkFeatures();
    const interval = setInterval(checkFeatures, 10000);
    return () => clearInterval(interval);
  }, [isOnline]);

  // Don't show if online and no pending operations
  if (isOnline && pendingCount === 0) {
    return null;
  }

  return (
    <>
      {/* Floating indicator button */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        onClick={() => setShowDetails(!showDetails)}
        className={cn(
          'fixed bottom-20 right-3 z-50',
          'w-12 h-12 rounded-full',
          'flex items-center justify-center',
          'shadow-lg backdrop-blur-sm',
          'transition-colors duration-300',
          !isOnline 
            ? 'bg-amber-500/90 text-black' 
            : 'bg-blue-500/90 text-white'
        )}
      >
        {!isOnline ? (
          <WifiOff size={20} />
        ) : (
          <div className="relative">
            <Cloud size={20} />
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                {pendingCount > 9 ? '9+' : pendingCount}
              </span>
            )}
          </div>
        )}
      </motion.button>

      {/* Details panel */}
      <AnimatePresence>
        {showDetails && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDetails(false)}
              className="fixed inset-0 bg-black/50 z-50"
            />

            {/* Panel */}
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-2xl border-t border-border shadow-xl max-h-[70vh] overflow-auto"
            >
              {/* Header */}
              <div className="sticky top-0 bg-card p-4 border-b border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center',
                      !isOnline ? 'bg-amber-500/20 text-amber-500' : 'bg-emerald-500/20 text-emerald-500'
                    )}>
                      {!isOnline ? <WifiOff size={20} /> : <Wifi size={20} />}
                    </div>
                    <div>
                      <h3 className="font-semibold">
                        {!isOnline ? 'Modo Offline' : 'Sincronização'}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {!isOnline 
                          ? 'Trabalhando sem conexão' 
                          : `${pendingCount} alterações pendentes`
                        }
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowDetails(false)}
                    className="p-2 rounded-lg hover:bg-muted transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-4 space-y-4">
                {/* Status cards */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <Database size={12} />
                      Cache local
                    </div>
                    <p className="text-lg font-semibold">{cacheSize} itens</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <CloudOff size={12} />
                      Pendentes
                    </div>
                    <p className="text-lg font-semibold">{pendingCount} ops</p>
                  </div>
                </div>

                {/* Features availability */}
                <div>
                  <h4 className="text-sm font-medium mb-3">Disponibilidade Offline</h4>
                  <div className="space-y-2">
                    {features.map((feature) => (
                      <div
                        key={feature.id}
                        className={cn(
                          'flex items-center justify-between p-3 rounded-lg',
                          'bg-muted/30 border border-border/50'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <feature.icon size={18} className="text-muted-foreground" />
                          <span className="text-sm">{feature.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {feature.cached && (
                            <span className="text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">
                              Em cache
                            </span>
                          )}
                          {feature.available ? (
                            <Check size={16} className="text-emerald-500" />
                          ) : (
                            <AlertTriangle size={16} className="text-amber-500" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Info */}
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                  <p className="text-xs text-blue-400">
                    {!isOnline 
                      ? 'Suas alterações serão sincronizadas automaticamente quando a conexão for restaurada.'
                      : 'Sincronização em andamento. Suas alterações estão sendo enviadas para o servidor.'
                    }
                  </p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default OfflineModeIndicator;
