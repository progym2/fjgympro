import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Activity, Search, Calendar, User, Dumbbell, Shield, 
  Clock, Loader2, RefreshCw, Filter, Download, Users, TrendingUp, BarChart3
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAudio } from '@/contexts/AudioContext';
import { useEscapeBack } from '@/hooks/useEscapeBack';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, subDays, startOfDay, endOfDay, eachDayOfInterval, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import FadeScrollList from '@/components/shared/FadeScrollList';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';

interface AccessLog {
  id: string;
  profile_id: string;
  check_in_at: string;
  check_out_at: string | null;
  access_method: string | null;
  notes: string | null;
  profile: {
    username: string;
    full_name: string | null;
    cref: string | null;
  } | null;
  role?: string;
}

interface AccessStats {
  total: number;
  clients: number;
  instructors: number;
  admins: number;
  today: number;
}

const AccessLogs: React.FC = () => {
  const navigate = useNavigate();
  const { role } = useAuth();
  const { playClickSound } = useAudio();
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'client' | 'instructor' | 'admin'>('all');
  const [filterPeriod, setFilterPeriod] = useState<'today' | 'week' | 'month' | 'all'>('week');
  const [stats, setStats] = useState<AccessStats>({ total: 0, clients: 0, instructors: 0, admins: 0, today: 0 });
  const [activeTab, setActiveTab] = useState<'chart' | 'list'>('chart');

  // ESC para voltar ao menu admin
  useEscapeBack({ to: '/admin' });

  const isMaster = role === 'master';

  useEffect(() => {
    if (isMaster) {
      fetchLogs();
    }
  }, [isMaster, filterPeriod]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      // Calculate date range
      let startDate: Date | null = null;
      const now = new Date();
      
      switch (filterPeriod) {
        case 'today':
          startDate = startOfDay(now);
          break;
        case 'week':
          startDate = subDays(now, 7);
          break;
        case 'month':
          startDate = subDays(now, 30);
          break;
        default:
          startDate = null;
      }

      let query = supabase
        .from('access_logs')
        .select(`
          id,
          profile_id,
          check_in_at,
          check_out_at,
          access_method,
          notes,
          profile:profiles!access_logs_profile_id_fkey (
            username,
            full_name,
            cref
          )
        `)
        .order('check_in_at', { ascending: false })
        .limit(500);

      if (startDate) {
        query = query.gte('check_in_at', startDate.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;

      // Get user roles for each profile
      const profileIds = [...new Set((data || []).map(log => log.profile_id))];
      
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', profileIds);

      const rolesMap = new Map(rolesData?.map(r => [r.user_id, r.role]) || []);

      const logsWithRoles = (data || []).map(log => ({
        ...log,
        role: rolesMap.get(log.profile_id) || (log.profile?.cref ? 'instructor' : 'client'),
      }));

      setLogs(logsWithRoles);

      // Calculate stats
      const todayStart = startOfDay(now);
      const todayLogs = logsWithRoles.filter(l => new Date(l.check_in_at) >= todayStart);
      
      setStats({
        total: logsWithRoles.length,
        clients: logsWithRoles.filter(l => l.role === 'client').length,
        instructors: logsWithRoles.filter(l => l.role === 'instructor').length,
        admins: logsWithRoles.filter(l => l.role === 'admin' || l.role === 'master').length,
        today: todayLogs.length,
      });

    } catch (error) {
      console.error('Error fetching access logs:', error);
      toast.error('Erro ao carregar logs de acesso');
    } finally {
      setLoading(false);
    }
  };

  // Gerar dados para o gráfico de tendências
  const chartData = useMemo(() => {
    if (logs.length === 0) return [];

    const now = new Date();
    let days: Date[] = [];
    
    switch (filterPeriod) {
      case 'today':
        days = [startOfDay(now)];
        break;
      case 'week':
        days = eachDayOfInterval({
          start: subDays(now, 6),
          end: now
        });
        break;
      case 'month':
        days = eachDayOfInterval({
          start: subDays(now, 29),
          end: now
        });
        break;
      default:
        // Para 'all', agrupar por semana nos últimos 30 dias
        days = eachDayOfInterval({
          start: subDays(now, 29),
          end: now
        });
    }

    return days.map(day => {
      const dayLogs = logs.filter(log => isSameDay(new Date(log.check_in_at), day));
      const clients = dayLogs.filter(l => l.role === 'client').length;
      const instructors = dayLogs.filter(l => l.role === 'instructor' || l.profile?.cref).length;
      const admins = dayLogs.filter(l => l.role === 'admin' || l.role === 'master').length;
      
      return {
        date: format(day, filterPeriod === 'month' ? 'dd/MM' : 'EEE', { locale: ptBR }),
        fullDate: format(day, 'dd/MM/yyyy', { locale: ptBR }),
        total: dayLogs.length,
        clients,
        instructors,
        admins,
      };
    });
  }, [logs, filterPeriod]);

  const filteredLogs = logs.filter(log => {
    // Filter by search term
    const matchesSearch = !searchTerm || 
      log.profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.profile?.username.toLowerCase().includes(searchTerm.toLowerCase());

    // Filter by type
    let matchesType = true;
    if (filterType !== 'all') {
      if (filterType === 'instructor') {
        matchesType = log.role === 'instructor' || !!log.profile?.cref;
      } else if (filterType === 'admin') {
        matchesType = log.role === 'admin' || log.role === 'master';
      } else {
        matchesType = log.role === filterType;
      }
    }

    return matchesSearch && matchesType;
  });

  const getRoleBadge = (log: AccessLog) => {
    if (log.role === 'master') {
      return <Badge className="bg-purple-500/20 text-purple-500 border-purple-500/50">Master</Badge>;
    }
    if (log.role === 'admin') {
      return <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/50">Gerente</Badge>;
    }
    if (log.role === 'instructor' || log.profile?.cref) {
      return <Badge className="bg-green-500/20 text-green-500 border-green-500/50">Instrutor</Badge>;
    }
    return <Badge className="bg-cyan-500/20 text-cyan-500 border-cyan-500/50">Cliente</Badge>;
  };

  const getRoleIcon = (log: AccessLog) => {
    if (log.role === 'master' || log.role === 'admin') {
      return <Shield className="w-5 h-5 text-blue-500" />;
    }
    if (log.role === 'instructor' || log.profile?.cref) {
      return <Dumbbell className="w-5 h-5 text-green-500" />;
    }
    return <User className="w-5 h-5 text-cyan-500" />;
  };

  if (!isMaster) {
    return (
      <Card className="bg-card/80 backdrop-blur-md border-border/50">
        <CardContent className="py-8 text-center">
          <Shield className="w-12 h-12 mx-auto text-red-500/50 mb-4" />
          <p className="text-muted-foreground">
            Apenas o Master pode visualizar os logs de acesso.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-6 h-6 text-cyan-500" />
          <h2 className="text-xl font-bebas text-cyan-500">LOGS DE ACESSO</h2>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => { playClickSound(); fetchLogs(); }}
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-card/80 backdrop-blur-md border-cyan-500/30">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bebas text-cyan-500">{stats.today}</p>
            <p className="text-xs text-muted-foreground">Hoje</p>
          </CardContent>
        </Card>
        <Card className="bg-card/80 backdrop-blur-md border-blue-500/30">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bebas text-blue-500">{stats.clients}</p>
            <p className="text-xs text-muted-foreground">Clientes</p>
          </CardContent>
        </Card>
        <Card className="bg-card/80 backdrop-blur-md border-green-500/30">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bebas text-green-500">{stats.instructors}</p>
            <p className="text-xs text-muted-foreground">Instrutores</p>
          </CardContent>
        </Card>
        <Card className="bg-card/80 backdrop-blur-md border-purple-500/30">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bebas text-purple-500">{stats.admins}</p>
            <p className="text-xs text-muted-foreground">Gerentes</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-card/80 backdrop-blur-md border-border/50">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou usuário..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-background/50"
              />
            </div>
            <Select value={filterType} onValueChange={(v) => setFilterType(v as any)}>
              <SelectTrigger className="w-full sm:w-40 bg-background/50">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="client">Clientes</SelectItem>
                <SelectItem value="instructor">Instrutores</SelectItem>
                <SelectItem value="admin">Gerentes</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterPeriod} onValueChange={(v) => setFilterPeriod(v as any)}>
              <SelectTrigger className="w-full sm:w-40 bg-background/50">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="week">Última Semana</SelectItem>
                <SelectItem value="month">Último Mês</SelectItem>
                <SelectItem value="all">Todo Período</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabs: Chart and List */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-card/80">
          <TabsTrigger value="chart" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">Gráfico</span>
          </TabsTrigger>
          <TabsTrigger value="list" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            <span className="hidden sm:inline">Lista</span>
          </TabsTrigger>
        </TabsList>

        {/* Chart Tab */}
        <TabsContent value="chart" className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
            </div>
          ) : chartData.length === 0 ? (
            <Card className="bg-card/80 backdrop-blur-md border-border/50">
              <CardContent className="py-12 text-center">
                <TrendingUp className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">Sem dados para exibir o gráfico</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-card/80 backdrop-blur-md border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
                  <TrendingUp className="w-4 h-4 text-cyan-500" />
                  Tendência de Acessos por Dia
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                      <XAxis 
                        dataKey="date" 
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={11}
                        tickLine={false}
                      />
                      <YAxis 
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                        labelFormatter={(value, payload) => {
                          if (payload && payload[0]) {
                            return payload[0].payload.fullDate;
                          }
                          return value;
                        }}
                      />
                      <Legend 
                        wrapperStyle={{ fontSize: '11px' }}
                        iconType="circle"
                        iconSize={8}
                      />
                      <Bar 
                        dataKey="clients" 
                        name="Clientes" 
                        fill="hsl(190, 90%, 50%)" 
                        radius={[4, 4, 0, 0]}
                        stackId="a"
                      />
                      <Bar 
                        dataKey="instructors" 
                        name="Instrutores" 
                        fill="hsl(142, 70%, 45%)" 
                        radius={[4, 4, 0, 0]}
                        stackId="a"
                      />
                      <Bar 
                        dataKey="admins" 
                        name="Gerentes" 
                        fill="hsl(270, 70%, 60%)" 
                        radius={[4, 4, 0, 0]}
                        stackId="a"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Summary below chart */}
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
                    <p className="text-lg font-bebas text-cyan-500">
                      {chartData.reduce((acc, d) => acc + d.clients, 0)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Clientes</p>
                  </div>
                  <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/30">
                    <p className="text-lg font-bebas text-green-500">
                      {chartData.reduce((acc, d) => acc + d.instructors, 0)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Instrutores</p>
                  </div>
                  <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/30">
                    <p className="text-lg font-bebas text-purple-500">
                      {chartData.reduce((acc, d) => acc + d.admins, 0)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Gerentes</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* List Tab */}
        <TabsContent value="list" className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <Card className="bg-card/80 backdrop-blur-md border-border/50">
              <CardContent className="py-12 text-center">
                <Activity className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">Nenhum log de acesso encontrado</p>
              </CardContent>
            </Card>
          ) : (
            <FadeScrollList className="space-y-2 max-h-[500px]">
              {filteredLogs.map((log, index) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className="bg-card/80 backdrop-blur-md rounded-lg p-3 border border-border/50 hover:border-cyan-500/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-background/50">
                      {getRoleIcon(log)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium truncate">
                          {log.profile?.full_name || log.profile?.username || 'Usuário'}
                        </span>
                        {getRoleBadge(log)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        @{log.profile?.username}
                        {log.notes && ` • ${log.notes}`}
                      </p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{format(new Date(log.check_in_at), 'HH:mm', { locale: ptBR })}</span>
                      </div>
                      <span>{format(new Date(log.check_in_at), 'dd/MM/yyyy', { locale: ptBR })}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </FadeScrollList>
          )}

          {/* Footer info */}
          <p className="text-xs text-muted-foreground text-center mt-4">
            Exibindo {filteredLogs.length} de {logs.length} registros
          </p>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};

export default AccessLogs;
