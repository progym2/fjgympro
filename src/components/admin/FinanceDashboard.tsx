import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, BarChart3, TrendingUp, DollarSign, Calendar,
  Users, FileText, AlertTriangle, CheckCircle, Clock, XCircle,
  Loader2, Filter, Download, MessageCircle, Send, PieChart
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAudio } from '@/contexts/AudioContext';
import { useAuth } from '@/contexts/AuthContext';
import { useEscapeBack } from '@/hooks/useEscapeBack';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/printUtils';
import { format, startOfMonth, endOfMonth, subMonths, addDays, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area } from 'recharts';

interface PaymentPlan {
  id: string;
  client_id: string;
  total_amount: number;
  installments: number;
  status: string;
  start_date: string;
  created_at: string;
  client?: {
    full_name: string | null;
    phone: string | null;
  };
}

interface Payment {
  id: string;
  amount: number;
  due_date: string | null;
  paid_at: string | null;
  status: string;
  client_id: string;
  plan_id: string | null;
  client?: {
    full_name: string | null;
    phone: string | null;
  };
}

interface MonthlyData {
  month: string;
  received: number;
  pending: number;
  overdue: number;
}

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6'];

const FinanceDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { playClickSound } = useAudio();
  const { profile } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('6m');
  const [plans, setPlans] = useState<PaymentPlan[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [upcomingPayments, setUpcomingPayments] = useState<Payment[]>([]);
  const [sendingReminders, setSendingReminders] = useState(false);
  
  useEscapeBack({ to: '/admin' });

  useEffect(() => {
    loadDashboardData();
  }, [period]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Calculate date range based on period
      const now = new Date();
      let startDate: Date;
      switch (period) {
        case '1m':
          startDate = subMonths(now, 1);
          break;
        case '3m':
          startDate = subMonths(now, 3);
          break;
        case '6m':
          startDate = subMonths(now, 6);
          break;
        case '12m':
          startDate = subMonths(now, 12);
          break;
        default:
          startDate = subMonths(now, 6);
      }

      // Load payment plans
      const { data: plansData } = await supabase
        .from('payment_plans')
        .select(`
          *,
          client:profiles!payment_plans_client_id_fkey(full_name, phone)
        `)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });
      
      setPlans(plansData || []);

      // Load all payments
      const { data: paymentsData } = await supabase
        .from('payments')
        .select(`
          *,
          client:profiles!payments_client_id_fkey(full_name, phone)
        `)
        .gte('created_at', startDate.toISOString())
        .order('due_date', { ascending: true });
      
      setPayments(paymentsData || []);

      // Calculate monthly data
      const monthlyStats: Record<string, MonthlyData> = {};
      const months = parseInt(period.replace('m', ''));
      
      for (let i = 0; i < months; i++) {
        const monthDate = subMonths(now, i);
        const monthKey = format(monthDate, 'MMM/yy', { locale: ptBR });
        monthlyStats[monthKey] = { month: monthKey, received: 0, pending: 0, overdue: 0 };
      }

      (paymentsData || []).forEach(payment => {
        const paymentDate = payment.paid_at ? new Date(payment.paid_at) : (payment.due_date ? new Date(payment.due_date) : new Date());
        const monthKey = format(paymentDate, 'MMM/yy', { locale: ptBR });
        
        if (monthlyStats[monthKey]) {
          if (payment.status === 'paid') {
            monthlyStats[monthKey].received += payment.amount;
          } else if (payment.status === 'pending') {
            if (payment.due_date && new Date(payment.due_date) < now) {
              monthlyStats[monthKey].overdue += payment.amount;
            } else {
              monthlyStats[monthKey].pending += payment.amount;
            }
          }
        }
      });

      setMonthlyData(Object.values(monthlyStats).reverse());

      // Find payments due within 5 days
      const fiveDaysFromNow = addDays(now, 5);
      const upcoming = (paymentsData || []).filter(p => {
        if (p.status !== 'pending' || !p.due_date) return false;
        const dueDate = new Date(p.due_date);
        return dueDate >= now && dueDate <= fiveDaysFromNow;
      });
      setUpcomingPayments(upcoming);

    } catch (err) {
      console.error('Error loading dashboard:', err);
      toast.error('Erro ao carregar dashboard');
    } finally {
      setLoading(false);
    }
  };

  const sendWhatsAppReminder = (payment: Payment) => {
    const phone = payment.client?.phone?.replace(/\D/g, '');
    if (!phone) {
      toast.error('Cliente sem telefone cadastrado');
      return;
    }

    const daysUntilDue = payment.due_date ? differenceInDays(new Date(payment.due_date), new Date()) : 0;
    const dueText = daysUntilDue === 0 ? 'hoje' : daysUntilDue === 1 ? 'amanhã' : `em ${daysUntilDue} dias`;
    
    const message = `🏋️ *FRANCGYMPRO - Lembrete de Pagamento*\n\n` +
      `Olá ${payment.client?.full_name || 'Cliente'}!\n\n` +
      `Este é um lembrete amigável sobre sua parcela que vence *${dueText}* (${payment.due_date ? format(new Date(payment.due_date), 'dd/MM/yyyy') : '-'}).\n\n` +
      `💰 Valor: *${formatCurrency(payment.amount)}*\n\n` +
      `Por favor, regularize seu pagamento para continuar aproveitando nossos serviços.\n\n` +
      `Dúvidas? Entre em contato conosco!\n\n` +
      `Atenciosamente,\n*FRANCGYMPRO*`;

    const whatsappUrl = `https://wa.me/55${phone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    playClickSound();
  };

  const sendBulkReminders = async () => {
    if (upcomingPayments.length === 0) {
      toast.info('Não há pagamentos próximos do vencimento');
      return;
    }

    setSendingReminders(true);
    let sent = 0;

    for (const payment of upcomingPayments) {
      const phone = payment.client?.phone?.replace(/\D/g, '');
      if (phone) {
        sent++;
      }
    }

    if (sent === 0) {
      toast.error('Nenhum cliente com telefone cadastrado');
    } else {
      toast.success(`Pronto para enviar ${sent} lembretes via WhatsApp`);
      // Open first one
      if (upcomingPayments[0]) {
        sendWhatsAppReminder(upcomingPayments[0]);
      }
    }

    setSendingReminders(false);
  };

  // Calculate summary stats
  const totalReceived = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);
  const totalPending = payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0);
  const totalOverdue = payments.filter(p => p.status === 'pending' && p.due_date && new Date(p.due_date) < new Date()).reduce((sum, p) => sum + p.amount, 0);
  
  const planStatusData = [
    { name: 'Ativos', value: plans.filter(p => p.status === 'active').length, color: '#3b82f6' },
    { name: 'Quitados', value: plans.filter(p => p.status === 'completed').length, color: '#10b981' },
    { name: 'Cancelados', value: plans.filter(p => p.status === 'cancelled').length, color: '#ef4444' },
  ].filter(d => d.value > 0);

  const paymentStatusData = [
    { name: 'Pagos', value: payments.filter(p => p.status === 'paid').length, color: '#10b981' },
    { name: 'Pendentes', value: payments.filter(p => p.status === 'pending' && (!p.due_date || new Date(p.due_date) >= new Date())).length, color: '#f59e0b' },
    { name: 'Atrasados', value: payments.filter(p => p.status === 'pending' && p.due_date && new Date(p.due_date) < new Date()).length, color: '#ef4444' },
  ].filter(d => d.value > 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => { playClickSound(); navigate('/admin'); }}
            className="text-sm text-muted-foreground hover:text-blue-500 transition-colors"
          >
            <ArrowLeft size={16} className="inline mr-1" /> Voltar
          </button>
          <h2 className="text-xl sm:text-2xl font-bebas text-blue-500 flex items-center gap-2">
            <BarChart3 className="w-6 h-6" />
            DASHBOARD FINANCEIRO
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-32 bg-background/50">
              <Filter size={14} className="mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1m">Último mês</SelectItem>
              <SelectItem value="3m">3 meses</SelectItem>
              <SelectItem value="6m">6 meses</SelectItem>
              <SelectItem value="12m">12 meses</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-500/20 to-green-600/10 border-green-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Recebido</p>
                <p className="text-2xl font-bold text-green-500">{formatCurrency(totalReceived)}</p>
              </div>
              <CheckCircle className="w-10 h-10 text-green-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 border-yellow-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pendente</p>
                <p className="text-2xl font-bold text-yellow-500">{formatCurrency(totalPending - totalOverdue)}</p>
              </div>
              <Clock className="w-10 h-10 text-yellow-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500/20 to-red-600/10 border-red-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Em Atraso</p>
                <p className="text-2xl font-bold text-red-500">{formatCurrency(totalOverdue)}</p>
              </div>
              <AlertTriangle className="w-10 h-10 text-red-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border-blue-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Carnês</p>
                <p className="text-2xl font-bold text-blue-500">{plans.length}</p>
              </div>
              <FileText className="w-10 h-10 text-blue-500/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Payments Alert */}
      {upcomingPayments.length > 0 && (
        <Card className="border-yellow-500/50 bg-yellow-500/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-yellow-500 flex items-center gap-2 text-lg">
              <AlertTriangle size={18} />
              Pagamentos Próximos do Vencimento ({upcomingPayments.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {upcomingPayments.slice(0, 5).map(payment => (
                <div key={payment.id} className="flex items-center justify-between p-2 bg-background/50 rounded-lg">
                  <div>
                    <p className="font-medium">{payment.client?.full_name || 'Cliente'}</p>
                    <p className="text-sm text-muted-foreground">
                      Vence em {payment.due_date ? format(new Date(payment.due_date), 'dd/MM') : '-'} • {formatCurrency(payment.amount)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-green-500 text-green-500 hover:bg-green-500/20"
                    onClick={() => sendWhatsAppReminder(payment)}
                  >
                    <MessageCircle size={14} className="mr-1" />
                    Lembrar
                  </Button>
                </div>
              ))}
            </div>
            <Button
              className="w-full mt-3 bg-green-600 hover:bg-green-700"
              onClick={sendBulkReminders}
              disabled={sendingReminders}
            >
              {sendingReminders ? (
                <Loader2 size={16} className="mr-2 animate-spin" />
              ) : (
                <Send size={16} className="mr-2" />
              )}
              Enviar Lembretes em Massa
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="text-primary" size={18} />
              Receita Mensal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                  formatter={(value: number) => [formatCurrency(value), '']}
                />
                <Legend />
                <Area type="monotone" dataKey="received" name="Recebido" fill="#10b981" stroke="#10b981" fillOpacity={0.3} />
                <Area type="monotone" dataKey="pending" name="Pendente" fill="#f59e0b" stroke="#f59e0b" fillOpacity={0.3} />
                <Area type="monotone" dataKey="overdue" name="Atrasado" fill="#ef4444" stroke="#ef4444" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Payment Status Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="text-primary" size={18} />
              Status dos Pagamentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPieChart>
                <Pie
                  data={paymentStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {paymentStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                  formatter={(value: number) => [value, 'Parcelas']}
                />
              </RechartsPieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Carnê Status Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="text-primary" size={18} />
            Status dos Carnês
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ResponsiveContainer width="100%" height={250}>
              <RechartsPieChart>
                <Pie
                  data={planStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {planStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                />
              </RechartsPieChart>
            </ResponsiveContainer>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-blue-500/10 rounded-lg border border-blue-500/30">
                <div className="flex items-center gap-2">
                  <Clock className="text-blue-500" size={20} />
                  <span>Carnês Ativos</span>
                </div>
                <span className="text-2xl font-bold text-blue-500">{plans.filter(p => p.status === 'active').length}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg border border-green-500/30">
                <div className="flex items-center gap-2">
                  <CheckCircle className="text-green-500" size={20} />
                  <span>Carnês Quitados</span>
                </div>
                <span className="text-2xl font-bold text-green-500">{plans.filter(p => p.status === 'completed').length}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-red-500/10 rounded-lg border border-red-500/30">
                <div className="flex items-center gap-2">
                  <XCircle className="text-red-500" size={20} />
                  <span>Carnês Cancelados</span>
                </div>
                <span className="text-2xl font-bold text-red-500">{plans.filter(p => p.status === 'cancelled').length}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Comparison Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="text-primary" size={18} />
            Comparativo Mensal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                formatter={(value: number) => [formatCurrency(value), '']}
              />
              <Legend />
              <Bar dataKey="received" name="Recebido" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="pending" name="Pendente" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              <Bar dataKey="overdue" name="Atrasado" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default FinanceDashboard;
