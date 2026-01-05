import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dumbbell, Play, CheckCircle, Clock, Calendar as CalendarIcon,
  ChevronDown, ChevronUp, Timer, RotateCcw, Video, X, Lock, History, Plus, User,
  Trash2, Edit2, LayoutGrid, Heart, Zap, Target, Flame, Trophy, Pause, Square, StopCircle, Copy,
  Volume2, VolumeX, FileDown, Bell
} from 'lucide-react';
import YouTubePlayer from '@/components/shared/YouTubePlayer';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, isSameDay, parseISO, isAfter, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import CreateClientWorkout from './CreateClientWorkout';
import ClientPageHeader from './ClientPageHeader';
import MuscleGroupDashboard from './MuscleGroupDashboard';
import WorkoutReminder from './WorkoutReminder';
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
  instructions: string | null;
}

interface WorkoutExercise {
  id: string;
  exercise_id: string;
  sets: number;
  reps: number;
  weight_kg: number | null;
  rest_seconds: number;
  notes: string | null;
  order_index: number;
  day_of_week: number | null;
  exercise: Exercise;
}

interface WorkoutPlan {
  id: string;
  name: string;
  description: string | null;
  is_instructor_plan: boolean;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  created_by: string;
}

interface WorkoutLog {
  id: string;
  workout_plan_id: string;
  workout_date: string;
  started_at: string | null;
  completed_at: string | null;
  notes: string | null;
}

interface CompletedExerciseLog {
  id: string;
  workout_log_id: string;
  workout_plan_exercise_id: string;
  sets_completed: number;
  reps_completed: number | null;
  weight_used_kg: number | null;
  completed_at: string;
}

interface ActiveWorkoutState {
  planId: string;
  logId: string;
  isPaused: boolean;
  totalTimer: number;
  exerciseTimers: { [exerciseId: string]: number };
  currentExerciseId: string | null;
  completedExercises: Set<string>;
  restTimer: number;
  isResting: boolean;
  currentSet: number;
}

const daysOfWeek = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const muscleGroupColors: { [key: string]: string } = {
  'Peito': 'bg-red-500/20 text-red-400 border-red-500/30',
  'Costas': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'Ombros': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  'Bíceps': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'Tríceps': 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  'Pernas': 'bg-green-500/20 text-green-400 border-green-500/30',
  'Abdômen': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  'Glúteos': 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  'Cardio': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
};

const WORKOUT_BACKUP_KEY = 'francgym_active_workout_backup';

