import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Dumbbell, Play, CheckCircle, ChevronRight, 
  Trash2, Plus, Calendar, Lock, 
  Clock, Target, Flame, Timer, Settings2, Eye
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { SkeletonCard } from '@/components/ui/skeleton-loader';
import PushNotificationSetup from './PushNotificationSetup';
import ActiveWorkoutSession from './ActiveWorkoutSession';
import WorkoutScheduleEditor from './WorkoutScheduleEditor';
import WorkoutDetailsModal from './WorkoutDetailsModal';
import HydrationWidget from './HydrationWidget';
import WorkoutWeeklyStats from './WorkoutWeeklyStats';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Exercise {
  id: string;
  name: string;
  description: string | null;
  muscle_group: string | null;
  equipment: string | null;
  video_url: string | null;
}

interface WorkoutExercise {
  id: string;
  exercise_id: string;
  sets: number;
  reps: number;
  weight_kg: number | null;
  rest_seconds: number;
  day_of_week: number | null;
  exercise: Exercise;
}

interface WorkoutPlan {
  id: string;
  name: string;
  description: string | null;
  is_instructor_plan: boolean;
  created_by: string;
  weekdays: number[] | null;
  scheduled_date: string | null;
  scheduled_time: string | null;
}

interface WorkoutLog {
  id: string;
  workout_plan_id: string;
  workout_date: string;
  completed_at: string | null;
  started_at: string | null;
}

interface ExerciseLog {
  id: string;
  workout_log_id: string;
  workout_plan_exercise_id: string;
  completed_at: string;
}

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const DAYS_FULL = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

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

