import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  CreditCard, Plus, Search, Filter, DollarSign, 
  Calendar, User, CheckCircle, XCircle, Clock,
  Receipt, FileText, Send, Trash2, Edit2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAudio } from '@/contexts/AudioContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import InstructorPageHeader from './InstructorPageHeader';

interface Payment {
  id: string;
  client_id: string;
  amount: number;
  description: string | null;
  status: string | null;
  due_date: string | null;
  paid_at: string | null;
  created_at: string | null;
  discount_percentage: number | null;
  late_fee: number | null;
  receipt_number: string | null;
  client?: {
    full_name: string;
    username: string;
  };
}

interface Client {
  id: string;
  full_name: string;
  username: string;
}

const Finance: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { playClickSound } = useAudio();
  
  const [payments, setPayments] = useState<Payment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  
  // Form state
  const [newPayment, setNewPayment] = useState({
    client_id: '',
    amount: '',
    description: '',
    due_date: format(new Date(), 'yyyy-MM-dd'),
    discount_percentage: '0',
    late_fee: '0'
  });

  useEffect(() => {
    if (profile?.profile_id) {
      loadData();
    }
  }, [profile?.profile_id]);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadClients(), loadPayments()]);
    setLoading(false);
  };

  const loadClients = async () => {
    if (!profile?.profile_id) return;
    
    const { data, error } = await supabase
      .from('instructor_clients')
      .select(`
        client_id,
        profiles!instructor_clients_client_id_fkey (
          id,
          full_name,
          username
        )
      `)
      .eq('instructor_id', profile.profile_id)
      .eq('is_active', true)
      .eq('link_status', 'accepted');

    if (!error && data) {
      const clientList = data
        .filter(d => d.profiles)
        .map(d => ({
          id: (d.profiles as any).id,
          full_name: (d.profiles as any).full_name || (d.profiles as any).username,
          username: (d.profiles as any).username
        }));
      setClients(clientList);
    }
  };

  const loadPayments = async () => {
    if (!profile?.profile_id) return;

    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        profiles!payments_client_id_fkey (
          full_name,
          username
        )
      `)
      .eq('instructor_id', profile.profile_id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      const paymentsWithClients = data.map(p => ({
        ...p,
        client: p.profiles ? {
          full_name: (p.profiles as any).full_name || (p.profiles as any).username,
          username: (p.profiles as any).username
        } : undefined
      }));
      setPayments(paymentsWithClients);
    }
  };

  const handleCreatePayment = async () => {
    if (!newPayment.client_id || !newPayment.amount) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    const receiptNumber = `REC-${Date.now().toString(36).toUpperCase()}`;

    const { error } = await supabase
      .from('payments')
      .insert({
        client_id: newPayment.client_id,
        instructor_id: profile?.profile_id,
        amount: parseFloat(newPayment.amount),
        description: newPayment.description || 'Mensalidade',
        due_date: newPayment.due_date,
        discount_percentage: parseFloat(newPayment.discount_percentage) || 0,
        late_fee: parseFloat(newPayment.late_fee) || 0,
        status: 'pending',
        receipt_number: receiptNumber
      });

    if (error) {
      toast.error('Erro ao criar cobrança');
      console.error(error);
    } else {
      toast.success('Cobrança criada com sucesso!');
      setDialogOpen(false);
      setNewPayment({
        client_id: '',
        amount: '',
        description: '',
        due_date: format(new Date(), 'yyyy-MM-dd'),
        discount_percentage: '0',
        late_fee: '0'
      });
      loadPayments();
    }
  };

  const handleMarkAsPaid = async (paymentId: string) => {
    playClickSound();
    const { error } = await supabase
      .from('payments')
      .update({ 
        status: 'paid',
        paid_at: new Date().toISOString()
      })
      .eq('id', paymentId);

    if (error) {
      toast.error('Erro ao atualizar pagamento');
    } else {
      toast.success('Pagamento confirmado!');
      loadPayments();
    }
  };

  const handleCancelPayment = async (paymentId: string) => {
    playClickSound();
    const { error } = await supabase
      .from('payments')
      .update({ status: 'cancelled' })
      .eq('id', paymentId);

    if (error) {
      toast.error('Erro ao cancelar cobrança');
    } else {
      toast.success('Cobrança cancelada');
      loadPayments();
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    playClickSound();
    const { error } = await supabase
      .from('payments')
      .delete()
      .eq('id', paymentId);

    if (error) {
      toast.error('Erro ao excluir cobrança');
    } else {
      toast.success('Cobrança excluída');
      loadPayments();
    }
  };

  const sendPaymentAlert = async (payment: Payment) => {
    playClickSound();
    // Create notification for the client
    const { error } = await supabase
      .from('notifications')
      .insert({
        profile_id: payment.client_id,
        title: 'Cobrança Pendente',
        message: `Você possui uma cobrança de R$ ${payment.amount.toFixed(2)} com vencimento em ${payment.due_date ? format(parseISO(payment.due_date), 'dd/MM/yyyy') : 'N/A'}. ${payment.description || ''}`,
        type: 'payment'
      });

    if (error) {
      toast.error('Erro ao enviar alerta');
    } else {
      toast.success('Alerta enviado para o aluno!');
    }
  };

  const filteredPayments = payments.filter(p => {
    const matchesSearch = p.client?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         p.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: payments.reduce((sum, p) => sum + (p.status !== 'cancelled' ? p.amount : 0), 0),
    paid: payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0),
    pending: payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0),
    overdue: payments.filter(p => p.status === 'pending' && p.due_date && new Date(p.due_date) < new Date())
      .reduce((sum, p) => sum + p.amount, 0)
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'paid':
        return <span className="px-2 py-1 text-xs rounded-full bg-emerald-500/20 text-emerald-500 border border-emerald-500/30">Pago</span>;
      case 'cancelled':
        return <span className="px-2 py-1 text-xs rounded-full bg-destructive/20 text-destructive border border-destructive/30">Cancelado</span>;
      default:
        return <span className="px-2 py-1 text-xs rounded-full bg-yellow-500/20 text-yellow-500 border border-yellow-500/30">Pendente</span>;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col h-full"
    >
      <InstructorPageHeader 
        title="FINANCEIRO"
        icon={<CreditCard className="w-6 h-6" />}
        iconColor="text-emerald-500"
      />
      
      <div className="flex-1 overflow-auto space-y-4 sm:space-y-6">
        {/* Actions */}
        <div className="flex justify-end">

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              onClick={() => playClickSound()} 
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Plus size={18} className="mr-2" />
              Nova Cobrança
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="font-bebas text-emerald-500 text-xl">
                Nova Cobrança
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Aluno *</Label>
                <Select
                  value={newPayment.client_id}
                  onValueChange={(v) => setNewPayment({ ...newPayment, client_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o aluno" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map(client => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valor (R$) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newPayment.amount}
                    onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                    placeholder="0,00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Vencimento</Label>
                  <Input
                    type="date"
                    value={newPayment.due_date}
                    onChange={(e) => setNewPayment({ ...newPayment, due_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Input
                  value={newPayment.description}
                  onChange={(e) => setNewPayment({ ...newPayment, description: e.target.value })}
                  placeholder="Ex: Mensalidade Janeiro"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Desconto (%)</Label>
                  <Input
                    type="number"
                    value={newPayment.discount_percentage}
                    onChange={(e) => setNewPayment({ ...newPayment, discount_percentage: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Multa Atraso (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newPayment.late_fee}
                    onChange={(e) => setNewPayment({ ...newPayment, late_fee: e.target.value })}
                    placeholder="0,00"
                  />
                </div>
              </div>
              <Button onClick={handleCreatePayment} className="w-full bg-emerald-600 hover:bg-emerald-700">
                Criar Cobrança
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-card/80 backdrop-blur-md rounded-xl p-4 border border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <DollarSign size={20} className="text-emerald-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-lg font-bebas text-foreground">R$ {stats.total.toFixed(2)}</p>
            </div>
          </div>
        </div>
        <div className="bg-card/80 backdrop-blur-md rounded-xl p-4 border border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <CheckCircle size={20} className="text-green-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Recebido</p>
              <p className="text-lg font-bebas text-green-500">R$ {stats.paid.toFixed(2)}</p>
            </div>
          </div>
        </div>
        <div className="bg-card/80 backdrop-blur-md rounded-xl p-4 border border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
              <Clock size={20} className="text-yellow-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pendente</p>
              <p className="text-lg font-bebas text-yellow-500">R$ {stats.pending.toFixed(2)}</p>
            </div>
          </div>
        </div>
        <div className="bg-card/80 backdrop-blur-md rounded-xl p-4 border border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-destructive/20 flex items-center justify-center">
              <XCircle size={20} className="text-destructive" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Em Atraso</p>
              <p className="text-lg font-bebas text-destructive">R$ {stats.overdue.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card/80 backdrop-blur-md rounded-xl p-4 border border-border/50">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por aluno ou descrição..."
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <Filter size={16} className="mr-2" />
              <SelectValue placeholder="Filtrar status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendentes</SelectItem>
              <SelectItem value="paid">Pagos</SelectItem>
              <SelectItem value="cancelled">Cancelados</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Payments List */}
      <div className="bg-card/80 backdrop-blur-md rounded-xl border border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-background/50 border-b border-border/50">
              <tr>
                <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase">Aluno</th>
                <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase">Descrição</th>
                <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase">Valor</th>
                <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase">Vencimento</th>
                <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase">Status</th>
                <th className="text-right p-4 text-xs font-medium text-muted-foreground uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    Carregando...
                  </td>
                </tr>
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    Nenhuma cobrança encontrada
                  </td>
                </tr>
              ) : (
                filteredPayments.map(payment => (
                  <tr key={payment.id} className="hover:bg-background/30">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <User size={16} className="text-muted-foreground" />
                        <span className="font-medium">{payment.client?.full_name || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {payment.description || 'Mensalidade'}
                    </td>
                    <td className="p-4">
                      <span className="font-bebas text-lg text-emerald-500">
                        R$ {payment.amount.toFixed(2)}
                      </span>
                      {payment.discount_percentage && payment.discount_percentage > 0 && (
                        <span className="ml-2 text-xs text-green-500">-{payment.discount_percentage}%</span>
                      )}
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {payment.due_date ? format(parseISO(payment.due_date), 'dd/MM/yyyy') : '-'}
                    </td>
                    <td className="p-4">
                      {getStatusBadge(payment.status)}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-1">
                        {payment.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleMarkAsPaid(payment.id)}
                              className="p-2 hover:bg-emerald-500/20 rounded-lg transition-colors"
                              title="Marcar como pago"
                            >
                              <CheckCircle size={16} className="text-emerald-500" />
                            </button>
                            <button
                              onClick={() => sendPaymentAlert(payment)}
                              className="p-2 hover:bg-primary/20 rounded-lg transition-colors"
                              title="Enviar alerta"
                            >
                              <Send size={16} className="text-primary" />
                            </button>
                            <button
                              onClick={() => handleCancelPayment(payment.id)}
                              className="p-2 hover:bg-destructive/20 rounded-lg transition-colors"
                              title="Cancelar"
                            >
                              <XCircle size={16} className="text-destructive" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleDeletePayment(payment.id)}
                          className="p-2 hover:bg-destructive/20 rounded-lg transition-colors"
                          title="Excluir"
                        >
                          <Trash2 size={16} className="text-destructive" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      </div>
    </motion.div>
  );
};

export default Finance;
