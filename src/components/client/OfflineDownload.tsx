import React, { useState, useCallback } from 'react';
import { Download, Check, Loader2, Wifi, WifiOff, HardDrive, CloudDownload } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useEnhancedOfflineSync } from '@/hooks/useEnhancedOfflineSync';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import CompactBackButton from '@/components/shared/CompactBackButton';

// Data types to download
const DATA_TYPES = [
  { key: 'workouts', label: 'Treinos', icon: HardDrive },
  { key: 'mealPlans', label: 'Planos Alimentares', icon: HardDrive },
  { key: 'weightRecords', label: 'Registros de Peso', icon: HardDrive },
  { key: 'hydrationRecords', label: 'Registros de Hidratação', icon: HardDrive },
  { key: 'exercises', label: 'Exercícios', icon: HardDrive },
  { key: 'personalRecords', label: 'Recordes Pessoais', icon: HardDrive },
  { key: 'workoutLogs', label: 'Histórico de Treinos', icon: HardDrive },
] as const;

type DataKey = typeof DATA_TYPES[number]['key'];

interface DownloadProgress {
  [key: string]: 'pending' | 'downloading' | 'done' | 'error';
}

const OfflineDownload: React.FC = () => {
  const { profile } = useAuth();
  const { cacheData, isOnline } = useEnhancedOfflineSync();
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState<DownloadProgress>({});
  const [totalDownloaded, setTotalDownloaded] = useState(0);

  const downloadData = useCallback(async (key: DataKey): Promise<boolean> => {
    if (!profile?.profile_id) return false;

    try {
      let data: any[] = [];

      switch (key) {
        case 'workouts':
          const { data: workouts } = await supabase
            .from('workout_plans')
            .select(`*, workout_plan_exercises (*, exercises (*))`)
            .or(`assigned_to.eq.${profile.profile_id},and(created_by.eq.${profile.profile_id},is_instructor_plan.eq.false)`)
            .eq('is_active', true);
          data = workouts || [];
          break;

        case 'mealPlans':
          const { data: meals } = await supabase
            .from('meal_plans')
            .select('*')
            .or(`assigned_to.eq.${profile.profile_id},created_by.eq.${profile.profile_id}`)
            .eq('is_active', true);
          data = meals || [];
          break;

        case 'weightRecords':
          const { data: weights } = await supabase
            .from('weight_records')
            .select('*')
            .eq('profile_id', profile.profile_id)
            .order('recorded_at', { ascending: false })
            .limit(365);
          data = weights || [];
          break;

        case 'hydrationRecords':
          const { data: hydration } = await supabase
            .from('hydration_records')
            .select('*')
            .eq('profile_id', profile.profile_id)
            .order('recorded_at', { ascending: false })
            .limit(365);
          data = hydration || [];
          break;

        case 'exercises':
          const { data: exercises } = await supabase
            .from('exercises')
            .select('*')
            .or(`is_system.eq.true,created_by.eq.${profile.profile_id}`);
          data = exercises || [];
          break;

        case 'personalRecords':
          const { data: records } = await supabase
            .from('personal_records')
            .select('*, exercises (*)')
            .eq('profile_id', profile.profile_id)
            .order('achieved_at', { ascending: false });
          data = records || [];
          break;

        case 'workoutLogs':
          const { data: logs } = await supabase
            .from('workout_logs')
            .select('*, workout_exercise_logs (*)')
            .eq('profile_id', profile.profile_id)
            .order('workout_date', { ascending: false })
            .limit(100);
          data = logs || [];
          break;
      }

      // Cache the data
      await cacheData(`offline_${key}`, data);
      return true;
    } catch (error) {
      console.error(`[OfflineDownload] Error downloading ${key}:`, error);
      return false;
    }
  }, [profile?.profile_id, cacheData]);

  const handleDownloadAll = useCallback(async () => {
    if (!isOnline) {
      toast.error('Sem conexão com a internet');
      return;
    }

    setIsDownloading(true);
    setTotalDownloaded(0);
    
    // Initialize progress
    const initialProgress: DownloadProgress = {};
    DATA_TYPES.forEach(type => {
      initialProgress[type.key] = 'pending';
    });
    setProgress(initialProgress);

    let successCount = 0;

    for (const type of DATA_TYPES) {
      setProgress(prev => ({ ...prev, [type.key]: 'downloading' }));
      
      const success = await downloadData(type.key);
      
      if (success) {
        successCount++;
        setTotalDownloaded(successCount);
      }
      
      setProgress(prev => ({ 
        ...prev, 
        [type.key]: success ? 'done' : 'error' 
      }));
    }

    setIsDownloading(false);

    if (successCount === DATA_TYPES.length) {
      toast.success('Todos os dados foram baixados para uso offline!');
    } else {
      toast.warning(`${successCount}/${DATA_TYPES.length} itens baixados`);
    }
  }, [isOnline, downloadData]);

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'downloading':
        return <Loader2 className="w-4 h-4 animate-spin text-primary" />;
      case 'done':
        return <Check className="w-4 h-4 text-green-500" />;
      case 'error':
        return <WifiOff className="w-4 h-4 text-red-500" />;
      default:
        return <div className="w-4 h-4 rounded-full border-2 border-muted" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CloudDownload className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bebas tracking-wider text-primary">DOWNLOAD OFFLINE</h2>
        </div>
        <CompactBackButton />
      </div>

      {/* Status Card */}
      <div className={cn(
        'p-4 rounded-xl border',
        isOnline 
          ? 'bg-green-500/10 border-green-500/30' 
          : 'bg-red-500/10 border-red-500/30'
      )}>
        <div className="flex items-center gap-3">
          {isOnline ? (
            <Wifi className="w-5 h-5 text-green-500" />
          ) : (
            <WifiOff className="w-5 h-5 text-red-500" />
          )}
          <div>
            <p className="text-sm font-medium">
              {isOnline ? 'Conectado' : 'Sem conexão'}
            </p>
            <p className="text-xs text-muted-foreground">
              {isOnline 
                ? 'Pronto para baixar dados' 
                : 'Conecte-se à internet para baixar'}
            </p>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="p-4 bg-card/80 rounded-xl border border-border/50">
        <p className="text-sm text-muted-foreground">
          Baixe todos os seus dados para usar o app mesmo sem conexão com a internet. 
          Os dados ficarão armazenados no seu dispositivo.
        </p>
      </div>

      {/* Download List */}
      <div className="space-y-2">
        {DATA_TYPES.map(type => (
          <div 
            key={type.key}
            className={cn(
              'flex items-center justify-between p-3 rounded-lg border transition-colors',
              progress[type.key] === 'done' 
                ? 'bg-green-500/5 border-green-500/20' 
                : 'bg-card/50 border-border/50'
            )}
          >
            <div className="flex items-center gap-3">
              <type.icon className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">{type.label}</span>
            </div>
            {getStatusIcon(progress[type.key])}
          </div>
        ))}
      </div>

      {/* Progress */}
      {isDownloading && (
        <div className="space-y-2">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${(totalDownloaded / DATA_TYPES.length) * 100}%` }}
            />
          </div>
          <p className="text-xs text-center text-muted-foreground">
            {totalDownloaded} de {DATA_TYPES.length} itens baixados
          </p>
        </div>
      )}

      {/* Download Button */}
      <button
        onClick={handleDownloadAll}
        disabled={isDownloading || !isOnline}
        className={cn(
          'w-full py-3 px-4 rounded-xl font-medium transition-all',
          'flex items-center justify-center gap-2',
          isOnline && !isDownloading
            ? 'bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98]'
            : 'bg-muted text-muted-foreground cursor-not-allowed'
        )}
      >
        {isDownloading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Baixando...
          </>
        ) : (
          <>
            <Download className="w-5 h-5" />
            Baixar Todos os Dados
          </>
        )}
      </button>

      {/* Last Download Info */}
      <p className="text-xs text-center text-muted-foreground">
        Os dados são armazenados localmente e expiram em 7 dias
      </p>
    </div>
  );
};

export default OfflineDownload;