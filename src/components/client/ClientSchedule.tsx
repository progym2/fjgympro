import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar as CalendarIcon, ArrowLeft, Dumbbell, CheckCircle, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, startOfMonth, endOfMonth, isSameDay, isBefore, isAfter, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import WorkoutDayLog from '@/components/shared/WorkoutDayLog';

interface WorkoutLog {
  id: string;
  workout_date: string;
  completed_at: string | null;
  started_at: string | null;
  workout_plan_id: string | null;
}

interface WorkoutPlan {
  id: string;
  name: string;
}

const ClientSchedule: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  useEffect(() => {
    if (profile) {
      fetchData();
    }
  }, [profile, selectedMonth]);

  const fetchData = async () => {
    try {
      const monthStart = startOfMonth(selectedMonth);
      const monthEnd = endOfMonth(selectedMonth);
      const startDate = format(monthStart, 'yyyy-MM-dd');
      const endDate = format(monthEnd, 'yyyy-MM-dd');

      const { data: logsData, error: logsError } = await supabase
        .from('workout_logs')
        .select('*')
        .eq('profile_id', profile?.profile_id)
        .gte('workout_date', startDate)
        .lte('workout_date', endDate)
        .order('workout_date', { ascending: false });

      if (logsError) throw logsError;
      setLogs(logsData || []);

      const { data: plansData, error: plansError } = await supabase
        .from('workout_plans')
        .select('id, name')
        .or(`created_by.eq.${profile?.profile_id},assigned_to.eq.${profile?.profile_id}`)
        .eq('is_active', true);

      if (plansError) throw plansError;
      setPlans(plansData || []);
    } catch (error) {
      console.error('Error fetching schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPlanName = (planId: string | null) => {
    if (!planId) return 'Treino';
    const plan = plans.find(p => p.id === planId);
    return plan?.name || 'Treino';
  };

  // Get dates with workouts for calendar highlighting
  const datesWithWorkouts = useMemo(() => {
    const completed: Date[] = [];
    const inProgress: Date[] = [];
    
    logs.forEach(log => {
      const date = parseISO(log.workout_date);
      if (log.completed_at) {
        completed.push(date);
      } else {
        inProgress.push(date);
      }
    });
    
    return { completed, inProgress };
  }, [logs]);

  // Split logs into completed and scheduled
  const { completedLogs, scheduledLogs } = useMemo(() => {
    const today = new Date();
    const completed = logs.filter(l => l.completed_at);
    const scheduled = logs.filter(l => !l.completed_at);
    
    return {
      completedLogs: completed.sort((a, b) => 
        new Date(b.workout_date).getTime() - new Date(a.workout_date).getTime()
      ),
      scheduledLogs: scheduled.sort((a, b) => 
        new Date(b.workout_date).getTime() - new Date(a.workout_date).getTime()
      )
    };
  }, [logs]);

  const handleMonthChange = (direction: 'prev' | 'next') => {
    const newMonth = new Date(selectedMonth);
    if (direction === 'prev') {
      newMonth.setMonth(newMonth.getMonth() - 1);
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1);
    }
    setSelectedMonth(newMonth);
  };

  // Custom day rendering for calendar
  const modifiers = {
    completed: datesWithWorkouts.completed,
    inProgress: datesWithWorkouts.inProgress,
  };

  const modifiersClassNames = {
    completed: 'bg-green-500/30 text-green-400 font-bold',
    inProgress: 'bg-yellow-500/30 text-yellow-400 font-bold',
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CalendarIcon className="w-6 h-6 text-purple-500" />
          <h2 className="text-2xl font-bebas text-purple-500 tracking-wider">AGENDA</h2>
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate('/client')}>
          <ArrowLeft size={16} className="mr-1" /> Voltar
        </Button>
      </div>

      {/* Mini Calendar */}
      <div className="bg-card/80 backdrop-blur-md rounded-xl p-4 border border-border/50">
        <div className="flex items-center justify-between mb-3">
          <Button variant="ghost" size="icon" onClick={() => handleMonthChange('prev')}>
            <ChevronLeft size={18} />
          </Button>
          <h3 className="font-bebas text-lg capitalize">
            {format(selectedMonth, 'MMMM yyyy', { locale: ptBR })}
          </h3>
          <Button variant="ghost" size="icon" onClick={() => handleMonthChange('next')}>
            <ChevronRight size={18} />
          </Button>
        </div>
        
        <Calendar
          mode="single"
          month={selectedMonth}
          onMonthChange={setSelectedMonth}
          locale={ptBR}
          modifiers={modifiers}
          modifiersClassNames={modifiersClassNames}
          className="rounded-md border-0 w-full pointer-events-auto [&_.rdp-months]:justify-center [&_.rdp-month]:w-full [&_.rdp-table]:w-full [&_.rdp-cell]:p-0 [&_.rdp-head_cell]:w-full [&_.rdp-day]:w-full [&_.rdp-day]:h-9 [&_.rdp-day]:text-sm"
          classNames={{
            months: "flex flex-col",
            month: "space-y-2",
            caption: "hidden",
            nav: "hidden",
            table: "w-full border-collapse",
            head_row: "flex w-full",
            head_cell: "text-muted-foreground rounded-md w-full font-normal text-[0.7rem]",
            row: "flex w-full mt-1",
            cell: "h-9 w-full text-center text-sm relative",
            day: "h-9 w-full p-0 font-normal rounded-lg hover:bg-accent transition-colors",
            day_selected: "bg-primary text-primary-foreground hover:bg-primary",
            day_today: "bg-primary/20 text-primary font-bold ring-1 ring-primary",
            day_outside: "text-muted-foreground/30",
          }}
        />

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-3 pt-3 border-t border-border/30">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-green-500/50" />
            <span className="text-xs text-muted-foreground">Concluído</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
            <span className="text-xs text-muted-foreground">Em andamento</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-primary/50" />
            <span className="text-xs text-muted-foreground">Hoje</span>
          </div>
        </div>
      </div>

      {/* Workout Lists */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Completed Workouts */}
        <div className="bg-card/80 backdrop-blur-md rounded-xl p-4 border border-border/50">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <h3 className="font-bebas text-base text-green-500">TREINOS CONCLUÍDOS</h3>
            <Badge variant="secondary" className="text-xs ml-auto">{completedLogs.length}</Badge>
          </div>
          
          {loading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-14 bg-muted/30 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : completedLogs.length === 0 ? (
            <p className="text-muted-foreground text-center py-6 text-sm">
              Nenhum treino concluído este mês
            </p>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {completedLogs.map((log) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-3 p-3 bg-green-500/5 border border-green-500/20 rounded-lg"
                >
                  <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{getPlanName(log.workout_plan_id)}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(parseISO(log.workout_date), "dd/MM/yyyy", { locale: ptBR })}
                      {log.completed_at && (
                        <span className="ml-2 text-green-500">
                          às {format(new Date(log.completed_at), 'HH:mm')}
                        </span>
                      )}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* In Progress / Scheduled Workouts */}
        <div className="bg-card/80 backdrop-blur-md rounded-xl p-4 border border-border/50">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-5 h-5 text-yellow-500" />
            <h3 className="font-bebas text-base text-yellow-500">EM ANDAMENTO</h3>
            <Badge variant="secondary" className="text-xs ml-auto">{scheduledLogs.length}</Badge>
          </div>
          
          {loading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-14 bg-muted/30 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : scheduledLogs.length === 0 ? (
            <p className="text-muted-foreground text-center py-6 text-sm">
              Nenhum treino em andamento
            </p>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {scheduledLogs.map((log) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-3 p-3 bg-yellow-500/5 border border-yellow-500/20 rounded-lg"
                >
                  <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                    <Dumbbell className="w-5 h-5 text-yellow-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{getPlanName(log.workout_plan_id)}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(parseISO(log.workout_date), "dd/MM/yyyy", { locale: ptBR })}
                      {log.started_at && (
                        <span className="ml-2 text-yellow-500">
                          iniciado às {format(new Date(log.started_at), 'HH:mm')}
                        </span>
                      )}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-green-500">{completedLogs.length}</div>
          <div className="text-xs text-muted-foreground">Treinos concluídos</div>
        </div>
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-yellow-500">{scheduledLogs.length}</div>
          <div className="text-xs text-muted-foreground">Em andamento</div>
        </div>
      </div>

      {/* Workout Day Log */}
      {profile?.profile_id && (
        <div className="bg-card/80 backdrop-blur-md rounded-xl p-4 border border-border/50">
          <WorkoutDayLog 
            profileId={profile.profile_id} 
            maxItems={30}
            showTitle={true}
          />
        </div>
      )}
    </motion.div>
  );
};

export default ClientSchedule;