const MyWorkouts: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [exercises, setExercises] = useState<{ [planId: string]: WorkoutExercise[] }>({});
  const [todayLogs, setTodayLogs] = useState<WorkoutLog[]>([]);
  const [completedExerciseLogs, setCompletedExerciseLogs] = useState<CompletedExerciseLog[]>([]);
  const [allWorkoutLogs, setAllWorkoutLogs] = useState<WorkoutLog[]>([]);
  const [allExerciseLogs, setAllExerciseLogs] = useState<CompletedExerciseLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('calendar');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [activeWorkout, setActiveWorkout] = useState<ActiveWorkoutState | null>(null);
  const [videoDialog, setVideoDialog] = useState<{ url: string; title: string } | null>(null);
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState<{ planId: string; planName: string } | null>(null);
  const [editingPlan, setEditingPlan] = useState<WorkoutPlan | null>(null);
  const [dateDropdown, setDateDropdown] = useState<{ date: Date; position: { x: number; y: number } } | null>(null);
  const [exitConfirmDialog, setExitConfirmDialog] = useState(false);
  const [pendingExitAction, setPendingExitAction] = useState<(() => void) | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const calendarRef = useRef<HTMLDivElement>(null);
  const alarmAudioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio element
  useEffect(() => {
    alarmAudioRef.current = new Audio('/audio/notification.mp3');
    alarmAudioRef.current.volume = 0.7;
    return () => {
      if (alarmAudioRef.current) {
        alarmAudioRef.current.pause();
        alarmAudioRef.current = null;
      }
    };
  }, []);

  const today = new Date();
  const dayOfWeek = today.getDay();

  useEffect(() => {
    if (profile) {
      fetchData();
      // Check for backup workout on mount
      restoreBackupWorkout();
    }
  }, [profile]);

  // Auto-backup active workout every 5 seconds
  useEffect(() => {
    if (activeWorkout) {
      const backupData = {
        ...activeWorkout,
        completedExercises: Array.from(activeWorkout.completedExercises),
        savedAt: new Date().toISOString(),
        profileId: profile?.profile_id
      };
      localStorage.setItem(WORKOUT_BACKUP_KEY, JSON.stringify(backupData));
    }
  }, [activeWorkout, profile?.profile_id]);

  // Clear backup when workout is properly finished
  const clearWorkoutBackup = () => {
    localStorage.removeItem(WORKOUT_BACKUP_KEY);
  };

  const restoreBackupWorkout = () => {
    try {
      const backup = localStorage.getItem(WORKOUT_BACKUP_KEY);
      if (backup) {
        const parsed = JSON.parse(backup);
        // Only restore if it's from today and same profile
        const backupDate = new Date(parsed.savedAt);
        const isToday = format(backupDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
        const isSameProfile = parsed.profileId === profile?.profile_id;
        
        if (isToday && isSameProfile && !activeWorkout) {
          toast.info('Treino em andamento encontrado! Restaurando...', {
            duration: 3000,
            action: {
              label: 'Descartar',
              onClick: () => {
                clearWorkoutBackup();
                toast.success('Backup descartado');
              }
            }
          });
          
          setActiveWorkout({
            ...parsed,
            completedExercises: new Set(parsed.completedExercises || [])
          });
          setExpandedPlan(parsed.planId);
        } else if (!isToday) {
          // Old backup, clear it
          clearWorkoutBackup();
        }
      }
    } catch (e) {
      console.error('Error restoring workout backup:', e);
      clearWorkoutBackup();
    }
  };

  // Main workout timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeWorkout && !activeWorkout.isPaused && !activeWorkout.isResting) {
      interval = setInterval(() => {
        setActiveWorkout(prev => {
          if (!prev) return null;
          const newExerciseTimers = { ...prev.exerciseTimers };
          if (prev.currentExerciseId) {
            newExerciseTimers[prev.currentExerciseId] = (newExerciseTimers[prev.currentExerciseId] || 0) + 1;
          }
          return {
            ...prev,
            totalTimer: prev.totalTimer + 1,
            exerciseTimers: newExerciseTimers
          };
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeWorkout?.isPaused, activeWorkout?.isResting, activeWorkout?.currentExerciseId]);

  // Rest timer effect with alarm
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeWorkout?.isResting && activeWorkout.restTimer > 0) {
      interval = setInterval(() => {
        setActiveWorkout(prev => {
          if (!prev) return null;
          
          const newRestTimer = prev.restTimer - 1;
          
          // Play alarm when timer reaches 0
          if (newRestTimer === 0 && soundEnabled && alarmAudioRef.current) {
            alarmAudioRef.current.currentTime = 0;
            alarmAudioRef.current.play().catch(() => {
              // Audio play failed, likely due to autoplay policy
              console.log('Audio autoplay blocked');
            });
          }
          
          // Play warning beep at 3 seconds
          if (newRestTimer === 3 && soundEnabled && alarmAudioRef.current) {
            alarmAudioRef.current.currentTime = 0;
            alarmAudioRef.current.volume = 0.3;
            alarmAudioRef.current.play().catch(() => {});
            setTimeout(() => {
              if (alarmAudioRef.current) alarmAudioRef.current.volume = 0.7;
            }, 500);
          }
          
          return {
            ...prev,
            restTimer: newRestTimer,
            isResting: newRestTimer > 0
          };
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeWorkout?.isResting, activeWorkout?.restTimer, soundEnabled]);

  // Function to play test sound
  const playTestSound = () => {
    if (alarmAudioRef.current) {
      alarmAudioRef.current.currentTime = 0;
      alarmAudioRef.current.play().catch(() => {
        toast.error('Som bloqueado pelo navegador. Clique em qualquer lugar primeiro.');
      });
    }
  };

  const fetchData = async () => {
    if (!profile?.profile_id) return;
    
    try {
      // Fetch plans created by the user OR assigned to the user
      const { data: plansData, error: plansError } = await supabase
        .from('workout_plans')
        .select('*')
        .or(`created_by.eq.${profile.profile_id},assigned_to.eq.${profile.profile_id}`)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (plansError) throw plansError;
      setPlans(plansData || []);

      // Fetch exercises for each plan
      for (const plan of plansData || []) {
        const { data: exercisesData, error: exercisesError } = await supabase
          .from('workout_plan_exercises')
          .select(`
            *,
            exercise:exercises (*)
          `)
          .eq('workout_plan_id', plan.id)
          .order('order_index');

        if (!exercisesError && exercisesData) {
          setExercises(prev => ({ ...prev, [plan.id]: exercisesData as unknown as WorkoutExercise[] }));
        }
      }

      const todayStr = format(today, 'yyyy-MM-dd');
      const { data: logsData, error: logsError } = await supabase
        .from('workout_logs')
        .select('*')
        .eq('profile_id', profile?.profile_id)
        .eq('workout_date', todayStr);

      if (!logsError) {
        setTodayLogs(logsData || []);
        
        // Fetch completed exercise logs for today's workout logs
        if (logsData && logsData.length > 0) {
          const logIds = logsData.map(l => l.id);
          const { data: exerciseLogsData } = await supabase
            .from('workout_exercise_logs')
            .select('*')
            .in('workout_log_id', logIds);
          
          if (exerciseLogsData) {
            setCompletedExerciseLogs(exerciseLogsData as CompletedExerciseLog[]);
          }
        }
      }

      // Fetch ALL workout logs for user's own plans to check if they have completed exercises
      const userPlanIds = (plansData || [])
        .filter(p => p.created_by === profile.profile_id && !p.is_instructor_plan)
        .map(p => p.id);
      
      if (userPlanIds.length > 0) {
        const { data: allLogsData } = await supabase
          .from('workout_logs')
          .select('*')
          .eq('profile_id', profile.profile_id)
          .in('workout_plan_id', userPlanIds);
        
        if (allLogsData && allLogsData.length > 0) {
          setAllWorkoutLogs(allLogsData);
          
          const allLogIds = allLogsData.map(l => l.id);
          const { data: allExerciseLogsData } = await supabase
            .from('workout_exercise_logs')
            .select('*')
            .in('workout_log_id', allLogIds);
          
          if (allExerciseLogsData) {
            setAllExerciseLogs(allExerciseLogsData as CompletedExerciseLog[]);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching workouts:', error);
    } finally {
      setLoading(false);
    }
  };

  const isExerciseCompleted = (exerciseId: string) => {
    return completedExerciseLogs.some(log => log.workout_plan_exercise_id === exerciseId);
  };

  // Check if plan has any completed exercises (prevents editing)
  const planHasCompletedExercises = (planId: string): boolean => {
    // Check if any workout log exists for this plan with completed exercises
    const planLogs = allWorkoutLogs.filter(l => l.workout_plan_id === planId);
    if (planLogs.length === 0) return false;
    
    const planLogIds = planLogs.map(l => l.id);
    return allExerciseLogs.some(el => planLogIds.includes(el.workout_log_id));
  };

  // Separate plans by type
  const myPlans = plans.filter(p => !p.is_instructor_plan && p.created_by === profile?.profile_id);
  const instructorPlans = plans.filter(p => p.is_instructor_plan);

  // Check if plan can be executed on selected date
  const canExecutePlan = (plan: WorkoutPlan): boolean => {
    // Instructor plans can always be executed
    if (plan.is_instructor_plan) return true;
    
    // Must be today to execute
    if (!isSameDay(selectedDate, today)) return false;
    
    // Client plans: check if today matches the scheduled days
    const planExercises = exercises[plan.id] || [];
    const selectedDayOfWeek = selectedDate.getDay();
    
    // If no specific days are set, allow any day
    const hasSpecificDays = planExercises.some(e => e.day_of_week !== null);
    if (!hasSpecificDays) return true;
    
    // Check if selected day matches any exercise day
    const matchesDay = planExercises.some(e => e.day_of_week === selectedDayOfWeek);
    return matchesDay;
  };

  // Check if plan is scheduled for a future date (locked)
  const isPlanLocked = (plan: WorkoutPlan): { locked: boolean; reason: string } => {
    if (plan.is_instructor_plan) return { locked: false, reason: '' };
    
    const planExercises = exercises[plan.id] || [];
    const todayDayOfWeek = today.getDay();
    
    // Check if plan has specific days and none match today
    const hasSpecificDays = planExercises.some(e => e.day_of_week !== null);
    if (hasSpecificDays) {
      const matchesDay = planExercises.some(e => e.day_of_week === todayDayOfWeek);
      if (!matchesDay) {
        // Find next scheduled day
        const scheduledDays = getScheduledDays(plan.id).sort((a, b) => a - b);
        const nextDay = scheduledDays.find(d => d > todayDayOfWeek) || scheduledDays[0];
        const dayName = daysOfWeek[nextDay];
        return { locked: true, reason: `Liberado ${dayName}` };
      }
    }
    
    return { locked: false, reason: '' };
  };

  const getScheduledDays = (planId: string): number[] => {
    const planExercises = exercises[planId] || [];
    const days = new Set<number>();
    planExercises.forEach(e => {
      if (e.day_of_week !== null) {
        days.add(e.day_of_week);
      }
    });
    return Array.from(days);
  };

  const startWorkout = async (planId: string) => {
    if (!profile?.profile_id) return;

    const plan = plans.find(p => p.id === planId);
    if (plan && !canExecutePlan(plan)) {
      toast.error('Este treino só pode ser executado nos dias programados!');
      return;
    }

    const todayStr = format(today, 'yyyy-MM-dd');
    const existingLog = todayLogs.find(l => l.workout_plan_id === planId);

    if (existingLog?.completed_at) {
      toast.info('Treino já concluído hoje!');
      return;
    }

    try {
      let logId = existingLog?.id;
      
      if (!existingLog) {
        const { data: newLog } = await supabase.from('workout_logs').insert({
          profile_id: profile.profile_id,
          workout_plan_id: planId,
          workout_date: todayStr,
          started_at: new Date().toISOString()
        }).select().single();
        
        if (newLog) {
          logId = newLog.id;
          setTodayLogs(prev => [...prev, newLog]);
        }
        toast.success('Treino iniciado! Boa sorte! 💪');
      }

      // Get already completed exercises for this workout
      const completedIds = new Set(
        completedExerciseLogs
          .filter(log => todayLogs.find(l => l.id === log.workout_log_id)?.workout_plan_id === planId)
          .map(log => log.workout_plan_exercise_id)
      );

      const planExercises = exercises[planId] || [];
      const firstUncompletedExercise = planExercises.find(e => !completedIds.has(e.id));

      setActiveWorkout({
        planId,
        logId: logId!,
        isPaused: false,
        totalTimer: 0,
        exerciseTimers: {},
        currentExerciseId: firstUncompletedExercise?.id || null,
        completedExercises: completedIds,
        restTimer: 0,
        isResting: false,
        currentSet: 1
      });
      setExpandedPlan(planId);
    } catch (error) {
      console.error('Error starting workout:', error);
      toast.error('Erro ao iniciar treino');
    }
  };

  const togglePauseWorkout = () => {
    if (!activeWorkout) return;
    setActiveWorkout(prev => prev ? { ...prev, isPaused: !prev.isPaused } : null);
    toast.info(activeWorkout.isPaused ? 'Treino retomado!' : 'Treino pausado');
  };

  const handleExitWorkout = (action?: () => void) => {
    if (activeWorkout && !activeWorkout.completedExercises.size) {
      // No exercises completed, just exit
      setActiveWorkout(null);
      if (action) action();
      return;
    }

    if (activeWorkout) {
      setPendingExitAction(() => action || null);
      setExitConfirmDialog(true);
    } else if (action) {
      action();
    }
  };

  const confirmExitWorkout = async (finishWorkout: boolean) => {
    if (finishWorkout && activeWorkout) {
      await finishWorkoutHandler();
    } else {
      setActiveWorkout(null);
    }
    setExitConfirmDialog(false);
    if (pendingExitAction) {
      pendingExitAction();
      setPendingExitAction(null);
    }
  };

  const selectExercise = (exerciseId: string) => {
    if (!activeWorkout) return;
    if (activeWorkout.completedExercises.has(exerciseId)) {
      toast.info('Este exercício já foi concluído!');
      return;
    }
    setActiveWorkout(prev => prev ? {
      ...prev,
      currentExerciseId: exerciseId,
      currentSet: 1
    } : null);
  };

  const saveExerciseLog = async (exerciseId: string, setsCompleted: number, repsCompleted: number, weight: number | null, exerciseTime: number) => {
    if (!activeWorkout) return;

    try {
      await supabase.from('workout_exercise_logs').insert({
        workout_log_id: activeWorkout.logId,
        workout_plan_exercise_id: exerciseId,
        sets_completed: setsCompleted,
        reps_completed: repsCompleted,
        weight_used_kg: weight,
        notes: `Tempo: ${formatTime(exerciseTime)}`
      });
      
      // Update local state
      const newLog: CompletedExerciseLog = {
        id: crypto.randomUUID(),
        workout_log_id: activeWorkout.logId,
        workout_plan_exercise_id: exerciseId,
        sets_completed: setsCompleted,
        reps_completed: repsCompleted,
        weight_used_kg: weight,
        completed_at: new Date().toISOString()
      };
      setCompletedExerciseLogs(prev => [...prev, newLog]);
    } catch (error) {
      console.error('Error saving exercise log:', error);
    }
  };

  const completeExercise = async (exercise: WorkoutExercise) => {
    if (!activeWorkout) return;

    const exerciseTime = activeWorkout.exerciseTimers[exercise.id] || 0;
    
    // Save exercise log with all data
    await saveExerciseLog(
      exercise.id,
      exercise.sets,
      exercise.reps,
      exercise.weight_kg,
      exerciseTime
    );

    const newCompleted = new Set(activeWorkout.completedExercises);
    newCompleted.add(exercise.id);

    const planExercises = exercises[activeWorkout.planId] || [];
    const allCompleted = planExercises.every(e => newCompleted.has(e.id));

    if (allCompleted) {
      // All exercises done - auto finish
      await finishWorkoutHandler();
      toast.success('🎉 Treino finalizado! Parabéns!');
    } else {
      // Find next uncompleted exercise
      const nextExercise = planExercises.find(e => !newCompleted.has(e.id));
      
      setActiveWorkout(prev => prev ? {
        ...prev,
        completedExercises: newCompleted,
        currentExerciseId: nextExercise?.id || null,
        currentSet: 1,
        restTimer: exercise.rest_seconds,
        isResting: true
      } : null);
      
      toast.success(`✓ ${exercise.exercise?.name} concluído! Descanse ${exercise.rest_seconds}s`);
    }
  };

  const completeSet = (exercise: WorkoutExercise) => {
    if (!activeWorkout) return;

    if (activeWorkout.currentSet >= exercise.sets) {
      // All sets done - complete exercise
      completeExercise(exercise);
    } else {
      // Move to next set with rest
      setActiveWorkout(prev => prev ? {
        ...prev,
        currentSet: prev.currentSet + 1,
        restTimer: exercise.rest_seconds,
        isResting: true
      } : null);
      toast.info(`Série ${activeWorkout.currentSet} concluída! Descanse ${exercise.rest_seconds}s`);
    }
  };

  const finishWorkoutHandler = async () => {
    if (!activeWorkout || !profile?.profile_id) return;

    try {
      await supabase
        .from('workout_logs')
        .update({ completed_at: new Date().toISOString() })
        .eq('id', activeWorkout.logId);
      
      // Clear the backup when workout is properly finished
      clearWorkoutBackup();
      
      setActiveWorkout(null);
      toast.success('Treino finalizado com sucesso! 🎉');
      fetchData();
    } catch (error) {
      toast.error('Erro ao finalizar treino');
    }
  };

  const handleDeletePlan = async (planId: string) => {
    try {
      // First delete the exercises in the plan
      await supabase
        .from('workout_plan_exercises')
        .delete()
        .eq('workout_plan_id', planId);

      // Then delete the plan itself
      const { error } = await supabase
        .from('workout_plans')
        .delete()
        .eq('id', planId);

      if (error) throw error;

      toast.success('Plano de treino excluído com sucesso!');
      setDeleteConfirmDialog(null);
      fetchData();
    } catch (error) {
      console.error('Error deleting workout plan:', error);
      toast.error('Erro ao excluir plano de treino');
    }
  };

  const handleDuplicatePlan = async (plan: WorkoutPlan) => {
    if (!profile?.profile_id) return;
    
    try {
      // Create a copy of the plan
      const { data: newPlan, error: planError } = await supabase
        .from('workout_plans')
        .insert({
          created_by: profile.profile_id,
          assigned_to: profile.profile_id,
          name: `${plan.name} (Cópia)`,
          description: plan.description,
          is_instructor_plan: false,
          is_active: true
        })
        .select()
        .single();

      if (planError) throw planError;

      // Copy all exercises from the original plan
      const originalExercises = exercises[plan.id] || [];
      if (originalExercises.length > 0) {
        const exercisesToInsert = originalExercises.map((ex, index) => ({
          workout_plan_id: newPlan.id,
          exercise_id: ex.exercise_id,
          sets: ex.sets,
          reps: ex.reps,
          weight_kg: ex.weight_kg,
          rest_seconds: ex.rest_seconds,
          day_of_week: ex.day_of_week,
          notes: ex.notes,
          order_index: index
        }));

        const { error: exercisesError } = await supabase
          .from('workout_plan_exercises')
          .insert(exercisesToInsert);

        if (exercisesError) {
          // Clean up the plan if exercises failed
          await supabase.from('workout_plans').delete().eq('id', newPlan.id);
          throw exercisesError;
        }
      }

      toast.success('Plano duplicado com sucesso!');
      fetchData();
    } catch (error) {
      console.error('Error duplicating plan:', error);
      toast.error('Erro ao duplicar plano');
    }
  };

  const exportToPDF = (plan: WorkoutPlan) => {
    const planExercises = exercises[plan.id] || [];
    
    // Create PDF content
    const pdfContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${plan.name}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
    h1 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
    h2 { color: #666; margin-top: 30px; }
    .description { color: #888; font-style: italic; margin-bottom: 20px; }
    .exercise { background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #007bff; }
    .exercise-name { font-weight: bold; font-size: 16px; color: #333; }
    .exercise-details { display: flex; gap: 20px; margin-top: 8px; color: #666; }
    .exercise-details span { background: #e9ecef; padding: 4px 8px; border-radius: 4px; font-size: 12px; }
    .muscle-group { background: #007bff !important; color: white !important; }
    .day-header { background: #007bff; color: white; padding: 10px 15px; margin: 20px 0 10px 0; border-radius: 8px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #888; font-size: 12px; text-align: center; }
  </style>
</head>
<body>
  <h1>🏋️ ${plan.name}</h1>
  ${plan.description ? `<p class="description">${plan.description}</p>` : ''}
  
  ${daysOfWeek.map((day, dayIndex) => {
    const dayExercises = planExercises.filter(e => e.day_of_week === dayIndex);
    if (dayExercises.length === 0) return '';
    return `
      <div class="day-header">${day}</div>
      ${dayExercises.map(ex => `
        <div class="exercise">
          <div class="exercise-name">${ex.exercise?.name || 'Exercício'}</div>
          <div class="exercise-details">
            <span>${ex.sets} séries</span>
            <span>${ex.reps} repetições</span>
            ${ex.weight_kg ? `<span>${ex.weight_kg}kg</span>` : ''}
            <span>${ex.rest_seconds}s descanso</span>
            ${ex.exercise?.muscle_group ? `<span class="muscle-group">${ex.exercise.muscle_group}</span>` : ''}
          </div>
        </div>
      `).join('')}
    `;
  }).join('')}
  
  ${planExercises.filter(e => e.day_of_week === null).length > 0 ? `
    <div class="day-header">Todos os dias</div>
    ${planExercises.filter(e => e.day_of_week === null).map(ex => `
      <div class="exercise">
        <div class="exercise-name">${ex.exercise?.name || 'Exercício'}</div>
        <div class="exercise-details">
          <span>${ex.sets} séries</span>
          <span>${ex.reps} repetições</span>
          ${ex.weight_kg ? `<span>${ex.weight_kg}kg</span>` : ''}
          <span>${ex.rest_seconds}s descanso</span>
          ${ex.exercise?.muscle_group ? `<span class="muscle-group">${ex.exercise.muscle_group}</span>` : ''}
        </div>
      </div>
    `).join('')}
  ` : ''}
  
  <div class="footer">
    Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
  </div>
</body>
</html>
    `;
    
    // Create blob and download
    const blob = new Blob([pdfContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    // Open in new window for printing/saving as PDF
    const printWindow = window.open(url, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }
    
    toast.success('PDF aberto para impressão! Use Ctrl+P ou Cmd+P para salvar.');
  };

  const getWorkoutStatus = (planId: string) => {
    const log = todayLogs.find(l => l.workout_plan_id === planId);
    if (!log) return 'pending';
    if (log.completed_at) return 'completed';
    if (log.started_at) return 'in_progress';
    return 'pending';
  };

  const getTodayExercises = (planId: string) => {
    const planExercises = exercises[planId] || [];
    return planExercises.filter(e => e.day_of_week === null || e.day_of_week === dayOfWeek);
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderPlanCard = (plan: WorkoutPlan, isInstructor: boolean = false) => {
    const status = getWorkoutStatus(plan.id);
    const todayExercises = getTodayExercises(plan.id);
    const isExpanded = expandedPlan === plan.id;
    const isActive = activeWorkout?.planId === plan.id;
    const completedCount = activeWorkout?.completedExercises.size || completedExerciseLogs.filter(l => 
      todayLogs.find(log => log.id === l.workout_log_id)?.workout_plan_id === plan.id
    ).length;
    const progressPercent = todayExercises.length > 0 ? (completedCount / todayExercises.length) * 100 : 0;
    const scheduledDays = getScheduledDays(plan.id);
    const canExecute = canExecutePlan(plan);
    const lockInfo = isPlanLocked(plan);

    return (
      <Card key={plan.id} className={`bg-card/80 backdrop-blur-md border-border/50 transition-all ${isActive ? 'ring-2 ring-primary' : ''}`}>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg font-bebas tracking-wider flex items-center gap-2">
                {plan.name}
                {isInstructor && (
                  <Badge variant="secondary" className="bg-green-500/20 text-green-500 border border-green-500/30">
                    <User size={12} className="mr-1" />
                    INSTRUTOR
                  </Badge>
                )}
              </CardTitle>
              {plan.description && (
                <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
              )}
              <div className="flex flex-wrap gap-1 mt-2">
                {scheduledDays.length > 0 ? (
                  scheduledDays.map(d => (
                    <Badge key={d} variant="outline" className="text-xs">
                      {daysOfWeek[d].slice(0, 3)}
                    </Badge>
                  ))
                ) : (
                  <Badge variant="outline" className="text-xs">Todos os dias</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {todayExercises.length} exercício(s) para hoje
              </p>
            </div>
            <Badge variant={
              status === 'completed' ? 'default' :
              status === 'in_progress' ? 'secondary' : 'outline'
            } className={
              status === 'completed' ? 'bg-green-500' :
              status === 'in_progress' ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30' : ''
            }>
              {status === 'completed' ? 'Concluído' :
               status === 'in_progress' ? 'Em andamento' : 'Pendente'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Active workout timer and controls */}
          {isActive && (
            <div className="bg-gradient-to-r from-primary/20 to-purple-500/20 rounded-xl p-4 border border-primary/30">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${activeWorkout?.isPaused ? 'bg-yellow-500/20' : 'bg-green-500/20'}`}>
                    <Timer size={20} className={activeWorkout?.isPaused ? 'text-yellow-500' : 'text-green-500'} />
                  </div>
                  <div>
                    <p className="text-2xl font-bebas tracking-wider text-primary">
                      {formatTime(activeWorkout?.totalTimer || 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {activeWorkout?.isPaused ? 'PAUSADO' : 'TEMPO TOTAL'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {/* Sound toggle button */}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSoundEnabled(!soundEnabled);
                      if (!soundEnabled) {
                        playTestSound();
                      }
                    }}
                    className="gap-1"
                    title={soundEnabled ? 'Desativar som' : 'Ativar som'}
                  >
                    {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
                  </Button>
                  <Button
                    size="sm"
                    variant={activeWorkout?.isPaused ? 'default' : 'outline'}
                    onClick={togglePauseWorkout}
                    className="gap-1"
                  >
                    {activeWorkout?.isPaused ? (
                      <>
                        <Play size={14} />
                        Retomar
                      </>
                    ) : (
                      <>
                        <Pause size={14} />
                        Pausar
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleExitWorkout()}
                    className="gap-1"
                  >
                    <StopCircle size={14} />
                    Parar
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Progresso: {completedCount}/{todayExercises.length} exercícios</span>
              </div>
              <Progress value={progressPercent} className="h-2 mt-2" />
            </div>
          )}

          {!isActive && status !== 'completed' && progressPercent > 0 && (
            <Progress value={progressPercent} className="h-2" />
          )}

          <div className="flex gap-2 flex-wrap">
            {status !== 'completed' && !isActive && (
              <Button
                size="sm"
                onClick={() => startWorkout(plan.id)}
                disabled={lockInfo.locked && !isInstructor}
                className={lockInfo.locked && !isInstructor ? 'opacity-50' : ''}
              >
                {lockInfo.locked && !isInstructor ? (
                  <>
                    <Lock size={14} className="mr-1" />
                    {lockInfo.reason}
                  </>
                ) : (
                  <>
                    <Play size={14} className="mr-1" />
                    Iniciar Treino
                  </>
                )}
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setExpandedPlan(isExpanded ? null : plan.id)}
            >
              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {isExpanded ? 'Recolher' : 'Ver Exercícios'}
            </Button>
            
            {/* Edit/Delete buttons only for user's own plans */}
            {!isInstructor && plan.created_by === profile?.profile_id && !isActive && (
              <>
                {/* Edit button - blocked if exercises have been completed */}
                {!planHasCompletedExercises(plan.id) ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingPlan(plan);
                      setActiveTab('create');
                    }}
                  >
                    <Edit2 size={14} className="mr-1" />
                    Editar
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled
                    className="opacity-50 cursor-not-allowed"
                    title="Não é possível editar após realizar exercícios"
                  >
                    <Lock size={14} className="mr-1" />
                    Bloqueado
                  </Button>
                )}
                
                {/* Delete button - blocked if exercises have been completed */}
                {!planHasCompletedExercises(plan.id) ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive border-destructive/50 hover:bg-destructive/10"
                    onClick={() => setDeleteConfirmDialog({ planId: plan.id, planName: plan.name })}
                  >
                    <Trash2 size={14} />
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled
                    className="opacity-50 cursor-not-allowed text-muted-foreground"
                    title="Não é possível excluir após realizar exercícios"
                  >
                    <Trash2 size={14} />
                  </Button>
                )}
                
                {/* Duplicate button - always available for user's own plans */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDuplicatePlan(plan)}
                  title="Duplicar plano"
                >
                  <Copy size={14} />
                </Button>
              </>
            )}
            
            {/* Export PDF button - always visible */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => exportToPDF(plan)}
              title="Exportar para PDF"
            >
              <FileDown size={14} />
            </Button>
          </div>

          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                {todayExercises.map((ex, idx) => {
                  const isCompleted = isExerciseCompleted(ex.id) || activeWorkout?.completedExercises.has(ex.id);
                  const isCurrent = isActive && activeWorkout?.currentExerciseId === ex.id;
                  const exerciseTime = activeWorkout?.exerciseTimers[ex.id] || 0;
                  
                  return (
                    <motion.div 
                      key={ex.id}
                      layout
                      className={`p-3 rounded-lg border transition-all cursor-pointer ${
                        isCompleted ? 'bg-green-500/10 border-green-500/30' :
                        isCurrent ? 'bg-primary/10 border-primary/50 ring-2 ring-primary shadow-lg' :
                        isActive ? 'bg-background/50 border-border/50 hover:border-primary/30' :
                        'bg-background/50 border-border/50'
                      }`}
                      onClick={() => isActive && !isCompleted && selectExercise(ex.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {isCompleted ? (
                            <CheckCircle size={18} className="text-green-500" />
                          ) : (
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                              isCurrent ? 'bg-primary text-primary-foreground' : 'bg-primary/20 text-primary'
                            }`}>
                              {idx + 1}
                            </span>
                          )}
                          <div>
                            <p className={`font-medium ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                              {ex.exercise?.name || 'Exercício'}
                            </p>
                            <div className="flex gap-2 text-xs text-muted-foreground">
                              <span>{ex.sets}x{ex.reps}</span>
                              {ex.weight_kg && <span>• {ex.weight_kg}kg</span>}
                              <span>• {ex.rest_seconds}s desc</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Exercise timer */}
                          {isActive && (isCurrent || exerciseTime > 0) && (
                            <Badge variant="outline" className={`text-xs font-mono ${isCurrent ? 'bg-primary/20 text-primary border-primary/50' : ''}`}>
                              <Clock size={10} className="mr-1" />
                              {formatTime(exerciseTime)}
                            </Badge>
                          )}
                          {ex.exercise?.muscle_group && (
                            <Badge className={`text-xs ${muscleGroupColors[ex.exercise.muscle_group] || ''}`}>
                              {ex.exercise.muscle_group}
                            </Badge>
                          )}
                          {ex.exercise?.video_url && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={(e) => {
                                e.stopPropagation();
                                setVideoDialog({ url: ex.exercise.video_url!, title: ex.exercise.name });
                              }}
                            >
                              <Video size={14} className="text-primary" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Current exercise controls */}
                      {isCurrent && !isCompleted && !activeWorkout?.isPaused && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-4 p-3 bg-background/80 rounded-lg border border-primary/30"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="bg-primary/20 text-primary">
                                Série {activeWorkout?.currentSet} de {ex.sets}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                • {ex.reps} repetições
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                completeSet(ex);
                              }}
                              className="flex-1 gap-1"
                            >
                              <CheckCircle size={14} />
                              {activeWorkout?.currentSet >= ex.sets ? 'Finalizar Exercício' : 'Concluir Série'}
                            </Button>
                            {activeWorkout?.currentSet >= ex.sets && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  completeExercise(ex);
                                }}
                                className="gap-1"
                              >
                                <Trophy size={14} />
                                Finalizar
                              </Button>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    );
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col overflow-hidden">
      <ClientPageHeader 
        title="MEUS TREINOS" 
        icon={<Dumbbell className="w-5 h-5" />} 
        iconColor="text-primary" 
      />

      <div className="flex-1 overflow-auto space-y-6">
        <div className="flex justify-end">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/client/evolution')}
            className="gap-2 border-primary/50 hover:bg-primary/10"
          >
            <History size={16} className="text-primary" />
            <span className="hidden sm:inline">Histórico</span>
          </Button>
        </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <CalendarIcon size={16} />
            <span className="hidden sm:inline">Calendário</span>
          </TabsTrigger>
          <TabsTrigger value="library" className="flex items-center gap-2">
            <LayoutGrid size={16} />
            <span className="hidden sm:inline">Biblioteca</span>
          </TabsTrigger>
          <TabsTrigger value="instructor" className="flex items-center gap-2">
            <User size={16} />
            <span className="hidden sm:inline">Instrutor</span> ({instructorPlans.length})
          </TabsTrigger>
          <TabsTrigger value="create" className="flex items-center gap-2">
            <Plus size={16} />
            <span className="hidden sm:inline">Criar</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="library">
          <MuscleGroupDashboard 
            onBack={() => setActiveTab('calendar')}
            onSelectExercise={(exercise) => {
              toast.success(`${exercise.name} selecionado! Vá para "Criar Treino" para adicionar ao seu plano.`);
            }}
          />
        </TabsContent>

        <TabsContent value="create">
          <CreateClientWorkout 
            onBack={() => setActiveTab('calendar')} 
            onSuccess={() => {
              setActiveTab('calendar');
              fetchData();
            }}
          />
        </TabsContent>

        <TabsContent value="instructor" className="space-y-6">
          {/* Instructor Plans */}
          <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-md rounded-xl p-6 border border-green-500/30">
            <div className="flex items-center gap-3 mb-2">
              <User className="w-8 h-8 text-green-500" />
              <div>
                <h3 className="text-xl font-bebas text-green-500">TREINOS DO INSTRUTOR</h3>
                <p className="text-sm text-muted-foreground">Planos criados pelo seu instrutor</p>
              </div>
            </div>
          </div>

          {instructorPlans.length === 0 ? (
            <div className="bg-card/80 backdrop-blur-md rounded-xl p-8 border border-border/50 text-center">
              <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum treino do instrutor encontrado</p>
              <p className="text-sm text-muted-foreground mt-2">Aguarde seu instrutor criar um plano para você</p>
            </div>
          ) : (
            <div className="space-y-4">
              {instructorPlans.map(plan => renderPlanCard(plan, true))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="calendar" className="space-y-4">
          {/* Compact Hero Banner with Action Button */}
          <div className="relative overflow-hidden bg-gradient-to-r from-primary/15 via-purple-500/10 to-orange-500/15 rounded-xl p-4 border border-primary/20">
            <div className="relative z-10 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <motion.div
                  className="p-2 rounded-xl bg-gradient-to-br from-primary to-purple-500 shadow-lg"
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 3, repeat: Infinity }}
                >
                  <Dumbbell className="w-6 h-6 text-white" />
                </motion.div>
                <div>
                  <h3 className="text-lg font-bebas text-primary tracking-wider">
                    💪 HORA DE TREINAR!
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {myPlans.length} planos • {todayLogs.filter(l => l.completed_at).length} concluídos hoje
                  </p>
                </div>
              </div>
              <Button 
                onClick={() => setActiveTab('library')}
                variant="outline"
                size="sm"
                className="gap-2 border-primary/50 hover:bg-primary/10"
              >
                <LayoutGrid size={14} />
                <span className="hidden sm:inline">Cardápio de Exercícios</span>
                <span className="sm:hidden">Exercícios</span>
              </Button>
            </div>
          </div>

          {/* Weekly Summary */}
          <div className="bg-card/80 backdrop-blur-md rounded-xl p-3 border border-border/50">
            <h4 className="font-bebas text-sm text-primary mb-2 flex items-center gap-2">
              <CalendarIcon size={14} />
              RESUMO DA SEMANA
            </h4>
            <div className="flex gap-1">
              {daysOfWeek.map((day, index) => {
                const hasWorkout = myPlans.some(plan => {
                  const days = getScheduledDays(plan.id);
                  return days.length === 0 || days.includes(index);
                });
                const isToday = index === today.getDay();
                const dayCompleted = isToday && todayLogs.some(l => l.completed_at);
                
                return (
                  <div
                    key={day}
                    className={`flex-1 p-2 rounded-lg text-center transition-all ${
                      isToday 
                        ? 'bg-primary/20 border-2 border-primary' 
                        : hasWorkout 
                        ? 'bg-primary/10 border border-primary/30'
                        : 'bg-muted/30 border border-transparent'
                    }`}
                  >
                    <p className={`text-[10px] font-medium ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                      {day.slice(0, 3)}
                    </p>
                    {dayCompleted ? (
                      <CheckCircle size={14} className="mx-auto mt-1 text-green-500" />
                    ) : hasWorkout ? (
                      <Dumbbell size={12} className={`mx-auto mt-1 ${isToday ? 'text-primary' : 'text-muted-foreground'}`} />
                    ) : (
                      <div className="w-3 h-3 mx-auto mt-1" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid md:grid-cols-3 gap-4">
            <div ref={calendarRef} className="bg-card/80 backdrop-blur-md rounded-xl p-4 border border-primary/30 relative">
              <h3 className="font-bebas text-lg text-primary mb-4 flex items-center gap-2">
                <CalendarIcon size={20} />
                PROGRAMAÇÃO DE TREINOS
              </h3>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  // Do nothing here, we handle click via onDayClick
                }}
                onDayClick={(date, modifiers, e) => {
                  setSelectedDate(date);
                  const target = e.target as HTMLElement;
                  const rect = target.getBoundingClientRect();
                  const calendarRect = calendarRef.current?.getBoundingClientRect();
                  
                  setDateDropdown({
                    date,
                    position: {
                      x: rect.left - (calendarRect?.left || 0) + rect.width / 2,
                      y: rect.bottom - (calendarRect?.top || 0) + 8
                    }
                  });
                }}
                locale={ptBR}
                className="rounded-md border-0 pointer-events-auto"
                modifiers={{
                  hasWorkout: (date) => {
                    const dayIndex = date.getDay();
                    return myPlans.some(plan => {
                      const days = getScheduledDays(plan.id);
                      return days.length === 0 || days.includes(dayIndex);
                    });
                  },
                  today: (date) => isSameDay(date, today)
                }}
                modifiersStyles={{
                  hasWorkout: {
                    backgroundColor: 'hsl(var(--primary) / 0.2)',
                    borderRadius: '50%'
                  },
                  today: {
                    fontWeight: 'bold',
                    border: '2px solid hsl(var(--primary))'
                  }
                }}
              />
              
              {/* Dropdown Menu for Date Actions */}
              <AnimatePresence>
                {dateDropdown && (
                  <>
                    {/* Backdrop */}
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setDateDropdown(null)}
                    />
                    
                    {/* Dropdown */}
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute z-50 bg-popover border border-border rounded-lg shadow-xl p-2 min-w-[220px]"
                      style={{
                        left: Math.min(dateDropdown.position.x - 110, (calendarRef.current?.offsetWidth || 300) - 230),
                        top: dateDropdown.position.y,
                      }}
                    >
                      <div className="px-2 py-1.5 border-b border-border mb-2">
                        <p className="font-bebas text-primary text-sm">
                          {format(dateDropdown.date, "dd 'de' MMMM", { locale: ptBR })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {daysOfWeek[dateDropdown.date.getDay()]}
                        </p>
                      </div>

                      {/* Show available plans for this day */}
                      {myPlans.filter(plan => {
                        const days = getScheduledDays(plan.id);
                        return days.length === 0 || days.includes(dateDropdown.date.getDay());
                      }).length > 0 && isSameDay(dateDropdown.date, today) && (
                        <div className="mb-2">
                          <p className="text-xs text-muted-foreground px-2 mb-1">Iniciar treino:</p>
                          {myPlans.filter(plan => {
                            const days = getScheduledDays(plan.id);
                            return days.length === 0 || days.includes(dateDropdown.date.getDay());
                          }).map(plan => {
                            const status = getWorkoutStatus(plan.id);
                            return (
                              <button
                                key={plan.id}
                                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-left transition-colors ${
                                  status === 'completed' 
                                    ? 'text-muted-foreground cursor-not-allowed' 
                                    : 'hover:bg-primary/10 text-foreground'
                                }`}
                                onClick={() => {
                                  if (status !== 'completed') {
                                    setDateDropdown(null);
                                    startWorkout(plan.id);
                                  }
                                }}
                                disabled={status === 'completed'}
                              >
                                {status === 'completed' ? (
                                  <CheckCircle size={14} className="text-green-500" />
                                ) : status === 'in_progress' ? (
                                  <Play size={14} className="text-yellow-500" />
                                ) : (
                                  <Dumbbell size={14} className="text-primary" />
                                )}
                                <span className={status === 'completed' ? 'line-through' : ''}>
                                  {plan.name}
                                </span>
                                {status === 'completed' && (
                                  <span className="text-xs text-green-500 ml-auto">✓</span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      <div className="border-t border-border pt-2 space-y-1">
                        <button
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-primary/10 transition-colors"
                          onClick={() => {
                            setDateDropdown(null);
                            setActiveTab('create');
                          }}
                        >
                          <Plus size={14} className="text-primary" />
                          <span>Criar Novo Treino</span>
                        </button>
                        <button
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-primary/10 transition-colors"
                          onClick={() => {
                            setDateDropdown(null);
                            setActiveTab('library');
                          }}
                        >
                          <LayoutGrid size={14} className="text-primary" />
                          <span>Ver Biblioteca</span>
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Middle Column - Date & Plans */}
            <div className="space-y-3">
              <div className="bg-gradient-to-br from-primary/20 to-purple-500/20 backdrop-blur-md rounded-xl p-3 border border-primary/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Data</p>
                    <p className="text-lg font-bebas tracking-wider text-primary">
                      {daysOfWeek[selectedDate.getDay()].toUpperCase()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(selectedDate, "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                  <CalendarIcon className="w-8 h-8 text-primary/50" />
                </div>
              </div>

              <div className="bg-card/80 backdrop-blur-md rounded-xl p-3 border border-border/50">
                <h4 className="font-bebas text-sm text-primary mb-2">MEUS PLANOS ({myPlans.length})</h4>
                {myPlans.length === 0 ? (
                  <div className="text-center py-2">
                    <p className="text-xs text-muted-foreground">Nenhum plano</p>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => setActiveTab('create')}
                      className="mt-1 h-7 text-xs"
                    >
                      <Plus size={12} className="mr-1" /> Criar
                    </Button>
                  </div>
                ) : (
                  <ScrollArea className="max-h-[120px]">
                    <div className="space-y-1.5 pr-2">
                      {myPlans.map(plan => {
                        const days = getScheduledDays(plan.id);
                        const isScheduledToday = days.length === 0 || days.includes(selectedDate.getDay());
                        return (
                          <div 
                            key={plan.id}
                            className={`p-2 rounded-lg border text-sm ${isScheduledToday ? 'border-primary/50 bg-primary/5' : 'border-border/50'}`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium truncate text-xs">{plan.name}</span>
                              {isScheduledToday ? (
                                <Badge className="bg-primary/20 text-primary text-[10px] px-1.5 py-0">Hoje</Badge>
                              ) : (
                                <Lock size={10} className="text-muted-foreground flex-shrink-0" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </div>

            {/* Right Column - Muscle Groups Quick Access */}
            <div className="bg-card/80 backdrop-blur-md rounded-xl p-3 border border-border/50">
              <h4 className="font-bebas text-sm text-primary mb-2 flex items-center gap-2">
                <Target size={14} />
                GRUPOS MUSCULARES
              </h4>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'Peito', icon: '🏋️', color: 'from-red-500/20 to-red-600/10', border: 'border-red-500/30' },
                  { id: 'Costas', icon: '💪', color: 'from-blue-500/20 to-blue-600/10', border: 'border-blue-500/30' },
                  { id: 'Ombros', icon: '🏆', color: 'from-orange-500/20 to-orange-600/10', border: 'border-orange-500/30' },
                  { id: 'Bíceps', icon: '💪', color: 'from-purple-500/20 to-purple-600/10', border: 'border-purple-500/30' },
                  { id: 'Tríceps', icon: '🦾', color: 'from-pink-500/20 to-pink-600/10', border: 'border-pink-500/30' },
                  { id: 'Pernas', icon: '🦵', color: 'from-green-500/20 to-green-600/10', border: 'border-green-500/30' },
                  { id: 'Abdômen', icon: '🔥', color: 'from-yellow-500/20 to-yellow-600/10', border: 'border-yellow-500/30' },
                  { id: 'Glúteos', icon: '🍑', color: 'from-rose-500/20 to-rose-600/10', border: 'border-rose-500/30' },
                  { id: 'Cardio', icon: '🏃', color: 'from-cyan-500/20 to-cyan-600/10', border: 'border-cyan-500/30' },
                ].map((group) => (
                  <motion.button
                    key={group.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setActiveTab('library')}
                    className={`p-2 rounded-lg bg-gradient-to-br ${group.color} border ${group.border} hover:shadow-md transition-all`}
                  >
                    <span className="text-lg block">{group.icon}</span>
                    <span className="text-[9px] font-medium text-muted-foreground">{group.id}</span>
                  </motion.button>
                ))}
              </div>
            </div>
          </div>

          {/* Active Workout Rest Timer */}
          <AnimatePresence>
            {activeWorkout?.isResting && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-md"
              >
                <motion.div 
                  className={`text-center p-10 rounded-3xl ${
                    activeWorkout.restTimer <= 3 
                      ? 'animate-rest-complete bg-primary/10 border-2 border-primary' 
                      : 'bg-card/80 border border-border/50'
                  }`}
                  animate={activeWorkout.restTimer <= 3 ? { scale: [1, 1.02, 1] } : {}}
                  transition={{ duration: 0.5, repeat: Infinity }}
                >
                  <motion.div
                    animate={activeWorkout.restTimer === 0 ? { scale: [1, 1.2, 1] } : activeWorkout.restTimer <= 3 ? { rotate: [0, -5, 5, 0] } : {}}
                    transition={{ duration: 0.3, repeat: Infinity }}
                  >
                    {activeWorkout.restTimer === 0 ? (
                      <Bell className="w-20 h-20 mx-auto mb-4 text-green-500 animate-glow-pulse" />
                    ) : activeWorkout.restTimer <= 3 ? (
                      <Timer className="w-20 h-20 mx-auto mb-4 text-yellow-500 animate-pulse-fast" />
                    ) : (
                      <Timer className="w-16 h-16 mx-auto mb-4 text-primary animate-pulse" />
                    )}
                  </motion.div>
                  <motion.p 
                    className={`text-7xl font-bebas mb-2 ${
                      activeWorkout.restTimer === 0 
                        ? 'text-green-500' 
                        : activeWorkout.restTimer <= 3 
                          ? 'text-yellow-500' 
                          : 'text-primary'
                    }`}
                    animate={activeWorkout.restTimer <= 3 ? { scale: [1, 1.1, 1] } : {}}
                    transition={{ duration: 0.5, repeat: Infinity }}
                  >
                    {activeWorkout.restTimer === 0 ? 'PRONTO!' : formatTime(activeWorkout.restTimer)}
                  </motion.p>
                  <p className={`text-xl mb-6 ${
                    activeWorkout.restTimer === 0 
                      ? 'text-green-400 font-bold' 
                      : activeWorkout.restTimer <= 3 
                        ? 'text-yellow-400' 
                        : 'text-muted-foreground'
                  }`}>
                    {activeWorkout.restTimer === 0 
                      ? '🔥 Hora de continuar!' 
                      : activeWorkout.restTimer <= 3 
                        ? '⚡ Prepare-se!' 
                        : 'Tempo de descanso'}
                  </p>
                  <div className="flex gap-3 justify-center">
                    <Button 
                      variant={activeWorkout.restTimer === 0 ? 'default' : 'outline'}
                      onClick={() => setActiveWorkout(prev => prev ? { ...prev, isResting: false, restTimer: 0 } : null)}
                      className={activeWorkout.restTimer === 0 ? 'animate-pulse-fast' : ''}
                    >
                      {activeWorkout.restTimer === 0 ? 'Continuar Treino!' : 'Pular Descanso'}
                    </Button>
                    {soundEnabled && activeWorkout.restTimer > 0 && (
                      <Button variant="ghost" size="icon" onClick={() => setSoundEnabled(false)}>
                        <VolumeX size={16} />
                      </Button>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Workout Reminder Card */}
          <WorkoutReminder />

          {/* Today's Plans - only show if there are plans */}
          {loading ? (
            <p className="text-muted-foreground text-sm">Carregando...</p>
          ) : myPlans.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-bebas text-base text-primary">TREINOS PROGRAMADOS</h3>
              {myPlans.map(plan => renderPlanCard(plan, false))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Video Dialog */}
      <Dialog open={!!videoDialog} onOpenChange={() => setVideoDialog(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="font-bebas text-primary flex items-center gap-2">
              <Video size={20} />
              {videoDialog?.title}
            </DialogTitle>
          </DialogHeader>
          {videoDialog?.url && (
            <YouTubePlayer url={videoDialog.url} title={videoDialog.title} showThumbnail={false} />
          )}
        </DialogContent>
      </Dialog>

      {/* Workout Statistics */}
      {todayLogs.length > 0 && (
        <div className="bg-card/80 backdrop-blur-md rounded-xl p-6 border border-border/50">
          <h3 className="font-bebas text-lg mb-4 flex items-center gap-2">
            <History size={20} className="text-primary" />
            ESTATÍSTICAS DE HOJE
          </h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-primary">
                {todayLogs.filter(l => l.completed_at).length}
              </p>
              <p className="text-xs text-muted-foreground">Treinos Concluídos</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-500">
                {todayLogs.filter(l => l.started_at && !l.completed_at).length}
              </p>
              <p className="text-xs text-muted-foreground">Em Andamento</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-500">
                {completedExerciseLogs.length}
              </p>
              <p className="text-xs text-muted-foreground">Exercícios Feitos</p>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmDialog} onOpenChange={() => setDeleteConfirmDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 size={20} />
              Excluir Plano de Treino
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o plano <strong>"{deleteConfirmDialog?.planName}"</strong>?
              <br /><br />
              Esta ação não pode ser desfeita. Todos os exercícios e configurações deste plano serão removidos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteConfirmDialog && handleDeletePlan(deleteConfirmDialog.planId)}
            >
              Sim, Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Exit Workout Confirmation Dialog */}
      <AlertDialog open={exitConfirmDialog} onOpenChange={setExitConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-primary">
              <Dumbbell size={20} />
              Treino em Andamento
            </AlertDialogTitle>
            <AlertDialogDescription>
              Você tem um treino em andamento com {activeWorkout?.completedExercises.size || 0} exercício(s) concluído(s).
              <br /><br />
              <strong>Deseja finalizar o treino antes de sair?</strong>
              <br />
              Os exercícios já concluídos foram salvos automaticamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel onClick={() => {
              setExitConfirmDialog(false);
              setPendingExitAction(null);
            }}>
              Continuar Treinando
            </AlertDialogCancel>
            <Button
              variant="outline"
              onClick={() => confirmExitWorkout(false)}
            >
              Sair sem Finalizar
            </Button>
            <AlertDialogAction
              className="bg-green-600 hover:bg-green-700"
              onClick={() => confirmExitWorkout(true)}
            >
              <CheckCircle size={16} className="mr-1" />
              Finalizar e Sair
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </motion.div>
  );
};

export default MyWorkouts;
