import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ArrowLeft, FileText, Plus, User, Search,
  Loader2, Printer, CheckCircle, Clock, XCircle,
  DollarSign, Calendar, Share2, MessageCircle, Mail,
  Eye, Pause, Play, History
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAudio } from '@/contexts/AudioContext';
import { useAuth } from '@/contexts/AuthContext';
import { useEscapeBack } from '@/hooks/useEscapeBack';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { formatCurrency, printPaymentPlan, generateReceiptNumber, printPaymentReceipt, generatePaymentPlanText } from '@/lib/printUtils';
import { format, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { filterDecimalOnly } from '@/lib/inputValidation';
import CarnePreviewDialog from './CarnePreviewDialog';
import ClientHistoryDialog from './ClientHistoryDialog';

interface Client {
  id: string;
  username: string;
  full_name: string | null;
  student_id: string | null;
  phone?: string | null;
  email?: string | null;
}

interface PaymentPlan {
  id: string;
  client_id: string;
  total_amount: number;
  installments: number;
  installment_amount: number;
  discount_percentage: number;
  status: string;
  start_date: string;
  created_at: string;
  description: string | null;
  client?: Client;
  payments?: Payment[];
}

interface Payment {
  id: string;
  amount: number;
  due_date: string | null;
  paid_at: string | null;
  status: string;
  installment_number: number;
  total_installments: number;
  payment_method: string;
  receipt_number: string | null;
}

const PaymentPlanManager: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { playClickSound } = useAudio();
  const { profile } = useAuth();
  
  const [clients, setClients] = useState<Client[]>([]);
  const [plans, setPlans] = useState<PaymentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [defaultPixKey, setDefaultPixKey] = useState<string>('');
  const [gymName, setGymName] = useState<string>('FRANCGYMPRO');
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showPayDialog, setShowPayDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [selectedClientForHistory, setSelectedClientForHistory] = useState<string | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PaymentPlan | null>(null);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    clientId: '',
    totalAmount: '',
    installments: '1',
    discount: '0',
    description: '',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    pixKey: '',
  });
  
  const [payMethod, setPayMethod] = useState<'cash' | 'pix' | 'card'>('cash');

  // ESC para voltar ao menu admin (desabilitado quando há dialogs abertos)
  useEscapeBack({ to: '/admin', disableWhen: [showCreateDialog, showPayDialog, showPreviewDialog, showHistoryDialog] });

  useEffect(() => {
    loadData();
  }, []);

  // Pre-select client from URL params
  useEffect(() => {
    const clientId = searchParams.get('client');
    if (clientId && clients.length > 0) {
      const client = clients.find(c => c.id === clientId);
      if (client) {
        setFormData(prev => ({ ...prev, clientId }));
        setShowCreateDialog(true);
      }
    }
  }, [searchParams, clients]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Get clients with role='client' from user_roles
      const { data: clientRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'client');

      const clientUserIds = clientRoles?.map(r => r.user_id) || [];

      // Get all profiles - we need to include clients registered by admin without auth accounts
      const { data: clientsData } = await supabase
        .from('profiles')
        .select('id, username, full_name, user_id, student_id, phone, email, tenant_id, created_by_admin')
        .order('full_name');
      
      // Filter to include: clients with role OR profiles created by admin
      const filteredClients = (clientsData || []).filter(p => {
        // Include if has client role
        if (p.user_id && clientUserIds.includes(p.user_id)) return true;
        // Include if created by admin (registered as client without auth account)
        if (!p.user_id && p.created_by_admin) return true;
        // Include profiles without user_id that have student_id (likely clients)
        if (!p.user_id && p.student_id) return true;
        return false;
      });
      
      setClients(filteredClients);

      // Load default PIX key from tenant settings
      const tenantId = filteredClients.length > 0 ? filteredClients.find(c => c.tenant_id)?.tenant_id : null;
      if (tenantId) {
        const { data: tenantData } = await supabase
          .from('tenants')
          .select('name, settings')
          .eq('id', tenantId)
          .single();
        
        if (tenantData) {
          setGymName(tenantData.name || 'FRANCGYMPRO');
          const tenantSettings = (tenantData.settings || {}) as Record<string, unknown>;
          if (tenantSettings.pixKey) {
            setDefaultPixKey(tenantSettings.pixKey as string);
          }
        }
      }

      // Load payment plans
      const { data: plansData } = await supabase
        .from('payment_plans')
        .select(`
          *,
          client:profiles!payment_plans_client_id_fkey(id, username, full_name, student_id, phone, email)
        `)
        .eq('created_by', profile?.profile_id)
        .order('created_at', { ascending: false });
      
      if (plansData) {
        // Load payments for each plan
        for (const plan of plansData) {
          const { data: payments } = await supabase
            .from('payments')
            .select('*')
            .eq('plan_id', plan.id)
            .order('installment_number');
          
          (plan as any).payments = payments || [];
        }
        setPlans(plansData as PaymentPlan[]);
      }
    } catch (err) {
      console.error('Error:', err);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const calculateInstallmentAmount = () => {
    const total = parseFloat(formData.totalAmount.replace(',', '.')) || 0;
    const discount = parseFloat(formData.discount.replace(',', '.')) || 0;
    const installments = parseInt(formData.installments) || 1;
    const discountedTotal = total * (1 - discount / 100);
    return discountedTotal / installments;
  };

  // Handle decimal input with comma or period
  const handleDecimalChange = (field: 'totalAmount' | 'discount') => (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow comma as decimal separator
    const value = e.target.value.replace(',', '.');
    const filtered = filterDecimalOnly(value);
    setFormData({ ...formData, [field]: filtered });
  };

  // Filter clients by search term
  const filteredClients = clients.filter(client => {
    const name = client.full_name || client.username || '';
    return name.toLowerCase().includes(clientSearchTerm.toLowerCase());
  });

  // Calculate installment amount for preview
  const getPreviewData = () => {
    if (!formData.clientId || !formData.totalAmount) return null;
    
    const client = clients.find(c => c.id === formData.clientId);
    if (!client) return null;

    const totalAmount = parseFloat(formData.totalAmount.replace(',', '.'));
    const discount = parseFloat(formData.discount.replace(',', '.')) || 0;
    const installments = parseInt(formData.installments);
    const discountedTotal = totalAmount * (1 - discount / 100);
    const installmentAmount = discountedTotal / installments;

    return {
      clientName: client.full_name || client.username,
      studentId: client.student_id || undefined,
      totalAmount: discountedTotal,
      installments,
      installmentAmount,
      discount,
      startDate: formData.startDate,
      description: formData.description || `Carnê ${installments}x`,
      pixKey: formData.pixKey || undefined,
    };
  };

  const handleOpenPreview = () => {
    if (!formData.clientId || !formData.totalAmount) {
      toast.error('Selecione um cliente e informe o valor');
      return;
    }
    setShowCreateDialog(false);
    setShowPreviewDialog(true);
  };

  const handleCreatePlan = async (shouldPrint: boolean = false) => {
    if (!formData.clientId || !formData.totalAmount) {
      toast.error('Selecione um cliente e informe o valor');
      return;
    }

    setSaving(true);
    const totalAmount = parseFloat(formData.totalAmount.replace(',', '.'));
    const discount = parseFloat(formData.discount.replace(',', '.')) || 0;
    const installments = parseInt(formData.installments);
    const discountedTotal = totalAmount * (1 - discount / 100);
    const installmentAmount = discountedTotal / installments;

    try {
      // Check for duplicate plan (same client, same amount, same installments, within last 5 minutes)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data: existingPlans } = await supabase
        .from('payment_plans')
        .select('id, created_at')
        .eq('client_id', formData.clientId)
        .eq('total_amount', discountedTotal)
        .eq('installments', installments)
        .gte('created_at', fiveMinutesAgo);

      if (existingPlans && existingPlans.length > 0) {
        toast.error('Um carnê idêntico foi criado recentemente. Aguarde alguns minutos ou altere os valores.');
        setSaving(false);
        return;
      }

      // Create payment plan
      const { data: plan, error: planError } = await supabase
        .from('payment_plans')
        .insert({
          client_id: formData.clientId,
          created_by: profile?.profile_id,
          total_amount: discountedTotal,
          installments,
          installment_amount: installmentAmount,
          discount_percentage: discount,
          description: formData.description || `Carnê ${installments}x`,
          start_date: formData.startDate,
        })
        .select()
        .single();

      if (planError) throw planError;

      // Create individual payments (with duplicate check for each)
      const payments = [];
      for (let i = 1; i <= installments; i++) {
        const dueDate = addMonths(new Date(formData.startDate), i - 1);
        payments.push({
          client_id: formData.clientId,
          plan_id: plan.id,
          amount: installmentAmount,
          due_date: format(dueDate, 'yyyy-MM-dd'),
          status: 'pending',
          payment_method: 'pending',
          installment_number: i,
          total_installments: installments,
          description: `Parcela ${i}/${installments} - ${formData.description || 'Carnê'}`,
        });
      }

      const { error: paymentsError } = await supabase
        .from('payments')
        .insert(payments);

      if (paymentsError) throw paymentsError;

      const client = clients.find(c => c.id === formData.clientId);
      
      toast.success('Carnê salvo com sucesso!');
      
      // Only print if requested
      if (shouldPrint) {
        printPaymentPlan({
          clientName: client?.full_name || client?.username || '',
          studentId: client?.student_id || undefined,
          totalAmount: discountedTotal,
          installments,
          installmentAmount,
          discount,
          startDate: format(new Date(formData.startDate), 'dd/MM/yyyy'),
          payments: payments.map(p => ({
            number: p.installment_number,
            dueDate: format(new Date(p.due_date), 'dd/MM/yyyy'),
            status: 'pending',
          })),
          pixKey: formData.pixKey || undefined,
        });
      }

      setShowPreviewDialog(false);
      setShowCreateDialog(false);
      setFormData({
        clientId: '',
        totalAmount: '',
        installments: '1',
        discount: '0',
        description: '',
        startDate: format(new Date(), 'yyyy-MM-dd'),
        pixKey: '',
      });
      loadData();
    } catch (err) {
      console.error('Error:', err);
      toast.error('Erro ao criar carnê');
    } finally {
      setSaving(false);
    }
  };

  const handlePayInstallment = async () => {
    if (!selectedPayment || !selectedPlan) return;

    const receiptNumber = generateReceiptNumber();

    try {
      const { error } = await supabase
        .from('payments')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          payment_method: payMethod,
          receipt_number: receiptNumber,
        })
        .eq('id', selectedPayment.id);

      if (error) throw error;

      // Check if all installments are paid
      const { data: remainingPayments } = await supabase
        .from('payments')
        .select('id')
        .eq('plan_id', selectedPlan.id)
        .eq('status', 'pending');

      if (!remainingPayments || remainingPayments.length === 0) {
        await supabase
          .from('payment_plans')
          .update({ status: 'completed' })
          .eq('id', selectedPlan.id);
      }

      const client = selectedPlan.client;
      
      toast.success('Parcela paga com sucesso!');
      
      printPaymentReceipt({
        clientName: client?.full_name || client?.username || '',
        amount: selectedPayment.amount,
        method: payMethod,
        description: `Parcela ${selectedPayment.installment_number}/${selectedPayment.total_installments}`,
        receiptNumber,
        installment: {
          current: selectedPayment.installment_number,
          total: selectedPayment.total_installments,
        },
      });

      setShowPayDialog(false);
      setSelectedPayment(null);
      setSelectedPlan(null);
      loadData();
    } catch (err) {
      console.error('Error:', err);
      toast.error('Erro ao registrar pagamento');
    }
  };

  const filteredPlans = plans.filter(plan => {
    const clientName = plan.client?.full_name || plan.client?.username || '';
    return clientName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
      active: { color: 'bg-blue-500/20 text-blue-500', icon: <Clock size={12} />, label: 'Em Andamento' },
      completed: { color: 'bg-green-500/20 text-green-500', icon: <CheckCircle size={12} />, label: 'Quitado' },
      cancelled: { color: 'bg-red-500/20 text-red-500', icon: <XCircle size={12} />, label: 'Cancelado' },
    };
    const badge = badges[status] || badges.active;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${badge.color}`}>
        {badge.icon} {badge.label}
      </span>
    );
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => { playClickSound(); navigate('/admin'); }}
            className="text-sm text-muted-foreground hover:text-blue-500 transition-colors"
          >
            <ArrowLeft size={16} className="inline mr-1" /> Voltar
          </button>
          <h2 className="text-xl sm:text-2xl font-bebas text-blue-500 flex items-center gap-2">
            <FileText className="w-6 h-6" />
            CARNÊS DE PAGAMENTO
          </h2>
        </div>
        <Button onClick={() => { playClickSound(); setShowCreateDialog(true); }} className="bg-blue-600 hover:bg-blue-700">
          <Plus size={16} className="mr-1" /> Novo Carnê
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
        <Input
          placeholder="Buscar por cliente..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 bg-background/50"
        />
      </div>

      {/* Plans List */}
      <div className="space-y-4">
        {filteredPlans.length === 0 ? (
          <div className="bg-card/80 rounded-xl p-8 text-center border border-border/50">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Nenhum carnê encontrado</p>
          </div>
        ) : (
          filteredPlans.map((plan) => {
            const paidCount = plan.payments?.filter(p => p.status === 'paid').length || 0;
            const totalCount = plan.installments;
            
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card/80 backdrop-blur-md rounded-xl p-4 border border-border/50"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          playClickSound();
                          setSelectedClientForHistory(plan.client_id);
                          setShowHistoryDialog(true);
                        }}
                        className="flex items-center gap-1 hover:text-primary transition-colors"
                      >
                        <User size={16} className="text-primary" />
                        <span className="font-semibold hover:underline">{plan.client?.full_name || plan.client?.username}</span>
                      </button>
                      {getStatusBadge(plan.status)}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() => {
                          playClickSound();
                          setSelectedClientForHistory(plan.client_id);
                          setShowHistoryDialog(true);
                        }}
                      >
                        <History size={14} className="text-muted-foreground hover:text-primary" />
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-primary">{formatCurrency(plan.total_amount)}</p>
                    <p className="text-xs text-muted-foreground">
                      {plan.installments}x de {formatCurrency(plan.installment_amount)}
                    </p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Progresso</span>
                    <span>{paidCount}/{totalCount} parcelas pagas</span>
                  </div>
                  <div className="h-2 bg-background rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all"
                      style={{ width: `${(paidCount / totalCount) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Installments */}
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {plan.payments?.map((payment) => (
                    <button
                      key={payment.id}
                      onClick={() => {
                        if (payment.status === 'pending') {
                          playClickSound();
                          setSelectedPayment(payment);
                          setSelectedPlan(plan);
                          setShowPayDialog(true);
                        }
                      }}
                      disabled={payment.status === 'paid'}
                      className={`p-2 rounded-lg text-center transition-all ${
                        payment.status === 'paid'
                          ? 'bg-green-500/20 border border-green-500/50 cursor-default'
                          : 'bg-background/50 border border-border hover:border-primary cursor-pointer'
                      }`}
                    >
                      <p className="text-xs font-bold">Parcela {payment.installment_number}</p>
                      <p className="text-xs text-muted-foreground">
                        {payment.due_date ? format(new Date(payment.due_date), 'dd/MM') : '-'}
                      </p>
                      {payment.status === 'paid' ? (
                        <CheckCircle size={14} className="mx-auto mt-1 text-green-500" />
                      ) : (
                        <Clock size={14} className="mx-auto mt-1 text-yellow-500" />
                      )}
                    </button>
                  ))}
                </div>

                <div className="flex justify-end gap-2 mt-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Share2 size={14} className="mr-1" /> Enviar
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem
                        onClick={() => {
                          playClickSound();
                          const text = generatePaymentPlanText({
                            clientName: plan.client?.full_name || plan.client?.username || '',
                            studentId: plan.client?.student_id || undefined,
                            totalAmount: plan.total_amount,
                            installments: plan.installments,
                            installmentAmount: plan.installment_amount,
                            discount: plan.discount_percentage,
                            startDate: format(new Date(plan.start_date), 'dd/MM/yyyy'),
                            payments: plan.payments?.map(p => ({
                              number: p.installment_number,
                              dueDate: p.due_date ? format(new Date(p.due_date), 'dd/MM/yyyy') : '-',
                              status: p.status,
                            })) || [],
                            pixKey: defaultPixKey || undefined,
                            gymName,
                          });
                          const phone = (plan.client as any)?.phone?.replace(/\D/g, '') || '';
                          if (phone) {
                            const whatsappUrl = `https://wa.me/55${phone}?text=${encodeURIComponent(text)}`;
                            window.open(whatsappUrl, '_blank');
                          } else {
                            // Copy to clipboard if no phone
                            navigator.clipboard.writeText(text);
                            toast.success('Carnê copiado! Cole no WhatsApp.');
                          }
                        }}
                      >
                        <MessageCircle size={16} className="mr-2 text-green-500" />
                        WhatsApp
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          playClickSound();
                          const text = generatePaymentPlanText({
                            clientName: plan.client?.full_name || plan.client?.username || '',
                            studentId: plan.client?.student_id || undefined,
                            totalAmount: plan.total_amount,
                            installments: plan.installments,
                            installmentAmount: plan.installment_amount,
                            discount: plan.discount_percentage,
                            startDate: format(new Date(plan.start_date), 'dd/MM/yyyy'),
                            payments: plan.payments?.map(p => ({
                              number: p.installment_number,
                              dueDate: p.due_date ? format(new Date(p.due_date), 'dd/MM/yyyy') : '-',
                              status: p.status,
                            })) || [],
                            pixKey: defaultPixKey || undefined,
                            gymName,
                          });
                          const email = (plan.client as any)?.email || '';
                          const subject = `Carnê de Pagamento - ${gymName}`;
                          const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text.replace(/\*/g, '').replace(/_/g, ''))}`;
                          window.location.href = mailtoUrl;
                        }}
                      >
                        <Mail size={16} className="mr-2 text-blue-500" />
                        E-mail
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      playClickSound();
                      printPaymentPlan({
                        clientName: plan.client?.full_name || plan.client?.username || '',
                        studentId: plan.client?.student_id || undefined,
                        totalAmount: plan.total_amount,
                        installments: plan.installments,
                        installmentAmount: plan.installment_amount,
                        discount: plan.discount_percentage,
                        startDate: format(new Date(plan.start_date), 'dd/MM/yyyy'),
                        payments: plan.payments?.map(p => ({
                          number: p.installment_number,
                          dueDate: p.due_date ? format(new Date(p.due_date), 'dd/MM/yyyy') : '-',
                          status: p.status,
                        })) || [],
                        pixKey: defaultPixKey || undefined,
                      });
                    }}
                  >
                    <Printer size={14} className="mr-1" /> Imprimir
                  </Button>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Create Plan Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="text-blue-500" /> Criar Novo Carnê
            </DialogTitle>
            <DialogDescription>
              Preencha os dados para criar um carnê de pagamento parcelado
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground">Cliente *</label>
              <div className="space-y-2">
                <Input
                  placeholder="Buscar cliente por nome..."
                  value={clientSearchTerm}
                  onChange={(e) => setClientSearchTerm(e.target.value)}
                  className="bg-background/50"
                />
                <Select value={formData.clientId} onValueChange={(v) => setFormData({ ...formData, clientId: v })}>
                  <SelectTrigger className="bg-background/50">
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {filteredClients.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground text-center">
                        {clients.length === 0 ? 'Nenhum cliente cadastrado' : 'Nenhum cliente encontrado'}
                      </div>
                    ) : (
                      filteredClients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.full_name || client.username}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Valor Total (R$) *</label>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={formData.totalAmount}
                onChange={handleDecimalChange('totalAmount')}
                className="bg-background/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground">Parcelas</label>
                <Select value={formData.installments} onValueChange={(v) => setFormData({ ...formData, installments: v })}>
                  <SelectTrigger className="bg-background/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                      <SelectItem key={n} value={n.toString()}>{n}x</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Desconto (%)</label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0"
                  value={formData.discount}
                  onChange={handleDecimalChange('discount')}
                  className="bg-background/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Data Início</label>
              <Input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="bg-background/50"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Descrição</label>
              <Input
                placeholder="Ex: Plano Anual 2026"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="bg-background/50"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Chave PIX (opcional)</label>
              <Input
                placeholder="CPF, CNPJ, email ou chave aleatória"
                value={formData.pixKey}
                onChange={(e) => setFormData({ ...formData, pixKey: e.target.value })}
                className="bg-background/50"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Se informada, será gerado QR Code PIX no carnê
              </p>
            </div>
            
            {formData.totalAmount && (
              <div className="p-3 bg-primary/10 rounded-lg border border-primary/30">
                <p className="text-sm">
                  <span className="text-muted-foreground">Valor por parcela:</span>{' '}
                  <strong className="text-primary">{formatCurrency(calculateInstallmentAmount())}</strong>
                </p>
                {parseFloat(formData.discount) > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Valor com {formData.discount}% de desconto
                  </p>
                )}
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancelar</Button>
            <Button onClick={handleOpenPreview} className="bg-blue-600 hover:bg-blue-700">
              <Eye size={16} className="mr-1" /> Visualizar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pay Installment Dialog */}
      <Dialog open={showPayDialog} onOpenChange={setShowPayDialog}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="text-green-500" /> Registrar Pagamento
            </DialogTitle>
            <DialogDescription>
              Registre o pagamento desta parcela
            </DialogDescription>
          </DialogHeader>
          {selectedPayment && selectedPlan && (
            <div className="space-y-4">
              <div className="p-4 bg-background/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Cliente</p>
                <p className="font-semibold">{selectedPlan.client?.full_name || selectedPlan.client?.username}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-background/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Parcela</p>
                  <p className="font-semibold">{selectedPayment.installment_number}/{selectedPayment.total_installments}</p>
                </div>
                <div className="p-4 bg-background/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Valor</p>
                  <p className="font-semibold text-primary">{formatCurrency(selectedPayment.amount)}</p>
                </div>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Método de Pagamento</label>
                <Select value={payMethod} onValueChange={(v: 'cash' | 'pix' | 'card') => setPayMethod(v)}>
                  <SelectTrigger className="bg-background/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">💵 Dinheiro</SelectItem>
                    <SelectItem value="pix">📱 PIX</SelectItem>
                    <SelectItem value="card">💳 Cartão</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowPayDialog(false)}>Cancelar</Button>
            <Button onClick={handlePayInstallment} className="bg-green-600 hover:bg-green-700">
              <Printer size={16} className="mr-1" /> Pagar e Imprimir
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <CarnePreviewDialog
        open={showPreviewDialog}
        onOpenChange={setShowPreviewDialog}
        data={getPreviewData()}
        onSave={() => handleCreatePlan(false)}
        onPrint={() => handleCreatePlan(true)}
        saving={saving}
      />

      {/* Client History Dialog */}
      <ClientHistoryDialog
        open={showHistoryDialog}
        onOpenChange={setShowHistoryDialog}
        clientId={selectedClientForHistory}
        onEnrollmentChange={loadData}
      />
    </motion.div>
  );
};

export default PaymentPlanManager;
