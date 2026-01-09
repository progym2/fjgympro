import React, { useState, useEffect, memo } from 'react';
import { motion } from 'framer-motion';
import { 
  Dumbbell, Droplets, Target, TrendingUp, 
  Flame, ChevronRight, Award, Zap, Activity
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useThemeStyles } from '@/lib/themeStyles';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

interface WidgetData {
  workouts: {
    thisWeek: number;
    streak: number;
    totalMinutes: number;
  };
  hydration: {
    today: number;
    goal: number;
  };
  goals: {
    active: number;
    completed: number;
  };
  weight: {
    current: number | null;
    change: number | null;
  };
}

const DashboardWidgets: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const themeStyles = useThemeStyles();
  const [data, setData] = useState<WidgetData>({
    workouts: { thisWeek: 0, streak: 0, totalMinutes: 0 },
    hydration: { today: 0, goal: 2000 },
    goals: { active: 0, completed: 0 },
    weight: { current: null, change: null }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.profile_id) return;
    
    const fetchData = async () => {
      try {
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayISO = today.toISOString();

        // Fetch all data in parallel
        const [workoutsRes, hydrationRes, hydrationSettingsRes, goalsRes, weightRes] = await Promise.all([
          // Workouts this week
          supabase
            .from('workout_logs')
            .select('id, workout_date, started_at, completed_at')
            .eq('profile_id', profile.profile_id)
            .gte('workout_date', startOfWeek.toISOString().split('T')[0]),
          
          // Today's hydration
          supabase
            .from('hydration_records')
            .select('amount_ml')
            .eq('profile_id', profile.profile_id)
            .gte('recorded_at', todayISO),
          
          // Hydration settings
          supabase
            .from('hydration_settings')
            .select('daily_goal_ml')
            .eq('profile_id', profile.profile_id)
            .maybeSingle(),
          
          // Weekly goals
          supabase
            .from('weekly_goals')
            .select('id, is_completed')
            .eq('profile_id', profile.profile_id)
            .gte('week_start', startOfWeek.toISOString().split('T')[0]),
          
          // Recent weight records
          supabase
            .from('weight_records')
            .select('weight_kg, recorded_at')
            .eq('profile_id', profile.profile_id)
            .order('recorded_at', { ascending: false })
            .limit(2)
        ]);

        // Calculate workout stats
        const workouts = workoutsRes.data || [];
        let totalMinutes = 0;
        workouts.forEach(w => {
          if (w.started_at && w.completed_at) {
            const start = new Date(w.started_at);
            const end = new Date(w.completed_at);
            totalMinutes += Math.round((end.getTime() - start.getTime()) / 60000);
          }
        });

        // Calculate streak (simplified)
        let streak = 0;
        if (workouts.length > 0) {
          const sortedDates = [...new Set(workouts.map(w => w.workout_date))].sort().reverse();
          const checkDate = new Date();
          for (const dateStr of sortedDates) {
            const workoutDate = new Date(dateStr);
            const diff = Math.floor((checkDate.getTime() - workoutDate.getTime()) / (1000 * 60 * 60 * 24));
            if (diff <= 1) {
              streak++;
              checkDate.setDate(checkDate.getDate() - 1);
            } else {
              break;
            }
          }
        }

        // Hydration
        const hydrationTotal = (hydrationRes.data || []).reduce((sum, r) => sum + r.amount_ml, 0);
        const hydrationGoal = hydrationSettingsRes.data?.daily_goal_ml || 2000;

        // Goals
        const goals = goalsRes.data || [];
        const completedGoals = goals.filter(g => g.is_completed).length;

        // Weight
        const weights = weightRes.data || [];
        const currentWeight = weights[0]?.weight_kg || null;
        const previousWeight = weights[1]?.weight_kg || null;
        const weightChange = currentWeight && previousWeight ? currentWeight - previousWeight : null;

        setData({
          workouts: {
            thisWeek: workouts.length,
            streak,
            totalMinutes
          },
          hydration: {
            today: hydrationTotal,
            goal: hydrationGoal
          },
          goals: {
            active: goals.length,
            completed: completedGoals
          },
          weight: {
            current: currentWeight,
            change: weightChange
          }
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [profile?.profile_id]);

  const hydrationPercent = Math.min(100, (data.hydration.today / data.hydration.goal) * 100);
  const goalsPercent = data.goals.active > 0 
    ? Math.round((data.goals.completed / data.goals.active) * 100) 
    : 0;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        {[...Array(4)].map((_, i) => (
          <div 
            key={i}
            className={cn(
              "h-24 rounded-xl animate-pulse",
              themeStyles.cardBg,
              "border",
              themeStyles.cardBorder
            )}
          />
        ))}
      </div>
    );
  }

  return (
    <motion.div 
      className="grid grid-cols-2 gap-2 sm:gap-3"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Workout Widget */}
      <motion.div
        variants={itemVariants}
        onClick={() => navigate('/client/workouts')}
        className={cn(
          "relative p-3 rounded-xl cursor-pointer transition-all duration-300",
          themeStyles.cardBg,
          "backdrop-blur-sm border",
          themeStyles.cardBorder,
          themeStyles.cardHoverBorder,
          "hover:scale-[1.02] active:scale-[0.98]"
        )}
        style={{
          boxShadow: `0 4px 20px ${themeStyles.glowColor}`
        }}
      >
        <div className="flex items-start justify-between mb-2">
          <div className={cn(
            "p-1.5 rounded-lg",
            themeStyles.iconBg
          )}>
            <Dumbbell size={16} className={themeStyles.iconColor} />
          </div>
          <ChevronRight size={14} className="text-muted-foreground" />
        </div>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Treinos</p>
        <div className="flex items-baseline gap-1.5">
          <span className={cn("text-2xl font-bold", themeStyles.titleColor)}>
            {data.workouts.thisWeek}
          </span>
          <span className="text-[10px] text-muted-foreground">esta semana</span>
        </div>
        <div className="flex items-center gap-2 mt-1.5">
          {data.workouts.streak > 0 && (
            <div className="flex items-center gap-0.5">
              <Flame size={10} className="text-orange-400" />
              <span className="text-[9px] text-orange-400">{data.workouts.streak}d</span>
            </div>
          )}
          {data.workouts.totalMinutes > 0 && (
            <div className="flex items-center gap-0.5">
              <Activity size={10} className="text-emerald-400" />
              <span className="text-[9px] text-emerald-400">{data.workouts.totalMinutes}min</span>
            </div>
          )}
        </div>
      </motion.div>

      {/* Hydration Widget */}
      <motion.div
        variants={itemVariants}
        onClick={() => navigate('/client/hydration')}
        className={cn(
          "relative p-3 rounded-xl cursor-pointer transition-all duration-300",
          themeStyles.cardBg,
          "backdrop-blur-sm border",
          themeStyles.cardBorder,
          themeStyles.cardHoverBorder,
          "hover:scale-[1.02] active:scale-[0.98]"
        )}
        style={{
          boxShadow: `0 4px 20px ${themeStyles.glowColor}`
        }}
      >
        <div className="flex items-start justify-between mb-2">
          <div className={cn(
            "p-1.5 rounded-lg",
            "bg-cyan-500/20"
          )}>
            <Droplets size={16} className="text-cyan-400" />
          </div>
          <ChevronRight size={14} className="text-muted-foreground" />
        </div>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Hidratação</p>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold text-cyan-400">
            {(data.hydration.today / 1000).toFixed(1)}L
          </span>
          <span className="text-[10px] text-muted-foreground">/ {(data.hydration.goal / 1000).toFixed(1)}L</span>
        </div>
        <div className="mt-1.5">
          <Progress 
            value={hydrationPercent} 
            className="h-1.5 bg-cyan-500/10"
          />
        </div>
      </motion.div>

      {/* Goals Widget */}
      <motion.div
        variants={itemVariants}
        onClick={() => navigate('/client/achievements')}
        className={cn(
          "relative p-3 rounded-xl cursor-pointer transition-all duration-300",
          themeStyles.cardBg,
          "backdrop-blur-sm border",
          themeStyles.cardBorder,
          themeStyles.cardHoverBorder,
          "hover:scale-[1.02] active:scale-[0.98]"
        )}
        style={{
          boxShadow: `0 4px 20px ${themeStyles.glowColor}`
        }}
      >
        <div className="flex items-start justify-between mb-2">
          <div className={cn(
            "p-1.5 rounded-lg",
            "bg-amber-500/20"
          )}>
            <Target size={16} className="text-amber-400" />
          </div>
          <ChevronRight size={14} className="text-muted-foreground" />
        </div>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Metas Semanais</p>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold text-amber-400">
            {data.goals.completed}/{data.goals.active}
          </span>
          <span className="text-[10px] text-muted-foreground">concluídas</span>
        </div>
        <div className="mt-1.5">
          <Progress 
            value={goalsPercent} 
            className="h-1.5 bg-amber-500/10"
          />
        </div>
      </motion.div>

      {/* Weight/Progress Widget */}
      <motion.div
        variants={itemVariants}
        onClick={() => navigate('/client/weight')}
        className={cn(
          "relative p-3 rounded-xl cursor-pointer transition-all duration-300",
          themeStyles.cardBg,
          "backdrop-blur-sm border",
          themeStyles.cardBorder,
          themeStyles.cardHoverBorder,
          "hover:scale-[1.02] active:scale-[0.98]"
        )}
        style={{
          boxShadow: `0 4px 20px ${themeStyles.glowColor}`
        }}
      >
        <div className="flex items-start justify-between mb-2">
          <div className={cn(
            "p-1.5 rounded-lg",
            "bg-emerald-500/20"
          )}>
            <TrendingUp size={16} className="text-emerald-400" />
          </div>
          <ChevronRight size={14} className="text-muted-foreground" />
        </div>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Peso</p>
        {data.weight.current ? (
          <>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-emerald-400">
                {data.weight.current.toFixed(1)}
              </span>
              <span className="text-[10px] text-muted-foreground">kg</span>
            </div>
            {data.weight.change !== null && (
              <div className={cn(
                "flex items-center gap-0.5 mt-1",
                data.weight.change > 0 ? "text-rose-400" : data.weight.change < 0 ? "text-green-400" : "text-muted-foreground"
              )}>
                <Zap size={10} />
                <span className="text-[9px]">
                  {data.weight.change > 0 ? '+' : ''}{data.weight.change.toFixed(1)}kg
                </span>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center gap-1 mt-1">
            <span className="text-sm text-muted-foreground">Registre seu peso</span>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default memo(DashboardWidgets);
