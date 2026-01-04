import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, Calendar, Clock, Flame, 
  ChevronDown, ChevronUp, Trophy, Target,
  BarChart3
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfWeek, endOfWeek, subWeeks, differenceInMinutes, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface WorkoutLog {
  id: string;
  workout_plan_id: string;
  workout_date: string;
  started_at: string | null;
  completed_at: string | null;
  workout_plan?: {
    name: string;
  };
}

interface WeeklyStats {
  totalWorkouts: number;
  totalMinutes: number;
  streak: number;
  workoutsThisWeek: WorkoutLog[];
  workoutsByDay: number[]; // Index 0 = Monday, 6 = Sunday
}

const WorkoutWeeklyStats: React.FC = () => {
  const { profile } = useAuth();
  const [stats, setStats] = useState<WeeklyStats>({
    totalWorkouts: 0,
    totalMinutes: 0,
    streak: 0,
    workoutsThisWeek: [],
    workoutsByDay: [0, 0, 0, 0, 0, 0, 0]
  });
  const [recentWorkouts, setRecentWorkouts] = useState<WorkoutLog[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.profile_id) {
      fetchStats();
    }
  }, [profile?.profile_id]);

  const fetchStats = async () => {
    if (!profile?.profile_id) return;

    try {
      const now = new Date();
      const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
      const twoWeeksAgo = subWeeks(now, 2);

      // Fetch this week's completed workouts
      const { data: weekWorkouts } = await supabase
        .from('workout_logs')
        .select('*, workout_plan:workout_plans(name)')
        .eq('profile_id', profile.profile_id)
        .not('completed_at', 'is', null)
        .gte('workout_date', format(weekStart, 'yyyy-MM-dd'))
        .lte('workout_date', format(weekEnd, 'yyyy-MM-dd'))
        .order('completed_at', { ascending: false });

      // Fetch recent workouts (last 2 weeks) for history
      const { data: recentData } = await supabase
        .from('workout_logs')
        .select('*, workout_plan:workout_plans(name)')
        .eq('profile_id', profile.profile_id)
        .not('completed_at', 'is', null)
        .gte('workout_date', format(twoWeeksAgo, 'yyyy-MM-dd'))
        .order('completed_at', { ascending: false })
        .limit(10);

      // Calculate stats
      const workouts = (weekWorkouts || []) as WorkoutLog[];
      let totalMinutes = 0;
      const workoutsByDay = [0, 0, 0, 0, 0, 0, 0]; // Mon to Sun
      
      workouts.forEach(w => {
        if (w.started_at && w.completed_at) {
          totalMinutes += differenceInMinutes(
            new Date(w.completed_at),
            new Date(w.started_at)
          );
        }
        // Count workouts by day of week (0 = Monday, 6 = Sunday)
        const dayOfWeek = new Date(w.workout_date).getDay();
        // Convert Sunday (0) to 6, and shift others down by 1
        const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        workoutsByDay[adjustedDay]++;
      });

      // Calculate streak (consecutive days with workouts)
      const streak = await calculateStreak();

      setStats({
        totalWorkouts: workouts.length,
        totalMinutes,
        streak,
        workoutsThisWeek: workouts,
        workoutsByDay
      });

      setRecentWorkouts((recentData || []) as WorkoutLog[]);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStreak = async (): Promise<number> => {
    if (!profile?.profile_id) return 0;

    const { data } = await supabase
      .from('workout_logs')
      .select('workout_date')
      .eq('profile_id', profile.profile_id)
      .not('completed_at', 'is', null)
      .order('workout_date', { ascending: false })
      .limit(30);

    if (!data || data.length === 0) return 0;

    const dates = [...new Set(data.map(d => d.workout_date))];
    let streak = 0;
    const today = format(new Date(), 'yyyy-MM-dd');
    
    // Check if worked out today or yesterday
    if (dates[0] !== today) {
      const yesterday = format(subWeeks(new Date(), 0), 'yyyy-MM-dd');
      if (dates[0] !== yesterday) return 0;
    }

    for (let i = 0; i < dates.length; i++) {
      const expectedDate = format(
        new Date(new Date().setDate(new Date().getDate() - i)),
        'yyyy-MM-dd'
      );
      if (dates.includes(expectedDate)) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  };

  const getDuration = (log: WorkoutLog): string => {
    if (!log.started_at || !log.completed_at) return '-';
    const mins = differenceInMinutes(
      new Date(log.completed_at),
      new Date(log.started_at)
    );
    if (mins >= 60) {
      return `${Math.floor(mins / 60)}h ${mins % 60}min`;
    }
    return `${mins}min`;
  };

  // Weekly goal (e.g., 5 workouts per week)
  const weeklyGoal = 5;
  const goalProgress = Math.min((stats.totalWorkouts / weeklyGoal) * 100, 100);

  if (loading) {
    return (
      <div className="bg-card/60 backdrop-blur-md rounded-xl p-3 border border-border/50 animate-pulse">
        <div className="h-16 bg-muted/30 rounded" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card/60 backdrop-blur-md rounded-xl border border-border/50 overflow-hidden"
    >
      {/* Stats Header - Always visible */}
      <div 
        className="p-3 cursor-pointer hover:bg-muted/20 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <TrendingUp size={14} className="text-primary" />
            <span className="text-xs font-medium text-muted-foreground">Esta Semana</span>
          </div>
          <div className="flex items-center gap-1">
            {stats.streak > 0 && (
              <Badge className="bg-orange-500/20 text-orange-400 text-[10px] px-1.5">
                <Flame size={10} className="mr-0.5" />
                {stats.streak}d
              </Badge>
            )}
            {expanded ? (
              <ChevronUp size={14} className="text-muted-foreground" />
            ) : (
              <ChevronDown size={14} className="text-muted-foreground" />
            )}
          </div>
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-1.5 rounded-lg bg-primary/10">
            <div className="text-lg font-bold text-primary">{stats.totalWorkouts}</div>
            <div className="text-[9px] text-muted-foreground">Treinos</div>
          </div>
          <div className="text-center p-1.5 rounded-lg bg-green-500/10">
            <div className="text-lg font-bold text-green-400">
              {stats.totalMinutes >= 60 
                ? `${Math.floor(stats.totalMinutes / 60)}h` 
                : `${stats.totalMinutes}m`
              }
            </div>
            <div className="text-[9px] text-muted-foreground">Tempo</div>
          </div>
          <div className="text-center p-1.5 rounded-lg bg-amber-500/10">
            <div className="text-lg font-bold text-amber-400">{Math.round(goalProgress)}%</div>
            <div className="text-[9px] text-muted-foreground">Meta</div>
          </div>
        </div>

        {/* Goal Progress */}
        <div className="mt-2">
          <Progress value={goalProgress} className="h-1.5" />
          <p className="text-[9px] text-muted-foreground mt-1 text-center">
            {stats.totalWorkouts}/{weeklyGoal} treinos na meta semanal
          </p>
        </div>
      </div>

      {/* Expanded Section - History */}
      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="border-t border-border/50"
        >
          <div className="p-3 space-y-3">
            {/* Weekly Chart */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <BarChart3 size={12} className="text-primary" />
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                  Evolução Semanal
                </span>
              </div>
              
              {/* Bar Chart */}
              <div className="flex items-end justify-between gap-1 h-16 px-1">
                {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((day, index) => {
                  const count = stats.workoutsByDay[index];
                  const maxCount = Math.max(...stats.workoutsByDay, 1);
                  const height = (count / maxCount) * 100;
                  const isToday = new Date().getDay() === (index === 6 ? 0 : index + 1);
                  
                  return (
                    <div key={day} className="flex flex-col items-center gap-1 flex-1">
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${Math.max(height, 8)}%` }}
                        transition={{ delay: index * 0.05, duration: 0.3 }}
                        className={`w-full max-w-6 rounded-t-sm ${
                          count > 0 
                            ? 'bg-gradient-to-t from-primary to-primary/70' 
                            : 'bg-muted/40'
                        } ${isToday ? 'ring-1 ring-primary/50' : ''}`}
                        title={`${count} treino${count !== 1 ? 's' : ''}`}
                      />
                      <span className={`text-[8px] ${isToday ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                        {day}
                      </span>
                      {count > 0 && (
                        <span className="text-[8px] text-primary font-bold -mt-0.5">{count}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* History Section */}
            <div className="border-t border-border/30 pt-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Calendar size={12} className="text-muted-foreground" />
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                  Histórico Recente
                </span>
              </div>

              {recentWorkouts.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">
                  Nenhum treino recente
                </p>
              ) : (
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {recentWorkouts.slice(0, 5).map((log, index) => (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between p-1.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                          <Trophy size={8} className="text-green-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-medium truncate">
                            {log.workout_plan?.name || 'Treino'}
                          </p>
                          <p className="text-[9px] text-muted-foreground">
                            {format(new Date(log.completed_at!), "EEE, dd/MM", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-[9px] text-green-400 flex-shrink-0">
                        <Clock size={8} />
                        {getDuration(log)}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Week Summary */}
            {stats.workoutsThisWeek.length > 0 && (
              <div className="pt-2 border-t border-border/30">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-muted-foreground">Média por treino</span>
                  <span className="text-primary font-medium">
                    {stats.totalWorkouts > 0 
                      ? `${Math.round(stats.totalMinutes / stats.totalWorkouts)}min`
                      : '-'
                    }
                  </span>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default WorkoutWeeklyStats;
