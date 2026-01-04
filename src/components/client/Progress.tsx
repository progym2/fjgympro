import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { TrendingUp, Dumbbell, Scale, Droplets, Target } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ClientPageHeader from './ClientPageHeader';

const Progress: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalWorkouts: 0,
    weekWorkouts: 0,
    monthWorkouts: 0,
    streak: 0,
    weightChange: 0,
    avgHydration: 0
  });
  const [weightData, setWeightData] = useState<any[]>([]);
  const [workoutData, setWorkoutData] = useState<any[]>([]);

  useEffect(() => {
    if (profile) {
      fetchProgress();
    }
  }, [profile]);

  const fetchProgress = async () => {
    try {
      const today = new Date();
      const weekAgo = subDays(today, 7);
      const monthAgo = subDays(today, 30);

      // Fetch workout logs
      const { data: workouts, error: workoutsError } = await supabase
        .from('workout_logs')
        .select('*')
        .eq('profile_id', profile?.profile_id)
        .not('completed_at', 'is', null)
        .order('workout_date', { ascending: false });

      if (workoutsError) throw workoutsError;

      // Fetch weight records
      const { data: weights, error: weightsError } = await supabase
        .from('weight_records')
        .select('*')
        .eq('profile_id', profile?.profile_id)
        .order('recorded_at', { ascending: true })
        .limit(30);

      if (weightsError) throw weightsError;

      // Fetch hydration for this month
      const { data: hydration, error: hydrationError } = await supabase
        .from('hydration_records')
        .select('*')
        .eq('profile_id', profile?.profile_id)
        .gte('recorded_at', monthAgo.toISOString());

      if (hydrationError) throw hydrationError;

      // Calculate stats
      const weekWorkouts = workouts?.filter(w => new Date(w.workout_date) >= weekAgo).length || 0;
      const monthWorkouts = workouts?.filter(w => new Date(w.workout_date) >= monthAgo).length || 0;

      // Calculate weight change
      let weightChange = 0;
      if (weights && weights.length >= 2) {
        weightChange = weights[weights.length - 1].weight_kg - weights[0].weight_kg;
      }

      // Calculate average daily hydration
      const uniqueDays = new Set(hydration?.map(h => format(new Date(h.recorded_at), 'yyyy-MM-dd')));
      const totalHydration = hydration?.reduce((sum, h) => sum + h.amount_ml, 0) || 0;
      const avgHydration = uniqueDays.size > 0 ? totalHydration / uniqueDays.size : 0;

      // Calculate streak
      let streak = 0;
      if (workouts && workouts.length > 0) {
        const sortedDates = [...new Set(workouts.map(w => w.workout_date))].sort().reverse();
        for (let i = 0; i < sortedDates.length; i++) {
          const expectedDate = format(subDays(today, i), 'yyyy-MM-dd');
          if (sortedDates[i] === expectedDate) {
            streak++;
          } else {
            break;
          }
        }
      }

      setStats({
        totalWorkouts: workouts?.length || 0,
        weekWorkouts,
        monthWorkouts,
        streak,
        weightChange,
        avgHydration
      });

      // Prepare chart data
      setWeightData(weights?.map(w => ({
        date: format(new Date(w.recorded_at), 'dd/MM', { locale: ptBR }),
        peso: w.weight_kg
      })) || []);

      // Group workouts by week
      const weeklyWorkouts: { [key: string]: number } = {};
      workouts?.forEach(w => {
        const weekKey = format(new Date(w.workout_date), 'dd/MM', { locale: ptBR });
        weeklyWorkouts[weekKey] = (weeklyWorkouts[weekKey] || 0) + 1;
      });

      setWorkoutData(
        Object.entries(weeklyWorkouts)
          .slice(-10)
          .map(([date, count]) => ({ date, treinos: count }))
      );

    } catch (error) {
      console.error('Error fetching progress:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full flex flex-col overflow-hidden"
    >
      <ClientPageHeader 
        title="MEU PROGRESSO" 
        icon={<TrendingUp className="w-5 h-5" />} 
        iconColor="text-yellow-500" 
      />

      <div className="flex-1 overflow-auto space-y-6">
        {loading ? (
          <p className="text-muted-foreground">Carregando...</p>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Card className="bg-card/80 backdrop-blur-md border-border/50">
              <CardContent className="p-4 text-center">
                <Dumbbell className="w-8 h-8 mx-auto mb-2 text-primary" />
                <p className="text-2xl font-bold">{stats.totalWorkouts}</p>
                <p className="text-xs text-muted-foreground">Total Treinos</p>
              </CardContent>
            </Card>

            <Card className="bg-card/80 backdrop-blur-md border-border/50">
              <CardContent className="p-4 text-center">
                <Target className="w-8 h-8 mx-auto mb-2 text-green-500" />
                <p className="text-2xl font-bold">{stats.weekWorkouts}</p>
                <p className="text-xs text-muted-foreground">Esta Semana</p>
              </CardContent>
            </Card>

            <Card className="bg-card/80 backdrop-blur-md border-border/50">
              <CardContent className="p-4 text-center">
                <TrendingUp className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
                <p className="text-2xl font-bold">{stats.monthWorkouts}</p>
                <p className="text-xs text-muted-foreground">Este Mês</p>
              </CardContent>
            </Card>

            <Card className="bg-card/80 backdrop-blur-md border-border/50">
              <CardContent className="p-4 text-center">
                <div className="text-2xl mb-2">🔥</div>
                <p className="text-2xl font-bold">{stats.streak}</p>
                <p className="text-xs text-muted-foreground">Dias Seguidos</p>
              </CardContent>
            </Card>

            <Card className="bg-card/80 backdrop-blur-md border-border/50">
              <CardContent className="p-4 text-center">
                <Scale className={`w-8 h-8 mx-auto mb-2 ${stats.weightChange < 0 ? 'text-green-500' : stats.weightChange > 0 ? 'text-red-500' : 'text-muted-foreground'}`} />
                <p className="text-2xl font-bold">
                  {stats.weightChange > 0 ? '+' : ''}{stats.weightChange.toFixed(1)}kg
                </p>
                <p className="text-xs text-muted-foreground">Variação Peso</p>
              </CardContent>
            </Card>

            <Card className="bg-card/80 backdrop-blur-md border-border/50">
              <CardContent className="p-4 text-center">
                <Droplets className="w-8 h-8 mx-auto mb-2 text-cyan-500" />
                <p className="text-2xl font-bold">{Math.round(stats.avgHydration)}ml</p>
                <p className="text-xs text-muted-foreground">Média/Dia Água</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Weight Chart */}
            {weightData.length > 0 && (
              <Card className="bg-card/80 backdrop-blur-md border-border/50">
                <CardHeader>
                  <CardTitle className="font-bebas text-lg flex items-center gap-2">
                    <Scale className="w-5 h-5 text-green-500" />
                    EVOLUÇÃO DO PESO
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={weightData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <XAxis dataKey="date" stroke="#888" fontSize={10} />
                        <YAxis stroke="#888" fontSize={10} domain={['auto', 'auto']} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                        />
                        <Area type="monotone" dataKey="peso" stroke="#22c55e" fill="#22c55e20" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Workout Chart */}
            {workoutData.length > 0 && (
              <Card className="bg-card/80 backdrop-blur-md border-border/50">
                <CardHeader>
                  <CardTitle className="font-bebas text-lg flex items-center gap-2">
                    <Dumbbell className="w-5 h-5 text-primary" />
                    TREINOS POR DIA
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={workoutData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <XAxis dataKey="date" stroke="#888" fontSize={10} />
                        <YAxis stroke="#888" fontSize={10} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                        />
                        <Line type="monotone" dataKey="treinos" stroke="#ef4444" strokeWidth={2} dot={{ fill: '#ef4444' }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Motivational Message */}
          <Card className="bg-gradient-to-br from-primary/20 to-yellow-500/20 border-primary/30">
            <CardContent className="p-6 text-center">
              {stats.streak >= 7 ? (
                <>
                  <div className="text-4xl mb-2">🏆</div>
                  <p className="text-lg font-bebas tracking-wider text-primary">
                    INCRÍVEL! {stats.streak} DIAS SEGUIDOS!
                  </p>
                  <p className="text-muted-foreground">Continue assim, você está arrasando!</p>
                </>
              ) : stats.streak >= 3 ? (
                <>
                  <div className="text-4xl mb-2">💪</div>
                  <p className="text-lg font-bebas tracking-wider text-primary">
                    ÓTIMO TRABALHO!
                  </p>
                  <p className="text-muted-foreground">Você está no caminho certo!</p>
                </>
              ) : (
                <>
                  <div className="text-4xl mb-2">🎯</div>
                  <p className="text-lg font-bebas tracking-wider text-primary">
                    VAMOS COMEÇAR!
                  </p>
                  <p className="text-muted-foreground">Cada treino conta. Comece sua sequência hoje!</p>
                </>
              )}
            </CardContent>
          </Card>
        </>
        )}
      </div>
    </motion.div>
  );
};

export default Progress;
