import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, Calendar, Flame, Beef, Wheat, Droplets,
  ChevronLeft, ChevronRight, Target, Trophy
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import { format, subDays, startOfWeek, endOfWeek, eachDayOfInterval, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MealPlan {
  id: string;
  name: string;
  total_calories: number | null;
  protein_grams: number | null;
  carbs_grams: number | null;
  fat_grams: number | null;
  created_at: string;
}

interface DailyData {
  date: string;
  dayName: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  hydration: number;
}

const NutritionCharts: React.FC = () => {
  const { profile } = useAuth();
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [goals, setGoals] = useState({
    calories: 2000,
    protein: 150,
    carbs: 200,
    fat: 70,
    hydration: 2000
  });

  useEffect(() => {
    if (profile?.profile_id) {
      fetchData();
    }
  }, [profile?.profile_id, viewMode, currentDate]);

  const fetchData = async () => {
    if (!profile?.profile_id) return;
    setLoading(true);

    try {
      // Determine date range
      let startDate: Date;
      let endDate: Date;
      
      if (viewMode === 'week') {
        startDate = startOfWeek(currentDate, { weekStartsOn: 1 });
        endDate = endOfWeek(currentDate, { weekStartsOn: 1 });
      } else {
        startDate = startOfMonth(currentDate);
        endDate = endOfMonth(currentDate);
      }

      const days = eachDayOfInterval({ start: startDate, end: endDate });

      // Fetch meal plans in range
      const { data: plans } = await supabase
        .from('meal_plans')
        .select('*')
        .eq('created_by', profile.profile_id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      // Fetch hydration records
      const { data: hydrationRecords } = await supabase
        .from('hydration_records')
        .select('*')
        .eq('profile_id', profile.profile_id)
        .gte('recorded_at', startDate.toISOString())
        .lte('recorded_at', endDate.toISOString());

      // Fetch hydration settings for goals
      const { data: hydrationSettings } = await supabase
        .from('hydration_settings')
        .select('daily_goal_ml')
        .eq('profile_id', profile.profile_id)
        .maybeSingle();

      if (hydrationSettings?.daily_goal_ml) {
        setGoals(prev => ({ ...prev, hydration: hydrationSettings.daily_goal_ml }));
      }

      // Aggregate data by day
      const aggregatedData: DailyData[] = days.map(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        
        // Sum meal plans for this day
        const dayPlans = (plans || []).filter(p => 
          format(new Date(p.created_at), 'yyyy-MM-dd') === dayStr
        );
        
        const dayCalories = dayPlans.reduce((sum, p) => sum + (p.total_calories || 0), 0);
        const dayProtein = dayPlans.reduce((sum, p) => sum + (p.protein_grams || 0), 0);
        const dayCarbs = dayPlans.reduce((sum, p) => sum + (p.carbs_grams || 0), 0);
        const dayFat = dayPlans.reduce((sum, p) => sum + (p.fat_grams || 0), 0);
        
        // Sum hydration for this day
        const dayHydration = (hydrationRecords || [])
          .filter(h => format(new Date(h.recorded_at), 'yyyy-MM-dd') === dayStr)
          .reduce((sum, h) => sum + h.amount_ml, 0);

        return {
          date: dayStr,
          dayName: format(day, viewMode === 'week' ? 'EEE' : 'dd', { locale: ptBR }),
          calories: dayCalories,
          protein: dayProtein,
          carbs: dayCarbs,
          fat: dayFat,
          hydration: dayHydration
        };
      });

      setDailyData(aggregatedData);
    } catch (error) {
      console.error('Error fetching nutrition data:', error);
    } finally {
      setLoading(false);
    }
  };

  const navigatePeriod = (direction: 'prev' | 'next') => {
    if (viewMode === 'week') {
      setCurrentDate(prev => direction === 'prev' ? subDays(prev, 7) : subDays(prev, -7));
    } else {
      setCurrentDate(prev => direction === 'prev' ? subMonths(prev, 1) : subMonths(prev, -1));
    }
  };

  // Calculate averages and totals
  const averages = {
    calories: Math.round(dailyData.reduce((sum, d) => sum + d.calories, 0) / Math.max(dailyData.length, 1)),
    protein: Math.round(dailyData.reduce((sum, d) => sum + d.protein, 0) / Math.max(dailyData.length, 1)),
    carbs: Math.round(dailyData.reduce((sum, d) => sum + d.carbs, 0) / Math.max(dailyData.length, 1)),
    fat: Math.round(dailyData.reduce((sum, d) => sum + d.fat, 0) / Math.max(dailyData.length, 1)),
    hydration: Math.round(dailyData.reduce((sum, d) => sum + d.hydration, 0) / Math.max(dailyData.length, 1))
  };

  const daysOnTarget = dailyData.filter(d => 
    d.calories >= goals.calories * 0.8 && d.calories <= goals.calories * 1.1
  ).length;

  const periodLabel = viewMode === 'week' 
    ? `${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'dd MMM', { locale: ptBR })} - ${format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'dd MMM', { locale: ptBR })}`
    : format(currentDate, 'MMMM yyyy', { locale: ptBR });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover/95 backdrop-blur-sm p-3 rounded-lg border border-border shadow-lg">
          <p className="font-medium text-sm mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-xs" style={{ color: entry.color }}>
              {entry.name}: {entry.value}{entry.name === 'Hidratação' ? 'ml' : entry.name === 'Calorias' ? ' kcal' : 'g'}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button 
            variant={viewMode === 'week' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setViewMode('week')}
          >
            Semana
          </Button>
          <Button 
            variant={viewMode === 'month' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setViewMode('month')}
          >
            Mês
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigatePeriod('prev')}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium min-w-32 text-center capitalize">{periodLabel}</span>
          <Button variant="ghost" size="icon" onClick={() => navigatePeriod('next')}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="bg-gradient-to-br from-orange-500/10 to-yellow-500/10 border-orange-500/30">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Flame className="w-4 h-4 text-orange-500" />
              <span className="text-xs text-muted-foreground">Média Calorias</span>
            </div>
            <p className="text-xl font-bold text-orange-500">{averages.calories}</p>
            <Progress 
              value={Math.min((averages.calories / goals.calories) * 100, 100)} 
              className="h-1 mt-2"
              indicatorClassName="bg-orange-500"
            />
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-red-500/10 to-pink-500/10 border-red-500/30">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Beef className="w-4 h-4 text-red-500" />
              <span className="text-xs text-muted-foreground">Proteína</span>
            </div>
            <p className="text-xl font-bold text-red-500">{averages.protein}g</p>
            <Progress 
              value={Math.min((averages.protein / goals.protein) * 100, 100)} 
              className="h-1 mt-2"
              indicatorClassName="bg-red-500"
            />
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/30">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Wheat className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">Carbos</span>
            </div>
            <p className="text-xl font-bold text-blue-500">{averages.carbs}g</p>
            <Progress 
              value={Math.min((averages.carbs / goals.carbs) * 100, 100)} 
              className="h-1 mt-2"
              indicatorClassName="bg-blue-500"
            />
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-yellow-500/10 to-amber-500/10 border-yellow-500/30">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Droplets className="w-4 h-4 text-yellow-500" />
              <span className="text-xs text-muted-foreground">Gordura</span>
            </div>
            <p className="text-xl font-bold text-yellow-500">{averages.fat}g</p>
            <Progress 
              value={Math.min((averages.fat / goals.fat) * 100, 100)} 
              className="h-1 mt-2"
              indicatorClassName="bg-yellow-500"
            />
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border-cyan-500/30">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="w-4 h-4 text-cyan-500" />
              <span className="text-xs text-muted-foreground">Dias na Meta</span>
            </div>
            <p className="text-xl font-bold text-cyan-500">{daysOnTarget}/{dailyData.length}</p>
            <Progress 
              value={(daysOnTarget / Math.max(dailyData.length, 1)) * 100} 
              className="h-1 mt-2"
              indicatorClassName="bg-cyan-500"
            />
          </CardContent>
        </Card>
      </div>

      {/* Calories Chart */}
      <Card className="bg-card/80 backdrop-blur-md border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-orange-500" />
            Evolução de Calorias
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyData}>
                <defs>
                  <linearGradient id="caloriesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(30, 100%, 50%)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(30, 100%, 50%)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="dayName" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="calories" 
                  name="Calorias"
                  stroke="hsl(30, 100%, 50%)" 
                  fill="url(#caloriesGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Macros Chart */}
      <Card className="bg-card/80 backdrop-blur-md border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="w-4 h-4 text-purple-500" />
            Macronutrientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="dayName" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="protein" name="Proteína" fill="hsl(0, 70%, 50%)" radius={[2, 2, 0, 0]} />
                <Bar dataKey="carbs" name="Carbos" fill="hsl(210, 80%, 50%)" radius={[2, 2, 0, 0]} />
                <Bar dataKey="fat" name="Gordura" fill="hsl(45, 90%, 50%)" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Hydration Chart */}
      <Card className="bg-card/80 backdrop-blur-md border-cyan-500/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Droplets className="w-4 h-4 text-cyan-500" />
            Hidratação Diária
            <Badge variant="outline" className="ml-auto text-xs">
              Meta: {goals.hydration}ml
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyData}>
                <defs>
                  <linearGradient id="hydrationGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(190, 90%, 50%)" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="hsl(190, 90%, 50%)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="dayName" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="hydration" 
                  name="Hidratação"
                  stroke="hsl(190, 90%, 50%)" 
                  fill="url(#hydrationGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          
          {/* Hydration summary */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
            <div>
              <p className="text-xs text-muted-foreground">Média diária</p>
              <p className="text-lg font-bold text-cyan-500">{averages.hydration}ml</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Dias com meta atingida</p>
              <p className="text-lg font-bold text-cyan-500">
                {dailyData.filter(d => d.hydration >= goals.hydration).length}/{dailyData.length}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NutritionCharts;
