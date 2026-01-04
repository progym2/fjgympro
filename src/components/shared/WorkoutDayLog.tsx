import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Calendar, CheckCircle, Clock, Dumbbell, 
  ChevronDown, ChevronUp, Timer, Flame
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, parseISO, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface WorkoutLog {
  id: string;
  workout_date: string;
  started_at: string | null;
  completed_at: string | null;
  workout_plan_id: string | null;
  workout_plan?: {
    name: string;
  };
}

interface ExerciseLog {
  id: string;
  workout_log_id: string;
  sets_completed: number;
  reps_completed: number | null;
  weight_used_kg: number | null;
  workout_plan_exercise?: {
    exercise?: {
      name: string;
      muscle_group: string | null;
    };
  };
}

interface WorkoutDayLogProps {
  profileId: string;
  maxItems?: number;
  showTitle?: boolean;
  compact?: boolean;
}

const muscleColors: Record<string, string> = {
  'Peito': 'bg-red-500/20 text-red-400',
  'Costas': 'bg-blue-500/20 text-blue-400',
  'Ombros': 'bg-orange-500/20 text-orange-400',
  'Bíceps': 'bg-purple-500/20 text-purple-400',
  'Tríceps': 'bg-pink-500/20 text-pink-400',
  'Pernas': 'bg-green-500/20 text-green-400',
  'Abdômen': 'bg-yellow-500/20 text-yellow-400',
  'Glúteos': 'bg-rose-500/20 text-rose-400',
  'Cardio': 'bg-cyan-500/20 text-cyan-400',
};

