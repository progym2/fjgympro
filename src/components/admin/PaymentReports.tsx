import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, BarChart3, TrendingUp, Calendar, Filter,
  Loader2, DollarSign, AlertTriangle, CheckCircle, Clock,
  Download, Bell, Percent, MessageCircle, User, CreditCard,
  Banknote, Smartphone, Search, Send
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAudio } from '@/contexts/AudioContext';
import { useAuth } from '@/contexts/AuthContext';
import { useEscapeBack } from '@/hooks/useEscapeBack';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/printUtils';
import { format, startOfMonth, endOfMonth, subMonths, differenceInDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

interface PaymentData {
  id: string;
  amount: number;
  status: string;
  due_date: string | null;
  paid_at: string | null;
  late_fee: number | null;
  payment_method: string | null;
  client_id: string;
  client: { full_name: string; username: string; phone: string | null } | null;
}

interface MonthlyStats {
  month: string;
  received: number;
  pending: number;
  overdue: number;
  lateFees: number;
}

interface ClientOption {
  id: string;
  full_name: string;
  username: string;
  phone: string | null;
}

const LATE_FEE_PERCENTAGE = 2;
const MAX_LATE_FEE_PERCENTAGE = 20;
const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#6366f1'];

const PaymentReports: React.FC = () => {
  const navigate = useNavigate();
  const { playClickSound } = useAudio();
  const { profile, role } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);

  // Filters
  const [selectedPeriod, setSelectedPeriod] = useState('3');
  const [selectedClient, setSelectedClient] = useState('all');
  const [selectedMethod, setSelectedMethod] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [sendingReminders, setSendingReminders] = useState(false);

  useEscapeBack({ to: '/admin' });

  const isMaster = role === 'master';

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
          profiles!payments_client_id_fkey (full_name, username, phone)
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
        client: p.profiles ? { 
          full_name: p.profiles.full_name, 
          username: p.profiles.username,
          phone: p.profiles.phone 
        } : null,
      }));

      setPayments(paymentsData);

      // Extract unique clients
      const uniqueClients = new Map<string, ClientOption>();
      paymentsData.forEach((p: PaymentData) => {
        if (p.client && !uniqueClients.has(p.client_id)) {
          uniqueClients.set(p.client_id, {
            id: p.client_id,
            full_name: p.client.full_name,
            username: p.client.username,
            phone: p.client.phone
          });
        }
      });
      setClients(Array.from(uniqueClients.values()));

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

  // Filtered payments
  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      const matchesClient = selectedClient === 'all' || p.client_id === selectedClient;
      const matchesMethod = selectedMethod === 'all' || p.payment_method === selectedMethod;
      const matchesSearch = !searchTerm || 
        p.client?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.client?.username?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesClient && matchesMethod && matchesSearch;
    });
  }, [payments, selectedClient, selectedMethod, searchTerm]);

  const sendWhatsAppReminder = (phone: string | null, clientName: string, amount: number, daysLate: number) => {
    if (!phone) {
      toast.error('Cliente sem telefone cadastrado');
      return;
    }
    
    const cleanPhone = phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    const lateFee = calculateLateFee(new Date().toISOString(), amount);
    const total = amount + lateFee;
    
    const message = encodeURIComponent(
      `Olá ${clientName}! 👋\n\n` +
      `Identificamos que seu pagamento está em atraso há ${daysLate} dia(s).\n\n` +
      `💰 Valor original: ${formatCurrency(amount)}\n` +
      `📈 Juros acumulados: ${formatCurrency(lateFee)}\n` +
      `💵 *Total a pagar: ${formatCurrency(total)}*\n\n` +
      `Por favor, regularize seu pagamento o mais breve possível.\n\n` +
      `Qualquer dúvida, estamos à disposição! 🏋️`
    );
    
    window.open(`https://wa.me/${formattedPhone}?text=${message}`, '_blank');
    toast.success('WhatsApp aberto para envio!');
  };

  const sendBulkWhatsAppReminders = () => {
    playClickSound();
    const overduePayments = filteredPayments.filter(p => 
      p.status === 'pending' && p.due_date && parseISO(p.due_date) < new Date() && p.client?.phone
    );

    if (overduePayments.length === 0) {
      toast.error('Nenhum cliente inadimplente com telefone cadastrado');
      return;
    }

    // Open first one and show count
    const first = overduePayments[0];
    const daysLate = differenceInDays(new Date(), parseISO(first.due_date!));
    sendWhatsAppReminder(first.client?.phone || null, first.client?.full_name || 'Cliente', first.amount, daysLate);
    
    if (overduePayments.length > 1) {
      toast.info(`Mais ${overduePayments.length - 1} cliente(s) para enviar mensagem`);
    }
  };

  const sendOverdueReminders = async () => {
    playClickSound();
    setSendingReminders(true);

    try {
      const overduePayments = filteredPayments.filter(p => 
        p.status === 'pending' && p.due_date && parseISO(p.due_date) < new Date()
      );

      const uniqueClients = [...new Set(overduePayments.map(p => p.client?.full_name))];
      
      for (const payment of overduePayments) {
        if (!payment.client) continue;
        
        const daysLate = differenceInDays(new Date(), parseISO(payment.due_date!));
        const lateFee = calculateLateFee(payment.due_date!, payment.amount);
        const totalDue = payment.amount + lateFee;

        await supabase
          .from('payments')
          .update({ late_fee: lateFee })
          .eq('id', payment.id);

        const { data: clientProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('full_name', payment.client.full_name)
          .single();

        if (clientProfile) {
          await supabase
            .from('notifications')
            .insert({
              profile_id: clientProfile.id,
              title: '⚠️ Pagamento em Atraso',
              message: `Seu pagamento de ${formatCurrency(payment.amount)} está ${daysLate} dia(s) em atraso. Juros: ${formatCurrency(lateFee)}. Total: ${formatCurrency(totalDue)}.`,
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
      const overduePayments = filteredPayments.filter(p => 
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

  // Summary calculations with filters
  const totalReceived = filteredPayments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);
  const totalPending = filteredPayments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0);
  const totalOverdue = filteredPayments.filter(p => p.status === 'pending' && p.due_date && parseISO(p.due_date) < new Date()).reduce((sum, p) => sum + p.amount, 0);
  const totalLateFees = filteredPayments.reduce((sum, p) => sum + (p.late_fee || 0), 0);
  const overdueCount = filteredPayments.filter(p => p.status === 'pending' && p.due_date && parseISO(p.due_date) < new Date()).length;

  const pieData = [
    { name: 'Recebido', value: totalReceived },
    { name: 'Pendente', value: totalPending - totalOverdue },
    { name: 'Em Atraso', value: totalOverdue },
  ].filter(d => d.value > 0);

  const methodStats = filteredPayments
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

  const getMethodIcon = (method: string | null) => {
    switch (method) {
      case 'pix': return <Smartphone size={14} className="text-green-500" />;
      case 'card': return <CreditCard size={14} className="text-blue-500" />;
      default: return <Banknote size={14} className="text-emerald-500" />;
    }
  };

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
      </div>

      {/* Filters */}
      <div className="bg-card/80 backdrop-blur-md rounded-xl p-4 border border-border/50">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Filtros:</span>
          </div>
          
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-32 bg-background/50">
              <Calendar size={14} className="mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Último mês</SelectItem>
              <SelectItem value="3">3 meses</SelectItem>
              <SelectItem value="6">6 meses</SelectItem>
              <SelectItem value="12">12 meses</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedClient} onValueChange={setSelectedClient}>
            <SelectTrigger className="w-44 bg-background/50">
              <User size={14} className="mr-1" />
              <SelectValue placeholder="Todos clientes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os clientes</SelectItem>
              {clients.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.full_name || c.username}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedMethod} onValueChange={setSelectedMethod}>
            <SelectTrigger className="w-36 bg-background/50">
              <CreditCard size={14} className="mr-1" />
              <SelectValue placeholder="Método" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos métodos</SelectItem>
              <SelectItem value="cash">Dinheiro</SelectItem>
              <SelectItem value="pix">PIX</SelectItem>
              <SelectItem value="card">Cartão</SelectItem>
            </SelectContent>
          </Select>

          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-background/50"
            />
          </div>
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
                {overdueCount} pagamento(s) em atraso. Taxa: {LATE_FEE_PERCENTAGE}% ao dia (máx. {MAX_LATE_FEE_PERCENTAGE}%)
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-green-500/50 text-green-400 hover:bg-green-500/10"
              onClick={sendBulkWhatsAppReminders}
            >
              <MessageCircle size={14} className="mr-1" /> WhatsApp
            </Button>
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
          <TabsTrigger value="list">Lista Detalhada</TabsTrigger>
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

        <TabsContent value="list">
          <div className="bg-card/80 backdrop-blur-md rounded-xl border border-border/50 overflow-hidden">
            <div className="p-4 border-b border-border/50">
              <h3 className="font-bebas text-lg">LISTA DE PAGAMENTOS ({filteredPayments.length})</h3>
            </div>
            <div className="divide-y divide-border/50 max-h-96 overflow-y-auto">
              {filteredPayments.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <DollarSign className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhum pagamento encontrado com os filtros selecionados</p>
                </div>
              ) : (
                filteredPayments.slice(0, 50).map((payment) => {
                  const isOverdue = payment.status === 'pending' && payment.due_date && parseISO(payment.due_date) < new Date();
                  const daysLate = payment.due_date ? differenceInDays(new Date(), parseISO(payment.due_date)) : 0;
                  const lateFee = isOverdue ? calculateLateFee(payment.due_date!, payment.amount) : 0;
                  
                  return (
                    <div key={payment.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-background/30">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          payment.status === 'paid' ? 'bg-green-500/20' : isOverdue ? 'bg-red-500/20' : 'bg-yellow-500/20'
                        }`}>
                          {payment.status === 'paid' ? (
                            <CheckCircle size={18} className="text-green-500" />
                          ) : isOverdue ? (
                            <AlertTriangle size={18} className="text-red-500" />
                          ) : (
                            <Clock size={18} className="text-yellow-500" />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold">{payment.client?.full_name || 'Cliente'}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            {payment.paid_at ? (
                              <span>Pago em {format(parseISO(payment.paid_at), 'dd/MM/yyyy')}</span>
                            ) : payment.due_date ? (
                              <span className={isOverdue ? 'text-red-400' : ''}>
                                Vence em {format(parseISO(payment.due_date), 'dd/MM/yyyy')}
                                {isOverdue && ` (${daysLate} dias atraso)`}
                              </span>
                            ) : null}
                            {payment.payment_method && (
                              <span className="flex items-center gap-1">
                                {getMethodIcon(payment.payment_method)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className={`font-bebas text-lg ${
                            payment.status === 'paid' ? 'text-green-500' : isOverdue ? 'text-red-500' : 'text-yellow-500'
                          }`}>
                            {formatCurrency(payment.amount + lateFee)}
                          </p>
                          {lateFee > 0 && (
                            <p className="text-xs text-red-400">+{formatCurrency(lateFee)} juros</p>
                          )}
                        </div>
                        {isOverdue && payment.client?.phone && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-green-500 hover:bg-green-500/10"
                            onClick={() => sendWhatsAppReminder(
                              payment.client?.phone || null, 
                              payment.client?.full_name || 'Cliente', 
                              payment.amount, 
                              daysLate
                            )}
                          >
                            <MessageCircle size={18} />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
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
            {filteredPayments
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
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground line-through">{formatCurrency(payment.amount)}</p>
                        <p className="font-bebas text-lg text-red-400">
                          {formatCurrency(totalDue)}
                          <span className="text-xs ml-1">(+{formatCurrency(lateFee)} juros)</span>
                        </p>
                      </div>
                      {payment.client?.phone && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-green-500 hover:bg-green-500/10"
                          onClick={() => sendWhatsAppReminder(
                            payment.client?.phone || null, 
                            payment.client?.full_name || 'Cliente', 
                            payment.amount, 
                            daysLate
                          )}
                        >
                          <MessageCircle size={18} />
                        </Button>
                      )}
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
