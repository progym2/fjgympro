import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart3, Bell, CheckCircle, XCircle, Clock, Users, 
  TrendingUp, AlertTriangle, Info, Loader2, Calendar,
  Eye, Send, MessageSquare
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAudio } from '@/contexts/AudioContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend
} from 'recharts';

interface NotificationStats {
  total: number;
  read: number;
  unread: number;
  readRate: number;
  byType: { type: string; count: number }[];
  byDay: { date: string; count: number; read: number }[];
  topRecipients: { name: string; count: number }[];
  recentActivity: { date: string; sent: number; read: number }[];
}

const COLORS = ['#ec4899', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b'];
const TYPE_COLORS: { [key: string]: string } = {
  info: '#3b82f6',
  warning: '#f59e0b',
  alert: '#ef4444',
  success: '#10b981'
};

const NotificationStats: React.FC = () => {
  const navigate = useNavigate();
  const { playClickSound } = useAudio();
  const { role, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<NotificationStats | null>(null);

  const isMaster = role === 'master';

  useEffect(() => {
    if (profile?.profile_id) {
      loadStats();
    }
  }, [profile?.profile_id]);

  const loadStats = async () => {
    setLoading(true);

    try {
      // Get profile IDs to filter by
      let profileIds: string[] = [];
      
      if (!isMaster && profile?.profile_id) {
        const { data: managedProfiles } = await supabase
          .from('profiles')
          .select('id')
          .eq('created_by_admin', profile.profile_id);
        
        profileIds = managedProfiles?.map(p => p.id) || [];
      }

      // Base query
      let query = supabase
        .from('notifications')
        .select(`
          id,
          is_read,
          type,
          created_at,
          profiles:profile_id (
            id,
            full_name,
            username
          )
        `);

      if (!isMaster && profileIds.length > 0) {
        query = query.in('profile_id', profileIds);
      } else if (!isMaster && profileIds.length === 0) {
        setStats({
          total: 0,
          read: 0,
          unread: 0,
          readRate: 0,
          byType: [],
          byDay: [],
          topRecipients: [],
          recentActivity: []
        });
        setLoading(false);
        return;
      }

      const { data: notifications, error } = await query;

      if (error) throw error;

      // Process stats
      const total = notifications?.length || 0;
      const read = notifications?.filter(n => n.is_read).length || 0;
      const unread = total - read;
      const readRate = total > 0 ? Math.round((read / total) * 100) : 0;

      // Group by type
      const typeGroups: { [key: string]: number } = {};
      notifications?.forEach(n => {
        const type = n.type || 'info';
        typeGroups[type] = (typeGroups[type] || 0) + 1;
      });
      const byType = Object.entries(typeGroups).map(([type, count]) => ({ type, count }));

      // Group by day (last 7 days)
      const dayGroups: { [key: string]: { count: number; read: number } } = {};
      const today = new Date();
      for (let i = 6; i >= 0; i--) {
        const date = format(subDays(today, i), 'yyyy-MM-dd');
        dayGroups[date] = { count: 0, read: 0 };
      }
      
      notifications?.forEach(n => {
        if (n.created_at) {
          const date = format(new Date(n.created_at), 'yyyy-MM-dd');
          if (dayGroups[date]) {
            dayGroups[date].count++;
            if (n.is_read) dayGroups[date].read++;
          }
        }
      });
      
      const byDay = Object.entries(dayGroups).map(([date, data]) => ({
        date: format(new Date(date), 'EEE', { locale: ptBR }),
        count: data.count,
        read: data.read
      }));

      // Top recipients
      const recipientGroups: { [key: string]: { name: string; count: number } } = {};
      notifications?.forEach(n => {
        const prof = n.profiles as any;
        if (prof) {
          const id = prof.id;
          const name = prof.full_name || prof.username || 'Desconhecido';
          if (!recipientGroups[id]) {
            recipientGroups[id] = { name, count: 0 };
          }
          recipientGroups[id].count++;
        }
      });
      const topRecipients = Object.values(recipientGroups)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Recent activity
      const recentActivity = byDay.map(d => ({
        date: d.date,
        sent: d.count,
        read: d.read
      }));

      setStats({
        total,
        read,
        unread,
        readRate,
        byType,
        byDay,
        topRecipients,
        recentActivity
      });
    } catch (err) {
      console.error('Error loading stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center gap-2">
        <button
          onClick={() => { playClickSound(); navigate('/admin/alerts'); }}
          className="text-sm text-muted-foreground hover:text-blue-500 transition-colors"
        >
          ← Voltar para Alertas
        </button>
        <h2 className="text-xl sm:text-2xl font-bebas text-pink-500 flex items-center gap-2">
          <BarChart3 className="w-6 h-6" />
          ESTATÍSTICAS DE NOTIFICAÇÕES
        </h2>
      </div>

      {!stats || stats.total === 0 ? (
        <div className="bg-card/80 backdrop-blur-md rounded-xl p-12 border border-border/50 text-center">
          <BarChart3 className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-lg text-muted-foreground">Nenhuma notificação enviada ainda</p>
          <p className="text-sm text-muted-foreground mt-2">
            Envie alertas para seus usuários para ver estatísticas aqui
          </p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-card/80 backdrop-blur-md border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Total Enviadas</p>
                    <p className="text-2xl font-bebas text-foreground">{stats.total}</p>
                  </div>
                  <Send className="w-8 h-8 text-pink-500 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/80 backdrop-blur-md border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Lidas</p>
                    <p className="text-2xl font-bebas text-green-500">{stats.read}</p>
                  </div>
                  <Eye className="w-8 h-8 text-green-500 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/80 backdrop-blur-md border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Não Lidas</p>
                    <p className="text-2xl font-bebas text-orange-500">{stats.unread}</p>
                  </div>
                  <Clock className="w-8 h-8 text-orange-500 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/80 backdrop-blur-md border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Taxa de Leitura</p>
                    <p className="text-2xl font-bebas text-blue-500">{stats.readRate}%</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-blue-500 opacity-50" />
                </div>
                <Progress value={stats.readRate} className="mt-2 h-2" />
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Activity Chart */}
            <Card className="bg-card/80 backdrop-blur-md border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-pink-500" />
                  Atividade nos Últimos 7 Dias
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.recentActivity}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis dataKey="date" stroke="#888" fontSize={12} />
                      <YAxis stroke="#888" fontSize={12} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Legend />
                      <Bar dataKey="sent" name="Enviadas" fill="#ec4899" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="read" name="Lidas" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Type Distribution */}
            <Card className="bg-card/80 backdrop-blur-md border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-pink-500" />
                  Distribuição por Tipo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.byType}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="count"
                        nameKey="type"
                        label={({ type, percent }) => `${type} (${(percent * 100).toFixed(0)}%)`}
                        labelLine={false}
                      >
                        {stats.byType.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={TYPE_COLORS[entry.type] || COLORS[index % COLORS.length]} 
                          />
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
                </div>
                <div className="flex flex-wrap justify-center gap-2 mt-2">
                  {stats.byType.map((entry, index) => (
                    <Badge
                      key={entry.type}
                      style={{ backgroundColor: `${TYPE_COLORS[entry.type] || COLORS[index]}20`, color: TYPE_COLORS[entry.type] || COLORS[index] }}
                      className="border"
                    >
                      {entry.type === 'info' && <Info className="w-3 h-3 mr-1" />}
                      {entry.type === 'warning' && <AlertTriangle className="w-3 h-3 mr-1" />}
                      {entry.type === 'alert' && <Bell className="w-3 h-3 mr-1" />}
                      {entry.type === 'success' && <CheckCircle className="w-3 h-3 mr-1" />}
                      {entry.type}: {entry.count}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Recipients */}
          <Card className="bg-card/80 backdrop-blur-md border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-pink-500" />
                Usuários que Mais Recebem Notificações
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.topRecipients.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">Nenhum dado disponível</p>
              ) : (
                <div className="space-y-3">
                  {stats.topRecipients.map((recipient, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{recipient.name}</p>
                        <Progress 
                          value={(recipient.count / stats.topRecipients[0].count) * 100} 
                          className="h-2 mt-1"
                        />
                      </div>
                      <Badge variant="secondary">{recipient.count} notificações</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 rounded-xl p-4 border border-blue-500/30">
              <Info className="w-6 h-6 text-blue-500 mb-2" />
              <p className="text-xs text-muted-foreground">Informações</p>
              <p className="text-xl font-bebas text-blue-500">
                {stats.byType.find(t => t.type === 'info')?.count || 0}
              </p>
            </div>
            <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 rounded-xl p-4 border border-yellow-500/30">
              <AlertTriangle className="w-6 h-6 text-yellow-500 mb-2" />
              <p className="text-xs text-muted-foreground">Avisos</p>
              <p className="text-xl font-bebas text-yellow-500">
                {stats.byType.find(t => t.type === 'warning')?.count || 0}
              </p>
            </div>
            <div className="bg-gradient-to-br from-red-500/20 to-red-600/10 rounded-xl p-4 border border-red-500/30">
              <Bell className="w-6 h-6 text-red-500 mb-2" />
              <p className="text-xs text-muted-foreground">Alertas</p>
              <p className="text-xl font-bebas text-red-500">
                {stats.byType.find(t => t.type === 'alert')?.count || 0}
              </p>
            </div>
            <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 rounded-xl p-4 border border-green-500/30">
              <CheckCircle className="w-6 h-6 text-green-500 mb-2" />
              <p className="text-xs text-muted-foreground">Sucesso</p>
              <p className="text-xl font-bebas text-green-500">
                {stats.byType.find(t => t.type === 'success')?.count || 0}
              </p>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
};

export default NotificationStats;
