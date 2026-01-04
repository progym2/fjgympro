import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, Dumbbell, Loader2, ArrowLeft, History,
  ArrowUp, ArrowDown, Minus, Calendar
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Exercise {
  id: string;
  name: string;
  muscle_group: string | null;
}

interface LoadRecord {
  id: string;
  weight_used_kg: number | null;
  sets_completed: number;
  reps_completed: number | null;
  completed_at: string;
  workout_date: string;
}

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

const ExerciseLoadHistory: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { playClickSound } = useAudio();

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<string>('');
  const [loadRecords, setLoadRecords] = useState<LoadRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingRecords, setLoadingRecords] = useState(false);

  useEffect(() => {
    fetchExercises();
  }, [profile?.profile_id]);

  useEffect(() => {
    if (selectedExercise) {
      fetchLoadRecords();
    }
  }, [selectedExercise]);

  const fetchExercises = async () => {
    if (!profile?.profile_id) return;

    setLoading(true);
    try {
      // Get all exercises the user has logged
      const { data: logData } = await supabase
        .from('workout_exercise_logs')
        .select(`
          workout_plan_exercise_id,
          workout_plan_exercises!inner (
            exercise_id,
            exercises!inner (
              id,
              name,
              muscle_group
            )
          ),
          workout_logs!inner (
            profile_id
          )
        `)
        .eq('workout_logs.profile_id', profile.profile_id);

      if (logData) {
        const exerciseMap = new Map<string, Exercise>();
        logData.forEach((log: any) => {
          const exercise = log.workout_plan_exercises?.exercises;
          if (exercise && !exerciseMap.has(exercise.id)) {
            exerciseMap.set(exercise.id, {
              id: exercise.id,
              name: exercise.name,
              muscle_group: exercise.muscle_group
            });
          }
        });
        setExercises(Array.from(exerciseMap.values()).sort((a, b) => a.name.localeCompare(b.name)));
      }
    } catch (error) {
      console.error('Error fetching exercises:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLoadRecords = async () => {
    if (!selectedExercise || !profile?.profile_id) return;

    setLoadingRecords(true);
    try {
      const { data, error } = await supabase
        .from('workout_exercise_logs')
        .select(`
          id,
          weight_used_kg,
          sets_completed,
          reps_completed,
          completed_at,
          workout_logs!inner (
            profile_id,
            workout_date
          ),
          workout_plan_exercises!inner (
            exercise_id
          )
        `)
        .eq('workout_logs.profile_id', profile.profile_id)
        .eq('workout_plan_exercises.exercise_id', selectedExercise)
        .order('completed_at', { ascending: true });

      if (error) throw error;

      const records: LoadRecord[] = (data || []).map((item: any) => ({
        id: item.id,
        weight_used_kg: item.weight_used_kg,
        sets_completed: item.sets_completed,
        reps_completed: item.reps_completed,
        completed_at: item.completed_at,
        workout_date: item.workout_logs?.workout_date
      }));

      setLoadRecords(records);
    } catch (error) {
      console.error('Error fetching load records:', error);
    } finally {
      setLoadingRecords(false);
    }
  };

  const selectedExerciseData = exercises.find(e => e.id === selectedExercise);

  const chartData = loadRecords
    .filter(r => r.weight_used_kg !== null)
    .map(record => ({
      date: format(new Date(record.workout_date || record.completed_at), 'dd/MM', { locale: ptBR }),
      peso: record.weight_used_kg,
      series: record.sets_completed,
      reps: record.reps_completed,
    }));

  const getProgressIndicator = () => {
    const recordsWithWeight = loadRecords.filter(r => r.weight_used_kg !== null);
    if (recordsWithWeight.length < 2) return null;
    
    const first = recordsWithWeight[0].weight_used_kg!;
    const last = recordsWithWeight[recordsWithWeight.length - 1].weight_used_kg!;
    const diff = last - first;

    if (diff > 0) {
      return { icon: ArrowUp, color: 'text-green-500', text: `+${diff.toFixed(1)}kg`, label: 'Aumento' };
    } else if (diff < 0) {
      return { icon: ArrowDown, color: 'text-red-500', text: `${diff.toFixed(1)}kg`, label: 'Redução' };
    }
    return { icon: Minus, color: 'text-yellow-500', text: '0kg', label: 'Estável' };
  };

  const progress = getProgressIndicator();
  const maxWeight = loadRecords.reduce((max, r) => Math.max(max, r.weight_used_kg || 0), 0);
  const avgWeight = loadRecords.filter(r => r.weight_used_kg).length > 0 
    ? loadRecords.reduce((sum, r) => sum + (r.weight_used_kg || 0), 0) / loadRecords.filter(r => r.weight_used_kg).length
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => { playClickSound(); navigate(-1); }}
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h2 className="text-xl sm:text-2xl font-bebas text-primary flex items-center gap-2">
            <History className="w-6 h-6" />
            HISTÓRICO DE CARGAS
          </h2>
        </div>
        <Select value={selectedExercise} onValueChange={setSelectedExercise}>
          <SelectTrigger className="w-full sm:w-72 bg-background/50 border-border/50">
            <SelectValue placeholder="Selecione um exercício" />
          </SelectTrigger>
          <SelectContent>
            {exercises.map((exercise) => (
              <SelectItem key={exercise.id} value={exercise.id}>
                <div className="flex items-center gap-2">
                  <span>{exercise.name}</span>
                  {exercise.muscle_group && (
                    <Badge variant="outline" className={`text-xs ${muscleGroupColors[exercise.muscle_group] || ''}`}>
                      {exercise.muscle_group}
                    </Badge>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {exercises.length === 0 ? (
        <Card className="bg-card/80 backdrop-blur-md border-border/50">
          <CardContent className="p-8 text-center">
            <Dumbbell className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">
              Você ainda não registrou nenhum exercício.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Complete seus treinos registrando os pesos utilizados para ver o histórico aqui.
            </p>
          </CardContent>
        </Card>
      ) : !selectedExercise ? (
        <Card className="bg-card/80 backdrop-blur-md border-border/50">
          <CardContent className="p-8 text-center">
            <TrendingUp className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">
              Selecione um exercício para ver seu histórico de cargas.
            </p>
          </CardContent>
        </Card>
      ) : loadingRecords ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : loadRecords.length === 0 ? (
        <Card className="bg-card/80 backdrop-blur-md border-border/50">
          <CardContent className="p-8 text-center">
            <Dumbbell className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">
              Nenhum registro de carga para {selectedExerciseData?.name}.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Exercise Info */}
          {selectedExerciseData && (
            <Card className="bg-card/80 backdrop-blur-md border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <Dumbbell className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bebas text-lg">{selectedExerciseData.name}</h3>
                    {selectedExerciseData.muscle_group && (
                      <Badge variant="outline" className={muscleGroupColors[selectedExerciseData.muscle_group] || ''}>
                        {selectedExerciseData.muscle_group}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="bg-card/80 backdrop-blur-md border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Dumbbell className="w-4 h-4" />
                  <span className="text-xs">Carga Atual</span>
                </div>
                <span className="text-2xl font-bebas text-foreground">
                  {loadRecords[loadRecords.length - 1]?.weight_used_kg || 0}kg
                </span>
              </CardContent>
            </Card>
            <Card className="bg-card/80 backdrop-blur-md border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-xs">Carga Máxima</span>
                </div>
                <span className="text-2xl font-bebas text-foreground">
                  {maxWeight}kg
                </span>
              </CardContent>
            </Card>
            {progress && (
              <Card className="bg-card/80 backdrop-blur-md border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <progress.icon className={`w-4 h-4 ${progress.color}`} />
                    <span className="text-xs">{progress.label}</span>
                  </div>
                  <span className={`text-2xl font-bebas ${progress.color}`}>
                    {progress.text}
                  </span>
                </CardContent>
              </Card>
            )}
            <Card className="bg-card/80 backdrop-blur-md border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Calendar className="w-4 h-4" />
                  <span className="text-xs">Registros</span>
                </div>
                <span className="text-2xl font-bebas text-foreground">
                  {loadRecords.length}
                </span>
              </CardContent>
            </Card>
          </div>

          {/* Chart */}
          {chartData.length > 0 && (
            <Card className="bg-card/80 backdrop-blur-md border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-bebas">Evolução de Carga</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 sm:h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="date" 
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                      />
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
                        labelStyle={{ color: 'hsl(var(--foreground))' }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="peso"
                        name="Peso (kg)"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={{ fill: 'hsl(var(--primary))' }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Records Table */}
          <Card className="bg-card/80 backdrop-blur-md border-border/50 overflow-hidden">
            <CardHeader className="pb-2 border-b border-border/50">
              <CardTitle className="text-lg font-bebas">Histórico de Registros</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm text-muted-foreground border-b border-border/50 bg-muted/30">
                      <th className="p-3">Data</th>
                      <th className="p-3">Peso</th>
                      <th className="p-3">Séries</th>
                      <th className="p-3">Reps</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...loadRecords].reverse().slice(0, 20).map((record) => (
                      <tr key={record.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="p-3 text-sm">
                          {format(new Date(record.workout_date || record.completed_at), 'dd/MM/yyyy', { locale: ptBR })}
                        </td>
                        <td className="p-3 text-sm font-medium text-primary">
                          {record.weight_used_kg ? `${record.weight_used_kg}kg` : '-'}
                        </td>
                        <td className="p-3 text-sm text-muted-foreground">
                          {record.sets_completed}x
                        </td>
                        <td className="p-3 text-sm text-muted-foreground">
                          {record.reps_completed || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </motion.div>
  );
};

export default ExerciseLoadHistory;
