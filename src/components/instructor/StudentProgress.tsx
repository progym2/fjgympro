import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  TrendingUp, Scale, Loader2, Users, 
  ArrowUp, ArrowDown, Minus, Calendar,
  Dumbbell, Flame, BarChart3, Target
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAudio } from '@/contexts/AudioContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell
} from 'recharts';
import { format, subDays, subWeeks, startOfWeek, endOfWeek, parseISO, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import InstructorPageHeader from './InstructorPageHeader';

interface Student {
  id: string;
  username: string;
  full_name: string | null;
}

interface WeightRecord {
  id: string;
  weight_kg: number;
  body_fat_percentage: number | null;
  muscle_mass_kg: number | null;
  recorded_at: string;
}

interface WorkoutLog {
  id: string;
  workout_date: string;
  started_at: string | null;
  completed_at: string | null;
  workout_plan_id: string | null;
}

interface ExerciseLog {
  id: string;
  workout_log_id: string;
  sets_completed: number;
  reps_completed: number | null;
  weight_used_kg: number | null;
  completed_at: string;
  workout_plan_exercise?: {
    exercise?: {
      name: string;
      muscle_group: string | null;
    };
  };
}

const muscleColors: Record<string, string> = {
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

const StudentProgress: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { profile } = useAuth();
  const { playClickSound } = useAudio();

  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string>(searchParams.get('student') || '');
  const [weightRecords, setWeightRecords] = useState<WeightRecord[]>([]);
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([]);
  const [exerciseLogs, setExerciseLogs] = useState<ExerciseLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (profile?.profile_id) {
      fetchStudents();
    }
  }, [profile?.profile_id]);

  useEffect(() => {
    if (selectedStudent) {
      fetchStudentData();
    }
  }, [selectedStudent]);

  const fetchStudents = async () => {
    if (!profile?.profile_id) return;

    setLoading(true);
    try {
      const { data } = await supabase
        .from('instructor_clients')
        .select(`
          profiles!instructor_clients_client_id_fkey (
            id,
            username,
            full_name
          )
        `)
        .eq('instructor_id', profile.profile_id)
        .eq('is_active', true)
        .eq('link_status', 'accepted');

      if (data) {
        setStudents(data.map((item: any) => item.profiles));
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentData = async () => {
    if (!selectedStudent) return;

    setLoadingData(true);
    try {
      const startDate = format(subDays(new Date(), 90), 'yyyy-MM-dd');

      // Fetch weight records
      const { data: weightData } = await supabase
        .from('weight_records')
        .select('*')
        .eq('profile_id', selectedStudent)
        .order('recorded_at', { ascending: true });

      setWeightRecords(weightData || []);

      // Fetch workout logs
      const { data: logsData } = await supabase
        .from('workout_logs')
        .select('*')
        .eq('profile_id', selectedStudent)
        .gte('workout_date', startDate)
        .order('workout_date', { ascending: false });

      setWorkoutLogs(logsData || []);

      // Fetch exercise logs
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

        setExerciseLogs((exerciseData as ExerciseLog[]) || []);
      } else {
        setExerciseLogs([]);
      }
    } catch (error) {
      console.error('Error fetching student data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const selectedStudentData = students.find(s => s.id === selectedStudent);

  // Weight chart data
  const weightChartData = weightRecords.map(record => ({
    date: format(new Date(record.recorded_at), 'dd/MM', { locale: ptBR }),
    peso: record.weight_kg,
    gordura: record.body_fat_percentage,
    massa: record.muscle_mass_kg,
  }));

  // Weekly frequency data
  const weeklyFrequencyData = useMemo(() => {
    const weeks: { week: string; workouts: number; exercises: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const weekStart = startOfWeek(subWeeks(new Date(), i), { locale: ptBR });
      const weekEnd = endOfWeek(subWeeks(new Date(), i), { locale: ptBR });
      
      const weekLogs = workoutLogs.filter(log => {
        const logDate = parseISO(log.workout_date);
        return logDate >= weekStart && logDate <= weekEnd && log.completed_at;
      });

      weeks.push({
        week: format(weekStart, "dd/MM", { locale: ptBR }),
        workouts: weekLogs.length,
        exercises: exerciseLogs.filter(ex => 
          weekLogs.some(l => l.id === ex.workout_log_id)
        ).length
      });
    }
    return weeks;
  }, [workoutLogs, exerciseLogs]);

  // Muscle group distribution
  const muscleGroupData = useMemo(() => {
    const groups: Record<string, number> = {};
    exerciseLogs.forEach(log => {
      const muscle = log.workout_plan_exercise?.exercise?.muscle_group || 'Outros';
      groups[muscle] = (groups[muscle] || 0) + 1;
    });
    return Object.entries(groups)
      .map(([name, value]) => ({
        name,
        value,
        color: muscleColors[name] || '#6b7280'
      }))
      .sort((a, b) => b.value - a.value);
  }, [exerciseLogs]);

  // Load progression by exercise (top exercises)
  const loadProgressionData = useMemo(() => {
    const exerciseLoads: Record<string, { date: string; weight: number }[]> = {};
    
    exerciseLogs.forEach(log => {
      const exerciseName = log.workout_plan_exercise?.exercise?.name;
      const weight = log.weight_used_kg;
      if (!exerciseName || !weight) return;
      
      const workoutLog = workoutLogs.find(l => l.id === log.workout_log_id);
      if (!workoutLog) return;
      
      if (!exerciseLoads[exerciseName]) {
        exerciseLoads[exerciseName] = [];
      }
      exerciseLoads[exerciseName].push({
        date: workoutLog.workout_date,
        weight
      });
    });

    // Get top 5 exercises by frequency
    const topExercises = Object.entries(exerciseLoads)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 5);

    // Create chart data
    const dates = [...new Set(
      topExercises.flatMap(([_, data]) => data.map(d => d.date))
    )].sort();

    return dates.map(date => {
      const point: Record<string, any> = {
        date: format(parseISO(date), 'dd/MM', { locale: ptBR })
      };
      topExercises.forEach(([name, data]) => {
        const entry = data.find(d => d.date === date);
        if (entry) {
          point[name] = entry.weight;
        }
      });
      return point;
    });
  }, [exerciseLogs, workoutLogs]);

  const topExerciseNames = useMemo(() => {
    const counts: Record<string, number> = {};
    exerciseLogs.forEach(log => {
      const name = log.workout_plan_exercise?.exercise?.name;
      if (name && log.weight_used_kg) {
        counts[name] = (counts[name] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name]) => name);
  }, [exerciseLogs]);

  // Stats
  const completedWorkouts = workoutLogs.filter(l => l.completed_at).length;
  const totalExercises = exerciseLogs.length;
  const totalVolume = exerciseLogs.reduce((acc, ex) => {
    return acc + ((ex.sets_completed || 0) * (ex.reps_completed || 0) * (ex.weight_used_kg || 0));
  }, 0);
  const avgWorkoutsPerWeek = Math.round((completedWorkouts / 12) * 10) / 10;

  const getProgressIndicator = () => {
    if (weightRecords.length < 2) return null;
    const first = weightRecords[0].weight_kg;
    const last = weightRecords[weightRecords.length - 1].weight_kg;
    const diff = last - first;

    if (diff > 0) {
      return { icon: ArrowUp, color: 'text-red-500', text: `+${diff.toFixed(1)}kg`, label: 'Ganho' };
    } else if (diff < 0) {
      return { icon: ArrowDown, color: 'text-green-500', text: `${diff.toFixed(1)}kg`, label: 'Perda' };
    }
    return { icon: Minus, color: 'text-yellow-500', text: '0kg', label: 'Estável' };
  };

  const progress = getProgressIndicator();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-green-500" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col h-full"
    >
      <InstructorPageHeader 
        title="PROGRESSO DOS ALUNOS"
        icon={<TrendingUp className="w-6 h-6" />}
        iconColor="text-yellow-500"
      />
      
      <div className="flex-1 overflow-auto space-y-4">
        {/* Student Selector */}
        <div className="bg-card/80 backdrop-blur-md rounded-xl p-4 border border-border/50">
          <div className="flex items-center gap-3 mb-3">
            <Users className="w-5 h-5 text-yellow-500" />
            <h3 className="font-bebas text-base text-yellow-500">SELECIONAR ALUNO</h3>
          </div>
          <Select value={selectedStudent} onValueChange={setSelectedStudent}>
            <SelectTrigger className="bg-background/50 border-border/50">
              <SelectValue placeholder="Selecione um aluno" />
            </SelectTrigger>
            <SelectContent>
              {students.map((student) => (
                <SelectItem key={student.id} value={student.id}>
                  {student.full_name || student.username}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!selectedStudent ? (
          <div className="bg-card/80 backdrop-blur-md rounded-xl p-8 border border-border/50 text-center">
            <Users className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">
              Selecione um aluno para ver seu progresso.
            </p>
          </div>
        ) : loadingData ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-gradient-to-br from-primary/20 to-purple-500/20 border border-primary/30 rounded-xl p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Dumbbell className="w-4 h-4 text-primary" />
                  <span className="text-xs">Treinos (90d)</span>
                </div>
                <span className="text-2xl font-bebas text-primary">{completedWorkouts}</span>
              </div>
              <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-xl p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Target className="w-4 h-4 text-green-500" />
                  <span className="text-xs">Exercícios</span>
                </div>
                <span className="text-2xl font-bebas text-green-500">{totalExercises}</span>
              </div>
              <div className="bg-gradient-to-br from-orange-500/20 to-amber-500/20 border border-orange-500/30 rounded-xl p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Flame className="w-4 h-4 text-orange-500" />
                  <span className="text-xs">Volume (kg)</span>
                </div>
                <span className="text-2xl font-bebas text-orange-500">{Math.round(totalVolume / 1000)}k</span>
              </div>
              <div className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 rounded-xl p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <BarChart3 className="w-4 h-4 text-cyan-500" />
                  <span className="text-xs">Média/Semana</span>
                </div>
                <span className="text-2xl font-bebas text-cyan-500">{avgWorkoutsPerWeek}</span>
              </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4 mb-4">
                <TabsTrigger value="overview" className="text-xs sm:text-sm">Visão Geral</TabsTrigger>
                <TabsTrigger value="frequency" className="text-xs sm:text-sm">Frequência</TabsTrigger>
                <TabsTrigger value="loads" className="text-xs sm:text-sm">Cargas</TabsTrigger>
                <TabsTrigger value="weight" className="text-xs sm:text-sm">Peso</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-4">
                {/* Muscle Group Distribution */}
                <div className="bg-card/80 backdrop-blur-md rounded-xl p-4 border border-border/50">
                  <h3 className="font-bebas text-lg text-yellow-500 mb-4 flex items-center gap-2">
                    <Target size={18} />
                    DISTRIBUIÇÃO POR GRUPO MUSCULAR
                  </h3>
                  {muscleGroupData.length > 0 ? (
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={muscleGroupData}
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={80}
                              paddingAngle={2}
                              dataKey="value"
                            >
                              {muscleGroupData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip 
                              contentStyle={{
                                backgroundColor: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px',
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex flex-wrap gap-2 content-start">
                        {muscleGroupData.map(({ name, value, color }) => (
                          <Badge 
                            key={name}
                            style={{ backgroundColor: `${color}20`, borderColor: `${color}50`, color }}
                            className="text-xs"
                          >
                            {name}: {value}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhum exercício registrado ainda
                    </p>
                  )}
                </div>

                {/* Recent Activity Summary */}
                <div className="bg-card/80 backdrop-blur-md rounded-xl p-4 border border-border/50">
                  <h3 className="font-bebas text-lg text-yellow-500 mb-4 flex items-center gap-2">
                    <Calendar size={18} />
                    RESUMO DE ATIVIDADE (ÚLTIMAS 12 SEMANAS)
                  </h3>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={weeklyFrequencyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="workouts"
                          name="Treinos"
                          stroke="hsl(var(--primary))"
                          fill="hsl(var(--primary))"
                          fillOpacity={0.3}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </TabsContent>

              {/* Frequency Tab */}
              <TabsContent value="frequency" className="space-y-4">
                <div className="bg-card/80 backdrop-blur-md rounded-xl p-4 border border-border/50">
                  <h3 className="font-bebas text-lg text-yellow-500 mb-4 flex items-center gap-2">
                    <BarChart3 size={18} />
                    FREQUÊNCIA DE TREINOS POR SEMANA
                  </h3>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={weeklyFrequencyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                        <Legend />
                        <Bar dataKey="workouts" name="Treinos" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="exercises" name="Exercícios" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </TabsContent>

              {/* Loads Tab */}
              <TabsContent value="loads" className="space-y-4">
                <div className="bg-card/80 backdrop-blur-md rounded-xl p-4 border border-border/50">
                  <h3 className="font-bebas text-lg text-yellow-500 mb-4 flex items-center gap-2">
                    <TrendingUp size={18} />
                    EVOLUÇÃO DE CARGAS (TOP 5 EXERCÍCIOS)
                  </h3>
                  {loadProgressionData.length > 0 ? (
                    <>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {topExerciseNames.map((name, i) => (
                          <Badge key={name} variant="outline" className="text-xs">
                            {name}
                          </Badge>
                        ))}
                      </div>
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={loadProgressionData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} unit="kg" />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px',
                              }}
                            />
                            <Legend />
                            {topExerciseNames.map((name, i) => (
                              <Line
                                key={name}
                                type="monotone"
                                dataKey={name}
                                stroke={Object.values(muscleColors)[i % Object.values(muscleColors).length]}
                                strokeWidth={2}
                                dot={{ r: 3 }}
                                connectNulls
                              />
                            ))}
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhum registro de carga ainda
                    </p>
                  )}
                </div>
              </TabsContent>

              {/* Weight Tab */}
              <TabsContent value="weight" className="space-y-4">
                {weightRecords.length === 0 ? (
                  <div className="bg-card/80 backdrop-blur-md rounded-xl p-8 border border-border/50 text-center">
                    <Scale className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">
                      {selectedStudentData?.full_name || selectedStudentData?.username} ainda não tem registros de peso.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Weight Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-card/80 backdrop-blur-md rounded-xl p-4 border border-border/50">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                          <Scale className="w-4 h-4" />
                          <span className="text-xs">Peso Atual</span>
                        </div>
                        <span className="text-2xl font-bebas text-foreground">
                          {weightRecords[weightRecords.length - 1].weight_kg}kg
                        </span>
                      </div>
                      <div className="bg-card/80 backdrop-blur-md rounded-xl p-4 border border-border/50">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                          <Scale className="w-4 h-4" />
                          <span className="text-xs">Peso Inicial</span>
                        </div>
                        <span className="text-2xl font-bebas text-foreground">
                          {weightRecords[0].weight_kg}kg
                        </span>
                      </div>
                      {progress && (
                        <div className="bg-card/80 backdrop-blur-md rounded-xl p-4 border border-border/50">
                          <div className="flex items-center gap-2 text-muted-foreground mb-1">
                            <progress.icon className={`w-4 h-4 ${progress.color}`} />
                            <span className="text-xs">{progress.label}</span>
                          </div>
                          <span className={`text-2xl font-bebas ${progress.color}`}>
                            {progress.text}
                          </span>
                        </div>
                      )}
                      <div className="bg-card/80 backdrop-blur-md rounded-xl p-4 border border-border/50">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                          <Calendar className="w-4 h-4" />
                          <span className="text-xs">Registros</span>
                        </div>
                        <span className="text-2xl font-bebas text-foreground">
                          {weightRecords.length}
                        </span>
                      </div>
                    </div>

                    {/* Weight Chart */}
                    <div className="bg-card/80 backdrop-blur-md rounded-xl p-4 border border-border/50">
                      <h3 className="font-bebas text-lg text-yellow-500 mb-4">EVOLUÇÃO DO PESO</h3>
                      <div className="h-64 sm:h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={weightChartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                            <YAxis 
                              stroke="hsl(var(--muted-foreground))" 
                              fontSize={12}
                              domain={['dataMin - 2', 'dataMax + 2']}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px',
                              }}
                            />
                            <Legend />
                            <Line
                              type="monotone"
                              dataKey="peso"
                              name="Peso (kg)"
                              stroke="hsl(142, 76%, 36%)"
                              strokeWidth={2}
                              dot={{ fill: 'hsl(142, 76%, 36%)' }}
                              activeDot={{ r: 6 }}
                            />
                            {weightChartData.some(d => d.gordura) && (
                              <Line
                                type="monotone"
                                dataKey="gordura"
                                name="Gordura (%)"
                                stroke="hsl(0, 84%, 60%)"
                                strokeWidth={2}
                                dot={{ fill: 'hsl(0, 84%, 60%)' }}
                              />
                            )}
                            {weightChartData.some(d => d.massa) && (
                              <Line
                                type="monotone"
                                dataKey="massa"
                                name="Massa (kg)"
                                stroke="hsl(217, 91%, 60%)"
                                strokeWidth={2}
                                dot={{ fill: 'hsl(217, 91%, 60%)' }}
                              />
                            )}
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Weight Records Table */}
                    <div className="bg-card/80 backdrop-blur-md rounded-xl border border-border/50 overflow-hidden">
                      <div className="p-4 border-b border-border/50">
                        <h3 className="font-bebas text-lg text-yellow-500">HISTÓRICO DE REGISTROS</h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="text-left text-sm text-muted-foreground border-b border-border/50">
                              <th className="p-3">Data</th>
                              <th className="p-3">Peso</th>
                              <th className="p-3">Gordura</th>
                              <th className="p-3">Massa</th>
                            </tr>
                          </thead>
                          <tbody>
                            {[...weightRecords].reverse().slice(0, 10).map((record) => (
                              <tr key={record.id} className="border-b border-border/50 last:border-0">
                                <td className="p-3 text-sm">
                                  {format(new Date(record.recorded_at), 'dd/MM/yyyy', { locale: ptBR })}
                                </td>
                                <td className="p-3 text-sm font-medium">{record.weight_kg}kg</td>
                                <td className="p-3 text-sm text-muted-foreground">
                                  {record.body_fat_percentage ? `${record.body_fat_percentage}%` : '-'}
                                </td>
                                <td className="p-3 text-sm text-muted-foreground">
                                  {record.muscle_mass_kg ? `${record.muscle_mass_kg}kg` : '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </motion.div>
  );
};

export default StudentProgress;