const SimpleWorkouts: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { sendWorkoutAvailableNotification } = usePushNotifications();
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [exercises, setExercises] = useState<Record<string, WorkoutExercise[]>>({});
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [exerciseLogs, setExerciseLogs] = useState<ExerciseLog[]>([]);
  
  // UI State
  const [selectedDay, setSelectedDay] = useState(new Date().getDay());
  const [activeWorkout, setActiveWorkout] = useState<{ planId: string; logId: string; startedAt?: Date } | null>(null);
  const [showActiveSession, setShowActiveSession] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [notificationSent, setNotificationSent] = useState(false);
  const [bannerMinimized, setBannerMinimized] = useState(false);
  const [scheduleEditorPlan, setScheduleEditorPlan] = useState<WorkoutPlan | null>(null);
  const [detailsModalPlan, setDetailsModalPlan] = useState<WorkoutPlan | null>(null);
  const today = new Date();
  const todayDayOfWeek = today.getDay();

  // Auto-minimize banner after 30 seconds
  useEffect(() => {
    if (selectedDay !== todayDayOfWeek) {
      setBannerMinimized(false);
      const timer = setTimeout(() => {
        setBannerMinimized(true);
      }, 30000);
      return () => clearTimeout(timer);
    }
  }, [selectedDay, todayDayOfWeek]);

  useEffect(() => {
    if (profile?.profile_id) {
      fetchData();
    }
  }, [profile?.profile_id]);

  const fetchData = async () => {
    if (!profile?.profile_id) return;
    
    try {
      // Fetch workout plans with scheduling info
      const { data: plansData } = await supabase
        .from('workout_plans')
        .select('id, name, description, is_instructor_plan, created_by, weekdays, scheduled_date, scheduled_time')
        .or(`created_by.eq.${profile.profile_id},assigned_to.eq.${profile.profile_id}`)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      setPlans((plansData as WorkoutPlan[]) || []);

      // Fetch exercises for all plans
      const planIds = (plansData || []).map(p => p.id);
      if (planIds.length > 0) {
        const { data: exercisesData } = await supabase
          .from('workout_plan_exercises')
          .select(`*, exercise:exercises (*)`)
          .in('workout_plan_id', planIds)
          .order('order_index');

        const grouped: Record<string, WorkoutExercise[]> = {};
        (exercisesData || []).forEach((ex: any) => {
          if (!grouped[ex.workout_plan_id]) grouped[ex.workout_plan_id] = [];
          grouped[ex.workout_plan_id].push(ex);
        });
        setExercises(grouped);
      }

      // Fetch today's logs
      const todayStr = format(today, 'yyyy-MM-dd');
      const { data: logsData } = await supabase
        .from('workout_logs')
        .select('*')
        .eq('profile_id', profile.profile_id)
        .eq('workout_date', todayStr);

      setLogs(logsData || []);

      if (logsData && logsData.length > 0) {
        const logIds = logsData.map(l => l.id);
        const { data: exerciseLogsData } = await supabase
          .from('workout_exercise_logs')
          .select('*')
          .in('workout_log_id', logIds);
        
        setExerciseLogs((exerciseLogsData || []) as ExerciseLog[]);
        
        // Check if there's an active (non-completed) workout
        const activeLog = logsData.find(l => l.started_at && !l.completed_at);
        if (activeLog) {
          setActiveWorkout({
            planId: activeLog.workout_plan_id,
            logId: activeLog.id,
            startedAt: new Date(activeLog.started_at!)
          });
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get exercises for selected day
  const getDayExercises = (planId: string) => {
    const planExercises = exercises[planId] || [];
    const hasSpecificDays = planExercises.some(e => e.day_of_week !== null);
    
    if (!hasSpecificDays) return planExercises;
    return planExercises.filter(e => e.day_of_week === selectedDay);
  };

  // Check if instructor plan is available for a specific day
  const isPlanAvailableForDay = (plan: WorkoutPlan, dayOfWeek: number) => {
    // If plan has scheduled_date, only available on that specific date
    if (plan.scheduled_date) {
      const scheduledDate = new Date(plan.scheduled_date);
      const todayDate = new Date();
      todayDate.setHours(0, 0, 0, 0);
      scheduledDate.setHours(0, 0, 0, 0);
      
      // If checking today
      if (dayOfWeek === todayDayOfWeek) {
        return scheduledDate.getTime() === todayDate.getTime();
      }
      // For other days in the week selector, check if the date falls on that day
      return scheduledDate.getDay() === dayOfWeek;
    }
    
    // If plan has weekdays restriction, check if dayOfWeek is in the array
    if (plan.weekdays && plan.weekdays.length > 0) {
      return plan.weekdays.includes(dayOfWeek);
    }
    
    // Otherwise check exercise-level day_of_week
    const planExercises = exercises[plan.id] || [];
    const hasSpecificDays = planExercises.some(e => e.day_of_week !== null);
    if (!hasSpecificDays) return true;
    return planExercises.some(e => e.day_of_week === dayOfWeek);
  };

  // Check if plan is locked (instructor plan only available on specific dates)
  const isPlanLocked = (plan: WorkoutPlan) => {
    if (!plan.is_instructor_plan) return false;
    return !isPlanAvailableForDay(plan, todayDayOfWeek);
  };

  // Get plans available for selected day
  const availablePlans = useMemo(() => {
    return plans.filter(plan => isPlanAvailableForDay(plan, selectedDay));
  }, [plans, exercises, selectedDay]);

  // Send notification for today's available workout
  useEffect(() => {
    if (!notificationSent && !loading && availablePlans.length > 0 && selectedDay === todayDayOfWeek) {
      const todayPlans = availablePlans.filter(plan => {
        const planExercises = exercises[plan.id] || [];
        const hasSpecificDays = planExercises.some(e => e.day_of_week !== null);
        if (!hasSpecificDays) return true;
        return planExercises.some(e => e.day_of_week === todayDayOfWeek);
      });
      
      if (todayPlans.length > 0 && !isPlanCompletedToday(todayPlans[0].id)) {
        sendWorkoutAvailableNotification(todayPlans[0].name);
        setNotificationSent(true);
      }
    }
  }, [loading, availablePlans, selectedDay, notificationSent, exercises, sendWorkoutAvailableNotification]);

  // Check if exercise is completed today
  const isExerciseCompleted = (exerciseId: string) => {
    return exerciseLogs.some(log => log.workout_plan_exercise_id === exerciseId);
  };

  // Check if plan has any completed exercises (blocks editing)
  const hasCompletedExercises = (planId: string) => {
    const planExercises = exercises[planId] || [];
    return planExercises.some(ex => isExerciseCompleted(ex.id));
  };

  // Check if plan is completed today
  const isPlanCompletedToday = (planId: string) => {
    return logs.some(l => l.workout_plan_id === planId && l.completed_at);
  };

  // Get completed exercise IDs for a plan
  const getCompletedExerciseIds = (planId: string) => {
    const dayExercises = getDayExercises(planId);
    return dayExercises
      .filter(e => isExerciseCompleted(e.id))
      .map(e => e.id);
  };

  // Start workout - creates log and opens session
  // ONLY allow workouts for TODAY - block all past and future days
  // For instructor plans, also check if available for today
  const startWorkout = async (planId: string) => {
    if (!profile?.profile_id) return;

    const plan = plans.find(p => p.id === planId);
    
    // Check if instructor plan is locked
    if (plan?.is_instructor_plan && isPlanLocked(plan)) {
      if (plan.scheduled_date) {
        toast.error(`🔒 Este treino só pode ser executado em ${format(new Date(plan.scheduled_date), "dd/MM/yyyy", { locale: ptBR })}.`);
      } else if (plan.weekdays && plan.weekdays.length > 0) {
        const availableDays = plan.weekdays.map(d => DAYS[d]).join(', ');
        toast.error(`🔒 Este treino só pode ser executado em: ${availableDays}.`);
      } else {
        toast.error('🔒 Treino bloqueado! Não disponível para hoje.');
      }
      return;
    }

    // STRICT CHECK: Only allow today's workouts - no past days allowed
    if (selectedDay !== todayDayOfWeek) {
      if (selectedDay > todayDayOfWeek) {
        toast.error(`🔒 Treino bloqueado! Este treino só será liberado na ${DAYS_FULL[selectedDay]}.`);
      } else {
        toast.error('🔒 Não é possível iniciar treinos de dias anteriores.');
      }
      return;
    }

    const todayStr = format(today, 'yyyy-MM-dd');
    const existingLog = logs.find(l => l.workout_plan_id === planId);

    if (existingLog?.completed_at) {
      toast.info('Este treino já foi concluído hoje!');
      return;
    }

    try {
      let logId = existingLog?.id;
      let startedAt = existingLog?.started_at ? new Date(existingLog.started_at) : new Date();

      if (!existingLog) {
        const { data: newLog } = await supabase
          .from('workout_logs')
          .insert({
            profile_id: profile.profile_id,
            workout_plan_id: planId,
            workout_date: todayStr,
            started_at: new Date().toISOString()
          })
          .select()
          .single();

        if (newLog) {
          logId = newLog.id;
          startedAt = new Date(newLog.started_at!);
          setLogs(prev => [...prev, newLog]);
        }
      } else if (!existingLog.started_at) {
        // Update existing log with start time
        await supabase
          .from('workout_logs')
          .update({ started_at: new Date().toISOString() })
          .eq('id', existingLog.id);
        startedAt = new Date();
      }

      if (logId) {
        setActiveWorkout({ planId, logId, startedAt });
        setShowActiveSession(true);
        toast.success('Treino iniciado! 💪');
      }
    } catch (error) {
      console.error('Error starting workout:', error);
      toast.error('Erro ao iniciar treino');
    }
  };

  // Complete exercise (called from ActiveWorkoutSession)
  const completeExercise = async (exercise: WorkoutExercise) => {
    if (!activeWorkout) return;

    try {
      const { data } = await supabase.from('workout_exercise_logs').insert({
        workout_log_id: activeWorkout.logId,
        workout_plan_exercise_id: exercise.id,
        sets_completed: exercise.sets,
        reps_completed: exercise.reps,
        weight_used_kg: exercise.weight_kg
      }).select().single();

      if (data) {
        const newLog: ExerciseLog = {
          id: data.id,
          workout_log_id: activeWorkout.logId,
          workout_plan_exercise_id: exercise.id,
          completed_at: new Date().toISOString()
        };
        setExerciseLogs(prev => [...prev, newLog]);
        toast.success(`✓ ${exercise.exercise?.name} concluído!`);
      }
    } catch (error) {
      console.error('Error completing exercise:', error);
      toast.error('Erro ao registrar exercício');
    }
  };

  // Finish workout
  const finishWorkout = async () => {
    if (!activeWorkout) return;

    try {
      await supabase
        .from('workout_logs')
        .update({ completed_at: new Date().toISOString() })
        .eq('id', activeWorkout.logId);

      setLogs(prev => prev.map(l => 
        l.id === activeWorkout.logId 
          ? { ...l, completed_at: new Date().toISOString() }
          : l
      ));

      setActiveWorkout(null);
      setShowActiveSession(false);
      toast.success('🎉 Treino finalizado! Parabéns!');
    } catch (error) {
      console.error('Error finishing workout:', error);
      toast.error('Erro ao finalizar treino');
    }
  };

  // Delete exercise log (undo)
  const deleteExerciseLog = async (exerciseId: string) => {
    const log = exerciseLogs.find(l => l.workout_plan_exercise_id === exerciseId);
    if (!log) return;

    try {
      await supabase.from('workout_exercise_logs').delete().eq('id', log.id);
      setExerciseLogs(prev => prev.filter(l => l.id !== log.id));
      toast.success('Exercício removido do histórico');
    } catch (error) {
      toast.error('Erro ao remover exercício');
    }
  };

  // Close session (pause workout)
  const closeSession = () => {
    setShowActiveSession(false);
  };

  // Delete plan
  const deletePlan = async (planId: string) => {
    try {
      await supabase.from('workout_plan_exercises').delete().eq('workout_plan_id', planId);
      await supabase.from('workout_plans').delete().eq('id', planId);
      setPlans(prev => prev.filter(p => p.id !== planId));
      setDeleteConfirm(null);
      toast.success('Plano excluído!');
    } catch (error) {
      toast.error('Erro ao excluir plano');
    }
  };

  // Calculate progress
  const getProgress = (planId: string) => {
    const dayExercises = getDayExercises(planId);
    if (dayExercises.length === 0) return 0;
    const completed = dayExercises.filter(e => isExerciseCompleted(e.id)).length;
    return Math.round((completed / dayExercises.length) * 100);
  };

  // Show active session if workout is in progress
  if (showActiveSession && activeWorkout) {
    const plan = plans.find(p => p.id === activeWorkout.planId);
    const dayExercises = getDayExercises(activeWorkout.planId);
    const completedIds = getCompletedExerciseIds(activeWorkout.planId);

    return (
      <ActiveWorkoutSession
        planName={plan?.name || 'Treino'}
        exercises={dayExercises}
        completedExerciseIds={completedIds}
        onCompleteExercise={completeExercise}
        onDeleteExerciseLog={deleteExerciseLog}
        onFinishWorkout={finishWorkout}
        onClose={closeSession}
        startedAt={activeWorkout.startedAt}
        isInstructorPlan={plan?.is_instructor_plan ?? false}
      />
    );
  }

  if (loading) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-8 w-24 bg-muted/50 rounded animate-pulse" />
          <div className="h-8 w-48 bg-muted/50 rounded animate-pulse" />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="h-14 w-14 bg-muted/50 rounded-xl animate-pulse flex-shrink-0" />
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 relative">
      {/* Floating Hydration Widget */}
      <HydrationWidget />
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/client')}
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            ← Voltar
          </button>
          <h2 className="text-xl sm:text-2xl font-bebas text-primary flex items-center gap-2">
            <Dumbbell className="w-6 h-6" />
            MEUS TREINOS
          </h2>
        </div>
        <Button size="sm" onClick={() => navigate('/client/timer')} variant="outline">
          <Clock size={16} className="mr-1" />
          Timer
        </Button>
      </div>

      {/* Active Workout Banner - Only show continue button if workout is from today */}
      {activeWorkout && !showActiveSession && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-primary/20 border border-primary/50 rounded-xl p-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/30 rounded-full flex items-center justify-center">
                <Timer className="w-5 h-5 text-primary animate-pulse" />
              </div>
              <div>
                <p className="text-sm font-medium text-primary">Treino em andamento</p>
                <p className="text-xs text-muted-foreground">
                  {plans.find(p => p.id === activeWorkout.planId)?.name}
                </p>
              </div>
            </div>
            {/* Only allow continue if it's today's workout */}
            <Button 
              size="sm" 
              className="bg-primary hover:bg-primary/90"
              onClick={() => setShowActiveSession(true)}
            >
              <Play size={14} className="mr-1" />
              Executar
            </Button>
          </div>
        </motion.div>
      )}

      {/* Day Selector */}
      <div className="bg-card/80 backdrop-blur-md rounded-xl p-4 border border-border/50">
        <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
          <Calendar size={14} />
          Selecione o dia para ver seus exercícios:
        </p>
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
          {DAYS.map((day, index) => {
            const isSelected = selectedDay === index;
            const isCurrentDay = todayDayOfWeek === index;
            const isFutureDay = index > todayDayOfWeek;
            const isPastDay = index < todayDayOfWeek;
            const hasExercises = plans.some(p => {
              const planExercises = exercises[p.id] || [];
              const hasSpecificDays = planExercises.some(e => e.day_of_week !== null);
              if (!hasSpecificDays) return true;
              return planExercises.some(e => e.day_of_week === index);
            });

            // Calculate the date for each day of the week
            const dayDiff = index - todayDayOfWeek;
            const dayDate = new Date(today);
            dayDate.setDate(today.getDate() + dayDiff);
            const dayNumber = dayDate.getDate();
            const monthShort = format(dayDate, 'MMM', { locale: ptBR });

            return (
              <motion.button
                key={day}
                onClick={() => setSelectedDay(index)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`flex-shrink-0 w-16 rounded-xl flex flex-col items-center justify-center transition-all duration-200 py-2 ${
                  isSelected
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30'
                    : isCurrentDay
                    ? 'bg-primary/20 text-primary border-2 border-primary/50'
                    : isFutureDay && hasExercises
                    ? 'bg-card border border-dashed border-primary/30 text-muted-foreground hover:border-primary/50'
                    : hasExercises
                    ? 'bg-card border border-border hover:border-primary/50 hover:bg-card/80'
                    : 'bg-muted/30 text-muted-foreground hover:bg-muted/50'
                }`}
              >
                <span className="text-[10px] font-medium uppercase tracking-wide opacity-70">{day}</span>
                <span className={`text-lg font-bold leading-tight ${isSelected ? '' : isCurrentDay ? 'text-primary' : ''}`}>
                  {dayNumber}
                </span>
                <span className={`text-[9px] uppercase tracking-wider ${isSelected ? 'opacity-80' : 'opacity-50'}`}>
                  {monthShort}
                </span>
                
                {/* Indicators */}
                <div className="flex items-center gap-0.5 mt-1 h-3">
                  {isCurrentDay && !isSelected && (
                    <div className="w-1 h-1 rounded-full bg-primary animate-pulse" />
                  )}
                  {isFutureDay && hasExercises && (
                    <Lock size={8} className="text-amber-500/70" />
                  )}
                  {hasExercises && !isCurrentDay && !isFutureDay && (
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Selected Day Info */}
      <div className="flex items-center justify-between">
        <h3 className="font-bebas text-lg text-muted-foreground">
          {DAYS_FULL[selectedDay]}
          {selectedDay === todayDayOfWeek && (
            <Badge className="ml-2 bg-primary/20 text-primary">HOJE</Badge>
          )}
        </h3>
        <Button 
          size="sm" 
          onClick={() => navigate('/client/workouts/new')}
          className="bg-primary hover:bg-primary/90"
        >
          <Plus size={16} className="mr-1" />
          Criar Treino
        </Button>
      </div>

      {/* Weekly Stats & History */}
      <WorkoutWeeklyStats />

      {/* Push Notifications Setup */}
      <PushNotificationSetup />

      {/* No Plans Message */}
      {availablePlans.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-card/80 backdrop-blur-md rounded-xl p-8 border border-border/50 text-center"
        >
          <Dumbbell className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground mb-2">
            Nenhum treino para {DAYS_FULL[selectedDay].toLowerCase()}
          </p>
          <p className="text-xs text-muted-foreground/70 mb-4">
            Crie um treino ou peça ao seu instrutor
          </p>
          <Button onClick={() => navigate('/client/workouts/new')}>
            <Plus size={16} className="mr-1" />
            Criar Meu Treino
          </Button>
        </motion.div>
      )}

      {/* Info for future days with countdown - minimizes after 30s */}
      {selectedDay > todayDayOfWeek && (
        <motion.div 
          initial={{ opacity: 1 }}
          animate={{ opacity: bannerMinimized ? 0.7 : 1 }}
          className={`border rounded-xl flex items-center gap-2 transition-all duration-300 cursor-pointer ${
            bannerMinimized 
              ? 'bg-amber-500/5 border-amber-500/20 p-2' 
              : 'bg-amber-500/10 border-amber-500/30 p-4'
          }`}
          onClick={() => setBannerMinimized(!bannerMinimized)}
        >
          <div className={`rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0 ${
            bannerMinimized ? 'w-8 h-8' : 'w-12 h-12'
          }`}>
            <Lock className={bannerMinimized ? 'w-4 h-4 text-amber-500' : 'w-6 h-6 text-amber-500'} />
          </div>
          {bannerMinimized ? (
            <span className="text-xs text-amber-500">
              Bloqueado • {selectedDay - todayDayOfWeek}d restantes
            </span>
          ) : (
            <>
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-500">🔒 Treino Bloqueado</p>
                <p className="text-xs text-muted-foreground">
                  Este treino será liberado em {selectedDay - todayDayOfWeek} dia(s) - {DAYS_FULL[selectedDay]}
                </p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-500">{selectedDay - todayDayOfWeek}</div>
                <div className="text-[10px] text-muted-foreground">dias</div>
              </div>
            </>
          )}
        </motion.div>
      )}

      {/* Info for past days - minimizes after 30s */}
      {selectedDay < todayDayOfWeek && (
        <motion.div 
          initial={{ opacity: 1 }}
          animate={{ opacity: bannerMinimized ? 0.7 : 1 }}
          className={`border rounded-xl flex items-center gap-2 transition-all duration-300 cursor-pointer ${
            bannerMinimized 
              ? 'bg-muted/20 border-muted-foreground/10 p-2' 
              : 'bg-muted/30 border-muted-foreground/20 p-4'
          }`}
          onClick={() => setBannerMinimized(!bannerMinimized)}
        >
          <div className={`rounded-full bg-muted/50 flex items-center justify-center flex-shrink-0 ${
            bannerMinimized ? 'w-8 h-8' : 'w-12 h-12'
          }`}>
            <Calendar className={bannerMinimized ? 'w-4 h-4 text-muted-foreground' : 'w-6 h-6 text-muted-foreground'} />
          </div>
          {bannerMinimized ? (
            <span className="text-xs text-muted-foreground">
              Dia anterior • Treino indisponível
            </span>
          ) : (
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground">🔒 Dia Anterior</p>
              <p className="text-xs text-muted-foreground/70">
                Não é possível iniciar treinos de dias passados. Execute os treinos no dia correto.
              </p>
            </div>
          )}
        </motion.div>
      )}

      {/* Workout Plans Grid */}
      <div className="grid gap-3 sm:grid-cols-2">
        <AnimatePresence mode="popLayout">
          {availablePlans.map((plan, index) => {
            const dayExercises = getDayExercises(plan.id);
            const progress = getProgress(plan.id);
            const isCompleted = isPlanCompletedToday(plan.id);
            const isToday = selectedDay === todayDayOfWeek;
            const isFutureDay = selectedDay > todayDayOfWeek;
            const isPastDay = selectedDay < todayDayOfWeek;
            
            // Get completion log info for display
            const completedLog = logs.find(l => l.workout_plan_id === plan.id && l.completed_at);
            const sessionDuration = completedLog?.started_at && completedLog?.completed_at
              ? Math.round((new Date(completedLog.completed_at).getTime() - new Date(completedLog.started_at).getTime()) / 60000)
              : null;
            
            // Check if instructor plan is available for today
            const isInstructorPlanLocked = plan.is_instructor_plan && isPlanLocked(plan);
            
            // ONLY allow starting workouts on TODAY - strict check
            // Instructor plans also blocked if not scheduled for today
            const canStart = isToday && !isCompleted && !isInstructorPlanLocked;
            const isMyPlan = plan.created_by === profile?.profile_id;
            const locked = hasCompletedExercises(plan.id);
            const isActive = activeWorkout?.planId === plan.id;
            
            // Get schedule info for display
            const scheduleInfo = plan.weekdays && plan.weekdays.length > 0
              ? `Dias: ${plan.weekdays.map(d => DAYS[d]).join(', ')}`
              : plan.scheduled_date
              ? `Data: ${format(new Date(plan.scheduled_date), "dd/MM", { locale: ptBR })}`
              : null;

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: index * 0.03, duration: 0.2 }}
              >
                <Card className={`bg-card/80 backdrop-blur-md border-border/50 overflow-hidden transition-colors duration-200 ${
                  isCompleted ? 'border-green-500/50 bg-green-500/5' : ''
                } ${isActive ? 'border-primary ring-2 ring-primary/30' : ''}
                ${isFutureDay ? 'opacity-70' : ''}`}>
                  <CardContent className="p-4">
                    {/* Plan Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          {isInstructorPlanLocked && (
                            <Badge variant="outline" className="text-[10px] border-red-500/50 text-red-500">
                              <Lock size={8} className="mr-1" />
                              Bloqueado Hoje
                            </Badge>
                          )}
                          {isFutureDay && !isInstructorPlanLocked && (
                            <Badge variant="outline" className="text-[10px] border-amber-500/50 text-amber-500">
                              <Lock size={8} className="mr-1" />
                              Bloqueado
                            </Badge>
                          )}
                          {isPastDay && !isToday && (
                            <Badge variant="outline" className="text-[10px] border-muted-foreground/50 text-muted-foreground">
                              Dia anterior
                            </Badge>
                          )}
                          {plan.is_instructor_plan && (
                            <Badge variant="outline" className="text-[10px] border-primary/50 text-primary">
                              Instrutor
                            </Badge>
                          )}
                          {isCompleted && completedLog && (
                            <Badge className="bg-green-500/20 text-green-500 text-[10px]">
                              <CheckCircle size={10} className="mr-1" />
                              Concluído
                            </Badge>
                          )}
                          {isActive && !isCompleted && (
                            <Badge className="bg-primary/20 text-primary text-[10px]">
                              <Timer size={10} className="mr-1" />
                              Em andamento
                            </Badge>
                          )}
                        </div>
                        <h4 className="font-semibold text-base">{plan.name}</h4>
                        {plan.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                            {plan.description}
                          </p>
                        )}
                        {/* Schedule info for instructor plans */}
                        {plan.is_instructor_plan && scheduleInfo && (
                          <p className="text-[10px] text-blue-400 mt-1 flex items-center gap-1">
                            <Calendar size={10} />
                            {scheduleInfo}
                            {plan.scheduled_time && ` às ${plan.scheduled_time.slice(0, 5)}`}
                          </p>
                        )}
                        {/* Schedule info for client plans */}
                        {!plan.is_instructor_plan && isMyPlan && (plan.weekdays?.length || plan.scheduled_date || plan.scheduled_time) && (
                          <p className="text-[10px] text-green-400 mt-1 flex items-center gap-1">
                            <Clock size={10} />
                            {plan.weekdays && plan.weekdays.length > 0 
                              ? `${plan.weekdays.map(d => DAYS[d]).join(', ')}`
                              : plan.scheduled_date
                              ? format(new Date(plan.scheduled_date), "dd/MM", { locale: ptBR })
                              : ''
                            }
                            {plan.scheduled_time && ` às ${plan.scheduled_time.slice(0, 5)}`}
                          </p>
                        )}
                      </div>
                      
                      {/* Actions */}
                      {isMyPlan && !plan.is_instructor_plan && (
                        <div className="flex items-center gap-1">
                          {/* Schedule Button */}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              setScheduleEditorPlan(plan);
                            }}
                            title="Agendar treino"
                          >
                            <Settings2 size={14} />
                          </Button>
                          {locked && (
                            <div className="p-1.5" title="Treino já iniciado - não pode editar">
                              <Lock size={14} className="text-muted-foreground" />
                            </div>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setDeleteConfirm({ id: plan.id, name: plan.name })}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Exercise Count & Muscles */}
                    <div className="flex flex-wrap gap-1 mb-3">
                      <Badge variant="secondary" className="text-xs">
                        {dayExercises.length} exercícios
                      </Badge>
                      {[...new Set(dayExercises.map(e => e.exercise?.muscle_group).filter(Boolean))].slice(0, 3).map(muscle => (
                        <Badge 
                          key={muscle} 
                          className={`text-[10px] ${muscleColors[muscle || ''] || 'bg-muted'}`}
                        >
                          {muscle}
                        </Badge>
                      ))}
                      {/* View Details Button - always visible */}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-xs text-muted-foreground hover:text-primary ml-auto"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDetailsModalPlan(plan);
                        }}
                      >
                        <Eye size={12} className="mr-1" />
                        Ver detalhes
                      </Button>
                    </div>

                    {/* Completion Info - Show date, day and duration when completed */}
                    {isCompleted && completedLog && (
                      <div className="mb-3 p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-1.5">
                            <Calendar size={12} className="text-green-500" />
                            <span className="text-green-400 font-medium">
                              {format(new Date(completedLog.completed_at!), "EEEE", { locale: ptBR })}
                            </span>
                            <span className="text-green-500/70">
                              {format(new Date(completedLog.completed_at!), "dd/MM/yyyy", { locale: ptBR })}
                            </span>
                          </div>
                          {sessionDuration !== null && (
                            <div className="flex items-center gap-1 text-green-400">
                              <Timer size={12} />
                              <span className="font-medium">
                                {sessionDuration >= 60 
                                  ? `${Math.floor(sessionDuration / 60)}h ${sessionDuration % 60}min`
                                  : `${sessionDuration}min`
                                }
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Progress - only show for today */}
                    {isToday && !isCompleted && progress > 0 && (
                      <div className="mb-3">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>Progresso</span>
                          <span>{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>
                    )}

                    {/* Start/View Button - STRICTLY Only enabled for today */}
                    <Button 
                      className={`w-full transition-colors ${
                        isCompleted 
                          ? 'bg-green-500/20 text-green-500 hover:bg-green-500/30' 
                          : canStart
                          ? 'bg-primary hover:bg-primary/90'
                          : 'bg-muted text-muted-foreground cursor-not-allowed opacity-60'
                      }`}
                      onClick={() => {
                        // Only allow starting/executing if it's today and can start
                        if (canStart) {
                          if (isActive) {
                            setShowActiveSession(true);
                          } else {
                            startWorkout(plan.id);
                          }
                        } else {
                          // Show appropriate toast message for disabled state
                          if (isCompleted) {
                            toast.info('Este treino já foi concluído hoje!');
                          } else if (isFutureDay) {
                            toast.error(`🔒 Treino bloqueado! Este treino só será liberado na ${DAYS_FULL[selectedDay]}.`);
                          } else if (isPastDay) {
                            toast.error('🔒 Não é possível iniciar treinos de dias anteriores.');
                          } else if (isInstructorPlanLocked) {
                            toast.error('🔒 Treino do instrutor não disponível para hoje.');
                          }
                        }
                      }}
                      disabled={!canStart}
                    >
                      {isCompleted ? (
                        <>
                          <CheckCircle size={16} className="mr-2" />
                          Treino Concluído
                        </>
                      ) : canStart ? (
                        <>
                          <Play size={16} className="mr-2" />
                          {isActive ? 'Executar' : progress > 0 ? 'Continuar' : 'Iniciar'} Treino
                        </>
                      ) : isFutureDay ? (
                        <>
                          <Lock size={16} className="mr-2" />
                          Bloqueado - {DAYS_FULL[selectedDay]}
                        </>
                      ) : isPastDay ? (
                        <>
                          <Lock size={16} className="mr-2" />
                          Dia Passado
                        </>
                      ) : isInstructorPlanLocked ? (
                        <>
                          <Lock size={16} className="mr-2" />
                          Não disponível hoje
                        </>
                      ) : (
                        <>
                          <Lock size={16} className="mr-2" />
                          Indisponível
                        </>
                      )}
                      <ChevronRight size={16} className="ml-auto" />
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Delete Confirmation */}
      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Treino</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{deleteConfirm?.name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deleteConfirm && deletePlan(deleteConfirm.id)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Schedule Editor Dialog */}
      <WorkoutScheduleEditor
        isOpen={!!scheduleEditorPlan}
        onClose={() => setScheduleEditorPlan(null)}
        plan={scheduleEditorPlan}
        onSuccess={() => {
          fetchData();
        }}
      />

      {/* Workout Details Modal */}
      <WorkoutDetailsModal
        isOpen={!!detailsModalPlan}
        onClose={() => setDetailsModalPlan(null)}
        planName={detailsModalPlan?.name || ''}
        planDescription={detailsModalPlan?.description}
        exercises={detailsModalPlan ? getDayExercises(detailsModalPlan.id) : []}
        dayName={DAYS_FULL[selectedDay]}
        isToday={selectedDay === todayDayOfWeek}
        isLocked={selectedDay !== todayDayOfWeek}
      />
    </motion.div>
  );
};

export default SimpleWorkouts;
