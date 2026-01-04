import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, Users, Dumbbell, CreditCard, TrendingUp,
  Calendar, Loader2, BarChart3, Filter
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAudio } from '@/contexts/AudioContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format, subDays, subWeeks, subMonths, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Area, AreaChart
} from 'recharts';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import InstructorPageHeader from './InstructorPageHeader';

type PeriodFilter = 'week' | 'month' | 'quarter' | 'semester' | 'year' | 'all';

interface StudentStats {
  total: number;
  active: number;
  newInPeriod: number;
}

interface WorkoutStats {
  totalPlans: number;
  activePlans: number;
  totalExercises: number;
}

interface FinanceStats {
  totalReceived: number;
  totalPending: number;
  totalOverdue: number;
}

const COLORS = ['#22c55e', '#eab308', '#ef4444', '#3b82f6', '#8b5cf6'];

const periodLabels: Record<PeriodFilter, string> = {
  week: 'Última Semana',
  month: 'Último Mês',
  quarter: 'Último Trimestre',
  semester: 'Último Semestre',
  year: 'Último Ano',
  all: 'Todo Período'
};

const getStartDate = (period: PeriodFilter): Date | null => {
  const now = new Date();
  switch (period) {
    case 'week': return subWeeks(now, 1);
    case 'month': return subMonths(now, 1);
    case 'quarter': return subMonths(now, 3);
    case 'semester': return subMonths(now, 6);
    case 'year': return subMonths(now, 12);
    case 'all': return null;
  }
};

