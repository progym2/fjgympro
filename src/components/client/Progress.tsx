import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Dumbbell, Scale, Droplets, Target, ChevronDown, ArrowLeft, BarChart3, Calendar, Flame, Award } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ClientPageHeader from './ClientPageHeader';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useEscapeBack } from '@/hooks/useEscapeBack';

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

  // Section collapse states
  const [statsExpanded, setStatsExpanded] = useState(true);
  const [chartsExpanded, setChartsExpanded] = useState(true);
  const [motivationExpanded, setMotivationExpanded] = useState(true);

  // ESC to go back
  useEscapeBack({ to: '/client' });

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
      {/* Back button */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border/30">
        <div className="flex items-center gap-3 p-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/client')}
            className="h-8 px-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Voltar
          </Button>
        </div>
      </div>

      <ClientPageHeader 
        title="MEU PROGRESSO" 
        icon={<TrendingUp className="w-5 h-5" />} 
        iconColor="text-yellow-500" 
      />

      <div className="flex-1 overflow-auto space-y-4 p-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <TrendingUp className="w-8 h-8 text-primary" />
            </motion.div>
          </div>
        ) : (
          <>
            {/* Stats Section - Collapsible */}
            <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-card via-card to-primary/5">
              <Collapsible open={statsExpanded} onOpenChange={setStatsExpanded}>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/20 transition-colors p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-gradient-to-br from-yellow-500/30 to-yellow-500/10 border border-yellow-500/20">
                          <BarChart3 className="w-5 h-5 text-yellow-500" />
                        </div>
                        <div>
                          <h3 className="font-bebas text-xl tracking-wide text-foreground">ESTATÍSTICAS</h3>
                          <p className="text-xs text-muted-foreground">
                            Resumo do seu progresso
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                          {stats.totalWorkouts} treinos
                        </Badge>
                        <motion.div
                          animate={{ rotate: statsExpanded ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        </motion.div>
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <CardContent className="pt-0 px-4 pb-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05 }}
                      >
                        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 hover:shadow-lg transition-shadow">
                          <CardContent className="p-4 text-center">
                            <Dumbbell className="w-7 h-7 mx-auto mb-2 text-primary" />
                            <p className="text-2xl font-bold text-foreground">{stats.totalWorkouts}</p>
                            <p className="text-xs text-muted-foreground">Total Treinos</p>
                          </CardContent>
                        </Card>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                      >
                        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20 hover:shadow-lg transition-shadow">
                          <CardContent className="p-4 text-center">
                            <Target className="w-7 h-7 mx-auto mb-2 text-green-500" />
                            <p className="text-2xl font-bold text-foreground">{stats.weekWorkouts}</p>
                            <p className="text-xs text-muted-foreground">Esta Semana</p>
                          </CardContent>
                        </Card>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                      >
                        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20 hover:shadow-lg transition-shadow">
                          <CardContent className="p-4 text-center">
                            <Calendar className="w-7 h-7 mx-auto mb-2 text-amber-500" />
                            <p className="text-2xl font-bold text-foreground">{stats.monthWorkouts}</p>
                            <p className="text-xs text-muted-foreground">Este Mês</p>
                          </CardContent>
                        </Card>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                      >
                        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/20 hover:shadow-lg transition-shadow">
                          <CardContent className="p-4 text-center">
                            <Flame className="w-7 h-7 mx-auto mb-2 text-orange-500" />
                            <p className="text-2xl font-bold text-foreground">{stats.streak}</p>
                            <p className="text-xs text-muted-foreground">Dias Seguidos</p>
                          </CardContent>
                        </Card>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25 }}
                      >
                        <Card className={`bg-gradient-to-br ${stats.weightChange < 0 ? 'from-green-500/10 to-green-500/5 border-green-500/20' : stats.weightChange > 0 ? 'from-rose-500/10 to-rose-500/5 border-rose-500/20' : 'from-muted/10 to-muted/5 border-border/20'} hover:shadow-lg transition-shadow`}>
                          <CardContent className="p-4 text-center">
                            <Scale className={`w-7 h-7 mx-auto mb-2 ${stats.weightChange < 0 ? 'text-green-500' : stats.weightChange > 0 ? 'text-rose-500' : 'text-muted-foreground'}`} />
                            <p className="text-2xl font-bold text-foreground">
                              {stats.weightChange > 0 ? '+' : ''}{stats.weightChange.toFixed(1)}kg
                            </p>
                            <p className="text-xs text-muted-foreground">Variação Peso</p>
                          </CardContent>
                        </Card>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                      >
                        <Card className="bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 border-cyan-500/20 hover:shadow-lg transition-shadow">
                          <CardContent className="p-4 text-center">
                            <Droplets className="w-7 h-7 mx-auto mb-2 text-cyan-500" />
                            <p className="text-2xl font-bold text-foreground">{Math.round(stats.avgHydration)}ml</p>
                            <p className="text-xs text-muted-foreground">Média/Dia Água</p>
                          </CardContent>
                        </Card>
                      </motion.div>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>

            {/* Charts Section - Collapsible */}
            {(weightData.length > 0 || workoutData.length > 0) && (
              <Card className="overflow-hidden border-blue-500/20 bg-gradient-to-br from-card via-card to-blue-500/5">
                <Collapsible open={chartsExpanded} onOpenChange={setChartsExpanded}>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/20 transition-colors p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500/30 to-blue-500/10 border border-blue-500/20">
                            <TrendingUp className="w-5 h-5 text-blue-500" />
                          </div>
                          <div>
                            <h3 className="font-bebas text-xl tracking-wide text-foreground">GRÁFICOS</h3>
                            <p className="text-xs text-muted-foreground">
                              Visualize sua evolução
                            </p>
                          </div>
                        </div>
                        <motion.div
                          animate={{ rotate: chartsExpanded ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        </motion.div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <CardContent className="pt-0 px-4 pb-4 space-y-4">
                      {/* Weight Chart */}
                      {weightData.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                        >
                          <Card className="bg-gradient-to-br from-green-500/5 to-transparent border-green-500/20">
                            <CardHeader className="pb-2">
                              <CardTitle className="font-bebas text-base flex items-center gap-2 text-foreground">
                                <Scale className="w-4 h-4 text-green-500" />
                                EVOLUÇÃO DO PESO
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0">
                              <div className="h-44">
                                <ResponsiveContainer width="100%" height="100%">
                                  <AreaChart data={weightData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" />
                                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} domain={['auto', 'auto']} />
                                    <Tooltip 
                                      contentStyle={{ 
                                        backgroundColor: 'hsl(var(--card))', 
                                        border: '1px solid hsl(var(--border))',
                                        borderRadius: '8px'
                                      }}
                                    />
                                    <Area type="monotone" dataKey="peso" stroke="#22c55e" fill="rgba(34, 197, 94, 0.2)" />
                                  </AreaChart>
                                </ResponsiveContainer>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      )}

                      {/* Workout Chart */}
                      {workoutData.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1 }}
                        >
                          <Card className="bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
                            <CardHeader className="pb-2">
                              <CardTitle className="font-bebas text-base flex items-center gap-2 text-foreground">
                                <Dumbbell className="w-4 h-4 text-primary" />
                                TREINOS POR DIA
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0">
                              <div className="h-44">
                                <ResponsiveContainer width="100%" height="100%">
                                  <LineChart data={workoutData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" />
                                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
                                    <Tooltip 
                                      contentStyle={{ 
                                        backgroundColor: 'hsl(var(--card))', 
                                        border: '1px solid hsl(var(--border))',
                                        borderRadius: '8px'
                                      }}
                                    />
                                    <Line type="monotone" dataKey="treinos" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: 'hsl(var(--primary))' }} />
                                  </LineChart>
                                </ResponsiveContainer>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            )}

            {/* Motivational Message - Collapsible */}
            <Card className="overflow-hidden border-amber-500/20 bg-gradient-to-br from-card via-card to-amber-500/5">
              <Collapsible open={motivationExpanded} onOpenChange={setMotivationExpanded}>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/20 transition-colors p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500/30 to-amber-500/10 border border-amber-500/20">
                          <Award className="w-5 h-5 text-amber-500" />
                        </div>
                        <div>
                          <h3 className="font-bebas text-xl tracking-wide text-foreground">MOTIVAÇÃO</h3>
                          <p className="text-xs text-muted-foreground">
                            Sua mensagem de incentivo
                          </p>
                        </div>
                      </div>
                      <motion.div
                        animate={{ rotate: motivationExpanded ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      </motion.div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <CardContent className="pt-0 px-4 pb-4">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-gradient-to-br from-primary/20 to-amber-500/20 rounded-xl p-6 text-center border border-primary/20"
                    >
                      {stats.streak >= 7 ? (
                        <>
                          <motion.div 
                            className="text-5xl mb-3"
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ repeat: Infinity, duration: 2 }}
                          >
                            🏆
                          </motion.div>
                          <p className="text-lg font-bebas tracking-wider text-primary">
                            INCRÍVEL! {stats.streak} DIAS SEGUIDOS!
                          </p>
                          <p className="text-muted-foreground mt-1">Continue assim, você está arrasando!</p>
                        </>
                      ) : stats.streak >= 3 ? (
                        <>
                          <motion.div 
                            className="text-5xl mb-3"
                            animate={{ rotate: [0, 10, -10, 0] }}
                            transition={{ repeat: Infinity, duration: 1.5 }}
                          >
                            💪
                          </motion.div>
                          <p className="text-lg font-bebas tracking-wider text-primary">
                            ÓTIMO TRABALHO!
                          </p>
                          <p className="text-muted-foreground mt-1">Você está no caminho certo!</p>
                        </>
                      ) : (
                        <>
                          <motion.div 
                            className="text-5xl mb-3"
                            animate={{ y: [0, -5, 0] }}
                            transition={{ repeat: Infinity, duration: 1 }}
                          >
                            🎯
                          </motion.div>
                          <p className="text-lg font-bebas tracking-wider text-primary">
                            VAMOS COMEÇAR!
                          </p>
                          <p className="text-muted-foreground mt-1">Cada treino conta. Comece sua sequência hoje!</p>
                        </>
                      )}
                    </motion.div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          </>
        )}
      </div>
    </motion.div>
  );
};

export default Progress;
