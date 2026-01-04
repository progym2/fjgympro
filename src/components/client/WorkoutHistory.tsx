import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Calendar, TrendingUp, BarChart3, Dumbbell,
  Clock, Target, Flame, Trophy, ChevronDown, ChevronUp,
  History, Activity, Filter, Download
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell
} from 'recharts';
import { format, subDays, subWeeks, subMonths, startOfWeek, endOfWeek, eachDayOfInterval, parseISO, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ClientPageHeader from './ClientPageHeader';
import FadeScrollList from '@/components/shared/FadeScrollList';

interface WorkoutLog {
  id: string;
  workout_plan_id: string;
  workout_date: string;
  started_at: string | null;
  completed_at: string | null;
  notes: string | null;
  workout_plan?: {
    name: string;
    description: string | null;
  };
}

interface ExerciseLog {
  id: string;
  workout_log_id: string;
  workout_plan_exercise_id: string;
  sets_completed: number;
  reps_completed: number | null;
  weight_used_kg: number | null;
  completed_at: string;
  notes: string | null;
  workout_plan_exercise?: {
    exercise?: {
      name: string;
      muscle_group: string | null;
    };
  };
}

interface WeeklyData {
  week: string;
  workouts: number;
  exercises: number;
  volume: number;
}

interface MuscleGroupData {
  name: string;
  value: number;
  color: string;
}

const muscleGroupColors: { [key: string]: string } = {
  'Peito': '#ef4444',
  'Costas': '#3b82f6',
  'Ombros': '#f97316',
  'Bíceps': '#a855f7',
  'Tríceps': '#ec4899',
  'Pernas': '#22c55e',
  'Abdômen': '#eab308',
  'Glúteos': '#f43f5e',
  'Cardio': '#06b6d4',
};

const WorkoutHistory: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([]);
  const [exerciseLogs, setExerciseLogs] = useState<ExerciseLog[]>([]);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '365d'>('30d');
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [workoutTypeFilter, setWorkoutTypeFilter] = useState<string>('all');

  useEffect(() => {
    if (profile?.profile_id) {
      fetchData();
    }
  }, [profile, timeRange]);

  const getDateRange = () => {
    const now = new Date();
    switch (timeRange) {
      case '7d': return subDays(now, 7);
      case '30d': return subDays(now, 30);
      case '90d': return subDays(now, 90);
      case '365d': return subDays(now, 365);
      default: return subDays(now, 30);
    }
  };

  const fetchData = async () => {
    if (!profile?.profile_id) return;
    setLoading(true);

    try {
      const startDate = format(getDateRange(), 'yyyy-MM-dd');

      // Fetch workout logs
      const { data: logs, error: logsError } = await supabase
        .from('workout_logs')
        .select(`
          *,
          workout_plan:workout_plans (name, description)
        `)
        .eq('profile_id', profile.profile_id)
        .gte('workout_date', startDate)
        .order('workout_date', { ascending: false });

      if (logsError) throw logsError;
      setWorkoutLogs(logs || []);

      // Fetch exercise logs for these workouts
      if (logs && logs.length > 0) {
        const logIds = logs.map(l => l.id);
        const { data: exerciseData, error: exerciseError } = await supabase
          .from('workout_exercise_logs')
          .select(`
            *,
            workout_plan_exercise:workout_plan_exercises (
              exercise:exercises (name, muscle_group)
            )
          `)
          .in('workout_log_id', logIds)
          .order('completed_at', { ascending: false });

        if (!exerciseError) {
          setExerciseLogs(exerciseData as ExerciseLog[] || []);
        }
      } else {
        setExerciseLogs([]);
      }
    } catch (error) {
      console.error('Error fetching workout history:', error);
      toast.error('Erro ao carregar histórico');
    } finally {
      setLoading(false);
    }
  };

  // Calculate weekly frequency data
  const getWeeklyFrequencyData = (): WeeklyData[] => {
    const weeks: WeeklyData[] = [];
    const now = new Date();
    const numWeeks = timeRange === '7d' ? 1 : timeRange === '30d' ? 4 : timeRange === '90d' ? 12 : 52;

    for (let i = numWeeks - 1; i >= 0; i--) {
      const weekStart = startOfWeek(subWeeks(now, i), { locale: ptBR });
      const weekEnd = endOfWeek(subWeeks(now, i), { locale: ptBR });
      
      const weekLogs = workoutLogs.filter(log => {
        const logDate = parseISO(log.workout_date);
        return logDate >= weekStart && logDate <= weekEnd && log.completed_at;
      });

      const weekExercises = exerciseLogs.filter(ex => {
        const log = workoutLogs.find(l => l.id === ex.workout_log_id);
        if (!log) return false;
        const logDate = parseISO(log.workout_date);
        return logDate >= weekStart && logDate <= weekEnd;
      });

      const volume = weekExercises.reduce((acc, ex) => {
        const sets = ex.sets_completed || 0;
        const reps = ex.reps_completed || 0;
        const weight = ex.weight_used_kg || 0;
        return acc + (sets * reps * weight);
      }, 0);

      weeks.push({
        week: format(weekStart, "dd/MM", { locale: ptBR }),
        workouts: weekLogs.length,
        exercises: weekExercises.length,
        volume: Math.round(volume)
      });
    }

    return weeks;
  };

  // Calculate muscle group distribution
  const getMuscleGroupData = (): MuscleGroupData[] => {
    const muscleGroups: { [key: string]: number } = {};

    exerciseLogs.forEach(log => {
      const muscleGroup = log.workout_plan_exercise?.exercise?.muscle_group || 'Outros';
      muscleGroups[muscleGroup] = (muscleGroups[muscleGroup] || 0) + 1;
    });

    return Object.entries(muscleGroups)
      .map(([name, value]) => ({
        name,
        value,
        color: muscleGroupColors[name] || '#6b7280'
      }))
      .sort((a, b) => b.value - a.value);
  };

  // Calculate load progression by muscle group
  const getLoadProgressionData = () => {
    const progressionByMuscle: { [muscle: string]: { date: string; avgWeight: number }[] } = {};

    exerciseLogs.forEach(log => {
      const muscleGroup = log.workout_plan_exercise?.exercise?.muscle_group;
      const weight = log.weight_used_kg;
      if (!muscleGroup || !weight) return;

      const workoutLog = workoutLogs.find(l => l.id === log.workout_log_id);
      if (!workoutLog) return;

      if (!progressionByMuscle[muscleGroup]) {
        progressionByMuscle[muscleGroup] = [];
      }

      progressionByMuscle[muscleGroup].push({
        date: workoutLog.workout_date,
        avgWeight: weight
      });
    });

    // Aggregate by date
    const aggregated: { [muscle: string]: { [date: string]: number[] } } = {};
    Object.entries(progressionByMuscle).forEach(([muscle, data]) => {
      aggregated[muscle] = {};
      data.forEach(({ date, avgWeight }) => {
        if (!aggregated[muscle][date]) {
          aggregated[muscle][date] = [];
        }
        aggregated[muscle][date].push(avgWeight);
      });
    });

    // Convert to chart format
    const result: { [muscle: string]: { date: string; weight: number }[] } = {};
    Object.entries(aggregated).forEach(([muscle, dateData]) => {
      result[muscle] = Object.entries(dateData)
        .map(([date, weights]) => ({
          date: format(parseISO(date), 'dd/MM', { locale: ptBR }),
          weight: Math.round(weights.reduce((a, b) => a + b, 0) / weights.length)
        }))
        .sort((a, b) => a.date.localeCompare(b.date));
    });

    return result;
  };

  // Calculate daily workout data for heatmap-style view
  const getDailyWorkoutData = () => {
    const startDate = getDateRange();
    const days = eachDayOfInterval({ start: startDate, end: new Date() });
    
    return days.map(day => {
      const dayLogs = workoutLogs.filter(log => isSameDay(parseISO(log.workout_date), day));
      const completed = dayLogs.filter(l => l.completed_at).length;
      return {
        date: format(day, 'dd/MM', { locale: ptBR }),
        fullDate: format(day, 'yyyy-MM-dd'),
        workouts: completed,
        exercises: exerciseLogs.filter(ex => {
          const log = dayLogs.find(l => l.id === ex.workout_log_id);
          return log !== undefined;
        }).length
      };
    });
  };

  // Get unique workout types for filter
  const workoutTypes = Array.from(
    new Set(workoutLogs.map(log => log.workout_plan?.name).filter(Boolean))
  ).sort() as string[];

  // Filter workout logs by type
  const filteredWorkoutLogs = workoutTypeFilter === 'all' 
    ? workoutLogs 
    : workoutLogs.filter(log => log.workout_plan?.name === workoutTypeFilter);

  // Filter exercise logs based on filtered workout logs
  const filteredExerciseLogs = workoutTypeFilter === 'all'
    ? exerciseLogs
    : exerciseLogs.filter(ex => 
        filteredWorkoutLogs.some(log => log.id === ex.workout_log_id)
      );

  // Stats calculations (using filtered data)
  const completedWorkouts = filteredWorkoutLogs.filter(l => l.completed_at).length;
  const totalExercises = filteredExerciseLogs.length;
  const totalVolume = filteredExerciseLogs.reduce((acc, ex) => {
    return acc + ((ex.sets_completed || 0) * (ex.reps_completed || 0) * (ex.weight_used_kg || 0));
  }, 0);
  const avgWorkoutsPerWeek = timeRange === '7d' ? completedWorkouts : 
    Math.round((completedWorkouts / (parseInt(timeRange) / 7)) * 10) / 10;

  const weeklyData = getWeeklyFrequencyData();
  const muscleGroupData = getMuscleGroupData();
  const loadProgression = getLoadProgressionData();
  const dailyData = getDailyWorkoutData();

  const formatDuration = (startedAt: string | null, completedAt: string | null) => {
    if (!startedAt || !completedAt) return '-';
    const start = new Date(startedAt);
    const end = new Date(completedAt);
    const diffMs = end.getTime() - start.getTime();
    const diffMins = Math.round(diffMs / 60000);
    if (diffMins < 60) return `${diffMins} min`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}min`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col overflow-hidden">
      <ClientPageHeader 
        title="EVOLUÇÃO & HISTÓRICO" 
        icon={<BarChart3 className="w-5 h-5" />} 
        iconColor="text-primary" 
      />

      <FadeScrollList className="flex-1 space-y-6 pr-1">

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-muted-foreground" />
          <Select value={timeRange} onValueChange={(v) => setTimeRange(v as typeof timeRange)}>
            <SelectTrigger className="w-[160px] bg-card border-border">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="90d">Últimos 3 meses</SelectItem>
              <SelectItem value="365d">Último ano</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {workoutTypes.length > 0 && (
          <div className="flex items-center gap-2">
            <Dumbbell size={18} className="text-muted-foreground" />
            <Select value={workoutTypeFilter} onValueChange={setWorkoutTypeFilter}>
              <SelectTrigger className="w-[180px] bg-card border-border">
                <SelectValue placeholder="Tipo de treino" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="all">Todos os treinos</SelectItem>
                {workoutTypes.map(type => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {workoutTypeFilter !== 'all' && (
          <Badge 
            variant="secondary" 
            className="gap-1 cursor-pointer hover:bg-destructive/20"
            onClick={() => setWorkoutTypeFilter('all')}
          >
            {workoutTypeFilter}
            <span className="text-muted-foreground hover:text-destructive">×</span>
          </Badge>
        )}
      </div>

      {/* Stats Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/20 to-purple-500/20 border-primary/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <Dumbbell size={20} className="text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">{completedWorkouts}</p>
                <p className="text-xs text-muted-foreground">Treinos Concluídos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/20">
                <Target size={20} className="text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-500">{totalExercises}</p>
                <p className="text-xs text-muted-foreground">Exercícios Feitos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/20 to-amber-500/20 border-orange-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/20">
                <Flame size={20} className="text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-500">{Math.round(totalVolume / 1000)}k</p>
                <p className="text-xs text-muted-foreground">Volume Total (kg)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border-cyan-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/20">
                <TrendingUp size={20} className="text-cyan-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-cyan-500">{avgWorkoutsPerWeek}</p>
                <p className="text-xs text-muted-foreground">Média/Semana</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 size={16} />
            <span className="hidden sm:inline">Visão Geral</span>
          </TabsTrigger>
          <TabsTrigger value="muscles" className="flex items-center gap-2">
            <Target size={16} />
            <span className="hidden sm:inline">Músculos</span>
          </TabsTrigger>
          <TabsTrigger value="progression" className="flex items-center gap-2">
            <TrendingUp size={16} />
            <span className="hidden sm:inline">Progressão</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History size={16} />
            <span className="hidden sm:inline">Histórico</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Weekly Frequency Chart */}
          <Card className="bg-card/80 backdrop-blur-md border-border/50">
            <CardHeader>
              <CardTitle className="font-bebas text-lg text-primary flex items-center gap-2">
                <Calendar size={20} />
                FREQUÊNCIA SEMANAL
              </CardTitle>
            </CardHeader>
            <CardContent>
              {weeklyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                    <Bar dataKey="workouts" name="Treinos" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="exercises" name="Exercícios" fill="hsl(142.1 76.2% 36.3%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  Nenhum dado disponível para o período selecionado
                </div>
              )}
            </CardContent>
          </Card>

          {/* Volume Chart */}
          <Card className="bg-card/80 backdrop-blur-md border-border/50">
            <CardHeader>
              <CardTitle className="font-bebas text-lg text-primary flex items-center gap-2">
                <Flame size={20} />
                VOLUME TOTAL (kg)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {weeklyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      formatter={(value: number) => [`${value.toLocaleString()} kg`, 'Volume']}
                    />
                    <Area
                      type="monotone"
                      dataKey="volume"
                      name="Volume"
                      stroke="hsl(24.6 95% 53.1%)"
                      fill="hsl(24.6 95% 53.1% / 0.3)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  Nenhum dado disponível
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Muscles Tab */}
        <TabsContent value="muscles" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Pie Chart */}
            <Card className="bg-card/80 backdrop-blur-md border-border/50">
              <CardHeader>
                <CardTitle className="font-bebas text-lg text-primary flex items-center gap-2">
                  <Target size={20} />
                  DISTRIBUIÇÃO POR GRUPO MUSCULAR
                </CardTitle>
              </CardHeader>
              <CardContent>
                {muscleGroupData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={muscleGroupData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {muscleGroupData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                        formatter={(value: number) => [`${value} exercícios`, 'Total']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    Nenhum dado disponível
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Muscle Group List */}
            <Card className="bg-card/80 backdrop-blur-md border-border/50">
              <CardHeader>
                <CardTitle className="font-bebas text-lg text-primary">DETALHES POR GRUPO</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-3">
                    {muscleGroupData.map((group, index) => (
                      <div key={group.name} className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/50">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: group.color }}
                          />
                          <span className="font-medium">{group.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{group.value} exercícios</Badge>
                          <Badge variant="outline">
                            {totalExercises > 0 ? Math.round((group.value / totalExercises) * 100) : 0}%
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Progression Tab */}
        <TabsContent value="progression" className="space-y-6">
          {Object.keys(loadProgression).length > 0 ? (
            Object.entries(loadProgression).map(([muscle, data]) => (
              <Card key={muscle} className="bg-card/80 backdrop-blur-md border-border/50">
                <CardHeader>
                  <CardTitle className="font-bebas text-lg flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: muscleGroupColors[muscle] || '#6b7280' }}
                    />
                    <span style={{ color: muscleGroupColors[muscle] || '#6b7280' }}>
                      {muscle.toUpperCase()}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={data}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} unit="kg" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                        formatter={(value: number) => [`${value} kg`, 'Carga Média']}
                      />
                      <Line
                        type="monotone"
                        dataKey="weight"
                        stroke={muscleGroupColors[muscle] || '#6b7280'}
                        strokeWidth={2}
                        dot={{ fill: muscleGroupColors[muscle] || '#6b7280', r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="bg-card/80 backdrop-blur-md border-border/50">
              <CardContent className="p-8 text-center">
                <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhum dado de progressão disponível</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Continue treinando para ver sua evolução de cargas
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          {/* Filter summary */}
          {workoutTypeFilter !== 'all' && (
            <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg border border-primary/20">
              <Filter size={16} className="text-primary" />
              <span className="text-sm">
                Mostrando <span className="font-medium text-primary">{filteredWorkoutLogs.length}</span> treinos de "{workoutTypeFilter}"
              </span>
            </div>
          )}

          {filteredWorkoutLogs.length > 0 ? (
            <ScrollArea className="h-[600px]">
              <div className="space-y-3 pr-4">
                {filteredWorkoutLogs.map(log => {
                  const logExercises = filteredExerciseLogs.filter(e => e.workout_log_id === log.id);
                  const isExpanded = expandedLog === log.id;
                  const totalLogVolume = logExercises.reduce((acc, ex) => {
                    return acc + ((ex.sets_completed || 0) * (ex.reps_completed || 0) * (ex.weight_used_kg || 0));
                  }, 0);

                  return (
                    <Card key={log.id} className="bg-card/80 backdrop-blur-md border-border/50">
                      <CardContent className="p-4">
                        <div 
                          className="flex items-center justify-between cursor-pointer"
                          onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${log.completed_at ? 'bg-green-500/20' : 'bg-yellow-500/20'}`}>
                              {log.completed_at ? (
                                <Trophy size={20} className="text-green-500" />
                              ) : (
                                <Clock size={20} className="text-yellow-500" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium">
                                {log.workout_plan?.name || 'Treino'}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {format(parseISO(log.workout_date), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right text-sm">
                              <p className="text-muted-foreground">
                                {logExercises.length} exercícios
                              </p>
                              <p className="text-muted-foreground">
                                {formatDuration(log.started_at, log.completed_at)}
                              </p>
                            </div>
                            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                          </div>
                        </div>

                        {isExpanded && logExercises.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="mt-4 pt-4 border-t border-border/50 space-y-2"
                          >
                            {logExercises.map(ex => (
                              <div 
                                key={ex.id}
                                className="flex items-center justify-between p-2 rounded-lg bg-background/50"
                              >
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="w-2 h-2 rounded-full"
                                    style={{ 
                                      backgroundColor: muscleGroupColors[ex.workout_plan_exercise?.exercise?.muscle_group || ''] || '#6b7280'
                                    }}
                                  />
                                  <span className="text-sm">
                                    {ex.workout_plan_exercise?.exercise?.name || 'Exercício'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Badge variant="outline" className="text-xs">
                                    {ex.sets_completed}x{ex.reps_completed || '-'}
                                  </Badge>
                                  {ex.weight_used_kg && (
                                    <Badge variant="secondary" className="text-xs">
                                      {ex.weight_used_kg}kg
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            ))}
                            <div className="pt-2 flex justify-between text-sm">
                              <span className="text-muted-foreground">Volume total:</span>
                              <span className="font-medium text-primary">
                                {totalLogVolume.toLocaleString()} kg
                              </span>
                            </div>
                          </motion.div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          ) : (
            <Card className="bg-card/80 backdrop-blur-md border-border/50">
              <CardContent className="p-8 text-center">
                <History className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {workoutTypeFilter !== 'all' 
                    ? `Nenhum treino "${workoutTypeFilter}" encontrado neste período`
                    : 'Nenhum treino registrado'
                  }
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  {workoutTypeFilter !== 'all' 
                    ? 'Tente ajustar os filtros ou período'
                    : 'Comece a treinar para ver seu histórico aqui'
                  }
                </p>
                {workoutTypeFilter !== 'all' ? (
                  <Button 
                    className="mt-4"
                    variant="outline"
                    onClick={() => setWorkoutTypeFilter('all')}
                  >
                    <Filter size={16} className="mr-2" />
                    Limpar Filtro
                  </Button>
                ) : (
                  <Button 
                    className="mt-4"
                    onClick={() => navigate('/client/workouts')}
                  >
                    <Dumbbell size={16} className="mr-2" />
                    Ir para Treinos
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
      </FadeScrollList>
    </motion.div>
  );
};

export default WorkoutHistory;