const Reports: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { playClickSound } = useAudio();
  
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodFilter>('month');
  const [studentStats, setStudentStats] = useState<StudentStats>({ total: 0, active: 0, newInPeriod: 0 });
  const [workoutStats, setWorkoutStats] = useState<WorkoutStats>({ totalPlans: 0, activePlans: 0, totalExercises: 0 });
  const [financeStats, setFinanceStats] = useState<FinanceStats>({ totalReceived: 0, totalPending: 0, totalOverdue: 0 });
  const [monthlyRevenue, setMonthlyRevenue] = useState<{ name: string; value: number }[]>([]);
  const [goalsDistribution, setGoalsDistribution] = useState<{ name: string; value: number }[]>([]);
  const [studentEvolution, setStudentEvolution] = useState<{ name: string; total: number; active: number }[]>([]);

  useEffect(() => {
    if (profile?.id) {
      loadAllStats();
    }
  }, [profile?.id, period]);

  const loadAllStats = async () => {
    setLoading(true);
    await Promise.all([
      loadStudentStats(),
      loadWorkoutStats(),
      loadFinanceStats(),
      loadMonthlyRevenue(),
      loadGoalsDistribution(),
      loadStudentEvolution()
    ]);
    setLoading(false);
  };

  const loadStudentStats = async () => {
    if (!profile?.id) return;

    const { data, error } = await supabase
      .from('instructor_clients')
      .select('id, linked_at, is_active')
      .eq('instructor_id', profile.id);

    if (!error && data) {
      const startDate = getStartDate(period);
      const startDateStr = startDate ? startDate.toISOString() : null;
      
      setStudentStats({
        total: data.length,
        active: data.filter(s => s.is_active).length,
        newInPeriod: data.filter(s => {
          if (!s.linked_at) return false;
          if (!startDateStr) return true;
          return s.linked_at >= startDateStr;
        }).length
      });
    }
  };

  const loadWorkoutStats = async () => {
    if (!profile?.id) return;

    const { data: plans } = await supabase
      .from('workout_plans')
      .select('id, is_active')
      .eq('created_by', profile.id);

    if (plans) {
      const planIds = plans.map(p => p.id);
      let totalExercises = 0;

      if (planIds.length > 0) {
        const { count } = await supabase
          .from('workout_plan_exercises')
          .select('id', { count: 'exact', head: true })
          .in('workout_plan_id', planIds);
        
        totalExercises = count || 0;
      }

      setWorkoutStats({
        totalPlans: plans.length,
        activePlans: plans.filter(p => p.is_active).length,
        totalExercises
      });
    }
  };

  const loadFinanceStats = async () => {
    if (!profile?.id) return;

    const startDate = getStartDate(period);
    let query = supabase
      .from('payments')
      .select('amount, status, due_date, paid_at')
      .eq('instructor_id', profile.id);

    if (startDate) {
      query = query.or(`paid_at.gte.${startDate.toISOString()},and(status.eq.pending,due_date.gte.${format(startDate, 'yyyy-MM-dd')})`);
    }

    const { data } = await query;

    if (data) {
      const now = new Date();
      setFinanceStats({
        totalReceived: data.filter(p => p.status === 'paid').reduce((sum, p) => sum + Number(p.amount), 0),
        totalPending: data.filter(p => p.status === 'pending').reduce((sum, p) => sum + Number(p.amount), 0),
        totalOverdue: data.filter(p => p.status === 'pending' && p.due_date && new Date(p.due_date) < now)
          .reduce((sum, p) => sum + Number(p.amount), 0)
      });
    }
  };

  const loadMonthlyRevenue = async () => {
    if (!profile?.id) return;

    const startDate = getStartDate(period);
    const defaultStart = subMonths(new Date(), 6);
    const queryStartDate = startDate && startDate < defaultStart ? startDate : defaultStart;

    const { data } = await supabase
      .from('payments')
      .select('amount, paid_at')
      .eq('instructor_id', profile.id)
      .eq('status', 'paid')
      .gte('paid_at', queryStartDate.toISOString());

    if (data) {
      const monthlyData: Record<string, number> = {};
      
      data.forEach(payment => {
        if (payment.paid_at) {
          const month = format(new Date(payment.paid_at), 'MMM/yy', { locale: ptBR });
          monthlyData[month] = (monthlyData[month] || 0) + Number(payment.amount);
        }
      });

      setMonthlyRevenue(
        Object.entries(monthlyData).map(([name, value]) => ({ name, value }))
      );
    }
  };

  const loadGoalsDistribution = async () => {
    if (!profile?.id) return;

    try {
      // First get client IDs
      const { data: clientLinks, error: linksError } = await supabase
        .from('instructor_clients')
        .select('client_id')
        .eq('instructor_id', profile.id)
        .eq('is_active', true)
        .eq('link_status', 'accepted');

      if (linksError || !clientLinks || clientLinks.length === 0) {
        setGoalsDistribution([]);
        return;
      }

      const clientIds = clientLinks.map(link => link.client_id);

      // Then get profiles with fitness goals
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('fitness_goal')
        .in('id', clientIds);

      if (profilesError || !profiles) {
        setGoalsDistribution([]);
        return;
      }

      const goals: Record<string, number> = {};
      const goalLabels: Record<string, string> = {
        muscle_gain: 'Ganho Massa',
        weight_loss: 'Perda Peso',
        hypertrophy: 'Hipertrofia',
        conditioning: 'Condicionamento',
        maintenance: 'Manutenção'
      };

      profiles.forEach((item) => {
        const goal = item.fitness_goal || 'maintenance';
        const label = goalLabels[goal] || goal;
        goals[label] = (goals[label] || 0) + 1;
      });

      setGoalsDistribution(
        Object.entries(goals).map(([name, value]) => ({ name, value }))
      );
    } catch (error) {
      console.error('Error loading goals distribution:', error);
      setGoalsDistribution([]);
    }
  };

  const loadStudentEvolution = async () => {
    if (!profile?.id) return;

    try {
      const { data, error } = await supabase
        .from('instructor_clients')
        .select('linked_at, unlinked_at, is_active')
        .eq('instructor_id', profile.id)
        .order('linked_at', { ascending: true });

      if (error || !data || data.length === 0) {
        setStudentEvolution([]);
        return;
      }

      // Group by month and calculate cumulative totals
      const monthlyData: Record<string, { linked: number; unlinked: number }> = {};
      
      data.forEach(student => {
        if (student.linked_at) {
          const month = format(new Date(student.linked_at), 'MMM/yy', { locale: ptBR });
          if (!monthlyData[month]) {
            monthlyData[month] = { linked: 0, unlinked: 0 };
          }
          monthlyData[month].linked++;
        }
        if (student.unlinked_at) {
          const month = format(new Date(student.unlinked_at), 'MMM/yy', { locale: ptBR });
          if (!monthlyData[month]) {
            monthlyData[month] = { linked: 0, unlinked: 0 };
          }
          monthlyData[month].unlinked++;
        }
      });

      // Calculate cumulative values
      let cumulativeTotal = 0;
      let cumulativeActive = 0;
      
      const evolution = Object.entries(monthlyData).map(([name, { linked, unlinked }]) => {
        cumulativeTotal += linked;
        cumulativeActive += linked - unlinked;
        return {
          name,
          total: cumulativeTotal,
          active: cumulativeActive
        };
      });

      setStudentEvolution(evolution);
    } catch (error) {
      console.error('Error loading student evolution:', error);
      setStudentEvolution([]);
    }
  };

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
        title="RELATÓRIOS"
        icon={<FileText className="w-6 h-6" />}
        iconColor="text-indigo-500"
      />
      
      <div className="flex-1 overflow-auto space-y-6">
        {/* Period Filter */}
        <div className="flex justify-end items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={period} onValueChange={(value: PeriodFilter) => setPeriod(value)}>
            <SelectTrigger className="w-[180px] bg-card border-border">
              <SelectValue placeholder="Selecione o período" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border z-50">
              <SelectItem value="week">Última Semana</SelectItem>
              <SelectItem value="month">Último Mês</SelectItem>
              <SelectItem value="quarter">Último Trimestre</SelectItem>
              <SelectItem value="semester">Último Semestre</SelectItem>
              <SelectItem value="year">Último Ano</SelectItem>
              <SelectItem value="all">Todo Período</SelectItem>
            </SelectContent>
          </Select>
        </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card/80 backdrop-blur-md border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Alunos Ativos</p>
                <p className="text-2xl font-bebas text-foreground">{studentStats.active}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/80 backdrop-blur-md border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Dumbbell className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Planos Ativos</p>
                <p className="text-2xl font-bebas text-foreground">{workoutStats.activePlans}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/80 backdrop-blur-md border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Recebido</p>
                <p className="text-2xl font-bebas text-green-500">R$ {financeStats.totalReceived.toFixed(0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/80 backdrop-blur-md border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Novos ({periodLabels[period]})</p>
                <p className="text-2xl font-bebas text-foreground">{studentStats.newInPeriod}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card className="bg-card/80 backdrop-blur-md border-border/50">
          <CardHeader>
            <CardTitle className="font-bebas text-lg tracking-wider flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-green-500" />
              RECEITA MENSAL
            </CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyRevenue.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={monthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Valor']}
                  />
                  <Bar dataKey="value" fill="#22c55e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                Sem dados de receita
              </div>
            )}
          </CardContent>
        </Card>

        {/* Goals Distribution */}
        <Card className="bg-card/80 backdrop-blur-md border-border/50">
          <CardHeader>
            <CardTitle className="font-bebas text-lg tracking-wider flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              OBJETIVOS DOS ALUNOS
            </CardTitle>
          </CardHeader>
          <CardContent>
            {goalsDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={goalsDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {goalsDistribution.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                Sem dados de objetivos
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Student Evolution Chart */}
      <Card className="bg-card/80 backdrop-blur-md border-border/50">
        <CardHeader>
          <CardTitle className="font-bebas text-lg tracking-wider flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-500" />
            EVOLUÇÃO DE ALUNOS
          </CardTitle>
        </CardHeader>
        <CardContent>
          {studentEvolution.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={studentEvolution}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number, name: string) => [
                    value, 
                    name === 'total' ? 'Total' : 'Ativos'
                  ]}
                />
                <Area 
                  type="monotone" 
                  dataKey="total" 
                  stroke="#8b5cf6" 
                  fillOpacity={1} 
                  fill="url(#colorTotal)" 
                  name="total"
                />
                <Area 
                  type="monotone" 
                  dataKey="active" 
                  stroke="#22c55e" 
                  fillOpacity={1} 
                  fill="url(#colorActive)" 
                  name="active"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Sem dados de evolução
            </div>
          )}
          <div className="flex justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-500" />
              <span className="text-sm text-muted-foreground">Total</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-sm text-muted-foreground">Ativos</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="bg-card/80 backdrop-blur-md border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Resumo Alunos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm">Total cadastrados</span>
              <span className="font-medium">{studentStats.total}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Ativos</span>
              <span className="font-medium text-green-500">{studentStats.active}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Novos no período</span>
              <span className="font-medium text-blue-500">{studentStats.newInPeriod}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/80 backdrop-blur-md border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Resumo Treinos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm">Total de planos</span>
              <span className="font-medium">{workoutStats.totalPlans}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Planos ativos</span>
              <span className="font-medium text-green-500">{workoutStats.activePlans}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Exercícios cadastrados</span>
              <span className="font-medium text-purple-500">{workoutStats.totalExercises}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/80 backdrop-blur-md border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Resumo Financeiro</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm">Total recebido</span>
              <span className="font-medium text-green-500">R$ {financeStats.totalReceived.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Pendente</span>
              <span className="font-medium text-yellow-500">R$ {financeStats.totalPending.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Em atraso</span>
              <span className="font-medium text-red-500">R$ {financeStats.totalOverdue.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
      </div>
    </motion.div>
  );
};

export default Reports;
