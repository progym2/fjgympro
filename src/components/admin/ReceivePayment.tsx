import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, DollarSign, Search, User, Loader2,
  CheckCircle, Printer, CreditCard, Banknote, Smartphone
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAudio } from '@/contexts/AudioContext';
import { useAuth } from '@/contexts/AuthContext';
import { useEscapeBack } from '@/hooks/useEscapeBack';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { formatCurrency, generateReceiptNumber, printPaymentReceipt } from '@/lib/printUtils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Client {
  id: string;
  username: string;
  full_name: string | null;
  monthly_fee: number | null;
}

interface PendingPayment {
  id: string;
  amount: number;
  due_date: string | null;
  description: string | null;
  installment_number: number | null;
  total_installments: number | null;
  plan_id: string | null;
}

const ReceivePayment: React.FC = () => {
  const navigate = useNavigate();
  const { playClickSound } = useAudio();
  const { profile, role } = useAuth();
  
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  
  const [showPayDialog, setShowPayDialog] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PendingPayment | null>(null);
  const [payMethod, setPayMethod] = useState<'cash' | 'pix' | 'card'>('cash');
  const [customAmount, setCustomAmount] = useState('');
  const [processing, setProcessing] = useState(false);

  const [showNewPaymentDialog, setShowNewPaymentDialog] = useState(false);
  const [newPaymentData, setNewPaymentData] = useState({
    amount: '',
    description: 'Mensalidade'
  });

  // ESC para voltar ao menu admin (desabilitado quando há dialogs abertos)
  useEscapeBack({ to: '/admin', disableWhen: [showPayDialog, showNewPaymentDialog] });

  const isMaster = role === 'master';

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('profiles')
        .select('id, username, full_name, monthly_fee')
        .is('cref', null)
        .order('full_name');

      // If not master, only show clients created by this admin
      if (!isMaster && profile?.profile_id) {
        query = query.eq('created_by_admin', profile.profile_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setClients(data || []);
    } catch (err) {
      console.error('Error:', err);
      toast.error('Erro ao carregar clientes');
    } finally {
      setLoading(false);
    }
  };

  const loadPendingPayments = async (clientId: string) => {
    setLoadingPayments(true);
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('id, amount, due_date, description, installment_number, total_installments, plan_id')
        .eq('client_id', clientId)
        .eq('status', 'pending')
        .order('due_date');

      if (error) throw error;
      setPendingPayments(data || []);
    } catch (err) {
      console.error('Error:', err);
      toast.error('Erro ao carregar pagamentos');
    } finally {
      setLoadingPayments(false);
    }
  };

  const handleSelectClient = (client: Client) => {
    playClickSound();
    setSelectedClient(client);
    loadPendingPayments(client.id);
    setNewPaymentData(prev => ({
      ...prev,
      amount: client.monthly_fee ? client.monthly_fee.toString() : ''
    }));
  };

  const handleOpenPayDialog = (payment: PendingPayment) => {
    playClickSound();
    setSelectedPayment(payment);
    setCustomAmount(payment.amount.toString());
    setShowPayDialog(true);
  };

  const handleReceivePayment = async () => {
    if (!selectedPayment || !selectedClient) return;

    setProcessing(true);
    const receiptNumber = generateReceiptNumber();
    const finalAmount = parseFloat(customAmount) || selectedPayment.amount;

    try {
      const { error } = await supabase
        .from('payments')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          payment_method: payMethod,
          receipt_number: receiptNumber,
          amount: finalAmount,
        })
        .eq('id', selectedPayment.id);

      if (error) throw error;

      // Check if all installments of a plan are paid
      if (selectedPayment.plan_id) {
        const { data: remainingPayments } = await supabase
          .from('payments')
          .select('id')
          .eq('plan_id', selectedPayment.plan_id)
          .eq('status', 'pending');

        if (!remainingPayments || remainingPayments.length === 0) {
          await supabase
            .from('payment_plans')
            .update({ status: 'completed' })
            .eq('id', selectedPayment.plan_id);
        }
      }

      toast.success('Pagamento recebido com sucesso!');

      // Print receipt
      printPaymentReceipt({
        clientName: selectedClient.full_name || selectedClient.username,
        amount: finalAmount,
        method: payMethod,
        description: selectedPayment.description || 'Mensalidade',
        receiptNumber,
        installment: selectedPayment.installment_number && selectedPayment.total_installments ? {
          current: selectedPayment.installment_number,
          total: selectedPayment.total_installments,
        } : undefined,
      });

      setShowPayDialog(false);
      setSelectedPayment(null);
      loadPendingPayments(selectedClient.id);
    } catch (err) {
      console.error('Error:', err);
      toast.error('Erro ao registrar pagamento');
    } finally {
      setProcessing(false);
    }
  };

  const handleCreateNewPayment = async () => {
    if (!selectedClient || !newPaymentData.amount || processing) {
      if (!newPaymentData.amount) toast.error('Informe o valor do pagamento');
      return;
    }

    setProcessing(true);
    const receiptNumber = generateReceiptNumber();
    const amount = parseFloat(newPaymentData.amount);
    const today = new Date().toISOString().split('T')[0];

    try {
      // Check for duplicate payment (same client, description, amount, same day)
      const { data: existingPayment } = await supabase
        .from('payments')
        .select('id')
        .eq('client_id', selectedClient.id)
        .eq('description', newPaymentData.description || 'Mensalidade')
        .eq('amount', amount)
        .gte('paid_at', `${today}T00:00:00`)
        .lte('paid_at', `${today}T23:59:59`)
        .eq('status', 'paid')
        .maybeSingle();

      if (existingPayment) {
        toast.info('Este pagamento já foi registrado hoje!');
        setProcessing(false);
        return;
      }

      // Create and immediately mark as paid
      const { error } = await supabase
        .from('payments')
        .insert({
          client_id: selectedClient.id,
          amount,
          description: newPaymentData.description || 'Mensalidade',
          status: 'paid',
          paid_at: new Date().toISOString(),
          payment_method: payMethod,
          receipt_number: receiptNumber,
          due_date: today,
        });

      if (error) throw error;

      toast.success('Pagamento registrado com sucesso!');

      // Print receipt
      printPaymentReceipt({
        clientName: selectedClient.full_name || selectedClient.username,
        amount,
        method: payMethod,
        description: newPaymentData.description || 'Mensalidade',
        receiptNumber,
      });

      setShowNewPaymentDialog(false);
      setNewPaymentData({ amount: selectedClient.monthly_fee?.toString() || '', description: 'Mensalidade' });
      loadPendingPayments(selectedClient.id);
    } catch (err) {
      console.error('Error:', err);
      toast.error('Erro ao registrar pagamento');
    } finally {
      setProcessing(false);
    }
  };

  const filteredClients = clients.filter(client => {
    const name = client.full_name || client.username || '';
    return name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'pix': return <Smartphone size={18} className="text-green-500" />;
      case 'card': return <CreditCard size={18} className="text-blue-500" />;
      default: return <Banknote size={18} className="text-emerald-500" />;
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
      <div className="flex items-center gap-2">
        <button
          onClick={() => { playClickSound(); navigate('/admin'); }}
          className="text-sm text-muted-foreground hover:text-blue-500 transition-colors"
        >
          <ArrowLeft size={16} className="inline mr-1" /> Voltar
        </button>
        <h2 className="text-xl sm:text-2xl font-bebas text-emerald-500 flex items-center gap-2">
          <DollarSign className="w-6 h-6" />
          RECEBER MENSALIDADE
        </h2>
      </div>

      {!selectedClient ? (
        <>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <Input
              placeholder="Buscar cliente por nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-background/50"
            />
          </div>

          {/* Clients List */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredClients.length === 0 ? (
              <div className="col-span-full bg-card/80 rounded-xl p-8 text-center border border-border/50">
                <User className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">Nenhum cliente encontrado</p>
              </div>
            ) : (
              filteredClients.map((client) => (
                <motion.button
                  key={client.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleSelectClient(client)}
                  className="bg-card/80 backdrop-blur-md rounded-xl p-4 border border-border/50 hover:border-emerald-500/50 transition-all text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <User size={20} className="text-emerald-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{client.full_name || client.username}</p>
                      <p className="text-sm text-muted-foreground">@{client.username}</p>
                    </div>
                    {client.monthly_fee && (
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Mensalidade</p>
                        <p className="font-bebas text-emerald-500">{formatCurrency(client.monthly_fee)}</p>
                      </div>
                    )}
                  </div>
                </motion.button>
              ))
            )}
          </div>
        </>
      ) : (
        <>
          {/* Selected Client */}
          <div className="bg-card/80 backdrop-blur-md rounded-xl p-4 border border-emerald-500/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <User size={24} className="text-emerald-500" />
                </div>
                <div>
                  <p className="font-semibold text-lg">{selectedClient.full_name || selectedClient.username}</p>
                  <p className="text-sm text-muted-foreground">@{selectedClient.username}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { playClickSound(); setSelectedClient(null); }}
                >
                  Trocar Cliente
                </Button>
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => { playClickSound(); setShowNewPaymentDialog(true); }}
                >
                  <DollarSign size={16} className="mr-1" /> Receber Avulso
                </Button>
              </div>
            </div>
          </div>

          {/* Pending Payments */}
          <div className="space-y-3">
            <h3 className="font-bebas text-lg text-muted-foreground">PAGAMENTOS PENDENTES</h3>
            
            {loadingPayments ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
              </div>
            ) : pendingPayments.length === 0 ? (
              <div className="bg-card/80 rounded-xl p-6 text-center border border-border/50">
                <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-3" />
                <p className="text-muted-foreground">Nenhum pagamento pendente</p>
                <p className="text-sm text-muted-foreground mt-1">Use "Receber Avulso" para registrar uma nova mensalidade</p>
              </div>
            ) : (
              pendingPayments.map((payment) => (
                <motion.div
                  key={payment.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-card/80 backdrop-blur-md rounded-xl p-4 border border-border/50 hover:border-emerald-500/30 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">
                        {payment.description || 'Mensalidade'}
                        {payment.installment_number && payment.total_installments && (
                          <span className="text-sm text-muted-foreground ml-2">
                            (Parcela {payment.installment_number}/{payment.total_installments})
                          </span>
                        )}
                      </p>
                      {payment.due_date && (
                        <p className="text-sm text-muted-foreground">
                          Vencimento: {format(new Date(payment.due_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-xl font-bebas text-emerald-500">{formatCurrency(payment.amount)}</p>
                      <Button
                        className="bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => handleOpenPayDialog(payment)}
                      >
                        <DollarSign size={16} className="mr-1" /> Receber
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </>
      )}

      {/* Pay Dialog */}
      <Dialog open={showPayDialog} onOpenChange={setShowPayDialog}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="text-emerald-500" /> Receber Pagamento
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-background/50 rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Cliente</p>
              <p className="font-semibold">{selectedClient?.full_name || selectedClient?.username}</p>
            </div>

            <div>
              <label className="text-sm text-muted-foreground">Valor</label>
              <Input
                type="number"
                step="0.01"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                className="bg-background/50 text-lg font-bold"
              />
            </div>

            <div>
              <label className="text-sm text-muted-foreground">Forma de Pagamento</label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {(['cash', 'pix', 'card'] as const).map((method) => (
                  <button
                    key={method}
                    onClick={() => setPayMethod(method)}
                    className={`p-3 rounded-lg border transition-all flex flex-col items-center gap-1 ${
                      payMethod === method
                        ? 'border-emerald-500 bg-emerald-500/20'
                        : 'border-border bg-background/50 hover:border-muted-foreground'
                    }`}
                  >
                    {getPaymentMethodIcon(method)}
                    <span className="text-xs">{method === 'cash' ? 'Dinheiro' : method === 'pix' ? 'PIX' : 'Cartão'}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayDialog(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handleReceivePayment}
              disabled={processing}
            >
              {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                <><CheckCircle size={16} className="mr-1" /> Confirmar</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Payment Dialog */}
      <Dialog open={showNewPaymentDialog} onOpenChange={setShowNewPaymentDialog}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="text-emerald-500" /> Receber Pagamento Avulso
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-background/50 rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Cliente</p>
              <p className="font-semibold">{selectedClient?.full_name || selectedClient?.username}</p>
            </div>

            <div>
              <label className="text-sm text-muted-foreground">Descrição</label>
              <Input
                value={newPaymentData.description}
                onChange={(e) => setNewPaymentData({ ...newPaymentData, description: e.target.value })}
                className="bg-background/50"
                placeholder="Ex: Mensalidade Janeiro"
              />
            </div>

            <div>
              <label className="text-sm text-muted-foreground">Valor</label>
              <Input
                type="number"
                step="0.01"
                value={newPaymentData.amount}
                onChange={(e) => setNewPaymentData({ ...newPaymentData, amount: e.target.value })}
                className="bg-background/50 text-lg font-bold"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="text-sm text-muted-foreground">Forma de Pagamento</label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {(['cash', 'pix', 'card'] as const).map((method) => (
                  <button
                    key={method}
                    onClick={() => setPayMethod(method)}
                    className={`p-3 rounded-lg border transition-all flex flex-col items-center gap-1 ${
                      payMethod === method
                        ? 'border-emerald-500 bg-emerald-500/20'
                        : 'border-border bg-background/50 hover:border-muted-foreground'
                    }`}
                  >
                    {getPaymentMethodIcon(method)}
                    <span className="text-xs">{method === 'cash' ? 'Dinheiro' : method === 'pix' ? 'PIX' : 'Cartão'}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewPaymentDialog(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handleCreateNewPayment}
              disabled={processing || !newPaymentData.amount}
            >
              {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                <><Printer size={16} className="mr-1" /> Receber e Imprimir</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default ReceivePayment;
