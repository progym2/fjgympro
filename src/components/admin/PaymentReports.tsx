import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, BarChart3, TrendingUp, Calendar, Filter,
  Loader2, DollarSign, AlertTriangle, CheckCircle, Clock,
  Download, Bell, Percent
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAudio } from '@/contexts/AudioContext';
import { useAuth } from '@/contexts/AuthContext';
import { useEscapeBack } from '@/hooks/useEscapeBack';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/printUtils';
import { format, startOfMonth, endOfMonth, subMonths, differenceInDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';

interface PaymentData {
  id: string;
  amount: number;
  status: string;
  due_date: string | null;
  paid_at: string | null;
  late_fee: number | null;
  payment_method: string | null;
  client: { full_name: string; username: string } | null;
}

interface MonthlyStats {
  month: string;
  received: number;
  pending: number;
  overdue: number;
  lateFees: number;
}

const LATE_FEE_PERCENTAGE = 2; // 2% per day late
const MAX_LATE_FEE_PERCENTAGE = 20; // Maximum 20% late fee

const PaymentReports: React.FC = () => {
  const navigate = useNavigate();
  const { playClickSound } = useAudio();
  const { profile, role } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats[]>([]);

  // ESC para voltar ao menu admin
  useEscapeBack({ to: '/admin' });
  const [selectedPeriod, setSelectedPeriod] = useState('3');
  const [sendingReminders, setSendingReminders] = useState(false);

  const isMaster = role === 'master';

  const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#6366f1'];

  useEffect(() => {
    loadReports();
  }, [selectedPeriod]);

  const calculateLateFee = (dueDate: string, amount: number): number => {
    const now = new Date();
    const due = parseISO(dueDate);
    const daysLate = differenceInDays(now, due);
    
    if (daysLate <= 0) return 0;
    
    const feePercentage = Math.min(daysLate * LATE_FEE_PERCENTAGE, MAX_LATE_FEE_PERCENTAGE);
    return (amount * feePercentage) / 100;
  };

  const loadReports = async () => {
    setLoading(true);
    try {
      const months = parseInt(selectedPeriod);
      const startDate = startOfMonth(subMonths(new Date(), months - 1));
      
      // Get profile IDs if not master
      let myProfileIds: string[] = [];
      if (!isMaster && profile?.profile_id) {
        const { data: myProfiles } = await supabase
          .from('profiles')
          .select('id')
          .eq('created_by_admin', profile.profile_id);
        myProfileIds = (myProfiles || []).map(p => p.id);
      }

      let query = supabase
        .from('payments')
        .select(`
          id, amount, status, due_date, paid_at, late_fee, payment_method, client_id,
          profiles!payments_client_id_fkey (full_name, username)
        `)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (!isMaster && myProfileIds.length > 0) {
        query = query.in('client_id', myProfileIds);
      }

      const { data, error } = await query;
      if (error) throw error;

      const paymentsData = (data || []).map((p: any) => ({
        ...p,
        client: p.profiles ? { full_name: p.profiles.full_name, username: p.profiles.username } : null,
      }));

      setPayments(paymentsData);

      // Calculate monthly stats
      const stats: MonthlyStats[] = [];
      for (let i = months - 1; i >= 0; i--) {
        const monthStart = startOfMonth(subMonths(new Date(), i));
        const monthEnd = endOfMonth(subMonths(new Date(), i));
        const monthName = format(monthStart, 'MMM/yy', { locale: ptBR });

        const monthPayments = paymentsData.filter((p: PaymentData) => {
          const paidDate = p.paid_at ? parseISO(p.paid_at) : null;
          const dueDate = p.due_date ? parseISO(p.due_date) : null;
          const checkDate = paidDate || dueDate;
          return checkDate && checkDate >= monthStart && checkDate <= monthEnd;
        });

        const received = monthPayments
          .filter((p: PaymentData) => p.status === 'paid')
          .reduce((sum: number, p: PaymentData) => sum + p.amount, 0);
        
        const pending = monthPayments
          .filter((p: PaymentData) => p.status === 'pending' && (!p.due_date || parseISO(p.due_date) >= new Date()))
          .reduce((sum: number, p: PaymentData) => sum + p.amount, 0);

        const overdue = monthPayments
          .filter((p: PaymentData) => p.status === 'pending' && p.due_date && parseISO(p.due_date) < new Date())
          .reduce((sum: number, p: PaymentData) => sum + p.amount, 0);

        const lateFees = monthPayments
          .filter((p: PaymentData) => p.late_fee && p.late_fee > 0)
          .reduce((sum: number, p: PaymentData) => sum + (p.late_fee || 0), 0);

        stats.push({ month: monthName, received, pending, overdue, lateFees });
      }

      setMonthlyStats(stats);
    } catch (err) {
      console.error('Error:', err);
      toast.error('Erro ao carregar relatórios');
    } finally {
      setLoading(false);
    }
  };

  const sendOverdueReminders = async () => {
    playClickSound();
    setSendingReminders(true);

    try {
      const overduePayments = payments.filter(p => 
        p.status === 'pending' && p.due_date && parseISO(p.due_date) < new Date()
      );

      const uniqueClients = [...new Set(overduePayments.map(p => p.client?.full_name))];
      
      for (const payment of overduePayments) {
        if (!payment.client) continue;
        
        const daysLate = differenceInDays(new Date(), parseISO(payment.due_date!));
        const lateFee = calculateLateFee(payment.due_date!, payment.amount);
        const totalDue = payment.amount + lateFee;

        // Update late fee in database
        await supabase
          .from('payments')
          .update({ late_fee: lateFee })
          .eq('id', payment.id);

        // Get client profile_id
        const { data: clientProfile } = await supabase
          .from('profiles')
          .select('id')
          .or(`full_name.eq.${payment.client.full_name},username.eq.${payment.client.username}`)
          .single();

        if (clientProfile) {
          await supabase
            .from('notifications')
            .insert({
              profile_id: clientProfile.id,
              title: '⚠️ Pagamento em Atraso',
              message: `Seu pagamento de ${formatCurrency(payment.amount)} está ${daysLate} dia(s) em atraso. Juros acumulados: ${formatCurrency(lateFee)}. Total a pagar: ${formatCurrency(totalDue)}. Regularize sua situação para evitar mais encargos.`,
              type: 'payment_reminder',
            });
        }
      }

      toast.success(`Lembretes enviados para ${uniqueClients.length} cliente(s)!`);
      loadReports();
    } catch (err) {
      console.error('Error:', err);
      toast.error('Erro ao enviar lembretes');
    } finally {
      setSendingReminders(false);
    }
  };

  const applyLateFees = async () => {
    playClickSound();
    
    try {
      const overduePayments = payments.filter(p => 
        p.status === 'pending' && p.due_date && parseISO(p.due_date) < new Date()
      );

      let updated = 0;
      for (const payment of overduePayments) {
        const lateFee = calculateLateFee(payment.due_date!, payment.amount);
        
        if (lateFee !== payment.late_fee) {
          await supabase
            .from('payments')
            .update({ late_fee: lateFee })
            .eq('id', payment.id);
          updated++;
        }
      }

      toast.success(`Juros atualizados em ${updated} pagamento(s)!`);
      loadReports();
    } catch (err) {
      console.error('Error:', err);
      toast.error('Erro ao aplicar juros');
    }
  };

  // Summary calculations
  const totalReceived = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);
  const totalPending = payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0);
  const totalOverdue = payments.filter(p => p.status === 'pending' && p.due_date && parseISO(p.due_date) < new Date()).reduce((sum, p) => sum + p.amount, 0);
  const totalLateFees = payments.reduce((sum, p) => sum + (p.late_fee || 0), 0);
  const overdueCount = payments.filter(p => p.status === 'pending' && p.due_date && parseISO(p.due_date) < new Date()).length;

  // Pie chart data
  const pieData = [
    { name: 'Recebido', value: totalReceived },
    { name: 'Pendente', value: totalPending - totalOverdue },
    { name: 'Em Atraso', value: totalOverdue },
  ].filter(d => d.value > 0);

  // Payment method distribution
  const methodStats = payments
    .filter(p => p.status === 'paid')
    .reduce((acc: Record<string, number>, p) => {
      const method = p.payment_method || 'pending';
      acc[method] = (acc[method] || 0) + p.amount;
      return acc;
    }, {});

  const methodData = Object.entries(methodStats).map(([name, value]) => ({
    name: name === 'cash' ? 'Dinheiro' : name === 'pix' ? 'PIX' : name === 'card' ? 'Cartão' : 'Outro',
    value,
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => { playClickSound(); navigate('/admin'); }}
            className="text-sm text-muted-foreground hover:text-blue-500 transition-colors"
          >
            <ArrowLeft size={16} className="inline mr-1" /> Voltar
          </button>
          <h2 className="text-xl sm:text-2xl font-bebas text-blue-500 flex items-center gap-2">
            <BarChart3 className="w-6 h-6" />
            RELATÓRIO DE PAGAMENTOS
          </h2>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-36 bg-background/50">
              <Filter size={14} className="mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Último mês</SelectItem>
              <SelectItem value="3">3 meses</SelectItem>
              <SelectItem value="6">6 meses</SelectItem>
              <SelectItem value="12">12 meses</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-card/80 backdrop-blur-md rounded-xl p-4 border border-green-500/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Recebido</p>
              <p className="text-lg font-bebas text-green-500">{formatCurrency(totalReceived)}</p>
            </div>
          </div>
        </div>
        <div className="bg-card/80 backdrop-blur-md rounded-xl p-4 border border-yellow-500/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pendente</p>
              <p className="text-lg font-bebas text-yellow-500">{formatCurrency(totalPending)}</p>
            </div>
          </div>
        </div>
        <div className="bg-card/80 backdrop-blur-md rounded-xl p-4 border border-red-500/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Em Atraso ({overdueCount})</p>
              <p className="text-lg font-bebas text-red-500">{formatCurrency(totalOverdue)}</p>
            </div>
          </div>
        </div>
        <div className="bg-card/80 backdrop-blur-md rounded-xl p-4 border border-purple-500/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Percent className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Juros Acumulados</p>
              <p className="text-lg font-bebas text-purple-500">{formatCurrency(totalLateFees)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      {overdueCount > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <div>
              <p className="font-semibold text-red-400">Pagamentos em Atraso</p>
              <p className="text-sm text-muted-foreground">
                {overdueCount} pagamento(s) em atraso. Taxa de juros: {LATE_FEE_PERCENTAGE}% ao dia (máx. {MAX_LATE_FEE_PERCENTAGE}%)
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
              onClick={applyLateFees}
            >
              <Percent size={14} className="mr-1" /> Calcular Juros
            </Button>
            <Button
              size="sm"
              className="bg-red-600 hover:bg-red-700"
              onClick={sendOverdueReminders}
              disabled={sendingReminders}
            >
              {sendingReminders ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <><Bell size={14} className="mr-1" /> Enviar Lembretes</>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Charts */}
      <Tabs defaultValue="monthly" className="space-y-4">
        <TabsList className="bg-card/50">
          <TabsTrigger value="monthly">Evolução Mensal</TabsTrigger>
          <TabsTrigger value="distribution">Distribuição</TabsTrigger>
          <TabsTrigger value="methods">Formas de Pagamento</TabsTrigger>
        </TabsList>

        <TabsContent value="monthly">
          <div className="bg-card/80 backdrop-blur-md rounded-xl p-4 border border-border/50">
            <h3 className="font-bebas text-lg mb-4">EVOLUÇÃO MENSAL DE PAGAMENTOS</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} />
                  <YAxis stroke="#9ca3af" fontSize={12} tickFormatter={(v) => `R$${v}`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Legend />
                  <Bar dataKey="received" name="Recebido" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="pending" name="Pendente" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="overdue" name="Em Atraso" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="distribution">
          <div className="bg-card/80 backdrop-blur-md rounded-xl p-4 border border-border/50">
            <h3 className="font-bebas text-lg mb-4">DISTRIBUIÇÃO DE PAGAMENTOS</h3>
            <div className="h-72 flex items-center justify-center">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground">Sem dados para exibir</p>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="methods">
          <div className="bg-card/80 backdrop-blur-md rounded-xl p-4 border border-border/50">
            <h3 className="font-bebas text-lg mb-4">FORMAS DE PAGAMENTO UTILIZADAS</h3>
            <div className="h-72">
              {methodData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={methodData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {methodData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground text-center">Sem dados para exibir</p>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Recent Overdue List */}
      {overdueCount > 0 && (
        <div className="bg-card/80 backdrop-blur-md rounded-xl border border-border/50 overflow-hidden">
          <div className="p-4 border-b border-border/50 flex items-center justify-between">
            <h3 className="font-bebas text-lg text-red-400">PAGAMENTOS EM ATRASO</h3>
            <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded-full">{overdueCount} pagamento(s)</span>
          </div>
          <div className="divide-y divide-border/50 max-h-64 overflow-y-auto">
            {payments
              .filter(p => p.status === 'pending' && p.due_date && parseISO(p.due_date) < new Date())
              .slice(0, 10)
              .map((payment) => {
                const daysLate = differenceInDays(new Date(), parseISO(payment.due_date!));
                const lateFee = calculateLateFee(payment.due_date!, payment.amount);
                const totalDue = payment.amount + lateFee;

                return (
                  <div key={payment.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold">{payment.client?.full_name || 'Cliente'}</p>
                      <p className="text-sm text-muted-foreground">
                        Venceu em {format(parseISO(payment.due_date!), 'dd/MM/yyyy')} ({daysLate} dias)
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground line-through">{formatCurrency(payment.amount)}</p>
                      <p className="font-bebas text-lg text-red-400">
                        {formatCurrency(totalDue)}
                        <span className="text-xs ml-1">(+{formatCurrency(lateFee)} juros)</span>
                      </p>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default PaymentReports;
