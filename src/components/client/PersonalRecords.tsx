import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Dumbbell, TrendingUp, Crown, Flame, 
  Calendar, ChevronDown, ChevronUp, Zap, Target, Award
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ClientPageHeader from './ClientPageHeader';

interface PersonalRecord {
  id: string;
  profile_id: string;
  exercise_id: string;
  record_type: string;
  value: number;
  unit: string;
  achieved_at: string;
  notes: string | null;
  exercise?: {
    name: string;
    muscle_group: string | null;
  };
}

interface ExerciseLog {
  id: string;
  workout_plan_exercise_id: string;
  sets_completed: number;
  reps_completed: number | null;
  weight_used_kg: number | null;
  completed_at: string;
  workout_plan_exercise?: {
    exercise: {
      id: string;
      name: string;
      muscle_group: string | null;
    };
  };
}

const muscleGroupColors: { [key: string]: string } = {
  'Peito': 'from-red-500/20 to-red-600/20 border-red-500/30 text-red-400',
  'Costas': 'from-blue-500/20 to-blue-600/20 border-blue-500/30 text-blue-400',
  'Ombros': 'from-orange-500/20 to-orange-600/20 border-orange-500/30 text-orange-400',
  'Bíceps': 'from-purple-500/20 to-purple-600/20 border-purple-500/30 text-purple-400',
  'Tríceps': 'from-pink-500/20 to-pink-600/20 border-pink-500/30 text-pink-400',
  'Pernas': 'from-green-500/20 to-green-600/20 border-green-500/30 text-green-400',
  'Abdômen': 'from-yellow-500/20 to-yellow-600/20 border-yellow-500/30 text-yellow-400',
  'Glúteos': 'from-rose-500/20 to-rose-600/20 border-rose-500/30 text-rose-400',
  'Cardio': 'from-cyan-500/20 to-cyan-600/20 border-cyan-500/30 text-cyan-400',
};

const getRecordTypeInfo = (type: string) => {
  switch (type) {
    case 'max_weight':
      return { label: 'Peso Máximo', icon: <Dumbbell className="w-4 h-4" />, color: 'text-yellow-400' };
    case 'max_reps':
      return { label: 'Máx. Repetições', icon: <Zap className="w-4 h-4" />, color: 'text-green-400' };
    case 'max_volume':
      return { label: 'Volume Total', icon: <TrendingUp className="w-4 h-4" />, color: 'text-blue-400' };
    case 'best_time':
      return { label: 'Melhor Tempo', icon: <Target className="w-4 h-4" />, color: 'text-purple-400' };
    default:
      return { label: type, icon: <Trophy className="w-4 h-4" />, color: 'text-primary' };
  }
};