const WorkoutDayLog: React.FC<WorkoutDayLogProps> = ({ 
  profileId, 
  maxItems = 20, 
  showTitle = true,
  compact = false 
}) => {
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [exerciseLogs, setExerciseLogs] = useState<Record<string, ExerciseLog[]>>({});
  const [loading, setLoading] = useState(true);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  useEffect(() => {
    if (profileId) {
      fetchLogs();
    }
  }, [profileId]);

  const fetchLogs = async () => {
    try {
      const { data: logsData, error } = await supabase
        .from('workout_logs')
        .select(`
          *,
          workout_plan:workout_plans (name)
        `)
        .eq('profile_id', profileId)
        .not('completed_at', 'is', null)
        .order('workout_date', { ascending: false })
        .limit(maxItems);

      if (error) throw error;
      setLogs(logsData || []);

      // Fetch exercise logs for all workout logs
      if (logsData && logsData.length > 0) {
        const logIds = logsData.map(l => l.id);
        const { data: exerciseData } = await supabase
          .from('workout_exercise_logs')
          .select(`
            *,
            workout_plan_exercise:workout_plan_exercises (
              exercise:exercises (name, muscle_group)
            )
          `)
          .in('workout_log_id', logIds);

        if (exerciseData) {
          const grouped: Record<string, ExerciseLog[]> = {};
          exerciseData.forEach((ex: any) => {
            if (!grouped[ex.workout_log_id]) {
              grouped[ex.workout_log_id] = [];
            }
            grouped[ex.workout_log_id].push(ex);
          });
          setExerciseLogs(grouped);
        }
      }
    } catch (error) {
      console.error('Error fetching workout logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDuration = (startedAt: string | null, completedAt: string | null) => {
    if (!startedAt || !completedAt) return null;
    const mins = differenceInMinutes(new Date(completedAt), new Date(startedAt));
    if (mins < 60) return `${mins}min`;
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hours}h${remainingMins > 0 ? ` ${remainingMins}min` : ''}`;
  };

  const getVolume = (logId: string) => {
    const exercises = exerciseLogs[logId] || [];
    return exercises.reduce((acc, ex) => {
      return acc + ((ex.sets_completed || 0) * (ex.reps_completed || 0) * (ex.weight_used_kg || 0));
    }, 0);
  };

  const getMuscleGroups = (logId: string) => {
    const exercises = exerciseLogs[logId] || [];
    const groups = new Set<string>();
    exercises.forEach(ex => {
      if (ex.workout_plan_exercise?.exercise?.muscle_group) {
        groups.add(ex.workout_plan_exercise.exercise.muscle_group);
      }
    });
    return Array.from(groups);
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 bg-muted/30 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-8">
        <Dumbbell className="w-12 h-12 mx-auto text-muted-foreground/30 mb-2" />
        <p className="text-sm text-muted-foreground">Nenhum treino registrado ainda</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {showTitle && (
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-emerald-500" />
          <h3 className="font-bebas text-base text-emerald-500">LOG DE TREINOS</h3>
          <Badge variant="secondary" className="ml-auto text-xs">{logs.length}</Badge>
        </div>
      )}

      <ScrollArea className={compact ? "max-h-[300px]" : "max-h-[500px]"}>
        <div className="space-y-2 pr-2">
          {logs.map((log, index) => {
            const isExpanded = expandedLog === log.id;
            const duration = getDuration(log.started_at, log.completed_at);
            const volume = getVolume(log.id);
            const muscleGroups = getMuscleGroups(log.id);
            const exerciseCount = exerciseLogs[log.id]?.length || 0;

            return (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="bg-card/80 border border-border/50 rounded-lg overflow-hidden"
              >
                <button
                  onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                  className="w-full p-3 flex items-center gap-3 hover:bg-accent/50 transition-colors"
                >
                  {/* Date Badge */}
                  <div className="flex-shrink-0 w-14 h-14 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex flex-col items-center justify-center">
                    <span className="text-lg font-bold text-emerald-500">
                      {format(parseISO(log.workout_date), 'dd')}
                    </span>
                    <span className="text-[10px] text-muted-foreground uppercase">
                      {format(parseISO(log.workout_date), 'MMM', { locale: ptBR })}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm truncate">
                        {log.workout_plan?.name || 'Treino'}
                      </p>
                      <Badge className="bg-emerald-500/20 text-emerald-500 text-[10px]">
                        <CheckCircle size={10} className="mr-1" />
                        Concluído
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      {duration && (
                        <span className="flex items-center gap-1">
                          <Timer size={12} />
                          {duration}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Dumbbell size={12} />
                        {exerciseCount} exercícios
                      </span>
                      {volume > 0 && (
                        <span className="flex items-center gap-1">
                          <Flame size={12} />
                          {Math.round(volume / 1000)}k kg
                        </span>
                      )}
                    </div>

                    {/* Muscle Groups */}
                    {muscleGroups.length > 0 && !compact && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {muscleGroups.slice(0, 4).map(muscle => (
                          <Badge 
                            key={muscle}
                            className={`text-[10px] ${muscleColors[muscle] || 'bg-muted'}`}
                          >
                            {muscle}
                          </Badge>
                        ))}
                        {muscleGroups.length > 4 && (
                          <Badge variant="outline" className="text-[10px]">
                            +{muscleGroups.length - 4}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Expand Button */}
                  <div className="flex-shrink-0">
                    {isExpanded ? (
                      <ChevronUp size={18} className="text-muted-foreground" />
                    ) : (
                      <ChevronDown size={18} className="text-muted-foreground" />
                    )}
                  </div>
                </button>

                {/* Expanded Content */}
                {isExpanded && exerciseLogs[log.id] && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-border/50 p-3 bg-background/50"
                  >
                    <div className="space-y-2">
                      {exerciseLogs[log.id].map((ex, i) => (
                        <div 
                          key={ex.id}
                          className="flex items-center justify-between p-2 bg-muted/30 rounded-lg"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">
                              {i + 1}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">
                                {ex.workout_plan_exercise?.exercise?.name || 'Exercício'}
                              </p>
                              {ex.workout_plan_exercise?.exercise?.muscle_group && (
                                <p className="text-[10px] text-muted-foreground">
                                  {ex.workout_plan_exercise.exercise.muscle_group}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{ex.sets_completed}x{ex.reps_completed || '-'}</span>
                            {ex.weight_used_kg && (
                              <Badge variant="outline" className="text-[10px]">
                                {ex.weight_used_kg}kg
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Workout Time */}
                    {log.started_at && log.completed_at && (
                      <div className="mt-3 pt-3 border-t border-border/30 flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          Iniciado: {format(new Date(log.started_at), 'HH:mm')}
                        </span>
                        <span>
                          Finalizado: {format(new Date(log.completed_at), 'HH:mm')}
                        </span>
                      </div>
                    )}
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};

export default WorkoutDayLog;
