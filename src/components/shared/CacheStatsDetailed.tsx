import React, { useState, useEffect, useCallback } from 'react';
import { 
  Database, HardDrive, Trash2, RefreshCw, 
  User, Dumbbell, Droplets, Scale, Bell, 
  ChartPie, Clock, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { openDB, CachedData } from '@/lib/indexedDB';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

interface CacheCategory {
  id: string;
  name: string;
  icon: React.ElementType;
  color: string;
  count: number;
  sizeBytes: number;
}

interface CacheStatsDetailedProps {
  className?: string;
  onClear?: () => void;
}

const CacheStatsDetailed: React.FC<CacheStatsDetailedProps> = ({ className, onClear }) => {
  const [categories, setCategories] = useState<CacheCategory[]>([]);
  const [totalSize, setTotalSize] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isClearing, setIsClearing] = useState(false);
  const [oldestCache, setOldestCache] = useState<Date | null>(null);

  const categoryConfig: Record<string, { name: string; icon: React.ElementType; color: string }> = {
    profile: { name: 'Perfil', icon: User, color: 'text-blue-400 bg-blue-500/20' },
    workouts: { name: 'Treinos', icon: Dumbbell, color: 'text-emerald-400 bg-emerald-500/20' },
    exercises: { name: 'Exercícios', icon: Dumbbell, color: 'text-green-400 bg-green-500/20' },
    hydration: { name: 'Hidratação', icon: Droplets, color: 'text-cyan-400 bg-cyan-500/20' },
    weight: { name: 'Peso', icon: Scale, color: 'text-purple-400 bg-purple-500/20' },
    notifications: { name: 'Notificações', icon: Bell, color: 'text-yellow-400 bg-yellow-500/20' },
    meal_plans: { name: 'Refeições', icon: ChartPie, color: 'text-orange-400 bg-orange-500/20' },
    other: { name: 'Outros', icon: Database, color: 'text-gray-400 bg-gray-500/20' },
  };

  const loadCacheStats = useCallback(async () => {
    setIsLoading(true);
    try {
      const db = await openDB();
      const tx = db.transaction('cache', 'readonly');
      const store = tx.objectStore('cache');

      const stats: Record<string, { count: number; size: number }> = {};
      let total = 0;
      let oldest: number | null = null;

      await new Promise<void>((resolve, reject) => {
        const request = store.openCursor();
        
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            const item = cursor.value as CachedData<unknown>;
            const key = item.key;
            const itemSize = JSON.stringify(item).length * 2;
            
            // Determine category from key
            let category = 'other';
            if (key.includes('profile')) category = 'profile';
            else if (key.includes('workout')) category = 'workouts';
            else if (key.includes('exercise')) category = 'exercises';
            else if (key.includes('hydration')) category = 'hydration';
            else if (key.includes('weight')) category = 'weight';
            else if (key.includes('notification')) category = 'notifications';
            else if (key.includes('meal')) category = 'meal_plans';

            if (!stats[category]) {
              stats[category] = { count: 0, size: 0 };
            }
            stats[category].count++;
            stats[category].size += itemSize;
            total += itemSize;

            if (oldest === null || item.timestamp < oldest) {
              oldest = item.timestamp;
            }

            cursor.continue();
          } else {
            resolve();
          }
        };
        
        request.onerror = () => reject(request.error);
      });

      // Convert to categories array
      const categoriesArray: CacheCategory[] = Object.entries(stats).map(([id, data]) => ({
        id,
        name: categoryConfig[id]?.name || id,
        icon: categoryConfig[id]?.icon || Database,
        color: categoryConfig[id]?.color || 'text-gray-400 bg-gray-500/20',
        count: data.count,
        sizeBytes: data.size,
      }));

      // Sort by size descending
      categoriesArray.sort((a, b) => b.sizeBytes - a.sizeBytes);

      setCategories(categoriesArray);
      setTotalSize(total);
      setOldestCache(oldest ? new Date(oldest) : null);
    } catch (error) {
      console.error('Error loading cache stats:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCacheStats();
  }, [loadCacheStats]);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const handleClearCategory = async (categoryId: string) => {
    setIsClearing(true);
    try {
      const db = await openDB();
      const tx = db.transaction('cache', 'readwrite');
      const store = tx.objectStore('cache');

      await new Promise<void>((resolve, reject) => {
        const request = store.openCursor();
        
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            const key = cursor.value.key as string;
            const shouldDelete = 
              (categoryId === 'profile' && key.includes('profile')) ||
              (categoryId === 'workouts' && key.includes('workout')) ||
              (categoryId === 'exercises' && key.includes('exercise')) ||
              (categoryId === 'hydration' && key.includes('hydration')) ||
              (categoryId === 'weight' && key.includes('weight')) ||
              (categoryId === 'notifications' && key.includes('notification')) ||
              (categoryId === 'meal_plans' && key.includes('meal'));

            if (shouldDelete) {
              cursor.delete();
            }
            cursor.continue();
          } else {
            resolve();
          }
        };
        
        request.onerror = () => reject(request.error);
      });

      toast.success(`Cache de ${categoryConfig[categoryId]?.name || categoryId} limpo`);
      await loadCacheStats();
    } catch (error) {
      toast.error('Erro ao limpar cache');
      console.error('Error clearing category cache:', error);
    } finally {
      setIsClearing(false);
    }
  };

  const handleClearAll = async () => {
    setIsClearing(true);
    try {
      const db = await openDB();
      const tx = db.transaction('cache', 'readwrite');
      tx.objectStore('cache').clear();
      
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });

      toast.success('Todo o cache foi limpo');
      await loadCacheStats();
      onClear?.();
    } catch (error) {
      toast.error('Erro ao limpar cache');
      console.error('Error clearing all cache:', error);
    } finally {
      setIsClearing(false);
    }
  };

  if (isLoading) {
    return (
      <div className={cn('bg-card rounded-lg border border-border p-6', className)}>
        <div className="flex items-center justify-center gap-3 text-muted-foreground">
          <RefreshCw size={20} className="animate-spin" />
          <span>Analisando cache...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('bg-card rounded-lg border border-border p-4 space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <HardDrive size={20} className="text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Estatísticas de Cache</h3>
            <p className="text-xs text-muted-foreground">
              {categories.reduce((sum, c) => sum + c.count, 0)} itens • {formatBytes(totalSize)}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadCacheStats}
          disabled={isLoading}
        >
          <RefreshCw size={14} className={cn(isLoading && 'animate-spin')} />
        </Button>
      </div>

      {/* Total progress bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Uso do cache</span>
          <span>{formatBytes(totalSize)}</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-primary to-primary/60"
          />
        </div>
      </div>

      {/* Categories breakdown */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Por categoria
        </p>
        <AnimatePresence>
          {categories.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Database size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhum dado em cache</p>
            </div>
          ) : (
            categories.map((category, index) => (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-3 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group"
              >
                <div className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center',
                  category.color
                )}>
                  <category.icon size={16} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium truncate">{category.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {category.count} • {formatBytes(category.sizeBytes)}
                    </span>
                  </div>
                  <Progress 
                    value={(category.sizeBytes / totalSize) * 100} 
                    className="h-1"
                  />
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleClearCategory(category.id)}
                  disabled={isClearing}
                >
                  <Trash2 size={12} className="text-destructive" />
                </Button>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Meta info */}
      {oldestCache && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t border-border">
          <Clock size={12} />
          <span>
            Cache mais antigo: {oldestCache.toLocaleDateString('pt-BR')} às{' '}
            {oldestCache.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      )}

      {/* Clear all button */}
      {categories.length > 0 && (
        <Button
          variant="destructive"
          size="sm"
          className="w-full"
          onClick={handleClearAll}
          disabled={isClearing}
        >
          {isClearing ? (
            <RefreshCw size={14} className="mr-2 animate-spin" />
          ) : (
            <Trash2 size={14} className="mr-2" />
          )}
          Limpar todo o cache
        </Button>
      )}
    </div>
  );
};

export default CacheStatsDetailed;