const PersonalRecords: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [records, setRecords] = useState<PersonalRecord[]>([]);
  const [recentLogs, setRecentLogs] = useState<ExerciseLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMuscle, setSelectedMuscle] = useState<string>('all');
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      fetchData();
    }
  }, [profile]);

  const fetchData = async () => {
    try {
      // Fetch personal records with exercise info
      const { data: recordsData, error: recordsError } = await supabase
        .from('personal_records')
        .select(`
          *,
          exercise:exercises(name, muscle_group)
        `)
        .eq('profile_id', profile?.profile_id)
        .order('achieved_at', { ascending: false });

      if (recordsError) throw recordsError;
      setRecords(recordsData || []);

      // Fetch recent exercise logs to detect potential new records
      const { data: logsData, error: logsError } = await supabase
        .from('workout_exercise_logs')
        .select(`
          *,
          workout_plan_exercise:workout_plan_exercises(
            exercise:exercises(id, name, muscle_group)
          )
        `)
        .order('completed_at', { ascending: false })
        .limit(100);

      if (!logsError && logsData) {
        // Filter to only include logs from user's workout logs
        const { data: userLogs } = await supabase
          .from('workout_logs')
          .select('id')
          .eq('profile_id', profile?.profile_id);
        
        const userLogIds = new Set((userLogs || []).map(l => l.id));
        const filteredLogs = logsData.filter((log: any) => 
          userLogIds.has(log.workout_log_id)
        );
        setRecentLogs(filteredLogs as ExerciseLog[]);
        
        // Auto-detect new records
        await detectNewRecords(filteredLogs as ExerciseLog[], recordsData || []);
      }
    } catch (error) {
      console.error('Error fetching records:', error);
      toast.error('Erro ao carregar recordes');
    } finally {
      setLoading(false);
    }
  };

  const detectNewRecords = async (logs: ExerciseLog[], existingRecords: PersonalRecord[]) => {
    const newRecordsToAdd: Partial<PersonalRecord>[] = [];
    const exerciseBestWeight = new Map<string, { value: number; logId: string }>();

    // Find best weight for each exercise
    logs.forEach(log => {
      const exerciseId = log.workout_plan_exercise?.exercise?.id;
      if (!exerciseId || !log.weight_used_kg) return;

      const current = exerciseBestWeight.get(exerciseId);
      if (!current || log.weight_used_kg > current.value) {
        exerciseBestWeight.set(exerciseId, { value: log.weight_used_kg, logId: log.id });
      }
    });

    // Compare with existing records
    exerciseBestWeight.forEach((data, exerciseId) => {
      const existingRecord = existingRecords.find(
        r => r.exercise_id === exerciseId && r.record_type === 'max_weight'
      );

      if (!existingRecord || data.value > existingRecord.value) {
        newRecordsToAdd.push({
          profile_id: profile?.profile_id,
          exercise_id: exerciseId,
          record_type: 'max_weight',
          value: data.value,
          unit: 'kg',
          achieved_at: new Date().toISOString()
        });
      }
    });

    // Insert new records one by one
    if (newRecordsToAdd.length > 0) {
      for (const record of newRecordsToAdd) {
        if (record.profile_id && record.exercise_id && record.value !== undefined) {
          await supabase
            .from('personal_records')
            .upsert({
              profile_id: record.profile_id,
              exercise_id: record.exercise_id,
              record_type: record.record_type || 'max_weight',
              value: record.value,
              unit: record.unit || 'kg',
              achieved_at: record.achieved_at || new Date().toISOString()
            }, { 
              onConflict: 'profile_id,exercise_id,record_type'
            });
        }
      }
      
      if (newRecordsToAdd.length === 1) {
        toast.success('🏆 Novo recorde pessoal detectado!');
      } else if (newRecordsToAdd.length > 1) {
        toast.success(`🏆 ${newRecordsToAdd.length} novos recordes detectados!`);
      }
      
      fetchData(); // Refresh
    }
  };

  // Group records by exercise
  const recordsByExercise = records.reduce((acc, record) => {
    const exerciseId = record.exercise_id;
    if (!acc[exerciseId]) {
      acc[exerciseId] = {
        exercise: record.exercise,
        records: []
      };
    }
    acc[exerciseId].records.push(record);
    return acc;
  }, {} as { [key: string]: { exercise?: { name: string; muscle_group: string | null }; records: PersonalRecord[] } });

  // Get unique muscle groups
  const muscleGroups = ['all', ...new Set(records.map(r => r.exercise?.muscle_group).filter(Boolean) as string[])];

  // Filter by muscle group
  const filteredExercises = Object.entries(recordsByExercise).filter(([_, data]) => {
    if (selectedMuscle === 'all') return true;
    return data.exercise?.muscle_group === selectedMuscle;
  });

  // Stats
  const totalRecords = records.length;
  const recentRecords = records.filter(r => {
    const achievedDate = new Date(r.achieved_at);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return achievedDate >= weekAgo;
  }).length;
  const uniqueExercises = Object.keys(recordsByExercise).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        >
          <Trophy className="w-8 h-8 text-yellow-500" />
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full flex flex-col overflow-hidden"
    >
      <ClientPageHeader 
        title="RECORDES PESSOAIS" 
        icon={<Trophy className="w-5 h-5" />} 
        iconColor="text-yellow-500" 
      />

      <div className="flex-1 overflow-auto space-y-6">
      <div className="grid grid-cols-3 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-4 rounded-xl bg-gradient-to-br from-yellow-500/20 to-amber-500/20 border border-yellow-500/30 text-center"
        >
          <Crown className="w-6 h-6 text-yellow-400 mx-auto mb-1" />
          <p className="text-2xl font-bold text-yellow-400">{totalRecords}</p>
          <p className="text-xs text-muted-foreground">Recordes</p>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="p-4 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 text-center"
        >
          <Flame className="w-6 h-6 text-green-400 mx-auto mb-1" />
          <p className="text-2xl font-bold text-green-400">{recentRecords}</p>
          <p className="text-xs text-muted-foreground">Esta Semana</p>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-4 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-500/30 text-center"
        >
          <Dumbbell className="w-6 h-6 text-blue-400 mx-auto mb-1" />
          <p className="text-2xl font-bold text-blue-400">{uniqueExercises}</p>
          <p className="text-xs text-muted-foreground">Exercícios</p>
        </motion.div>
      </div>

      {/* Muscle Group Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {muscleGroups.map((muscle) => (
          <motion.button
            key={muscle}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setSelectedMuscle(muscle)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              selectedMuscle === muscle
                ? 'bg-yellow-500/30 text-yellow-400 border border-yellow-500/50'
                : 'bg-card/50 text-muted-foreground border border-border/50 hover:border-yellow-500/30'
            }`}
          >
            {muscle === 'all' ? 'Todos' : muscle}
          </motion.button>
        ))}
      </div>

      {/* Records List */}
      {filteredExercises.length === 0 ? (
        <Card className="bg-card/50 border-border/30">
          <CardContent className="p-8 text-center">
            <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">Nenhum recorde ainda</h3>
            <p className="text-sm text-muted-foreground">
              Continue treinando e seus recordes pessoais serão registrados automaticamente!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredExercises.map(([exerciseId, data], index) => {
            const muscleColor = muscleGroupColors[data.exercise?.muscle_group || ''] || 'from-gray-500/20 to-gray-600/20 border-gray-500/30 text-gray-400';
            const isExpanded = expandedExercise === exerciseId;
            
            return (
              <motion.div
                key={exerciseId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card 
                  className={`bg-gradient-to-br ${muscleColor} cursor-pointer transition-all hover:scale-[1.01]`}
                  onClick={() => setExpandedExercise(isExpanded ? null : exerciseId)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-background/30">
                          <Dumbbell className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-medium">{data.exercise?.name}</h3>
                          <p className="text-xs opacity-70">{data.exercise?.muscle_group}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          {data.records.find(r => r.record_type === 'max_weight') && (
                            <div className="flex items-center gap-1">
                              <Crown className="w-4 h-4 text-yellow-400" />
                              <span className="font-bold">
                                {data.records.find(r => r.record_type === 'max_weight')?.value}kg
                              </span>
                            </div>
                          )}
                        </div>
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </div>
                    </div>
                    
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="mt-4 pt-4 border-t border-white/10 space-y-2"
                        >
                          {data.records.map(record => {
                            const typeInfo = getRecordTypeInfo(record.record_type);
                            return (
                              <div 
                                key={record.id}
                                className="flex items-center justify-between p-2 rounded-lg bg-background/20"
                              >
                                <div className="flex items-center gap-2">
                                  <span className={typeInfo.color}>{typeInfo.icon}</span>
                                  <span className="text-sm">{typeInfo.label}</span>
                                </div>
                                <div className="text-right">
                                  <span className="font-bold">{record.value} {record.unit}</span>
                                  <p className="text-xs opacity-70">
                                    {formatDistanceToNow(new Date(record.achieved_at), { 
                                      addSuffix: true, 
                                      locale: ptBR 
                                    })}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
      </div>
    </motion.div>
  );
};

export default PersonalRecords;
