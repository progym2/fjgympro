import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3, Calendar, TrendingUp, Users, Activity, Download,
  Clock, CheckCircle, XCircle, AlertTriangle, RefreshCw, Filter
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, 
  CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { format, subDays, subMonths, startOfDay, endOfDay, eachDayOfInterval, 
         eachWeekOfInterval, eachMonthOfInterval, startOfMonth, endOfMonth, 
         startOfWeek, endOfWeek, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface LicenseActivity {
  id: string;
  license_type: string;
  status: string;
  created_at: string;
  started_at: string | null;
  expires_at: string | null;
  profile?: {
    username: string;
    full_name: string | null;
  } | null;
}

interface AccessLog {
  id: string;
  check_in_at: string;
  check_out_at: string | null;
  profile_id: string;
}

const COLORS = {
  active: '#22c55e',
  expired: '#eab308',
  blocked: '#ef4444',
  demo: '#f97316',
  trial: '#3b82f6',
  full: '#10b981',
  primary: 'hsl(var(--primary))'
};

const LicenseUsageReport: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [licenses, setLicenses] = useState<LicenseActivity[]>([]);
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);
  const [period, setPeriod] = useState<'7d' | '30d' | '90d' | '6m' | '1y'>('30d');
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Calculate date range based on period
      const now = new Date();
      let startDate: Date;
      switch (period) {
        case '7d': startDate = subDays(now, 7); break;
        case '30d': startDate = subDays(now, 30); break;
        case '90d': startDate = subDays(now, 90); break;
        case '6m': startDate = subMonths(now, 6); break;
        case '1y': startDate = subMonths(now, 12); break;
        default: startDate = subDays(now, 30);
      }

      // Fetch licenses
      const { data: licensesData, error: licensesError } = await supabase
        .from('licenses')
        .select(`
          id, license_type, status, created_at, started_at, expires_at,
          profile:profiles!licenses_profile_id_fkey (username, full_name)
        `)
        .neq('license_type', 'master')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (licensesError) throw licensesError;
      setLicenses(licensesData || []);

      // Fetch access logs
      const { data: accessData, error: accessError } = await supabase
        .from('access_logs')
        .select('id, check_in_at, check_out_at, profile_id')
        .gte('check_in_at', startDate.toISOString())
        .order('check_in_at', { ascending: true });

      if (accessError) throw accessError;
      setAccessLogs(accessData || []);

    } catch (error) {
      console.error('Error fetching report data:', error);
      toast.error('Erro ao carregar dados do relatório');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [period]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
    toast.success('Relatório atualizado!');
  };

  // Calculate statistics
  const stats = useMemo(() => {
    const totalLicenses = licenses.length;
    const activeLicenses = licenses.filter(l => l.status === 'active').length;
    const expiredLicenses = licenses.filter(l => l.status === 'expired').length;
    const blockedLicenses = licenses.filter(l => l.status === 'blocked').length;
    
    const demoLicenses = licenses.filter(l => l.license_type === 'demo').length;
    const trialLicenses = licenses.filter(l => l.license_type === 'trial').length;
    const fullLicenses = licenses.filter(l => l.license_type === 'full').length;

    const totalAccesses = accessLogs.length;
    const uniqueUsers = new Set(accessLogs.map(a => a.profile_id)).size;

    // Calculate average session duration
    const sessionsWithDuration = accessLogs.filter(a => a.check_out_at);
    const avgDuration = sessionsWithDuration.length > 0
      ? sessionsWithDuration.reduce((sum, a) => {
          const start = new Date(a.check_in_at).getTime();
          const end = new Date(a.check_out_at!).getTime();
          return sum + (end - start);
        }, 0) / sessionsWithDuration.length / (1000 * 60) // in minutes
      : 0;

    return {
      totalLicenses,
      activeLicenses,
      expiredLicenses,
      blockedLicenses,
      demoLicenses,
      trialLicenses,
      fullLicenses,
      totalAccesses,
      uniqueUsers,
      avgDuration: Math.round(avgDuration)
    };
  }, [licenses, accessLogs]);

  // Generate timeline data based on period
  const timelineData = useMemo(() => {
    const now = new Date();
    let intervals: Date[];
    let formatStr: string;

    switch (period) {
      case '7d':
        intervals = eachDayOfInterval({ start: subDays(now, 6), end: now });
        formatStr = 'EEE';
        break;
      case '30d':
        intervals = eachDayOfInterval({ start: subDays(now, 29), end: now });
        formatStr = 'dd/MM';
        break;
      case '90d':
        intervals = eachWeekOfInterval({ start: subDays(now, 89), end: now });
        formatStr = "'Sem' w";
        break;
      case '6m':
      case '1y':
        intervals = eachMonthOfInterval({ 
          start: period === '6m' ? subMonths(now, 5) : subMonths(now, 11), 
          end: now 
        });
        formatStr = 'MMM';
        break;
      default:
        intervals = eachDayOfInterval({ start: subDays(now, 29), end: now });
        formatStr = 'dd/MM';
    }

    return intervals.map(date => {
      let rangeStart: Date, rangeEnd: Date;
      
      if (period === '90d') {
        rangeStart = startOfWeek(date, { locale: ptBR });
        rangeEnd = endOfWeek(date, { locale: ptBR });
      } else if (period === '6m' || period === '1y') {
        rangeStart = startOfMonth(date);
        rangeEnd = endOfMonth(date);
      } else {
        rangeStart = startOfDay(date);
        rangeEnd = endOfDay(date);
      }

      const periodLicenses = licenses.filter(l => {
        const createdAt = parseISO(l.created_at);
        return createdAt >= rangeStart && createdAt <= rangeEnd;
      });

      const periodAccesses = accessLogs.filter(a => {
        const checkIn = parseISO(a.check_in_at);
        return checkIn >= rangeStart && checkIn <= rangeEnd;
      });

      return {
        date: format(date, formatStr, { locale: ptBR }),
        licenças: periodLicenses.length,
        acessos: periodAccesses.length,
        demo: periodLicenses.filter(l => l.license_type === 'demo').length,
        trial: periodLicenses.filter(l => l.license_type === 'trial').length,
        full: periodLicenses.filter(l => l.license_type === 'full').length
      };
    });
  }, [licenses, accessLogs, period]);

  // Status distribution for pie chart
  const statusDistribution = useMemo(() => [
    { name: 'Ativas', value: stats.activeLicenses, color: COLORS.active },
    { name: 'Expiradas', value: stats.expiredLicenses, color: COLORS.expired },
    { name: 'Bloqueadas', value: stats.blockedLicenses, color: COLORS.blocked },
  ].filter(d => d.value > 0), [stats]);

  // Type distribution for pie chart
  const typeDistribution = useMemo(() => [
    { name: 'Demo', value: stats.demoLicenses, color: COLORS.demo },
    { name: 'Trial', value: stats.trialLicenses, color: COLORS.trial },
    { name: 'Full', value: stats.fullLicenses, color: COLORS.full },
  ].filter(d => d.value > 0), [stats]);

  // Licenses expiring soon
  const expiringLicenses = useMemo(() => {
    const now = new Date();
    const sevenDaysFromNow = subDays(now, -7);
    
    return licenses
      .filter(l => {
        if (!l.expires_at || l.status !== 'active') return false;
        const expiresAt = parseISO(l.expires_at);
        return expiresAt > now && expiresAt <= sevenDaysFromNow;
      })
      .sort((a, b) => new Date(a.expires_at!).getTime() - new Date(b.expires_at!).getTime())
      .slice(0, 5);
  }, [licenses]);

  const exportToCSV = () => {
    const headers = ['ID', 'Tipo', 'Status', 'Usuário', 'Criado em', 'Expira em'];
    const rows = licenses.map(l => [
      l.id,
      l.license_type,
      l.status,
      l.profile?.username || 'N/A',
      format(parseISO(l.created_at), 'dd/MM/yyyy HH:mm'),
      l.expires_at ? format(parseISO(l.expires_at), 'dd/MM/yyyy HH:mm') : 'N/A'
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `licencas_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    toast.success('Relatório exportado!');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-bebas text-primary tracking-wider">
            RELATÓRIO DE USO DE LICENÇAS
          </h2>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
            <SelectTrigger className="w-[140px]">
              <Filter size={14} className="mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="90d">Últimos 90 dias</SelectItem>
              <SelectItem value="6m">Últimos 6 meses</SelectItem>
              <SelectItem value="1y">Último ano</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="icon" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          </Button>
          
          <Button variant="outline" size="sm" onClick={exportToCSV}>
            <Download size={14} className="mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/20 to-purple-500/20 border-primary/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <Activity size={20} className="text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">{stats.totalLicenses}</p>
                <p className="text-xs text-muted-foreground">Licenças no Período</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/20">
                <CheckCircle size={20} className="text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-500">{stats.activeLicenses}</p>
                <p className="text-xs text-muted-foreground">Ativas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-blue-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Users size={20} className="text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-500">{stats.uniqueUsers}</p>
                <p className="text-xs text-muted-foreground">Usuários Ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/20 to-yellow-500/20 border-amber-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20">
                <Clock size={20} className="text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-500">{stats.avgDuration}m</p>
                <p className="text-xs text-muted-foreground">Tempo Médio</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Activity Timeline */}
        <Card className="bg-card/80 backdrop-blur-md border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="font-bebas text-lg text-primary flex items-center gap-2">
              <TrendingUp size={18} />
              ATIVIDADE AO LONGO DO TEMPO
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={timelineData}>
                <defs>
                  <linearGradient id="colorLicencas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorAcessos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="licenças" 
                  stroke="#8b5cf6" 
                  fill="url(#colorLicencas)" 
                  strokeWidth={2}
                />
                <Area 
                  type="monotone" 
                  dataKey="acessos" 
                  stroke="#22c55e" 
                  fill="url(#colorAcessos)" 
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* License Types by Period */}
        <Card className="bg-card/80 backdrop-blur-md border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="font-bebas text-lg text-primary flex items-center gap-2">
              <BarChart3 size={18} />
              LICENÇAS POR TIPO
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Bar dataKey="demo" name="Demo" fill={COLORS.demo} stackId="a" />
                <Bar dataKey="trial" name="Trial" fill={COLORS.trial} stackId="a" />
                <Bar dataKey="full" name="Full" fill={COLORS.full} stackId="a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Distribution Charts */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Status Distribution */}
        <Card className="bg-card/80 backdrop-blur-md border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="font-bebas text-sm text-primary">
              DISTRIBUIÇÃO POR STATUS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Type Distribution */}
        <Card className="bg-card/80 backdrop-blur-md border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="font-bebas text-sm text-primary">
              DISTRIBUIÇÃO POR TIPO
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={typeDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {typeDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Expiring Soon Alert */}
        <Card className="bg-card/80 backdrop-blur-md border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="font-bebas text-sm text-primary flex items-center gap-2">
              <AlertTriangle size={16} className="text-yellow-500" />
              EXPIRANDO EM 7 DIAS
            </CardTitle>
          </CardHeader>
          <CardContent>
            {expiringLicenses.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[180px] text-muted-foreground">
                <CheckCircle size={32} className="text-green-500 mb-2" />
                <p className="text-sm">Nenhuma licença expirando</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[180px] overflow-y-auto">
                {expiringLicenses.map(license => (
                  <div key={license.id} className="flex items-center justify-between p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                    <div>
                      <p className="text-sm font-medium">{license.profile?.username || 'N/A'}</p>
                      <p className="text-xs text-muted-foreground">
                        {license.expires_at ? format(parseISO(license.expires_at), 'dd/MM HH:mm') : 'N/A'}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-yellow-500 border-yellow-500/50 text-[10px]">
                      {license.expires_at ? `${differenceInDays(parseISO(license.expires_at), new Date())}d` : 'N/A'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Summary Table */}
      <Card className="bg-card/80 backdrop-blur-md border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="font-bebas text-lg text-primary">
            RESUMO DO PERÍODO
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3 rounded-lg bg-muted/30 text-center">
              <p className="text-2xl font-bold text-primary">{stats.totalAccesses}</p>
              <p className="text-xs text-muted-foreground">Total de Acessos</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 text-center">
              <p className="text-2xl font-bold text-green-500">{stats.fullLicenses}</p>
              <p className="text-xs text-muted-foreground">Licenças Full</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 text-center">
              <p className="text-2xl font-bold text-blue-500">{stats.trialLicenses}</p>
              <p className="text-xs text-muted-foreground">Licenças Trial</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 text-center">
              <p className="text-2xl font-bold text-orange-500">{stats.demoLicenses}</p>
              <p className="text-xs text-muted-foreground">Licenças Demo</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default LicenseUsageReport;
